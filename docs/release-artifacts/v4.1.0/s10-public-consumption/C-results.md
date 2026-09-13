# 3D-3 C 개별 결과

독자는 실행 검토 담당자이며 이 파일은 역사적 실행 증적이다. 정책은 AGENTS, 중앙 기록은
release-test-records다. [C-report](C-report.md)의 네 실행 원출력116행을 아래 최종29행과 대조했다.
실제 명령은 모든 행 `node scripts/internal/recording_playback_status.test.mjs`, 최종exit0이다.
VM/DOM double 검사이며 실제 브라우저는 사용자 제외·미실행이다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| normal selected metadata updates visible support | 선택된 파일 metadata 안내와 src | pass | 최초/첫GREEN/추가RED/최종 모두 pass |
| I31-R01 failed timeline clears previous support | 조회 오류 뒤 src·지원 안내 제거 | pass | 네 실행 모두 pass |
| I31-R01 empty timeline clears previous support | 빈 목록 뒤 기존 재생 상태 제거 | pass | 네 실행 모두 pass |
| I31-R01 unplayable selection clears previous support | 재생 불가 선택 뒤 지원 안내 제거 | pass | 네 실행 모두 pass |
| I31-R02 late metadata cannot contaminate unselected state | 무선택 상태의 늦은 metadata 무시 | pass | 네 실행 모두 pass |
| unselected error preserves selection prompt | 무선택 error 안내 유지 | pass | 네 실행 모두 pass |
| selected media error shows failure notice | 선택된 파일 error 실패 안내 | pass | 네 실행 모두 pass |
| D3C-01 UTC zero is a date, not unknown | 문자열0의 실제 날짜 표시 | pass | 최초fail→수정pass |
| D3C-02 null times stay in separate unplaced list | null 별도 host·조회 귀속 미확인 안내 | pass | 최초fail→수정pass |
| D3C-03 number is not guessed as a date | 숫자형 DTO 날짜 추정 금지 | pass | 최초fail→수정pass |
| D3C-03 empty is not guessed as a date | 빈 날짜 미확인 | pass | 최초fail→수정pass |
| D3C-03 fraction is not guessed as a date | 비정수 문자열 미확인 | pass | 최초fail→수정pass |
| D3C-03 date-range is not guessed as a date | Date 범위 초과 미확인 | pass | 최초fail→수정pass |
| D3C-03 unsafe is not guessed as a date | safe integer 초과 미확인 | pass | 최초fail→수정pass |
| D3C-04 same file rows have independent selected item IDs | 같은 파일 두 항목 aria-pressed 독립 | pass | 최초fail→수정pass |
| D3C-05 partial overlap preserves original | 원본 유지·선택 시 원본 ns 중첩 안내 | pass | 최초fail→첫GREENpass; 안내 추가 assertion REDfail→최종pass |
| D3C-06 off-page event still hides fully covered original | 현재 page 이벤트 없어도 server hide 소비 | pass | 최초fail→수정pass |
| D3C-07 original view restores hidden rows | 원본보기 checkbox 복원·재숨김 | pass | 최초fail→수정pass |
| D3C-08 next page uses independent unknown total | unplaced101 기준 offset100→0 | pass | 최초fail→수정pass |
| D3C-09 request media axis is shown without date conversion | 원본 미디어7000~8500 ms 안내 | pass | 최초fail→수정pass |
| D3C-10 estimated UTC preserves uncertainty label | estimated·1000000ns 표시 | pass | 최초fail→수정pass |
| D3C-11 selection never seeks by UTC and ended never auto-advances | currentTime 대입0·ended 선택 유지 | pass | 최초 파일 시작 안내fail→수정pass |
| D3C-12 unsupported type is only a warning | canPlayType 부재 경고·성공 아님 | pass | 네 실행 모두 pass |
| D3C-13 job completion and partial deleted output remain separate | 작업완료/일부/삭제됨 분리·src 없음 | pass | 최초fail→수정pass |
| D3C-14 late response cannot replace newer selection | 요청 순서 역전에도 새 응답 유지 | pass | 네 실행 모두 pass |
| D3C-15 unknown-only page remains selectable | known0·unknown101에서 선택·다음 활성 | pass | 최초fail→수정pass |
| D3C-16 invalid total -1 cannot enable paging | 음수 total 응답 오류·next 비활성 | pass | 최초fail→수정pass |
| D3C-16 invalid total 9007199254740992 cannot enable paging | unsafe total 응답 오류·next 비활성 | pass | 최초fail→수정pass |
| D3C-17 unknown debug fields are not rendered | source/path/raw 추가필드 DOM 비노출 | pass | 네 실행 모두 pass |

## 별도 실행 상태

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| D08 실제 브라우저 | 영상 디코딩/controls/시각 품질 | 사용자 제외·미실행 | VM29개로 실제 UI PASS를 대신하지 않음 |
| 30분/120분 | 장시간 최종 묶음 | 이번 실행 미승인·미실행 | 위 단기 결과를 장시간 증거로 확대하지 않음 |
