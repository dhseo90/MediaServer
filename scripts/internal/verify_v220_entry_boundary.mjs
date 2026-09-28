#!/usr/bin/env node
// 초기 진입 명령의 현행 문서 연결·보고서 경계 검사. 과거 실행 원장은 읽지 않는다.
import {createEntryReportRunner} from "./entry_baseline_report.mjs";
import {assertKnownOptions} from "./script_arg_utils.mjs";
import assert from "node:assert/strict";
const rawArgs=process.argv.slice(2);
assertKnownOptions(rawArgs,["report","json-report","h","help"]);
if(rawArgs.length===1&&(rawArgs[0]==="--help"||rawArgs[0]==="-h")){
  console.log("./server.sh verify-v220-entry-boundary [--report <새 Markdown 파일>] [--json-report <새 JSON 파일>]\n현행 문서·비실행 정의 검사. 제품/UI/장시간/원격 검사와 중앙 원장 갱신은 하지 않습니다.");
  process.exit(0);
}
const runner=createEntryReportRunner({url:import.meta.url,args:rawArgs,command:"verify-v220-entry-boundary",schema:"media-server.v220-entry-boundary-report.v1",expectedIds:["v210-release-baseline","source-version-boundary","roadmap-boundary","integrator-contract-freeze","event-post-freeze","webrtc-metadata-freeze","sse-metadata-freeze","ws-metadata-freeze","auth-scope-freeze","responsive-viewports","ui-fulltest","soak-30min","longrun-120min","published-metadata"],companionCommands:["verify-integrator-contract-artifact","verify-event-post","verify-webrtc-va-metadata","verify-va-metadata-sidechannel","verify-ws-metadata","verify-auth-routes","verify-predev","verify-va-runtime-console-longrun","verify-release-metadata"]});
const {version,branch,head,check,readText}=runner;
check("incident projection and memory fallback remain redacted and local", () => {
  const incidentMemory = readText("src/analysis/incident_memory.cpp");
  assert(incidentMemory.includes("IncidentProjectionContainsForbiddenMaterial"), "IncidentProjectionContainsForbiddenMaterial redaction must remain enforced");
  assert(incidentMemory.includes("force_jsonl_bm25_fallback"), "force_jsonl_bm25_fallback must remain local without model/provider dependency");
});


runner.finish(buildReport());

function buildReport() {
  return {
    schema: "media-server.v220-entry-boundary-report.v1",
    generatedAt: new Date().toISOString(),
    status: "pass",
    currentRelease: "v2.1.0",
    entryBranch: "v2.2.0",
    activeRoadmap: "v2.2.0 Responsive UI Foundation",
    sourceVersion: `v${version}`,
    branch,
    head,
    checks: [],
    boundaryDecision: {
      primary: "Use v2.1.0 source-only release baseline as the frozen product contract and start v2.2.0 only as a responsive UI foundation roadmap.",
      fallback: "If live published metadata cannot be rechecked, use recorded v2.1.0 release evidence and keep live GitHub state separate from S00 completion.",
      excluded: [
        "No UI implementation, visual redesign code, route/API/schema migration, or media path change is performed by S00.",
        "No VLM runtime/provider expansion, credential persistence, or model/runtime bundle decision is part of S00.",
        "No UI fulltest, 30 minute soak, 120 minute longrun, or published GitHub check is executed by this boundary verifier.",
      ],
    },
    evidence: [
      evidenceRow({
        id: "v210-release-baseline",
        area: "v2.1.0 release baseline",
        status: "미확인",
        source: "VERSION/CMake/docs identify v2.1.0 as current source-only release baseline",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "source-version-boundary",
        area: "source version boundary",
        status: "미확인",
        source: "VERSION and CMakeLists.txt remain 2.1.0 while active roadmap is v2.2.0",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "roadmap-boundary",
        area: "roadmap review",
        status: "current-run-required",
        source: "./server.sh verify-v220-entry-boundary",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "integrator-contract-freeze",
        area: "스크립트 테스트: contract artifact freeze",
        status: "current-run-required",
        source: "./server.sh verify-integrator-contract-artifact",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "event-post-freeze",
        area: "스크립트 테스트: Event POST freeze",
        status: "current-run-required",
        source: "./server.sh verify-event-post",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "webrtc-metadata-freeze",
        area: "스크립트 테스트: WebRTC DataChannel metadata freeze",
        status: "current-run-required",
        source: "./server.sh verify-webrtc-va-metadata",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "sse-metadata-freeze",
        area: "스크립트 테스트: SSE metadata freeze",
        status: "current-run-required",
        source: "./server.sh verify-va-metadata-sidechannel",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "ws-metadata-freeze",
        area: "스크립트 테스트: WS metadata freeze",
        status: "current-run-required",
        source: "./server.sh verify-ws-metadata",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "auth-scope-freeze",
        area: "스크립트 테스트: Auth/session/scope freeze",
        status: "current-run-required",
        source: "./server.sh verify-auth-routes",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "responsive-viewports",
        area: "responsive shell boundary",
        status: "current-run-required",
        source: "roadmap review for 320/390/760/1180+ criteria; visual implementation is later S02+",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "ui-fulltest",
        area: "UI 풀테스트",
        status: "미실행",
        source: "Not part of S00; v2.2.0 UI implementation and release-candidate gates only",
        requiredBeforeS01: false,
      }),
      evidenceRow({
        id: "soak-30min",
        area: "스크립트 테스트: 30분 안정화",
        status: "미실행",
        source: "./server.sh verify-predev --soak-minutes 30; not requested for S00",
        requiredBeforeS01: false,
      }),
      evidenceRow({
        id: "longrun-120min",
        area: "스크립트 테스트: 120분 장시간",
        status: "미실행",
        source: "./server.sh verify-predev --soak-minutes 120 or ./server.sh verify-va-runtime-console-longrun --duration-minutes 120",
        approvalRequired: true,
        requiredBeforeS01: false,
      }),
      evidenceRow({
        id: "published-metadata",
        area: "Published release metadata",
        status: "manual-not-run",
        source: "./server.sh verify-release-metadata --published; release close-out only",
        approvalRequired: true,
        requiredBeforeS01: false,
      }),
    ],
  };
}

function evidenceRow({ id, area, status, source, approvalRequired = false, requiredBeforeS01 = true }) {
  return {
    id,
    area,
    status,
    approvalRequired,
    requiredBeforeS01,
    source,
    tokenUsage: {
      tokenStart: "미집계",
      tokenEnd: "미집계",
      tokenConsumed: "미집계",
      elapsed: "미집계",
      source: "not-collected-by-boundary-report-generator",
    },
  };
}
