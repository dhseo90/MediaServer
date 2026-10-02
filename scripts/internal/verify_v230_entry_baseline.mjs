#!/usr/bin/env node
// 파일 용도: 초기 진입 명령의 현행 문서 연결·보고서 경계 검사. 과거 실행 원장은 읽지 않는다.
import {createEntryReportRunner} from "./entry_baseline_report.mjs";
import {assertKnownOptions} from "./script_arg_utils.mjs";
const rawArgs=process.argv.slice(2);
assertKnownOptions(rawArgs,["report","json-report","h","help"]);
if(rawArgs.length===1&&(rawArgs[0]==="--help"||rawArgs[0]==="-h")){
  console.log("./server.sh verify-v230-entry-baseline [--report <새 Markdown 파일>] [--json-report <새 JSON 파일>]\n현행 문서·비실행 정의 검사. 제품/UI/장시간/원격 검사와 중앙 원장 갱신은 하지 않습니다.");
  process.exit(0);
}
const runner=createEntryReportRunner({url:import.meta.url,args:rawArgs,command:"verify-v230-entry-baseline",schema:"media-server.v230-entry-baseline-report.v1",expectedIds:["v220-release-baseline","source-version-boundary","roadmap-boundary","integrator-contract-freeze","event-post-freeze","webrtc-metadata-freeze","sse-metadata-freeze","ws-metadata-freeze","auth-scope-freeze","rule-payload-freeze","viewer-redaction-freeze","ui-fulltest","soak-30min","longrun-120min","field-onvif-turn-whep","published-metadata"],companionCommands:["verify-integrator-contract-artifact","verify-event-post","verify-webrtc-va-metadata","verify-va-metadata-sidechannel","verify-ws-metadata","verify-auth-routes","verify-predev","verify-va-runtime-console-longrun","verify-release-metadata"]});
const {version,branch,head}=runner;

runner.finish(buildReport());

function buildReport() {
  return {
    schema: "media-server.v230-entry-baseline-report.v1",
    generatedAt: new Date().toISOString(),
    status: "pass",
    currentRelease: "v2.2.0",
    entryBranch: "v2.3.0",
    activeRoadmap: "v2.3.0 Operational Evidence & Contract Baseline",
    sourceVersion: `v${version}`,
    branch,
    head,
    checks: [],
    baselineDecision: {
      primary: "Use the v2.2.0 source-only/live-only release baseline as the frozen product contract and start v2.3.0 as an operational evidence and contract baseline roadmap.",
      fallback: "If live published metadata or field endpoints cannot be rechecked, keep them 미확인/manual-not-run and rely only on recorded local evidence.",
      excluded: [
        "No UI implementation, VA matrix execution, VLM runtime/provider call, route/API/schema migration, or media path change is performed by S00.",
        "No fifth test area is introduced; field/provider gates stay inside stability conditions or exclusion records.",
        "No UI fulltest, 30 minute soak, 120 minute longrun, field smoke, or published GitHub check is executed by this baseline verifier.",
      ],
    },
    evidence: [
      evidenceRow({
        id: "v220-release-baseline",
        area: "v2.2.0 release baseline",
        status: "미확인",
        source: "docs/development-backlog.md and docs/release-evidence-index.md identify v2.2.0 as the current source-only/live-only baseline",
      }),
      evidenceRow({
        id: "source-version-boundary",
        area: "source version boundary",
        status: "미확인",
        source: "VERSION and CMakeLists.txt remain 2.2.0 while active roadmap is v2.3.0",
      }),
      evidenceRow({
        id: "roadmap-boundary",
        area: "roadmap review",
        status: "current-run-required",
        source: "./server.sh verify-v230-entry-baseline",
      }),
      evidenceRow({
        id: "integrator-contract-freeze",
        area: "스크립트 테스트: contract artifact freeze",
        status: "current-run-required",
        source: "./server.sh verify-integrator-contract-artifact",
      }),
      evidenceRow({
        id: "event-post-freeze",
        area: "스크립트 테스트: Event POST freeze",
        status: "current-run-required",
        source: "./server.sh verify-event-post --mode schema --http-base <enabled-auth-off-http-base>",
      }),
      evidenceRow({
        id: "webrtc-metadata-freeze",
        area: "스크립트 테스트: WebRTC DataChannel metadata freeze",
        status: "current-run-required",
        source: "./server.sh verify-webrtc-va-metadata",
      }),
      evidenceRow({
        id: "sse-metadata-freeze",
        area: "스크립트 테스트: SSE metadata freeze",
        status: "current-run-required",
        source: "./server.sh verify-va-metadata-sidechannel",
      }),
      evidenceRow({
        id: "ws-metadata-freeze",
        area: "스크립트 테스트: WS metadata freeze",
        status: "current-run-required",
        source: "./server.sh verify-ws-metadata",
      }),
      evidenceRow({
        id: "auth-scope-freeze",
        area: "스크립트 테스트: Auth/session/scope freeze",
        status: "current-run-required",
        source: "./server.sh verify-auth-routes",
      }),
      evidenceRow({
        id: "rule-payload-freeze",
        area: "스크립트 테스트: Rule/Profile payload freeze",
        status: "current-run-required",
        source: "roadmap review plus verify-rule-ui / verify-ops-rules-roundtrip in later rule-touching steps",
      }),
      evidenceRow({
        id: "viewer-redaction-freeze",
        area: "viewer/client redaction",
        status: "current-run-required",
        source: "roadmap review plus verify-ops-client-ui in later UI-touching steps",
      }),
      evidenceRow({
        id: "ui-fulltest",
        area: "UI 풀테스트",
        status: "미실행",
        source: "Not part of S00; release-candidate or UI-changing steps only",
        requiredBeforeS01: false,
      }),
      evidenceRow({
        id: "soak-30min",
        area: "30분 테스트",
        status: "미실행",
        source: "./server.sh verify-predev --soak-minutes 30; not requested for S00",
        requiredBeforeS01: false,
      }),
      evidenceRow({
        id: "longrun-120min",
        area: "120분 테스트",
        status: "미실행",
        source: "./server.sh verify-predev --soak-minutes 120 or ./server.sh verify-va-runtime-console-longrun --duration-minutes 120",
        approvalRequired: true,
        requiredBeforeS01: false,
      }),
      evidenceRow({
        id: "field-onvif-turn-whep",
        area: "조건부 field evidence",
        status: "미확인",
        source: "real ONVIF/external TURN/WHEP credential success is not executed by S00",
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
      source: "not-collected-by-baseline-report-generator",
    },
  };
}
