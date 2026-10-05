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
- 외부 adapter는 Gemini `generateContent`의 다중 inline PNG와 JSON schema 출력으로 설계한다.
  model은 운영자가 명시하며 계정에서의 가용성·정책·비용 확인 없이 호출하지 않는다.
  기존 문서의 모델 이름을 최신 계정 가용성으로 추정하지 않는다.
- VLM은 기본 off다. 로컬 endpoint는 숫자 loopback HTTP만, 외부는 승인한 Google HTTPS
  host만 허용한다. redirect/proxy/사용자 URL을 통한 우회와 로컬 실패 후 외부 fallback은 금지한다.
  외부 opt-in, 전송 검토 확인, model과 일시적인 env credential을 모두 요구한다.
  key는 argv·파일·UI·오류에 넣지 않는다. 현재 사용 중인 curl 실행 도구를 활용하며 신규 라이브러리는 추가하지 않는다.
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
외부 전송은 프로젝트 합성 fixture만 대상으로 하고 사용자 영상은 보내지 않는다.
외부 실호출 미실행과 adapter/오류 fixture 통과는 분리한다. 30분/120분/UI 풀테스트는 이 개발 검증과 다르다.

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
- [Gemini 이미지 입력](https://ai.google.dev/gemini-api/docs/image-understanding),
  [구조화 출력](https://ai.google.dev/gemini-api/docs/structured-output): inline image와 JSON schema 계약.
- [Gemini API 약관](https://ai.google.dev/gemini-api/terms): 계정별 적용·데이터 처리 검토가 실제 외부 사용의 선행 조건이며 이 문서는 수락을 대신하지 않는다.
