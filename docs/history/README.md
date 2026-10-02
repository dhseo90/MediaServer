# 종료 기록 조회

현재 사용법·계약·미래 계획은 [문서 안내](../README.md)에서 찾습니다.
종료된 실행·검토 원본은 아래 보존 커밋의 원래 경로에서 읽을 수 있습니다.
과거 PASS/FAIL·미실행·관측 시각은 당시 기록이며 현재 소스의 실행 결과가 아닙니다.

## 보존 위치

아래 보존 커밋은 원격 `v4.1.1`의 확인된 기준
`9139f023d7d1b3937aa1ae90d941874171aee10a`에서 모두 도달할 수 있습니다.
이전에 로컬 전용으로 안내했던 기록도 이 이력에 포함됩니다. 원출력에 있는
“당시 push 미수행” 등의 provenance는 수정하지 않습니다.

| 버전·자료 | 원본 보존 commit | 원래 경로 |
| --- | --- | --- |
| v3.1.0~v3.8.0 및 v4.1.0 종료 실행, 초기 v4.1.1 문서 검사 | `0f85cec7ea066ff626f7b2983f924468467c9717` | `docs/release-artifacts/` 아래 해당 버전·실행 경로 |
| 현재 설명에 통합된 과거 UI 구현 문서 13개 | `0f85cec7ea066ff626f7b2983f924468467c9717` | 당시 `docs/v220-*.md`, `docs/v230-ui-renderer-module-decomposition.md` 중 정리 목록의 정확한 파일 |
| 이전 1,622개 정리 목록·최초 실패·재검증 | `d252e1fb241ab37af0509f18eac965dbb73decda` | `docs/release-artifacts/v4.1.1/closed-record-cleanup-20260929/result.json` |
| 임시 문서 리뷰와 1단계 결과 | `ca3e76e871d05577e6d461746a8918ac618a64a5` | `docs/documentation-review-2026-09-28.md`, `docs/release-artifacts/v4.1.1/backlog-roadmap-20260929/result.json` |
| 후보 범위·핵심 기록 의존 확인 | `1cc3bea3617cf0027c6773fe60f6eeeba7f14cf6` | `docs/release-artifacts/v4.1.1/core-record-dependencies-20260929/result.json` |

이 표는 같은 접두사의 모든 문서를 삭제했다는 뜻이 아닙니다. 현행 계약·회귀 입력·
출처 자료는 유지하며, 정확한 삭제 목록은 각 정리 커밋에서 확인합니다.
이미 정리한 1,622개를 이번에 다시 감사한 것으로 해석하지 않습니다.

## v4.1.1 개발 브랜치 마감

C1 소스·구조 확인, C2 독립 검토와 C3 적용·readback·coverage/readiness의 원본은
`4944ca5a6c42598adacb34adc08fceee7a762bc6`에 보존돼 있습니다.
다음 종료 자료 17개(3,227,847바이트)는 삭제 전 해당 커밋의 전체 바이트·SHA-256과 대조했습니다.
경로는 모두 `docs/release-artifacts/v4.1.1/` 아래입니다.

| 종료 자료 | 원래 경로 | 파일 수 |
| --- | --- | --- |
| 문서 링크·manifest 쓰기 경계 | `docs-links/result.json`, `manifest-write-boundary/result.json` | 2 |
| 중앙 기록 소비자 전환·제한 보완·명령 연결 | `central-record-migration-20260929/result.json`, `limited-review-fixes-20260929/result.json`, `command-binding-fix-20260930/result.json` | 3 |
| 제한 계약·수명 수정 | `limited-2a-contracts-20260930/result.json`, `limited-2b-boundaries-20260930/result.json` | 2 |
| C1 최초 결과·소비자 정합 | `structure-c1-20260930/result.json`, `structure-c1-consumers-20260930/result.json` | 2 |
| C2 수정 전후·재검토 준비 | `c2-review-fixes-20261001/result.json` | 1 |
| C2 검토 원본 6개와 C3 적용 결과 | `c3-approval-20261001/`의 JSON 7개 | 7 |

