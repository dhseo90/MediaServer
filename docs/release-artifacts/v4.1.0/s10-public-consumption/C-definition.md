# 3D-3 C 화면 소비 검사 사전 정의

독자는 이번 구현·검토 담당자다. lifecycle은 이번 실행의 보존 기록이며 정책은 AGENTS,
현재 계약은 3D-1 설계와 구현계획, 실행 결과 source-of-truth는 중앙 테스트 기록이다.
이 문서는 실행 전 정의다. 실제 브라우저 검증은 사용자 제외이며 VM/DOM double 결과로 D08을 통과시키지 않는다.

명령: `node scripts/internal/recording_playback_status.test.mjs`. 실제 제품 녹화 스크립트 블록을
VM에서 실행하고 HTTP 응답·DOM 경계만 격리한다. 제품 동작 변경 없이 새 DTO fixture·검사부터 추가한다.
첫 실행 예상 RED는 기존 script의 문자열 날짜/미확인 목록/itemId/페이지 독립 우선 처리 부재다.
기존 상태 초기화 7개 회귀는 유지한다. 준비 오류·다른 실제 회귀를 예상 RED로 이름 바꾸지 않는다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| I31-R01/R02 및 기존 7개 | 지원 문구 초기화·늦은 이벤트 | 정상 metadata, 조회 실패, 빈 목록, 불가 선택, 늦은 metadata, 무선택 error, 선택 error를 실제 handler로 검사 | v4.1.0 기존 |
| D3C-01 | UTC 0 문자열 | 문자열 `0`을 유효 날짜로 표시하고 미확인과 구별 | v4.1.0 |
| D3C-02 | null 시간 별도 목록 | unplaced 시간에1970을 만들지 않고 별도 host·귀속 미확인 안내 | v4.1.0 |
| D3C-03 | 잘못된 날짜 경계 | 숫자/빈 문자열/비정수/범위 초과/정밀도 초과 각각 날짜 추정 없이 미확인 표시 | v4.1.0 |
| D3C-04 | 항목 독립 선택 | 같은 segmentId의 두 itemId 중 선택·aria-pressed를 독립 유지 | v4.1.0 |
| D3C-05 | 부분 중첩 원본 보존 | 같은 페이지 eventId가 있어도 hideByEvent=false이면 원본 유지. 선택 시 확인된 중첩의 원본 미디어 ns 범위 안내(첫 GREEN 뒤 추가 RED로 검증) | v4.1.0 |
| D3C-06 | 페이지 바깥 이벤트 우선 | hideByEvent=true 원본은 이벤트가 페이지에 없어도 기본 숨김 | v4.1.0 |
| D3C-07 | 원본 보기 | checkbox 변경으로 완전히 겹친 원본을 복원·재숨김 | v4.1.0 |
| D3C-08 | 독립 페이지 | known/unplaced total 중 큰 값으로 next/previous와offset100 이동 | v4.1.0 |
| D3C-09 | 요청 축 구별 | media-pts-ms 요청을 날짜로 바꾸지 않고축·정수 문자열 유지 | v4.1.0 |
| D3C-10 | 추정 시각 안내 | source-utc-mapping의 estimated/uncertaintyNs를 표시 | v4.1.0 |
| D3C-11 | 파일 시작 재생 | 새 선택에서 UTC/PTS 차이 currentTime 대입 없음·ended 자동 다음 영상 없음 | v4.1.0 |
| D3C-12 | 미지원 형식 | canPlayType 빈 응답은 경고이며 성공 문구가 아님 | v4.1.0 |
| D3C-13 | 상태 분리 | complete job/partial request/deleted catalog/playable false 구별 | v4.1.0 |
| D3C-14 | 늦은 조회 응답 | 새 조회 뒤 이전 비동기 응답은 목록·선택을 덮지 않음 | v4.1.0 |
| D3C-15 | known 빈·unknown 존재 | 빈 known에도 unplaced 선택/페이지 유지 | v4.1.0 |
| D3C-16 | 잘못된 응답 수량 | 음수/unsafe total을 정상 목록으로 사용하거나 다음 페이지 진행하지 않음 | v4.1.0 |
| D3C-17 | 공개 정보 제한 | 추가 source URL/path/raw JSON 필드가 있어도 DOM 문자열로 복사하지 않음 | v4.1.0 |

임시 산출물은 없음(VM 메모리 fixture). stdout은 C 실행 로그에 보존한다. token start/end/consumed는
도구 집계 부재로 미집계이며 elapsed는 실행 summary, source는 현재 제품 script/test fingerprint로 남긴다.
