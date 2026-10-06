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


## 39: 관측 출처별 책임과 보존 경계

2026-10-06 사용자 결정으로 38 실험은 **미충족으로 종료**한다. 같은 모델의 bbox/identity
prompt 수정·재평가는 추가하지 않는다. 아래는 후속 연결의 요구/자료 출처 계약이며 새 adapter,
모델 호출, 저장 버전 또는 확인 API/UI 구현이 아니다. ClaimSpec·서버 판정 core·엄격한 오류 거부와
34~38 원문/실패/기대값은 유지한다. 37~38의 실험 조건을 모든 검토의 공통 선행 조건으로 확대하지 않는다.

### 원래 요구와 세 가지 정확성 기준

[원래 v4.5 로드맵](../../v410-v49-recording-search-roadmap.md)은 단일/시간순 복수
프레임, 불확실성, supports/questions/contradictions/unclear와 근거, 권한·보존·실패 격리를 요구한다.
VLM의 모든 좌표를 ±1px로 재추출하거나 두 이미지의 물리적 동일성을 확정하라는 공통 요구는 없다.
sequence 검토를 정적 색상 검사로 축소하지 않으며, 정량 관계에 필요한 자료가 없으면 그 관계를
부족/미지원으로 남긴다. 다른 쉬운 주장의 정답으로 대체하지 않는다.

| 기준 | 직접 출처·적용 대상 | 유지할 경계 |
| --- | --- | --- |
| 좌표 변환의 계산 정확성 | `ConvertReviewRelativeBox`, V450-K06의 고정 bbox→원본 중심 수식과 독립 기대값; 계산 비교 오차 `<1e-9` | 단위·범위·원본 크기가 주어졌을 때 수식 구현의 정확성이다. 영상 속 위치가 맞다는 뜻이 아니다. |
| 영상 관측기의 위치 정확성 | 37 픽셀 oracle 및 38 고정 관측 fixture의 축별 ±1px | 해당 합성 정밀 관측 실험의 합격선이다. FAIL을 보존하고 완화/재해석하지 않는다. 원래 모든 sequence review의 공통 gate로 승격하지 않는다. |
| 서버 관계 판정의 허용 오차 | `kReviewPositionTolerancePixels=1.0`, ClaimSpec policy v1의 image-center-pixels | 이미 주어진 위치에서 같음/다름·좌우를 결정하는 관계 정의다. 관측 모델의 허용 오차나 사실 정확성을 보장하지 않는다. core 정책은 변경하지 않는다. |

### 출처와 보장 범위

| 출처 | 사용할 수 있는 판단 | 보장하지 못하는 판단 |
| --- | --- | --- |
| A: 검토 대상 VA 엔진 출력 | 정확히 결속된 기록의 bbox·분석 track을 기준으로 한 관계 계산/내부 일관성 | VA가 실제 영상에서 객체를 올바르게 찾았다는 독립 승인, 물리적 동일성의 참, 미관측 구간의 움직임 |
| B: 별도로 검증된 관측/사용자 정답지 | 검증 방법·annotator/도구·범위·sample·좌표/동일성 근거가 명시된 범위의 독립 대조 | 출처 표시만으로 전 영상의 정답 보장. 검토 의도를 확인한 사용자가 사실/동일성까지 인증했다는 추정 |
| C: VLM의 이미지 관측 | 제공한 실제 프레임에서 확인 가능한 시각적 의미의 검토 후보와 그 근거 | 형식 적합성만으로 정확성 보장, A와의 동의만으로 A 승인, 근거 없는 좌표/물리적 동일성 확정 |

37~38 fixture 생성기가 준 명세·좌표·동일 대상 정답은 검사 oracle다. 제품의 A 관측으로 연결하거나
VLM의 시각적 동일성 성공으로 계산하지 않는다. hash는 바이트/참조 무결성이지 사실 정확성의 증명은 아니다.

