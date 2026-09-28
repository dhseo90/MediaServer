#!/usr/bin/env node
// 초기 진입 명령의 현행 문서 연결·보고서 경계 검사. 과거 실행 원장은 읽지 않는다.
import {createEntryReportRunner} from "./entry_baseline_report.mjs";
import {assertKnownOptions} from "./script_arg_utils.mjs";
const rawArgs=process.argv.slice(2);
assertKnownOptions(rawArgs,["report","json-report","h","help"]);
if(rawArgs.length===1&&(rawArgs[0]==="--help"||rawArgs[0]==="-h")){
  console.log("./server.sh verify-v210-entry-baseline [--report <새 Markdown 파일>] [--json-report <새 JSON 파일>]\n현행 문서·비실행 정의 검사. 제품/UI/장시간/원격 검사와 중앙 원장 갱신은 하지 않습니다.");
  process.exit(0);
}
const runner=createEntryReportRunner({url:import.meta.url,args:rawArgs,command:"verify-v210-entry-baseline",schema:"media-server.v210-entry-baseline-report.v1",expectedIds:["v200-published-release","branch-source-version","release-metadata","release-evidence-index","integrator-contract-freeze","event-post-freeze","webrtc-metadata-freeze","sse-metadata-freeze","ws-metadata-freeze","auth-scope-freeze","rtsp-media-path-freeze","media-path-freeze","ui-fulltest","soak-30min","longrun-120min"],companionCommands:["verify-release-metadata","verify-release-evidence-index","verify-integrator-contract-artifact","verify-event-post","verify-webrtc-va-metadata","verify-va-metadata-sidechannel","verify-ws-metadata","verify-auth-routes","verify-codecs","verify-webrtc-ice","verify-predev","verify-va-runtime-console-longrun"]});
const {version,branch,head}=runner;

runner.finish(buildReport());

function buildReport() {
  return {
    schema: "media-server.v210-entry-baseline-report.v1",
    generatedAt: new Date().toISOString(),
    status: "pass",
    currentRelease: "v2.0.0",
    entryBranch: "v2.1.0",
    activeRoadmap: "v2.1.0 VLM Runtime Opt-in Stabilization",
    sourceVersion: `v${version}`,
    branch,
    head,
    checks: [],
    baselineDecision: {
      primary: "Use the published v2.0.0 source-only release, signed tag evidence, and v2.1.0 branch sync record as the v2.1.0 entry baseline.",
      fallback: "If published metadata cannot be rechecked in the current environment, rely only on recorded release evidence and mark live GitHub state as 미확인.",
      excluded: [
        "No VLM runtime/provider call is selected or executed in S00.",
        "No UI fulltest, 30 minute soak, or 120 minute longrun is executed by this baseline verifier.",
        "No Event POST/WebRTC/SSE/WS payload or RTSP/WebRTC media path change is introduced by S00.",
      ],
    },
    evidence: [
      evidenceRow({
        id: "v200-published-release",
        area: "v2.0.0 release evidence",
        status: "미확인",
        source: "docs/release-evidence-index.md rows v200-release-publication-20260601 and v200-signed-tag-verification-20260602",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "branch-source-version",
        area: "source version boundary",
        status: "미확인",
        source: "VERSION and CMakeLists.txt remain 2.0.0 while active roadmap is v2.1.0",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "release-metadata",
        area: "스크립트 테스트: release metadata",
        status: "current-run-required",
        source: "./server.sh verify-release-metadata",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "release-evidence-index",
        area: "스크립트 테스트: release evidence index",
        status: "current-run-required",
        source: "./server.sh verify-release-evidence-index",
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
        id: "rtsp-media-path-freeze",
        area: "스크립트 테스트: RTSP media path freeze",
        status: "current-run-required",
        source: "./server.sh verify-codecs",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "media-path-freeze",
        area: "스크립트 테스트: WebRTC media path freeze",
        status: "current-run-required",
        source: "./server.sh verify-webrtc-ice",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "ui-fulltest",
        area: "UI 풀테스트",
        status: "미실행",
        source: "Not part of S00; release-candidate full roadmap gate only",
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
      source: "not-collected-by-baseline-report-generator",
    },
  };
}
