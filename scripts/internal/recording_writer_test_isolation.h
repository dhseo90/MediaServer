// 파일 용도: writer 검사 전용. 제품 설정 singleton을 만지기 전에 쓰기 경계를 검증한다.
#pragma once
#include <cstdlib>
#include <cerrno>
#include <filesystem>
#include <string>
#include <sys/stat.h>
#include <unistd.h>

inline bool RecordingWriterTestIsolation(const std::filesystem::path& root) {
    namespace fs=std::filesystem;
    try {
        const auto temp=fs::canonical("/tmp");
        if(!root.is_absolute()||root!=fs::canonical(root)||root==temp||fs::current_path()!=root)return false;
        auto r=root.begin(),t=temp.begin();for(;t!=temp.end();++t,++r)if(r==root.end()||*r!=*t)return false;
        if(r==root.end())return false;
        const auto name=r->string();
        if(name.rfind("media-server-",0)!=0&&name.rfind("media_server_",0)!=0)return false;
        auto path=temp;
        for(;r!=root.end();++r){path/=*r;struct stat s{};
            if(::lstat(path.c_str(),&s)||!S_ISDIR(s.st_mode)||s.st_uid!=::getuid()||(s.st_mode&0022))return false;
        }
        const char* skip=std::getenv("MEDIA_SERVER_SKIP_LOCAL_ENV");if(!skip||std::string(skip)!="1")return false;
        for(const auto* key:{"MEDIA_SERVER_SOURCE_REGISTRY","MEDIA_SERVER_PUBLISHED_VIEWS",
            "MEDIA_SERVER_ANALYSIS_REGISTRY","MEDIA_SERVER_AUTH_USERS_FILE","MEDIA_SERVER_RECORDING_STORAGE_ROOT",
            "MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH","MEDIA_SERVER_FILE_ROOT","HOME","XDG_CACHE_HOME","TMPDIR","GST_REGISTRY","GST_REGISTRY_1_0"}) {
            const char* value=std::getenv(key);if(!value||!*value)return false;
            const fs::path target(value);if(!target.is_absolute()||target!=target.lexically_normal())return false;
            auto a=target.begin(),b=root.begin();for(;b!=root.end();++b,++a)if(a==target.end()||*a!=*b)return false;
            if(a==target.end())return false;
            path=root;
            for(;a!=target.end();++a){path/=*a;struct stat s{};
                if(::lstat(path.c_str(),&s)) {
                    // A missing leaf is allowed; all parents must already be verified directories.
                    auto next=a;++next;if(errno!=ENOENT||next!=target.end())return false;
                } else if(s.st_uid!=::getuid()||S_ISLNK(s.st_mode)||
                          (!S_ISDIR(s.st_mode)&&!S_ISREG(s.st_mode))||
                          (S_ISREG(s.st_mode)&&s.st_nlink!=1)||(s.st_mode&0022))return false;
            }
        }
        for(const auto* key:{"MEDIA_SERVER_SOURCE_REGISTRY","MEDIA_SERVER_PUBLISHED_VIEWS","MEDIA_SERVER_ANALYSIS_REGISTRY","MEDIA_SERVER_AUTH_USERS_FILE","GST_REGISTRY","GST_REGISTRY_1_0"}) {
            struct stat s{};if(::lstat(std::getenv(key),&s)==0&&!S_ISREG(s.st_mode))return false;
        }
        for(const auto* key:{"MEDIA_SERVER_RECORDING_STORAGE_ROOT","MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH","MEDIA_SERVER_FILE_ROOT","HOME","XDG_CACHE_HOME","TMPDIR"}) {
            struct stat s{};if(::lstat(std::getenv(key),&s)||!S_ISDIR(s.st_mode))return false;
        }
        const fs::path source(std::getenv("MEDIA_SERVER_SOURCE_REGISTRY")),views(std::getenv("MEDIA_SERVER_PUBLISHED_VIEWS"));
        return source!=views&&source.filename()!=".media_server.sources.json"&&views.filename()!=".media_server.views.json";
    } catch(...) { return false; }
}
