// 파일 용도: 독립 JSON 기대값으로 제품 판정 핵심과 관측 adapter를 직접 검사한다.
// 기존 격리 smoke의 PNG/store/transport 수명 경로를 재사용한다.
using namespace recording;
ReviewRelation CoreRelation(const std::string& name){
    const std::map<std::string,ReviewRelation> names{{"color",ReviewRelation::ColorAt},{"visible",ReviewRelation::VisibilityAt},{"right",ReviewRelation::EndpointRight},
        {"left",ReviewRelation::EndpointLeft},{"same",ReviewRelation::EndpointSame},{"different",ReviewRelation::EndpointDifferent},{"all-color",ReviewRelation::AllColor},
        {"all-visible",ReviewRelation::AllVisible},{"all-same",ReviewRelation::AllSamePosition},{"continuous",ReviewRelation::ContinuousMotion}};return names.at(name);
}
std::vector<std::string> CoreRows(const std::filesystem::path& root){auto fixture=CauseDoc(CauseRead(root/"core-fixture.json"));std::vector<std::string> rows;
    Check(recording::review_json::Array(fixture,"cases",&rows),"V450-K05 independent fixture loaded");return rows;}
std::string CoreText(const recording::review_json::Doc& d,const char* key){std::string out;recording::review_json::Text(d,key,&out);return out;}
std::vector<int> CoreXs(const recording::review_json::Doc& d){std::vector<std::string> xs;recording::review_json::Array(d,"xs",&xs);std::vector<int> result;
    for(const auto& x:xs){auto scalar=CauseDoc("{\"v\":"+x+"}");int n=-2;if(scalar.Find("v")->type!=recording::review_json::Type::Null){if(!recording::review_json::Number(scalar,"v",&n))throw std::runtime_error("core-fixture-coordinate");}result.push_back(n);}return result;}
ReviewClaimSpec CoreSpec(const recording::review_json::Doc& d){ReviewClaimSpec s;s.id="c0";s.target_id="target0";s.comparison_target_id=s.target_id;
    s.target_description="화면의 사각형";s.relation=CoreRelation(CoreText(d,"relation"));
    if(CoreText(d,"requiredColor")=="blue")s.required_color=ReviewColor::Blue;
    if(ingress::StrictJsonBoolField(d,"requiredVisible")==false)s.required_visible=false;
    for(std::size_t i=0;i<CoreXs(d).size();++i)s.scope.push_back(i);
    return s;
    }
std::vector<ReviewFrame> CoreFrames(const recording::review_json::Doc& d){std::vector<ReviewFrame> frames;std::vector<std::string> times;recording::review_json::Array(d,"times",&times);
    for(std::size_t i=0;i<CoreXs(d).size();++i)frames.push_back({times.empty()?std::int64_t(i)*1000000000:std::stoll(times[i]),512,288,CauseHash("synthetic-frame-"+std::to_string(i))});
    return frames;
    }