이번 3/4 문서·버전·삭제 검사의 최초 링크 실패와 재검증 원출력은
`90dba00492584612e74b6af057d80a6d43f58e35`의
`docs/release-artifacts/v4.1.1/stage3-closeout-20261001/result.json`에 보존했습니다.
이 추가 기록 1개(32,226바이트)도 Git 바이트 대조 뒤 현재 트리에서 제거했습니다.
최종 정리 확인은 정리 커밋 본문에, 푸시 확인은 작업 보고에 남깁니다.

C3 적용 원장 4개는 `ad562b309033b9ef4d50b7501fe267da23cf6a92`에 반영됐고
현재 `test/fixtures/`의 실행·검증 입력으로 유지합니다. 상세 승인 판단은 위 C3 보존 위치에서
조회하며 과거 수정 요청을 새 승인으로 덮지 않습니다. 이 소스 검토·정합 확인은 실제 UI나
장시간 실행을 대신하지 않습니다. 공개 조건은 [릴리즈 정책](../release-policy.md)을 따릅니다.

후보 원본은 기존 `.media_server.test` 입력에 그대로 남깁니다. 적용 audit과 후보는 JSON
내용이 같지만 직렬화 바이트가 다릅니다. C3 기록은 compact 재직렬화가 원본 바이트와
일치함을 확인한 사실과 후보 원본 파일 자체를 Git에 복사하지 않았다는 사실을 구분합니다.
원본의 Git 바이트 보존을 확인하지 않은 ignored 입력은 이번 정리 대상이 아닙니다.

과거 계획·completion snapshot·회귀 fixture·출처 중 현재 검사가 참조하는 자료도 유지합니다.
예를 들어 구조 handoff 계획은 readiness의 입력이며, v3.9.0 감사·인계 문서는 현행 discovery
fixture에 연결돼 있습니다. 해당 소비자나 fixture를 바꾸는 작업은 이번 정리 범위가 아닙니다.
이력 조회가 필요하다는 이유로 삭제한 로그를 일반 검사 입력으로 되돌리지 않습니다.

## 작업 파일을 덮어쓰지 않고 읽기

저장소 루트에서 실제 보존 커밋의 원본을 조회하는 예입니다.

```sh
git show 4944ca5a6c42598adacb34adc08fceee7a762bc6:docs/release-artifacts/v4.1.1/c3-approval-20261001/result.json
git show 4944ca5a6c42598adacb34adc08fceee7a762bc6:docs/release-artifacts/v4.1.1/c3-approval-20261001/independent-decisions.c2-recheck.json
git show 4944ca5a6c42598adacb34adc08fceee7a762bc6:docs/release-artifacts/v4.1.1/c2-review-fixes-20261001/result.json
git show d252e1fb241ab37af0509f18eac965dbb73decda:docs/release-artifacts/v4.1.1/closed-record-cleanup-20260929/result.json
git log --all -- docs/v220-ui-architecture-inventory.md
git archive 0f85cec7ea066ff626f7b2983f924468467c9717 docs/release-artifacts/v3.1.0 | tar -tf -
```

파일이 필요한 경우 별도 빈 디렉터리에 추출하고 현재 작업 트리를 덮어쓰지 않습니다.
shallow clone이나 source archive에는 해당 커밋이 없을 수 있습니다. 과거 기록 조회가
불가능해도 일반 빌드·현재 테스트를 위해 과거 로그나 로컬 ignored 자료를 복원하지 않습니다.
현재 트리 정리는 Git 이력 자체의 용량을 줄이는 작업이 아닙니다.

## 중앙 기록과 backlog 종료 본문

세 원본은 보존 커밋 `68566d63b13396b359a3b493a5b7e4d8a70015d6`에 있으며
위 원격 기준의 부모 이력에 포함됩니다. 삭제·축약 전에 전체 바이트를 대조한 자료입니다.

- `docs/development-backlog.md`: 종료 개발 이력. 현재 미완료는 현행 [backlog](../development-backlog.md)에 둡니다.
- `docs/release-test-records.md`: 버전별 최초 실패·재검증·개별 실행 결과.
- `docs/release-evidence-index.md`: 당시 증거 연결과 중복 실행 요약.

```sh
git show 68566d63b13396b359a3b493a5b7e4d8a70015d6:docs/release-test-records.md
git show 68566d63b13396b359a3b493a5b7e4d8a70015d6:docs/release-evidence-index.md
git show 68566d63b13396b359a3b493a5b7e4d8a70015d6:docs/development-backlog.md
```