### 확인한 한 경로와 부재 경계

확인 범위는 현재 source의 `AnalysisObservationProjector → ReferencedObservationV1/RecordingCatalog
→ RecordingSearchReader/SearchDocument → EvidencePackageBuilder → 보존 PNG` 경로와 38 합성 입력이다.
운영 패키지·고객 영상/DB를 열람한 실행 검증이 아니며, 전체 저장 구조의 감사로 확대하지 않는다.

- **별도 카탈로그에 A를 보존하는 구현은 있다.** [projector](../../../src/recording/analysis_observation_projector.cpp)의
  `FromTrack/SubmitResult`는 track bbox·분류·분석 PTS·namespace/track과 원본 연관을 생성한다.
  [ReferencedObservationV1](../../../include/recording/recording_contracts.h)은 관측과 consumer reference를 함께 담는다.
  `PutReferencedObservation`은 이를 journal에 기록하며 같은 ID의 bbox/원본 연관 변경을 거부한다.
  [catalog](../../../src/recording/recording_catalog.cpp)의 `QueryReferencedObservations`는 channel의 저장 행을 반환한다.
  원본 미디어 삭제와 이 관측 행의 보존은 구분해야 하며, package 보존만으로 카탈로그 수명까지 보장하지 않는다.
- **정확한 연관 키는 있으나 모든 선택 프레임에 관측이 있다는 뜻은 아니다.** reference의
  channel/source, analysis namespace/track/PTS와 `original`의 source_generation/generation_order,
  media track/ordinal/PTS, association_quality를 사용할 수 있다. [search reader](../../../src/recording/recording_search_reader.cpp)는
  timestamp-match·단일 해석을 요구하고 ambiguous/unresolved를 구분한다. projector는 시작/종료/event/
  주기 관측을 선택 저장하므로, builder가 미디어 sample에서 균등 선택한 최대8프레임과 일대일이지 않다.
- **패키지에는 프레임별 분석 관측 사본이 없다.** [package 계약](../../../include/recording/evidence_package.h)의
  observation_id/analysis_namespace/track_id와 references는 검색 결과의 참조다.
  [builder](../../../src/recording/evidence_package_builder.cpp)는 observation/track을 `referenced`로 남기며
  PNG/clip만 payload로 복사한다. `SearchDocument`에도 bbox가 없다. package asset의 허용 형식은
  image/png·video/mp4이며, ID가 존재해도 bbox·per-frame observation/reference 사본이 보존됐다고 말하지 않는다.
- **두 track의 의미는 다르다.** package.track_id는 analysis namespace 안의 분석 대상 ID다.
  [EvidenceFrameV1](../../../include/recording/evidence_frame_extractor.h)의 track_id는 원본 미디어 stream의 track이다.
  source_generation/generation_order는 미디어 수명이고 analysis namespace는 분석 tap/reset 수명이다.
  현재 [manager](../../../src/analysis/analysis_manager.cpp)는 tap별 namespace와 PTS rollback 세대를 구분하며,
  tracker reset은 track 번호를 다시 사용한다. 숫자/문자열 track 일치만으로 namespace를 넘겨 연결하지 않는다.
  같은 분석 track도 엔진이 주장한 연결일 뿐 독립적인 물리적 동일성 증명이 아니다.
- **좌표 환산에는 producer의 의미가 필요하다.** 현재 [YOLO mapping](../../../src/analysis/yolo_onnx_detector.cpp)은
  letterbox padding/scale을 역변환해 분석 입력 전체 프레임의 정규화 xywh를 만들고,
  [tracker](../../../src/analysis/object_tracker.cpp)는 box를 smoothing/Kalman 처리할 수 있다. projector가 저장하는 것은
  `track.detection.box`이며 raw detector bbox와 같은 자료로 간주하지 않는다. 기존 관측 envelope에는 이 값의
  좌표 정책/변환 버전, 분석 입력 크기·crop/resize→원본 관계, detector/tracker 설정 출처가 함께 고정되지 않는다.
  현재 코드의 계산 경로는 확인했지만 모든 과거 bbox를 선택 PNG의 원본 좌표로 환산할 근거가 보존됐다고 주장하지 않는다.
