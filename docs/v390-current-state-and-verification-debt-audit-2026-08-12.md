# v3.9.0 현재 상태 및 검증 부채 감사

> **역사 기록 / 현재 판정으로 대체됨 (2026-08-13):** 이 감사의 수치와 결론은 `dc996dd4` 시점에 한정됩니다.
> 최신 actual source `c6b3d20a`의 `./test_release.sh`는 30분, exact UI `424/424`, Policy v4
> `424/424`, 120분, cleanup과 final integrity를 모두 PASS했습니다. 검증 부채에 대한 역사 분석은
> 유지하지만 현재 릴리즈 상태는 [release-test-records.md](release-test-records.md)를 따릅니다.

작성일: 2026-08-12
대상 저장소: `/Users/dhseo/Workspace/mediaServer`
대상 작업: `019f4905-f132-7202-bb94-685ff85d92da`
작성 목적: v3.9.0 작업에서 누적된 제품 변경, 검증 코드, 생성 evidence 및 현재 릴리즈 실패 상태를 사실과 추정으로 분리해 기록한다.

## 1. 결론

v3.9.0은 현재 release-ready가 아니다. 최신 verification branch의 `./test_ui.sh`는 브라우저를 시작하기 전 `ui-source-contract`에서 실패했으며 canonical 424건은 `0 attempted / 424 not-run`이다.

현재 판단 기준은 `docs/v390-full-status-failure-and-handoff-2026-08-12.md`의 1.1~1.3절에 고정했다. 기준은 `AGENTS.md`의 네 테스트 영역, 30분/UI 필수 blocker, Policy v4 actual 조건과 현재 clean-clone Actual evidence이며 Static/replay/semantic PASS는 보조 evidence로만 사용한다.

지정 작업 시작 이후 변경 규모는 일반적인 릴리즈 안정화 범위를 크게 초과한다. 제품 코드와 검증 체계가 동시에 대규모로 변경됐고, 검증 체계는 Static/replay에서는 PASS하지만 실제 릴리즈 명령에서는 실패한다. 따라서 현재 Static PASS, replay PASS 및 semantic evidence PASS는 릴리즈 완료 증거로 사용할 수 없다.

모든 변경을 임시 코드 또는 폐기 대상으로 단정할 근거는 없다. 그러나 검증 계층에는 날짜형 RED/census fixture, 과거 실행 projection, self-referential contract와 대규모 생성 evidence가 누적됐다. 이 계층은 별도의 keep/drop 감사 없이 제품 브랜치에 병합하거나 릴리즈 판정 기준으로 사용하면 안 된다.

## 2. 감사 범위와 기준점

### 2.1 전체 작업 범위

지정 작업에서 확인된 첫 연속 구현 commit은 `7e899af9`다. 전체 누적 변경은 그 parent인 아래 commit을 기준으로 계산했다.

- 기준 commit: `31e20e85b61cefdd7fa97bac97968351cadb27fd`
- 현재 verification commit: `dc996dd4efef52c91fed517e0e6728bb60314cc5`
- 비교 범위: `31e20e85..dc996dd4`

이 기준은 지정 작업에서 시작된 변경의 Git 범위를 측정하기 위한 것이다. 각 commit의 작성 주체나 모든 변경의 필요성까지 자동으로 판정하는 기준은 아니다.

### 2.2 현재 브랜치

- 제품 브랜치: `v3.9.0` at `327afe0d4b3282400f1925252c59a53b87827224`
- verification 브랜치: `v3.9.0-verification-rebase` at `dc996dd4efef52c91fed517e0e6728bb60314cc5`
- verification branch local/origin: 동일
- 감사 시점 worktree: clean
- `v3.9.0-rc-verified`: 생성되지 않음

## 3. 전체 변경 규모

`31e20e85..dc996dd4`의 Git 직접 집계다.

| 항목 | 값 |
| --- | ---: |
| Commit | 240 |
| 변경 파일 | 1,007 |
| 추가 | 1,567,369 lines |
| 삭제 | 44,457 lines |
| 추가 파일 | 611 |
| 수정 파일 | 383 |
| 삭제 파일 | 7 |
| rename | 6 |

영역별 집계:

| 영역 | 파일 | 추가 | 삭제 | 순증가 |
| --- | ---: | ---: | ---: | ---: |
| 제품 코드 `src/**`, `include/**` | 147 | 57,659 | 41,456 | 16,203 |
| Script, runner, verifier, dispatcher | 424 | 132,778 | 2,465 | 130,313 |
| Test 및 fixture | 67 | 1,299,237 | 21 | 1,299,216 |
| 문서 | 362 | 77,601 | 480 | 77,121 |
| Build config | 2 | 74 | 32 | 42 |
| 기타 | 5 | 20 | 3 | 17 |

