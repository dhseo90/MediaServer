// 파일 용도: 검증 소유 복제본에만 read-only cache 진단을 삽입한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const [repo,root]=process.argv.slice(2);
if(!/^media-server-catalog-cost\.[A-Za-z0-9]+$/.test(path.basename(root))||fs.realpathSync(root)!==root||(fs.statSync(root).mode&0o777)!==0o700)throw Error('owned-root');
const exact=(text,from,to)=>{if(text.split(from).length!==2)throw Error('exact-instrumentation');return text.replace(from,to);};
fs.mkdirSync(path.join(root,'include/recording'),{recursive:true});
const header=fs.readFileSync(path.join(repo,'include/recording/recording_catalog.h'),'utf8');
fs.writeFileSync(path.join(root,'include/recording/recording_catalog.h'),exact(header,'private:','public: // LP26-O10 owned test copy'));
fs.writeFileSync(path.join(root,'recording_accumulation_counter.h'),'#pragma once\n#include <cstddef>\nnamespace lp10 {inline thread_local std::size_t records=0,first=0;}\n');
const file=path.join(root,'recording_catalog.cpp');let source=fs.readFileSync(file,'utf8');
source='#include "recording_accumulation_counter.h"\n'+exact(source,'const auto first=reuse?cached->prefix.size():0;','const auto first=reuse?cached->prefix.size():0;lp10::first=first;lp10::records=original.size();');
fs.writeFileSync(file,source);
console.log('[probe-instrument] '+JSON.stringify({catalogSha256:crypto.createHash('sha256').update(source).digest('hex'),exactCacheInsertion:1,productFilesChanged:false}));
