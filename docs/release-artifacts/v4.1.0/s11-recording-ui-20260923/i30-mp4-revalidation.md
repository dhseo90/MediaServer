# S11-I30 파생 MP4 수정 후 범위 한정 재검증

독자: v4.1.0 녹화 검증·릴리즈 판정 담당자. 수명: 수정 후 직접 관측 기록.
정책은 `AGENTS.md`, 이전 TS 실패와 31개 조작의 원본 기록은 같은 디렉터리의 `README.md`가 기준이다.
이 기록은 그 실패를 삭제하거나 기존 UI 424개를 새 소스에서 재실행했다고 주장하지 않는다.

## 변경·실행 경계

- 시작 HEAD: `32f8ac77311791bd0d7e039dc5555f7bba209a74`. 녹화 UI 공백 수정은 `c37949e31`, 관리형 MP4 수정은 `9643b6e70`으로 분할 커밋했다.
- 수정 후 제품 바이너리 SHA-256: `beca63166d0db227adbac8036149947b22516127d5d213b02f231046f9c9a35e`.
- 현재 앱이 사용하는 managed DerivedJob의 **신규** H.264 파생 출력은 fMP4로 생성·영속화·제공한다. 저장된 구형 TS profile과 제품에서 사용하지 않는 V1 deriver는 원래 계약대로 유지한다. 재인코딩·시간/ID/권한/보존 정책 변경은 없다.
- 실제 브라우저는 격리된 인증 off 서버에서 해당 타임라인을 직접 조작했다. 이전 인증 UI 전수 증거와 수정 후 HTTP 권한 40개를 분리하여 해석한다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| S11-I30-R01 신규 출력 형식 | `verify_recording_derived_remux.sh` 32/32: MP4 ftyp, 원본/출력 AU·디코딩 동일, 실제 B-frame·keyframe preroll. V1 TS 158/158 및 구형 TS profile remux 별도 유지 | pass |
| S11-I30-R02 저장·복구 | DerivedJob 검증 12/12, 작업 23/23, service 43/43, event 통합 48/48 및 보조군, 파일 증거 193/193, finalize 복구 경계 19/19·V2 54/54, 복구 내용 focused 5/5, HTTP 종료/hold 10/10. 최초 복구 검증은 sandbox 프로세스 관측 EPERM으로 중단됐고 별도 권한 실행에서 통과. 최초 기록도 보존 | pass |
| S11-I30-R03 HTTP·권한 | 현재 실제 앱의 MP4 seed 2출력 파일·hash, GET/HEAD/Range `--http-api` 35/35, 인증/범위 `--http-auth` 40/40 통과. UI 준비기의 자체 검증 20/20 | pass |
| S11-I30-R03 실제 브라우저 | 시각 지정 조회에서 시간 확인 115개, 기본 선택은 `이벤트 우선`. Chrome 인앱 브라우저에서 같은 full job의 `-o1`과 `-o0`을 각각 조작: 둘 다 160×90, duration 1초, readyState 4, currentTime 0→1초, ended=true, error=null. unanchored 수동 선택도 같은 방식으로 통과 | pass |
| S11-I30-R04 시간·자원 영향 | 복수 원본·부분/미확인 구간, B-frame seek·원본 축, 출력 byte 상한·취소·소유권·파일 해시·누적 조회 회귀를 focused 검사로 대조. 공통/녹화 120분과 최종 자원 판정은 아직 별도 | pass |

브라우저 준비 명령은 `--ui-direct`와 `--ui-direct --ui-anchor-utc-ms 1790125200000 --ui-seek-fixture`였다.
후자는 한국 현지 2026-09-23 10:00:00 기준이며 실제 조회를 09:59~10:02로 조작했다.
두 준비기 모두 exit 0, 각각 136,162ms/127,761ms였다. 서버 PID 정상 exit 0, RTSP/HTTP TCP 포트 닫힘,
소유 임시 root 부재, cleanup failure 0을 확인했다. 최초 sandbox loopback EPERM은 제품 실패로 세지 않았고
권한 있는 격리 실행으로 재검증했다. 브라우저 재생의 화면은 작업 도구에서 직접 확인했으나, 이번 짧은
재검증의 새로운 스크린샷·trace 파일을 저장소에 보존하지 못했다. 따라서 Policy v4 전체 적격이나
녹화 UI 31개 조작의 새 소스 전수 PASS로 확대하지 않는다.

## 수정 후 30분 안정화

`./server.sh verify-predev --soak-minutes 30 --fail-fast --heartbeat-interval 60`은 종료 코드 0,
전체 2,415초·soak 20회, 개별 109건 통과·실패 0건·미실행 0건이었다. 외부 TURN hard gate 1건은
사용자 명시 범위 밖이어서 skip이며 PASS로 세지 않는다. build·integrated smoke·반복 VA 이벤트,
Event POST schema/recovery, redaction, runtime idle, 종료 후 queue·port 정리를 각각 확인했다.
두 서버 PID의 종료와 8081/8555 포트 해제도 요약 원장에서 확인했다.

- [전수 요약 JSON](predev-30-summary.json), [개별 보고서](predev-30-report.md),
  [원출력 묶음](predev-30-logs.tar.gz)을 보존했다. 묶음은 279개 항목이며 raw server.log는
  RTSP 원본 URL을 포함하므로 제외했다. 나머지 로그·요약에서 비밀번호·인증 토큰 표식은 발견되지 않았다.
  묶음 SHA-256은 `0430a626e8445bba5f59cfef621334f8da31ba30e43c88582d92bbc6150ea843`이다.
- 검증 소유 `/tmp/media_server_predev-1790126125-89029` 1.0MB와 별도 summary/report/HTML,
  이번 실행이 만든 `.media_server` 228KB와 `.media_server.test/20260923-101527` 104KB는
  종료·소유권·비사용을 확인하고 삭제했다. 삭제 후 부재 확인. 통합 smoke 개별 단계는 보존한
  전수 JSON 및 통합 stdout 로그에서 다시 대조할 수 있다.

이 문서의 단기·30분 실행 당시 미실행: 공통·녹화 전용 120분, 최종 릴리즈 acceptance,
외부 서비스·실기기. 이후 공통120분은 [첫 실패](common-120-attempt1.md)를 보존한 채
[동일 기준 재실행](common-120-pass.md)으로 통과했다. 녹화 전용120분은 별도 판정 대상이고
외부 조건은 사용자 명시 제외다.
token start/end/consumed는 실측 집계가 없어 미집계다.
