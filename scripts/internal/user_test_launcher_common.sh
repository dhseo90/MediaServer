#!/usr/bin/env bash
# 파일 용도: v3.9.0 사용자용 무옵션 테스트 launcher의 output, 위임, 결과 출력을 공통 소유한다.

media_server_run_user_test() {
  local suite="$1"
  shift

  local user_command=""
  local output_prefix=""
  case "${suite}" in
    server-30)
      user_command="./test_server_30min.sh"
      output_prefix="media_server_v390_server_30min"
      ;;
    server-120)
      user_command="./test_server_120min.sh"
      output_prefix="media_server_v390_server_120min"
      ;;
    ui)
      user_command="./test_ui.sh"
      output_prefix="media_server_v390_ui"
      ;;
    release)
      user_command="./test_release.sh"
      output_prefix="media_server_v390_release_acceptance"
      ;;
    *)
      echo "알 수 없는 사용자 테스트 suite: ${suite}" >&2
      return 64
      ;;
  esac

  if [[ "$#" -ne 0 ]]; then
    echo "사용법: ${user_command}" >&2
    echo "이 실행기는 사용자 옵션과 외부 secret 입력을 허용하지 않습니다." >&2
    return 64
  fi

  unset MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD
  unset MEDIA_SERVER_V390_UI_ROLE_SECRETS
  unset MEDIA_SERVER_VERIFY_PREDEV_HTTP_PORT
  unset MEDIA_SERVER_VERIFY_PREDEV_RTSP_PORT
  export MEDIA_SERVER_SKIP_LOCAL_ENV=1

  local root_dir="${ROOT_DIR}"
  local temp_root="${TMPDIR:-/private/tmp}"
  if [[ ! -d "${temp_root}" ]]; then
    temp_root="/tmp"
  fi
  local output_dir
  if [[ "${suite}" == "release" ]]; then
    output_dir="${root_dir}/docs/release-artifacts/v3.9.0/test-acceptance-current-final"
    mkdir -p "${output_dir}"
  elif [[ "${suite}" == "ui" ]]; then
    output_dir="${root_dir}/.media_server.test/v3.9.0/ui-acceptance-current"
    mkdir -p "${output_dir}"
  else
    output_dir="$(mktemp -d "${temp_root%/}/${output_prefix}.XXXXXX")"
  fi
  local summary_path="${output_dir}/summary.json"

  echo "[test] suite=${suite}"
  echo "[test] command=${user_command}"
  echo "[test] outputDir=${output_dir}"

  if [[ "${MEDIA_SERVER_USER_TEST_CONTRACT_ACTIVE:-0}" != "1" ]]; then
    local contract_log="${output_dir}/launcher-contract.log"
    local contract_status=0
    if MEDIA_SERVER_USER_TEST_CONTRACT_ACTIVE=1 \
      "${root_dir}/server.sh" verify-v390-user-test-launchers-contract >"${contract_log}" 2>&1; then
      contract_status=0
    else
      contract_status=$?
    fi
    sed -n '1,240p' "${contract_log}"
    if [[ "${contract_status}" -ne 0 ]]; then
      echo "[test] failureStage=launcher-contract" >&2
      echo "[test] testcaseId=verify-v390-user-test-launchers-contract" >&2
      echo "[test] exitCode=${contract_status}" >&2
      echo "[test] logPath=${contract_log}" >&2
      echo "[test] reproductionCommand=${user_command}" >&2
      echo "[test] laterNotRun=${suite}" >&2
      return "${contract_status}"
    fi
  fi

  if [[ "${suite}" == "ui" ]]; then
    local ui_source_contract_log="${output_dir}/ui-source-contract.log"
    local ui_source_contract_status=0
    if "${root_dir}/server.sh" verify-v390-ui-native-exact-cases-contract >"${ui_source_contract_log}" 2>&1; then
      ui_source_contract_status=0
    else
      ui_source_contract_status=$?
    fi
    sed -n '1,240p' "${ui_source_contract_log}"
    if [[ "${ui_source_contract_status}" -ne 0 ]]; then
      media_server_write_ui_source_contract_failure_evidence \
        "${root_dir}" "${output_dir}" "${ui_source_contract_log}" \
        "${ui_source_contract_status}" "${user_command}"
      echo "[test] failureStage=ui-source-contract" >&2
      echo "[test] testcaseId=verify-v390-ui-native-exact-cases-contract" >&2
      echo "[test] exitCode=${ui_source_contract_status}" >&2
      echo "[test] logPath=${ui_source_contract_log}" >&2
      echo "[test] reproductionCommand=${user_command}" >&2
      echo "[test] laterNotRun=ui-environment-bootstrap,ui-exact-424,ui-fulltest-qualification,cleanup,report" >&2
      return "${ui_source_contract_status}"
    fi
  fi

  local -a command
  case "${suite}" in
    server-30)
      command=("${root_dir}/server.sh" verify-v390-server-longrun --duration-minutes 30 --output-dir "${output_dir}" --user-launcher test_server_30min)
      ;;
    server-120)
      command=("${root_dir}/server.sh" verify-v390-server-longrun --duration-minutes 120 --output-dir "${output_dir}" --user-launcher test_server_120min)
      ;;
    ui)
      command=("${root_dir}/server.sh" verify-v390-test-acceptance-bundle --output-dir "${output_dir}" --suite ui)
      ;;
    release)
      command=("${root_dir}/server.sh" verify-v390-test-acceptance-bundle --output-dir "${output_dir}" --auto-run-120)
      ;;
  esac

  local test_status=0
  if "${command[@]}"; then
    test_status=0
  else
    test_status=$?
  fi

  if [[ -f "${summary_path}" ]]; then
    local summary_status=0
    if node - "${summary_path}" "${user_command}" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const summaryPath = process.argv[2];
