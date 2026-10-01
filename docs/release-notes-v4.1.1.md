# Media Server v4.1.1 릴리즈 후보

v4.1.1은 v4.1.0 녹화 기반의 내부 경계, 검증 연결과 문서·기록 수명을 정리하는
호환 유지 패치 후보입니다. 현재 소스와 공개 목표는 v4.1.1이며 공개 완료를 뜻하지 않습니다.
기록된 v4.1.0 공개 관측과 시각은 [릴리즈 metadata](release-policy.md#소스와-기록된-공개-상태)에 둡니다.

## 누적 변경

- 녹화 catalog의 저장 값, 조회·selection 값과 remux 결과 선언을 분리해 내부 의존을 줄였습니다.
  상시·이벤트 녹화와 조회·재생은 [v4.1.0에서 제공한 기능](release-notes-v4.1.0.md)을 이어갑니다.
- finalize ticket의 읽기·쓰기와 엄격 검증을 별도 소유 경계로 분리했습니다.
  기존 ticket 형식, partial 보존과 복구 시 소유 확인을 유지합니다.
- timeline의 미디어 해석을 read service로 모으고 조회 snapshot/context, 파일 descriptor와
  hold 수명, 손상 재확인 경계를 유지했습니다. supervisor는 소유한 route snapshot을 받아
  callback·thread·session 수명이 외부 참조에 의존하지 않도록 정리했습니다.
- 현행 소유 graph와 실제 source/CMake 연결을 대조하고, 허용된 정확한 의존과 금지·순환
  반례를 검사하도록 보강했습니다. handoff는 과거 줄 수 대신 실제 관측과 기존 정책 상한을 대조합니다.
- 과거 실행 원장과 현재 기능 정의를 분리하고, canonical·companion 명령 및 manifest의
  전체 스크립트 경로를 연결합니다. VLM 검증 wrapper는 최초 오류·종료 오류·cleanup 실패를 보존합니다.
- README·분야별 안내·backlog의 현행 상태를 정리하고 종료 실행·검토 자료는 보존된
  [Git 이력](history/README.md)으로 이동했습니다. 현행 fixture·승인 원장·기능 정의는 유지합니다.

## 호환성과 배포 범위

이번 변경은 녹화 저장 형식이나 공개 API의 변경을 요구하지 않으며 데이터 migration을 추가하지 않습니다.
RTSP/WebRTC, Event POST·SSE/WS metadata, Auth/Role/Scope, Rule/Profile 저장 계약을 유지합니다.
기본 배포는 Apache-2.0 소스·문서이며 runtime/model binary, 운영 인증 자료와 고객 영상은 포함하지 않습니다.
상세 배포 조건은 [배포 정책](distribution-policy.md)을 따릅니다.

## 검증과 공개 상태

제한된 계약·복구·수명 회귀, 검증기의 정상·반례, 독립 소스 검토와 승인 적용 결과는
[보존 기록](history/README.md#v411-개발-브랜치-마감)에 연결합니다.
기능 coverage와 구조 readiness는 기능·근거 연결과 소스 정합 검사이며,
986개 기능의 실제 실행이나 UI·장시간 성공을 의미하지 않습니다.

이 후보의 실제 UI·30분 검증과 필요한 120분 검증은 후속 릴리즈 단계에서 누적 제품 변경과
기존 증거의 유효성을 대조해 판정하고 별도 승인 아래 실행합니다. v4.1.0의 과거 성공을
그대로 이번 버전의 PASS로 옮기지 않습니다. PR·required CI·main 병합·서명 태그·GitHub Release와
공개 후 확인도 남아 있습니다. 공개 절차는 [릴리즈 정책](release-policy.md)을 따릅니다.

## 알려진 제한

자연어 영상 검색, 완성형 VMS/NVR, 무기한 보관은 현재 지원 범위가 아닙니다.
녹화 시간 선택에 따른 자동 탐색·다음 파일 자동 재생을 보장하지 않으며,
영문 사용자 목록의 숫자 채널 권한 보조 문구에 한글이 남을 수 있습니다.
외부 서비스·실기기 ONVIF·TURN/WHEP·cloud VLM 성공을 이 후보의 검사로 주장하지 않습니다.
후속 제품 개발과 상세 제한은 [backlog](development-backlog.md) 및
[녹화·검색 로드맵](v410-v49-recording-search-roadmap.md)에 있으며 별도 승인 대상입니다.
