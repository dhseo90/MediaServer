#!/usr/bin/env bash
# 파일 용도: VA event POST dispatcher의 payload schema, 실패 카운터, cooldown, queue drop을 검증한다.
# 동작 요약: 로컬 임시 HTTP 수신 서버를 띄우고 /lab/analysis/taps/{id}/events?dispatch=1로 POST worker를 구동한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/numeric_id_helpers.sh"
HTTP_BASE="${MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE:-http://127.0.0.1:8081}"
FILE_TOKEN="${MEDIA_SERVER_VERIFY_EVENT_POST_FILE:-imports/va_tracking_event_1280x720_30fps_h264.mp4}"
MODE="schema"
RECEIVER_PORT="${MEDIA_SERVER_VERIFY_EVENT_POST_PORT:-19091}"
RUN_ID="evtpost-$(date +%s)-$$"
RULE_ID_BASE="$(media_server_numeric_id_base \
  "event POST rule id base" \
  "${MEDIA_SERVER_VERIFY_EVENT_POST_RULE_ID_BASE:-}" \
  "$((9300 + ($$ % 50) * 8))")"
RULE_ID_COUNTER=0
RECEIVED_FILE="/tmp/media_server_${RUN_ID}_received.ndjson"
EVENTS_FILE="/tmp/media_server_${RUN_ID}_events.json"
STATUS_BEFORE_FILE="/tmp/media_server_${RUN_ID}_status_before.json"
STATUS_AFTER_FILE="/tmp/media_server_${RUN_ID}_status_after.json"
SUMMARY_FILE="${MEDIA_SERVER_VERIFY_EVENT_POST_SUMMARY_FILE:-/tmp/media_server_${RUN_ID}_summary.json}"
RULE_IDS=()
TAP_ID=""
RECEIVER_PID=""
SCHEMA_SUCCESS_RULE_ID=""
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

usage() {
  cat <<EOF_USAGE
Usage: ./server.sh verify-event-post [--mode disabled|schema|queue|recovery] [--http-base URL] [--file FILE_TOKEN] [--receiver-port PORT] [--summary-file PATH]

모드:
  disabled 기본 서버에서 Event POST dispatcher가 비활성인 상태를 기대값으로 확인합니다.
  schema  POST payload schema, 성공/실패 카운터, cooldown suppressedCount를 검증합니다.
  queue   작은 MEDIA_SERVER_ANALYSIS_EVENT_POST_MAX_QUEUE에서 slow endpoint로 droppedCount를 검증합니다.
  recovery 실패하던 endpoint가 같은 검증 중 복구됐을 때 failedCount와 sentCount가 함께 증가하는지 검증합니다.

schema/queue/recovery 모드는 MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1 상태의 서버가 필요합니다.
disabled 모드는 기본 disabled 서버가 제품 회귀가 아님을 분리 보고하기 위한 상태 smoke입니다.
queue 모드는 MEDIA_SERVER_ANALYSIS_EVENT_POST_MAX_QUEUE=1 또는 2로 서버를 시작하는 것을 권장합니다.
EOF_USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --http-base)
      HTTP_BASE="${2:-}"
      shift 2
      ;;
    --file)
      FILE_TOKEN="${2:-}"
      shift 2
      ;;
    --receiver-port)
      RECEIVER_PORT="${2:-}"
      shift 2
      ;;
    --summary-file)
      SUMMARY_FILE="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 옵션입니다: $1"
      usage
      exit 1
      ;;
  esac
done

HTTP_BASE="${HTTP_BASE%/}"
LOCAL_FILE="${ROOT_DIR}/video/${FILE_TOKEN}"

log_info() { echo "[info] $*"; }
log_pass() { PASS_COUNT=$((PASS_COUNT + 1)); echo "[pass] $*"; }
log_fail() { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "[fail] $*"; }
log_skip() { SKIP_COUNT=$((SKIP_COUNT + 1)); echo "[skip] $*"; }

