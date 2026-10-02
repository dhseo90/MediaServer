#!/usr/bin/env node
// 파일 용도: 3.9.0 회귀 입력과 현행 source/명령 연결을 검증한다. 과거 실행 결과는 요구하지 않는다.
import assert from "node:assert/strict";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {assertKnownOptions} from "./script_arg_utils.mjs";
import {loadEntryInputs,validateBoundaryCase,semverAtLeast,parseEntryRoot,reportEntryChecks} from "./entry_baseline_documentation.mjs";

const command = "verify-v390-entry-baseline";
const args = process.argv.slice(2);
assertKnownOptions(args,["h","help","root"]);
if(args.length===1&&(args[0]==="--help"||args[0]==="-h")){
  console.log(`./server.sh ${command} [--root <소스 경로>]\n현행 문서와 출처 있는 회귀 입력만 확인합니다. 제품·UI·장시간·공개 실행 증거가 아닙니다.`);
  process.exit(0);
}
const rootDir=parseEntryRoot(args,path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."));
const inputs=loadEntryInputs(rootDir,command);
const {files,version,fixture,baseline}=inputs;
const baselineVersion="3.9.0";
const baselineRoadmap="v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation";
const expected={command,sourceVersion:baselineVersion,publishedTag:"v3.8.0",roadmap:baselineRoadmap,featureIds:["OPS-163","SAFE-196"]};
const checks=[];
function check(name,run){checks.push([name,run]);}

check("current documents, feature definitions, and dispatch remain connected", () => {
  assert.equal(inputs.errors.length,0,inputs.errors.join("; "));
  assert.equal(validateBoundaryCase(fixture,baseline,expected).length,0,"회귀 입력/비실행 경계 불일치");
});

check("SAFE-196 canonical V390 historical baseline boundary", () => {
  const baselineCommandDocumented = files.serverSh.includes("verify-v390-entry-baseline)");
  const currentSourceAligned = semverAtLeast(version, baselineVersion) && inputs.errors.length === 0;
  const historicalBaselinePreserved = validateBoundaryCase(fixture, baseline, expected).length === 0 && files.featureInventory.includes("SAFE-196");
  const safe196BoundaryObserved = baselineCommandDocumented && currentSourceAligned && historicalBaselinePreserved;
  assert(safe196BoundaryObserved && (baselineCommandDocumented && currentSourceAligned && historicalBaselinePreserved),
    "SAFE-196 현행 source/dispatch와 과거 회귀 입력을 구분하며 제품·UI·장시간·공개 실행으로 승격하지 않음");
});

check("OPS-163 canonical V390 historical baseline gate", () => {
  const historicalBaselineRecorded = baseline.sourceVersion === "3.9.0" &&
    baseline.publishedTag === "v3.8.0" && baseline.roadmap === baselineRoadmap;
  const currentSourceNotRegressed = semverAtLeast(version, baselineVersion) && inputs.errors.length === 0;
  const excludedCompletionAbsent = fixture.executionEvidence === false &&
    validateBoundaryCase(fixture, baseline, expected).length === 0;
  const ops163BaselineObserved = historicalBaselineRecorded && currentSourceNotRegressed && excludedCompletionAbsent &&
    files.serverSh.includes("verify-v390-entry-baseline)");
  assert(ops163BaselineObserved && currentSourceNotRegressed && excludedCompletionAbsent,
    "OPS-163 현재 정합성·과거 source/published 입력·비실행 경계·명령 연결을 모두 확인해야 함");
});

reportEntryChecks(checks,inputs,command);
