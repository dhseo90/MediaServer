# S11 실제 앱 시간·완료 증거 계약

독자: v4.1.0 S11 실제 앱 검증기와 릴리즈 판정 담당자. 수명: S11 종료 전 현재 계약 설명.
작업 정책은 `AGENTS.md`, 실제 실행 결과는 `docs/release-test-records.md`가 source-of-truth다.
이 문서는 검증 기준을 설명하며 실행 증적이나 제품 완료 보고가 아니다.

## 서로 다른 시간 예산

| 기준 | 시작점·범위 | 성공 의미 | 실패 의미 |
| --- | --- | --- | --- |
| 제품 `DerivedJobService max_work_ms=30000` | `DerivedJobService::Run` 진입 시 steady clock 예산을 만들고, 해당 Run의 복구·render·publish·commit 작업에 적용 | Run이 자체 예산 안에서 제품 terminal 결과를 냄 | Run 내부 예산 소진 또는 취소. dispatch 이후 전체 wall time이 30초였다는 뜻은 아님 |
| source wait | `DerivedEventWorker::Submit/Process`의 source coverage 재평가 기간. Run 호출 전 단계 | 같은 요청의 source 조건이 충족되어 intent/render 단계로 이동 가능 | source 조건이 예산 안에 충족되지 않음. Run 내부 30초 실패와 구분 |
| 단일 render queue 대기 | `DerivedEventWorker::RenderLoop`가 `render_queue_` 선두를 꺼내기 전 대기 | 선택된 고정 reference가 Run에 진입할 기회를 얻음 | 앞선 작업 때문에 검증기 30초 안에 terminal 출력에 도달하지 못할 수 있음. 제품 Run 예산 위반으로 단정하지 않음 |
| 실제 앱 selected-reference strict 30초 | 사전에 선택·상관한 한 reference의 공개 Timeline 관측 대기 | 30초 이내에 독립 terminal 관측과 적격 전체 페이지에서 literal 두 complete 출력이 모두 확인됨 | 늦은 성공 반환도 `complete-two-outputs-timeout`. 다른 reference로 바꾸거나 사후 성공을 PASS로 승격하지 않음 |
| 개별 Timeline HTTP 4초 | 각 HTTP 요청의 header/body 전체 | 요청마다 status 200, 측정 outcome ok, 총 4초 이하 | 해당 요청 실패. selected-reference 30초 대기나 제품 Run 예산과 서로 대체하지 않음 |

따라서 제품의 `max_work_ms=30000`과 검증기의 strict 30초는 시작점과 포함 구간이 다르다.
source wait와 단일 render queue 대기는 제품 Run 예산보다 앞에 있으며, 실제 앱 strict 30초에는 이 선행 지연과
Timeline polling이 포함될 수 있다. 검증기 timeout은 현행 E2E 기준 실패이지만 그 사실만으로 제품 Run 내부
`max_work_ms` 위반 원인을 확정하지 않는다.

## 선택·완료 판정

- dispatch 응답 배열의 첫 이벤트가 render queue의 첫 작업이라는 계약은 없다.
- 실제 앱 검증기는 첫 dispatch reference를 한 번 선택하며 `selectionBasis=first-dispatch-stable-reference`를 기록한다.
  이 규칙은 render 선두나 빠른 작업을 뜻하지 않는다. 선택 뒤에는 같은 reference만 관측하고 늦다는 이유로 다른 reference로 교체하지 않는다.
- 독립 terminal 관측은 전체 페이지 적격을 대체하지 않는다. 반대로 전체 페이지에서 두 출력을 얻어도 독립 terminal 관측이 없으면 PASS가 아니다.
- PASS에는 같은 선택 reference, 독립 terminal 관측, 전체 페이지 수집 성공, literal 두 complete 출력, 각 출력 HTTP 200과 바이트/hash 검사가 모두 필요하다.

## O16 페이지 경계와 O18 시간초과

`allTimelinePages`는 기존 fail-closed 제한인 top-level 최대 4,096개, 펼친 leaf 최대 4,096개,
본문 최대 64MiB, duplicate·page-total 불변을 유지한다. 페이지 경계 실패는 원문 ID나 payload 없이 다음 고정 코드와 숫자만 기록한다.

| 코드 | 의미 | 허용 진단 숫자 |
| --- | --- | --- |
| `page-bound-top-limit` | `total + unplacedTotal`이 `maxItems` 초과 | `topLevel`, `maxItems` |
| `page-bound-offset-limit` | 응답 offset/limit이 요청과 불일치 | expected/observed offset·limit |
| `page-bound-leaf-limit` | file-group member를 펼친 누적 leaf가 `maxItems` 초과 | `leaves`, `maxItems` |

O16의 위 고정 코드는 페이지 적격 실패다. O18의 `complete-two-outputs-timeout`은 선택 reference의 strict 30초
관측 실패다. 두 결과는 서로 다른 실패이며 한쪽의 독립 terminal 관측이나 뒤늦은 출력이 다른 쪽을 PASS로 바꾸지 않는다.

직접 보존된 O18 시계축에서 선택된 첫 dispatch reference는 제출 12.745초, queue 25.525초,
Run 시작 41.649초, admission 42.112초, 종료 뒤 Failed 43.415초였다. 다른 세 reference는 먼저 queue되어
28.383초·35.388초·41.649초에 Complete가 되었으므로, 첫 dispatch reference는 실제 render 네 번째였다.
이는 “첫 dispatch=첫 render” 가정을 반증하며 strict 30초 timeout을 다른 세 reference의 성공으로 대체할 수 없다는 근거다.
O16은 `page-bound`로 `waitOutcome=error`, O18은 `waitOutcome=timeout`이므로 동일 실패로 합치지 않는다.

## 이번 문서의 실행 경계

장시간·실제 앱·UI 검증은 이 문서 작성으로 실행되지 않았다. 단위 회귀는 별도 명령·exit·개수를 실제 결과로 보고하며,
그 결과도 전체 current integration 또는 S11 완료 evidence가 아니다. 커밋·푸시와 외부 변경은 수행하지 않는다.