urlencode_file_token() {
  # query string에 넣을 file token은 /까지 포함해 안전하게 percent-encoding한다.
  python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

json_field() {
  # 작은 status JSON에서 단일 field 값을 shell 비교용으로 꺼낸다.
  python3 -c 'import json, sys; value=json.loads(sys.argv[1]).get(sys.argv[2], ""); print(value)' "$1" "$2"
}

event_post_status() {
  curl -fsS "${HTTP_BASE}/lab/analysis/event-post/status"
}

event_storage_status() {
  curl -fsS "${HTTP_BASE}/lab/analysis/event-storage/status"
}

cleanup() {
  # 검증 중 생성한 rule/tap/receiver를 정리해 다음 검증에 영향을 남기지 않는다.
  set +e
  set +u
  if [[ -n "${TAP_ID}" ]]; then
    curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${TAP_ID}" >/dev/null 2>&1
  fi
  for rule_id in "${RULE_IDS[@]}"; do
    curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/rules/${rule_id}" >/dev/null 2>&1
  done
  if [[ -n "${RECEIVER_PID}" ]]; then
    kill "${RECEIVER_PID}" >/dev/null 2>&1
    wait "${RECEIVER_PID}" >/dev/null 2>&1
  fi
}
trap cleanup EXIT

start_receiver() {
  # /event는 성공, /fail은 HTTP 500, /slow는 지연 성공으로 응답해 dispatcher 경로를 분리한다.
  : > "${RECEIVED_FILE}"
  python3 -u - "${RECEIVED_FILE}" "${RECEIVER_PORT}" <<'PY' &
import json
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

received_path = sys.argv[1]
port = int(sys.argv[2])

class Handler(BaseHTTPRequestHandler):
    flaky_count = 0

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        body = self.rfile.read(length).decode("utf-8", errors="replace")
        with open(received_path, "a", encoding="utf-8") as handle:
            handle.write(json.dumps({"path": self.path, "body": body}, ensure_ascii=False) + "\n")
        if self.path.startswith("/flaky"):
            Handler.flaky_count += 1
            self.send_response(500 if Handler.flaky_count <= 3 else 204)
        elif self.path.startswith("/slow"):
            time.sleep(1.5)
            self.send_response(204)
        elif self.path.startswith("/fail"):
            self.send_response(500)
        else:
            self.send_response(204)
        self.end_headers()

    def log_message(self, *_args):
        return

server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
server.serve_forever()
PY
  RECEIVER_PID=$!
  sleep 0.3
  log_pass "임시 POST 수신 서버 시작: http://127.0.0.1:${RECEIVER_PORT}"
}

create_rule() {
  # event POST를 발생시키는 presence rule을 저장한다.
  local suffix="$1"
  local post_path="$2"
  RULE_ID_COUNTER=$((RULE_ID_COUNTER + 1))
  local rule_id
  rule_id="$(media_server_numeric_id_at "event POST rule id" "${RULE_ID_BASE}" "${RULE_ID_COUNTER}")"
  local url="http://127.0.0.1:${RECEIVER_PORT}${post_path}"
  RULE_IDS+=("${rule_id}")
  if [[ "${suffix}" == "success" ]]; then
    SCHEMA_SUCCESS_RULE_ID="${rule_id}"
  fi
  curl -fsS -X PUT "${HTTP_BASE}/lab/analysis/rules/${rule_id}" \
    -H 'Content-Type: application/json' \
    --data "{\"id\":\"${rule_id}\",\"priority\":100,\"enabled\":true,\"match\":{\"sourceKind\":\"file\",\"route\":\"http\"},\"analysis\":{\"classes\":[\"person\"]},\"event\":{\"type\":\"presence\",\"minConfidence\":0.25,\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.0,\"y\":0.0},{\"x\":1.0,\"y\":0.0},{\"x\":1.0,\"y\":1.0},{\"x\":0.0,\"y\":1.0}]}},\"eventActions\":{\"highlight\":{\"enabled\":true,\"mode\":\"blink\",\"target\":\"matched-object\",\"durationMs\":100,\"color\":\"#ff0000\"},\"post\":{\"enabled\":true,\"method\":\"POST\",\"url\":\"${url}\",\"payloadFormat\":\"media-server.va.event.v1\"}}}" \
    >/dev/null
  log_pass "rule 저장: ${rule_id} -> ${post_path}"
}

create_tap() {
  # tracker가 있는 동일 영상을 사용해 dispatch 호출마다 안정적인 event key를 만든다.
  local encoded_file
  encoded_file="$(urlencode_file_token "${FILE_TOKEN}")"
  local response
  response="$(curl -fsS -X POST "${HTTP_BASE}/lab/analysis/taps?file=${encoded_file}&va=1&fps=8&maxQueue=1&trackIds=1&trackTrails=1")"
  TAP_ID="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tapId",""))' <<<"${response}")"
  if [[ -z "${TAP_ID}" ]]; then
    log_fail "analysis tap 생성 실패"
    echo "${response}" | sed 's/^/  /'
    exit 1
  fi
  sleep 2
  log_pass "analysis tap 생성: ${TAP_ID}"
}

