# v4.2.0 개발 실행 기록

## 범위와 현재 상태

- 사용자 목표: 1~10 순차 개발, 단기 검증, 분할 커밋, 마지막 브랜치 push와 종합보고.
- 제외: 릴리즈용 30분·120분·UI 풀테스트·predev. 미실행이며 PASS가 아니다.
- 기준: `v4.2.0`, source `5990bbcc`, 작업 시작 시 clean. source version은 `4.1.1`.
- 계약: [개발 설계](../../superpowers/specs/2026-10-03-v420-structured-search-design.md).
- 정의: [V420 기능 ID](../../project-feature-test-inventory.md#v420-구조화-검색).
- 현재: 1 계약·조사·사전 정의 완료(`a8098ff3`), 2 불변 read model·채널/ID 인덱스와 단기 검증 완료.
  3 카탈로그 adapter·증분 갱신·V2 mapping/삭제·generation 참조/재개방 연결을 단기 검증했다.
  4 필터 모델과 실제 이벤트 행동 근거 연결을 구현·단기 검증했다.
  5 불변 결과 snapshot/cursor를 구현·단기 검증했다.
  6 동일 원본 이벤트 우선과 실제 파일/파생 출력 후보 연결을 구현·단기 검증했다.
  다음은 7 파일 presentation 위치/seek다. 7~10 미완료. 제품 완료·push 미수행.

## 실행 결과

### 1 계약·조사·사전 정의

source: `5990bbcc` + 이 단계의 문서 변경. 환경: 프로젝트 macOS workspace, 2026-10-03.

- `git diff --check`: exit 0, 출력 없음.
- `node scripts/internal/verify_docs_links.mjs`: exit 0.
  `markdown files: 295; local links: 9222; local images: 14; local anchors: 358;
  indexed docs: 88; index coverage exclusions: 190; failures: 0`.
- 공식 자료 4개를 읽어 출처·채택 의미·제외를 개발 설계에 기록했다. 외부 코드 반입 없음.
- cleanup: 서버·포트·임시 fixture·별도 프로세스 생성 없음. 문서 외 제품 변경 없음.
- 제품 검증 미실행. 위 결과는 문서 정합만 입증한다.

### 2 read model 단기 검사

정의: V420-M01~03. 모델 생성/정렬/불변/거부 경계만 검사하며 실제 catalog adapter·API 검증은 후속 단계다.

```text
source: a8098ff3 + stage2 worktree; include/recording/recording_search_model.h sha256=2828e61c6eaed16b0cb85e186537a2c8f424d75b35e7ef9205745944f5f01bc2, src/recording/recording_search_model.cpp sha256=a7043b2c8211545cd0615cc74365a52bad334c127604a13539f49137f9f1a08b, scripts/internal/recording_search_model_smoke.cpp sha256=849f634c34b4df06f630a800c448cbd14a3be4d61a62a6b5c67917f58463958b
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -Iinclude src/recording/recording_search_model.cpp scripts/internal/recording_search_model_smoke.cpp -o /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-model-8rf_6qoa/model


exit: 0
command: /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-model-8rf_6qoa/model
[pass] M01 build
[pass] M01 known-desc/channel/id then unknown
[pass] M01 channel index and absent channel
[pass] M01 source immutable / normalized projection
[pass] M01 identity and unknown are preserved
[pass] M01 rebuild independent of input order
[pass] M02 duplicate cannot replace published model
[pass] M02 empty interval rejected atomically
[pass] M02 half-known interval rejected
[pass] M02 unlinked event fact rejected
[pass] M02 conflicting event facts rejected
[pass] M01 numeric track reuse does not merge sessions
[pass] M03 row limit overflow atomic
[pass] M03 row limit equality
[pass] M03 byte accounting baseline
[pass] M03 exact byte budget admitted
[pass] M03 one byte short rejected atomically
[pass] M02 invalid source rejected
[pass] M02 successful empty distinct from failed build
[pass] M01 retained immutable model survives replacements
[pass] M03 scale explicit endpoints
[scale] rows=1 accountedBytes=2249 elapsedUs=4
[pass] M03 scale explicit endpoints
[scale] rows=1000 accountedBytes=2100149 elapsedUs=411
[pass] M03 scale explicit endpoints
[scale] rows=10000 accountedBytes=21000149 elapsedUs=3747
[pass] M03 default 100001 rows rejected before projection
[search-model] pass=24 fail=0


exit: 0
cleanup: owned temporary compiler output removed=True; no server/port
```

최종 단계 2 판정은 아래 25개 assertion 실행과 구조 검사 보정·빌드 결과를 함께 따른다.

단계 2 구조 검사 최초 실패: `node scripts/internal/verify_v390_cmake_internal_target_separation.mjs`, exit 1.
신규 2개 source/header를 현행 graph에 분류했으나 현행 소비자 metadata의 hash/metrics 갱신이 누락됐다.
제품 C++ 검사 실패나 예상 TDD RED가 아니다. 다음 단계는 보류하고 같은 단계의 정확한 metadata를 보정한다.

```text
- PASS: composition executable and runtime static library are distinct
- PASS: production C++ sources have exact composition/runtime ownership
- PASS: runtime target owns optional source, compile definitions, includes, and external links
- FAIL: current graph and writer bind both actual CMake targets — current:hash; current:metrics
- PASS: target ownership and topology mutations fail closed
- summary: pass=4 fail=1
```

cleanup: 이 정적 검사는 서버·포트·임시 자료를 생성하지 않았다.

100,000행에서 바이트 한도가 먼저 적용되는 경계 assertion 추가 후 재검증:

```text
source: a8098ff3 + stage2 worktree; smoke sha256=b80086f30de5cffca08d68fbad9fec197fda6e24d455b6fbeaa5467e24c44776
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -Iinclude src/recording/recording_search_model.cpp scripts/internal/recording_search_model_smoke.cpp -o /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-model-dj66tuu6/model


exit: 0
command: /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-model-dj66tuu6/model
[pass] M01 build
[pass] M01 known-desc/channel/id then unknown
[pass] M01 channel index and absent channel
[pass] M01 source immutable / normalized projection
[pass] M01 identity and unknown are preserved
[pass] M01 rebuild independent of input order
[pass] M02 duplicate cannot replace published model
[pass] M02 empty interval rejected atomically
[pass] M02 half-known interval rejected
[pass] M02 unlinked event fact rejected
[pass] M02 conflicting event facts rejected
[pass] M01 numeric track reuse does not merge sessions
[pass] M03 row limit overflow atomic
[pass] M03 row limit equality
[pass] M03 byte accounting baseline
[pass] M03 exact byte budget admitted
[pass] M03 one byte short rejected atomically
[pass] M02 invalid source rejected
[pass] M02 successful empty distinct from failed build
[pass] M01 retained immutable model survives replacements
[pass] M03 scale explicit endpoints
[scale] rows=1 accountedBytes=2249 elapsedUs=2
[pass] M03 scale explicit endpoints
[scale] rows=1000 accountedBytes=2100149 elapsedUs=171
[pass] M03 scale explicit endpoints
[scale] rows=10000 accountedBytes=21000149 elapsedUs=1962
[pass] M03 default 100001 rows rejected before projection
[pass] M03 100000 valid rows still obey earlier 64MiB limit
[search-model] pass=25 fail=0


exit: 0
cleanup: owned temporary compiler output removed=True; no server/port
```

단계 2 구조 metadata 보정 후:

- `node scripts/internal/verify_v390_cmake_internal_target_separation.mjs`: exit 0, 5 PASS/0 FAIL.
  composition/runtime 분리, source 단일 소유, optional/compile/link 결속,
  실제 current graph 결속, target 변경 반례의 거부를 확인했다.
- `node scripts/internal/verify_v390_structure_stabilization_execution.mjs --graph-only`: exit 0,
  4 PASS/0 FAIL. 현행 정책, hash/metrics, 금지 연결/cycle 반례, 역사 completion 분리 확인.
- 최초 `current:hash; current:metrics` 실패는 신규 파일 2개를 반영한 현행 연결값 보정으로 해소했다.
  execution fixture는 `currentGraph`의 hash·파일 수 3개 값만 변경했다. 역사 실행·PASS/FAIL·
  completion snapshot·의존 허용 정책은 변경하지 않았다.
- `cmake --build build-gst-onnx --target media_server_runtime -j2`: exit 0.
  CMake configure/generate 성공, 실제 runtime C++ sources 컴파일 및 static library link 성공.
  마지막 출력: `[100%] Built target media_server_runtime`. 앱 실행·HTTP·실제 미디어 검사 아님.
- source: `a8098ff3` + 검색 모델 2파일·CMake 등록·소유 metadata 변경. native 원출력과 hash는 위 기록.
- cleanup: 실행 소유 native 임시 경로 2개 제거 확인, 서버·포트 생성 없음.
  기존 `build-gst-onnx`의 빌드 산출물은 재사용 build cache로 유지한다.
- 한계: 모델의 값/인덱스 검증이며 카탈로그 연결·필터·cursor·재생·제품 UI는 후속 3~9 대상이다.

### 3 증분 모델 갱신의 단기 검사

V420-L01/L02의 모델 변화분만 검사한다. 실제 catalog adapter·복구는 아직 미완료다.

```text
source: 397b2609 + stage3 delta worktree; include/recording/recording_search_model.h sha256=8aeedc3610c35c7499466f711f046d13fa97f17dee3bb2c8de4cc41018259a74, src/recording/recording_search_model.cpp sha256=1bb7f48b14c8a3079d661124cdd226a2fffedb6334b0ab9d65470d8861347e3c, scripts/internal/recording_search_model_smoke.cpp sha256=aa57d4550375d96b696b0f2416cb0b3144ac16fe218849cfe982d8e6d7c625da
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -Iinclude src/recording/recording_search_model.cpp scripts/internal/recording_search_model_smoke.cpp -o /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-delta-z4thmvto/model


exit: 0
command: /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-delta-z4thmvto/model
[pass] M01 build
[pass] M01 known-desc/channel/id then unknown
[pass] M01 channel index and absent channel
[pass] M01 source immutable / normalized projection
[pass] M01 identity and unknown are preserved
[pass] M01 rebuild independent of input order
[pass] M02 duplicate cannot replace published model
[pass] M02 empty interval rejected atomically
[pass] M02 half-known interval rejected
[pass] M02 unlinked event fact rejected
[pass] M02 conflicting event facts rejected
[pass] M01 numeric track reuse does not merge sessions
[pass] M03 row limit overflow atomic
[pass] M03 row limit equality
[pass] M03 byte accounting baseline
[pass] M03 exact byte budget admitted
[pass] M03 one byte short rejected atomically
[pass] M02 invalid source rejected
[pass] M02 successful empty distinct from failed build
[pass] M01 retained immutable model survives replacements
[pass] L01 delta adds/updates/deletes and reorders exact expected ids
[pass] L02 removal changes new snapshot without mutating held pages
[pass] L01 stale predecessor requires rebuild
[pass] L02 restarted source cannot apply old lineage
[pass] L02 upsert/delete same id rejected atomically
[pass] L01 empty delta advances only revision
[pass] M03 scale explicit endpoints
[scale] rows=1 accountedBytes=2249 elapsedUs=5
[pass] M03 scale explicit endpoints
[scale] rows=1000 accountedBytes=2100149 elapsedUs=268
[pass] M03 scale explicit endpoints
[scale] rows=10000 accountedBytes=21000149 elapsedUs=4677
[pass] M03 default 100001 rows rejected before projection
[pass] M03 100000 valid rows still obey earlier 64MiB limit
[search-model] pass=31 fail=0


exit: 0
cleanup: owned temporary compiler output removed=True; no server/port
```

- `cmake --build build-gst-onnx --target media_server_runtime -j2`: exit 0,
  변경된 `recording_search_model.cpp` 컴파일 및 runtime static library link 성공.
- 모델 31개 assertion PASS는 3단계 전체 완료가 아니다. 카탈로그 adapter의 source snapshot,
  revision 변화분 수집·재구축, 실제 저장소 삭제/손상·재개방과의 연결 검증이 남아 있다.
- 변경 소유 파일: 기존 검색 모델 header/source·native smoke·이 개발 기록.
  의존 방향·CMake source 목록·공개 API·원본 저장 계약 변경 없음.

### 3 카탈로그 어댑터 focused 첫 실행

source: e13868bb + stage3 worktree. 실제 runtime archive와 동일 CMake defines/include를 사용했다.

```text
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -DGST_USE_UNSTABLE_API=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=0 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_LIBSODIUM=1 -DMEDIA_SERVER_USE_ONNXRUNTIME=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_PANGOCAIRO=1 -DMEDIA_SERVER_USE_SQLITE3=1 -I/Users/dhseo/Workspace/mediaServer/include -I/opt/homebrew/include/onnxruntime -isystem /opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/include/gio-unix-2.0 -isystem /opt/homebrew/Cellar/orc/0.4.42/include/orc-0.4 -isystem /opt/homebrew/Cellar/glib/2.86.4/include -isystem /Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi -isystem /opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include -isystem /opt/homebrew/opt/gettext/include -isystem /opt/homebrew/Cellar/pcre2/10.47_1/include -isystem /opt/homebrew/Cellar/pango/1.57.0_2/include/pango-1.0 -isystem /opt/homebrew/Cellar/cairo/1.18.4/include/cairo -isystem /opt/homebrew/Cellar/libxext/1.3.7/include -isystem /opt/homebrew/Cellar/xorgproto/2025.1/include -isystem /opt/homebrew/Cellar/libxrender/0.9.12/include -isystem /opt/homebrew/Cellar/libx11/1.8.13/include -isystem /opt/homebrew/Cellar/libxcb/1.17.0/include -isystem /opt/homebrew/Cellar/libxau/1.0.12/include -isystem /opt/homebrew/Cellar/libxdmcp/1.1.5/include -isystem /opt/homebrew/Cellar/pixman/0.46.4/include/pixman-1 -isystem /opt/homebrew/Cellar/fribidi/1.0.16/include/fribidi -isystem /opt/homebrew/Cellar/libthai/0.1.30/include -isystem /opt/homebrew/Cellar/libdatrie/0.2.14/include -isystem /opt/homebrew/Cellar/fontconfig/2.17.1/include -isystem /opt/homebrew/Cellar/harfbuzz/13.1.1/include/harfbuzz -isystem /opt/homebrew/opt/freetype/include/freetype2 -isystem /opt/homebrew/opt/libpng/include/libpng16 -isystem /opt/homebrew/opt/graphite2/include -isystem /opt/homebrew/Cellar/libsodium/1.0.21/include -isystem /opt/homebrew/Cellar/openssl@3/3.6.2/include scripts/internal/recording_search_source_smoke.cpp /Users/dhseo/Workspace/mediaServer/build-gst-onnx/libmedia_server_runtime.a /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libz.tbd /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstrtspserver-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstapp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstwebrtc-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstsdp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstpbutils-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstaudio-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstvideo-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstbase-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstreamer-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpangocairo-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpango-1.0.dylib /opt/homebrew/Cellar/cairo/1.18.4/lib/libcairo.dylib /opt/homebrew/Cellar/harfbuzz/13.1.1/lib/libharfbuzz.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libgobject-2.0.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libglib-2.0.dylib /opt/homebrew/opt/gettext/lib/libintl.dylib /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libsqlite3.tbd /opt/homebrew/Cellar/libsodium/1.0.21/lib/libsodium.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libssl.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libcrypto.dylib /opt/homebrew/lib/libonnxruntime.dylib -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-source-3uxrw9lg/source


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-source-3uxrw9lg/source /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-source-3uxrw9lg/fixture
[pass] journal-open
[pass] closed-source-rejected
[pass] catalog-open
[pass] empty-source-success
[pass] invalid-channel-output-unchanged
[pass] finalize
[pass] unknown-observation-put
[pass] unknown-is-not-inferred
[pass] stored-locator-put
[pass] observation-delta-only
[pass] stored-locator-utc-and-pts
[pass] unchanged-model-reused
[pass] search-does-not-write-journal
[pass] capture-before-observation
[pass] observation-keeps-resolution-valid
[pass] new-model-held-snapshot-independent
[pass] capacity-failure-output-unchanged
[pass] scope-change-rebuild
[pass] history-gap-rebuild
[pass] structural-change-invalidates-captured-batch
[pass] corruption-new-state-old-snapshot-preserved
[pass] journal-reopen-rebuild
[pass] sqlite-reopen-rebuild
[pass] rebuild-does-not-write-journal
[search-source] pass=24 fail=0 error=


exit: 0
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -Iinclude src/recording/recording_search_model.cpp scripts/internal/recording_search_model_smoke.cpp -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-source-3uxrw9lg/model


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-source-3uxrw9lg/model
[pass] M01 build
[pass] M01 known-desc/channel/id then unknown
[pass] M01 channel index and absent channel
[pass] M01 source immutable / normalized projection
[pass] M01 identity and unknown are preserved
[pass] M01 rebuild independent of input order
[pass] M02 duplicate cannot replace published model
[pass] M02 empty interval rejected atomically
[pass] M02 half-known interval rejected
[pass] M02 unlinked event fact rejected
[pass] M02 conflicting event facts rejected
[pass] M01 numeric track reuse does not merge sessions
[pass] M03 row limit overflow atomic
[pass] M03 row limit equality
[pass] M03 byte accounting baseline
[pass] M03 exact byte budget admitted
[pass] M03 one byte short rejected atomically
[pass] M02 invalid source rejected
[pass] M02 successful empty distinct from failed build
[pass] M01 retained immutable model survives replacements
[pass] L01 delta adds/updates/deletes and reorders exact expected ids
[pass] L02 removal changes new snapshot without mutating held pages
[pass] L01 stale predecessor requires rebuild
[pass] L02 restarted source cannot apply old lineage
[pass] L02 upsert/delete same id rejected atomically
[pass] L01 empty delta advances only revision
[pass] M03 scale explicit endpoints
[scale] rows=1 accountedBytes=2297 elapsedUs=8
[pass] M03 scale explicit endpoints
[scale] rows=1000 accountedBytes=2148149 elapsedUs=428
[pass] M03 scale explicit endpoints
[scale] rows=10000 accountedBytes=21480149 elapsedUs=3909
[pass] M03 default 100001 rows rejected before projection
[pass] M03 100000 valid rows still obey earlier 64MiB limit
[search-model] pass=31 fail=0


exit: 0
cleanup: owned temporary root removed=True; no server/port
```

- 첫 runtime 빌드는 exit 0이었으나 structured binding을 lambda에서 캡처하는 C++20 extension 경고 2개가 있었다. 일반 지역 참조로 변경한 뒤 `cmake --build build-gst-onnx --target media_server_runtime -j2` 재실행 exit 0, 경고 없이 성공했다.
- 카탈로그 통합 24/24, 모델 31/31 PASS. 원장 바이트 불변·소유 임시 파일 제거 확인. 서버/포트를 만들지 않았다.
- `node scripts/internal/verify_v390_structure_stabilization_execution.mjs --graph-only`: 4/4 PASS, exit 0.
- `node scripts/internal/verify_v390_cmake_internal_target_separation.mjs`: 5/5 PASS, exit 0.
- `node scripts/internal/verify_docs_links.mjs`: 295 Markdown, 9,222 링크, failures 0, exit 0.
- `git diff --check`: exit 0. 현행 소유 그래프와 execution의 currentGraph 연결만 갱신했다. 과거 완료 snapshot과 의존 정책은 유지했다.
- 3단계 전체는 미완료: generation 원본 참조, V2 mapping, 삭제/tombstone 통합 검사가 남아 있다. 실제 재생·API·UI·장시간 검사는 이번 실행 대상이 아니다.

현재 focused source SHA-256:

```text
include/recording/recording_catalog.h 6bfcb3c170dbd2e8f579cb6b0e16a3b66b6477ebb5f8fee158c5cc7df59611a9
src/recording/recording_catalog.cpp 03929f7c300a72e6380af54586888cef26cbf0ddbad7a8457dd31726fe9e5794
include/recording/recording_search_model.h 4e83f927c644a840de6718bf35f8b27a55c4dc1a7733cd62457cd714924ee47c
src/recording/recording_search_model.cpp a9f4f6451db7a025230536645c38a74d23e096a00d770e330cb1fb5ccdd051b3
include/recording/recording_search_source.h ea4bd724c5682b87a1e7fb020e7e9afe7eecbd885b06154ac7a04a6c4c5e603d
src/recording/recording_search_source.cpp 3b220854618f944cab4d5a26e29e72cfdaa4f24ca13b356ec6c6cf2d589d640c
include/recording/recording_search_reader.h 17bb5fd18f00872d8dcecb3366f4c2ef4f914c2f2926261a7e0a9c5cff983002
src/recording/recording_search_reader.cpp 764700b6c1a19deed48c363a8f3371fea67821118b2f23dec62c86ec7d438039
scripts/internal/recording_search_source_smoke.cpp dbdf92a4224f6552c46214886a6c452a253f6daa0d06a3043539cd67ba8b2233
```

### 3 V2 mapping과 삭제 focused 검사

source: 04c008b7 + 확장된 source smoke. CMake runtime ABI 동일.

```text
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -DGST_USE_UNSTABLE_API=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=0 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_LIBSODIUM=1 -DMEDIA_SERVER_USE_ONNXRUNTIME=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_PANGOCAIRO=1 -DMEDIA_SERVER_USE_SQLITE3=1 -I/Users/dhseo/Workspace/mediaServer/include -I/opt/homebrew/include/onnxruntime -isystem /opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/include/gio-unix-2.0 -isystem /opt/homebrew/Cellar/orc/0.4.42/include/orc-0.4 -isystem /opt/homebrew/Cellar/glib/2.86.4/include -isystem /Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi -isystem /opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include -isystem /opt/homebrew/opt/gettext/include -isystem /opt/homebrew/Cellar/pcre2/10.47_1/include -isystem /opt/homebrew/Cellar/pango/1.57.0_2/include/pango-1.0 -isystem /opt/homebrew/Cellar/cairo/1.18.4/include/cairo -isystem /opt/homebrew/Cellar/libxext/1.3.7/include -isystem /opt/homebrew/Cellar/xorgproto/2025.1/include -isystem /opt/homebrew/Cellar/libxrender/0.9.12/include -isystem /opt/homebrew/Cellar/libx11/1.8.13/include -isystem /opt/homebrew/Cellar/libxcb/1.17.0/include -isystem /opt/homebrew/Cellar/libxau/1.0.12/include -isystem /opt/homebrew/Cellar/libxdmcp/1.1.5/include -isystem /opt/homebrew/Cellar/pixman/0.46.4/include/pixman-1 -isystem /opt/homebrew/Cellar/fribidi/1.0.16/include/fribidi -isystem /opt/homebrew/Cellar/libthai/0.1.30/include -isystem /opt/homebrew/Cellar/libdatrie/0.2.14/include -isystem /opt/homebrew/Cellar/fontconfig/2.17.1/include -isystem /opt/homebrew/Cellar/harfbuzz/13.1.1/include/harfbuzz -isystem /opt/homebrew/opt/freetype/include/freetype2 -isystem /opt/homebrew/opt/libpng/include/libpng16 -isystem /opt/homebrew/opt/graphite2/include -isystem /opt/homebrew/Cellar/libsodium/1.0.21/include -isystem /opt/homebrew/Cellar/openssl@3/3.6.2/include scripts/internal/recording_search_source_smoke.cpp /Users/dhseo/Workspace/mediaServer/build-gst-onnx/libmedia_server_runtime.a /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libz.tbd /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstrtspserver-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstapp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstwebrtc-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstsdp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstpbutils-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstaudio-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstvideo-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstbase-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstreamer-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpangocairo-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpango-1.0.dylib /opt/homebrew/Cellar/cairo/1.18.4/lib/libcairo.dylib /opt/homebrew/Cellar/harfbuzz/13.1.1/lib/libharfbuzz.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libgobject-2.0.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libglib-2.0.dylib /opt/homebrew/opt/gettext/lib/libintl.dylib /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libsqlite3.tbd /opt/homebrew/Cellar/libsodium/1.0.21/lib/libsodium.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libssl.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libcrypto.dylib /opt/homebrew/lib/libonnxruntime.dylib -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-v2-x4a6kplt/source


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-v2-x4a6kplt/source /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-v2-x4a6kplt/fixture
[pass] journal-open
[pass] closed-source-rejected
[pass] catalog-open
[pass] empty-source-success
[pass] invalid-channel-output-unchanged
[pass] finalize
[pass] unknown-observation-put
[pass] unknown-is-not-inferred
[pass] stored-locator-put
[pass] observation-delta-only
[pass] stored-locator-utc-and-pts
[pass] unchanged-model-reused
[pass] search-does-not-write-journal
[pass] capture-before-observation
[pass] observation-keeps-resolution-valid
[pass] new-model-held-snapshot-independent
[pass] capacity-failure-output-unchanged
[pass] scope-change-rebuild
[pass] history-gap-rebuild
[pass] structural-change-invalidates-captured-batch
[pass] corruption-new-state-old-snapshot-preserved
[pass] journal-reopen-rebuild
[pass] sqlite-reopen-rebuild
[pass] rebuild-does-not-write-journal
[pass] v2-journal-fixture
[pass] v2-unknown-fixture
[pass] v2-source-open
[pass] v2-mappings-separate-clock-overlap-preserved
[pass] v2-unknown-retains-media-axis
[pass] v2-deletion-pending-refresh
[fail] v2-tombstone-removes-all-mappings-held-model-unchanged
[pass] v2-read-journal-unchanged
[pass] v2-source-open
[fail] v2-reopen-tombstone-no-resurrection
[pass] v2-read-journal-unchanged
[search-source] pass=33 fail=2 error=


exit: 1
cleanup: owned temporary root removed=True; no server/port
```

V2 최초 실패 원인 분리: 삭제 호출의 오류를 stderr로 보존한다. 기대값 변경 없음.

```text
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -DGST_USE_UNSTABLE_API=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=0 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_LIBSODIUM=1 -DMEDIA_SERVER_USE_ONNXRUNTIME=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_PANGOCAIRO=1 -DMEDIA_SERVER_USE_SQLITE3=1 -I/Users/dhseo/Workspace/mediaServer/include -I/opt/homebrew/include/onnxruntime -isystem /opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/include/gio-unix-2.0 -isystem /opt/homebrew/Cellar/orc/0.4.42/include/orc-0.4 -isystem /opt/homebrew/Cellar/glib/2.86.4/include -isystem /Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi -isystem /opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include -isystem /opt/homebrew/opt/gettext/include -isystem /opt/homebrew/Cellar/pcre2/10.47_1/include -isystem /opt/homebrew/Cellar/pango/1.57.0_2/include/pango-1.0 -isystem /opt/homebrew/Cellar/cairo/1.18.4/include/cairo -isystem /opt/homebrew/Cellar/libxext/1.3.7/include -isystem /opt/homebrew/Cellar/xorgproto/2025.1/include -isystem /opt/homebrew/Cellar/libxrender/0.9.12/include -isystem /opt/homebrew/Cellar/libx11/1.8.13/include -isystem /opt/homebrew/Cellar/libxcb/1.17.0/include -isystem /opt/homebrew/Cellar/libxau/1.0.12/include -isystem /opt/homebrew/Cellar/libxdmcp/1.1.5/include -isystem /opt/homebrew/Cellar/pixman/0.46.4/include/pixman-1 -isystem /opt/homebrew/Cellar/fribidi/1.0.16/include/fribidi -isystem /opt/homebrew/Cellar/libthai/0.1.30/include -isystem /opt/homebrew/Cellar/libdatrie/0.2.14/include -isystem /opt/homebrew/Cellar/fontconfig/2.17.1/include -isystem /opt/homebrew/Cellar/harfbuzz/13.1.1/include/harfbuzz -isystem /opt/homebrew/opt/freetype/include/freetype2 -isystem /opt/homebrew/opt/libpng/include/libpng16 -isystem /opt/homebrew/opt/graphite2/include -isystem /opt/homebrew/Cellar/libsodium/1.0.21/include -isystem /opt/homebrew/Cellar/openssl@3/3.6.2/include scripts/internal/recording_search_source_smoke.cpp /Users/dhseo/Workspace/mediaServer/build-gst-onnx/libmedia_server_runtime.a /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libz.tbd /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstrtspserver-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstapp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstwebrtc-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstsdp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstpbutils-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstaudio-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstvideo-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstbase-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstreamer-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpangocairo-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpango-1.0.dylib /opt/homebrew/Cellar/cairo/1.18.4/lib/libcairo.dylib /opt/homebrew/Cellar/harfbuzz/13.1.1/lib/libharfbuzz.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libgobject-2.0.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libglib-2.0.dylib /opt/homebrew/opt/gettext/lib/libintl.dylib /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libsqlite3.tbd /opt/homebrew/Cellar/libsodium/1.0.21/lib/libsodium.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libssl.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libcrypto.dylib /opt/homebrew/lib/libonnxruntime.dylib -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-v2-diagnostic-4hsa_quh/source


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-v2-diagnostic-4hsa_quh/source /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-v2-diagnostic-4hsa_quh/fixture
[pass] journal-open
[pass] closed-source-rejected
[pass] catalog-open
[pass] empty-source-success
[pass] invalid-channel-output-unchanged
[pass] finalize
[pass] unknown-observation-put
[pass] unknown-is-not-inferred
[pass] stored-locator-put
[pass] observation-delta-only
[pass] stored-locator-utc-and-pts
[pass] unchanged-model-reused
[pass] search-does-not-write-journal
[pass] capture-before-observation
[pass] observation-keeps-resolution-valid
[pass] new-model-held-snapshot-independent
[pass] capacity-failure-output-unchanged
[pass] scope-change-rebuild
[pass] history-gap-rebuild
[pass] structural-change-invalidates-captured-batch
[pass] corruption-new-state-old-snapshot-preserved
[pass] journal-reopen-rebuild
[pass] sqlite-reopen-rebuild
[pass] rebuild-does-not-write-journal
[pass] v2-journal-fixture
[pass] v2-unknown-fixture
[pass] v2-source-open
[pass] v2-mappings-separate-clock-overlap-preserved
[pass] v2-unknown-retains-media-axis
[pass] v2-deletion-pending-refresh
[fail] v2-tombstone-removes-all-mappings-held-model-unchanged
[pass] v2-read-journal-unchanged
[pass] v2-source-open
[fail] v2-reopen-tombstone-no-resurrection
[pass] v2-read-journal-unchanged
[search-source] pass=33 fail=2 error=

v2 deletion failure: V2 삭제 상위 경로 확인 실패

exit: 1
cleanup: owned temporary root removed=True; no server/port
```

삭제 실패의 직접 오류는 `V2 삭제 상위 경로 확인 실패`였다. macOS tempfile의 `/var` 별칭이 원본 삭제의 O_NOFOLLOW 상위 경로 검사에 거부됐다. 격리 fixture 루트를 `weakly_canonical`로 정규화한다. 제품 삭제 정책/판정은 변경하지 않는다. 이 오류는 예상 RED가 아니며 최초 33 PASS/2 FAIL을 유지한다.

V2 fixture 실제 경로 보정 후 재검증:

```text
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -DGST_USE_UNSTABLE_API=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=0 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_LIBSODIUM=1 -DMEDIA_SERVER_USE_ONNXRUNTIME=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_PANGOCAIRO=1 -DMEDIA_SERVER_USE_SQLITE3=1 -I/Users/dhseo/Workspace/mediaServer/include -I/opt/homebrew/include/onnxruntime -isystem /opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/include/gio-unix-2.0 -isystem /opt/homebrew/Cellar/orc/0.4.42/include/orc-0.4 -isystem /opt/homebrew/Cellar/glib/2.86.4/include -isystem /Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi -isystem /opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include -isystem /opt/homebrew/opt/gettext/include -isystem /opt/homebrew/Cellar/pcre2/10.47_1/include -isystem /opt/homebrew/Cellar/pango/1.57.0_2/include/pango-1.0 -isystem /opt/homebrew/Cellar/cairo/1.18.4/include/cairo -isystem /opt/homebrew/Cellar/libxext/1.3.7/include -isystem /opt/homebrew/Cellar/xorgproto/2025.1/include -isystem /opt/homebrew/Cellar/libxrender/0.9.12/include -isystem /opt/homebrew/Cellar/libx11/1.8.13/include -isystem /opt/homebrew/Cellar/libxcb/1.17.0/include -isystem /opt/homebrew/Cellar/libxau/1.0.12/include -isystem /opt/homebrew/Cellar/libxdmcp/1.1.5/include -isystem /opt/homebrew/Cellar/pixman/0.46.4/include/pixman-1 -isystem /opt/homebrew/Cellar/fribidi/1.0.16/include/fribidi -isystem /opt/homebrew/Cellar/libthai/0.1.30/include -isystem /opt/homebrew/Cellar/libdatrie/0.2.14/include -isystem /opt/homebrew/Cellar/fontconfig/2.17.1/include -isystem /opt/homebrew/Cellar/harfbuzz/13.1.1/include/harfbuzz -isystem /opt/homebrew/opt/freetype/include/freetype2 -isystem /opt/homebrew/opt/libpng/include/libpng16 -isystem /opt/homebrew/opt/graphite2/include -isystem /opt/homebrew/Cellar/libsodium/1.0.21/include -isystem /opt/homebrew/Cellar/openssl@3/3.6.2/include scripts/internal/recording_search_source_smoke.cpp /Users/dhseo/Workspace/mediaServer/build-gst-onnx/libmedia_server_runtime.a /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libz.tbd /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstrtspserver-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstapp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstwebrtc-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstsdp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstpbutils-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstaudio-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstvideo-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstbase-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstreamer-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpangocairo-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpango-1.0.dylib /opt/homebrew/Cellar/cairo/1.18.4/lib/libcairo.dylib /opt/homebrew/Cellar/harfbuzz/13.1.1/lib/libharfbuzz.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libgobject-2.0.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libglib-2.0.dylib /opt/homebrew/opt/gettext/lib/libintl.dylib /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libsqlite3.tbd /opt/homebrew/Cellar/libsodium/1.0.21/lib/libsodium.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libssl.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libcrypto.dylib /opt/homebrew/lib/libonnxruntime.dylib -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-v2-fixed-6n01r0lt/source


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-v2-fixed-6n01r0lt/source /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-v2-fixed-6n01r0lt/fixture
[pass] journal-open
[pass] closed-source-rejected
[pass] catalog-open
[pass] empty-source-success
[pass] invalid-channel-output-unchanged
[pass] finalize
[pass] unknown-observation-put
[pass] unknown-is-not-inferred
[pass] stored-locator-put
[pass] observation-delta-only
[pass] stored-locator-utc-and-pts
[pass] unchanged-model-reused
[pass] search-does-not-write-journal
[pass] capture-before-observation
[pass] observation-keeps-resolution-valid
[pass] new-model-held-snapshot-independent
[pass] capacity-failure-output-unchanged
[pass] scope-change-rebuild
[pass] history-gap-rebuild
[pass] structural-change-invalidates-captured-batch
[pass] corruption-new-state-old-snapshot-preserved
[pass] journal-reopen-rebuild
[pass] sqlite-reopen-rebuild
[pass] rebuild-does-not-write-journal
[pass] v2-journal-fixture
[pass] v2-unknown-fixture
[pass] v2-source-open
[pass] v2-mappings-separate-clock-overlap-preserved
[pass] v2-unknown-retains-media-axis
[pass] v2-deletion-pending-refresh
[pass] v2-tombstone-removes-all-mappings-held-model-unchanged
[pass] v2-read-journal-unchanged
[pass] v2-source-open
[pass] v2-reopen-tombstone-no-resurrection
[pass] v2-read-journal-unchanged
[search-source] pass=35 fail=0 error=


exit: 0
cleanup: owned temporary root removed=True; no server/port
```

### 3 generation 검색 연결 focused 검사

source: 04c008b7 + generation smoke. CMake runtime ABI 동일.

```text
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -DGST_USE_UNSTABLE_API=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=0 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_LIBSODIUM=1 -DMEDIA_SERVER_USE_ONNXRUNTIME=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_PANGOCAIRO=1 -DMEDIA_SERVER_USE_SQLITE3=1 -I/Users/dhseo/Workspace/mediaServer/include -I/opt/homebrew/include/onnxruntime -isystem /opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/include/gio-unix-2.0 -isystem /opt/homebrew/Cellar/orc/0.4.42/include/orc-0.4 -isystem /opt/homebrew/Cellar/glib/2.86.4/include -isystem /Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi -isystem /opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include -isystem /opt/homebrew/opt/gettext/include -isystem /opt/homebrew/Cellar/pcre2/10.47_1/include -isystem /opt/homebrew/Cellar/pango/1.57.0_2/include/pango-1.0 -isystem /opt/homebrew/Cellar/cairo/1.18.4/include/cairo -isystem /opt/homebrew/Cellar/libxext/1.3.7/include -isystem /opt/homebrew/Cellar/xorgproto/2025.1/include -isystem /opt/homebrew/Cellar/libxrender/0.9.12/include -isystem /opt/homebrew/Cellar/libx11/1.8.13/include -isystem /opt/homebrew/Cellar/libxcb/1.17.0/include -isystem /opt/homebrew/Cellar/libxau/1.0.12/include -isystem /opt/homebrew/Cellar/libxdmcp/1.1.5/include -isystem /opt/homebrew/Cellar/pixman/0.46.4/include/pixman-1 -isystem /opt/homebrew/Cellar/fribidi/1.0.16/include/fribidi -isystem /opt/homebrew/Cellar/libthai/0.1.30/include -isystem /opt/homebrew/Cellar/libdatrie/0.2.14/include -isystem /opt/homebrew/Cellar/fontconfig/2.17.1/include -isystem /opt/homebrew/Cellar/harfbuzz/13.1.1/include/harfbuzz -isystem /opt/homebrew/opt/freetype/include/freetype2 -isystem /opt/homebrew/opt/libpng/include/libpng16 -isystem /opt/homebrew/opt/graphite2/include -isystem /opt/homebrew/Cellar/libsodium/1.0.21/include -isystem /opt/homebrew/Cellar/openssl@3/3.6.2/include scripts/internal/recording_search_generation_smoke.cpp /Users/dhseo/Workspace/mediaServer/build-gst-onnx/libmedia_server_runtime.a /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libz.tbd /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstrtspserver-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstapp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstwebrtc-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstsdp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstpbutils-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstaudio-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstvideo-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstbase-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstreamer-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpangocairo-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpango-1.0.dylib /opt/homebrew/Cellar/cairo/1.18.4/lib/libcairo.dylib /opt/homebrew/Cellar/harfbuzz/13.1.1/lib/libharfbuzz.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libgobject-2.0.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libglib-2.0.dylib /opt/homebrew/opt/gettext/lib/libintl.dylib /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libsqlite3.tbd /opt/homebrew/Cellar/libsodium/1.0.21/lib/libsodium.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libssl.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libcrypto.dylib /opt/homebrew/lib/libonnxruntime.dylib -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-generation-itt5on81/generation


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-generation-itt5on81/generation /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-generation-itt5on81/fixture

fixture: B read-only admission 미설정

exit: 1
cleanup: owned temporary root removed=True; no server/port
```

Generation 최초 실행은 컴파일 exit 0 후 fixture Open에서 `B read-only admission 미설정`으로 exit 1이었다. 기존 generation fixture가 요구하는 명시적 1MiB 읽기 한도와 100개 row/shard admission을 ManagedOptions에 지정한다. 제품 기본 한도·검사를 변경하지 않는다.

Generation 명시 admission fixture 보정 후 재검증:

```text
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -DGST_USE_UNSTABLE_API=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=0 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_LIBSODIUM=1 -DMEDIA_SERVER_USE_ONNXRUNTIME=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_PANGOCAIRO=1 -DMEDIA_SERVER_USE_SQLITE3=1 -I/Users/dhseo/Workspace/mediaServer/include -I/opt/homebrew/include/onnxruntime -isystem /opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/include/gio-unix-2.0 -isystem /opt/homebrew/Cellar/orc/0.4.42/include/orc-0.4 -isystem /opt/homebrew/Cellar/glib/2.86.4/include -isystem /Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi -isystem /opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include -isystem /opt/homebrew/opt/gettext/include -isystem /opt/homebrew/Cellar/pcre2/10.47_1/include -isystem /opt/homebrew/Cellar/pango/1.57.0_2/include/pango-1.0 -isystem /opt/homebrew/Cellar/cairo/1.18.4/include/cairo -isystem /opt/homebrew/Cellar/libxext/1.3.7/include -isystem /opt/homebrew/Cellar/xorgproto/2025.1/include -isystem /opt/homebrew/Cellar/libxrender/0.9.12/include -isystem /opt/homebrew/Cellar/libx11/1.8.13/include -isystem /opt/homebrew/Cellar/libxcb/1.17.0/include -isystem /opt/homebrew/Cellar/libxau/1.0.12/include -isystem /opt/homebrew/Cellar/libxdmcp/1.1.5/include -isystem /opt/homebrew/Cellar/pixman/0.46.4/include/pixman-1 -isystem /opt/homebrew/Cellar/fribidi/1.0.16/include/fribidi -isystem /opt/homebrew/Cellar/libthai/0.1.30/include -isystem /opt/homebrew/Cellar/libdatrie/0.2.14/include -isystem /opt/homebrew/Cellar/fontconfig/2.17.1/include -isystem /opt/homebrew/Cellar/harfbuzz/13.1.1/include/harfbuzz -isystem /opt/homebrew/opt/freetype/include/freetype2 -isystem /opt/homebrew/opt/libpng/include/libpng16 -isystem /opt/homebrew/opt/graphite2/include -isystem /opt/homebrew/Cellar/libsodium/1.0.21/include -isystem /opt/homebrew/Cellar/openssl@3/3.6.2/include scripts/internal/recording_search_generation_smoke.cpp /Users/dhseo/Workspace/mediaServer/build-gst-onnx/libmedia_server_runtime.a /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libz.tbd /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstrtspserver-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstapp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstwebrtc-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstsdp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstpbutils-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstaudio-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstvideo-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstbase-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstreamer-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpangocairo-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpango-1.0.dylib /opt/homebrew/Cellar/cairo/1.18.4/lib/libcairo.dylib /opt/homebrew/Cellar/harfbuzz/13.1.1/lib/libharfbuzz.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libgobject-2.0.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libglib-2.0.dylib /opt/homebrew/opt/gettext/lib/libintl.dylib /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libsqlite3.tbd /opt/homebrew/Cellar/libsodium/1.0.21/lib/libsodium.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libssl.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libcrypto.dylib /opt/homebrew/lib/libonnxruntime.dylib -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-generation-fixed-l2618nwn/generation


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-generation-fixed-l2618nwn/generation /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-generation-fixed-l2618nwn/fixture

fixture: B 읽기 catalog 소유권/경로 거부

exit: 1
cleanup: owned temporary root removed=True; no server/port
```

두 번째 generation 준비 실패는 `B 읽기 catalog 소유권/경로 거부`였다. `AttachGenerationCatalog`의 직접 조건에서 SQLite 경로를 root/recording-catalog.sqlite3로 제한함을 확인했다. fixture의 catalog.sqlite3를 해당 고정 이름으로 고친다. 최초·두 번째 실패는 검사 전 준비 실패이며 제품 PASS가 아니다.

Generation 고정 경로 보정 후 재검증:

```text
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -DGST_USE_UNSTABLE_API=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=0 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_LIBSODIUM=1 -DMEDIA_SERVER_USE_ONNXRUNTIME=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_PANGOCAIRO=1 -DMEDIA_SERVER_USE_SQLITE3=1 -I/Users/dhseo/Workspace/mediaServer/include -I/opt/homebrew/include/onnxruntime -isystem /opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/include/gio-unix-2.0 -isystem /opt/homebrew/Cellar/orc/0.4.42/include/orc-0.4 -isystem /opt/homebrew/Cellar/glib/2.86.4/include -isystem /Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi -isystem /opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include -isystem /opt/homebrew/opt/gettext/include -isystem /opt/homebrew/Cellar/pcre2/10.47_1/include -isystem /opt/homebrew/Cellar/pango/1.57.0_2/include/pango-1.0 -isystem /opt/homebrew/Cellar/cairo/1.18.4/include/cairo -isystem /opt/homebrew/Cellar/libxext/1.3.7/include -isystem /opt/homebrew/Cellar/xorgproto/2025.1/include -isystem /opt/homebrew/Cellar/libxrender/0.9.12/include -isystem /opt/homebrew/Cellar/libx11/1.8.13/include -isystem /opt/homebrew/Cellar/libxcb/1.17.0/include -isystem /opt/homebrew/Cellar/libxau/1.0.12/include -isystem /opt/homebrew/Cellar/libxdmcp/1.1.5/include -isystem /opt/homebrew/Cellar/pixman/0.46.4/include/pixman-1 -isystem /opt/homebrew/Cellar/fribidi/1.0.16/include/fribidi -isystem /opt/homebrew/Cellar/libthai/0.1.30/include -isystem /opt/homebrew/Cellar/libdatrie/0.2.14/include -isystem /opt/homebrew/Cellar/fontconfig/2.17.1/include -isystem /opt/homebrew/Cellar/harfbuzz/13.1.1/include/harfbuzz -isystem /opt/homebrew/opt/freetype/include/freetype2 -isystem /opt/homebrew/opt/libpng/include/libpng16 -isystem /opt/homebrew/opt/graphite2/include -isystem /opt/homebrew/Cellar/libsodium/1.0.21/include -isystem /opt/homebrew/Cellar/openssl@3/3.6.2/include scripts/internal/recording_search_generation_smoke.cpp /Users/dhseo/Workspace/mediaServer/build-gst-onnx/libmedia_server_runtime.a /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libz.tbd /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstrtspserver-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstapp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstwebrtc-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstsdp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstpbutils-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstaudio-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstvideo-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstbase-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstreamer-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpangocairo-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpango-1.0.dylib /opt/homebrew/Cellar/cairo/1.18.4/lib/libcairo.dylib /opt/homebrew/Cellar/harfbuzz/13.1.1/lib/libharfbuzz.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libgobject-2.0.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libglib-2.0.dylib /opt/homebrew/opt/gettext/lib/libintl.dylib /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libsqlite3.tbd /opt/homebrew/Cellar/libsodium/1.0.21/lib/libsodium.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libssl.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libcrypto.dylib /opt/homebrew/lib/libonnxruntime.dylib -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-generation-path-a64uv_s0/generation


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-generation-path-a64uv_s0/generation /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-generation-path-a64uv_s0/fixture
[pass] generation-search-refresh
[pass] generation-original-sample-exact-utc
[pass] generation-missing-original-stays-unplaced
[pass] generation-search-journal-unchanged
[pass] generation-search-refresh
[pass] generation-original-sample-exact-utc
[pass] generation-missing-original-stays-unplaced
[pass] generation-search-journal-unchanged
[pass] generation-reopen-rebuild-preserves-held-model
[pass] generation-search-refresh
[pass] generation-original-sample-exact-utc
[pass] generation-missing-original-stays-unplaced
[pass] generation-search-journal-unchanged
[pass] generation-reopen-rebuild-preserves-held-model
[search-generation] pass=14 fail=0


exit: 0
cleanup: owned temporary root removed=True; no server/port
```

### 3 저장소 연결 판정

- 최종 source smoke 35 PASS/0 FAIL, generation smoke 14 PASS/0 FAIL. 실제 카탈로그의 V1/V2/참조 관측, 관측 delta/이력 초과 재구축, scope 변경, 상태 손상, V2 삭제/tombstone, SQLite 사용/미사용 재개방을 확인했다.
- V2의 최초 2 FAIL과 generation 준비 실패 2건은 위에 원출력/원인/재검증을 연결했다. 제품 저장/삭제 정책 변경 없이 fixture 경로와 필수 admission을 바로잡았다.
- 검색 read model/source 구현은 04c008b7 그대로이며 이번 변경은 통합 검증과 기록이다. 각 실행의 소유 임시 루트 제거를 확인했다. 서버/포트 없음.
- 원장 바이트 불변은 검색/재구축 호출 전후를 비교했다. SQLite 파생 cache는 기존 카탈로그가 관리한다.
- 실제 프레임 재생/이벤트 우선/필터/API/UI는 후속 4~9 검증 대상이다. 릴리즈 장시간·UI 풀테스트 미실행.

최종 검사 source SHA-256:

```text
scripts/internal/recording_search_source_smoke.cpp 60e4ddcd215efc4074fbf6cd0c976a34a48b09eb65f27cf005a333cec520913b
scripts/internal/recording_search_generation_smoke.cpp 322bf6595b89096636a59722d8e710adf0b2c83f94f55ad601b5987baea5fe1d
scripts/internal/recording_catalog_generation_projection_smoke.cpp 17362fbda3e98e52bc9587725e499b658ea9e73e124d251b3188563a7d53514d
```

- 최종 `git diff --check`: exit 0. `node scripts/internal/verify_docs_links.mjs`: 295 Markdown/9,222 links, failures 0, exit 0. 이번 변경은 검사 source와 기록뿐이므로 production build/소유 graph 재실행은 하지 않았다.

### 4 필터 모델 focused 검사

source: 524a383d + query/filter worktree.

```text
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -Iinclude src/recording/recording_search_model.cpp scripts/internal/recording_search_filter_smoke.cpp -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-filter-34bno5a1/filter


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-filter-34bno5a1/filter
[pass] fixture-build
[pass] F01 camera-time returns intervals without analysis
[pass] F01 channel OR global stable order duplicate normalized
[pass] F02 F03 half-open UTC sampled person only
[pass] F03 object OR
[pass] F03 exact case no synonym
[pass] F04 F06 same-track observations never combine tags
[pass] F04 namespaces remain distinct hits
[pass] F06 F07 field AND list OR
[pass] F05 stored event reference exact
[pass] F08 event behaviour confirmed fact
[pass] F09 named scenario fact
[pass] F09 rule ID is not scenario name
[pass] F10 event behaviour require same event
[pass] F10 shared matching event
[pass] F08 missing event facts never inferred
[pass] F02 unknown separate after known
[pass] F02 separate counts
[pass] invalid query rejects atomically
[pass] invalid query rejects atomically
[pass] invalid query rejects atomically
[pass] invalid query rejects atomically
[pass] invalid query rejects atomically
[pass] invalid query rejects atomically
[pass] invalid query rejects atomically
[pass] invalid query rejects atomically
[pass] invalid query rejects atomically
[search-filter] pass=27 fail=0


exit: 0
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -Iinclude src/recording/recording_search_model.cpp scripts/internal/recording_search_model_smoke.cpp -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-filter-34bno5a1/model


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-filter-34bno5a1/model
[pass] M01 build
[pass] M01 known-desc/channel/id then unknown
[pass] M01 channel index and absent channel
[pass] M01 source immutable / normalized projection
[pass] M01 identity and unknown are preserved
[pass] M01 rebuild independent of input order
[pass] M02 duplicate cannot replace published model
[pass] M02 empty interval rejected atomically
[pass] M02 half-known interval rejected
[pass] M02 unlinked event fact rejected
[pass] M02 conflicting event facts rejected
[pass] M01 numeric track reuse does not merge sessions
[pass] M03 row limit overflow atomic
[pass] M03 row limit equality
[pass] M03 byte accounting baseline
[pass] M03 exact byte budget admitted
[pass] M03 one byte short rejected atomically
[pass] M02 invalid source rejected
[pass] M02 successful empty distinct from failed build
[pass] M01 retained immutable model survives replacements
[pass] L01 delta adds/updates/deletes and reorders exact expected ids
[pass] L02 removal changes new snapshot without mutating held pages
[pass] L01 stale predecessor requires rebuild
[pass] L02 restarted source cannot apply old lineage
[pass] L02 upsert/delete same id rejected atomically
[pass] L01 empty delta advances only revision
[pass] M03 scale explicit endpoints
[scale] rows=1 accountedBytes=2297 elapsedUs=9
[pass] M03 scale explicit endpoints
[scale] rows=1000 accountedBytes=2148149 elapsedUs=499
[pass] M03 scale explicit endpoints
[scale] rows=10000 accountedBytes=21480149 elapsedUs=2990
[pass] M03 default 100001 rows rejected before projection
[pass] M03 100000 valid rows still obey earlier 64MiB limit
[search-model] pass=31 fail=0


exit: 0
cleanup: owned temporary root removed=True; no server/port
```

- 필터 모델 27 PASS/0 FAIL, 기존 모델 31 PASS/0 FAIL. `cmake --build build-gst-onnx --target media_server_runtime -j2`: exit 0, 실제 runtime library build 성공.
- `git diff --check`: exit 0. `node scripts/internal/verify_docs_links.mjs`: failures 0, exit 0.
- 필터 모델은 channel/time/object/track/event/zone/rule/behaviour 조건을 구현했다. 실제 이벤트 저장소에서 channel/track/epoch 연결을 확인하여 event_facts를 주입하는 어댑터는 미완료다. 따라서 4단계 전체 PASS가 아니다.
- 원본 파일 I/O, API, UI, 장시간 검사는 실행하지 않았다. 임시 compiler/binary 경로 제거 확인.

필터 검사 source SHA-256:

```text
include/recording/recording_search_model.h 9fabc91f99bc65ae89588f9148994d4706cd8224483c61ac4b74af1d107b6aeb
src/recording/recording_search_model.cpp 41d26ff74cb5054a91e97e72b496873cec5ec98bf62edeae5d2113a308beda15
scripts/internal/recording_search_filter_smoke.cpp 9459ea555762e7ac6a8e397b3783ad93eb78701dbd0d5ff37d83ee2cdea6ab52
```

### 4 실제 이벤트 행동 근거 연결 검사

source: 6377486c + typed event/query join worktree.

```text
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -DGST_USE_UNSTABLE_API=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=0 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_LIBSODIUM=1 -DMEDIA_SERVER_USE_ONNXRUNTIME=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_PANGOCAIRO=1 -DMEDIA_SERVER_USE_SQLITE3=1 -I/Users/dhseo/Workspace/mediaServer/include -I/opt/homebrew/include/onnxruntime -isystem /opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/include/gio-unix-2.0 -isystem /opt/homebrew/Cellar/orc/0.4.42/include/orc-0.4 -isystem /opt/homebrew/Cellar/glib/2.86.4/include -isystem /Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi -isystem /opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include -isystem /opt/homebrew/opt/gettext/include -isystem /opt/homebrew/Cellar/pcre2/10.47_1/include -isystem /opt/homebrew/Cellar/pango/1.57.0_2/include/pango-1.0 -isystem /opt/homebrew/Cellar/cairo/1.18.4/include/cairo -isystem /opt/homebrew/Cellar/libxext/1.3.7/include -isystem /opt/homebrew/Cellar/xorgproto/2025.1/include -isystem /opt/homebrew/Cellar/libxrender/0.9.12/include -isystem /opt/homebrew/Cellar/libx11/1.8.13/include -isystem /opt/homebrew/Cellar/libxcb/1.17.0/include -isystem /opt/homebrew/Cellar/libxau/1.0.12/include -isystem /opt/homebrew/Cellar/libxdmcp/1.1.5/include -isystem /opt/homebrew/Cellar/pixman/0.46.4/include/pixman-1 -isystem /opt/homebrew/Cellar/fribidi/1.0.16/include/fribidi -isystem /opt/homebrew/Cellar/libthai/0.1.30/include -isystem /opt/homebrew/Cellar/libdatrie/0.2.14/include -isystem /opt/homebrew/Cellar/fontconfig/2.17.1/include -isystem /opt/homebrew/Cellar/harfbuzz/13.1.1/include/harfbuzz -isystem /opt/homebrew/opt/freetype/include/freetype2 -isystem /opt/homebrew/opt/libpng/include/libpng16 -isystem /opt/homebrew/opt/graphite2/include -isystem /opt/homebrew/Cellar/libsodium/1.0.21/include -isystem /opt/homebrew/Cellar/openssl@3/3.6.2/include scripts/internal/recording_search_events_smoke.cpp /Users/dhseo/Workspace/mediaServer/build-gst-onnx/libmedia_server_runtime.a /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libz.tbd /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstrtspserver-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstapp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstwebrtc-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstsdp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstpbutils-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstaudio-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstvideo-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstbase-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstreamer-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpangocairo-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpango-1.0.dylib /opt/homebrew/Cellar/cairo/1.18.4/lib/libcairo.dylib /opt/homebrew/Cellar/harfbuzz/13.1.1/lib/libharfbuzz.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libgobject-2.0.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libglib-2.0.dylib /opt/homebrew/opt/gettext/lib/libintl.dylib /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libsqlite3.tbd /opt/homebrew/Cellar/libsodium/1.0.21/lib/libsodium.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libssl.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libcrypto.dylib /opt/homebrew/lib/libonnxruntime.dylib -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-events-4nl8jw7t/events


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-events-4nl8jw7t/events /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-events-4nl8jw7t/fixture
[pass] typed real event storage facts
[pass] legacy JSON query unchanged
[pass] event source model
[pass] join requires linked id channel track epoch
[pass] stored scenario reaches behaviour filter
[pass] new search refreshes events without catalog revision change
[pass] identical event rows deduplicated
[pass] conflicting event identity rejected atomically
[pass] corrupt scan is not successful empty
[pass] partial scan rejected atomically
[pass] empty event store clears facts no inference
[pass] event row cap rejects partial facts
[search-events] pass=12 fail=0 error=search-event-evidence-incomplete


exit: 0
cleanup: owned temporary root removed=True; no server/port
```

행 한도보다 먼저 적용되는 byte 한도 사례 추가 후 재검증:

```text
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -DGST_USE_UNSTABLE_API=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=0 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_LIBSODIUM=1 -DMEDIA_SERVER_USE_ONNXRUNTIME=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_PANGOCAIRO=1 -DMEDIA_SERVER_USE_SQLITE3=1 -I/Users/dhseo/Workspace/mediaServer/include -I/opt/homebrew/include/onnxruntime -isystem /opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/include/gio-unix-2.0 -isystem /opt/homebrew/Cellar/orc/0.4.42/include/orc-0.4 -isystem /opt/homebrew/Cellar/glib/2.86.4/include -isystem /Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi -isystem /opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include -isystem /opt/homebrew/opt/gettext/include -isystem /opt/homebrew/Cellar/pcre2/10.47_1/include -isystem /opt/homebrew/Cellar/pango/1.57.0_2/include/pango-1.0 -isystem /opt/homebrew/Cellar/cairo/1.18.4/include/cairo -isystem /opt/homebrew/Cellar/libxext/1.3.7/include -isystem /opt/homebrew/Cellar/xorgproto/2025.1/include -isystem /opt/homebrew/Cellar/libxrender/0.9.12/include -isystem /opt/homebrew/Cellar/libx11/1.8.13/include -isystem /opt/homebrew/Cellar/libxcb/1.17.0/include -isystem /opt/homebrew/Cellar/libxau/1.0.12/include -isystem /opt/homebrew/Cellar/libxdmcp/1.1.5/include -isystem /opt/homebrew/Cellar/pixman/0.46.4/include/pixman-1 -isystem /opt/homebrew/Cellar/fribidi/1.0.16/include/fribidi -isystem /opt/homebrew/Cellar/libthai/0.1.30/include -isystem /opt/homebrew/Cellar/libdatrie/0.2.14/include -isystem /opt/homebrew/Cellar/fontconfig/2.17.1/include -isystem /opt/homebrew/Cellar/harfbuzz/13.1.1/include/harfbuzz -isystem /opt/homebrew/opt/freetype/include/freetype2 -isystem /opt/homebrew/opt/libpng/include/libpng16 -isystem /opt/homebrew/opt/graphite2/include -isystem /opt/homebrew/Cellar/libsodium/1.0.21/include -isystem /opt/homebrew/Cellar/openssl@3/3.6.2/include scripts/internal/recording_search_events_smoke.cpp /Users/dhseo/Workspace/mediaServer/build-gst-onnx/libmedia_server_runtime.a /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libz.tbd /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstrtspserver-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstapp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstwebrtc-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstsdp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstpbutils-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstaudio-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstvideo-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstbase-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstreamer-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpangocairo-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpango-1.0.dylib /opt/homebrew/Cellar/cairo/1.18.4/lib/libcairo.dylib /opt/homebrew/Cellar/harfbuzz/13.1.1/lib/libharfbuzz.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libgobject-2.0.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libglib-2.0.dylib /opt/homebrew/opt/gettext/lib/libintl.dylib /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libsqlite3.tbd /opt/homebrew/Cellar/libsodium/1.0.21/lib/libsodium.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libssl.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libcrypto.dylib /opt/homebrew/lib/libonnxruntime.dylib -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-event-budget-57m56_bc/events


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-event-budget-57m56_bc/events /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-event-budget-57m56_bc/fixture
[pass] typed real event storage facts
[pass] legacy JSON query unchanged
[pass] event source model
[pass] join requires linked id channel track epoch
[pass] stored scenario reaches behaviour filter
[pass] new search refreshes events without catalog revision change
[pass] identical event rows deduplicated
[pass] conflicting event identity rejected atomically
[pass] corrupt scan is not successful empty
[pass] partial scan rejected atomically
[pass] empty event store clears facts no inference
[pass] event row cap rejects partial facts
[pass] event byte cap rejects before row cap
[search-events] pass=13 fail=0 error=search-event-evidence-incomplete


exit: 0
cleanup: owned temporary root removed=True; no server/port
```

### 4 필터·행동 근거 판정

- 모델 필터 27개와 기존 모델 31개는 이전 실행에서 PASS. 이번 actual EventRecord 연결은 최종 13 PASS/0 FAIL, native compile/실행 exit 0. row/byte 상한, 손상/부분 줄, 충돌은 기대된 오류 응답을 확인한 음성 검사다.
- `cmake --build build-gst-onnx --target media_server_runtime -j2`: exit 0. 이벤트 저장소·application DTO·검색 reader와 실제 소비자 rebuild 성공.
- `node scripts/internal/verify_v390_structure_stabilization_execution.mjs --graph-only`: 4 PASS/0 FAIL, exit 0. 기존 소유 방향/정책/graph 변경 없음.
- `node scripts/internal/verify_docs_links.mjs`: 295 Markdown/9,222 links, failures 0, exit 0. `git diff --check`: exit 0.
- Typed 읽기와 기존 JSON 읽기는 같은 parser/파일 조회 경계를 쓴다. 검색만 최소 사실 vector와 8MiB admission을 사용하고 기존 기본 응답은 그대로다. 이벤트 누락은 추정하지 않으며 읽기 불완전/충돌은 명시 실패다.
- `WithEventFacts`는 검색 요청별로 갱신하는 application 연결이다. 신규 HTTP endpoint에서 catalog refresh와 이어 호출하는 구성은 8단계에 남는다. 현재 제품 API/UI 완료를 의미하지 않는다.
- 임시 실행 디렉터리 제거, EventStorage 종료 확인. 서버/포트/외부 호출 없음. 릴리즈용 테스트 미실행.

최종 source SHA-256:

```text
include/analysis/event_storage.h 34c5fc9afeee40c51cd95f1c789348f51d0ee2af5dc6f649c3ae89af62edf7b4
src/analysis/event_storage.cpp 5e6816e393f1f0811be478ef5cbb031680e9a61f27dfe44c43e431ef08fc2bf7
include/ingress/event_storage_application_service.h 007adda557b6592eb52a0068d880371f385917204f0b8fb117564bbc4301a456
src/ingress/event_storage_application_service.cpp 56c8b1e099f95c0f1db228b3cb660447f3416d4fc968ad71fc539d99edc48cf5
include/recording/recording_search_reader.h 6aeeebae2525c520d39264294c442e279ffa7f80a94a261074ab9ef9cd2b74e6
src/recording/recording_search_reader.cpp ca66f4dd0ef5c83e6ebe07e47bd9ceb08489a92e500b4d87b3197caad46772b1
scripts/internal/recording_search_events_smoke.cpp bbbaa33eefe2abb40ad2046e8e66be268aeb83e368b5eb894b41327e74a486f3
```

### 5 snapshot/cursor focused 첫 검사

source: 47fd2113 + snapshot pool worktree.

```text
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -Iinclude -DMEDIA_SERVER_USE_OPENSSL=1 src/recording/recording_search_model.cpp src/recording/recording_search_snapshots.cpp scripts/internal/recording_search_cursor_smoke.cpp -I/opt/homebrew/Cellar/openssl@3/3.6.2/include -L/opt/homebrew/Cellar/openssl@3/3.6.2/lib -lssl -lcrypto -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-cursor-4e8kl0ca/cursor1


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-cursor-4e8kl0ca/cursor1
[pass] fixture
[pass] first page stable ties and full counts
[pass] normalized equivalent query resumes
[pass] cursor replay idempotent
[pass] unknown last final page no cursor
[pass] other principal rejected atomically
[pass] scope change rejected
[pass] query change rejected
[pass] query change rejected
[pass] query change rejected
[pass] query change rejected
[pass] tampered MAC rejected
[pass] schema mismatch rejected
[pass] restart rejects prior server cursor
[pass] changed source fixture
[pass] new observation and removal do not mutate old membership
[pass] before expiry accepted
[pass] exact expiry rejected
[pass] snapshot count evicts oldest
[pass] byte limit failure output unchanged
[pass] empty successful page
[pass] expiry arithmetic overflow rejected
[search-cursor] pass=22 fail=0


exit: 0
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -Iinclude -DMEDIA_SERVER_USE_OPENSSL=0 src/recording/recording_search_model.cpp src/recording/recording_search_snapshots.cpp scripts/internal/recording_search_cursor_smoke.cpp -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-cursor-4e8kl0ca/cursor0


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-cursor-4e8kl0ca/cursor0
[pass] fixture
[pass] missing crypto fails closed
[search-cursor] pass=2 fail=0


exit: 0
cleanup: owned temporary root removed=True; no server/port
```

합산 byte 축출과 admission 실패 시 기존 snapshot 보존 사례 추가 재검증:

```text
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -Iinclude -DMEDIA_SERVER_USE_OPENSSL=1 src/recording/recording_search_model.cpp src/recording/recording_search_snapshots.cpp scripts/internal/recording_search_cursor_smoke.cpp -I/opt/homebrew/Cellar/openssl@3/3.6.2/include -L/opt/homebrew/Cellar/openssl@3/3.6.2/lib -lssl -lcrypto -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-cursor-budget-uur8xy0b/cursor


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-cursor-budget-uur8xy0b/cursor
[pass] fixture
[pass] first page stable ties and full counts
[pass] normalized equivalent query resumes
[pass] cursor replay idempotent
[pass] unknown last final page no cursor
[pass] other principal rejected atomically
[pass] scope change rejected
[pass] query change rejected
[pass] query change rejected
[pass] query change rejected
[pass] query change rejected
[pass] tampered MAC rejected
[pass] schema mismatch rejected
[pass] restart rejects prior server cursor
[pass] changed source fixture
[pass] new observation and removal do not mutate old membership
[pass] before expiry accepted
[pass] exact expiry rejected
[pass] snapshot count evicts oldest
[pass] aggregate byte budget evicts oldest
[pass] failed admission preserves existing snapshot
[pass] byte limit failure output unchanged
[pass] empty successful page
[pass] expiry arithmetic overflow rejected
[search-cursor] pass=24 fail=0


exit: 0
cleanup: owned temporary root removed=True; no server/port
```

### 5 snapshot/cursor 판정

- 최종 OpenSSL enabled focused 24 PASS/0 FAIL. OpenSSL disabled 분기는 첫 검사에서 2 PASS/0 FAIL로 서명 없는 cursor 발급 대신 명시 거부함을 확인했다. 신규 암호 라이브러리 설치 없음.
- SHA-256 정규화 질의 checksum과 principal/scope를 서버 snapshot에 보관하고, HMAC 인증 cursor는 schema·난수 snapshot ID·다음 위치에 결박한다. 서버 비밀키·보관 목록을 재시작 때 유지하지 않는다. checksum 자체를 권한 증명으로 쓰지 않는다.
- 5분 만료, 최대 8개/논리 합계 128MiB pool, FIFO 축출과 admission 원자 실패를 검사했다. 불변 모델 위치를 보관하므로 새 source의 삽입/삭제가 기존 페이지 멤버십과 건수를 바꾸지 않는다.
- 현재 사용자 권한과 원본 재생/삭제 상태를 매 요청에서 재검사하는 HTTP 구성은 8단계에 남는다. 현재 cursor 검사는 권한 시스템 전체 PASS가 아니다.
- `cmake --build build-gst-onnx --target media_server_runtime -j2`: exit 0, configure/generate/runtime build 성공.
- graph-only 4/4, CMake target separation 5/5, docs links failures 0, `git diff --check` exit 0. 현행 소유 graph와 execution currentGraph 연결만 갱신했다. 역사 완료 자료/정책은 유지했다.
- 각 native 실행의 임시 루트 제거 확인. 서버/포트/외부 호출 없음. 릴리즈용 검사 미실행.

최종 source SHA-256:

```text
include/recording/recording_search_snapshots.h d43d55334c609957e578142f0fbc4e15cdf8c677bc77d5254ef74692125ce2e7
src/recording/recording_search_snapshots.cpp b204640101448cf7b614fa579880df955c3a9e5fbbd4b394058c519e20b8913e
scripts/internal/recording_search_cursor_smoke.cpp 65b688cb5c4497337dcf6eb8fb06b00d602e60b7f9bac6edfb8d519ea8cc78f3
```

### 6 동일 원본 이벤트 우선 값 검사

source: 4680339f + precedence worktree.

```text
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -Iinclude src/recording/recording_search_precedence.cpp scripts/internal/recording_search_precedence_smoke.cpp -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-precedence-ss_gjfcw/precedence


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-precedence-ss_gjfcw/precedence
[pass] partial event preserves both uncovered original ranges
[pass] overlapping events stable ID priority
[pass] candidate order and duplicate invariant
[pass] unproven foreign unhealthy event cannot replace original
[pass] unproven foreign unhealthy event cannot replace original
[pass] unproven foreign unhealthy event cannot replace original
[pass] unproven foreign unhealthy event cannot replace original
[pass] unproven foreign unhealthy event cannot replace original
[pass] unproven foreign unhealthy event cannot replace original
[pass] unproven foreign unhealthy event cannot replace original
[pass] unproven foreign unhealthy event cannot replace original
[pass] observation point inside event
[pass] exclusive event end keeps original
[pass] full event clipped to original
[pass] missing original identity never inferred
[pass] invalid candidate rejects atomically
[pass] candidate cap explicit failure
[search-precedence] pass=17 fail=0


exit: 0
cleanup: owned temporary root removed=True; no server/port
```

- 우선 선택 값 검사 17 PASS/0 FAIL, native compile/실행 exit 0. source/store/epoch/segment/timebase가 같은 확인된 구간만 이벤트로 대체하며 잔여 구간을 원본으로 유지한다.
- `cmake --build build-gst-onnx --target media_server_runtime -j2`: exit 0. graph-only 4/4, CMake target separation 5/5, docs links failures 0, diff check exit 0.
- 현행 소유 graph/currentGraph hash·metrics만 갱신했다. 과거 실행/완료 자료와 의존 정책은 그대로다.
- 6단계 전체는 미완료다. candidate의 playable/provenance_verified는 값 입력이며 이번 검사만으로 실제 파일이 건강하다고 주장하지 않는다. 후속 adapter는 기존 RecordingReadService::QueryTimeline이 제공하는 현재 재생 판정과 원본 media-ns coverage를 재사용할 수 있음을 소스로 확인했다. 새 저장 형식이나 원장 직접 해석을 추가하지 않는다.
- 임시 compiler/binary 루트 제거 확인. 서버/포트 없음. 제품 UI/실제 재생/릴리즈용 검사 미실행.

최종 source SHA-256:

```text
include/recording/recording_search_precedence.h 335e407ef1716afb796b64b1d45f93a248f4904555410c855627e96656b7d04b
src/recording/recording_search_precedence.cpp 3f2e363f4007ddc2b46239570341256bb30d92130fc74b3b4a9a80e4da8623fb
scripts/internal/recording_search_precedence_smoke.cpp fdde33fa5dc3701b3715a11b83c36706258ff79d59a6cdcbe51459457dd05779
```

### 6 실제 파일/파생 출력 연결 검사

source: a9739dae + read-service/search adapter worktree.

```text
command: c++ -std=c++17 -Wall -Wextra -Werror -O2 -DGST_USE_UNSTABLE_API=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=0 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_LIBSODIUM=1 -DMEDIA_SERVER_USE_ONNXRUNTIME=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_PANGOCAIRO=1 -DMEDIA_SERVER_USE_SQLITE3=1 -I/Users/dhseo/Workspace/mediaServer/include -I/opt/homebrew/include/onnxruntime -isystem /opt/homebrew/Cellar/gstreamer/1.28.1/include/gstreamer-1.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/include/gio-unix-2.0 -isystem /opt/homebrew/Cellar/orc/0.4.42/include/orc-0.4 -isystem /opt/homebrew/Cellar/glib/2.86.4/include -isystem /Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk/usr/include/ffi -isystem /opt/homebrew/Cellar/glib/2.86.4/include/glib-2.0 -isystem /opt/homebrew/Cellar/glib/2.86.4/lib/glib-2.0/include -isystem /opt/homebrew/opt/gettext/include -isystem /opt/homebrew/Cellar/pcre2/10.47_1/include -isystem /opt/homebrew/Cellar/pango/1.57.0_2/include/pango-1.0 -isystem /opt/homebrew/Cellar/cairo/1.18.4/include/cairo -isystem /opt/homebrew/Cellar/libxext/1.3.7/include -isystem /opt/homebrew/Cellar/xorgproto/2025.1/include -isystem /opt/homebrew/Cellar/libxrender/0.9.12/include -isystem /opt/homebrew/Cellar/libx11/1.8.13/include -isystem /opt/homebrew/Cellar/libxcb/1.17.0/include -isystem /opt/homebrew/Cellar/libxau/1.0.12/include -isystem /opt/homebrew/Cellar/libxdmcp/1.1.5/include -isystem /opt/homebrew/Cellar/pixman/0.46.4/include/pixman-1 -isystem /opt/homebrew/Cellar/fribidi/1.0.16/include/fribidi -isystem /opt/homebrew/Cellar/libthai/0.1.30/include -isystem /opt/homebrew/Cellar/libdatrie/0.2.14/include -isystem /opt/homebrew/Cellar/fontconfig/2.17.1/include -isystem /opt/homebrew/Cellar/harfbuzz/13.1.1/include/harfbuzz -isystem /opt/homebrew/opt/freetype/include/freetype2 -isystem /opt/homebrew/opt/libpng/include/libpng16 -isystem /opt/homebrew/opt/graphite2/include -isystem /opt/homebrew/Cellar/libsodium/1.0.21/include -isystem /opt/homebrew/Cellar/openssl@3/3.6.2/include scripts/internal/recording_search_playback_smoke.cpp /Users/dhseo/Workspace/mediaServer/build-gst-onnx/libmedia_server_runtime.a /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libz.tbd /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstrtspserver-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstapp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstwebrtc-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstsdp-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstpbutils-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstaudio-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstvideo-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstbase-1.0.dylib /opt/homebrew/Cellar/gstreamer/1.28.1/lib/libgstreamer-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpangocairo-1.0.dylib /opt/homebrew/Cellar/pango/1.57.0_2/lib/libpango-1.0.dylib /opt/homebrew/Cellar/cairo/1.18.4/lib/libcairo.dylib /opt/homebrew/Cellar/harfbuzz/13.1.1/lib/libharfbuzz.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libgobject-2.0.dylib /opt/homebrew/Cellar/glib/2.86.4/lib/libglib-2.0.dylib /opt/homebrew/opt/gettext/lib/libintl.dylib /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libsqlite3.tbd /opt/homebrew/Cellar/libsodium/1.0.21/lib/libsodium.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libssl.dylib /opt/homebrew/Cellar/openssl@3/3.6.2/lib/libcrypto.dylib /opt/homebrew/lib/libonnxruntime.dylib -o /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-playback-g5azk2ly/playback


exit: 0
command: /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-playback-g5azk2ly/playback /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v420-playback-g5azk2ly/fixture
[pass] intent cannot replace source
[pass] completed job invalidates prior source view
[pass] actual completed outputs yield playable proven candidates
[pass] actual original coverage retains uncovered source tail
[pass] missing event file cannot supersede source
[pass] restored file is revalidated on new lookup
[pass] legacy timeline page limit unchanged
[search-playback] pass=7 fail=0

[recording] file evidence unavailable: file evidence profile/bound 오류
[recording] file evidence unavailable: file evidence profile/bound 오류
[recording] file evidence unavailable: file evidence profile/bound 오류

exit: 0
cleanup: owned temporary root removed=True; no server/port
```

- 첫 graph-only 검사 exit 1: `current:include-edge; policy:stored-witness-drift:application-service-interfaces -> domain-and-registry-owners`, 3 PASS/1 FAIL. search reader가 precedence header를 include하면서 허용된 방향의 실제 witness가 바뀌었다. 기존 generator로 현행 graph/currentGraph 연결을 갱신하고 재검사한다. 의존 허용 정책은 변경하지 않는다.

### 6 실제 연결 판정

- 실제 30-frame fixture, GStreamer writer, DerivedJobService와 현재 reader를 사용한 focused 7 PASS/0 FAIL. native compile/실행 exit 0. 값 선택 17개는 이전 단계 PASS이며 이번 변경은 그 입력을 실제 reader에 연결한다.
- 검색 전용 전체 timeline 조회는 기존 projection/파일 확인 구현을 재사용한다. 공개 page의 1,000행 상한은 그대로이며 검색은 최대 100,000행과 기존 projection 메모리 한도 안에서 total과 반환 수가 같아야 성공한다. 후보 원본 구간은 media-ns이며 UTC로 동등성을 추정하지 않는다.
- 조회 앞뒤 catalog 구조 revision을 검사한다. job 완료 등 구조 변경 시 기존 source model을 새 상태로 위장하지 않고 재구축을 요구한다. 출력 부재는 후보에서 제외하고 새 조회에서 재검사한다.
- `cmake --build build-gst-onnx --target media_server_runtime -j2`: exit 0. graph 첫 witness drift 1 FAIL은 현행 witness/hash만 갱신한 재검사 4/4 PASS로 해소했다. docs links failures 0, diff check exit 0.
- stderr의 `[recording] file evidence unavailable: file evidence profile/bound 오류` 3건은 fixture 원본 생성 중 기존 GStreamerSegmentWriter의 선택적 file-evidence 생성 경고다. 이벤트 출력 건강도/coverage 검사는 통과했으나 원본의 정확한 파일 presentation mapping까지 검증한 것은 아니다. 이 경고를 숨기지 않고 7단계 원본 seek 검증의 확인 대상으로 유지한다.
- 사용자 응답에 우선 선택 결과를 결합하는 8단계 HTTP 구성은 아직 미완료다. 6단계 검사는 실제 UI/seek·제품 전체 완료가 아니다.
- 동기 job 종료 후 소유 임시 저장소/영상/binary 제거 확인. 서버/포트 없음. 장시간/릴리즈 검사 미실행.

최종 source SHA-256:

```text
include/recording/recording_read_service.h 7d7395342744daac6fcba202d9ea634c439a496a113e4fade211ecbab60d7135
src/recording/recording_read_service.cpp f60c07e1b4d4fef74ace7f41911806277685b0fec5412633045ec0eefdd9a979
include/recording/recording_search_reader.h c42039e786cf6d9026a09be9c014e05f1a4124922ee71bd4be70287cc8941bc6
src/recording/recording_search_reader.cpp b197fcdd1b6b4e95ba370a8ce1e02695b4781710dbac220811ee66325f3ed7e8
scripts/internal/recording_search_playback_smoke.cpp 40734e6ad7d8dfd40bb8fcc5ac3ad16597630bd7261bba56434d473af8a9a7a5
scripts/internal/recording_public_timeline_smoke.cpp bfedfc8c45df5f0b58ea855b3382d642039776d37e653a9641f18e1a51377d4b
scripts/internal/recording_media_test_fixture.h 404784ececbb74556fa2e32975f879e2632a96311bc7ed0e41bce069d167b8a6
```
