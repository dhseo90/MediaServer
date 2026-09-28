#!/usr/bin/env node
// 파일 용도: 3.2.0 회귀 입력과 현행 source/명령 연결을 검증한다. 과거 실행 결과는 요구하지 않는다.
import assert from "node:assert/strict";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {assertKnownOptions} from "./script_arg_utils.mjs";
import {loadEntryInputs,validateBoundaryCase,semverAtLeast,parseEntryRoot,reportEntryChecks} from "./entry_baseline_documentation.mjs";

const command = "verify-v320-entry-baseline";
const args = process.argv.slice(2);
assertKnownOptions(args,["h","help","root"]);
if(args.length===1&&(args[0]==="--help"||args[0]==="-h")){
  console.log(`./server.sh ${command} [--root <소스 경로>]\n현행 문서와 출처 있는 회귀 입력만 확인합니다. 제품·UI·장시간·공개 실행 증거가 아닙니다.`);
  process.exit(0);
}
const rootDir=parseEntryRoot(args,path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."));
const inputs=loadEntryInputs(rootDir,command);
const {files,version,fixture,baseline}=inputs;
const baselineVersion="3.2.0";
const baselineRoadmap="v3.2.0 Operations Resolution Workspace";
const expected={command,sourceVersion:baselineVersion,publishedTag:"v3.2.0",roadmap:baselineRoadmap,featureIds:["OPS-069","SAFE-102"],decision:{"scope":"historical-not-current-policy","selected":"Operations Resolution Workspace","fallback":"Resolution Core Baseline","excluded":["새 저장소 제품군으로 확장 제외","자동 승인·자동 조치 적용 제외","viewer/client 내부 판단 근거 전체 노출 제외","raw provider/debug material 노출 제외","local baseline으로 장시간 증거 대체 제외"],"constraints":["source-only 배포·binary/runtime/model bundle 미포함","credential·prompt/response·source URL·raw frame·debug 비노출","viewer에는 resolution summary만 노출","외부 endpoint/credential/승인 없이 field PASS 금지","안정화·UI·30분·120분·공개 검증 상호 대체 금지"]}};
const checks=[];
function check(name,run){checks.push([name,run]);}

check("current documents, feature definitions, and dispatch remain connected", () => {
  assert.equal(inputs.errors.length,0,inputs.errors.join("; "));
  assert.equal(validateBoundaryCase(fixture,baseline,expected).length,0,"회귀 입력/비실행 경계 불일치");
});

check("SAFE-102 canonical V320 source-of-truth boundary", () => {
  const baselineCommandDocumented = files.serverSh.includes("verify-v320-entry-baseline)");
  const currentSourceAligned = semverAtLeast(version, baselineVersion) && inputs.errors.length === 0;
  const historicalBaselinePreserved = validateBoundaryCase(fixture, baseline, expected).length === 0 && files.featureInventory.includes("SAFE-102");
  const safe102BoundaryObserved = baselineCommandDocumented && currentSourceAligned && historicalBaselinePreserved;
  assert(safe102BoundaryObserved && (baselineCommandDocumented && currentSourceAligned && historicalBaselinePreserved),
    "SAFE-102 현행 source/dispatch와 과거 회귀 입력을 구분하며 제품·UI·장시간·공개 실행으로 승격하지 않음");
});

check("OPS-069 canonical V320 historical baseline gate", () => {
  const historicalBaselineRecorded = baseline.sourceVersion === "3.2.0" &&
    baseline.publishedTag === "v3.2.0" && baseline.roadmap === baselineRoadmap;
  const currentSourceNotRegressed = semverAtLeast(version, baselineVersion) && inputs.errors.length === 0;
  const excludedCompletionAbsent = fixture.executionEvidence === false &&
    validateBoundaryCase(fixture, baseline, expected).length === 0;
  const ops069GateObserved = historicalBaselineRecorded && currentSourceNotRegressed && excludedCompletionAbsent &&
    files.serverSh.includes("verify-v320-entry-baseline)");
  assert(ops069GateObserved && currentSourceNotRegressed && excludedCompletionAbsent,
    "OPS-069 현재 정합성·과거 source/published 입력·비실행 경계·명령 연결을 모두 확인해야 함");
});

reportEntryChecks(checks,inputs,command);
