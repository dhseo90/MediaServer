# S10 3C-5A 실제 파일 시간 측정 결과

독자: 녹화 시간 계약 구현·검토 담당자. 이 문서는 2026-09-13 실행 증적이며 정책 문서가 아니다. 요구사항과 등록은 기존 구현계획 및 `docs/release-test-records.md`의 C501~508을 따른다.

## 결과와 한계

메인 확인: 최종 로그300 packet/12 segment/8 pass 행, source/runner/원출력4개 SHA가 보고값과 일치했다.
임시 경로 부재 확인과 `git diff --check` exit0. 문서 링크 검사도 통과했다.
후속 제품 구현 전 초기 pre-event 요청 저장 계약 판단이 별도로 남았다. 이 측정 단위에서 validator를 변경하지 않았다.

측정 단위만 완료했다. 최종 8개 검사 pass, fail 0이며 12개 파일의 encoded AU 300개를 전수 기록했다. 제품 코드는 변경하지 않았다. 실제 파생 영상 생성·복구, seek 실행, 플레이어/UI, 패킷의 고유 identity 증명은 미실행·미확인이다. 이 결과는 파생 계약 전체 PASS가 아니다.

자체 `videotestsrc`의 실제 H264 encode 결과를 기존 fixture 방식대로 첫 유효 PTS/DTS 최솟값으로 정규화하고, 실제 managed writer와 catalog를 거쳐 생성한 MP4를 `qtdemux → h264parse → appsink`로 측정했다. 원본 observation은 이 실제 encoded timestamp에 맞춘 합성이며 SourceFactory 관측 전체 통합이 아니다. 원본 binding과 demux AU의 **decode-order 대응은 측정 가설**이다. payload identity나 실제 decoded frame의 유일성을 증명하지 않는다.

모든 파일에서 `원본 PTS − 파일 PTS − media_start_pts`의 실측 최솟값/최댓값은 정확히 0이었다. 허용 오차를 적용하지 않았다. 이 표본의 결과를 모든 컨테이너·파이프라인에 일반화하지 않는다.

- B2 두 경우 각각 30개 AU에서 파일 PTS와 GstSample segment stream-time의 차이는 200,000,000 ns였다. 첫 파일 PTS=200 ms, segment.start=200 ms, segment.time=0, stream-time=0이다. 향후 seek 해석에서 두 축을 혼동하면 안 되지만 이번에 실제 seek를 실행하지 않았다.
- 30000/1001 경우 30개 중 20개 duration은 원본 33,366,667 ns, demux/parser 결과 33,366,666 ns로 −1 ns였다. 나머지 10개는 33,366,666 ns로 같았다. PTS 대응은 정확했다. 두 값 차이는 물리 영상 손상 확정이 아니며, demux/parser 중 어느 단계가 원인인지는 분리 측정하지 않았다.
- C507은 두 `estimated` UTC mapping이 역행하면서 미디어 범위는 이어졌다. 최초 검토의 unknown 예상은 기존 `RecordingWriterTimeState::Accept`의 clock residual split 동작을 직접 대조해 정정했다. 정책 완화나 제품 수정이 아니다. 초기 측정은 unknown 검증 PASS로 사용하지 않는다.

## 개별 결과

| 제목 | 실제 수행 및 관측 | pass/fail | 비고 |
| --- | --- | --- | --- |
| C501 H264 실제 파일 시각 측정 | 무 B-frame 10 fps, 입력 30/AU 30/파일 1, 원본−파일 PTS 0 ns | pass | 실제 생성·finalize·binding·demux 수 일치 |
| C502 비영점 원본 시각 측정 | PTS/DTS에 7초 추가, 입력 30/AU 30/파일 1, 원본−파일 PTS 7초 | pass | 정규화 잔차 0 ns |
| C503 정상 segment 분할 측정 | 입력 60/AU 60, 2초 간격 파일 3개에 각각 20개, 같은 epoch | pass | 미디어 범위 0~2/2~4/4~6초 |
| C504 B-frame decode preroll 측정 | B2 입력 30/AU 30/파일 1, 파일 PTS−stream-time 200 ms | pass | 재정렬 unknown mapping, 실제 timestamp 전수 보존 |
| C505 비영점 B-frame 시각 측정 | B2+7초 입력 30/AU 30/파일 1, 원본−파일 PTS 7초, 파일 PTS−stream-time 200 ms | pass | stream-time과 파일 PTS를 동일시하지 않음 |
| C506 분수 frame rate 시각 측정 | 30000/1001 fps 입력 30/AU 30/파일 1, duration −1 ns 20개/동일 10개 | pass | duration 동등성 PASS가 아닌 차이 측정 |
| C507 시계 역행과 미디어 시각 분리 | 입력 30/AU 30/파일 1, UTC만 −4,034 ms 변경, estimated mapping 2개와 역행 endpoint 직접 확인 | pass | unknown 발생은 요구하지 않음 |
| C508 PTS 초기화 epoch 분리 | 입력 60/AU 60/파일 3, generation a/b의 epoch 다름, b의 두 파일 epoch 같음 | pass | 각 binding last_accepted_ordinal도 직접 대조 |

## 12개 segment 측정 요약

