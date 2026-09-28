# S11 녹화 UI 직접 검증 기록 — 2026-09-23

독자: v4.1.0 검증·릴리즈 판정 담당자. 수명: 실행 증거를 보존하는 이력 문서.
정책 source-of-truth는 AGENTS.md, action 정의는 `docs/manual-ui-result-template.md:38–82`다.
이 보고서는 실행 담당 메인의 직접 관측과 보존 JSON·이미지·종료 로그를 대조한 결과이며,
새 테스트 실행이나 전체 UI432·장시간·릴리즈 PASS 선언이 아니다.

## 보존물과 결과 범위

- [브라우저 증거 묶음](browser-evidence.tar.xz): 3,278,428 bytes, 78 entries.
- SHA-256: `4a9db9ea002e3cdc6f1d484107960bf88c9cb2d37b785f0aa00250aa11f932ac`.
  작성 시 실제 파일 hash를 읽어 대조했다.
- 압축 내부에 `ui-actions.json` 36개 관측, `ui-responsive.json` 6개 측정,
  `ui-range-summary.json` 26개 HTTP 관측, run1~5의 start/ready/end/private 로그와 PNG가 있다.
  36개 관측은 31개 action과 일대일인 테스트 수가 아니다.
- screenshot의 임시 절대 경로는 수집 당시 위치다. 영속 증거는 이 묶음 안의 같은 basename이다.
  임시 계정의 비밀번호·쿠키·미디어 URL을 본문에 재기록하지 않는다.
- 실제 evidence mode는 direct-browser다. 브라우저 조작은 메인이 수행했고 이 문서 담당자는
  재실행하지 않았다. 아래 PASS는 명시된 조작과 관측 범위에 한정한다.

**31개 action 대조: PASS 30행, FAIL 1행(I30 이벤트 우선 영상의 실제 재생)이다.**
추가 조회로 quota API 숫자와 역할별 비노출을 대조했고, 8종 반응형의 영상·입력·초점·시각적 대비와 접근성 이름을 직접 검토했다. 독립 WCAG 수치나 스크린리더 실행을 했다는 뜻은 아니다.
최초 I31 공백 FAIL 및 run2 준비기 종료 FAIL은 아래에 별도로 보존한다.
I30 실패를 다른 MP4 성공으로 대체하지 않으며 녹화 UI 전체 완료 판정은 보류한다.

## 실행·실패·재검증 이력

실제 준비 명령은 Node v24.13.0으로 다음 entry를 실행했다. 실제 브라우저 조작은 별도이며
준비기 exit0 자체가 UI action PASS를 뜻하지 않는다.

```sh
node scripts/internal/verify_v410_recording_ui_contract.mjs --ui-auth-direct --ui-anchor-utc-ms <각 실행 anchor> --ui-seek-fixture
```

| 실행 | UTC 시작 → 종료 | anchor | wrapper elapsed | exit | 실제 관측과 실패 보존 |
| --- | --- | --- | --- | --- | --- |
| run1 | 2026-09-22 22:20:13.242 → 22:37:17.404 | 1790115540000 | 1,024,160.477ms | 0 | 수정 전. MP4 재생/정지/seek, 필터·페이지·원본·오류 상태·역할/반응형 관측. 시간 확인 결과가 비었는데 무시간 자료를 자동 선택한 I31 공백 FAIL |
| run2 | 22:39:26.286 → 22:41:04.062 | 1790116680000 | 97,775.604ms | 1 | 수정 후 브라우저 gap/error는 메인 관측상 PASS. 그러나 운영자 stdin EOF 실수로 hold 실패. 정상 종료 실행으로 승격하지 않음 |
| run3 | 22:41:38.254 → 22:42:35.619 | 1790116800000 | 57,364.750ms | 0 | 수정 후 gap, 명시 선택, 오류, 정상 조회 복구, 이벤트 우선 동작 재검증 PASS. run2 실패 이력 유지 |
| run4 | 22:43:57.006 → 22:44:53.895 | 1790116920000 | 56,889.017ms | 0 | `/ops/sources`에서 채널3 활성→비활성→재활성 실제 클릭. `/ops/events` 상태 카드가 녹화 중→녹화 중 아님→녹화 중으로 반영 |
| run5 | 22:50:45.265 → 22:53:33.197 | 1790117340000 | 167,931.454ms | 0 | 상태 API 4채널 사용량·한도를 UI와 대조. admin/operator/viewer/미인증 화면 비노출 확인. 필수 시간 공백은 `valueMissing=true`와 native 안내 확인. API 문서 탭은 브라우저 정책상 차단되어 격리 서버의 임시 계정으로 read-only HTTP 수행 |

