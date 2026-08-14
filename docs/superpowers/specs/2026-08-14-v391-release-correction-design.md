# v3.9.1 Release Correction Design

## 목적

v3.9.0 공개 이후 확인된 tag completeness, public repository hygiene, 문서 current truth,
대표 UI 이미지 현재성, release evidence 구조 문제를 v3.9.1에서 정정한다. 기존 v3.9.0
signed tag와 GitHub Release는 역사적 사실로 보존하고 force update하지 않는다.

## 기준 상태

- 시작 branch: `main`
- 시작 commit: `7063480ae92b92b1d25dad29369de738749e3751`
- 새 release branch: `v3.9.1`
- 기존 `v3.9.0` tag target: `33c2ecdf`
- v3.9.0 tag 이후 동일 버전 변경: release notes, evidence index, closeout plan,
  semantic discovery verifier와 fixture
- 현재 버전 source-of-truth: `VERSION=3.9.0`, CMake project version `3.9.0`

## 설계 원칙

1. v3.9.0 tag와 GitHub Release를 수정하거나 삭제하지 않는다.
2. v3.9.1은 v3.9.0 이후의 repository correctness 변경을 모두 포함한다.
3. 최종 판정을 증명하는 bounded summary, manifest, hash와 필요한 screenshot은 보존한다.
4. 재현 가능한 raw log, registry, seed, port, trace, clip, snapshot은 공개 Git tree에서
   제거하거나 공개용 redacted summary로 대체한다.
5. historical FAIL/not-run 사실은 지우지 않는다. 공개 문서 색인에서는 제외하고,
   필요한 경우 history 문서나 최소 manifest에서 추적 가능하게 유지한다.
6. `/Users/<name>`, `/private/var/folders/...`, 실행별 `/tmp/...` 경로는 repository-relative
   path 또는 명시적인 placeholder로 정규화한다.
7. verifier가 검사하지 않는 조건을 PASS로 확대하지 않는다.
8. 테스트는 첫 실패에서 중단하며 뒤 단계는 `건너뜀`으로 기록한다.

## 변경 단위

### 1. 버전과 릴리즈 source-of-truth

- `VERSION`과 `CMakeLists.txt`를 `3.9.1`로 맞춘다.
- README 한국어/영문, docs index, backlog, release evidence index, test records의 현재
  release 상태를 v3.9.1 준비 상태로 정렬한다.
- v3.8.0 또는 v3.9.0 상태는 historical 문맥에서만 유지한다.
- v3.9.1 release notes source를 새로 두고 source-only scope, 수정 내용, 실제 검증,
  미실행·제외 항목을 구분한다.

### 2. 권한·dependency 문서 정정

- `/ops/users`는 admin-only로 README 한국어/영문 설명을 수정한다.
- GStreamer API namespace `1.0`과 최소 지원 버전 `1.28`을 구분한다.
- README, development guide, third-party notice, dependency snapshot, CMake constraint가
  동일한 최소 버전 의미를 전달하게 한다.

### 3. 공개 문서 정보구조

- `docs/README.md`는 제품, 설치, 운영, API, 보안, 통합 문서만 공개 진입점으로 유지한다.
- release test records, raw evidence, failure handoff, Superpowers plan/spec, generated test
  inventory를 public entry index에서 제거한다.
- README의 상세 verifier 목록은 대표 release verification 명령과 전용 문서 링크로
  축약한다.
- backlog, evidence index, test records는 각각 current summary, evidence pointer,
  execution history 역할을 분리한다.

### 4. 공개 evidence 최소화와 redaction

- `docs/release-artifacts`에서 최종 판정에 필요하지 않은 raw log, registry, seed, port,
  trace를 제거한다.
- 보존 파일은 결과 summary, first-failure 요약, manifest, policy evaluation, 직접 검토된
  screenshot과 hash-bound reference로 제한한다.
- 기존 verifier가 raw child 파일을 요구하면 verifier를 최소 evidence contract로 먼저
  변경하고 회귀 테스트를 추가한 뒤 파일을 정리한다.
- 모든 추적 텍스트에서 개인 absolute path와 ephemeral temp path를 정규화한다.
- 실패 실행의 존재와 최초 실패 원인은 유지하고, 성공 실행으로 덮어쓰지 않는다.

### 5. Public readiness fail-closed 보강

- public repository policy에 개인 home path, 공개 금지 raw artifact 종류, runtime auth
  registry 패턴을 추가한다.
