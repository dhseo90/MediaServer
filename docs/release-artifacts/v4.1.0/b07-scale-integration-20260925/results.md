# B-07 누적 비용·실제 통합 결과

독자: v4.1.0 녹화 개발·검증 담당자. 수명: 이번 실행의 보존 기록.
정책은 AGENTS.md, 실행 전 정의와 현재 상태는 중앙 테스트 기록을 따른다.
원래8번이며 원래9번 코드 고정·최종 증거 판정이나 릴리즈 완료가 아니다.

## 범위와 현재 판정

1→16→32개 실제 큰 상세 원본과1,020→2,049개 생성·삭제의 수치·기능 검사는 통과했다.
하지만 이전 세대 snapshot의 중복 누적과 잠금 진단 일부 손실을 확인해 저장 비용의 전체 판정은 미완료다.
실제 HTTP와 현행5단계 통합,9번 코드 고정은 보류했다. 수명 계약 보완 없이 파일을 삭제하지 않는다.
구형 scale probe를 새 저장 형식의 비용 증거로 사용하지 않는다.
제품 코드·저장 형식·HTTP4초/관측15초/복구15초·root448MiB/RSS1GiB 기준은 변경하지 않았다.

## 작은 누적의 직접 결과

`bash scripts/internal/verify_recording_generation_scale.sh small`: exit0,75초,
출력15 PASS(준비2·독립 현재값9·체크포인트/보호4),0 FAIL이다.
실제4096샘플 영상과 상세를 한 번 준비하고, 실제 RuntimeStorage/Catalog의 공개 예약·finalize를 사용했다.
검사기는 template와 현재 한 개의 상세만 유지하며32개 전체 상세 사본을 별도 보관하지 않는다.

| 원본 수 | 체크포인트 | fresh SQLite Open | fresh fallback Open | 측정 data 전체 |
| --- | ---: | ---: | ---: | ---: |
| 1 | 9.525ms | 5.448ms | 3.771ms | 11,979,465B |
| 16 | 11.629ms | 22.006ms | 20.172ms | 84,130,581B |
| 32 | 14.031ms | 39.497ms | 36.615ms | 161,479,373B |

최대RSS90,095,616B, 각 예약+finalize 약322~339ms다. data에는 준비용 template가 포함되며
전체 실행 소유root177,737,423B에는 검사용 바이너리·registry도 포함된다. 메모리는 프로세스
최대RSS이지 allocator live bytes나 제품 단독 메모리 증가량이 아니다.
현재값·binding의 독립 직렬화hash, 실제 파일hash, 사용량, pin/hold/예약 충돌과 회전 전 파일 불변을 확인했다.
재개방은 이전 Runtime owner를 닫고 fork→exec한 새 프로세스에서 수행했다.

## 비용 해석의 경계

- 잠금231행·단계35행·빠른 집계19행, 진단손실행0. 전체 trace의 최대wait4,000ns/hold324,372,042ns다.
  준비·제품·독립 oracle이 함께 있으므로 이 전체 최대를 제품 단독 최대라고 바꾸지 않는다.
- file/index 관측35회는 약148~212ms다. normalize callback은 빈 객체를 반환하므로 실제 native Normalize와
  JS semantic 적용 비용은 포함하지 않는다. 전체 실제 관측은 뒤의 실제 앱 검사에서 확인해야 한다.
- 32개 Current의 cold 상세와 독립 파일hash 약9.5초는 Open/Checkpoint timer 밖이다.
- 이 probe는 과거 상세의 물리 read 계수를 직접 수집하지 않았다. 기존
  [B03 동일 현재 상태의 과거 상세 크기 반례](../b03-checkpoint-20260925/results.md)는
  archive read0·mutation parse0·현재 mutation serialize1을 확인했다. 그 좁은 결과와 이번 누적 비용을
  구별하며, 이번 측정만으로 전체 저장량·메모리가 상수이거나 HTTP·120분이 통과했다고 주장하지 않는다.

## 실패·변경·정리 이력

첫 실행은 `order.sequence`와 size_t 비교의 `-Wsign-compare`로 compile exit1이었다.
제품은 실행되지 않았고 예상 RED도 아니다. fixture의 명시 변환 후 같은 작은 검사가 통과했다.
통과 후 runner의 실행 실패 root 보존과 관측 한계 표기만 보완했다. 성공 실행 source hash와
이후 준비 보완의 source hash는 구분하며, 주석/실패 정리 보완만으로 작은 검사를 반복하지 않았다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| `media-server-generation-scale.lNiuYn` | compile 준비 fixture | 62,691B | 소유 경로 검사 후 삭제 | 부재 | 최초 runner 원출력 |
| `media-server-generation-scale.7ph09n` | 실제 작은 누적 fixture | 177,737,423B | 소유 경로 검사 후 삭제 | 부재 | 최종 runner 원출력 |

