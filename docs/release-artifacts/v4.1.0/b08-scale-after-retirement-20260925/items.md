# B08-C01 개별 검사 결과

독자: v4.1.0 녹화 검증 담당자. 수명: 이번 단기 실행의 전수 결과표.
정책은 AGENTS.md, 원출력·첫 실패·한계는 [결과](results.md)를 따른다.
아래 26개 trace 호환 검사와 실제 누적 다섯 milestone을 구분한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| B08-C01 trace tail64 | tail에서 밀린 최대값도 완료 구간 집계에 유지 | pass | 최초 RED 때 집계 부재로 FAIL, 보완 뒤 PASS. [원출력](b08-scale-trace-compat.log) |
| B08-C01 trace disabled | trace 비활성일 때 summary·tail 무출력 | pass | [원출력](b08-scale-trace-compat.log) |
| LP26-O09-C01 | 느린 구간 20,000개 중 마지막64·33KiB 상한 | pass | 기존 검사 유지 |
| LP26-O09-C03 | slow flag만으로 trace를 켜지 않음 | pass | 기존 검사 유지 |
| LP13-T01 collector | collector 존재 | pass | 기존 검사 유지 |
| LP13-T01 null | disabled/invalid null 무출력 | pass | 기존 검사 유지 |
| LP13-T01 empty | disabled/invalid 빈 값 무출력 | pass | 기존 검사 유지 |
| LP13-T01 zero | disabled/invalid 0 무출력 | pass | 기존 검사 유지 |
| LP13-T01 true | disabled/invalid true 무출력 | pass | 기존 검사 유지 |
| LP13-T01 padded01 | disabled/invalid 01 무출력 | pass | 기존 검사 유지 |
| LP13-T01 padded1 | disabled/invalid `1 ` 무출력 | pass | 기존 검사 유지 |
| LP13-T02 aggregate | 빠른 집계 count/sum/max | pass | 기존 검사 유지 |
| LP13-T04 partial | parent/target 실패·phase 누락 미완료 | pass | 기존 검사 유지 |
| LP13-T02 contention | 실제 mutex 경합·다른 mutex·unlock 후 sink | pass | 기존 검사 유지 |
| LP13-T03 load600 | 600 poll·15 fast lock/poll·5,400 worker | pass | 기존 검사 유지 |
| LP13-T03 load1800 | 1,800 poll·15 fast lock/poll·5,400 worker | pass | 기존 검사 유지 |
| LP13-T03 tls-cap | TLS cap 손실 명시 | pass | 기존 검사 유지 |
| LP13-T03 cap | 전역 cap 손실 명시 | pass | 기존 검사 유지 |
| LP13-T04 split | 분할·안전 부분보존·순번 누락 | pass | 기존 검사 유지 |
| LP13-T04 enum | enum 거부 | pass | 기존 검사 유지 |
| LP13-T04 numeric | numeric 거부 | pass | 기존 검사 유지 |
| LP13-T04 time | 시간값 거부 | pass | 기존 검사 유지 |
| LP13-T04 count | count 거부 | pass | 기존 검사 유지 |
| LP13-T04 linecap | 한 줄 상한 거부 | pass | 기존 검사 유지 |
| LP13-T04 incomplete | incomplete 거부 | pass | 기존 검사 유지 |
| LP13-T05 wrapper | 단일 치환·trace 중복 거부 | pass | 기존 검사 유지 |
| B08-C01 N1 | 현재 snapshot 1개·2행 완전 관측·현재 자료·SQL/JSONL 재개방 | pass | [작은 원출력](b08-scale-small.log) |
| B08-C01 N16 | 현재 snapshot 1개·32행 완전 관측·현재 자료·SQL/JSONL 재개방 | pass | [작은 원출력](b08-scale-small.log) |
| B08-C01 N32 | 현재 snapshot 1개·64행 완전 관측·현재 자료·SQL/JSONL 재개방 | pass | [작은 원출력](b08-scale-small.log) |
| B08-C01 D1020 | 현재 snapshot 1개·4,080행 완전 관측·삭제 상태·SQL/JSONL 재개방 | pass | [삭제 원출력](b08-scale-deleted.log) |
| B08-C01 D2049 | 현재 snapshot 1개·8,196행 완전 관측·삭제 상태·SQL/JSONL 재개방 | pass | [삭제 원출력](b08-scale-deleted.log) |
| B08-C01 inventory | 기존 986 feature row 불변, manifest 전체 hash 갱신, inventory 18 PASS/0 FAIL | pass | [원출력](b08-scale-inventory.log) |

실제 누적 각 milestone의 독립 media hash·hold/pin·원본 보존·용량 상한·
재개방 개별 측정은 연결된 원출력의 같은 `count` 행을 따른다. 이를 별도
30분/120분/UI 검사의 개별 행으로 확대하지 않는다.