dispatch_events() {
  # dispatch=1은 events 응답 생성과 동시에 POST dispatcher enqueue를 수행한다.
  curl -fsS "${HTTP_BASE}/lab/analysis/taps/${TAP_ID}/events?dispatch=1" > "${EVENTS_FILE}"
}

wait_for_status_delta() {
  # 비동기 worker가 counter를 갱신할 시간을 주고 기대 delta가 나올 때까지 기다린다.
  local field="$1"
  local before="$2"
  local expected_delta="$3"
  local tries="${4:-30}"
  local current=""
  for _ in $(seq 1 "${tries}"); do
    local status
    status="$(event_post_status)"
    current="$(json_field "${status}" "${field}")"
    if [[ $((current - before)) -ge "${expected_delta}" ]]; then
      printf '%s' "${status}" > "${STATUS_AFTER_FILE}"
      return 0
    fi
    sleep 0.2
  done
  return 1
}

validate_schema_mode() {
  # 성공/실패/cooldown counter와 실제 수신 payload schema를 함께 검증한다.
  local before_json="$1"
  local before_enqueued before_sent before_failed before_suppressed
  before_enqueued="$(json_field "${before_json}" "enqueuedCount")"
  before_sent="$(json_field "${before_json}" "sentCount")"
  before_failed="$(json_field "${before_json}" "failedCount")"
  before_suppressed="$(json_field "${before_json}" "suppressedCount")"

  dispatch_events
  dispatch_events

  if ! wait_for_status_delta "sentCount" "${before_sent}" 1 40; then
    log_fail "sentCount 증가를 확인하지 못했습니다"
    exit 1
  fi
  if ! wait_for_status_delta "failedCount" "${before_failed}" 1 40; then
    log_fail "failedCount 증가를 확인하지 못했습니다"
    exit 1
  fi
  if ! wait_for_status_delta "suppressedCount" "${before_suppressed}" 1 40; then
    log_fail "suppressedCount 증가를 확인하지 못했습니다"
    exit 1
  fi
  local after_json
  after_json="$(event_post_status)"
  printf '%s' "${after_json}" > "${STATUS_AFTER_FILE}"

  python3 - "${before_enqueued}" "${before_failed}" "${before_suppressed}" "${STATUS_AFTER_FILE}" "${RECEIVED_FILE}" "${SCHEMA_SUCCESS_RULE_ID}" <<'PY'
import json
import pathlib
import sys

before_enqueued = int(sys.argv[1])
before_failed = int(sys.argv[2])
before_suppressed = int(sys.argv[3])
status = json.loads(pathlib.Path(sys.argv[4]).read_text())
received_path = pathlib.Path(sys.argv[5])
success_rule_id = sys.argv[6]

errors = []
if status.get("enqueuedCount", 0) <= before_enqueued:
    errors.append("enqueuedCount가 증가하지 않았습니다")
if status.get("failedCount", 0) <= before_failed:
    errors.append("failedCount가 증가하지 않았습니다")
if status.get("suppressedCount", 0) <= before_suppressed:
    errors.append("suppressedCount가 증가하지 않았습니다")
if not status.get("lastError"):
    errors.append("실패 전송 lastError가 비어 있습니다")

posts = []
for line in received_path.read_text(encoding="utf-8").splitlines():
    if not line.strip():
        continue
    item = json.loads(line)
    if item.get("path") == "/event":
        posts.append(json.loads(item.get("body") or "{}"))

if not posts:
    errors.append("성공 endpoint가 받은 POST payload가 없습니다")
else:
    payload = next(
        (item for item in posts if str((item.get("rule") or {}).get("id", "")) == success_rule_id),
        None,
    )
    if payload is None:
        rule_ids = [str((item.get("rule") or {}).get("id", "")) for item in posts]
        errors.append(f"성공 endpoint에 이번 검증 rule payload가 없습니다: expected={success_rule_id}, got={rule_ids}")
        payload = posts[0]
    if payload.get("schema") != "media-server.va.event.v1":
        errors.append(f"schema mismatch: {payload.get('schema')}")
    if not str(payload.get("eventId", "")).startswith("evt_"):
        errors.append(f"eventId mismatch: {payload.get('eventId')}")
    if not isinstance(payload.get("timestampMs"), int):
        errors.append("timestampMs가 정수가 아닙니다")
    rule = payload.get("rule") or {}
    if str(rule.get("id", "")) != success_rule_id:
        errors.append(f"rule.id mismatch: {rule}")
    if rule.get("type") != "presence":
        errors.append(f"rule.type mismatch: {rule.get('type')}")
    source = payload.get("source") or {}
    if source.get("sourceKind") != "file" or source.get("route") != "http":
        errors.append(f"source context mismatch: {source}")
    obj = payload.get("object") or {}
    bbox = obj.get("bbox") or {}
    if not isinstance(obj.get("trackId"), int):
        errors.append(f"object.trackId 타입 mismatch: {obj.get('trackId')}")
    if not obj.get("class"):
        errors.append("object.class가 비어 있습니다")
    if not all(key in bbox for key in ("x", "y", "width", "height")):
        errors.append(f"bbox field 누락: {bbox}")
    highlight = ((payload.get("action") or {}).get("highlight") or {})
    post = ((payload.get("action") or {}).get("post") or {})
    if highlight.get("mode") != "blink" or highlight.get("color") != "#ff0000":
        errors.append(f"highlight schema mismatch: {highlight}")
    if highlight.get("durationMs") != 100:
        errors.append(f"highlight duration mismatch: {highlight.get('durationMs')}")
    if post.get("enabled") is not True or post.get("method") != "POST":
        errors.append(f"post action mismatch: {post}")
    if post.get("payloadFormat") != "media-server.va.event.v1":
        errors.append(f"payloadFormat mismatch: {post}")

if errors:
    for error in errors:
        print("[fail]", error)
    raise SystemExit(1)

print("status=", status)
print("payload_sample=", payload)
PY
  log_pass "POST payload schema 검증"
  log_pass "POST 실패 카운터 검증"
  log_pass "POST cooldown 검증"
}

