# v4.1.0 녹화 기반 상세 구현계획

> **자동화 작업자 필수:** 이 계획을 실행할 때는 `superpowers:executing-plans`를 사용하고,
> 각 단계의 RED → GREEN → 문서/evidence → `git diff --check` 순서를 지킨다.

**목표:** 채널별 opt-in 상시녹화, 이벤트 연동 녹화, 이벤트 우선 표출·재생, 용량 초과 시
oldest-first 순환 삭제, 재시작 복구와 후속 검색용 안정 메타데이터 기반을 v4.1.0에서
완성한다.

**초기 아키텍처(S00~S09 이력):** 기존 `SharedStream`의 인코딩 packet fan-out에 전용 Recorder subscriber를
추가한다. 녹화기는 keyframe 경계의 불변 segment를 임시 경로에 쓴 뒤 atomic publish하고,
append-only JSONL journal을 내구성 원장으로, optional SQLite를 조회 projection으로 쓴다.
이벤트는 같은 UTC 범위의 segment를 연결·파생하고 기존 frame-buffer clip을 fallback으로
사용한다. UI/API는 filesystem 목록이 아니라 녹화 application service의 논리 timeline만
소비한다.

**기술 스택:** C++17, GStreamer `appsrc`/parser/`splitmuxsink`, SQLite3(optional),
append-only JSONL, 기존 내장 HTTP/WebRTC 서버, vanilla JavaScript Ops UI, shell/Node/C++
verifier.

**설계 명세:**
[v4.1.0 녹화 기반과 v4.x 검색 확장 설계](../specs/2026-09-02-v410-recording-search-foundation-design.md)

## 전역 제약

### LP18 소유 구조와 정상 전이 보완

최신 승인: 권장 1~5 순차 개발·분할 커밋, 시작 전 기존 유효 미커밋을 먼저 커밋. 기존3묶음은
`882ed33c`/`4e592c35`/`afe9e462`로 보존했다. 푸시·장시간·브라우저 검증은 이번 비범위다.
공통 계약은 [누적 비용 계약](../specs/2026-09-19-recording-catalog-cost-contract.md)의 0절에만 둔다.
메인은 구조/안전 계약·직접 diff/증거 판정, 단일 기존 Astra/medium 담당자는 확정된 소유 구현과 관련 검사만 맡는다. 하위 생성 금지.
설계·TDD·원인 분리 절차를 적용하되 제공되지 않은 Superpowers 스킬 실행을 주장하지 않는다.

| 순서 | 작업 | 완료/실행 경계 |
| --- | --- | --- |
| 1 | 공통 소유·내용 검증/상태 검증 경계 | 계약·반례 등록·문서 검증 후 커밋. 제품 완료와 구분 |
| 2 | 불변 증거 중복 보관 제거 | journal/checkpoint envelope 공유부터 구현하고 typed 소유 잔존 판정. 공용 값 반환 계약 불변 |
| 3 | 정상 전이→checkpoint 내용 재검증 제거 | 새/복구 입력은 엄격 검사, 매번 상태 전이 검사. LP14/15 실패 주입 의미 유지 |
| 4 | 비활성 상세 RAM 내림/안전 재획득 | journal·live·shadow 전체 소유, reader/작업/재시작·손상·삭제 반례 |
| 5 | 관련 회귀·비용·실제 HTTP | 작은 입력→2-job→16/32원본/삭제/재개방 통과 후 기존4초. 최종 S11 전체 묶음 아님 |

2번 첫 단위의 focused는 LP18-O01~06이며 실행 전 중앙 기록에 정확한 명령과 실패/정리 oracle를 연결한다.
첫 단위 journal/checkpoint const envelope 공유는 구현·focused34·cache47·catalog246·writer44·prepared11·identity6·소형 기능99/계측1·전체 build를 통과했다.
공개 Replay 값 반환·저장 바이트·손상 거부를 유지했다. accepted canonical 사본도 공유로 바꾸고 focused55·prepared11·cache47·catalog246·writer44·소형 기능99/계측1·전체 build를 통과했다.
typed binding도 live/shadow const 소유로 공유하고 focused77·source20·cache47·catalog246·prepared11·소형 기능99/계측1·전체 build를 통과했다.
새 ID만 전체 canonical 대조하며 no-op/duplicate은 pool 비교0을 확인했다. typed job도 const 소유로 연결하고 focused24·prepared11·jobs23·validation11·service43·timeline38·media46·retention24·cache47·catalog246·2-job 기능120/계측1·전체 build를 통과했다.
2번의 journal/live/shadow 동일 기록 소유 보완은 완료했다. 공개/자기완결 snapshot과 과거 payload·상세 상주는 남았으며 3~4번과 구분한다.
3번 첫 호출-local 내용 proof는 focused25·job24·prepared11·cache47·catalog246·실제2-job 기능120/계측1·전체 build를 통과했다.
정상 strict Parse8회와 복구/수동 Parse는 유지하고 같은 호출 자동 checkpoint의 current Parse2회만0회로 줄였다.
상태 비교·과거 이력·중복 직렬화 비용은 남으며 3번 전체 및4~5번은 미완료다. 상세 실행/정리는 중앙 기록을 따른다.
추가 envelope 비용 단위는 전체필드 대조 뒤 중복 canonical 생성을 제거했다. focused30·기존소유34·identity6·cache47·catalog246·실제2-job 기능120/계측1·전체build 통과.
내용/상태 serializer의 내부 검증·복원 반복은 다음 보완 대상이며 이를 단순 문자열 비교와 혼합하지 않는다.
실행/수집 실패와 재검증은 중앙 기록에 보존했다.
이후 3/4번은 같은 계약 안에서 변경 파일·반례를 구체화하고 실행 전 등록한다. 기록 없는 테스트를 사후 PASS로 만들지 않는다.

### LP17 판정 기준 비교 설계 저장 계약

최초 사용자 승인: 재판정한 1~3번 설계와 후속 재검토·마무리·커밋·푸시 요청.
후속 사용자는 미완료 상태의 중간 푸시를 거부하고 미완료 정리를 우선했다. 현재 작업은 위 설계에 따른
비교 도구 구현→작은 입력 자체검증→원인 비교이며, 제품 변경(4번)·실제 앱·장시간/UI·푸시는 제외한다.
Git은 이번 문서와 기존 누적 커밋/미해결 변경을 구분해 AGENTS.md 5장으로 판정하고 실제 결과를 중앙 기록에 남긴다.
AGENTS.md 1.3/3/7/8을 따른다.
미확정 저장 안전 설계는 메인이 직접 맡는다. 후속 확정 도구 구현은 단일 Astra/medium 담당자가 맡고 하위 생성은 금지한다.
현재 세션에는 `superpowers:executing-plans` 스킬이 제공되지 않아 설치/사용을 주장하지 않는다.
계획·합격/반례 정의·원인 분리·직접 검토·문서 검증 절차를 적용하며, 설계 문서 작업에 제품 RED/GREEN을 꾸미지 않는다.

1. [누적 비용·보관 수명 계약](../specs/2026-09-19-recording-catalog-cost-contract.md)의 판정 대상을 고정한다.
2. 아래 비교 설계를 실행 전 기준으로 고정한다. 계측 구현/실행 완료와 구분한다.
3. 같은 계약의 보관·회수·복구 불변 조건과 미확정 수단을 검토한다. 정량 예산은 실측 없이 정하지 않는다.

#### 한 묶음의 원인 구분 비교

실행 전 제품 기준은 현재 HEAD뿐 아니라 dirty diff와 의존 파일 hash를 포함해 동결해야 한다.
LP16 수명 변경 hash `09ad247d036f5aa1199fa24b66180b89bf49e067995057e470b5b58b50ef6beb`는
조사 기준일 뿐 채택된 최종 revision이 아니다. 비교 시작 뒤 제품 수정·환경 변경이면 서로 비교하지 않는다.
기존 LP16 원측정은 참고 증거이며 새로운 소유량 계측·대조군의 실행 증거를 대체하지 않는다.

| ID | 제품 캐시 | 테스트 기대값 보관 | 목적·비교 |
| --- | --- | --- | --- |
| LP17-D01/A | 현행 유지 | 기존 전체 객체 보관 | 기존 형태 기준군 |
| LP17-D02/B | A와 동일 | 독립 canonical 파일에서 항목별 읽기 | A↔B: 테스트 보관 방식의 영향 |
| LP17-D03/C | 검사 소유 복제본에서만 재사용/보관 비활성 | B와 동일 | B↔C: 캐시의 비용 교환. 제품 해결안으로 채택하지 않음 |

모든 군은 같은 encoded 입력·원본 파일/증거·1/16/32 누적 순서·실제4096 sample·검사 oracle를 사용한다.
각 군은 새 프로세스와 독립 소유 저장소를 사용한다. 제품 source/hash와 instrumentation 변경점을 기록한다.
생성 시 자동 발급되는 mutation 시각/ID는 군별 provenance로 남긴다. 원장 전체 hash가 동일하다고 가정하지 않는다.
영상 UTC/PTS·영속 ID를 덮어쓰지 않고, 입력 identity/증거와 예상 상태의 동등성은 독립 기대값으로 대조한다.
기존173개 assertion을 단순 count 일치가 아닌 개별 의미로 대응시키며 새 삭제/계측 항목은 별도 등록한다.

B/C의 기대 파일은 제품 조회 결과가 아니라 독립 원본/예상 mutation에서 작성하고, hash·불변성을 확인한다.
비교 시 모든 기대 파일을 한꺼번에 메모리로 읽지 않는다. 원래 바이트 대조를 count/hash-only 검사로 약화하지 않는다.
준비 전용 프로세스에서 세 군 공통 입력/기대 파일을 만들고 종료한 뒤, 각 측정 프로세스를 새로 시작한다.
같은 프로세스에서 큰 기대값을 만든 뒤 지우는 방식으로 B/C의 peak RSS를 오염시키지 않는다.
A도 같은 기대 파일을 제공받되 전체 기대 객체를 보관하고 B/C는 필요한 항목만 읽는다.
기대값 준비·읽기·검사 시간과 제품 호출/잠금 시간을 구분해 기록한다. A/B의 전체 wall time 차이를
제품 처리 속도 차이로 해석하지 않는다. 군 순서/파일 읽기량과 OS 파일 캐시 영향을 기록하고 cold-cache 성능을 주장하지 않는다.
미디어/증거/검사량은 줄이지 않는다. 군별 root에는 필요한 불변 seed만 복제하고 catalog 객체·lease·fd를 공유하지 않는다.
C는 검사 소유 복제본에서 checkpoint 캐시 보관/재사용만 비활성화한다. 신규/전체 검증·checkpoint 시점·저장/복구를
건너뛰지 않았음을 자체검증하고 원본 제품 source 불변을 확인한다.

| ID | 관측·절차 | 예상 결과와 반증 |
| --- | --- | --- |
| LP17-D04 | journal/live/shadow/prefix/작업/테스트의 소유 record·sample 수, 문자열/컨테이너 용량, current/peak RSS | 논리 payload·보관 capacity·RSS를 구별. 합이 RSS와 같다고 주장하지 않음 |
| LP17-D05 | 각 군에서 동일 허용 대상 삭제→checkpoint→정상 종료 | media 회수와 상세 metadata 잔존을 구별. 삭제만으로 ID/증거를 잊으면 FAIL |
| LP17-D06 | 새 프로세스로 SQLite 및 JSONL 재개방 | allocator high-water를 이전 과정에서 물려받지 않음. 결과/삭제/참조 의미 동일 |
| LP17-D07 | 최초 실패·안전 상한·원본 불변·프로세스/포트/임시 정리 | 아래 진행 조건으로 판정; 진단/기능/정리 실패나 안전 상한 초과 시 뒤 군 중단 |
| LP17-D08 | 기존 2-job 실제 크기 Intent/Files/Ready/Committed/Complete 독립 fixture에 B/C 대조 적용 | source-only와 별도 workload. 전이별 잠금/전체 처리·복사/직렬화·소유량과 독립 기대 결과 대조; 실제 HTTP PASS 아님 |

1/16/32군은 같은 원본 구간을 복제하는 고밀도 중첩 snapshot 스트레스다. 실제 순차 녹화·채널 수·운영 한도를
대표한다고 주장하지 않는다. D08은 기존 `recording_checkpoint_reproduction_smoke.cpp`의 2-job 입력과 전이 oracle를
재사용하되 캐시 유지/비활성에 동일 입력과 순서를 제공한다. 원본군만으로 원래 UpdateDerivedJob 비용의 원인을 닫지 않는다.
후속 도구 구현은 이 축의 개별 전이·명령·상한을 중앙 실행 기록에 연결한다.
작업 Complete와 요청 전구간 충족은 별개다. 기존 CP01을 넘어 요청 전구간 충족을 비용 검사 합격 조건으로 추가하지 않는다.
최초 Ready 전체 바이트는 제품 결과를 검증 후 보관해 후속 불변을 대조하므로 독립적으로 예측한 Ready oracle라고 주장하지 않는다.

비교 결과 해석을 미리 고정한다.

- A↔B 차이는 테스트 보관 방식의 영향이며 제품 수정 효과가 아니다. 같아도 테스트 비용이 0이라는 뜻은 아니다.
- B↔C 차이는 캐시의 시간/공간 교환이다. 차이를 journal/live/캐시 전체 원인으로 확대하지 않는다.
- 현재 소유 객체가 줄어도 RSS가 즉시 줄지 않을 수 있다. allocator 잔류와 누수는 구별하고 필요하면 별도 진단을 설계한다.
- 삭제 후 상세 소유량이 그대로이고 재개방에도 재구성되면, 단순 객체 수명보다 보관/복구 구조를 우선 검토한다.
- 같은 변경량에서 이력만 늘릴 때 처리량·전체 재생/복사 바이트가 늘면 증분 처리 계약의 미충족 근거다.
- 세 군의 차이는 비선형일 수 있으므로 빼기 결과를 합산해 정확한 heap 구성이라고 표시하지 않는다.
- 결과가 불분명하거나 실행 상한에 걸리면 가설 미확정으로 마감한다. 무근거 반복·다른 제품 수정으로 이어가지 않는다.

새 계측은 거대한 직렬화/임시 복사로 측정할 대상을 오염시키지 않아야 한다. capacity 계측은
보수적 소유량 지표이지 실제 malloc/SSO/shared 할당의 정확한 합계가 아니다. shared 값은 단일 소유자로 집계한다.
기존 512MiB RSS 판정은 각 군 결과에 별도 표기하고 제품 기준으로 소급하지 않는다.

#### 비교 진행 조건과 실패 경계

- 별도 진단 결과에 `historicalRssPass`, `observationValid`, `semanticPass`, `cleanupPass`를 구분한다.
  기존 LP16 runner의 exit/FAIL은 수정하지 않고 그대로 보존한다. RSS 초과 관측을 제품 PASS로 바꾸지 않는다.
- 기존 RSS 기준 초과만 있고 나머지 진단 조건이 충족된 경우, **이 분리된 비교 방식의 실행 승인을 받은 뒤에만**
  다음 군으로 진행할 수 있다. 이는 실패한 LP16 검증의 후속 단계나 실제 앱을 자동 실행한다는 뜻이 아니다.
  기존 runner의 실패를 무시하고 shell에서 다음 명령을 강행하는 구현은 금지한다.
- 기능 불일치, 관측 누락/오염, 원본 변형, 시간/디스크/출력/실행 안전 RSS 상한 초과, 정리 실패는 진단 실패다.
  원인·증거를 보존하고 뒤 군을 중단한다. 관측만 부족해도 임의 반복하거나 실제 앱으로 넘어가지 않는다.
- 실행 안전 RSS 상한은 제품 SLO나 기존 512MiB 결과와 별개다. 호스트 여유·동시 사용·프로세스 트리·중단/정리 방법과
  함께 **본실행 전에** 선정하고 승인 범위를 확인한다. 후속 실행에서는24GiB 호스트/최소2GiB 관측 여유를 확인하고
  소유 group1GiB·phase180초·root512MiB·원출력2MiB로 선정했다. 이는 제품 SLO가 아니다.
  명령과 실패/유효 결과는 중앙 기록을 따르며 이 설계만으로 다른 대용량 실행 권한이 생기지 않는다.

각 군 입력 manifest/hash·제품/계측/컴파일 hash·환경·한정 명령·예상 결과·실행 상세를 등록한 뒤 실행한다.
최초 설계 시 runner는 미구현이었다. 후속 구현/실행 명령·최초 실패와 결과는 중앙 기록의
`2026-09-19 LP17 비교 도구 구현과 원인 측정` 절을 따른다. 실제 실행 전에는 기존 계약의 준비 조건을 확인한다.
독립 작업 전이 D08과 실제 앱 HTTP는 별개다. HTTP는 원인/보완 범위 판정 뒤 승인된 실제 앱 단계에서
기존4000ms 기준으로 확인한다. 독립 fixture·메모리 분리 판정은 실제 앱의 기존 선수조건을 자동 해제하지 않는다.

#### 이번 문서 검증과 다음 진입 조건

최초 설계 검증은 `git diff --check`, `MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-docs-links`,
`MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-docs-ui-assets`였다. 후속 진단의 실행 범위/결과와 혼합하지 않는다.
비교 도구 구현 전에 위 matrix의 독립 oracle·소유/정리·상한을 코드로 연결하고 focused 자체검증을 등록해야 한다.
제품 4번은 비교 증거로 수정 경로·완료 기준을 좁힌 뒤 별도 범위로 진행한다. 기존 바이트/계약을 유지하는 수정에
새 저장 형식이나 제품 전체 용량 SLO 선정을 억지로 요구하지 않는다. 형식/회수 정책을 실제 바꿔야 할 때만 별도 설계·승인이 필요하다.

### 2026-09-17 LP10 후속1 실행 계획

사용자 승인: 제한 대기 정책 개발 후 커밋·보고. 푸시/후속2/장시간/UI는 제외. spec은 종료점 계약의 LP10이며 기존 작업 브랜치에서 한 담당자를 재사용하고 메인이 설계·diff·최종 판정을 직접 검토한다. 모델 Astra/medium 유지, 하위 생성 금지. 중앙 기록을 진행 원장으로 사용하며 별도 중복 계획/정책 문서를 만들지 않는다.

| 순서 | 구현·소유 파일 | 검증·완료 산출물 |
| --- | --- | --- |
| 1 | `recording_catalog.h/cpp`의 원자 snapshot/runtime 대기 lease; 내구 schema 불변 | 삭제경쟁·공유lease·8/32상한·정확해제 focused RED/GREEN |
| 2 | `recording_derived_event_worker.h/cpp`의 재예약 scheduler/단일renderer, source대기 조건·상한, snapshot 보존 | 대기/render 공정성·후행확정·timeout/partial·Stop/exception focused RED/GREEN |
| 3 | 관련 단기 회귀/빌드와 실제 diff 검토, 중앙 evidence 및 커밋 | 기존 integration/native/default/jobs·문서/diffcheck, 모든 소유 자원 정리 |

교차 검토: 1의 runtime lease를 2가 소유하며 admission 후 내구 보호와 겹쳐 인계한다. Stop/예외에서 모든 lease와 render queue를 정리하지 못하면 완료 불가다. 2의 runtime source예산만 추가하고 기존 explicit fixture의 일반 예산은 유지한다. 3은 같은 증거를 이유 없이 재실행하지 않으며 현재 제품 변경 영향만 검증한다. 신규 실패는 동일 범위 원인 확인 후 수정하고 계약 확장 시 보고한다.

- [x] LP10 catalog 보호 RED/GREEN
- [x] LP10 scheduler/renderer/예산/증거 RED/GREEN
- [x] LP10 관련 회귀·기록·메인 검토 완료. 사용자 승인 커밋의 실제 해시는 Git 기록을 따른다.

LP10 결과: focused41 + 기존 영향 회귀211 = 개별252PASS/0FAIL, 제품 빌드 성공. 원출력21회·초기 실패·정리 및 개별 결과는 중앙 기록 LP10에 보존했다. 실제 앱/누적 catalog 비용·HTTP 통합은 실행하지 않았으며 LP09-4/5가 다음 순서다. allocator 실패 주입과 fractional 앞원본+후행 확정 결합 fixture는 미실행 한계로 기록했다. 푸시는 이번 승인 범위가 아니다.

### 2026-09-17 LP09 실행 묶음

범위 source-of-truth는 [종료점 계약 LP09](../specs/2026-09-15-recording-endpoint-contract.md)다. 설계는 메인, 확정 구현은 기존 단일 담당자를 순차 재사용하고 메인이 diff/증거를 검토한다. 하위 에이전트·자동 추론 상향·푸시·장시간/UI는 제외한다. 이번 사용자는 1~5 순차 실행과 분할 커밋을 승인했다.

- [x] 1. 적용 조건: 관측 identity와 native 구간의 연결, 기존 profile 보존, 공통 소비/반례를 명시한다. 계약 문서 자체 모순/링크/diffcheck 통과. 설계 확정은 제품 구현 PASS가 아니다.
- [x] 2. 미선택 원인: `recording_derived_event_worker`의 선택 직전 snapshot과 시도 종료를 bounded 진단 callback으로 관측한다. 공개 route/schema 변경 없이 실제 앱 내부 로그의 고정 안전 필드만 수집한다. 자체검사로 callback 잠금/예외/상한·정책 불변을 확인하고 동일 실제 입력1회에서 원본·decoded·deadline을 분류한다. 임시자료 정리 및 결과 커밋. 실제1회 target9시도에서분석갱신정상·후행선택후보부재·3750ms종결확인. queued최초평가도접수증거로종결됨을별도관측. HTTP85행미확보이므로전체지연gate PASS는아니며중앙기록LP09참조.
- [ ] 3. 확정 경로: 새 증거 소비는 selection/job/remux/Ready/복구/조회의 같은 계약으로 구현한다. 2번 원인에 맞춰 대기/증거 갱신 경로를 별도 단위로 수정한다. 구현 전 exact fixture/명령/기능ID를 중앙 기록에 등록하고 RED/GREEN·영향회귀 후 각 단위 커밋. 원인이 확정되지 않은 경로는 추정 구현하지 않는다.
- [ ] 4. 회귀: 실제 gap/식별 불일치/증거 부재/손상/기존 profile 불변과 저장 상한·잠금 비용, 관련 빌드를 확인한다. 변경별 유효 증거를 재사용하고 무관 검증은 반복하지 않는다.
- [ ] 5. 통합: 기존 누적catalog16/32·실제 완전 출력2개/HTTP hash·두 번째 기동 데이터 보존과 새 녹화·현재 통합 실행기를 순서대로 확인한다. 앞 단계 실패면 뒤 단계를 PASS로 대체하지 않는다. 최종 종합보고에 실제 커밋/미푸시와 미해소 항목을 명시한다.

검토 경계: 1의 새 소비 조건은 3이 구현하며 2는 조건을 바꾸지 않는 관측만 제공한다. 3과4가 같은 파일을 다루지만 검증 변경은 해당 구현 커밋에 포함한다. 5는 구현/회귀가 닫힌 코드만 사용한다. 기존 S11 최종 안정화·30분·UI·120분 및 release action 승인은 이 묶음으로 확대하지 않는다.

현재 단계3 부분 결과: 정확 구간 산술 LP09-N01~08은 8PASS 후 `12f87e46`으로 커밋했다. queued provider를 매 평가 앞으로 이동한 LP09-Q는 focused25/기존통합56 PASS 및 빌드 exit0이며 대기 상한/시도/partial 정책은 불변이다. 이후 사용자는 잔여1(선택)~2(저장/생성/복구)만 순차 승인했다. 잔여1 선택 API/fixture는 명시 opt-in으로63PASS, 출력cap/prefix회귀까지 보완하여 `fe5fe0d3`으로 커밋했다. 잔여2는 새 job profile·remux·Ready·복구·조회 공통 소비와 worker opt-in을 구현했다. 실제 파일5종/worker2출력/Ready 자식 중단 복구59PASS, codec12PASS와 build exit0이며 기존 소비 회귀 결과는 중앙 기록을 따른다. 실제 앱 분석 입력·HTTP 통합 및 대기 정책은 이 fixture 결과에 포함하지 않는다. 단계3 전체 체크는 유지한다.

LP09 당시 정책 경계: 실제 타깃의3750ms 대기 중 후행 원본은 후보에 없었고 writer의 관측 분할은 약8.333초였다. LP09에서는 wait/retry/queue/종결 변경을 제외하여 승인을 기다렸다. 이후 사용자가 제한 대기 후속1을 승인해 위 LP10으로 착수했다. timeout만 늘리거나 기존 partial을 complete로 바꾸지 않는 조건은 그대로다. 공통 소비의 관련 단기 회귀와 별개로 단계4 누적 저장/HTTP 비용 및 단계5 실제 통합은 남아 있다. Q 단위의56PASS나 native fixture59PASS를 단계4/5 전체 완료로 대체하지 않는다.

