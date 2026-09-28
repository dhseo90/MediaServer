# Media Server v4.1.0 Release Note Source

독자: v4.1.0 source-only release 사용자와 운영자. 수명: v4.1.0 release line의 안정된
사용자용 설명. 작업 권한·실행 판정은 `AGENTS.md`, 버전과 공개 범위는
[release-policy.md](release-policy.md)와 [versioning-policy.md](versioning-policy.md)가
source-of-truth이며, 이 문서는 실행 기록이나 published 완료 증거를 대신하지 않습니다.
이 문서의 외부 상태 설명은 최종 tag에 포함하기 위해 문서를 동결한 release cut 준비 시점을
기준으로 합니다. tag 이후의 현재 공개 상태는 Live GitHub Latest와 published metadata
검증 결과가 권위 있는 근거입니다.

## 요약

v4.1.0 Recording Foundation은 기존 RTSP/WebRTC live relay와 영상 분석 흐름에 opt-in
상시·이벤트 녹화, 순환 보존, event 우선 timeline, 안전한 조회·재생 기반을 추가하는
source-only release target입니다.

S01~S08 구현, S10 시간·식별·저장 기반 보강, S11 제품 검증과 B14 공개 준비를
완료했습니다. PR·병합·서명 tag·GitHub Release·published metadata는 각각 실제 실행
기록이 있을 때만 완료로 판정합니다.

## 주요 변경

- 녹화를 켠 채널만 상시 또는 이벤트 방식으로 저장하며, keyframe 경계에서 segment를
  마감해 재생 가능한 파일과 catalog 상태가 어긋나지 않도록 했습니다.
- append-only catalog를 기본 기록으로 두고 SQLite index를 다시 만들 수 있게 했습니다.
  손상된 항목은 격리하고 서버 시작 전에 미완료 상태를 복구합니다.
- 보존 등급별 기간·용량 한도, pin과 hold를 적용하며, 삭제 도중 재시작해도 동일 작업을
  안전하게 이어 가도록 했습니다.
- 분석 EventRecord를 마감된 media 구간과 연결하고, 직접 재생이 어려운 구간은 제한된
  범위에서 remux 또는 fallback 처리합니다.
- 운영자는 이벤트 우선 timeline에서 녹화 구간을 찾고 HTTP GET/HEAD/Range로 재생할 수
  있습니다. 조회와 재생은 기존 role/scope 경계를 그대로 따릅니다.
- 이후 구조화·벡터 검색이 사용할 recording metadata, analysis observation과 FrameLocator
  기반을 마련했지만 자연어 검색 API 자체는 이번 범위가 아닙니다.
- 저장·복구·관측 비용 경계를 보강하고 공개 자료에서는 로컬 경로와 임시 경로를 정제해
  source-only 배포 경계를 유지했습니다.

## 검증 범위

- 최종 build, 인증, 녹화 계약·통합과 환경 검증
- 30분 안정화 109개 항목
- 공통 UI 424개와 녹화 UI 8 ID·31 action
- 녹화 전용 120분 10,093개 항목과 종료·복구·정리
- 공개 저장소·dependency·bundle/source-offer 경계와 현재 공개 자료 검사

이 결과는 실제 외부 서비스, 실기기 ONVIF, 외부 TURN/WHEP credential 또는 cloud VLM
성공을 보장하지 않습니다. 해당 조건은 이번 cut에서 실행하지 않았으며 PASS로 계산하지
않습니다.

## 공개 범위

영문 운영 사용자 목록에서 숫자로 지정한 채널 권한의 보조 문구(예: `채널 1`)는
한글로 남을 수 있습니다. 표시 언어의 제한이며 권한 판정 변경은 아닙니다.

- GitHub source archive와 문서 중심의 source-only 배포
- FFmpeg/GStreamer 위험 runtime, ONNX Runtime package, model binary 미포함
- 운영 credential/auth store, 고객 영상, raw log/snapshot/clip bundle 미포함
- 완성형 VMS/NVR, broad archive search, 자연어 검색 API는 비범위

후속 검색 방향은 구조화 검색 v4.2.0, 벡터 검색 v4.3.0, 자연어 query API v4.7.0,
대화형 검색과 정확한 녹화 재생 v4.8.0의 장기 로드맵을 유지합니다.

## 외부 릴리즈 상태

Live GitHub Latest는 [Releases/latest](https://github.com/dhseo90/MediaServer/releases/latest)에서
확인합니다. 이 문서를 동결한 release cut 준비 시점에는 외부 action을 완료로 선기록하지
않습니다. v4.1.0 publish 완료는 signed annotated tag, GitHub Release와
`./server.sh verify-release-metadata --published`의 실제 evidence로만 확정하며, tag 이후에는
그 결과가 이 동결 시점 설명보다 우선합니다.
