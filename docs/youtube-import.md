<!--
이 파일의 목적/역할: YouTube source/import 실험 기능의 현재 상태, 활성화 방법, 실패 유형, 검증 방법, 운영 전환 전 조건을 분리해 정리한다.
-->

# YouTube Import / Source

> 실험 기능입니다. YouTube import/source는 기본 스트리밍 안정 기능이 아니며, `./server.sh test`의 기본 hard gate에도 포함하지 않습니다.

이 기능은 개발/검증용 샘플 source를 준비하기 위한 보조 기능입니다. 외부 서비스 상태, 공개 범위, 정책, 네트워크 상태, resolver 버전에 따라 결과가 달라질 수 있으며 특정 외부 URL의 성공을 보장하지 않습니다.

## 현재 상태

- `/lab/import` 화면은 제품 UI에서 제거했습니다. route는 404로 닫고 `/ops/sources`에서 채널을 관리합니다.
- YouTube import/source는 현재 운영 기본 기능이 아니며 자동 smoke gate에도 포함하지 않습니다.
- `source=youtube` 직접 표출 실험은 기본 비활성입니다. 다시 살릴 경우 `MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1` 같은 명시 opt-in과 별도 설계 검토가 필요합니다.
- import/source 모두 core RTSP/WebRTC relay 안정성 기준과 분리해서 봅니다.
- 접근 제한, 공개 범위 제한, 서비스 정책, rate limit, 서명 URL 만료, 네트워크 장애는 정상적인 실패 조건으로 처리합니다.

## 활성화 방법

직접 source 표출 실험을 명시적으로 켜고 실행:

```bash
MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1 ./server.sh foreground
```

resolver binary나 format 등 세부 환경변수는 [config-reference.md](./config-reference.md)의 `YouTube experimental env`를 봅니다.

선택 도구 설치 예시:

```bash
brew install yt-dlp deno
```

Linux에서는 배포판 패키지 또는 프로젝트 운영 기준에 맞는 설치 방식을 사용합니다. 설치/버전 고정 전략은 운영 전환 전 별도 확정이 필요합니다.

## 실패 유형

`YouTubeResolver`는 resolver stderr를 요약해 실패 원인을 사용자에게 보여줍니다. 대표 유형은 다음과 같습니다.

- 접근 제한 또는 공개 범위 제한
- 플랫폼 정책 또는 자동화 차단에 따른 접근 실패
- rate limit 또는 일시적 요청 제한
- live archive unavailable
- video unavailable
- format unavailable
- 서명 URL 만료
- network timeout
- dns failure
- network connection failure
- resolver binary missing 또는 resolver 실행 실패

이 실패들은 외부 조건에 의존하므로 서버의 기본 streaming 실패로 간주하지 않습니다.

## 검증 방법

기본 UI/API smoke:

```bash
./server.sh verify-ops-client-ui
./server.sh verify-ops-route-boundaries
```

검증 기준:

- `/lab/import`는 404로 닫히고 `/ops/sources`에서 채널을 관리함
- import job UI/API가 제품 화면에 노출되지 않음
- 실험 기능이 꺼져 있을 때 core `/ops`, `/client`, RTSP/WebRTC 경로에 영향이 없음

실제 다운로드 성공 검증은 사용 권한과 공개 범위가 명확한 URL, 고정된 resolver 버전, 충분한 네트워크 조건이 있을 때만 별도로 수행합니다. 공개 외부 URL 성공은 문서나 자동 테스트에서 보장하지 않습니다.

## 운영 전환 전 조건

- 기능을 운영 기본 기능으로 승격할지, 별도 실험 기능으로만 유지할지 결정
- 사용 가능한 테스트 URL과 사용 범위에 대한 내부 정책 확정
- resolver 설치 방식과 버전 고정 전략 확정
- 장시간 import job의 timeout, cancel, retry, cleanup 정책 확정
- `video/imports` 결과 파일 보존/삭제/용량 제한 정책 확정
- 실패 메시지와 사용자 안내 문구 점검
- core RTSP/WebRTC streaming, VA overlay, `vaRule` 경로와 독립적으로 실패하는지 검증

운영 전환 전까지 이 기능은 실험 기능으로 유지하며, core media pipeline 안정성 판단에 포함하지 않습니다.
