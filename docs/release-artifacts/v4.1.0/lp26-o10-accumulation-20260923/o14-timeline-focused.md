# LP26-O14 타임라인 잠금 색인 집중 검증

독자: v4.1.0 녹화 개발·검증 담당자. 수명: S11 완료 때까지의 실행 기록. 테스트 정책은 `AGENTS.md`, 기능 정의는 `docs/project-feature-test-inventory.md`가 기준이며 이 문서는 현재 실행 증거만 보존한다.

- 범위: 동일 catalog snapshot 안의 파생 출력·참조 소유권 반복 탐색을 한 번의 색인으로 변경. 공개 API·저장 바이트·삭제/보존/재생 판정은 변경하지 않음.
- `./server.sh build`: exit 0. `bash scripts/internal/verify_recording_public_timeline.sh`: exit 0, 66/66, 임시 루트 삭제 확인. `git diff --check`: exit 0.
- 실제 앱 두 기동 단독 검사 `node scripts/internal/verify_recording_current_app.mjs`: exit 0, 27/27, 두 기동 출력 각 2개·HTTP200·해시·재기동·정상 종료·격리 루트 삭제 확인. 원출력 파일을 보존하지 못해 이 실행의 27개 상세 행을 저장소 완료 증거로 재사용하지 않는다.
- 다음 2,049개 동시 checkpoint 반례는 별도 단계 실패다. 이 66/66은 HTTP 4초나 전체 통합 PASS를 의미하지 않는다.
- 토큰 start/end/consumed: 집계 제공 없음. 실제 경과: 원출력 마지막 `[elapsed]` 13초. 실제 앱은 도구 결과 105.763초이며 원출력 미보존.

