# R141 수집 계약과 45분 용량 판단

R140 HOLD와 모든 과거 결과는 그대로 둔다. 이번에는 제품 서버·600/900/2700/7200초 실행 없이 진단 코드/소비자 단위 검사와 빌드만 수행한다. 수집 계약과 정상45분 총량 증명을 분리한다.

## 수집 변경

- memory 완전 wire record는 UTF-8 **개행 포함16383B 이하**다. Buffer로 chunk 경계를 보존하고 완결 record에서 fatal UTF-8 검증한다. 정상 중간/개행직전 split은 허용하며 malformed/partial UTF-8, 미완결 prefix/tail, 기존 resource-owner seq/phase 불일치는 거부한다. emitter16KiB는 불변이다.
- completion/evidence 수집은 stdout/stderr 각각 최대767B wire framer를 두며 전체 payload 목록을 보유하지 않는다. 기존 completion schema와 evidence의 정확한 field/type을 검증한다. event14/lost:true, malformed, receipt 뒤 같은 stream 기록은 별도 수집 FAIL이다. 무관한 텍스트의 event14는 실패 근거가 아니다.
- terminal receipt는 latency opt-in에서만 main이 composition root 반환 뒤 한 번 출력한다. rows/bytes는 공통 Write에서 실제 fwrite 반환값으로 집계하며, 완전 기록만 rows에 포함한다. receipt 자신은 rows/bytes에서 제외하지만 shared2MiB/process4MiB 예산에는 포함된다. stderr flush 오류, short write, marker 없는 lost 상태도 receipt를 불완전하게 만든다. receipt 누락/중복/count·byte 불일치/complete=false는 FAIL이다.
- stdout/stderr의 OS delivery 순서는 같다고 가정하지 않는다. stream별 framing 후 종료 시 공통 count/bytes를 대조한다. 다른 stream에서 receipt보다 늦게 도착한 이전 기록은 최종 대조 대상이다. 같은 stream의 terminal 이후 대상 기록 및 producer의 after-end 표식은 FAIL이다.
- 기존 regular4095행과2MiB-512B(증거2MiB-768B) 거부 조건은 그대로다. 남은512B 안에서 기존 loss<=164B, receipt<256B 최대1회, after-end<=64B 최대1회, 합계<484B를 사용한다. 행/byte 상한 확대가 아니다. receipt는 정상 종료 전체 또는 journal 무결성 증명이 아니다.

## 종료 지점 근거와 한계

`src/main.cpp`는 `RunMediaServerApplication`이 반환한 다음 receipt를 호출한다. 구성 함수의 모든 local 소비자와 storage/resource trace는 이미 파괴됐다. 기존 Stop 순서를 바꾸지 않았다.

completion producer는 DerivedEventWorker, Catalog job 상태 적용, RecordingReadService/Timeline projection 및 HTTP evidence failure다. `WebRtcHttpServer::Stop`은 accept join 뒤 recording gate Drain을 기다리며 해당 detached handler는 response 정리 후 flight를 반환한다. `CatalogEventRecordingBridge::StopAndDrain`과 `DerivedEventWorker::StopAndDrain`은 worker/renderer를 join한다. Catalog/reader는 구성 local 소유이며 이 경계 이후 정상 completion/evidence 호출자를 확인하지 못했다. static destructor 순서에 의존해 receipt를 출력하지 않는다.

latency TLS/SlowTail/visual request 종료 출력은 뒤에 나올 수 있지만 **다른 prefix**다. receipt를 이들 전체 로그의 종료 증명으로 확대하지 않는다. 실제 새 product 정상종료·closed journal·owner0는 이번에 실행하지 않았다. 합성 local destructor의 마지막 completion을 포함한 receipt, 기존 final-owner0 소비자 검사는 단위 근거다.

## R140 대비 추가 소유 조사

R140 prefix별 표를 재사용한다. 진단 registry128과 관측7은 실제 model 최대값이 아니다.

현재 제품의 단일 RecordingApplicationService에는 SearchState current source1, snapshot entries 최대8이 있다. Page/seek/evidence는 shared_ptr를 반환받아 snapshot 퇴거 후에도 유지할 수 있다. HTTP 동시 접속 상한은 `webrtc_http_server_detail.h`의128이며 active connection guard가 각 handler 수명을 덮는다. cursor resume는 새 model을 만들지 않는다. source Refresh/WithEventFacts/WithPlayback 및 snapshot Begin은 단일 preparation_mutex 아래 순차 수행한다. BuildOwned/ApplyDelta의 새 model과 이전 source, 요청의 event projection/새 playback projection의 중첩을 구분해야 한다. retry span은 문서를 회수한 batch이며 그 자체를 살아 있는 model 하나로 다시 세지 않는다.

**HTTP 소비자만 있는 단일 서비스에 한정한 보수적 덮개**는 current1 + snapshot8 + 요청별 마지막 참조 최대128 + 직렬 준비의 추가 model 최대2 =139다. 이는 shared 소유 중복을 포함하는 상한용 덮개이며 실제 unique139가 동시에 존재한다거나 정상45분에 도달한다는 주장이 아니다. 동일 model을 가진 실제 shared_ptr 여러 개는 unique1이다. 이 덮개는 registry128 이하를 증명하지도, source-feasible overflow를 증명하지도 않는다. 원래 mixed client의 요청·보조 작업·timeout 이후 server 잔류 수명을 결합한 더 작은 정상 상한은 미확정이다. 8 snapshot만으로 전체 model8이라고 할 수 없다.

## 삭제·출력 잔여

직접 deletion_requested/completed·generation/checkpoint는 journal mutation이며 stdout 추가0B라는 R140 근거를 재사용한다. 삭제 뒤 state transitions, job completion, 검색 현재성 실패/재시도 및 shutdown은 기존 producer 그룹의 간접 출력으로 계상해야 한다. completion/evidence는 새 receipt까지 기존 shared2MiB 안이지만, 정상45분에서 다른 그룹과 함께 발생하는 총행·총byte의 결합 상한은 없다. 두 채널2초 분할의 명목 파일 수를 손실/keyframe/generation 분할까지 포함한 최대 파일 수로 사용하지 않는다.

GStreamer/ORT 등의 외부 runtime 출력에는 제품의 전체 stdout/stderr 소스 상한이 없다. 이를 정상 workload에서 실현 가능한 flood 또는 관측 overflow라고 단정하지 않는다. 정상 startup 경로의 문자열 길이·조건부 출력도 완전한 합계가 미확정이다. R137 평균, type-only30,239B 또는 서로 다른 시점 최대값을 대입하지 않는다.

따라서 **HOLD_45_LOG_BUDGET_PROOF_GAP**를 유지한다. READY나 BLOCKED_SOURCE_FEASIBLE_OVERFLOW 근거는 없다.

## 다음 최소 결정

새 장시간 실행 전에 (1) 실제 mixed 요청 수명으로 unique model/normal producer 발생 수 상한을 닫고, (2) 현재 필수 필드를 보존한 numeric schema에서 immutable 필드 단일 표현·absolute epoch+검증된 delta·site 중복 집계 제거의 byte 상한을 설계하며, (3) 외부 runtime 조건부 출력의 loss 검출/보존 계약을 정해야 한다. cap 확대·오류 무시·필수 의미 삭제는 대안이 아니다. 이번에는 전면 형식 변경을 구현하지 않았다.