start JSON의 source는 다섯 실행 모두 `32f8ac77311791bd0d7e039dc5555f7bba209a74`다.
이는 HEAD 식별자이며 **run2~4의 미커밋 수정 전후 소스가 동일하다는 증거가 아니다**.
메인의 수정 diff/build 증거와 함께 해석해야 한다. 각 실행 token start/end/consumed는
null, 이유는 `실측 집계 미제공`이다. UTC와 화면의 한국 현지 시간은 9시간 차이다.

### MP4와 TS를 구별한 결과

`seek-play-pause` 관측은 managed 원본 MP4 10초·1280×720에서 실제 재생 시간
5.647→10, seek 2.094, pause 5.818 고정을 기록했다. `ui-range-summary.json`의 26행 중
nonzero seek 6행은 모두 HTTP206이며 완료 true 4행/false 2행이다. 중단된 전송을 완료로
바꾸지 않는다. `isSeek` 표시만으로 모든 요청이 탐색 버튼 때문이라고 단정하지 않고 실제
control 조작·시간 변화와 결합한다. 원장에 HTTP404 1행도 별도로 남아 있다.

파생 이벤트는 실제 MPEG-TS(`video/mp2t`) 형식을 유지했다. Chrome에서 파일 제공 가능/디코딩 미확인,
형식·코덱 지원 경고 및 실제 재생 실패가 관측됐다. **이벤트 TS의 브라우저 디코딩 성공은
PASS가 아니다.** 이는 로드맵의 `event > continuous` 기본 재생과 충돌하는 P0 실패다.
`actions:i27-normal`·`i28-event-priority`의 선택 항목은 이벤트이지만 video ready=0,
duration=null, width=height=0이며 playback 문구는 `재생 실패`다. 반면 원본 MP4는
video ready=4와 시간 진행이 확인됐다.
파일 제공·부분 구간·우선순위 표시 PASS와 원본 MP4 재생 PASS로 이를 대체하지 않는다.
제품 경로는 `event_clip_deriver.cpp`의 TS 생성, `recording_read_service.cpp`의 `video/mp2t` 제공,
`product_ui_page_scripts.cpp`의 native video 선택으로 이어진다.

### 격리 형식 비교 — 제품 적용 전

프로젝트 제공 `video/sample_h264_video_only.mp4`(10초)를 GStreamer의
`qtdemux ! h264parse ! mp4mux fragment-duration=1000 streamable=true`로 재인코딩 없이
격리 출력했다. 일반 파일 출력과 FD 출력은 각각 138,758바이트였고 ffprobe에서
MP4·10.000초로 판독됐다. FD 출력의 임시 loopback 제공을 실제 인앱 브라우저에서
열었을 때 영상 1280×720, duration/currentTime 10.033333초, readyState=4,
error=null을 관측했다. 임시 탭·서버·TCP 포트와 1.8MiB 임시 디렉터리는 정리·부재
확인했다. 최초 sandbox 실행 2회는 macOS 서비스 연결 오류로 중단했고, 격리 실행
환경을 적용한 승인된 실행에서 위 결과를 얻었다.