원문의 절 제목과 기능 ID로 검색합니다. 과거 `approved`/`closed`는 당시 상태이며,
일반 회귀는 현행 정의와 출처가 있는 fixture를 사용하고 이 원장을 자동 복원하지 않습니다.

## v4.1.1 릴리즈 재시도 원본

다음은 릴리즈 재시도와 후속 녹화·진단의 Git 보존 위치다. 각 기록의 PASS·FAIL·부분 실행을
구분하며 표에 있다는 사실만으로 실행 성공이나 공개를 뜻하지 않는다.
경로는 `docs/release-artifacts/v4.1.1/` 기준이다.

| 자료 | 보존 commit | 원래 경로 |
| --- | --- | --- |
| 최초 acceptance 실패 원본 18개 | `a24988c6a0d0a44208edd9039f1f5d84bc88e4ea` | `test-acceptance-current-final/` |
| 주석 보정 확인과 157개 자체검사 실패 원본 3개 | `1a77dd0f131829a43424c39f33bf5dcb586c1c4a` | `comment-resume-20261001/` |
| 입력 대역·현행 문서 연결 수정, 970개 자체검사, 37개 독립 판단과 결속 원본 30개 | `ad8e58557746deea81fcebc9756c4ed718b369fe` | `fixture-resume-20261001/` |
| 재시도 acceptance 실패·기본 녹화 저장소 생성·정리 원본 60개 | `74dd820fbebcfeafe69462e23d82873509dd0251` | `test-acceptance-current-final/` |
| 현재 입력·자식 녹화 격리 보완, 14개 독립 판단·재검토와 결속 원본 89개 | `3f1b10336e068c587138c3747fb8135dd4a76954` | `input-isolation-resume-20261001/` |
| script inventory 중단의 acceptance 원본 55개 | `a7144f6ef9a41057fb478dc900dbe10247472cd1` | `test-acceptance-current-final/` |
| 종료 로그 독립 분류 수정·집중 검증·출력 정리 후 확인 21개 | `f2547831bef8c2822a2f2ceff2e075e31b4cc989` (최초 보존 `a0f45b8b42ab0b41a35b309758e4cfefca7612fb`) | `script-inventory-resume-20261001/` |
| 30분·UI 424개 실행 후 Policy 문구 검증 실패 원본 4,620개 | `864b4c9cfe8683c6b81f9e5e3628701cfc93553f` | `test-acceptance-current-final/`의 `preservation-manifest.json`과 대응 보존 파일 |
| 체크리스트 문구 보완의 기본 검사·결속 불변·이전 출력 정리 확인 11개 | `0478d1274d3e12cfbe87a138ebdaab9a57ece61a` | `policy-wording-resume-20261001/` |
| 30분·UI 424개·Policy 통과 후 120분 선행 codec probe timeout 원본 4,640개 | `f46f941002ff7d4df8055b47e58723cf1dc521b1` | `test-acceptance-current-final/`의 `preservation-manifest.json`과 대응 보존 파일 |
| HTTP 단독 미재현 진단 9개 | `473d92a5f6261b7e9214db7c404995f8aa5feba1` | `codec-opus-diagnosis-20261001/` |
| 같은 서버 선행 6개 source 이력 포함 미재현 대조 24개 | `c56f471b85a32ea5e9572e291004147470fa195b` | `codec-opus-history-comparison-20261001/` |
| 일반 acceptance PASS·녹화 최초 링크 FAIL 및 대조·정리 4,703개 | `0cfc7cc0d932ad69ed7db094ebf40739fe83244e` (최초 보존 `1ba16587996162d842a27a38cb57b669c5040e9d`) | `test-acceptance-current-final/` |
| finalize/timeline PASS·HTTP seed 컴파일 FAIL 및 대조·정리 30개 | `71b423d4cfafa56fcbe2fea7812752d07d87c22a` (최초 보존 `e437daa0dd127114995cd78d276500273da55f08`) | `recording-short-resume-20261002/` |
| HTTP seed·API/Auth/lifecycle/composition PASS·actual-app ENOENT 및 대조·정리 27개 | `48486f527cd7ec122a8165d4dd9d8edfc2908d09` (최초 보존 `be77cbbd4d05cbe0c372ee864464992c3c067ae2`) | `recording-current-resume-20261002/` |
| live budget 보완·current-integration PASS 및 대조·정리 49개 | `ce0d01e2b964cdcde27360b2f533039499ed2941` (최초 보존 `85c4af91ecaa39c4f7a78f08fabbc213a2cd2333`) | `recording-live-budget-20261002/` |
| 녹화 UI 8개 ID·31개 action PASS·42개 캡처 검토 및 대조·정리 106개 | `860aa46b4d616291e0fad5cadb17ea127ebf2dc8` (최초 보존 `efc76b11126afb811fa4be0543ab5e8b0a548068`) | `recording-ui-20261002/` |
| 녹화120분 기능·저장·재기동·cleanup PASS·자원 승인 보류 및 대조·정리 20개 | `6297af4b9fb0a7d5394a9af2cb34e5aff02c7ac0` (최초 보존 `b6d35b4ea5f0b6dcc0357d556c84b001d522e22c`) | `recording-longrun-20261002/` |
| RSS 보유·회수 진단 및 대조·정리 29개 | `0749ba019e50aeb4aa18f651577cea5f2481d6d8` (최초 보존 `3fb33ef09a59a78e0a036c3f10b0677ad4d1ed6f`) | `recording-rss-diagnosis-20261002/` |
| footprint 보완·live 할당 부분 수집 및 대조·정리 22개 | `c4995e0ee2c912c3bf15923f369cc282b0a5fcfb` (최초 보존 `bf81919f0ac3bc1b9726ce22f01f2aa1d4933149`) | `recording-rss-followup-20261002/` |

