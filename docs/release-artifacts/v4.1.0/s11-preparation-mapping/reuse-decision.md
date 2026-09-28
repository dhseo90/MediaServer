# S11 준비 2번 선행 — 기존 검증 재사용 결정

독자: v4.1.0 통합 검증 준비 개발자. 수명: 준비 구현 종료까지. 정책은 AGENTS.md, 계약은 S10 설계, 과거 실행 결과는 중앙 기록이 기준이다. 이 문서는 선택·합격 기준이며 이번 실행 PASS가 아니다.

## 결정

기존 managed seed/HTTP/default composition을 재사용한다. 새 JS 원장 parser/state machine과 항상 false인 manifest는 만들지 않는다. C++ adapter도 지금 선정하지 않는다. 아래 기존 경로로 관측할 수 없는 항목이 확정될 때만 최소 검증 전용 보완을 설계한다. 제품 API/schema/time/ID/auth 계약은 변경하지 않는다.

## 재사용 범위와 독립 기대값

| 대상 | 재사용 소스 / 직접 명령(이번 미실행) | 합격 기준·독립 기대값 | 한계 / 연결 수정 |
| --- | --- | --- | --- |
| managed 입력 fixture | recording_http_seed.cpp / bash scripts/internal/verify_recording_http_seed.sh | H264 입력, 숫자 채널1, 요구 PTS7000~8500ms, 출력 정확2개. 반환 manifest의 임의 개수로 기대 개수를 계산하지 않음 | encoded 관측 기반 fixture이며 실제 decoder 분석 통합을 대체하지 않음. root/manifest/transport 인자는 상위 HTTP runner가 소유 생성 |
| HTTP/API | node scripts/internal/verify_v410_recording_ui_contract.mjs --http-api | 기존 literal total5/event2/unplaced1, UTC 문자열/null, 전체/부분 중첩 원본 구분, invalid400, 파일GET200 및 독립 파일 bytes/hash, Range206/416·HEAD | 이미 managed seed 사용. 새 integration 진입점에 연결하되 구형 read-model 기본 wrapper를 무조건 선행하지 않음 |
| HTTP 인증 | 위 Node --http-auth | admin/operator/viewer/no-source/no-ops의 명시 status/채널 행렬, 미인증401, 다른채널403. 각 출력 파일에 기존 범위 검사 유지 | 메모리 임시값 생성 경로 재사용. 상위 shell/common auth의 env 요구는 기존4번 선행에서 정리 |
| 전송 수명 | 위 Node --http-lifecycle | 정확 생성ID의 hold1→정상/연결해제 hold0, valid MP4 64MiB 전송 byte/hash, SIGTERM 종료/port/temp 반환 | free atom 전송 fixture이며 writer64MiB 생성 증거 아님. 실제 UI/2시간 안정성 증거 아님 |
| 종료 실패 전파 | bash scripts/internal/verify_v410_recording_timeline.sh --harness-self-test | H01 최초 정리 오류 보존·나머지 정리, H02/H03 종료/port 실패 판정과 음성 경계 | 도우미 자체검사. 실제 앱 검증 PASS와 별도 결과 |
| 기본 서버 구성 | bash scripts/internal/verify_recording_default_composition.sh | D02-01/02 root ID 재사용/분리·동시 lease 거부, D02-06 off/on, D02-07 producer 앞 복구, D02-08 owner0/Stop 재검사, D02-10 literal 예산16000ms/500ms/33회 | runtime archive와 실제 제품 link 사용. build 신선도 선수조건. HTTP 프로세스 재시작 검사는 별도 |
| 실제 분석→이벤트→출력 | bash scripts/internal/verify_recording_derived_event_integration.sh | 실제 decoder/EventRecord와 reference/job·출력2개 상관, 접수 후 실패/취소/재시작·보호 검증 | 직접 runner의 기존 exact case 재사용. HTTP seed의 합성 관측과 구분 |
| 내부 job/보존/매체 | derived_jobs, derived_job_service, retention_v2, public_media 기존 focused runner | accepted만/Ready/Committed는 제공 안 됨, Complete·검증된 출력만 제공. 원본 삭제와 출력 삭제를 구분, 손상·pin·hold·quota 보호 | 기존 case별 매핑에서 선택하며 전체 runner를 무조건 중복 실행하지 않음 |
| JS UI 소비 | node scripts/internal/recording_playback_status.test.mjs | 문자열/null·파일 시작 안내·선택 상태 처리의 기존 literal 기대 | VM 자체검사만 재사용. 실제 브라우저 PASS 아님 |

소스 파일은 scripts/internal/ 기준이다. 정확 oracle는 D-definition.md 및 s10-mapping.md의 파일·행으로 연결한다. 명령 표는 실행 승인이나 실제 결과가 아니다.

## 새로 보완해야 하는 검사와 구현