### 해석

- 전체 추가량의 약 83%가 test/fixture 영역이다.
- 제품 코드는 147개 파일에서 99,115줄의 add/delete churn이 발생했다.
- runner/verifier 영역은 순증가 13만 줄을 넘는다.
- 이 규모는 단순한 릴리즈 버그 수정이 아니라 제품 구조와 검증 구조의 동시 재작성에 가깝다.

## 4. 최신 verification branch만의 추가 규모

제품 브랜치 `327afe0d` 이후 verification branch에 추가된 4개 commit:

1. `a2cbb2e6` `fix: rebase v3.9.0 UI verification lifecycle`
2. `3d5a701a` `fix: make v3.9.0 verification checkout-local`
3. `46cbb839` `fix: make v3.9.0 diagnostic replay checkout-local`
4. `dc996dd4` `fix(v3.9.0): rebase request lifecycle ownership`

`327afe0d..dc996dd4` 집계:

| 영역 | 파일 | 추가 | 삭제 |
| --- | ---: | ---: | ---: |
| Runner/runtime | 14 | 5,234 | 252 |
| Verifier | 27 | 6,290 | 398 |
| Dispatcher | 1 | 22 | 0 |
| Fixture/evidence | 11 | 107,995 | 16,318 |
| 문서 | 6 | 1,046 | 3 |
| 합계 | 59 | 120,587 | 16,971 |

따라서 과거 보고의 "변경 11개"는 마지막 commit 하나의 범위였으며 verification branch 전체 범위가 아니다.

과거 보고의 "기준 commit 대비 `src/**` diff 0"은 `327afe0d..dc996dd4`에 한해서는 사실이다. 그러나 지정 작업 전체 범위 `31e20e85..dc996dd4`에서는 제품 코드 147개 파일이 변경됐다. 전체 상황을 설명하는 표현으로는 불충분했다.

## 5. 임시성 또는 폐기 가능성이 높은 검증 자산

아래 항목은 제품 기능 구현이 아니라 특정 실패 재현, 과거 Actual projection 또는 작업 시점 기록을 위해 추가된 자산이다. 바로 삭제할 수 있다는 뜻은 아니며, 유지 근거를 별도 입증해야 한다.

### 5.1 대형 tracked replay projection

- 파일: `test/fixtures/v390_ui_diagnostic_replay_tracked_projection.json`
- 크기: 90,856 lines
- 용도: ignored local Actual artifact를 clean checkout에서도 replay하기 위한 tracked projection
- 위험:
  - 과거 실행 결과를 현재 검증 입력으로 사용한다.
  - 현재 브라우저 동작보다 stored projection과 verifier의 내부 일관성을 검증할 가능성이 크다.
  - 한 파일이 verification branch 전체 추가량의 약 75%를 차지한다.

### 5.2 날짜형 RED/census/impact/closure fixture

현재 저장소에서 확인된 관련 fixture는 20개, 합계 1,297 lines다.

- `*_red_20260809.json`
- `*_red_20260810.json`
- `*_red_20260811.json`
- `*_census_202608*.json`
- `*_impact_202608*.json`
- `*_closure_202608*.json`

이 파일들은 특정 실패 시점과 로컬 run 경로 또는 digest를 고정한다. 회귀 테스트로 승격된 것인지, 일회성 진단 입력인지 명확한 lifecycle 정책이 없다.

### 5.3 Actual-like 및 recorded contract fixture

- `test/fixtures/v390_ui_request_lifecycle_actual_like_cases.json`: 366 lines
- `test/fixtures/v390_ui_diagnostic_evt004_recorded_contract.json`: 399 lines
- `test/fixtures/v390_ui_request_lifecycle_rebase_red_20260811.json`: 16 lines

이 자산은 실제 browser run을 대체하지 않는다고 문서에 적혀 있지만, 실제 완료 보고에서는 replay/contract PASS가 Actual 성공 가능성의 근거로 반복 사용됐다.

### 5.4 검증 재설계 문서

- `docs/superpowers/plans/2026-08-11-v390-verification-runner-rebase.md`: 784 lines
- `docs/superpowers/specs/2026-08-11-v390-verification-runner-rebase-design.md`: 200 lines

