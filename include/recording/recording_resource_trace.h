// 파일 용도: 검증 opt-in의 실제 공통 owner를 고정 크기로 관측한다. 저장/권한/예산을 변경하지 않는다.
#pragma once
#include "recording/recording_scratch_reservation.h"
#include <chrono>
#include <cstdio>
#include <cstring>
#include <unistd.h>
namespace recording {
class RecordingResourceTrace {
public:
    using Sink=bool(*)(const char*,std::size_t);
    explicit RecordingResourceTrace(const char* setting=std::getenv("MEDIA_SERVER_VERIFY_RECORDING_RESOURCE_TRACE"),Sink sink=nullptr)
        :enabled_(setting&&std::strcmp(setting,"1")==0),valid_(!setting||!*setting||!std::strcmp(setting,"0")||enabled_),sink_(sink?sink:Write){}
    bool Bind(const std::shared_ptr<SearchModelResidency>& memory,const std::shared_ptr<RecordingScratchResidency>& scratch){
        if(!valid_)return false;
        if(!enabled_)return true;
        if(!memory||!scratch||scratch->memory()!=memory||memory_)return valid_=false;
        memory_=memory;scratch_=scratch;return Emit("opened");
    }
    bool Poll(){
        if(!enabled_)return valid_;
        const auto now=Clock::now();
        if(now-last_<std::chrono::seconds(5))return valid_;
        return Emit("sample");
    }
    bool Emit(const char* phase){
        if(!enabled_)return valid_;
        if(!valid_||!memory_||!scratch_||sequence_>=1600)return valid_=false;
        const auto usage=scratch_->usage(),peak=scratch_->peak(),limits=scratch_->limits();
        const auto now=Clock::now();char line[1024];
        const int n=std::snprintf(line,sizeof(line),
            "[recording-resource] {\"pid\":%d,\"seq\":%llu,\"phase\":\"%s\",\"elapsedMs\":%llu,\"ram\":%llu,\"ramPeak\":%llu,\"ramLimit\":%llu,\"ramRejected\":%llu,\"scratchDisk\":%llu,\"scratchDiskPeak\":%llu,\"scratchDiskLimit\":%llu,\"scratchFd\":%llu,\"scratchFdPeak\":%llu,\"scratchFdLimit\":%llu,\"scratchRam\":%llu,\"preservedDisk\":%llu,\"preservedFd\":%llu,\"readerCleanupHealthy\":%s}\n",
            static_cast<int>(getpid()),static_cast<unsigned long long>(sequence_),phase,
            static_cast<unsigned long long>(std::chrono::duration_cast<std::chrono::milliseconds>(now-start_).count()),
            U(memory_->used()),U(memory_->peak()),U(memory_->limit()),U(memory_->rejected()),
            U(usage.disk_bytes),U(peak.disk_bytes),U(limits.disk_bytes),U(usage.file_descriptors),U(peak.file_descriptors),U(limits.file_descriptors),
            U(usage.ram_bytes),U(scratch_->preserved_disk_bytes()),U(scratch_->preserved_fds()),scratch_->ReaderCleanupHealthy()?"true":"false");
        if(n<=0||n>=static_cast<int>(sizeof(line))||!sink_(line,static_cast<std::size_t>(n)))return valid_=false;
        ++sequence_;last_=now;return true;
    }
    ~RecordingResourceTrace(){if(enabled_&&memory_)(void)Emit("after-storage-destruction");}
    RecordingResourceTrace(const RecordingResourceTrace&)=delete;
    RecordingResourceTrace& operator=(const RecordingResourceTrace&)=delete;
private:
    using Clock=std::chrono::steady_clock;
    static unsigned long long U(std::uint64_t n){return static_cast<unsigned long long>(n);}
    static bool Write(const char* p,std::size_t n){return std::fwrite(p,1,n,stderr)==n&&std::fflush(stderr)==0;}
    bool enabled_,valid_;Sink sink_;std::uint64_t sequence_{0};
    Clock::time_point start_{Clock::now()},last_{start_};
    // Observer keeps only owner counter objects alive; no Catalog/reader/value reference.
    std::shared_ptr<SearchModelResidency> memory_;std::shared_ptr<RecordingScratchResidency> scratch_;
};
}
