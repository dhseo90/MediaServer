'use strict';
// 승인된 임시 root 안에만 기계적 계측 복사본을 생성한다. 제품 파일은 쓰지 않는다.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const [repo,out,mode]=process.argv.slice(2);
if(!repo||!out||!/^media-server-catalog-cost\.[A-Za-z0-9]+$/.test(path.basename(out))||fs.lstatSync(out).isSymbolicLink())throw Error('instrument root');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
let count=0;
function replace(s,from,to){if(s.split(from).length!==2)throw Error('exact insertion mismatch: '+from);++count;return s.replace(from,to);}
function fn(s,name,label,expected=1){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const r=new RegExp('^(?:inline )?(?:bool|std::string|std::vector<std::string>|RecordingJournalReplayResult)\\s+'+escaped+'\\([^;{}]*\\)\\s*(?:const\\s*)?\\{','gm');const matches=[...s.matchAll(r)];if(matches.length!==expected)throw Error('function insertion mismatch '+name+' '+matches.length);for(const m of matches.reverse()){++count;s=s.slice(0,m.index+m[0].length)+' fc::Scope fc_scope("'+label+'");'+s.slice(m.index+m[0].length);}return s;}
for(const file of ['recording_catalog.cpp','recording_journal.cpp','recording_contracts.cpp','recording_checkpoint_validation.h']){
 const original=fs.readFileSync(path.join(repo,'src/recording',file),'utf8');let s=original;
 if(file==='recording_catalog.cpp'){
  for(const name of ['CheckpointLocked','AppendAndApplyLocked','ValidateBoundLocked','CommitBoundLocked','ApplyMutationLocked','ProjectMutationSqliteLocked','ProjectionSignatureLocked'])s=fn(s,'RecordingCatalog::'+name,'catalog.'+name);
  s=replace(s,'if(!journal_.ReadCheckpointRecords(this,&original,error))return false;','if(!fc::Measure("checkpoint.ReadCheckpointRecords",[&]{return journal_.ReadCheckpointRecords(this,&original,error);}))return false;');
  s=replace(s,'for(std::size_t i=first;i<original.size();++i)\n            if(!before->ApplyMutationLocked(*original[i],false,error,nullptr,original[i]))return false;','if(!fc::Measure("checkpoint.originalSemantic",[&]{for(std::size_t i=first;i<original.size();++i)if(!before->ApplyMutationLocked(*original[i],false,error,nullptr,original[i]))return false;return true;}))return false;');
  s=replace(s,'identical=detail::SameCheckpointSequence(original,candidate);','identical=detail::SameCheckpointSequence(original,candidate);fc::Event(identical?"candidate.identical":"candidate.different");');
  s=replace(s,'for(const auto& m:candidate)if(!m||!after->ApplyMutationLocked(*m,false,error,nullptr,m))return false;','if(!fc::Measure("checkpoint.candidateSemantic",[&]{for(const auto& m:candidate)if(!m||!after->ApplyMutationLocked(*m,false,error,nullptr,m))return false;return true;}))return false;');
  const legacy='std::lock_guard lock(mu_);',traced='recording::latency::Lock lock(mu_,recording::latency::Source::Catalog,__LINE__);';
  const legacyCount=s.split(legacy).length-1,tracedCount=s.split(traced).length-1;
  if((legacyCount>0)===(tracedCount>0)||legacyCount+tracedCount<10)throw Error('catalog lock insertions');
  if(process.env.MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE==='1')throw Error('cost probe requires latency trace disabled');
  const lock=tracedCount?traced:legacy,n=legacyCount+tracedCount;
  s=s.split(lock).join('std::unique_lock<std::mutex> lock(mu_,std::defer_lock);fc::Measure("catalog.lock.wait",[&]{lock.lock();});fc::Scope fc_hold("catalog.lock.hold");');count+=n;
 }
 if(file==='recording_journal.cpp'){
  for(const name of ['SerializeRecordingMutationV1','ParseRecordingMutationV1','EnvelopeIdentity','IndexRecord','CompactRecords','JournalBytes'])s=fn(s,name,'journal.'+name);
  for(const name of ['ReadCheckpointRecords','PrepareCheckpoint','CommitCheckpoint','AppendOwned','Replay'])s=fn(s,'RecordingJournal::'+name,'journal.'+name);
  s=replace(s,'if(bytes!=JournalBytes(candidate))return Fail(error,"checkpoint 후보 불일치");','if(!fc::Measure("checkpoint.bytesCompare",[&]{return bytes==JournalBytes(candidate);}))return Fail(error,"checkpoint 후보 불일치");');
  s=replace(s,'if(bytes.size()>=managed_state_->bytes)return true;','if(bytes.size()>=managed_state_->bytes){fc::Event("checkpoint.noWrite");return true;}fc::Scope fc_write("checkpoint.write");');
 }
 if(file==='recording_contracts.cpp')for(const name of ['ValidateRecordingFileEvidence','ValidateRecordingSourceBindingV1','ValidateRecordingSourceBindingForSegment','SerializeRecordingSourceBindingV1','ParseRecordingSourceBindingV1'])s=fn(s,name,'contracts.'+name);
 if(file==='recording_checkpoint_validation.h')s=fn(s,'SameCheckpointSequence','checkpoint.SameSequence',2);
 s='#include "recording_catalog_cost_probe_timer.h"\n'+s;
 fs.writeFileSync(path.join(out,file),s);
 console.log(`[source] file=${file} original_sha256=${hash(original)} instrumented_sha256=${hash(s)}`);
}
console.log(`[pass] FC01 exact insertion checks count=${count}`);
if(mode==='parse'){
 const file=path.join(repo,'include/recording/recording_catalog.h');const header=fs.readFileSync(file,'utf8');
 const exposed=replace(header,'private:','public: // FC02 temporary test-only access');
 fs.mkdirSync(path.join(out,'include/recording'),{recursive:true});fs.writeFileSync(path.join(out,'include/recording/recording_catalog.h'),exposed);
 const strict=fs.readFileSync(path.join(repo,'src/domain/strict_json.cpp'),'utf8');
 const instrumented='#include "recording_catalog_cost_probe_timer.h"\n'+replace(strict,'    StrictJsonParser parser(json, document, error_message);','    if(!fc::target_payload.empty()&&json==fc::target_payload)++fc::target_parses;\n    StrictJsonParser parser(json, document, error_message);');
 fs.writeFileSync(path.join(out,'strict_json.cpp'),instrumented);
 console.log(`[pass] FC02 temporary access/parser exact insertions=2 strict_original_sha256=${hash(strict)} header_original_sha256=${hash(header)}`);
}
