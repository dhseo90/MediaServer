#!/usr/bin/env node
// 파일 용도: v400 호환 CLI: 현행 안전 계약을 검사하며 종료 실행 기록은 읽지 않는다.
import {assertKnownOptions} from './script_arg_utils.mjs';
import {runCurrentPolicyCli} from './v400_current_policy.mjs';
const args = process.argv.slice(2);
assertKnownOptions(args, ['root', 'h', 'help']);
runCurrentPolicyCli('freeze', args);
