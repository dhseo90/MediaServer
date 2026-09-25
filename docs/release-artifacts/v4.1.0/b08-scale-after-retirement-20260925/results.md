# B-08 회수 후 누적 비용·관측 판정

독자: v4.1.0 녹화 개발·검증 담당자. 수명: 이번 단기 실행의 보존 기록.
정책은 AGENTS.md, 실행 전 정의는 `docs/release-test-records.md`의 B08-C01을 따른다.
실제 HTTP·JS 표출·장시간/UI·최종 소스 고정의 PASS가 아니다.

## 실행 범위와 결과

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| B08-C01 예상 RED | 전체 완료 lock/span 집계 없는 기존 64행 ring 반례 | fail | 새 검사 1 PASS/1 FAIL. 이전 최대값이 tail 밖으로 밀리면 독립 집계 부재를 검출. [원출력](b08-scale-trace-red.log) |
| B08-C01 집중 GREEN | tail 밖 최대값·동시 count·disabled 무출력 | pass | 2/2, [원출력](b08-scale-trace-green.log) |
| B08-C01 기존 호환 | 신규 2개+기존 trace 24개 | pass | 26/26, [원출력](b08-scale-trace-compat.log) |
| B08-C01 작은 실제 누적 | `bounded-small`, 원본 1/16/32개, 각 2N mutation 완전 drain·현재 snapshot 정확 1개·hash/재개방·보호 | pass | exit0, 75초. snapshot 1개 크기 1,881/26,170/52,170B, 32개 total 160,667,474B. [원출력](b08-scale-small.log) |
| B08-C01 삭제 실제 누적 | `bounded-deleted`, 원본 1,020/2,049개, 각 4N mutation 완전 drain·현재 snapshot 정확 1개·삭제/재개방·보호 | pass | exit0, 125초. snapshot 3,487,953/7,027,713B, total 30,121,755/59,925,722B. [원출력](b08-scale-deleted.log) |

두 누적 명령 모두 제품 reserve/finalize/request-delete/complete-delete를 원본마다
수행했다. 바뀐 것은 검증 전용 native observer의 호출 간격뿐이다. 삭제 모드는
32개마다 관측하여 한 번에 최대 128행을 검사하며 각 checkpoint 뒤 `seen=4N`,
`backlog=false`, `partialBytes=0`을 확인한다. 원본의 독립 현재 값·실제 영상 hash,
pin/hold, SQLite와 JSONL 재개방·15초 상한, root 448MiB/RSS 1GiB 상한은 유지했다.
2,049개에서 부모 RSS 최고 143,425,536B, 재개방은 SQLite 3.650초·JSONL
3.511초, native 관측 마지막 호출은 1.513초다. 별도 3초 자식 상한을 유지했다.
느린 완료 구간 75개 중 마지막 64개만 원행을 보존하되, 독립 요약은
`lockCount=14,369`, `spanCount=6,150`, 최대 wait 6,750ns·hold 686,614,875ns·
span 686,471,292ns, count overflow=false였다. 이 요약은 해당 부모 프로세스의
준비·조회 포함 완료 계측 전체이며 제품만의 최대값 또는 진행 중/비정상 종료
구간 증거가 아니다. 재개방 자식의 별도 최대 hold는 1.249초다.

과거 B07 삭제 검사에서는 동일 2,049개에서 snapshot 39개/138,884,919B,
전체 191,782,928B가 남았다. 현재 검사는 snapshot 1개/7,027,713B,
전체 59,925,722B다. 관측 호출 횟수를 달리했으므로 전체 실행시간 1,777초와
125초를 제품 속도 향상으로 비교하지 않는다. 실제 HTTP의 4초 판정은 다음
단계로 남긴다. JS semantic normalization은 이 native 합성 normalize 검사로
대체하지 않는다.

## 기록·정리 경계

각 원출력에는 명령·source hash·측정·독립 판정·`removed=true`가 있다.
비밀번호·Bearer·RTSP URL 검색은 일치 0건이다. test 전용 임시 root 2개는
각각 176,926,692B/71,466,673B를 삭제해 부재를 확인했다. trace 자체검사의
임시 root 4개도 각 실행 뒤 삭제·부재를 확인했다. 원로그 복제 전후 byte
동일성을 대조한 뒤 `/private/tmp/b08-scale-*.log` 원본만 정리한다.
token start/end/consumed는 전용 집계기가 없어 미집계다(`source=로컬 명령 원출력`).
