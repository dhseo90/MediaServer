// 파일 용도: 녹화 카탈로그 cutover 입력을 수집·검증하는 로직을 구현한다.
#include "recording/recording_cutover_input.h"
#include <algorithm>
#include <array>
#include <cerrno>
#include <limits>
#include <memory>
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
#include <openssl/evp.h>
#include <sys/stat.h>
#include <unistd.h>
#endif
namespace recording {
namespace {
bool Fail(std::string* error, const char* message) {
    if(error) *error=message;
    return false;
}
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
bool Same(const struct stat& a, const struct stat& b) {
#if defined(__APPLE__)
    const auto am=a.st_mtimespec, bm=b.st_mtimespec, ac=a.st_ctimespec, bc=b.st_ctimespec;
#else
    const auto am=a.st_mtim, bm=b.st_mtim, ac=a.st_ctim, bc=b.st_ctim;
#endif
    return S_ISREG(b.st_mode) && b.st_nlink==1 && a.st_dev==b.st_dev && a.st_ino==b.st_ino &&
        a.st_size==b.st_size && am.tv_sec==bm.tv_sec && am.tv_nsec==bm.tv_nsec &&
        ac.tv_sec==bc.tv_sec && ac.tv_nsec==bc.tv_nsec;
}
#endif
}
bool VisitRecordingCutoverInput(int fd, const RecordingCutoverInputDescriptor& expected,
    const RecordingCutoverInputVisitor& visitor, RecordingCutoverInputSummary* summary, std::string* error) {
#if !MEDIA_SERVER_USE_OPENSSL || defined(_WIN32)
    (void)fd; (void)expected; (void)visitor; (void)summary;
    return Fail(error,"cutover input requires POSIX and OpenSSL");
#else
    try {
        if(!summary || !visitor || expected.size>static_cast<std::uint64_t>(std::numeric_limits<off_t>::max()) ||
            expected.sha256.size()!=64 || expected.sha256.find_first_not_of("0123456789abcdef")!=std::string::npos)
            return Fail(error,"invalid cutover descriptor or output");
        struct stat before{};
        if(fstat(fd,&before)!=0 || !S_ISREG(before.st_mode) || before.st_nlink!=1 || before.st_size<0 ||
            static_cast<std::uint64_t>(before.st_dev)!=expected.device ||
            static_cast<std::uint64_t>(before.st_ino)!=expected.inode ||
            static_cast<std::uint64_t>(before.st_size)!=expected.size)
            return Fail(error,"cutover FD binding mismatch");
        std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)> hash(EVP_MD_CTX_new(),EVP_MD_CTX_free);
        if(!hash || EVP_DigestInit_ex(hash.get(),EVP_sha256(),nullptr)!=1)
            return Fail(error,"cutover hash initialization failed");
        RecordingCutoverInputSummary candidate;
        std::array<char,65536> block{};
        std::string line;
        std::uint64_t position=0, line_start=0;
        while(position<expected.size) {
            const auto requested=static_cast<std::size_t>(std::min<std::uint64_t>(block.size(),expected.size-position));
            ssize_t count;
            do { count=pread(fd,block.data(),requested,static_cast<off_t>(position)); } while(count<0 && errno==EINTR);
            if(count<=0) return Fail(error,"cutover source read failed or shortened");
            if(EVP_DigestUpdate(hash.get(),block.data(),static_cast<std::size_t>(count))!=1)
                return Fail(error,"cutover hash update failed");
            for(ssize_t i=0;i<count;++i) {
                if(block[static_cast<std::size_t>(i)]!='\n') {
                    if(line.size()>=16U*1024U*1024U) return Fail(error,"cutover physical row exceeds strict limit");
                    line.push_back(block[static_cast<std::size_t>(i)]);
                    continue;
                }
                const auto end=position+static_cast<std::uint64_t>(i)+1;
                if(line.empty()) {
                    if(candidate.blank_lines==std::numeric_limits<std::uint64_t>::max()) return Fail(error,"blank count overflow");
                    ++candidate.blank_lines;
                } else {
                    if(candidate.rows==std::numeric_limits<std::uint64_t>::max()) return Fail(error,"ordinal overflow");
                    RecordingCutoverInputRow row;
                    row.ordinal=candidate.rows; row.offset=line_start; row.length=end-line_start;
                    if(!ParseRecordingMutationV1(line,&row.mutation,error)) return false;
                    row.canonical_bytes=(row.mutation.physical_json.empty() ?
                        SerializeRecordingMutationV1(row.mutation) : row.mutation.physical_json)+"\n";
                    if(!visitor(row,error)) return Fail(error,"cutover visitor rejected row");
                    ++candidate.rows;
                }
                line.clear(); line_start=end;
            }
            position+=static_cast<std::uint64_t>(count);
        }
        if(!line.empty()) return Fail(error,"cutover incomplete final row");
        unsigned char digest[32]; unsigned length=0;
        if(EVP_DigestFinal_ex(hash.get(),digest,&length)!=1 || length!=32)
            return Fail(error,"cutover hash finalization failed");
        const char* hex="0123456789abcdef";
        for(const auto c:digest){candidate.sha256+=hex[c>>4];candidate.sha256+=hex[c&15];}
        struct stat after{};
        if(candidate.sha256!=expected.sha256 || fstat(fd,&after)!=0 || !Same(before,after))
            return Fail(error,"cutover final source binding mismatch");
        candidate.source_bytes=position;
        *summary=std::move(candidate);
        if(error) error->clear();
        return true;
    } catch(...) { return Fail(error,"cutover input exception"); }
#endif
}
}
