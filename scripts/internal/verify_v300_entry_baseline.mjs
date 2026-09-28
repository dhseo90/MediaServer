#!/usr/bin/env node
// 파일 용도: 3.0.0 회귀 입력과 현행 source/명령 연결을 검증한다. 과거 실행 결과는 요구하지 않는다.
import assert from "node:assert/strict";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {assertKnownOptions} from "./script_arg_utils.mjs";
import {loadEntryInputs,validateBoundaryCase,semverAtLeast,parseEntryRoot,reportEntryChecks} from "./entry_baseline_documentation.mjs";

const command = "verify-v300-entry-baseline";
const args = process.argv.slice(2);
assertKnownOptions(args,["h","help","root"]);
if(args.length===1&&(args[0]==="--help"||args[0]==="-h")){
  console.log(`./server.sh ${command} [--root <소스 경로>]\n현행 문서와 출처 있는 회귀 입력만 확인합니다. 제품·UI·장시간·공개 실행 증거가 아닙니다.`);
  process.exit(0);
}
const rootDir=parseEntryRoot(args,path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."));
const inputs=loadEntryInputs(rootDir,command);
const {files,version,fixture,baseline}=inputs;
const baselineVersion="3.0.0";
const baselineRoadmap="v3.0.0 Event Evidence Search MVP";
const expected={command,sourceVersion:baselineVersion,publishedTag:"v3.0.0",roadmap:baselineRoadmap,featureIds:["OPS-051","SAFE-081"],decision:{"scope":"historical-not-current-policy","selected":"Event Evidence Search MVP","fallback":"Conservative Foundation","excluded":["encoded MP4/WebM event clip·playback은 v3.1로 분리","24/7 상시녹화·VMS/NVR archive API는 당시 비범위","얼굴 인식·신원 식별·watchlist·face embedding 제외","raw prompt/response/provider request body 보관 제외","client/viewer 노출·cloud default-on 제외"],"constraints":["비식별 feature-only 보존","Ops-only·local-first·명시 opt-in","FrameRef 근거 추적"]}};
const checks=[];
function check(name,run){checks.push([name,run]);}

check("current documents, feature definitions, and dispatch remain connected", () => {
  assert.equal(inputs.errors.length,0,inputs.errors.join("; "));
  assert.equal(validateBoundaryCase(fixture,baseline,expected).length,0,"회귀 입력/비실행 경계 불일치");
});

check("SAFE-081 canonical V300 source-of-truth boundary", () => {
  const baselineCommandDocumented = files.serverSh.includes("verify-v300-entry-baseline)");
  const currentSourceAligned = semverAtLeast(version, baselineVersion) && inputs.errors.length === 0;
  const historicalBaselinePreserved = validateBoundaryCase(fixture, baseline, expected).length === 0 && files.featureInventory.includes("SAFE-081");
  const safe081BoundaryObserved = baselineCommandDocumented && currentSourceAligned && historicalBaselinePreserved;
  assert(safe081BoundaryObserved && (baselineCommandDocumented && currentSourceAligned && historicalBaselinePreserved),
    "SAFE-081 현행 source/dispatch와 과거 회귀 입력을 구분하며 제품·UI·장시간·공개 실행으로 승격하지 않음");
});

check("OPS-051 canonical V300 historical baseline gate", () => {
  const historicalBaselineRecorded = baseline.sourceVersion === "3.0.0" &&
    baseline.publishedTag === "v3.0.0" && baseline.roadmap === baselineRoadmap;
  const currentSourceNotRegressed = semverAtLeast(version, baselineVersion) && inputs.errors.length === 0;
  const excludedCompletionAbsent = fixture.executionEvidence === false &&
    validateBoundaryCase(fixture, baseline, expected).length === 0;
  const ops051GateObserved = historicalBaselineRecorded && currentSourceNotRegressed && excludedCompletionAbsent &&
    files.serverSh.includes("verify-v300-entry-baseline)");
  assert(ops051GateObserved && currentSourceNotRegressed && excludedCompletionAbsent,
    "OPS-051 현재 정합성·과거 source/published 입력·비실행 경계·명령 연결을 모두 확인해야 함");
});

reportEntryChecks(checks,inputs,command);