- 2026-09-12 재편: S00~S08은 기존 개발 이력, Task 9는 종료·대체된 과거 실행계획이다.
  현재 S10 설계 기준은 [설계 명세의 S10 절](../specs/2026-09-02-v410-recording-search-foundation-design.md#s10-시간식별-계약),
  단계 상태는 로드맵을 따른다. 이후 S10의 저장·시간·파생 작업과3D 공개 소비 계약을 별도 승인하여
  적용 중이다. 현재 계약/진행은 아래 S10·3D 실행 절, S11 최종 검증 범위는 코드 고정 후 판정을 따른다.
- 이 문서는 구현계획이며 구현·테스트 실행·커밋·푸시·PR·머지·태그·릴리즈 승인이 아니다.
- 실제 개발은 `V410-S00`부터 순서대로 진행한다. 한 단계가 실패하면 뒤 단계는 실행하지
  않고 `건너뜀`으로 보고한다.
- 각 단계의 focused test는 [AGENTS.md 3.1.1](../../../AGENTS.md#311-tdd의-예상된-red와-실제-실패-구분)의
  예상된 RED 조건을 확인한 뒤 해당 단계 범위만 구현하고 다시 통과시킨다.
- 커밋은 사용자의 최신 지시에 `커밋` 승인이 명시된 단계에서만 수행한다. 아래 커밋
  명령은 승인 후 실행할 명령이지 자동 승인 문구가 아니다.
- 안정화, UI 풀테스트, 30분, 120분 검증은 AGENTS.md의 필요성 판정과 사용자 실행 승인을
  별도로 받는다.
- v4.1.0에서는 구조화 검색, 임베딩, 자연어 해석, 교차 카메라 Entity 추론을 구현하지
  않는다.
- MyLocalLLM, VARuleLens와 공유 GPT 대화는 참고 자료로만 남긴다. 원본 저장소 수정,
  submodule, runtime dependency, 코드 복사는 금지한다.
- 모든 새 문서와 사용자 표출 문구는 한글을 기본으로 한다. API 필드, 소스 식별자,
  표준 고유명사만 원문을 유지한다.
- 기존 RTSP/WebRTC media packet, EventRecord, Event POST schema의 기존 필드 의미를
  바꾸지 않는다. 필요한 값은 additive field 또는 별도 녹화 contract로 추가한다.
- Apache-2.0과 충돌하거나 권리 상태가 불명확한 구현은 사용하지 않는다. 특허 위험이
  있거나 불확실한 접근은 구현 상세를 설계에 반입하지 않고 기능을 재설계·축소·보류한다.

---

## 구현 전 고정 계약

### 식별자와 시간

- v4.1.0의 등록 채널 식별자는 `SourceViewRegistry::SourceRecord::source_id`를 그대로
  `channel_id`로 사용한다. `source_id`와 `channel_id`를 같은 값으로 저장하되 두 필드는
  후속 다중 채널 source 확장을 위해 계속 분리한다.
- 기존 V1은 nanosecond PTS와 UTC 반개구간을 가진다. 아래 과거 Task의 단일 anchor 매핑·
  PTS rollback epoch 규칙은 S01~S09 구현 이력이며 S10 신규 구현 규칙이 아니다.
- S10은 [승인된 시간·식별 계약](../specs/2026-09-02-v410-recording-search-foundation-design.md#s10-시간식별-계약)을
  따른다. 기존 필드 의미를 유지하고 신규 계약을 버전화한다. 단순 PTS 감소나 UTC 보정만으로
  미디어 재시작을 단정하지 않으며, 알 수 없는 UTC를 기존 V1 숫자로 강제 투영하지 않는다.

### 설정 계약

전역 환경변수는 다음 이름과 기본값으로 고정한다. 전역과 채널 모두 enabled여야 실제
녹화가 시작된다.

| 환경변수 | 기본값 | 의미 |
| --- | --- | --- |
| `MEDIA_SERVER_RECORDING_ENABLED` | `0` | 녹화 subsystem 전역 opt-in |
| `MEDIA_SERVER_RECORDING_STORAGE_ROOT` | `.media_server/recordings` | S01~S05 실제 구현의 영상·journal·catalog root. 운영 계약은 config-reference.md를 따름 |
| `MEDIA_SERVER_RECORDING_SEGMENT_DURATION_SECONDS` | `10` | S01~S05 실제 구현의 목표 segment 길이(초). 실제 분할은 다음 keyframe까지 연장 가능 |
| `MEDIA_SERVER_RECORDING_RESERVED_FREE_BYTES` | `1073741824` | 쓰기 전에 남겨야 하는 store 여유 공간 |
| `MEDIA_SERVER_RECORDING_OBSERVATION_INTERVAL_MS` | `1000` | 대표 중간 관측 기본 간격 |
| `MEDIA_SERVER_RECORDING_RETENTION_INTERVAL_MS` | `5000` | quota·기간·reserve 정리 주기 |

`SourceRecord`에는 다음 additive nested object를 저장한다.

```json
{
  "recording": {
    "enabled": false,
    "continuousMaxBytes": 0,
    "continuousMaxAgeMs": 0,
    "eventMaxBytes": 0,
    "eventMaxAgeMs": 0,
    "observationIntervalMs": 1000
  }
}
```

- `enabled=false`이면 나머지 값은 보존하지만 recorder를 시작하지 않는다.
- `enabled=true`이면 `continuousMaxBytes > 0`, `eventMaxBytes > 0`을 필수로 한다.
- `*MaxAgeMs=0`은 기간 제한 없음이며, 음수는 거부한다.
- quota는 channel별·retention class별로 적용하고 전역 reserved free space는 store 전체에
  적용한다.
- root가 symlink traversal, 파일 경로 중복, 쓰기 불가 상태이면 해당 channel 시작을
  fail-closed한다. live/VA 경로는 계속 동작한다.

### 미디어 형식

- H.264/H.265 video는 MP4 segment를 사용한다. MP4에 안전하게 mux할 수 없는 audio는
  video 녹화를 막지 않고 `audio_omitted_reason`을 기록한다.
- VP8 video는 WebM segment를 사용하며 Opus audio를 허용한다.
- 지원하지 않는 video codec은 `unsupported-codec` channel 상태로 표출하고 정상 segment로
  가장하지 않는다.
- 목표 10초가 되어도 keyframe이 없으면 현재 GOP가 끝날 때 분할한다. 실제 길이가 목표의
  3배를 넘으면 `long-gop` warning을 남기지만 손상된 임의 byte split은 하지 않는다.
- 최종 파일명은 `{segment_id}.mp4` 또는 `{segment_id}.webm`이다. writer는
  `<root>/.pending/{segment_id}.partial`만 쓰고 close/fsync 뒤 channel 날짜 경로로 rename한다.

### 영속 저장 순서

segment finalize 순서는 다음으로 고정한다.

```text
partial media close/fsync
  -> final media atomic rename
  -> segment_finalized JSONL append/fsync
  -> SQLite transaction projection
  -> read service 공개
```

삭제 순서는 다음으로 고정한다.

```text
deletion_requested JSONL append/fsync
  -> SQLite deletion_pending
  -> media unlink
  -> deletion_completed/tombstone JSONL append/fsync
  -> SQLite deleted/tombstone
```

journal append가 실패하면 파괴적 transition을 진행하지 않는다. media rename 뒤 journal
전 기록에 crash가 발생한 orphan은 시작 복구 scan이 checksum과 container 검사를 통과한
경우에만 `recovered_segment_finalized`로 다시 연결한다.

### API와 우선순위

- `GET /ops/api/recordings/status`
- `GET /ops/api/recordings/timeline?channelId=&startTimeMs=&endTimeMs=&offset=&limit=`
- `GET /ops/api/recordings/media/{segmentId}` (`Range`/`HEAD` 지원)

timeline은 `startTimeMs DESC`, `displayPriority DESC`, `segmentId ASC`로 안정 정렬한다.
`event=200`, `continuous=100`으로 고정하고, 겹치는 continuous 항목에는
`supersededByEventIds`를 채운다. UI는 event 항목을 기본 펼침·재생 대상으로 사용하고
continuous 항목은 원본/대체 항목으로 접는다. media URL은 catalog ID만 받으며 filesystem
path를 응답에 노출하지 않는다.

---

## Task 0: V410-S00 표준·오픈소스·IP 게이트와 source baseline 정렬

**수정 파일:**

- 수정: `VERSION`
- 수정: `CMakeLists.txt`
- 수정: `README.md`
- 수정: `README.en.md`
- 수정: `docs/README.md`
- 수정: `docs/en/README.md`
- 수정: `docs/development-backlog.md`
- 수정: `docs/v410-v49-recording-search-roadmap.md`
- 수정: `docs/versioning-policy.md`
- 수정: `docs/release-policy.md`
- 수정: `docs/public-repo-final-review.md`
- 수정: `docs/ui-guide.md`
- 수정: `docs/assets/ui/README.md`
- 수정: `config/docs_ui_assets.json`
- 수정: `scripts/internal/verify_docs_ui_assets.mjs`
- 수정: `scripts/internal/verify_release_metadata_consistency.mjs`
- 수정: `docs/superpowers/specs/2026-09-02-v410-recording-search-foundation-design.md`
- 수정: `docs/superpowers/plans/2026-09-02-v410-recording-foundation-implementation-plan.md`
- 생성: `docs/research/v410-recording-storage-open-source-review.md`
- 생성: `docs/research/v410-recording-ip-risk-gate.md`
- 생성: `docs/release-evidence-v410.md`
- 생성: `scripts/internal/verify_v410_research_gate.sh`
- 생성: `scripts/internal/verify_v410_entry_baseline.sh`
- 수정: `server.sh`

### Step 1: 실패하는 문서 게이트를 먼저 작성한다

`verify_v410_research_gate.sh`는 다음 필드를 요구한다.

- 검토 자료별 URL, 고정 revision 또는 문서 버전, 확인일, license, 허용된 참고 범위
- `codeCopied=false`, `runtimeDependency=false`, `submodule=false`
- 표준과 공개 동작에서 채택한 의미, 채택하지 않은 기능
- 특허 위험 게이트의 접근 ID별 `허용/재설계/보류` 결정
- 위험 또는 불확실 판정 접근에는 특허 번호·청구항·구현 상세를 제품 설계 문서에 복제하지
  않았다는 clean-room 확인
- 이 기록이 법률 의견이나 FTO를 대체하지 않는다는 경계

먼저 실행해 필요한 문서가 없어서 실패하는 것을 확인한다.

```bash
./server.sh verify-v410-research-gate
```

예상: non-zero, `v4.1 recording research gate document missing`.

### Step 2: 안전한 조사 문서를 작성한다

공식 GStreamer, ONVIF Profile G/M/Analytics 문서와 license가 확인된 permissive 공개 구현만
검토한다. MyLocalLLM/VARuleLens는 원본 revision과 license 상태만 기록하고 코드를 가져오지
않는다. license가 없거나 불명확하면 `구현 참고 제외`로 판정한다.

특허 위험 검토는 제품 구현자가 특허 상세를 설계 입력으로 쓰지 않도록 별도 판정 결과만
받는다. `재설계/보류` 항목은 기능명과 결정만 남기고 해당 구현 상세 링크를 설계 문서에
추가하지 않는다.

### Step 3: source target을 4.1.0으로 맞춘다

- `VERSION`과 `project(... VERSION ...)`은 `4.1.0`으로 변경한다.
- current source target은 `v4.1.0`, latest published baseline은 `v4.0.0`으로 구분한다.
- 장기 로드맵과 세부 설계의 상태를 `사용자 승인 완료, 구현 미착수`로 바꾼다.
- `verify-v410-entry-baseline`은 branch, source version, current roadmap, latest published
  baseline의 서로 다른 의미를 검사한다.

### Step 4: focused 검증과 문서 검증을 실행한다

```bash
./server.sh verify-v410-research-gate
./server.sh verify-v410-entry-baseline
./server.sh verify-release-metadata
./server.sh verify-docs-ui-assets
./server.sh verify-docs-links
./server.sh verify-script-inventory
git diff --check
```

### Step 5: evidence와 커밋 경계를 기록한다

`docs/release-evidence-v410.md`에 `V410-S00`의 구현 위치, 실행 명령, 결과, 미실행 테스트를
기록한다.

사용자가 이 단계 커밋을 명시 승인한 경우에만:

```bash
git add VERSION CMakeLists.txt README.md README.en.md config/docs_ui_assets.json docs/README.md docs/en/README.md docs/development-backlog.md docs/v410-v49-recording-search-roadmap.md docs/versioning-policy.md docs/release-policy.md docs/public-repo-final-review.md docs/ui-guide.md docs/assets/ui/README.md docs/research/v410-recording-storage-open-source-review.md docs/research/v410-recording-ip-risk-gate.md docs/release-evidence-v410.md docs/superpowers/specs/2026-09-02-v410-recording-search-foundation-design.md scripts/internal/verify_v410_research_gate.sh scripts/internal/verify_v410_entry_baseline.sh scripts/internal/verify_docs_ui_assets.mjs scripts/internal/verify_release_metadata_consistency.mjs server.sh
git commit -m "docs: v4.1.0 녹화 연구 게이트 고정"
```

---

S01~S05의 verifier와 `server.sh` dispatch는 구현되어 실제 명령으로 승격됐다. S06~S09의
`planned-command`는 해당 단계에서 verifier와 dispatch를 함께 구현한 뒤 실행 명령으로
승격할 계획 ID이며 현재 실행 가능한 명령이나 PASS 증거가 아니다.

## Task 1: V410-S01 녹화 v1 계약과 golden fixture

**수정 파일:**

- 생성: `include/recording/recording_contracts.h`
- 생성: `src/recording/recording_contracts.cpp`
- 생성: `include/recording/recording_store_port.h`
- 생성: `test/fixtures/recording/v1/segments.jsonl`
- 생성: `test/fixtures/recording/v1/event-links.jsonl`
- 생성: `test/fixtures/recording/v1/observations.jsonl`
- 생성: `test/fixtures/recording/v1/tombstones.jsonl`
- 생성: `scripts/internal/recording_contract_smoke.cpp`
- 생성: `scripts/internal/verify_v410_recording_contracts.sh`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/release-evidence-v410.md`

### Step 1: RED 계약 test를 작성한다

smoke는 다음을 먼저 요구하고 구현 전 compile 또는 assertion 실패를 확인한다.

- 모든 opaque ID가 빈 값·path·SQLite rowid가 아님
- UTC 반개구간과 PTS/timebase round-trip
- unknown optional field가 있는 v1 JSON을 읽고 known field를 보존
- lifecycle enum의 알 수 없는 값은 playable로 승격되지 않음
- fixture serialize → parse → serialize semantic parity
- tombstone ID 재사용 거부

```bash
./server.sh verify-v410-recording-contracts
```

### Step 2: exact C++ 계약을 구현한다

`recording_contracts.h`의 public type은 다음 경계를 가진다.

```cpp
namespace recording {
enum class RecordingRetentionClass { Continuous, Event };
enum class RecordingLifecycle { Writing, Finalized, DeletionPending, Deleted, Corrupt };

struct MediaTimeV1 {
    std::int64_t utc_ms{0};
    std::int64_t pts{0};
    std::int32_t time_base_num{1};
    std::int32_t time_base_den{1000000000};
};

struct RecordingSegmentV1 {
    std::string schema{"media-server.recording-segment.v1"};
    std::string segment_id;
    std::string source_id;
    std::string channel_id;
    std::string stream_epoch_id;
    MediaTimeV1 start;
    MediaTimeV1 end;
    std::string container;
    std::vector<std::string> video_codecs;
    std::vector<std::string> audio_codecs;
    std::string audio_omitted_reason;
    std::uint64_t size_bytes{0};
    std::string checksum_sha256;
    RecordingRetentionClass retention_class{RecordingRetentionClass::Continuous};
    RecordingLifecycle lifecycle{RecordingLifecycle::Writing};
    bool pinned{false};
    std::int64_t created_at_ms{0};
    std::int64_t finalized_at_ms{0};
};

struct FrameLocatorV1 {
    std::string schema{"media-server.frame-locator.v1"};
    std::string segment_id;
    MediaTimeV1 frame;
    std::optional<std::uint64_t> frame_index;
    std::optional<std::int64_t> keyframe_pts;
};

struct EventRecordingLinkV1;
struct AnalysisObservationV1;
struct RecordingTombstoneV1;
}
```

`EventRecordingLinkV1`은 requested range, ordered overlap, derived segment, fallback evidence,
missing ranges, `complete/partial/failed/pending` 상태를 가진다. `AnalysisObservationV1`은
track/class/confidence/normalized bbox/zone/line/rule/scenario/event와 `selection_reason`을
가진다. `RecordingTombstoneV1`은 삭제 전 source/channel/range/checksum과 삭제 사유를
가진다.

### Step 3: 저장 port를 고정한다

```cpp
class RecordingStorePort {
public:
    virtual ~RecordingStorePort() = default;
    virtual bool FinalizeSegment(const RecordingSegmentV1&, const std::string& media_path,
                                 std::string* error) = 0;
    virtual bool PutEventLink(const EventRecordingLinkV1&, std::string* error) = 0;
    virtual bool PutObservation(const AnalysisObservationV1&, std::string* error) = 0;
    virtual bool RequestDeletion(const std::string& segment_id, const std::string& reason,
                                 std::string* error) = 0;
    virtual bool CompleteDeletion(const RecordingTombstoneV1&, std::string* error) = 0;
    virtual std::vector<RecordingSegmentV1> QuerySegments(
        const std::string& channel_id, std::int64_t start_ms, std::int64_t end_ms) const = 0;
};
```

filesystem path는 internal port 인자로만 사용하고 JSON serializer에 넣지 않는다.

### Step 4: GREEN과 문서 기록

```bash
./server.sh verify-v410-recording-contracts
./server.sh verify-docs-links
git diff --check
```

evidence에는 각 type의 파일/serializer/parser/test fixture를 연결한다. 승인 시에만:

```bash
git add include/recording/recording_contracts.h include/recording/recording_store_port.h src/recording/recording_contracts.cpp test/fixtures/recording/v1 scripts/internal/recording_contract_smoke.cpp scripts/internal/verify_v410_recording_contracts.sh CMakeLists.txt server.sh docs/release-evidence-v410.md
git commit -m "feat: v4.1 녹화 영속 계약 추가"
```

---

## Task 2: V410-S02 채널 정책, Recorder subscriber와 segment writer

**수정 파일:**

- 생성: `include/core/recording_runtime_defaults.h`
- 생성: `include/core/recording_runtime_config_data.h`
- 수정: `include/app_config.h`
- 수정: `src/app_config.cpp`
- 수정: `include/ingress/source_view_registry.h`
- 수정: `src/ingress/source_view_registry.cpp`
- 수정: `include/ingress/source_view_application_service.h`
- 수정: `src/ingress/source_view_application_service.cpp`
- 수정: `src/ingress/product_ui_ops_sources_script.cpp`
- 수정: `include/core/shared_stream.h`
- 수정: `src/core/shared_stream.cpp`
- 수정: `include/core/session_manager.h`
- 수정: `src/core/session_manager.cpp`
- 생성: `include/recording/segment_writer.h`
- 생성: `include/recording/gstreamer_segment_writer.h`
- 생성: `src/recording/gstreamer_segment_writer.cpp`
- 생성: `include/recording/recording_session_service.h`
- 생성: `src/recording/recording_session_service.cpp`
- 생성: `scripts/internal/recording_segment_writer_smoke.cpp`
- 생성: `scripts/internal/verify_v410_recording_recorder.sh`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/config-reference.md`
- 수정: `docs/release-evidence-v410.md`

### Step 1: RED 설정·segment test를 작성한다

fixture packet으로 다음을 실패시키는 test부터 만든다.

- global 또는 channel disabled이면 파일·subscriber 생성 0
- enabled인데 quota 0, root 중복/쓰기 불가이면 validation 실패
- H.264 keyframe 두 개 사이에서 MP4 한 개 finalize
- VP8 keyframe 두 개 사이에서 WebM 한 개 finalize
- delta frame으로 시작하지 않고 cached GOP의 첫 keyframe부터 기록
- 10초 도달 뒤 다음 keyframe에서만 분할
- source PTS rollback 시 새 `stream_epoch_id`
- subscriber queue overflow가 live client queue를 막지 않음
- final callback 전 `.partial`, callback 뒤 final path만 존재

```bash
planned-command verify-v410-recording-recorder
```

### Step 2: Recorder role을 additive하게 추가한다

`SharedStream::SubscriberRole`에 `Recorder`를 추가하고 다음 API를 만든다.

```cpp
bool AddRecordingSubscriber(const std::string& subscriber_id, SubscriberCallback callback);
std::size_t RecordingSubscriberCount() const;
```

`RefCount()`는 계속 client만, `AnalysisSubscriberCount()`는 analysis만 센다.
`TotalSubscriberCount()`는 recorder까지 포함해 녹화 중 source가 idle cleanup되지 않게 한다.
runtime debug label은 `client/analysis/recorder` 세 값을 정확히 구분한다.

`SessionManager::SourceEgressStats`와 runtime snapshot에는
`recording_subscriber_count`, `active_recording_channels`를 additive field로 추가한다.

### Step 3: source registry 녹화 정책을 구현한다

`SourceRecord`와 application DTO에 `RecordingPolicy` nested struct를 추가한다. create/upsert,
save/load, snapshot, Ops sources form이 같은 값을 round-trip해야 한다. viewer-safe client view
응답에는 quota와 storage path를 노출하지 않는다.

source가 disabled되면 recording policy가 enabled여도 recorder를 시작하지 않는다.
policy mutation은 저장 성공 뒤 Task 3에서 연결할 supervisor reconcile을 요청할 수 있도록
callback port를 둔다. 저장 실패 시 runtime reconcile을 호출하지 않는다.

### Step 4: writer와 session service를 구현한다

`SegmentWriter`는 GStreamer 세부를 숨긴다.

```cpp
class SegmentWriter {
public:
    using FinalizedCallback = std::function<void(RecordingSegmentV1, std::string media_path)>;
    virtual ~SegmentWriter() = default;
    virtual bool Start(const std::string& channel_id,
                       const std::string& stream_epoch_id,
                       const media::StreamDescriptor& descriptor,
                       FinalizedCallback on_finalized,
                       std::string* error) = 0;
    virtual void Push(const media::Packet& packet, std::int64_t observed_utc_ms) = 0;
    virtual void Stop() = 0;
};
```

`RecordingSessionService`는 `AnalysisSessionService`와 같은
`AcquireAuxiliaryStream → AddRecordingSubscriber → StartAuxiliaryStream` 순서를 쓴다.
채널당 subscriber 한 개만 허용하고 detach 시 subscriber 제거 후
`ReleaseAuxiliaryStreamWhenIdle`을 정확히 한 번 호출한다.

writer는 descriptor가 준비되고 첫 video keyframe이 들어올 때 시작한다. codec 조합별
parser와 muxer 선택은 전역의 미디어 형식 표를 따른다. writer callback은 Task 1의
`RecordingStorePort` fake로 test하고 production wiring은 Task 3에서 연결한다.

### Step 5: focused 검증과 문서 기록

```bash
planned-command verify-v410-recording-recorder
./server.sh verify-v410-recording-contracts
./server.sh verify-docs-links
git diff --check
```

승인 시에만 이 단계 파일을 stage하고 다음 메시지로 커밋한다.

```bash
git commit -m "feat: 채널별 상시녹화 segment writer 추가"
```

---

## Task 3: V410-S03 JSONL 원장, SQLite projection과 supervisor wiring

**수정 파일:**

- 생성: `include/recording/recording_journal.h`
- 생성: `src/recording/recording_journal.cpp`
- 생성: `include/recording/recording_catalog.h`
- 생성: `src/recording/recording_catalog.cpp`
- 생성: `include/recording/recording_supervisor.h`
- 생성: `src/recording/recording_supervisor.cpp`
- 수정: `src/application/media_server_application.cpp`
- 생성: `scripts/internal/recording_catalog_smoke.cpp`
- 생성: `scripts/internal/verify_v410_recording_catalog.sh`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/release-evidence-v410.md`

### Step 1: RED journal/catalog test를 작성한다

- 같은 mutation을 두 번 replay해도 row와 합계가 증가하지 않음
- truncated 마지막 JSONL line은 skip하고 앞의 durable mutation은 보존
- 중간 corrupt line은 오류 count를 남기며 정상 line projection은 계속
- SQLite on/off가 같은 range query ID·순서·상태를 반환
- foreign key 위반 event link는 transaction 전체 rollback
- final media는 있지만 journal이 없는 orphan을 정상/손상으로 구분
- SQLite 파일 손상 시 원본을 덮어쓰지 않고 격리한 뒤 journal rebuild

```bash
planned-command verify-v410-recording-catalog
```

### Step 2: append-only mutation envelope를 구현한다

```json
{
  "schema": "media-server.recording-mutation.v1",
  "mutationId": "opaque-id",
  "mutationType": "segment_finalized",
  "occurredAtMs": 0,
  "entityId": "segment-id",
  "payload": {}
}
```

지원 mutation은 `segment_finalized`, `event_link_created`, `observation_put`,
`deletion_requested`, `deletion_completed`, `corruption_detected`다. `mutation_id` unique로
idempotency를 보장한다. append는 process mutex 아래 한 줄 write + flush + fsync로 닫는다.

### Step 3: SQLite schema와 fallback projection을 구현한다

schema version 1의 table은 다음으로 고정한다.

- `recording_meta(key PRIMARY KEY, value)`
- `recording_mutations(mutation_id PRIMARY KEY, type, occurred_at_ms, entity_id)`
- `recording_segments(segment_id PRIMARY KEY, source_id, channel_id, stream_epoch_id,
  start_utc_ms, end_utc_ms, start_pts, end_pts, time_base_num, time_base_den, container,
  codecs_json, size_bytes, checksum_sha256, retention_class, lifecycle, pinned,
  hold_count, media_relpath, created_at_ms, finalized_at_ms)`
- `recording_event_links(link_id PRIMARY KEY, event_id UNIQUE, channel_id,
  requested_start_ms, requested_end_ms, derived_segment_id, fallback_ref, completeness,
  missing_ranges_json, display_priority)`
- `recording_event_link_segments(link_id, segment_id, overlap_start_ms, overlap_end_ms,
  PRIMARY KEY(link_id, segment_id))`
- `recording_observations(observation_id PRIMARY KEY, channel_id, segment_id, utc_ms, pts,
  track_id, class_id, class_name, confidence, bbox_json, event_id, selection_reason,
  payload_json)`
- `recording_tombstones(entity_id PRIMARY KEY, entity_kind, channel_id, start_utc_ms,
  end_utc_ms, deleted_at_ms, reason, retention_class, checksum_sha256)`

필수 index는 segment channel/range, retention class/end time, observation
channel/time/track, event_id다. SQLite는 WAL과 foreign key를 켠다. compile-time SQLite가
없으면 in-memory projection을 journal replay로 만들고 `catalogMode=jsonl-fallback`을
status에 표출한다.

### Step 4: supervisor를 production에 연결한다

composition root 순서는 다음으로 고정한다.

```text
RecordingJournal open/recover
  -> RecordingCatalog rebuild/open
  -> RecordingSessionService 생성
  -> SourceView snapshot으로 RecordingSupervisor::Start
  -> HTTP/RTSP server Start
```

종료는 HTTP/RTSP ingress를 먼저 닫고 supervisor가 writer를 finalize한 뒤 catalog/journal을
닫는다. `StopEventStorage()`는 녹화 bridge가 해제된 다음 호출한다.

supervisor는 시작 시 enabled source를 reconcile하고, source registry 저장 callback과 5초
safety reconcile에서 추가/변경/disabled channel을 반영한다. 같은 policy revision의 중복
reconcile은 subscriber를 재생성하지 않는다.

### Step 5: GREEN과 parity evidence

```bash
planned-command verify-v410-recording-catalog
planned-command verify-v410-recording-recorder
git diff --check
```

evidence에 SQLite 사용/미사용 두 결과를 별도 기록한다. 승인 시에만:

```bash
git commit -m "feat: 녹화 journal과 SQLite catalog 연결"
```

---

## Task 4: V410-S04 보존 등급, 순환 삭제와 disk reserve

**수정 파일:**

- 생성: `include/recording/retention_coordinator.h`
- 생성: `src/recording/retention_coordinator.cpp`
- 수정: `include/recording/recording_catalog.h`
- 수정: `src/recording/recording_catalog.cpp`
- 수정: `include/recording/recording_supervisor.h`
- 수정: `src/recording/recording_supervisor.cpp`
- 생성: `scripts/internal/recording_retention_smoke.cpp`
- 생성: `scripts/internal/verify_v410_recording_retention.sh`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/config-reference.md`
- 수정: `docs/release-evidence-v410.md`

### Step 1: RED 보존 test를 작성한다

- continuous quota 초과 시 `end_utc_ms, segment_id`가 가장 작은 항목부터 삭제
- event quota와 continuous quota가 서로의 artifact를 삭제하지 않음
- pinned event와 `hold_count>0` continuous는 자동 삭제 대상 아님
- unlink 실패 시 `deletion_pending` 유지, 회수 byte 0
- journal 실패 시 media unlink 미호출
- reserved free space가 부족하면 eligible continuous를 먼저 정리
- 더 지울 수 없으면 해당 channel만 `storage-blocked`, live/analysis 정상
- 공간이 회복되면 새 keyframe부터 자동 재개하고 epoch를 새로 발급
- tombstone은 남고 media path와 원본 bytes는 남지 않음
- 새 segment 예상 용량까지 continuous quota에 반영
- 채널 간 in-flight reserve 중복 승인 차단과 finalize/실패 반환
- tombstone 기록 실패 pending을 다음 tick에서 idempotent 재시도
- replay와 unlink 직전 storage-root canonical containment 검사
- 명시한 음수·비정상 quota/기간 입력 거부
- 검사와 unlink 사이 상위 디렉터리 교체를 dirfd 결박으로 방어
- 한 채널의 pending 실패가 다른 채널 admission과 주기 cleanup을 막지 않음
- partial 실제 쓰기량과 in-flight 예약을 중복 차감하지 않음
- event quota 초과와 continuous writer admission을 독립 판정
- SQLite 실시간 projection 실패 시 JSONL fallback과 재시작 rebuild

```bash
./server.sh verify-v410-recording-retention
```

### Step 2: 순수 selection과 side effect 실행을 분리한다

`RetentionCoordinator::Plan()`은 catalog snapshot과 filesystem space를 입력받아 삭제 ID와
사유만 반환하는 순수 단계로 만든다. `Apply()`가 journal → state → unlink → tombstone을
수행한다. test는 selection 순서와 side effect failure를 각각 주입한다.

cleanup 사유는 `continuous-capacity`, `continuous-age`, `event-capacity`, `event-age`,
`reserved-free-space`, `manual-corrupt-cleanup`으로 제한한다. continuous quota 정리에서
event artifact를 선택하는 코드는 허용하지 않는다.

### Step 3: writer admission과 주기 cleanup을 연결한다

새 segment를 열기 전 예상 최대 한 segment와 reserved bytes를 확인한다. 공간 부족이면
즉시 retention을 한 번 실행한다. 복구하지 못하면 현재 channel writer만 멈추고 status에
필요 byte, 현재 free byte, eligible count, 마지막 오류를 남긴다.

예상 segment byte는 continuous quota 선택에도 포함한다. admission은 채널 전체의
in-flight reserve를 하나의 lock 안에서 검사·등록하고 writer가 partial/final 실제 크기를
보고하며 finalize하거나 open/finalize에 실패하면 실제 byte 또는 0으로 반환한다.
container overhead를 포함한 예약 상한을 넘기기 전 segment를 닫고 다음 keyframe에서
새 epoch로 재개한다. EOS 뒤 실제 파일이 예약보다 크면 finalize하지 않고 제거하며 실제
크기를 다음 admission high-water로 반영한다. catalog journal/finalize 실패도 final 파일을
삭제하거나 0 byte로 만들고, 둘 다 실패하면 예약을 반환하지 않는다. final media를 열기
전 storage root dirfd의 `openat(O_NOFOLLOW|O_EXCL)`로 cleanup-pending 마커를 만들고 file과
parent directory까지 fsync한다. catalog 성공 또는 cleanup 뒤 마커 안전 제거와 directory
fsync까지 성공해야 예약을 반환한다. 재시작 catalog는 추적 media를 보존하고 미추적
partial과 마커만 안전하게 정리한다. 소유권을 증명할 수 없는 final은 삭제하지 않고 orphan
진단에 남기며, 안전하게 정리할 수 없으면 open을 fail-closed한다. journal을 남긴 뒤 실제 삭제는 recording root에서 연 dirfd를
하위 디렉터리마다 `O_NOFOLLOW`로 결박한 뒤 `unlinkat`으로 수행한다.

### Step 4: GREEN과 문서 기록

```bash
./server.sh verify-v410-recording-retention
./server.sh verify-v410-recording-catalog
git diff --check
```

승인 시에만:

```bash
git commit -m "feat: 녹화 순환 보존과 용량 보호 추가"
```

---

## Task 5: V410-S05 이벤트 segment 연결, 파생 clip과 frame-buffer fallback

### 승인된 잔여 통합 검증 실행 결과 (2026-09-04)

선행 구현을 `d7ee14a1`로 먼저 커밋했다. 제품 코드 추가 변경 없이 실제 저장 큐의
JSONL 비활성/활성·queue=2에서 퇴출·5개 내구 PTS 연결 보존을 검증했다.
별도 프로세스에서 새 SQLite를 journal로 재구축하고 후행 H264 source로 5개씩 실제
파생·재접수 멱등성을 확인했다. `event_storage_recording_runtime_smoke.cpp`와
`verify_v410_event_storage_recording_runtime.mjs`를 기존 S05 명령에 필수 연결하고,
I02에 20개 check를 선등록했다. 기존 고정 action ID 27개를 유지한다.
실제 runtime 20/0·mutation 2/0, C++ 140/0·application 7/0·등록기 단위 26/0·
action 27/0(check 89개). mutation 로그 소비자 보강의 TDD RED/수정 이력 및 최종 결과는
[테스트 기록](../../release-test-records.md)에 남긴다. S06 이후는 착수하지 않는다.

### 중단 재개 보정 계획 (2026-09-04)

1. 개별 테스트 등록을 S08로 미룬 위반을 FAIL 이력으로 보존하고 완료 표기를 보류한다.
2. S05 고정 ID 27개와 네 테스트 영역·UI 부재·입력/판정/check 연결을 실행 전에 등록한다.
3. 등록기 negative 테스트 뒤 실제 assertion별 출력과 중앙 inventory 필수 연결을 구현한다.
4. S05·S01~S04·빌드·문서 검증을 재실행하고 개별 결과를 release-test-records에 기록한다.
5. 기존 canonical 986개 trust 변화는 독립 검토 후 공식 producer로만 재결속한다.
6. S06은 착수하지 않는다. 최신 명시 승인 없이 커밋·푸시·release action을 수행하지 않는다.

**수정 파일:**

- 수정: `include/analysis/event_storage.h`
- 수정: `src/analysis/event_storage.cpp`
- 생성: `include/recording/event_recording_bridge.h`
- 생성: `src/recording/event_recording_bridge.cpp`
- 생성: `include/recording/event_clip_deriver.h`
- 생성: `src/recording/event_clip_deriver.cpp`
- 수정: `src/application/media_server_application.cpp`
- 생성: `scripts/internal/event_recording_link_smoke.cpp`
- 생성: `scripts/internal/verify_v410_event_recording.sh`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/release-evidence-v410.md`

### Step 1: RED 이벤트 연동 test를 작성한다

- event pre/event/post가 3개 continuous segment에 걸치면 overlap이 시간순 3개
- 경계가 정확히 맞닿기만 한 segment는 반개구간 overlap에 포함하지 않음
- derived clip 생성 동안 overlap segment `hold_count` 증가, 완료/실패 뒤 감소
- compatible codec은 remux하고 video 재인코딩하지 않음
- continuous gap이 있으면 기존 frame-buffer clip path를 fallback으로 기록
- 일부만 확보한 경우 `partial`과 missing range를 반환하고 `complete`로 표시하지 않음
- 같은 event update 재수신은 같은 link를 갱신하며 파생 clip을 중복 생성하지 않음
- event quota가 가득 차면 continuous를 지우지 않고 event policy에 따라 oldest eligible
  event만 처리

```bash
./server.sh verify-v410-event-recording
```

### Step 2: EventStorage에 narrow bridge를 추가한다

`event_storage.cpp`가 녹화 catalog 구현을 직접 include하지 않게 다음 port만 선언한다.

```cpp
struct EventRecordingBridgeResult {
    bool handled{false};
    bool derived_clip_ready{false};
    std::string clip_path;
    std::string link_id;
    std::string completeness;
    std::string error;
};

class EventRecordingBridge {
public:
    virtual ~EventRecordingBridge() = default;
    virtual EventRecordingBridgeResult TryResolve(
        const AnalysisResult&, const EventRecord&, const EventMediaHookOptions&) = 0;
    virtual void RecordFallback(const EventRecord&, const EventRecordingBridgeResult&) = 0;
};
```

process-lifetime bridge는 application composition root가 등록·해제한다. `ApplyMediaHooks`는
derived clip이 ready면 기존 FileEventClipHook을 생략한다. not-handled/partial/failure이면
기존 bounded frame-buffer hook을 실행한 뒤 `RecordFallback`으로 최종 link를 갱신한다.
EventRecord JSON 기존 필드는 유지하고 `recordingLinkId`, `recordingCompleteness`를 optional로
추가한다.

### Step 3: PTS event 시간을 UTC로 매핑한다

internal event의 기존 `start_time_ms/update_time_ms/end_time_ms`가 media PTS millisecond인
경우 명시 anchor의 delta로 UTC를 계산한다. anchor가 없으면 media PTS 범위를 별도 보존하고
같은 epoch의 finalized segment가 가진 실제 PTS/UTC mapping으로만 승격한다. 외부 dispatch에는
additive `timeBasis`를 추가해 `utc-ms` 또는 `media-pts-ms`를 명시하게 한다. 값이 없으면
기존 호환은 유지하되 recording link는 `time-basis-ambiguous`로 두고 임의 UTC 연결을 하지
않는다.

### Step 4: 파생 clip을 작성한다

source segment를 직접 이어 붙이지 않고 GStreamer demux/parser/MPEG-TS mux pipeline으로
요청 범위를 remux한다. 첫 seek는 앞선 keyframe까지 넓힐 수 있으므로 실제 출력 packet의
timestamp를 측정해 manifest에
`requestedStartMs`, `actualStartMs`, `requestedEndMs`, `actualEndMs`를 모두 기록한다.
완료된 event clip은 새 `RecordingSegmentV1`이며 retention class `Event`다.

### Step 5: GREEN과 회귀 검증

```bash
./server.sh verify-v410-event-recording
./server.sh verify-v410-recording-retention
./server.sh verify-v410-recording-catalog
git diff --check
```

승인 시에만:

```bash
git commit -m "feat: 이벤트 녹화 연결과 파생 clip 추가"
```

### 구현 결과

- `EventStorage`는 JSONL 저장 활성화 여부와 독립적으로 process-lifetime bridge가 있으면
  이벤트를 bounded worker에 전달한다. bridge는 `shared_ptr` snapshot으로 등록·해제하며
  storage worker에서 remux를 직접 실행하지 않는다.
- internal media event는 `media-pts-ms`와 UTC/PTS anchor·stream epoch를 함께 넘기고, 외부
  application DTO는 시간축이 비어 있으면 임의 UTC로 해석하지 않는다.
- keyed 비동기 worker는 같은 event update를 하나의 결정적 link/segment ID로 합치고,
  finalized continuous source lease와 Event 전용 quota reservation을 얻은 뒤 파생한다.
- GStreamer deriver는 검증된 video-only H.264/MP4 overlap을 demux/parser/MPEG-TS mux로
  연결하고 video decoder와 encoder를 사용하지 않는다. VP8/WebM event 파생은 S05에서
  fail-closed해 frame-buffer fallback으로 보낸다. source/output fd 결박, owner-only
  `.partial.<uuid>`, 이를 지목하는 durable v2 cleanup marker, inode 재검증, no-replace
  publish, fsync, SHA-256을 적용한다. catalog 재시작은 v2 marker가 지목한 단일-link
  partial만 정리하고 v1/foreign final·partial은 보존한다.
- complete link에는 source overlap, 요청/실제 범위, `remux-no-video-reencode`를 기록한다.
  gap·epoch/codec 불일치·lease 실패는 partial/failed 경계와 missing range로 남기고 기존
  frame-buffer 결과를 같은 link의 fallback evidence로 갱신한다.
- 제품 종료는 ingress 정지 → continuous writer finalize → EventStorage drain → event bridge
  drain/해제 순서다. bridge는 외부 ingress 시작 전에 등록한다. 재시작 시 pending link를 재대기시키고 이미 finalized된 결정적 event
  segment가 있으면 재파생하지 않고 link만 복구한다.
- EventRecord bounded queue가 포화되기 전에 durable link를 먼저 기록하고 keyed worker의
  pending은 후속 슬롯으로 다시 흡수한다. SHA-256 결정 ID로 긴 공통 prefix 충돌을 막고,
  complete event 범위가 넓어지면 범위 결속 ID로 새 파생물을 만든다. provisional fallback에는
  내부 media locator를 함께 남긴다.
- marker 제거와 terminal link 기록이 끝날 때까지 source/output hold와 Event reservation을
  유지한다. marker 제거 뒤 terminal resource-release pending을 먼저 기록하고 hold와
  reservation 해제가 모두 성공해야 complete로 승격한다. 실제 remux 중에는 admission lock을
  풀어 다른 event의 durable link 기록을 막지 않는다. tombstone ID 재사용은 거부하며,
  소유권을 증명할 수 없는 기존 final은 삭제하지 않고 orphan 진단에 남긴다.
- terminal 미완료 link의 source/output은 hold가 해제됐어도 catalog가 삭제 요청을 차단한다.
  복구 중 event/fallback update는 단계와 소유 자원을 보존하고 UTC 확장 요청은 additive
  `deferred_requested_range`로 journal 대기한 뒤 기존 자원 정리 후 새 파생으로 전환한다.
- anchor 없는 후속 PTS도 기존 epoch의 segment map으로 변환한다. map이 아직 없으면
  `deferred_media_pts_range_ms`로 별도 내구 대기한다. 복구할 finalized 파생물이 없는 경우
  보류 UTC/PTS 요청을 먼저 소비해 실패·부분 완료 전이가 무한 재시도에 남지 않게 한다.
- focused 결과: `verify-v410-event-recording` C++ `pass=140 fail=0`과 EventStorage
  application-only 계약 `6/0`, contracts `45/0`, retention `56/0`, recorder `71/0`, catalog
  `45/0`과 composition 정적 항목 9건, 제품 build를 확인했다. UI·장시간·release action은 이 결과에
  포함하지 않는다.

---

## Task 6: V410-S06 event 우선 timeline API, Range 재생과 Ops UI

**현재 상태(2026-09-08): S06 구현·단계 검증 완료, 잔여 6번 문서 마감.**

event 우선 읽기 서비스·권한별 상태/timeline·opaque media 해석·GET/HEAD Range·전송 gate와
Ops 필터/목록/재생 UI를 구현했다. 잔여 1~5번은 afb6c5a3, 9de62e0e, f03ec0a6,
a4a02991, 4da626e6으로 분할 커밋했다. 제품/검증 구현 위치와 개별 결과는
[실행 기록](../../release-test-records.md)의 S06 잔여 3~6번을 따른다.
1970은 검증 fixture의 epoch 시간이며 운영 녹화 시간은 변경하지 않았다.
S06 범위 직접 UI와 관련 회귀 통과는 버전 전체 UI·30분/120분 PASS가 아니다.
S07과 릴리즈 action은 이번 문서 마감 범위 밖이다.

다음 승인·RED·준비 설명은 과거 이력이며 현재 작업 상태가 아니다.

**2026-09-06 재개 승인 이력:** 사용자가 S06 구현·안정화·분할/최종 커밋·푸시와
실패 수정 후 계속 진행을 승인했다. `de84cca6ee262d76c882650c266ce8bbb56add37`의 검증 준비
체크포인트에서 기존 단일 Sol/xhigh 담당자를 재사용한다. 실제 UI 풀테스트와 30분/120분은
별도 승인 전 실행하지 않는다. 상태·timeline → 권한·opaque ID → fd/lease → Range/HEAD →
Ops UI 순서로 구현하고 기존 S01~S05 계약을 유지한다. 다음은 이전 실행 이력이다.

**이전 검증 준비:** 개별 ID 34개를 사전 등록하고
단일 Sol xhigh 담당자가 verifier 초안 2개를 작성했다. 첫 focused 실행은 서버 시작 전
loopback bind EPERM으로 실패해 예상된 RED로 인정하지 않고 중단했다. 메인은 임시 root
삭제·부재와 초안의 RED·PASS·정리 판정 보완 사항을 확인했다. 구현·회귀·UI 풀테스트는
미실행이며 커밋·푸시도 하지 않았다. 실제 명령과 실패 기록은 release-test-records의 S06 절을 따른다.
이후 사용자가 초안 보완·동일 focused 재개를 승인했다. 내부 보조 H01~H03으로 판정·정리
회귀를 등록하고 기존 단일 담당자와 재개한다. 제품 구현이나 S06 통과를 뜻하지 않는다.
재개 결과 H01~H03 3개·12검사 통과, 실제 I01 status 404에 도달했다. 그러나 port 확인
반환값 누락과 최종 성공 조건 누락으로 cleanup PASS/closed false 불일치가 발생해 중단했다.
당시 실제 PID·port·root 부재는 별도 확인했다. 이후 추가 승인으로 메인이 반환값과
미확인 증거 거부를 보완했다. H01~H03/H03-R01/R02 5개·40검사 통과, 같은 I01에서
HTTP 404 예상 RED와 정상 종료·두 포트 ECONNREFUSED·root 삭제를 확인했다.
이전 두 실패 이력은 유지한다. I27·제품 구현·제품 build·인증·관련 제품 회귀는 미실행이며
현재 보완을 S06 기능 PASS로 확대하지 않는다.

**수정 파일:**

- 생성: `include/recording/recording_read_service.h`
- 생성: `src/recording/recording_read_service.cpp`
- 생성: `include/ingress/recording_application_service.h`
- 생성: `src/ingress/recording_application_service.cpp`
- 수정: `include/ingress/webrtc_http_server.h`
- 수정: `src/ingress/webrtc_http_server.cpp`
- 수정: `src/ingress/webrtc_http_server_runtime.cpp`
- 수정: `src/ingress/webrtc_http_server_detail.h`
- 수정: `src/ingress/product_ui_server_pages.cpp`
- 수정: `src/ingress/product_ui_page_scripts.cpp`
- 수정: `src/ingress/product_ui_css.cpp`
- 수정: `src/application/media_server_application.cpp`
- 생성: `scripts/internal/recording_timeline_smoke.cpp`
- 생성: `scripts/internal/verify_v410_recording_timeline.sh`
- 생성: `scripts/internal/verify_v410_recording_ui_contract.mjs`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/config-reference.md` (녹화 API 계약; 계획의 `docs/http-api.md`는 실제 부재)
- 수정: `docs/ui-guide.md` (기존 Ops 이벤트 직접 route의 녹화 사용 흐름)
- 수정: `docs/release-evidence-v410.md`

### Step 1: RED read/API/UI contract test를 작성한다

- 같은 범위 event/continuous가 있으면 event priority 200이 먼저
- continuous 응답에 정확한 `supersededByEventIds`
- deleted/corrupt/writing segment는 `playable=false`
- pagination cursor가 아닌 v4.1 offset/limit 안에서도 안정 정렬
- channel/time 범위를 벗어난 segment 미반환
- operator/admin 허용, viewer 또는 scope 없는 principal 거부
- media endpoint가 임의 path, `..`, symlink 탈출을 받지 않음
- `Range: bytes=...`에 206/Content-Range/Accept-Ranges, 잘못된 범위에 416
- media response가 전체 파일을 `HttpResponse::body`에 적재하지 않음
- Ops 이벤트 화면에 녹화 상태, timeline, event 우선 badge, 재생 control이 존재
- 자연어·vector 검색 input은 존재하지 않음

```bash
planned-command verify-v410-recording-timeline
planned-command verify-v410-recording-ui-contract
```

### Step 2: application DTO와 read service를 구현한다

`RecordingApplicationService`는 status, timeline query, opaque segment ID media resolve만
제공한다. `ResolvedRecordingMedia`의 absolute path는 transport 내부 DTO에만 있고 JSON에
serialize하지 않는다.

timeline item의 필수 JSON은 다음과 같다.

```json
{
  "segmentId": "opaque",
  "channelId": "1",
  "kind": "event",
  "displayPriority": 200,
  "startTimeMs": 0,
  "endTimeMs": 1,
  "eventId": "event-id",
  "completeness": "complete",
  "playable": true,
  "playbackUrl": "/ops/api/recordings/media/opaque",
  "supersededByEventIds": []
}
```

### Step 3: bounded Range sender를 구현한다

기존 `BuildHttpResponse`에 대용량 파일 body를 넣지 않는다. SSE와 같은 direct-send
경계에서 `SendFileRangeResponse(client_fd, request, resolved_media)`를 호출하고
`response_sent=true`로 표시한다. header를 먼저 보낸 뒤 `pread` 256KiB buffer로 지정
범위만 보낸다. catalog가 반환한 canonical root 내부 real path만 허용하고 전송 중 파일이
retention으로 지워지지 않도록 read lease를 잡는다.

### Step 4: `/ops/events`에 timeline을 추가한다

기존 direct-route 정책을 유지해 새 primary nav를 만들지 않는다. 녹화 상태 card, channel·시간
filter, event/continuous badge, completeness, quota 상태, `<video controls preload="metadata">`
재생을 추가한다. event card가 기본 선택되고 continuous 원본은 `원본 보기`로 펼친다.
검색 입력이나 후속 v4.2/v4.7 문구는 넣지 않는다.

### Step 5: GREEN과 문서 기록

```bash
planned-command verify-v410-recording-timeline
planned-command verify-v410-recording-ui-contract
./server.sh verify-docs-links
git diff --check
```

실제 UI 직접 조작은 이 static contract와 별도이며 Task 9의 사용자 승인 대상이다. 승인 시에만:

```bash
git commit -m "feat: 이벤트 우선 녹화 timeline과 재생 추가"
```

---

## Task 7: V410-S07 검색-ready 분석 관측과 FrameLocator

**현재 상태(2026-09-09): 구현·단계 검증 완료.** S06 마감 기준 db308d4d 위에서 구현했다.
실제 구현 위치·검증 결과는 `docs/release-evidence-v410.md` S07 절과
`docs/release-test-records.md` 최종 마감 기록을 따른다. S08은 미착수다.
사용자 승인 범위는 S07 구현·발견 문제 수정·단계 검증·문서 마감·커밋/푸시이며,
S08은 종료 보고에서 설명만 한다. 새 검색 UI·외부 저장소 의존성·장시간 검증은 포함하지 않는다.

### 실제 코드에 따른 안전 계약 보완

- 기존 AnalysisObservationV1은 frame_locator object가 필수이고 segment FK를 요구한다.
  기존 parser/serializer/fixture를 유지하고, 다중 선정 사유·track 요약·null locator는
  별도 AnalysisObservationV2 schema와 catalog/journal projection으로 추가한다.
- 같은 channel/track 번호라도 독립 tap/profile 또는 재시작이면 다른 객체다.
  내부 tracker namespace/generation과 stream epoch로 충돌을 막는다.
- decoded PTS를 처리 완료 wall clock이나 현재 epoch에 임의 결박하지 않는다.
  실제 keyframe 매핑·epoch·범위가 유일하게 검증될 때만 locator를 생성한다.
  모호함·공백은 null locator와 이유로 남긴다. 임의 frame index는 만들지 않는다.
- bounded 대기열에서 interval을 먼저 제거해 start/event/end를 우선한다.
  중요 관측만으로도 포화되면 명시적인 거부 수와 안전한 오류 코드를 기록한다.
  무제한 입력·저장 장애에도 nonblocking과 무손실을 동시에 보장한다고 주장하지 않는다.
- actual event_id는 EventRecord 생성 이후 narrow 내부 observer로 전달한다.
  기존 EventRecord/Event POST/SSE/WS/DataChannel 직렬화 계약은 변경하지 않는다.
- finalize callback은 빠른 알림만 전달하며 projector 쓰기·DB 조회를 동기 실행하지 않는다.
  종료 시 입력 해제·분석 종료·finalize·관측 drain의 수명을 직접 검증한다.

위 보완은 승인된 검색용 녹화 provenance 범위 안의 구현 결정이다.
실행 전 개별 항목과 RED/GREEN·실패/복구는 release-test-records에 등록·보존한다.

**수정 파일:**

- 수정: `include/analysis/analysis_types.h`
- 수정: `include/analysis/analysis_manager.h`
- 수정: `src/analysis/analysis_manager.cpp`
- 수정: `src/analysis/object_tracker.cpp`
- 생성: `include/recording/analysis_observation_projector.h`
- 생성: `src/recording/analysis_observation_projector.cpp`
- 수정: `src/application/media_server_application.cpp`
- 생성: `scripts/internal/recording_observation_smoke.cpp`
- 생성: `scripts/internal/verify_v410_recording_observations.sh`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/release-evidence-v410.md`

### Step 1: RED bounded observation test를 작성한다

- track 첫 관측은 `track-start`
- interval 전 중간 frame은 저장하지 않고 interval 도달 frame은 `interval`
- event-triggered frame은 interval과 무관하게 `event`
- tracker 제거 직전 track은 `track-end` summary 한 번
- 60초·30fps 입력에서 1초 interval인 단일 track 중간 observation은 최대 61개 수준으로
  bounded
- 각 observation FrameLocator가 실제 segment와 UTC/PTS 범위 안에 있음
- segment gap 또는 삭제 뒤에는 가짜 playable locator를 만들지 않음
- detector가 없거나 tracking disabled여도 recording path는 실패하지 않음

```bash
planned-command verify-v410-recording-observations
```

### Step 2: analysis result observer를 additive하게 추가한다

`AnalysisManager` 생성자에 optional `AnalysisResultObserver`를 주입하고, tap mutex를 놓은 뒤
immutable result copy를 observer에 전달한다. observer 지연·실패가 detector worker와 live
fan-out을 막지 않도록 bounded queue를 가진 `AnalysisObservationProjector`로 넘긴다.

`ObjectTracker::Update`는 제거 조건을 만족한 track을 지우기 전에
`AnalysisResult::terminated_tracks`에 복사한다. 기존 `tracks`와 `detections` 의미는 바꾸지
않는다.

### Step 3: sampling과 summary를 구현한다

projector key는 `{channel_id, tracker_namespace, track_id, stream_epoch_id}`다.

주기는 전역 `MEDIA_SERVER_RECORDING_OBSERVATION_INTERVAL_MS`(기본 1000ms, 양수)로
설정한다. 이번 단계에서 기존 SourceRegistry policy와 hash 계약을 확장하지 않는다.

- 첫 confirmed/tentative track: start observation
- configured interval 경과: representative observation
- event-triggered detection: immediate observation
- terminated track: end observation과 first/last/duration/class/confidence 요약
- process/channel stop: `endedReason=stream-stopped`로 열린 track summary flush

동일 PTS에 여러 사유가 겹치면 하나만 저장하고 selection reason 배열에 모두 기록한다.
queue가 가득 차면 interval observation을 먼저 drop하고 start/event/end를 우선 보존한다.
중요 관측만 남은 포화 상태에서는 명시 거부하고 interval drop/critical rejection과
안전한 마지막 오류 코드를 status에 노출한다. 내부 경로나 오류 원문을 공개하지 않는다.

### Step 4: FrameLocator를 catalog로 해석한다

PTS와 stream epoch가 포함된 finalized segment를 찾고 keyframe anchor를 기록한다. 아직
writing인 segment의 observation은 pending queue에 두었다가 finalize callback에서 resolve한다.
segment가 corrupt/deleted면 observation은 남길 수 있지만 `frameLocator=null`과 reason을
기록한다.

구현 시 안전 경계: writer가 실제 수락한 최근 PTS 최대 256개의 불변 시간 사본을 사용하며,
시작·끝 범위 안이더라도 실제 수락 목록에 없는 PTS는 연결하지 않는다.
writer/decoded PTS rollback 또는 같은 stream key 녹화 재시작 후 모호한 epoch는
보수적으로 locator 미확정 상태를 유지한다. 지연 분석 결과에 최신 epoch를 덧씌우지 않는다.

### Step 5: GREEN과 문서 기록

```bash
planned-command verify-v410-recording-observations
planned-command verify-v410-recording-timeline
planned-command verify-v410-recording-catalog
git diff --check
```

승인 시에만:

```bash
git commit -m "feat: 녹화 검색용 분석 관측 저장 추가"
```

---

## Task 8: V410-S08 crash 복구, 손상 격리와 후속 버전 호환성 gate

### S08 잔여 전체 실행 승인 (2026-09-10)

**최신 목표로 갱신:** S08 잔여 전체 완료 후 커밋·푸시하고 S09도 진행한다.
이 목표의 실패는 AGENTS.md 3.3에 따라 기록 후 동일 단계에서 수정·재검증하며,
통과 전에 뒤 단계로 넘어가지 않는다. 아래 최초 승인 기록보다 최신 목표를 우선한다.
120분 검증 질문에 대한 사용자 `진행`에 따라
`verify-predev --soak-minutes 120` 실행은 승인됐다. 2026-09-11 실행 시점 정정:
S08은 단기·관련 회귀로 닫고, 장시간·UI 검증은 S09 통합 구현 후 최종 코드에서
수행한다. 동일 코드·환경·범위의 유효한 증거는 릴리즈 시 중복 실행하지 않는다.
기존 predev 장시간 검사는 녹화 직접 관찰을 대체하지 않는다. 녹화 전용 120분,
30분·UI 풀테스트 및 PR/main merge/tag/release는 아직 별도 명시 승인되지 않았다.
사용자의 실행 이유 질문은 새 테스트 실행 승인으로 해석하지 않는다.

사용자 `S08 잔여이슈 다 끝내고 보고`에 따라 기준 `f3736adf`에서 다음 세 묶음을
순차 개발·검증한다. 기존 B2b는 완료·푸시된 기준이며 재구현하지 않는다.
이 최초 승인에는 commit/push, S09 또는 버전 전체 장시간/UI 풀테스트가 포함되지
않았으나, 현재 권한과 실행 시점은 위 최신 목표 및 정정을 따른다.

1. **구현·단계 검증 완료 (2026-09-11)** — 최종화 복구: 완결된 media의 정확한 V1 metadata·checksum·소유 경로를 publish 전에
   내구 ticket으로 저장한다. 기존 cleanup이 ready partial을 먼저 삭제하지 못하게 한다.
   provenance 없는 orphan을 추정 등록하지 않으며 동일 ID와 tombstone을 우선한다.
   이벤트 MPEG-TS와 Pending link/source/output 결속도 포함한다.
2. **구현·단계 검증 완료 (2026-09-11)** — 시작 복구 연결: 원장 복원과 retention 구성 후 기존 내구 삭제 대기를
   먼저 수렴시키고, ready 복구와 known Finalized media 검사를 마친 뒤 녹화를 시작한다.
   새 용량 정책에 따른 삭제는 이 시작 복구에 끼워 넣지 않는다. 삭제 복구 오류·ready 충돌·
   검사 불가·보호된 손상의 상태 반영 실패는 시작 실패로 남기며, 기존 event hold/terminal
   release 계약을 유지한다. 단위44·실제 앱144개와 별도 seed cleanup1이 통과했다.
   녹화 off 복구와 유효 local source opt-in/녹화 on 정상 생성·복구 실패 시 생성 차단을 대조했다.
3. **종합 검증·근거 대조 완료 (2026-09-11)** — 종합 검증: crash 지점·손상·디스크 실패·중복
   재시작과 S01~S07 관련 회귀, V1 golden 호환성 및 실제 시작 연결의 기록을 대조했다.
   무변경 로직의 유효 증거는 재사용하고 startup 영향 회귀는 재실행했다. 메인 docs-links는
   226문서/1051링크/실패0, 임시root24개 부재 직접대조를 확인했다. 승인된 커밋·푸시는
   별도 실제 결과로 보고한다. S08 단계 완료이며 S09·버전 전체·릴리즈 완료는 아니다.

1번 구현 위치는 `recording_finalize_recovery.h/.cpp`, writer, event deriver/bridge,
catalog cleanup/recovery API, inspector MPEG-TS 연결이다. 기본20·통합140·root5와
S01~S07 관련 회귀·전체 build·문서 링크·diff 검사가 통과했다. 개별 결과와 최초 실패
수정 이력, 임시 root39개 정리는 `release-test-records.md`의 S08 finalize 최신 검증을
따른다. 공개 V1·이벤트 payload·권한·기존 재생 계약은 변경하지 않았다.
이는 1번 묶음의 분할 커밋 조건이며, startup 미구현을 S08 전체 완료로 확대하지 않는다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | S08 잔여 전체 개발·검증 지시 | Task 8 Step 1~5, 사전 등록할 finalize/startup case | 현재 개발 범위 focused·관련 회귀·전체 build |
| 30분 테스트 | 미진행 | 이번 요청은 S08 개발이며 버전 전체 close-out은 아님 | AGENTS.md 7.6.2·7.7 | 별도 실행 승인 없음; 버전 완료 필수 blocker는 유지 |
| 120분 테스트 | 진행 대상 | writer publish 및 시작·cleanup lifecycle을 직접 변경 예정 | gstreamer_segment_writer.cpp, media_server_application.cpp, AGENTS.md 7.6.2 조건4 | S09 최종 코드에서 실행; predev 승인됨, 녹화 전용 검사 미승인. S08 중간 단계에서 중복 실행하지 않음 |
| UI 풀테스트 | 미진행 | 이번 변경은 내부 복구이며 새 UI control 없음 | Task 8 구현 경계 | 별도 실행 승인 없음; 버전 완료 필수 blocker는 유지 |

Codex 담당은 기존 단일 `gpt-6-astra` / `medium` 재사용이다. 최종화는2/2/2/2=8,
startup은2/1/2/2=7, 종합 대조는2/1/2/1=6점이며 자동 상향하지 않는다.
메인은 계약·diff·완료 판정을 담당하고 하위 에이전트 생성을 금지한다.

### 2026-09-10 착수 범위: B2b 실제 파일 검사

최신 지시 `다음 진행할 이슈 개발 시작`은 다음 잔여 항목인 실제 영상 손상 검사에
한정한다. 기존 A·B1·B2a는 `e03a9a6b`까지 원격 반영된 기준이다. 이번 지시에는
커밋·푸시가 없으며 이전 분할 커밋 승인을 새 권한으로 사용하지 않는다.

- 정상 / 확정 손상 / 검사 불가를 구분하는 내부 검사기를 추가한다.
- 안전하게 연 고정 FD에서 크기·SHA-256과 MP4/WebM demux 결과를 확인한다.
  모든 압축 프레임의 디코딩 정상 여부까지 보장하는 검사는 아니다.
- I/O·권한·경로 안전성·검사 중 변경·시간 초과·플러그인 부재는 손상으로
  확정하지 않는다. 안정된 확정 손상만 기존 `MarkSegmentCorrupt`로 적용한다.
- 기존 hold·pending event·삭제 우선순위와 V1·관측 locator 계약을 유지한다.
  검사 중 catalog mutex를 장시간 점유하지 않으며 적용 전 대상 상태를 재확인한다.
- 파일 삭제·이동, orphan publish, 시작 복구 연결, S09는 이번 범위 밖이다.
  검사기 추가를 자동 복구 또는 S08 전체 완료로 보고하지 않는다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | B2b 검사기와 기존 손상 상태 적용 경계 변경 | Task 8 Step 1·2, B2b 사전 등록 항목 및 B2a 회귀 | 현재 단계 개발의 focused·관련 회귀·build 범위 |
| 30분 테스트 | 미진행 | 이번 요청은 B2b 한 항목이며 버전 close-out 아님 | AGENTS.md 7.6.2·7.7 | 명시 승인 없음; 버전 완료 필수 검증을 대체하지 않음 |
| 120분 테스트 | 미진행 | streaming/source lifecycle/startup 경로는 변경하지 않음 | 이번 B2b 변경 경계 | 명시 승인 없음; 새 위험 신호 발생 시 재판정 |
| UI 풀테스트 | 미진행 | 새 제품 화면·조작을 추가하지 않는 내부 검사기 | 이번 B2b 변경 경계 | 명시 승인 없음; 버전 완료 필수 검증을 대체하지 않음 |

담당은 Codex 단일 기존 서브에이전트 `gpt-6-astra` / `medium`이며 재위임을
금지한다. 영향도2·불확실성1·검증 난이도2·변경 범위1=6점으로 자동 상향은
없다. 메인은 안전 계약과 최종 diff·증거를 직접 확인한다. 정확한 개별 테스트
정의는 실행 전에 inventory와 release-test-records에 등록한다.

**B2b 구현·검증 결과:** `recording_media_inspector.h/.cpp`에 고정 FD 검사와
명시적 `InspectAndMarkRecordingMedia` 연결을 추가했다. 실제 media52개,
no-GStreamer1개, 추가 경계13개·콜백 상한15개 및 기존 B2a·B1·S03·S07·A 회귀와 전체 build가
통과했다. 검사 불가의 원장 불변, hold/Pending/삭제 보호를 확인했으며 기존 catalog
제품 코드는 변경하지 않았다. 정확한 실행·최초 RED·cleanup 기록은
release-test-records의 B2b를 따른다. 검사 범위는 H264/MP4·VP8/WebM의 checksum과
demux이며 전체 프레임 decode는 아니다. 16MiB 초과·시간 초과·seek는 콜백 단위
검증이며 실제 컨테이너의 과대 요청이나 OS I/O 정체 유발 증거는 아니다.
startup/orphan 복구 및 S08 전체 완료는 여전히 남아 있다.

**현재 상태(2026-09-09): 부분 구현.** 기준 S07 완료 커밋 `ea9f11e4`다.
S08-A는 실행 속성 누락을 보완하고 Node9개, golden4개, 실제 C++ reader89개와
기존 계약89개 검증을 통과했다. 실패·재검증 상세는 release-test-records의 S08-A를 따른다.
B1은 `RecordingJournal::Append`의 미commit 꼬리 원본 내구 격리와 안전한 후속 append,
`Replay` I/O 실패 구분 및 catalog Open/rebuild 거부를 구현했다. focused40개, S03
catalog45개·wiring9개, S01 및 A 회귀와 전체 build가 통과했다. 상세 기록은
release-test-records의 S08-B1을 따른다. 실제 영상 검사·복구와 종합 검증(B 잔여)은
남아 있어 S08 전체는 미완료다.
B2a는 `RecordingCatalog::MarkSegmentCorrupt`와 replay/SQLite 상태 전이를 구현했다.
최초 focused 86 pass/4 fail은 새 관측 fixture의 위치 해석 누락이었으며, 사용자 승인 후
실제 Resolve 결과를 저장하도록 테스트만 보완했다. S07의 조회 시 새 locator를 추정하지
않는 계약은 유지했다. 재검증은 focused92개, B1·S03·S07·A 회귀 및 전체 build가
통과했다. 손상 상태 유지·중복 원장 순서·삭제 우선순위·사용 중 대상 거부가 이번
완료 범위이며 자동 파일 손상 검사나 startup 복구 연결은 아직 미구현이다.
기존 V1 golden fixture 호환성 검증(A)을 먼저 고정하고 복구 구현·통합 검증(B)을 이어간다.
A 통과만으로 S08 전체 완료를 뜻하지 않는다. 당시 승인 범위에는 S08 개발·단계 검증과
필요 시 분할 커밋이 있었으며, 이후 명시 지시로 A·B1·B2a를 푸시했다.
현재 작업의 권한은 위 2026-09-10 착수 범위를 따르며 과거 승인을 재사용하지 않는다.

**수정 파일:**

- 생성: `include/recording/recording_recovery.h`
- 생성: `src/recording/recording_recovery.cpp`
- 수정: `src/recording/recording_catalog.cpp`
- 수정: `src/recording/recording_supervisor.cpp`
- 생성: `test/fixtures/recording/v1/recovery/`
- 생성: `scripts/internal/recording_recovery_smoke.cpp`
- 생성: `scripts/internal/verify_v410_recording_recovery.sh`
- 생성: `scripts/internal/verify_v410_recording_fixture_compatibility.mjs`
- 수정: `CMakeLists.txt`
- 수정: `server.sh`
- 수정: `docs/project-feature-test-inventory.md`
- 수정: `docs/stream-verification.md`
- 수정: `docs/release-evidence-index.md`
- 수정: `docs/release-evidence-v410.md`

### Step 1: crash-point fixture를 먼저 만든다

실제 구현은 초기 단일 `recording_recovery.h/.cpp` 구상 대신 원장(B1), 손상 상태(B2a),
`recording_media_inspector`, `recording_finalize_recovery`, `recording_startup_recovery`로
분리했다. 시작 연결은 `media_server_application.cpp`의 supervisor 생성 전에 두므로
`recording_supervisor.cpp` 자체를 변경하지 않는다. 초기 파일 목록이 별도 미구현
recovery 모듈을 추가하라는 뜻은 아니며, 각 구현·fixture·결과는 아래 단계와 중앙 기록에 대응한다.

각 fixture는 마지막 성공 단계와 예상 복구 상태를 manifest로 가진다.

- partial write 전/중/후
- final rename 뒤 journal 전
- journal 뒤 SQLite 전
- deletion_requested 뒤 unlink 전
- unlink 뒤 deletion_completed 전
- truncated/corrupt journal
- corrupt SQLite
- missing media
- checksum mismatch
- event link는 있으나 derived clip 없음

```bash
planned-command verify-v410-recording-recovery
planned-command verify-v410-recording-fixture-compatibility
```

### Step 2: 시작 복구 state machine을 구현한다

B 구현은 회귀 경계를 나누어 진행한다. B1은 원장 꼬리 복구, B2a는 알려진 segment의
손상 상태를 원장·메모리·SQLite에 동일하게 반영하는 기반이다. B2a에서는 파일 검사나
시작 경로를 아직 연결하지 않는다. 사용 중인 hold 및 pending event 참조 대상은 상태
변경을 거부하고 삭제 대기·삭제 완료를 우선한다. 기존 ID의 finalized 재등장도 최초
메타데이터를 바꾸거나 손상 판정을 취소하지 못하게 한다. 각 묶음 통과 뒤에만 다음
통합을 진행하며, 기반 검증을 자동 손상 검출 또는 S08 전체 완료로 확대하지 않는다.

S07까지의 실제 writer는 final rename 뒤 callback에서 journal을 기록한다. 파일명이나
cleanup marker의 partial leaf만으로 source/channel/epoch/시간을 복원할 수는 없다.
따라서 복구용 내구 정보가 없는 이전 orphan은 채널·시간을 추정해 정상 등록하지 않는다.
최종화가 끝난 소유 partial의 메타데이터와 checksum을 rename 전에 내구 저장하고,
재시작 시 journal/tombstone을 먼저 대조하는 방식으로 이 공백을 보완한다.
기존 S04/S05 v2 cleanup marker가 소유한 미완성 partial 정리 규칙은 유지한다.
복구 성공은 단순 container magic 판정이 아니라 실제 완결성·checksum·범위·소유권으로
확인하며, 새 ID 발급도 삭제된 원본 ID의 재생성 우회 수단으로 사용하지 않는다.

복구는 journal replay를 먼저 수행하고 filesystem scan을 대조한다. 완결된 `.partial`과
final orphan은 유효한 내구 ticket의 원래 ID·메타데이터·소유 경로가 확인되고
checksum/container/range 검사를 통과할 때만 no-replace publish 및 catalog 반영을 한다.
새 ID를 추정 발급하지 않는다. ticket 없는 orphan은 정상 등록하지 않는다.
손상이 확정된 미등록 파일은 정상 등록을 거치지 않고 격리 증거를 남기며,
이미 등록된 파일의 손상 상태 전이는 기존 hold·Pending 보호를 따른다.
검사 불가나 provenance 충돌은 손상 확정으로 대체하지 않고 원본 보존·오류로 구분한다.
격리는 원위치 논리 격리로 수행한다. 정확한 ticket·파일 binding에 대한 내구 손상
진단을 보존하고 정상 등록·재생을 차단한다. 진단 저장과 known ID 손상 상태 기록
사이에서 중단돼도 동일 정보로 재시작이 수렴해야 하며, 파일 이동 도중의 영구 복구
오류를 합격으로 처리하지 않는다. ready/cleanup marker는 보존하여 완성된 partial의
기존 cleanup 삭제를 막는다. 충돌·검사 불가·보호된 Pending 참조는 오류로 구분한다.

`deletion_pending`은 media 존재 여부에 따라 unlink 재시도 또는 tombstone completion으로
수렴한다. 삭제 완료 뒤 같은 ID media를 다시 생성하지 않는다.

### Step 3: golden fixture 불변 gate를 만든다

fixture 파일의 SHA-256 목록을 고정한다. 후속 v4.2+는 이 fixture를 수정하지 않고 reader를
호환시켜야 한다. gate는 다음을 검사한다.

- v1 required field 의미 변경 없음
- additive optional field만 허용
- fixture digest 변경은 명시적 새 contract version 없이는 실패
- SQLite rebuild 결과와 JSONL fallback 결과 parity
- 검색·embedding index 파일이 녹화 source-of-truth에 포함되지 않음

### Step 4: feature/test inventory와 evidence를 연결한다

각 단계에서 이미 등록한 고정 ID를 재번호화하지 않고 종합 검증에 연결한다.
S05의 `V410-S05-I*`도 보존한다. 신규 동작은 구현 단계에서 시험 실행 전에 등록하며
S08까지 미루지 않는다. 각 ID는 owner symbol, route/control, positive/negative verifier와
안정화/UI/30분/120분 판정 근거를 가진다. inventory는 실행 PASS가 아니다.

### Step 5: GREEN과 회귀 검증

```bash
planned-command verify-v410-recording-recovery
planned-command verify-v410-recording-fixture-compatibility
planned-command verify-v410-recording-observations
./server.sh verify-v410-event-recording
./server.sh verify-v410-recording-retention
./server.sh verify-v410-recording-catalog
./server.sh verify-v410-recording-recorder
./server.sh verify-v410-recording-contracts
./server.sh verify-docs-links
git diff --check
```

승인 시에만:

```bash
git commit -m "test: 녹화 복구와 v1 호환성 gate 추가"
```

---

## Task 9: V410-S09 통합 안정화와 release readiness 판정

**현재 상태: 2026-09-12 종료·대체됨(성공 완료 아님).** 아래 진행·승인·명령은 당시 이력이다.
새 설계 보강은 S10, 코드 고정 후 최종 검증은 S11로 분리했다. 아래 승인을 새 실행 권한으로
해석하거나 당시 PASS를 S10 이후 전체 PASS로 승격하지 않는다.

**진행 (2026-09-11):** S08은 `4b7639db`와 `11953256`으로 커밋·푸시했고 원격과
동기화를 확인했다. 현재 S09은 실제 runtime 부분 통합 검증(아래 oracle 1·5·7)의
구현·메인 검토를 마쳤고, 실제 앱 이벤트·HTTP·보존·재시작 통합 검증에 착수했다.
runtime 최신 검증은 518 assertions와 cleanup 1개가 통과했고, 조기 실패 종료 경계도
실제 source 시작 후 실패 주입으로 확인했다. 상세 실패·수정·실행 기록은 중앙 테스트
기록의 S09 runtime RAII 절을 따른다. 초기 스레드 증가 원인과 장시간 RSS 판정은 미확정이다.
후속 작업에서 실제 인증90713과 관측32023을 통과했고 장시간 녹화 runner의 구현·순수
검증 및 정적 통합 검증을 마쳤다. 전체 진입점 `--all`은 세션48365로 첫 실제 실행을
마쳤으며 runtime517·인증535 checks와 두 단계 정리 확인 후 exit0이었다.
장시간 녹화·자원 안정성·UI 및 S09 전체 완료는 아직 아니다. 최신 개별 실행 결과는
중앙 테스트 기록을 따른다.
단일 Astra/medium 담당자(2/1/2/2=7)를 재사용하고 메인이 계약·최종 판정을 맡는다.

**수정 파일:**

- 생성: `scripts/internal/verify_v410_recording_foundation.sh`
- 생성: `scripts/internal/verify_v410_recording_longrun.sh`
- 수정: `server.sh`
- 수정: `docs/config-reference.md`
- API 설명: 실제 source-of-truth인 `docs/config-reference.md`의 녹화 API 절에 반영
- 수정: `docs/stream-verification.md`
- 수정: `docs/project-feature-test-inventory.md`
- 수정: `docs/release-evidence-v410.md`
- 수정: `docs/release-evidence-index.md`
- 수정: `docs/v410-v49-recording-search-roadmap.md`
- 수정: `docs/development-backlog.md`

### Step 1: 통합 verifier를 작성한다

`verify-v410-recording-foundation`은 앞 단계 verifier를 호출하는 wrapper에 그치지 않고 다음
cross-component oracle을 직접 확인한다.

- 등록 source opt-in → source worker/recorder 한 개 → segment finalize
- event 발생 → overlap link → event clip/fallback → priority timeline → media range read
- continuous quota 초과 → oldest delete/tombstone → 녹화 계속
- restart → 같은 journal/catalog state → 중복 ID 없음
- observation → FrameLocator → 실제 segment 시간 범위
- auth 없는 media ID 접근 거부, 다른 channel scope 누출 없음
- runtime stop 후 subscriber/thread/.partial 누수 없음

구현 경계 (2026-09-11): 공개 status schema에 검증용 카운터를 추가하지 않는다.
실제 SessionManager·RecordingSessionService·AnalysisObservationProjector·catalog를
연결한 C++ 통합 검증으로 worker/subscriber와 FrameLocator를 직접 관측하고,
실제 앱 HTTP 검증으로 event 파생 완료와 frame-buffer fallback을 각각 확인한다.
fallback은 원본 세그먼트 전환과 다른 경로이며, 요청 전 구간 충족을 보장하지 않는
`partial` 상태와 실제 재생 가능 여부를 각각 확인한다.
단기 runtime은 warmup 1회 후 시작·종료 3회를 확인한다. 녹화 소유 카운터의 종료값과
실제 process thread/fd 측정값은 분리하며, 라이브러리 전역 pool의 증가를 근거 없이
허용하지 않는다. 단기 RSS 측정만으로 장시간 누수 부재를 판정하지 않는다.
신규 개별 테스트 항목은 실행 전에 inventory와 중앙 테스트 기록에 등록한다.
auth 5개 환경변수가 없으면 auth를 실행하지 않고 전체 통합 PASS도 보류한다.

#### S09 실제 fallback identity 정합 보완

AP13 실제 앱 진단에서 원본 manifest의 stream/channel은 shared stream key이고,
catalog link의 source/channel은 녹화 채널 ID여서 기존 조회기의 직접 비교가 실패함을
확인했다. 원본 이벤트·manifest·공개 API 및 V1 JSON 필드를 변경하지 않는다.
신규 연결은 기존 opaque fallback ID에 `fallback-bound-v1-` 접두사와 SHA-256을 담는다.
고정 domain과 길이 접두 인코딩으로 event ID, link ID, catalog source/channel,
원본 stream/channel을 결속한다. 첫 필드는 domain
`media-server.recording-fallback-binding.v1`이며, 각 필드는 UTF-8 바이트 길이의
십진수와 `:` 및 원문 바이트를 순서대로 연결한다. 빈 원본 stream은 그대로 해시하되
생산 resolver의 조회 키만 원본 channel로 대체한다. 생산 시 실제 녹화 채널 resolver의 일치를 확인하고,
조회 시 manifest와 내구 catalog만으로 같은 결속을 검증한다. 조회에 현재 활성 세션을
요구하지 않으므로 재시작 이후에도 검증할 수 있어야 한다.

이미 발급된 bound ID는 다른 결속으로 덮어쓰지 않는다. resolver 실패·채널 불일치·
해시 계산 실패는 기존 ID/locator를 보존하고 새 연결을 거부한다. bound ID 형식이나
해시가 잘못됐으면 기존 ID 판독 경로로 강등하지 않는다. 기존 legacy ID는 자동 승격하지
않고 기존 manifest와 catalog의 직접 identity 검사를 유지한다. 따라서 과거 잘못 매핑된
legacy 자료가 이 수정만으로 재생 가능해졌다고 보고하지 않는다.

이 해시는 신뢰된 journal에 저장된 identity 연결을 검증하는 값이며, 임의 journal 변조를
막는 서명이나 미디어 전체 checksum은 아니다. 기존 event ID, 채널 권한, 경로·파일 형식·
크기·symlink·중복 ID·tombstone 검사는 유지한다. 실제 bridge→catalog→reader 양성,
재시작 내구성, 각 identity 변조 거부, 반복 등록 안정성, resolver 실패 시 보존,
legacy 호환 및 OpenSSL 미지원 시 거부를 실행 전에 개별 등록하고 RED→GREEN으로 확인한다.
이 절은 구현 방침이며 구현·검증 완료 기록이 아니다.

실제 앱 보존 검증은 event 검증과 별도 채널로 격리해 파생 중 hold와 삭제 기대값이
섞이지 않게 한다. admission의 기본 예상 세그먼트 예약 64 MiB를 무시하고 quota를
수 KiB로 낮춰 녹화 차단을 순환 보존 실패로 오판하지 않는다. 실제 생성 크기를 관측한
뒤 예약 하한을 포함한 quota로 admission-triggered oldest-first 삭제와 후속 finalize를
확인한다. 이것만으로 완료 파일 총량의 quota 초과 검증을 대체하지 않는다. 실제 앱에서
충분한 녹화 파일을 만든 뒤 총량보다 작은 유효 quota로 변경해 삭제·계속 녹화도 확인한다.
삭제 전 eligible 후보의 시간·ID 순서를 독립 계산하고 journal deletion 요청/완료 및
실파일 삭제를 대조한다. quota 변경에 의한 revision/epoch 전환은 기존 정책을 유지한다.

S09 실제 진단에서 quota와 다음 segment 예약이 모두64MiB이면 새 finalized도 즉시
삭제되어 live 목록 폴링이 녹화 지속을 놓침을 확인했다. AP07 삭제 완료 이후의 원장
cursor와 기존 ID를 고정하고, 이후 서로 다른 신규 finalized 최소2개의 시간 진행과
유효 메타데이터를 확인한다. quota 변경 시 이전 writer가 종료하며 만든 파일 하나를
녹화 재개로 오인하지 않는다. 삭제된 신규 파일은 finalized→삭제 요청→삭제 완료 순서와
실파일 부재를 대조한다. 삭제된 파일의 SHA를 다시 읽었다고 보고하지 않으며,
quota 복원 후 신규 녹화를 확인하고 정상 종료한 뒤 남은 파일의 실제 크기·SHA를
검사한다. fixture 검사는 판정기의 검증일 뿐 실제 앱·재시작 검증을 대체하지 않는다.

#### S09 AP10 실제 녹화 자료 인증 검증

비인증 실제 앱66598의 자료 생성 경로를 재사용하되, 별도 `--app-auth` 부분 실행은
`AUTH_MODE=auto`와 실제 setup/login/user API를 사용한다. 합성 S06 seed나 인증 우회
사용자 파일을 사용하지 않는다. 실행 전 인증 환경변수5개의 존재·검증기 요구 길이·
상호 구분을 확인하며, 미충족이면 서버나 임시 root를 만들지 않는다. 값과 cookie는
메모리에만 두고 로그·명령행·자식 환경·저장소 문서에 기록하지 않는다. 제품이 생성한
passwordHash 사용자 파일은 격리된 임시 root 안에서만 사용하고 종료 시 정리한다.

실제 상시 segment, 파생 이벤트 영상, frame-buffer fallback 각각의 같은 URL을
아래 권한으로 대조한다. 성공 결과는 실제 파일 바이트와 비교한다.

| 계정/권한 | 미디어 GET Range | timeline | status |
| --- | --- | --- | --- |
| 미인증 | 401 | 401 | 401 |
| admin | 206·실제 바이트 일치 | 200 | 현재 채널 전수 |
| operator·ops:read·해당 source:read | 206·실제 바이트 일치 | 200 | 허용 채널만 |
| operator·ops:read·다른 source:read | 404·없는 ID와 같은 거부 | 403 | 자기 허용 채널만 |
| viewer | 403 | 403 | 403 |
| operator·해당 source:read만, ops:read 없음 | 403 | 403 | 403 |

제한된 계정에는 global observations를 포함하지 않으며 응답에 원본 source 경로나
인증 material을 노출하지 않는다. 허용된 timeline은 실제 영상 시간 범위에 대해
비어 있지 않은 items와 요청 채널만 포함하는지 확인한다. fallback이 파생 영상으로
대체되는 정상 전이 때문에 timeline에 과거 fallback ID를 계속 요구하지 않는다.
원본 opaque ID의 접근 권한과 실제 바이트는 media API에서 별도로 확인한다.
필수 개별 검사가 하나라도 빠졌으면 인증 suite를 성공 종료하지 않는다.
재시작 시 기존 사용자를 다시 setup하지 않고 로그인해
권한 검사를 유지한다. `--app-auth` 통과는 인증된 실제 앱 통합 부분의 증거이며,
runtime·장시간·UI를 포함한 전체 foundation 또는 S09 완료로 확대하지 않는다.
인증 환경 미설정 상태에서는 구현과 순수 helper 검증만 수행하고 실제 인증 실행은 보류한다.

#### S09 기본 통합 실행 연결

`verify-v410-recording-foundation --all` 및 인자 없는 기본 실행은 인증 필수값을
임시 root 생성 전에 확인한 뒤 기존 runtime wrapper와 `--app-auth` 앱 검사를 순서대로
실행한다. 각 단계의 실제 정상 종료와 완료 결과를 확인하고 실패하면 후속 단계를
실행하지 않는다. 하위 wrapper cleanup 실패도 전체 실패다. 테스트용 실행 함수 주입은
단위검사 안에서만 사용하고 CLI/env로 실제 검사 대신 가짜 실행기를 고르는 기능은 없다.
개별 출력은 보존하되 비밀값을 노출하지 않으며 마지막 통합 결과와 부분 앱 결과를
구별한다. 인증값은 runtime 자식에 전달하지 않는다.

이 연결은 runtime/인증 앱 통합 실행의 완주 판정이며 장시간 자원 추세·UI·30분·120분
및 버전 완료를 뜻하지 않는다. 단계 성공만으로 남은 시간별 안정성 판정을 지우지 않는다.
기존 부분 모드·oracle 단위 모드는 그대로 유지하고 `--all`을 앱 내부로 넘겨
준비 상태 오류를 내던 분기를 제거한다. 실제 전체 실행은 인증 환경 사전조건을
충족한 뒤 수행하며, 현재는 순서·실패 전파·완료 누락 거부의 단위 검증부터 진행한다.

상위 suite는 별도 timeout으로 하위 wrapper를 먼저 강제 종료하지 않는다. 앱 검사기가
별도 그룹으로 소유한 서버를 두고 상위 wrapper만 종료하면 finally 정리를 건너뛸 수
있기 때문이다. 출력 상한 초과는 실패로 기록하고 더 저장하지 않되 하위 검사기의
기존 안전 중단·cleanup과 close를 기다리며 후속 단계를 차단한다. 이 방식은 새 전역
강제 종료 시간 보장이 아니며, 컴파일 또는 OS 수준 정체의 완전한 제한을 주장하지 않는다.

### Step 2: 테스트 필요성 판정표를 먼저 작성한다

2026-09-11 판정: 초기 구상표의 `필수 후보`와 별도 외부 장비 영역을 현재 AGENTS.md
7.6.2의 네 영역으로 정규화한다. UI·30분은 버전 완료 필수 항목이며 미실행은 blocker다.
120분은 이번 writer/startup lifecycle 변경과 기존 실행 승인을 직접 근거로 삼는다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | 사용자 목표 S09 진행, 아래 통합 oracle 구현·검증 | Task9 Step1, S08 startup ST01~14 | focused·관련 회귀·build·문서 검증 승인; auth는 필수5개 env 사전 충족 필요 |
| 30분 테스트 | 진행 대상 | 현재 버전 로드맵 완료 판정의 필수 evidence | AGENTS.md7.6.2·7.7, Task9 readiness | 승인 실행52899 exit0,109pass/0fail/1skip,20회; 개별 결과 보존 및626경로 cleanup 완료 |
| 120분 테스트 | 진행 대상 | writer 최종화와 실제 startup/cleanup lifecycle 변경 | gstreamer_segment_writer.cpp, media_server_application.cpp, FR09~10·ST01~14 | predev120 session96360 종료·보존·cleanup 완료. 녹화 직접120도 승인되었으며 30분·UI 통과 뒤 실행 |
| UI 풀테스트 | 진행 대상 | 현재 버전 Ops timeline·재생 UI와 버전 완료 필수 evidence | Task6 `/ops/events`, AGENTS.md7.6.2·7.9 | 승인 실행14128은 clean worktree 선수조건에서exit1; 실제 브라우저 미실행. 검토·커밋 승인 후 재개 필요 |

외부 RTSP/ONVIF는 독립 테스트 영역으로 만들지 않고 안정화의 조건부 항목으로 기록한다.
현재 외부 endpoint/credential/실기기 실행 승인이 없으므로 실행하지 않으며 PASS 근거도 아니다.
이 표는 필요성·승인 판정이고 실제 실행 PASS가 아니다. predev120만으로 직접 녹화
장시간 검사 또는 30분·UI 결과를 대체하지 않는다.

### Step 3: 승인된 범위의 안정화만 실행한다

#### 2026-09-11 predev120 종료 상태

아래 실행 전 기록은 당시 이력이다. 이후 session96360은 요청 soak120분,
80회 반복, outer409pass/0fail/1skip으로 종료했다. 결과 전수 대조와 임시2306경로
정리를 마쳤으며 상세 수치·제외·최초 실패 이력은 `docs/release-test-records.md`의
`S09 PD120 96360` 절을 따른다. 같은 코드·환경·범위의 유효 증거를 인계나
30분/UI 순서만을 이유로 다시 실행하지 않는다. 관련 코드 변경이나 실패 신호가
생기면 영향 범위와 별도 실행 승인을 다시 판단한다.

후속 사용자 승인으로30분 안정화 → UI 풀테스트 → 녹화 직접120분 순서의 실행이 허용되었다.
외부 실기기·외부 서비스 및 릴리즈 작업은 포함하지 않는다. 자원 추세 판정은 미완료이며
이번 predev 종료로 `resourceTrendPass` 또는 S09 전체 완료를 승격하지 않는다.

#### 2026-09-11 predev120 실행 전 직접 확인

`--all`48365 통과 후 기존 승인된 predev120의 실행 준비를 읽기 검토했다.
장시간 테스트 자체는 아직 실행하지 않았다. 다음 세 경계는 실행 전 보완 대상이다.

- `verify_predev_stability.sh`의 `start_server`는 저장 경로를 별도 지정하지 않고
  상속 환경에서 서버를 실행한다. `MEDIA_SERVER_SOURCE_REGISTRY`,
  `MEDIA_SERVER_ANALYSIS_REGISTRY`, `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH`,
  `MEDIA_SERVER_RECORDING_STORAGE_ROOT`의 격리 및 입력 fixture 경계를 먼저 확정한다.
  실제 기존 데이터 접근이 발생했다는 뜻은 아니다.
- 바깥 `--fail-fast`는 있으나 integrated-smoke의 `server.sh test` 인자에 전달하지
  않는다. `test_all.sh`는 기본 `FAIL_FAST=0`이고 별도 CLI 인자로만 켠다.
  기존 옵션을 내부 단계에 전달하는 최소 보완을 검토하며 제품 동작은 바꾸지 않는다.
- 최초/갱신 report 명령은 `/tmp/media_server_*summary*.json` 전체를 입력으로 받는다.
  현재 실행과 자식 실행에서 생성한 명시적 증거만 모아 과거 결과 혼입을 막아야 한다.
  현재 summary 파일 자체의 판정이 잘못됐다고 확정한 것은 아니다.

기존 검증 기록을 읽기 조사나 준비 완료로 대체하지 않는다. 보완 구현 전 개별 회귀
항목을 등록하고, 정상·실패 전달·경로 격리·보고서 입력 범위를 focused 검증한다.
장시간 테스트의 시간 축소 또는 테스트 제외로 이 문제를 우회하지 않는다.

보완 범위 결정: 주 서버 저장 경로는 위 설정에 published views/auth users/이벤트
snapshot·clip 경로와 전용 GST cache를 더한 명시적 임시 환경으로 격리한다.
운영 foreground 스크립트나 제품 기본값은 수정하지 않는다. 비밀번호가 필요 없는
auth-off predev 프로세스에는 앞선 인증 검사의 임시 비밀번호를 전달하지 않는다.
보고서 입력은 predev 자신의 `SUMMARY_FILE` 하나로 제한하는 최소 변경을 우선한다.
그 파일의 `steps`는 이번 실행의 개별 명령·결과·로그 경로를 가진다. 자식의 상세
결과는 해당 step 로그에서 별도로 전수 보존하며, 짧은 Markdown 리포트가 상세
전수표를 대체한다고 주장하지 않는다. 보고서 생성 실패의 전파도 보존해야 한다.
공통 summarizer의 다중 파일 기능이나 기존 UI/미디어 기능은 변경 대상이 아니다.

내부 `test_all` report smoke에도 별도 전체 glob이 있어 같은 입력 한정 경계를
적용한다. 진행 중에는 무출력 helper가 현재 부분 summary를 쓰고, 마지막 기존
print_summary가 최종 카운터로 갱신한다. 완료 문구를 조기에 출력하지 않는다.
기존 `media-server.test-summary.v1` schema는 passCount/failCount/skipCount를
사용하므로 공통 summarizer의 pass/fail 전용 해석에 그대로 넣으면 수치가 틀린다.
이 직접 인터페이스 확인에 따라 해당 exact schema의 카운터·상태 해석 지원만
최소 추가한다. 앞선 ‘공통 summarizer 미변경’ 구현 가정은 이 범위에 한해 정정하며,
다중 파일 기능과 다른 schema의 기존 해석은 유지하고 별도 회귀로 확인한다.

PF 인자 전달 보완 결과: `verify_predev_stability.sh`는 명시 `--fail-fast`만
integrated `server.sh test`에 전달하도록 최소 수정했다. 실제 main/run_step을
서버 없는 경계 대체와 실행한 focused 검사는 최초 utility 실패16/18,
수정 전 예상 RED32/2를 거쳐 최종88312에서34/0을 기록했다. 기존 predev
first-fail/cumulative fixture 4개 assertion이 포함되며 실제 test_all 전체나
장시간 PASS는 아니다. 메인이 diff·검증 경계를 검토하고 임시15경로 부재를
직접 확인했다. 개별 결과는 중앙 release-test-records의 PF 절을 따른다.

AP10 실제 인증 첫 실행40595에서는 계정 생성/로그인과 continuous 권한 경계 통과 후
관리자 status 채널 집합 비교가 실패했다. `SourceViewRegistry`는 빈 목록에 기본
소스를 seed하지만 검증기의 `actualSourceIds`는 성공 POST만 기록한다. 초기 기대 집합은
녹화 status 응답이 아니라 독립된 소스 registry/admin 소스 목록에서 확보해야 한다.
이후 성공한 생성과 재시작 시 집합을 대조하고, 권한별 exact 집합 비교를 유지한다.
기본 소스 삭제·권한 정책 변경·subset 비교 완화로 이 검증을 통과시키지 않는다.
실패 실행의 실제 응답 ID 목록은 보존되지 않아 코드상 원인 후보와 재실행 확인을 구분한다.

기본 focused/static 승인 범위가 주어진 경우:

```bash
./server.sh build
planned-command verify-v410-recording-foundation
./server.sh verify-v410-entry-baseline
./server.sh verify-release-metadata
./server.sh verify-script-inventory
./server.sh verify-project-inventory
./server.sh verify-docs-links
git diff --check
```

UI/30분/120분은 사용자가 해당 묶음을 명시 승인한 경우에만 별도 실행한다. longrun은
bounded test root와 작은 quota를 사용해 rollover, fd/thread/RSS 증가, event priority,
restart를 관찰하고 테스트 media는 release evidence 최소 산출물만 남긴 뒤 정리한다.

장시간 측정 경계: PID별로 warmup 전후 RSS·FD·thread와 실제 segment/link/observation/
tombstone 수·journal 크기를 함께 기록한다. 현재 catalog는 삭제 이력과 관측 메타데이터를
유지하므로 저장된 항목 증가를 분리하지 않은 RSS 상승만으로 누수 또는 정상이라고
단정하지 않는다. 재시작 전후 프로세스 표본을 하나의 연속 RSS 기울기로 합치지 않는다.
카운터가 사라졌거나 측정 불가한 표본은 0으로 대체하지 않는다. 실행 종료 코드와
자원 추세 판정을 분리하고, 원인 미확정·검토 대기 상태는 최종 안정성 PASS가 아니다.

측정기 구현 경계: 기존 runtime smoke의 `Measure()`는 자기 프로세스를 측정하므로
실제 서버 장시간 검사에 그대로 사용하지 않는다. test-only 외부 PID collector를 두고
macOS는 `proc_pidinfo`의 시작 식별자·task 정보·FD 목록을, Linux는 해당 PID의
`/proc` 시작 시각·상주 페이지·task/FD 목록을 읽는다. 시작 식별자를 측정 전후 대조해
PID 재사용이나 종료 중 부분 표본을 거부한다. 측정 불가 항목은 null과 오류로 남기며
부분 성공을 유효한 전체 표본으로 만들지 않는다. Linux 실행 증거가 없으면 macOS
검사 통과를 Linux 통과로 확대하지 않는다.

먼저 별도 제어 프로세스의 FD·스레드·실제 접근한 메모리 증가 및 종료를 짧게 관측한다.
이 검사는 collector의 정확도 검증이며 서버·녹화·장시간 PASS가 아니다. journal의
장시간 집계는 완결된 줄의 offset 기반 증분 방식으로 설계하며, 현재 단기 `state()`의
매회 전체 재읽기를 장시간 샘플러에 그대로 복사하지 않는다. 과거 앱66598의 AP07
cursor가46987이었던 사실만으로 메타데이터 증가가 정상 또는 누수라고 단정하지 않는다.
mutation 유형별 증가와 고유 entity 수·bytes를 함께 관측한 뒤 한계와 추세를 판정한다.
샘플 주기·warmup·자원 추세 허용 기준은 실제 측정과 함께 확정해야 하는 잔여 설계다.

장시간 도구 구현은 실행 흐름과 자원 요약을 분리한다. 기존 observer 표본을 PID와
startIdentity별로 묶어 첫값/마지막값/최고값/실측 시간과 원장 증가를 함께 보존한다.
5분 warmup은 기존 runtime longrun과 비교하기 위한 관찰 구간이며 메모리가 안정됐다는
보장이 아니다. warmup 이후 표본이2개 미만이면 delta/rate는 null·insufficient로 남긴다.
누락 수치, 시간 역전, 같은 PID의 identity 변경, 누적 원장 카운터 감소는 정상0이나
새 기준점으로 대체하지 않는다. 상한을 넘는 입력은 오류로 처리하고 몰래 잘라내지 않는다.
요약 계산 단위 검증은 실제 장시간 실행 또는 자원 안정성 검토를 대신하지 않는다.
자원 허용 범위가 확정되지 않은 동안 resourceTrendPass=false/reviewRequired=true를
유지한다. 이 요약기를 이유로 단기 관측을 장시간 완료로 승격하지 않는다.

실제 runner 연결 시 기존 단기 시나리오의 초기화·정리 경로를 재사용하되 별도 명시
장시간 모드에서만 지속 녹화 구간을 추가한다. 초기 기능 확인 후 같은 PID를 유지하며
실시간으로 진행을 관측하고, 마지막 정상 종료 뒤 새 PID의 archive 복구를 확인한다.
재시작 snapshot 대조 중 보존 정책이 새 데이터를 삭제하는 경합은 테스트의 정상 API로
녹화를 일시 비활성화한 뒤 종료/복구 대조/재활성화하는 순서로 통제한다. 제품 pin이나
삭제 정책을 수정하여 통과시키지 않는다. 테스트 quota는 두 채널의 실제 파일과 입력,
이벤트 파일 및 원장이 기존448MiB 선제/512MiB 상한 안에 있도록 별도 장시간 모드에
한정해 배정한다. 정확한 duration·quota·진행 assertion과 단기 경로 불변을 메인이
구현 위임 전에 확정하며, 사용자 실행 승인은 별도로 확인한다.

2026-09-11 인증 통과 후 runner 구현 계약을 확정했다. 공개 명령은
`verify-v410-recording-longrun --duration-minutes 120`이며 무인자·다른 시간·알 수 없는
옵션은 임시 디렉터리나 서버 생성 전에 거부한다. 별도 내부 장시간 모드에서만
AP09 복구 이후 같은 PID를 120분 유지한다. 5초 간격의 증분 표본과 채널별 최대30초
이내 새 finalized 진행, 실제 삭제 요청·완료를 확인한다. 5분 warmup과 PID별 요약은
관측 분류이며 자동 안정성 PASS 기준이 아니다. 표본10000개 상한을 유지한다.
같은 장시간 구간의 PID/startIdentity와 시작·종료 표본 커버리지를 대조하며 표본 간
최대 간격15초를 넘으면 수집 연속성 실패다. 이 값은 메모리 정상 범위가 아니다.
채널9101/9201의 continuous/event quota는 각각128MiB, age는3시간으로 설정하되
전체 root448MiB 선제 중단/512MiB 상한과 기존 로그·ID 집계 상한을 유지한다.
duration은 monotonic 시간으로 측정하며 전체 안전 중단은 duration+180초다.
종료 복구 대조는 양채널 녹화 비활성화→정상 종료→메타데이터/미디어 SHA 저장→
새 PID 복구 대조→재활성화→양채널 신규 finalized→정상 종료 순서다.
설정 revision은 정상 API의 현재값을 조회·대조해 갱신한다. 장시간 루프에서 기존
전체 journal 재읽기를 반복하지 않는다. 단기 인증/비인증/관측 흐름과180초 제한은
그대로 두며, 이번 구현 검증은 순수 단위·CLI 거부·구문 검사에 한정한다.
실제 녹화 전용120분 실행은 별도 승인 전 미실행이다.

OBS32023 이후 장시간 workload 분리 시 주의점: 실제 event tap 입력은
`va_tracking_event_1280x720_30fps_h264.mp4`를 복사한 identity.mp4다.
640×360은 quota 확인용 retention.mp4만 해당하므로 event buffer의 메모리 추산에
사용하지 않는다. `EventFrameBuffer::Record`는 같은 key의 새 프레임 수신 시에만
시간/프레임 수 조건으로 prune하며 static `RecorderFrameBuffer`는 프로세스 수명을
갖는다. tap 제거 자체를 이벤트 프레임 보유량0의 evidence로 삼지 않는다.
장시간 검사에서는 입력/분석 활성 구간과 해제 후 유휴 구간, 누적 catalog metadata,
새 PID 구간을 구분해야 한다. 현재 첫 PID 약416MB 표본만으로 이 버퍼가 전부 원인이라고
단정하지 않으며, buffer 해제·byte cap·제품 정책 변경은 이 관측 설계에 끼워 넣지 않는다.

증분 판독 첫 구현은 관측용 reader에 한정한다. 허용된 테스트 root 내부의 일반 파일을
고정 dev/inode로 확인하고, 완결 LF 다음 byte offset만 소비한다. 미완결 꼬리는 보관해
이어붙이지 않고 다음 poll에서 재읽어 제품의 RepairTail과 충돌하지 않게 한다.
이미 소비한 prefix 아래 잘림·파일 교체·읽기 오류는 명시 오류로 고정하며 자동으로
offset 0으로 되돌아가 정상 집계처럼 이어가지 않는다. 같은 파일을 유지한 앱 재시작은
cursor를 유지할 수 있으나 PID별 자원 계측군은 별도로 나눈다.

reader는 기본 64KiB chunk, poll당 최대4MiB 읽기, 단일행 최대1MiB로 메모리와 일을
제한한다. 상한은 검증 도구의 보호값이지 제품 제한이 아니다. backlog·미완결 bytes와
실제로 소비한 bytes를 분리한다. 지나치게 긴 행은 조용히 건너뛰지 않고 오류로 남긴다.
관측한 mutation envelope의 기본 필드와 알려진7개 type을 확인하되 제품의 strict JSON
중복키 검사·catalog 참조 검증·Apply 성공을 대신한다고 주장하지 않는다.
무잠금으로 읽은 완결행도 fsync 성공 증거는 아니며 내구 판정은 정상 stop 이후의 기존
snapshot 검증으로 유지한다. raw payload를 로그로 출력하지 않는다. 전체 원장이나
무제한 entity Map을 reader 내부에 누적하지 않고 bounded batch를 소비자에게 반환한다.
이 첫 구현과 짧은 실제 임시파일 검사는 장시간 runner 연결·실행·추세 판정과 구분한다.

장시간 연결 전 실제 관측 결합은 별도 `--app-observe` 단기 모드로 준비한다. 기존
비인증 앱 시나리오의 순서·입력·quota·180초 안전 중단·512MiB root 상한을 바꾸지
않고, 현재 서버 PID의 계측값과 원장 증분 배치를 5초 간격으로 함께 기록한다.
최초 원장 생성 전은 미측정으로 표시하고 생성 후 읽기 오류는 정상 빈 원장으로
대체하지 않는다. 재시작 시 PID/startIdentity별 표본군을 분리하며 journal cursor는
같은 파일일 때 유지한다. 부모 검증기의 메모리는 서버 RSS에 합치지 않는다.

관측 집계는 mutation type별 행 수와 고유 mutation/entity 수·ID 저장 바이트를
구분한다. ID 최대100,000개와 UTF-8 ID 저장32MiB 상한을 넘으면 관측 불가로 실패하며
자동 eviction·journal 절삭·기존 quota 상향으로 통과시키지 않는다. 단기 관측 보호값은
제품 제한이나 120분 적정 용량 판정이 아니다. raw payload/source URL/비밀값은
표본 로그에 포함하지 않는다. sampler 오류는 기존 앱의 정상 정리 경로로 전파한다.
목적은 과거 원장 cursor46987의 실제 유형별 증가와 PID별 자원 변화를 연결하는 것이며,
단기 결과를 누수 부재 또는 120분 통과로 해석하지 않는다. 구현·단위 검토 뒤 실제
단기 관측을 수행하고, 그 증거로 장시간 판정 기준과 집계 상한을 검토한다.
정상 서버 종료 뒤의 최종 원장 집계는 backlog와 미완결 꼬리가 모두 없어야 한다.
살아있는 서버의 일시적인 꼬리 대기와 종료 후 불완전 원장을 구분하며, 실패 정리에서도
진행 중인 tick 종료와 reader FD 해제를 보장한다.

### Step 3.4: 이벤트 대기열 키와 재시도 일정 보존 검증

실제 단기 관측27991의 원장46714행 중 event_link_created가46497행이었다.
HTTP dispatch3회는 EventRecord3개를 뜻하지 않으며, 유형별 집계만으로 원인을
확정하지 않는다. 읽기 조사에서 `CatalogEventRecordingBridge::Enqueue`가
대입 우변에서 작업을 이동한 뒤 좌변에서 이동된 `event_id`를 키로 사용함을 확인했다.
이동 후 문자열 값에 의존하면 원래 이벤트 검색과 `preserve_existing_schedule`이
깨져 Refill이 미래 재시도를 현재 시각으로 덮을 수 있다는 단일 가설을 검증한다.

- 실제 Catalog/Bridge의 공개 동작을 사용한 제한 시간 내 focused 재현을 먼저 등록한다.
- 고정 clock에서 재시도 deadline 이전 원장 반복 증가와 서로 다른 이벤트의 일정
  보존을 검사한다. 소스 문자열이나 별도 대기열 복제품만으로 통과하지 않는다.
- 예상된 RED가 가설과 일치할 때만 이동 전 키 보존으로 최소 수정한다.
- timeout·retry 값, 삭제/보존 정책, 원장 schema, 무변경 append 정책은 변경하지 않는다.
- 동일 GREEN과 관련 bridge 회귀를 확인하며, 실제 앱 관측량 감소는 별도 재실행
  전까지 미확인으로 유지한다. focused 통과를 S09 전체 완료로 확대하지 않는다.

### Step 4: 로드맵 상태를 실제 evidence에 맞게 닫는다

- 구현된 단계만 `개발 완료`로 바꾼다.
- 실행하지 않은 UI/30분/120분/field smoke를 `미실행/조건부`로 남긴다.
- v4.2~v4.9 항목은 계획 상태를 유지한다.
- MyLocalLLM/VARuleLens를 통합했다고 쓰지 않고 독립 구현 원칙만 유지한다.
- `main` 반영은 v4.1.0 PR/merge가 별도로 승인·완료될 때 발생한다고 기록한다.

### Step 5: 최종 커밋 가능 상태만 보고한다

모든 승인된 test가 통과하고 evidence, 변경 파일, 영향·회귀, 미실행 항목이 기록된 뒤에만
커밋 가능 상태로 보고한다. 사용자가 이 단계 커밋을 명시 승인한 경우에만:

```bash
git add scripts/internal/verify_v410_recording_foundation.sh scripts/internal/verify_v410_recording_longrun.sh server.sh docs/config-reference.md docs/stream-verification.md docs/project-feature-test-inventory.md docs/release-evidence-v410.md docs/release-evidence-index.md docs/v410-v49-recording-search-roadmap.md docs/development-backlog.md
git commit -m "docs: v4.1 녹화 기반 검증과 evidence 마감"
```

푸시, PR, main merge, tag, GitHub Release, `v4.2.0` 브랜치 생성은 이 계획의 자동 후속
작업이 아니다. 각 action은 사용자 최신 지시의 개별 승인을 받아야 한다.

---

## 전체 완료 조건

### S10-3A 원장 미래 버전 읽기 안전 경계

진행 범위: 원장·catalog의 미지원 schema/type 분류와 시작 거부. 녹화 순서 발급, 시간 매핑
영속화, writer 연결, SQLite schema 변경, V1 data migration은 이 하위 작업에 포함하지 않는다.
기존 정상 V1·손상 행/불완전 tail의 복구는 유지한다. 새로운 정책 source는 설계 명세 S10 절이다.

수정 파일: `include/recording/recording_journal.h`, `src/recording/recording_journal.cpp`,
`src/recording/recording_catalog.cpp`, `scripts/internal/recording_catalog_smoke.cpp`.
출력: replay의 `unsupported_record_count`와 catalog open의 fail-closed 결과.
정상 strict JSON object의 문자열 `schema`가 `media-server.recording-mutation.v1`과 다르거나,
해당 schema에서 문자열 `mutationType`이 미지원이면 unsupported로 분류한다. 원문은 수정하지 않는다.
필드 부재/잘못된 타입/JSON 구문 오류는 기존 손상 분류이며 새 type의 payload를 해석하지 않는다.
읽기 중 unsupported가 하나라도 있으면 SQLite open/rebuild·writer cleanup 전에 catalog open을 거부한다.
이 변경이 예전 바이너리의 downgrade를 막아주는 것은 아니다. store format의 downgrade 차단은 별도 경계다.

- [x] 미래 schema와 미래 type의 replay 분류·catalog 거부·원본 bytes 불변 검사를 먼저 작성한다.
- [x] 기존에 corruption으로 건너뛰어 Open이 성공하는 assertion을 예상 RED로 확인한다.
- [x] 분류·counter와 Open 사전 guard를 구현한다. 기존 V1 의미·payload·삭제 동작을 변경하지 않는다.
- [x] `./server.sh verify-v410-recording-catalog`의 관련 기존 회귀와 신규 검사 GREEN을 확인한다.
- [x] 메인이 실제 diff·결과·원본 보존·cleanup을 검토한다. 커밋·푸시는 실행하지 않는다.

결과: RED 55/20(신규 예상 실패만), GREEN 84/0(C++75+script9). 중앙 기록 S10-3A 절에
전수 결과·정리를 보존했다. S10-3A 한정 구현 완료이며 순서 발급·시간 매핑 저장·실제 writer
시간 수정은 아직 아니다. 메인은 guard 선행성·V1 parser 경계·counter 사용처와 결과를 직접 검토했다.

작업 소유권: 단일 담당자는 위 코드/검사만, 메인은 계획·설계·중앙 결과 기록만 수정한다.
AGENTS.md 1.3에 따라 새 검토 에이전트·하위 에이전트 없이 기존 담당자를 재사용한다.
실제 실패 발생 시 보고·중단하며 예상 RED만 같은 범위에서 구현으로 진행한다.

### S10-3B 영속 순서 예약 저장 API

이번 범위는 `RecordingJournal::ReserveRecordingOrder(store_id, request_id, segment_id,
channel_id, result, error)`와 `RecordingOrderReservationV1`의 저장 계층 구현이다.
결과는 입력 네 ID와 양의 int64 `sequence`다. 모든 ID는 기존 opaque ID 검증을 따른다.
`recording_order_reserved` mutation의 entityId는 segment ID, mutationId는 request ID이며,
payload schema는 `media-server.recording-order.v1`이다. 기존 V1 필드 의미는 바꾸지 않는다.

- 첫 예약이 store ID를 내구적으로 결박한다. 같은 원장의 다른 store ID, 요청/segment 재사용
  충돌, 기존 다른 mutation의 request ID 충돌, 잘못된 예약 payload는 거부한다.
  예약 없이 먼저 finalize/삭제된 V1 segment에 순서를 소급 부여하지 않는다.
- 동일 요청·동일 네 ID는 기존 번호를 반환한다. 새 요청은 원장에 기록된 최댓값 다음 번호를
  발급한다. 번호의 의미는 UTC·finalize 순서가 아니며 INT64_MAX 이후 발급은 거부한다.
  동일 예약 중복을 제외한 기존 발급 순서의 역행도 거부하며 번호 사이 공백은 허용한다.
- inode/parent 검증과 동일 FD의 배타 flock 안에서 전체 읽기·검증·append·fsync를 수행한다.
  다른 인스턴스/프로세스도 같은 잠금을 사용한다. 성공 및 재시도 반환 전에 fsync한다.
- 손상·미지원·불완전 tail 또는 충돌하는 예약이 있으면 원문을 보존하고 거부한다.
  이 경로에서는 기존 Append의 tail repair를 호출하지 않는다. 일반 Append로 예약을 우회할 수 없다.
- catalog는 정상 예약을 읽되 기존 segment/삭제 projection에 새 의미를 넣지 않는다.
  writer/composition root 연결, store migration, downgrade 차단, 시간 매핑은 이번에 활성화하지 않는다.
- 전체 원장 검증 비용은 원장 크기에 비례한다. 우선 정확성 경계를 검증하며 이것을 장기 운영
  성능 PASS로 보고하지 않는다. 실제 활성화 전 원장 성장·쓰기 소유권·구형 binary 접근을 닫아야 한다.
  64KiB chunk로 읽고 record 하나는 16MiB 안전상한을 적용한다. 상한 초과도 원문 보존 후 거부한다.
  충돌 인덱스 메모리는 원장 크기에 비례한다. 기존 일반 Append에 전체 scan을 추가하지 않으며,
  외부/일반 append로 생긴 충돌은 다음 Reserve에서 검출한다. 비협조 writer 차단 완료가 아니다.

검증은 기존 `./server.sh verify-v410-recording-catalog`만 사용한다. 새 API의 컴파일 가능한
거부 stub에서 최초 발급·재시도/재시작·정상 원장 호환·동시 발급 assertion의 예상 RED를 확인한다.
기존 회귀/빌드/환경 오류는 예상 RED가 아니다. 중앙 S10-3B 사전등록의 오류 경계도 GREEN에 포함한다.
코드 네 파일은 기존 담당자 소유, 문서/최종 검토는 메인 소유다. 하위 생성·커밋·푸시·S10-3C 착수는 금지한다.

| 런타임 패밀리 | 담당 | 추천 모델 | 추론 수준 | 선정 근거 |
| --- | --- | --- | --- | --- |
| Codex | 단일 기존 서브에이전트 | gpt-6-astra | medium 유지 | 영향2/불확실성1/검증2/범위1=6. 저장 원자성의 확정 구현이며 메인이 안전 계약·결과를 검토한다. 상향/추가 생성 없음; 실행 설정 변경 없음 |

- [x] 사전등록·예상 RED 확인
- [x] 저장 API 및 catalog 호환 구현·GREEN
- [x] 실제 diff·개별 결과·cleanup 대조와 한정 완료 보고

저장 API 한정 결과: RED 두 회 모두 113/13(새 양성13만 예상 실패), GREEN135/0 후
기존 계약의 독립 경계4개를 보강한 최종139/0(C++130+shell9). 제품 코드는 GREEN 이후
변경하지 않았다. 개별 결과·이력·cleanup은 중앙 테스트 기록 S10-3B 절에 보존한다.
메인은 same-FD 잠금, strict payload/envelope 결박, 단조 발급·ID 충돌, fsync 뒤 결과 반환,
기존 Append 비용 유지와 실제 테스트를 직접 대조했다. 이번 변경은 위 코드 네 파일 및 관련
기존 문서에 한정한다. 커밋·푸시는 미수행이다. 실제 writer 활성화와 S10-3C는 미완료다.

### 기존 전체 완료 조건 (S10 이전 계획 보존)

### S10 후속 2번 — 입력 관측과 실제 writer 연결

현재 판정: 후속2 명시 주입 입력/writer 연결과 관련 단기 검증 완료. 입력14/writer37/active ready55/
기존 recorder118 및 전체 빌드 증거는 동결 소스/바이너리16개 일치 확인 후 유지했다.
최초 미디어 회귀는 빈 STUN의 외부 기본값 fallback으로 무효이며 실패 이력을 보존한다.
사용자 승인 후 검증 전용 loopback STUN과 env/실제 config 가드7개를 보완하고 동일 미디어 회귀
codec67/ICE8/metadata 실제10개, 문서 links/assets10개 및 cleanup을 통과했다.
제품 기본 STUN 정책·녹화 코드는 이 재검증에서 변경하지 않았다. 후속2는 `a5673050`으로 커밋하고
`origin/v4.1.0`에 푸시했다. 서버 기본 전환/소비자 연결인 후속3은 아래 순서로 착수한다.
S11·장시간/UI 전체는 미수행이다. 상세 명령·최초 실패·정리는 중앙 기록의 같은 절을 따른다.

2026-09-12 사용자 개발 승인. 기존 승인 설계의 입력→writer→관리 저장소 경계를 구현한다.
메인이 안전 계약·문서·최종 검토를 맡고 단일 Astra/medium 담당자를 순차 재사용한다. 하위 위임은 금지한다.
기존 미커밋 S09/S10 변경은 보존한다. 이번 요청에는 커밋·푸시·장시간/UI 실행을 포함하지 않는다.

입력은 appsink sink pad의 비차단 buffer/event 관측에서 원본 timestamp 유효성, duration,
세대+프로세스 내 세대 순서+track ordinal, monotonic→UTC→monotonic 시각을 결박한다. seek bus thread의 atomic
증가만으로 이미 pull한 packet을 새 세대로 바꾸지 않는다. serialized SEGMENT와 buffer를
같은 지점에서 관측하며 DISCONT·PTS 감소만으로 재시작하지 않는다. 기존 pts/dts/payload와
스트리밍 전달 순서는 그대로 유지하고 cache 재전달은 불변 관측을 복사한다.

writer는 불변 세그먼트 ID와 내구 순서를 파일 작성 전에 예약하고 새 시간 계약을 ready→publish→
catalog finalize에 전달한다. UTC 변화는 물리 분할 기준이 아니며 매핑 경계로 처리한다.
재정렬·부재·오차 예산 초과에서 표현할 수 없는 매핑은 unknown으로 남기고 UTC를 보정해 꾸미지 않는다.
직접 미디어 입력과 관리 catalog를 결합한 단기 검증으로 증명한다. V1 조회·보존 소비자는 아직
새 저장소를 보지 못하므로 서버 기본 경로 전환은 후속 3번과 함께 한다. 새 공개 config나
영구 dual-store를 추가하지 않는다. 이번 writer 연결 PASS는 서버 전체 전환 완료가 아니다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 | 진행 대상 | 입력 관측·writer·저장 연결 변경 | S10-INPUT01~10, S10-WR01~09 및 영향 회귀 | 이번 개발 요청의 격리 단기 검증 |
| 30분 | 미진행 | 개발 중 focused 검증, 최종 코드 미고정 | S11에서 유효 증거 대조 | 이번 실행 없음 |
| 120분 | 진행 대상 | source/media 관측과 writer lifecycle 직접 변경 | source_factory, webrtc_source_session, gstreamer_segment_writer | 필요성만 판정; S11 범위 확정 후 실행, 이번 실행 없음 |
| UI 풀테스트 | 미진행 | UI 변경·서버 기본 전환 없음 | 후속 3번/S11 | 이번 실행 없음 |

#### writer 구현의 고정 경계

- `GStreamerSegmentWriter::Options`의 내부 명시 주입으로 관리 journal/catalog/store ID를 받는다.
  불완전 주입·lease 없음은 시작을 거부하고 기존 callback에 V2를 V1처럼 변환하지 않는다.
  journal/catalog의 수명은 writer보다 길어야 한다. 서버 구성 기본값은 아직 바꾸지 않는다.
- 첫 저장 가능 keyframe에서 UUID segment/request ID와 durable order를 먼저 예약한다.
  기존 파일 생성·quota reservation·ready 실패 보존 경계는 재사용한다. active V2 finalize는
  `CommitFinalizeReadyV2`로 정확한 ticket 하나만 처리한다. 정상 V1 경로는 유지한다.
- V2 분할은 원본 미디어의 단조 진행 기준과 keyframe으로 결정한다. UTC 후퇴/전진으로
  분할 간격·미디어 세대를 변경하지 않는다. 명시 source generation 변경은 새 연속 구간이다.
  PTS 재정렬은 DTS 진행을 사용해 구분하고, 안전한 mux가 불가능하면 오류/공백으로 남긴다.
- 원본 uint64 timestamp의 int64 변환 범위·뺄셈·끝 계산 overflow를 검사한다. DTS/PTS의
  의미를 바꾸거나 음수 composition offset을 0으로 눌러 재정렬을 파괴하지 않는다.
- 동일 generation/ordinal 재전달은 재녹화하지 않는다. 오래된 세대의 cache 재전달은
  새 세대로 되돌아가는 근거가 아니다. 미확정 원본 관측은 처리 시각으로 대체하지 않는다.
  세대 순서는 관측 지점의 내부 단조 카운터로 판단하며 UTC·clock 품질에 의존하지 않는다.
  이 순서는 프로세스 내부 cache 구분용이며 영속 저장 순서나 프로세스 재시작 간 비교값이 아니다.
- clock 판정 예산은 설계 S10-2 표를 따른다. 매핑 UTC는 서버 관측/추정 provenance를
  명시하고 촬영 시각으로 주장하지 않는다. 확정 불가능한 재정렬·중복 PTS 구간은 unknown이며
  이전 확정 파일을 고치지 않는다. metadata는 최대256개 내에 unknown-tail 자리를 포함한다.
  duration 부재/0/overflow는 마지막 끝 위치 미확정이다. V2 경로는 구형 단일 anchor snapshot을
  게시하지 않아 소비자가 잘못된 UTC 대응을 읽지 못하게 한다.
- 시간 매핑의 clock 측정 오차를 미디어 대응 정확도로 오인하지 않는다. anchor 대비
  PTS 증가와 단조 관측 증가의 차이가 기존 두 관측 측정 오차를 넘으면 해당 매핑은
  `unknown`으로 낮춘다. 이것은 clock 보정 감지식과 별개이며 새 허용 임계값을 추가하지 않는다.
  `estimated`의 uncertainty는 관측 UTC와 PTS 외삽 UTC 사이 최대 잔차와 측정 예산을 포함한다.
  재정렬 입력의 확정 끝은 유효 frame end의 최대값을 포함해야 하며 미확정 duration을 숨기지 않는다.

진행 순서: 입력 관측 TDD → writer/관리 저장소 TDD → 관련 회귀·직접 diff 검토 → 기록/정리.
새 검증은 중앙 기록과 inventory에 실행 전에 등록한다. 기존 유효 catalog/finalize 증거는
변경 영향이 없으면 재사용하며 입력·미디어 영향 검증은 새 결과로 구분한다.

### S10 후속 3번 — 소비자 연결

독자는 구현·검토 담당자이며 이 절은 기존 S10 명세의 실행 계획이다. 작업 정책은 AGENTS,
실제 결과는 중앙 테스트 기록을 따른다. 사용자 승인: 후속2 커밋·푸시 후 후속3 개발.

목표는 새 시간·식별·순서를 조회·보존·이벤트·분석이 같은 의미로 소비하게 하는 것이다.
승인된 불변 계약을 유지하며 C++17 내부 읽기 결과부터 연결한다. 기존 V1 DTO로 억지 변환하지 않는다.

- [x] 3A 내부 위치 해석: `recording_read_service.h/.cpp`와 catalog의 잠금 스냅샷 API.
  channel+segment+PTS의 정확한 미디어 위치와 channel+UTC ns의 역조회 후보를 분리한다.
  single/multiple/unknown/none/deleted와 미확정 후보 공존을 표현한다. 매핑·미디어 ID,
  timebase·provenance·uncertainty를 보존하며 파일 열기/재생 가능 판정은 하지 않는다.
  half-open 끝, 정수 overflow, 유효 0, unknown 끝, 서로 다른 후보를 독립 검증한다.
  `recording_location_resolution_smoke.cpp`와 격리 shell을 등록 후 예상 assertion RED→GREEN으로 실행한다.
- [x] 3B 보존·재생 보호: catalog의 hold·pin·삭제 대기·tombstone와 quota snapshot을 새 저장에 연결했다.
  용량 삭제는 영속 순서, 기간 만료는 별도 시간 정책이다. exact ID의 파일을 fd containment와
  삭제 mutex 보호 아래 해석하고 누락/손상/삭제를 재생 가능으로 반환하지 않는다.
- [x] 3C 내부 이벤트·분석 연결: `f94faffc`까지 opt-in 통합을 구현·검증했다. 공개 경로는 3D다. 3A 해석 결과를 소비한다. 같은 UTC인 다른 미디어 후보를 숨기거나
  하나의 V1 range로 합치지 않는다. 공개 응답의 호환 경계는 연결 전에 명시적으로 고정한다.
- [ ] 3D 서버 구성 전환: 앞 소비자와 관련 회귀가 완료된 뒤 관리 writer를 기본 구성에 연결한다.
  opt-in·source 수명·종료·재시작·복구를 검증한다. 신규 검색/자동 연속 재생 UI는 제외한다.

3D 선행 호환 확인: 현재 V2 저장 계약은 channel에도 `ValidateOpaqueId`를 적용하지만 기존
`QueryTimeline`은 숫자형 channel을 허용한다. 3A는 현재 저장 계약을 소비하며 이 차이를 조용히
완화하지 않는다. 실제 서버 전환 전에 channel 의미를 대조하고 저장·입력·조회 검증을 함께 닫아야 한다.

3A는 LOC14/0·기존 읽기166/0+cleanup·catalog246/0으로 한정 완료했다. 원출력과 최초 RED는
중앙 기록에 보존한다. 3B는 아래 한정 판정으로 완료했으며 후속3 전체 완료는 아니다. 단일 기존 Astra/medium 담당자가
확정된 코드와 단기 검증을 맡고 메인은 문서·안전 계약·diff/증거 검토를 맡는다. 하위 위임 금지.
이전 S09 미커밋 경고는 당시 이력이며 현재 잔여 작업으로 반복하지 않는다. 3D-1 시작 시 작업 트리는 clean/sync였다.
S11·장시간/UI 전체와 후속4 데이터 삭제는 자동 착수하지 않는다.

#### 3D 실행 분할 — 2026-09-13

현재 계약은 [설계 문서](../specs/2026-09-02-v410-recording-search-foundation-design.md)의 「S10 3D-1 기본 구성·조회 소비 계약」 절이다.
최초 사용자 승인은 3D-1 문서 확정·검증·커밋·푸시였으며, 이후 별도 지시로 3D-2 개발·커밋·푸시가
승인됐다. 이어 사용자가 3D-3 개발·커밋·푸시를 별도로 승인했으며 실제 브라우저 검증은 제외했다.
현재 실행 경계는 아래 3D-3 절을 따른다. 이후 legacy 정리·S11로 자동 확대하지 않는다.

- [x] **3D-1 계약 확정:** 식별/시간/복수 출력/우선순위/재생 상태와 D01~D08 합격 조건을 기존 설계에 반영.
  산출물은 이 계획·설계·로드맵·중앙 기록이다. 제품 코드 변경·제품 PASS가 아니다.
- [x] **3D-2 기본 구성 연결:** `recording_contracts.cpp`, `recording_journal.cpp`, `recording_catalog.cpp`의
  참조 ID 검증 적용부를 대조하고 `media_server_application.cpp`에서 관리 저장소/writer/provider/job 수명을 연결.
  D01·D02 개별 사례 사전등록→focused 예상 RED→구현→GREEN→identity/catalog/consumer/writer/retention 영향 회귀·build.
  공개 timeline/UI와 legacy 데이터 삭제는 제외한다. 소유 격리 fixture만 사용하며 종료·port·임시물 정리까지 기록한다.
- [x] **3D-3 공개 조회·재생/UI 구현·승인 단기 범위:** `recording_read_service.h/.cpp`, `recording_application_service.cpp`,
  `product_ui_page_scripts.cpp`에서 D03~D08을 적용. catalog 현재 결과·출처를 소비하며 기존 질의 입력을 유지.
  API/매핑/권한/삭제 경쟁 사례 등록→예상 RED→서버·UI 동시 반영→focused·영향 회귀·build 순서다.
  실제 브라우저는 이번 사용자 제외로 미실행이다. D08 완료 표기가 아니며 정적/fixture PASS로 대신하지 않는다.

3D 뒤 순서는 새 기본 경로 검증 → 불필요 legacy 코드·개발 데이터의 정확한 소유/의존 대조 및 정리 →
S10 코드 고정 → S11 증거 유효성 대조와 승인된 최종 검증이다. 강제 변환·역사적 실패 삭제·새 검색 기능은 제외한다.

#### S11 준비: 테스트 코드 반영 대조 — 2026-09-14

##### 현재 승인 범위 — 2026-09-15 P0 1·2 분리 개발

최종 결과: 1·2 완료. 실제 크기 전이5.67→3.25초, 원본 검증 유지·정확 동일 후보 재복원 제거, 최종 build/CP9/catalog246 및 영향157 통과. 실제 한정 HTTP는190건 전부4초 이내(최대3,786ms), 서버/포트/root 정리 완료. 부분 출력1개는 그대로이며 3번 구간 충족·4번 완전2출력/재기동/통합은 미완료다. 전수 결과는 [P0 최종 기록](../../release-artifacts/v4.1.0/s11-preparation-mapping/p0-transition-reproduction.md)을 따른다.

사용자는 독립 실패 재현·원인 확정(1)과 전체 전이 중복 제거·잠금 지연 개선(2), 분할 커밋·최종 푸시를 승인했다. 녹화 대기 정책 변경(3), 복수 출력·재기동·5stage 통합 완료(4), 브라우저·장시간·릴리즈는 이번 범위 밖이다.

- 1: 실제 크기 Ready/Complete와 자동 checkpoint를 기존 C++ Catalog/서비스로 재현하고 순수 연산·전체 전이 비용을 구분한다. 별도 bounded-partial 검사에서 원본 확정 시점과 분석 증거 구간을 구분하고 정확한 미충족 이유를 확인한다. 원인 재현의 기대 결과와 제품 수정 PASS를 구분한다.
- 2: 확인된 비용만 줄이며 canonical/ID/원장·SQLite·복구·hold/삭제 안전 계약을 유지한다. 호출 단위 검증 결과 재사용을 우선하고, 전역 캐시·검사 삭제·대기 상향·잠금 구조 변경을 자동 포함하지 않는다. 성능 RED→최소 수정→동일 독립 검사·영향 회귀·한정 HTTP 지연 검증 순서다.
- 분할 커밋은 각 단위의 실제 합격·정리·기록 후 수행한다. 기존 3·4 관련 미완료 변경을 1·2 완료로 섞지 않는다. 기존 실패와 승인된 수정은 보존한다.

담당은 기존 단일 Astra/medium 구현자, 메인은 계약·원인·diff·완료 판정·커밋을 담당했다. 상세 재현 정의와 실제 결과는 위 P0 최종 기록에 보존했다. 아래는 착수 시점의 계획·과거 실패 이력이다.

##### 직전 결과: P0 최소 수정·회귀 완료, 실제 HTTP 재발 및 부분 출력으로 미완료

최소 canonical 중복 제거는 RED 뒤 GREEN7개, 최종 build 및 영향 회귀185개를 통과했다. 임시 제품 계측은 제거해 Catalog/read/projection은 HEAD와 같으며, record 직렬화 중앙값은82077→28804us이고 canonical hash는 같다. 그러나 실제 첫 재검증은 출력 대기 실패, 추가 안전 상태 관측 후 실제 재검증은31,697ms에 HTTP header timeout으로 다시 실패했다. 최종 상태는 job complete·요청 partial·출력1개이며 정확2개·재기동·5stage 통합은 미완료다. 최소 성능 개선을 HTTP P0 해결로 승격하지 않는다.

메인이 실제 입력에 `ffprobe -v error -select_streams v:0 -skip_frame nokey -show_entries frame=best_effort_timestamp_time -of csv=p=0 video/imports/va_tracking_event_1280x720_30fps_h264.mp4`를 실행(exit0)해 keyframe 0/8.333333/16.666667/25초를 확인했다. 현재 설정2초·post750ms는 RecordingRuntimeEventBudget에서3750ms 대기가 된다. trigger sourceEnd8.2초/tap·dispatch8.566666666초로 stale trigger가 아니며, 다음 원본 finalize 전에 부분 결과가 확정될 수 있는 입력/완전 출력 기대조건의 불일치가 드러났다. 실제 partial의 모든 미충족 구간 이유는 아직 직접 수집하지 않았다.

동일 실제 검증을 추가 반복하지 않는다. 잔여 P0는 (1) Ready/전이/checkpoint의 나머지 반복 검증·잠금 점유를 독립 입력으로 분리해 HTTP 재발 해결, (2) 긴 GOP의 부분 결과와 완전2출력 시나리오의 선수조건을 구분해 실제 재기동·통합 연결 완료다. 제품 대기/녹화 정책·HTTP timeout·합격 기준을 임의 변경하지 않는다. 모든 실행 소유 서버·포트·UDP·root 정리는 완료했으며 실패 단계 커밋/푸시는 하지 않았다. 아래는 이번 P0 착수 시점의 계획이다.

##### P0 착수 계획: 원인 계측 후 최소 수정

사용자가 두 P0의 개발을 승인했다. DIAG05~07의 실제 격리 계측에서 timeline snapshot 대기4642ms, 같은 Catalog mutex의 UpdateDerivedJob 점유4459ms 및 그 안 append/apply3846ms를 관측했다. 메인은 AppendAndApplyLocked의 1MiB checkpoint 조건과 CheckpointLocked의 원본/압축 후보 전수 복원·투영 동등성 검증을 직접 대조했다. 동일 job의 엄격 복원·직렬화가 반복되는 것이 주요 연산 경계다. 물리 매체 검사5초와 HTTP4초의 차이만으로 원인을 설명하지 않는다.

검사·내구성·잠금·시간/ID 계약은 유지한다. 먼저 source1/250 samples/45 slices의 독립 baseline(P0-PERF01)을 측정하고 동일 source의 반복 canonical 직렬화와 중복 selection 복원만 줄이는 최소안을 검증한다. 임시 제품 계측은 원인 확인 후 제거한다. 이후 최종 빌드·영향 회귀·원래 HTTP4초 조건의 실제 복수 출력/재기동·현행 통합을 순서대로 실행한다. 브라우저·장시간·최종 S11은 이번 범위 밖이며 아직 복수 출력/재기동 PASS 또는 커밋/푸시 완료가 아니다.

##### 직전 중단 이력: 내부 전달 보완 검증·실제 앱 타임라인 지연

내부 증거 전달 수정의 build와 focused15, read4/rule4/storage7 scoped, consumer22가 통과했다. 실제 앱에서 기존 녹화 참조 부재는 해결됐으나 이후 정상 accepted placeholder 오분류를 보완한 재실행이 timeline HTTP timeout으로 실패했다. query는 각 finalized 매체 물리 검사를 포함하며 기본 검사 예산5초와 검증 HTTP4초의 차이가 있지만 실제 내부 지연 원인은 미계측이다. timeout을 확대하거나 제품 조회 경계를 임의 수정하지 않는다. 출력2개·두 번째 기동·실제5단계 통합은 미완료/건너뜀이다. 현재 작업 커밋·푸시는 승인이 있어도 미해결 단계 때문에 보류한다. 상세는 [통합 준비 기록](../../release-artifacts/v4.1.0/s11-preparation-mapping/integration-preparation.md)을 따른다.

사용자가 내부 전달 누락 보완과 해당 작업 커밋·푸시를 승인했다. 동일 분석 결과의 observation context/namespace·원본 샘플 연관·decoded snapshot을 read DTO 왕복, rule evaluation, dispatch projection/복원에서 보존한다. 내부 불변 캐리어는 source/PTS/frame에 결박하며 전체 분석 결과·history를 보관하지 않는다. 부재/불일치 증거는 기존처럼 거부하고 최신 프레임의 정보로 보충하지 않는다. 공개 schema·저장 포맷·녹화/보존 정책은 변경하지 않는다.

S11-EV01~06을 inventory와 중앙 기록에 사전등록했다. 실행 순서는 변환/평가/전달 focused RED→최소 구현/GREEN→관련 회귀→실패했던 실제 앱→현행 통합이다. 브라우저·30분·120분·최종 S11 실행은 제외한다. 아래 중단은 최초 실패 이력이며 이번 승인으로 해당 내부 보완만 재개한다. 최종 검증 및 커밋·푸시 결과는 실제 수행 후 기록한다.

##### 최초 중단 이력: 인증 선수조건 완료·현행 통합 연결 제품 경계 실패

인증 준비는 `6ab2f61c`에 커밋했다. 임시값 생성·stdin 전달·격리 root·정리 경계를 보완했고 자체검사17개와 실제 bootstrap/users/routes를 통과했다. [전수 결과와 실패 이력](../../release-artifacts/v4.1.0/s11-preparation-mapping/auth-preparation.md)을 기준으로 하며 제품 인증 정책은 변경하지 않았다. 매핑 링크 보완은 `d04545fc`로 분리했다. 두 커밋의 푸시는 현재 후속 통합 작업 종료 후 수행할 예정이다.

현행 통합 연결은 S11-CI01~11을 등록하고 개발 중이다. 새 실행 판정과 legacy `integrationExecutionPass`를 분리한다. 공개 timeline의 event/reference/job과 모든 출력 파일, 실제 두 번째 제품 기동을 검사하며 새 JS 원장 재생 엔진은 만들지 않는다. 공개 `mediaRange`에 epoch/generation/track이 없어 동일 시간축 대조가 불가능한 관측 공백을 확인했다. 이 부분만 정상 종료 후 작업 소유 복제본에 기존 C++ Catalog를 여는 검증 adapter로 보완한다. 원본 archive를 별도 Open하지 않고 복제 전후 원본 목록·bytes/hash 불변을 확인하며, 복제본 Open의 복구 쓰기는 원본 상태와 구분한다. 브라우저·30분·120분·최종 S11 suite는 이번에 실행하지 않는다. 아래의 문서-only/미착수 표현은 당시 기록이다.

현재 중단 근거: 실제 앱 단독 실행은 S11-CI07에서 EventRecord의 녹화 참조가 없어 exit1로 종료됐다. `webrtc_http_server_runtime.cpp:4619`의 dispatch가 `webrtc_http_server_ops_incidents.cpp:606`의 projection과 `event_storage_application_service.cpp:86`의 AnalysisResult 재구성을 거치면서 observation context/namespace·source association·decoded intervals를 전달하지 않는다. `event_recording_bridge.cpp:324`는 빈 context를 참조 생성 전에 거부한다. 메인이 소스를 직접 대조했다. 검증 코드만의 문제가 아니므로 제품 내부 전달 경로 보완의 범위 승인이 필요하다. 제품 코드는 수정하지 않았고 실제 두 번째 기동·5단계 통합 실행은 건너뛰었다. 첫 제품 정상 종료·양포트 반환·UDP 종료·44,617,344바이트 소유 root 제거를 확인했다. 2번은 미완료·미커밋이며 누적 푸시는 보류한다.

##### 후속 2번 착수 — 2026-09-14

최신 결정: [2번 선행 재사용 범위](../../release-artifacts/v4.1.0/s11-preparation-mapping/reuse-decision.md).
기존 managed HTTP/default/실제 이벤트 focused를 우선 재사용하고, 내부 adapter는 부족한 관측이
확정될 때만 조건부로 추가한다. 아래 착수 검토의 C++ adapter 우선안은 이 결정으로 보완됐다.
1번 매핑 보완과 2번 선행은 문서 범위이며 이번 제품 테스트·단기 자체검사도 실행하지 않았다.

사용자 승인으로 매핑 문서5개를 `f12e0cd8`에 커밋하고 `origin/v4.1.0`에 푸시했다. 이후 clean/sync를 확인했다.
2번은 기존 제품 계약을 바꾸지 않고 검증기의 current 저장 계약 연결을 준비하는 작업이다. 첫 단위는
현행 원장의 참조→내구 job→복수 output을 실제 통합 검증기가 읽는 경계다. 항상 false인 준비 상태
manifest만 추가하는 초안은 실행 연결을 개선하지 못하므로 채택하지 않았다.
단일 Astra/medium 담당자를 재사용하고 메인이 설계·등록·diff를 검토한다. 기존 checkout과 이 계획을 유지한다.

| 경계 | 생산 / 소비 | 결정 |
| --- | --- | --- |
| 기존 suite / 과거 기록 | integrationExecutionPass는 runtime+auth 실행 완료 | 의미 유지. 전체 S10 완료로 승격하지 않음 |
| 현행 통합 판정 | exact 대상·현재 oracle 연결·실행 증거 | 미연결·미실행은 명시. 파일 존재나 ID 문자열만으로 PASS 금지 |
| 통합 준비 / 후속3~5 | 원장 관측·장시간·공통 인증·UI seed | 이번 첫 단위에서 수정하지 않고 준비 미완료 경계 유지 |
| 향후 구현 검증 / S11 최종 | Node 자체검사·단기 영향 회귀 / 실제 서버·브라우저·장시간 | 향후 구현 때 해당 단기검사. 이번 선행 문서 작업에서는 모두 미실행 |

제품 src/include·시간/ID/schema/auth/media 불변. 테스트는 개별 사전등록 후 TDD로 실행하며 실패·정리 기록을 보존한다.
이번 새 구현의 커밋/푸시는 아직 수행하지 않았으며 매핑 문서 커밋과 혼동하지 않는다.

설계 대조: `state()`(foundation108행)는 구형 link/event 매핑이고 eventCase582행은 단일
derived_segment_id를 소비한다. 현행 accepted reference와 job의 복수 output/Complete 및 현재
삭제·손상 상태는 서로 분리해야 한다. 이 관계를 JS JSONL replay·lossless parser로 새로 재구현하는
제안은 제품 저장 계약의 중복 유지 위험 때문에 채택하지 않았다. 다음 구현 설계는 기존 C++ catalog
조회 경계를 사용하는 검증 전용 adapter와 공개 HTTP 판정을 결합하는 방향으로 검토한다.
catalog Open의 복구/색인 쓰기 부작용부터 확인하고, 실행 중 원장에 별도 catalog를 열어 변경하지 않는다.
필요하면 종료된 격리 archive 복제본에서만 읽기 검증한다. 아직 adapter 설계 확정·제품/테스트 코드
수정·검증 실행은 없으며, 2번은 착수/미완료 상태다. 이 설계 대조를 2번 구현 완료로 보고하지 않는다.

후속 1번의 [등록·소스 매핑 감사](../../release-artifacts/v4.1.0/s11-preparation-mapping/README.md)를 작성했다. S00~S09/ENV/IDMAP 표 283행과 S05 하위92개, S10 문맥별 정의를 대조했다. 미결박·ID 재사용·구형 oracle·최종 실행 미연결을 분리했으며 전체 coverage 또는 S11 준비 완료로 판정하지 않는다. 이번에는 문서만 변경했고 후속 2번 개발·테스트 실행·브라우저·커밋·푸시는 진행하지 않았다.

기준 `037d42ee`, `v4.1.0` clean/sync에서 사용자 요청에 따라 최종 검증 전 준비 코드를 읽기 대조했다.
메인은 기존 S00~S08/S09 실행 경계·인증·구형 fixture, 단일 Astra/medium 담당자는 S10 기능군의
실제 assertion과 실행 연결을 확인했다. 아래는 **준비 감사 결과이며 실행 PASS가 아니다**.
제품 수정·데이터 삭제·테스트 실행·커밋/푸시는 이 대조에서 수행하지 않았다. 이 기록의 문서 형식
검사만 별도로 수행한다. 실제 브라우저는 사용자 제외이고 최종 안정화/30분/120분/UI는 이후 승인 범위다.

판정: 신규 기능의 개별 테스트는 존재하지만 **현재 S11 통합 경로에 전부 반영됐다고 판정할 수 없다**.
기능군별 소스·oracle 대조이며, 모든 등록 ID/분기/변형을 한 행씩 연결한 최종 전수표 완성은 아니다.
파일 존재, 직접 bash 실행 가능, 최종 묶음 포함, 현재 계약 검사, 실제 PASS를 서로 구분한다.
아래 경로는 `scripts/internal/` 기준이고 행은 조사 당시 기준이다.

| 기능군 | 실제 테스트 코드·oracle 근거 | 실행 연결·남은 준비 |
| --- | --- | --- |
| S00 연구/버전 기준 | `verify_v410_entry_baseline.sh` source4.1/published4.0 분리·연구 gate dispatch 검사 | 제품 시간/녹화 검증이 아닌 metadata 기준. 기존 S00 기록 유지 |
| S01~S03 기존 계약/recorder/catalog | `verify_v410_recording_contracts.sh`는 `recording_contract_smoke.cpp`와 v1 golden fixture를 실행 | 구형 계약 테스트를 새 관리 저장소 전체 검증으로 사용하지 않음 |
| 시간·입력 | `recording_managed_writer_smoke.cpp:135,187,244` 실제 프레임/시계 split/B-frame; `recording_input_observation_smoke.cpp:84` 입력/세대/GOP | managed writer/input runner 존재. `recording_time_policy_probe.cpp:14` 순수 설계 모델과 제품 검사를 구별 |
| ID·숫자 참조 | `recording_numeric_reference_smoke.cpp:23` 007 왕복/실제 writer/binding; `recording_identity_smoke.cpp:177` 매핑·실패 | 두 직접 runner 존재, 신규 항목 최종 실행 목록 연결 필요 |
| 저장/binding | `recording_source_binding_smoke.cpp:86` 단일 bound finalize/복구; `recording_derived_jobs_smoke.cpp:178` replay·예약·실패폐쇄 | 구형 catalog runner만으로 대체 불가 |
| 쓰기 경계 | `recording_write_boundaries_smoke.cpp:13` 수락 후 색인/cap/실패 순서 | callback 실패 검사와 실제 입력 검사를 구분해 연결 |
| S07 분석 증거 | `recording_frame_correlation_smoke.cpp:107`, `recording_observation_runtime_smoke.cpp:178` decoder/manager·interval union/cutoff/reset | 신규 runtime 경계와 기존 `verify_v410_recording_observations.sh` 구분 |
| 참조·위치 | `recording_consumer_reference_smoke.cpp:22`, `recording_consumer_connection_smoke.cpp:330`, `recording_range_resolution_smoke.cpp:142` 축·padding·stable link·반개구간·복수 mapping | 미주입 pending도 의도된 독립 계약이므로 이름만 보고 삭제하지 않음 |
| 파생 선택/remux | `recording_derived_selection_smoke.cpp:61`, `recording_derived_remux_smoke.cpp:175` 세대·중복PTS·공백·분수잔차·취소/FD | 신규 selection/remux runner를 최종 목록에 연결 |
| S05/S08 내구 job·복구 | `recording_derived_job_service_smoke.cpp:426`, `recording_derived_jobs_smoke.cpp:280` 취소/SQLite/fallback/checkpoint/tombstone·append 불확실성 | 기존 finalize integration과 신규 job 검사를 구분 |
| 실제 이벤트 통합 | `recording_derived_event_integration_smoke.cpp:100,525,748` 별도 복구 프로세스·H264 decoder→2출력·sticky ownership | 신규 통합 runner 존재. S09 event-link oracle를 그대로 적용하면 안 됨 |
| S04 보존·재생 보호 | `recording_retention_v2_smoke.cpp:149`, `recording_public_media_smoke.cpp:47` quota/pin/hold/손상·Complete 출력·원본 삭제 이후 제공 | 직접 runner 존재. 수동 무연결 Event 거부와 유효 파생 Event 허용을 함께 유지 |
| S06 공개 DTO/HTTP/UI 소비 | `recording_public_timeline_smoke.cpp:77`, `recording_playback_status.test.mjs:58`, `verify_v410_recording_ui_contract.mjs:380,544,583` 정밀시간/unknown/itemId/페이지·실제 HTTP/auth/hold | HTTP 경로 갱신됨. VM은 실제 브라우저 아님. VM/public focused가 기본 S06/S11 묶음에 자동 포함되지 않음 |
| 서버 기본 구성 | `recording_default_composition_smoke.cpp:148,310` 실제 supervisor·off/on·복구·기본10s/post5s·provider 수명 | default composition runner 존재, foundation suite 미호출 |

##### 확인된 준비 결함과 수정 순서

| 순서 | 직접 확인된 결함 | 수정안·합격 기준 |
| --- | --- | --- |
| 1 | `recording_foundation_suite.mjs:35`는 runtime/app-auth 두 단계뿐. 신규 S10 focused는 직접 명령으로만 존재 | 기능 ID→제품 계약→실제 oracle→실행 명령→네 검증 영역의 전수 매핑을 먼저 확정. 누락/중복/구형/순수모델/실제 제품 검사를 구분. 모든 직접 runner를 무조건 wrapper에 넣기보다 최종 manifest의 exact 대상과 미실행 전파를 검사 |
| 2 | `verify_v410_recording_foundation.mjs:108,424,582` 구형 원장·segment.v1·단일 derived_segment_id/fallback 전제. 제품 원장은 `src/recording/recording_journal.cpp:139`의 recording-v2-mutations.jsonl | 기존 승인 계약의 reference→job→복수 output·현재 가용성을 검사. 요청 PTS를 UTC로 보거나 managed Event에 구형 fallback을 강제하지 않음. runtime smoke의 legacy 직접 구성(146행)도 새 default 검사와 분리 |
| 3 | `recording_journal_reader.mjs:4`, observer6/summary2의 구형7종 mutation; `recording_longrun_progress.mjs:45` V1 구조와 UTC strict 증가 강제 | bounded/strict 판정 유지, 현재 mutation·내구 order·독립 epoch·UTC mapping/unknown으로 관측 모델 전환. 시각 역행을 녹화 순서 실패로 단정하지 않음. deterministic 양성/음성 자체 검사로 준비 확인; 120분 실행은 하지 않음 |
| 4 | `verify_auth_workflow.sh:48` 사용자 env5개 요구, `1331` Node argv JSON quote, `1345` curl password argv. S06 shell72도 메모리 난수 auth 앞에서 구형 env 선검사 | 실행별 난수5개 자동 생성·프로세스 stdin/메모리 전달·출력 비노출·소유 임시물 정리로 보완. 실제 운영 계정/제품 auth 정책 불변. 등록된 기존 role/scope/암호이력 oracle를 삭제하거나 축소하지 않음 |
| 5 | `verify_v410_recording_ui_contract.mjs:686` UI만 구형 --seed-ui. UI auth prep test94 이후도 구형 원장/수동 Event 검사 | 새 managed seed와 실제 출력 provenance·미확인/부분/손상/삭제 상태를 준비. UI case의 selector/action/completion oracle를 현재 itemId/문자열/null/파일 시작 계약과 대조. 브라우저 기동·실제 PASS는 별도 |
| 6 | 구형 코드/fixture가 위 검증기에서 아직 사용됨. test/fixtures/recording/v1은 추적 파일8개이며 현재 compatibility manifest가4개 golden hash를 결박 | 대체 검증 연결 후 사용처·정확 소유·필요 음성 fixture를 대조하여 불필요한 경로만 제거. 로컬 개발 데이터 위치/소유 전수 확인은 아직 미완료이므로 이 조사로 삭제 승인 대상 확정하지 않음 |

삭제 전에 대체 검증을 확보하는 순서를 권장한다. `RecordingConsumerReferenceV1`과 `DerivedJobIntentV1`은
현재 새 파생 작업에서도 사용하는 독립 계약(`recording_derived_job.h:14`, `recording_derived_selection.cpp:179`)이다.
V1/V2 접미사만으로 일괄 삭제·재명명하지 않는다. 과거 실패/실행 기록은 보존하며 현재 PASS로 승격하지 않는다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/기능 | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 | 조건부 진행 | 준비 코드 수정 후 해당 자체 검사·영향 회귀 필요. 이번 대조에서는 제품 검사 없음 | 위 준비1~6, AGENTS7.6.2 | 준비 수정 범위 확정 뒤 단기 검사, 최종 묶음은 이후 |
| 30분 | 미진행 | 사용자가 최종 검증을 준비 이후로 지정 | S11/이번 요청 | 이번 실행 안 함 |
| 120분 | 미진행 | reader/progress 준비 미완료, 최종 검증 이후 | 위 준비2~3/S11 | 이번 실행 안 함 |
| UI 풀테스트 | 미진행 | 실제 브라우저 제외 유지·seed 준비 미완료 | 위 준비5/D08 | 이번 실행 안 함 |

다음 완료 판정은 전수 매핑의 미확인 해소, 준비 수정·관련 단기 검사, 구형 제거의 대체 증거,
코드 고정과 최종 실행 계획 확정이다. 이 감사만으로 준비 완료·S10/S11 완료를 주장하지 않는다.
테스트 임시물/서버/계정 생성 없음. 토큰 start/end/consumed는 실행별 계측 도구 부재로 미집계다.

#### 3D-3 실행 경계 — 2026-09-13

시작 기준은 `491daeee`, `v4.1.0` clean/sync다. 사용자는 3D-3 개발·관련 단기 검증·완료 후
커밋/푸시를 승인했고 실제 브라우저 검증은 명시 제외했다. D08 실제 재생 PASS는 만들지 않는다.
기존 승인 설계 D03~D08을 적용하며 별도 신기능·자동 연속 재생·codec 변환·legacy 삭제·S11은 제외한다.
단일 Astra/medium 담당자를 재사용하고 메인이 계약·안전 경계·diff·증거를 검토한다.
기존 승인된 같은 checkout·계획 문서를 유지하며 새 worktree/중복 계획 문서를 만들지 않는다.

| 순서/상태 | 파일·제공/소비 | 불변 조건·합격 기준 |
| --- | --- | --- |
| A 완료: 실제 미디어 제공 | catalog의 현재 output 결박 → read service의 hold·fd → application channel authorizer | 새 원본은 기존 보호 유지. 파생 Event는 단순 class 허용이 아니라 유일한 Complete/검증된 ready output·canonical segment·계보/파일 결박을 확인. 잘못된 채널·미완료·무연결·손상·삭제 상태는 거부. fd 해제 뒤 hold 반환 |
| B 완료: 공개 timeline | 동일 catalog snapshot의 원본·job·현재 상태 → read projection → application JSON | 기존 query 입력 유지. 작업 완료·요청 충족·파일 가용성 구분. UTC unknown null, ns/64bit 문자열, 안정된 항목 ID, 복수 출력·원본 계보 기반 중첩 우선. 페이지 바깥 이벤트도 우선 판정에 포함. D 실제 HTTP 확인 |
| C 구현·VM 검사 완료: UI 소비 | 새 JSON → 기존 녹화 table/control/video | 항목 ID 선택, 확인/미확인 시간 분리, 원본 보기 유지, 파일 시작 재생과 구간 안내 구분. UTC 차이 seek 금지, 미지원 명시. 공개 debug/source/원시 provenance 비노출. 실제 브라우저 제외 |
| D 단기 검사 완료·문서 마감: HTTP 연결·정리 | A/B/C 변경 diff → 단기 API/auth/VM·media 검증 | 실제 HTTP35·권한40·전송/종료10 및 harness5시나리오/내부40검사, build 통과. 최초 실패·개별 결과·cleanup 보존. 최종 문서/diff 검사는 D 기록 참조. 브라우저/장시간 미실행 분리 |

A/B는 catalog/read 파일을 공유하므로 같은 담당자가 순차 구현한다. B가 제공하는 JSON을 C가 소비하므로
메인이 필드·시간·pagination 경계를 먼저 고정했다. 이후 B 검증과 병행하여 메인이 C의 분리된 UI 파일과
VM 검사를 직접 구현·검토했다. A의 media 허용 여부를 B의 목록 표출만으로
대신하지 않는다. D는 유효한 기존 증거를 유지하고 직접 변경 범위만 재검증하며 전수 장시간을 자동 재시작하지 않는다.

A는 main diff 검토와 신규46·service43·retention24의113개 PASS 및 build/cleanup을 확인했다.
[A 보고서](../../release-artifacts/v4.1.0/s10-public-consumption/A-report.md)에 최초 RED·준비 오류·전수 결과를
보존했다. MIME도 hold 획득 snapshot에서 취득하도록 보완했다. 실제 HTTP/UI 및 B~D 전체 완료는 아니다.

C는 [C 보고서](../../release-artifacts/v4.1.0/s10-public-consumption/C-report.md)에 기존7개 포함29개
VM/DOM 소비 PASS와 최초 RED·중첩 안내 추가 RED·최종 결과를 보존했다. 실제 브라우저는 사용자 제외다.

D는 [D 보고서](../../release-artifacts/v4.1.0/s10-public-consumption/D-report.md)에 실제 writer→파생2출력의
HTTP 제공, 메모리 임시 인증, 유효 MP4 전송 fixture의 hash/Range/hold/종료와 정리 결과를 보존한다.
64MiB 파일은 실제 원본에 유효 free atom을 붙인 전송용이며 writer 생산량·브라우저 재생 증거가 아니다.
내구 시작복구는 seed 종료 후 실제 제품 첫 기동의 재개방이다. 실제 서버 두 번째 기동은 미실행이다.
일반 Auth wrapper 전체·장시간·외부 입력·legacy 삭제·S11은 수행하지 않았다. 일반 Auth wrapper의
비밀값 argv 전달 준비 결함은 S11 해당 인증 검증 전 보완 대상이며 이번 안전한 Node HTTP 인증으로 대체 PASS하지 않는다.

B 링크 영향 회귀의 Event 묶음은 compiled158개·application6개 통과 뒤 과거 composition oracle1개가
실패했다. 메인이 `491daeee` D02 diff와 현재 종료 경로·StopAndDrain을 대조했다. D02는 provider/recorder
수명 안에서 bridge 접수 차단·작업 join을 먼저 완료하도록 변경했지만, 기존 oracle은 storage 직후 drain을
요구했다. 이번 제품 diff는 종료 코드를 변경하지 않았다. 제품 계약을 되돌리지 않고 검증 준비만 현재 승인된
네 종료 경로에 맞추며, 누락·순서 역전·조기 해제 변형을 거부하는 검사를 함께 등록한다. 최초 실패는 보존하고
application-only→동일 Event 묶음→건너뛴 Identity/Jobs 순으로 진행한다. 앞선8개 회귀 PASS는 유지한다.
이 정적 구성 검사는 실제 종료/HTTP 전송 검증을 대신하지 않는다.
이어 구형 oracle의 등록부 제목 결박과 중첩 Node 런타임 검증기의 derived worker/job 링크 누락도 확인했다.
ID/정확한 결과 집합/기존 runtime oracle는 유지하고 검증 준비만 보완했다. 최종 Event·Identity·Jobs 및
B focused38개를 통과했으며 [B 보고서](../../release-artifacts/v4.1.0/s10-public-consumption/B-report.md)에
최초 실패와 준비 실패·최종 개별 결과·정리를 구분해 보존한다. 제품 종료 경로 수정은 없다.

##### 3D-3 B/C 메인 적용 판단

- 저장 payload를 바꾸지 않고 조회 시 투영한다. 파생 출력의 영속 UTC mapping은 현재 unknown으로
  고정되어 있다. 이를 덮어쓰지 않고 검증된 ready provenance의 실제 원본 구간과 intent source의
  기존 UTC mapping을 정확히 대응할 때만 `source-utc-mapping`으로 표시한다. 원본 PTS·파일 PTS·출력 PTS를
  동일 축으로 쓰지 않는다. 양자화/범위/매핑 결함은 미확인으로 남긴다.
  actual 시작/끝의 외곽 범위만으로 내부 공백을 덮지 않는다. 검증된 access unit의 원본 PTS와
  파일 duration 구간을 합집합으로 만들고, 우선 표시는 확인된 요청 구간과의 교집합만 쓴다.
  연속 구간만 합치며 서로 다른 mapping ID/epoch는 합치지 않는다. 표시 매핑의 provenance와
  uncertainty를 보존하여 추정 시각을 정밀 시각처럼 표시하지 않는다.
  UTC 정방향은 기존 내부 역변환과 같은 `utc_start + (PTS - mapping.start_pts) × timebase`다.
  UTC 양끝 길이에 맞춰 미디어 축을 비율 보정하지 않는다. 양끝 span 불일치·ns 정수 변환 불가인
  mapping은 공개 원본/출력 모두 미확인으로 남기고 우선 표시의 근거에서 제외한다.
- 공개 item은 `itemId`(구간/매핑별 안정 ID)와 `segmentId`(실제 파일)를 분리한다. `eventId`,
  `referenceId`, `jobId`를 허용하되 원장 원문·파일 경로·source key·hash/디코드 진단은 직렬화하지 않는다.
  `jobState`, `completeness`, `catalogState`, `playable`을 독립적으로 제공한다.
- 확인된 UTC 항목은 `items/total`, 위치 미확인은 `unplacedItems/unplacedTotal`로 분리한다.
  기존 offset/limit를 두 목록에 각각 적용하고 UI는 두 total의 최대값까지 페이지 이동한다.
  미확인 목록은 채널 내 시간 귀속 미확인 자료이지 요청 구간 내 자료라는 주장이 아니다.
- `startTimeMs/endTimeMs`는 십진 문자열 또는 null로 제공한다. 정밀 `utcRange`의 ns와
  `mediaRange`의 PTS/timebase, 순서값도 문자열로 보존한다. UI는 null/잘못된 문자열/JS 날짜 범위 초과를
  구분하고 안전한 범위만 Date로 변환한다. `requestedRange`를 UTC로 오해하지 않도록 요청 축을 명시한다.
- 우선 표시는 동일 source/store/epoch/원본 segment의 확인된 실제 겹침에서만 계산한다.
  부분 겹침이면 원본 행을 보존하고 겹친 구간만 안내한다. 원본 행 전체가 유효 이벤트 출력으로
  충족된 경우에만 원본 보기 해제 시 숨길 수 있다. 같은 UTC지만 다른 계보, 미확인 또는 파일 불가인
  이벤트는 원본을 숨기지 않는다. 이는 페이지를 자르기 전에 전체 관련 job을 대조한다.
- snapshot·응답 생성의 상한 초과는 명시적 실패로 처리하고 잘린 결과를 전체라고 하지 않는다.
  known 후보는 query overlap을 먼저 거른 뒤4096행/64MiB 상한을 적용한다. unknown은 전체수를 세되
  stable itemId 순서의 top(offset+limit)만 bounded 선택한다. 전체 누적 unknown을 복사·정렬하여
  첫 페이지가64MiB 초과로 영구 실패하게 만들지 않는다. offset+limit overflow와 실제 요청한
  깊은 페이지의64MiB 작업공간 초과는 실패다. 새 영속 index는 추가하지 않는다.
  catalog 잠금 안 순수 투영과 밖의 실제 fd/hash 검사를 분리하고 파일별 검사 결과를 요청 내 재사용한다.
  query 문법 오류는400, catalog 조회 실패는503으로 구별한다. 정상 기존 입력의 의미는 유지한다.
  영구 이중 저장은 만들지 않으며 기존 V1 독립 fixture 경로는 이후 legacy 정리 전까지 유지한다.
- 재생은 파일 시작부터다. 구간 표시는 재생 위치 보장이 아니다. 자동 seek/다음 파일 재생·새 decoder는
  추가하지 않는다. `canPlayType`은 형식 힌트이고 실제 재생 성공 상태로 표현하지 않는다.

위 판단이 틀리면 시간 귀속·원본 숨김·선택 안정성에 오류가 생길 수 있으므로 D03~D07의 경계 사례와
UI 순수 DOM 소비 검사를 먼저 등록한다. D08 브라우저 확인은 사용자 제외로 별도 미실행이다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 | 진행 대상 | 새 timeline/media/JS 소비·권한·정리 경계 | D03~D07, read/application/UI scripts, 녹화 전용 HTTP API/auth/lifecycle | 관련 단기 승인 |
| 30분 | 미진행 | 이번 단계 실행 미승인, S11 최종 gate | S11 | 미승인 |
| 120분 | 조건부 진행 | 실제 media 제공·hold/종료 영향은 최종 cut에서 대조 | D07/S11 | 이번 실행 미승인 |
| UI 풀테스트 | 미진행 | 사용자가 이번 브라우저 검증 명시 제외 | D08 | 명시 제외·PASS 대체 금지 |

일반 Auth bootstrap/users/routes 과거 실행 결과는 당시 범위의 역사적 증거로 유지한다.
이번에는 새 녹화 media/timeline의 실제 role/scope를 녹화 전용 격리 Node HTTP 검사로 다시 검증하며
일반 인증 전체를 새로 통과했다고 주장하지 않는다. 기존 shell auth workflow는 비밀번호를 curl/python의
argv로 전달하므로 현재 정책 그대로 안전하게 실행할 수 없음을 읽기로 확인했다. 해당 wrapper는
실행하지 않고 공통 인증 도구 정비를 이번 녹화 개발에 자동 포함하지 않는다. 이는 녹화 권한 검사를
생략하는 근거가 아니며 S11에서 일반 인증 묶음의 안전한 실행 준비가 필요하다.

D의 격리 HTTP fixture는 자체 H264→관리 writer→실제 파생2출력을 생성하고 출력 ID·기준 UTC·파일
정보를 소유 임시 manifest로 전달한다. API/auth는 이 실제 Event 출력으로 검사한다. 전송 수명 검사는
별도 상시 MP4에 유효 free atom을 붙인64MiB 파일을 size/hash 확정 전 구성하여 수행한다. 반복 MP4
bytes를 유효 영상으로 바꾸어 부르거나 실제 writer가64MiB를 생성했다는 증거로 쓰지 않는다.
미디어 검사·HEAD/Range/416·느린 수신 hold1→연결 중단/종료 뒤 hold0·정상 종료/port 반환을 유지한다.
인증 난수5개는 Node 메모리와 fetch 본문에서만 쓰고 argv/log/임시 manifest/Git에 넣지 않는다.
browser mode와 legacy UI seed는 이번 실행·수정에서 제외하며 후속 legacy 정리/S11의 준비 대상으로 남긴다.

#### 3D-2 착수·구성 검토 — 2026-09-13

사용자가 3D-2 개발·관련 단기 검증·마지막 커밋/푸시를 승인했다. 기존 `v4.1.0` checkout을 유지한다.
메인은 아래 구성/안전 판단과 최종 diff·증거 검토, 기존 단일 Astra/medium 담당자는 확정 구현을 맡는다.
하위 위임은 금지한다. 구현과 관련 단기 검증을 마쳤으며, 실제 명령·개별 결과·최초 실패와 정리는
[중앙 테스트 기록](../../release-test-records.md)의 3D-2 및 연결된 D01/D02 실행 기록을 따른다.
실제 file source의 off→on→off→on, 동일 store ID 유지, 기본 10초 세그먼트·후행 5초 출력의
실제 디코딩, 별도 프로세스 중단 복구 및 접수/종료 잠금 경계를 검사했다. macOS 격리 단기 증거이며
Linux·외부 입력·실제 서버 전체·공개 UI·30분/120분 최종 묶음의 PASS로 확대하지 않는다.

| 작업/연결 | 제공 → 소비 | 직접 확인 및 결정 |
| --- | --- | --- |
| D01 참조 ID | SourceViewRegistry 숫자 ID → writer/journal/catalog/reference/read | source_view_registry.cpp의 IsNumericRegistryId와 새 저장 opaque 검사가 충돌. 새 경로는 기존 opaque 문자/길이/경로 제한에서 숫자-only만 허용; 이전 V1 참조 규칙은 변경하지 않음 |
| D02 저장소 identity | managed journal marker/lease → catalog·writer | 고정 전역 ID·경로 hash를 쓰지 않음. 신규 root는 lease 아래 난수 ID를 기존 init/format에 보존하고 재시작은 동일 ID를 읽음. 명시 ID 모드 유지; 기존 데이터 자동 변환·삭제 금지 |
| D02 증거 갱신 | AnalysisResultObserver → 파생 worker provider | history는 decoded_intervals를 비우므로 공개 history 조회로 보완하지 않음. 내부 bounded immutable snapshot을 namespace/source/channel로 결박하고 비차단 갱신/조회·namespace 종료 정리. 부재는 unknown |
| D02 시작 복구 | 원장/catalog → 삭제/ready 메타데이터 복구 → 파생 reconcile·잔여 작업 차단 → 물리 검사 → 생산자 | 기존 FinalizedSegmentsForStartup/InspectAndMarkRecordingMedia는 V1만 검사하므로 새 저장의 finalized 물리 검사도 연결. committed 파생 출력의 임시/final hardlink 정리를 먼저 마쳐 정상 파일을 nlink 조건으로 오판하지 않음. 실패/잔여 active·보호 미해소를 정상 시작으로 바꾸지 않음 |
| D02 종료 | 신규 접수 차단 → worker 취소/join → 의존 객체 해제 | bridge/provider/service/catalog의 참조 수명을 대조. 설정 opt-in과 snapshot hook, 공개 Event payload/metadata/auth/media 송출은 유지 |
| 3D-2 → 3D-3 | 관리 녹화·관측·작업 결과 → 공개 timeline/media/UI | 기존 공개 응답을 이 단계에서 수정하지 않음. 새 녹화가 기존 UI에 완전 표출된다고 보고하지 않음 |

실행 묶음은 D01→D02 순차 TDD와 각 영향 회귀다. 테스트 코드 작성·실행 전에 개별 항목과 명령을
inventory/중앙 기록에 등록한다. 새 구성 자체의 실제 writer/off/on/재시작/복구/종료와 provider 후행 증거를
검증하며 helper 검사만으로 전체 구성 PASS를 만들지 않는다. 30분/UI/120분 최종 묶음은 이번 실행 범위가 아니다.

구성 조사에서 추가 확인한 D02-10: 기존 worker의 기본1초/상한5초·16회는 제품 기본 세그먼트10초와
post-roll5초보다 짧다. 또한 history 결과는 초기 decoded_intervals가 없을 수 있어 Submit 즉시 거부된다.
메인 판단: 공개 계약 변경 없이 runtime 준비 예산을 `segment_ms + post_ms + 1000ms`로 계산한다.
기본16초, retry500ms, 시도 수 `ceil(wait_ms/500)+1`, 내부 상한60초/121회로 유한하게 제한한다.
일반 worker의 기존 기본1초/16회는 유지한다. 상한 초과/overflow는 명시 capped 사유를 보존하며
기존 유효 config를 서버 전체 오류로 바꾸거나 충분한 대기로 오인하지 않는다. 미충족은 partial/unknown이다.
초기 증거 부재는 worker 잠금 밖에서 같은 source/channel/namespace의 provider snapshot을 조회해 기존
identity 검증을 통과한 경우만 사용하고, 접수 잠금 안에서 stop/slot을 재확인한다. null/불일치 자료를 발명하지 않는다.
이 결정이 틀리면 정상 이벤트가 조기 미확인으로 종료되거나 종료 지연이 생길 수 있으므로, 실제 기본 시간의
원본 회전·후행 입력 완료 후 출력 생성과 대기 중 stop 취소를 직접 검사한다. 테스트 timeout만 늘려 PASS하지 않는다.

D02 이벤트 식별 결박: BuildEventRecord는 raw `result.source_key`를 stream/channel에 보존하지만
녹화 context는 숫자 채널이다. runtime 전용 내부 adapter는 raw result/record 일치와 활성 세션의
raw key→numeric channel 매핑, context source/channel 일치를 모두 확인한다. 공개 record/POST를 재작성하지 않는다.
기존 generic 내부 source/channel이 서로 다른 직접 참조 입력은 유지하며 테스트 값을 같게 바꿔 통과시키지 않는다.
초기 provider는 bridge/worker 잠금 밖에서 호출하고, 접수 직전 stop/slot을 다시 검증한다.
Store ID는 OpenSSL 유무와 분리된 OS CSPRNG를 사용하며 난수 실패에 약한 대체값을 쓰지 않는다.

### 3C-5A 실제 파일 시간 대응 확인 — 2026-09-13

#### 후속 구현 전 입력 계약 발견 이력과 승인 보완

사용자는 요청 사실과 영상 범위 판정을 분리하는 보완안을 승인했다. 아래 판단 대기는 승인 이전 이력이다.
보완 결과: 초기 pre-roll 요청 수락·실제 bridge·복구 검증을 완료했다. reference19/0, connection22/0,
기존 이벤트 회귀 및 제품 build exit0이며 원출력은 중앙 기록의 초기 pre-roll 보완 기록에 보존한다.
3C-5 실제 영상 생성·복구 구현을 포함하지 않는다.
작은 media-pts가 서버 시작 전 또는 영상 부재를 뜻하지 않는다. 확인 전에는 unknown이며, 실제 부재 근거가 있을 때만 부족으로 판정한다.

메인 정적 대조에서 초기 media-pts 요청의 경계를 추가 발견했다. `recording_contracts.cpp`의
`ValidateRecordingConsumerReferenceV1`은 `start_ms-pre_ms<0`이면 거부하고,
`event_recording_bridge.cpp`의 opt-in TryResolve는 해당 validator를 직렬화 경유로 호출한다.
따라서 start100ms/pre5000ms 같은 입력은 요청 사실을 기록하기 전에 `reference-invalid`가 된다.
이는 정적 분기 대조이며 별도 실제 재현 검사를 실행한 결과로 표기하지 않는다. 운영 기본 경로는 opt-in이 꺼져 있어 영향이 없다.
권장: start/end·pre/post 원본 요청 값을 보존하고, 실제 존재하지 않는 epoch 이전 coverage만 미확인/부족으로 분리한다.
음수 실제 원본 PTS 생성·UTC 외삽·0으로 요청 덮어쓰기는 하지 않는다. 이미 고정한 a8ed142f의 요청 수락 제약 변경이므로
사용자 판단 전 제품 validator/합격 기준을 바꾸지 않는다. 이 항목이 해소되기 전 3C-4 전체 종료와 후속 파생 구현은 보류한다.
기존 18개 및 회귀 PASS는 당시 정의 범위의 유효 증거로 보존하며 전체 생산자 입력 호환 PASS로 확대하지 않는다.

측정 단위 최종 결과: session79871 C501~508 8/0, 12파일/300 AU, 4초, 소유 temp 제거 확인.
file PTS에는 `media_start_pts` 원점이 대응했지만 B-frame stream-time은 file PTS보다200ms 작았다.
분수 framerate의 일부 duration은 원본보다1ns 작았다. 이 두 시간 영역과 정밀도를 같은 값으로 합치지 않는다.
C507은 유효 시계의 UTC 역행을 두 estimated mapping으로, C508은 세대/PTS 초기화를 다른 epoch로 보존했다.
3C-5A는 실제 경계 측정 완료이며 파생 기능 전체는 미완료다. 다음 구현은 명시적 file/stream-time 변환과
실제 출력 coverage/provenance, 그 뒤 ready·hold·예약 중단 복구다. 기존 finalized 계약은 변경하지 않았다.

3C-4는 a05c15dd 당시 정의 범위를 마감했으나 초기 pre-roll 경계가 추가 발견됐다. 다음 실제 파생 구현의 선행 단위로, 기존 writer를 바꾸지 않고
H264/MP4 산출물의 패킷 시각과 원본 결박을 측정한다. 과거 UTC 기반 deriver에 원본 PTS를 UTC인 것처럼 전달하지 않는다.
이 단위의 PASS는 측정 도구/실제 파일 관찰의 성공이지, 파생 영상·ready/hold·예약 복구 완료가 아니다.

3C-5의 첫 확인은 실제 managed writer 산출 파일과 원본 PTS의 대응이다. UTC 역산을 도입하지 않는다. H264/MP4 무B-frame, 비영점 origin, 정상 분할, B-frame decode preroll, 분수 frame rate, 시계 역행, PTS reset을 실제 encode→writer→demux로 대조한다. packet PTS/duration/segment time와 catalog media_start/source binding을 보존하고, 정수 변환/컨테이너 양자화/순서 변화가 있으면 임의 허용오차로 맞추지 않고 원인과 새 provenance 계약을 확정한다. 기존 writer 및 공개 API는 수정하지 않는다. 확인 후 새 media 기반 파생 요청/result·출력 provenance·ready·원자 hold/reservation 및 재시작 복구를 같은 단계의 후속 단위로 구현한다. 실제 단기 증거 이전에 전체3C-5 완료로 표기하지 않는다.

담당은 같은 단일 Astra/medium 에이전트, 하위 생성 금지. 소유는 신규
`scripts/internal/recording_derived_time_probe.cpp`, `scripts/internal/verify_recording_derived_time_probe.sh`,
`docs/release-artifacts/v4.1.0/s10-derived-time-probe/`뿐이다. 메인은 정의/계약/최종 판단을 맡는다.
기존 managed writer fixture의 실제 encode/Run 구조를 참고하되 제품 코드와 기존 verifier는 바꾸지 않는다.
실제 demux 출력의 패킷 단위 PTS/DTS/duration과 segment stream-time을 출력하고, 원본 결박의 decode-order sequence와 대조한다.
PTS의 원본 대비 차이가 일정한지, timescale 양자화 또는 decode-preroll로 차이가 생기는지 실측값을 남긴다.
성공 oracle은 생성·finalize·원본 결박 수와 demux 수 일치, 유효 PTS·관측값 수집 및 정리다.
임의 tolerance로 원본과 동일하다고 판정하지 않는다. 대응 불명확은 측정 결과의 미해소 계약으로 보고한다.
고정 원점/분수 시각을 위한 확정되지 않은 동등성 assertion을 제품 계약 PASS로 쓰지 않는다.

검증은 아래 C501~508의 격리 단기 runner만 실행한다. 서버 포트/외부 입력/장시간/UI 없음.
8행 각각 원출력·측정값·exit·cleanup을 남긴다. 제품 변경 없음이므로 기존 전체 build/회귀를 반복하지 않는다.
측정 결과를 받은 뒤 메인이 같은 3C-5 안의 파생 provenance·자원 내구성 세부 계약을 고정한다.

### 3C-3C → 3C-4 → 3C-5 승인 재개 (2026-09-13)

독자는 구현·검토 담당자이며 기존 S10 설계와 AGENTS를 따른다. 사용자 재검토 후 개발 승인.
기존 v4.1.0 checkout과 S09 변경은 보존하며 다른 worktree/branch를 만들지 않는다.
메인이 계약·최종 검토, 기존 Astra/medium 담당자 한 명이 확정된 단위를 순차 구현한다. 하위 생성 금지.
공개 Event POST/SSE/WS, decoder 정규화, 확정 segment·UTC 매핑은 불변이다.
별도 DB·새 외부 의존성·3D·S11·장시간/UI 전체·푸시는 제외한다.

- [x] 3C-3C: 원본 사실 저장. `RecordingConsumerReferenceV1`을 기존 journal/catalog/SQLite/checkpoint에 연결했다. focused16·binding20·catalog246 및 build 통과. metadata 원자 저장/소비자는 다음 단위다.
- [x] 3C-4: a05c15dd의 참조 생산·해석에 초기 pre-event 요청 보존 보완을 추가했다. reference19/0, connection22/0, 기존 이벤트 회귀 및 제품 build exit0. 실제 파생 clip/UI 기본 전환은 완료 범위가 아니다.
- [ ] 3C-5: 참조 구간의 실제 미디어 출력/ready/hold·예약 중단 복구를 구현한다.
  2026-09-13 계약 정리는 [설계의 3C-5 절](../specs/2026-09-02-v410-recording-search-foundation-design.md#s10-3c-5-파생-영상-계약-2026-09-13)을 따른다.
  요청 구간의 대응 증거/선택 → 실제 remux·출처 → 내구 자원/복구 → opt-in 통합 순서다.
  현재 점 참조를 구간 증거로 외삽하지 않으며 정상 이벤트가 pending으로만 남으면 완료가 아니다.
  계약 문서화는 제품 구현·검증 PASS가 아니다. 3D 기본 연결과 S11은 착수하지 않았다.
  S09 잔여 변경은 e223817d로 이미 정리·커밋·푸시됐다. 위의 보존 문구는 당시 작업 경계다.

#### 3C-5 순차 개발 착수 (2026-09-13)

사용자 승인 범위는 계약 문서 커밋 후 3C-5.1~5.4 개발·격리 단기 검증·통과 단위 분할 커밋이다.
계약 커밋은 `e11ab7d1`이며 이번 푸시·3D·S11·장시간/UI 실행은 포함하지 않는다.
메인은 시간·원본/자원 계약과 직접 리뷰를 맡고 단일 Astra/medium 담당자가 순차 구현한다.

3C-5.1의 내부 증거 생산 위치는 `AnalysisManager::HandleFrame`의 sampling 이전이다.
decoder 출력 시각과 원본 association의 정확한 대응 및 원본의 유효 duration을 함께 확인한다.
기존 decoder 숫자 정규화/fallback과 공개 직렬화는 바꾸지 않는다. 모든 decoded frame의
직접 구간을 bounded collector에 모아 분석 결과에 immutable snapshot으로 전달한다.
queue에는 decoded sequence만 결박하고 worker의 기존 namespace reset 판정 후
해당 sequence 이하·현재 namespace 시작 sequence 이상의 증거만 snapshot으로 만든다.
별도 callback namespace 판정기를 만들지 않는다. 이미 evict된 범위는 미확인이다.
신규 snapshot은 live observer/event 처리와 latest result에 한정하고, 최대512개인
기존 result history의 저장 복사본에는 중복 보존하지 않는다. 기존 공개/history 필드는 불변이다.
관측 상한은 기존 이력 규모인 4096개를 기준으로 하며 eviction·중복·미확인 이유를 보존한다.
한 점 offset 또는 표본 사이 보간으로 구간을 채우지 않는다. 입력에 duration이 없으면
프레임율이나 DTS 간격으로 대신하지 않는다. 정상 직접 대응 구간이 실제로 선택되는 경로와
증거 부족으로 선택하지 않는 경로를 모두 검증하며, 내구 작업 capture는 3C-5.3에서 연결한다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 | 진행 대상 | 이번 구간 선택 및 내부 분석 연결 변경 | 이 절, RawVideoDecoder/AnalysisManager/RecordingReadService | 격리 focused·직접 영향 회귀·build 승인 |
| 30분 | 미진행 | 개발 중 단기 검증이며 최종 코드 미고정 | AGENTS 7.6.2, S11 | 이번 실행 범위 아님 |
| 120분 | 조건부 진행 | 분석 callback/lifecycle 영향은 최종 cut에서 판정 | AGENTS 7.6.2, S11 | 이번 실행 미승인, 필요성·범위 재대조 후 실행 |
| UI 풀테스트 | 미진행 | 공개 UI/route 변경 및 3D 기본 연결 없음 | 이 절, S11 | 이번 실행 범위 아님 |

개별 신규 검증 등록·실행 결과는 중앙 테스트 기록과 이번 단위 보고서를 따른다.
착수/계획만으로 제품 완료·PASS를 표시하지 않는다.

3C-5.1의 시간 증거 생산·순수 선택 단위는 구현했다. 메인이 실제 diff와 최종 원출력을 대조했으며
focused27, 실제 decoder/manager19, source association10, consumer connection22,
consumer reference19, range16 및 제품 build가 통과했다. 준비 실패와 D09 oracle 정정,
D21 초기화 후 재eviction 결함/수정 이력은 [실행 기록](../../release-artifacts/v4.1.0/s10-derived-selection/report.md)에 남겼다.
시간 선택은 재생 가능 판정이 아니다. catalog 공급 adapter·실제 bridge 생성 호출·작업/출처의
내구 직렬화는 3C-5.2~5.4에 남는다. 직접 증거 없는 Gap/post-roll watermark를 생성하지 않는다.
worker reset 전에 새 namespace 자료까지 상한 밖으로 소실됐다면 해당 namespace는 미확인으로
유지한다. 선택 iteration 상한과 정상 길이 제약도 기록했으며 이를 전체 요청 지원으로 과장하지 않는다.

3C-5.2는 보호된 원본 FD와 호출자 소유의 빈 출력 FD를 받아 H.264/MP4→MPEG-TS를 생성한다.
양수 byte 상한을 강제하고 publish/ready/원장 변경·FD close/unlink는 수행하지 않는다.
원본 size/hash와 실제 file AU를 확인하며 sourcefile→output payload 대응과 decode/seek를 검증한다.
원본 timestamp 연관을 payload/decoded frame identity로 승격하지 않는다.
`verified_output`과 `request_fully_satisfied`를 분리하고 실제 file duration·90kHz 출력 시간축·잔차,
preroll/decode dependency·미충족 범위를 보존한다. binding에 없는 원본 duration을 복원하지 않는다.
첫 프로파일은 source별 독립 출력 목록이며 같은 epoch 파일도 단일 파일 결합을 지원한다고 하지 않는다.
여러 출력 중 일부 실패나 첫 파일만으로 전체 요청 완료를 표시하지 않는다. 후속 bridge는 목록을 보존해야 한다.

3C-5.2의 실제 remux 단위는 구현·단기 검증했다. 메인이 제품 diff와 실제 원출력을 직접 대조했다.
최종 remux31개(단발 취소1+실제 미디어30), 선택 회귀27개, 시각 probe8개 및 build가 통과했다.
비영점/B-frame seek·분수 duration·보이는 픽셀·동일/상이 epoch별 독립 출력과 FD/취소 오류를 확인했다.
누락 source/참조 결박 및 단발 취소 결함의 RED→GREEN, 준비 실패와 잘린 probe 출력의 재수집은
[실행 기록](../../release-artifacts/v4.1.0/s10-derived-remux/report.md)에 보존한다.
검증된 FD 출력이지 게시·내구 작업·이벤트 통합 완료가 아니다. 3C-5.3/5.4는 아직 남아 있다.

3C-5.2 커밋은 `d6554de7`이다. 이어지는 3C-5.3은 같은 담당자가 원장/자원 단위와
실제 파일/복구 단위로 나눠 구현하며, 각각 메인 검토·커밋 후 다음 단위로 진행한다.

3C-5.3a는 Intent의 원자 보호·예약, 엄격한 작업 직렬화, replay/SQLite/checkpoint,
단일 retention 소유권과 동시 용량 계산을 구현했다. focused23, catalog246,
retention56, V2 retention24(실제 미디어22·GStreamer-off2), build가 통과했다.
V2 복구 fixture의 겹친 coordinator 수명을 순차 수명으로 고쳤으며 최초 회귀 실패와
그 수정 중의 컴파일 오류도 [실행 기록](../../release-artifacts/v4.1.0/s10-derived-jobs/report.md)에 보존한다.
메인은 제품 단일 coordinator 구성과 B13/B14/B18의 기존 검사 유지 여부를 직접 대조했다.
349개 단기 PASS는 원장·자원 단위에 한정한다. 실제 파일의 소유 확인·Ready·게시·
중단 복구는 5.3b, 이벤트 통합은 5.4에 남아 있다.
5.3a 커밋은 `628addb9`다. 5.3b는 같은 담당자가 실제 출력과 중단 복구를 구현하고
메인이 원본/출력 시간축, 파일 소유와 원자 원장 적용을 직접 검토한다.
실제 출력은 O_EXCL 생성 후 root/parent·dev/inode·attempt/path 소유 receipt를
동일 journal의 Intent 하위 전이로 내구 기록한 뒤에만 media 쓰기를 허용한다.
파일 생성과 receipt 기록 사이 중단은 이름만으로 소유권을 복원하지 않는다.
해당 경우는 자동 정리 완료가 아니라 보호·예약을 유지하는 cleanup blocker이며,
receipt 이후의 중단과 구별해 fault 검증한다. 소유 미확인 파일의 삭제 승인을 추정하지 않는다.
5.3a 신규 derived-job 원장은 미출시·기본 미연결이고 실행 소유 fixture는 정리됐다.
5.3b는 같은 신규 record 계약에 상태별 receipt/Ready/결과 필드를 엄격하게 확장한다.
개발 중 직렬화 초안만을 위해 record 구버전 병행 계층을 도입하지 않는다. 과거 원출력은
당시 증거로 보존하며 실제 유지 대상이 발견되면 먼저 보고한다. 기존 segment/source와
공개 이벤트 계약의 구버전 제거 또는 변경을 승인하는 의미는 아니다.

5.4의 catalog 입력 adapter는 같은 source/channel의 원본 상시녹화와 그 binding·상태를
일관된 snapshot으로 읽어 선택기에 전달해야 한다. 새로 만든 event 파생 출력을 다시
원본 후보로 투입하지 않는다. UTC 판정도 동일 원본 snapshot에 근거하며, 별도 시점의
채널 전체 조회와 혼합해 후보 누락·자기 출력을 통한 모호성을 만들지 않는다.
선택 이후 admission에서 실제 원본 상태를 다시 확인하는 기존 원자 경계를 유지한다.
이 절은 후속 통합의 검토 기준이며 5.4 구현·검증 완료 기록이 아니다.
5.4는 opt-in 내부 bridge에서 원본 snapshot·선택·admission·단일 작업 worker·서비스를
연결한다. 기존 EventRecord/public payload에 새 출력 목록을 직렬화하거나 완료 후
원본 이벤트를 임의로 재작성하지 않는다. 안정된 참조/작업 연결로 현재 결과를 조회하며
생성 당시 EventRecord의 상태와 현재 작업 상태를 구별한다. 복수 출력은 내부 결과 목록에
보존하고, 첫 파일을 전체 clip으로 반환하지 않는다. 공개 조회·재생의 기본 연결은 3D다.
post-roll 대기는 steady clock의 유한 대기 예산으로 제한하되 시간이 지났다는 사실을
미디어 coverage로 승격하지 않는다. 같은 namespace/generation의 직접 증거만 갱신하고
대기 종료 시 확인된 부분과 미확인 사유를 보존한다. 무기한 pending/재생성은 금지한다.

5.3b의 실제 파일 서비스는 구현·단기 검증했다. 정상 생성, 별도 프로세스 중단 후 복구,
출력/출처의 단일 commit, 소유 파일 대조와 정리, 독립 출력 시간축, 삭제 후 재생성 금지를
확인했다. focused43·누락 경계6, job23·catalog246·retention56·V2 retention24·remux31로
개별 429개가 통과했으며 build도 통과했다. 메인이 실제 서비스/직렬화/원장 diff와
파일 hash·catalog·단일 mutation·보호/예약·정리의 독립 oracle을 직접 대조했다.
혼합 ABI 및 필드명/fixture 준비 실패, 요청 결박과 생성 전 취소의 RED→GREEN은
[실행 기록](../../release-artifacts/v4.1.0/s10-derived-job-service/report.md)에 보존한다.
소유 receipt 없는 실물과 바뀐 파일/경로는 자동 삭제하지 않는 명시 blocker다.
복구는 한 호출에서 active job 최대8개·단일30초 예산으로 제한하고 초과를 숨기지 않는다.
이는 opt-in 내부 파일 서비스 완료이며 실제 이벤트 worker 통합은 5.4,
서버 기본 구성과 공개 조회/재생 연결은 3D, 최종 검증은 S11에 남아 있다.
최종 메인 확인: source/증거 fingerprint68개 대조 명령 exit0,
`verify-docs-links` exit0(markdown246/local3226/image22/anchor110/index76/exclusions160),
`git diff --check` exit0. 담당자의 source/결과와 인계 후 현재 파일이 일치하며
인계만을 이유로 제품 검증을 재실행하지 않았다.
5.4 내부 소비 경계: 새 서비스가 접수·관리하는 요청은 비직렬화 `derived_job_managed`
표시로 기존 clip fallback의 중복 생성을 막는다. 기본 legacy 경로와 snapshot hook은 유지한다.
미주입·접수 거부는 명시 오류와 함께 기존 fallback을 유지하되, 이미 관리 중인 요청의
실패·중단을 다시 legacy 요청으로 바꾸지 않는다. 여러 출력은 내부 reference 결과 조회로
전부 제공하며 첫 파일을 전체 요청의 `clip_path`로 승격하지 않는다. 기존 EventRecord는
저장 당시 상태이며 비동기 재작성하지 않는다. 공개 필드·route·서버 기본 전환은 추가하지 않는다.
접수 소유권은 기존 reference identity를 바꾸지 않는 내부 원장 표지로 보존한다. 대기 슬롯 확보와
정확한 reference 결박의 내구 접수 후 작업자에 공개한다. 재시작 시 accepted이나 job이 없으면
`evidence-not-durable`인 확인 불가이며 legacy로 재전달하거나 무한 pending으로 처리하지 않는다.
이는 분석 구간 증거의 내구 저장을 뜻하지 않는다. 새 직접 증거를 가진 재접수는 별도 선택과
기존 job 멱등성 검사를 거친다. 무제한 메모리 소유권 캐시로 대체하지 않는다.

5.4 구현·격리 단기 검증은 마쳤다. 실제 H264 decoder→이벤트→구간 선택→내구 접수/작업→
2개 출력과 직접 decode, 후행 finalize, 부분/갱신, 큐·취소·재시작·tombstone를 연결했다.
최종 통합56/선택27/연결22/참조19/구간16/legacy bridge144/identity23/finalize140/
catalog246/retention24로 총717개가 통과했다. catalog의 composition 행은 정적 검사다.
UTC 손상 후보 판정·종료/비권위/resolver의 소유권 누락과 검증 기대값 오류를 보완했으며
최초 실패와 준비 오류는 [단위 기록](../../release-artifacts/v4.1.0/s10-derived-event-integration/report.md)에 보존한다.
메인이 실제 제품 diff·주요 oracle·원출력을 직접 대조했다. source22개 hash, 최종717행과
임시27경로 부재 및 문서 링크·diffcheck를 확인하여 해당 내부 단위의 커밋 조건을 충족했다.
기본 서버 주입·공개 결과 소비·3D/S11·장시간/UI·푸시는 이번 완료 범위가 아니다.

5.3b 커밋은 `e4917056`이다. 이후 5.4는 동일 담당자가 구현했고, 메인이 복수 출력과
기존 clip/fallback 소비 경계를 확정하고 실제 이벤트→출력 통합 증거를 검토했다.

- **5.3a 원장·자원:** 기존 catalog 소유 journal에 요청/선택/profile 기반 job identity,
  별도 attempt/output ID, source 보호와 용량 예약을 하나의 intent로 저장한다.
  job 보호는 사용자 pin/hold와 분리하며 cleanup 완료 전 해제하지 않는다.
  replay/SQLite/fallback/checkpoint가 같은 상태를 복원하고 충돌·잘못된 전이를 거부한다.
  retention admission→catalog 잠금 순서를 고정하고 기존 inflight와 내구 예약을
  event quota·disk reserve 계산에 포함한다. 동일 채널의 동시 예약도 합산한다.
  상태 순서는 lifecycle 전이로 판단하며 관측된 wall clock의 역행을 정리 거부 근거로 쓰지 않는다.
  선택과 무관한 원본의 추가는 job identity를 바꾸지 않는다. 전체 입력 증거 상한과
  작업이 실제 참조하는 원본 수 상한을 구분한다.
- **5.3b 게시·복구:** intent→실제 검증→내구 ready→no-replace 게시→출력/출처/job 원자 commit
  →소유 임시물 정리→job 자원 해제 순서를 구현한다. ready는 기존 writer marker와 혼용하지 않는다.
  startup에서 원장/보호·예약을 먼저 복원하고 파일을 대조한다. intent 중단은 소유물 정리 후
  명시 실패로 수렴할 수 있으며 무한 재생성하지 않는다. 완료 후 삭제된 output은 재생성하지 않는다.
- 출력은 실제 output PTS 기반 별도 epoch를 사용하고 원본 축/UTC를 복사하지 않는다.
  원본 대응은 AU 출처로 보존하며 직접 대응이 없는 출력 UTC는 미확인으로 둔다.
  job 직렬화와 생성 자원 상한을 두고, `verified_output`과 요청 전체 충족을 분리한다.

개별 기능/중단점의 사전등록과 실제 결과는 중앙 기록과 5.3 실행 보고서에서 관리한다.
관련 격리 단기 검증만 승인 범위이며 3D 기본 서버 연결·S11·장시간/UI·푸시는 제외한다.

#### 3C-4 실제 분석·이벤트 소비자 연결 (3C-3C 이후)

전제: a8ed142f 원본 참조 저장 계약/복구 검증 완료. 이 단계는 실제 class 경로의 opt-in 구현이며
서버 composition root의 기본 전환은 3D다. 새 공개 route/schema/상시녹화 미디어 writer 변경 없음.
메인 설계, 같은 단일 담당자 Astra/medium 구현; 하위 생성 금지.

1. 분석 metadata와 reference를 단일 `referenced_observation_put` mutation으로 저장한다.
   catalog `PutReferencedObservation(const AnalysisObservationV2&, const RecordingConsumerReferenceV1&, std::string*)`,
   `QueryReferencedObservations(channel)`는 metadata+reference 쌍을 반환한다.
   기존 observation_v2_put/조회와 별도 projection이며 한쪽만 성공한 상태는 만들지 않는다.
   새 payload schema는 `media-server.referenced-observation.v1`, 필드는 schema/observation/reference 3개.
   쌍 원문 상한은2MiB, nested observation/reference 각1MiB이며 파싱 전에 거부한다.
   reference.kind=observation, owner_id=observation_id, source/channel/namespace/analysis_track/analysis_pts가 metadata와 일치해야 한다.
   metadata의 frame_locator는 null, stream_epoch_id는 빈 값, locator_reason=unresolved다.
   기존 metadata 구조는 분석 속성 보존에만 재사용하며 V1 locator/UTC 해석에는 넣지 않는다.
   같은 observation ID의 원본 reference identity는 불변이고 기존 selection/event/rule 종료정보 병합만 허용한다.
   원본이 다른 동일 PTS는 서로 다른 observation ID다. immutable reference의 created_at은 재전달 때 최초 값을 유지한다.
   SQL/JSONL/checkpoint/open preflight는 metadata+reference가 같은 상태인지 검증한다.
2. AnalysisObservationProjector Options에 `use_consumer_references=false`를 추가한다.
   기존 기본 경로는 불변. opt-in에서 OnResult/OnEvent→sampling/queue→단일 원장 저장을 연결한다.
   트랙 key는 track 수명용, observation ID는 namespace/track/analysis_pts/원본 식별용으로 구분한다.
   ended track은 last_seen_pts와 일치하는 보존된 마지막 참조만 재사용하고 현재 프레임 참조를 붙이지 않는다.
   마지막 참조가 없으면 unavailable로 남긴다. sampling, event 강제 저장, max queue/track/stop/drain 제한은 유지한다.
   원본 참조 해석을 media thread에 filesystem 작업으로 추가하지 않는다.
3. RecordingReadService에 내부 `ResolveConsumerReference(reference, result, error)`를 둔다.
   timestamp-match만 ResolveOriginalSample로 조회한다. exact는 입력 tuple 일치이며 decoded frame 고유성 아님.
   nearest/ambiguous/unavailable은 확정 위치 없음과 이유를 반환한다.
   exact/미색인 후보는 각각 유지하고 ResolveMediaLocation/공통 range 결과를 소비한다. UTC unknown도 참조 자체를 지우지 않는다.
   삭제/pending/corrupt는 현재 catalog에서 재판정한다. 후보 없음은 삭제라고 추정하지 않는다.
   기존 공개 QueryTimeline/Serialize API로 강제 투영하지 않는다.
4. CatalogEventRecordingBridge Options에 `use_consumer_references=false`를 추가한다.
   opt-in TryResolve는 AnalysisResult association과 EventRecord의 요청 사실을 consumer reference로 내구 저장한다.
   source/channel은 명시 resolver/context를 교차 확인해 정하고 missing/충돌이면 거부한다.
   event owner별 update는 서로 다른 reference로 보존하고 동일 입력 재전달은 멱등이다.
   현재 한 association으로 과거 event 시작/전체 requested coverage를 추정하지 않는다.
   기존 V1 UTC 원본 선택/deriver queue로 보내지 않는다. 아직 파생 영상이 없으므로 derived_clip_ready=false,
   completeness=pending, 공개 recording_link_id에 내부 reference_id를 넣지 않는다.
   opt-in RecordFallback/시작 worker가 구형 링크를 새 참조로 승격·변경하지 않는다.
5. 이벤트 우선 표시는 내부 실제 매칭 결과에만 부여한다. 동일 source/store/epoch/segment의 미디어 교집합에만
   event를 연결하고 같은 UTC·다른 source/epoch/segment는 가리지 않는다.
   요청만 있는 이벤트를 재생 가능한 event clip으로 표현하지 않는다.
   점 association은 구간 coverage가 아니므로 duration/끝점 근거 없는 우선 구간은 생성하지 않는다.
   이 단계는 확인된 구간을 소비하는 내부 판정과 실제 producer 저장까지이며 제품 UI 연결은 3D 이후 검증이다.

소유: contracts/catalog/journal h/cpp, analysis_observation_projector h/cpp, event_recording_bridge h/cpp,
recording_read_service h/cpp, 신규 recording_consumer_connection_smoke.cpp/verify_recording_consumer_connection.sh.
기존 S09 dirty/ingress/public serializer/composition root는 수정하지 않는다.
검증: C401~418을 사전등록, 컴파일 가능한 신규 경로 stub의 C401 원자 저장·C406 producer 저장 예상 RED 확인 후 구현.
focused GREEN 뒤 기존 consumer-reference/observation/event-recording/source-binding 단기 회귀, build/diff/docs.
소유 임시 root/포트/로그는 runner별 확인하고 외부·장시간/UI 전체는 실행하지 않는다.
완료 보고는 새 내부 API unit PASS와 실제 producer integration PASS를 분리하고 미연결 범위를 명시한다.

3C-4 실행 결과(2026-09-13): 최종 focused18, 기존 reference16/binding20/correlation10/observations81와 cleanup,
event 등록기35/C++158/application7/runtime23·mutation2 및 기능 집계27 PASS. 기능 집계는 assertion 합계에 중복 가산하지 않는다.
제품 build는 최종 session44940 exit0. nearest/null 계약 보완, fixture mutation ID 누락,
queue 속성 충돌 예상 RED, 구형 ready aggregate 경고를 각각 구분해 최초 결과를 보존했다.
ready의 `segment_v2{}` 명시 기본값은 optional 부재 의미를 유지하는 선언 보완이다.
상세 원출력과 cleanup은 중앙 release-test-records의 s10-consumer-connection 기록을 따른다.
아직 미연결: 새 참조 기반 실제 영상 생성·ready/hold·예약 복구(3C-5), 서버 기본 전환(3D), S11.


#### 3C-3C 고정 계약

`recording_contracts.h/.cpp`에 `RecordingConsumerReferenceV1`:
schema=`media-server.recording-consumer-reference.v1`,
reference_id, kind(`observation`/`event`), owner_id, source_id, channel_id,
analysis_namespace, analysis_track_id, analysis_pts(ns, >=0),
association_quality(`timestamp-match`/`nearest`/`ambiguous`/`unavailable`),
optional original{source_generation,generation_order,ordinal,track_id,pts_ns},
optional request{time_basis(`utc-ms`/`media-pts-ms`),start_ms,end_ms,pre_ms,post_ms},
created_at_ms. 직렬화는 위 필드를 모두 요구하고 optional 부재는 null이다. 알 수 없는 필드/중복 거부.
ID는 기존 ValidateOpaqueId, analysis_track_id는 비어 있지 않은 최대1024 printable 문자열.
parser 원문은 1MiB 이하로 제한하며 과대 입력은 parsing 전에 거부한다.
original generation/order/ordinal/track/PTS는 기존 source-binding과 같은 값 제약.
timestamp-match에는 original 필수, nearest에는 optional, ambiguous/unavailable에는 original 금지.
3C-4 실제 생산자 대조에서 decoder가 nearest/null을 반환함을 확인해 a8ed142f의 nearest 필수를 보완한다.
원본이 있더라도 nearest는 정확한 위치로 승격하지 않는다. 기존 decoder/PTS 정책은 변경하지 않는다.
request는 event에만 필수이며 start<=end, 음수/overflow/음수 padding은 거부한다.
승인 보완: 기존 start_ms-pre_ms>=0 수락 조건을 제거해 초기 pre-roll 요청 사실을 보존한다.
start/end/pre/post는 비음수이고 start<=end이며, int128 중간값으로 end_ms+post_ms<=INT64_MAX 검사는 유지한다.
요청 필드를 0으로 덮어쓰거나 음수 실제 PTS·UTC 외삽·coverage를 생성하지 않는다.
동일 schema/필드로 과거 데이터를 읽지만 구형 바이너리의 새 수락 레코드 읽기(downgrade)는 보장하지 않는다.
start==end는 원본 순간 요청으로 보존하며 영상 coverage를 자동 부여하지 않는다.
단일 현재 원본으로 과거 이벤트 시작 위치를 역산하지 않는다. 요청 사실과 현재 연관은 분리 보존한다.
소비자는 timestamp-match만 정확한 입력 tuple 조회에 사용하며 decoded frame 유일성으로 승격하지 않는다.
kind/owner/원본이 다른 동일 reference_id는 충돌로 거부한다. 같은 전체 값 재전달만 멱등이다.
후보 snapshot·playable·UTC 외삽 결과는 이 불변 원본 참조에 저장하지 않는다.

catalog API:
`bool PutConsumerReference(const RecordingConsumerReferenceV1&, std::string*)`;
`std::vector<RecordingConsumerReferenceV1> QueryConsumerReferences(const std::string& channel, const std::string& kind, const std::string& owner) const`.
새 mutation `consumer_reference_put`의 payload는 `{"reference":...}`, entity_id=reference_id.
새 kind를 알지 못하는 원장 시작 보호는 기존 미지원 기록 규칙을 따른다. enable_v2_storage opt-in 필요.
원본은 finalized 전에 저장할 수 있으므로 segment 존재를 필수로 하지 않는다.
SQL은 기존 DB 안 별도 projection table, JSONL-only와 동일 출력. checkpoint/재시작/미지원·충돌 선차단을 유지한다.
분석 관측 metadata와 참조의 원자 저장 연결은 3C-4에서 고정하며 이 단위의 단독 원본 참조 PASS를 전체 소비자 PASS로 쓰지 않는다.

#### 실행 순서·합격 기준

소유: contracts/catalog/journal h/cpp, 신규 recording_consumer_reference_smoke.cpp 및 verify_recording_consumer_reference.sh.
실행 전 C341~356을 중앙 기록·inventory에 등록한다. 컴파일 가능한 stub에서 C341 왕복·C350 저장이
미구현 assertion으로 실패함을 확인한 뒤 구현한다. 컴파일/환경 실패는 RED가 아니다.
격리 mktemp·포트 없음, cleanup 경로/크기/부재를 출력한다. 실제 출력·exit는 중앙 기록에 전수 보존한다.
관련 단기: 신규 focused, 기존 source-binding/catalog 회귀, 제품 build, docs links/diffcheck.
단계별 변경을 메인이 검토하고 통과한 단위만 승인 범위에 맞춰 커밋한다.
후속 소비자·파생 단계는 이 API의 실제 결과를 확인한 후 세부 함수를 고정하며 동일 파일 동시 수정하지 않는다.

| 작업 경계 | 대조 결과 |
| --- | --- |
| 3C-3C → 3C-4 | 원본 사실/요청 저장과 해석·표출 분리, 미확정은 확정 후보로 승격 금지 |
| 3C-4 → 3C-5 | 이벤트 요청 전체 coverage는 현재 단일 association으로 증명 불가; 실제 범위 확인 필요 |
| 공통 계약 → 공개 serializer | 내부 참조 추가를 Event POST/SSE/WS 필드 추가로 노출하지 않음 |

#### 3C 보완 구현 순서 — 사용자 개발 승인

독자는 S10 구현·검토 담당자다. 기존 S10 시간식별 계약의 실행 세분화이며 정책은 AGENTS를 따른다.
사용자는 보완한 다섯 단계의 개발과 필요시 분할 커밋을 승인했다. 3D·푸시·장시간/UI 전체는 제외한다.
기존 S09 dirty 파일은 이번 소유 변경과 분리한다. 기존 단일 Astra/medium 담당자를 재사용하고
메인이 계약·등록·실제 diff·검증 증거를 검토한다. 하위 생성과 자동 추론 상향은 금지한다.

- [x] 3C-1 원본↔분석 연관: 별도 내부 correlation을 RawVideoFrame→AnalysisResult에 전달한다.
  기존 decoder normalize·숫자PTS·영상 전달을 바꾸지 않는다. 유일 timestamp 연관은
  현재 bounded 입력 이력의 판정이며 프레임 고유성 보장이 아니다. nearest/ambiguous/unavailable을 구분한다.
  관측 generation/order/ordinal/track/원본 PTS를 보존한다. source_generation과 media_epoch_id를 동일시하지 않는다.
- [x] 3C-2 공통 구간 해석: 점 두 개만 연결하지 않고 매핑 경계별 미디어 구간과 중첩·공백·unknown을 보존한다.
- [ ] 3C-3 영속 참조·복구: 원본↔녹화 epoch 결박과 파생 위치를 versioned 계약으로 보존한다.
  기존 finalized segment/UTC 매핑은 수정하지 않으며 같은 원장의 복구·SQL/JSONL 정합성을 확인한다.
- [x] 3C-4 분석·이벤트 소비: 실제 producer 참조 저장과 확인된 동일 원본 구간의 내부 우선순위 판정을 구현·검증했다.
  초기 pre-roll 요청 보존 보완도 완료했다. 실제 coverage 생성과 제품 화면 적용 완료를 의미하지 않는다.
  기존 공개 Event POST/SSE/WS field 의미는 유지하며 표현 불가한 결과를 V1으로 억지 변환하지 않는다.
- [ ] 3C-5 파생·중단 복구: 미디어 시간으로 출력 위치를 측정하고 UTC는 별도 대응으로 유지한다.
  다른 epoch는 이벤트의 여러 참조로 보존하되 하나의 연속 영상으로 자동 합성하지 않는다.
  같은 epoch의 정상 segment 분할은 결합 가능하며 codec/공백·actual coverage 검증을 통과해야 한다.

| 단계 사이 경계 | 확인·처리 |
| --- | --- |
| 1 → 2/3 | timestamp 연관을 exact decoded frame 증명으로 승격하지 않음 |
| 2 → 3/4 | 불명확·복수 후보를 원형 보존, UTC로 임의 단일화 금지 |
| 3 → 5 | 새 event ready와 hold/예약의 중단 복구 계약을 구현 전에 상세 고정 |
| 4 → 공개 응답 | 기존 schema 의미 유지; 새 내부 결과와 기존 DTO를 구분 |
| 5 → 3D | 소비자·복구가 완료된 뒤에만 별도 서버 기본 연결 |

현재 첫 단위 소유: analysis_types.h, raw_video_decoder.cpp, analysis_manager.cpp,
내부 correlation helper와 focused/runtime 검증. 메인은 관련 문서만 수정한다.
C101~112를 실행 전 등록하며 stub에서 예상 assertion RED를 확인한 뒤 구현한다.
각 단위의 관련 검증·기록·diffcheck PASS 후 커밋하며 첫 단위 PASS를 3C 전체 완료로 표기하지 않는다.

3C-1 실제 결과: focused 10개, 실제 runtime 15개, 기존 observation 81개 및 각 runner 정리 PASS, 제품 rebuild exit0.
커밋: 29de4d8f. 이어서 3C-2 C201~216을 중앙 기록에 실행 전 등록했다.
3C-2는 channel/segment의 반열린 미디어 구간과 UTC 구간을 별도 API로 조회한다.
각 mapping 경계·복수 후보·UTC coverage 공백을 보존하고 unknown UTC는 별도 unplaced 후보로 유지한다.
정수로 표현 불가한 역변환은 이유를 보존하며 반올림·끝점 보간으로 확정 위치를 만들지 않는다.
이 단위는 읽기 전용이며 3A 점 조회·원장·hold·public route 의미를 바꾸지 않는다.
상세 전수 결과·실패 이력은 중앙 release-test-records의 S10 3C-1 절에 보존한다.
메인 검토에서 동일 timestamp snapshot과 source_pts 충돌 판정을 보완했다.
3C-2 실제 결과: focused C201~216 16개, 기존 위치 LOC01~14 14개·cleanup PASS, 제품 rebuild exit0.
UTC sweep과 128 인접 media 범위·혼재 후보를 확인했고, 준비2회·예상 RED·컴파일1회 실패와 이후 결과는 중앙 기록에 보존한다.
3C-3~5는 아직 미완료이며 이번 두 단위를 전체 3C 완료로 취급하지 않는다.

3C-2 커밋: 215bf71b. 다음 3C-3은 A(계약/catalog 원본 수락 결박)→B(실제 writer/ready 복구)로 세분화한다.
세그먼트와 별도 schema 원본 결박을 신규 단일 bound-finalized 원장 항목으로 함께 commit한다.
2개 append 사이 삭제/부분 노출을 막으며 기존 unbound 데이터에 소급 결박하지 않는다.
원본 수락 색인은4096 tuple까지 보존하고 초과는명시적unknown으로남기며영상폐기는금지한다.
세부13field 계약과 C301~320 정의는 중앙 release-test-records의3C-3A절에고정한다.
3C-3A의 metadata PASS를 실제 writer/파생/전체3C PASS로승격하지않는다.
3C-3A 구현·메인 검토: binding/단일 원장/catalog·SQL/복구 완료. focused20, 기존catalog234+crypto-off3,
정적 source/순서9, location14/range16, 보존GST-on22/off2와 제품 build PASS.
최초 RED·컴파일 경고2회·oracle 보강은 중앙 전수 기록에 보존한다. 다음은 실제 writer/ready3 연결이다.
3C-3A 커밋: 148e4366. 3C-3B C321~336은 중앙 기록·inventory에 실행 전 등록했다.
writer는 성공한 appsrc 수락만 원본 tuple로 보존하고 ready3에 함께 동봉한다.
기존ready1/2 크기·형식, 소유 partial/FD·원자 publish·해시검증·삭제 보호는 유지한다.
테스트 전용 호출 래핑으로 실패 push와 publish 뒤 commit 실패를 검사하며 제품 hook은 추가하지 않는다.
위 호출 래핑 구상은 도구 중단 후 폐기했다. 사용자 재개 승인으로 메인이 정상 writer·ready3를 직접 구현했다.
실제4100프레임·색인4096상한, 분할·세대·PTS 재정렬, ready 중단상태 복구와 기존회귀를 확인했다.
최종 writer44/ready73/binding20 및 제품build PASS지만 C323과C334 active오류 타이밍은 미검증이다.
전체3C-3B 완료/커밋은 보류하며 내부 단계를 분리하는 안전한 검증 대안의 구조 변경 판단을 요청했다.

위 보류 이후 사용자 승인으로 내부 수락·최종화 순서를 분리하고 실제 writer/ready에 연결했다.
C323/C334는 내부 실패 결과 단위검증과 실제 영상 통합으로 완료했으며 시스템/GStreamer 강제 오류 주입 증거는 아니다.
최종 내부8/writer44/ready74/binding20(146 PASS), 제품 build exit0과 정리를 확인했다.
3C-3B는 완료이며 상세 최초 실패·정정·전수 결과는 중앙 기록의 최종 결과 절을 따른다.
다음은 3C-4 분석/이벤트 소비자, 이어서 3C-5 파생 미디어 시간·복구다. 전체3C는 미완료다.


#### 3B 구현 계약과 검증 순서

사용자 승인: 3B 전체 마무리·관련 검증 후 커밋. 푸시·3C·3D는 이번에 실행하지 않는다.
서브에이전트 개발 스킬을 적용하되 AGENTS 1.3에 따라 기존 Astra/medium 한 명을 재사용한다.
메인은 안전 설계·문서·사전등록·최종 diff/증거 검토를 담당하고 담당자는 아래 코드와 focused를 맡는다.
하위 생성 금지, 기존 S09 dirty 변경 보존, 기존 버전 원문 및 시간 매핑 임의 변경 금지.

1. 불변 `RecordingSegmentV2`와 별도 pending/corrupt/deleted overlay를 둔다.
   V2 상태/삭제는 명시 versioned mutation이며 잘못된 entity·전이·중복 충돌은 거부한다.
   V2 tombstone은 불변 segment를 nested로 보존하고 삭제 사유·시각을 추가한다.
   V1 `recorded_range`를 임의 생성하지 않는다. checkpoint는 이 상태 이력을 원형 보존한다.
   SQL 상태 투영과 JSONL fallback이 동일하게 복원돼야 하며 finalize 재시도로 부활하지 않는다.
2. `RetentionCandidate`는 새 segment를 별도 optional metadata로 소비하고 V1 시간으로 캐스팅하지 않는다.
   V2 capacity/reserve 삭제는 store별 영속 order이며 서로 다른 store와 legacy 혼재는 결정적 별도 정렬이다.
   다른 store 간 실제 녹화 순서가 확정됐다고 주장하지 않는다.
   age는 모든 mapping의 끝과 UTC가 알려졌을 때 max(UTC end+uncertainty)를 overflow 없이 ms 상향 변환한다.
   unknown/overflow이면 age로 삭제하지 않으며 capacity 대상 여부는 독립적으로 판단한다.
   pending/corrupt byte는 사용량에 포함하고 자동 삭제 후보에서는 제외한다. corrupt의 명시 수동 정리만 허용한다.
3. catalog의 hold·pin·삭제 대기 판정은 같은 mutex를 사용한다. pin/hold 중 삭제·손상 전이를 거부한다.
   pending 내구 기록 → 등록된 파일 unlink → V2 tombstone 내구 기록 순서다.
   중단 뒤 pending만 재개하며 아직 삭제되지 않은 데이터가 삭제 완료로 보이면 실패다.
   V2 완료 API도 등록된 파일의 안전한 부재를 확인하며 파일 존재/경로 불명확이면 완료를 거부한다.
   등록된 lexical 경로를 지키고 symlink/hardlink로 다른 파일을 지목하면 삭제를 거부한다.
4. continuous V2 재생은 channel/ID 충돌 검증 후 hold를 취득하고 root부터 fd로 안전하게 파일을 연다.
   `InspectRecordingPhysicalMediaFd`는 borrowed fd를 CLOEXEC dup하여 같은 inode의 size/SHA/demux를 검사한다.
   호출자의 fd/offset은 보존하고 검사 중 파일 변화는 거부한다. 기존 V1 검사 정책은 그대로다.
   UTC unknown만으로 정상 파일을 막지 않지만 provenance가 아직 연결되지 않은 V2 event는 거부한다.
   GStreamer 없는 build는 새 재생을 지원한 척하지 않고 Unavailable이다.
   동일 권한의 비협력 외부 writer에 대한 완전한 원자성이나 codec 전체 decode는 보장하지 않는다.

소유 파일: recording_contracts/journal/catalog/retention_coordinator/media_inspector의 h/cpp,
recording_store_port.h, recording_read_service.cpp, 신규 recording_retention_v2_smoke.cpp와
verify_recording_retention_v2.sh. 신규 helper는 역할·소유를 확인한 뒤 추가하며 무관 모듈은 수정하지 않는다.

| 작업 사이 계약 | 확인 결과 |
| --- | --- |
| 상태 원장 → catalog/recovery | immutable payload와 effective lifecycle 분리, 부활 거부 필요 |
| catalog snapshot → retention | V2 metadata를 V1로 변환하지 않고 byte/order/age를 개별 소비 |
| retention → 재생 | 동일 ID hold/pending 경계로 삭제·재생 경쟁 제어 |
| inspector → read service | 검사한 동일 fd를 반환, 다른 경로 재open 금지 |
| 3B → 3C/3D | event provenance/숫자 channel/default 전환은 이번 범위 밖으로 유지 |

진행: B01~23 사전등록 → 컴파일 가능한 stub의 예상 assertion RED → 구현/GREEN →
메인 실제 diff 검토 → 관련 catalog/retention/read/LOC/writer/finalize 단기 회귀·build →
전수 결과/정리 기록·문서 검증 → 3B만 커밋. 기존 유효 증거는 무관 변경으로 재실행하지 않는다.

3B 결과: focused GST-on22/0·off2/0, catalog246/0·retention56/0·read167/0·LOC14/0·
writer37/0·finalize55/0 및 전체 제품 build exit0. 메인 diff 검토와 전수 기록/임시 정리를 마쳤다.
중간 삭제 경로 실패와 수정 이력은 중앙 기록에 보존했다. B21은 두 검사 사이 파일 변경 차단을
실행했으며 검사 진행 중 비협력 쓰기 경쟁의 결정적 실증은 아니다. 전후 fstat 구현은 직접 검토했다.
기존 S09 dirty를 포함한 작업트리 검증이며 V1·공개 schema·서버 기본 구성은 변경하지 않았다.
3C는 이벤트/분석의 위치 후보·provenance 소비, 3D는 숫자 channel 호환과 기본 writer 연결이 남았다.
이번 커밋에 3C·3D·V1 삭제·S11/장시간/UI 전체·푸시를 포함하지 않는다.


### S10 저장소 활성화 선행 1번 — 구현·한정 검증 완료

사용자 최신 승인 범위는 저장소 안전성·원장 성장 대응 구현과 해당 범위 커밋이다.
푸시, 실제 writer 활성화, 소비자 전환, 기존 V1 코드·데이터 삭제, S11 실행은 포함하지 않는다.
기존 데이터가 모두 개발·검증용임을 확인했으므로 V1 데이터 마이그레이션과 영구 병행 지원은
완료 조건에서 제외한다. 검증용 최소 fixture·과거 실행 결과는 유지하며 실제 제거는 후속 정리 단계다.

#### 구현 순서와 소유 경계

- [x] 저장소 전용 명시 모드: 신규 root, 형식 식별, 구형 기본 원장 경로 차단,
  객체 수명 배타 소유권과 동일/다른 프로세스 충돌·종료 후 재획득을 구현한다.
  기존 raw journal 경로는 실제 소비자 전환 전까지 기존 계약을 유지한다.
- [x] 같은 managed journal을 공유하는 복수 catalog의 쓰기/hold 상태 분기를 막는다.
  journal lease 확인 API만으로 catalog의 단일 소유권까지 완료로 판정하지 않는다.
- [x] 원장 성장: 반복 전체 조회 비용과 영속 이력 정리 비용을 구분한다.
  삭제·예약/재시도 식별자를 잃는 단순 절삭이나 상한 도달 시 녹화 중단으로 대체하지 않는다.
  체크포인트 전후 및 중단 복구에서 같은 의미가 복원되어야 한다.
- [x] 연결 검토·관련 focused 회귀와 중앙 전수 결과/cleanup을 확인하고 승인 범위의 커밋을 준비한다.

첫 구현 묶음은 담당자가 journal 헤더/구현과 필요한 전용 저장소 모듈, catalog focused
테스트·빌드 목록을 수정한다. 메인은 성장/복구 계약과 이 계획을 소유한다.
중앙 실행 기록·inventory 등록은 담당자 소유로 하여 동시 편집하지 않는다.
신규 경로는 symlink를 따라 기존 저장소를 변환하지 않으며, 기존 파일이 있는 root를
자동 덮어쓰거나 지우지 않는다. 동일 UID의 임의 파일 변조까지 막는 보안 격리로 주장하지 않는다.
두 번째 managed writer는 무한 대기가 아니라 명시 실패하고, fork된 자식의 소유권 승계를 거부한다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/기능 | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | 1번 저장소 구현과 관련 회귀 | recording_journal / recording_catalog focused | 최신 개발 요청 범위 |
| 30분 테스트 | 미진행 | 이번은 저장소 한정 구현, 최종 코드는 아직 미고정 | S11 최종 검증 | 이번 실행 안 함 |
| 120분 테스트 | 미진행 | 이번에 실제 writer/lifecycle 활성화하지 않음 | S11 최종 검증에서 범위 확정 | 이번 실행 안 함 |
| UI 풀테스트 | 미진행 | 제품 화면 변경 없음 | 후속 소비자 연결·S11 | 이번 실행 안 함 |

첫 묶음 명령은 `./server.sh verify-v410-recording-catalog`와 `git diff --check`다.
새 managed 정상 open의 거부 stub을 예상 RED로 사전 특정하고 기존 172개 회귀 실패는
예상 RED로 처리하지 않는다. 반환된 실제 변경·검증 근거를 메인이 검토한다.
성장 대응 검증은 계약·개별 항목 등록 후 같은 안정화 범위에서 실행한다.

| 런타임 패밀리 | 담당 | 추천 모델 | 추론 수준 | 선정 근거 |
| --- | --- | --- | --- | --- |
| Codex | 메인 설계·최종 판정 / 기존 단일 담당자 구현 | gpt-6-astra | medium 유지 | 영향2/불확실성2/검증2/범위2=8. 저장소 소유권·원장 복구 교차 경계. 자동 상향·하위 생성 없음 |

위 항목이 모두 닫히기 전 1번 완료로 표시하지 않는다.

첫 실행 이력: `verify-v410-recording-catalog`가 reject stub의 미사용 private field
4개에 대한 clang `-Werror,-Wunused-private-field`로 컴파일 실패했다. 예상 RED가 아니며
신규/기존 assertion은 모두 미실행이다. 코드 수정·재실행·커밋과 성장 대응 구현을 중단했다.
정확한 명령·오류·임시 root 부재 확인은 중앙 실행 기록의 같은 이름 절에 보존한다.
재개 시 stub에서 아직 사용하지 않는 네 필드 선언을 제외하고 동일 focused RED부터 확인한다.

사용자가 해당 수정·동일 검증 재개를 승인했다. 재개 실행21293에서는 기존 C++163개가
통과하고 SW01만 예상대로 실패했다(shell9는 fail-fast로 미실행). 미사용 필드 컴파일 오류와
예상 RED를 구분하며 이제 첫 구현 묶음을 진행한다. ManagedOptions는 root와 필수 store_id를
받고 init/format marker 및 Reserve의 store ID를 정확히 대조한다. 암묵적 기본 ID는 만들지 않는다.

구현 후 실행46619는 `ManagedBindingLocked`의 dev_t/uint64_t 비교 네 곳에서
`-Werror,-Wsign-compare`로 컴파일 실패했다. assertion은 미실행이며 예상 RED가 아니다.
미사용 필드 문제 재발과는 구분한다. 메인은 추가 수정·재실행을 중단하고 변경 검토를 회수했다.
확인된 추가 보완 대상은 managed FD 복제의 CLOEXEC 유지와 managed Append의
불완전 tail 보존·거부다. catalog attachment와 원장 성장 구현도 미완료이며 커밋하지 않았다.

사용자 「수정 후 재검증」 승인으로 위 세 보완을 수행했다. dev_t 비교 네 곳을 기존
uint64_t binding 타입에 명시 변환하고, managed FD 복제 세 곳에 F_DUPFD_CLOEXEC를 사용한다.
managed Append는 미완결 tail을 변경·격리하지 않고 거부하며 기존 raw RepairTail은 유지한다.
SW11 원문 보존 및 SW12 실제 FD flag/exec 상속 검사 각각의 예상 RED를 확인한 뒤
최종 focused 실행50093에서 C++185개와 shell9개, 합계194개가 통과했다.
기존172개 포함, managed22개 추가다. 메인이 실제 코드와 diffcheck exit0을 확인했다.
첫 journal 소유권 묶음과 이번 세 보완의 focused 결과이며, catalog 단일 attachment와
원장 성장·체크포인트가 남아 있으므로 1번 전체 완료·커밋 가능으로 판정하지 않는다.

#### 1B catalog 단일 소유권 — focused 검증 통과

사용자 「1번 전체 잔여이슈 수정 후 보고」 승인으로 계속한다. managed journal에 한 catalog만
결박하며, catalog 없이 직접 Append하거나 실패한/다른 catalog가 쓰기·hold를 변경하는 것을 막는다.
예약은 같은 journal 소유 프로세스에서 계속 사용할 수 있다. media_root는 managed root,
SQLite 경로는 그 root의 recording-catalog.sqlite3로 제한하고 '..'/symlink/hardlink/외부 경로를
부작용 전에 거부한다. enable_v2_storage=true를 명시해야 하며 raw 동작은 유지한다.
Open 내부 실패 시 SQLite를 닫고 소유권을 반납하며 destructor도 같은 순서다.
복수 catalog, 실패 객체 우회, 무토큰 Append, 소유 반납, 경로·옵션 거부, 실패 후 재연결을
중앙 SB01~06에 등록한 뒤 focused RED/GREEN으로 확인한다. 제품 writer 활성화는 하지 않는다.

SB01~06 구현 후 실행45925에서 205개가 통과했다. 메인 검토에서 SQLite sidecar 경로도
같은 경계로 검사하도록 SB07을 추가했고, 예상 RED 실행23829를 거쳐 실행11729에서
C++202개와 shell9개, 합계211개가 통과했다. 기존205개를 유지하며 sidecar의
symlink/hardlink 여섯 경우를 추가했다. 실행 임시 root97189는 21,290,570바이트를
삭제하고 부재를 확인했다. 상세 명령·개별 결과와 이전 실패는 중앙 실행 기록에 보존한다.

#### 1C 원장 성장 대응 — 설계 경계

managed 독점 소유에서 최초 검증으로 순서/ID 인덱스를 만들고, 자기 쓰기의 fsync 성공분을
증분 반영한다. 예약·V2 후보 검사마다 원장 전체와 scratch catalog를 다시 읽는 경로를
managed 모드에서는 제거한다. raw 경로와 초기 재시작 전체 검증은 그대로 구분한다.
외부 inode/size 변경과 fsync 불확실성은 캐시를 신뢰하지 않고 실패로 닫는다.

체크포인트는 현재 알려진 큰 반복 이력인 event_link_created의 같은 link 최종 상태를
원래 순서에 유지하고, 앞선 상태의 큰 payload만 작은 receipt로 정리하는 보수적 범위다.
receipt도 원래 mutation ID·entity·시각을 보존하여 재시도/ID 충돌 의미를 잃지 않는다.
원래 canonical envelope의 SHA256도 exact 필드로 보존하여 동일 ID 재시도와 다른 내용의
충돌을 구별한다. 기존 OpenSSL EVP를 재사용하며 새 암호 구현이나 전역 필수 의존성을
추가하지 않는다. 암호 기능이 없는 빌드는 raw 동작을 유지하고 managed checkpoint의
지원 부재를 명시적으로 거부한다. 해당 capability 경계도 focused 검사에 포함한다.
예약·세그먼트 identity·시간 매핑·삭제·관측은 임의 폐기하지 않는다. 손상/미지원/투영 실패
원장은 압축하지 않으며 기존 상태와 동등성을 확인한 뒤에만 원자 교체한다.
체크포인트 전/후·중단·재시작·SQLite/JSONL에서 최종 이벤트 상태, 예약 재시도/다음 번호,
삭제 ID 거부가 같아야 한다. 실제 파일이 줄고 반복 예약의 전체 scan이 없어지는 근거도 필요하다.

이 설계는 고유 식별자 수에 비례하는 최소 영속 메타데이터까지 상수 크기로 만든다는 뜻이 아니다.
모든 과거 요청을 영구적으로 구분하면서 유한 크기만 쓴다는 보장은 하지 않는다.
고유 ID 만료 정책, 실제 writer 활성화, 보존/이벤트 소비자 정책 변경을 이번에 몰래 추가하지 않는다.

1C 첫 focused 실행84514는 C++203 pass/6 fail로 중단했다. 사전 예상한 SC02~06 다섯
미구현 실패 외에 SC07도 실패했으므로 전체 결과는 예상 RED가 아니다. SC07은 raw
catalog의 media_root를 전체 실행 root로 잡아 다른 fixture를 함께 순회하도록 구성된
격리 결함이 있다. 정확한 실패 marker/오류는 이번 출력만으로 확정하지 않았다.
checkpoint 거부 stub 이외의 1C 제품 구현은 아직 하지 않았으며 수정·재실행·커밋을
중단했다. 실행 root97777의 21,462,141바이트는 삭제했고 메인이 부재를 확인했다.
재개 대상은 SC07 전용 하위 root와 준비 단계별 오류 확인 후 같은 focused 검증이다.
1번 전체는 미완료이며 finalize-recovery 회귀와 2~5번은 실행하지 않았다.

사용자 「응」으로 SC07 격리 수정과 같은 focused 검증 재개를 승인했다. 전용 하위 root로
분리하고 준비 단계 오류를 구분한다. SC07 및 기존 회귀 통과 후 사전 특정 SC02~06의
미구현 RED만 남으면 승인된 1C 구현을 계속한다. 기존 실패 기록은 유지한다.

재실행96022는 C++204 pass/5 fail로 SC02~06의 사전 예상 미구현 실패만 남았다.
SC01/07과 기존202개가 통과하여 격리 수정은 검증됐으며 1C 구현을 재개했다.
shell9는 예상 RED의 fail-fast로 미실행이다. 임시 root98058의 21,461,549바이트는
삭제했고 메인이 부재를 확인했다. 이 결과는 1C 기능 통과가 아니다.

#### 1번 최종 구현·검증 판정

`recording_journal.h/cpp`의 managed 수명 소유권, 최초 인덱스·증분 예약/ID 검사,
receipt 및 `PrepareCheckpoint/CommitCheckpoint`를 구현했다. `recording_catalog.h/cpp`는
단일 연결·경로 결박, `ValidateManagedCandidateLocked`, 투영 동등성 검사와
`Checkpoint`를 연결한다. 마지막 점검 이후 증가한 원장 크기 1MiB마다 자동 정리하며,
줄어들지 않는 경우에도 그 점검 위치를 갱신하여 매번 전체 정리를 반복하지 않는다.
고유 ID 메타데이터의 선형 증가는 여전히 존재한다. 실제 writer 기본값은 바꾸지 않았다.

원자 stage 기록·fsync·rename·directory fsync와 오류 후 쓰기/hold 차단, prefix 복구,
암호 미지원/손상/미지원 형식/ID 충돌의 원문 보존을 검증했다. SC21의 세 예상 RED는
`OwnsCatalog`가 poison까지 확인하도록 보완한 뒤 통과했다. 실제 SQLite SELECT로
V2 payload/path, hold, observation, tombstone을 확인했고 JSONL 재시작과 대조했다.

- 최종 `./server.sh verify-v410-recording-catalog` 실행7312: exit0, 246 pass/0 fail
  (기본 C++234, 암호 비활성3, 기존 shell9).
- `./server.sh verify-v410-recording-finalize-recovery` 실행84258: exit0, 52 pass/0 fail.
- 메인은 실제 변경·개별 결과·SQL 조회·FD 실패 주입을 검토하고 `git diff --check`를 확인했다.
- 실행 임시 파일은 전부 삭제했다. 최종 catalog 23,688,942바이트, finalize 3,968,609바이트의
  삭제와 경로 부재를 확인했다. 개별 전수 결과·이전 실패·모든 cleanup은 중앙 기록에 보존한다.
- 전체 서버 빌드, 30분/120분/UI 풀테스트, 2~5번과 S11은 이번에 실행하지 않았다.

1번 한정 구현·검증은 완료했으며 승인된 범위의 커밋을 준비한다. 실제 커밋은 Git 이력으로
확인한다. 기존 미커밋 S09/S10 변경은 이 커밋에 섞지 않는다. 푸시 승인 없음.

### S10-3C 세그먼트 시간 계약과 finalize 복구 결합

2026-09-12 사용자 「커밋 후 S10-3C 진행」 승인. A/B는 각각 `a82f4d21`, `15f2753e`로
분리 커밋했다. 이전 S09·S10-1/2의 미커밋 변경은 보존하고 이 커밋에 섞지 않았다.
이후 사용자 「C2~C3까지 마무리·진행 중 커밋·마지막 푸시」 승인으로 의존 C1과 C2/C3를
각각 검증·분리 커밋하고 마지막에 푸시한다. S11·릴리즈 작업은 포함하지 않는다.
이번에는 저장 계약→catalog→ready 복구 순서로 구현하며 실제 writer·조회 UI·이벤트 소비자 활성화는 하지 않는다.

#### C1: 새 시간 계약 (먼저 구현)

기존 contracts header/cpp와 `recording_contract_smoke.cpp`를 사용한다. V1 함수·golden은 그대로 둔다.
`RecordingSegmentV2`의 schema는 `media-server.recording-segment.v2`이며 아래 필드를 snake_case로 저장한다.

- ID: segment_id/source_id/channel_id/store_id/order_request_id/media_epoch_id. 기존 opaque ID 검증을 적용한다.
- order_sequence: 양의 int64. media_start_pts: int64, media_end_pts: nullable int64.
  time_base_num/time_base_den: 양의 int32. 알려진 media_end_pts는 start보다 커야 한다.
- container/video_codecs/audio_codecs/audio_omitted_reason/size_bytes/checksum_sha256/
  retention_class/lifecycle/pinned/created_at_ms/finalized_at_ms는 V1과 같은 물리/운영 의미다.
  UTC start/end 또는 V1 stream_epoch_id를 억지로 생성하지 않는다. lifecycle은 이번 저장 계약에서 Finalized만 허용한다.
  V2 retention_class는 continuous/event만 허용하며 V1의 기존 enum 해석은 변경하지 않는다.
- mappings: `RecordingUtcMappingV1` 배열. 각 항목의 schema는 `media-server.recording-utc-mapping.v1`.
  mapping_id, start_pts, nullable end_pts, provenance, nullable utc_start_ns/utc_end_ns,
  nullable uncertainty_ns, reason을 필수 키로 둔다.
- provenance는 source-capture/server-observation/estimated/unknown만 허용한다. known은 양쪽 UTC와
  media 끝이 모두 있고 각 범위가 증가하며 uncertainty_ns>=0이어야 한다. estimated는 비어 있지 않은 reason이 필요하다.
  unknown은 UTC·uncertainty를 모두 null로 두고 비어 있지 않은 reason을 저장한다. 실제 epoch UTC 0은 unknown 대용이 아니다.
- media 구간은 처음부터 끝까지 빠짐없이 서로 인접한 mapping으로 덮는다. 중복 mapping_id·미디어 겹침·빈 배열은 거부한다.
  끝이 불명확한 경우 마지막 mapping만 unknown/end_pts=null이고 media_end_pts도 null이어야 한다.
  서로 다른 mapping의 UTC는 중복/역행할 수 있다. 저장 시 재계산하거나 단조 보정하지 않는다.
- 최대256개 mapping, reason 최대256 bytes, 전체 JSON 최대1MiB. 상한 초과는 명시 거부하고
  writer가 unknown tail로 묶을 정책을 임의 생성하지 않는다. parser는 알려진 정확한 키/타입을 검증하고 결과를 성공 시에만 대입한다.

공개 함수: ValidateRecordingSegmentV2/SerializeRecordingSegmentV2/ParseRecordingSegmentV2.
Serialize 결과에서 입력 정수·null·provenance를 보존한다. V2를 V1으로 반환하는 adapter는 만들지 않는다.
검증 명령: `./server.sh verify-v410-recording-contracts`. 선언·reject stub에서 새 정상 V2 수용의
예상 RED를 먼저 확인하며 기존 V1 실패는 중단한다. 이후 같은 명령 GREEN과 개별 결과를 기록한다.

#### C2/C3 연결 책임

catalog 저장 옵션 `enable_v2_storage`는 기본 false다. true는 이번 격리 검증에서만 사용하고
실제 composition root에는 연결하지 않는다. false에서 V2 원장/ready를 만나면 부분 복구하지 않고 거부한다.
이 절의 저장 계약이 V2 실제 녹화 활성화를 의미하지 않는다.

#### C2: catalog의 불변 V2 저장

- 기존 journal에 `SegmentV2Finalized`/`segment_v2_finalized`를 추가한다. payload는
  `segment`(전체 V2)와 `mediaRelpath`이며 envelope entityId=segment_id다. 단일 mutation에 같이 보존한다.
- catalog 공개 내부 API는 FinalizeSegmentV2(segment, media_path, error), FindSegmentV2ById(id),
  ValidateFinalizeRecoveryV2(segment, media_path, error), RecoverFinalizedSegmentV2(segment, media_path, inserted, error)다.
  예약 확인은 읽기만 수행한다. 없으면 예약을 새로 발급하지 않으며 store/request/segment/channel/sequence가 모두 같아야 한다.
- V1/V2 ID는 같은 namespace다. 상호 충돌·tombstone·경로 및 불변 metadata 불일치는 거부한다.
  동일 V2 replay/recovery는 멱등이며 finalize 때 다른 mapping으로 덮어쓰지 않는다.
- V2 projection은 별도 `recording_segments_v2(segment_id PRIMARY KEY,payload_json,media_relpath)`에
  정규 JSON 전체를 저장한다. V1 UTC 열에 대체값을 넣지 않는다. journal 재구축에서 메모리가 수용한
  동일 ordinal/envelope만 투영하고 직접 SQL의 JSON/path와 in-memory 결과를 대조한다.
- V2 신규 mutation은 전체 envelope/예약/기존 identity를 검증한 뒤 수용한다. 잘못된 V2 기록은
  catalog Open에서 SQLite 변경·cleanup 전에 거부한다. V1의 기존 손상 복구 정책은 완화/확대하지 않는다.
  Open 사전 검사는 임시 상태로 수행하여 실패 후 Open 재시도가 부분 메모리를 수용하지 않게 한다.
  V2 옵션 true 또는 정상 order reservation/V2 record가 있는 원장에 손상/tail이 있으면 시작을 거부한다.
  일반 V1-only 원장의 기존 손상 복구는 유지한다. V2 payload는 Replay에서 잃어버리지 말고 catalog가 검증한다.
- 예약 이후의 V2 finalize는 journal 순서 발급 scan에서 기존 segment 상태로 취급한다.
  catalog가 열린 뒤 발급된 예약도 fresh replay로 읽되, 파일 검사/append와 store 전체 다중 writer 소유권은
  실제 활성화 전 경계다. 비협력 writer와의 완전 직렬화 완료로 보고하지 않는다.
- V2 Find는 tombstone ID를 숨긴다. V1 tombstone/삭제 기록을 보존하고 V2와 ID 충돌 시 부활시키지 않는다.
  V2를 V1 QuerySegments/retention/분석 locator에 추가하지 않는다. 새 삭제 producer는 소비자 연결 단계다.
  orphan 인식에는 V2의 실제 등록 경로를 포함하여 이미 등록된 파일을 미등록 파일로 분류하지 않는다.

#### C3: ready의 버전 분기

- 기존 FinalizeReadyTicket에 optional segment_v2를 추가한다. 기존 segment와 동시에 지정하면 거부한다.
  version=1 직렬화/검증은 유지한다. version=2는 segment에 V2 전체를 담고 기존 partial/final/eventLink 키를 유지한다.
  V2 ticket의 기존 segment는 기본 V1 객체 그대로여야 한다. ID뿐 아니라 다른 V1 필드를 채운 mixed 입력도 거부한다.
- V2 ready는 continuous만 이번 복구 경로로 받는다(eventLink=null). 기존 event V1 ready는 그대로 유지한다.
  V2 event 파생 provenance/hold는 이벤트 소비자 연결 때까지 명시 거부하며 자동 V1 변환하지 않는다.
- same directory, nonce, filename/ID/container, nlink/nofollow, 원문 보존/정리 경계는 V1과 같다.
  매핑·순서·reservation·tombstone·기존 ID/path를 publish 전에 검증한다. V2 옵션 false이면 publish 전에 거부한다.
- catalog 인자가 없는 기존 PublishFinalizeReady는 V1 진입점으로 유지하고 V2 직접 호출은 거부한다.
  V2 publish는 RecoverFinalizeReadyTickets의 catalog 검증 이후 내부 경로에서만 허용한다.
  ready 작성은 최종 공개가 아니며, 예약이 없는 ticket을 복구하면서 새 순서를 발급하지 않는다.
  ClearFinalizeReady도 V2 직접 호출을 거부하고 원장 commit 성공 뒤 내부 정리 경로만 사용한다.
- 실제 미디어 검사는 공통 물리 descriptor(container/codecs/bytes/SHA/retention)만 사용하도록 내부 분리한다.
  V1 inspector API는 wrapper로 유지하며 V2에 가짜 V1 UTC를 만들어 전달하지 않는다.
- V2의 중단된 두 link는 검사 전에 partial을 제거하지 않는다. inspector의 새 내부 물리 검사 경로에서만
  정확한 같은 디렉터리의 서로 다른 두 이름·동일 regular inode·nlink=2를 전후 확인한다.
  임의 hardlink 허용 옵션으로 일반 V1 검사를 완화하지 않는다. Healthy와 두 이름의 binding 재확인 뒤에만
  partial 이름을 정리한다. 손상/검사불가이면 두 이름과 ready를 그대로 보존한다.
- 전체 ready envelope도 최대1MiB다. segment만 한도 이내여도 경로·envelope를 합쳐 초과하면
  파일 생성 전에 거부한다. V1 직렬화는 바꾸지 않는다.
- partial만 존재/중단된 두 link/final만 존재/원장 commit 뒤 ready 잔존을 복구하고 같은 V2를 복원한다.
  이미 commit된 metadata와 ticket이 다르거나 미디어가 손상/검사불가이면 파일·ready를 보존하고 실패한다.
  V2 손상의 기존 V1 corruption/provenance 모델로의 자동 격리 변환은 하지 않는다.
  원장 commit 뒤 동일 ticket을 확인한 경우에만 기존 marker/ready 정리를 수행한다.

최종 합격은 같은 V2 원문 의미가 ready→journal→SQLite/JSONL 재시작에서 보존되고,
충돌·누락·삭제 ID는 publish/ready 제거 전에 거부되는 것이다. 시간 없는 V1 투영은 금지한다.
등록/실행은 중앙 S10-3C 기록을 따른다. contracts, catalog, finalize-recovery의 focused만 승인 범위이며
whole build·integration 옵션·30분/120분/UI·C 이후 단계는 이번 실행 범위 밖이다.

| 런타임 패밀리 | 담당 | 추천 모델 | 추론 수준 | 선정 근거 |
| --- | --- | --- | --- | --- |
| Codex | 메인 설계·검토, 기존 단일 담당자 구현 | gpt-6-astra | medium 유지 | 영향2/불확실성2/검증2/범위2=8. 시간·저장·복구 계약을 메인이 고정하며 구현을 순차 위임. 자동 상향·하위 생성 없음 |

- [x] C1 계약·V1 golden 회귀: focused 최종135/0. V1 89개 유지, 새 V2 46개.
  최초 정상 수용 RED 5개와 검토 후 Unknown retention RED 2개를 각각 기록하고 보완했다.
  전수 결과·실패 이력·임시5경로 삭제는 중앙 테스트 기록의 S10-3C/C1 절에 보존했다.
- [x] C2 원장·catalog·SQLite 동등성: 최종172/0(기존139개 포함).
  예약 검증 공유, 별도 V2 투영, 최신 원장 후보 대조·실제 파일 존재와 삭제/충돌 경계를 구현했다.
  메인이 실제 diff 및 중앙 C2 전수 결과를 대조했다. V2 실제 writer 활성화는 하지 않았다.
- [x] C3 ready 복구·삭제/충돌 보존 및 관련 회귀: 최종52/0(V1 20개 포함), catalog172/0.
  ready/inspector 헤더·구현과 focused 테스트에 V2 분기·물리 descriptor·두 link 검사·commit 후 정리를 추가했다.
  메인이 실제 diff와 전수 결과를 대조했고, marker가 남은 새 Catalog.Open→Recover도 확인했다.

C2 첫 구현 후 담당자 도구 분류 오류로 중단했던 이력은 중앙 기록에 보존했다.
새 승인으로 재개하여 미해소 두 경계와 전수 결과 이관을 마쳤다. C1은 eb7d4885, C2는 ebf74762로
커밋했다. C3도 한정 구현·검증을 마쳤다. 실제 writer 연결·전체 build·integration·UI·30/120분·S11은 미실행이다.

v4.1.0 개발 완료는 다음이 모두 참일 때만 성립한다.

1. channel opt-in recorder가 client 유무와 무관하게 source를 유지하고 불변 segment를
   계속 만든다.
2. quota 초과와 reserve 부족에서 oldest eligible continuous를 지운 뒤 녹화를 계속한다.
3. event clip은 별도 quota로 보호되고, 파생 중 source segment도 retention에서 보호된다.
4. event clip/fallback이 logical timeline에서 continuous보다 먼저 표출·재생된다.
5. journal만으로 SQLite/in-memory projection을 idempotent하게 재구축할 수 있다.
6. crash, deletion_pending, orphan, corrupt media/catalog가 fail-closed 상태로 수렴한다.
7. event/track boundary·summary와 bounded observation이 정확한 FrameLocator를 가진다.
8. v4.1 golden fixture와 contract 의미를 후속 버전이 수정하지 않도록 gate가 존재한다.
9. 관련 기능별 test, 문서/evidence, `git diff --check`가 모두 갖춰진다.
10. 미실행 UI/30분/120분/field smoke와 release action을 완료로 오인하지 않는다.

## 실행 handoff

실행자는 한 번에 한 roadmap 단계만 진행하고 매 단계 종료 시 다음을 보고한다.

- 구현한 파일·route·함수·module·UI control·API·verifier
- focused test 명령과 실제 exit code
- 실패/수정/재검증 이력
- 변경 파일, 영향 범위, 회귀 가능성
- 미실행·조건부 test
- 커밋 가능 여부와 실제 커밋 미수행/수행 여부
- 푸시 가능 여부

## 시간 구간 P0 1·2 후속 실행 계획 (2026-09-15)

독자: 현재 녹화 설계·검증 담당. 이 절은 사용자 승인된 원인 계측과 계산 방식 확정만 다룬다.
작업 정책은 AGENTS, 개별 실행 정의·결과는 release-test-records가 기준이다.

- [x] 1. `scripts/internal/recording_timing_probe*` 및 실행기로 기존 managed writer의 실제
  30fps/GOP250·30000/1001·B-frame·VFR 파일을 계측한다. 입력→native 표→demux→parser를 대조한다.
  전체 샘플의 값·source hash·최초 실패·정리를 보존하고 메인이 직접 검토한 후 `test` 커밋한다.
  결과: TP01~04 및 TP04-W 특성화 성공, 최종 exit0/6초, 29개 시각 증거 보존·소유 root 삭제 확인.
  parser duration 재작성, B-frame DTS/presentation 차이, tail 원본 시작 결박 불일치를 분리했다.
  [직접 증거](../../release-artifacts/v4.1.0/s11-preparation-mapping/timing-probe-report.md).
- [x] 2. 1번 결과에 따라 정확 시간단위에서 계산한 presentation interval의 끝점·원본축 변환과
  증거 부족/실제 누락 거부 규칙을 확정한다. 검증 전용 산술 모델에서 EP01~08을 확인하고
  계약/대안/미지원/후속 적용 범위를 기록한 후 별도 `docs/test` 커밋한다.
  [계산 계약](../specs/2026-09-15-recording-endpoint-contract.md) 확정, 모델 EP01 예상RED 뒤 EP01~08 최종8PASS/0FAIL.
  tail/B-frame 시작 결박 불일치를 숨기지 않으며 제품 적용/저장/대기는 미착수다.
커밋·푸시는 승인된 1·2만 clean/diffcheck/문서 검증 뒤 수행하고 remote hash 일치를 확인한다.
실제 전송 결과는 Git 이력·원격 상태와 최종 보고를 따른다. 문서로 사전 완료 처리하지 않는다.

불변: 제품 구현·저장 바이트/schema·ID·원본 분할·wait/queue·완전/부분 판정·기존 R03 oracle.
제외: 필요한 최소 증거 저장(3), 대기 정책(4), 생성·복구·타임라인 및 실제 통합(5), UI/30분/120분.
계측 PASS와 계산 모델 PASS는 제품 문제가 수정됐다는 뜻이 아니다. 모델 승인 결과의 제품 적용은 3번 이후다.
이번 단계의 증거는 제품 불변의 기존 회귀 결과를 무효화하지 않는다. 새 검증 도구 자체와 문서만 검증한다.

## 시간 구간 3-A·3-B·4 재개 계획 (2026-09-16)

독자: 이번 구현 담당자. 기존 설계의 실행 세분화이며 정책은 AGENTS, 계약은
[녹화 종료점 계약](../specs/2026-09-15-recording-endpoint-contract.md)을 따른다.
사용자가 세 단계 개발·분할 커밋·최종 푸시를 승인했다. 현재 v4.1.0 작업 위치의 기존 미커밋
조사 증거를 보존하며 별도 브랜치나 worktree를 생성하지 않는다. 메인이 계약·최종 판정,
단일 Astra/medium 담당자가 한정 구현을 맡는다. 하위 생성은 금지한다.

- [x] 3-A: 기존 MAP-A 해석 정정 후 실제 기본 writer forward 계측.
  `recording_forward_probe_*`는 테스트 전용 wrapper/driver/reader/runner로 분리한다.
  제품 writer는 그대로 링크하고 accepted appsrc 및 실제 mux sink의 시각·내용을 수집한다.
  파일 native sample과 내용 대조를 거친 뒤 ns→tick 규칙과 시작·끝 의미를 확정한다.
  FW01~04의 독립 literal/native table oracle와 부정 조건을 검토한다. 실행은
  `bash scripts/internal/recording_forward_probe_run.sh`; 출력·환경·정리를 중앙에 보존한다.
  실패를 제품 TDD RED로 바꾸지 않으며 관측 성공만으로 원본축 종료 계약 완료를 주장하지 않는다.
  결과: FW01~04 실제372AU/5파일, FW05 33검사 통과. 수락 원본 identity와 `실제O+native구간`을
  구분하는 계약·유리수 gap 조건을 확정했다. 과거 MAP-A/NP 실패·검사 한계는 보존한다.
- [ ] 3-B: 3-A 증거로 확정된 필드만 writer/source binding/finalize/catalog에 수집·결박한다.
  실제 source binding 왕복·변조 거부·SQLite 및 journal 복구·상한/잠금 비용 검사를 사전등록하고
  예상 assertion RED → 구현 → GREEN 및 영향 회귀를 수행한다. 원본 데이터 소급 승격 금지.
  검증된 단계만 별도 커밋한다. 3-A 미확정이면 필드·증거를 임의로 설계하지 않는다.
  초기 결과: optional file evidence/writer/Ready/복구를 구현하고 focused176개가 출력상 통과했다.
  새 증거를 기존 job에 복제하여8원본 상한을 넘던 회귀는 비소비 projection으로 해소했다.
  다만8×4096 AU 저장 합계9.983초(기존0.986초), checkpoint1.487초(기존0.343초)로 비용이 늘었다.
  당시 비용·회귀 미해소로3-B 완료·커밋을 보류했다. [초기 전수 실행 기록](../../release-artifacts/v4.1.0/s11-preparation-mapping/file-evidence-report.md).
  후속 FC01~05 최소 보완은 완료했다. 동일 payload 반복 해석을 제거하여8원본 잠금 점유 합계34.7% 감소,
  최종FE193개·관련 회귀·전체build 통과다. 과거FE06 oracle 무효 정정과MP4 data reference 거부도 반영했다.
  단, 최대1.227초 잠금 점유와 실제HTTP 지연의 허용 여부는 남아 있어3-B 전체 운영성능 합격으로 표시하지 않는다.
  저장 구현·검증된 최소 보완 단위는 커밋 가능하며 [최종 비용 보완 기록](../../release-artifacts/v4.1.0/s11-preparation-mapping/catalog-cost-report.md)을 따른다.
- [ ] 4: 단일 worker의 요청별 재평가, 절대 steady deadline, 임시 provider busy와 identity 오류 구분,
  pending 원본 보호 및 Intent 전환/취소/재시작 정리를 구현한다. 기존 용량 상한·pipeline 정책 유지.
  긴 GOP·복수 요청·보존 경쟁·취소/상한을 사전등록 후 TDD/영향 회귀한다. timeout만 늘리지 않는다.
  현재 WP01~10 사전등록/설계만 있고3-B 비용 미해소로 코드 구현·실행은 건너뛰었다.
- [ ] 메인 diff/증거 직접 검토, docs links 및 diffcheck, 승인 범위 분할 커밋을 확인한다.
  미해소 실패·cleanup·미커밋이 없을 때 승인된 v4.1.0 푸시 후 원격 hash를 확인한다.

후속 5번 공통 소비·실제 통합과 S11/장시간/브라우저/release action은 이번 개발에 섞지 않는다.
3-B/4의 정확한 필드·테스트 구현은 선수 계약이 확정된 후 이 절에 보완한다. 지금은 그 두 단계의
착수 가능한 상세 구현안이 확정됐다고 주장하지 않는다.

### 4번 구현 준비: pending 대기·보존 경계

#### 현재 선수: 사용자 승인된 3-B 비용 보완 재개

FC01~05 실행 완료. 이번 최소 중복 보완의 합격과 잔여 운영 지연 판정을 구분한다.
다음에는 누적 catalog·실제HTTP 지연의 조건/허용 기준을 고정하여 필요한 추가 보완을 판단한다.
새로운 checkpoint 신뢰/주기/저장 구조를 이번 결과만으로 승인하지 않는다.

현재 실행 범위는 FC01 계측 → FC02 최소 중복 보완 → FC03 동일 조건 비교 → FC04/05 회귀·build다.
4번 코드는 이 묶음에 포함하지 않는다. 기존 저장 형식/바이트·원본 semantic 검증·손상 거부·1MiB 조건을
유지하고, 단계별로 실제 비용 원인을 확인한 뒤 다음 수정 범위를 확정한다. 계측 도구는 테스트 전용이며
제품 공개 API나 영구 진단 로그를 추가하지 않는다. 계측 source 삽입점과 정상 동작을 검사한다.
동일/상이 checkpoint 후보, 기존/새 증거, 작은/누적 catalog를 비교하며 기존 오류를 사후 완화하지 않는다.
마지막에 source-binding/write-boundaries/journal/checkpoint/finalize 영향 회귀, FE 및 지원·상한, 전체 build를
확인한다. 새 구조나 전체 S11 검증을 자동 착수하지 않는다. 단위 의존성이 닫히고 해당 검증이 통과한
변경만 분할 커밋하며, 현재 승인 범위가 모두 완료되고 미커밋/실패가 없으면 최종 푸시한다.

3-B 검증 통과 후만 착수한다. worker의 FIFO 한 요청 안에서 대기하는 구조를 요청별
`deadline/next_attempt/attempts` 재평가로 바꾼다. 대기만 하는 첫 요청이 준비된 뒤 요청의
처리를 막지 않아야 한다. 실제 미디어 작업은 기존 단일 서비스·취소 경계를 유지한다.
각 요청은 접수 시 고정된 steady deadline을 사용하고 재평가·busy·갱신으로 연장하지 않는다.
기존60초/32요청/재시도 상한을 유지하며 늦은 GOP의 완전 결과를 보장하지 않는다.

observer의 일시 잠금 경합/미확보는 명시된 unavailable로 구분한다. 실제 다른 identity/namespace
자료는 기존처럼 거부한다. 시각·샘플·namespace를 섞어 새 증거를 만들지 않는다.
selection complete와 실제 파일 finalize를 기준으로 진행하며 시간 경과 자체는 증거가 아니다.

pending source 보호는 catalog 잠금 안에 요청 identity·범위와 수명이 제한된 내부 lease로
등록하는 방식을 우선 검토한다. 삭제 예약/retention snapshot과 같은 검사에서 적용하여
이미 확정된 원본뿐 아니라 대기 중 새로 finalize된 관련 원본도 삭제 경쟁에서 보호한다.
메모리 lease를 내구 pin으로 변환하지 않는다. pending은 재시작 후 자료를 발명해 재개하지 않으며,
내구 Intent 이후는 기존 복구/hold가 책임진다. Intent의 기존 내구 보호가 확보되기 전 lease를
해제하지 않고, 취소·실패·종료는 소유 lease를 해제한다. 만료 이후에는 안전하게 재검증/거부한다.

새로운 영구 pin·저장 정책·무제한 용량 예약·source pipeline 차단을 추가하지 않는다.
정확한 lease API와 포화/만료 검사는 3-B 이후 실제 영향 범위를 대조해 확정하며,
여기서 코드 구현·검증 완료를 주장하지 않는다.
