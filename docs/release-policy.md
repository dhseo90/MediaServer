# 릴리즈 정책

릴리즈 담당자가 배포 범위, 검증, 기록 보존, 서명과 공개 순서를 판단하는 현행 정책이다.
권한·기록 수명의 상위 기준은 [AGENTS](../AGENTS.md), 버전 의미는
[버전 정책](versioning-policy.md)이다. 명령별 검증 방법은
[검증 정책과 명령](stream-verification.md#검증-정책)에 둔다.

## 소스와 기록된 공개 상태

아래 `release-metadata`는 이 문서의 유일한 기계 판정 원본이다.
`VERSION`·CMake의 소스 버전, 공개 진입점, 릴리즈 노트·로드맵 연결을 대조한다.
`releaseTarget`은 목표이고, `published`는 `observedAt` 당시의 공개 관측이다.
로컬 문서 검사나 문서 정리만으로 버전·관측 시각을 올리거나 현재 원격 상태를 재확인했다고 하지 않는다.

<!-- release-metadata -->
```json
{
  "schema": "media-server.release-context.v1",
  "repository": "dhseo90/MediaServer",
  "releaseTarget": "v4.3.0",
  "priorPublishedTag": "v4.2.0",
  "releaseNotes": "docs/release-notes-v4.3.0.md",
  "roadmap": "docs/v410-v49-recording-search-roadmap.md",
  "distribution": "source-only",
  "tagType": "signed-annotated",
  "published": {
    "tag": "v4.3.0",
    "url": "https://github.com/dhseo90/MediaServer/releases/tag/v4.3.0",
    "observedAt": "2026-10-04T09:36:44.509Z"
  }
}
```

현재 소스·공개 목표는 v4.3.0이며 [릴리즈 노트](release-notes-v4.3.0.md)에 개발 범위와 제한을 설명한다.
로컬 릴리즈 검증과 PR #77·병합 main의 required CI를 통과했다.
v4.3.0 source-only Release의 Latest·URL·원격 태그와 GitHub 서명 검증을 확인했다.
`priorPublishedTag`는 이전 공개 v4.2.0이며, 위 `published`는 이번 공개 확인의 관측 시각과 URL이다.
공개 태그는 `2e49046c7a305d92efe3ecf8e9287bcadd7f5479`에 고정하고 이후 관측 기록 유지보수와 구분한다.
[녹화·검색 로드맵](v410-v49-recording-search-roadmap.md)의 구현·잔여 계획과
[GitHub Latest](https://github.com/dhseo90/MediaServer/releases/latest)의 공개 상태를 구분한다.

## 배포 범위

- 기본 공개는 Apache-2.0 소스와 문서 중심의 `source-only`다. 녹화 기능 미구현이나
  live-only라는 뜻이 아니다. 제품 지원 범위는 [설정 참조](config-reference.md)와 릴리즈 노트를 따른다.
- 별도 승인 전 binary/app bundle, container image, offline package를 릴리즈 asset으로 올리지 않는다.
  FFmpeg/FFprobe/libav*, x264/x265, GStreamer GPL-risk plugin, ONNX Runtime package,
  YOLO/Re-ID/VLM model binary와 생성 sample pack도 기본 업로드 대상이 아니다.
- 운영 auth store·credential·token·로그·snapshot·고객/현장 영상·운영 evidence bundle은
  공개하지 않는다. 저장소에 허용된 재현 fixture와 정제 증거의 범위는
  [공개 저장소 검토](public-repo-final-review.md), 출처는 [sample provenance](sample-fixture-provenance.md)를 따른다.
- 별도 binary/runtime/model 후보는 [배포 정책](distribution-policy.md)의 라이선스·source offer·
  attribution·model provenance·checksum 기준과 RC gate를 충족해야 한다.
  [LICENSE](../LICENSE), [NOTICE](../NOTICE), [제3자 고지](../THIRD_PARTY_NOTICES.md)를 유지한다.

## 승인과 실행 경계

stage/commit, push, PR 생성·갱신, main 병합, tag 생성·push, GitHub Release 생성·갱신,
브랜치 생성·삭제, 후속 버전 개발은 각각 해당 범위의 사용자 승인을 확인한다.
승인이 철회·대체되지 않았다면 같은 승인을 반복 요구하지 않지만, `릴리즈 준비`·goal·
dry-run·검증 PASS에서 새로운 권한을 추정하지 않는다.
tag 삭제·교체, force push, Release 삭제, merge revert 등 rollback도 별도 승인 대상이다.

장시간·`verify-predev`·실제 UI 풀테스트는 명시 실행 승인이 필요하다.
ONVIF 실기기, 외부 TURN/WHEP, cloud/VLM provider, 실제 YouTube URL, 외부 알림 전송은
필요한 endpoint·credential·승인과 실제 결과가 있을 때만 해당 범위의 성공을 보고한다.
no-device·loopback·fixture·문서 gate를 실장비/외부 서비스 성공으로 승격하거나
사용자가 제외한 외부 실행을 자동으로 릴리즈 필수 항목에 추가하지 않는다.

## 출시 전 검증 판정

1. 현재 cut의 필수 build/Auth/media gate와 변경 기능·영향 회귀를
   [기능별 테스트 정의](project-feature-test-inventory.md)의 ID, route/control/action,
   독립 기대값과 연결해 검증한다. Auth/Role/Scope·viewer 비노출,
   API/Event POST/WebRTC/SSE/WS 계약과 RTSP/WebRTC 미디어 수명 등 영향받는 불변 계약을 확인한다.
2. 안정화, 30분, 120분, 실제 UI는 별개다. 안정화 실패 뒤 장시간/UI로 진행하지 않는다.
   30분과 실제 UI는 버전/릴리즈 완료의 필수 증거다. 미실행·FAIL·미확인은 blocker이며,
   이를 알고 강제 진행하라는 최신 명시 승인 없이는 릴리즈하지 않는다.
3. 120분은 사용자 지시, 현재 필수 gate, 변경 기능의 직접 매핑, 미디어 경로·source worker·
   shared stream·runtime/metadata fanout·cleanup/port 수명 변경 또는 누수/drift 신호로
   필요성을 판정하고 실행 승인을 별도로 확인한다. `--run-120` 자체는 필요성의 근거가 아니다.
4. 기존 증거는 diff·source·환경·검증 경계로 유지/부분 무효/전체 무효를 판단한다.
   문서 변경마다 30분/UI 전체를 폐기하거나 과거 명령명만으로 추가 장시간 실행을 요구하지 않는다.
   반대로 공통 인증·미디어·수명·판정 경계가 바뀐 증거를 근거 없이 유지하지 않는다.
5. 최초 실패의 명령·기대/관측·exit·원출력을 보존한다. 후속 단계는 보류하고 승인 범위의
   안전한 수정과 재검증을 연결한다. timeout 확대·검사 제거·미승인 대체로 PASS를 만들지 않는다.
   미실행·부분·제외·미확인은 PASS와 구분하며 cleanup 미확인도 완료 blocker다.

실행 준비·Auth 임시 비밀번호 주입·격리 저장소·프로세스/포트 정리는
[검증 정책](stream-verification.md#검증-정책)을 따른다. 운영 계정·저장소를 검증에 재사용하지 않는다.
`./test_release.sh`는 실제 acceptance 진입점이며 승인된 전체 범위에서만 실행한다.
내부 `verify-v390-test-acceptance-bundle`과 준비 검사는 구별한다.
기존 `verify-predev --soak-minutes`와 `verify-v390-server-longrun --duration-minutes`의
30분/120분 증거는 각 실행의 승인·source·측정·실패 전파 경계로 판단한다.
`media-server.runtime-media-longrun-trigger-matrix.v1`의 정의나 runner contract PASS만으로
실제 경과시간·iteration·자원·정리 측정을 대신하지 않는다.

### 실제 UI와 대표 이미지

UI 판정은 [Policy v4](manual-ui-fulltest.md#policy-v4-증거-적격-기준)를 따른다.
`direct-browser`, `qualified-native-automation`, `hybrid` 중 실제 적격 evidence를 사용하며,
현재 source에 결속된 exact ID 전수의 조작·completion oracle·역할/scope·viewport/theme를 대조한다.
fail/notRun/unsupported/unapproved exclusion/manual intervention은 0이어야 하고,
반응형·시각·client redaction·video/overlay·accessibility·cleanup을 모두 충족해야 한다.
고정된 과거 case 개수를 현행 전수로 간주하지 않는다.

실파일의 bytes/SHA-256/type/path containment와 case·correlation 결속, image decode,
trace/payload schema 및 독립 민감정보 scan이 필요하다. PNG signature·임의 JSON·문자열 경로나
summary의 자기선언은 증거가 아니다. `verify-ui-fulltest-evidence-policy-v4`의
`policyValidationResult`와 실제 `uiFulltestPass=true`는 별개이며 과거 evidence를 소급 승격하지 않는다.

대표 이미지는 [UI 자산 안내](assets/ui/README.md)와 `config/docs_ui_assets.json`으로 관리한다.
`verify-docs-ui-assets`·`verify-v290-public-docs-assets-refresh`는 연결·정합성 검사이지 재촬영이나
실제 시각 검수·UI 풀테스트가 아니다. 교체 이미지는 viewport/control/timeline/overlay를 자르지 않고
모바일·데스크톱 가독성과 비밀·viewer 비노출을 직접 확인한다.
[시각 기준 승인 양식](ui-visual-release-baseline-approval-template.md)의 독립 검토도 생략하지 않는다.

## 실행 기록의 보존과 정리

개발 중 결과는 버전/run 단위 한 곳에 유지한다. 기본 위치는
`docs/release-artifacts/<version>/<run-id>/`이며 도구의 output 계약을 따른다.
명령·대상 source/환경·exit·개별 결과·필요한 stdout/stderr·최초 실패→재검증·cleanup을
연결한다. 실제 측정한 token/elapsed/source만 기록하고 미집계 값을 만들지 않는다.
inventory/fixture는 현재 테스트 정의이며 실행 결과 원장이 아니다. 구조화 전수 결과가 있으면
같은 표를 checklist/template/roadmap에 복사하지 않고 링크와 짧은 요약만 둔다.

사용자가 승인한 버전 마감/기록 정리 범위에서 다음 순서를 지킨다.

1. 현행 계약, 설계 선택 이유, 알려진 제한·미해결·미래 계획, 현재 fixture/golden/baseline,
   출처/라이선스를 먼저 보호한다. 상세 결과를 덜어도 현재 테스트 정의·기능 ID·명령은 삭제하지 않는다.
2. 원본이 유지되는 Git commit/ref/path에 전체 바이트로 존재하는지 읽기 전용 재조회와 hash로
   대조한다. LFS pointer·외부 링크·만료 가능한 CI artifact는 원본 전체의 Git 보존이 아니다.
   이미 보존된 바이트는 중복 archive나 보존 커밋으로 다시 만들지 않는다.
3. 필요한 비민감 자료만 별도 보존 커밋에 남기고 내용/hash를 확인한다. 정제본과 원본의 관계를
   기록하되 같은 바이트라고 하지 않는다. 큰 media/trace는 필요성·크기·경로 승인을 먼저 받는다.
4. 검증과 보존 확인 뒤, 실제 릴리즈 전에 명시된 실행 기록을 현재 트리에서 삭제하는 별도 정리
   커밋을 만든다. 최종 릴리즈 대상에는 정리 커밋을 포함한다. 보존·삭제 커밋을 squash하여
   원본 보존을 없애지 않는다. 작은 이력 색인에 버전·보존 commit·원래 경로만 연결한다.
5. 로컬 Git 보존과 원격 보존/동기화를 구분한다. 삭제 전 원본이 있어야 하며, 없는 원출력이나
   과거 시각·모델·source·PASS/FAIL을 추정 복원하지 않는다. 실패·미실행 기록의 보존은
   제품 합격이나 릴리즈 승인과 다르다.
6. 정리 뒤 문서·보존·소비자를 확인하고 정리 커밋 본문과 간결한 보고에 남긴다. 종료된 중앙
   원장이나 `docs/archive`에 같은 실행 상세를 다시 쌓지 않는다. 새 제품 실패/추가 실행은
   결과를 먼저 보존하고 정리·완료를 다시 판정한다.

임시 경로는 최종 보존본이 아니다. 실행 전 소유 경로·프로세스·포트·정리 방법을 정하고,
성공·실패·중단 모두 필요한 정제 증거를 먼저 보존한 후 소유 대상만 정리하고 부재를 확인한다.
실행 중 자료·소유 불명 경로·symlink 외부 대상은 삭제하지 않는다. 비밀·운영/고객 데이터·
raw source URL/debug 본문은 Git에 넣지 않는다.

RC의 `rc-release-checklist`는 summary/report 생성 명령이고 `media-server-rc-gate`는
GitHub Actions artifact 이름이다. `rc-artifact-archive` 외부 보존본은 manifest/checksum으로
내용을 확인한다. CI/외부 archive 보존 여부와 위 Git 바이트 보존·정리 완료는 별도로 기록한다.
실제 RC 실행 조건과 명령은 [RC 전용 gate](stream-verification.md#rc-전용-release-gate)를 따른다.

## 로컬 준비와 명령의 의미

아래는 실행 승인이 있는 문서·메타데이터 확인 예시다. `<report.md>`/`<report.json>`은
이번 실행이 소유한 출력 경로로 지정하고 보존·정리 계획을 먼저 정한다.

```bash
git diff --check
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-release-metadata
./server.sh verify-release-closeout-helper --dry-run --report <report.md> --json-report <report.json>
./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run
```

`verify-release-metadata`의 `media-server.release-metadata-consistency.v1` 보고서는 로컬
문서/버전 검사와 `media-server.published-release-evidence.v1`의 외부 확인을 구분한다.
기본 실행의 published 상태는 `external-not-checked`다.
`verify-v400-entry-baseline`·`verify-v410-entry-baseline` 같은 호환 명령의 의미는
[검증 명령 안내](stream-verification.md#검증-정책)를 따른다.

close-out 보고서는 `media-server.release-closeout-helper-dry-run.v1`이며
`dryRun=true`, `createdTag=false`, `pushed=false`를 유지한다. 열거된 `localCommands`는
`planned-local`, `manualActions`는 `manual-not-run`이다. 동반 명령을 실행하거나
PR·병합·서명·공개·브랜치 정리를 수행한 결과가 아니다.
`--one-shot-dry-run`의 `media-server.release-closeout-one-shot-gate.v1`은 순서와
첫 실패 뒤 중단하는 fail-stop 계획을 검사한다. `media-server.release-visual-baseline-automation.v1`
역시 자동화 계획이며 직접 시각 검토·독립 승인 완료가 아니다.

버전 접두사가 있는 준비 검증기의 현재 기능 ID·dispatch·동반 명령은
[기능별 정의](project-feature-test-inventory.md)와 [검증 안내](stream-verification.md)에 둔다.
여기에 과거 버전별 gate 목록과 완료 문장을 다시 복사하지 않는다.

## CI와 배포 후보

Preflight/static-gates/guardrails와 로컬 gate 대응은
`./server.sh verify-ci-local-gate-parity`의 `media-server.ci-local-gate-parity.v1`로 확인한다.
required Actions와 `Licensing and Artifact Guardrails`의 실제 결과를 확인하며,
로컬 정적 검사 통과로 원격 CI 성공을 대신하지 않는다.

저장소 Actions 설정 기준은 Node.js 24, `actions/checkout@v5`, `actions/upload-artifact@v6`,
최소 Actions Runner `2.327.1` 및 `.github/dependabot.yml`이다. 이는 저장소 기준이지
외부의 최신 버전을 조회했다는 뜻이 아니다. read-only permissions를 유지하고
`verify-actions-security`의 허용 action/SHA pin/local action 경계를 따른다.
실제 check-run annotation을 확보하면
`./server.sh verify-actions-security --annotations-json <annotations.json>`으로 확인한다.
warning/failure annotation은 차단하며 미조회 상태를 PASS로 쓰지 않는다. 예외가 필요하면
owner가 범위·만료일을 별도 정책으로 승인해야 하고, 도구를 임의 우회해 합격시키지 않는다.

별도 배포 후보에는 `verify-release-bundle-dry-run`, `verify-runtime-model-bundle-rc-rehearsal`,
`verify-bundle-policy --bundle-dir <release_bundle_dir>`, `dependency-snapshot`,
`source-offer-checklist --bundle-policy-report <bundle_policy.json>`,
`verify-public-repo-readiness`를 적용한다. 상세 입력과 라이선스 판단은
[배포 정책](distribution-policy.md)·[runtime/model RC](runtime-model-bundle-rc-rehearsal.md)에 둔다.
후보 생성/fixture 리허설의 PASS는 실제 배포 선택·runtime/model 포함 승인·asset 업로드가 아니다.

## 공개 순서와 서명 태그

1. 승인 범위, branch/HEAD, VERSION/CMake, remote, 미커밋 변경, 실패/미확인과 포함될
   누적 커밋을 확인한다. push 전 upstream/ahead/behind도 대조한다.
2. 필요한 제품·문서·배포 정확성 보정, 승인된 검증, 기록 보존·정리를 마치고 PR과 required
   CI를 확인한다. 단계별 승인 아래 main에 병합·동기화하고 최종 커밋을 다시 확인한다.
3. public readiness·bundle policy·required Actions를 충족한 **최종 main 커밋**에만
   `vMAJOR.MINOR.PATCH` 형식의 signed annotated tag를 만든다. push 전에 로컬 서명을 검증하고,
   push 후 대상 hash와 GitHub Verified 및 tag API `verified=true`/`reason=valid`를 확인한다.
   lightweight·unsigned annotated·GitHub UI 자동 태그는 대체 수단이 아니다.
4. 승인된 source-only GitHub Release를 생성·공개하고 실제 Latest/URL/원격 tag를 확인한다.
   아래 외부 확인을 실행한 결과 없이 공개 완료라 하지 않는다.
5. published 확인 이후에만 승인된 release branch 삭제·후속 브랜치 동기화를 수행한다.
   새 버전 개발은 별도 지시가 있어야 한다. 어느 단계든 실패하면 뒤 작업을 멈추고 이미
   생성된 commit/URL과 정지 지점을 보고한다. 외부 상태를 임의 rollback하지 않는다.

```bash
./server.sh verify-release-metadata --published --report <report.md> --json-report <report.json>
```

이 명령은 공개 후 GitHub Releases list/view/latest, API `/releases/latest`, 저장소의
Releases/Latest 링크와 remote tag/branch를 실제 조회한다. 네트워크·도구·auth·remote 조회
실패는 공개 확인 실패/미확인이며 제품 runtime/media 회귀와 구분한다.
한 번 공개한 태그는 문서나 증거 수명 유지보수를 위해 옮기지 않는다. 공개 후 정리는 별도
유지보수 커밋으로 하며 제품/배포 정확성 수정을 단순 정리로 숨기지 않는다.

## 릴리즈 노트와 이전 기록

릴리즈 노트는 변경·호환/이관·배포 범위·알려진 제한과 실제 검증을 간결하게 설명한다.
source/환경·CI·Auth/미디어·UI·30분·조건부 120분·외부/실장비 결과 및 제외 사유는
해당 실행 자료로 연결한다. 실제 실행한 결과만 PASS라 쓰며 템플릿·계획·준비 검사와 구분한다.
과거 실패·사용자 제외·미실행을 새 버전의 PASS로 고치지 않는다.

이 문서에 중복되어 있던 과거 버전별 릴리즈 절차·gate 목록, v4.0 실행 기록과
v3.9.1 노트 템플릿, 버전 정책의 과거 2.x 전환·3.x/4.x 범위는 다음 원본에서 조회한다.
로컬 Git 바이트를 대조한 보존 위치이며 원격 보존을 이번에 재확인했다는 뜻은 아니다.

| 정리 대상·버전 범위 | 원본 보존 commit | 원래 경로 |
| --- | --- | --- |
| v2.8~v4.1 릴리즈 절차·결과 | `0dce856187cf665fe2da79d0f74dd36cfabf56f4` | `docs/release-policy.md` |
| v2.5~v4.1 범위·2.x 전환 기록 | `0dce856187cf665fe2da79d0f74dd36cfabf56f4` | `docs/versioning-policy.md` |

현재 미완료와 후속 방향은 [backlog](development-backlog.md) 및
[녹화·검색 로드맵](v410-v49-recording-search-roadmap.md)을 따른다.