최초 실패 출력 18개와 다음 재시도 실패 출력 60개·55개는 각각 위 Git 원본의 바이트·hash를 대조한 뒤 고정 출력 경로에서 제거했다.
같은 경로의 새 실행 결과와 최초 실패는 commit·실행 source·run ID로 구분한다.
나머지 보존 자료와 ignored 검토 원본은 당시 재실행 준비에서 삭제하지 않았다.

`864b4c9c`의 텍스트 원본은 무손실 gzip, PNG는 원래 바이트로 보존했다. 대응표의 원래 경로와
SHA-256을 사용해 Git blob을 읽고 압축을 풀면 원본을 확인할 수 있다. 4,620개 전체를 Git에서
재조회해 원본 336,871,064바이트와 대조한 뒤 이 실행의 미추적 중복 원출력 4,404개만 제거했다.
이 실행은 Policy 문구 검증에서 중단됐으며 전체 acceptance·릴리즈 PASS가 아니다.
다음 문구 보완 후 재실행 준비에서는 위 압축본·PNG와 요약·대조 기록 4,623개를
`8df9909e3bc60cee1cde45d47ed7a40e114aafc2`의 바이트와 확인해 고정 출력 경로에서 제거했다.
최초 실행 원본과 판정은 위 보존 커밋에서 조회하며, 새 실행 결과와 합치지 않는다.

`f46f9410`도 gzip 보존 바이트와 압축 해제 원본 SHA-256을 구분한다. 전체 원본
337,075,169바이트를 Git에서 대조한 뒤 미추적 중복 4,423개만 정리했다. 커밋된 실행 자료는
당시 유지했으며 최종 트리의 종료 자료 삭제와 구분한다. 120분 반복과
별도 녹화 8개 ID·31개 조작, 공개 절차는 이 실패 뒤 실행하지 않았다.

표준 acceptance의 제한 재시도 준비에서 위 고정 출력 4,643개를 정리했다.
`2087044eed0674335d8fb6929d55adc0eb3958d9`의 완료된 원본 대조 기록과 현재 저장 Git 객체가
동일함을 확인했으며, 변경되거나 보존 범위에서 빠진 파일은 없었다. 최초 timeout 원본은
`f46f9410`, 완료된 대조 기록은 `2087044e`에서 조회한다. HTTP 단독 미재현 진단
`473d92a5`와 선행 source 이력 대조 `c56f471b`는 위 표의 별도 보존 경로에서 조회한다.
이번 출력 정리는 최초 FAIL의 취소나 원인 해결을 뜻하지 않는다.

