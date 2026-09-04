# S05 등록 보완 후 재검증 개별 결과

앞선 S05 등록 총계 실패와 별도인 재개 실행이다. 등록 소비자의 합성 입력은 제품 실행 증거로 사용하지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| ./server.sh verify-v410-event-recording | exit 0, 26827ms, stderr 0B | pass | 앞선 총계 FAIL 보완 후 재실행 |
| ./server.sh build | exit 0, 603ms, stderr 0B | pass | 기존 빌드 디렉터리 증분 빌드 |
| 등록 소비자 1 | 정상 정식 등록 27개 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 2 | 다른 등록군 추가와 일관된 총계 허용 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 3 | 전체 총계 불일치 거부 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 4 | canonical 등록 수 변경 거부 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 5 | S05 등록 수 변경 거부 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 6 | 등록군 중복 거부 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 7 | 음수 등록 수 거부 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 8 | 소수 등록 수 거부 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 9 | 등록 범위 표 누락 거부 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 10 | 누락 ID | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 11 | 중복 ID | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 12 | 추가 ID | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 13 | 빈 테스트 영역 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 14 | 없는 구현 심볼 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 15 | 없는 테스트 함수 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 16 | 없는 check | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 17 | 중복 check ID | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 18 | 문서 행 누락 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 19 | 실행 소비자 정상 합성 입력 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 20 | 실제 check 결과 누락 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 21 | EOS assertion 제거와 감소한 summary도 거부 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 22 | 실패 summary | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 23 | 성공 summary만으로 PASS 금지 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 24 | 중복 application 결과 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 25 | runtime 로그 전체 누락 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 26 | runtime 시나리오 누락 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 27 | runtime assertion 누락 및 감소 summary | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 28 | runtime assertion 중복 및 증가 summary | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 29 | runtime summary 실패 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 30 | runtime summary 중복 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 31 | runtime failure marker | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 32 | runtime mutation 결과 누락 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 33 | runtime mutation 결과 중복 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| 등록 소비자 34 | runtime negative summary 실패 | pass | 합성 입력을 통한 거부 정책, 제품 실행 아님 |
| S05 C++ 1 | 기본 pending event link가 유효해야 함:  | pass | 실제 C++ assertion |
| S05 C++ 2 | terminal 대기 UTC 확장 요청은 additive 계약으로 round-trip해야 함 | pass | 실제 C++ assertion |
| S05 C++ 3 | terminal 대기 요청이 현재 범위를 축소하면 거부해야 함 | pass | 실제 C++ assertion |
| S05 C++ 4 | 미해석 후속 PTS는 기존 UTC 범위와 별도 field로 round-trip해야 함 | pass | 실제 C++ assertion |
| S05 C++ 5 | 미해석 후속 PTS를 소비하지 않은 terminal 상태를 거부해야 함 | pass | 실제 C++ assertion |
| S05 C++ 6 | 서로 겹치는 ordered overlap을 거부해야 함 | pass | 실제 C++ assertion |
| S05 C++ 7 | overlap/missing이 requested range를 정확히 분할하지 않으면 거부해야 함 | pass | 실제 C++ assertion |
| S05 C++ 8 | unknown link status를 영속 계약으로 허용하면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 9 | locator 없는 fallback evidence를 거부해야 함 | pass | 실제 C++ assertion |
| S05 C++ 10 | journal open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 11 | catalog open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 12 | event link 갱신은 SQLite primary projection에서 검증해야 함 | pass | 실제 C++ assertion |
| S05 C++ 13 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 14 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 15 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 16 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 17 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 18 | retention policy 실패:  | pass | 실제 C++ assertion |
| S05 C++ 19 | 이벤트 저장 worker를 막지 않고 파생 job을 pending으로 enqueue해야 함 | pass | 실제 C++ assertion |
| S05 C++ 20 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 21 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 22 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 23 | 완전한 archive 파생 완료 뒤 ready clip을 반환해야 함 | pass | 실제 C++ assertion |
| S05 C++ 24 | event link ID와 derived clip path가 반환되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 25 | 반개구간 overlap은 맞닿기만 한 segment를 제외해야 함 | pass | 실제 C++ assertion |
| S05 C++ 26 | media PTS event 범위가 segment epoch 기준 UTC로 변환되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 27 | overlap segment가 UTC 순서로 전달되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 28 | 파생 성공 link가 catalog complete로 저장되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 29 | 파생 완료 뒤 원본 hold가 해제되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 30 | 파생 완료 뒤 원본 hold가 해제되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 31 | 파생 완료 뒤 원본 hold가 해제되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 32 | 같은 event update는 파생 clip을 중복 생성하지 않아야 함 | pass | 실제 C++ assertion |
| S05 C++ 33 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 34 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 35 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 36 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 37 | 완료 event의 더 넓은 update는 range별 결정 ID로 다시 파생해야 함 | pass | 실제 C++ assertion |
| S05 C++ 38 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 39 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 40 | cam-b policy 실패:  | pass | 실제 C++ assertion |
| S05 C++ 41 | archive gap이 있으면 complete로 표시하면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 42 | link가 정확한 missing UTC range를 보존해야 함 | pass | 실제 C++ assertion |
| S05 C++ 43 | frame-buffer fallback 뒤 같은 link가 fallback evidence로 갱신되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 44 | 같은 event link의 overlap/fallback 갱신 뒤에도 SQLite projection을 유지해야 함 | pass | 실제 C++ assertion |
| S05 C++ 45 | cam-late policy 실패:  | pass | 실제 C++ assertion |
| S05 C++ 46 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 47 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 48 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 49 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 50 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 51 | anchor 없는 PTS를 finalized segment의 실제 PTS/UTC mapping으로 복구해야 함 | pass | 실제 C++ assertion |
| S05 C++ 52 | PTS epoch anchor가 없으면 임의 UTC 연결이나 파생을 하면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 53 | anchor 없는 PTS는 UTC field가 아니라 재해석 가능한 PTS range로 보존해야 함 | pass | 실제 C++ assertion |
| S05 C++ 54 | 같은 긴 prefix의 event ID도 SHA-256 기반 결정 ID가 충돌하면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 55 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 56 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 57 | 파생 중 원본 segment hold가 유지되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 58 | 확장 회귀 journal open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 59 | 확장 회귀 initial catalog open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 60 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 61 | cleanup 확장 fixture 저장 실패:  | pass | 실제 C++ assertion |
| S05 C++ 62 | cleanup 확장 fixture 저장 실패:  | pass | 실제 C++ assertion |
| S05 C++ 63 | 확장 회귀 restart catalog open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 64 | 확장 policy 실패 | pass | 실제 C++ assertion |
| S05 C++ 65 | cleanup 확장 remux 실패는 한 번만 실행되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 66 | 실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함 | pass | 실제 C++ assertion |
| S05 C++ 67 | 실패/Partial도 보류 확장 요청을 현재 범위로 소비해 보존해야 함 | pass | 실제 C++ assertion |
| S05 C++ 68 | PTS 확장은 다른 범위 ID를 사용해야 함 | pass | 실제 C++ assertion |
| S05 C++ 69 | 미해석 PTS 확장을 이전 complete clip으로 응답하면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 70 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 71 | PTS 확장 2회는 최초 포함 총 3회 파생해야 함 | pass | 실제 C++ assertion |
| S05 C++ 72 | quota journal open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 73 | quota catalog open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 74 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 75 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 76 | quota policy 실패:  | pass | 실제 C++ assertion |
| S05 C++ 77 | event quota는 oldest event를 정리해 새 event write를 허용해야 함: ok | pass | 실제 C++ assertion |
| S05 C++ 78 | event quota 충족을 위해 continuous를 삭제하면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 79 | event quota는 oldest eligible event를 삭제해야 함 | pass | 실제 C++ assertion |
| S05 C++ 80 | policy 재등록 실패:  | pass | 실제 C++ assertion |
| S05 C++ 81 | policy 제거가 진행 중 event reservation을 지우면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 82 | 명시적 complete 뒤 event reservation ID를 재사용할 수 있어야 함 | pass | 실제 C++ assertion |
| S05 C++ 83 | queue journal open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 84 | queue catalog open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 85 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 86 | queue policy 실패:  | pass | 실제 C++ assertion |
| S05 C++ 87 | bounded queue 밖 durable pending도 완료 뒤 다시 흡수해야 함 | pass | 실제 C++ assertion |
| S05 C++ 88 | 긴 event remux가 다른 이벤트의 durable link admission을 동기 차단하면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 89 | cleanup 실패 시 source hold와 event reservation을 성공처럼 해제하면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 90 | terminal marker unlink 실패 시 source/output hold를 유지해야 함 | pass | 실제 C++ assertion |
| S05 C++ 91 | terminal marker unlink 실패 시 event reservation을 유지해야 함 | pass | 실제 C++ assertion |
| S05 C++ 92 | marker 복구 중 event/fallback 갱신은 자원·단계를 보존하고 확장 요청을 내구 대기해야 함 | pass | 실제 C++ assertion |
| S05 C++ 93 | terminal hold 해제 실패를 Complete로 기록하면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 94 | terminal 복구 중 event/fallback 갱신이 release 단계를 덮어쓰면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 95 | 복구 완료 뒤 내구 대기한 범위 확장은 같은 source epoch의 새 segment로 파생해야 함 | pass | 실제 C++ assertion |
| S05 C++ 96 | terminal complete commit retry fixture 저장 실패:  | pass | 실제 C++ assertion |
| S05 C++ 97 | complete commit 재시도는 다른 pending event의 source hold를 해제하면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 98 | overflow fixture 이전 hold_count가 저장 범위를 넘으면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 99 | hold overflow fixture 준비 실패:  | pass | 실제 C++ assertion |
| S05 C++ 100 | event source lease hold_count overflow를 사전에 거부해야 함 | pass | 실제 C++ assertion |
| S05 C++ 101 | hold fixture journal open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 102 | hold fixture catalog open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 103 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 104 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 105 | hold pending link 저장 실패:  | pass | 실제 C++ assertion |
| S05 C++ 106 | hold replay journal open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 107 | hold replay catalog open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 108 | 재시작 replay가 terminal 전 output/source hold를 함께 복원해야 함 | pass | 실제 C++ assertion |
| S05 C++ 109 | terminal stage fixture event link 조회 | pass | 실제 C++ assertion |
| S05 C++ 110 | terminal stage fixture 저장 실패:  | pass | 실제 C++ assertion |
| S05 C++ 111 | terminal stage replay journal open:  | pass | 실제 C++ assertion |
| S05 C++ 112 | terminal stage catalog open:  | pass | 실제 C++ assertion |
| S05 C++ 113 | complete commit 단계 재시작은 이미 해제된 output/source hold를 복원하면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 114 | terminal Complete 기록 전 source 삭제 요청을 차단해야 함 | pass | 실제 C++ assertion |
| S05 C++ 115 | terminal Complete 기록 전 output 삭제 요청을 차단해야 함 | pass | 실제 C++ assertion |
| S05 C++ 116 | restart journal open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 117 | restart catalog open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 118 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 119 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 120 | restart pending link 저장 실패:  | pass | 실제 C++ assertion |
| S05 C++ 121 | 재시작은 이미 finalized된 결정적 event segment를 재파생 없이 연결해야 함 | pass | 실제 C++ assertion |
| S05 C++ 122 | 재시작 복구에서 event clip을 중복 파생하면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 123 | segment finalize 실패:  | pass | 실제 C++ assertion |
| S05 C++ 124 | conflict pending link 저장 실패:  | pass | 실제 C++ assertion |
| S05 C++ 125 | 다른 channel/class의 동일 segment ID를 event 결과로 오인하면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 126 | segment ID conflict에서 파생을 실행하면 안 됨 | pass | 실제 C++ assertion |
| S05 C++ 127 | 실제 H264/MP4 source를 video 재인코딩 없이 remux해야 함:  | pass | 실제 C++ assertion |
| S05 C++ 128 | remux 결과 파일과 size가 일치해야 함 | pass | 실제 C++ assertion |
| S05 C++ 129 | event clip actual range는 keyframe 확대를 측정해 requested range와 분리해야 함 | pass | 실제 C++ assertion |
| S05 C++ 130 | event clip이 source segment 전체 단순 연결보다 작아야 함 | pass | 실제 C++ assertion |
| S05 C++ 131 | remux 결과 checksum과 crash cleanup marker를 남겨야 함 | pass | 실제 C++ assertion |
| S05 C++ 132 | 동일 final은 소유 artifact가 없는 terminal 충돌로 거부하고 기존 clip을 보존해야 함 | pass | 실제 C++ assertion |
| S05 C++ 133 | 파생 H264/MP4 clip이 끝까지 demux/parse 가능해야 함:  | pass | 실제 C++ assertion |
| S05 C++ 134 | nonce partial은 foreign 고정 partial을 보존하면서 독립 파생되어야 함 | pass | 실제 C++ assertion |
| S05 C++ 135 | event remux recovery journal open 실패:  | pass | 실제 C++ assertion |
| S05 C++ 136 | 재시작은 marker nonce와 일치하는 owned crash partial만 정리해야 함:  | pass | 실제 C++ assertion |
| S05 C++ 137 | owned crash partial 복구 뒤 동일 event clip 재파생이 성공해야 함:  | pass | 실제 C++ assertion |
| S05 C++ 138 | VP8/WebM test source 생성 실패:  | pass | 실제 C++ assertion |
| S05 C++ 139 | VP8/WebM test source demux 실패:  | pass | 실제 C++ assertion |
| S05 C++ 140 | 검증되지 않은 VP8/WebM event remux는 산출물 없이 fail-closed해야 함 | pass | 실제 C++ assertion |
| S05 application 1 | application header is standard-only with exact DTO/default manifests | pass | application-only 범위 |
| S05 application 2 | application source owns exact canonical mapping and overwrite semantics | pass | application-only 범위 |
| S05 application 3 | transport has zero canonical bypass and exact projection/call ordering | pass | application-only 범위 |
| S05 application 4 | recording link is durably admitted before the bounded storage queue can drop an event | pass | application-only 범위 |
| S05 application 5 | event clip output remains fd-bound and measured before no-replace publication | pass | application-only 범위 |
| S05 application 6 | compiled fake canonical matrix preserves all fields failure/null outputs and lifecycle order | pass | application-only 범위 |
| S05 application 7 | S05 composition starts the bridge before ingress and drains it after storage | pass | application-only 범위 |
| S05 runtime 1 | disabled-admit: 실제 EventStorage worker 진입을 관찰한다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 2 | disabled-admit: worker 처리 전에 첫 이벤트 연결이 내구 접수된다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 3 | disabled-admit: 실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 4 | disabled-admit: 퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 5 | disabled-admit: 저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 6 | disabled-admit: JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 7 | disabled-admit: JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 8 | disabled-recover: 새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 9 | disabled-recover: 퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 10 | disabled-recover: 같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 11 | enabled-admit: 실제 EventStorage worker 진입을 관찰한다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 12 | enabled-admit: worker 처리 전에 첫 이벤트 연결이 내구 접수된다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 13 | enabled-admit: 실제 저장 큐 크기 2에서 다섯 접수 중 두 이벤트가 퇴출된다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 14 | enabled-admit: 퇴출 이벤트를 포함한 다섯 PTS 연결이 worker 해제 전에 보존된다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 15 | enabled-admit: 저장 worker drain 뒤에도 다섯 연결과 시간축이 보존된다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 16 | enabled-admit: JSONL 설정에 따른 실제 저장 수와 빈 큐를 확인한다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 17 | enabled-admit: JSONL 비활성은 파일 없음이고 활성은 생존 이벤트 세 개와 link ID가 일치한다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 18 | enabled-recover: 새 프로세스의 빈 SQLite를 journal로 재구축해 다섯 PTS 연결을 복구한다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 19 | enabled-recover: 퇴출 이벤트까지 UTC 매핑 후 다섯 실제 H264 파생 파일이 완료된다 | pass | 실제 저장 큐·복구 프로세스 |
| S05 runtime 20 | enabled-recover: 같은 이벤트 재접수는 복구된 다섯 clip ID를 바꾸거나 추가하지 않는다 | pass | 실제 저장 큐·복구 프로세스 |
| disabled-guard: PASS (실제 assertion의 RED 확인) | 의도한 source mutation에서 실제 assertion RED 확인 | pass | mutation별 개별 결과 |
| prequeue-admission: PASS (실제 assertion의 RED 확인) | 의도한 source mutation에서 실제 assertion RED 확인 | pass | mutation별 개별 결과 |
| V410-S05-I01 | 실제 결과 대조 3 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I01-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I01-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I01-C03 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02 | 실제 결과 대조 21 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I02-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C03 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C04 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C05 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C06 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C07 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C08 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C09 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C10 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C11 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C12 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C13 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C14 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C15 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C16 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C17 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C18 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C19 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C20 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I02-C21 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I03 | 실제 결과 대조 1 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I03-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I04 | 실제 결과 대조 3 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I04-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I04-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I04-C03 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I05 | 실제 결과 대조 3 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I05-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I05-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I05-C03 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I06 | 실제 결과 대조 8 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I06-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I06-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I06-C03 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I06-C04 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I06-C05 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I06-C06 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I06-C07 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I06-C08 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I07 | 실제 결과 대조 4 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I07-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I07-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I07-C03 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I07-C04 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I08 | 실제 결과 대조 2 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I08-C01 | executions=14 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I08-C02 | executions=3 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I09 | 실제 결과 대조 4 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I09-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I09-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I09-C03 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I09-C04 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I10 | 실제 결과 대조 1 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I10-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I11 | 실제 결과 대조 1 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I11-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I12 | 실제 결과 대조 1 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I12-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I13 | 실제 결과 대조 3 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I13-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I13-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I13-C03 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I14 | 실제 결과 대조 5 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I14-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I14-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I14-C03 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I14-C04 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I14-C05 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I15 | 실제 결과 대조 2 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I15-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I15-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I16 | 실제 결과 대조 2 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I16-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I16-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I17 | 실제 결과 대조 1 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I17-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I18 | 실제 결과 대조 2 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I18-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I18-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I19 | 실제 결과 대조 2 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I19-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I19-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I20 | 실제 결과 대조 5 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I20-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I20-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I20-C03 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I20-C04 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I20-C05 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I21 | 실제 결과 대조 5 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I21-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I21-C02 | executions=2 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I21-C03 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I21-C04 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I21-C05 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I22 | 실제 결과 대조 1 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I22-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I23 | 실제 결과 대조 2 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I23-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I23-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I24 | 실제 결과 대조 4 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I24-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I24-C02 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I24-C03 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I24-C04 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I25 | 실제 결과 대조 1 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I25-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I26 | 실제 결과 대조 1 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I26-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |
| V410-S05-I27 | 실제 결과 대조 1 check | pass | 기존 고정 action ID 유지 |
| V410-S05-I27-C01 | executions=1 | pass | 실제 check 성공 메시지 연결 |

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| /private/tmp/media-server-gst-s05-recheck.tapUz9 | 임시 GST cache·runner 잔여물 | 1596295B / 280파일 | 전용 root 삭제 | 부재 확인 | s05-build-results.json |

S05 내부 fixture의 임시 C++ 바이너리/녹화 파일은 각 기존 runner가 먼저 정리했다. 위 크기는 그 정리 후 남은 외부 root 실측이며 이미 정리된 내부 파일 크기는 미집계다. 제품 build-gst-onnx는 정상 빌드 산출물이므로 보존한다.

실제 집계: C++ 140, application 7, runtime 20, 등록기 34, action 27, check 89. 시작 2026-09-04T12:05:12.856Z, 종료 2026-09-04T12:05:40.296Z. token start/end/consumed 미집계(goal 계측 없음).