validate_queue_mode() {
  # slow endpoint를 여러 rule로 누적해 bounded queue drop counter가 증가하는지 확인한다.
  local before_json="$1"
  local before_dropped before_max_queue
  before_dropped="$(json_field "${before_json}" "droppedCount")"
  before_max_queue="$(json_field "${before_json}" "maxQueueSize")"
  if [[ "${before_max_queue}" -gt 2 ]]; then
    log_fail "queue 모드는 MEDIA_SERVER_ANALYSIS_EVENT_POST_MAX_QUEUE=1 또는 2가 필요합니다. 현재 ${before_max_queue}"
    exit 1
  fi

  dispatch_events
  if ! wait_for_status_delta "droppedCount" "${before_dropped}" 1 40; then
    log_fail "droppedCount 증가를 확인하지 못했습니다"
    exit 1
  fi
  log_pass "POST queue 포화 droppedCount 검증"
}

validate_recovery_mode() {
  # 같은 dispatch 안에서 초반 요청은 실패하고 이후 요청은 성공하게 만들어 endpoint 복구 후 전송 재개를 확인한다.
  local before_json="$1"
  local before_failed before_sent
  before_failed="$(json_field "${before_json}" "failedCount")"
  before_sent="$(json_field "${before_json}" "sentCount")"

  dispatch_events
  if ! wait_for_status_delta "failedCount" "${before_failed}" 1 50; then
    log_fail "recovery 모드에서 failedCount 증가를 확인하지 못했습니다"
    exit 1
  fi
  if ! wait_for_status_delta "sentCount" "${before_sent}" 1 50; then
    log_fail "recovery 모드에서 endpoint 복구 후 sentCount 증가를 확인하지 못했습니다"
    exit 1
  fi
  local after_json
  after_json="$(event_post_status)"
  printf '%s' "${after_json}" > "${STATUS_AFTER_FILE}"
  python3 - "${STATUS_AFTER_FILE}" "${RECEIVED_FILE}" <<'PY'
import json
import pathlib
import sys

status = json.loads(pathlib.Path(sys.argv[1]).read_text())
received = [
    json.loads(line)
    for line in pathlib.Path(sys.argv[2]).read_text(encoding="utf-8").splitlines()
    if line.strip()
]
flaky_hits = [item for item in received if item.get("path") == "/flaky"]
if len(flaky_hits) < 4:
    raise SystemExit(f"/flaky 수신 건수가 부족합니다: {len(flaky_hits)}")
if status.get("failedCount", 0) < 1 or status.get("sentCount", 0) < 1:
    raise SystemExit(f"복구 검증 counter 부족: {status}")
print("recovery_status=", status)
print("flaky_received=", len(flaky_hits))
PY
  log_pass "POST endpoint recovery 실패 counter 검증"
  log_pass "POST endpoint recovery 성공 counter 검증"
}

