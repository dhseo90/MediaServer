#!/usr/bin/env node
// 파일 용도: 기존 v4.0 진입 명령을 현행 로컬 릴리즈 문서 검사에 연결한다.
import {assertKnownOptions} from './script_arg_utils.mjs';
import {parseEntryRoot} from './entry_baseline_documentation.mjs';
const args=process.argv.slice(2);
assertKnownOptions(args,['root','h','help']);
if(args.length===1&&(args[0]==='--help'||args[0]==='-h')){
  console.log('./server.sh verify-v400-entry-baseline [--root <소스 경로>]\n현행 로컬 문서 검사. 외부 공개 확인은 별도 verify-release-metadata --published 범위입니다.');
  process.exit(0);
}
parseEntryRoot(args,process.cwd());
console.log('v4.0.0 진입 명령: 현행 로컬 릴리즈 문서 검사로 연결합니다. 과거 실행 증거가 아닙니다.');
await import('./verify_release_metadata_consistency.mjs');