| 과제 | 필요한 이유 | 합격 기준 |
| --- | --- | --- |
| 현행 integration orchestration | 기존 suite는 legacy runtime/app-auth 두 child뿐 | 선택된 현행 child의 exit·정확 summary·cleanup·실패뒤 notRun을 판정. legacy integrationExecutionPass의 과거 의미 유지, 전체 S11 PASS로 승격 금지 |
| 실제 앱 producer 이벤트 연결 | HTTP fixture와 decoder focused의 PASS를 서로 이어붙여 단일 실제 앱 흐름 PASS로 만들 수 없음 | 실제 source/분석 이벤트 ID→현재 reference/job→모든 output의 HTTP 관측을 동일 실행에서 상관. fallback을 첫파일로 변환하거나 요청PTS를 UTC조회값으로 쓰지 않음 |
| 실제 서버 두 번째 기동 | D3D-10은 seed 종료 뒤 제품 첫 기동 | 첫 제품 프로세스 정상 종료 후 같은 격리 archive로 두 번째 제품 기동, 기존 ID/상태/파일 보존과 새 생산을 구별 |
| 미확정/부분/손상·삭제 전이 | 준비 fixture의 일부상태만으로 모든 통합 오류분기 충족 불가 | accepted-only 비재생, partial/full 구분, Complete 출력 손상/삭제는 제공 거부, 원본 삭제 뒤 정상출력은 보존; 기존 focused와 중복/누락 대조 |
| spec 복합 기준 잔여 | 1번 보완의 기존/공유/누락 분류 | 실제 누락 판정만 새 검사로 개발. 모델/부분검사/과거 실행을 통합 완료로 대체하지 않음 |

## 검증 독립성과 안전 경계

- Catalog 결과로 예상 Catalog 결과를 만들지 않는다. fixture 입력과 literal 개수/범위/권한을 먼저 고정하고, 실제 HTTP bytes를 별도로 대조한다.
- 파일 hash 일치만으로 영상 의미/decoder provenance를 증명하지 않는다. 기존 실제 decoder·remux 검사와 정확히 구분한다.
- Catalog Open은 lease/원장/SQLite/checkpoint/cleanup 복구를 수행할 수 있다. 실행 중 저장소를 별도 Catalog로 열지 않는다.
- 내부 조회 adapter가 정말 필요하면 소유 확인된 종료 archive의 복제본만 대상으로 검토한다. 복구 전후 bytes/hash와 원본 불변을 보존하며 변형된 복제본 결과를 복구 전 상태라고 주장하지 않는다.
- uint64/ns/order는 문자열 등 정밀도 보존 경계로 전달. 새 JSON.parse 기반 원장 엔진을 구현하지 않는다.

## 후속 순서와 검증 승인 상태

1. 기존4번 인증 선수조건 보완 → 해당 단기 자체검사.
2. 기존2번 현행 통합 연결 및 위 실제 앱/재시작 차이 보완 → 관련 단기 검증.
3. 기존3번 observer/longrun 전환 → 결정적 자체검사. 실제120분 아님.
4. 기존5번 UI seed 준비 → 브라우저는 사용자 제외 유지.
5. 기존6번 대체 검증 확인 후 구형 정리 → 기존7번 코드/증거 고정 보고.

| 테스트 카테고리 | 판정 | 직접 근거 | 실행 승인 상태 |
| --- | --- | --- | --- |
| 문서 형식/링크 | 진행 대상 | 이번 문서 수정 | 승인 범위 |
| 제품 안정화 | 미진행 | 이번 요청은 매핑 보완/재사용 범위 확정 | 이번 실행하지 않음 |
| 30분/120분 | 미진행 | 최종 검증은 준비 종료 후 | 이번 실행하지 않음 |
| 실제 UI | 미진행 | 사용자 명시 제외 | 이번 실행하지 않음 |

2번 선행 완료는 재사용/신규/조건부/제외와 기대값 선택까지다. 2번 구현 완료·S11 준비 완료·실행 PASS를 의미하지 않는다.

## 소스 근거와 결과 구분

- [기존 D 실행 전 정의](../s10-public-consumption/D-definition.md): API/권한/전송 exact 경계.
- [기존 D 보고](../s10-public-consumption/D-report.md): 과거 실행 범위와 실제 두 번째 기동 미실행.
- [매핑 감사](README.md): 이번 선택의 출발점. 기존 PASS를 새 실행 PASS로 복제하지 않는다.

이번 변경은 문서뿐이며 소유 테스트 서버·미디어·임시계정 생성 없음. cleanup 대상 없음. token start/end/consumed 및 전체 elapsed는 집계 도구 부재로 미집계.
문서 검사 이력: 최초 staged diffcheck에서 EOF 빈 줄1건(exit2)을 발견해 제거했다. 이후 동일 검사로 재확인하며 제품 테스트 실패와 구분한다.