아래 시간 단위는 ns다. `offset`은 원본 PTS−파일 PTS의 min=max이며 모든 행에서 constant_offset=true, 정규화 잔차 min=max=0, EOS=true였다. UUID·generation/order·ordinal 및 패킷별 정확값은 [Final.log](Final.log)에 전수 보존한다.

| case/segment | AU | media_start | media_end | offset |
| --- | ---: | ---: | ---: | ---: |
| C501/0 | 30 | 0 | 3000000000 | 0 |
| C502/0 | 30 | 7000000000 | 10000000000 | 7000000000 |
| C503/0 | 20 | 0 | 2000000000 | 0 |
| C503/1 | 20 | 2000000000 | 4000000000 | 2000000000 |
| C503/2 | 20 | 4000000000 | 6000000000 | 4000000000 |
| C504/0 | 30 | 0 | 3200000000 | 0 |
| C505/0 | 30 | 7000000000 | 10200000000 | 7000000000 |
| C506/0 | 30 | 0 | 1001000000 | 0 |
| C507/0 | 30 | 0 | 3000000000 | 0 |
| C508/0 | 20 | 0 | 2000000000 | 0 |
| C508/1 | 20 | 0 | 2000000000 | 0 |
| C508/2 | 20 | 2000000000 | 4000000000 | 2000000000 |

C507 첫 mapping은 media [0,1500000000), UTC [1789200000000000000,1789200001500000000)이며 둘째는 media [1500000000,3000000000), UTC [1789199997466000000,1789199998966000000)이다. 두 UTC endpoint가 실제 역행했다.

C508 첫 epoch는 `e5974515-fe82-4828-9b0e-d88aac3c3d44`, reset 뒤 두 파일은 `b20b07cf-d7c7-4dc2-8e70-66e12bc23f66`이다. generation a/order 1의 ordinal 1~20, generation b/order 2의 ordinal 1~20 및 21~40을 기록했다.

## 실행과 정리

| 실행 | 정확한 명령 | exit/결과 | elapsed와 원출력 |
| --- | --- | --- | --- |
| 초기 72389 | `bash scripts/internal/verify_recording_derived_time_probe.sh` | 0, pass 8/fail 0 | 4초, [Probe.log](Probe.log), packet 300행 |
| 최종 79871 | `bash scripts/internal/verify_recording_derived_time_probe.sh` | 0, pass 8/fail 0 | 4초, [Final.log](Final.log), packet 300행 |

초기 결과를 보존하고 최종 실행에서 C507 provenance/UTC endpoint 역행, C508 epoch 분리 및 last ordinal 직접 assertion을 보강했다. 두 실행 모두 컴파일 오류·테스트 실패는 없었다. 전체 도구 반환을 보존했으며 화면 표시의 토큰 축약과 달리 저장 원출력에는 truncation marker가 없고 각 300 packet 행이 있다. elapsed source는 runner의 `bash SECONDS`다. token start/end/consumed는 담당자 단위 집계 API가 없어 미집계다.

| 임시 경로 | 종류 | 삭제 전 bytes | 조치/결과 |
| --- | --- | ---: | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-time.QjhJqT` | 초기 실행 binary·MP4·managed store | 4799362 | 소유 prefix/부모 확인 후 삭제, removed=true |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-derived-time.Oalgpl` | 최종 실행 binary·MP4·managed store | 4799554 | 소유 prefix/부모 확인 후 삭제, removed=true |

원출력은 Probe.log 94,697 bytes/358행, Final.log 105,391 bytes/360행이다. 자체 fixture의 시간·불변 ID·검사 결과만 저장했으며 영상·비밀번호·외부 endpoint는 보존하지 않았다. 전체 원출력은 재현 비교를 위해 보존한다. 외부 호출·포트·운영 데이터 사용은 없다.

## 재현 기준과 변경 범위

- 기준 HEAD: `a05c15ddef9d2cae95f6042635b76f2ae4d99ca7`
- GStreamer/gstreamer-app 1.28.1, SQLite 3.51.0, OpenSSL 3.6.2; 실제 실행 환경은 macOS다.
- 신규 파일: `scripts/internal/recording_derived_time_probe.cpp`, `scripts/internal/verify_recording_derived_time_probe.sh`, 본 증적 디렉터리만. 기존 제품 및 S09 dirty는 변경하지 않았다.
- probe SHA256: `8ec20bff02f6299e14c2b62bff14d9f6b2e6f28b94a480988f3e70648727515d`
- runner SHA256: `dc3cd0cbb53d553e07b9548b0de9f6d44f231d221bee241445a4974431ddf30a`
- Probe.log SHA256: `7de7ab79cdcfb77f83dcd6184c7065e1c8a5376ce1f85a413b32605fa15a8414`
- Final.log SHA256: `627d86ee6aec61cd9a8b0d8d5be669dabe3211b799fac5c0e37f69b19e127673`

승인된 계획 실행 절차에 따라 측정과 결과 보존만 수행했다. 후속 파생 계약·제품 구현, 전체 build/회귀, 장시간/UI는 이번 담당 범위에서 미실행이다. 커밋·푸시는 수행하지 않았으며 메인의 최종 검토·통합 대상이다.