const userCommand = process.argv[3];
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const ledger = Array.isArray(summary.stages) ? summary.stages : (Array.isArray(summary.phases) ? summary.phases : []);
const first = summary.firstFailure || summary.failure || null;
const failedEntry = ledger.find(item => item.status === "FAIL") || null;
const failureStage = first?.stage || first?.phase || summary.failedStage || summary.failedPhase || failedEntry?.id || "";
const firstFailureTestcaseId = typeof first?.testcaseId === "string" ? first.testcaseId.trim() : "";
const failedCheck = (failedEntry?.checks || []).find(item => item?.status === "FAIL") || null;
const failureCase = firstFailureTestcaseId || failedCheck?.id || failedEntry?.id || "";
const failureExit = first?.exitCode ?? summary.exitCode ?? failedEntry?.exitCode ?? "";
const failureLog = first?.logPath || failedEntry?.logPath || "";
console.log(`[test] result=${summary.result || summary.status || "UNKNOWN"}`);
for (const item of ledger) console.log(`[test] stage=${item.id} status=${item.status} exit=${item.exitCode ?? ""}`);
if (failureStage || first) {
  console.log(`[test] failureStage=${failureStage}`);
  console.log(`[test] testcaseId=${failureCase}`);
  console.log(`[test] exitCode=${failureExit}`);
  console.log(`[test] logPath=${failureLog}`);
  console.log(`[test] reproductionCommand=${userCommand}`);
  console.log(`[test] laterNotRun=${ledger.filter(item => item.status === "not-run").map(item => item.id).join(",")}`);
}
const uiSummaryPath = summary.uiAutomation?.summaryPath || "";
if (!uiSummaryPath || !fs.existsSync(uiSummaryPath)) {
  for (const field of ["exactUiSelected", "exactUiAttempted", "exactUiPass", "exactUiFail",
    "exactUiNotRun", "exactUiUnsupported", "exactUiRunnerAbort",
    "exactUiFailureCensusCount", "exactUiFailureCensusPath", "policyEligible",
    "policyQualified", "uiFulltestPass", "finalIntegrity",
    "finalIntegrityPath"]) console.log(`[test] ${field}=`);
  process.exitCode = 1;
} else {
  const ui = JSON.parse(fs.readFileSync(uiSummaryPath, "utf8"));
  const canonical = ui.schema === "media-server.v390-ui-canonical-parent.v1";
  const coverage = canonical ? ui.counts : ui.coverage;
  const selected = canonical ? coverage?.selected : coverage?.targetCount;
  console.log(`[test] exactUiSelected=${Number.isSafeInteger(selected) ? selected : ""}`);
  console.log(`[test] exactUiAttempted=${Number.isSafeInteger(coverage?.attempted) ? coverage.attempted : ""}`);
  console.log(`[test] exactUiPass=${Number.isSafeInteger(coverage?.pass) ? coverage.pass : ""}`);
  console.log(`[test] exactUiFail=${Number.isSafeInteger(coverage?.fail) ? coverage.fail : ""}`);
  console.log(`[test] exactUiNotRun=${Number.isSafeInteger(coverage?.notRun) ? coverage.notRun : ""}`);
  console.log(`[test] exactUiUnsupported=${Number.isSafeInteger(coverage?.unsupported) ? coverage.unsupported : ""}`);
  console.log(`[test] exactUiRunnerAbort=${canonical && Number.isSafeInteger(coverage?.runnerAbort) ? coverage.runnerAbort : ""}`);
  console.log(`[test] exactUiFailureCensusCount=${Array.isArray(ui.failureCensus) ? ui.failureCensus.length : ""}`);
  console.log(`[test] exactUiFailureCensusPath=${canonical ? uiSummaryPath : ""}`);
  const failedCase = Array.isArray(ui.cases)
    ? ui.cases.find(item => item.status === "FAIL" || item.result === "FAIL")
    : null;
  if (failedCase) console.log(`[test] testcaseId=${failedCase.testId || failedCase.caseId || ""}`);
  const qualification = summary.uiFulltestQualification;
  const policyEligible = qualification?.policyEligible === true || qualification?.finalEvidenceEligible === true;
  const policyQualified = qualification?.policyQualified === true ||
    (qualification?.qualifiedCaseCount === 424 && qualification?.uiFulltestPass === true);
  const uiFulltestPass = qualification?.uiFulltestPass === true;
  const finalIntegrity = summary.suite === "ui"
    ? (summary.uiFinalIntegrity?.status || "not-run")
    : (ledger.find(item => item.id === "final-integrity")?.status || "not-run");
  const finalIntegrityPath = summary.suite === "ui"
    ? (summary.uiFinalIntegrity?.path || "")
    : (ledger.find(item => item.id === "final-integrity")?.summaryPath || "");
  console.log(`[test] policyEligible=${policyEligible}`);
  console.log(`[test] policyQualified=${policyQualified}`);
  console.log(`[test] uiFulltestPass=${uiFulltestPass}`);
  console.log(`[test] finalIntegrity=${finalIntegrity}`);
  console.log(`[test] finalIntegrityPath=${finalIntegrityPath}`);
  const exactPass = canonical && selected === 424 && coverage?.attempted === 424 &&
    coverage?.pass === 424 && coverage?.fail === 0 && coverage?.notRun === 0 &&
    coverage?.unsupported === 0 && coverage?.runnerAbort === 0 &&
    Array.isArray(ui.failureCensus) && ui.failureCensus.length === 0;
  if (!(exactPass && policyEligible && policyQualified && uiFulltestPass &&
      finalIntegrity === "PASS" && summary.cleanup?.status === "PASS")) process.exitCode = 1;
}
if (summary.longrun120?.decision) {
  console.log(`[test] longrun120Decision=${summary.longrun120.decision.executionDecision || ""}`);
  console.log(`[test] longrun120Triggers=${(summary.longrun120.decision.triggerReasons || []).join(",")}`);
}
if (summary.authorization) {
  console.log(`[test] authorization=${summary.authorization.status || ""}`);
  console.log(`[test] authorizationSource=${summary.authorization.source || ""}`);
}
console.log(`[test] cleanup=${summary.cleanup?.status || "not-run"}`);
console.log(`[test] summary=${summaryPath}`);
console.log(`[test] report=${summary.reportPath || path.join(path.dirname(summaryPath), "report.md")}`);
NODE
    then
      summary_status=0
    else
      summary_status=$?
    fi
    if [[ "${test_status}" -eq 0 && "${summary_status}" -ne 0 ]]; then
      test_status="${summary_status}"
    fi
  else
    local blank_field
    for blank_field in \
      result summary report failureStage testcaseId exitCode logPath laterNotRun \
      exactUiSelected exactUiAttempted exactUiPass exactUiFail exactUiNotRun \
      exactUiUnsupported exactUiRunnerAbort exactUiFailureCensusCount \
      exactUiFailureCensusPath policyEligible policyQualified uiFulltestPass \
      finalIntegrity finalIntegrityPath cleanup; do
      echo "[test] ${blank_field}="
    done
    echo "[test] summary missing: ${summary_path}" >&2
    echo "[test] reproductionCommand=${user_command}" >&2
    test_status=1
  fi

  return "${test_status}"
}

