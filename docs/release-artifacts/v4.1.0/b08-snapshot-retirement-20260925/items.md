# B-08 집중 검사 개별 결과

독자: v4.1.0 녹화 개발·검증 담당자. 수명: 이번 실행 결과의 보존 기록.
정책·완료 판정은 AGENTS.md와 중앙 테스트 기록을 따른다. 아래는 최종 유효 집중
실행의 원출력을 개별 행으로 옮긴 것이며, 이전 실패·미실행·정리는 [결과](results.md)에
별도로 남긴다. 같은 제목의 반복 행은 서로 다른 검증 구성 또는 독립 반례다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| B04-R07 | replacement descriptor survives canonical roundtrip | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 1 |
| B04-R01 | independent canonical literal | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 2 |
| B04-R01 | cutover prepared roundtrip | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 3 |
| B04-R01 | cutover publish intent roundtrip | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 4 |
| B04-R01 | independent publish phase literal | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 5 |
| B08-R01 | new checkpoint reclamation descriptor roundtrip | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 6 |
| B08-R01 | exact predecessor owned descriptor retained | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 7 |
| B08-R01 | legacy checkpoint without reclamation descriptor remains canonical | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 8 |
| B08-R02 | reclamation descriptor mismatch 0 | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 9 |
| B08-R02 | reclamation descriptor mismatch 1 | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 10 |
| B08-R02 | reclamation descriptor mismatch 2 | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 11 |
| B08-R02 | reclamation descriptor mismatch 3 | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 12 |
| B08-R02 | reclamation descriptor mismatch 4 | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 13 |
| B08-R02 | reclamation descriptor mismatch 5 | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 14 |
| B08-R02 | extra/null reclamation descriptor rejected without output change | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 15 |
| B04-R01 | checkpoint prepared active tail | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 16 |
| B04-R01 | checkpoint publish intent | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 17 |
| B04-R01 | required evidence descriptor | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 18 |
| B04-R02 | malformed | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 19 |
| B04-R02 | truncated | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 20 |
| B04-R02 | duplicate key | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 21 |
| B04-R02 | unknown key | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 22 |
| B04-R02 | unknown schema | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 23 |
| B04-R02 | unknown operation | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 24 |
| B04-R02 | unknown phase | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 25 |
| B04-R02 | -1 | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 26 |
| B04-R02 | 1.0 | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 27 |
| B04-R02 | 1e0 | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 28 |
| B04-R02 | 01 | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 29 |
| B04-R02 | 18446744073709551616 | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 30 |
| B04-R02 | "1" | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 31 |
| B04-R02 | noncanonical whitespace | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 32 |
| B04-R02 | missing final LF | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 33 |
| B04-R02 | nested unknown | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 34 |
| B04-R02 | nonobject list item | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 35 |
| B04-R02 | wrong predecessor type | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 36 |
| B04-R03 | cutover predecessor | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 37 |
| B04-R03 | cutover source | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 38 |
| B04-R03 | wrong marker | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 39 |
| B04-R03 | marker limit | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 40 |
| B04-R03 | cross-device stage | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 41 |
| B04-R03 | stage aliases root | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 42 |
| B04-R03 | stage escape | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 43 |
| B04-R03 | source aliases marker | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 44 |
| B04-R03 | source bad hash | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 45 |
| B04-R03 | predecessor absent | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 46 |
| B04-R03 | store mismatch | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 47 |
| B04-R03 | generation skip | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 48 |
| B04-R03 | cut backwards | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 49 |
| B04-R03 | source name mismatch | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 50 |
| B04-R03 | source smaller than prefix | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 51 |
| B04-R03 | same-size source wrong hash | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 52 |
| B04-R04 | created duplicate | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 53 |
| B04-R04 | created inode alias | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 54 |
| B04-R04 | created source alias | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 55 |
| B04-R04 | created cross-device | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 56 |
| B04-R04 | created escape | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 57 |
| B04-R04 | future generation | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 58 |
| B04-R04 | unsorted | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 59 |
| B04-R04 | component cap | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 60 |
| B04-R04 | missing identity | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 61 |
| B04-R04 | empty identity | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 62 |
| B04-R04 | snapshot mismatch | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 63 |
| B04-R04 | missing snapshot | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 64 |
| B04-R04 | missing active | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 65 |
| B04-R04 | active nonempty | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 66 |
| B04-R04 | active wrong empty hash | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 67 |
| B04-R04 | old created checkpoint | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 68 |
| B04-R04 | missing target evidence | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 69 |
| B04-R04 | unlisted current evidence | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 70 |
| B04-R04 | noncanonical file generation | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 71 |
| B04-R04 | old source in created | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 72 |
| B04-R04 | foreign snapshot | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 73 |
| B04-R05 | 67 created files no lifetime 64 limit | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 74 |
| B04-R05 | large source not component cap | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 75 |
| B04-R05 | uint64 cut maximum | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 76 |
| B04-R05 | predecessor overflow | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 77 |
| B04-R06 | caller admission | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 78 |
| B04-R06 | zero admission refused | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 79 |
| B04-R06 | null parse output | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 80 |
| B04-R06 | null serialize output | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 81 |
| B04-R06 | operation enum | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 82 |
| B04-R06 | phase enum | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 83 |
| B04-R07 | missing cutover replacement | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 84 |
| B04-R07 | foreign replacement basename | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 85 |
| B04-R07 | replacement marker wrong hash | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 86 |
| B04-R07 | replacement marker wrong size | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 87 |
| B04-R07 | replacement marker cross device | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 88 |
| B04-R07 | replacement aliases original | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 89 |
| B04-R07 | replacement aliases created | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 90 |
| B04-R07 | cutover predecessor file forbidden | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 91 |
| B04-R07 | checkpoint replacement forbidden | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 92 |
| B04-R07 | checkpoint predecessor file absent | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 93 |
| B04-R07 | predecessor file wrong basename | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 94 |
| B04-R07 | predecessor file wrong hash | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 95 |
| B04-R07 | predecessor file wrong size | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 96 |
| B04-R07 | predecessor file alias | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 97 |
| B04-R07 | checkpoint old marker must be v2 | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 98 |
| B04-R07 | marker store mismatch | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 99 |
| B04-R02 | predecessor file invalid type | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 100 |
| B04-R02 | replacement strict object | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 101 |
| B04-R08 | existing dotted colon store survives manifest and receipt | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 102 |
| B04-R08 | unsafe store refused: . | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 103 |
| B04-R08 | unsafe store refused: .. | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 104 |
| B04-R08 | unsafe store refused: a..b | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 105 |
| B04-R08 | unsafe store refused: ../store | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 106 |
| B04-R08 | unsafe store refused: a/b | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 107 |
| B04-R08 | unsafe store refused: a\b | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 108 |
| B04-R08 | unsafe store refused: a"b | pass | [원출력](b08-receipt-green.log), crypto=1, 실행 행 109 |
| B04-R06 | crypto-off unsupported serialization | pass | [원출력](b08-receipt-green.log), crypto=0, 실행 행 110 |
| B04-R06 | crypto-off parse failclosed | pass | [원출력](b08-receipt-green.log), crypto=0, 실행 행 111 |
| B04-S07 | public export rejects unopened owner and preserves output | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 1 |
| B04-S07 | private scratch acquires no public export authority | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 2 |
| B04-S07 | explicit-store private values retain exact snapshot bytes | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 3 |
| B04-S07 | explicit store must match validated chain | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 4 |
| B03-C01 | empty active checkpoint is a byte-preserving no-op | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 5 |
| B03-C01 | explicit writable B checkpoint rotates generation | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 6 |
| B03-C01 | first rotation exact generation cut and empty active | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 7 |
| B03-C01 | second rotation preserves reservation and exclusive cut | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 8 |
| B03-C02 | same-owner links survive two rotations and active-to-sealed relocation | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 9 |
| B03-C02 | fork rejects inherited rotated link | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 10 |
| B03-C01 | independent current lifecycle and historical source bytes preserved | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 11 |
| B08-R01 | two checkpoints reclaim only exact predecessor snapshots | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 12 |
| B03-C05 | reservation retry after rotation emits no physical row | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 13 |
| B03-C02 | new owner rejects prior instance links | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 14 |
| B03-C01 | strict reopen restores rotated current state | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 15 |
| B03-C02 | late original archive alteration rejects cold acquisition | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 16 |
| B03-C03 | pre-publication collision preserves old authority and active | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 17 |
| B03-C03 | only owned preparations reclaimed while foreign collision preserved | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 18 |
| B03-C03 | same owner retries after explicit fixture collision removal | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 19 |
| B03-C03 | pre-publication collision preserves old authority and active | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 20 |
| B03-C03 | only owned preparations reclaimed while foreign collision preserved | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 21 |
| B03-C03 | same owner retries after explicit fixture collision removal | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 22 |
| B03-C03 | same-inode same-size change after live cleanup read preserves owned stage and poisons owner | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 23 |
| B03-C03 | identity changed after stage fsync rejects publication and preserves suspect file | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 24 |
| B03-C03 | published uncertainty versus not-published authority distinguished | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 25 |
| B03-C03 | new owner strictly opens selected manifest after failure | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 26 |
| B03-C03 | post-rename directory failure poisons owner | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 27 |
| B03-C03 | published uncertainty versus not-published authority distinguished | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 28 |
| B03-C03 | new owner strictly opens selected manifest after failure | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 29 |
| B03-C03 | partial active tail is never automatically truncated | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 30 |
| B03-C04 | fixed current and delta avoid predecessor evidence read parse and serialization as complete history grows | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 31 |
| B03-C04 | fixed current and delta avoid predecessor evidence read parse and serialization as complete history grows | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 32 |
| B03-C05 | active admission rotates before next valid reservation write | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 33 |
| B03-C05 | invalid store and opaque ID length are rejected without rotation or append | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 34 |
| B03-C05 | invalid domain above automatic threshold does not rotate | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 35 |
| B03-C01 | one MiB threshold rotates before valid next row without rewriting sealed bytes | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 36 |
| B03-C01 | large supported plain current row is preserved through automatic rotation | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 37 |
| B03-C05 | prepublication admission remains nondurable: snapshot | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 38 |
| B03-C05 | prepublication admission remains nondurable: shard | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 39 |
| B03-C05 | prepublication admission remains nondurable: archives | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 40 |
| B03-C05 | prepublication admission remains nondurable: ids | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 41 |
| B03-C05 | prepublication admission remains nondurable: ordinal | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 42 |
| B03-C05 | prepublication admission remains nondurable: active | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 43 |
| B03-C05 | prepublication admission remains nondurable: cold | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 44 |
| B03-C05 | Ready/Committed source detail and job links survive rotation | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 45 |
| B03-C05 | Committed typed output keeps reserved ordinal independently | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 46 |
| B03-C05 | strict reopen preserves active job stage and cold source closure | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 47 |
| B03-C05 | Ready/Committed source detail and job links survive rotation | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 48 |
| B03-C05 | Committed typed output keeps reserved ordinal independently | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 49 |
| B03-C05 | strict reopen preserves active job stage and cold source closure | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 50 |
| B03-C05 | two planned outputs and meaningful source order survive reservation rotation | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 51 |
| B03-C05 | new owner restores multi-output active job and reservations | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 52 |
| B03-C03 | actual SQLite trigger makes checkpoint metadata UPDATE fail after manifest publication | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 53 |
| B03-C03 | post-publication SQL failure preserves independently expected new generation and cut | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 54 |
| B03-C03 | failed checkpoint SQL transaction preserves prior cache metadata and current content | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 55 |
| B03-C03 | post-publication SQL failure blocks same-owner reads and reopen | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 56 |
| B03-C03 | poisoned authority refuses further checkpoint or write without changing durable bytes | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 57 |
| B08-R02 | SQL failure retains predecessor snapshot and receipt until verified recovery | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 58 |
| B03-C03 | fresh read-only transaction recovery cleans receipt before writable SQL reopen | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 59 |
| B03-C03 | new owner rebuilds SQL from published snapshot with exact cut and lifecycle | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 60 |
| B03-C03 | new owner recovers usable current state without additional journal append | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 61 |
| B03-C03 | failed checkpoint and recovery preserve original authority and sealed source bytes exactly | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 62 |
| B08-R02 | verified recovery reclaims exact predecessor and retains target snapshot bytes | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 63 |
| B03-C03 | actual SQLite reader makes checkpoint COMMIT fail after manifest publication | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 64 |
| B03-C03 | post-publication SQL failure preserves independently expected new generation and cut | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 65 |
| B03-C03 | failed checkpoint SQL transaction preserves prior cache metadata and current content | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 66 |
| B03-C03 | post-publication SQL failure blocks same-owner reads and reopen | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 67 |
| B03-C03 | poisoned authority refuses further checkpoint or write without changing durable bytes | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 68 |
| B08-R02 | SQL failure retains predecessor snapshot and receipt until verified recovery | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 69 |
| B03-C03 | fresh read-only transaction recovery cleans receipt before writable SQL reopen | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 70 |
| B03-C03 | new owner rebuilds SQL from published snapshot with exact cut and lifecycle | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 71 |
| B03-C03 | new owner recovers usable current state without additional journal append | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 72 |
| B03-C03 | failed checkpoint and recovery preserve original authority and sealed source bytes exactly | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 73 |
| B08-R02 | verified recovery reclaims exact predecessor and retains target snapshot bytes | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 74 |
| B03-C06 | backend-enabled v1 open append replay | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 75 |
| B03-C06 | v1 checkpoint remains available | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 76 |
| B03-C06 | v1 reopen unchanged | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=1, 실행 행 77 |
| B04-S07 | public export rejects unopened owner and preserves output | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 78 |
| B04-S07 | private scratch acquires no public export authority | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 79 |
| B04-S07 | explicit-store private values retain exact snapshot bytes | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 80 |
| B04-S07 | explicit store must match validated chain | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 81 |
| B03-C01 | empty active checkpoint is a byte-preserving no-op | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 82 |
| B03-C01 | explicit writable B checkpoint rotates generation | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 83 |
| B03-C01 | first rotation exact generation cut and empty active | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 84 |
| B03-C01 | second rotation preserves reservation and exclusive cut | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 85 |
| B03-C02 | same-owner links survive two rotations and active-to-sealed relocation | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 86 |
| B03-C02 | fork rejects inherited rotated link | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 87 |
| B03-C01 | independent current lifecycle and historical source bytes preserved | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 88 |
| B08-R01 | two checkpoints reclaim only exact predecessor snapshots | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 89 |
| B03-C05 | reservation retry after rotation emits no physical row | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 90 |
| B03-C02 | new owner rejects prior instance links | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 91 |
| B03-C01 | strict reopen restores rotated current state | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 92 |
| B03-C02 | late original archive alteration rejects cold acquisition | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 93 |
| B03-C03 | pre-publication collision preserves old authority and active | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 94 |
| B03-C03 | only owned preparations reclaimed while foreign collision preserved | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 95 |
| B03-C03 | same owner retries after explicit fixture collision removal | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 96 |
| B03-C03 | pre-publication collision preserves old authority and active | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 97 |
| B03-C03 | only owned preparations reclaimed while foreign collision preserved | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 98 |
| B03-C03 | same owner retries after explicit fixture collision removal | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 99 |
| B03-C03 | same-inode same-size change after live cleanup read preserves owned stage and poisons owner | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 100 |
| B03-C03 | identity changed after stage fsync rejects publication and preserves suspect file | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 101 |
| B03-C03 | published uncertainty versus not-published authority distinguished | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 102 |
| B03-C03 | new owner strictly opens selected manifest after failure | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 103 |
| B03-C03 | post-rename directory failure poisons owner | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 104 |
| B03-C03 | published uncertainty versus not-published authority distinguished | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 105 |
| B03-C03 | new owner strictly opens selected manifest after failure | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 106 |
| B03-C03 | partial active tail is never automatically truncated | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 107 |
| B03-C04 | fixed current and delta avoid predecessor evidence read parse and serialization as complete history grows | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 108 |
| B03-C04 | fixed current and delta avoid predecessor evidence read parse and serialization as complete history grows | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 109 |
| B03-C05 | active admission rotates before next valid reservation write | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 110 |
| B03-C05 | invalid store and opaque ID length are rejected without rotation or append | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 111 |
| B03-C05 | invalid domain above automatic threshold does not rotate | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 112 |
| B03-C01 | one MiB threshold rotates before valid next row without rewriting sealed bytes | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 113 |
| B03-C01 | large supported plain current row is preserved through automatic rotation | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 114 |
| B03-C05 | prepublication admission remains nondurable: snapshot | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 115 |
| B03-C05 | prepublication admission remains nondurable: shard | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 116 |
| B03-C05 | prepublication admission remains nondurable: archives | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 117 |
| B03-C05 | prepublication admission remains nondurable: ids | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 118 |
| B03-C05 | prepublication admission remains nondurable: ordinal | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 119 |
| B03-C05 | prepublication admission remains nondurable: active | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 120 |
| B03-C05 | prepublication admission remains nondurable: cold | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 121 |
| B03-C05 | Ready/Committed source detail and job links survive rotation | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 122 |
| B03-C05 | Committed typed output keeps reserved ordinal independently | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 123 |
| B03-C05 | strict reopen preserves active job stage and cold source closure | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 124 |
| B03-C05 | Ready/Committed source detail and job links survive rotation | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 125 |
| B03-C05 | Committed typed output keeps reserved ordinal independently | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 126 |
| B03-C05 | strict reopen preserves active job stage and cold source closure | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 127 |
| B03-C05 | two planned outputs and meaningful source order survive reservation rotation | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 128 |
| B03-C05 | new owner restores multi-output active job and reservations | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 129 |
| B03-C06 | backend-enabled v1 open append replay | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 130 |
| B03-C06 | v1 checkpoint remains available | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 131 |
| B03-C06 | v1 reopen unchanged | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=0 backend=1, 실행 행 132 |
| B03-C06 | unsupported B remains closed | pass | [원출력](b08-checkpoint-main.log), crypto=0 sqlite=1 backend=1, 실행 행 133 |
| B03-C06 | backend-enabled v1 open append replay | pass | [원출력](b08-checkpoint-main.log), crypto=0 sqlite=1 backend=1, 실행 행 134 |
| B03-C06 | v1 reopen unchanged | pass | [원출력](b08-checkpoint-main.log), crypto=0 sqlite=1 backend=1, 실행 행 135 |
| B03-C06 | unsupported B remains closed | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=0, 실행 행 136 |
| B03-C06 | backend-enabled v1 open append replay | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=0, 실행 행 137 |
| B03-C06 | v1 checkpoint remains available | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=0, 실행 행 138 |
| B03-C06 | v1 reopen unchanged | pass | [원출력](b08-checkpoint-main.log), crypto=1 sqlite=1 backend=0, 실행 행 139 |
| B04-T01 | normal private cutover store | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 1 |
| B04-T01 | old owner refuses append/reserve/reopen | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 2 |
| B04-T01 | fresh B owner independent current query | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 3 |
| B04-T01 | source/cache/media preserved and receipt cleaned | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 4 |
| B04-T01 | normal private cutover store:one.part | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 5 |
| B04-T01 | old owner refuses append/reserve/reopen | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 6 |
| B04-T01 | fresh B owner independent current query | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 7 |
| B04-T01 | source/cache/media preserved and receipt cleaned | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 8 |
| B04-T01 | normal private cutover store | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 9 |
| B04-T01 | old owner refuses append/reserve/reopen | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 10 |
| B04-T01 | fresh B owner independent current query | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 11 |
| B04-T01 | source/cache/media preserved and receipt cleaned | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 12 |
| B04-T01 | normal private cutover store | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 13 |
| B04-T01 | old owner refuses append/reserve/reopen | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 14 |
| B04-T01 | fresh B owner independent current query | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 15 |
| B04-T01 | source/cache/media preserved and receipt cleaned | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 16 |
| B04-T02 | crash reached receipt-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 17 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 18 |
| B04-T02 | restart recovery decision receipt-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 19 |
| B04-T02 | strict selected backend reopen after receipt-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 20 |
| B04-T02 | original bytes after receipt-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 21 |
| B04-T02 | crash reached receipt-renamed | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 22 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 23 |
| B04-T02 | restart recovery decision receipt-renamed | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 24 |
| B04-T02 | strict selected backend reopen after receipt-renamed | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 25 |
| B04-T02 | original bytes after receipt-renamed | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 26 |
| B04-T02 | crash reached receipt-directory-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 27 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 28 |
| B04-T02 | restart recovery decision receipt-directory-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 29 |
| B04-T02 | strict selected backend reopen after receipt-directory-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 30 |
| B04-T02 | original bytes after receipt-directory-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 31 |
| B04-T02 | crash reached component-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 32 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 33 |
| B04-T02 | restart recovery decision component-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 34 |
| B04-T02 | strict selected backend reopen after component-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 35 |
| B04-T02 | original bytes after component-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 36 |
| B04-T02 | crash reached component-root-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 37 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 38 |
| B04-T02 | restart recovery decision component-root-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 39 |
| B04-T02 | strict selected backend reopen after component-root-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 40 |
| B04-T02 | original bytes after component-root-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 41 |
| B04-T02 | crash reached component-unlinked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 42 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 43 |
| B04-T02 | restart recovery decision component-unlinked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 44 |
| B04-T02 | strict selected backend reopen after component-unlinked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 45 |
| B04-T02 | original bytes after component-unlinked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 46 |
| B04-T02 | crash reached component-stage-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 47 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 48 |
| B04-T02 | restart recovery decision component-stage-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 49 |
| B04-T02 | strict selected backend reopen after component-stage-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 50 |
| B04-T02 | original bytes after component-stage-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 51 |
| B04-T02 | crash reached marker-backup-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 52 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 53 |
| B04-T02 | restart recovery decision marker-backup-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 54 |
| B04-T02 | strict selected backend reopen after marker-backup-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 55 |
| B04-T02 | original bytes after marker-backup-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 56 |
| B04-T02 | crash reached marker-backup-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 57 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 58 |
| B04-T02 | restart recovery decision marker-backup-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 59 |
| B04-T02 | strict selected backend reopen after marker-backup-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 60 |
| B04-T02 | original bytes after marker-backup-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 61 |
| B04-T02 | crash reached marker-renamed | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 62 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 63 |
| B04-T02 | restart recovery decision marker-renamed | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 64 |
| B04-T02 | strict selected backend reopen after marker-renamed | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 65 |
| B04-T02 | original bytes after marker-renamed | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 66 |
| B04-T02 | crash reached marker-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 67 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 68 |
| B04-T02 | restart recovery decision marker-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 69 |
| B04-T02 | strict selected backend reopen after marker-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 70 |
| B04-T02 | original bytes after marker-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 71 |
| B04-T02 | crash reached receipt-created | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 72 |
| B04-T05 | restart recovery decision receipt-created | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 73 |
| B04-T02 | original bytes after receipt-created | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 74 |
| B04-T05 | unowned or uncertain receipt preparation preserved receipt-created | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 75 |
| B04-T02 | crash reached receipt-written | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 76 |
| B04-T05 | restart recovery decision receipt-written | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 77 |
| B04-T02 | original bytes after receipt-written | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 78 |
| B04-T05 | unowned or uncertain receipt preparation preserved receipt-written | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 79 |
| B04-T02 | crash reached receipt-file-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 80 |
| B04-T05 | restart recovery decision receipt-file-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 81 |
| B04-T02 | original bytes after receipt-file-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 82 |
| B04-T05 | unowned or uncertain receipt preparation preserved receipt-file-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 83 |
| B04-T02 | crash reached receipt-created | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 84 |
| B04-T05 | restart recovery decision receipt-created | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 85 |
| B04-T02 | original bytes after receipt-created | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 86 |
| B04-T05 | unowned or uncertain receipt preparation preserved receipt-created | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 87 |
| B04-T02 | crash reached receipt-written | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 88 |
| B04-T05 | restart recovery decision receipt-written | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 89 |
| B04-T02 | original bytes after receipt-written | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 90 |
| B04-T05 | unowned or uncertain receipt preparation preserved receipt-written | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 91 |
| B04-T02 | crash reached receipt-file-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 92 |
| B04-T05 | restart recovery decision receipt-file-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 93 |
| B04-T02 | original bytes after receipt-file-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 94 |
| B04-T05 | unowned or uncertain receipt preparation preserved receipt-file-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 95 |
| B04-T02 | crash reached receipt-renamed | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 96 |
| B04-T05 | restart recovery decision receipt-renamed | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 97 |
| B04-T02 | original bytes after receipt-renamed | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 98 |
| B04-T05 | unowned or uncertain receipt preparation preserved receipt-renamed | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 99 |
| B04-T02 | crash reached receipt-directory-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 100 |
| B04-T05 | restart recovery decision receipt-directory-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 101 |
| B04-T02 | original bytes after receipt-directory-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 102 |
| B04-T05 | unowned or uncertain receipt preparation preserved receipt-directory-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 103 |
| B04-T02 | crash reached intent-durable | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 104 |
| B04-T05 | restart recovery decision intent-durable | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 105 |
| B04-T02 | original bytes after intent-durable | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 106 |
| B04-T05 | unowned or uncertain receipt preparation preserved intent-durable | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 107 |
| B04-T02 | crash reached manifest-published | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 108 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 109 |
| B04-T02 | restart recovery decision manifest-published | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 110 |
| B04-T02 | strict selected backend reopen after manifest-published | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 111 |
| B04-T02 | original bytes after manifest-published | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 112 |
| B04-T01 | cleaned target fresh owner resumes explicit B writes | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 113 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 114 |
| B04-T02 | rollback cleanup restart marker-restored | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 115 |
| B04-T02 | rollback repeated strict reopen/source marker-restored | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 116 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 117 |
| B04-T02 | rollback cleanup restart marker-restore-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 118 |
| B04-T02 | rollback repeated strict reopen/source marker-restore-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 119 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 120 |
| B04-T02 | rollback cleanup restart component-cleaned | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 121 |
| B04-T02 | rollback repeated strict reopen/source component-cleaned | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 122 |
| B04-T03 | tamper refused 0 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 123 |
| B04-T04 | tamper rejection bytes preserved 0 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 124 |
| B04-T04 | tamper refused 1 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 125 |
| B04-T04 | tamper rejection bytes preserved 1 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 126 |
| B04-T04 | tamper refused 2 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 127 |
| B04-T04 | tamper rejection bytes preserved 2 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 128 |
| B04-T05 | tamper refused 3 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 129 |
| B04-T04 | tamper rejection bytes preserved 3 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 130 |
| B04-T03 | tamper refused 4 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 131 |
| B04-T04 | tamper rejection bytes preserved 4 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 132 |
| B04-T04 | tamper refused 5 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 133 |
| B04-T04 | tamper rejection bytes preserved 5 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 134 |
| B04-T04 | tamper refused 6 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 135 |
| B04-T04 | tamper rejection bytes preserved 6 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 136 |
| B04-T04 | tamper refused 7 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 137 |
| B04-T04 | tamper rejection bytes preserved 7 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 138 |
| B04-T04 | tamper refused 8 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 139 |
| B04-T04 | tamper rejection bytes preserved 8 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 140 |
| B04-T05 | v1 marker with structurally valid manifest never falls back to legacy | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 141 |
| B04-T04 | tamper refused 9 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 142 |
| B04-T04 | tamper rejection bytes preserved 9 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 143 |
| B04-T04 | tamper refused 10 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 144 |
| B04-T04 | tamper rejection bytes preserved 10 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 145 |
| B04-T06 | checkpoint staged receipt publication | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 146 |
| B04-T06 | checkpoint historical archive helper reads zero | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 147 |
| B04-T06 | checkpoint independent generation/cut | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 148 |
| B08-R02 | exact predecessor snapshot lifecycle normal | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 149 |
| B08-R02 | already opened immutable reader FD remains valid  | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 150 |
| B04-T06 | checkpoint legacy originals unchanged | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 151 |
| B04-T06 | live owned unreceipted preparations cleaned without changing predecessor | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 152 |
| B04-T06 | same owner retries after verified live-only cleanup | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 153 |
| B04-T06 | mkdir without acquired stage FD is preserved and owner poisoned, not cleanup success | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 154 |
| B04-T06 | checkpoint crash reached component-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 155 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 156 |
| B04-T06 | checkpoint recovery decision component-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 157 |
| B08-R02 | exact predecessor snapshot lifecycle component-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 158 |
| B08-R02 | already opened immutable reader FD remains valid component-linked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 159 |
| B04-T06 | checkpoint legacy originals unchanged | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 160 |
| B04-T06 | checkpoint crash reached intent-durable | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 161 |
| B04-T06 | checkpoint recovery decision intent-durable | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 162 |
| B08-R02 | exact predecessor snapshot lifecycle intent-durable | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 163 |
| B08-R02 | already opened immutable reader FD remains valid intent-durable | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 164 |
| B04-T06 | checkpoint legacy originals unchanged | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 165 |
| B04-T06 | checkpoint crash reached manifest-published | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 166 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 167 |
| B04-T06 | checkpoint recovery decision manifest-published | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 168 |
| B08-R02 | exact predecessor snapshot lifecycle manifest-published | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 169 |
| B08-R02 | already opened immutable reader FD remains valid manifest-published | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 170 |
| B04-T06 | checkpoint legacy originals unchanged | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 171 |
| B04-T06 | checkpoint crash reached predecessor-snapshot-unlinked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 172 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 173 |
| B04-T06 | checkpoint recovery decision predecessor-snapshot-unlinked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 174 |
| B08-R02 | exact predecessor snapshot lifecycle predecessor-snapshot-unlinked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 175 |
| B08-R02 | already opened immutable reader FD remains valid predecessor-snapshot-unlinked | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 176 |
| B04-T06 | checkpoint legacy originals unchanged | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 177 |
| B04-T06 | checkpoint crash reached predecessor-snapshot-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 178 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 179 |
| B04-T06 | checkpoint recovery decision predecessor-snapshot-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 180 |
| B08-R02 | exact predecessor snapshot lifecycle predecessor-snapshot-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 181 |
| B08-R02 | already opened immutable reader FD remains valid predecessor-snapshot-synced | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 182 |
| B04-T06 | checkpoint legacy originals unchanged | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 183 |
| B08-R02 | reclamation tamper setup reaches published target 0 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 184 |
| B08-R02 | replacement rejected; exact absent and legacy receipt compatible 0 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 185 |
| B08-R02 | target and original bytes unchanged 0 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 186 |
| B08-R02 | suspect predecessor and receipt preserved 0 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 187 |
| B08-R02 | foreign alias/inode bytes preserved 0 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 188 |
| B08-R02 | reclamation tamper setup reaches published target 1 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 189 |
| B08-R02 | replacement rejected; exact absent and legacy receipt compatible 1 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 190 |
| B08-R02 | target and original bytes unchanged 1 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 191 |
| B08-R02 | suspect predecessor and receipt preserved 1 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 192 |
| B08-R02 | foreign alias/inode bytes preserved 1 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 193 |
| B08-R02 | reclamation tamper setup reaches published target 2 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 194 |
| B08-R02 | replacement rejected; exact absent and legacy receipt compatible 2 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 195 |
| B08-R02 | target and original bytes unchanged 2 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 196 |
| B08-R02 | suspect predecessor and receipt preserved 2 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 197 |
| B08-R02 | foreign alias/inode bytes preserved 2 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 198 |
| B08-R02 | reclamation tamper setup reaches published target 3 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 199 |
| B08-R02 | replacement rejected; exact absent and legacy receipt compatible 3 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 200 |
| B08-R02 | target and original bytes unchanged 3 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 201 |
| B08-R02 | suspect predecessor and receipt preserved 3 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 202 |
| B08-R02 | reclamation tamper setup reaches published target 4 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 203 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 204 |
| B08-R02 | replacement rejected; exact absent and legacy receipt compatible 4 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 205 |
| B08-R02 | target and original bytes unchanged 4 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 206 |
| B08-R02 | reclamation tamper setup reaches published target 5 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 207 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 208 |
| B08-R02 | replacement rejected; exact absent and legacy receipt compatible 5 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 209 |
| B08-R02 | target and original bytes unchanged 5 | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 210 |
| B08-R02 | legacy receipt never authorizes predecessor deletion | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 211 |
| B08-R02 | live missing predecessor rejects success and preserves receipt | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 212 |
| B04-T01 | recovery owner cannot acquire write/public authority | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 213 |
| B08-R02 | restart validates target and accepts exact already-absent predecessor | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 214 |
| B04-T05 | unsupported publication rejected | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 215 |
| B04-T05 | unsupported publication rejected | pass | [원출력](b08-transaction-live-missing.log), 기본, 실행 행 216 |
| B05-R07 | format/row limits separate from lifetime identity counts | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 1 |
| B05-R01 | supported default creates B marker and manifest | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 2 |
| B05-R01 | Catalog owns runtime reservation and retry | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 3 |
| B05-R01 | raw B journal remains blocked | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 4 |
| B05-R01 | actual B current cache active | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 5 |
| B05-R05 | successful repeated Open retains owner/store | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 6 |
| B05-R05 | forked runtime owner rejected | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 7 |
| B05-R01 | fresh runtime restores store/order then appends | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 8 |
| B05-R02 | strict legacy domain/store/source/cache/media preserved | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 9 |
| B05-R03 | startup decision for prepared/marker/intent/target phase 0 | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 10 |
| B05-R03 | interrupted startup preserves original bytes 0 | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 11 |
| B05-R03 | recovered startup returns fresh writable B owner | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 12 |
| B05-R03 | startup decision for prepared/marker/intent/target phase 1 | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 13 |
| B05-R03 | interrupted startup preserves original bytes 1 | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 14 |
| B05-R03 | recovered startup returns fresh writable B owner | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 15 |
| B05-R03 | startup decision for prepared/marker/intent/target phase 2 | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 16 |
| B05-R03 | interrupted startup preserves original bytes 2 | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 17 |
| B05-R03 | uncertain intent preserved without v1 fallback | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 18 |
| B05-R03 | startup decision for prepared/marker/intent/target phase 3 | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 19 |
| B05-R03 | interrupted startup preserves original bytes 3 | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 20 |
| B05-R03 | recovered startup returns fresh writable B owner | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 21 |
| B05-R03 | bad receipt/temp preserved and runtime blocked | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 22 |
| B05-R03 | bad receipt/temp preserved and runtime blocked | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 23 |
| B05-R04 | broken B never reactivates old journal | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 24 |
| B05-R05 | arbitrary symlink root rejected without files | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 25 |
| B05-R05 | parent traversal rejected before mutation | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 26 |
| B05-R05 | relative path accepted with normal authority | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 27 |
| B05-R05 | existing macOS OS alias preserved | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 28 |
| B05-R06 | public mode/degraded retains existing enum meaning | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 29 |
| B05-R06 | public authorized counters and path redaction unchanged | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 30 |
| B05-R06 | public mode/degraded retains existing enum meaning | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 31 |
| B05-R06 | public authorized counters and path redaction unchanged | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 32 |
| B05-R04 | SQLite rebuild failure not hidden as fallback | pass | [원출력](b08-runtime-generation.log), 기본, 실행 행 33 |
| B05-P03 | runtime probe missing parents is read-only absence | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 1 |
| B05-P03 | runtime probe empty safe root | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 2 |
| B05-P03 | runtime probe fixed temp requires recovery without interpreting bytes | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 3 |
| B05-P03 | runtime probe nofollow receipt symlink is pending, not absence | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 4 |
| B05-P03 | runtime probe rejects arbitrary root symlink and preserves output | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 5 |
| B05-P03 | runtime probe ENOTDIR is not absence | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 6 |
| B05-P01 | B durable finalize/current/hold succeeds as one protected operation | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 7 |
| B05-P01 | initial hold prevents deletion without another mutation | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 8 |
| B05-P01 | same SQL transaction contains exact segment and hold | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 9 |
| B05-P05 | actual playback handle protects deletion | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 10 |
| B05-P05 | actual event source lease protects deletion | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 11 |
| B05-P05 | release makes oldest eligible with deterministic ID tie-break while pin remains protected | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 12 |
| B05-P04 | raw B Journal reservation remains refused | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 13 |
| B05-P04 | Catalog reservation publishes B consumer order | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 14 |
| B05-P04 | consumer tuple retry preserves ID sequence time and bytes | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 15 |
| B05-P01 | strict reopen restores durable finalize, not expired temporary hold | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 16 |
| B05-P02 | readonly B permits temporary acquire and release | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 17 |
| B05-P02 | underflow does not insert zero or change memory | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 18 |
| B05-P02 | overflow leaves readonly count unchanged | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 19 |
| B05-P01 | finalize holds never modify marker or immutable generation | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 20 |
| B05-P01 | B durable finalize/current/hold succeeds as one protected operation | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 21 |
| B05-P01 | initial hold prevents deletion without another mutation | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 22 |
| B05-P05 | actual playback handle protects deletion | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 23 |
| B05-P05 | actual event source lease protects deletion | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 24 |
| B05-P05 | release makes oldest eligible with deterministic ID tie-break while pin remains protected | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 25 |
| B05-P04 | raw B Journal reservation remains refused | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 26 |
| B05-P04 | Catalog reservation publishes B consumer order | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 27 |
| B05-P04 | consumer tuple retry preserves ID sequence time and bytes | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 28 |
| B05-P01 | strict reopen restores durable finalize, not expired temporary hold | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 29 |
| B05-P02 | readonly B permits temporary acquire and release | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 30 |
| B05-P02 | underflow does not insert zero or change memory | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 31 |
| B05-P02 | overflow leaves readonly count unchanged | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 32 |
| B05-P01 | finalize holds never modify marker or immutable generation | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 33 |
| B05-P01 | finalize hold overflow rejected before durable write/current apply | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 34 |
| B05-P03 | authority error preserves count/active and poisons owner | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 35 |
| B05-P03 | authority error preserves count/active and poisons owner | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 36 |
| B05-P03 | authority error preserves count/active and poisons owner | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 37 |
| B05-P03 | foreign attachment cannot commit temporary protection | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 38 |
| B05-P03 | authority error preserves count/active and poisons owner | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 39 |
| B05-P03 | forked opened owner refuses probe/hold; parent remains usable | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 40 |
| B05-P01 | managed v1 finalize/hold meaning preserved | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 41 |
| B05-P04 | v1 Catalog reservation delegates to unchanged Journal tuple retry | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 42 |
| B05-P05 | actual cold source and consumer reference accepted under verified owner | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 43 |
| B05-P05 | actual read consumer resolves stored typed reference | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 44 |
| B05-P05 | changed cold source archive fails at detail use and loses authority | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 45 |
| B05-P05 | released deletion tombstone blocks playback and ID reuse even with media file remaining | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 46 |
| B05-P03 | SQL step changes marker after BEGIN; final guard rolls back count and poisons without hiding tamper | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 47 |
| B05-P02 | actual hold SQL step/COMMIT failure rolls back cache | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 48 |
| B05-P02 | temporary SQL failure preserves memory and same-owner retry | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 49 |
| B05-P01 | fresh owner recovers complete durable row and no temporary hold | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 50 |
| B05-P02 | actual hold SQL step/COMMIT failure rolls back cache | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 51 |
| B05-P02 | temporary SQL failure preserves memory and same-owner retry | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 52 |
| B05-P01 | fresh owner recovers complete durable row and no temporary hold | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 53 |
| B05-P01 | actual hold SQL step/COMMIT failure rolls back cache | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 54 |
| B05-P01 | durable finalize SQL failure poisons without success fallback | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 55 |
| B05-P01 | fresh owner recovers complete durable row and no temporary hold | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 56 |
| B05-P01 | actual hold SQL step/COMMIT failure rolls back cache | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 57 |
| B05-P01 | durable finalize SQL failure poisons without success fallback | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 58 |
| B05-P01 | fresh owner recovers complete durable row and no temporary hold | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=1, 실행 행 59 |
| B05-P03 | runtime probe missing parents is read-only absence | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 60 |
| B05-P03 | runtime probe empty safe root | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 61 |
| B05-P03 | runtime probe fixed temp requires recovery without interpreting bytes | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 62 |
| B05-P03 | runtime probe nofollow receipt symlink is pending, not absence | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 63 |
| B05-P03 | runtime probe rejects arbitrary root symlink and preserves output | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 64 |
| B05-P03 | runtime probe ENOTDIR is not absence | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 65 |
| B05-P01 | B durable finalize/current/hold succeeds as one protected operation | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 66 |
| B05-P01 | initial hold prevents deletion without another mutation | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 67 |
| B05-P05 | actual playback handle protects deletion | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 68 |
| B05-P05 | actual event source lease protects deletion | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 69 |
| B05-P05 | release makes oldest eligible with deterministic ID tie-break while pin remains protected | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 70 |
| B05-P04 | raw B Journal reservation remains refused | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 71 |
| B05-P04 | Catalog reservation publishes B consumer order | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 72 |
| B05-P04 | consumer tuple retry preserves ID sequence time and bytes | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 73 |
| B05-P01 | strict reopen restores durable finalize, not expired temporary hold | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 74 |
| B05-P02 | readonly B permits temporary acquire and release | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 75 |
| B05-P02 | underflow does not insert zero or change memory | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 76 |
| B05-P02 | overflow leaves readonly count unchanged | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 77 |
| B05-P01 | finalize holds never modify marker or immutable generation | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 78 |
| B05-P01 | B durable finalize/current/hold succeeds as one protected operation | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 79 |
| B05-P01 | initial hold prevents deletion without another mutation | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 80 |
| B05-P05 | actual playback handle protects deletion | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 81 |
| B05-P05 | actual event source lease protects deletion | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 82 |
| B05-P05 | release makes oldest eligible with deterministic ID tie-break while pin remains protected | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 83 |
| B05-P04 | raw B Journal reservation remains refused | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 84 |
| B05-P04 | Catalog reservation publishes B consumer order | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 85 |
| B05-P04 | consumer tuple retry preserves ID sequence time and bytes | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 86 |
| B05-P01 | strict reopen restores durable finalize, not expired temporary hold | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 87 |
| B05-P02 | readonly B permits temporary acquire and release | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 88 |
| B05-P02 | underflow does not insert zero or change memory | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 89 |
| B05-P02 | overflow leaves readonly count unchanged | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 90 |
| B05-P01 | finalize holds never modify marker or immutable generation | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 91 |
| B05-P01 | finalize hold overflow rejected before durable write/current apply | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 92 |
| B05-P03 | authority error preserves count/active and poisons owner | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 93 |
| B05-P03 | authority error preserves count/active and poisons owner | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 94 |
| B05-P03 | authority error preserves count/active and poisons owner | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 95 |
| B05-P03 | foreign attachment cannot commit temporary protection | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 96 |
| B05-P03 | authority error preserves count/active and poisons owner | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 97 |
| B05-P03 | forked opened owner refuses probe/hold; parent remains usable | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 98 |
| B05-P01 | managed v1 finalize/hold meaning preserved | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 99 |
| B05-P04 | v1 Catalog reservation delegates to unchanged Journal tuple retry | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 100 |
| B05-P05 | actual cold source and consumer reference accepted under verified owner | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 101 |
| B05-P05 | actual read consumer resolves stored typed reference | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 102 |
| B05-P05 | changed cold source archive fails at detail use and loses authority | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 103 |
| B05-P05 | released deletion tombstone blocks playback and ID reuse even with media file remaining | pass | [원출력](b08-consumers.log), crypto=1 sqlite=0 backend=1, 실행 행 104 |
| B05-P03 | runtime probe missing parents is read-only absence | pass | [원출력](b08-consumers.log), crypto=0 sqlite=1 backend=1, 실행 행 105 |
| B05-P03 | runtime probe empty safe root | pass | [원출력](b08-consumers.log), crypto=0 sqlite=1 backend=1, 실행 행 106 |
| B05-P03 | runtime probe fixed temp requires recovery without interpreting bytes | pass | [원출력](b08-consumers.log), crypto=0 sqlite=1 backend=1, 실행 행 107 |
| B05-P03 | runtime probe nofollow receipt symlink is pending, not absence | pass | [원출력](b08-consumers.log), crypto=0 sqlite=1 backend=1, 실행 행 108 |
| B05-P03 | runtime probe rejects arbitrary root symlink and preserves output | pass | [원출력](b08-consumers.log), crypto=0 sqlite=1 backend=1, 실행 행 109 |
| B05-P03 | runtime probe ENOTDIR is not absence | pass | [원출력](b08-consumers.log), crypto=0 sqlite=1 backend=1, 실행 행 110 |
| B05-P03 | unsupported B backend remains closed | pass | [원출력](b08-consumers.log), crypto=0 sqlite=1 backend=1, 실행 행 111 |
| B05-P03 | runtime probe missing parents is read-only absence | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=0, 실행 행 112 |
| B05-P03 | runtime probe empty safe root | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=0, 실행 행 113 |
| B05-P03 | runtime probe fixed temp requires recovery without interpreting bytes | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=0, 실행 행 114 |
| B05-P03 | runtime probe nofollow receipt symlink is pending, not absence | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=0, 실행 행 115 |
| B05-P03 | runtime probe rejects arbitrary root symlink and preserves output | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=0, 실행 행 116 |
| B05-P03 | runtime probe ENOTDIR is not absence | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=0, 실행 행 117 |
| B05-P03 | unsupported B backend remains closed | pass | [원출력](b08-consumers.log), crypto=1 sqlite=1 backend=0, 실행 행 118 |
| B08-R02 | 이전 manifest를 보유한 관측기가 회수 경쟁에서 Busy 반환 | pass | [최종 원출력](b08-checkpoint-observer-final.log), crypto=1 sqlite=1 backend=1 |
| B08-R02 | 새 관측기가 완결된 단일 현재 세대 반환 | pass | [최종 원출력](b08-checkpoint-observer-final.log), crypto=1 sqlite=1 backend=1 |
| B08-R02 | 이전 manifest를 보유한 관측기가 회수 경쟁에서 Busy 반환 | pass | [최종 원출력](b08-checkpoint-observer-final.log), crypto=1 sqlite=0 backend=1 |
| B08-R02 | 새 관측기가 완결된 단일 현재 세대 반환 | pass | [최종 원출력](b08-checkpoint-observer-final.log), crypto=1 sqlite=0 backend=1 |