validate_event_storage_recovery_policy() {
  # EventStorage가 검증용 /tmp 경로로 켜진 경우에만 JSON Lines corrupt/partial skip 정책을 확인한다.
  local storage_status enabled storage_path
  if ! storage_status="$(event_storage_status 2>/dev/null)"; then
    log_skip "EventStorage status endpoint 확인 실패로 recovery policy 검증 건너뜀"
    return
  fi
  enabled="$(json_field "${storage_status}" "enabled")"
  if [[ "${enabled}" != "True" && "${enabled}" != "true" ]]; then
    log_skip "EventStorage 비활성 상태라 recovery policy 검증 건너뜀"
    return
  fi
  storage_path="$(json_field "${storage_status}" "path")"
  case "${storage_path}" in
    /tmp/media_server_*)
      ;;
    *)
      log_skip "EventStorage path가 검증용 /tmp/media_server_* 경로가 아니어서 파일 변조 검증 건너뜀: ${storage_path}"
      return
      ;;
  esac

  for _ in $(seq 1 20); do
    storage_status="$(event_storage_status)"
    if [[ "$(json_field "${storage_status}" "queueSize")" == "0" ]]; then
      break
    fi
    sleep 0.2
  done

  local event_id="event-storage-recovery-${RUN_ID}"
  python3 - "${storage_path}" "${event_id}" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
event_id = sys.argv[2]
path.parent.mkdir(parents=True, exist_ok=True)
if path.exists() and path.stat().st_size > 0:
    with path.open("rb+") as handle:
        handle.seek(-1, 2)
        if handle.read(1) != b"\n":
            handle.seek(0, 2)
            handle.write(b"\n")

