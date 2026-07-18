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
    node - "${summary_path}" "${user_command}" <<'NODE'
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
if (uiSummaryPath && fs.existsSync(uiSummaryPath)) {
  const ui = JSON.parse(fs.readFileSync(uiSummaryPath, "utf8"));
  const coverage = ui.coverage || {};
  console.log(`[test] exactUiTarget=${coverage.targetCount ?? 424}`);
  console.log(`[test] exactUiPass=${coverage.pass ?? ui.pass ?? ""}`);
  console.log(`[test] exactUiFail=${coverage.fail ?? ui.fail ?? ""}`);
  const failedCase = Array.isArray(ui.cases)
    ? ui.cases.find(item => item.status === "FAIL" || item.result === "FAIL")
    : null;
  if (failedCase) console.log(`[test] testcaseId=${failedCase.testId || failedCase.caseId || ""}`);
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
  else
    echo "[test] summary missing: ${summary_path}" >&2
    echo "[test] reproductionCommand=${user_command}" >&2
    test_status=1
  fi

  return "${test_status}"
}