| 원출력 행 | 테스트 내용 | 결과 | 증거 |
| ---: | --- | --- | --- |
| 3 | D3B-01 actual V2 원본·문자열 UTC·독립 unplaced 응답 | pass | [원출력](o14-timeline-focused.log#L3) |
| 4 | D3B-14 mismatch/nonintegral mapping은 unplaced | pass | [원출력](o14-timeline-focused.log#L4) |
| 5 | D3B-14 mismatch/nonintegral mapping은 unplaced | pass | [원출력](o14-timeline-focused.log#L5) |
| 6 | D3B-02 문법/범위 오류400 | pass | [원출력](o14-timeline-focused.log#L6) |
| 7 | D3B-02 문법/범위 오류400 | pass | [원출력](o14-timeline-focused.log#L7) |
| 8 | D3B-02 문법/범위 오류400 | pass | [원출력](o14-timeline-focused.log#L8) |
| 9 | D3B-02 문법/범위 오류400 | pass | [원출력](o14-timeline-focused.log#L9) |
| 10 | D3B-02 문법/범위 오류400 | pass | [원출력](o14-timeline-focused.log#L10) |
| 11 | D3B-02 문법/범위 오류400 | pass | [원출력](o14-timeline-focused.log#L11) |
| 12 | D3B-02 권한 거부403 | pass | [원출력](o14-timeline-focused.log#L12) |
| 13 | LP25-T01 omitted/mapping exact JSON identity | pass | [원출력](o14-timeline-focused.log#L13) |
| 14 | LP25-T06 invalid unplacedUnit 400 | pass | [원출력](o14-timeline-focused.log#L14) |
| 15 | LP25-T06 authorize before invalid unit | pass | [원출력](o14-timeline-focused.log#L15) |
| 16 | LP25-T06 invalid unplacedUnit 400 | pass | [원출력](o14-timeline-focused.log#L16) |
| 17 | LP25-T06 authorize before invalid unit | pass | [원출력](o14-timeline-focused.log#L17) |
| 18 | LP25-T06 invalid unplacedUnit 400 | pass | [원출력](o14-timeline-focused.log#L18) |
| 19 | LP25-T06 authorize before invalid unit | pass | [원출력](o14-timeline-focused.log#L19) |
| 23 | D3B-13 Intent placeholder no file/null time | pass | [원출력](o14-timeline-focused.log#L23) |
| 24 | D3B-13 accepted/no-job 상태 보존 | pass | [원출력](o14-timeline-focused.log#L24) |
| 25 | D3B-05 Ready 출력 시간과 재생불가 분리 | pass | [원출력](o14-timeline-focused.log#L25) |
| 26 | D3B-05 Committed 출력 시간과 재생불가 분리 | pass | [원출력](o14-timeline-focused.log#L26) |
| 27 | D3B-05 실제 검증된 파생2출력 시간/파일 독립 | pass | [원출력](o14-timeline-focused.log#L27) |
| 28 | D3B-07 같은 UTC 다른 segment/epoch는 원본 숨김 없음 | pass | [원출력](o14-timeline-focused.log#L28) |
| 29 | D3B-13 출력 생성 뒤 job placeholder 없음 | pass | [원출력](o14-timeline-focused.log#L29) |
| 30 | D3B-07 page 밖 이벤트도 원본 전체 충족 판정 | pass | [원출력](o14-timeline-focused.log#L30) |
| 31 | D3B-06 일부 중첩 원본은 보존 | pass | [원출력](o14-timeline-focused.log#L31) |
| 32 | D3B-04 재조회 stable itemId/order | pass | [원출력](o14-timeline-focused.log#L32) |
| 33 | D3B-12 요청축/문자열/공개 whitelist | pass | [원출력](o14-timeline-focused.log#L33) |
| 34 | D3B-08 동일 size 변조 출력은 비재생 | pass | [원출력](o14-timeline-focused.log#L34) |
| 35 | D3B-08 파일 누락 Complete와 재생불가/숨김 분리 | pass | [원출력](o14-timeline-focused.log#L35) |
| 36 | D3B-08 실제 tombstone 출력 deleted 보존 | pass | [원출력](o14-timeline-focused.log#L36) |
| 37 | D3B-09 source tombstone 뒤 durable UTC 투영 | pass | [원출력](o14-timeline-focused.log#L37) |
| 41 | D3B-05 partial 요청 실제 출력 jobComplete | pass | [원출력](o14-timeline-focused.log#L41) |
| 42 | D3B-14 actual 출력 mismatch mapping은 unplaced·partial 파일 제공 분리 | pass | [원출력](o14-timeline-focused.log#L42) |
| 46 | D3B-13 Failed placeholder no file/null time | pass | [원출력](o14-timeline-focused.log#L46) |
| 47 | LP25-T04 failed placeholder unchanged without group members | pass | [원출력](o14-timeline-focused.log#L47) |
| 48 | D3B-03/04 UTC0와 same-file 다중 mapping 독립 ID | pass | [원출력](o14-timeline-focused.log#L48) |
| 49 | D3B-03 int64 최대 UTC ns 문자열 정밀도 | pass | [원출력](o14-timeline-focused.log#L49) |
| 50 | D3B-11 관련 없는 known4352 누적은 짧은 질의 허용 | pass | [원출력](o14-timeline-focused.log#L50) |
| 51 | D3B-11 실제 관련4352 상한 명시 실패 | pass | [원출력](o14-timeline-focused.log#L51) |
| 52 | D3B-02/11 관련 상한503 | pass | [원출력](o14-timeline-focused.log#L52) |
| 53 | D3B-10/11 unknown4354 count와 bounded 첫 페이지 | pass | [원출력](o14-timeline-focused.log#L53) |
| 54 | D3B-10 known/unplaced 독립 동일 offset 페이지 | pass | [원출력](o14-timeline-focused.log#L54) |
| 55 | LP25-T08 4352 unknown mappings become 17 files plus 2 invalid files | pass | [원출력](o14-timeline-focused.log#L55) |
| 56 | LP25-T02 file group stable opaque IDs null UTC and all member identities | pass | [원출력](o14-timeline-focused.log#L56) |
| 57 | LP25-T03 invalid fractional mapping provenance uncertainty and source PTS retained | pass | [원출력](o14-timeline-focused.log#L57) |
| 58 | LP25-T08 file-unit page boundaries exact and stable including empty last page | pass | [원출력](o14-timeline-focused.log#L58) |
| 59 | LP25-T08 known 4096 cap unchanged in file mode | pass | [원출력](o14-timeline-focused.log#L59) |
| 60 | D3B-11 offset+limit overflow 명시 실패 | pass | [원출력](o14-timeline-focused.log#L60) |
| 61 | D3B-11 전체 unknown deep-copy 없이35074 첫 페이지 허용 | pass | [원출력](o14-timeline-focused.log#L61) |
| 62 | D3B-11 deep offset64MiB workspace 초과는 결과 없이 명시 실패 | pass | [원출력](o14-timeline-focused.log#L62) |
| 63 | LP25-T03 nonadjacent unknown members preserve gap and outer file range | pass | [원출력](o14-timeline-focused.log#L63) |
| 64 | LP25-T03 null end PTS remains null and fixed writer reason is preserved | pass | [원출력](o14-timeline-focused.log#L64) |
| 65 | LP25-T04 mixed known rows exact and distinct files never coalesce | pass | [원출력](o14-timeline-focused.log#L65) |
| 66 | LP25-T03 group public whitelist excludes raw source store epoch and paths | pass | [원출력](o14-timeline-focused.log#L66) |
| 70 | LP25-T04 intent placeholder unchanged alongside file groups | pass | [원출력](o14-timeline-focused.log#L70) |
| 71 | LP25-T05 full two output file groups preserve request playback and members | pass | [원출력](o14-timeline-focused.log#L71) |
| 72 | LP25-T07 corrupt output remains grouped and not playable | pass | [원출력](o14-timeline-focused.log#L72) |
| 73 | LP25-T07 tombstone output preserves group provenance and cannot play | pass | [원출력](o14-timeline-focused.log#L73) |
| 74 | LP25-T07 reopen exact group IDs member provenance and deleted state | pass | [원출력](o14-timeline-focused.log#L74) |
| 78 | LP25-T04 intent placeholder unchanged alongside file groups | pass | [원출력](o14-timeline-focused.log#L78) |
| 79 | LP25-T05 partial two output file groups preserve request playback and members | pass | [원출력](o14-timeline-focused.log#L79) |
| 80 | LP25-T07 corrupt output remains grouped and not playable | pass | [원출력](o14-timeline-focused.log#L80) |
| 81 | LP25-T07 tombstone output preserves group provenance and cannot play | pass | [원출력](o14-timeline-focused.log#L81) |
| 82 | LP25-T07 reopen exact group IDs member provenance and deleted state | pass | [원출력](o14-timeline-focused.log#L82) |
| 83 | LP25-T08 file-unit accumulated workspace cap rejects without partial response | pass | [원출력](o14-timeline-focused.log#L83) |
