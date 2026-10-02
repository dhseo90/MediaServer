# v4.2.0 개발 실행 기록

## 범위와 현재 상태

- 사용자 목표: 1~10 순차 개발, 단기 검증, 분할 커밋, 마지막 브랜치 push와 종합보고.
- 제외: 릴리즈용 30분·120분·UI 풀테스트·predev. 미실행이며 PASS가 아니다.
- 기준: `v4.2.0`, source `5990bbcc`, 작업 시작 시 clean. source version은 `4.1.1`.
- 계약: [개발 설계](../../superpowers/specs/2026-10-03-v420-structured-search-design.md).
- 정의: [V420 기능 ID](../../project-feature-test-inventory.md#v420-구조화-검색).
- 현재: 1 계약·조사·사전 정의 완료(`a8098ff3`), 2 불변 read model·채널/ID 인덱스와 단기 검증 완료.
  3 카탈로그 adapter·증분 갱신·V2 mapping/삭제·generation 참조/재개방 연결을 단기 검증했다.
  다음은 4 필터와 이벤트 행동 근거 연결이다. 4~10 미완료. 제품 완료·push 미수행.

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
