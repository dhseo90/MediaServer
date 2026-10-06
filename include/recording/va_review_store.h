// 파일 용도: 원본 패키지와 독립된 검토 record의 불변 게시·검증 읽기.
#pragma once
#include "recording/va_review_record.h"
namespace recording {
struct VaReviewRecordV2;
struct VaReviewRecordV3;
class VaReviewStore {
public:
    struct Limits {
        std::size_t records{512}, record_bytes{128*1024};
        std::uint64_t bytes{64ULL*1024*1024}, reserve_bytes{256ULL*1024*1024};
    };
    VaReviewStore(std::filesystem::path directory,Limits limits):directory_(std::move(directory)),limits_(limits){}
    bool Recover(std::string* error) const;
    bool Publish(const VaReviewRecord&,std::string* id,std::string* error,
        const std::function<bool()>& cancelled={}) const;
    bool Read(const std::string& id,VaReviewRecord*,std::string* error) const;
    bool List(std::vector<std::string>*,std::string* error) const;
    // 내부 v2는 기존 List/Read에 노출하지 않는다. quota와 원자 게시 경계는 공유한다.
    bool PublishV2(const VaReviewRecordV2&,std::string* id,std::string* error,
        const std::function<bool()>& cancelled={}) const;
    bool ReadV2(const std::string& id,VaReviewRecordV2*,std::string* error) const;
    bool PublishV3(const VaReviewRecordV3&,std::string*,std::string*,const std::function<bool()>& cancelled={}) const;
    bool ReadV3(const std::string&,VaReviewRecordV3*,std::string*) const;
    bool ListConfirmed(std::vector<std::string>*,std::string*) const;
    static bool ValidId(const std::string&);
private:
    bool PublishBytes(const std::string& json,int version,std::string* id,std::string* error,
        const std::function<bool()>& cancelled) const;
    std::filesystem::path directory_;Limits limits_;
};
} // namespace recording
