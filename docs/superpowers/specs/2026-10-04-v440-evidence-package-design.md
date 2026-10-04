# v4.4.0 Evidence Package 개발 계약

## 범위와 순서

2026-10-04 사용자 지시에 따라 `df60a8db`에서 분기한 `v4.4.0`에서
V440-01~07 순서로 개발한다. 전체 구현과 검사 코드·정의를 먼저 작성하고 그 뒤 테스트한다.
이 문서는 계약·미완료 상태의 기준이며 실행 결과가 아니다. 릴리즈·브랜치 삭제는
종합 보고의 잔여 항목으로 관리하며 공개 실행 권한으로 추정하지 않는다.

1. EvidencePackageV1 계약과 독립 기대값 확정.
2. FrameLocatorV1 및 원본 미디어 좌표를 통한 결정적 프레임·시퀀스 추출.
3. 검색 결과·녹화·clip·frame·track·event·observation을 불변 manifest로 연결.
4. 원본과 독립된 파생 파일 보존·원자 게시·재시작 읽기·무결성 검증.
5. 기존 검색 결과에서 Ops 패키지 생성·조회·파일 접근 연결.
6. 전체 구현 후 focused·호환·권한·자원 회귀.
7. 검증 한계·사용법·버전 정합과 릴리즈 잔여 보고.

VLM 결론, 교차 카메라 동일성, 자연어 검색, Evidence default-on, 자동 조사,
외부 저장소 코드·prompt·schema 반입은 비범위다.

## 값·시간·무결성 계약

- `EvidencePackageV1`은 기존 검색 hit의 ID·채널·관측·분석 namespace·track·event 및
  원본 segment/store/media epoch와 시간 provenance를 생성 당시 값으로 보존한다.
  검색 유사도는 사건 발생 또는 동일성 판단으로 승격하지 않는다.
- package ID는 게시 파일 전체 SHA-256에서 파생한 `ep-<hex>`다. 같은 ID의 내용을
  교체하지 않는다. manifest와 저장된 각 payload를 모두 검증한다. hash는 서명이 아니다.
- 요청 hit의 원본 범위에서 최대 8개의 정확한 sample을 시간순으로 균등 선택한다.
  선택 정책과 실제 sample 수를 보존하고 전체 영상의 모든 프레임 보존으로 설명하지 않는다.
- 프레임은 기존 `SourceSeek`의 native sample 증명과 보호 FD를 재사용해 디코드한다.
  원본 파일 SHA, 압축 sample SHA, packed RGB SHA, 무손실 PNG SHA를 구분한다.
  픽셀 비교 기준은 같은 디코드 환경의 packed RGB다. 환경 간 RGB 동일성을 보장하지 않는다.
- UTC가 입증된 프레임은 기존 `FrameLocatorV1`을 함께 저장한다. UTC unknown이면
  이를 null로 두고 원본 PTS/time base를 별도 저장한다. UTC 0을 추정해 만들지 않는다.
  선택 anchor/index의 기존 의미를 바꾸지 않는다. v4.4 생성 locator의 frame index는
  null이며, index가 지정된 외부 locator는 sample 대응을 추정하지 않고 미지원으로 거부한다.
- 녹화와 clip 참조, 대표 frame, 누락·삭제·미지원 사유를 manifest에 둔다.
  정상적인 자료 부재는 partial이며 corruption/I/O/timeout은 실패로 전파한다.
  생성 당시 상태는 불변이고 현재 원본의 deleted/unavailable 상태는 조회 응답에서 분리한다.

## 저장·수명과 자원

- `MEDIA_SERVER_EVIDENCE_ENABLED`는 기본 false. 로컬 recording root의 전용
  `evidence-packages` 아래에 저장한다. 원본 미디어 quota/순환 삭제 대상과 분리한다.
- 패키지 자체는 명시 보존 등급 `evidence-hold`다. 자동 만료·삭제하지 않으며 용량이
  찼을 때 새 생성을 거부한다. 기존 원본의 pin/hold·재생 보호를 변경하지 않는다.
