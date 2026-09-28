#!/usr/bin/env node
// 초기 진입 명령의 현행 문서 연결·보고서 경계 검사. 과거 실행 원장은 읽지 않는다.
import {createEntryReportRunner} from "./entry_baseline_report.mjs";
import {assertKnownOptions} from "./script_arg_utils.mjs";
const rawArgs=process.argv.slice(2);
assertKnownOptions(rawArgs,["report","json-report","h","help"]);
if(rawArgs.length===1&&(rawArgs[0]==="--help"||rawArgs[0]==="-h")){
  console.log("./server.sh verify-v190-entry-baseline [--report <새 Markdown 파일>] [--json-report <새 JSON 파일>]\n현행 문서·비실행 정의 검사. 제품/UI/장시간/원격 검사와 중앙 원장 갱신은 하지 않습니다.");
  process.exit(0);
}
const runner=createEntryReportRunner({url:import.meta.url,args:rawArgs,command:"verify-v190-entry-baseline",schema:"media-server.v190-entry-baseline-report.v1",expectedIds:["short-stability","soak-30min","ui-fulltest","longrun-120min","ci-checks","release-metadata","published-release-metadata","release-closeout","v2-entry-freeze"],companionCommands:["verify-predev","verify-va-runtime-console-longrun","verify-release-metadata","verify-release-closeout-helper","verify-integrator-contract-artifact"]});
const {version,branch,head}=runner;

runner.finish(buildReport());

function buildReport() {
  return {
    schema: "media-server.v190-entry-baseline-report.v1",
    generatedAt: new Date().toISOString(),
    status: "pass",
    baselineStatus: "draft-pending-release-closeout",
    release: "v1.9.0",
    sourceVersion: `v${version}`,
    entryTarget: "v2.0.0",
    branch,
    head,
    checks: [],
    evidence: [
      evidenceRow({
        id: "short-stability",
        area: "스크립트 테스트: 단기 smoke",
        status: "미실행",
        source: "run stage-specific stabilizers first; attach actual command list in close-out",
        requiredBeforeRelease: true,
      }),
      evidenceRow({
        id: "soak-30min",
        area: "스크립트 테스트: 30분 안정화",
        status: "미실행",
        source: "./server.sh verify-predev --soak-minutes 30",
        approvalRequired: true,
        requiredBeforeRelease: true,
      }),
      evidenceRow({
        id: "ui-fulltest",
        area: "UI 풀테스트",
        status: "미실행",
        source: "Codex in-app browser manual UI full test evidence",
        approvalRequired: true,
        requiredBeforeRelease: true,
      }),
      evidenceRow({
        id: "longrun-120min",
        area: "스크립트 테스트: 120분 장시간",
        status: "미실행",
        source: "./server.sh verify-predev --soak-minutes 120 or ./server.sh verify-va-runtime-console-longrun --duration-minutes 120",
        approvalRequired: true,
        requiredBeforeRelease: false,
      }),
      evidenceRow({
        id: "ci-checks",
        area: "CI 상태",
        status: "미확인",
        source: "GitHub Actions UI/API check review",
        requiredBeforeRelease: true,
      }),
      evidenceRow({
        id: "release-metadata",
        area: "Release metadata",
        status: "미실행",
        source: "./server.sh verify-release-metadata",
        requiredBeforeRelease: true,
      }),
      evidenceRow({
        id: "published-release-metadata",
        area: "Published release metadata",
        status: "manual-not-run",
        source: "./server.sh verify-release-metadata --published",
        approvalRequired: true,
        requiredBeforeRelease: false,
      }),
      evidenceRow({
        id: "release-closeout",
        area: "Release close-out one-shot",
        status: "manual-not-run",
        source: "./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run",
        approvalRequired: true,
        requiredBeforeRelease: true,
      }),
      evidenceRow({
        id: "v2-entry-freeze",
        area: "v2.0.0 entry freeze",
        status: "미실행",
        source: "./server.sh verify-integrator-contract-artifact",
        requiredBeforeRelease: true,
      }),
    ],
  };
}

function evidenceRow({ id, area, status, source, approvalRequired = false, requiredBeforeRelease = true }) {
  return {
    id,
    area,
    status,
    approvalRequired,
    requiredBeforeRelease,
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
