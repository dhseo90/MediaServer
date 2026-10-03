# Owner signoff source 결박 독립 재검토

검토자: gpt-6-astra/xhigh independent semantic_review. 시각: 2026-10-03T03:34:04.186Z. 구현·후보 생성 미참여, 하위 위임 없음.

**보완된 SAFE-214 및 OPS-181 두 행을 승인한다.** 984행은 기존 strict carry-forward이며 이번 독립 결정에 포함하지 않았다. 판정은 아래 동결 소스에 대한 trust migration으로 한정한다.

- HEAD: 8a422a26d5c55f5a5c69856a7471166a24de943c
- tree: f4f029d8f243e6e7bd4cb3dc1d4c27d31b695e15
- candidate digest: 45533d2f16d201ee67fd4779cd3268ed506e90dd4deb226e11a0655a89ed7996
- review-package SHA-256: 3244678ee08ca937ac99c882814d31bc6e7cdfe8db8663cb400e85b24acb359e
- tracked diff/reviewed.patch SHA-256: 95f12f8c820365f97eed8c0b582ca75b0b8583491225af3ab2c524a12a229dd8
- 변경 파일: scripts/internal/verify_v390_deferred_product_owner_signoff.mjs

## 최초 거부와 보완

초기 candidate d9abf5cfebdb4c837c4d50e2c79592f3ecd5ef19c1458070ec97a89c388a1fc2, tree 6fe901c948b5e367057002e7cea11789a5c4775d는 승인하지 않았다. 원본은 rejected-review-package.json 및 rejected-reviewed.patch에 보존되어 있다. 초기 helper는 validateReview4ApprovalEnvelope 후 owner.trackedBlobSha256를 승인된 현재 파일 hash처럼 사용했다. 하지만 feature_semantic_review4_trust_lib.mjs:344~353은 그 필드를 hard digest에서 제거하며 envelope는 현재 소스 body를 읽지 않는다. 따라서 runtime body를 변경한 다음 해당 blob 필드만 갱신하면 기존 승인을 유지한 채 whole-file 비교가 통과할 수 있었다. 초기 거부는 현재 승인으로 삭제·소급 변경하지 않는다.

보완된 667~668행은 validateReview4TrustBindings(rootDir,item,parseVerifiedReview4Dispatch(rootDir))를 호출한다. 사용 함수의 288~342행을 직접 읽어 현재 파일 body·verifier 파일·현재 server dispatch와 연결된 harness를 재계산하고 승인된 hard binding과 비교하며 mismatch를 반환함을 확인했다. helper는 errors가 있으면 hash를 반환하기 전에 실패한다. OPS-174/evidenceToken/action/owner 경로 assertion도 추가되어 소비할 기능 연결을 특정한다. 이로써 최초 반례를 막는 승인된 body/dispatch와 실제 source의 결박이 추가됐다.

## 행별 판단

- SAFE-214: 역사 fixture/source SHA는 유지하고 runtime 파일의 현재 연결만 이전 producer 승인에서 가져온다. 실제 restore route runtime.cpp:3136~3146의 Ops guard/JSON 호출과 foundation.cpp:5852~5871의 read-only/no-restore/no-write 경계는 유지된다. validateDecisions의 exact five, not-executed, false-PASS 및 미승인 future scheduling 차단은 동일 본문이다.
- OPS-181: accountableSubjectRef→repo-owner-v1→accountableOwnerDecisionBound 흐름과 header/CODEOWNERS·capability·dependency 검사는 그대로다. 새 코드가 역사 owner 결정을 재작성하거나 새로운 owner 승인/field/UI/장시간/release PASS를 만들지 않는다. 전체 envelope 확인 후 실제 trust를 재확인하는 소비 방식이 기존 source evidence 계약에 맞는다.

## 근거와 실행 경계

read-only Git/파일 조회로 diff·실제 소스·순수 trust 계산 코드·fixture 연결을 읽었다. 입력 바이트 및 JSON digest/ID/순서 대조로 현재 패키지와 동결 파일이 일치하고 두 행의 trust 외 hard fields가 그대로이며 나머지 984행은 strict equality임을 확인했다. 소스 비교와 판정 JSON 직렬화는 검사 명령 실행이 아니다.

메인이 제공한 check-owner-tamper.mjs 및 owner-tamper.log를 읽었다. 로그는 baseline PASS, blob-only envelope accepted-as-expected, currentBodyTamper REJECTED(owner/dispatch/action drift 3건), owned negative fixture cleanup PASS를 기록한다. 이는 메인 실행 증거이며 독립 검토자가 실행한 검사로 보고하지 않는다. main이 알린 source-region-contract 8 PASS도 이번 검토자의 실행 결과가 아니다.

저장소 수정·테스트·빌드·실제 브라우저·장시간 실행·stage/commit을 하지 않았다. 독립 검토자가 작성한 파일은 independent-decisions.json과 review-notes.md 두 개뿐이다. 제품/실제 UI/장시간/최종 릴리즈 PASS는 승인하지 않는다.