- 전용 저장 파일 하나에 version header·길이·manifest·payload를 넣고 fsync 후
  원자적으로 게시한다. 게시 전 중단 파일은 조회하지 않는다. 재시작 때 같은 저장
  파일을 검증해 읽으며 원본이 삭제돼도 파생 PNG/복사 clip과 provenance는 유지한다.
- 심볼릭 링크·외부 경로·잘못된 크기·중복 필드·잘못된 hash를 거부한다.
  게시 파일을 덮어쓰지 않는다. 전용 pending 파일 정리도 writer lock과 소유권을 확인한다.
- 생성 동시 1개, 요청 최대 8 frame, 패키지 최대 256MiB, 저장 총량 2GiB,
  디스크 여유 최소 max(기존 reserve, 256MiB), 생성 예산 30초다.
  source decoder의 기존 512MiB/4096×2160/5초 상한은 유지한다.
  원본은 보호 FD로 읽고 공유 미디어 callback에서 추출·저장하지 않는다.
  상한 초과는 partial 성공으로 숨기지 않는다. OS blocking I/O 선점은 보장하지 않는다.

## 제품 연결

기존 `/ops/events` 검색 결과에 명시적인 증거 보존 동작과 패키지 조회를 추가한다.
primary nav와 Client/viewer UI는 유지한다. 아래 API는 operator·ops:read와 모든 해당
채널의 source:read 권한을 먼저 확인한다. 생성은 추가 ops:write를 요구한다.

- `POST /ops/api/recordings/search/evidence`: 기존 query/snapshotId/hitId를 서버의
  불변 검색 snapshot에서 해석한다. 임의 source URL·경로·metadata를 생성 입력으로 받지 않는다.
- `POST /ops/api/recordings/visual-search/evidence`: 서버 색인의 channelId/hitId를 해석한다.
- `GET /ops/api/recordings/evidence?channelId=…`: 해당 채널의 보존 패키지 목록.
- `GET /ops/api/recordings/evidence/<id>`: 검증된 manifest와 별도의 현재 원본 상태.
- `GET /ops/api/recordings/evidence/<id>/assets/<index>`: 검증된 보존 PNG/clip.

모든 접근에서 현재 역할/scope를 확인하고 no-store·nosniff를 적용한다.
UI는 구조화된 요약과 이미지/영상만 표시하며 내부 path·raw JSON을 출력하지 않는다.

## 공개 자료·독립 구현 경계

2026-10-04 다음 공식 자료를 읽었다. 외부 구현·신규 라이브러리는 반입하지 않는다.

- [RFC 8493](https://www.rfc-editor.org/rfc/rfc8493.html): payload checksum과 descriptive
  metadata의 분리라는 공개 개념만 참고한다. 자체 형식이며 BagIt 호환을 주장하지 않는다.
- [GStreamer seeking](https://gstreamer.freedesktop.org/documentation/application-development/advanced/queryevents.html):
  기존 정확한 native sample 검증/decoder를 재사용한다. seek 성공만으로 동일 프레임이라 하지 않는다.
- [GStreamer licensing](https://gstreamer.freedesktop.org/documentation/frequently-asked-questions/licensing.html):
  core와 개별 plugin의 권리 경계를 유지한다. 신규 plugin·codec·binary 배포는 추가하지 않는다.
- PNG는 이미 의존 중인 zlib의 압축·CRC API로 독립 인코딩한다. 외부 소스 복사 없음.
  기존 Apache-2.0·배포 정책을 따른다.
- [IP 위험 차단 게이트](../../research/v410-recording-ip-risk-gate.md)의 exclusion-first 원칙을
  적용한다. 특허 상세 반입·법률/FTO 판단은 수행하지 않았다. 라이선스 미확인 VARuleLens는 제외한다.

## 현재 진행

V440-01~05 구현과 V440-06의 단기 영향 검증을 마쳤다. V440-07의 개발 문서·잔여 보고를
정리했으며 공개 완료를 뜻하지 않는다. 전체 구현 뒤 검사를 시작했고 발견한 결함은 수정·재검증했다.
실행 결과·최초 실패·source/환경·cleanup·미실행 범위는
[개발 검증 기록](../../release-artifacts/v4.4.0/development/README.md)에 보존한다.
