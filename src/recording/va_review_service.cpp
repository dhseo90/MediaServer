// 파일 용도: 검토만 실패시키고 deadline·취소·권한 회수·종료에서 작업 자원을 회수한다.
#include "recording/va_review_service.h"
#include <algorithm>
#include <random>

namespace recording {
namespace {
bool Fail(std::string* error,const char* reason){if(error)*error=reason;return false;}
bool Active(const VaReviewJob& job){return job.state=="queued"||job.state=="running";}
std::string SafeError(const std::string& reason) {
    for(const auto* code:{"review-invalid-input","review-no-frames","review-input-too-large","review-mixed-source",
        "review-forbidden","review-cancelled","review-timeout","review-missing-model","review-connect-failed",
        "review-provider-auth","review-provider-rate-limit","review-provider-unavailable","review-invalid-output","review-tls-failed",
        "review-capacity","review-disk-reserve","review-write-failed","review-cleanup-failed",
        "review-publication-uncertain","review-store-invalid","review-store-unavailable","review-store-busy",
        "review-record-too-large","review-response-too-large","review-confirmation-expired",
        "review-target-mismatch","review-binding-digest-mismatch","record-review-provenance-unavailable",
        "evidence-not-found","evidence-checksum-mismatch","evidence-file-invalid"})if(reason==code)return code;
    return "review-failed";
}
}
VaReviewService::VaReviewService(EvidencePackageStore& evidence,VaReviewStore& records,Options options,Infer infer)
    :evidence_(evidence),records_(records),options_(options),infer_(std::move(infer)) {
    if(!options_.enabled||!infer_||!options_.queue_size||options_.queue_size>4||
       options_.remembered_jobs<options_.queue_size+1||options_.remembered_jobs>64||
       options_.queue_wait.count()<=0||options_.queue_wait>std::chrono::seconds(30)||
       options_.execution_time.count()<=0||options_.execution_time>std::chrono::seconds(60))return;
    std::string error;if(!records_.Recover(&error))return;
    std::random_device random;std::string seed;
    for(unsigned i=0;i<8;++i)seed+=std::to_string(random())+":";
    const auto digest=EvidenceSha256(seed.data(),seed.size());if(!EvidenceIsSha256(digest))return;
    epoch_=digest.substr(0,32);
    worker_=std::thread([this]{Run();});ready_=true;
}
VaReviewService::VaReviewService(EvidencePackageStore& evidence,VaReviewStore& records,Options options,
    Infer infer,IsolatedModelHarness):VaReviewService(evidence,records,options,std::move(infer)) {
    isolated_model_harness_=true;
}
VaReviewService::~VaReviewService(){Stop();}
bool VaReviewService::ValidJobId(const std::string& id) {
    if(id.size()<37||id.size()>56||id.rfind("vj-",0)!=0||id[35]!='-')return false;
    if(!std::all_of(id.begin()+3,id.begin()+35,[](char c){return(c>='0'&&c<='9')||(c>='a'&&c<='f');}))return false;
    return id[36]!='0'&&std::all_of(id.begin()+36,id.end(),[](char c){return c>='0'&&c<='9';});
}
bool VaReviewService::Submit(const std::string& id,const std::string& question,const std::string& provider,
    const std::string& owner,Authorize authorize,VaReviewJob* output,std::string* error) {
    if(!output||!EvidencePackageStore::ValidId(id)||!VaReviewText(question)||owner.empty()||owner.size()>256||
       provider!="ollama")return Fail(error,"review-invalid-input");
    if(!options_.enabled||stopped_)return Fail(error,"review-disabled");
    if(!ready_)return Fail(error,"review-store-unavailable");
    struct Admission {
        std::atomic<unsigned>& count;bool ok;
        explicit Admission(std::atomic<unsigned>& c):count(c),ok(c.fetch_add(1)<2){}
        ~Admission(){count.fetch_sub(1);}
    } admission(admitting_);
    if(!admission.ok)return Fail(error,"review-busy");
    const auto deadline=Clock::now()+std::chrono::seconds(5);
    const auto file=evidence_.Open(id,error,[&]{return stopped_||Clock::now()>=deadline;});
    if(!file)return Fail(error,"review-input-unavailable");
    const auto channel=file->manifest().channel_id;
    if(!authorize||!authorize(channel))return Fail(error,"review-forbidden");
    if(!isolated_model_harness_&&*ModelExecutionRestriction())return Fail(error,ModelExecutionRestriction());
    if(file->manifest().frames.empty())return Fail(error,"review-no-frames");
    const auto key_data=EvidenceJsonQuote(owner)+EvidenceJsonQuote(id)+EvidenceJsonQuote(question)+EvidenceJsonQuote(provider);
    const auto key=EvidenceSha256(key_data.data(),key_data.size());
    std::lock_guard lock(mutex_);
    if(stopped_)return Fail(error,"review-disabled");
    for(const auto& pair:jobs_)if(pair.second->key==key&&Active(pair.second->job)) {
        *output=pair.second->job;if(error)error->clear();return true;
    }
    if(queue_.size()>=options_.queue_size)return Fail(error,"review-queue-full");
    while(jobs_.size()>=options_.remembered_jobs) {
        const auto old=std::find_if(order_.begin(),order_.end(),[&](const auto& job){return !Active(jobs_.at(job)->job);});
        if(old==order_.end())return Fail(error,"review-queue-full");
        jobs_.erase(*old);order_.erase(old);
    }
    auto task=std::make_shared<Task>();task->question=question;task->provider=provider;task->key=key;
    task->authorize=std::move(authorize);task->queued=Clock::now();
    task->job={"vj-"+epoch_+"-"+std::to_string(++next_),id,channel,owner,"queued","",""};
    jobs_.emplace(task->job.id,task);order_.push_back(task->job.id);queue_.push_back(task);
    *output=task->job;wake_.notify_one();if(error)error->clear();return true;
}
bool VaReviewService::SubmitConfirmed(const ConfirmedAnalysisRequest& input,const std::string& owner,Authorize authorize,
    VaReviewJob* output,std::string* error) {
    if(!output||!ValidateReviewConfirmation(input.confirmation,error)||owner!=input.confirmation.principal||
        input.confirmation.spec_sha256!=AnalysisReviewSpecDigest(input.binding,input.claims))return Fail(error,"review-invalid-confirmation");
    if(!options_.enabled||stopped_)return Fail(error,"review-disabled");if(!ready_)return Fail(error,"review-store-unavailable");
    if(ReviewWallTimeMs()>=input.confirmation.expires_at_ms)return Fail(error,"review-confirmation-expired");
    if(admitting_.fetch_add(1)>=2){--admitting_;return Fail(error,"review-busy");}
    struct Release{std::atomic<unsigned>& n;~Release(){--n;}}release{admitting_};
    const auto deadline=Clock::now()+std::chrono::seconds(5);
    const auto file=evidence_.Open(input.binding.package_id,error,[&]{return stopped_||Clock::now()>=deadline;});
    if(!file)return false;
    const auto channel=file->manifest().channel_id;
    if(!authorize||!authorize(channel))return Fail(error,"review-forbidden");
    const auto manifest=SerializeEvidencePackage(file->manifest());
    if(file->manifest().schema!="media-server.evidence-package.v2"||
        EvidenceSha256(manifest.data(),manifest.size())!=input.binding.manifest_sha256)return Fail(error,"review-target-mismatch");
    const auto key="A:"+ReviewConfirmationDigest(input.confirmation);
    std::lock_guard lock(mutex_);if(stopped_)return Fail(error,"review-disabled");
    for(const auto& item:jobs_)if(item.second->key==key){*output=item.second->job;if(error)error->clear();return true;}
    if(queue_.size()>=options_.queue_size)return Fail(error,"review-queue-full");
    while(jobs_.size()>=options_.remembered_jobs){const auto old=std::find_if(order_.begin(),order_.end(),[&](const auto& id){return !Active(jobs_.at(id)->job);});
        if(old==order_.end())return Fail(error,"review-queue-full");jobs_.erase(*old);order_.erase(old);}
    auto task=std::make_shared<Task>();task->confirmed=input;task->key=key;task->authorize=std::move(authorize);task->queued=Clock::now();
    task->job={"vj-"+epoch_+"-"+std::to_string(++next_),input.binding.package_id,channel,owner,"queued","","","A"};
    jobs_.emplace(task->job.id,task);order_.push_back(task->job.id);queue_.push_back(task);*output=task->job;wake_.notify_one();
    if(error)error->clear();return true;
}
bool VaReviewService::Get(const std::string& id,const Authorize& authorize,VaReviewJob* output,std::string* error) const {
    if(!output||!ValidJobId(id))return Fail(error,"review-invalid-id");
    VaReviewJob result;
    {
        std::lock_guard lock(mutex_);const auto found=jobs_.find(id);
        if(found==jobs_.end())return Fail(error,id.substr(3,32)!=epoch_?"review-job-expired":"review-job-unavailable");
        result=found->second->job;
    }
    if(!authorize||!authorize(result.channel_id))return Fail(error,"review-forbidden");
    *output=std::move(result);if(error)error->clear();return true;
}
bool VaReviewService::Cancel(const std::string& id,const std::string& owner,bool admin,const Authorize& authorize,std::string* error) {
    VaReviewJob job;if(!Get(id,authorize,&job,error))return false;
    if(!admin&&owner!=job.owner)return Fail(error,"review-forbidden");
    std::lock_guard lock(mutex_);const auto found=jobs_.find(id);
    if(found==jobs_.end())return Fail(error,"review-job-unavailable");
    auto task=found->second;
    if(task->job.state=="queued") {
        queue_.erase(std::remove(queue_.begin(),queue_.end(),task),queue_.end());
        task->job.state="cancelled";task->job.error="review-cancelled";task->authorize={};
        // Removed from queue under the same mutex: no worker can still consume these inputs.
        task->question.clear();task->confirmed.reset();
    }
    if(Active(task->job))task->cancelled=true;
    wake_.notify_one();if(error)error->clear();return true;
}
void VaReviewService::Finish(const std::shared_ptr<Task>& task,const std::string& state,const std::string& error,const std::string& result) {
    std::lock_guard lock(mutex_);task->job.state=state;task->job.error=error;task->job.review_id=result;
    task->authorize={};task->question.clear();task->confirmed.reset();
}
void VaReviewService::Execute(const std::shared_ptr<Task>& task) {
    const auto began=Clock::now(),deadline=began+options_.execution_time;
    const auto authorize=[callback=task->authorize](const std::string& channel){
        try{return callback&&callback(channel);}catch(...){return false;}
    };
    const auto expired=[&]{return task->confirmed&&ReviewWallTimeMs()>=task->confirmed->confirmation.expires_at_ms;};
    const auto interrupted=[&]{return stopped_||task->cancelled||Clock::now()>=deadline||expired()||!authorize(task->job.channel_id);};
    const auto fail=[&](const std::string& error){
        const bool denied=!authorize(task->job.channel_id);
        const bool timed=Clock::now()>=deadline;
        const bool cancelled=stopped_||task->cancelled;
        Finish(task,cancelled?"cancelled":"failed",denied?"review-forbidden":timed?"review-timeout":
            cancelled?"review-cancelled":expired()?"review-confirmation-expired":SafeError(error));
    };
    try {
        if(task->confirmed){
            const auto request=*task->confirmed;VaReviewRecordV3 record;std::string error,id;
            if(interrupted()||!BuildAnalysisReviewRecord(evidence_,request.binding,request.claims,ReviewWallTimeMs(),authorize,
                &record.analysis,&error,interrupted)||interrupted()){fail(error);return;}
            record.confirmation=request.confirmation;record.confirmation_sha256=ReviewConfirmationDigest(record.confirmation);
            if(!records_.PublishV3(record,&id,&error,interrupted)){fail(error);return;}
            Finish(task,"completed","",id);return;
        }
        VaReviewInput input;std::string error;
        if(!LoadVaReviewInput(evidence_,task->job.package_id,task->question,authorize,&input,&error,interrupted)) {fail(error);return;}
        VaReviewInference result;
        if(interrupted()||!infer_(input,task->provider,deadline,interrupted,&result,&error)||interrupted()) {fail(error);return;}
        if(result.provider!=task->provider){fail("review-invalid-output");return;}
        VaReviewRecord record;input.pngs.clear();record.input=std::move(input);record.output=std::move(result.output);
        record.revision_id=task->job.id;record.provider=result.provider;record.model=result.model;
        record.model_revision=result.model_revision;record.prompt_sha256=result.prompt_sha256;record.adapter_version=result.adapter_version;
        record.created_at_ms=std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        record.latency_ms=int(std::chrono::duration_cast<std::chrono::milliseconds>(Clock::now()-began).count());
        std::string id;if(!records_.Publish(record,&id,&error,interrupted)){fail(error);return;}
        // 원자 게시 후 취소가 경합하면 이미 확정된 결과를 보고한다. 게시본을 지우지 않는다.
        Finish(task,"completed","",id);
    } catch(...) {fail("review-failed");}
}
void VaReviewService::Run() {
    while(true) {
        std::shared_ptr<Task> task;
        {
            std::unique_lock lock(mutex_);wake_.wait(lock,[&]{return stopped_||!queue_.empty();});
            if(stopped_)return;
            task=queue_.front();queue_.pop_front();
            if(Clock::now()-task->queued>=options_.queue_wait) {
                task->job.state="failed";task->job.error="review-queue-timeout";task->authorize={};task->question.clear();task->confirmed.reset();continue;
            }
            task->job.state="running";
        }
        Execute(task);
    }
}
void VaReviewService::Stop() {
    std::call_once(stop_once_,[&]{
        {
            std::lock_guard lock(mutex_);stopped_=true;
            for(auto& task:queue_) {task->cancelled=true;task->job.state="cancelled";task->job.error="review-cancelled";
                task->authorize={};task->question.clear();task->confirmed.reset();}
            queue_.clear();
        }
        wake_.notify_all();if(worker_.joinable())worker_.join();
    });
}
} // namespace recording
