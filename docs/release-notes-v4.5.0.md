# Media Server v4.5.0 출시 후보

v4.5.0 후보는 한국어·영어 장면 설명과 명시적인 카메라·시간 조건으로 기존 영상 유사도
검색을 사용하고, 결과의 범위·갱신 상태·녹화와 증거를 확인하는 흐름을 마감한다.
사용자가 직접 지정·확인한 명세를 계산하는 A 기록 검토도 제공한다. 공개 완료 버전은
[GitHub Latest](https://github.com/dhseo90/MediaServer/releases/latest)에서 별도로 확인한다.

## 변경 범위

- 검색 질의가 SigLIP2의 본문 63토큰 한도를 넘으면 잘라 실행하지 않고 거부한다.
  실제 적용 카메라·시간·threshold·limit과 질의 길이를 화면에 표시한다.
- 결과와 통계는 실제 사용한 게시 색인에 결속된다. 게시본의 표본 범위와 갱신 상태를
  구분하고, 갱신 실패 시 이전 게시본을 유지하며 재시작 직후의 미확인 상태를 표시한다.
  구조화 검색·영상 검색·녹화 재생은 명시 조건을 재사용한다.
- 선택 sample의 분석 관측 출처를 패키지에 보존하고, 확인된 대상·관계·시점과 서버 판정을
  결속해 A 검토를 저장·조회한다. 과거 결과 열람 중에도 현재 작업 추적을 유지한다.
- 부족한 자료는 서버 규칙에 따른 자료 요청 안내로 표시한다. 모델이 만든 질문이나
  영상 사실의 독립 검증으로 표시하지 않는다.
- 미채택 모델의 신규 제출은 인증·채널 권한 확인 후 HTTP409
  `review-model-not-adopted`로 거부한다. 기본 off 정책, A 실행, 권한 있는 과거 모델 결과와
  기존 job 조회·취소는 유지한다. UI의 실행 가능 상태도 같은 서버 정책을 따른다.

## 지원 범위와 제한

SigLIP2 검색은 별도 준비된 로컬 모델을 선택 활성화하는 기능이다. 자연어의 상대 시각·행동·
관계 전체를 자동 해석하는 기능은 아니며 카메라와 시간은 명시 조건으로 지정한다.
대표 표본의 coverage는 전체 영상의 모든 객체·사건 coverage를 뜻하지 않는다.
현재 개발 규모는 8채널·20,000벡터/96MiB, 게시본2개·색인worker1개·추론1개·요청4개다.
원본 파일512MiB/RGB4096×2160 제한과 기존 quota를 유지한다. 이 값은 검증 profile이며
무기한 운영 규모나 다른 장비의 지연 보장이 아니다.

A는 검토 대상 엔진의 **분석 기록상의 관계·내부 일관성**이다. engine-track 연결을 실제
물리적 동일성 인증으로 사용하지 않고, 관측 기록 부재를 영상의 비가시성으로 해석하지 않는다.
원문 질문은 보존하지만 ClaimSpec으로 자동 해석하지 않는다. ClaimSpec 자동 해석·C 영상/시퀀스
검토는 **버전 미배정·미완료**이며 과거 모델 후보의 품질 FAIL을 이번 출시 PASS로 바꾸지 않는다.
v4.6~v4.9의 합의된 범위는 [로드맵](v410-v49-recording-search-roadmap.md)을 유지한다.

녹화 누적 이력에 따라 catalog/catalog view 등의 메모리가 증가하는 기존 운영 한계가 남아 있다.
[메모리 운영 한계](development-backlog.md#녹화-누적-이력의-메모리-운영-한계)를 유지하며
아래 검증의 기능·수명 PASS를 무제한 운용·누수 없음으로 확대하지 않는다.

macOS의 새 증거 PNG 추출은 처음부터 **SoftwareOnly 후보**를 사용한다. 색인·실시간과 Linux
기본 Automatic 정책은 변경하지 않았다. 과거 package bytes/hash의 읽기는 유지하며,
환경 간 재디코딩 RGB의 보편적인 byte 동일성은 보장하지 않는다. 이 정책은 하드웨어 decoder의
근본 원인 수정으로 설명하지 않으며, 최종 채택과 소유자의 운영위험 수용은 별도 결정이다.

## 검증과 배포 경계

75 마감 당시 제품 src/include는 `9257ed8b2044f9e8def4dd9984abea8c022fae1b` 후보와 같았다.
현재는 메모리 P0의 Journal 검증 사본 수명을 보완했다. 이는 전체 누적 이력의 상주 상한
해결이 아니며 [76 부분 수정·미충족](release-artifacts/v4.5.0/76-validation.json)을 별도로 판정한다.
혼합 실행기는 73에서 고정한 `8a5354b7a37961e26e24fd1d03aa55c30ceec2b5` 이후 불변이다.
다음은 기존 실행을 실제 범위에 연결한 근거이며, 최신 HEAD 전체를 한 번에 실행한 결과가 아니다.
원본은 [보존 이력](history/README.md#v450-후보-검증과-종료-기록)의 고정 commit/path에서 조회한다.

| 근거 | 실제 source·환경과 재사용 범위 |
| --- | --- |
| 56 독립 검토·결속 | 검토 `6d91b2f9155073cd2a51f940cf35fa3333b8f44b`; 필수28개 판단·legacy986 결속. 이후 신규 정책의 자동 승인이 아님 |
| 59 Linux | 검토 `9d27479dd69eb27f9d2deaf86b76d8290dcea482`; Debian forky/sid arm64·rc58, 정확한 GStreamer1.28.7 core/parser/mux profile의 생성·이전자료 읽기·독립 readback·seek·실제 영상 검색·A/transport/decoder 단기 검증. 다른 배포판·x86_64/GPU·배포 실환경은 미검증 |
| 61 공통 acceptance | 실제 `72cc7643d681b75228b80fd646921965ecacba75`; macOS에서 기능 gate48개·일반30분·canonical424개와 Policy v4 적격성·일반120분·최종 무결성 PASS. 이후 guard/decoder 정책의 전체 acceptance를 새로 실행한 것으로 확대하지 않음 |
| 63 필수 보완 UI | `ec5bdfb1e5d1422f3832b213ad1dafb164219b6f`와 원본의 pre-commit source+diff/fixture 결속; 유효한 61/62 근거와 새 모델409/이력·만료/비활성·dark clip 등의 독립 적격성 PASS. canonical 개수에 합산하지 않음 |
| 65 선택 자료 guard | 제품 `0334b7449822c0e5eefcb677d792f055330365f2`; 결정적 무효화 반례·유한 선택자료 재검증/원자 게시·독립 저장 재조회·짧은 녹화/검색/A 통합과 독립 변경분 검토 PASS |
| 67·68 및 69~72 Linux 변경분 | rc58 arm64/GCC, GStreamer/ONNX/SigLIP2 ON. 관측 seed/recovery/readback, 비특권 UID10001의 bound/legacy/core/confirmed/fresh-read 및 이후 decoder 직접 소비자 회귀. 정확한 snapshot+diff와 각 원출력 범위에서만 적용 |
| 72 후보 직접 검증 | `9257ed8b2044f9e8def4dd9984abea8c022fae1b`; SoftwareOnly/Automatic 제한 비교·macOS/Linux 직접 소비자·package/readback과 독립 검토. 최초 full-trace 수집 FAIL·당시 채택 보류는 보존 |
| 73·74 통합 | 73 실제 `8a5354b7a37961e26e24fd1d03aa55c30ceec2b5`의 bounded 연결·600초 PASS. 74 실제 `6a03cece468957f845f858fcddacfe5fe977faf1`, tree `8a96e7262eeba2afd39c893449f6024ab02ab6f6`에서 같은 바이너리/runtime으로 혼합120분과 후속 수명·복구 PASS |

74의 본 관측은7201.527초, 전체7298.316초다. 본 A120건과 재활성화 A1건, 취소·미게시,
권한 회수401·저장소 불변, 독립 복구3회·재시작·재활성화·정상 종료를 확인했다.
1440개 자원 표본과 bounded 로그 수신/저장 bytes가 결속됐으며 관측 예산 위반은0이다.
대표 Automatic/SoftwareOnly 표본은 전체 호출의 전수 factory 관측이 아니다.
복구 receipt와 실제 assertion 범위는 유지하며 보존되지 않은 native stdout 전체를 복원하지 않는다.

기존 기능·수명·수집 근거는 당시 범위에서 **충족**이다. 2026-10-10 사용자 요구에 따라
**메모리 증가의 주요 소유자 확인·불필요한 잔존 제거·상주 수명/byte 상한 구현과 검증을
v4.5.0 출시 전 P0**로 추가했다. 현재 메모리 blocker는 미해결이며 운영 제한 수용으로
대신 마감하지 않는다. 75 당시의 조건부 기술 권고·독립 판단은 역사 원본에 유지한다.
소유자의 운영위험 수용은 **not-granted**, 최종 출시 채택은 **not-performed**다.
이번 문서 마감과 AI 검토를 사용자 결정이나 공개 승인으로 해석하지 않는다.

74 RSS 최대3209412608바이트, 후warmup 증가122486784바이트·약1.015892MiB/min은
해당 실행의 측정값이다. `resourceTrendPass=false`, `reviewRequired=true`는 유지한다.
세부 할당 귀속·physical footprint·순간 peak·무누수는 미확인이고 일/주 단위 외삽이나
안전 운영시간을 제시하지 않는다. 2채널·120분은 검증 부하이며 공식 지원 상한이 아니다.
파일 quota는 Catalog/Journal 누적 이력 RAM을 제한하지 않으며 재시작으로 이력이 정리된다고
보장하지 않는다. RSS 전부를 누수 또는 할당기 잔존이라고 단정하지 않는다.

57 환경 BLOCKED, 59/60 acceptance FAIL, 62 K09 최초 FAIL, 64/68/70 장시간 FAIL,
70/71의 내부 원인 미확정과 72 수집 FAIL은 과거 원본에 유지한다. 새 PASS로 소급 변경하지 않는다.
Qwen/Ollama 생성·미채택 모델 품질 실험·외부 서비스/원격 GPU 실환경은 이번 근거에 포함되지 않는다.
실제 승인된 SigLIP2·YOLO 추론과 구분한다. 현재 모델 신규 Submit409·과거 조회·A 계약을 유지한다.

배포는 Apache-2.0 **source-only**다. 모델 가중치·미디어 런타임·컨테이너 이미지를 배포하지 않는다.
source-only도 운영위험 판단을 면제하지 않는다. 사용법은 [설정 참조](config-reference.md#recording-env)와
[UI 가이드](ui-guide.md), 공개 순서는 [릴리즈 정책](release-policy.md)을 따른다.
종료 기록은 원격 Git 원본 확인 후 별도 정리하며 보존/삭제 이력을 squash하지 않는다.
77의 미채택 통합/최초 실패는 [당시 원본](release-artifacts/v4.5.0/77-validation.json)에 유지한다.
78은 파생 scratch의 자원·접근·명시적 마감을 보완하고 실제 Journal의 역사 identity 조회를
비상주 경로에 연결한다. 원본 journal/shard/archive의 형식·권위·허용량은 유지한다.
[78 제품 연결](release-artifacts/v4.5.0/78-validation.json)을 유지하며,
[79 통합 체크포인트](release-artifacts/v4.5.0/79-validation.json)의 정상 generation 비상주/streaming
경계는 유지한다. [80 부분 검증](release-artifacts/v4.5.0/80-validation.json)은 중복 checkpoint
순회·구형 완료 행 join·완료 job 상주를 보완했지만, 녹화/검색 병행 검증의 deadline 실패와
전체 reader·보존 집합의 메모리 잔여가 있다. [81 부분 검증](release-artifacts/v4.5.0/81-validation.json)은
90초 안의 종료와 기존 비상주 경계를 확인했으나, checkpoint 병행 검색 p95가 기준을 넘어
FAIL이다. [82 검증](release-artifacts/v4.5.0/82-validation.json)은 고정 cut과 후속 내구 쓰기를
분리한 checkpoint에서 실제 녹화·검색 병행 지연과 정상 종료를 충족한다. 과거 FAIL은 유지하며,
[83 부분 구현](release-artifacts/v4.5.0/83-validation.json)은 보존 행·축약 불가능 legacy의 cold 소비,
검색 모델 소유 수명의 논리 예약과 queued A 취소 입력 해제를 연결하고 B/C를 별도 실행했다.
[84 부분 연결](release-artifacts/v4.5.0/84-validation.json)은 실제 소유 예약·동시 D와 병행 지연을
검증했지만, 최대 유효 legacy 행의 admission 보존과 B/C 전체 수렴은 미충족이다.
정확한 잔여는 [현행 backlog](development-backlog.md#v450-잔여-개발과-릴리즈-순서)를 따른다.
전체 메모리 P0와 수정 후보의 최종 혼합 검증은 출시 전 차단으로 유지한다.
새 checkpoint의 nonempty active receipt는 현재 구현에서 검증·복구하며, 구버전 binary의
새 checkpoint 읽기까지 보장하지 않는다. 기존 원본·package/record 형식과 hash 의미는 유지한다.
기존 74의 기능·수명·수집 PASS는 당시 소스의 근거이며 새 메모리 변경의 통합 PASS를 대신하지 않는다.
소유자는 미해결 메모리 증가의 위험 수용에 동의하지 않았다. 최종 출시 채택·PR/required CI·main 병합·서명 태그·Release/Latest 확인은 보류·미수행이다.
공개 metadata의 기존 관측 시각은 이번에 갱신하지 않았다.