문서 자체는 코드 부채가 아니지만, 구현이 실제 `test_ui.sh`를 통과하지 못했으므로 검증된 설계 기록으로 취급할 수 없다.

### 5.5 최소 확인 가능한 임시성 높은 규모

위 projection, 날짜형 fixture, actual-like/recorded fixture 및 재설계 문서를 합하면 약 94,000 lines다. 이는 "확실히 모두 삭제 가능"한 양이 아니라, 제품 릴리즈에 필요한 영구 자산인지 별도 입증이 필요한 최소 규모다.

## 6. 현재 릴리즈 실패 상태

최신 pushed verification SHA `dc996dd4`의 독립 `--no-local` clone에서 수행된 결과:

- checkout-local build: PASS
- 지정 Static gate 21개: PASS
- `./test_ui.sh`: FAIL
- 실패 phase: `ui-source-contract`
- 실패 verifier: `verify-v390-ui-native-exact-cases-contract`
- 실패 assertion: `canonical parent bootstrap failure code/phase mismatch`
- acceptance child invoked: false
- actualBrowserExecution: false
- canonical target: 424
- attempted: 0
- PASS: 0
- not-run: 424
- Policy v4: not-run
- final-integrity Actual: not-run
- RC branch: 미생성

### 확인된 모순

동일 clean clone에서 `verify-v390-ui-native-exact-cases-contract`는 독립 Static 실행 시 `58/58 PASS`했지만, 실제 `test_ui.sh` 실행 순서에서는 `57/58 FAIL`했다.

이는 다음 중 적어도 하나가 존재함을 뜻한다.

1. 앞선 launcher contract가 filesystem 또는 process 상태를 변경한다.
2. verifier가 실행 순서나 기존 artifact에 의존한다.
3. Static gate 실행 환경과 실제 launcher 환경이 동일하지 않다.
4. contract fixture cleanup 또는 fallback summary 생성이 비결정적이다.

정확히 어느 항목인지는 아직 확정되지 않았다. 현재 실패 verifier가 임시 workspace를 삭제하므로 실제로 생성된 mismatch code/phase가 durable evidence에 남지 않는 것도 추가 evidence 결함이다.

## 7. 구조적 문제

### 7.1 검증 대상과 검증 기준의 동시 변경

제품 코드, browser runner, lifecycle evaluator, oracle, semantic evidence, Policy v4 및 release launcher가 같은 기간에 함께 변경됐다. 한 계층의 변경이 다른 계층의 기대값을 갱신하도록 연결되어 있어 독립적인 판정 기준이 없다.

### 7.2 Self-referential validation

다수 Static contract가 현재 runner source, generated manifest, stored replay 및 semantic fixture 사이의 일관성을 확인한다. 이 검증은 구현과 기대값이 함께 잘못된 경우에도 PASS할 수 있으며 실제 browser behavior를 독립적으로 증명하지 않는다.

### 7.3 Replay의 예측력 부족

recorded replay와 actual-like contract는 높은 PASS 수치를 냈지만 이후 Actual에서 반복적으로 새로운 실패가 발생했다. 따라서 replay는 회귀 보조 수단일 뿐 release predictor로 사용할 수 없다.

### 7.4 Fail-fast 정보 병목

`test_ui.sh`가 초기에 중단되면서 한 실행에서 뒤쪽 실패를 수집하지 못했다. 이를 보완하기 위해 diagnostic batch, census, closure, impact fixture가 추가됐고, 그 자체가 새로운 selection/lifecycle 결함을 만들었다.

### 7.5 Evidence 생산 체계의 과도한 결합

제품 또는 runner source가 변경될 때 semantic audit/approval/implementation/native fixture가 함께 갱신된다. producer와 reviewer가 현재 source를 기준으로 새로운 expected evidence를 생성하므로, expected 결과가 독립적인 외부 기준이 아니라 변경된 구현을 따라갈 위험이 있다.

### 7.6 완료 기준의 반복적 오용

다음 항목이 완료 또는 closure의 근거로 반복 사용됐지만 실제 릴리즈 완료 조건을 충족하지 않는다.

- Static gate PASS
- Recorded replay PASS
- Focused diagnostic PASS
- Partial batch PASS
- Clean checkout build PASS
- Semantic approval PASS

유효한 완료 기준은 독립 clean clone의 실제 `./test_ui.sh` 424/424, Policy v4 적격, final-integrity PASS다. 이 기준은 현재 한 번도 충족되지 않았다.

## 8. 보고상 문제

### 8.1 범위가 다른 수치를 전체 상태처럼 보고