record = {
    "schema": "media-server.va.event-record.v1",
    "eventId": event_id,
    "eventType": "verify-recovery",
    "streamId": "verify-event-post",
    "channelId": "verify-event-post",
    "trackId": 1,
    "classId": 0,
    "className": "person",
    "startTime": 1,
    "updateTime": 1,
    "endTime": 0,
    "status": "emitted",
    "zoneId": "",
    "lineId": "",
    "scenarioName": "",
    "scenarioPhase": "",
    "confidence": 0.99,
    "snapshotPath": "",
    "clipPath": "",
    "preEventMs": 0,
    "postEventMs": 0,
    "metadata": {},
}
with path.open("ab") as handle:
    handle.write(json.dumps(record, separators=(",", ":")).encode("utf-8") + b"\n")
    handle.write(b'{"schema":"media-server.va.event-record.v1","eventId":"corrupt",broken}\n')
    handle.write(b'{"schema":"media-server.va.event-record.v1","eventId":"partial"')
PY

  local encoded_event_id records_json status_json
  encoded_event_id="$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "${event_id}")"
  records_json="$(curl -fsS "${HTTP_BASE}/lab/analysis/events/records?eventId=${encoded_event_id}&limit=10")"
  status_json="$(event_storage_status)"
  python3 - "${records_json}" "${status_json}" "${event_id}" <<'PY'
import json
import sys

records_payload = json.loads(sys.argv[1])
status_payload = json.loads(sys.argv[2])
event_id = sys.argv[3]

records = records_payload.get("records", [])
if not any(item.get("eventId") == event_id for item in records):
    raise SystemExit("valid EventRecord line was not returned")
if records_payload.get("skippedCorruptLines", 0) < 2:
    raise SystemExit(f"records skippedCorruptLines too small: {records_payload}")
if records_payload.get("partialLineCount", 0) < 1:
    raise SystemExit(f"records partialLineCount too small: {records_payload}")
if status_payload.get("skippedCorruptLines", 0) < 2:
    raise SystemExit(f"status skippedCorruptLines too small: {status_payload}")
if status_payload.get("partialLineCount", 0) < 1:
    raise SystemExit(f"status partialLineCount too small: {status_payload}")
if status_payload.get("lastRecoveryStatus") != "recovered":
    raise SystemExit(f"unexpected lastRecoveryStatus: {status_payload}")
print("event_storage_recovery_records=", records_payload)
print("event_storage_recovery_status=", status_payload)
PY
  log_pass "EventStorage corrupt JSON Lines skip 검증"
  log_pass "EventStorage partial JSON Lines count 검증"
  log_pass "EventStorage recovery status 검증"
}

write_summary() {
  # event POST 검증 결과와 수신 endpoint별 건수를 JSON summary로 남긴다.
  local status_after="{}"
  if [[ -f "${STATUS_AFTER_FILE}" ]]; then
    status_after="$(cat "${STATUS_AFTER_FILE}")"
  fi
  python3 - "${SUMMARY_FILE}" "${MODE}" "${HTTP_BASE}" "${FILE_TOKEN}" \
    "${PASS_COUNT}" "${FAIL_COUNT}" "${SKIP_COUNT}" "${STATUS_BEFORE_FILE}" "${STATUS_AFTER_FILE}" "${RECEIVED_FILE}" "${status_after}" <<'PY'
import json
import pathlib
import sys

def read_json_file(path):
    try:
        return json.loads(pathlib.Path(path).read_text(encoding="utf-8") or "{}")
    except (OSError, json.JSONDecodeError):
        return {}

received_path = pathlib.Path(sys.argv[10])
received = []
if received_path.exists():
    for line in received_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            try:
                received.append(json.loads(line))
            except json.JSONDecodeError:
                pass
path_counts = {}
for item in received:
    path_counts[item.get("path", "")] = path_counts.get(item.get("path", ""), 0) + 1

summary = {
    "kind": "event-post",
    "mode": sys.argv[2],
    "httpBase": sys.argv[3],
    "file": sys.argv[4],
    "pass": int(sys.argv[5]),
    "fail": int(sys.argv[6]),
    "skip": int(sys.argv[7]),
    "statusBefore": read_json_file(sys.argv[8]),
    "statusAfter": read_json_file(sys.argv[9]),
    "receivedFile": str(received_path),
    "receivedCount": len(received),
    "receivedPathCounts": path_counts,
}
pathlib.Path(sys.argv[1]).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY
}