위 basename의 실제 부모는 `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T`다.
검증 전용 임시 영상·저장소만 삭제했고 운영 자료·계정·포트는 사용하지 않았다.
작은 실행 원문은 [최초 compile 실패](small-compile.log.gz)·[최종 통과](small-pass.log.gz),
[개별17행](small-results.json.gz)·[소유/source/hash 명세](small-manifest.json)에 보존했다.
token start/end/consumed는 전용 집계가 제공되지 않아 미집계다.

## 생성·삭제 누적의 직접 결과

`bash scripts/internal/verify_recording_generation_scale.sh deleted`는1회만 실행했다.
exit0,1,777초,출력11 PASS(준비2·독립 삭제 상태6·체크포인트2·pin1),0 FAIL이다.
이는 안정화 영역의 유한 누적 검사이며 경과 시간이 길어도30분/120분 soak 증거가 아니다.
정상 삭제 후 미디어 부재·삭제ID 유지·사용량0·보호·예약 충돌·fresh 재개방을 확인했다.

| 삭제 원본 수 | 체크포인트 | fresh SQLite Open | fresh fallback Open | 측정 data 전체 |
| --- | ---: | ---: | ---: | ---: |
| 1,020 | 326.597ms | 1.865343초 | 1.746462초 | 62,798,796B |
| 2,049 | 654.735ms | 3.642306초 | 3.516945초 | 191,782,928B |

예약+finalize2,049회 합20.974초/최대26.088ms, 삭제2,049회 합23.513초/최대656.178ms였다.
삭제에는 물리 파일 삭제·자동 checkpoint가 포함된다. file/index 관측2,051회 합1,707.236초가
전체 경과 대부분을 차지한다. 이 검사 준비·관측 시간을 제품 저장 지연으로 분류하지 않는다.
관측 부모wall 최대1.550143초로3초 안, 자식2,055개 모두exit0/signal0이었다.
부모 peak RSS143,540,224B, SQLite 재개방129,286,144B/fallback118,521,856B다.
관측 자식 peak RSS는 미계측이다. 프로세스별 최대를 동시 전체메모리·누수 없음으로 확대하지 않는다.

잠금 trace는k0 7,424행/k1 5,561행/k2 66행과 **k3 손실1행**이다.
기존2MiB/16,384행 한도를 늘리지 않았다. 손실 뒤 잠금 전수·최대는 미확인이며,
별도 호출wall 측정과 구별한다. 계측 손실을 제품 호출 실패 또는 정상 전수 계측으로 바꾸지 않는다.

## 확인된 잔여 원인: 이전 snapshot 수명

최종gen39의 manifest 전후 동일한 [실제 파일 분해](deleted-final-files.json)는 다음과 같다.

| 구성 | 개수 | 크기 |
| --- | ---: | ---: |
| 과거 확정 내용을 포함한 active | 39 | 38,496,072B |
| 최소 identity 색인 | 39 | 3,387,912B |
| snapshot 전체 | 39 | 138,884,919B |
| 현재 manifest의 snapshot | 1 | 7,027,713B |
| 이전 snapshot | 38 | 131,857,206B |

1,020→2,049개에서 snapshot 전체는36,164,994→138,884,919B로 증가했다.
약2배 입력에 약3.84배인 이 관측을 무한 규모의 수학적 보증으로 일반화하지 않지만,
현재 snapshot을 매 세대 보관하고 이전 snapshot을 회수하지 않는 코드 경로와 일치한다.
한도448MiB 이내라는 사실만으로 이 보관 수명 문제가 해결됐다고 판정하지 않는다.

직접 근거는 `RecordingJournal::PublishGenerationCheckpoint`의 새 snapshot 게시와
`RecordingGenerationTransaction::Cleanup(true)`의 stage/receipt 정리다. 현재는 predecessor
snapshot 회수가 없으며 B03-C01도 `snapshot-2.jsonl` 보존을 검사한다. 따라서 검사 삭제나
이름 glob 삭제가 아니라 현재/복구/사용 중 참조·소유권·중단/재개방·실패 보존을 포함한 수명
계약의 명시 보완이 필요하다. 과거 active/identity/상세 증거까지 불필요하다고 간주하지 않는다.
메인은 제품 변경 전에 사용자에게 안전한 snapshot 회수를 이번 범위에 포함할지 질문했다.