std::vector<ReviewObservation> CoreObservations(const recording::review_json::Doc& d,const ReviewClaimSpec& s,const std::vector<ReviewFrame>& frames){
    const auto xs=CoreXs(d);std::vector<std::string> identities,colors,omit;recording::review_json::Array(d,"identities",&identities);recording::review_json::Array(d,"colors",&colors);recording::review_json::Array(d,"omit",&omit);
    std::vector<ReviewObservation> out;std::size_t anchor=0;while(anchor<xs.size()&&xs[anchor]<0)++anchor;
    for(std::size_t i=0;i<xs.size();++i){if(std::any_of(omit.begin(),omit.end(),[&](const auto& v){return std::stoul(v)==i;}))continue;
        ReviewObservation o;o.target_id=s.target_id;o.frame=i;o.pts_ns=frames[i].pts_ns;o.evidence_sha256=frames[i].evidence_sha256;
        if(xs[i]>=0){o.visibility=ReviewVisibility::Visible;o.identity=ReviewIdentity::Same;o.identity_anchor=anchor;o.identity_evidence="합성 사각형의 색과 크기";
            if(!identities.empty()&&CoreText(CauseDoc("{\"v\":"+identities[i]+"}"),"v")=="different")o.identity=ReviewIdentity::Different;
            o.position=ReviewPoint{double(xs[i])+24,144};o.color=!colors.empty()&&CoreText(CauseDoc("{\"v\":"+colors[i]+"}"),"v")=="blue"?ReviewColor::Blue:ReviewColor::Red;
        }else o.visibility=xs[i]==-1?ReviewVisibility::NotVisible:ReviewVisibility::Unknown;
        out.push_back(o);
    }return out;
}
VaReviewInput CoreImageInput(EvidencePackageStore& store,const recording::review_json::Doc& d){
    const auto xs=CoreXs(d);std::vector<EvidencePayload> payloads;auto manifest=Manifest(xs.size(),&payloads);
    for(std::size_t i=0;i<xs.size();++i){auto png=QualityPng(xs[i]);const auto sha=CauseHash(std::string(png.begin(),png.end()));payloads[i].bytes=png;
        auto& f=manifest.frames[i];f.width=512;f.height=288;f.png_sha256=sha;f.pts_ns=std::int64_t(i)*1000000000;f.presentation_ns=f.pts_ns;
        manifest.assets[i].sha256=sha;manifest.assets[i].size_bytes=png.size();auto& ref=manifest.references[i+2];ref.id=f.segment_id+":"+std::to_string(f.pts_ns);ref.sha256=sha;}
    std::string id,error;VaReviewInput input;Check(store.Publish(manifest,payloads,&id,&error)&&LoadVaReviewInput(store,id,"관측 검증",[](const auto&){return true;},&input,&error),"V450-K05 isolated image input");return input;
}
std::string CoreDecisionJson(const std::vector<ReviewDecision>& decisions){std::string out="[";for(const auto& d:decisions){if(out.size()>1)out+=',';
    out+="{\"claim\":"+EvidenceJsonQuote(d.claim_id)+",\"verdict\":"+EvidenceJsonQuote(ReviewVerdictName(d.verdict))+",\"gaps\":[";
    for(std::size_t i=0;i<d.gaps.size();++i){if(i)out+=',';const auto& g=d.gaps[i];out+="{\"kind\":"+EvidenceJsonQuote(ReviewGapName(g.kind))+",\"target\":"+EvidenceJsonQuote(g.target_id)+",\"beginPtsNs\":"+std::to_string(g.begin_pts_ns)+",\"endPtsNs\":"+std::to_string(g.end_pts_ns)+",\"frames\":[";
        for(std::size_t j=0;j<g.frames.size();++j){if(j)out+=',';out+=std::to_string(g.frames[j]);}out+="]}";}out+="]}";}return out+"]";}
std::string CorePlan(const std::filesystem::path& root){EvidencePackageStore store(root/"core-images",{});std::string error;Check(store.Recover(&error),"V450-K05 owned image store");std::string plan="[";
    for(const auto& raw:CoreRows(root)){auto d=CauseDoc(raw);if(ingress::StrictJsonBoolField(d,"actual")!=true)continue;auto input=CoreImageInput(store,d);auto spec=CoreSpec(d);std::string request;
        Check(BuildReviewObservationRequest(input,spec,"qwen3-vl:8b-instruct-q4_K_M",&request,&error),"V450-K05 frozen image request");
        if(plan.size()>1)plan+=',';
        plan+="{\"case\":"+EvidenceJsonQuote(CoreText(d,"id"))+",\"requestSha256\":"+EvidenceJsonQuote(CauseHash(request))+",\"request\":"+request+"}";
    }return plan+"]";}
