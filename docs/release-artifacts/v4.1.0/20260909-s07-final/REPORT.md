# S07 독립 source-flow 재결속 검토

독자는 S07 통합 담당자다. 이 문서는 이번 immutable candidate에 한정된 독립 검토 증적이며, 정책 source-of-truth는 AGENTS.md다. README 색인에 추가하지 않는다.

검토자: `codex-independent-review-agent-/root/s07_independent_review`.
후보 생성에 참여하지 않은 새 서브에이전트이며 하위 에이전트를 생성하지 않았다. Codex Astra medium 지정 유지. 영향도 2, 불확실성 2, 검증 난이도 2, 변경 범위 0, 총 6점. 제품 변경이나 최종 통합 판정은 범위 밖이다.

판정: 299개 exact ID의 기존 source-flow trust 재결속 승인. 687개는 정식 migration delta에서 strict equivalence carry-forward다. 이 결과는 UI·30분·120분·신규 S07 제품 기능 또는 릴리즈 PASS가 아니다.

## 직접 확인

- immutable 후보 SHA-256 `c34222c100f0a7b9533dd265b8b63be3e110c0cc5e41a81d7c23dafffde161ae`, candidate digest `46b99819c163277cf8421c058880d20ca4d32b8d2c4ba3cdbcff98099d1bdf59`.
- 이전 승인 source commit `37e11e1a8a9b3201969e6e9fe287c8497254f243`부터 현재 소스까지 실제 diff를 확인했다. 299행의 feature contract, verifier/dispatch, action/state/readback 역할과 관측 assertion을 대조했다.
- 297행은 hard semantic 필드 중 trust/digest 변경이다. UI-005·UI-018은 411행의 실제 thread capture anchor로 바뀌었다. 410행 서비스 포인터 선언을 thread로 승인하지 않았다.
- 변경 enclosing body는 HTTP Start 및 그 alias, ProductUiCss다. recording prefix 제한과 기존 logout/404/권한/기능 분기의 유지, CSS selector 범위를 직접 검토했다. 모든 기존 함수를 새로 전면 감사했다는 의미는 아니다.
- 현재 299행의 trust, typed edge, 6개 exact line anchor 계산 대조 오류 0. 모든 행의 계약·role locator·body 변경 근거는 review-package.json rowEvidence에, 개별 판정 이유는 independent-decisions.json에 보존한다.

## 실행과 결과

| 제목 | 수행내용 | 결과 |
| --- | --- | --- |
| 정식 migration delta | `node scripts/internal/verify_v390_review4_semantic_migration_contract.mjs --baseline test/fixtures/v390_review4_feature_semantic_source_audit.json --fresh .superpowers/sdd/2026-09-02-v410-recording-foundation-implementation-plan/s07-trust-immutable-final-v2.json --report .superpowers/s07-independent-review/migration-report.json --write-evidence .superpowers/s07-independent-review/migration-evidence.json`; 986행, carry 687, independent 299, failures 0 | exit 0 |
| 현재 소스 계산 대조 | `validateReview4TrustBindings`, `validateReview4SemanticProof`와 모든 role의 exact line anchor를 299행에 적용한 읽기 전용 Node 명령 | exit 0, 오류 0 |
| snapshot 최초 시도 | 별도 GIT_INDEX_FILE로 read-tree/add/write-tree. Git object DB 쓰기 sandbox 권한 거부 | exit 1. 제품 실패 아님. 임시 index 삭제 |
| snapshot 권한 승격 | 같은 명령에 정직한 require_escalated 요청, 승인 후 tree object 생성 | exit 0. 실제 index/commit/branch 변경 없음. 임시 index 삭제 |
| artifact readback | 299 ID/order, feature contract, source-flow, justification hash, package hash, prior source-flow, verifier/dispatch, 현재 diff hash 대조 | exit 0, 오류 0 |
| whitespace | `git diff --check` | exit 0 |

제품 테스트·장시간·UI·verify-predev는 미실행이다. 토큰 start/end/consumed 및 elapsed는 미집계다. 서브에이전트 자동 사용량 집계가 제공되지 않으며 추정치를 실제값으로 기록하지 않는다.

## 결속과 인계

