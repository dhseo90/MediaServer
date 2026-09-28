#!/usr/bin/env bash
# 파일 용도: 검증 전용 shell 경계. 기존 role/scope/history 본문은 변경하지 않는다.
set +x
set +a
unset BASH_ENV ENV SHELLOPTS BASHOPTS 2>/dev/null || true
AUTH_PREPARATION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
unset MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO
export -n TEST_PASSWORD PREVIOUS_PASSWORD SECOND_PREVIOUS_PASSWORD WRONG_PASSWORD_ONE WRONG_PASSWORD_TWO
node() { command env -i PATH="$PATH" node "$@"; }

auth_start_ice() {
  if [[ -n "${AUTH_UDP_PID:-}" ]]; then kill -0 "$AUTH_UDP_PID"; return; fi
  command env -i PATH="$PATH" node "${AUTH_PREPARATION_DIR}/recording_auth_preparation.mjs" owned-udp "$TMP_DIR/ice.port" &
  AUTH_UDP_PID=$!
  for _ in $(seq 1 50); do
    if [[ -s "$TMP_DIR/ice.port" ]]; then AUTH_UDP_PORT="$(cat "$TMP_DIR/ice.port")"; return; fi
    kill -0 "$AUTH_UDP_PID" || return 1
    sleep 0.1
  done
  return 1
}

curl() {
  printf '%s\0' "$@" | command env -i PATH="$PATH" node "${AUTH_PREPARATION_DIR}/recording_auth_preparation.mjs" curl
}

# 기존 heredoc의 sys.argv 의미를 유지하되 OS argv에는 payload를 넣지 않는다.
python3() {
  if [[ "${1:-}" != '-' ]]; then
    printf '[fail] 인증 Python 호출 형식 거부\n' >&2
    return 1
  fi
  shift
  command env -i PATH="$PATH" python3 -I -c 'import os,sys
args=os.fdopen(3,"rb").read().split(b"\0")
if not args or args[-1]!=b"": raise SystemExit(2)
sys.argv=["-"]+[x.decode("utf-8") for x in args[:-1]]
code=sys.stdin.read()
try: exec(compile(code,"<auth-oracle>","exec"),{"__name__":"__main__"})
except BaseException as e:
 if isinstance(e,SystemExit) and (e.code is None or e.code==0): raise
 print("[fail] 인증 Python oracle: "+type(e).__name__,file=sys.stderr)
 raise SystemExit(1)
' 3< <(printf '%s\0' "$@")
}

auth_generate_passwords() {
  local values=() value
  while IFS= read -r value; do values+=("$value"); done < <(command env -i PATH="$PATH" node "${AUTH_PREPARATION_DIR}/recording_auth_preparation.mjs" passwords)
  [[ "${#values[@]}" == 5 ]] || return 1
  TEST_PASSWORD="${values[0]}"
  PREVIOUS_PASSWORD="${values[1]}"
  SECOND_PREVIOUS_PASSWORD="${values[2]}"
  WRONG_PASSWORD_ONE="${values[3]}"
  WRONG_PASSWORD_TWO="${values[4]}"
  export -n TEST_PASSWORD PREVIOUS_PASSWORD SECOND_PREVIOUS_PASSWORD WRONG_PASSWORD_ONE WRONG_PASSWORD_TWO
  unset MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO
}