## 큰 실행 보존·정리와 뒤 단계

[원출력](deleted-pass.log.gz), [개별12행](deleted-results.json.gz),
[소유/source/hash 명세](deleted-manifest.json), [중간 파일 관측](deleted-live-files.json)을 보존했다.
최종 원문 SHA256은 `5f037b4d52d9f4144089ee412a6a6c705bbf7fcc338854f429dcb0e59dc40c17`이다.
실행 후 제품/library source hash가 동일한지 메인이 직접 대조했다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| `media-server-generation-scale.KXJP5P` | 큰 누적 fixture | 203,322,711B | runner 소유 결박 후 삭제 | 부재 | deleted 원출력·메인 재확인 |
| 임시 원출력3개·파일 관측2개 | 소유 실행 자료 | 각 명세 raw.bytes | gzip 해제/원문hash·UID/device/inode 대조 후 삭제 | 모두 부재 | [정리 전수](cleanup.json) |

진단·수치 검사 단위만 완료했고 제품 회수 로직은 추가하지 않았다.
B07-H01 실제 HTTP와B07-I01 전체 통합은 **미실행**이며 과거 구형 저장소의 PASS로 대체하지 않는다.
원래9번의 최종 고정·증거 결속도 미실행이다. 이번 단위의 커밋은 저장 비용 해결·버전 완료를 뜻하지 않는다.

## 마감 검사와 등록 권한 보완

기존 986개 기능 행은 HEAD와 같고, B07 실행 전 정의를 추가한 inventory hash만 후보에 적용한
기존 manifest validator가 통과했다. 개별 구현 검토·승인·assertion을 재생성하거나 완화하지 않았다.
큰 실행의 소스·제품 archive 해시 12개가 현재와 일치하며, 작은/큰 원출력 5개는 보존 hash와
gzip 해제 결과를 대조했다. 제품 소스·라이브러리는 B07에서 변경하지 않았다.

첫 `verify-script-inventory`는 11 PASS/1 FAIL, exit1이었다. 첫 실패는
`verify_recording_cutover_input.sh` 실행 권한 누락이다. dispatch 대상 전수를 읽기 대조하니
같은 B 개발에서 추가된 아래 7개 파일 모두 0644였다. 기존 dispatch는 `exec bash`이므로
앞선 실제 검사 실행 결과는 무효가 되지 않지만, 스크립트 등록 기준은 충족하지 못했다.
실패 이력을 남기고 이 7개의 실행 비트만 보완했다. 같은 검사 재실행은 12/12 PASS, exit0이다.
검사 기준은 그대로이며 기존 스크립트 본문·제품 검사는 변경하거나 재실행하지 않았다.

- `verify_recording_cutover_input.sh`
- `verify_recording_cutover_session.sh`
- `verify_recording_generation_receipt.sh`
- `verify_recording_cutover_candidate.sh`
- `verify_recording_generation_transaction.sh`
- `verify_recording_generation_consumers.sh`
- `verify_recording_runtime_generation.sh`

단기 원출력·개별 행은 [마감 검사 기록](static-checks.json), 기존 구현 증적의 후보 검증은
[manifest 대조](manifest-validation.json.gz)에 보존한다. API·제품·테스트 본문 변경은 없다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| B07-D01 | 기존 986행 동일·후보 manifest 전체 validator, exit0 | pass |
| B07-D02 | 문서 링크 원출력과 최종 링크 검사, exit0 | pass |
| B07-D03 | 문서 자산 10/10, exit0 | pass |
| B07-D04 | 기존 기능 986행·18그룹, 출력 개별 5,081행, exit0 | pass |
| B07-D06 최초 | 실행 권한 누락, 11 PASS/1 FAIL, exit1 | fail |
| B07-D06 보완 | 실행 비트만 보완 후 동일 검사 12/12, exit0 | pass |
| B07-D05 | working/staged 공백 검사, exit0 | pass |

[전수 결과 행](static-results.json.gz)에 각 명령·개별 판정·실패 후 재검증을 보존했다.
정적 검사는 서버·계정·포트·외부 서비스를 사용하지 않았고 원출력을 보존 위치에 직접 기록했다.
새 임시 산출물은 없다. token start/end/consumed는 전용 집계가 없어 미집계이며 각 명령의 elapsed는
마감 검사 기록에 있다. 정적 PASS는 B07 저장 비용 전체 마감·실제 앱·9번 PASS가 아니다.
