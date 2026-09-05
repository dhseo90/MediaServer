# v4.1.0 S05 실제 서비스 lifecycle·종료 진단 증적

이 디렉터리는 실제 `build-gst-onnx/media_server`를 격리된 임시 상태·data·event·recording
root와 임의 loopback 포트에서 실행한 foreground 후속 `nohup`/`launchd` 검증 기록이다.
fixture, 장시간 테스트, UI 풀테스트 또는 릴리즈 PASS로 확대하지 않는다.

## 종료 지연 원인과 수정

첫 `nohup` 재시작에서 `stop_server.sh`가 정상 종료 제한을 넘겨 SIGKILL을 사용했다.
PID 상태 표본은 zombie가 아닌 실행 중인 제품 프로세스였고, `/usr/bin/sample`은 main thread가
`RunMediaServerApplication → StopEventStorage → EventStorageDispatcher::Stop → join`에서,
storage worker가 `ApplyMediaHooks → FileEventClipHook::CaptureClip → FramesForClip`의 미래
post-event frame 대기에서 멈춘 것을 확인했다. runner가 재시작 전에 tap을 닫으므로 해당
frame은 더 이상 도착할 수 없었다.

`src/analysis/event_storage.cpp`의 `EventFrameBuffer::CancelPostEventWaits`가 종료 시 이
미래 frame 대기만 깨운다. `EventStorageDispatcher::Stop`은 이미 접수된 EventRecord의 JSONL
저장을 계속 drain한 뒤 worker를 join한다. 두 번째 정적 소멸 호출은 이미 종료·join된 상태에서
frame buffer를 다시 만지지 않도록 멱등 반환한다. timeout 값은 늘리지 않았다.

`VerifyShutdownCancellation`은 3초 post-event 대기에 실제 worker가 들어간 뒤 종료가
1초 안에 끝나고, queue가 비며 `stored_count=1`인지를 확인한다. 이 세 assertion은 기존
`V410-S05-I27`의 `C02~C04`로 등록했다.

## 실제 결과

| 파일 | 결과 | 핵심 결과 | SHA-256 |
| --- | --- | --- | --- |
| `actual-nohup.json` | FAIL | 최초 runner의 재시작 후 진단 RTSP probe timeout | `6252cc63475d6dfab8e82822b419f2abbf967d2fee402a5d2b27a5bc8868797d` |
| `actual-nohup-rerun.json` | FAIL | 정상 종료 대신 강제 종료 사용을 최초 확인 | `63ca61efedb6c17f50ad8ff8844b180841171443707b183e92338bd2aae63d4a` |
| `actual-nohup-stop-observed.json` | FAIL | PID 상태와 exact 강제 종료 marker를 보존 | `e9fe946b175a67ac702805a32f70e4077fc5db5516f6a519b818ef7e3898cf3b` |
| `actual-nohup-sampled.json` | FAIL | sample과 결속된 동일 종료 지연 재현 | `d5bf1797d936a53662e2d839dbd9b39c8618110ed36964fc7fa1d3258b226f8f` |
| `actual-nohup-shutdown-fixed.json` | PASS | 29/0, 강제 종료 0회, 재시작 old PID 약 2.0초·최종 stop 약 1.3초 | `b638bca0abcb659888086960fe6951b4c01ad6a9c188fd4b008f57c29b6e0808` |
| `actual-launchd-shutdown-fixed.json` | PASS | 29/0, 강제 종료 0회, exact label 정리, 재시작 old PID 약 1.3초·최종 stop 약 1.5초 | `213ab89731abea46a497ecbc3af3119144e57031f6857f4a27926edec42ebbd2` |

두 최종 PASS는 각각 녹화 segment 생성, 이벤트와 catalog exact link, 재시작 source/catalog,
새 segment/event/link, 정상 종료, PID·포트·label·상태 파일 부재와 임시 root 삭제를 포함한다.
파생 clip 전체 coverage, 외부 RTSP, 다른 PC, 30분·120분 또는 UI 검증은 포함하지 않는다.

## SSIM blacklist 원인

`libgstvalidatessim.dylib`은 별도 GTK 설치물이 아니라 Homebrew `gstreamer 1.28.1` formula가
제공하는 GstValidate 전용 모듈이다. 일반 GStreamer plugin scanner로 단독 로드하면
upstream `gst_validate_ssim_init`이 `gst_validate_is_initialized()`가 거짓인 경우 `FALSE`를
반환하므로 registry에 blacklist로 기록된다. 이는 dylib·의존 라이브러리 누락이 아니다.

의도된 `GST_VALIDATE_PLUGIN_PATH`와 `gst-validate-1.0`에서는 동일 파일이 정상 로드되어
`videotestsrc`의 PNG 한 장을 생성했고 종료 코드 0과 `Issues found: 0`을 반환했다. 제품
소스의 GstValidate/SSIM 호출은 0건이고 제품 Mach-O의 validate/SSIM 동적 링크도 0건이다.
따라서 패키지 삭제, 전역 설정 변경, 제품 필수 plugin 제외는 하지 않는다.

- 설치 파일 SHA-256: `dc10718d780d48de45ae02bd5bd9b5d107a8b7a8109414437bb60d5caf847726`
- 공식 역할: [GStreamer SSIM plugin 문서](https://gstreamer.freedesktop.org/documentation/gst-devtools/plugins/ssim.html)
- 초기화 조건: [GStreamer 1.28.1 gstvalidatessim.c](https://gitlab.freedesktop.org/gstreamer/gstreamer/-/raw/1.28.1/subprojects/gst-devtools/validate/plugins/ssim/gstvalidatessim.c)

## 임시 진단 산출물

종료 sample 원문 `/private/tmp/media-server-v410-s05-shutdown.sample.txt`는 646,728byte,
SHA-256 `c0a6fe159e2b316459cc163a9c3c2d949ce364ed86b7bc9abc5946768573b33e`였다.
위 원인·call chain을 이 문서로 이관한 뒤 삭제한다. SSIM probe 두 root 중 첫 root는 symlink
1개와 일반 파일 0개, 두 번째 root는 registry/config/PNG 4파일 1,526,447byte다. 모두
재생성 가능한 진단 전용 산출물이므로 크기 확인 뒤 삭제하고 Homebrew 설치 파일은 보존한다.
