<!--
이 파일의 목적/역할: YouTube source/import 실험 기능의 현재 상태, 실패 유형, 운영 전환 전 확인할 항목을 분리해 정리한다.
-->

# YouTube Source / Import Experimental Status

YouTube 관련 기능은 기본 스트리밍 기능이 아니라 실험실 기능으로 유지한다.

## 현재 상태

- `source=youtube` 직접 표출은 `MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1`일 때만 노출한다.
- `/lab/import`는 YouTube URL을 개발용 샘플 파일로 내려받아 `video/imports` 아래에 저장한다.
- import 결과는 `ffmpeg`로 `h264 + aac stereo + mp4` 형태로 정규화하고, 이후 `file=imports/...` 경로로 재사용한다.
- `yt-dlp` 결과는 로그인, bot check, 지역 제한, 429/rate limit, 서명 URL 만료에 영향을 받는다.

## 실패 유형

`YouTubeResolver`는 yt-dlp stderr를 요약하고 다음 유형을 메시지에 붙인다.

- `private video`
- `region restricted`
- `authentication required`
- `bot check required`
- `rate limited`
- `live archive unavailable`
- `video unavailable`
- `format unavailable`
- `network timeout`
- `dns failure`
- `network connection failure`

## 검증 상태

- 외부 공개 YouTube URL은 시점에 따라 성공/실패가 바뀌므로 기본 smoke에 포함하지 않는다.
- `/lab/import` UI/API는 `./server.sh verify-lab-import-ui`로 렌더링 요소와 job API 기본 응답만 확인한다.
- 실제 다운로드 성공 검증은 사용 권한이 명확한 URL과 yt-dlp/deno 준비가 있을 때 별도로 수행한다.

## 운영 전환 전 조건

- 사용 권한이 있는 테스트 URL 확보
- yt-dlp/deno 설치 및 버전 고정 전략
- bot check/로그인 요구 실패를 사용자에게 명확히 노출
- import 결과 파일 보존/삭제 정책
- 장시간 다운로드 job 취소와 retry 정책