- **원본 삭제 후:** package의 검증된 PNG와 미디어 sample 계보는 다시 읽을 수 있다. 별도 카탈로그가
  유지하면 저장된 A 행을 조회할 수 있지만 package가 그 행/정확한 결합/변환 근거를 스냅샷으로 보존하지는 않는다.
  누락 관측과 애매한 sample/다른 namespace/재사용 track은 별도 사유여야 하며 latest/nearest로 메우지 않는다.
  38의 `CoreImageInput/Manifest`는 합성 PNG·가상 미디어 식별자만 만들고 A 관측/분석 namespace/대상 track을
  생성하지 않았다. 여기서 frame.track_id를 분석 객체로 쓰거나 fixture 좌표를 A로 바꾸는 연결은 허용하지 않는다.

따라서 **A의 저장 계약은 있으나 이번 선택 입력에서 재사용할 수 있는 완결된 보존 관측 연결은 없다.**
새 adapter/오프라인 좌우 판정 연결 검사는 만들거나 실행하지 않는다. 이는 A 자료가 저장소 어디에도
없다는 결론이 아니라, 현재 불변 package 입력만으로 해당 관측을 재현할 수 없다는 경계다.

### 필요한 최소 보존 변경안과 다음 공개 연결 조건

향후 A를 채택할 때 필요한 범위는 기존 관측/reference의 **선택 sample별 사본과 출처 결속**이다.
새 일반 저장소나 전체 프레임 재분석을 먼저 도입하지 않는다. 다음 정보의 실제 보존을 승인한 뒤 연결한다.

1. 분석 결과를 받는 시점에 bbox의 의미(raw detector/가공된 track), 좌표 기준·변환 정책 버전,
   분석 입력과 원본 전체 프레임의 크기/변환 관계를 관측/reference와 함께 고정한다. 전체 프레임 정규화가
   입증되면 `(x+w/2)*W, (y+h/2)*H`가 가능하나, crop/resize 근거가 없으면 원본 좌표로 추정하지 않는다.
2. 패키지 프레임 선택·원자 게시 시점에 exact sample과 일치하는 관측/reference를 필요한 개수만 보존한다.
   기존 channel/source/store/media epoch·generation/order/media track/sample ordinal/PTS·PNG hash와
   analysis namespace/track/관측 ID를 결속한다. 카탈로그 revision/불변 digest와 함께 검증하고,
   관측 없음·원본/참조 삭제·애매한 연결·다른 namespace/재사용 track은 명시 상태로 남긴다.
   해당 sample에 관측이 없으면 새 detector 호출/nearest/fixture 정답으로 채우지 않는다.
3. A/B/C 출처와 검증 수준, 동일성 근거의 종류(엔진 track/독립 정답/시각적 불명)를 보존한다.
   B의 명시 동일성은 그 범위의 서버 검증 입력이며 VLM 성공이 아니다. image-only에서 동일성 근거가 없으면
   unknown을 유지한다. 정상 좌우 대조는 명시적으로 같은 대상이 주어진 판정기 대조와 시각적 동일성 평가를 분리한다.
4. 공개 연결 전 사용할 출처·지원 관계/미지원 범위를 확정하고, **분석 기록 내부 일관성**과
   **독립 영상 검증**을 결과 표현에서 구분한다. 이 결속을 담는 최소 evidence/input/result/record 변경 필요성과
   37의 전체 출력 예산/버전 결정을 함께 정한다. 기존 package/output/record v1을 조용히 다른 의미로 해석하지 않는다.

