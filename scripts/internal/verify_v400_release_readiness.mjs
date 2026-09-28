#!/usr/bin/env node
// 종료된 v4.0 승인·완료 기록을 현재 gate로 재사용하지 않는 임시 호환 진입점.
import {assertKnownOptions} from './script_arg_utils.mjs';
import {parseEntryRoot} from './entry_baseline_documentation.mjs';
const args=process.argv.slice(2);
assertKnownOptions(args,['root','h','help']);
if(args.length===1&&(args[0]==='--help'||args[0]==='-h')){
  console.log('./server.sh verify-v400-release-readiness [--root <소스 경로>]\n호환 명령: verify-release-metadata의 로컬 문서 검사만 수행합니다. 승인·출시 가능 판정이 아닙니다.');
  process.exit(0);
}
parseEntryRoot(args,process.cwd());
console.log('verify-v400-release-readiness: 현행 로컬 문서 검사입니다. 과거 실행 증거가 아닙니다. 승인·출시 가능 판정이 아닙니다.');
await import('./verify_release_metadata_consistency.mjs');
