# Contributing

## 기본 원칙

- `/ops`는 운영 설정 화면, `/client`는 viewer 화면, `/lab/analysis/*`는 API/검증 전용 경계로 유지합니다.
- media runtime binary, model file, 운영 auth store, evidence media는 commit하지 않습니다.
- public repo 준비 변경은 `verify-public-repo-readiness`와 licensing guardrail을 통과해야 합니다.

## 변경 전 확인

```bash
git status --short
./server.sh verify-script-inventory
```

## 변경 후 기본 검증

문서, workflow, public repo 준비 변경:

```bash
git diff --check -- README.md SECURITY.md CONTRIBUTING.md NOTICE THIRD_PARTY_NOTICES.md DEPENDENCY_SNAPSHOT.md .github config docs scripts server.sh
./server.sh verify-script-inventory
./server.sh verify-actions-security
./server.sh verify-code-comments
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh write-dependency-notice --check
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
./server.sh verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json
./server.sh verify-release-bundle-dry-run
./server.sh source-offer-checklist --stable --bundle-policy-report /tmp/media_server_bundle_policy.json
```

서버 동작 변경:

```bash
./server.sh build
./server.sh test --basic --ffmpeg-free
```

media pipeline, codec, VA runtime을 바꾸는 경우에는 관련 `verify-*`와 RC longrun 기준을 별도 실행합니다.

## PR/Issue 기준

- Issue에는 재현 command, 기대 결과, 실제 결과, 환경 정보를 짧게 적습니다.
- PR에는 변경 범위와 실행한 검증 명령을 적습니다.
- secret, 운영 로그, 고객 영상, auth store, token은 issue/PR 본문과 첨부 파일에 넣지 않습니다.
