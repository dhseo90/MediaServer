// 파일 용도: 한 녹화 owner의 익명 scratch 공간·FD·유한 작업 RAM을 합산 예약한다.
#pragma once
#include "recording/recording_memory_reservation.h"
#include <cstdint>
#include <algorithm>
#include <array>
#include <cerrno>
#include <cstdlib>
#include <mutex>
#include <string>
#include <limits>
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
#include <dirent.h>
#include <sys/resource.h>
#include <sys/stat.h>
#include <sys/statvfs.h>
#endif

namespace recording {
class RecordingScratchResidency final : public std::enable_shared_from_this<RecordingScratchResidency> {
public:
    struct Usage { std::uint64_t disk_bytes{0}, file_descriptors{0}, ram_bytes{0}; };
    class Reservation {
        friend class RecordingScratchResidency;
        std::shared_ptr<RecordingScratchResidency> owner_;
        Usage amount_{};
        std::size_t domain_{0};
        SearchModelResidency::Reservation ram_;
        Reservation(std::shared_ptr<RecordingScratchResidency> owner,Usage amount,
            SearchModelResidency::Reservation ram,std::size_t domain):owner_(std::move(owner)),amount_(amount),domain_(domain),ram_(std::move(ram)){}
    public:
        Reservation()=default;
        Reservation(const Reservation&)=delete;
        Reservation& operator=(const Reservation&)=delete;
        Reservation(Reservation&& other)noexcept:owner_(std::move(other.owner_)),amount_(other.amount_),domain_(other.domain_),ram_(std::move(other.ram_)){other.amount_={};}
        Reservation& operator=(Reservation&& other)noexcept {Reservation next(std::move(other));swap(next);return *this;}
        ~Reservation(){if(owner_)owner_->Release(amount_,domain_);}
        void swap(Reservation& other)noexcept {owner_.swap(other.owner_);std::swap(amount_,other.amount_);std::swap(domain_,other.domain_);ram_.swap(other.ram_);}
        // 독점 ticket의 disk 증가분을 파일 쓰기 전에 예약하며 blocking 대기는 하지 않는다.
        bool GrowDisk(std::uint64_t bytes){
            if(!owner_||bytes<amount_.disk_bytes)return false;
            std::lock_guard<std::mutex> lock(owner_->mu_);
            const auto extra=bytes-amount_.disk_bytes;
            auto& disk=owner_->domains_[domain_];
            if(extra>disk.limit-disk.used||extra>UINT64_MAX-owner_->used_.disk_bytes)return false;
            disk.used+=extra;
            owner_->used_.disk_bytes+=extra;amount_.disk_bytes=bytes;owner_->PeakLocked();return true;
        }
        void ReleaseFd(){
            if(!owner_||!amount_.file_descriptors)return;
            std::lock_guard<std::mutex> lock(owner_->mu_);
            --amount_.file_descriptors;--owner_->used_.file_descriptors;
        }
        // 실패한 transaction의 정리는 실제 파일을 보존하므로 disk 과금도 유지한다.
        // C++ transaction이 사라진 뒤에도 실패한 storage domain에 해당 과금을 남긴다.
        // 새 storage 소유자가 여유 공간을 다시 관측하며 이를 정리 성공으로 보고하지 않는다.
        void PreserveFd(){
            if(!owner_||!amount_.file_descriptors)return;
            std::lock_guard<std::mutex> lock(owner_->mu_);
            --amount_.file_descriptors;++owner_->preserved_fds_;
        }
        void PreserveDisk(){
            if(!owner_)return;
            std::lock_guard<std::mutex> lock(owner_->mu_);
            owner_->preserved_disk_+=amount_.disk_bytes;amount_.disk_bytes=0;
        }
        void ReleaseDisk(){
            if(!owner_)return;
            std::lock_guard<std::mutex> lock(owner_->mu_);
            owner_->domains_[domain_].used-=amount_.disk_bytes;owner_->used_.disk_bytes-=amount_.disk_bytes;
            amount_.disk_bytes=0;
        }
        void PromoteToOriginal(){ReleaseDisk();} // original admission owns these bytes; not reclaimed space
    };
    // 명시적 한도는 결정적인 포화 조건 주입 경계로도 사용한다.
    // 제품의 Discover는 기존 filesystem 가용 공간과 process FD 여유를 고정한다.
    // 이는 저장 형식·process 전체 RAM·물리 할당을 보장하는 값이 아니다.
    RecordingScratchResidency(Usage limits,std::shared_ptr<SearchModelResidency> ram,
        std::uint64_t block=1,std::uint64_t device=0)
        :limits_(limits),ram_(std::move(ram)),device_(device){domains_[0]={device,block?block:1,limits.disk_bytes,0};}
    std::optional<Reservation> Reserve(Usage amount,std::size_t domain=0){
        if(!ram_||amount.ram_bytes>std::numeric_limits<std::size_t>::max())return std::nullopt;
        auto ram=ram_->ReserveOwned(static_cast<std::size_t>(amount.ram_bytes),SearchModelResidency::Category::Scratch);
        if(!ram)return std::nullopt;
        std::lock_guard<std::mutex> lock(mu_);
        if(domain>=domain_count_||amount.disk_bytes>domains_[domain].limit-domains_[domain].used||amount.disk_bytes>UINT64_MAX-used_.disk_bytes||
           amount.file_descriptors>limits_.file_descriptors-used_.file_descriptors||
           amount.ram_bytes>limits_.ram_bytes-used_.ram_bytes)return std::nullopt;
        used_.disk_bytes+=amount.disk_bytes;used_.file_descriptors+=amount.file_descriptors;
        domains_[domain].used+=amount.disk_bytes;
        used_.ram_bytes+=amount.ram_bytes;PeakLocked();
        return Reservation(shared_from_this(),amount,std::move(*ram),domain);
    }
    std::uint64_t DiskCharge(std::uint64_t bytes,std::size_t domain=0)const{
        std::lock_guard<std::mutex> lock(mu_);
        if(domain>=domain_count_)throw RecordingResourceUnavailable();
        const auto block=domains_[domain].block;
        if(bytes>UINT64_MAX-(block-1))throw RecordingResourceUnavailable();
        return ((bytes+block-1)/block)*block;
    }
    std::size_t DomainForDirectory(const std::string& directory){
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        struct stat st{};struct statvfs space{};
        if(stat(directory.c_str(),&st)||statvfs(directory.c_str(),&space)||!space.f_frsize||space.f_bavail>UINT64_MAX/space.f_frsize)
            throw RecordingResourceUnavailable();
        std::lock_guard<std::mutex> lock(mu_);
        if(!device_)return 0; // explicit injection domain covers both caller paths
        for(std::size_t i=0;i<domain_count_;++i)if(domains_[i].device==static_cast<std::uint64_t>(st.st_dev))return i;
        // storage 소유자의 가능한 위치는 익명 tmp와 관리 root 하나, 정확히 두 곳이다.
        // filesystem domain cache를 계속 늘리지 않는다.
        if(domain_count_==domains_.size())throw RecordingResourceUnavailable();
        const auto index=domain_count_++;domains_[index]={static_cast<std::uint64_t>(st.st_dev),space.f_frsize,space.f_bavail*space.f_frsize,0};return index;
#else
        (void)directory;throw RecordingResourceUnavailable();
#endif
    }
    Usage usage()const{std::lock_guard<std::mutex> lock(mu_);return used_;}
    Usage peak()const{std::lock_guard<std::mutex> lock(mu_);return peak_;}
    Usage limits()const{return limits_;}
    void ReportReaderCleanupFailure(){std::lock_guard<std::mutex> lock(mu_);reader_cleanup_failed_=true;}
    bool ReaderCleanupHealthy()const{std::lock_guard<std::mutex> lock(mu_);return !reader_cleanup_failed_;}
    std::uint64_t preserved_fds()const{std::lock_guard<std::mutex> lock(mu_);return preserved_fds_;}
    std::uint64_t preserved_disk_bytes()const{std::lock_guard<std::mutex> lock(mu_);return preserved_disk_;}
    std::uint64_t device()const{return device_;}
    const std::shared_ptr<SearchModelResidency>& memory()const{return ram_;}
    static std::shared_ptr<RecordingScratchResidency> Discover(const std::string& directory,
        const std::shared_ptr<SearchModelResidency>& ram){
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
        struct stat st{};struct statvfs space{};struct rlimit files{};
        if(!ram||stat(directory.c_str(),&st)||statvfs(directory.c_str(),&space)||!space.f_frsize||
           space.f_bavail>UINT64_MAX/space.f_frsize||getrlimit(RLIMIT_NOFILE,&files)||files.rlim_cur==RLIM_INFINITY)
            throw RecordingResourceUnavailable();
        DIR* descriptors=opendir("/dev/fd");if(!descriptors)throw RecordingResourceUnavailable();
        const int own=dirfd(descriptors);std::uint64_t open_count=0;errno=0;
        while(auto* entry=readdir(descriptors)){
            char* end=nullptr;const auto fd=std::strtol(entry->d_name,&end,10);
            if(end!=entry->d_name&&!*end&&fd>=0&&fd!=own)++open_count;
        }
        const int scan_error=errno;const int close_error=closedir(descriptors);
        if(scan_error||close_error||open_count>=files.rlim_cur)throw RecordingResourceUnavailable();
        return std::make_shared<RecordingScratchResidency>(Usage{
            space.f_bavail*space.f_frsize,files.rlim_cur-open_count,ram->limit()},ram,space.f_frsize,st.st_dev);
#else
        (void)directory;(void)ram;throw RecordingResourceUnavailable();
#endif
    }
    class Scope {
        std::shared_ptr<RecordingScratchResidency> prior_;
    public:
        explicit Scope(std::shared_ptr<RecordingScratchResidency> owner):prior_(std::move(current_)){current_=std::move(owner);}
        ~Scope(){current_=std::move(prior_);}
        Scope(const Scope&)=delete;Scope& operator=(const Scope&)=delete;
    };
    static const std::shared_ptr<RecordingScratchResidency>& Current(){return current_;}
    static std::shared_ptr<RecordingScratchResidency> Default(const std::string& directory){
        // 독립 codec·fixture는 fallback domain 하나를 공유하고 관리 runtime은 자체 domain을 명시적으로 결속한다.
        // 이 scope는 의도적으로 다른 thread에 상속하지 않는다.
        static auto owner=Discover(directory,std::make_shared<SearchModelResidency>());
        return owner;
    }
private:
    void Release(Usage amount,std::size_t domain){std::lock_guard<std::mutex> lock(mu_);domains_[domain].used-=amount.disk_bytes;used_.disk_bytes-=amount.disk_bytes;used_.file_descriptors-=amount.file_descriptors;used_.ram_bytes-=amount.ram_bytes;}
    void PeakLocked(){peak_.disk_bytes=std::max(peak_.disk_bytes,used_.disk_bytes);peak_.file_descriptors=std::max(peak_.file_descriptors,used_.file_descriptors);peak_.ram_bytes=std::max(peak_.ram_bytes,used_.ram_bytes);}
    const Usage limits_;std::shared_ptr<SearchModelResidency> ram_;
    std::uint64_t preserved_fds_{0};
    bool reader_cleanup_failed_{false};
    struct DiskDomain {std::uint64_t device{0},block{1},limit{0},used{0};};
    std::array<DiskDomain,2> domains_{};std::size_t domain_count_{1};std::uint64_t preserved_disk_{0};
    const std::uint64_t device_;mutable std::mutex mu_;Usage used_{},peak_{};
    inline static thread_local std::shared_ptr<RecordingScratchResidency> current_;
};
} // namespace recording