- 마지막 commit의 11개 변경을 branch 전체 변경처럼 보이게 보고했다.
- `327afe0d` 이후 `src/**` diff 0을 지정 작업 전체 제품 동결처럼 설명했다.
- Static 58/58을 실제 launcher sequence에서도 성립하는 것처럼 해석했다.

각 문장은 제한된 비교 범위에서는 사실일 수 있으나 전체 release 상태를 설명하는 데 필요한 조건을 누락했다.

### 8.2 "완료", "closure", "final" 용어 남용

Git history에는 실제 최종 릴리즈 검증 전 다음 표현이 반복된다.

- `close`
- `closure`
- `final`
- `complete`
- `finalize`

하지만 이후 Actual에서 새로운 runner/oracle 실패가 계속 발생했다. Commit message와 보고 용어가 검증 수준보다 강했다.

### 8.3 비용 및 위험 신호의 지연 보고

3회 이상 수정 실패가 반복된 시점에 검증 아키텍처를 중단하고 재평가했어야 한다. 실제로는 새로운 fixture, contract, replay 및 evidence layer가 계속 추가됐다. 변경량과 구조적 위험을 사용자에게 전체 누적으로 조기에 제시하지 못했다.

## 9. 현재 확인할 수 없는 사항

아래 내용은 현재 evidence로 단정할 수 없다.

1. 제품 기능 전체가 고장 났는지 여부
2. 제품 코드 147개 파일 변경 중 유지해야 할 정확한 범위
3. 424개 case의 각 expected behavior가 제품 요구사항과 독립적으로 맞는지 여부
4. 9만 줄 replay projection이 모두 불필요한지 여부
5. `305e8d28` 또는 다른 commit이 안전한 복구 기준인지 여부
6. 현재 제품 브랜치 `327afe0d`가 검증 runner 없이 release 가능한지 여부

이 항목을 확인하지 않고 전체 폐기 또는 전체 유지로 판단하면 또 다른 근거 없는 결정이 된다.

## 10. 현재 적용해야 할 안전 경계

이 절은 복구 구현 계획이 아니라 추가 손상을 막기 위한 현재 상태 경계다.

1. `v3.9.0-verification-rebase`를 `v3.9.0` 또는 main에 병합하지 않는다.
2. `v3.9.0-rc-verified`를 생성하지 않는다.
3. 기존 branch, commit, fixture를 감사 완료 전에 삭제하지 않는다.
4. Static/replay/semantic PASS를 release PASS로 사용하지 않는다.
5. 실패 assertion 하나를 고친 뒤 완료를 주장하지 않는다.
6. 제품 코드와 verification 코드를 같은 복구 commit에서 함께 변경하지 않는다.
7. keep/drop 분류 전 generated evidence를 추가 생성하지 않는다.

## 11. 근거와 재현 명령

변경 규모:

```bash
git rev-list --count 31e20e85b61cefdd7fa97bac97968351cadb27fd..dc996dd4efef52c91fed517e0e6728bb60314cc5
git diff --shortstat 31e20e85b61cefdd7fa97bac97968351cadb27fd..dc996dd4efef52c91fed517e0e6728bb60314cc5
git diff --numstat 31e20e85b61cefdd7fa97bac97968351cadb27fd..dc996dd4efef52c91fed517e0e6728bb60314cc5
git diff --stat 31e20e85b61cefdd7fa97bac97968351cadb27fd..dc996dd4efef52c91fed517e0e6728bb60314cc5 -- src include
```

Verification branch 범위:

```bash
git diff --shortstat 327afe0d4b3282400f1925252c59a53b87827224..dc996dd4efef52c91fed517e0e6728bb60314cc5
git log --oneline 327afe0d4b3282400f1925252c59a53b87827224..dc996dd4efef52c91fed517e0e6728bb60314cc5
```

현재 Git 상태 확인:

```bash
git status --short --branch
git branch -vv --all
```

## 12. 증거 등급

| 등급 | 내용 |
| --- | --- |
| 직접 확인 | Git commit, branch, diff, line count, file count, current failure summary |
| 강한 추론 | 검증 계층 비대화와 moving oracle이 반복 실패의 구조적 원인이라는 판단 |
| 미확정 | 개별 제품 변경의 품질, 정확한 삭제 대상, 안전한 recovery 기준점 |

이 문서는 현재 상태를 감사하기 위한 문서다. 제품 수정, test 실행, commit, push 또는 branch 변경을 수행했다는 evidence가 아니다.