if [[ "${MODE}" != "disabled" && "${MODE}" != "schema" && "${MODE}" != "queue" && "${MODE}" != "recovery" ]]; then
  echo "지원하지 않는 mode입니다: ${MODE}"
  usage
  exit 1
fi

log_info "http_base=${HTTP_BASE}"
log_info "mode=${MODE}"
log_info "file=${FILE_TOKEN}"

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

status_before="$(event_post_status)"
printf '%s' "${status_before}" > "${STATUS_BEFORE_FILE}"

dispatcher_enabled="$(json_field "${status_before}" "enabled")"
if [[ "${MODE}" == "disabled" ]]; then
  printf '%s' "${status_before}" > "${STATUS_AFTER_FILE}"
  if [[ "${dispatcher_enabled}" == "True" || "${dispatcher_enabled}" == "true" ]]; then
    log_fail "event POST dispatcher가 활성 상태입니다. disabled smoke는 기본 비활성 서버에서 실행하세요."
  else
    log_pass "event POST dispatcher disabled 상태 확인"
  fi
  echo
  echo "== Event POST dispatcher disabled smoke 요약 =="
  echo "- 기대 상태: disabled"
  echo "- 실제 상태: ${dispatcher_enabled}"
  echo "- 통과: ${PASS_COUNT}"
  echo "- 실패: ${FAIL_COUNT}"
  echo "- 건너뜀: ${SKIP_COUNT}"
  echo "- status: ${STATUS_BEFORE_FILE}"
  write_summary
  echo "- summary: ${SUMMARY_FILE}"
  if [[ ${FAIL_COUNT} -gt 0 ]]; then
    exit 1
  fi
  exit 0
fi

if [[ ! -f "${LOCAL_FILE}" ]]; then
  log_fail "테스트 영상이 없습니다: ${LOCAL_FILE}"
  exit 1
fi

if [[ "${dispatcher_enabled}" != "True" && "${dispatcher_enabled}" != "true" ]]; then
  printf '%s' "${status_before}" > "${STATUS_AFTER_FILE}"
  log_fail "event POST dispatcher가 비활성화되어 있습니다. schema/queue/recovery smoke는 MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1 서버가 필요합니다. 기본 disabled 상태 확인은 --mode disabled로 분리 실행하세요."
  echo
  echo "== Event POST dispatcher enabled smoke 사전 조건 =="
  echo "- 기대 상태: enabled"
  echo "- 실제 상태: ${dispatcher_enabled}"
  echo "- 보정: MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1 서버에서 같은 mode를 재실행"
  write_summary
  echo "- summary: ${SUMMARY_FILE}"
  exit 1
fi
log_pass "event POST dispatcher enabled 상태 확인"

start_receiver
if [[ "${MODE}" == "schema" ]]; then
  create_rule "success" "/event"
  create_rule "fail" "/fail"
elif [[ "${MODE}" == "queue" ]]; then
  for index in 1 2 3 4 5 6; do
    create_rule "slow-${index}" "/slow"
  done
else
  for index in 1 2 3 4 5 6; do
    create_rule "flaky-${index}" "/flaky"
  done
fi
create_tap

if [[ "${MODE}" == "schema" ]]; then
  validate_schema_mode "${status_before}"
elif [[ "${MODE}" == "queue" ]]; then
  validate_queue_mode "${status_before}"
else
  validate_recovery_mode "${status_before}"
  validate_event_storage_recovery_policy
fi

echo
echo "== Event POST dispatcher 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
echo "- received: ${RECEIVED_FILE}"
echo "- status_before: ${STATUS_BEFORE_FILE}"
echo "- status_after: ${STATUS_AFTER_FILE}"
write_summary
echo "- summary: ${SUMMARY_FILE}"
if [[ ${FAIL_COUNT} -gt 0 ]]; then
  exit 1
fi