- 2 MiB 초과 text JSON도 bounded streaming scan 또는 파일 형식별 scan 대상으로 만든다.
- 허용 대형 binary fixture는 명시 allowlist와 provenance를 요구한다.
- verifier contract test는 금지 path, raw registry, 대형 JSON 내부 secret pattern을 각각
  실제 fixture로 재현해 RED-GREEN으로 검증한다.

### 6. 대형 generated fixture와 artifact 중복

- 현재 verifier가 소비하는 generated fixture는 직접 삭제하지 않는다.
- canonical source에서 재생성 가능한 fixture는 먼저 compact canonical JSON으로 직렬화해
  기존 직접 JSON consumer 계약을 보존한다. compact 결과도 정책 상한을 넘는 경우에만
  release별 delta 또는 shard와 공용 loader를 도입한다.
- 동일 screenshot/raw output 중복은 한 개의 canonical artifact와 manifest hash 참조로
  축약한다.
- 구조 변경 뒤 모든 consumer와 digest contract가 같은 의미를 검증하는지 확인한다.

### 7. Runtime path와 workspace cleanup

- `.media_server.va_clips/`, `.media_server.va_snapshots/`를 `.gitignore`에 추가한다.
- 테스트 실행 전 현재 ignored runtime/build 산출물의 경로와 크기를 기록한다.
- credential-derived hash 또는 운영정보가 있는 runtime 파일은 공개 evidence로 복사하지
  않는다.
- 재현 가능한 `.media_server.test`, runtime JSONL/log, build output, cache를 정리한다.
- 모델과 명시적으로 보존할 sample fixture는 cleanup 대상에서 제외한다.

### 8. UI 문서 이미지

- `config/docs_ui_assets.json`의 managed asset 20개를 현재 v3.9.1 UI와 직접 대조한다.
- 제품 화면이 달라진 이미지는 현재 source로 재캡처하고 capturedAt/source binding을
  갱신한다.
- crop, 흐림, source/debug/raw JSON, credential, auth/session material 노출을 직접 확인한다.
- 정적 verifier PASS는 사람의 현재성 확인을 대체하지 않는다.

## 테스트 전략

### 수정 중 focused gate

1. 각 문서·policy 변경의 기존 verifier 또는 새 contract test를 먼저 실패시킨다.
2. 최소 수정 후 focused verifier를 통과시킨다.
3. 관련 consumer verifier를 함께 실행한다.
4. 각 변경 묶음마다 `git diff --check`를 실행한다.

### 릴리즈 검증 순서

1. version/release metadata와 docs link/assets 검증
2. public repository readiness와 새 negative contract fixtures
3. feature/script inventory와 v3.9 semantic verifier
4. `./server.sh build`
5. v3.9.1 clean clone preflight
6. 30분 server longrun
7. actual browser UI fulltest 424개와 Policy v4 qualification
8. 120분 server longrun
9. final evidence integrity와 cleanup 확인
10. release closeout dry-run

한 단계가 실패하면 그 시점에서 중단한다. 실패 명령, 최초 실패, 영향 범위와 뒤 단계
`건너뜀` 상태를 기록한다.

## 외부 release action 경계

이 설계의 현재 승인 범위는 branch 생성, 로컬 수정, cleanup과 테스트까지다. commit,
push, PR 생성, main merge, signed annotated `v3.9.1` tag, GitHub Release 생성,
published metadata 검증은 각각 사용자의 명시 승인을 받은 뒤 순서대로 수행한다.

## 완료 조건

- v3.9.1 branch에 위 변경 단위가 모두 반영되어 있다.
- 추적 텍스트에서 개인 home path와 금지 raw artifact가 발견되지 않는다.
- public readiness verifier가 대형 text 파일까지 fail-closed로 검사한다.
- 문서의 current release, role, dependency, test status가 직접 확인 사실과 일치한다.
- 관리 UI asset 20개의 현재성·안전성 직접 검토 기록이 있다.
- workspace 임시 산출물 cleanup 결과가 기록되어 있다.
- build, 30분, UI fulltest/Policy v4, 120분, clean clone acceptance가 새 v3.9.1 source
  commit에 결박된 fresh PASS evidence를 가진다.
- 미실행·제외·field smoke는 완료 evidence로 사용하지 않는다.

## 비목표

- v3.9.0 tag force update 또는 GitHub Release 삭제
- 기능 로직, API schema, event payload, media path 변경
- 외부 TURN/WHEP, ONVIF 실기기, cloud VLM provider를 credential 없이 실행
- 대형 fixture를 consumer 검증 없이 일괄 삭제
