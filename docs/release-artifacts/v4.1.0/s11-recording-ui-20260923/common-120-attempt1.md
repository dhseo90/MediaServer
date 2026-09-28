# S11 공통 120분 1차 실행 중단 기록

독자: v4.1.0 검증·릴리즈 담당자. 수명: 실패 이력. 테스트 정책은 `AGENTS.md`,
결과 전수는 [요약 JSON](predev-120-attempt1-summary.json)이 기준이다.

## 최초 실패와 영향

- 명령: `./server.sh verify-predev --soak-minutes 120 --fail-fast --heartbeat-interval 60`.
- 제품 바이너리 SHA-256 `beca63166d0db227adbac8036149947b22516127d5d213b02f231046f9c9a35e`.
  직전 통과한 수정 후 30분과 동일하다.
- 실행 exit 1, 경과 471초, 4 pass·1 fail·0 skip·6 notRun. 120분 반복 관측은 시작하지
  않았으므로 공통 120분 FAIL이며 완료 증거가 아니다.
- 실패는 통합 미디어 smoke의 로컬 무음 HTTP H.264 입력에서 명시적 `/h264` RTSP probe가
  기존 20초 상한에 도달한 것이다. 같은 입력의 `/default`·`/h265`·WebRTC signaling은 통과했고
  로컬 HTTP 제공기의 파일 GET은 200이었다. 해당 원본 준비는 서버 로그상 1 track,
  약 2.5초에 Ready였으며 RTSP media configure까지는 관측됐다. ffprobe의 RTSP 응답 단계는
  이 최초 실행에서 따로 계측되지 않아 원인을 단정할 수 없다.
- 서버 PID는 정상 종료, 테스트 TCP 포트 8081/8555와 제공기 포트 8767은 해제됐다.
  장시간 반복·종료 후 queue 검사는 fail-fast로 미실행이다. 외부 TURN도 이번에는 미실행이며
  실패 검사를 skip으로 바꾸지 않는다.
- raw 통합 smoke·서버·해당 case·제공기 로그의 SHA-256은 각각
  `ee2c23231b2c943d0f6b01be1cecf9a9fb7e5812e9d500ae462b09727080d03a`,
  `585f3d12310471a7f9fc32c05a880a2049afea89865c8bf5722a3d7231a0d638`,
  `36570a9ae47486198dc648474bcffe95837b0c90b8a365b693615f3f8e7c6fa9`,
  `763c9b1f78621f0787c601f6ab2d0a171babe5d05b03f21257e3342de0f60a2f`다.
  원문은 RTSP 원본 URL을 포함하므로 저장소에 복제하지 않는다.

## 한정 진단

기존 소유 loopback 진단기의 `--http`로 동일 제품 바이너리와 입력 2종·8개 출력 검사를 한 번
실행했다. exit 0·8 pass·0 fail, 각 RTSP 응답은 2xx 5개와 audio/video SDP를 관측했고
무음 입력 `/h264`는 약 3.62초에 끝났다. 이는 최초 실패를 소급 통과시키지 않으며,
실패 당시의 ffprobe 응답 부재 여부·GLib 경고와의 인과관계는 여전히 미확정이다.
[안전한 probe 단계 계수](predev-120-attempt1-focused-codec-diagnostics.jsonl),
[서버 단계 계수](predev-120-attempt1-focused-server-diagnostics.json),
[한정 진단 실행 메타데이터](predev-120-attempt1-focused-execution.json)를 보존했다.

다음 단계는 최초 실패와 동일한 통합 smoke 조건에서 URL 원문 없이 RTSP 요청·응답·SDP·종료
단계를 기록하는 것이다. 실패가 재현돼 원인이 확정되기 전 timeout 확대·검사 제외·제품 수정으로
PASS를 만들지 않는다. 원인 미확정 상태에서 공통 120분 재시도나 녹화 전용 120분을 완료로 세지 않는다.
token start/end/consumed는 전용 집계가 없어 미집계다.

원본 raw 로그는 비밀·원본 URL 노출을 피하기 위해 위 해시와 안전한 판정값을 보존한 뒤 삭제했다.
삭제 대상은 이번 실행 소유 predev root 약 104KB, `.media_server.test/20260923-105805` 약 76KB,
`.media_server` 약 228KB, HTTP 제공기 로그 약 4KB와 한정 진단 root 약 1.8MB·외부 로그 2개다.
정상 종료·포트 비점유·소유자 확인 후 각 정확한 경로를 삭제했고 부재를 확인했다.
