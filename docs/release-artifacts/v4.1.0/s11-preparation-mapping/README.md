# S11 준비 1번 — v4.1.0 테스트 매핑 감사

독자: 현재 버전 개발·최종 검증 담당자. 수명: S11 준비 기간의 기준 스냅샷.
정책 source-of-truth는 AGENTS.md, 실행 결과는 중앙 테스트 기록이다. 이 문서는 실행 증적이 아니다.

## 결론

기준 `v4.1.0 / 037d42ee`, 2026-09-14. **테스트가 모두 현재 계약을 검사하고 최종 묶음에 연결되었다고 판정할 수 없다.**
등록·코드 위치 매핑과 결함 분류를 작성했다. 미결박·충돌은 숨기지 않고 후속 준비 대상으로 남긴다.
과거 PASS를 폐기하거나 현재 PASS로 승격하지 않았다. S11 최종 검증과 실제 브라우저는 실행하지 않았다.

- [S00~S09 / ENV / IDMAP 매핑](s00-s09-mapping.md): inventory 표 283행, S05 자식 검사92개, 초기 assertion 위치 및 표 밖 정의.
- [S10 / 공개 소비 매핑](s10-mapping.md): 등록·실제 코드·oracle·직접 실행·최종 연결을 구분.
- [선행 준비 감사 및 개발 순서](../../../superpowers/plans/2026-09-02-v410-recording-foundation-implementation-plan.md): S11 준비 절.

숫자는 실행 PASS 수가 아니다. 초기 단계 ID 공백·prose 등록·S10 ID 충돌을 단일 총계로 억지 합산하지 않는다.
과거 canonical986 전체 회귀를 이번 정적 조사로 재검증했다고 주장하지 않는다.

## 확인된 준비 과제와 개발 순서

| 순서 | 분류 | 직접 근거 | 해야 할 일 / 완료 조건 |
| --- | --- | --- | --- |
| 1 보완 | 등록 공백·정의 충돌 | 상세 매핑의 초기 S01~04, prose 정의, S10 중복 문맥 | 기존 이력 보존, 문맥별 키와 exact oracle를 확정. 문자 ID 발견만으로 coverage 충족 금지 |
| 2 | 미연결·구형 통합 | recording_foundation_suite.mjs:35~38; verify_v410_recording_foundation.mjs:108,424,582 | 새 default/reference/job/복수 output 검사 및 최종 manifest 연결. 직접 runner 존재와 묶음 포함을 분리 |
| 3 | 구형 장시간 판정 | recording_journal_reader.mjs:4; recording_longrun_progress.mjs:45 | 현재 mutation/order/epoch/UTC mapping으로 전환. UTC 역행을 녹화 순서 오류로 간주하지 않음 |
| 4 | 인증 준비·상충 gate | verify_auth_workflow.sh:48,1331,1345; verify_v410_recording_timeline.sh:72; verify_script_inventory.mjs:185,189 | 실행별 임시값·비밀 비노출 주입. operator env 강제 문구를 요구하는 inventory 검사도 함께 수정. 기존 role/scope/암호이력 oracle 유지 |
| 5 | UI 준비 구형 seed | verify_v410_recording_ui_contract.mjs:686; verify_v410_recording_ui_auth_prep.test.mjs:94 | managed seed·문자열 시간·null·itemId·복수 출력과 exact UI action 연결. 브라우저 PASS는 별도 |
| 6 | 구형 제거 선수조건 | v1 fixture 추적8개, compatibility manifest golden4개 | 대체 검증 확보 후 정확 사용처/소유 확인. V1 명칭만으로 현행 consumer/job 계약 삭제 금지 |
| 7 | 최종 준비 종료 | 위 미결박·구형·미연결 해소 후 | 코드를 고정하고 유지/부분 무효/전체 무효 증거를 판단한 뒤 승인된 최종 검증 범위를 확정 |

소스 경로는 `scripts/internal/` 기준이다. 테스트 부재, ID 미등록, 실행 미연결, 구형 oracle, 의도된 중복 회귀는 서로 다른 결함이다.
현재 매핑의 미확정 oracle는 후속 수정의 선수조건이며 전체 coverage 감사 완료나 S11 준비 완료로 처리하지 않는다.

## 이번 실행 경계

| 영역 | 이번 상태 | 근거 |
| --- | --- | --- |
| 안정화 제품 테스트 | 미실행 | 1번 문서 매핑만 수행 |
| 30분 / 120분 | 미실행 | 최종 검증은 준비 이후 |
| 실제 UI | 제외·미실행 | 사용자 브라우저 제외 유지 |
| 문서 형식 | git diff --check 및 신규 문서 no-index diffcheck, 문서 링크 대상 존재 확인 | 테스트 PASS와 별개 |
| 커밋 / 푸시 / 삭제 | 미수행 | 이번 범위 아님 |

테스트 서버·계정·미디어·임시 실행 디렉터리 생성 없음. 정리 대상 없음.
문서 초안의 중복 JSON/코드 발췌는 축소했다. 이번 생성한 중복 JSON만 제거했으며 기존 테스트/과거 증적은 삭제하지 않았다.
token start/end/consumed: 실행별 집계 도구 미제공으로 미집계. elapsed: 정적 조사 도구별 소요만 존재하고 전체 작업 시간은 미집계.
