#!/usr/bin/env node
// 파일 용도: 3.1.0 회귀 입력과 현행 source/명령 연결을 검증한다. 과거 실행 결과는 요구하지 않는다.
import assert from "node:assert/strict";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {assertKnownOptions} from "./script_arg_utils.mjs";
import {loadEntryInputs,validateBoundaryCase,semverAtLeast,parseEntryRoot,reportEntryChecks} from "./entry_baseline_documentation.mjs";

const command = "verify-v310-entry-baseline";
const args = process.argv.slice(2);
assertKnownOptions(args,["h","help","root"]);
if(args.length===1&&(args[0]==="--help"||args[0]==="-h")){
  console.log(`./server.sh ${command} [--root <소스 경로>]\n현행 문서와 출처 있는 회귀 입력만 확인합니다. 제품·UI·장시간·공개 실행 증거가 아닙니다.`);
  process.exit(0);
}
const rootDir=parseEntryRoot(args,path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."));
const inputs=loadEntryInputs(rootDir,command);
const {files,version,fixture,baseline}=inputs;
const baselineVersion="3.1.0";
const baselineRoadmap="v3.1.0 Encoded Event Clip and Safe Sharing Expansion";
const expected={command,sourceVersion:baselineVersion,publishedTag:"v3.1.0",roadmap:baselineRoadmap,featureIds:["OPS-061","SAFE-093"],decision:{"scope":"historical-not-current-policy","selected":"Encoded Event Clip and Safe Sharing Expansion","fallback":"Encoded Clip Foundation","excluded":["24/7 상시녹화·VMS/NVR archive API는 당시 비범위","broad archive playback/search 제외","얼굴 인식·신원 식별·watchlist·face embedding 제외","raw prompt/response 보관 제외","client/viewer 내부 feature/provenance/raw evidence 전체 노출 제외","자동 rule 적용·cloud default-on 제외"],"constraints":["source-only 배포·runtime/model binary 미포함","당시 encoded clip은 이벤트 중심 bounded evidence","credential·prompt/raw response·source URL·raw frame bytes 비노출","외부 endpoint/credential/승인 없이 field PASS 금지","안정화·UI·30분·120분·공개 검증 상호 대체 금지"]}};
const checks=[];
function check(name,run){checks.push([name,run]);}

check("current documents, feature definitions, and dispatch remain connected", () => {
  assert.equal(inputs.errors.length,0,inputs.errors.join("; "));
  assert.equal(validateBoundaryCase(fixture,baseline,expected).length,0,"회귀 입력/비실행 경계 불일치");
});

check("SAFE-093 canonical V310 source-of-truth boundary", () => {
  const baselineCommandDocumented = files.serverSh.includes("verify-v310-entry-baseline)");
  const currentSourceAligned = semverAtLeast(version, baselineVersion) && inputs.errors.length === 0;
  const historicalBaselinePreserved = validateBoundaryCase(fixture, baseline, expected).length === 0 && files.featureInventory.includes("SAFE-093");
  const safe093BoundaryObserved = baselineCommandDocumented && currentSourceAligned && historicalBaselinePreserved;
  assert(safe093BoundaryObserved && (baselineCommandDocumented && currentSourceAligned && historicalBaselinePreserved),
    "SAFE-093 현행 source/dispatch와 과거 회귀 입력을 구분하며 제품·UI·장시간·공개 실행으로 승격하지 않음");
});

check("OPS-061 canonical V310 historical baseline gate", () => {
  const historicalBaselineRecorded = baseline.sourceVersion === "3.1.0" &&
    baseline.publishedTag === "v3.1.0" && baseline.roadmap === baselineRoadmap;
  const currentSourceNotRegressed = semverAtLeast(version, baselineVersion) && inputs.errors.length === 0;
  const excludedCompletionAbsent = fixture.executionEvidence === false &&
    validateBoundaryCase(fixture, baseline, expected).length === 0;
  const ops061GateObserved = historicalBaselineRecorded && currentSourceNotRegressed && excludedCompletionAbsent &&
    files.serverSh.includes("verify-v310-entry-baseline)");
  assert(ops061GateObserved && currentSourceNotRegressed && excludedCompletionAbsent,
    "OPS-061 현재 정합성·과거 source/published 입력·비실행 경계·명령 연결을 모두 확인해야 함");
});

reportEntryChecks(checks,inputs,command);