VLM에는 실제 프레임의 시각적 의미와 서버가 확정한 부족 근거의 한국어 표현을 맡기는 방향을 유지한다.
시간순서/구간·근거 프레임과 불확실성, 실제 생성 질문의 품질은 별도 검증 대상이며 아직 PASS가 아니다.
정량 좌표와 시점 간 동일성은 필요한 관계에만 요구하고, 관측에 없는 정지/숨겨진 이동을 보완 추론하지 않는다.
사용자의 ClaimSpec 확인은 검토 의도의 확인이며 영상 사실이나 객체 동일성의 인증이 아니다.
2묶음의 새 결과/저장 버전·확인 API/UI, 추가 모델 평가·새 관측기는 이번에 시작하지 않는다.

## 40: 선택적 분석 관측의 출처 보존·재현 경로

39절은 당시 조사/보류 기록으로 유지한다. 2026-10-06 새 실행 승인으로 아래 내부 경로를 구현한다.
공개 확인 API/UI·VA Review 결과/record·provider 교체, 모델 호출·추론 품질 평가는 포함하지 않는다.

- 지원 producer는 `RawVideoDecoder`의 **decoder→videoconvert 전체 프레임**과 YOLO ONNX의
  stretch/letterbox 전처리, 기존 tracker 출력이다. decoder가 무 crop/scale 전체 프레임임을 표시하고,
  YOLO `Analyze`가 실제 `YoloPreprocessInfo`의 frame/input/resized 크기·scale·padding을 전달한다.
  [좌표 값 계약](../../../include/domain/observation_coordinates.h)은 원점 좌상단, 오른쪽/아래 양수,
  전체 디코딩 프레임 정규화 xywh와 `yolo-inverse-scale-pad-clamp-v1`을 명시한다.
  저장 값은 raw detector가 아닌 `processed-track`이다. bbox/추적 계산·표본 저장 주기는 바꾸지 않는다.
  crop·다른 producer·과거 자료에 출처를 만들지 않으며 설정 digest도 발명하지 않는다.
- `AnalysisObservationProjector::SubmitResult → RecordingCatalog::PutReferencedObservation`은 좌표 출처가
  있을 때만 **analysis-observation.v3 / referenced-observation.v2**로 저장한다. v3는 기존 summary
  `first_seen_pts` 병합과 별도로 producer의 `engine_first_seen_pts`를 보존한다. track 번호 재사용을
  동일 episode로 연결하지 않기 위해서다. 같은 관측 ID의 bbox/연관/출처/episode 변경은 거부한다.
  기존 observation.v2 / referenced-observation.v1의 바이트·조회·ID는 유지하고 migration하지 않는다.
- [builder](../../../src/recording/evidence_package_builder.cpp)의 명시적 내부 `CreateWithObservations`만
  **evidence-package.v2**를 만든다. 기존 `Create`는 계속 v1이다. 균등 최대8개 sample·PNG·미디어 계보는
  동일하며, v2 manifest에 source ID와 프레임별 PNG hash/index·관측/reference/좌표 출처 사본을 포함한다.
  channel/source/store/media epoch와 generation/order/media track/ordinal/PTS를 결속하며 analysis track은
  별개다. timestamp-match와 유일한 exact 결속만 `matched`; 없음은 `missing`, 애매/연관/좌표 미확인과
  episode 재사용은 이유를 가진 `unverified`다. 잘못된 참조/상태/버전·hash 변조는 오류다.
  부재를 비가시성으로 해석하거나 nearest/latest로 채우지 않으며 정상 부재로 PNG 패키지를 실패시키지 않는다.
