# v4.3.0 SigLIP2 로컬 임베딩 준비

이 문서는 승인된 모델·의존성 선택과 재현 계약을 기록한다. 실제 준비 결과는 Git 제외 경로
`models/v430-siglip2/preparation.json`에 한 번만 보존한다. 준비·encoder parity는 제품 검색,
한국어 검색 품질, UI 풀테스트 또는 30/120분 검증의 완료 증거를 대신하지 않는다.

## 선택과 출처

선택 모델은 [Google SigLIP2 Base patch16 224](https://huggingface.co/google/siglip2-base-patch16-224)이다.
공급자가 image-text retrieval을 사용 목적으로 명시한 다국어 이미지·텍스트 encoder이며,
고정 revision은 `75de2d55ec2d0b4efc50b3e9ad70dba96a7b2fa2`이다.
모든 upstream 파일은 이 revision의 `resolve` URL로 받는다. 모델 원본·ONNX·tokenizer는
저장소에 commit하지 않고, 런타임 추론은 로컬 ONNX Runtime CPU로 수행한다.

- 가중치 `model.safetensors` 공급자 SHA256:
  `612923381c76ec5a9bed335d1c48827e3f2e506ac31b044b63b2031fadee6a0b`.
- `tokenizer.model` 공급자 SHA256:
  `61a7b147390c64585d6c3543dd6fc636906c9af3865a5548f27f31aee1d4c8e2`.
- 모델 원본의 실제 크기: 1,500,800,904 bytes. tokenizer·설정·README의 실제 SHA256와
  변환된 ONNX hash는 준비 결과에서 확인한다. Xet pointer hash를 원본 SHA256으로 대체하지 않는다.

[Google 모델 카드](https://huggingface.co/google/siglip2-base-patch16-224/raw/main/README.md)의
checkpoint 배포 license 표시는 Apache-2.0이다. tokenizer는 같은 Google checkpoint에 포함된
Gemma tokenizer 계보이며, 별도 Gemma language-model 가중치를 혼합하지 않는다.
[Google 구현](https://github.com/google-research/big_vision/blob/main/big_vision/configs/proj/image_text/README_siglip2.md)의
소프트웨어는 Apache-2.0, 문서 등 다른 자료는 CC-BY-4.0으로 표시된다.
실제 export에 사용한 [Transformers 코드](https://github.com/huggingface/transformers/blob/v4.49.0/LICENSE)와
[SentencePiece C++ 코드](https://github.com/google/sentencepiece/blob/v0.2.0/LICENSE)는 Apache-2.0이다.
ONNX Runtime은 기존 [의존성 고지](../../THIRD_PARTY_NOTICES.md)의 MIT 항목을 따른다.
재배포물에 해당 license·copyright와 원본 notice를 포함하고, 변환 사실과 공급자 provenance를 유지한다.

원본 OpenAI CLIP는 [공식 model card](https://github.com/openai/CLIP/blob/main/model-card.md)의
영어 사용 권고와 surveillance out-of-scope 설명 때문에 선택하지 않았다.
한국어 `ko`를 명시한
[multilingual CLIP 대안](https://huggingface.co/sentence-transformers/clip-ViT-B-32-multilingual-v1)은
별도 CLIP image checkpoint와 text mean pooling·Dense projection을 묶어야 하는 추가 계약이 있다.
SigLIP2도 일반 scene retrieval 모델이며 얼굴·신원 임베딩 용도로 선택하지 않았다.

## 고정 입력·출력 계약

이미지: RGB, 224×224 직접 resize, PIL bilinear(`resample=2`), `x/255`, 채널별
`(x-0.5)/0.5`, FP32 NCHW `[1,3,224,224]`. YOLO letterbox 계약을 적용하지 않는다.
[공급자 설정](https://huggingface.co/google/siglip2-base-patch16-224/blob/main/preprocessor_config.json)이 기준이다.

텍스트: Unicode lowercase 후 해당 `tokenizer.model`의 SentencePiece, BOS 없음,
EOS ID 1을 포함한 총 64 tokens, 오른쪽 PAD ID 0, 긴 입력은 content 63 tokens 뒤 EOS.
검증용 C++ helper는 기존 GLib의 `g_utf8_validate`/`g_utf8_strdown` 후 `SentencePieceProcessor::Encode`를 호출한다.
원본 tokenizer normalizer spec은 `identity`, `add_dummy_prefix=false`,
`remove_extra_whitespaces=false`, `escape_whitespaces=true`, precompiled charsmap 없음이다.
별도 NFKC나 공백 축약을 추가하지 않는다. 한글·영어와 Unicode lowercase 경계를 공급자 토큰과 대조한다.
대화 template나 classification prompt를 retrieval 질의에 자동 적용하지 않는다.
`tokenizer_config.json`의 거대한 `model_max_length` 대신 64를 명시한다.
[공식 설명](https://huggingface.co/docs/transformers/model_doc/siglip2)의 lowercase·64-token 계약을 따른다.
한국어 문자열을 처리하는 다국어 후보이며 한국어 제품 검색 품질은 별도 fixture 검증이 필요하다.

각 encoder는 공급자의 최종 `get_image_features`/`get_text_features`를 FP32 `[1,768]`로 출력한다.
image input 이름은 `pixel_values`, text input은 INT64 `[1,64]`의 `input_ids`, output은 `embedding`이다.
ONNX opset은 17이다. 출력에 L2 정규화를 적용한 cosine을 exact top-k 점수로 사용한다.
가중치·tokenizer·전처리·export hash·정규화가 바뀌면 새로운 embedding contract가 필요하다.

## 격리 준비와 재현

준비 스크립트: [`prepare_v430_siglip2.py`](../../scripts/internal/prepare_v430_siglip2.py).
Python 3.12 arm64 기반 전용 venv는 `third_party/v430-embedding/venv`에 두며, 원본 wheels와
실제 hashes, 전체 resolved version lock을 같은 소유 경로에 보존한다. 직접 pin은
torch 2.6.0, transformers 4.49.0, onnx 1.17.0, Python onnxruntime 1.21.0,
sentencepiece 0.2.0, numpy 2.2.6, Pillow 11.3.0, protobuf 5.29.5이다.
Python ORT와 시스템 C++ ORT의 버전 차이는 실제 parity 결과에 각각 기록한다.
Transformers 4.49의 `AutoProcessor`는 이 checkpoint의 Gemma tokenizer를 잘못 선택하므로,
원본 설정에 따른 `AutoTokenizer`와 `AutoImageProcessor(use_fast=False)`를 각각 로드한다.
모델·tokenizer 또는 의존성 버전을 바꿔 우회하지 않는다.

SentencePiece v0.2.0 source archive SHA256은
`9970f0a0afee1648890293321665e5b2efa04eaec9f1671fcf8048f456f5bb86`이다.
C++ static library prefix는 `third_party/v430-embedding/sentencepiece`이며 전역 설치를 하지 않는다.
CMake 4의 오래된 minimum policy 호환 오류는 source를 바꾸지 않고
`-DCMAKE_POLICY_VERSION_MINIMUM=3.5`로 해결한다. build 병렬도는 2이다.
cache와 임시 자료는 같은 의존성 소유 경로 아래에 둔다. 작업 공간 목표는 원본·venv·wheels·export·build
합계 8GiB이며, 초과 시 임의 삭제나 예산 확대 없이 중단한다.

```sh
python3 scripts/internal/prepare_v430_siglip2.py bootstrap --python /path/to/python3.12
third_party/v430-embedding/venv/bin/python scripts/internal/prepare_v430_siglip2.py assets
third_party/v430-embedding/venv/bin/python scripts/internal/prepare_v430_siglip2.py sentencepiece
third_party/v430-embedding/venv/bin/python scripts/internal/prepare_v430_siglip2.py export
third_party/v430-embedding/venv/bin/python scripts/internal/prepare_v430_siglip2.py verify
python3 scripts/internal/prepare_v430_siglip2.py status
```

`bootstrap`과 `assets`의 최초 준비에는 승인된 다운로드가 필요하다. 이후 model load/export/verify는
`local_files_only=True`와 offline 설정으로 실행한다. 준비 command·stdout/stderr와 최초 실패→재검증은
`models/v430-siglip2/`에 보존한다. 내구 모델·의존성 파일을 자동 삭제하지 않는다.

## 검증 경계

실행 전 [기능 인벤토리](../project-feature-test-inventory.md)에 등록한
`V430-EMBED-PREP/TOKEN/PARITY/SMOKE`를 기준으로 한다. 공급자↔Python ORT 및 공급자↔시스템 C++ ORT의
FP32 L2 정규화 출력은 max abs error ≤1e-4, cosine ≥0.99999여야 한다.
영어·한국어·빈 문자열·공백·긴 문장의 공급자↔C++ token ID는 64개 전체가 같아야 한다.
실제 frame/text smoke는 유한 768차원, norm 오차 ≤1e-5, 상이한 입력의 비동일 출력을 확인한다.
초기 준비 helper는 빈 문자열도 token parity를 확인했다. 독립 adapter는 빈 문자열과 Unicode
공백만 있는 사용자 질의를 거부하며, 후속 application도 같은 검색 질의 정책을 유지한다.

이미지는 [fixture 출처](../sample-fixture-provenance.md)에 공개 가능으로 등록된
`video/va_four_scene_sample.mp4`의 0/1/3/6초 frame을 로컬 추출한다.
실제 영상 연결·검색 권한·삭제·재색인·한국어 retrieval 품질·CPU 지원 상한은 이번 준비의 검증 대상이 아니다.
현재 preparation 결과가 FAIL 또는 없으면 encoder 준비 완료로 판단하지 않는다.

이번 준비의 encoder·tokenizer parity와 실제 frame/text smoke는 완료했고, 개별 수치·원본 hash·
최초 실행과 재검증은 `preparation.json` 및 같은 폴더의 logs로 추적한다.
초기 sandbox DNS 차단은 승인된 다운로드 재시도로, CMake policy 오류는 위 최소 버전 옵션으로,
processor 선택 오류는 구성요소 명시 로드로 해결했다. score 계산의 NumPy BLAS 경고는
독립 scalar 누산과 값 일치를 확인하고 scalar 경로로 재검증했다. 최초 로그를 덮어쓰지 않았다.

C++ ORT·tokenizer 초기 준비 helper 원문은 스크립트의 `CPP_PROBE`이며 실행 때
`models/v430-siglip2/parity/local_probe.cpp`와 binary를 생성한다. 초기 준비의 이미지 preprocessing
비교는 공급자 image processor와 Pillow bilinear RGB 전처리 사이의 비교였다.
Pillow 11.3의 [resampling 코드](https://github.com/python-pillow/Pillow/blob/11.3.0/src/libImaging/Resample.c)는
downsample에서 확대된 triangle support, border weight renormalization, 22bit coefficient rounding과
수평·수직 두 번의 8bit pass를 사용한다. 독립 adapter는 같은 계약을 직접 구현하며 Pillow 소스를
복사하거나 링크하지 않는다. Pillow의 [MIT-CMU 라이선스](https://raw.githubusercontent.com/python-pillow/Pillow/11.3.0/LICENSE)는
준비 venv의 package metadata로 보존한다.
네 frame은 같은 4분할 장면의 시간 차이이며 서로 다른 scene의 retrieval 품질 fixture를 대신하지 않는다.

## 독립 C++ adapter

계약은 [`siglip2_encoder.h`](../../include/analysis/siglip2_encoder.h), 구현은
[`siglip2_encoder.cpp`](../../src/analysis/siglip2_encoder.cpp), 직접 실행 fixture driver는
[`siglip2_encoder_smoke.cpp`](../../scripts/internal/siglip2_encoder_smoke.cpp)이다.
`Siglip2Encoder(model_directory)`는 위 고정 ONNX 두 파일과 tokenizer를 로컬로 로드한다.
`EncodeText`와 `EncodeRgb`는 유한한 L2 정규화 768차원 vector를 반환하고,
잘못된 입력·파일·ONNX name/type/shape·추론 실패는 입력 내용을 포함하지 않은 예외로 거부한다.
고정 revision/hash/preprocess version 및 실제 파일 byte-size 상수를 제공한다.
constructor는 각 파일의 고정 크기와 SHA256를 기존 GLib로 검증한다.
tokenizer의 검증한 동일 bytes를 SentencePiece `LoadFromSerializedProto`에 전달한다.
ONNX는 원본 FD의 고정 크기 admission 뒤 1MiB 청크로 private 임시 FD에 복사하면서 SHA를 검증한다.
OS `temp_directory_path` 아래 소유 UID·0700 디렉터리를 확인하고 `mkstemp` 0600/CLOEXEC 파일을
생성한 즉시 unlink하며 빈 임시 디렉터리도 제거한다. 검증한 동일 FD를 rewind한 뒤 macOS는
`/dev/fd/N`, Linux는 `/proc/self/fd/N` 경로로 ORT에 전달한다. 생성 완료와 오류 모두 FD를 닫는다.
고정 export는 self-contained이며 memory loader fallback을 하지 않는다.
tokenizer→image→text 순차 로드이며 한 번에 임시 ONNX 하나만 보유한다. 다른 bytes는
같은 ONNX shape여도 거부하고, 준비 script는 최대 파일 1,129,352,764bytes의 임시 공간까지
8GiB 예산에 예약한다. 테스트는 소유 `third_party/v430-embedding/tmp`를 `TMPDIR`로 지정한다.

raw UTF-8 text 상한은 16KiB이고 RGB width/height 상한은 각각 16384이다.
RGB 버퍼 접근 span은 `(height-1)*stride+width*3`이며 최대 256MiB이다.
overflow·short stride·상한 초과는 토큰화나 resize 할당 전에 거부한다.
caller는 최소 span 크기 버퍼의 소유권과 수명을 유지해야 한다. 이 pointer API로 실제 버퍼 크기를
추론하지 않는다. 같은 encoder의 단일 mutex가 토큰화와 RGB 전처리부터 추론까지 보호하므로,
여러 호출의 임시 resize tensor가 동시에 쌓이지 않는다. CPU ORT intra/inter threads는 각각 1이다.

`TokenizeText`는 `g_utf8_validate` → Unicode 공백 질의 거부 → `g_utf8_strdown` →
SentencePiece identity normalization 순서이며 별도 NFKC/공백 축약을 하지 않는다.
진단용 `ResizeRgb`/`PreprocessRgb`는 상태 없는 순수 함수이며 동일 RGB 입력 한도를 적용한다.
`MEDIA_SERVER_USE_SIGLIP2=0` 빌드는 ORT·SentencePiece·GLib 없이 컴파일되고
encoder/tokenizer 호출에 명확한 disabled 오류를 반환한다.

```sh
third_party/v430-embedding/venv/bin/python scripts/internal/prepare_v430_siglip2.py adapter-verify
```

사전 등록 `V430-EMBED-PIXEL/ADAPTER`는 11개 down/upscale·비정방·border·1px·padded stride
fixture의 C++ uint8 RGB를 Pillow bilinear와 exact 비교하고, FP32 tensor는 공급자 processor 대비
max abs error ≤1e-6으로 확인한다. 실제 네 frame와 정상 text 8개의 embedding은 앞의
cosine/max abs/norm 기준을 적용하고, 기존 text 10개 중 빈 질의 2개는 rejection으로 구분한다.
오류 21개(같은 크기 다른 tokenizer/model bytes 포함)와 dimension 16384×1/text 16384bytes/
span 정확 256MiB의 허용 경계 3개도 직접 실행한다.
최초 1×1 supplier channel inference 오류는 `input_data_format="channels_last"`를 명시해 고쳤으며,
최초 FAIL과 동일 기준 재검증은 `preparation.json.adapter_verification_previous` 및 원본 logs로
추적한다. 현재 결과는 `adapter_verification`에 둔다. 제품 runtime/CMake·색인 연결과
미디어 수명·운영 동시요청 비용·전체 retrieval 품질은 이 독립 검증에 포함되지 않는다.
별도 C++ 프로세스의 시작·종료 UTC milliseconds와 최대 RSS는 `getrusage(RUSAGE_SELF)`로
측정한다. macOS `time -l`의 sandbox sysctl 실패도 최초 원출력과 FAIL로 보존한다.
4GiB 단기 개발 목표를 넘으면 준비 PASS로 처리하지 않는다. 공급자 Python과 C++의 RSS를
합산 추정해 시스템 전체 최대 RSS로 보고하지 않는다.

`V430-EMBED-LOAD`의 private compile macro `MEDIA_SERVER_SIGLIP2_RESOURCE_DIAGNOSTICS=1`은
initial/SP hash·load·buffer free/image·text hash·ORT·storage close/추론의 current RSS와 peak·UTC를
관측한다. macOS current RSS는 `task_info(MACH_TASK_BASIC_INFO)`, Linux는 `/proc/self/statm`이며
읽기 실패는 unavailable로 구분한다. 일반 빌드에는 단계별 진단 출력을 넣지 않는다.
원래 memory loader에서 각 raw buffer 크기만큼 RSS가 증가하고 free 직후에도 감소하지 않는
관측을 얻어 FD 대안으로 바꿨다. 원본과 FD 경로의 전체 단계 표는 `adapter_verification_previous`
및 current 결과로 추적하고, 개별 수치와 원출력을 이 문서에 복사하지 않는다.
memory loader 진단 원출력 `adapter-verify-load-diagnostic.log`와 최종 FD 결과
`adapter-verify-fd-loader-final.log`의 연결은 `preparation.json.adapter_verification.load_comparison`에 둔다.
테스트 전용 `MEDIA_SERVER_SIGLIP2_TEST_IO=1` 빌드는 4096bytes 부분쓰기와 read/write 각각 첫
EINTR의 정상 복구·실제 image/text smoke, ENOSPC 실패 전파를 주입해 검증한다.
일반 빌드에는 주입 경로가 없다. 정상 constructor·주입 constructor·모든 거부의 전후 열린 FD
집합을 대조하고 소유 임시 경로 부재를 확인한다. 실제 OS 디스크를 소진하는 검사는 아니다.