표준 조건의 제한 재시도 대상은 `c888ac9baf613c773cbd8bb14bb547d3a3e4cc3a`이며,
새 실행 증거는 `1ba16587996162d842a27a38cb57b669c5040e9d`의 같은 고정 출력 경로에 보존했다.
빌드·36개 기능 검사·30분(20회)·기본 UI 424개 적격 판정·120분(80회)은 통과했다.
최초 `/opus` timeout은 이번에 재발하지 않았지만 원인은 미확정이며 이전 FAIL과 두 진단을 유지한다.
후속 녹화 finalize 통합 검사는 기존 snapshot 구현의 링크 누락으로 실패했다.
녹화 UI 8개 ID·31개 조작과 나머지 녹화 보완 검사는 실행하지 않았으며 공개 절차도 수행하지 않았다.
새 보존 표현 4,700개(정제본과 원본 관계는 별도 provenance)의 339,244,521바이트를 Git에서 대조하고
미추적 중복 4,480개와 해당 실행 소유 임시 자료만 정리했다. 당시 커밋된 증거는 실패 후속 판단을 위해 유지했다.

### 종료 자료의 최신 트리 정리

추가 메모리 진단 종료 후 위 범위에 남아 있던 15개 run의 5,173개 파일,
저장 표현 기준 51,434,878바이트를 별도 정리 커밋에서 삭제했다. 정확한 파일 목록은 그 커밋의
삭제 diff이며, 전체 집합은 원격 기준 `9139f023d7d1b3937aa1ae90d941874171aee10a`와
위 run별 보존 커밋의 같은 경로에서 조회할 수 있다. 기존 manifest/readback을 재사용하고
현재 바이트의 Git blob ID·크기·객체 존재와 보존 커밋의 도달 가능성을 확인했다.
동일 원본을 재복사·재압축하거나 수천 개 gzip을 다시 해제하지 않았다.

보존 표현은 원본 JSON/PNG·원출력, 무손실 gzip, 정제본·선택 발췌, hash만 남은 자료로 구분한다.
각 manifest 또는 result의 provenance가 그 경계다. 특히 RSS 진단 gzip은 정제 텍스트의 무손실
표현이며 private 원문과 같은 바이트가 아니다. 추가 스택 진단은 16MiB 출력 수집 한도로
부분 중단됐고 완전한 원문 대신 hash와 선택된 완결 스택의 정제 발췌만 보존했다.
미수집 꼬리와 해당 run의 off 관측은 존재하지 않으며 제품 OOM·녹화 assertion 실패로 바꾸지 않는다.

삭제 대상에 현행 fixture·계약·빌드 입력은 없었다. 최종 무결성 검사의 실행별 산출물 입력과
일반 검사에 필요한 현행 입력을 구분했으며, 릴리즈 launcher는 새 출력 디렉터리를 직접 생성한다.
녹화 wrapper가 요구하는 v4.1.0 receipt 디렉터리와 기존 내용, 현재 승인 원장·기능 정의·정책·fixture·
baseline, `.media_server.test`의 ignored 검토 입력과 사용자·기본 저장소는 유지한다.
이번 범위에서 보존 또는 역할 미확인으로 남긴 파일은 없다.

일반 acceptance·UI432·녹화 단기·녹화120분의 기존 결과와 과거 FAIL은 그대로다.
현재 판단은 [릴리즈 노트](../release-notes-v4.1.1.md#검증과-공개-상태)와
[미해결 메모리 운영 한계](../development-backlog.md#녹화-누적-이력의-메모리-운영-한계)에 둔다.
이번 정리는 자원 안정성 승인·운영 위험 수용·릴리즈 공개가 아니다.

```sh
git show 0cfc7cc0d932ad69ed7db094ebf40739fe83244e:docs/release-artifacts/v4.1.1/test-acceptance-current-final/release-attempt.json
git show c4995e0ee2c912c3bf15923f369cc282b0a5fcfb:docs/release-artifacts/v4.1.1/recording-rss-followup-20261002/review.md
git show 9139f023d7d1b3937aa1ae90d941874171aee10a:docs/release-artifacts/v4.1.1/recording-rss-followup-20261002/readback-cleanup.json
```
