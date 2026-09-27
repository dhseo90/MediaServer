# B11-G03 녹화 120분 8차 종료 후 삭제 미디어 조회 비용

독자: v4.1.0 S11 녹화 장시간 검증·릴리즈 판정 담당자. 수명: v4.1.0 릴리즈까지.
정책 source-of-truth는 `AGENTS.md`이며, 이 문서는 8차 실행의 유효한 120분 관측,
종료 후 실패, 원인과 재개 경계를 함께 보존한다. 집중 검사를 녹화 120분 PASS로
승격하지 않는다.

## 실행 결과

명령은 `./server.sh verify-v410-recording-longrun --duration-minutes 120`이다.
exit 1, 전체 elapsed 7,226,291ms, 검증 duration 7,201,978ms,
10,066 pass·2 fail이다. 두 채널의 120분 live 구간은 끝까지 진행됐으나 첫 종료 후
native snapshot이 고정 15초 안에 끝나지 않아 최종 suite는 FAIL이다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| B11-G03 120분 8차 live | 두 채널 상시녹화·순환 삭제·상태/자원 관측 120분 | pass |
| 채널·원장 진행 | 채널별 finalized3,589·deleted3,587, records7,178·전체 segment7,184 | pass |
| 상태 API | 마지막 HTTP200, 약1~3ms, 4초 기준 이내 | pass |
| 저장 상한 | failure-live425,852,619B, post-stop 제품 녹화287,807,743B, 448MiB 미만 | pass |
| 종료 경계 | 서버 exit0·강제 종료 없음·HTTP/RTSP 포트·UDP 폐쇄·closed journal 완전 tail | pass |
| 자원 원자료 | 최대 RSS769,458,176B, warmup 뒤 1.928MiB/min, FD -6·thread 0 | pass |
| 종료 후 snapshot | 15,006ms에 SIGTERM, query 완료 뒤 media 단계에서 timeout | fail |
| 실패 복제본 보존 | 원본 불변·manifest 불변·process group closed인 287,807,743B 복제본과 receipt 확보 | pass |

[압축 원출력](b11-recording-120-attempt8.log.gz)의 SHA-256은
`1d96928b77f178cb43f0f7f956e21bd43df54abcfae6c3a64dfcd50068b3da1d`다.
[실패 snapshot receipt](../lp26-o10-accumulation-20260923/o28-current-snapshot-7229c685-fb50-4afb-bcf0-a0b3ae4a4538.json)은
status null·SIGTERM·timeout·lastCompleted `query`·lastOpened `media`와 원본
287,807,743B/191항목을 보존하며 SHA-256은
`2e4fd73e6f3bd1894d757b6bdab129423d73545e47fed9819200c6faa86e9650`이다.
제품 private log의 `ERROR`·`WARNING`·`storageBlocked`는 0이다. token
start/end/consumed는 전용 집계가 없어 미집계다.

자원 값은 원자료 확보 PASS이지 누수 없음 판정이 아니다. 녹화를 지속 생산한 단일
프로세스의 증가이며, 최종 동일 코드 재실행의 종료 snapshot·정리까지 통과한 뒤
자원 판정을 확정한다.

## 확정 원인과 보완 경계

실패 저장소를 변경하지 않은 별도 복제본에서 기존 코드를 다시 실행하면 총13.16초,
media 단계3.954초로 성공했다. 따라서 저장 손상이나 15초 기준 자체의 결함은 아니지만
고정 상한의 여유가 지나치게 작았다. 단계 trace와 코드를 대조한 결과,
`RecordingReadService::ResolveMediaWithContext`가 7,178개 삭제 ID 각각에 대해 삭제
여부를 확인하기 전에 segment/v2 조회와 event link 네 종류의 전체 조회를 반복했다.

삭제 tombstone은 해당 ID가 어떤 fallback·파생 경로에서도 다시 재생 가능해질 수 없다는
권위 있는 상태다. 따라서 ID 형식 검증 직후 `IsDeletedSegmentId`로 fail-closed하고,
삭제되지 않은 ID만 기존 segment·event-link·파일·hold 수명 경로를 사용하도록
한정 보완했다. 공개 API·파일 바이트·시간/ID·보존/복구·15초/4초/448MiB 기준은
바꾸지 않았고 timeout을 늘리지 않았다.

