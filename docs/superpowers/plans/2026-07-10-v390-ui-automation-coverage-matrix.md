# v3.9.0 UI Automation Coverage Matrix Implementation Plan

대상 독자는 v3.9.0 UI 자동화와 release evidence를 유지보수하는 개발자 및 자동화
에이전트입니다. 이 문서는 V390-ADD1-11 구현 기간에만 사용하는 실행 계획이며,
`AGENTS.md`와 `docs/development-backlog.md`의 권한·완료 기준을 대체하지 않습니다.

**Goal:** 974개 project inventory의 reviewed implementation manifest에서 exact
`manualUiCaseId` 424개를 source-of-truth로 route/control/action 자동화 coverage matrix를
생성·검증하고, 실제 자동화된 case와 미지원/manual-required/제품 UI 비대상 case를
거짓 PASS 없이 분리합니다. Feature ID prefix와 numeric range는 selection/classification에
사용하지 않습니다.

**Architecture:** compact policy fixture는 count와 automated/excluded exact case만 소유하고,
Node verifier가 project inventory, exact `manualUiCaseId`/UI source evidence, v3.9 case manifest,
보존된 native visible-DOM summary를 교차 검증해 424행 JSON/Markdown matrix를 생성합니다.
Contract verifier는 cross-prefix test ID 누락/중복, route/control-action drift,
featureId→caseId drift, artifact 누락과 prefix/range 판정 재도입을 negative fixture로 거부합니다.

**Tech stack:** Node.js ESM, `server.sh`, Markdown inventory, JSON policy/summary/evidence,
기존 v3.9 native visible-DOM UI automation artifact.

## Task 1 — 실행 전 등록과 RED

- [x] Step 25/R10과 `V390-ADD1-11`을 roadmap과 release test definition에 등록합니다.
- [x] coverage policy, verifier/contract command, durable matrix 문서의 완료 계약을 먼저
  contract assertion으로 고정합니다.
- [x] 구현 전 contract가 missing verifier/matrix로 실패하는 RED를 기록합니다.

## Task 2 — current UI coverage matrix

- [x] 974개 inventory와 implementation evidence의 exact `manualUiCaseId` 424개,
  featureId/route/control-action anchor/stability verifier를 읽습니다.
- [x] `UI-108`~`UI-115`는 보존 native visible-DOM summary의 actualResult,
  screenshot, trace, console, server log를 개별 행에 연결합니다. video는 adapter가 실제
  capture를 지원할 때만 연결하며 placeholder 파일은 evidence로 만들지 않습니다.
- [x] 자동화 manifest가 없는 exact test ID는 `unsupported-manual`, 제품 UI 부재 negative case는
  `excluded-positive-ui`로 분리하고 각 행에 사유와 manual UI 필요성을 기록합니다.
- [x] summary가 matrix validation PASS와 full automation/UI fulltest PASS를 분리합니다.

## Task 3 — drift/false-PASS guard

- [x] cross-prefix exact test ID 누락/중복, inventory/implementation route/control-action drift,
  automation featureId→caseId drift를
  실패 처리합니다.
- [x] automated case의 failed/not-run 상태 또는 screenshot/trace/console/server-log 누락을
  실패 처리합니다.
- [x] durable matrix 문서가 424개 exact test ID와 aggregate count를 보존하는지 검증합니다.

## Task 4 — exact-ID correction / prefix 판정 제거

- [x] `UI-*` 전용 parser와 숫자 range classification을 제거합니다.
- [x] implementation manifest 명시 refresh도 reviewed exact UI route/control-action/verifier
  매핑을 보존하고, 신규 UI mapping에 명시 route가 없으면 실패하도록 prefix route fallback을
  제거합니다.
- [x] manual UI source-of-truth와 같은 exact 424 test ID set equality를 검증합니다.
- [x] matrix에 test ID, feature ID, route, control/action source anchor, stability verifier,
  automation case ID를 독립 열/field로 보존합니다.
- [x] durable matrix 문서가 424개 exact test ID와 974/424/8/415/1 aggregate count를
  보존하도록 갱신합니다.

## Task 5 — 안정화와 기록

- [x] coverage verifier/contract, 기존 UI runner/replay contract, inventory/docs/script gate와
  `git diff --check`를 실행합니다.
- [x] UI 풀테스트 직접 조작과 30분/120분은 최신 요청에 실행 승인이 없으므로 미실행으로
  분리합니다.
- [x] RED, 수정, 최종 PASS, 임시 산출물 cleanup, 남은 manual-required gap을 roadmap과
  release evidence에 기록한 뒤 현재 단계만 커밋합니다.
