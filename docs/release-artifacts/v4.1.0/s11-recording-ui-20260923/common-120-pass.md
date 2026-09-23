# S11 공통 120분 재실행 결과

독자: v4.1.0 릴리즈 검증자. 수명: 실행 이력 보존. 중앙 테스트 기록의 근거 자료이며 현재 정책은 `AGENTS.md`를 따른다.

첫 실행의 무음 HTTP H.264 RTSP probe 20초 시간초과는 [별도 실패 기록](common-120-attempt1.md)에 남긴다. 원인은 확정되지 않았고 재실행 통과로 그 이력을 지우지 않는다. 이 실행은 제품 코드·시간제한·합격 기준을 바꾸지 않고 안전한 RTSP 단계 계수만 켠 동일 바이너리의 새 검증이다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 공통 120분 재실행 | `MEDIA_SERVER_VERIFY_CODEC_DIAGNOSTICS_DIR=<격리 경로> ./server.sh verify-predev --soak-minutes 120 --fail-fast --heartbeat-interval 60` | pass | exit 0, 실제 7,859초, 요청 soak 7,200초, 80회 반복, 409 pass·0 fail·0 notRun |
| 이전 실패 경로 | 통합 미디어 smoke의 무음 HTTP H.264 `/h264` RTSP probe | pass | 2xx 5회·영상/오디오 SDP, 3.549초. 최초 시간초과 원인 미확정 |
| 서버·포트 | 소유 PID 2개 정상 종료, TCP 8081/8555 해제 | pass | 종료 원장 `aliveAfter=false`, `lsof` LISTEN 없음 |
| 임시 자원 | 소유 작업 root·진단·테스트 registry·저장소 정리 | pass | 아래 표의 정확한 대상만 삭제 후 부재 확인 |

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| 외부 TURN | 외부 endpoint·자격증명·실기기 | 사용자 명시 제외 1건 | 공통120분의 외부 연결 성공으로 주장하지 않음 |

[전수 구조화 결과](predev-120-pass-summary.json)에는 80회 반복 및 각 검사 결과·명령·exit·시각을 보존했다. [410개 개별 판정표](common-120-items.md), [자동 보고서](predev-120-pass-report.md), [안전 로그 압축본](predev-120-pass-logs.tar.gz), [코덱 단계 진단](predev-120-pass-codec-diagnostics.jsonl)을 함께 보존한다. 압축본 1,059개 항목의 구조 검증은 통과했으며 URL 노출 가능성이 있는 원문 `server.log`는 포함하지 않았다. 제품 바이너리 SHA256은 `beca63166d0db227adbac8036149947b22516127d5d213b02f231046f9c9a35e`다.

| 산출물 | SHA256 |
| --- | --- |
| `predev-120-pass-summary.json` | `9a7e94c64b4dff9f36775dc961cfb9bfdb2077a7600e62522226469a923f4fb0` |
| `predev-120-pass-report.md` | `ac602c2789e607ace67ba91f6f3eb89e59866e7e6756c0be1c9ced6c61d40c6a` |
| `predev-120-pass-logs.tar.gz` | `416831fad8d8bcb6761e98f98f334b6a92ebce13fa8bf4216025a29aa2fd22eb` |
| `predev-120-pass-codec-diagnostics.jsonl` | `f58255d7c98e3918ca8843e551d4498a2347c78e75322a882bf0cbd397d11930` |

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| `/tmp/media_server_predev-1790129605-25408` | 격리 로그·보고 원본 | 3.9 MiB | 안전 로그 압축 후 삭제 | 부재 | 원장 workDir·소유자·포트 확인 |
| `/private/tmp/media-server-s11-predevdiag-T6oAUC` | 안전 코덱 단계 진단 | 44 KiB | 저장소 이관 후 삭제 | 부재 | 파일 SHA 대조 |
| `.media_server.test/20260923-111328` | 이 실행의 하위 검사 자료 | 104 KiB | 전수 요약 이관 후 삭제 | 부재 | 하위 summary·시각 대조 |
| `.media_server` | 이 실행의 테스트 저장소 | 228 KiB | PID·포트 종료 확인 후 삭제 | 부재 | 이 실행 후 생성·소유 파일 확인 |
| `/tmp/media_server_predev-1790129605-25408_{summary.json,report.md,report.html}` | 생성된 요약 사본 | 각 483 KiB·5.3 KiB·5.7 KiB | 요약·보고 hash 대조 후 삭제 | 부재 | 저장소 사본과 SHA 일치 |

`token start/end/consumed`는 전용 계측이 없어 미집계다. 이 통과는 녹화 전용 120분 자원 판정이나 새 코드의 UI Policy v4 전체 적격을 대체하지 않는다.
