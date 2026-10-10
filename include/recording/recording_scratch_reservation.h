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
        // Exclusive ticket: reserve growth before filesystem writes. No blocking wait.
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
        // Failed transaction cleanup preserves real files. Keep their disk charge
        // in the failed storage domain after its C++ transaction disappears. A fresh
        // storage owner re-observes free space; this is never reported as cleanup.
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
    // Explicit limits are also the deterministic saturation injection boundary.
    // Production Discover freezes existing filesystem availability / process FD headroom;
    // these are NOT a storage-format, full-process RAM, or physical allocation guarantee.
    RecordingScratchResidency(Usage limits,std::shared_ptr<SearchModelResidency> ram,
        std::uint64_t block=1,std::uint64_t device=0)
        :limits_(limits),ram_(std::move(ram)),device_(device){domains_[0]={device,block?block:1,limits.disk_bytes,0};}
    std::optional<Reservation> Reserve(Usage amount,std::size_t domain=0){
        if(!ram_||amount.ram_bytes>std::numeric_limits<std::size_t>::max())return std::nullopt;
        auto ram=ram_->ReserveOwned(static_cast<std::size_t>(amount.ram_bytes));
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
        // A storage owner has exactly two possible locations: anonymous tmp and
        // its one managed root. Never create a growing filesystem-domain cache.
        if(domain_count_==domains_.size())throw RecordingResourceUnavailable();
        const auto index=domain_count_++;domains_[index]={static_cast<std::uint64_t>(st.st_dev),space.f_frsize,space.f_bavail*space.f_frsize,0};return index;
#else
        (void)directory;throw RecordingResourceUnavailable();
#endif
    }
    Usage usage()const{std::lock_guard<std::mutex> lock(mu_);return used_;}
    Usage peak()const{std::lock_guard<std::mutex> lock(mu_);return peak_;}
    Usage limits()const{return limits_;}
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
        // Standalone codecs/fixtures share one fallback domain; managed runtime binds
        // its own domain explicitly. Scope is deliberately not inherited by threads.
        static auto owner=Discover(directory,std::make_shared<SearchModelResidency>());
        return owner;
    }
private:
    void Release(Usage amount,std::size_t domain){std::lock_guard<std::mutex> lock(mu_);domains_[domain].used-=amount.disk_bytes;used_.disk_bytes-=amount.disk_bytes;used_.file_descriptors-=amount.file_descriptors;used_.ram_bytes-=amount.ram_bytes;}
    void PeakLocked(){peak_.disk_bytes=std::max(peak_.disk_bytes,used_.disk_bytes);peak_.file_descriptors=std::max(peak_.file_descriptors,used_.file_descriptors);peak_.ram_bytes=std::max(peak_.ram_bytes,used_.ram_bytes);}
    const Usage limits_;std::shared_ptr<SearchModelResidency> ram_;
    std::uint64_t preserved_fds_{0};
    struct DiskDomain {std::uint64_t device{0},block{1},limit{0},used{0};};
    std::array<DiskDomain,2> domains_{};std::size_t domain_count_{1};std::uint64_t preserved_disk_{0};
    const std::uint64_t device_;mutable std::mutex mu_;Usage used_{},peak_{};
    inline static thread_local std::shared_ptr<RecordingScratchResidency> current_;
};
} // namespace recording