- capture는 현재 catalog lock 아래 같은 namespace/track의 사본과 revision을 얻는다. 조회 작업은 최대65,536행,
  후보 사본은 최대256개/256KiB, 보존은 sample당4개/총32개·관측 사본 총64KiB 이내다. 초과는 명시적 오류이며
  절단/부분 복사하지 않는다. v2 배열 wire 입력도72KiB, 기존 manifest1MiB·package/store quota를 유지한다.
  decode/게시 중 revision 변경은 거부하고, **최종 linkat만 revision lock 안에서 실행**하여 확인/게시 경쟁을 막는다.
  다른 catalog 변경도 보수적으로 중단할 수 있으며 자동 재시도하지 않는다. 기존 fsync/hash/취소/실패 정리를 재사용한다.
- [reader/adapter](../../../src/recording/evidence_observation.cpp)의 `ReadAnalysisRecordReview`는 검증된 package만
  읽는다. catalog·원본·최신 설정 인자가 없다. 이미 역변환된 정규화 bbox의 중심을
  `(x+w/2)*원본너비, (y+h/2)*원본높이`로 계산하며 다시 letterbox 역변환/round/clamp하지 않는다.
  같은 namespace/track/producer episode와 source generation이 확인된 기록만 engine-track anchor로 연결한다.
  반환 `AnalysisRecordReview`에 A/analysis-record-consistency/engine-track 및 원 관측 snapshot과 core 결과가
  함께 남는다. 호출자가 준 한 대상의 ClaimSpec을 해당 분석 track에 명시적으로 적용하며 자연어 해석은 하지 않는다.
  이는 **분석 기록상의 관계·내부 일관성**이며 독립 영상 검증·물리적 동일성 인증이 아니다. color를 발명하지 않고
  missing/unverified는 unknown으로 전달한다. 연속 이동은 core의 기존 미지원, 단일 시점은 기존 부족 규칙을 유지한다.
- 공개 evidence 조회/list/asset과 기존 VA 입력은 v1 경계를 유지해 내부 v2를 자동 공개하지 않는다.
  core의 판정 규칙·1px 정책·모델 verdict/basis 비수용은 불변이다. B/C로 fallback하지 않는다.

직접 검사는 [V450-K07](../../project-feature-test-inventory.md)의 모의 AnalysisResult와 격리 미디어를
실제 projector/catalog/package/reader/core에 통과시킨다. 새 프로세스의 catalog 복구 후 테스트 소유
원본/catalog 디렉터리를 제거하고 또 다른 프로세스에서 package만 재조회한다. 독립 기대 중심은
(40,45)/(120,45), 우측 지지/좌측 반증이다. 실제 detector 추론·VLM·운영 DB/영상 검사가 아니다.
실행 결과는 [개발 기록](../../release-artifacts/v4.5.0/development-results.md)의 40 항목에만 집계한다.

다음 공개 연결에는 **A 기록 일관성과 B/C 독립 영상 검증을 구분할 최소 input/result/record 표현 버전**을
먼저 확정해야 한다. 이 결정에는 지원 관계·부족/미지원 표현과 기존 전체 출력 예산이 포함된다.
사용자 의도 확인을 사실 인증으로 쓰지 않는다. 새 확인 API/UI·VA 결과/record 전환과 추가 모델 평가는 시작하지 않는다.


## 41: 출처가 결속된 내부 검토 결과와 저장 v2

40의 완료 경로를 유지하고 `CreateAnalysisReviewRecord` → package v2 검증 →
`ReadAnalysisRecordReview` → 기존 core → `VaReviewStore::PublishV2`를 연결한다.
공개 provider/요청/UI는 v1을 유지한다. 별도 새 저장 엔진이나 과거 record migration은 없다.

- `media-server.va-review-record.v2` / `media-server.va-review-output.v2`, container `MSVAR02`다.
  기존 `MSVAR01`/v1 codec·hash는 유지하며 같은 lock/pending/fsync/link 게시·quota를 공유한다.
  복구는 양 버전을 검증하고 기존 `List`/`Read`에는 v2를 노출하지 않는다. 내부 조회는 명시 `ReadV2`다.
