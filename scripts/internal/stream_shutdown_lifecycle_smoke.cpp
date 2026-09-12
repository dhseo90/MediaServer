// 파일 용도: 실제 stream/manager 소멸자의 stop·drain·grace 계약을 worker barrier로 검증한다.
#include "core/session_manager.h"
#include <chrono>
#include <condition_variable>
#include <cstdlib>
#include <iostream>
#include <new>
#include <thread>
#include <unistd.h>

using namespace std::chrono_literals;
namespace {
void Check(bool value, const char* label) {
    std::cout << (value ? "[PASS] " : "[FAIL] ") << label << std::endl;
    if (!value) std::_Exit(1); // 실패한 수명 경계의 callback을 더 실행하지 않는다.
}
struct Gate {
    std::mutex mu;
    std::condition_variable cv;
    bool started=false, stop_entered=false, released=false;
    bool block_stop=false, hold_owner=false;
    std::atomic<bool> stopped{false};
    std::atomic<bool> reject_stop{false};
    std::atomic<bool> owners_alive{true};
    std::vector<std::weak_ptr<core::SharedStream>> owners;
};
class Worker final : public core::SourceWorker {
public:
    Worker(media::SourceSpec spec, std::shared_ptr<Gate> gate) : spec_(std::move(spec)), gate_(std::move(gate)) {}
    const media::SourceSpec& source_spec() const override { return spec_; }
    bool Start(const std::shared_ptr<core::SharedStream>& stream, std::string*) override {
        running_=true;
        if (gate_->hold_owner) {
            thread_=std::thread([this, stream] {
                std::unique_lock lock(gate_->mu);
                gate_->started=true; gate_->cv.notify_all();
                gate_->cv.wait(lock,[this]{return !running_;});
            });
            std::unique_lock lock(gate_->mu);
            gate_->cv.wait(lock,[this]{return gate_->started;});
        }
        return true;
    }
    bool IsRunning() const override { return running_; }
    void Stop() override {
        if (gate_->reject_stop) Check(false,"LC04 manager cancels pending idle cleanup at destruction");
        for (const auto& owner : gate_->owners) if (owner.expired()) gate_->owners_alive=false;
        {
            std::unique_lock lock(gate_->mu);
            gate_->stop_entered=true; gate_->cv.notify_all();
            gate_->cv.wait(lock,[this]{return !gate_->block_stop || gate_->released;});
            running_=false; gate_->cv.notify_all();
        }
        if (thread_.joinable()) thread_.join();
        gate_->stopped=true; gate_->cv.notify_all();
    }
private:
    media::SourceSpec spec_;
    std::shared_ptr<Gate> gate_;
    std::atomic<bool> running_{false};
    std::thread thread_;
};
core::SessionManager::AuxiliaryStreamHandle Add(core::StreamRegistry& registry,
        core::ResourceGuard& guard, const char* key, const std::shared_ptr<Gate>& gate) {
    media::SourceSpec spec{media::SourceSpec::Kind::File, "fixture.mp4"};
    auto acquired=registry.Acquire(key,spec);
    if (!guard.AdmitStream() || !acquired.stream->StartSource(std::make_unique<Worker>(spec,gate),nullptr)) std::_Exit(2);
    return {true,"ok",key,acquired.stream,spec,true};
}
void Entered(const std::shared_ptr<Gate>& gate) {
    std::unique_lock lock(gate->mu);
    if (!gate->cv.wait_for(lock,2s,[&]{return gate->stop_entered;})) std::_Exit(2);
}
void Release(const std::shared_ptr<Gate>& gate) {
    std::lock_guard lock(gate->mu); gate->released=true; gate->cv.notify_all();
}
void Run(const std::string& mode) {
    core::ResourceGuard guard(10,10);
    if (mode=="LC01" || mode=="LC02") {
        auto registry=std::make_unique<core::StreamRegistry>();
        auto a=std::make_shared<Gate>(), b=std::make_shared<Gate>();
        a->hold_owner=mode=="LC01";
        auto x=Add(*registry,guard,"a",a), y=Add(*registry,guard,"b",b);
        a->owners={x.stream,y.stream}; b->owners=a->owners;
        x.stream.reset(); y.stream.reset();
        registry.reset();
        if (mode=="LC01") Check(a->stopped && b->stopped,"LC01 registry stops and joins worker-held streams before returning");
        else Check(a->owners_alive && b->owners_alive && a->stopped && b->stopped,"LC02 registry retains every stream until all workers stop");
        return;
    }
    core::StreamRegistry registry;
    // 실제 소멸자는 호출하되 실패 재현 중 backing storage가 allocator에 재사용되지 않게 한다.
    // 소멸 뒤 callback 실행 자체가 결함이며 별도 프로세스에서 즉시 실패 종료한다.
    alignas(core::SessionManager) unsigned char storage[sizeof(core::SessionManager)];
    auto destroy_manager=[](core::SessionManager* value){value->~SessionManager();};
    std::unique_ptr<core::SessionManager,decltype(destroy_manager)> manager(
        new(storage) core::SessionManager(registry,guard),destroy_manager);
    auto a=std::make_shared<Gate>();
    auto x=Add(registry,guard,"a",a);
    if (mode=="LC04") {
        a->reject_stop=true;
        manager->ReleaseAuxiliaryStreamWhenIdle(x);
        manager.reset();
        std::this_thread::sleep_for(250ms);
        Check(!a->stopped && registry.ActiveStreamCount()==1,
              "LC04 manager cancels pending idle cleanup at destruction");
        a->reject_stop=false;
        x.stream->StopSource();
        return;
    }
    if (mode=="LC03") {
        a->block_stop=true;
        manager->ReleaseAuxiliaryStreamWhenIdle(x);
        Entered(a);
        std::mutex mu; std::condition_variable cv; bool began=false,done=false;
        std::thread destroy([&]{ {std::lock_guard lock(mu);began=true;cv.notify_all();} manager.reset();
            {std::lock_guard lock(mu);done=true;cv.notify_all();} });
        { std::unique_lock lock(mu); cv.wait(lock,[&]{return began;});
          if (cv.wait_for(lock,50ms,[&]{return done;})) Check(false,"LC03 manager drains an executing idle callback before returning"); }
        Release(a); destroy.join();
        Check(a->stopped && registry.ActiveStreamCount()==0 && guard.ActiveStreams()==0,
              "LC03 manager drains an executing idle callback before returning");
        return;
    }
    manager->ReleaseAuxiliaryStreamWhenIdle(x);
    if (mode=="LC06") {
        auto lease=registry.Acquire("a",x.source_spec);
        std::this_thread::sleep_for(250ms);
        Check(!a->stopped && registry.ActiveStreamCount()==1 && guard.ActiveStreams()==1,
              "LC06 reacquired lease preserves stream across idle grace");
        registry.ReleaseLease("a");
    } else {
        Entered(a);
        for (int n=0;n<100 && guard.ActiveStreams()!=0;++n) std::this_thread::sleep_for(2ms);
        Check(a->stopped && registry.ActiveStreamCount()==0 && guard.ActiveStreams()==0,
              "LC05 normal idle grace removes stream and releases admission");
    }
}
}
namespace core {
std::unique_ptr<SourceWorker> CreateSourceWorker(const media::SourceSpec&) { return {}; }
}
int main(int argc,char** argv) {
    if(argc!=2) return 2;
    alarm(8);
    setenv("MEDIA_SERVER_IDLE_GRACE_MS","100",1);
    Run(argv[1]);
    return 0;
}