# UI source-contract가 acceptance child 전에 실패하면, 이전 실행 summary/report를 이번 실행의
# evidence로 재사용하지 않고 현재 invocation의 fail-closed evidence만 기록한다.
media_server_write_ui_source_contract_failure_evidence() {
  local root_dir="$1"
  local output_dir="$2"
  local contract_log="$3"
  local exit_code="$4"
  local user_command="$5"
  local summary_path="${output_dir}/summary.json"
  local report_path="${output_dir}/report.md"
  local first_failure_path="${output_dir}/first-failure.json"
  local first_failure_report_path="${output_dir}/first-failure.md"
  local commit_sha
  local branch_name
  local invocation_id
  commit_sha="$(git -C "${root_dir}" rev-parse HEAD 2>/dev/null || printf 'unknown')"
  branch_name="$(git -C "${root_dir}" branch --show-current 2>/dev/null || printf 'unknown')"
  invocation_id="v390-ui-source-contract-$(date -u +%Y%m%dT%H%M%SZ)-$$"

  node - "${summary_path}" "${report_path}" "${first_failure_path}" "${first_failure_report_path}" \
    "${contract_log}" "${exit_code}" "${user_command}" "${commit_sha}" "${branch_name}" "${invocation_id}" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const [summaryPath, reportPath, firstFailurePath, firstFailureReportPath, contractLog,
  exitCodeRaw, userCommand, commitSha, branch, invocationId] = process.argv.slice(2);
const exitCode = Number(exitCodeRaw);
const now = new Date().toISOString();
let priorFirstFailure = null;
if (fs.existsSync(firstFailurePath)) {
  try {
    const prior = JSON.parse(fs.readFileSync(firstFailurePath, "utf8"));
    priorFirstFailure = {
      schema: prior.schema || "",
      recordedAt: prior.recordedAt || "",
      sourceCommitSha: prior.sourceProvenance?.commitSha || "",
      failedStage: prior.failedStage || "",
      testcaseId: prior.firstFailure?.testcaseId || "",
    };
  } catch {
    priorFirstFailure = { schema: "unreadable-prior-first-failure" };
  }
}
const sourceProvenance = {
  commitSha,
  branch,
  worktreeClean: null,
  sourceWorktreeClean: null,
  capturedAt: now,
};
const firstFailure = {
  stage: "ui-source-contract",
  testcaseId: "verify-v390-ui-native-exact-cases-contract",
  command: "./server.sh verify-v390-ui-native-exact-cases-contract",
  exitCode,
  logPath: contractLog,
  reproductionCommand: userCommand,
};
const exactCoverage = {
  targetCount: 424,
  executed: 0,
  pass: 0,
  fail: 0,
  notRun: 424,
  unsupported: 0,
};
const stages = [
  { id: "preflight", status: "PASS", exitCode: 0, command: "validate zero-option UI launcher inputs" },
  { id: "ui-source-contract", status: "FAIL", exitCode, command: firstFailure.command, logPath: contractLog },
  { id: "ui-environment-bootstrap", status: "not-run", reason: "ui-source-contract failed before acceptance child" },
  { id: "ui-exact-424", status: "not-run", reason: "ui-source-contract failed before acceptance child" },
  { id: "ui-server-cleanup", status: "not-run", reason: "acceptance child was not invoked" },
  { id: "ui-fulltest-qualification", status: "not-run", reason: "ui-source-contract failed before acceptance child" },
  { id: "cleanup", status: "not-run", reason: "no acceptance-owned runtime was created" },
  { id: "report", status: "PASS", exitCode: 0, command: "write current fail-closed source-contract evidence" },
  { id: "final-integrity", status: "not-run", reason: "ui-source-contract failed before acceptance child" },
];
const summary = {
  schema: "media-server.v390-test-acceptance-bundle.v1",
  runId: invocationId,
  command: userCommand,
  executionMode: "actual-ui-only",
  suite: "ui",
  dryRun: false,
  fixtureMode: false,
  result: "FAIL",
  stopOnFirstFail: true,
  sourceProvenance,
  sourceProvenanceEnd: sourceProvenance,
  outputPreparation: {
    sourceContractFailureEvidence: true,
    acceptanceChildInvoked: false,
    priorFirstFailurePreserved: priorFirstFailure !== null,
  },
  failedStage: "ui-source-contract",
  firstFailure,
  priorFirstFailure,
  actualBrowserExecution: false,
  uiAutomation: {
    result: "FAIL",
    executionStatus: "pre-execution-failed",
    actualBrowserExecution: false,
    coverage: exactCoverage,
    failure: firstFailure,
  },
  policyV4Evaluation: null,
  uiFulltestQualification: {
    status: "not-run",
    finalEvidenceEligible: false,
    uiFulltestPass: false,
    reason: "ui-source-contract failed before acceptance child",
  },
  cleanup: {
    status: "not-run",
    reason: "no acceptance-owned runtime was created",
  },
  stages,
  reportPath,
  evidenceBoundary: "source-contract failure is current launcher evidence only; no acceptance child, runtime, browser, PID, port, or prior source binding is claimed",
};
const firstFailureRecord = {
  schema: "media-server.v390-acceptance-first-failure.v1",
  recordedAt: now,
  invocationId,
  sourceProvenance,
  acceptanceCommand: userCommand,
  failedStage: firstFailure.stage,
  firstFailure,
  childFailure: { phase: "ui-source-contract", error: "verify-v390-ui-native-exact-cases-contract failed" },
  priorFirstFailure,
};
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(firstFailurePath, `${JSON.stringify(firstFailureRecord, null, 2)}\n`);
fs.writeFileSync(reportPath, [
  "# v3.9.0 UI Source-Contract Failure",
  "",
  `runId: ${invocationId}`,
  `sourceCommitSha: ${commitSha}`,
  `sourceBranch: ${branch}`,
  "result: FAIL",
  "failedStage: ui-source-contract",
  "testcaseId: verify-v390-ui-native-exact-cases-contract",
  "actualBrowserExecution: false",
  "exact: executed=0 pass=0 fail=0 not-run=424 unsupported=0",
  "ui-environment-bootstrap: not-run",
  "ui-exact-424: not-run",
  "ui-fulltest-qualification: not-run",
  "acceptanceChildInvoked: false",
  `sourceContractLog: ${contractLog}`,
  "",
].join("\n"));
fs.writeFileSync(firstFailureReportPath, [
  "# v3.9.0 UI Source-Contract First Failure",
  "",
  `runId: ${invocationId}`,
  `sourceCommitSha: ${commitSha}`,
  "failedStage: ui-source-contract",
  "testcaseId: verify-v390-ui-native-exact-cases-contract",
  `exitCode: ${exitCode}`,
  `logPath: ${contractLog}`,
  "",
].join("\n"));
NODE
}