- 명세의 target, 관계, 요구값, scope, spec/policy v1을 보존한다. target binding은 package ID와
  canonical manifest SHA256, 실제 analysis namespace/track, 후보에서 보존한 engine episode 집합을
  모두 비교한다. `internal-explicit`/`not-confirmed`이며 확인자·시각을 발명하지 않는다.
- claim의 scope/decision evidence/gap frame index → sample 사본 → 원 관측/좌표 출처를 추적한다.
  sample 사본은 channel/source/store/media epoch, generation/order, **미디어** track/ordinal/PTS,
  크기/media/sample/PNG hash다. 원 관측과 원본 sample 연관·좌표/변환은 bounded candidate 사본에 남긴다.
  analysis track과 media track의 이름이 같을 필요가 없다. `/001` 같은 원본 track 표현을 보존한다.
- 결과에는 claim별 `supported/contradicted/insufficient/unsupported`와 구조화 gap만 저장한다.
  A / `analysis-record-consistency` / `engine-track`만 수용한다. B/C label 전환·독립 물리 동일성 인증·
  모델 confidence는 없다. 이는 **분석 기록상의 관계**이며 영상 사실 검증이 아니다.
- spec(binding 포함)·관측 사본·고정 정책 descriptor에 각각 SHA256을 결속하고 record 전체는 파일 ID hash로
  보호한다. read codec은 **보존 입력과 정책 v1만** core에 재생해 저장된 판정과 동일한지 검증한다.
  기존 A adapter의 pure snapshot 부분을 재사용한다. 최신 package/catalog/config로 결과를 바꾸지 않는다.
  hash는 저장 무결성이지 VA 출력의 사실 정확성 인증이 아니다.
- record만으로 관측/출처와 core 입력·판정을 재현한다. 원 PNG·assets·나머지 package manifest는 복제하지
  않고 불변 package ID/manifest hash로 참조한다. `CheckAnalysisReviewEvidence`는 현재 열람 가능 상태를
  별도 검사한다. exact package 부재는 `unavailable`, 저장소 접근 실패·변조·digest 불일치는 오류이며
  저장 판정을 수정하거나 최신 자료로 대체하지 않는다.
- `explanationState/questionsState=not-generated`, `textOrigin=none`, `modelQuality=not-evaluated`다.
  이 버전에서 임의 생성/확인/PASS 상태를 받아들이지 않는다. 한국어 모델 질문 생성 요구는 후속에 남는다.
- v2는 최대16 claims/8 sample, sample당4 candidates, 관측 원문 총64KiB, 전체 record128KiB다.
  ID·본문·좌표·참조 제한은 기존 codec/core를 적용하고 미디어 track은 기존 package와 같은1024byte다.
  store의 record512개/총64MiB/128KiB 기본값은 확대하지 않는다. 개별 한도와 전체 직렬화 한도를 모두 검사한다.
- `ProjectAnalysisReviewDisplay`는 표현을 영속 중복하지 않는 구형 네 그룹 **표시용** 변환이다.
  `server-template` 문구임을 명시하고 questions 미생성·모델 미검증 상태를 유지한다. 전체 U+G/G, claim 수,
  문자열512byte, 출력40KiB와 그룹별16개 한도를 기존 budget 검사로 검증한다.
  전부 담기면 `available-display-only`, 한도 초과는 `unavailable-limit`, unsupported 관계는
  `unavailable-unsupported`다. 일부 claim/gap 삭제·병합·절단이나 insufficient로의 재분류는 하지 않는다.

직접 검사는 [V450-K08](../../project-feature-test-inventory.md)의 실제 projector/candidate package·record 경로와
별도 프로세스 readback, v1 저장 회귀·core 회귀에 한정한다. fixture 좌표/명세는 명시 시험 입력이며
검출기 추론·자유질문 해석·영상 사실·모델 질문 생성 성공으로 해석하지 않는다. 34~40 이력과 실패는 유지한다.
다음 공개 연결에는 사용자 확인 상태/권한·API/UI 연결, 실제 설명·한국어 질문 생성과 품질 검증이 남는다.
이번 내부 v2를 자동 공개하거나 VLM/VA Review 전체·릴리즈 완료로 확대하지 않는다.

