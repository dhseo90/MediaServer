# Security Policy

## Supported Scope

이 저장소는 RTSP/WebRTC media server와 운영 UI, auth, VA 검증 도구를 포함합니다.
public repo에는 운영 secret, auth store, evidence media, third-party runtime binary를 포함하지 않습니다.

## Reporting a Vulnerability

보안 취약점은 공개 issue로 세부 exploit을 올리지 말고 repository owner에게 private channel로 먼저 제보합니다.

제보에 포함하면 좋은 내용:

- 영향 범위와 재현 조건
- 관련 endpoint, command, config 이름
- auth/session/token 노출 가능성
- 임시 완화 방법

## Public Issue로 다뤄도 되는 것

- 설치 실패
- 문서 오류
- 일반 UI 버그
- sample media나 local test command 문제

## Public Issue로 올리지 말아야 하는 것

- 실제 token, password, auth store 내용
- 운영 로그 원문
- 고객/현장 영상, snapshot, evidence bundle
- 아직 수정되지 않은 인증 우회나 원격 실행 재현 절차