## 예상 RED와 집중 검증

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| 예상 RED | 삭제 판정이 segment·event-link 조회보다 앞서야 한다는 새 계약 10/1 | fail |
| 계약 GREEN | 삭제 fail-closed 순서와 기존 O28 진단 계약 11/11 | pass |
| generation 소비자 | 파일/ID/손상 거부·복구 의미를 포함한 기존 소비자 검사 | pass |
| build | `./server.sh build`, read service·runtime·server 빌드 | pass |
| 동일 대규모 1차 | 같은 저장소 복제본·같은 15초 상한, 총9.950초·media0.317초 | pass |
| 동일 대규모 증거 실행 | 같은 digest·7,184/7,178/6, 총9.761초·media0.320초 | pass |
| 관측기 자기검사 | `--self-test`, 67/67·정리 | pass |
| 실제 앱 최초 준비 | 샌드박스 macOS 서비스 대기 30초 timeout·서버 기동0 | fail |
| 실제 앱 집중 | 권한 적용 동일 상한, exit0·73/73·실제30.190초 | pass |
| 실제 앱 수명·정리 | 서버3회·snapshot/재기동/새 녹화·정상 종료·포트/UDP·root 정리 | pass |

집중 원출력 SHA-256은 다음과 같다.

| 원출력 | SHA-256 |
| --- | --- |
| [generation 소비자](b11-deleted-fastpath-consumers.log.gz) | `d57c46ab94fd1824881c6a3646493584fd3de33ba7156f4ef07eefde97d0193d` |
| [build](b11-deleted-fastpath-build.log.gz) | `6279e693df782a9dfc903ead6e056abb071d6ab4bdf59a82eaf3a19f282e9e14` |
| [대규모 증거 실행](b11-deleted-fastpath-large.log.gz) | `4d5c36ad693021d9b0d780192648cb6dcf29d904e51132db7e8d87cda25521bd` |
| [관측기 자기검사](b11-deleted-fastpath-observer.log.gz) | `1526a810d747a1a9e0746a87e209aa81aab4dd84878944bd94b96a5def763b98` |
| [실제 앱 준비 실패](b11-deleted-fastpath-app-sandbox-fail.log.gz) | `10f77cfa70c1bd3b70778001dec87ec00eb1469d5f531c902e463864777e62f5` |
| [실제 앱 성공](b11-deleted-fastpath-app.log.gz) | `b681ecaaebe03612fac5264e3a94a259cfb23ce3fac2002d50c7661e0024d3f0` |

집중 실행에서 생성된 성공 receipt 3개의 SHA-256은
`7b496f8bfdf26afd69d392c388405a69822102e7accb9ade5d014f104dd6014d`,
`1b5601c714a5b36044293551919e7a3915ae32c59e8310ac111d01e887471660`,
`bc4f066ae7e6f2f137d6b2d4db80b1692f20eedc86864fd37ce81611fc2e505f`다.
모두 status0·complete trace·원본/manifest 불변·raw path 비공개다.

## 정리 상태

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| 8차 실패 소유 root | 입력·녹화·관측 실행물 | 451,584KiB | 원출력·receipt·측정 이관 뒤 제거 | 부재 | 서버 exit0·포트 폐쇄·`lsof +D` 출력 없음·삭제 뒤 부재 |
| 8차 복구 복제본 | 종료 저장소 복제본 | 281,452KiB | 동일 대규모 검증·receipt 뒤 제거 | 부재 | process group closed·원본/manifest 불변·삭제 뒤 부재 |
| 대규모 진단 복제본 3개 | 기존/보완 전후 읽기 전용 복제본 | 853,972KiB | 비교 원출력 이관 뒤 제거 | 부재 | 각 경로 소유자 확인·`lsof +D` 출력 없음·삭제 뒤 부재 |
| 실제 앱 준비 실패 root | fixture 준비 실패 실행물 | 10,024KiB | 실패 원출력 이관 뒤 제거 | 부재 | 서버 기동0·소유 프로세스 없음·삭제 뒤 부재 |
| 실제 앱 성공 root | 녹화·복구 실행물 | 실행 summary 기록 | wrapper 정리 | 부재 | 73/73 summary의 cleanup absent=true |
| 원출력 7개 | 장시간·집중 원출력 | 압축 전 최소 5,847,898B | gzip 이관 | 저장소에 압축 보존 | 위 SHA-256·원문 임시 파일 부재 |

이번 수정과 집중 결과는 전체 재실행 조건만 충족한다. 같은 기준의 녹화 120분 전체가
통과하기 전에는 B11-G03 또는 S11 최종 local gate를 PASS로 판정하지 않는다.