## 42: 사용자 확인 기반 A 기록 검토 API/UI

40·41의 내부 경로를 유지하고 `/ops/events` 증거 상세에서 **A 기록 검토**를 명시 선택한다.
원문은 보존하고 관계·요구값·프레임을 사용자가 지정한다. 자유질문 자동 해석, 모델 영상 의미 검토,
한국어 모델 질문 생성은 여전히 미완료다. 기존 모델 provider 요청을 A 계산으로 바꾸지 않는다.

- `GET /ops/api/recordings/a-record-packages?channelId=…[&after=…]`와 `/{id}`·`/{id}/assets/{index}`는
  권한 있는 v2 package만 선택/열람한다. 검색의 분석 관측 결과에서 `POST search/a-record-evidence`로
  기존 snapshot/hit → 기존 builder의 v2 경로를 호출한다. 분석 대상 없는 녹화 결과는 거부한다.
  기존 evidence list/get, 모델 v1 결과, 내부 not-confirmed v2의 비노출 의미는 유지한다.
- `POST a-record-reviews/drafts`의 입력은 packageId/targetKey/원문 question/claims뿐이다.
  targetKey는 서버가 package 분석 대상에서 만든 선택 값이다. relation/요구값/frame index 외의
  verdict·basis·관측·정책·확인자·digest 입력을 받지 않는다. 실제 manifest/namespace/track/episode와
  canonical ClaimSpec을 서버가 결속하며 확인 화면에 관계·시점·대상과 A의 한계를 표시한다.
- `POST …/drafts/{id}/confirm` → `POST …/drafts/{id}/execute`는 서버 revision을 요구한다.
  인증 principal과 서버 확인시각을 저장한다. 같은 principal의 새 명세는 이전 미실행 확인을 무효화한다.
  초안은 최대64개, 보수적으로 계산한 입력/binding 예산256KiB, 최대5분이며 FD·retention hold를 유지하지
  않는다. worker는 명시 실행 때만 기존 큐에 작업을 접수한다. 변경 revision/다른 principal/만료는 거부한다.
  접수·실행·게시에서 현재 role/scope/session을 다시 검사한다. 같은 확인은 같은 job이며 만료된 job을
  재실행하지 않는다. 재시작은 임시 확인/job을 복원하지 않고 저장 결과만 보존한다.
- 새 `media-server.va-review-record.v3` / `MSVAR03`는 변경하지 않은 v2 분석 사본과 별도의
  `intentOrigin=user-confirmed` 확인 envelope를 결속한다. envelope의 principal/question/revision/
  specSha256/확인·만료시각에 digest를 적용한다. 중첩 v2의 internal-explicit/not-confirmed는 분석 입력의
  기존 의미이고, 실제 사용자 확인은 **새 v3 envelope**에만 있다. 과거 v1/v2를 변환하지 않는다.
  총128KiB·512 records·64MiB 및 기존 lock/pending/fsync/hash/quota를 공유한다.
- `GET a-record-reviews?packageId=…`, `/{reviewId}`, `/jobs/{jobId}`와 `DELETE /jobs/{jobId}`가
  명시 확인된 결과·진행·취소 경로다. 저장된 명세·대상·판정·gap은 전체 표시하며 구형 투영 불가도 숨기지
  않는다. package가 없어도 저장 결과를 조회하고 근거의 현재 unavailable/무결성 오류를 따로 표시한다.
  판정은 **분석 기록상의 관계**이며 engine-track 연결은 물리 동일성 인증이 아니다.