- current HEAD: `db308d4dc393d820057e22b1b587f70ec6535073`
- staged equivalent tree: `519e395c07576431f633b779deb5bf176bff217f`
- tracked worktree diff SHA-256: `488700cf5f93e661daef29593d5c1ac3d2b91fa13ac2bcc001607ad8e0fba204`
- review-package.json SHA-256: `e32d79e1949fefbe7e699079e2835ab11dd00e3018814c5e2b791bbafffb3373`
- independent-decisions.json SHA-256: `bb5dbc5046e7d075f901cdb2e2f68eab73a0c1b12b004589017f1cd3e90ce3a6`
- migration-evidence.json SHA-256: `6957b42c22324a4f062ab2d381418958c0ccfa6b6a0dfe3afff83e23fb042ac9`

추적 파일이 바뀌면 current tree/diff binding 재확인이 필요하다. 검토자는 원장·proof·manifest·제품 코드 및 추적 파일을 수정하지 않았다. 후보 재생성도 하지 않았다. 원자적 원장 적용과 최종 검증은 메인 담당 범위다.

## cleanup

| 경로 | 종류 | 삭제 전 크기 | 조치 | 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| 각 s07-independent-snapshot-* 임시 디렉터리 | 임시 Git index | 미집계 | 명령 finally에서 삭제 | 두 시도 모두 삭제 | read-tree/add/write-tree 명령의 finally |
| format-reviewed-decisions.mjs | 판정 직렬화용 임시 helper | 4 KiB 할당 | 삭제 | 삭제 완료 | apply_patch |
| review-package.json | 독립 검토 원본 근거 | 약 1.1 MiB | 인계용 보존 | 보존 | source/contract/locator만 포함, secret/raw media 없음 |
| independent-decisions.json | 독립 판정 원본 | 약 540 KiB | 인계용 보존 | 보존 | 299행 reviewer 판정과 결속 |
| migration-evidence.json 및 migration-report.json | 정식 delta 인계 입력/출력 | 약 364/500 KiB | 메인 원장 적용까지 보존 | 보존 | 메인이 적용 뒤 최소 근거 이관·cleanup 판단 |

커밋·푸시 수행 없음. 푸시 가능: 아니오. 추적 변경과 원장 적용·최종 통합 확인이 남아 있다.

## 2026-09-09 snapshot 결속 정정

위 최초 tree/hash는 역사 기록이며 최종 적용용 값이 아니다. `.superpowers` 전체가 ignored라는 안내를 그대로 적용한 것이 잘못이었다. 실제로 `.superpowers/sdd`만 ignored이고 검토 디렉터리는 untracked였다. 메인 producer 첫 시도는 검토 helper 삭제와 겹친 `git add -A` stat 오류로 exit 1이었으며 원장은 변경되지 않았다고 메인이 보고했다.

독립 검토자가 직접 재확인한 결과, 원본 package/decisions/candidate hash는 이전 전달값과 같고 현재 tracked diff hash도 같으며 untracked 파일은 0개다. 이전 snapshot과 새 snapshot의 직접 diff는 `.superpowers/s07-final-verification.mjs`, `.superpowers/s07-independent-review/migration-evidence.json`, `migration-report.json` 세 검토용 파일의 제거뿐이다. 제품·추적 변경이나 판정 scope/body 변경은 없다.

전체 검토 artifact는 메인이 `/private/tmp/media-server-s07-final-LxmnlL/independent-review/`로 이동했다. 독립 검토자는 저장소 밖 임시 index로 권한 승격을 정직하게 요청하고 승인 후 snapshot 생성 exit 0을 확인했다. 임시 index는 finally에서 삭제했다. 이후 package의 tree binding, decisions의 tree binding과 package path/hash만 변경했다. 299개 결정·개별 justification·근거·계약·후보는 그대로다.

최종 동결 값:

- snapshot tree: `1d0f8defe4833b28fdbfda3327f4bc60292984d1`
- tracked diff: `488700cf5f93e661daef29593d5c1ac3d2b91fa13ac2bcc001607ad8e0fba204`
- review-package.json: `d74119bbac434a10f6dfe6541acc396cfc27866eb2308d68053966f2d014ec70`
- independent-decisions.json: `591ad001d3440fefcd810a74ad2aadf4a190a1393b58db4f62d85bfae8cdd8e6`

이 임시 위치는 producer 인계용이며 최종 저장소 evidence가 아니다. 메인이 적용 후 필요한 값과 원본을 저장소 보존 위치로 이관하고 임시 파일을 정리해야 한다. 독립 검토자는 이 보고와 최종 readback 후 artifact를 더 변경하거나 삭제하지 않는다.
