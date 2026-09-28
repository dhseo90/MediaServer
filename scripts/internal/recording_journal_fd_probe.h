// 파일 용도: catalog focused의 journal 번역 단위에서 실제 복제 FD만 관측한다.
#pragma once
#include <fcntl.h>
#include <unistd.h>
#include <cstdio>
#include <cerrno>
#include <fstream>
#include <sstream>

bool S10FailJournalCall(const char* operation, int fd);
inline ssize_t S10ObservedWrite(int fd,const void* bytes,size_t count) {
    if(S10FailJournalCall("write",fd)){errno=EIO;return -1;}
    return ::write(fd,bytes,count);
}
inline int S10ObservedFsync(int fd) {
    if(S10FailJournalCall("fsync",fd)){errno=EIO;return -1;}
    return ::fsync(fd);
}
inline int S10ObservedRenameat(int from,const char* source,int to,const char* target) {
    if(S10FailJournalCall("rename",from)){errno=EIO;return -1;}
    return ::renameat(from,source,to,target);
}

void S10ObserveDuplicate(int source, int duplicated);
void S10ObserveRead(int fd, ssize_t count);
inline ssize_t S10ObservedPread(int fd, void* bytes, size_t count, off_t offset) {
    const ssize_t result = ::pread(fd, bytes, count, offset);
    S10ObserveRead(fd, result);
    return result;
}
inline int S10ObservedDup(int fd) {
    const int result = ::dup(fd);
    S10ObserveDuplicate(fd, result);
    return result;
}
template <typename... Args>
inline int S10ObservedFcntl(int fd, int command, Args... args) {
    const int result = ::fcntl(fd, command, args...);
    if (command == F_DUPFD || command == F_DUPFD_CLOEXEC) S10ObserveDuplicate(fd, result);
    return result;
}
#define dup(...) S10ObservedDup(__VA_ARGS__)
#define fcntl(...) S10ObservedFcntl(__VA_ARGS__)
#define pread(...) S10ObservedPread(__VA_ARGS__)
#define write(...) S10ObservedWrite(__VA_ARGS__)
#define fsync(...) S10ObservedFsync(__VA_ARGS__)
#define renameat(...) S10ObservedRenameat(__VA_ARGS__)
