#!/usr/bin/env bash
# 파일 용도: VA event POST dispatcher의 payload schema, 실패 카운터, cooldown, queue drop을 검증한다.
# 동작 요약: 로컬 임시 HTTP 수신 서버를 띄우고 /lab/analysis/taps/{id}/events?dispatch=1로 POST worker를 구동한다.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HTTP_BASE="${MEDIA_SERVER_VERIFY_EVENT_POST_HTTP_BASE:-http://127.0.0.1:8081}"
FILE_TOKEN="${MEDIA_SERVER_VERIFY_EVENT_POST_FILE:-imports/va_tracking_event_1280x720_30fps_h264.mp4}"
MODE="schema"
RECEIVER_PORT="${MEDIA_SERVER_VERIFY_EVENT_POST_PORT:-19091}"
RUN_ID="evtpost-$(date +%s)-$$"
RECEIVED_FILE="/tmp/media_server_${RUN_ID}_received.ndjson"
EVENTS_FILE="/tmp/media_server_${RUN_ID}_events.json"
STATUS_BEFORE_FILE="/tmp/media_server_${RUN_ID}_status_before.json"
STATUS_AFTER_FILE="/tmp/media_server_${RUN_ID}_status_after.json"
RULE_IDS=()
TAP_ID=""
RECEIVER_PID=""
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

usage() {
  cat <<EOF_USAGE
Usage: ./server.sh verify-event-post [--mode schema|queue|recovery] [--http-base URL] [--file FILE_TOKEN] [--receiver-port PORT]

모드:
  schema  POST payload schema, 성공/실패 카운터, cooldown suppressedCount를 검증합니다.
  queue   작은 MEDIA_SERVER_ANALYSIS_EVENT_POST_MAX_QUEUE에서 slow endpoint로 droppedCount를 검증합니다.
  recovery 실패하던 endpoint가 같은 검증 중 복구됐을 때 failedCount와 sentCount가 함께 증가하는지 검증합니다.

서버는 MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1 상태로 실행되어 있어야 합니다.
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

cleanup() {
  # 검증 중 생성한 rule/tap/receiver를 정리해 다음 검증에 영향을 남기지 않는다.
  set +e
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
  local rule_id="${RUN_ID}-${suffix}"
  local url="http://127.0.0.1:${RECEIVER_PORT}${post_path}"
  RULE_IDS+=("${rule_id}")
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

  python3 - "${before_enqueued}" "${before_failed}" "${before_suppressed}" "${STATUS_AFTER_FILE}" "${RECEIVED_FILE}" "${RUN_ID}" <<'PY'
import json
import pathlib
import sys

before_enqueued = int(sys.argv[1])
before_failed = int(sys.argv[2])
before_suppressed = int(sys.argv[3])
status = json.loads(pathlib.Path(sys.argv[4]).read_text())
received_path = pathlib.Path(sys.argv[5])
run_id = sys.argv[6]

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
    payload = posts[0]
    if payload.get("schema") != "media-server.va.event.v1":
        errors.append(f"schema mismatch: {payload.get('schema')}")
    if not str(payload.get("eventId", "")).startswith("evt_"):
        errors.append(f"eventId mismatch: {payload.get('eventId')}")
    if not isinstance(payload.get("timestampMs"), int):
        errors.append("timestampMs가 정수가 아닙니다")
    rule = payload.get("rule") or {}
    if not str(rule.get("id", "")).startswith(f"{run_id}-success"):
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
print("payload_sample=", posts[0])
PY
  log_pass "POST payload schema, 실패 카운터, cooldown 검증"
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
  log_pass "POST endpoint recovery 후 실패/성공 counter 검증"
}

if [[ "${MODE}" != "schema" && "${MODE}" != "queue" && "${MODE}" != "recovery" ]]; then
  echo "지원하지 않는 mode입니다: ${MODE}"
  usage
  exit 1
fi

log_info "http_base=${HTTP_BASE}"
log_info "mode=${MODE}"
log_info "file=${FILE_TOKEN}"

if [[ ! -f "${LOCAL_FILE}" ]]; then
  log_fail "테스트 영상이 없습니다: ${LOCAL_FILE}"
  exit 1
fi

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

status_before="$(event_post_status)"
printf '%s' "${status_before}" > "${STATUS_BEFORE_FILE}"
if [[ "$(json_field "${status_before}" "enabled")" != "True" && "$(json_field "${status_before}" "enabled")" != "true" ]]; then
  log_fail "event POST dispatcher가 비활성화되어 있습니다. MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1로 서버를 시작하세요."
  exit 1
fi
log_pass "event POST dispatcher enabled"

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
fi

echo
echo "== Event POST dispatcher 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
echo "- received: ${RECEIVED_FILE}"
echo "- status_before: ${STATUS_BEFORE_FILE}"
echo "- status_after: ${STATUS_AFTER_FILE}"
if [[ ${FAIL_COUNT} -gt 0 ]]; then
  exit 1
fi
