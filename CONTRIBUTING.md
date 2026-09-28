# 기여 안내

설치·빌드·실행은 [개발 가이드](docs/development-guide.md), 문서 탐색은
[문서 색인](docs/README.md)을 봅니다. 저장소 작업 범위와 승인 기준은
[AGENTS](AGENTS.md), 검증의 상세 기준은 [검증 정책](docs/stream-verification.md#검증-정책)에 있습니다.

## 기본 원칙

- `/ops`는 운영 설정 화면, `/client`는 viewer 화면, `/lab/analysis/*`는 API/검증 전용 경계로 유지합니다.
- 역할·scope와 viewer 정보 비노출, 공개 API·미디어·녹화 저장 계약을 보존합니다.
- media runtime binary, model file, 운영 auth store, 고객·운영 evidence media는 commit하지 않습니다.
  승인된 비민감 fixture·정제 실행 자료는 출처·라이선스와 기록 수명 정책에 따라 다룹니다.
- 외부 의존성과 배포 조건은 [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md)와
  [배포 정책](docs/distribution-policy.md)을 따릅니다.

## 변경 전 확인

```bash
git status --short
git diff --stat
```

요청 범위, 바꾸지 않을 계약, 정상·오류·경계 기대값과 영향받는 소비자를 확인합니다.
기존 사용자 변경은 보존합니다. 기능별 테스트 정의는
[기능별 테스트 정의 문서](docs/project-feature-test-inventory.md)에 관리하며,
실행 전에 관련 정의와 검증 범위를 확인합니다.

## 변경과 검증

개발 요청에는 관련 단기 검증이 포함됩니다. 조사·설명·리뷰만 요청받은 경우에는
파일 수정·테스트·커밋 권한까지 추정하지 않습니다. 장시간 검사, `verify-predev`, 실제 UI 풀테스트는
별도 명시 실행 승인을 확인합니다. 이미 승인된 범위는 철회·대체·범위 변경이 없는 한 유지합니다.

문서 전용 변경의 기본 확인:

```bash
git diff --check
./server.sh verify-docs-links
```

추가 검사는 변경한 경로에 맞춰 선택합니다.

| 변경 | 확인할 검사·기준 |
| --- | --- |
| 대표 이미지·공개 metadata | `verify-docs-ui-assets`, 관련 metadata 검사와 필요한 직접 시각 검수 |
| 스크립트·dispatch | `verify-script-inventory`와 변경 도구의 자체검사 |
| GitHub workflow | `verify-actions-security`와 해당 workflow의 요구 검사 |
| C++ 등 제품 코드 | 빌드, `verify-code-comments`, focused 검사와 영향 회귀 |
| 외부 의존성·공개 배포 | `write-dependency-notice --check`, `verify-public-repo-readiness`, licensing guardrail과 [릴리즈 정책](docs/release-policy.md) |

`test --basic --ffmpeg-free`는 FFmpeg/ffprobe CLI가 없는 환경의 선택 모드입니다.
기본·확장 통합 검사와 media·VA·녹화 변경의 추가 기준은 검증 정책을 따릅니다.
검증 준비나 정적 검사 결과를 실제 제품·UI·장시간 PASS로 대신하지 않습니다.

실행은 운영 자료와 분리한 경로·프로세스·포트에서 수행합니다. 명령·source·환경·exit·원출력,
실패와 재검증 연결·미실행·정리 상태를 해당 실행 자료에 남깁니다.
상세 결과를 테스트 정의나 여러 문서에 반복 복사하지 않습니다. 기록의 보존·삭제는
[기록 수명 정책](AGENTS.md#6-기록-수명과-정리)에 따라 승인된 범위에서만 처리합니다.

## PR/Issue 기준

- Issue에는 재현 command, 기대 결과, 실제 결과, 환경 정보를 짧게 적습니다.
- PR에는 문제와 변경 후 동작, 변경 범위, 실제 실행한 검증과 미실행·미해결 항목을 적습니다.
- secret, 운영 로그, 고객 영상, auth store, token은 issue/PR 본문과 첨부 파일에 넣지 않습니다.

stage/commit, push, PR 생성·갱신, 병합, tag·공개와 브랜치 작업은 각각 승인된 범위인지 확인합니다.
테스트 통과나 릴리즈 준비만으로 외부 변경 권한을 추정하지 않고, 승인된 변경만 선택해 stage합니다.
보안 취약점 제보는 [보안 정책](SECURITY.md)을 따릅니다.
