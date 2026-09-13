// 파일 용도: optional OpenSSL 부재에서 OS CSPRNG 관리 identity만 검증한다. 미디어 생성 증거가 아니다.
#include "recording/recording_journal.h"
#include <iostream>
int main(int argc,char** argv) {
    if(argc!=2)return 2;
    std::string error,id;
    {
        recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{argv[1],{}});
        if(!journal.Open(&error)){std::cout<<"[fail] D02-01 crypto-off 신규 identity\n";return 1;}
        id=journal.ManagedStoreId();
    }
    recording::RecordingJournal journal(recording::RecordingJournal::ManagedOptions{argv[1],{}});
    const bool ok=journal.Open(&error)&&!id.empty()&&journal.ManagedStoreId()==id;
    std::cout<<(ok?"[pass] ":"[fail] ")<<"D02-01 crypto-off OS CSPRNG 생성/재개방 identity\n";
    return ok?0:1;
}
