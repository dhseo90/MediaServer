#pragma once
// 파일 용도: ticket 저장 IO의 구현 전용 공유 선언. 미디어 검사·게시·catalog 실행을 포함하지 않는다.
#include "recording/recording_finalize_ticket.h"
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
namespace recording::detail::finalize_ticket {
struct Fd {
    int fd{-1};explicit Fd(int value=-1):fd(value){}~Fd(){if(fd>=0)::close(fd);}
    Fd(const Fd&)=delete;Fd& operator=(const Fd&)=delete;
    Fd(Fd&& o) noexcept:fd(o.fd){o.fd=-1;}
    Fd& operator=(Fd&& o) noexcept{if(this!=&o){if(fd>=0)::close(fd);fd=o.fd;o.fd=-1;}return *this;}
};
bool Fail(std::string*,const std::string&);
bool Same(const struct stat&,const struct stat&);
bool StableFile(const struct stat&,const struct stat&,nlink_t links=1);
bool Relative(const std::filesystem::path&);
std::filesystem::path Root(const std::filesystem::path&);
Fd Directory(const std::filesystem::path&);
struct Parent {
    std::filesystem::path absolute;Fd fd;struct stat status{};
    bool Open(const std::filesystem::path& root,const std::filesystem::path& rel){
        auto r=Root(root);if(r.empty()||!Relative(rel))return false;absolute=r/rel.parent_path();fd=Directory(absolute);
        return fd.fd>=0&&::fstat(fd.fd,&status)==0;
    }
    bool Stable()const{auto now=Directory(absolute);struct stat s{};return now.fd>=0&&::fstat(now.fd,&s)==0&&Same(s,status);}
};
std::filesystem::path TicketPath(const FinalizeReadyTicket&);
bool Validate(const FinalizeReadyTicket&,std::string*);
std::string Serialize(const FinalizeReadyTicket&);
bool Read(const std::filesystem::path&,const std::filesystem::path&,FinalizeReadyTicket*,bool*,std::string*,struct stat* binding=nullptr);
} // namespace recording::detail::finalize_ticket
