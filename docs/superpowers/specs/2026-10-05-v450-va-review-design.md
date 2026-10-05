# v4.5.0 VA Review 개발 계약

2026-10-05 사용자가 V450-01~07 순차 개발, 분할 커밋과 마지막 푸시를 승인했다.
순서는 [로드맵](../../v410-v49-recording-search-roadmap.md#개발-우선순위와-선행-관계)을 따른다.
이 문서는 구현 계약이며 실행 결과가 아니다. 실제 모델 준비·외부 전송 조건이 미충족이면
해당 검증은 미완료로 남긴다. V450-08의 장시간·UI 풀테스트와 릴리즈 실행은 별도 승인이다.

## 범위와 호환

불변 EvidencePackageV1에서 시간순 PNG를 읽어 운영자의 검토 질문에 대한 supports,
questions, contradictions, unclear와 confidence를 저장한다. 질문은 1~512byte의 정제된
문자열이며 모델에 대한 시스템 지시나 실행 명령이 아니다. 원본을 보지 못한 구간과 단일
프레임의 행동 판단은 불확실성으로 표시한다. confidence는 모델의 자기평가이며 보정된
사건 확률·객체 동일성 점수가 아니다. 관측·검토는 EventRecord의 사실 판정을 바꾸지 않는다.

기존 VLM profile/FeatureSet/sidecar/운영자 review 계약의 무호출 의미를 유지한다.
별도 `media-server.va-review-input.v1`, `media-server.va-review-output.v1`,
`media-server.va-review-record.v1`을 추가한다. 자동 Rule/Profile 적용, 교차 카메라 Entity,
자연어 검색, evidence default-on, 영구 credential store, 무제한 이력 지원은 비범위다.

## 입력과 결과

최신 사용자 승인으로 네 항목의 실제 생성과 한국어 응답을 보완한다. 모델은 관측에 따라
supports/contradictions/unclear와 필요한 추가 확인 질문 questions를 생성하며 모든 항목을
억지로 채우지 않는다. 근거가 없는 항목은 빈 배열로 유지한다. 현재 단일 설명·3분류를 네 그룹으로
옮기고 questions를 항상 비우던 adapter는 이 목표의 완료로 보지 않는다. 한국어 의미·근거·부족
사례의 독립 기대값은 기존 테스트 정의/fixture에 반영한 뒤 실제 로컬 모델로 평가한다.

내부 provider v10/adapter v11은 자유 질문의 원문 구간을 `claims.c0`~`c15`의 제한된 객체
슬롯에 연결한다. 입력 API에는 claim 집합/ID가 없으므로 의미 단위 분할은 여전히 모델이
담당한다. 문장부호로 개수를 추정하지 않으며 입력 주장별 정확한 개수를 생성 전에 보장했다고
주장하지 않는다. c0 필수·미등록 key 금지 schema와 수신기의 연속 ID·원문 순차 소비로
중복/누락/추가·원문 바꿔쓰기를 거부한다. 같은 결론을 가진 서로 다른 주장은 허용한다.

각 주장의 공통 필드는 claim, target/property(position/color/state/visibility/other/unspecified),
프레임 키 f0~fN의 observations, 한국어 summary, decision이다. 공통 scope는 제거한다.
관측은 identity(same/other/uncertain), visibility(visible/not-visible/unknown), 실제 속성 value
또는 null이다. 속성 관측 가능성·동일성 불명·확인된 다른 대상·PTS 순서를 독립 계산한다.
관측 불가 속성값은 거부하며 보이지 않는 속성과 동일성 불명은 함께 표현할 수 있다.
확인된 다른 대상은 동일성 불명과 별도 상태로 보존하고 어느 쪽도 대상의 비교 근거로 쓰지 않는다.

- 충분 decision은 `{verdict: supported|contradicted, basis}`다. visible-property는 한 시점의
  정적 속성, ordered-endpoints는 서로 다른 순서의 PTS에서 동일 대상의 양 끝 속성 비교,
  all-sampled-states는 모든 입력 프레임의 관측이다. 위치 비교에는 둘 이상의 시점이 필요하다.
  가려진 중간 경로를 입증하는 basis는 없다. visible-property로 이동을 판정하는 등 모델이
  요구 관계를 잘못 선택한 경우는 자유 원문의 의미 평가에서 거부하며 한국어 단어로 판별하지 않는다.
- 부족 decision은 `{verdict: insufficient, gaps}`다. 충분 판정용 basis나 scope를 생성하지 않는다.
  gaps는 additional-frame/unobserved-property/identity/unobserved-interval/clarify-claim 중
  실제 부족을 선택한다. 관련 관측 frameIndices(1개 이상), missing, 실제 한국어 question만
  생성하며 target/property는 상위 claim에서 상속한다. 별도 대상/속성 필드를 받지 않는다.
  추가 시점은 사용할 수 있는 순서쌍이 없을 때, 속성 부족은 해당 속성이 관측되지 않을 때,
  동일성 부족은 unknown/other가 있을 때 허용한다. 구간·질의 명확화의 필요성은 원문과
  영상 의미를 함께 평가한다. 샘플 양 끝이 보여도 미관측 구간은 남을 수 있다.

visibility 자체를 묻는 주장에서는 보이지 않음도 반증 관측일 수 있다. 단일 프레임의 색상·상태
판단에 시간 비교를 강요하지 않는다. 같은 claim/gap 반복·무효 참조·관측과 모순되는 gap·충분
판정의 질문은 거부한다. 부족 설명과 질문은 원 주장에 답을 요구하지 않고 필요한 새 자료를
확보하도록 연결한다. 질문의 중립성·자료 요청·대상/속성·필요한 시간/구간·기존 자료 중복은
[테스트 정의](../../project-feature-test-inventory.md#v450-va-review)에 따라 별도로 평가한다.
서버는 질문을 생성·보정하거나 무효 응답을 재분류하지 않는다.

생성 schema는 decision의 단순 anyOf 두 객체, 고정 claim/frame/gap key와 길이·범위 제한을
사용한다. `minProperties`/`uniqueItems`를 포함한 선언의 decoder 강제는 독립 확인하지 않았다.
비어 있는 gap·중복 index·원문 coverage·관측/시간 연결은 수신기의 필수 검증이며, schema
선언만으로 자연어 진실·의미 분할·질문 목적·공개 그룹 전체 크기를 보장한다고 주장하지 않는다.

공개 output/record v1과 권한·저장 의미는 유지한다. 모델의 verdict를 해당 공개 그룹으로
연결하고 summary를 그대로 보존하며 gaps의 missing/question도 그대로 unclear/questions에
연결한다. 근거 index는 모델이 지정한 프레임 관측/부족 근거의 실제 index다. 불필요한 그룹은
비우고 전체 insufficient면 confidence=null이다. 내부 필드로 공개 본문 오류를 숨기지 않는다.
원응답의 top-level 완료·stop 종료를 요구하며 timeout/length/부분 JSON은 복구하지 않는다.
설명 160문자/512byte, 속성 80문자/256byte, 입력당 최대 8프레임/16주장, wire 40KiB,
공개 그룹당 16항목과 기존 응답/시간/토큰 예산을 유지한다. format과 system prompt는 동일한
입력 프레임 수별 schema를 사용한다. record prompt digest는 실제 system prompt+고정 reminder의
hash이며 schema를 포함한다. 합성 평가에서 별도 schema hash와 전송 request hash도 기록한다.
생성 schema의 요청 포함·수신 반례 PASS와 실제 decoder 강제 성공은 구분한다.
프레임별 PNG 메시지와 마지막 원 질문/시간 metadata, 원본 바이트·순서는 유지한다.

- 입력은 서버 소유 package ID, 검증한 manifest digest, 질문, 순서가 있는 frame 참조다.
  frame은 manifest의 segment/source generation/media epoch/sample/PTS/UTC 품질과
  PNG hash 및 asset index를 보존한다. 외부 URL·파일 경로·사용자가 만든 manifest를 받지 않는다.
- 1~8개의 보존 PNG를 사용한다. 빈 패키지는 `review-no-frames`, 손상·중복·다른 참조는
  실패다. 누락 자료가 있는 정상 partial 패키지는 그 한계를 입력과 결과에 유지한다.
  원본 삭제 후에도 검증된 보존 PNG를 사용하며 최신 프레임으로 대체하지 않는다.
- output의 네 항목은 각각 최대 16개의 `{text, frameIndices}`다. text는 최대 512byte,
  frameIndices는 중복 없는 실제 입력의 0-based index다. supports/contradictions에는
  최소 하나의 근거가 필요하다. questions/unclear는 전체 증거 부족을 표현할 때 빈 참조를 허용한다.
  confidence는 유한한 0~1 또는 null이며 뒷받침·모순 근거가 모두 없으면 null이다.
- strict JSON parser로 중복 key·추가 필드·타입·크기·참조·NaN/무한대를 거부한다.
  provider 응답의 schema 적합성과 의미 품질은 별도로 검사한다. 잘못된 응답은 저장하지 않는다.
- record는 input, 정제된 output, provider/model, prompt template·전송 adapter version/digest,
  실행 시각과 독립 revision ID를 보존한다. 같은 검토 재실행은 새 record이며 기존 결과를 덮어쓰지 않는다.
  raw 조립 prompt·raw provider response·credential·source URL·중복 영상은 저장하지 않는다.

## 저장·작업 수명

- recording root의 별도 `va-reviews`에 0600 불변 파일을 원자 게시하고 fsync한다.
  content hash 기반 `vr-` ID로 내용 검증 후 조회한다. pending은 공개하지 않으며
  소유 writer lock 아래에서만 복구·정리한다. symlink·hardlink·외부 경로·손상은 거부한다.
- 저장 한도는 512개/64MiB, record 하나는 128KiB, 여유 공간은 최소 256MiB다.
  자동 삭제하지 않으며 한도 초과·I/O 실패는 성공으로 반환하지 않는다.
- worker 1개, 대기 4개, 완료 상태를 포함한 작업 기억은 최대 64개다. 대기열에는
  package ID와 bounded metadata만 둔다. 입력 PNG 합계는 12MiB이며 초과 시 입력을 줄이지 않고 거부한다.
- 대기 한도 30초, 개별 실행 60초, 출력 응답 64KiB다. HTTP 요청 thread나 공유 미디어
  callback에서 모델을 호출하지 않는다. timeout·취소·권한 회수·종료 시 provider 전송을 중단하고
  작업 소유 FD/메모리를 해제한다. OS blocking I/O의 강제 선점은 보장하지 않는다.
- job은 프로세스 수명에 한정한다. 재시작은 완료 record를 재검증해 읽고 이전 job은
  만료로 응답하며 자동 재호출하지 않는다. 저장 성공과 job 조회 가능 수명을 구분한다.
- 큐 중복은 같은 principal/package/question/provider의 진행 중 요청에 같은 job을 반환한다.
  완료 후 명시적 재요청은 새 revision이다. disabled/missing-model/queue-full/timeout/
  invalid-output/cancelled/forbidden/storage-failed를 구분하며 원문 오류는 노출하지 않는다.

## 모델·provider 선택과 지원 예산

- 개발 대상은 macOS/Linux C++17, 현 검증 장비는 Apple M5·24GiB다. 로컬 protocol은
  Ollama `/api/chat`, 1차 모델은 `qwen3-vl:8b-instruct-q4_K_M`이다. 4B Instruct Q4는
  낮은 사양의 명시적 대안이며 자동 전환하지 않는다. 30B와 별도 약관 모델은 이번 기준에서 제외한다.
  사용자 승인으로 전용 `models/v450-ollama`에 weight를 준비했다. digest와 실제 품질 결과는
  [개발 실행 결과](../../release-artifacts/v4.5.0/development-results.md)에서 구분한다.
- 최신 사용자 결정: Gemini 전용 구현·설정·UI·저장 검증·성공 테스트를 제거한다.
  미배포 기능이므로 Gemini 호환 reader/migration은 만들지 않는다. 실제 외부 호출은 하지 않았으며
  과거 실행 결과를 소급 변경하지 않는다. Ollama 외 provider 요청은 전송 전에 거부한다.
- 검토 기본 off를 유지한다. 목표 연결 계약은 동일 장비·컨테이너·별도 GPU 서버의 자체 호스팅 Ollama다. 기본 endpoint는
  `http://127.0.0.1:11434`로 유지하고 관리자가 지정한 HTTP/HTTPS 호스트·포트를 지원한다.
  HTTP는 무인증만 허용하며 토큰 동시 설정은 호출 전 오류다. HTTPS는 인증서·호스트명 검증을
  필수로 하고 선택 Bearer token·사내 CA 파일을 지원한다. 인증 실패 뒤 무인증/HTTP fallback은 없다.
  Bearer 검증은 Ollama 앞단의 운영자 인증 프록시 책임이다. 프록시 자동 설치는 범위에 없다.
  토큰은 운영 환경에서 읽어 작업 메모리로만 전달하며 argv·로그·UI·record에 직렬화하지 않는다.
  endpoint는 검토 요청으로 받지 않으며 URL userinfo/query/fragment, redirect와 환경 proxy 우회를 거부한다.
  CA는 해당 연결에만 적용하고 시스템 인증서 저장소를 바꾸거나 검증 생략 옵션을 만들지 않는다.
- 자체 호스팅 배치는 Ollama cloud 기능을 비활성화하는 운영 조건을 따른다. MediaServer가 원격
  서버의 설정·GPU 회수를 관측했다고 주장하지 않는다. 원격 취소는 연결 종료·결과 미게시·소유 자원
  회수를 보장하는 범위로 검증하며 원격 추론 자체의 종료는 실환경 미검증이다.
- 실제 모델 검증은 로컬만 수행한다. loopback HTTP/HTTPS fixture로 CA·호스트명·토큰·오류·취소를
  검사하고 컨테이너·원격 GPU 실환경 성공으로 승격하지 않는다. 새 모델/실서비스 호출은 추가하지 않는다.
  curl은 `/usr/bin/curl`을 사용하며 Linux 전송은 glibc 2.34 이상의 closefrom spawn 기능을
  요구한다. macOS는 CLOEXEC_DEFAULT로 열린 서버 FD 상속을 막는다. 미지원 환경에서는
  검토 연결 실패로 처리하고 보안 조건을 생략하는 대안을 사용하지 않는다. 현재 실행 검증은 macOS다.
- 검증 예산: 제품 서버 RSS 4GiB 이하, 로컬 모델 working set 14GiB 이하, 전용 실행
  작업공간 8GiB 이하(별도 승인한 모델 weight 제외). 모델 실행 후 자원 회수와 녹화·검색
  진행을 관측한다. 기존 녹화 이력 비용을 VLM 비용으로 오인하거나 무기한 지원으로 확대하지 않는다.

## API·화면과 권한

기존 `/ops/events` 증거 상세에 질문·명시 실행·진행/오류·결과·근거 frame 이동을 연결한다.
모델 판단과 기존 운영자 accept/dismiss 기록은 분리한다. primary nav, Client/viewer 화면은 유지한다.

- `POST /ops/api/recordings/va-reviews`: packageId, question, provider만 받으며 202 job 참조를 반환한다.
- `GET /ops/api/recordings/va-reviews?packageId=…`: 보존 결과 목록.
- `GET /ops/api/recordings/va-reviews/<reviewId>`: 검증한 결과와 근거 참조.
- `GET /ops/api/recordings/va-review-jobs/<jobId>`: 작업 상태.
- `DELETE /ops/api/recordings/va-review-jobs/<jobId>`: 명시 취소.

조회는 operator/admin·ops:read·해당 source:read, 실행/취소는 추가 ops:write를 요구한다.
접수·worker 실행/전송·저장·조회 시 현재 계정/채널 권한을 재확인한다. job 취소는 생성자 또는
현재 admin으로 제한한다. auth off는 기존 명시 개발 모드를 따른다. 자산은 기존 증거 asset
API에서 권한을 다시 확인한다. no-store/nosniff와 DOM textContent를 사용한다.

## 검증과 완료 판단

[기능별 정의](../../project-feature-test-inventory.md#v450-va-review)에 실행 전 기대값을 둔다.
단계별 native/격리 HTTP/상태 UI 검증 후 커밋하며 제품 동작 실패를 완료 커밋으로 만들지 않는다.
실제 모델은 합성 영상의 1/2/8-frame·정순/역순·정지/이동·가림·증거 부족 사례를 사용한다.
실행 전 독립 답을 고정하고 schema/근거 index 유효성 100%, 부족 사례의 불확실성 표시 100%,
의미 판정 12사례 중 10개 이상 및 개별 실행 60초 이내를 기준으로 한다. 12사례의 내용은
V450-05 실행 전에 fixture에 등록한다. 이 제한된 평가를 일반 CCTV 정확도로 확대하지 않는다.
Gemini 실제 호출은 범위에서 제외한다. 로컬 합성 transport와 실제 로컬 모델의 결과를 구분한다. 30분/120분/UI 풀테스트는 이 개발 검증과 다르다.

## 공개 자료와 독립 구현

2026-10-05 확인한 공식 문서의 protocol과 모델 metadata를 사용한다. 외부 구현을 복사하거나
VARuleLens 코드·prompt·schema를 사용하지 않는다. 특허 상세를 설계 입력으로 반입하지 않으며
[기존 IP 게이트](../../research/v410-recording-ip-risk-gate.md)를 유지한다.

- [Qwen3-VL 8B model card](https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct): Apache-2.0 표기와 다중 영상 입력 계열.
- [Ollama 모델 태그](https://ollama.com/library/qwen3-vl/tags): 명시 Instruct Q4 태그, 8B 약 6.1GB/4B 약 3.3GB. 실행 시 실제 digest를 확인한다.
- [Ollama chat API](https://docs.ollama.com/api/chat): images와 structured format, stream 제어.
- [Ollama 구조화 출력](https://docs.ollama.com/capabilities/structured-outputs): format schema와 prompt의 구조 설명.
- [llama.cpp grammar 문서](https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md):
  JSON schema subset·anyOf와 properties 조합의 제약. 최종 수용은 서버 strict codec에서 별도로 검사한다.

## 원인 분리 조사와 구조 변경 제안 (36, 미구현)

이번 결론은 제품 변경 승인이 아니다. 원응답 재현·고정 A/B 비교의 세부 관측은
[36 조사 결과](../../release-artifacts/v4.5.0/36-diagnosis.json), 실행 출처/정리는
[개발 기록](../../release-artifacts/v4.5.0/development-results.md)에 둔다.
제품 provider/input/output/record·API·UI는 `b9520c7f3` 그대로다.

### 확정된 구조 문제와 검증 경계

[수신기](../../../src/recording/va_review_provider.cpp)의 원문 순차 소비는 문자열 coverage만
보장한다(98~100, 161~162행). 모델이 원 주장을 다른 의미로 해석하면서 원문을 그대로 복사할
수 있으므로 의미 고정과 다르다. 같은 단일 관측에서 position/ordered-endpoints는 부족으로
거부되고, state/visible-property는 정지를 단정한 반증을 수용한다. 가려진 이동 주장도
visibility/visible-property로 바꾸면 비가시성을 반증으로 사용할 수 있다.
이는 원문·관측이 같은데 모델이 고른 검증 기준 이름에 따라 무근거 확정의 허용 여부가 달라지는 결함이다.

| 실제 검사 | 보장하지 않는 것 |
| --- | --- |
| claim 복사·순차 coverage·ID·범위 | 원 주장의 대상/관계/시점/범위를 올바르게 해석했는지 |
| property/basis enum·관측 수·PTS·모델의 identity 표지 | 그 property/basis가 원문의 요구 관계인지, 동일성이 영상에서 참인지 |
| value의 문자열/길이·가시성/null 결합 | value 내용이 선언한 속성인지; state에 좌표를 넣어도 내용 검사는 없음 |
| summary의 길이·한국어·참조 | 관측에 없는 정지 등 해석을 추가했는지 |
| verdict 허용값과 공개 그룹 연결 | 원래 주장에 대한 올바른 판정인지; 모델 verdict가 그룹을 선택함 |

관측 사용 가능 여부는 110~116행, 충분성 분기는 129~135행이다. visible-property는 사용 가능한
관측 하나면 충분하며, 이를 선택한 모델이 원래 시간 비교를 요구받았는지는 검사하지 않는다.
summary는 139~140행에서 그대로 공개 그룹에 들어간다. native 검사는 선언된 구조의 일관성·
오류 거부를 검사하며 영상 진실이나 자유 한국어의 의미를 증명하지 않는다. 이번 정상 색/가시성
대조도 합성 관측의 수신 구조 검사이며 픽셀 사실 검증은 아니다. 모든 단일 프레임 판정을
거부하면 정상 정적 속성/가시성 반증까지 막으므로 해결책이 아니다.

출력 예산은 별도 결함이다. 부족 claim마다 summary 하나와 gap별 missing이 unclear에 들어간다
(140, 158행). 충분 수 S/C, 부족 수 U, 전체 gap 수 G일 때 현 공개 형식을 유지하려면
`S<=16, C<=16, U+G<=16, G<=16`과 `S+C+U<=16`, JSON 40KiB를 함께 만족해야 한다.
실제 수신기로 충분16은 수용, 부족8/gap1은 unclear16으로 수용, 부족9/gap1은 unclear18로 거부,
혼합 충분7+부족5/gap2는 unclear15로 수용, 충분7+부족6/gap2는 unclear18로 거부를 확인했다.
내부 claim16×gap5 선언의 최대치는 unclear96/questions80이다. 공개 그룹당16과 자동 양립하지
않는다. 이 오류는 최신 단일 claim 오판의 원인이 아니다. 이번에는 상한·문장·설명을 바꾸지 않았다.

### 비교로 좁혀진 원인과 남은 불확실성

34/35는 공통 부족4건만 비교한다. 정상 종료/JSON은 둘 다4/4, 원응답 판정 정답은4/4→1/4,
수신은1/4→3/4, 수신된 잘못된 확정은0→2건, 질문 생성은4건→1건이다.
생성된 질문의 의미는 각각0/4, 0/1이며 필수 부족4 기준은 둘 다0/4다. 수신율 상승은 품질
개선이 아니고 prompt/schema/receiver가 함께 달라졌으므로 한 변경의 단독 효과로 단정하지 않는다.

36은 같은 모델·옵션·원 주장·독립 관측문·시각을 사용한 6쌍/12회, 재시도0이다.
A는 현재 제품의 복합 텍스트 진단 요청, B는 verdict/한국어 reason만 요청한다.
A/B 순서를 교차했고 요청 hash를 먼저 고정했다. 아래는 원응답의 **판정 label** 비교이며
제품 전체 PASS 표가 아니다. 정답/관측 논리/수신/질문은 구조화 결과에서 별도로 검토했다.

| 사례 | A 복합 요청 | B 최소 요청 |
| --- | --- | --- |
| one-motion | 반증 — 오답, 수신됨 | 부족 — 판정·이유 적합 |
| one-direction | 부족 — 판정 적합, 질문 시간 순서 누락 | 부족 — 판정·이유 적합 |
| blank-hidden | 반증 — 오답, 동일성 부족으로 수신 거부 | 부족 — 판정·이유 적합 |
| occluded-final | 반증 — 오답, 수신됨 | 반증 — 오답, 사라짐으로 이동 반박 |
| two-right | 지지 — 판정·좌표 비교 적합 | 지지 — 판정·이유 적합 |
| two-left | 반증 — 판정·비교 적합, basis는 잘못 정적 종류 선택 | 반증 — 판정·이유 적합 |

A label3/6, B label+이유5/6이다. A 질문은 부족4 중1개 생성, 문장의 중립성·새 이미지 요청·
대상/위치 특정은 맞지만 촬영 순서가 없다. missing의 무변화/자료 부재 표현도 불명확하다.
B는 질문을 생성하지 않으므로 질문 요구 충족으로 계산하지 않는다.

one-motion/blank-hidden의 B 개선은 복합 요청 전체가 오류에 기여한다는 근거다.
반면 occluded-final은 최소 B에서도 비가시성을 이동 반증으로 써서 현재 모델·설정·입력의
기본 판단 적합성도 이 사례에서 미충족이다. 수신기 정비만으로 생성 품질을 해결할 수 없다.
A/B 모두 맞은 정상 사례가 기존 결함을 없애지 않으며, two-left의 basis 오선택도 남았다.
특정 enum·decoder·출력 부담 중 무엇이 단독 원인인지, 반복 안정성, 실제 CCTV 정확도는
미확정이다. 작은 고정 텍스트 표본으로 모델 전반을 평가하거나 B를 제품 대체 계약으로 삼지 않는다.

### 권장 책임 분리: 자유질문 해석을 사용자가 확인한 뒤 검토

| 선택지 | 제품이 고정하는 것 / 여전히 모델에 맡기는 것 | 현 요구와의 관계 |
| --- | --- | --- |
| 제한된 검토 유형을 명시 입력 | 사용자 선택 관계·범위 / 관측·문장 | 신뢰 경계는 명확하지만 자유질문 입력 범위를 제한하는 별도 결정 필요 |
| **모델 해석안을 사용자 수정·확인 후 검토 — 권장** | 사용자 확인된 대상·관계·비교 대상·시간/범위 / 해석 초안·관측·질문 표현 | 자유질문을 유지하면서 의미 기준을 최종 판정 모델로부터 분리; API/UI 확인 단계 필요 |
| 자유질문 자동 처리, 미검증 제안으로만 표시 | 원문/참조/실행 출처 / 의미 해석·판정 대부분 | 자동성 유지, 결과 신뢰 수준/공개 표현을 낮추는 결정 필요; 구조적 오통과를 없앤 것은 아님 |

권장 흐름은 원문 → 미확정 해석안 → **사용자 확인된 ClaimSpec** → 관측 → 서버 근거 정책 →
결과/부족 근거 → 모델의 질문 표현이다. ClaimSpec의 대상, 관계/속성, 비교 대상, 적용 시점·
구간·전체/일부 범위는 확인 시 서버가 검증하고 고정한다. 원문의 모든 주장에 대해 사용자가
범위를 확인하며, 미해석/미지원 부분을 조용히 누락하지 않는다. 모델의 property/basis를
신뢰 입력으로 승격하거나 문장부호·단어 목록으로 자유 의미가 해결됐다고 취급하지 않는다.
사용자 확인은 검토 의도를 확정하는 것이며 영상의 사실성을 인증하는 것이 아니다.

관측 모델은 해당 명세에 필요한 typed 값과 프레임·관측 가능성·동일성 근거/불명을 제공한다.
좌표와 정지 해석, visibility와 존재/이동을 구분하고 non-null 문자열을 입증된 사실로 삼지 않는다.
서버가 명세에 맞는 독립 근거 정책으로 판정/부족을 결정한다. 모델이 관측값·동일성 자체를
틀릴 가능성은 남으므로 구조 검사 성공을 영상 진실 보장으로 확대하지 않는다.

| 관계 예시 | 지지 근거 | 반증 근거 | 부족/미지원 경계 |
| --- | --- | --- | --- |
| 지정 시점의 색/가시성 | 그 시점·대상의 관측값이 주장과 일치 | 관측된 다른 색 또는 지정 시점의 비가시성 주장에 맞는 반대 관측 | 관측 불명; 비가시성을 숨겨진 존재/이동의 반증으로 확장 금지 |
| 처음/마지막 상대 위치 | 같은 대상의 두 유효 위치·시간 순서·비교식 성립 | 같은 두 시점의 비교식 불성립(반대 방향/동일 위치 포함) | 끝점/동일성/시점 불명; 단일 좌표로 이동/정지 확정 금지 |
| 모든 샘플에서 속성 성립 | 지정한 모든 샘플의 관측 충족 | 하나의 유효한 속성 반례로 충분; 전체 위치 동일 주장에는 두 위치가 다른 쌍이 반례 | 반례도 없고 일부 관측 누락이면 부족; 모든 반증에 전체 샘플을 요구하지 않음 |
| 가려진 중간 경로/연속 행동 | 해당 구간의 관측 범위가 관계를 입증해야 함 | 그 관계에 대한 실제 반례 필요 | 샘플 끝점만으로 경로는 미지원/부족; 순변위와 연속 경로를 구분 |

부족 근거·질문 대상·속성·필요한 시점/구간은 서버 정책이 정한다. 모델은 정해진 부족을
해결할 자료 요청을 한국어로 표현한다. 잘못된 모델 decisive 때문에 질문이 사라지지 않게 하되
문장 의미 품질은 계속 별도 검증한다. 필요한 호출 분리도 기존 큐·취소·총예산 안에서 검증해야
하며 같은 모델을 다시 부르는 것을 독립 검증으로 삼지 않는다. 코드 고정 질문 템플릿은 별도
선택 사항이고 현 모델 생성 요구를 유지하는 권장안에 자동 포함하지 않는다.

### 호환 영향·최소 변경군·승인 경계

- 입력/API/UI: 원 자유질문을 보존하고 해석안 조회·수정·확인과 confirmed ClaimSpec 참조를
  추가해야 한다. 확인 전 미검증 해석으로 현재 검토 요청을 자동 실행하지 않는다.
- 결과/저장: 어떤 명세·근거 정책·모델 관측에서 나온 결과인지 출처를 결속해야 한다.
  input/record의 버전 구분이 필요하며 기존 v1/과거 실패를 사용자 확인된 결과로 재해석하지 않는다.
  네 표시 그룹의 목적은 유지하되 기존 평면 배열에 설명을 중복 투영하는 예산 충돌은 먼저
  계약으로 해결해야 한다. 필요한 전체 용량은 위 `U+G/G`이며, 표현 한도 초과를 의미 부족으로
  위장하거나 일부 설명/주장을 잘라내지 않는다. 이번 제안은 상한 확대·삭제·병합을 승인하지 않는다.
- 최소 파일군: `va_review_input.*`와 `va_review_application_service.cpp`의 확인 명세/권한,
  `product_ui_page_scripts.cpp`의 확인 흐름, `va_review_provider.*` 및 관계별 근거 정책,
  `va_review_record.*`의 출처/버전·출력 예산과 필요한 service/store 연결이다.
  기존 EvidencePackage·미디어·EventRecord·권한 자체의 의미는 변경 대상이 아니다.
- 집중 회귀: 같은 원문/관측에서 모델 property/basis만 바꿔도 판정 기준이 바뀌지 않음,
  관측에 없는 정지/숨겨진 경로·잘못된 속성값 거부, 정상 단일 프레임, 전체 주장의 부분 반례,
  독립 gap에서 생성되는 중립·구체 질문, 복합 주장 전체 예산/버전·재시작·취소·권한·미확인
  명세 실행 차단이다. fixture 정답을 제품 ClaimSpec 입력에 몰래 넣어 일반 해석 성공으로 보고하지 않는다.

**구현 전에 필요한 사용자 결정 한 가지:** 자유질문 입력은 유지하되, 모델이 제안한 대상·관계·
비교 대상·시간/범위를 사용자가 수정·확인해야 검토를 실행하는 API/UI 흐름으로 변경할 것인가.
이번에는 이 변경을 구현하지 않았다. 추가 제품 수정·모델 비교·평가는 이 조사 뒤 자동 재개하지 않는다.


## 37: 채택된 판정 핵심과 관측 경계 — 공개 연결 전

36 조사는 완료로 닫았다. 사용자는 자유질문 해석을 확인한 뒤 서버가 의도를 고정하는 권장 방향을
채택했다. 이번 1묶음은 제품에서 재사용할 C++ 핵심/관측 추출과 제한 검증이다. 위 36 절은 당시
미구현 제안/증거로 보존하며, API/UI·권한·저장 출처 연결은 별도 2묶음으로 아직 시작하지 않는다.

- ClaimSpec v1/policy v1: 대상 ID·설명, 같은 대상의 비교, 지정 프레임(scope)·명시 시각,
  관계·요구값, 전체 원본 이미지 중심 pixel 기준을 고정한다. 자유문장 해석기는 포함하지 않는다.
- 지원: 한 시점 색(7색 palette)/가시성, 지정 두 시점의 오른쪽·왼쪽·위치 같음/다름,
  지정 전체 샘플의 색/가시성·위치 동일성. 연속 이동/숨겨진 경로는 Unsupported이다.
  끝점 순변위를 정지/연속 이동으로 명명하지 않는다. 임의 state/other/다른 대상 상대좌표는 없다.
- pixel 중심 좌표의 반올림 단위에 근거해 축별1px를 위치 동일 허용 오차로 실행 전에 고정했다.
  오른쪽/왼쪽은 x 차이가1px 초과일 때만 성립한다. 실제 관측 oracle도 원본 중심 ±1px이다.
- frame index/PTS/PNG hash/좌표계·크기·범위·유한성/동일성 anchor를 검사한다. 모델 근거 문장과
  값의 실제 픽셀 일치는 별도 평가다. 불명/다른 대상의 값은 판정 근거로 쓰지 않는다.
  부족은 identity/value/ordered-time을 함께 보존한다. 잘못된 참조·값은 오류이며 insufficient가 아니다.
- 전칭 속성은 유효 반례1개, 전체 위치 동일성은 서로 다른 시각의 유효 위치2개로 반증 가능하다.
  반례가 충분하면 나머지 누락은 판정을 막는 부족이 아니며 입력 관측은 유지한다.
- 관측 추출은 기존 VaReviewCurl의 TLS/인증/응답 상한/취소를 재사용한다. 실제 이미지와 필요한
  대상·관측 필드만 보내며 모델 verdict/basis/질문은 codec 입력이 아니다. API/저장/provider는 불변이다.
- 표현 검사에는 실제 summary/missing/question 문자열 전체를 넘겨 S/C, U+G, G, claim16,
  serialized40KiB를 함께 검사한다. 질문 생성·공개 게시·절단은 없다. 초과는 projection-limit,
  미지원 관계의 현 공개 투영은 projection-unsupported-relation으로 구분한다.

**2묶음 전 표현/버전 결정 한 가지:** 고정 의도·관측·서버 판정의 출처와 미지원/표현 한도 오류를
구분하는 새 결과/저장 버전을 도입하고, 현 네 그룹 투영은 전체 예산을 충족할 때만 허용할 것인가.
이번에는 새 영속 형식이나 공개 오류/API/UI를 구현하지 않았다. 질문은 다음 단계에서도 실제
모델 생성 요구를 유지하며 서버 gap의 대상·속성·시점을 표현하도록 연결해야 한다.

검사 정의는 V450-K05/독립 fixture, 실행 결과는 기존 개발 기록의37에 둔다. 실제8사례의 명세는
명시 입력이며 원 자유질문 해석 성공으로 주장하지 않는다.


## 38: 관측 좌표 후보와 동일성 연결 경계

37의 원본 픽셀 요구 실행/3/8 통과 결과는 그대로 보존한다. 이번 후보는
[Qwen3-VL 공식 grounding](https://github.com/QwenLM/Qwen3-VL/blob/main/cookbooks/2d_grounding.ipynb)의
상대 좌표 표현을 쓰는 모델 adapter 변경이다. core는 계속 image-center-pixels를 받는다.

- 후보 하나: 정수 bbox_2d `[xmin,ymin,xmax,ymax]`, 원점 좌상단·x 오른쪽·y 아래쪽,
  양끝 포함 `[0,1000]`. 1000은 원본 W/H 외곽이며 마지막 픽셀 인덱스가 아니다.
- 순서·범위·유한성·양의 면적을 검사한 후
  `cx=(xmin+xmax)*W/2000`, `cy=(ymin+ymax)*H/2000`으로 중심을 구한다.
  반올림/클램프/축 교환/배율 추정은 없다. 관측 불가 bbox는 null이어야 한다.
  생성 schema와 수신기 모두 같은 정수 단위/범위다. 원 bbox와 변환 중심,
  변환 버전 `qwen3vl-bbox1000-center-v1`을 구분한다. pixel 정책/관측 oracle ±1px는 불변이다.
- PNG IHDR 크기와 manifest를 adapter에서 대조한다. 보존 입력 PNG의 실제 픽셀 디코딩과
  설치된 Ollama 버전 소스/모델 metadata의 확인 범위는 38-input-contract.json에 남긴다.
  응답 숫자로 내부 해상도를 확정하지 않으며 37의 오좌표를 새 단위로 재해석하지 않는다.
- 단일 시점 self-anchor는 대상 설명에 맞는 객체를 찾았다는 뜻이다. 다른 시각에 같은 anchor를
  연결하면 물리적 동일성을 주장하므로 별도 식별/연속 근거가 필요하다. 위치 변화는 different의
  근거가 아니고 일반적인 색·모양 일치도 same을 보장하지 않는다. 불명은 unknown/null로 유지한다.
  합성 생성기의 동일 사각형 정답은 모델에게 제공된 추적 ID가 아니며 metadata도 동일성을 보장하지 않는다.
- V450-K06의 한 후보를 고유6요청/8서버 사례로 제한 확인한다. 모델 옵션·허용 오차는 유지하고
  의미 오류를 이유로 후보를 변경/재호출하지 않는다. 좌표/실제 인식/동일성 실패를 별도 기록한다.

공개 provider/API/UI/record/store와 판정 core는 변경하지 않는다. 2묶음의 표현/저장 버전 결정은
위37 절의 한 항목을 유지하며, 관측 요구 미충족이면 공개 연결을 보류한다. 새 질문 생성·추적기를
이번 범위에 추가하지 않는다.

38 실행 결과와 잔여 관측 차단은 [개발 기록의 38절](../../release-artifacts/v4.5.0/development-results.md)에 둔다.
공식 상대 표현 채택만으로 좌표/물리적 동일성 품질이 충족되지 않았으며 이번 후보의 추가 호출은 종료했다.