이는 **후보 방식의 단일 샘플 관측**이다. 실제 이벤트의 복수 원본·B-frame·정확한
시각/구간·원자 확정·복구·보존·취소·Range·브라우저 간 호환, 특허/라이선스 판정은
확인하지 않았다. 현행 TS 저장 계약을 변경하거나 I30 FAIL을 PASS로 바꾸지 않는다.
[GStreamer mp4mux](https://gstreamer.freedesktop.org/documentation/isomp4/mp4mux.html)는
분할 MP4 옵션을 설명하고 [isomp4 플러그인](https://gstreamer.freedesktop.org/documentation/isomp4/index.html)은
Good Plug-ins 소속이다. [Good Plug-ins 라이선스 안내](https://gstreamer.freedesktop.org/modules/gst-plugins-good.html)는
플러그인 코드가 LGPL이라고 설명하지만, 이 사실만으로 파일 형식·코덱 특허 위험이
해소됐다고 판정하지 않는다.

선택 후보는 두 가지다. 이벤트 파생 저장을 브라우저 호환 MP4로 일원화하면
`event_clip_deriver`와 `recording_derived_remux` 두 생성 경로, 작업 profile·경로,
ready 검증·catalog/recovery·미디어 검사·HTTP 제공을 함께 바꿔야 한다. 현행 TS를
보존한 채 조회 때마다 MP4를 만들면 영속 계약은 유지하지만 재생용 파일의 용량·수명,
동시 요청·삭제 경쟁·권한·Range라는 별도 보존 체계가 생긴다. 시간·복구 기반을
중복시키지 않는 관점에서 전자가 우선 비교 후보이나, 단일 샘플 성공만으로 채택하지
않는다. UI에서 상시녹화로 조용히 대체하면 이벤트 우선 재생 요구를 위반하므로 제외한다.

## 8개 ID·31개 action 전수 대조

아래 증거명은 압축 내부 이름이다. `actions:<name>`은 `ui-actions.json`의 해당 객체다.
‘—’는 최종 pass/fail 미판정이며 별도 실행 상태·잔여를 기입한 것이다.

| 번호 | ID·테스트내용 | pass/fail | 실행 상태·관측·증거·잔여 |
| --- | --- | --- | --- |
| 1 | I27 정상 필터 | PASS | 채널1·07:19~07:20 입력/조회, 시간 확인115개·첫 페이지100개. `actions:i27-normal` |
| 2 | I27 빈값·빈 결과 | PASS | 메인이 시작값 비움 후 native “이 입력란을 작성하세요” 안내를 직접 확인(`ui-i27-empty.png`). 빈 범위는 결과0. 수정 후 영상 해제는 run3 gap 증거. 네트워크 요청0건은 계측하지 않았으므로 주장하지 않음 |
| 3 | I27 역전 시간 | PASS | 시작>종료 거부·올바른 시간 안내·영상 해제. `actions:i27-reversed` |
| 4 | I27 다음·이전 페이지 | PASS | 100행→잔여15행(원본 숨김이면14표시)→100행 복귀·선택 변경. `actions:i27-next`, `i27-previous` |
| 5 | I28 이벤트 우선 | PASS | 겹치는 event 초기 선택·종류/시간·우선 표시. `actions:i28-event-priority`, 수정 후 `ui-impact-event-priority.png`. TS 디코딩 성공은 제외 |
| 6 | I29 원본 보기·선택 | PASS | off14/on15행·중첩 continuous 원본 선택 및 badge. `actions:i29-original-hidden/shown/select`, `ui-impact-original-view.png`, `ui-impact-page2-original-off.png` |
| 7 | I30 재생 | FAIL | 상시녹화 MP4는 실제 영상·시간 진행(`actions:seek-play-pause`) PASS. 하지만 기본 선택되는 이벤트 TS는 Chrome 실제 재생 실패(`actions:i27-normal`, `i28-event-priority`). 로드맵의 이벤트 우선 재생 조건을 만족하지 못함 |
| 8 | I30 일시정지 | PASS | paused·5.818초 고정 관측. `ui-paused.png`, `actions:seek-play-pause` |
| 9 | I30 seek | PASS | 실제 탐색 control·2.094초 반영 및 Range206. `actions:seek-play-pause`, `ui-range-summary.json`. 일부 전송 중단 별도 보존 |
| 10 | I31 partial | PASS | 일부 구간·파일 가용성/디코딩 미확인 분리 표시. `actions:i31-partial`. TS 재생은 미지원/실패이며 정확한 missingRanges UI는 이번 정의 밖 |
| 11 | I31 삭제 | PASS | 삭제됨·파일 제공 불가·공통 재생 차단 안내. `actions:i31-deleted` |
| 12 | I31 손상 | PASS | 손상됨·파일 제공 불가·공통 재생 차단 안내. `actions:i31-corrupt`; 삭제 사례와 별도 |
| 13 | I31 미완결 event | PASS | Pending event 선택 시 출력 없음·재생 차단. `actions:i31-pending`, `ui-i31-pending.png`. Writing 검증으로 대체하지 않음 |
| 14 | I31 공백 | PASS | 최초 `actions:i31-gap-before-fix` FAIL: 시간 확인0인데 unknown MP4 자동 선택. 수정 후 run3 메인 직접 관측에서 선택 영상 해제, unknown 수동 선택은 유지. `ui-i31-gap-final.png`; 초기 FAIL 삭제 안 함 |
| 15 | I31 조회 오류·복구 | PASS | run3 메인 직접 관측: 오류 안내·stale 상태 처리, 정상 조회로 복구. `ui-i31-error-final.png`, `ui-i31-recovery-final.png`. run2 hold FAIL과 분리 |
| 16 | I32 quota | PASS | 상태 카드의 continuous/event 사용량·상한을 실제 관리 API GET 200의 4채널 값과 대조. `ui-i32-status.png`, `quota-api-check.json`. 격리 실행 값에 한정 |
| 17 | I32 활성 전이 | PASS | run4 실제 채널3 클릭 전이와 status card 반영. `ui-i32-active-before.png`, `ui-i32-inactive.png`, `ui-i32-reactivated.png` |
| 18 | I32 storageBlocked | PASS | 실제 채널4 카드의 저장 공간 차단 및 1MiB 상한 표시. `ui-i32-status.png`; 모든 storageBlocked 원인의 검증은 아님 |
| 19 | I33 navigation | PASS | 메인의 실제 primary nav·direct route·기존 배치 및 자연어/vector 신규 입력 없음 관측. `actions:i33-nav`, `ui-i33-nav.png` |
| 20 | I34 admin | PASS | 실제 admin 녹화 화면·허용 목록/영상 접근. `actions:i34-admin-redaction` 및 재생 증거 |
| 21 | I34 operator scope | PASS | 허용 채널1만 UI 표시, 다른 채널3 timeline403/media404를 메인이 로컬 진단. `actions:i34-operator`, Range 요약404. 모든 scope 조합으로 확대하지 않음 |
| 22 | I34 viewer·미인증 | PASS | 실제 세션별 viewer Access Denied 및 미인증 로그인 화면. `ui-i34-viewer.png`, `ui-i34-anon.png` |
| 23 | I34 redaction | PASS | run5에서 admin/operator/viewer/미인증의 실제 화면 텍스트를 민감정보·내부 경로·raw debug 패턴으로 직접 대조하고 비노출 확인. `ui-i34-*.png`, `actions:i34-admin-redaction`. 모든 서버 로그·네트워크 응답의 전수 보증은 아님 |
| 24 | I34 320 light | PASS | 실제 화면의 video/form PNG를 직접 검토: 영상·control·날짜·checkbox 잘림 없음, focus ring·문자 식별, 가로 넘침 없음. `ui-i34-320-light*.png` |
| 25 | I34 320 dark | PASS | 같은 직접 시각·조작 대조. `ui-i34-320-dark*.png` |
| 26 | I34 390 light | PASS | root390/form·video324, scroll=client; 영상·control·입력·focus·문자 식별. `ui-i34-390-light*.png`, `ui-responsive.json` |
| 27 | I34 390 dark | PASS | 같은 geometry 및 직접 시각·조작 대조. `ui-i34-390-dark*.png`, `ui-responsive.json` |
| 28 | I34 760 light | PASS | root760/form·video694, scroll=client; 영상·control·입력·focus·문자 식별. `ui-i34-760-light*.png`, `ui-responsive.json` |
| 29 | I34 760 dark | PASS | 같은 geometry 및 직접 시각·조작 대조. `ui-i34-760-dark*.png`, `ui-responsive.json` |
| 30 | I34 1180 light | PASS | root1180/form·video1114, scroll=client; 영상·control·입력·focus·문자 식별. `ui-i34-1180-light*.png`, `ui-responsive.json` |
| 31 | I34 1180 dark | PASS | 같은 geometry 및 직접 시각·조작 대조. `ui-i34-1180-dark*.png`, `ui-responsive.json` |

320×2는 `ui-responsive.json`의 누락 실행이 아니라 `ui-actions.json`의 video/form 4개
관측으로 보존돼 있다. 나머지6개 변형은 responsive JSON과 각 video/form PNG로 연결된다.
가로 scroll=client만으로 시각 품질을 판정하지 않았다. 메인이 video/form 이미지 16개를
직접 확인하고 브라우저 접근성 트리의 날짜·채널·조회·원본 조작 이름과 역할을 대조했다.
PASS는 이 직접 시각·조작 범위이며 독립 WCAG 수치, 스크린리더, 모든 키보드 순서의
검증으로 확대하지 않는다.

## cleanup과 보존 경계

private 로그의 `[cleanup]` 결과와 wrapper end JSON을 직접 대조했다.

| 실행 | seed 임시 root 삭제 전 bytes | 앱 root 삭제 전 bytes | 확인 결과 |
| --- | --- | --- | --- |
| run1 | 8,411,164 | 45,395,561 | seed removed=true, 앱 rootAbsent=true, 서버 exit0/graceful, TCP2개 닫힘, uiUdpClosed=true, groupAbsent=true |
| run2 | 8,411,164 | 18,348,489 | 동일 정리 확인. wrapper exit1은 정리 성공으로 상쇄하지 않음 |
| run3 | 8,411,164 | 17,113,707 | 동일 정리 확인 |
| run4 | 8,411,164 | 16,771,218 | 동일 정리 확인 |
| run5 | 8,411,164 | 20,407,551 | 동일 정리 확인 |

각 실행 cleanup failureCount=0이다. 위는 검증 소유 실행 root 정리이며, 상위 작업 root와
아직 이관·삭제하지 않은 원본 screenshot/수집 자료 전체가 정리됐다는 뜻은 아니다.
본 archive는 실패·복구·조작·정리 근거를 보존하기 위해 남긴다. 상위 임시 root 최종 정리는 메인 기록 대상이다.

## 필요한 후속 증거

1. 이벤트 TS 재생 실패를 해결해야 한다. 기본 우선 선택의 실제 재생 실패는 상시녹화 MP4 재생 성공으로 대체할 수 없으며, 변경한 미디어·저장·복구 경계와 I30을 다시 검증해야 한다.
2. run2~5의 수정 후 소스/build hash·diff를 메인 실행 기록에 연결한다. HEAD hash가 같다는 이유만으로 run1 전수 결과를 수정 후 전수 실행으로 바꾸지 않는다. I31 변경의 영향 범위를 기준으로 유효 증거 유지 여부를 판정한다.
3. canonical424·visual80·Policy qualifier와 이 추가8개/31actions를 분리한다. 별도 브라우저 미디어 8/8은 `browser-media-summary.json`에 기록했으나 녹화 이벤트 재생 PASS가 아니다. 공통/녹화120분 및 최종 release 결과도 별도 증거이며 이 문서만으로 UI432 전체 또는 S11 완료를 선언하지 않는다.

문서 작성 중 새 제품/브라우저 테스트, 제품 수정, 커밋·푸시는 수행하지 않았다.