- 표시 문구는 “추가로 필요한 자료 — 서버 규칙”이다. questionsState=not-generated와
  modelQuality=not-evaluated를 유지한다. 선택/명세가 바뀐 뒤 늦은 응답은 무시하고 PNG는 순차 열람한다.
  no-store/권한/입력 escaping과 기존 활성화 off 정책을 유지한다. 새 primary navigation은 없다.

[V450-K09/A02/U02](../../project-feature-test-inventory.md)의 모의 VA·실제 저장/HTTP/변경 브라우저 검사가
대상이다. 모델 호출·설치·품질 재평가는0회이며 UI 풀테스트·장시간·릴리즈 검증의 대체가 아니다.
명령별 결과와 최초 실패는 [개발 기록](../../release-artifacts/v4.5.0/development-results.md)에 연결한다.

## 43: 확정 gap의 한국어 자료 요청 표현 (내부 전용)

40~42의 A API/UI와 v1/v2/v3 저장은 유지한다. `BuildConfirmedReviewQuestionInput`은 기존 v3 확인·
A 사본을 검증하고 실제 core 결과와 대조한 뒤 `BuildReviewQuestionInput`으로 질문 슬롯을 구성한다.
명시 core fixture helper는 사용자 확인이나 독립 관측 인증을 주장하지 않는다. 새 record/version,
질문 영속 저장·공개 연결·모델 관측/원 주장 해석은 없다. 기존 A 경로는 계속 모델 없이 동작한다.

- insufficient의 유효 gap만 질문 슬롯으로 만든다. 동일 대상/종류/범위/시각 gap은 claim 간 공유하고
  슬롯에 claim 참조를 보존한다. 최대16슬롯이며 초과를 오류로 반환하고 절단하지 않는다.
  supported/contradicted/unsupported 또는 빈 슬롯에는 모델을 호출하지 않는다.
- 명세·판정·gap·필요 시점·알려진 자료와 출처가 입력이다. v3 helper는 snapshot의 missing/unverified를
  사용하고 reader의 빈 placeholder를 실제 관측 기록이라고 표시하지 않는다. 확인자/credential/PNG를
  모델로 보내지 않는다. 원문과 대상 설명은 JSON 데이터이며 도구 실행 기능이 없다.
- 출력은 서버 key→한국어 문장만 허용한다. 추가/중복/누락/다른 key, verdict/관측/gap 필드, 부분 JSON,
  정상 stop이 아닌 종료를 거부한다. 문자열170 code point 및512byte, 전체8192byte, 입력 context32KiB/
  전체 요청40KiB 상한을 함께 적용한다. schema/형식 적합성은 의미 품질 PASS가 아니다.
- `GenerateReviewQuestions`는 기존 transport의 endpoint/TLS/인증/취소/시간 경계를 재사용한다.
  모델 digest를 호출 전후 확인하며 재시도·fallback·서버 템플릿 대체가 없다. 결과는 별도 메모리 반환이며
  성공/실패가 기존 spec/decision/gap/record를 바꾸지 않는다. `generated-format-valid`도 품질 PASS가 아니다.
- [V450-K10](../../project-feature-test-inventory.md)의 여섯 입력과 필수 의미/금지 전제를 실제 호출 전에
  고정한다. 새 대상·시점 조합 대조군2개를 포함한다. 실제 Qwen 모델/양자화/digest/Ollama/옵션은38과
  대조하며 최대6회·재시도0·60초/800초·기존 자원/5초 unload 조건을 유지한다. 영상은 입력하지 않는다.
  구현자의 직접 의미 검토이며 독립 심판 모델은 없다. 실행·품질·정리 결과는 기존 개발 기록의43에 연결한다.

공개 연결은 이번 비범위다. 일반 한국어 질문 정확도·자유질문 해석·영상 의미 검토·VA Review 전체 품질은
별도 미완료로 유지하며, 실패 결과를 보고 prompt를 바꿔 다음 실험을 자동 시작하지 않는다.
