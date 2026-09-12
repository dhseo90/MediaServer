// 파일 용도: 비공개 Budget의 단발 취소 신호를 UB 없이 직접 검증한다.
#include "../../src/recording/recording_derived_remux.cpp"
#include <atomic>
#include <iostream>
int main() {
    std::atomic<bool> fired{false};
    const std::function<bool()> once=[&]{return !fired.exchange(true);};
    const recording::Budget budget{recording::Clock::now()+std::chrono::seconds(1),once};
    const bool stopped=budget.Stop();bool rejected=false;
    try{budget.Check();}catch(const std::runtime_error& e){rejected=std::string(e.what())=="work-cancelled";}
    const bool ok=stopped&&rejected;
    std::cout<<(ok?"[pass] ":"[fail] ")<<"R14 단발 true→false 취소의 단조 고정\n";
    std::cout<<"[summary] pass="<<(ok?1:0)<<" fail="<<(ok?0:1)<<'\n';return ok?0:1;
}