void CoreChecks(const std::filesystem::path& root,const std::set<std::string>& selected={}){using namespace recording::review_json;
    for(const auto& raw:CoreRows(root)){const auto d=CauseDoc(raw);if(!selected.empty()&&!selected.count(CoreText(d,"id")))continue;auto spec=CoreSpec(d);auto frames=CoreFrames(d);auto observations=CoreObservations(d,spec,frames);const auto mutation=CoreText(d,"mutation");
        if(mutation=="reference")observations.back().frame=9;
        if(mutation=="pts")observations.back().pts_ns++;
        if(mutation=="sha")observations.back().evidence_sha256=std::string(64,'a');
        if(mutation=="infinity")observations.back().position->x=std::numeric_limits<double>::infinity();
        if(mutation=="range")observations.back().position->x=512;
        if(mutation=="normalized")spec.coordinates="normalized";
        if(mutation=="duplicate")observations.push_back(observations.back());
        if(mutation=="anchor")observations.front().identity_anchor=1;
        if(mutation=="separate-anchor")observations.back().identity_anchor=1;
        if(mutation=="version")spec.policy_version=9;
        if(mutation=="hidden-value")observations.back().visibility=ReviewVisibility::NotVisible;
        std::vector<ReviewDecision> decisions(1);decisions[0].claim_id="unchanged";std::string error;
        const bool ok=EvaluateReviewClaims({spec},frames,observations,&decisions,&error);const auto expected=CoreText(d,"expected");
        std::cout<<"[core-case] {\"id\":"<<EvidenceJsonQuote(CoreText(d,"id"))<<",\"accepted\":"<<(ok?"true":"false")<<",\"error\":"<<EvidenceJsonQuote(error)<<",\"decisions\":"<<CoreDecisionJson(decisions)<<"}"<<std::endl;
        if(expected=="error")Check(!ok&&error==CoreText(d,"error")&&decisions[0].claim_id=="unchanged","V450-K05 invalid input is error; output unchanged");
        else{Check(ok&&decisions.size()==1&&ReviewVerdictName(decisions[0].verdict)==expected,"V450-K05 independent expected decision");
            std::vector<std::string> gaps;Array(d,"gaps",&gaps);std::set<std::string> want,got;for(auto s:gaps)want.insert(CoreText(CauseDoc("{\"v\":"+s+"}"),"v"));
            for(const auto& g:decisions[0].gaps){got.insert(ReviewGapName(g.kind));Check(g.target_id==spec.target_id&&!g.frames.empty(),"V450-K05 structured gap target and time reference");}
            Check(want==got,"V450-K05 all independent gap expectations");}
    }
    if(!selected.empty())return;
    auto fixture=CauseDoc(CauseRead(root/"core-fixture.json"));std::vector<std::string> rows;Array(fixture,"budgets",&rows);
    for(const auto& raw:rows){auto row=CauseDoc(raw);unsigned s=0,u=0,g=0,bytes=0;Check(Number(row,"s",&s)&&Number(row,"u",&u)&&Number(row,"gaps",&g),"V450-K05 budget fixture");Number(row,"textBytes",&bytes);
        std::vector<ReviewDecision> ds;std::vector<ReviewExpression> es;const std::string text=bytes?std::string(bytes,ingress::StrictJsonBoolField(row,"escaped")==true?'\\':'a'):"검증 전용 표현";
        for(unsigned i=0;i<s+u;++i){ReviewDecision d;d.claim_id="c"+std::to_string(i);d.verdict=i<s?ReviewVerdict::Supported:ReviewVerdict::Insufficient;d.evidence_frames={0};ReviewExpression e;e.summary=text;
            if(i>=s)for(unsigned j=0;j<g;++j){d.gaps.push_back({static_cast<ReviewGapKind>(j),"t",{0},0,0});e.missing.push_back(text);e.questions.push_back(text);}
            ds.push_back(d);es.push_back(e);}
        ReviewProjectionBudget b;std::string error;bool ok=CheckReviewProjectionBudget(ds,es,1,&b,&error);
        std::cout<<"[core-budget] {\"claims\":"<<b.claims<<",\"unclear\":"<<b.unclear<<",\"questions\":"<<b.questions<<",\"bytes\":"<<b.bytes<<",\"accepted\":"<<(ok?"true":"false")<<",\"error\":"<<EvidenceJsonQuote(error)<<"}"<<std::endl;
        Check(ok==(ingress::StrictJsonBoolField(row,"accepted")==true)&&(ok||error=="projection-limit"),"V450-K05 full projection budget; no truncation");
        Check(ds.size()==s+u&&es.size()==s+u,"V450-K05 budget rejection preserves all claims");
    }
    // Adapter 경계: verdict/basis는 입력 필드가 아니며 어느 값으로 바꿔도 거부한다.
    const auto row=CauseDoc(CoreRows(root).front());auto spec=CoreSpec(row);auto frames=CoreFrames(row);std::string error;
    const std::string observation=R"({"f0":{"visibility":"visible","identity":"same","anchor":0,"identityEvidence":"같은 사각형","bbox_2d":[406,417,500,583],"color":null}})";
    std::vector<ReviewObservation> obs;Check(DecodeReviewObservations(observation,spec,frames,&obs,&error),"V450-K05 typed observation codec");
    for(const auto* verdict:{"supported","contradicted"}){auto poisoned=observation;poisoned.pop_back();poisoned+=",\"verdict\":"+EvidenceJsonQuote(verdict)+",\"basis\":\"visible-property\"}";
        Check(!DecodeReviewObservations(poisoned,spec,frames,&obs,&error)&&error=="observation-shape","V450-K05 model decision/basis cannot select server policy");}
    auto invalid=CauseReplace(observation,"406","\"406\"");Check(!DecodeReviewObservations(invalid,spec,frames,&obs,&error),"V450-K05 coordinate string rejected");
    std::vector<ReviewClaimSpec> claims(16,spec);for(unsigned i=0;i<16;++i)claims[i].id="c"+std::to_string(i);std::vector<ReviewDecision> decisions;
    Check(EvaluateReviewClaims(claims,frames,CoreObservations(row,spec,frames),&decisions,&error)&&decisions.size()==16,"V450-K05 all sixteen claims retained");
    for(unsigned i=0;i<16;++i)Check(decisions[i].claim_id==claims[i].id&&decisions[i].verdict==ReviewVerdict::Insufficient,"V450-K05 per-claim identity preserved");
    const auto plan=CorePlan(root);std::ofstream(root/"core-plan.json")<<plan;
    // 실제 transport 호출 없이 취소/인증/입력 경계를 검사한다.
    EvidencePackageStore store(root/"adapter-input",{});Check(store.Recover(&error),"V450-K05 adapter fixture store");auto input=CoreImageInput(store,row);VaReviewProviderOptions options;options.enabled=true;
    const std::string digest="0533d74300e4f9bc367d675d4e64ffd073d50ff16a2b4096cc2e8a1cf8c96319";unsigned calls=0;
    const auto transport=[&](const VaReviewHttpRequest&,auto,const auto&,std::string*,std::string*){++calls;return false;};
    Check(!ExtractReviewObservations(input,spec,options,digest,VaReviewService::Clock::now()+std::chrono::seconds(2),[]{return true;},&obs,&error,transport)&&error=="review-cancelled"&&calls==0,"V450-K05 pre-cancel prevents transport");
    options.bearer_token="synthetic-token";Check(!ExtractReviewObservations(input,spec,options,digest,VaReviewService::Clock::now()+std::chrono::seconds(2),[]{return false;},&obs,&error,transport)&&calls==0,"V450-K05 HTTP bearer rejected before transport");
    std::cout<<"[core-summary] actualModelCalls=0 publicPathConnected=false"<<std::endl;
}
void ObserverChecks(const std::filesystem::path& root){using namespace recording::review_json;
    const auto fixture=CauseDoc(CauseRead(root/"observer-fixture.json"));std::vector<std::string> rows,regression;
    Check(Array(fixture,"cases",&rows)&&Array(fixture,"coreRegression",&regression),"V450-K06 independent observer fixture");
    for(const auto& raw:rows){auto d=CauseDoc(raw);ReviewFrame f{0,512,288,std::string(64,'a')};std::vector<std::string> values,size;
        Check(Array(d,"box",&values)&&values.size()==4,"V450-K06 box fixture shape");std::array<double,4> box{};
        for(unsigned i=0;i<4;++i)box[i]=std::stod(values[i]);
        if(Array(d,"size",&size)){f.width=std::stoi(size[0]);
        f.height=std::stoi(size[1]);
        }
        const auto nonfinite=CoreText(d,"nonfinite");if(nonfinite=="nan")box[0]=std::numeric_limits<double>::quiet_NaN();if(nonfinite=="infinity")box[0]=std::numeric_limits<double>::infinity();
        ReviewPoint point{-99,-99};std::string error;const bool accepted=ConvertReviewRelativeBox(box,f,&point,&error);std::vector<std::string> expected;
        std::cout<<"[coordinate-check] case="<<CoreText(d,"id")<<" accepted="<<accepted<<" error="<<error<<std::endl;
        if(Array(d,"expected",&expected))Check(accepted&&std::abs(point.x-std::stod(expected[0]))<1e-9&&std::abs(point.y-std::stod(expected[1]))<1e-9,"V450-K06 exact unrounded conversion");
        else Check(!accepted&&error==CoreText(d,"error")&&point.x==-99&&point.y==-99,"V450-K06 no clamp/axis swap/range repair");
    }
    std::set<std::string> selected;for(const auto& item:regression)selected.insert(CoreText(CauseDoc("{\"v\":"+item+"}"),"v"));CoreChecks(root,selected);
    const auto row=CauseDoc(CoreRows(root).front());auto spec=CoreSpec(row);const auto frames=CoreFrames(row);
    const std::string valid=R"({"f0":{"visibility":"visible","identity":"same","anchor":0,"identityEvidence":"visible target","bbox_2d":[406,417,500,583],"color":null}})";
    std::vector<ReviewObservation> observations;std::vector<ReviewCoordinateConversion> conversions;std::string error;
    Check(DecodeReviewObservations(valid,spec,frames,&observations,&error,&conversions)&&conversions.size()==1&&std::abs(observations[0].position->x-231.936)<1e-9,"V450-K06 raw bbox and converted center separated");
    for(const auto& replacement:std::vector<std::string>{"[406,417,500]","[406,417,500,583,600]","[\"406\",417,500,583]","[NaN,417,500,583]","[0,0,1001,1000]","[500,417,406,583]","{\"x\":232,\"y\":144}"}){
        Check(!DecodeReviewObservations(CauseReplace(valid,"[406,417,500,583]",replacement),spec,frames,&observations,&error),"V450-K06 strict bbox form/range; no center guessing");}
    Check(!DecodeReviewObservations(CauseReplace(valid,"\"f0\"","\"f1\""),spec,frames,&observations,&error),"V450-K06 wrong frame key rejected");
    Check(!DecodeReviewObservations(CauseReplace(valid,"\"anchor\":0","\"anchor\":7"),spec,frames,&observations,&error),"V450-K06 wrong anchor rejected");
    Check(!DecodeReviewObservations(CauseReplace(valid,"\"visible\"","\"not-visible\""),spec,frames,&observations,&error),"V450-K06 invisible bbox rejected");
    const auto unknown=R"({"f0":{"visibility":"unknown","identity":"unknown","anchor":null,"identityEvidence":"","bbox_2d":null,"color":null}})";
    Check(DecodeReviewObservations(unknown,spec,frames,&observations,&error)&&!observations[0].position&&observations[0].identity==ReviewIdentity::Unknown,"V450-K06 unknown/null preserved");
    std::vector<ReviewDecision> decisions;Check(EvaluateReviewClaims({spec},frames,observations,&decisions,&error)&&decisions[0].verdict==ReviewVerdict::Insufficient&&decisions[0].gaps.size()==3,"V450-K06 identity/position/time deficits retained");
    const auto plan=CorePlan(root);std::ofstream(root/"core-plan.json")<<plan;std::vector<std::string> planned,old;
    Check(Array(CauseDoc("{\"v\":"+plan+"}"),"v",&planned)&&Array(CauseDoc("{\"v\":"+CauseRead(root/"previous-observation-plan.json")+"}"),"v",&old),"V450-K06 old/new request plans");
    Check(planned.size()==8&&old.size()==8,"V450-K06 eight semantic inputs");std::set<std::string> unique_requests;
    for(std::size_t i=0;i<planned.size();++i){auto now=CauseDoc(planned[i]);auto before=CauseDoc(old[i]);const auto request=now.Find("request")->raw;unique_requests.insert(request);
        std::vector<std::string> a,b;Check(Array(CauseDoc(request),"messages",&a)&&Array(CauseDoc(before.Find("request")->raw),"messages",&b)&&a.size()==b.size(),"V450-K06 original frame message count");
        for(std::size_t j=2;j<a.size();++j)Check(a[j]==b[j],"V450-K06 regenerated original PNG/base64/metadata byte equality with37");
    }
    Check(unique_requests.size()==6,"V450-K06 six exact unique requests; no hash-only sharing");
    EvidencePackageStore store(root/"observer-input",{});Check(store.Recover(&error),"V450-K06 owned image fixture");auto input=CoreImageInput(store,row);std::string request;
    input.pngs[0][18]^=1;Check(!BuildReviewObservationRequest(input,spec,"qwen3-vl:8b-instruct-q4_K_M",&request,&error),"V450-K06 malformed/mismatched PNG rejected");
    input=CoreImageInput(store,row);input.manifest.frames[0].width+=1;Check(!BuildReviewObservationRequest(input,spec,"qwen3-vl:8b-instruct-q4_K_M",&request,&error),"V450-K06 original width metadata mismatch rejected");
    std::cout<<"[observer-offline] modelCalls=0 uniquePlannedCalls=6 policyTolerancePixels=1 oracleTolerancePixels=1"<<std::endl;
}
void CoreObserve(const std::filesystem::path& root,const std::string& endpoint){using namespace recording::review_json;
    const auto plan=CorePlan(root);Check(plan==CauseRead(root/"core-plan.json"),"V450-K05 image request bytes equal offline freeze");
    EvidencePackageStore store(root/"observe-input",{});std::string error;Check(store.Recover(&error),"V450-K06 observation evidence store");unsigned calls=0;
    struct Saved {bool accepted{};std::string error;std::vector<ReviewObservation> observations;std::vector<ReviewCoordinateConversion> conversions;unsigned ordinal{};};
    std::map<std::string,Saved> cache;
    const auto cancelled=[&]{return std::filesystem::exists(root/"cause-stop");};
    const std::string digest="0533d74300e4f9bc367d675d4e64ffd073d50ff16a2b4096cc2e8a1cf8c96319";
    for(const auto& raw:CoreRows(root)){auto d=CauseDoc(raw);if(ingress::StrictJsonBoolField(d,"actual")!=true)continue;
        Check(!cancelled(),"V450-K06 resource observation bound");auto input=CoreImageInput(store,d);auto spec=CoreSpec(d);const auto frames=ReviewFrames(input);auto xs=CoreXs(d);
        VaReviewProviderOptions options;options.enabled=true;options.local_endpoint=endpoint;bool transport_failed=false;unsigned chats=0;
        const auto capture=[&](const VaReviewHttpRequest& request,auto deadline,const auto& cancel,std::string* response,std::string* why){
            const bool chat=request.url==endpoint+"/api/chat";if(chat){++chats;++calls;std::cout<<"[observation-request] {\"case\":"<<EvidenceJsonQuote(CoreText(d,"id"))<<",\"ordinal\":"<<calls<<",\"requestSha256\":"<<EvidenceJsonQuote(CauseHash(request.body))<<"}"<<std::endl;}
            const bool ok=VaReviewCurl(request,deadline,cancel,response,why);if(!ok)transport_failed=true;
            if(chat)std::cout<<"[observation-raw] "<<EvidenceJsonQuote(*response)<<std::endl;
            return ok;
        };
        std::string request;Check(BuildReviewObservationRequest(input,spec,options.local_model,&request,&error),"V450-K06 exact request for deduplication");
        const bool execute=cache.count(request)==0;const auto start=VaReviewService::Clock::now();std::vector<ReviewObservation> obs;std::vector<ReviewCoordinateConversion> converted;bool accepted=false;
        if(execute){Check(calls<6,"V450-K06 at most six model calls");accepted=ExtractReviewObservations(input,spec,options,digest,start+std::chrono::seconds(60),cancelled,&obs,&error,capture,&converted);
            cache.emplace(request,Saved{accepted,error,obs,converted,calls});}
        else {const auto& saved=cache.at(request);accepted=saved.accepted;error=saved.error;obs=saved.observations;converted=saved.conversions;}
        const auto ordinal=cache.at(request).ordinal;
        const auto elapsed=std::chrono::duration_cast<std::chrono::milliseconds>(VaReviewService::Clock::now()-start).count();
        Check(!transport_failed&&!cancelled()&&chats==(execute?1U:0U)&&error!="review-timeout"&&error!="review-cancelled"&&error!="observation-model-mismatch"&&error!="observation-envelope","V450-K05 transport/time/collection/model guard");
        for(const auto& c:converted){
            std::cout<<"[observation-coordinate] {\"case\":"<<EvidenceJsonQuote(CoreText(d,"id"))<<",\"sourceCall\":"<<ordinal<<",\"frame\":"<<c.frame<<",\"version\":"<<EvidenceJsonQuote(kReviewCoordinateConversion)
                <<",\"bbox1000\":["<<c.bbox_1000[0]<<','<<c.bbox_1000[1]<<','<<c.bbox_1000[2]<<','<<c.bbox_1000[3]<<"],\"centerPixels\":["<<c.center_pixels.x<<','<<c.center_pixels.y
                <<"],\"oraclePixels\":["<<xs.at(c.frame)+24<<",144],\"errorPixels\":["<<c.center_pixels.x-(xs.at(c.frame)+24)<<','<<c.center_pixels.y-144<<"]}"<<std::endl;
        }
        bool pixel_match=accepted;std::vector<ReviewDecision> decisions;std::string core_error;bool core_ok=false;
        if(accepted){for(const auto& o:obs){const int x=xs.at(o.frame);if(x<0){if(o.visibility!=ReviewVisibility::NotVisible||o.position||o.color)pixel_match=false;}
                else{if(o.visibility!=ReviewVisibility::Visible)pixel_match=false;
                    if(spec.relation==ReviewRelation::ColorAt){if(o.color!=ReviewColor::Red)pixel_match=false;}
                    else if(!o.position||std::abs(o.position->x-(x+24))>1||std::abs(o.position->y-144)>1)pixel_match=false;}}
            core_ok=EvaluateReviewClaims({spec},frames,obs,&decisions,&core_error);}
        std::cout<<"[observation-result] {\"case\":"<<EvidenceJsonQuote(CoreText(d,"id"))<<",\"accepted\":"<<(accepted?"true":"false")<<",\"error\":"<<EvidenceJsonQuote(error)<<",\"sourceCall\":"<<ordinal<<",\"modelExecuted\":"<<(execute?"true":"false")<<",\"elapsedMs\":"<<elapsed
            <<",\"pixelOracleMatch\":"<<(pixel_match?"true":"false")<<",\"coreAccepted\":"<<(core_ok?"true":"false")<<",\"decisions\":"<<CoreDecisionJson(decisions)
            <<",\"expected\":"<<EvidenceJsonQuote(CoreText(d,"expected"))<<",\"combinedLabelMatch\":"<<(core_ok&&ReviewVerdictName(decisions[0].verdict)==CoreText(d,"expected")?"true":"false")<<",\"publicPosted\":false}"<<std::endl;
        rusage usage{};Check(::getrusage(RUSAGE_SELF,&usage)==0,"V450-K05 native resource observation");
#ifdef __APPLE__
        const auto rss=usage.ru_maxrss;
#else
        const auto rss=usage.ru_maxrss*1024;
#endif
        std::cout<<"[observation-resource] nativePeakRssBytes="<<rss<<std::endl;Check(rss<=4LL*1024*1024*1024&&!cancelled(),"V450-K05 native/model limits");
    }
    Check(calls==6,"V450-K06 six image calls, eight server cases, no retries");
}
