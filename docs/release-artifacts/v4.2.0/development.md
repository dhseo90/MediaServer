# v4.2.0 개발 실행 기록

## 범위와 현재 상태

- 사용자 목표: 1~10 순차 개발, 단기 검증, 분할 커밋, 마지막 브랜치 push와 종합보고.
- 제외: 릴리즈용 30분·120분·UI 풀테스트·predev. 미실행이며 PASS가 아니다.
- 기준: `v4.2.0`, source `5990bbcc`, 작업 시작 시 clean. source version은 `4.1.1`.
- 계약: [개발 설계](../../superpowers/specs/2026-10-03-v420-structured-search-design.md).
- 정의: [V420 기능 ID](../../project-feature-test-inventory.md#v420-구조화-검색).
- 현재: 1 계약·조사·사전 정의 완료(`a8098ff3`), 2 불변 read model·채널/ID 인덱스와 단기 검증 완료.
  3은 revision 결박 증분 모델 갱신을 구현·단기 검증했다. 카탈로그 source adapter·실제 삭제/복구
  연결은 다음 작업이다. 3~10 미완료. 제품 완료·push 미수행.

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
