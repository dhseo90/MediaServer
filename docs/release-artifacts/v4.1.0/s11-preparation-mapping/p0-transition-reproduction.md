# P0 독립 전이·긴 GOP 재현

## 마지막 stage 검증·로그 정규화

기존 working-tree diffcheck는 exit0이었으나, 미추적 로그를 포함한 최종 staged diffcheck에서 줄 끝 공백이 발견됐다. 아래 로그의 줄 끝 공백만 기계적으로 제거했고 행 번호·명령·값·실패/통과는 불변이다. 원출력의 정규화 전후 SHA256과 크기를 보존한다. 제품/검증 소스 변경이 아니므로 기능 검증을 반복하지 않는다.

| 로그 | 이전 B | 이후 B | 이전 SHA256 | 이후 SHA256 |
| --- | --- | --- | --- | --- |
| cp-http-assertion-red.log | 4518 | 4498 | 3323d02e195f0377a677ec797c8089fe6ecb31db184ebab5907cd21bae973a75 | 9eeefc876ba9dab4c700fbd506b5c54c48f7630d96648b9a96822b9d1a048149 |
| cp2-catalog.log | 14313 | 14298 | 642f426905d8d39ec6308de988bfeb15be054224b33e075bb2419d049e5a3567 | 67523d729d8fc9caade28392e7b75e029af4b73ce3c061856c1da394148a0e65 |
| cp2-fields-catalog.log | 14313 | 14298 | 8a6e6299079b1def9f47c40825b3a35f98dc193c8d8f7b588b5cf270970bf451 | 0c64a118cef9c363da962c64b5377069c78454ffd09b1afd37a6beb89706cab3 |
| evidence-placeholder-red.log | 1999 | 1995 | 1f57606ee3a93253028d5704c09f3de6461a9c2168b95b0661e73e9aec6881ff | 8e80f3c20209d2bfed8017f38c647e41376305a9c08ffd9e82d92fcf378a0b9b |
| p0-http-diagnostic-red.log | 2871 | 2867 | 1b106c490af3016f757b086ec3dae4972b95acd927f36f7a5b44446d65e8f3e2 | fd157273da4217fbc1e10176b3b94a7b18ddc139bda2f14806cfb339dd1a9845 |
| p0-stack-diagnostic-red.log | 1372 | 1368 | e29cc310dfb1dd958cfc8319d05809c0daa1e475abafc4160c58d39af5225088 | 04dd92d519c71794f8bd750f4beb1476cacc4903ecc58f9c5c98b47c4ea7d020 |
| p0-state-assertion-red.log | 2863 | 2855 | 151637b56e83b218f9c1b87c11f7a9b6cf489caca6cdeddddc4ea720ca1e9745 | 1899bcb40dda532def4a0824341a47b452b007d8505e02ad107874a9dd792d87 |


독자: 이번 P0 구현·검토 담당. 수명: v4.1.0 개발 검증 이력. 정책은 AGENTS, 실행 정의·상태의 중앙 source-of-truth는 release-test-records다. 현재 결과와 과거 실패를 아래에서 구분한다.

## 커밋 범위와 후속 작업

- `bd5f5ea8`: 1번 독립 재현 코드·원출력.
- `81709d84`: 이전 승인·검증된 내부 증거 전달을 이번 실제 HTTP 검증의 선행 의존성으로 분리. 새 정책이나 다음 단계 개발이 아니다.
- `c549ec00`: 2번 checkpoint·intent 중복 계산 제거, 동일성 검사, 임시 계측 제거.
- 마지막 검증 준비·기록 커밋: 한정 HTTP 모드와 그 공유 helper/기존 통합 준비 파일, 과거 실패 및 이번 결과를 보존한다. 기존 전체 통합 준비 코드는 실행 완료라고 주장하지 않는다.

문서 링크 검사는 exit0, Markdown271·로컬 링크8559·이미지22·anchor110·failures0이며 [로그](cp-docs-links.log)를 보존한다. diffcheck도 exit0이다. 커밋만으로 동일 제품 소스의 유효 테스트를 재실행하지 않는다.

3번은 긴 GOP의 원본 확정 시점과 bounded 대기·요청 구간 충족을 정합화하고, 30fps 파일-duration의 1ns 잔차를 근거에 따라 처리하는 설계·구현이다. timeout 상향이나 시간 강제 보정으로 해결하지 않는다. 4번은 그 이후 실제 완전2출력·각 HTTP/hash, 재기동 뒤 기존 ID/hash 보존·새 생산, 현행5단계 통합이다. 이번 latencyPass는 4번의 actualEventPass/restartPass를 대체하지 않는다. 브라우저·장시간·최종 S11은 이번 미실행이다.

## 메인 최종 HTTP 한정 검증

`env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp node scripts/internal/verify_recording_current_app.mjs --latency-only`는 exit0, 30,023ms, 5개 PASS다. 실제 timeline 190건 전부 HTTP200·4초 이내, 최대3,786ms. 동일 이벤트 작업의 Complete와 이후5초를 관측했다. 출력은 partial1이며 actualEventPass/restartPass는 false다. 최대 지연의 여유는214ms로, 장시간·더 큰 원장의 성능을 보장하지 않는다. 원본/후보 중복 복원 제거 및 이번 실제 지연 범위만 완료다.

소유 PID74473 exit0, HTTP63279/RTSP63280 반환·UDP 종료, root `/private/tmp/media-server-current-integration-WnWwSm` 47,593,525B 삭제·부재 확인. [원출력](cp-http-actual.log). 사용자 대기 정책·완전성·공개 API·저장 포맷 변경은 없다. token start/end/consumed는 집계 소스 부재로 미집계, elapsed는 원출력 단조 시간이다.

### HTTP 실행 전수

초기 health 접속 실패는 부팅 대기 중 실제 실패한 개별 시도로 남기며 성공한 요청으로 바꾸지 않는다. 전체 제품 인증/UI/통합 PASS가 아니다.

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| HTTP 1 | GET health, status=null, 4ms, 0B | FAIL | 원출력 1행, header/error |
| HTTP 2 | GET health, status=null, 1ms, 0B | FAIL | 원출력 2행, header/error |
| HTTP 3 | GET health, status=null, 1ms, 0B | FAIL | 원출력 3행, header/error |
| HTTP 4 | GET health, status=null, 1ms, 0B | FAIL | 원출력 4행, header/error |
| HTTP 5 | GET health, status=null, 1ms, 0B | FAIL | 원출력 5행, header/error |
| HTTP 6 | GET health, status=null, 2ms, 0B | FAIL | 원출력 6행, header/error |
| HTTP 7 | GET health, status=null, 1ms, 0B | FAIL | 원출력 7행, header/error |
| HTTP 8 | GET health, status=null, 1ms, 0B | FAIL | 원출력 8행, header/error |
| HTTP 9 | GET health, status=null, 1ms, 0B | FAIL | 원출력 9행, header/error |
| HTTP 10 | GET health, status=null, 1ms, 0B | FAIL | 원출력 10행, header/error |
| HTTP 11 | GET health, status=null, 0ms, 0B | FAIL | 원출력 11행, header/error |
| HTTP 12 | GET health, status=null, 0ms, 0B | FAIL | 원출력 12행, header/error |
| HTTP 13 | GET health, status=null, 0ms, 0B | FAIL | 원출력 13행, header/error |
| HTTP 14 | GET health, status=null, 0ms, 0B | FAIL | 원출력 14행, header/error |
| HTTP 15 | GET health, status=null, 0ms, 0B | FAIL | 원출력 15행, header/error |
| HTTP 16 | GET health, status=null, 0ms, 0B | FAIL | 원출력 16행, header/error |
| HTTP 17 | GET health, status=null, 0ms, 0B | FAIL | 원출력 17행, header/error |
| HTTP 18 | GET health, status=null, 0ms, 0B | FAIL | 원출력 18행, header/error |
| HTTP 19 | GET health, status=null, 1ms, 0B | FAIL | 원출력 19행, header/error |
| HTTP 20 | GET health, status=200, 6ms, 15B | PASS | 원출력 20행, complete/ok |
| HTTP 21 | GET ice, status=200, 1ms, 222B | PASS | 원출력 21행, complete/ok |
| 실제 판정 22 | S11-CI09 product-1 healthy isolated ICE | PASS | cp-http-actual.log |
| HTTP 22 | POST source, status=201, 78ms, 428B | PASS | 원출력 23행, complete/ok |
| HTTP 23 | POST tap-create, status=200, 50ms, 1099B | PASS | 원출력 24행, complete/ok |
| HTTP 24 | GET tap, status=200, 17ms, 3942B | PASS | 원출력 25행, complete/ok |
| HTTP 25 | GET tap, status=200, 1ms, 5840B | PASS | 원출력 26행, complete/ok |
| HTTP 26 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 27행, complete/ok |
| HTTP 27 | GET tap, status=200, 1ms, 5842B | PASS | 원출력 28행, complete/ok |
| HTTP 28 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 29행, complete/ok |
| HTTP 29 | GET tap, status=200, 1ms, 6021B | PASS | 원출력 30행, complete/ok |
| HTTP 30 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 31행, complete/ok |
| HTTP 31 | GET tap, status=200, 1ms, 6143B | PASS | 원출력 32행, complete/ok |
| HTTP 32 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 33행, complete/ok |
| HTTP 33 | GET tap, status=200, 1ms, 6282B | PASS | 원출력 34행, complete/ok |
| HTTP 34 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 35행, complete/ok |
| HTTP 35 | GET tap, status=200, 1ms, 6413B | PASS | 원출력 36행, complete/ok |
| HTTP 36 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 37행, complete/ok |
| HTTP 37 | GET tap, status=200, 1ms, 6415B | PASS | 원출력 38행, complete/ok |
| HTTP 38 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 39행, complete/ok |
| HTTP 39 | GET tap, status=200, 1ms, 6553B | PASS | 원출력 40행, complete/ok |
| HTTP 40 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 41행, complete/ok |
| HTTP 41 | GET tap, status=200, 1ms, 6684B | PASS | 원출력 42행, complete/ok |
| HTTP 42 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 43행, complete/ok |
| HTTP 43 | GET tap, status=200, 1ms, 6820B | PASS | 원출력 44행, complete/ok |
| HTTP 44 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 45행, complete/ok |
| HTTP 45 | GET tap, status=200, 4ms, 6957B | PASS | 원출력 46행, complete/ok |
| HTTP 46 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 47행, complete/ok |
| HTTP 47 | GET tap, status=200, 1ms, 6958B | PASS | 원출력 48행, complete/ok |
| HTTP 48 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 49행, complete/ok |
| HTTP 49 | GET tap, status=200, 1ms, 7090B | PASS | 원출력 50행, complete/ok |
| HTTP 50 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 51행, complete/ok |
| HTTP 51 | GET tap, status=200, 1ms, 7231B | PASS | 원출력 52행, complete/ok |
| HTTP 52 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 53행, complete/ok |
| HTTP 53 | GET tap, status=200, 1ms, 7361B | PASS | 원출력 54행, complete/ok |
| HTTP 54 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 55행, complete/ok |
| HTTP 55 | GET tap, status=200, 1ms, 7368B | PASS | 원출력 56행, complete/ok |
| HTTP 56 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 57행, complete/ok |
| HTTP 57 | GET tap, status=200, 1ms, 7507B | PASS | 원출력 58행, complete/ok |
| HTTP 58 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 59행, complete/ok |
| HTTP 59 | GET tap, status=200, 1ms, 7638B | PASS | 원출력 60행, complete/ok |
| HTTP 60 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 61행, complete/ok |
| HTTP 61 | GET tap, status=200, 1ms, 7772B | PASS | 원출력 62행, complete/ok |
| HTTP 62 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 63행, complete/ok |
| HTTP 63 | GET tap, status=200, 1ms, 7910B | PASS | 원출력 64행, complete/ok |
| HTTP 64 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 65행, complete/ok |
| HTTP 65 | GET tap, status=200, 5ms, 8042B | PASS | 원출력 66행, complete/ok |
| HTTP 66 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 67행, complete/ok |
| HTTP 67 | GET tap, status=200, 1ms, 8042B | PASS | 원출력 68행, complete/ok |
| HTTP 68 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 69행, complete/ok |
| HTTP 69 | GET tap, status=200, 1ms, 8173B | PASS | 원출력 70행, complete/ok |
| HTTP 70 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 71행, complete/ok |
| HTTP 71 | GET tap, status=200, 1ms, 8300B | PASS | 원출력 72행, complete/ok |
| HTTP 72 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 73행, complete/ok |
| HTTP 73 | GET tap, status=200, 1ms, 8441B | PASS | 원출력 74행, complete/ok |
| HTTP 74 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 75행, complete/ok |
| HTTP 75 | GET tap, status=200, 1ms, 8447B | PASS | 원출력 76행, complete/ok |
| HTTP 76 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 77행, complete/ok |
| HTTP 77 | GET tap, status=200, 1ms, 8581B | PASS | 원출력 78행, complete/ok |
| HTTP 78 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 79행, complete/ok |
| HTTP 79 | GET tap, status=200, 1ms, 8717B | PASS | 원출력 80행, complete/ok |
| HTTP 80 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 81행, complete/ok |
| HTTP 81 | GET tap, status=200, 1ms, 8849B | PASS | 원출력 82행, complete/ok |
| HTTP 82 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 83행, complete/ok |
| HTTP 83 | GET tap, status=200, 1ms, 8985B | PASS | 원출력 84행, complete/ok |
| HTTP 84 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 85행, complete/ok |
| HTTP 85 | GET tap, status=200, 1ms, 8987B | PASS | 원출력 86행, complete/ok |
| HTTP 86 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 87행, complete/ok |
| HTTP 87 | GET tap, status=200, 1ms, 9116B | PASS | 원출력 88행, complete/ok |
| HTTP 88 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 89행, complete/ok |
| HTTP 89 | GET tap, status=200, 1ms, 9249B | PASS | 원출력 90행, complete/ok |
| HTTP 90 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 91행, complete/ok |
| HTTP 91 | GET tap, status=200, 1ms, 9381B | PASS | 원출력 92행, complete/ok |
| HTTP 92 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 93행, complete/ok |
| HTTP 93 | GET tap, status=200, 1ms, 9523B | PASS | 원출력 94행, complete/ok |
| HTTP 94 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 95행, complete/ok |
| HTTP 95 | GET tap, status=200, 1ms, 9525B | PASS | 원출력 96행, complete/ok |
| HTTP 96 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 97행, complete/ok |
| HTTP 97 | GET tap, status=200, 1ms, 10078B | PASS | 원출력 98행, complete/ok |
| HTTP 98 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 99행, complete/ok |
| HTTP 99 | GET tap, status=200, 1ms, 10258B | PASS | 원출력 100행, complete/ok |
| HTTP 100 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 101행, complete/ok |
| HTTP 101 | GET tap, status=200, 1ms, 10440B | PASS | 원출력 102행, complete/ok |
| HTTP 102 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 103행, complete/ok |
| HTTP 103 | GET tap, status=200, 4ms, 10623B | PASS | 원출력 104행, complete/ok |
| HTTP 104 | GET timeline, status=200, 2ms, 82B | PASS | 원출력 105행, complete/ok |
| HTTP 105 | GET tap, status=200, 1ms, 10626B | PASS | 원출력 106행, complete/ok |
| HTTP 106 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 107행, complete/ok |
| HTTP 107 | GET tap, status=200, 1ms, 10690B | PASS | 원출력 108행, complete/ok |
| HTTP 108 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 109행, complete/ok |
| HTTP 109 | GET tap, status=200, 1ms, 10731B | PASS | 원출력 110행, complete/ok |
| HTTP 110 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 111행, complete/ok |
| HTTP 111 | GET tap, status=200, 1ms, 10788B | PASS | 원출력 112행, complete/ok |
| HTTP 112 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 113행, complete/ok |
| HTTP 113 | GET tap, status=200, 1ms, 10840B | PASS | 원출력 114행, complete/ok |
| HTTP 114 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 115행, complete/ok |
| HTTP 115 | GET tap, status=200, 1ms, 10840B | PASS | 원출력 116행, complete/ok |
| HTTP 116 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 117행, complete/ok |
| HTTP 117 | GET tap, status=200, 1ms, 10891B | PASS | 원출력 118행, complete/ok |
| HTTP 118 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 119행, complete/ok |
| HTTP 119 | GET tap, status=200, 1ms, 10940B | PASS | 원출력 120행, complete/ok |
| HTTP 120 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 121행, complete/ok |
| HTTP 121 | GET tap, status=200, 1ms, 10936B | PASS | 원출력 122행, complete/ok |
| HTTP 122 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 123행, complete/ok |
| HTTP 123 | GET tap, status=200, 1ms, 10983B | PASS | 원출력 124행, complete/ok |
| HTTP 124 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 125행, complete/ok |
| HTTP 125 | GET tap, status=200, 1ms, 11019B | PASS | 원출력 126행, complete/ok |
| HTTP 126 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 127행, complete/ok |
| HTTP 127 | GET tap, status=200, 1ms, 11061B | PASS | 원출력 128행, complete/ok |
| HTTP 128 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 129행, complete/ok |
| HTTP 129 | GET tap, status=200, 1ms, 11110B | PASS | 원출력 130행, complete/ok |
| HTTP 130 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 131행, complete/ok |
| HTTP 131 | GET tap, status=200, 1ms, 11112B | PASS | 원출력 132행, complete/ok |
| HTTP 132 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 133행, complete/ok |
| HTTP 133 | GET tap, status=200, 1ms, 11165B | PASS | 원출력 134행, complete/ok |
| HTTP 134 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 135행, complete/ok |
| HTTP 135 | GET tap, status=200, 1ms, 11204B | PASS | 원출력 136행, complete/ok |
| HTTP 136 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 137행, complete/ok |
| HTTP 137 | GET tap, status=200, 1ms, 11252B | PASS | 원출력 138행, complete/ok |
| HTTP 138 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 139행, complete/ok |
| HTTP 139 | GET tap, status=200, 1ms, 11297B | PASS | 원출력 140행, complete/ok |
| HTTP 140 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 141행, complete/ok |
| HTTP 141 | GET tap, status=200, 1ms, 11296B | PASS | 원출력 142행, complete/ok |
| HTTP 142 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 143행, complete/ok |
| HTTP 143 | GET tap, status=200, 1ms, 11338B | PASS | 원출력 144행, complete/ok |
| HTTP 144 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 145행, complete/ok |
| HTTP 145 | GET tap, status=200, 1ms, 11386B | PASS | 원출력 146행, complete/ok |
| HTTP 146 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 147행, complete/ok |
| HTTP 147 | GET tap, status=200, 1ms, 11426B | PASS | 원출력 148행, complete/ok |
| HTTP 148 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 149행, complete/ok |
| HTTP 149 | GET tap, status=200, 1ms, 11477B | PASS | 원출력 150행, complete/ok |
| HTTP 150 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 151행, complete/ok |
| HTTP 151 | GET tap, status=200, 1ms, 11474B | PASS | 원출력 152행, complete/ok |
| HTTP 152 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 153행, complete/ok |
| HTTP 153 | GET tap, status=200, 1ms, 11516B | PASS | 원출력 154행, complete/ok |
| HTTP 154 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 155행, complete/ok |
| HTTP 155 | GET tap, status=200, 1ms, 11561B | PASS | 원출력 156행, complete/ok |
| HTTP 156 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 157행, complete/ok |
| HTTP 157 | GET tap, status=200, 1ms, 11607B | PASS | 원출력 158행, complete/ok |
| HTTP 158 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 159행, complete/ok |
| HTTP 159 | GET tap, status=200, 1ms, 11607B | PASS | 원출력 160행, complete/ok |
| HTTP 160 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 161행, complete/ok |
| HTTP 161 | GET tap, status=200, 1ms, 11649B | PASS | 원출력 162행, complete/ok |
| HTTP 162 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 163행, complete/ok |
| HTTP 163 | GET tap, status=200, 1ms, 11701B | PASS | 원출력 164행, complete/ok |
| HTTP 164 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 165행, complete/ok |
| HTTP 165 | GET tap, status=200, 1ms, 11744B | PASS | 원출력 166행, complete/ok |
| HTTP 166 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 167행, complete/ok |
| HTTP 167 | GET tap, status=200, 1ms, 11783B | PASS | 원출력 168행, complete/ok |
| HTTP 168 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 169행, complete/ok |
| HTTP 169 | GET tap, status=200, 1ms, 11785B | PASS | 원출력 170행, complete/ok |
| HTTP 170 | GET timeline, status=200, 1ms, 82B | PASS | 원출력 171행, complete/ok |
| HTTP 171 | GET tap, status=200, 1ms, 11830B | PASS | 원출력 172행, complete/ok |
| HTTP 172 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 173행, complete/ok |
| HTTP 173 | GET tap, status=200, 1ms, 11875B | PASS | 원출력 174행, complete/ok |
| HTTP 174 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 175행, complete/ok |
| HTTP 175 | GET tap, status=200, 1ms, 11926B | PASS | 원출력 176행, complete/ok |
| HTTP 176 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 177행, complete/ok |
| HTTP 177 | GET tap, status=200, 1ms, 11921B | PASS | 원출력 178행, complete/ok |
| HTTP 178 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 179행, complete/ok |
| HTTP 179 | GET tap, status=200, 1ms, 11921B | PASS | 원출력 180행, complete/ok |
| HTTP 180 | GET timeline, status=200, 0ms, 82B | PASS | 원출력 181행, complete/ok |
| HTTP 181 | GET tap, status=200, 1ms, 11923B | PASS | 원출력 182행, complete/ok |
| HTTP 182 | GET timeline, status=200, 13ms, 82406B | PASS | 원출력 183행, complete/ok |
| HTTP 183 | GET timeline, status=200, 14ms, 69385B | PASS | 원출력 184행, complete/ok |
| HTTP 184 | GET tap, status=200, 1ms, 11922B | PASS | 원출력 185행, complete/ok |
| HTTP 185 | GET timeline, status=200, 13ms, 82406B | PASS | 원출력 186행, complete/ok |
| HTTP 186 | GET timeline, status=200, 14ms, 69385B | PASS | 원출력 187행, complete/ok |
| HTTP 187 | GET tap, status=200, 1ms, 11924B | PASS | 원출력 188행, complete/ok |
| HTTP 188 | GET timeline, status=200, 13ms, 82406B | PASS | 원출력 189행, complete/ok |
| HTTP 189 | GET timeline, status=200, 13ms, 69385B | PASS | 원출력 190행, complete/ok |
| HTTP 190 | GET tap, status=200, 1ms, 11917B | PASS | 원출력 191행, complete/ok |
| HTTP 191 | GET timeline, status=200, 12ms, 82406B | PASS | 원출력 192행, complete/ok |
| HTTP 192 | GET timeline, status=200, 13ms, 69385B | PASS | 원출력 193행, complete/ok |
| HTTP 193 | PUT rule, status=200, 2ms, 520B | PASS | 원출력 195행, complete/ok |
| HTTP 194 | GET tap-events, status=200, 7ms, 9853B | PASS | 원출력 196행, complete/ok |
| 실제 판정 198 | S11-CI07 run1 actual tuple EventRecord reference | PASS | cp-http-actual.log |
| HTTP 195 | PUT rule, status=200, 1ms, 521B | PASS | 원출력 199행, complete/ok |
| HTTP 196 | GET timeline, status=200, 12ms, 82342B | PASS | 원출력 200행, complete/ok |
| HTTP 197 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 201행, complete/ok |
| HTTP 198 | GET timeline, status=200, 12ms, 82342B | PASS | 원출력 203행, complete/ok |
| HTTP 199 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 204행, complete/ok |
| HTTP 200 | GET timeline, status=200, 12ms, 82342B | PASS | 원출력 205행, complete/ok |
| HTTP 201 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 206행, complete/ok |
| HTTP 202 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 207행, complete/ok |
| HTTP 203 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 208행, complete/ok |
| HTTP 204 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 209행, complete/ok |
| HTTP 205 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 210행, complete/ok |
| HTTP 206 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 211행, complete/ok |
| HTTP 207 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 212행, complete/ok |
| HTTP 208 | GET timeline, status=200, 12ms, 82342B | PASS | 원출력 213행, complete/ok |
| HTTP 209 | GET timeline, status=200, 16ms, 72681B | PASS | 원출력 214행, complete/ok |
| HTTP 210 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 215행, complete/ok |
| HTTP 211 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 216행, complete/ok |
| HTTP 212 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 217행, complete/ok |
| HTTP 213 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 218행, complete/ok |
| HTTP 214 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 219행, complete/ok |
| HTTP 215 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 220행, complete/ok |
| HTTP 216 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 221행, complete/ok |
| HTTP 217 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 222행, complete/ok |
| HTTP 218 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 223행, complete/ok |
| HTTP 219 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 224행, complete/ok |
| HTTP 220 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 225행, complete/ok |
| HTTP 221 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 226행, complete/ok |
| HTTP 222 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 227행, complete/ok |
| HTTP 223 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 228행, complete/ok |
| HTTP 224 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 229행, complete/ok |
| HTTP 225 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 230행, complete/ok |
| HTTP 226 | GET timeline, status=200, 30ms, 82342B | PASS | 원출력 231행, complete/ok |
| HTTP 227 | GET timeline, status=200, 19ms, 72681B | PASS | 원출력 232행, complete/ok |
| HTTP 228 | GET timeline, status=200, 14ms, 82342B | PASS | 원출력 233행, complete/ok |
| HTTP 229 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 234행, complete/ok |
| HTTP 230 | GET timeline, status=200, 12ms, 82342B | PASS | 원출력 235행, complete/ok |
| HTTP 231 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 236행, complete/ok |
| HTTP 232 | GET timeline, status=200, 12ms, 82342B | PASS | 원출력 237행, complete/ok |
| HTTP 233 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 238행, complete/ok |
| HTTP 234 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 239행, complete/ok |
| HTTP 235 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 240행, complete/ok |
| HTTP 236 | GET timeline, status=200, 12ms, 82342B | PASS | 원출력 241행, complete/ok |
| HTTP 237 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 242행, complete/ok |
| HTTP 238 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 243행, complete/ok |
| HTTP 239 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 244행, complete/ok |
| HTTP 240 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 245행, complete/ok |
| HTTP 241 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 246행, complete/ok |
| HTTP 242 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 247행, complete/ok |
| HTTP 243 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 248행, complete/ok |
| HTTP 244 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 249행, complete/ok |
| HTTP 245 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 250행, complete/ok |
| HTTP 246 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 251행, complete/ok |
| HTTP 247 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 252행, complete/ok |
| HTTP 248 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 253행, complete/ok |
| HTTP 249 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 254행, complete/ok |
| HTTP 250 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 255행, complete/ok |
| HTTP 251 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 256행, complete/ok |
| HTTP 252 | GET timeline, status=200, 13ms, 82342B | PASS | 원출력 257행, complete/ok |
| HTTP 253 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 258행, complete/ok |
| HTTP 254 | GET timeline, status=200, 152ms, 82383B | PASS | 원출력 259행, complete/ok |
| HTTP 255 | GET timeline, status=200, 388ms, 72681B | PASS | 원출력 260행, complete/ok |
| HTTP 256 | GET timeline, status=200, 14ms, 82383B | PASS | 원출력 262행, complete/ok |
| HTTP 257 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 263행, complete/ok |
| HTTP 258 | GET timeline, status=200, 14ms, 82383B | PASS | 원출력 264행, complete/ok |
| HTTP 259 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 265행, complete/ok |
| HTTP 260 | GET timeline, status=200, 13ms, 82383B | PASS | 원출력 266행, complete/ok |
| HTTP 261 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 267행, complete/ok |
| HTTP 262 | GET timeline, status=200, 13ms, 82383B | PASS | 원출력 268행, complete/ok |
| HTTP 263 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 269행, complete/ok |
| HTTP 264 | GET timeline, status=200, 13ms, 82383B | PASS | 원출력 270행, complete/ok |
| HTTP 265 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 271행, complete/ok |
| HTTP 266 | GET timeline, status=200, 12ms, 82383B | PASS | 원출력 272행, complete/ok |
| HTTP 267 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 273행, complete/ok |
| HTTP 268 | GET timeline, status=200, 13ms, 82383B | PASS | 원출력 274행, complete/ok |
| HTTP 269 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 275행, complete/ok |
| HTTP 270 | GET timeline, status=200, 13ms, 82383B | PASS | 원출력 276행, complete/ok |
| HTTP 271 | GET timeline, status=200, 13ms, 72681B | PASS | 원출력 277행, complete/ok |
| HTTP 272 | GET timeline, status=200, 13ms, 82383B | PASS | 원출력 278행, complete/ok |
| HTTP 273 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 279행, complete/ok |
| HTTP 274 | GET timeline, status=200, 14ms, 82383B | PASS | 원출력 280행, complete/ok |
| HTTP 275 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 281행, complete/ok |
| HTTP 276 | GET timeline, status=200, 15ms, 82383B | PASS | 원출력 282행, complete/ok |
| HTTP 277 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 283행, complete/ok |
| HTTP 278 | GET timeline, status=200, 14ms, 82383B | PASS | 원출력 284행, complete/ok |
| HTTP 279 | GET timeline, status=200, 14ms, 72681B | PASS | 원출력 285행, complete/ok |
| HTTP 280 | GET timeline, status=200, 742ms, 109901B | PASS | 원출력 286행, complete/ok |
| HTTP 281 | GET timeline, status=200, 18ms, 110970B | PASS | 원출력 287행, complete/ok |
| HTTP 282 | GET timeline, status=200, 2730ms, 85900B | PASS | 원출력 288행, complete/ok |
| HTTP 283 | GET timeline, status=200, 51ms, 79273B | PASS | 원출력 289행, complete/ok |
| HTTP 284 | GET timeline, status=200, 601ms, 121643B | PASS | 원출력 291행, complete/ok |
| HTTP 285 | GET timeline, status=200, 165ms, 121970B | PASS | 원출력 292행, complete/ok |
| HTTP 286 | GET timeline, status=200, 175ms, 87148B | PASS | 원출력 293행, complete/ok |
| HTTP 287 | GET timeline, status=200, 40ms, 82565B | PASS | 원출력 294행, complete/ok |
| HTTP 288 | GET timeline, status=200, 31ms, 82630B | PASS | 원출력 295행, complete/ok |
| HTTP 289 | GET timeline, status=200, 30ms, 66245B | PASS | 원출력 296행, complete/ok |
| 실제 판정 298 | P0-HTTP02 same-reference durable transition observed (not completeness) | PASS | cp-http-actual.log |
| HTTP 290 | GET timeline, status=200, 170ms, 121643B | PASS | 원출력 299행, complete/ok |
| HTTP 291 | GET timeline, status=200, 169ms, 121970B | PASS | 원출력 300행, complete/ok |
| HTTP 292 | GET timeline, status=200, 176ms, 87148B | PASS | 원출력 301행, complete/ok |
| HTTP 293 | GET timeline, status=200, 42ms, 82565B | PASS | 원출력 302행, complete/ok |
| HTTP 294 | GET timeline, status=200, 31ms, 82630B | PASS | 원출력 303행, complete/ok |
| HTTP 295 | GET timeline, status=200, 30ms, 66245B | PASS | 원출력 304행, complete/ok |
| HTTP 296 | GET timeline, status=200, 165ms, 121643B | PASS | 원출력 305행, complete/ok |
| HTTP 297 | GET timeline, status=200, 167ms, 121970B | PASS | 원출력 306행, complete/ok |
| HTTP 298 | GET timeline, status=200, 886ms, 87148B | PASS | 원출력 307행, complete/ok |
| HTTP 299 | GET timeline, status=200, 3786ms, 121962B | PASS | 원출력 308행, complete/ok |
| 실제 판정 309 | P0-HTTP02 all timeline HTTP within unchanged 4000ms | PASS | cp-http-actual.log |
| HTTP 300 | DELETE tap, status=200, 69ms, 26B | PASS | 원출력 311행, complete/ok |
| 실제 판정 312 | S11-CI08 product-1 exit0 ports returned | PASS | cp-http-actual.log |

### HTTP 도구 자체검사 전수

27개·exit0. 최초 모듈 로드 실패는 준비 실패이며, 함수 부재 assertion 이후 구현 GREEN이다.

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| 도구 1 | P0-DIAG01 정상 header/body 시간·안전 route 분류와 비밀 미노출 (0.97325ms) | PASS | cp-http-unit.log |
| 도구 2 | P0-DIAG02 header timeout 고정 진단과 실패 유지 (0.303708ms) | PASS | cp-http-unit.log |
| 도구 3 | P0-DIAG03 body timeout 부분 수신 측정·완료 거부 (0.141916ms) | PASS | cp-http-unit.log |
| 도구 4 | S11-CI01 현행 다섯 단계 순서·실제 child 결과 결박 (0.951833ms) | PASS | cp-http-unit.log |
| 도구 5 | S11-CI04 기존 실제 dispatch 상관 정상·오래된ID·다른조건·복수ID 거부 (0.20775ms) | PASS | cp-http-unit.log |
| 도구 6 | S11-CI02 nonzero 실패 후 나머지 미실행 (0.077334ms) | PASS | cp-http-unit.log |
| 도구 7 | S11-CI02 signal 실패 후 나머지 미실행 (0.059583ms) | PASS | cp-http-unit.log |
| 도구 8 | S11-CI02 output-limit 실패 후 나머지 미실행 (0.062875ms) | PASS | cp-http-unit.log |
| 도구 9 | S11-CI02 summary-missing 실패 후 나머지 미실행 (0.047791ms) | PASS | cp-http-unit.log |
| 도구 10 | S11-CI02 summary-duplicate 실패 후 나머지 미실행 (0.042625ms) | PASS | cp-http-unit.log |
| 도구 11 | S11-CI02 cleanup-failed 실패 후 나머지 미실행 (0.042834ms) | PASS | cp-http-unit.log |
| 도구 12 | S11-CI02 port-missing 실패 후 나머지 미실행 (0.050958ms) | PASS | cp-http-unit.log |
| 도구 13 | S11-CI03 legacy 완료 필드 없음·전체 S11/UI/자원 PASS 분리 (0.561917ms) | PASS | cp-http-unit.log |
| 도구 14 | S11-CI07 기대 출력 수만 있거나 한 기동 관측 누락이면 완료 거부 (0.25025ms) | PASS | cp-http-unit.log |
| 도구 15 | S11-CI05 페이지 전체·unplaced 별도 total·동일file mapping dedup (4.852667ms) | PASS | cp-http-unit.log |
| 도구 16 | S11-CI05 누락·중복item·불안정total·truncated·cap 거부 (0.182ms) | PASS | cp-http-unit.log |
| 도구 17 | S11-CI05 첫출력/partial/다른reference/job/unsafe숫자 거부 (0.141667ms) | PASS | cp-http-unit.log |
| 도구 18 | S11-CI07 정확한 accepted placeholder만 미완료로 분류하고 lineage 모순은 거부 (0.194833ms) | PASS | cp-http-unit.log |
| 도구 19 | S11-CI06 기존ID/hash 보존과 새event/reference/job/output 분리 (0.148875ms) | PASS | cp-http-unit.log |
| 도구 20 | S11-CI05 점 이벤트 equal+padding 허용·역전/빈확장 거부 (0.078041ms) | PASS | cp-http-unit.log |
| 도구 21 | P0-HTTP01 pending은 전이 완료가 아님 (0.702ms) | PASS | cp-http-unit.log |
| 도구 22 | P0-HTTP01 partial은 지연 관측만 가능 (0.074125ms) | PASS | cp-http-unit.log |
| 도구 23 | P0-HTTP01 다른 참조와 모순 파일은 거부 (0.158167ms) | PASS | cp-http-unit.log |
| 도구 24 | P0-HTTP01 원래 완전 출력 검사는 부분 출력 거부 유지 (0.141625ms) | PASS | cp-http-unit.log |
| 도구 25 | P0-STATE01 complete1 count와 기존 two-output 거부 구분 (0.895875ms) | PASS | cp-http-unit.log |
| 도구 26 | P0-STATE02 pending partial complete2 변화와 8개 상한 (0.354458ms) | PASS | cp-http-unit.log |
| 도구 27 | P0-STATE03 raw ID/path/unknown enum/request 비밀 미노출 (0.059167ms) | PASS | cp-http-unit.log |


독자: P0 구현·검토 담당. 수명: 독립 재현과 최적화의 보존 증거. 정책은 AGENTS, 등록 source-of-truth는 중앙 테스트 기록이며 이 문서는 실행 상세다.

## 2번 최종 판정

원출력 전수표는 697행(과거 실행 포함 PASS693/FAIL4)이다. 이는 반복 실행을 포함한 보존 행수이며 독립 테스트 수가 아니다. 기록된 cleanup root14개는 최종 읽기 확인에서도 전부 부재였고 `git diff --check`는 exit0이었다. 최종 제품·fixture·runner fingerprint는 [cp2-fingerprints.log](cp2-fingerprints.log)에 보존한다. 삭제한 임시 diagnostic header는 fingerprint 대상이 아니라 삭제 diff로 확인한다.

checkpoint 중복 검증 제거와 승인된 독립·영향 검증을 완료했다. 전체 앱 복수 출력/재기동/통합 완료는 아니다. #3 대기·시간·완전성 정책과 #4 전체 통합은 변경·실행하지 않았다.

`recording_catalog.cpp`는 원본 semantic replay를 항상 먼저 1회 수행하고 실패 즉시 반환한다. 내부 `recording_checkpoint_validation.h`는 sequence 개수, 실제 schema/type, canonical bytes 전부가 같을 때만 후보 replay/signature를 재사용한다. 다른 후보는 기존 양방향 검증을 유지한다. CommitCheckpoint·잠금 수명·손상/복구/보호 계약은 그대로다. 기존 `recording_derived_job.cpp`의 호출 내 중복 복원/직렬화 제거도 이번 검증에 포함했다. 임시 diagnostic header와 catalog 계측은 최종 제거했다.

CP05 GREEN은 자동 checkpoint 2회 모두 original_replays=1/candidate_replays=0을 직접 관측했다. RED는 candidate_replays=1이었다. 두 번째 original replay2143985μs와 Update3249679μs는 중첩되므로 합산하지 않는다. 과거 burst Update5682680μs와의 동일 fixture 개선 근거이며 보편적 HTTP 지연 보장이 아니다.

CP06 exact-positive RED3/1, orchestration RED7/1, schema/enum 음성 RED4/2를 각각 보존했다. 최종 schema/enum 단위6/0, 기본CP9/0, catalog246/0이다. 최초 archive freshness 오류는 준비 실패/제품 미실행이며 예상 RED가 아니다. dependency 연결·build 후 실제 assertion RED를 확보했다.

기본 CP02는 1MiB를 넘는 두 job 전이·state/파일/hash/예약 회귀다. 자동 발생 trace 검사가 아니며 catalog SC16으로 자동 경계를 별도 확인한다. `--diagnostic-evidence`는 역사적 CP05 전용이다. 최종 제품은 계측이 없어 해당 모드는 FAIL하며 현재 기본 검증 명령이 아니다.

| 변경 이후 증거 | 유효성 | 근거 |
| --- | --- | --- |
| schema/enum 직접 비교 | 단위6·기본CP9·catalog246 최종 재실행 | serialized bytes가 같아도 실제 필드 차이 거부 |
| jobs23/service43/media46/timeline38 | 직전 회귀 유지 | 정상 parser가 schema/type를 제한하므로 해당 분기 결과 불변 |
| validation7 | 유지 | derived_job.cpp 이후 변경 없음, 고정 canonical literal과 명시 성능 예산 통과 |
| carrier EV15/consumer22 | 기존 증거 유지 | 해당 제품/fixture 불변 |
| CP07 checkpoint 내부 invalid 원본 직접 주입 | 미실행 | 공개 경계에서 차단. 원본 replay 선행 코드 리뷰와 실제 catalog/불법 job replay 음성만 근거 |
| 앱 전체 통합/브라우저/장시간 | 미실행 | 승인 범위 밖, 본 결과로 대체하지 않음 |

### 정확 명령·exit

runner는 `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp` 아래 실행했다. CP 자식 HOME/TMPDIR/GST cache는 소유 root 내부로 다시 제한된다. stdout/stderr를 직접 capture했으며 원문 media/canonical payload/비밀은 보존하지 않았다.

| 로그 | 명령 | exit | 개별 PASS/FAIL |
| --- | --- | --- | --- |
| [cp2-catalog.log](cp2-catalog.log) | `bash scripts/internal/verify_v410_recording_catalog.sh` | 0 | 246/0 |
| [cp2-fields-build.log](cp2-fields-build.log) | `./server.sh build` | 0 | 0/0 (assertion 미출력) |
| [cp2-fields-catalog.log](cp2-fields-catalog.log) | `bash scripts/internal/verify_v410_recording_catalog.sh` | 0 | 246/0 |
| [cp2-fields-final.log](cp2-fields-final.log) | `bash scripts/internal/verify_recording_checkpoint_reproduction.sh` | 0 | 9/0 |
| [cp2-fields-green.log](cp2-fields-green.log) | `bash scripts/internal/verify_recording_checkpoint_reproduction.sh --identity-only` | 0 | 6/0 |
| [cp2-fields-red.log](cp2-fields-red.log) | `bash scripts/internal/verify_recording_checkpoint_reproduction.sh --identity-only` | 1 | 4/2 |
| [cp2-final-build.log](cp2-final-build.log) | `./server.sh build` | 0 | 0/0 (assertion 미출력) |
| [cp2-final.log](cp2-final.log) | `bash scripts/internal/verify_recording_checkpoint_reproduction.sh` | 0 | 7/0 |
| [cp2-green-build.log](cp2-green-build.log) | `./server.sh build` | 0 | 0/0 (assertion 미출력) |
| [cp2-identity-assert-red.log](cp2-identity-assert-red.log) | `bash scripts/internal/verify_recording_checkpoint_reproduction.sh --diagnostic-evidence` | 1 | 3/1 |
| [cp2-identity-red.log](cp2-identity-red.log) | `bash scripts/internal/verify_recording_checkpoint_reproduction.sh --diagnostic-evidence` | 1 | 0/0 (assertion 미출력) |
| [cp2-jobs.log](cp2-jobs.log) | `bash scripts/internal/verify_recording_derived_jobs.sh` | 0 | 23/0 |
| [cp2-media.log](cp2-media.log) | `bash scripts/internal/verify_recording_public_media.sh` | 0 | 46/0 |
| [cp2-orchestration-red-build.log](cp2-orchestration-red-build.log) | `./server.sh build` | 0 | 0/0 (assertion 미출력) |
| [cp2-pre-red-build.log](cp2-pre-red-build.log) | `./server.sh build` | 0 | 0/0 (assertion 미출력) |
| [cp2-red-build.log](cp2-red-build.log) | `./server.sh build` | 0 | 0/0 (assertion 미출력) |
| [cp2-replay-green.log](cp2-replay-green.log) | `bash scripts/internal/verify_recording_checkpoint_reproduction.sh --diagnostic-evidence` | 0 | 8/0 |
| [cp2-replay-red.log](cp2-replay-red.log) | `bash scripts/internal/verify_recording_checkpoint_reproduction.sh --diagnostic-evidence` | 1 | 7/1 |
| [cp2-service.log](cp2-service.log) | `bash scripts/internal/verify_recording_derived_job_service.sh` | 0 | 43/0 |
| [cp2-timeline.log](cp2-timeline.log) | `bash scripts/internal/verify_recording_public_timeline.sh` | 0 | 38/0 |
| [cp2-validation.log](cp2-validation.log) | `bash scripts/internal/verify_recording_derived_job_validation.sh --performance-budget` | 0 | 7/0 |

### 개별 원출력 전수 결과

원래 로그 행 번호를 보존했다. 반복 실행은 별도 커버리지 증가로 합산하지 않으며 과거 RED와 최종 실행을 구분한다.

#### cp2-catalog.log

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| cp2-catalog.log:1 | journal open: | PASS | 해당 실행 결과 |
| cp2-catalog.log:2 | fallback catalog open: | PASS | 해당 실행 결과 |
| cp2-catalog.log:3 | SQLite off mode 표시 | PASS | 해당 실행 결과 |
| cp2-catalog.log:4 | segment finalize journal+projection: | PASS | 해당 실행 결과 |
| cp2-catalog.log:5 | fallback range query | PASS | 해당 실행 결과 |
| cp2-catalog.log:6 | event link FK 위반 거부 | PASS | 해당 실행 결과 |
| cp2-catalog.log:7 | FK 위반 transaction/journal 전체 rollback | PASS | 해당 실행 결과 |
| cp2-catalog.log:8 | 최초 durable mutation 1개 | PASS | 해당 실행 결과 |
| cp2-catalog.log:9 | 동일 mutation 중복 append | PASS | 해당 실행 결과 |
| cp2-catalog.log:10 | 손상 사이 정상 durable mutation 보존 | PASS | 해당 실행 결과 |
| cp2-catalog.log:11 | 중간 corrupt line count | PASS | 해당 실행 결과 |
| cp2-catalog.log:12 | 마지막 truncated line skip | PASS | 해당 실행 결과 |
| cp2-catalog.log:13 | fallback replay open | PASS | 해당 실행 결과 |
| cp2-catalog.log:14 | 같은 mutation idempotent replay | PASS | 해당 실행 결과 |
| cp2-catalog.log:15 | 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | PASS | 해당 실행 결과 |
| cp2-catalog.log:16 | 중복 replay row/합계 불증가 | PASS | 해당 실행 결과 |
| cp2-catalog.log:17 | 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구: | PASS | 해당 실행 결과 |
| cp2-catalog.log:18 | writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | PASS | 해당 실행 결과 |
| cp2-catalog.log:19 | v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | PASS | 해당 실행 결과 |
| cp2-catalog.log:20 | SQLite catalog open/rebuild: | PASS | 해당 실행 결과 |
| cp2-catalog.log:21 | SQLite primary mode 표시 | PASS | 해당 실행 결과 |
| cp2-catalog.log:22 | SQLite on/off range query ID·순서 parity | PASS | 해당 실행 결과 |
| cp2-catalog.log:23 | journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | PASS | 해당 실행 결과 |
| cp2-catalog.log:24 | journal 없는 손상 media orphan 구분 | PASS | 해당 실행 결과 |
| cp2-catalog.log:25 | projection failover journal open: | PASS | 해당 실행 결과 |
| cp2-catalog.log:26 | projection failover catalog open: | PASS | 해당 실행 결과 |
| cp2-catalog.log:27 | 실제 SQLite INSERT 실패 trigger 설치 | PASS | 해당 실행 결과 |
| cp2-catalog.log:28 | SQLite 투영 실패 뒤 journal+memory finalize 유지: | PASS | 해당 실행 결과 |
| cp2-catalog.log:29 | SQLite 투영 실패 즉시 JSONL fallback 전환 | PASS | 해당 실행 결과 |
| cp2-catalog.log:30 | 재시작 rebuild 전 실패 trigger 제거 | PASS | 해당 실행 결과 |
| cp2-catalog.log:31 | 투영 실패 직후 in-memory query 정합성 유지 | PASS | 해당 실행 결과 |
| cp2-catalog.log:32 | projection failover 재시작 journal rebuild: | PASS | 해당 실행 결과 |
| cp2-catalog.log:33 | 재시작 후 journal에서 누락 SQLite projection 복구 | PASS | 해당 실행 결과 |
| cp2-catalog.log:34 | 재시작 후 SQLite primary 복귀 | PASS | 해당 실행 결과 |
| cp2-catalog.log:35 | 재시작 journal rebuild가 실제 SQLite row 복원 | PASS | 해당 실행 결과 |
| cp2-catalog.log:36 | tombstone journal open: | PASS | 해당 실행 결과 |
| cp2-catalog.log:37 | tombstone catalog open: | PASS | 해당 실행 결과 |
| cp2-catalog.log:38 | tombstone 대상 segment finalize: | PASS | 해당 실행 결과 |
| cp2-catalog.log:39 | tombstone 대상 deletion request: | PASS | 해당 실행 결과 |
| cp2-catalog.log:40 | tombstone 완료 기록: | PASS | 해당 실행 결과 |
| cp2-catalog.log:41 | catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | PASS | 해당 실행 결과 |
| cp2-catalog.log:42 | 손상 SQLite 격리 후 journal rebuild: | PASS | 해당 실행 결과 |
| cp2-catalog.log:43 | 손상 SQLite 원본 격리 | PASS | 해당 실행 결과 |
| cp2-catalog.log:44 | 격리 SQLite 파일 보존 | PASS | 해당 실행 결과 |
| cp2-catalog.log:45 | 격리 후 journal rebuild 결과 | PASS | 해당 실행 결과 |
| cp2-catalog.log:46 | S10-3A future-schema journal read open | PASS | 해당 실행 결과 |
| cp2-catalog.log:47 | S10-3A future-schema unsupported classification | PASS | 해당 실행 결과 |
| cp2-catalog.log:48 | S10-3A future-schema catalog open denied | PASS | 해당 실행 결과 |
| cp2-catalog.log:49 | S10-3A future-schema catalog retry denied | PASS | 해당 실행 결과 |
| cp2-catalog.log:50 | S10-3A future-schema journal bytes preserved | PASS | 해당 실행 결과 |
| cp2-catalog.log:51 | S10-3A future-schema SQLite bytes preserved | PASS | 해당 실행 결과 |
| cp2-catalog.log:52 | S10-3A future-schema writer cleanup untouched | PASS | 해당 실행 결과 |
| cp2-catalog.log:53 | S10-3A arbitrary-schema journal read open | PASS | 해당 실행 결과 |
| cp2-catalog.log:54 | S10-3A arbitrary-schema unsupported classification | PASS | 해당 실행 결과 |
| cp2-catalog.log:55 | S10-3A arbitrary-schema catalog open denied | PASS | 해당 실행 결과 |
| cp2-catalog.log:56 | S10-3A arbitrary-schema catalog retry denied | PASS | 해당 실행 결과 |
| cp2-catalog.log:57 | S10-3A arbitrary-schema journal bytes preserved | PASS | 해당 실행 결과 |
| cp2-catalog.log:58 | S10-3A arbitrary-schema SQLite bytes preserved | PASS | 해당 실행 결과 |
| cp2-catalog.log:59 | S10-3A arbitrary-schema writer cleanup untouched | PASS | 해당 실행 결과 |
| cp2-catalog.log:60 | S10-3A empty-schema journal read open | PASS | 해당 실행 결과 |
| cp2-catalog.log:61 | S10-3A empty-schema unsupported classification | PASS | 해당 실행 결과 |
| cp2-catalog.log:62 | S10-3A empty-schema catalog open denied | PASS | 해당 실행 결과 |
| cp2-catalog.log:63 | S10-3A empty-schema catalog retry denied | PASS | 해당 실행 결과 |
| cp2-catalog.log:64 | S10-3A empty-schema journal bytes preserved | PASS | 해당 실행 결과 |
| cp2-catalog.log:65 | S10-3A empty-schema SQLite bytes preserved | PASS | 해당 실행 결과 |
| cp2-catalog.log:66 | S10-3A empty-schema writer cleanup untouched | PASS | 해당 실행 결과 |
| cp2-catalog.log:67 | S10-3A future-type journal read open | PASS | 해당 실행 결과 |
| cp2-catalog.log:68 | S10-3A future-type unsupported classification | PASS | 해당 실행 결과 |
| cp2-catalog.log:69 | S10-3A future-type catalog open denied | PASS | 해당 실행 결과 |
| cp2-catalog.log:70 | S10-3A future-type catalog retry denied | PASS | 해당 실행 결과 |
| cp2-catalog.log:71 | S10-3A future-type journal bytes preserved | PASS | 해당 실행 결과 |
| cp2-catalog.log:72 | S10-3A future-type SQLite bytes preserved | PASS | 해당 실행 결과 |
| cp2-catalog.log:73 | S10-3A future-type writer cleanup untouched | PASS | 해당 실행 결과 |
| cp2-catalog.log:74 | S10-3A malformed journal open | PASS | 해당 실행 결과 |
| cp2-catalog.log:75 | S10-3A malformed JSON missing fields and wrong types remain corrupt | PASS | 해당 실행 결과 |
| cp2-catalog.log:76 | S10-O01 reservation journal open | PASS | 해당 실행 결과 |
| cp2-catalog.log:77 | S10-O01 first reservation returns four IDs and sequence one | PASS | 해당 실행 결과 |
| cp2-catalog.log:78 | S10-O01 versioned reservation payload replays | PASS | 해당 실행 결과 |
| cp2-catalog.log:79 | S10-O01 new reservation records actual occurred time | PASS | 해당 실행 결과 |
| cp2-catalog.log:80 | S10-O02 identical retry preserves sequence and bytes | PASS | 해당 실행 결과 |
| cp2-catalog.log:81 | S10-O03 reopened instance allocates next sequence | PASS | 해당 실행 결과 |
| cp2-catalog.log:82 | S10-O03 new process resumes durable sequence | PASS | 해당 실행 결과 |
| cp2-catalog.log:83 | S10-O04 different store rejected | PASS | 해당 실행 결과 |
| cp2-catalog.log:84 | S10-O04 reused request with different segment rejected | PASS | 해당 실행 결과 |
| cp2-catalog.log:85 | S10-O04 reused request with different channel rejected | PASS | 해당 실행 결과 |
| cp2-catalog.log:86 | S10-O04 reused segment with different request rejected | PASS | 해당 실행 결과 |
| cp2-catalog.log:87 | S10-O04 conflicts preserve original bytes | PASS | 해당 실행 결과 |
| cp2-catalog.log:88 | S10-O05/O06 reject and preserve corrupt | PASS | 해당 실행 결과 |
| cp2-catalog.log:89 | S10-O05/O06 reject and preserve unsupported-schema | PASS | 해당 실행 결과 |
| cp2-catalog.log:90 | S10-O05/O06 reject and preserve unsupported-type | PASS | 해당 실행 결과 |
| cp2-catalog.log:91 | S10-O05/O06 reject and preserve tail | PASS | 해당 실행 결과 |
| cp2-catalog.log:92 | S10-O05/O06 reject and preserve payload-zero | PASS | 해당 실행 결과 |
| cp2-catalog.log:93 | S10-O05/O06 reject and preserve payload-negative | PASS | 해당 실행 결과 |
| cp2-catalog.log:94 | S10-O05/O06 reject and preserve payload-fraction | PASS | 해당 실행 결과 |
| cp2-catalog.log:95 | S10-O05/O06 reject and preserve payload-overflow | PASS | 해당 실행 결과 |
| cp2-catalog.log:96 | S10-O05/O06 reject and preserve duplicate-sequence | PASS | 해당 실행 결과 |
| cp2-catalog.log:97 | S10-O05/O06 reject and preserve decreasing-sequence | PASS | 해당 실행 결과 |
| cp2-catalog.log:98 | S10-O05/O06 reject and preserve duplicate-request | PASS | 해당 실행 결과 |
| cp2-catalog.log:99 | S10-O05/O06 reject and preserve duplicate-segment | PASS | 해당 실행 결과 |
| cp2-catalog.log:100 | S10-O05/O06 reject and preserve store-conflict | PASS | 해당 실행 결과 |
| cp2-catalog.log:101 | S10-O05/O06 reject and preserve ordinary-before | PASS | 해당 실행 결과 |
| cp2-catalog.log:102 | S10-O05/O06 reject and preserve ordinary-after | PASS | 해당 실행 결과 |
| cp2-catalog.log:103 | S10-O05/O06 reject and preserve line-cap | PASS | 해당 실행 결과 |
| cp2-catalog.log:104 | S10-O05 reservation entity envelope binding rejects mismatch | PASS | 해당 실행 결과 |
| cp2-catalog.log:105 | S10-O05 reservation request envelope binding rejects mismatch | PASS | 해당 실행 결과 |
| cp2-catalog.log:106 | S10-O01 strict reservation parser accepts versioned literal | PASS | 해당 실행 결과 |
| cp2-catalog.log:107 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | PASS | 해당 실행 결과 |
| cp2-catalog.log:108 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | PASS | 해당 실행 결과 |
| cp2-catalog.log:109 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | PASS | 해당 실행 결과 |
| cp2-catalog.log:110 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | PASS | 해당 실행 결과 |
| cp2-catalog.log:111 | S10-O06 INT64_MAX identical retry remains valid | PASS | 해당 실행 결과 |
| cp2-catalog.log:112 | S10-O06 sequence overflow rejected without write | PASS | 해당 실행 결과 |
| cp2-catalog.log:113 | S10-O02 identical durable reservation duplicates remain idempotent | PASS | 해당 실행 결과 |
| cp2-catalog.log:114 | S10-O06 sequence gaps remain valid and allocate above maximum | PASS | 해당 실행 결과 |
| cp2-catalog.log:115 | S10-O07 four simultaneous processes finish reservations | PASS | 해당 실행 결과 |
| cp2-catalog.log:116 | S10-O07 concurrent sequences are unique and complete | PASS | 해당 실행 결과 |
| cp2-catalog.log:117 | S10-O07 next sequence follows concurrent reservations | PASS | 해당 실행 결과 |
| cp2-catalog.log:118 | S10-O08 ordinary Append cannot reserve orders | PASS | 해당 실행 결과 |
| cp2-catalog.log:119 | S10-O08 unopened journal rejected | PASS | 해당 실행 결과 |
| cp2-catalog.log:120 | S10-O08 null result rejected | PASS | 해당 실행 결과 |
| cp2-catalog.log:121 | S10-O08 invalid opaque ID rejected | PASS | 해당 실행 결과 |
| cp2-catalog.log:122 | S10-O08 failed reservation does not expose tentative result | PASS | 해당 실행 결과 |
| cp2-catalog.log:123 | S10-O09 unsafe file binding rejected and original preserved inode | PASS | 해당 실행 결과 |
| cp2-catalog.log:124 | S10-O09 unsafe file binding rejected and original preserved parent | PASS | 해당 실행 결과 |
| cp2-catalog.log:125 | S10-O09 unsafe file binding rejected and original preserved symlink | PASS | 해당 실행 결과 |
| cp2-catalog.log:126 | S10-O09 unsafe file binding rejected and original preserved hardlink | PASS | 해당 실행 결과 |
| cp2-catalog.log:127 | S10-O10 reservation and normal segment coexist in catalog | PASS | 해당 실행 결과 |
| cp2-catalog.log:128 | S10-O04 reserve then finalize permits identical retry | PASS | 해당 실행 결과 |
| cp2-catalog.log:129 | S10-O10 reservation survives catalog rebuild without changing segment query | PASS | 해당 실행 결과 |
| cp2-catalog.log:130 | S10-O04 legacy segment cannot acquire retroactive reservation | PASS | 해당 실행 결과 |
| cp2-catalog.log:131 | S10-M06 opened catalog accepts fresh exact reservation V2 finalize | PASS | 해당 실행 결과 |
| cp2-catalog.log:132 | S10-M07 V2 find preserves complete metadata | PASS | 해당 실행 결과 |
| cp2-catalog.log:133 | S10-M07 identical V2 recovery is idempotent | PASS | 해당 실행 결과 |
| cp2-catalog.log:134 | S10-M07 V2 is absent from V1 range query | PASS | 해당 실행 결과 |
| cp2-catalog.log:135 | S10-M07 V2 registered path is not orphan | PASS | 해당 실행 결과 |
| cp2-catalog.log:136 | S10-M07 SQLite exact V2 JSON and path match | PASS | 해당 실행 결과 |
| cp2-catalog.log:137 | S10-M07 JSONL restart preserves V2 exact payload | PASS | 해당 실행 결과 |
| cp2-catalog.log:138 | S10-M06 wrong reservation tuple rejected store | PASS | 해당 실행 결과 |
| cp2-catalog.log:139 | S10-M06 wrong reservation tuple rejected request | PASS | 해당 실행 결과 |
| cp2-catalog.log:140 | S10-M06 wrong reservation tuple rejected segment | PASS | 해당 실행 결과 |
| cp2-catalog.log:141 | S10-M06 wrong reservation tuple rejected channel | PASS | 해당 실행 결과 |
| cp2-catalog.log:142 | S10-M06 wrong reservation tuple rejected sequence | PASS | 해당 실행 결과 |
| cp2-catalog.log:143 | S10-M09 immutable V2 mapping mismatch rejected | PASS | 해당 실행 결과 |
| cp2-catalog.log:144 | S10-M09 bad V2 startup retry preserves original state bad-payload | PASS | 해당 실행 결과 |
| cp2-catalog.log:145 | S10-M09 bad V2 startup retry preserves original state missing-order | PASS | 해당 실행 결과 |
| cp2-catalog.log:146 | S10-M09 bad V2 startup retry preserves original state bad-order | PASS | 해당 실행 결과 |
| cp2-catalog.log:147 | S10-M09 bad V2 startup retry preserves original state conflicting-order | PASS | 해당 실행 결과 |
| cp2-catalog.log:148 | S10-M09 bad V2 startup retry preserves original state tail | PASS | 해당 실행 결과 |
| cp2-catalog.log:149 | S10-M09 bad V2 startup retry preserves original state corrupt | PASS | 해당 실행 결과 |
| cp2-catalog.log:150 | S10-M09 bad V2 startup retry preserves original state unsafe-path | PASS | 해당 실행 결과 |
| cp2-catalog.log:151 | S10-M09 default off rejects V2 before SQLite changes | PASS | 해당 실행 결과 |
| cp2-catalog.log:152 | S10-M09 V2 replay namespace and deletion duplicate | PASS | 해당 실행 결과 |
| cp2-catalog.log:153 | S10-M09 V2 replay namespace and deletion deleted | PASS | 해당 실행 결과 |
| cp2-catalog.log:154 | S10-M09 V2 replay namespace and deletion v1-before | PASS | 해당 실행 결과 |
| cp2-catalog.log:155 | S10-M09 V2 replay namespace and deletion v1-after | PASS | 해당 실행 결과 |
| cp2-catalog.log:156 | S10-M09 V2 replay namespace and deletion deleted-before | PASS | 해당 실행 결과 |
| cp2-catalog.log:157 | S10-M09 V2 replay namespace and deletion resurrection | PASS | 해당 실행 결과 |
| cp2-catalog.log:158 | S10-M09 V2 replay namespace and deletion mutation-collision | PASS | 해당 실행 결과 |
| cp2-catalog.log:159 | S10-M09 V2 finalize rejects missing media | PASS | 해당 실행 결과 |
| cp2-catalog.log:160 | S10-M09 V2 finalize rejects directory media | PASS | 해당 실행 결과 |
| cp2-catalog.log:161 | S10-M09 fresh candidate rejects mapping | PASS | 해당 실행 결과 |
| cp2-catalog.log:162 | S10-M09 fresh candidate rejects path | PASS | 해당 실행 결과 |
| cp2-catalog.log:163 | S10-M09 fresh candidate rejects tombstone | PASS | 해당 실행 결과 |
| cp2-catalog.log:164 | S10-SW01 managed empty root opens with lifetime lease | PASS | 해당 실행 결과 |
| cp2-catalog.log:165 | S10-SW02 same process second managed owner denied | PASS | 해당 실행 결과 |
| cp2-catalog.log:166 | S10-SW03 different process owner and inherited use denied | PASS | 해당 실행 결과 |
| cp2-catalog.log:167 | S10-SW12 managed duplicate descriptors are close-on-exec | PASS | 해당 실행 결과 |
| cp2-catalog.log:168 | S10-SW05 managed reserve append replay use owned descriptor | PASS | 해당 실행 결과 |
| cp2-catalog.log:169 | S10-SW06 raw managed access and legacy default path denied | PASS | 해당 실행 결과 |
| cp2-catalog.log:170 | S10-SW01 managed Reserve rejects different store identity | PASS | 해당 실행 결과 |
| cp2-catalog.log:171 | S10-SW10 catalog connection can inspect managed lease | PASS | 해당 실행 결과 |
| cp2-catalog.log:172 | S10-SW04 owner destruction releases lease | PASS | 해당 실행 결과 |
| cp2-catalog.log:173 | S10-SW01 managed reopen rejects different store identity | PASS | 해당 실행 결과 |
| cp2-catalog.log:174 | S10-SW11 managed incomplete tail rejects append without changing bytes | PASS | 해당 실행 결과 |
| cp2-catalog.log:175 | S10-SW07 legacy nonempty root preserved without conversion | PASS | 해당 실행 결과 |
| cp2-catalog.log:176 | S10-SW08 partial initialization retry validates exact state lease | PASS | 해당 실행 결과 |
| cp2-catalog.log:177 | S10-SW08 partial initialization retry validates exact state init | PASS | 해당 실행 결과 |
| cp2-catalog.log:178 | S10-SW08 partial initialization retry validates exact state barrier | PASS | 해당 실행 결과 |
| cp2-catalog.log:179 | S10-SW08 partial initialization retry validates exact state journal | PASS | 해당 실행 결과 |
| cp2-catalog.log:180 | S10-SW08 partial initialization retry validates exact state incomplete | PASS | 해당 실행 결과 |
| cp2-catalog.log:181 | S10-SW08 partial initialization retry validates exact state unknown | PASS | 해당 실행 결과 |
| cp2-catalog.log:182 | S10-SW09 symlink inode and malformed marker rejected journal | PASS | 해당 실행 결과 |
| cp2-catalog.log:183 | S10-SW09 symlink inode and malformed marker rejected marker | PASS | 해당 실행 결과 |
| cp2-catalog.log:184 | S10-SW09 symlink inode and malformed marker rejected barrier | PASS | 해당 실행 결과 |
| cp2-catalog.log:185 | S10-SW09 symlink inode and malformed marker rejected root-symlink | PASS | 해당 실행 결과 |
| cp2-catalog.log:186 | S10-SB01 second managed catalog is denied | PASS | 해당 실행 결과 |
| cp2-catalog.log:187 | S10-SB02 failed catalog cannot mutate journal or holds | PASS | 해당 실행 결과 |
| cp2-catalog.log:188 | S10-SB03 attached catalog blocks unowned append but permits reservation | PASS | 해당 실행 결과 |
| cp2-catalog.log:189 | S10-SB04 catalog destruction releases attachment | PASS | 해당 실행 결과 |
| cp2-catalog.log:190 | S10-SB05 managed catalog rejects unsafe options outside | PASS | 해당 실행 결과 |
| cp2-catalog.log:191 | S10-SB05 managed catalog rejects unsafe options dotdot | PASS | 해당 실행 결과 |
| cp2-catalog.log:192 | S10-SB05 managed catalog rejects unsafe options media-symlink | PASS | 해당 실행 결과 |
| cp2-catalog.log:193 | S10-SB05 managed catalog rejects unsafe options sqlite-symlink | PASS | 해당 실행 결과 |
| cp2-catalog.log:194 | S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | PASS | 해당 실행 결과 |
| cp2-catalog.log:195 | S10-SB05 managed catalog rejects unsafe options disabled | PASS | 해당 실행 결과 |
| cp2-catalog.log:196 | S10-SB06 failed open releases catalog attachment | PASS | 해당 실행 결과 |
| cp2-catalog.log:197 | S10-SB07 managed SQLite sidecar rejected -wal symlink | PASS | 해당 실행 결과 |
| cp2-catalog.log:198 | S10-SB07 managed SQLite sidecar rejected -wal hardlink | PASS | 해당 실행 결과 |
| cp2-catalog.log:199 | S10-SB07 managed SQLite sidecar rejected -shm symlink | PASS | 해당 실행 결과 |
| cp2-catalog.log:200 | S10-SB07 managed SQLite sidecar rejected -shm hardlink | PASS | 해당 실행 결과 |
| cp2-catalog.log:201 | S10-SB07 managed SQLite sidecar rejected -journal symlink | PASS | 해당 실행 결과 |
| cp2-catalog.log:202 | S10-SB07 managed SQLite sidecar rejected -journal hardlink | PASS | 해당 실행 결과 |
| cp2-catalog.log:203 | S10-SC01 managed repeated event fixture is valid | PASS | 해당 실행 결과 |
| cp2-catalog.log:204 | S10-SC02 managed reservations avoid history reads | PASS | 해당 실행 결과 |
| cp2-catalog.log:205 | S10-SC03 managed V2 finalize avoids full replay | PASS | 해당 실행 결과 |
| cp2-catalog.log:206 | S10-SC04 checkpoint reduces superseded event payload bytes | PASS | 해당 실행 결과 |
| cp2-catalog.log:207 | S10-SC05 checkpoint preserves latest event and all record identities | PASS | 해당 실행 결과 |
| cp2-catalog.log:208 | S10-SC06 checkpoint is idempotent and preserves V2 | PASS | 해당 실행 결과 |
| cp2-catalog.log:209 | S10-SC08 receipt preserves retry identity and rejects direct append | PASS | 해당 실행 결과 |
| cp2-catalog.log:210 | S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | PASS | 해당 실행 결과 |
| cp2-catalog.log:211 | S10-SC09 managed checkpoint SQL V2 payload and path | PASS | 해당 실행 결과 |
| cp2-catalog.log:212 | S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | PASS | 해당 실행 결과 |
| cp2-catalog.log:213 | S10-SC10 checkpoint prefix recovers before writes | PASS | 해당 실행 결과 |
| cp2-catalog.log:214 | S10-SC11 checkpoint mismatch preserves bytes and poisons owner | PASS | 해당 실행 결과 |
| cp2-catalog.log:215 | S10-SC12 first accepted mutation controls latest event | PASS | 해당 실행 결과 |
| cp2-catalog.log:216 | S10-SC16 automatic checkpoint uses accumulated growth | PASS | 해당 실행 결과 |
| cp2-catalog.log:217 | S10-SC07 raw checkpoint is rejected | PASS | 해당 실행 결과 |
| cp2-catalog.log:218 | S10-SC18 checkpoint syscall failure poisons and reopens write | PASS | 해당 실행 결과 |
| cp2-catalog.log:219 | S10-SC21 poison rejects hold mutation write | PASS | 해당 실행 결과 |
| cp2-catalog.log:220 | S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | PASS | 해당 실행 결과 |
| cp2-catalog.log:221 | S10-SC21 poison rejects hold mutation file-fsync | PASS | 해당 실행 결과 |
| cp2-catalog.log:222 | S10-SC18 checkpoint syscall failure poisons and reopens rename | PASS | 해당 실행 결과 |
| cp2-catalog.log:223 | S10-SC21 poison rejects hold mutation rename | PASS | 해당 실행 결과 |
| cp2-catalog.log:224 | S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | PASS | 해당 실행 결과 |
| cp2-catalog.log:225 | S10-SC21 poison rejects hold mutation dir-fsync | PASS | 해당 실행 결과 |
| cp2-catalog.log:226 | S10-SC17 checkpoint preserves holds observations and deletion | PASS | 해당 실행 결과 |
| cp2-catalog.log:227 | S10-SC17 checkpoint SQL hold observation tombstone | PASS | 해당 실행 결과 |
| cp2-catalog.log:228 | S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | PASS | 해당 실행 결과 |
| cp2-catalog.log:229 | S10-SC17 checkpoint SQL restart observation tombstone | PASS | 해당 실행 결과 |
| cp2-catalog.log:230 | S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | PASS | 해당 실행 결과 |
| cp2-catalog.log:231 | S10-SC19 invalid managed history remains unchanged malformed | PASS | 해당 실행 결과 |
| cp2-catalog.log:232 | S10-SC19 invalid managed history remains unchanged unsupported | PASS | 해당 실행 결과 |
| cp2-catalog.log:233 | S10-SC19 invalid managed history remains unchanged conflict | PASS | 해당 실행 결과 |
| cp2-catalog.log:234 | S10-SC20 raw catalog rejects receipt before side effects | PASS | 해당 실행 결과 |
| cp2-catalog.log:236 | S10-SC13 crypto off raw remains usable | PASS | 해당 실행 결과 |
| cp2-catalog.log:237 | S10-SC14 crypto off checkpoint is rejected | PASS | 해당 실행 결과 |
| cp2-catalog.log:238 | S10-SC15 crypto off receipt reopen is rejected | PASS | 해당 실행 결과 |
| cp2-catalog.log:239 | source 저장 callback reconcile 연결 | PASS | 해당 실행 결과 |
| cp2-catalog.log:240 | policy revision idempotency | PASS | 해당 실행 결과 |
| cp2-catalog.log:241 | 5초 safety reconcile | PASS | 해당 실행 결과 |
| cp2-catalog.log:242 | composition root 관리 저장소 선행 open | PASS | 해당 실행 결과 |
| cp2-catalog.log:243 | composition helper journal 다음 catalog rebuild/open | PASS | 해당 실행 결과 |
| cp2-catalog.log:244 | 서버 전 supervisor 시작 | PASS | 해당 실행 결과 |
| cp2-catalog.log:245 | ingress 전 event bridge 등록 | PASS | 해당 실행 결과 |
| cp2-catalog.log:246 | ingress 종료 뒤 recorder finalize | PASS | 해당 실행 결과 |
| cp2-catalog.log:247 | composition root 시작/종료 순서 | PASS | 해당 실행 결과 |

#### cp2-fields-catalog.log

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| cp2-fields-catalog.log:1 | journal open: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:2 | fallback catalog open: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:3 | SQLite off mode 표시 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:4 | segment finalize journal+projection: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:5 | fallback range query | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:6 | event link FK 위반 거부 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:7 | FK 위반 transaction/journal 전체 rollback | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:8 | 최초 durable mutation 1개 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:9 | 동일 mutation 중복 append | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:10 | 손상 사이 정상 durable mutation 보존 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:11 | 중간 corrupt line count | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:12 | 마지막 truncated line skip | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:13 | fallback replay open | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:14 | 같은 mutation idempotent replay | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:15 | 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:16 | 중복 replay row/합계 불증가 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:17 | 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:18 | writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:19 | v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:20 | SQLite catalog open/rebuild: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:21 | SQLite primary mode 표시 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:22 | SQLite on/off range query ID·순서 parity | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:23 | journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:24 | journal 없는 손상 media orphan 구분 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:25 | projection failover journal open: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:26 | projection failover catalog open: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:27 | 실제 SQLite INSERT 실패 trigger 설치 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:28 | SQLite 투영 실패 뒤 journal+memory finalize 유지: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:29 | SQLite 투영 실패 즉시 JSONL fallback 전환 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:30 | 재시작 rebuild 전 실패 trigger 제거 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:31 | 투영 실패 직후 in-memory query 정합성 유지 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:32 | projection failover 재시작 journal rebuild: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:33 | 재시작 후 journal에서 누락 SQLite projection 복구 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:34 | 재시작 후 SQLite primary 복귀 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:35 | 재시작 journal rebuild가 실제 SQLite row 복원 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:36 | tombstone journal open: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:37 | tombstone catalog open: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:38 | tombstone 대상 segment finalize: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:39 | tombstone 대상 deletion request: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:40 | tombstone 완료 기록: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:41 | catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:42 | 손상 SQLite 격리 후 journal rebuild: | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:43 | 손상 SQLite 원본 격리 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:44 | 격리 SQLite 파일 보존 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:45 | 격리 후 journal rebuild 결과 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:46 | S10-3A future-schema journal read open | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:47 | S10-3A future-schema unsupported classification | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:48 | S10-3A future-schema catalog open denied | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:49 | S10-3A future-schema catalog retry denied | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:50 | S10-3A future-schema journal bytes preserved | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:51 | S10-3A future-schema SQLite bytes preserved | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:52 | S10-3A future-schema writer cleanup untouched | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:53 | S10-3A arbitrary-schema journal read open | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:54 | S10-3A arbitrary-schema unsupported classification | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:55 | S10-3A arbitrary-schema catalog open denied | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:56 | S10-3A arbitrary-schema catalog retry denied | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:57 | S10-3A arbitrary-schema journal bytes preserved | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:58 | S10-3A arbitrary-schema SQLite bytes preserved | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:59 | S10-3A arbitrary-schema writer cleanup untouched | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:60 | S10-3A empty-schema journal read open | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:61 | S10-3A empty-schema unsupported classification | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:62 | S10-3A empty-schema catalog open denied | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:63 | S10-3A empty-schema catalog retry denied | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:64 | S10-3A empty-schema journal bytes preserved | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:65 | S10-3A empty-schema SQLite bytes preserved | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:66 | S10-3A empty-schema writer cleanup untouched | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:67 | S10-3A future-type journal read open | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:68 | S10-3A future-type unsupported classification | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:69 | S10-3A future-type catalog open denied | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:70 | S10-3A future-type catalog retry denied | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:71 | S10-3A future-type journal bytes preserved | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:72 | S10-3A future-type SQLite bytes preserved | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:73 | S10-3A future-type writer cleanup untouched | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:74 | S10-3A malformed journal open | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:75 | S10-3A malformed JSON missing fields and wrong types remain corrupt | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:76 | S10-O01 reservation journal open | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:77 | S10-O01 first reservation returns four IDs and sequence one | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:78 | S10-O01 versioned reservation payload replays | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:79 | S10-O01 new reservation records actual occurred time | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:80 | S10-O02 identical retry preserves sequence and bytes | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:81 | S10-O03 reopened instance allocates next sequence | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:82 | S10-O03 new process resumes durable sequence | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:83 | S10-O04 different store rejected | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:84 | S10-O04 reused request with different segment rejected | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:85 | S10-O04 reused request with different channel rejected | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:86 | S10-O04 reused segment with different request rejected | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:87 | S10-O04 conflicts preserve original bytes | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:88 | S10-O05/O06 reject and preserve corrupt | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:89 | S10-O05/O06 reject and preserve unsupported-schema | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:90 | S10-O05/O06 reject and preserve unsupported-type | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:91 | S10-O05/O06 reject and preserve tail | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:92 | S10-O05/O06 reject and preserve payload-zero | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:93 | S10-O05/O06 reject and preserve payload-negative | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:94 | S10-O05/O06 reject and preserve payload-fraction | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:95 | S10-O05/O06 reject and preserve payload-overflow | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:96 | S10-O05/O06 reject and preserve duplicate-sequence | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:97 | S10-O05/O06 reject and preserve decreasing-sequence | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:98 | S10-O05/O06 reject and preserve duplicate-request | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:99 | S10-O05/O06 reject and preserve duplicate-segment | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:100 | S10-O05/O06 reject and preserve store-conflict | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:101 | S10-O05/O06 reject and preserve ordinary-before | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:102 | S10-O05/O06 reject and preserve ordinary-after | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:103 | S10-O05/O06 reject and preserve line-cap | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:104 | S10-O05 reservation entity envelope binding rejects mismatch | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:105 | S10-O05 reservation request envelope binding rejects mismatch | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:106 | S10-O01 strict reservation parser accepts versioned literal | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:107 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:108 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:109 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:110 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:111 | S10-O06 INT64_MAX identical retry remains valid | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:112 | S10-O06 sequence overflow rejected without write | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:113 | S10-O02 identical durable reservation duplicates remain idempotent | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:114 | S10-O06 sequence gaps remain valid and allocate above maximum | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:115 | S10-O07 four simultaneous processes finish reservations | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:116 | S10-O07 concurrent sequences are unique and complete | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:117 | S10-O07 next sequence follows concurrent reservations | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:118 | S10-O08 ordinary Append cannot reserve orders | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:119 | S10-O08 unopened journal rejected | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:120 | S10-O08 null result rejected | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:121 | S10-O08 invalid opaque ID rejected | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:122 | S10-O08 failed reservation does not expose tentative result | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:123 | S10-O09 unsafe file binding rejected and original preserved inode | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:124 | S10-O09 unsafe file binding rejected and original preserved parent | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:125 | S10-O09 unsafe file binding rejected and original preserved symlink | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:126 | S10-O09 unsafe file binding rejected and original preserved hardlink | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:127 | S10-O10 reservation and normal segment coexist in catalog | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:128 | S10-O04 reserve then finalize permits identical retry | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:129 | S10-O10 reservation survives catalog rebuild without changing segment query | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:130 | S10-O04 legacy segment cannot acquire retroactive reservation | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:131 | S10-M06 opened catalog accepts fresh exact reservation V2 finalize | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:132 | S10-M07 V2 find preserves complete metadata | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:133 | S10-M07 identical V2 recovery is idempotent | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:134 | S10-M07 V2 is absent from V1 range query | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:135 | S10-M07 V2 registered path is not orphan | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:136 | S10-M07 SQLite exact V2 JSON and path match | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:137 | S10-M07 JSONL restart preserves V2 exact payload | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:138 | S10-M06 wrong reservation tuple rejected store | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:139 | S10-M06 wrong reservation tuple rejected request | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:140 | S10-M06 wrong reservation tuple rejected segment | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:141 | S10-M06 wrong reservation tuple rejected channel | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:142 | S10-M06 wrong reservation tuple rejected sequence | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:143 | S10-M09 immutable V2 mapping mismatch rejected | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:144 | S10-M09 bad V2 startup retry preserves original state bad-payload | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:145 | S10-M09 bad V2 startup retry preserves original state missing-order | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:146 | S10-M09 bad V2 startup retry preserves original state bad-order | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:147 | S10-M09 bad V2 startup retry preserves original state conflicting-order | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:148 | S10-M09 bad V2 startup retry preserves original state tail | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:149 | S10-M09 bad V2 startup retry preserves original state corrupt | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:150 | S10-M09 bad V2 startup retry preserves original state unsafe-path | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:151 | S10-M09 default off rejects V2 before SQLite changes | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:152 | S10-M09 V2 replay namespace and deletion duplicate | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:153 | S10-M09 V2 replay namespace and deletion deleted | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:154 | S10-M09 V2 replay namespace and deletion v1-before | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:155 | S10-M09 V2 replay namespace and deletion v1-after | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:156 | S10-M09 V2 replay namespace and deletion deleted-before | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:157 | S10-M09 V2 replay namespace and deletion resurrection | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:158 | S10-M09 V2 replay namespace and deletion mutation-collision | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:159 | S10-M09 V2 finalize rejects missing media | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:160 | S10-M09 V2 finalize rejects directory media | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:161 | S10-M09 fresh candidate rejects mapping | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:162 | S10-M09 fresh candidate rejects path | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:163 | S10-M09 fresh candidate rejects tombstone | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:164 | S10-SW01 managed empty root opens with lifetime lease | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:165 | S10-SW02 same process second managed owner denied | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:166 | S10-SW03 different process owner and inherited use denied | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:167 | S10-SW12 managed duplicate descriptors are close-on-exec | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:168 | S10-SW05 managed reserve append replay use owned descriptor | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:169 | S10-SW06 raw managed access and legacy default path denied | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:170 | S10-SW01 managed Reserve rejects different store identity | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:171 | S10-SW10 catalog connection can inspect managed lease | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:172 | S10-SW04 owner destruction releases lease | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:173 | S10-SW01 managed reopen rejects different store identity | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:174 | S10-SW11 managed incomplete tail rejects append without changing bytes | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:175 | S10-SW07 legacy nonempty root preserved without conversion | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:176 | S10-SW08 partial initialization retry validates exact state lease | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:177 | S10-SW08 partial initialization retry validates exact state init | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:178 | S10-SW08 partial initialization retry validates exact state barrier | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:179 | S10-SW08 partial initialization retry validates exact state journal | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:180 | S10-SW08 partial initialization retry validates exact state incomplete | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:181 | S10-SW08 partial initialization retry validates exact state unknown | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:182 | S10-SW09 symlink inode and malformed marker rejected journal | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:183 | S10-SW09 symlink inode and malformed marker rejected marker | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:184 | S10-SW09 symlink inode and malformed marker rejected barrier | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:185 | S10-SW09 symlink inode and malformed marker rejected root-symlink | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:186 | S10-SB01 second managed catalog is denied | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:187 | S10-SB02 failed catalog cannot mutate journal or holds | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:188 | S10-SB03 attached catalog blocks unowned append but permits reservation | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:189 | S10-SB04 catalog destruction releases attachment | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:190 | S10-SB05 managed catalog rejects unsafe options outside | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:191 | S10-SB05 managed catalog rejects unsafe options dotdot | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:192 | S10-SB05 managed catalog rejects unsafe options media-symlink | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:193 | S10-SB05 managed catalog rejects unsafe options sqlite-symlink | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:194 | S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:195 | S10-SB05 managed catalog rejects unsafe options disabled | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:196 | S10-SB06 failed open releases catalog attachment | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:197 | S10-SB07 managed SQLite sidecar rejected -wal symlink | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:198 | S10-SB07 managed SQLite sidecar rejected -wal hardlink | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:199 | S10-SB07 managed SQLite sidecar rejected -shm symlink | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:200 | S10-SB07 managed SQLite sidecar rejected -shm hardlink | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:201 | S10-SB07 managed SQLite sidecar rejected -journal symlink | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:202 | S10-SB07 managed SQLite sidecar rejected -journal hardlink | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:203 | S10-SC01 managed repeated event fixture is valid | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:204 | S10-SC02 managed reservations avoid history reads | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:205 | S10-SC03 managed V2 finalize avoids full replay | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:206 | S10-SC04 checkpoint reduces superseded event payload bytes | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:207 | S10-SC05 checkpoint preserves latest event and all record identities | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:208 | S10-SC06 checkpoint is idempotent and preserves V2 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:209 | S10-SC08 receipt preserves retry identity and rejects direct append | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:210 | S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:211 | S10-SC09 managed checkpoint SQL V2 payload and path | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:212 | S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:213 | S10-SC10 checkpoint prefix recovers before writes | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:214 | S10-SC11 checkpoint mismatch preserves bytes and poisons owner | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:215 | S10-SC12 first accepted mutation controls latest event | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:216 | S10-SC16 automatic checkpoint uses accumulated growth | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:217 | S10-SC07 raw checkpoint is rejected | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:218 | S10-SC18 checkpoint syscall failure poisons and reopens write | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:219 | S10-SC21 poison rejects hold mutation write | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:220 | S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:221 | S10-SC21 poison rejects hold mutation file-fsync | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:222 | S10-SC18 checkpoint syscall failure poisons and reopens rename | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:223 | S10-SC21 poison rejects hold mutation rename | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:224 | S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:225 | S10-SC21 poison rejects hold mutation dir-fsync | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:226 | S10-SC17 checkpoint preserves holds observations and deletion | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:227 | S10-SC17 checkpoint SQL hold observation tombstone | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:228 | S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:229 | S10-SC17 checkpoint SQL restart observation tombstone | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:230 | S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:231 | S10-SC19 invalid managed history remains unchanged malformed | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:232 | S10-SC19 invalid managed history remains unchanged unsupported | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:233 | S10-SC19 invalid managed history remains unchanged conflict | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:234 | S10-SC20 raw catalog rejects receipt before side effects | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:236 | S10-SC13 crypto off raw remains usable | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:237 | S10-SC14 crypto off checkpoint is rejected | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:238 | S10-SC15 crypto off receipt reopen is rejected | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:239 | source 저장 callback reconcile 연결 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:240 | policy revision idempotency | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:241 | 5초 safety reconcile | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:242 | composition root 관리 저장소 선행 open | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:243 | composition helper journal 다음 catalog rebuild/open | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:244 | 서버 전 supervisor 시작 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:245 | ingress 전 event bridge 등록 | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:246 | ingress 종료 뒤 recorder finalize | PASS | 해당 실행 결과 |
| cp2-fields-catalog.log:247 | composition root 시작/종료 순서 | PASS | 해당 실행 결과 |

#### cp2-fields-final.log

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| cp2-fields-final.log:1 | CP06 exact canonical sequence equality | PASS | 해당 실행 결과 |
| cp2-fields-final.log:2 | CP06 same length different payload rejected | PASS | 해당 실행 결과 |
| cp2-fields-final.log:3 | CP06 reordered sequence rejected | PASS | 해당 실행 결과 |
| cp2-fields-final.log:4 | CP06 different count rejected | PASS | 해당 실행 결과 |
| cp2-fields-final.log:5 | CP06 different schema despite canonical equality rejected | PASS | 해당 실행 결과 |
| cp2-fields-final.log:6 | CP06 different enum despite canonical equality rejected | PASS | 해당 실행 결과 |
| cp2-fields-final.log:24 | CP01 actual Ready Complete shape canonical files reservation | PASS | 해당 실행 결과 |
| cp2-fields-final.log:25 | CP02 bounded two jobs over 1MiB canonical transitions | PASS | 해당 실행 결과 |
| cp2-fields-final.log:93 | CP03 bounded partial missing source then same evidence complete | PASS | 해당 실행 결과 |

#### cp2-fields-green.log

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| cp2-fields-green.log:1 | CP06 exact canonical sequence equality | PASS | 해당 실행 결과 |
| cp2-fields-green.log:2 | CP06 same length different payload rejected | PASS | 해당 실행 결과 |
| cp2-fields-green.log:3 | CP06 reordered sequence rejected | PASS | 해당 실행 결과 |
| cp2-fields-green.log:4 | CP06 different count rejected | PASS | 해당 실행 결과 |
| cp2-fields-green.log:5 | CP06 different schema despite canonical equality rejected | PASS | 해당 실행 결과 |
| cp2-fields-green.log:6 | CP06 different enum despite canonical equality rejected | PASS | 해당 실행 결과 |

#### cp2-fields-red.log

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| cp2-fields-red.log:1 | CP06 exact canonical sequence equality | PASS | 과거 RED |
| cp2-fields-red.log:2 | CP06 same length different payload rejected | PASS | 과거 RED |
| cp2-fields-red.log:3 | CP06 reordered sequence rejected | PASS | 과거 RED |
| cp2-fields-red.log:4 | CP06 different count rejected | PASS | 과거 RED |
| cp2-fields-red.log:5 | CP06 different schema despite canonical equality rejected | FAIL | 과거 RED |
| cp2-fields-red.log:6 | CP06 different enum despite canonical equality rejected | FAIL | 과거 RED |

#### cp2-final.log

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| cp2-final.log:1 | CP06 exact canonical sequence equality | PASS | 해당 실행 결과 |
| cp2-final.log:2 | CP06 same length different payload rejected | PASS | 해당 실행 결과 |
| cp2-final.log:3 | CP06 reordered sequence rejected | PASS | 해당 실행 결과 |
| cp2-final.log:4 | CP06 different count rejected | PASS | 해당 실행 결과 |
| cp2-final.log:22 | CP01 actual Ready Complete shape canonical files reservation | PASS | 해당 실행 결과 |
| cp2-final.log:23 | CP02 bounded two jobs over 1MiB canonical transitions | PASS | 해당 실행 결과 |
| cp2-final.log:91 | CP03 bounded partial missing source then same evidence complete | PASS | 해당 실행 결과 |

#### cp2-identity-assert-red.log

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| cp2-identity-assert-red.log:1 | CP06 exact canonical sequence equality | FAIL | 과거 RED |
| cp2-identity-assert-red.log:2 | CP06 same length different payload rejected | PASS | 과거 RED |
| cp2-identity-assert-red.log:3 | CP06 reordered sequence rejected | PASS | 과거 RED |
| cp2-identity-assert-red.log:4 | CP06 different count rejected | PASS | 과거 RED |

#### cp2-jobs.log

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| cp2-jobs.log:1 | J01 실제 선택→compact 내구 job 계약 왕복 | PASS | 해당 실행 결과 |
| cp2-jobs.log:3 | J17 무관source8개 추가에도 동일선택 jobID 유지 | PASS | 해당 실행 결과 |
| cp2-jobs.log:4 | J18 cleanup wall시계 역행 허용·순서는상태로검사 | PASS | 해당 실행 결과 |
| cp2-jobs.log:5 | J04 단일 Intent 원장·보호·예약 원자 가시성 | PASS | 해당 실행 결과 |
| cp2-jobs.log:6 | J19 후발 coordinator 일반·파생 admission 및 복구 차단 | PASS | 해당 실행 결과 |
| cp2-jobs.log:7 | J02 이후 시각 재Build ID 유지·선택 변경 새 ID | PASS | 해당 실행 결과 |
| cp2-jobs.log:8 | J03 unknown·중복·미지원 schema·불완전 JSON·4MiB·예약 상한·미구현 state 거부 | PASS | 해당 실행 결과 |
| cp2-jobs.log:9 | J16 소유 경로·attempt·order 계획 조작 거부 | PASS | 해당 실행 결과 |
| cp2-jobs.log:10 | J16 실제 2 source UUID 역순이어도 영속 order 순 출력 계획 | PASS | 해당 실행 결과 |
| cp2-jobs.log:11 | J08 나중 시각 재요청 최초 시각 유지·예약/경로 충돌·다른 catalog 거부 | PASS | 해당 실행 결과 |
| cp2-jobs.log:12 | J06 generic hold 감소로 job 보호 해제 불가·직접 삭제/corrupt 차단 | PASS | 해당 실행 결과 |
| cp2-jobs.log:13 | J14 cleanup Failed는 job 자원만 해제·wall 역행·terminal 자동 재시도 없음 | PASS | 해당 실행 결과 |
| cp2-jobs.log:19 | J05 pending·corrupt·tombstone·hash·binding 불일치 source 거부 | PASS | 해당 실행 결과 |
| cp2-jobs.log:20 | J07 실제 source 삭제/Intent 경쟁에서 둘 중 한 전이만 허용 | PASS | 해당 실행 결과 |
| cp2-jobs.log:21 | J10 checkpoint 전후 job·보호·예약 유지 | PASS | 해당 실행 결과 |
| cp2-jobs.log:22 | J09 SQLite·fallback·재build/reopen 내구 job 동등·중복 보호 가산 없음 | PASS | 해당 실행 결과 |
| cp2-jobs.log:29 | J10 replay 동일 중복 멱등·다른 내용/불완전/schema/전이/보호 상태 거부 | PASS | 해당 실행 결과 |
| cp2-jobs.log:30 | J11 같은 채널 memory+동시 durable 예약 합계 event quota 제한 | PASS | 해당 실행 결과 |
| cp2-jobs.log:31 | J12 durable outstanding을 continuous/event/derived disk 예약에 포함 | PASS | 해당 실행 결과 |
| cp2-jobs.log:32 | J13 snapshot/disk provider 실패는 생성·periodic·복구 삭제 차단 | PASS | 해당 실행 결과 |
| cp2-jobs.log:33 | J15 partial unknown·이유·후보·요청 시간축 그대로 보존 | PASS | 해당 실행 결과 |
| cp2-jobs.log:34 | J19 정확한 소유자 소멸 후 새 coordinator만 재결박 | PASS | 해당 실행 결과 |
| cp2-jobs.log:35 | J20 append 거부 후 원장 복원해도 공통 mutation 차단 | PASS | 해당 실행 결과 |

#### cp2-media.log

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| cp2-media.log:1 | D3A-05 미완료 출력 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:2 | D3A-05 미완료 출력 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:3 | D3A-05 미완료 출력 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:4 | D3A-05 미완료 출력 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:5 | D3A-02 요청 충족 상태 구분 | PASS | 해당 실행 결과 |
| cp2-media.log:6 | D3A-01 실제 검증된 Event 출력 제공 | PASS | 해당 실행 결과 |
| cp2-media.log:7 | D3A-03 권한/다른 채널 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:8 | D3A-01 application V2 채널 권한 후 제공 | PASS | 해당 실행 결과 |
| cp2-media.log:9 | D3A-06 제공 중 삭제 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:10 | D3A-06 fd 해제 후 hold0 | PASS | 해당 실행 결과 |
| cp2-media.log:11 | D3A-01 실제 검증된 Event 출력 제공 | PASS | 해당 실행 결과 |
| cp2-media.log:12 | D3A-03 권한/다른 채널 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:13 | D3A-01 application V2 채널 권한 후 제공 | PASS | 해당 실행 결과 |
| cp2-media.log:14 | D3A-06 제공 중 삭제 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:15 | D3A-06 fd 해제 후 hold0 | PASS | 해당 실행 결과 |
| cp2-media.log:16 | D3A-04 실제 파일 있는 manual Event 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:17 | D3A-07 immutable metadata 다른 결박 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:18 | D3A-08 원본 보존 삭제 완료 | PASS | 해당 실행 결과 |
| cp2-media.log:19 | D3A-08 원본 보존 삭제 완료 | PASS | 해당 실행 결과 |
| cp2-media.log:20 | D3A-08 원본 삭제 뒤 검증된 출력 제공 | PASS | 해당 실행 결과 |
| cp2-media.log:21 | D3A-07 실제 파일 크기 변조 거부·hold0 | PASS | 해당 실행 결과 |
| cp2-media.log:22 | D3A-07 동일 크기 파일 내용 변조 거부·hold0 | PASS | 해당 실행 결과 |
| cp2-media.log:23 | D3A-06 hold 해제 후 삭제 전이·새 제공 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:24 | D3A-05 미완료 출력 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:25 | D3A-05 미완료 출력 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:26 | D3A-05 미완료 출력 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:27 | D3A-05 미완료 출력 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:28 | D3A-02 요청 충족 상태 구분 | PASS | 해당 실행 결과 |
| cp2-media.log:29 | D3A-02 partial 출력 제공 | PASS | 해당 실행 결과 |
| cp2-media.log:30 | D3A-03 권한/다른 채널 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:31 | D3A-01 application V2 채널 권한 후 제공 | PASS | 해당 실행 결과 |
| cp2-media.log:32 | D3A-06 제공 중 삭제 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:33 | D3A-06 fd 해제 후 hold0 | PASS | 해당 실행 결과 |
| cp2-media.log:34 | D3A-02 partial 출력 제공 | PASS | 해당 실행 결과 |
| cp2-media.log:35 | D3A-03 권한/다른 채널 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:36 | D3A-01 application V2 채널 권한 후 제공 | PASS | 해당 실행 결과 |
| cp2-media.log:37 | D3A-06 제공 중 삭제 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:38 | D3A-06 fd 해제 후 hold0 | PASS | 해당 실행 결과 |
| cp2-media.log:39 | D3A-04 실제 파일 있는 manual Event 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:40 | D3A-07 immutable metadata 다른 결박 거부 | PASS | 해당 실행 결과 |
| cp2-media.log:41 | D3A-08 원본 보존 삭제 완료 | PASS | 해당 실행 결과 |
| cp2-media.log:42 | D3A-08 원본 보존 삭제 완료 | PASS | 해당 실행 결과 |
| cp2-media.log:43 | D3A-08 원본 삭제 뒤 검증된 출력 제공 | PASS | 해당 실행 결과 |
| cp2-media.log:44 | D3A-07 실제 파일 크기 변조 거부·hold0 | PASS | 해당 실행 결과 |
| cp2-media.log:45 | D3A-07 동일 크기 파일 내용 변조 거부·hold0 | PASS | 해당 실행 결과 |
| cp2-media.log:46 | D3A-06 hold 해제 후 삭제 전이·새 제공 거부 | PASS | 해당 실행 결과 |

#### cp2-replay-green.log

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| cp2-replay-green.log:1 | CP06 exact canonical sequence equality | PASS | 해당 실행 결과 |
| cp2-replay-green.log:2 | CP06 same length different payload rejected | PASS | 해당 실행 결과 |
| cp2-replay-green.log:3 | CP06 reordered sequence rejected | PASS | 해당 실행 결과 |
| cp2-replay-green.log:4 | CP06 different count rejected | PASS | 해당 실행 결과 |
| cp2-replay-green.log:42 | CP01 actual Ready Complete shape canonical files reservation | PASS | 해당 실행 결과 |
| cp2-replay-green.log:43 | CP02 bounded two jobs automatic checkpoint trace collected | PASS | 해당 실행 결과 |
| cp2-replay-green.log:115 | CP03 bounded partial missing source then same evidence complete | PASS | 해당 실행 결과 |
| cp2-replay-green.log:118 | CP05 exact candidate reused with original semantic replay | PASS | 해당 실행 결과 |

#### cp2-replay-red.log

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| cp2-replay-red.log:1 | CP06 exact canonical sequence equality | PASS | 과거 RED |
| cp2-replay-red.log:2 | CP06 same length different payload rejected | PASS | 과거 RED |
| cp2-replay-red.log:3 | CP06 reordered sequence rejected | PASS | 과거 RED |
| cp2-replay-red.log:4 | CP06 different count rejected | PASS | 과거 RED |
| cp2-replay-red.log:46 | CP01 actual Ready Complete shape canonical files reservation | PASS | 과거 RED |
| cp2-replay-red.log:47 | CP02 bounded two jobs automatic checkpoint trace collected | PASS | 과거 RED |
| cp2-replay-red.log:119 | CP03 bounded partial missing source then same evidence complete | PASS | 과거 RED |
| cp2-replay-red.log:122 | CP05 exact candidate reused with original semantic replay | FAIL | 과거 RED |

#### cp2-service.log

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| cp2-service.log:66 | F12 실제 remux의 다른 selection 결박 거부 | PASS | 해당 실행 결과 |
| cp2-service.log:67 | F12 실제 remux provenance의 요청 범위 위조 거부 | PASS | 해당 실행 결과 |
| cp2-service.log:68 | F12 실제 remux의 foreign unfulfilled 범위 거부 | PASS | 해당 실행 결과 |
| cp2-service.log:69 | F01 실제 writer→선택→Intent→파생 파일→게시→Complete | PASS | 해당 실행 결과 |
| cp2-service.log:73 | F01 실제 catalog/file/hash/단일 commit/hold 해제/cleanup 및 직접 decode | PASS | 해당 실행 결과 |
| cp2-service.log:74 | F15 단일 service·동시 Run·외부 terminal release 거부 | PASS | 해당 실행 결과 |
| cp2-service.log:75 | F16 active source 삭제 거부·동일 사유 비보호 원본 삭제 positive control | PASS | 해당 실행 결과 |
| cp2-service.log:76 | F02 두 출력 독립 epoch·unknown UTC·실제 AU/visible 출처 보존 | PASS | 해당 실행 결과 |
| cp2-service.log:77 | F12 Complete 출처 전수 canonical roundtrip | PASS | 해당 실행 결과 |
| cp2-service.log:78 | F12 Ready 포함 Intent 잘못된 상태 거부 | PASS | 해당 실행 결과 |
| cp2-service.log:79 | F12 미지원 필드 엄격 거부 | PASS | 해당 실행 결과 |
| cp2-service.log:80 | F14 Ready JSON 4MiB 명시 상한 거부 | PASS | 해당 실행 결과 |
| cp2-service.log:81 | F12 출력 receipt inode 별칭 거부 | PASS | 해당 실행 결과 |
| cp2-service.log:83 | F03 Intent 생성 전 프로세스 중단 | PASS | 해당 실행 결과 |
| cp2-service.log:84 | F04 receipt 전 실물의 소유권 미확인 보호 유지 | PASS | 해당 실행 결과 |
| cp2-service.log:85 | F05 receipt 이후 Intent 중단 소유물 정리 | PASS | 해당 실행 결과 |
| cp2-service.log:86 | F06 Ready 중단 뒤 재렌더 없이 완료 | PASS | 해당 실행 결과 |
| cp2-service.log:87 | F07 첫 출력 link 중단 쌍 복구 | PASS | 해당 실행 결과 |
| cp2-service.log:88 | F07 두 번째 출력 link 중단 쌍 복구 | PASS | 해당 실행 결과 |
| cp2-service.log:89 | F08 전체 publish 후 commit 전 중단 | PASS | 해당 실행 결과 |
| cp2-service.log:90 | F09 원자 commit 후 cleanup 전 중단 | PASS | 해당 실행 결과 |
| cp2-service.log:91 | F10 첫 temp 삭제 중단 | PASS | 해당 실행 결과 |
| cp2-service.log:92 | F10 두 번째 temp 삭제 중단 | PASS | 해당 실행 결과 |
| cp2-service.log:93 | F10 attempt 디렉터리 삭제 중단 | PASS | 해당 실행 결과 |
| cp2-service.log:94 | F10 job 디렉터리 삭제 중단 | PASS | 해당 실행 결과 |
| cp2-service.log:95 | F10 Complete mutation 직전 중단 | PASS | 해당 실행 결과 |
| cp2-service.log:96 | F10 Failed cleanup attempt 삭제 중단 | PASS | 해당 실행 결과 |
| cp2-service.log:97 | F10 Failed cleanup job 삭제 중단 | PASS | 해당 실행 결과 |
| cp2-service.log:98 | F10 Failed mutation 직전 중단 | PASS | 해당 실행 결과 |
| cp2-service.log:99 | F11 hash 오류 거부·보호/예약 유지 | PASS | 해당 실행 결과 |
| cp2-service.log:100 | F11 missing 오류 거부·보호/예약 유지 | PASS | 해당 실행 결과 |
| cp2-service.log:101 | F11 foreign 오류 거부·보호/예약 유지 | PASS | 해당 실행 결과 |
| cp2-service.log:102 | F11 symlink 오류 거부·보호/예약 유지 | PASS | 해당 실행 결과 |
| cp2-service.log:103 | F11 fifo 오류 거부·보호/예약 유지 | PASS | 해당 실행 결과 |
| cp2-service.log:104 | F11 hardlink 오류 거부·보호/예약 유지 | PASS | 해당 실행 결과 |
| cp2-service.log:105 | F11 parent 오류 거부·보호/예약 유지 | PASS | 해당 실행 결과 |
| cp2-service.log:106 | F14 cancel-before-create 생성 중단·소유 cleanup·예약 해제 | PASS | 해당 실행 결과 |
| cp2-service.log:107 | F14 cancel 생성 중단·소유 cleanup·예약 해제 | PASS | 해당 실행 결과 |
| cp2-service.log:108 | F14 small 생성 중단·소유 cleanup·예약 해제 | PASS | 해당 실행 결과 |
| cp2-service.log:109 | F14 deadline 생성 중단·소유 cleanup·예약 해제 | PASS | 해당 실행 결과 |
| cp2-service.log:110 | F12 SQLite projection·journal fallback job/output 일치 | PASS | 해당 실행 결과 |
| cp2-service.log:111 | F12 SQLite rebuild·checkpoint 재개방 job/output 일치 | PASS | 해당 실행 결과 |
| cp2-service.log:112 | F13 Complete output tombstone 뒤 재생성 없음 | PASS | 해당 실행 결과 |

#### cp2-timeline.log

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| cp2-timeline.log:1 | D3B-01 actual V2 원본·문자열 UTC·독립 unplaced 응답 | PASS | 해당 실행 결과 |
| cp2-timeline.log:2 | D3B-14 mismatch/nonintegral mapping은 unplaced | PASS | 해당 실행 결과 |
| cp2-timeline.log:3 | D3B-14 mismatch/nonintegral mapping은 unplaced | PASS | 해당 실행 결과 |
| cp2-timeline.log:4 | D3B-02 문법/범위 오류400 | PASS | 해당 실행 결과 |
| cp2-timeline.log:5 | D3B-02 문법/범위 오류400 | PASS | 해당 실행 결과 |
| cp2-timeline.log:6 | D3B-02 문법/범위 오류400 | PASS | 해당 실행 결과 |
| cp2-timeline.log:7 | D3B-02 문법/범위 오류400 | PASS | 해당 실행 결과 |
| cp2-timeline.log:8 | D3B-02 문법/범위 오류400 | PASS | 해당 실행 결과 |
| cp2-timeline.log:9 | D3B-02 문법/범위 오류400 | PASS | 해당 실행 결과 |
| cp2-timeline.log:10 | D3B-02 권한 거부403 | PASS | 해당 실행 결과 |
| cp2-timeline.log:11 | D3B-13 Intent placeholder no file/null time | PASS | 해당 실행 결과 |
| cp2-timeline.log:12 | D3B-13 accepted/no-job 상태 보존 | PASS | 해당 실행 결과 |
| cp2-timeline.log:13 | D3B-05 Ready 출력 시간과 재생불가 분리 | PASS | 해당 실행 결과 |
| cp2-timeline.log:14 | D3B-05 Committed 출력 시간과 재생불가 분리 | PASS | 해당 실행 결과 |
| cp2-timeline.log:15 | D3B-05 실제 검증된 파생2출력 시간/파일 독립 | PASS | 해당 실행 결과 |
| cp2-timeline.log:16 | D3B-07 같은 UTC 다른 segment/epoch는 원본 숨김 없음 | PASS | 해당 실행 결과 |
| cp2-timeline.log:17 | D3B-13 출력 생성 뒤 job placeholder 없음 | PASS | 해당 실행 결과 |
| cp2-timeline.log:18 | D3B-07 page 밖 이벤트도 원본 전체 충족 판정 | PASS | 해당 실행 결과 |
| cp2-timeline.log:19 | D3B-06 일부 중첩 원본은 보존 | PASS | 해당 실행 결과 |
| cp2-timeline.log:20 | D3B-04 재조회 stable itemId/order | PASS | 해당 실행 결과 |
| cp2-timeline.log:21 | D3B-12 요청축/문자열/공개 whitelist | PASS | 해당 실행 결과 |
| cp2-timeline.log:22 | D3B-08 동일 size 변조 출력은 비재생 | PASS | 해당 실행 결과 |
| cp2-timeline.log:23 | D3B-08 파일 누락 Complete와 재생불가/숨김 분리 | PASS | 해당 실행 결과 |
| cp2-timeline.log:24 | D3B-08 실제 tombstone 출력 deleted 보존 | PASS | 해당 실행 결과 |
| cp2-timeline.log:25 | D3B-09 source tombstone 뒤 durable UTC 투영 | PASS | 해당 실행 결과 |
| cp2-timeline.log:26 | D3B-05 partial 요청 실제 출력 jobComplete | PASS | 해당 실행 결과 |
| cp2-timeline.log:27 | D3B-14 actual 출력 mismatch mapping은 unplaced·partial 파일 제공 분리 | PASS | 해당 실행 결과 |
| cp2-timeline.log:28 | D3B-13 Failed placeholder no file/null time | PASS | 해당 실행 결과 |
| cp2-timeline.log:29 | D3B-03/04 UTC0와 same-file 다중 mapping 독립 ID | PASS | 해당 실행 결과 |
| cp2-timeline.log:30 | D3B-03 int64 최대 UTC ns 문자열 정밀도 | PASS | 해당 실행 결과 |
| cp2-timeline.log:31 | D3B-11 관련 없는 known4352 누적은 짧은 질의 허용 | PASS | 해당 실행 결과 |
| cp2-timeline.log:32 | D3B-11 실제 관련4352 상한 명시 실패 | PASS | 해당 실행 결과 |
| cp2-timeline.log:33 | D3B-02/11 관련 상한503 | PASS | 해당 실행 결과 |
| cp2-timeline.log:34 | D3B-10/11 unknown4354 count와 bounded 첫 페이지 | PASS | 해당 실행 결과 |
| cp2-timeline.log:35 | D3B-10 known/unplaced 독립 동일 offset 페이지 | PASS | 해당 실행 결과 |
| cp2-timeline.log:36 | D3B-11 offset+limit overflow 명시 실패 | PASS | 해당 실행 결과 |
| cp2-timeline.log:37 | D3B-11 전체 unknown deep-copy 없이35074 첫 페이지 허용 | PASS | 해당 실행 결과 |
| cp2-timeline.log:38 | D3B-11 deep offset64MiB workspace 초과는 결과 없이 명시 실패 | PASS | 해당 실행 결과 |

#### cp2-validation.log

| 제목 | 테스트내용 | 판정 | 비고 |
| --- | --- | --- | --- |
| cp2-validation.log:2 | P0-PERF01 literal source1 sample250 slice45 complete | PASS | 해당 실행 결과 |
| cp2-validation.log:16 | P0-PERF01 canonical record roundtrip unchanged | PASS | 해당 실행 결과 |
| cp2-validation.log:17 | P0-PERF02 baseline canonical hash literal unchanged | PASS | 해당 실행 결과 |
| cp2-validation.log:18 | P0-PERF02 host-scoped serialize-record median <=60000us | PASS | 해당 실행 결과 |
| cp2-validation.log:19 | P0-PERF01 source mapping conflict rejected | PASS | 해당 실행 결과 |
| cp2-validation.log:20 | P0-PERF01 selection table mapping conflict rejected | PASS | 해당 실행 결과 |
| cp2-validation.log:21 | P0-PERF01 job identity forgery rejected | PASS | 해당 실행 결과 |

### 소유 임시물 정리

각 runner의 실제 cleanup 출력이다. 기록된 root는 모두 삭제 후 removed=true다. CP 자식 close 결과도 함께 남겼다. 서버/포트/외부 서비스를 시작하지 않았다. freshness 준비 실패는 root 생성 전이었다. 기존 공유 GStreamer cache는 삭제하지 않았다.

| 로그 | 경로·종류·삭제 전 크기·조치·결과 | 근거 |
| --- | --- | --- |
| cp2-catalog.log | [cleanup] path=/tmp/media_server_v410_recording_catalog-73526 bytes=26457302 removed=true | 직접 원출력 |
| cp2-fields-catalog.log | [cleanup] path=/tmp/media_server_v410_recording_catalog-74270 bytes=26457302 removed=true | 직접 원출력 |
| cp2-fields-final.log | [bounded] {"pid":74266,"code":0,"signal":null,"limit":false,"outputBytes":8463,"diagnostic":false,"automaticCheckpoints":null} | 직접 원출력 |
| cp2-fields-final.log | [cleanup] path=/private/tmp/media-server-checkpoint-reproduction.uQ40gw bytes=14396966 removed=true | 직접 원출력 |
| cp2-fields-final.log | [elapsed] seconds=23 source=bash-SECONDS | 직접 원출력 |
| cp2-fields-green.log | [cleanup] path=/private/tmp/media-server-checkpoint-reproduction.UlHZ8O bytes=928443 removed=true | 직접 원출력 |
| cp2-fields-green.log | [elapsed] seconds=1 source=bash-SECONDS | 직접 원출력 |
| cp2-fields-red.log | [cleanup] path=/private/tmp/media-server-checkpoint-reproduction.KSp2aj bytes=928443 removed=true | 직접 원출력 |
| cp2-fields-red.log | [elapsed] seconds=1 source=bash-SECONDS | 직접 원출력 |
| cp2-final.log | [bounded] {"pid":73513,"code":0,"signal":null,"limit":false,"outputBytes":8463,"diagnostic":false,"automaticCheckpoints":null} | 직접 원출력 |
| cp2-final.log | [cleanup] path=/private/tmp/media-server-checkpoint-reproduction.BAFbvB bytes=14396966 removed=true | 직접 원출력 |
| cp2-final.log | [elapsed] seconds=23 source=bash-SECONDS | 직접 원출력 |
| cp2-identity-assert-red.log | [cleanup] path=/private/tmp/media-server-checkpoint-reproduction.nfdiry bytes=928299 removed=true | 직접 원출력 |
| cp2-identity-assert-red.log | [elapsed] seconds=1 source=bash-SECONDS | 직접 원출력 |
| cp2-jobs.log | [cleanup] path=/private/tmp/media-server-derived-jobs.Lsu8Oj bytes=9017567 removed=true | 직접 원출력 |
| cp2-jobs.log | [elapsed] seconds=7 source=bash-SECONDS | 직접 원출력 |
| cp2-media.log | [cleanup] path=/private/tmp/media-server-public-media.6UYWzD bytes=6331168 removed=true | 직접 원출력 |
| cp2-media.log | [elapsed] seconds=2 source=bash-SECONDS | 직접 원출력 |
| cp2-replay-green.log | [bounded] {"pid":73264,"code":0,"signal":null,"limit":false,"outputBytes":9838,"diagnostic":true,"automaticCheckpoints":2} | 직접 원출력 |
| cp2-replay-green.log | [cleanup] path=/private/tmp/media-server-checkpoint-reproduction.0CWhSY bytes=14397558 removed=true | 직접 원출력 |
| cp2-replay-green.log | [elapsed] seconds=24 source=bash-SECONDS | 직접 원출력 |
| cp2-replay-red.log | [bounded] {"pid":73044,"code":0,"signal":null,"limit":false,"outputBytes":10105,"diagnostic":true,"automaticCheckpoints":2} | 직접 원출력 |
| cp2-replay-red.log | [cleanup] path=/private/tmp/media-server-checkpoint-reproduction.EwjghD bytes=14397558 removed=true | 직접 원출력 |
| cp2-replay-red.log | [elapsed] seconds=28 source=bash-SECONDS | 직접 원출력 |
| cp2-service.log | [cleanup] path=/private/tmp/media-server-derived-job-service.dHMcST bytes=15561808 removed=true | 직접 원출력 |
| cp2-service.log | [elapsed] seconds=23 source=bash-SECONDS | 직접 원출력 |
| cp2-timeline.log | [cleanup] path=/private/tmp/media-server-public-timeline.2FZbcV bytes=32445719 removed=true | 직접 원출력 |
| cp2-timeline.log | [elapsed] seconds=20 source=bash-SECONDS | 직접 원출력 |
| cp2-validation.log | [cleanup] path=/private/tmp/media-server-job-validation.XhyMpn bytes=4690712 removed=true | 직접 원출력 |

강제 종료/출력 상한 음성은 이번 정상 실행으로 검증했다고 주장하지 않는다. token start/end/consumed는 실제 집계 소스가 없어 미집계다. elapsed/source는 각 runner의 bash SECONDS 또는 steady clock 출력이며 빌드 전체 elapsed는 별도 계측하지 않았다. 에이전트는 commit/push를 수행하지 않았다. 현재 최종 판정은 이 절이며 아래 1번/중간 단계 문구는 당시 상태 이력으로 보존한다.


독자: P0 구현/검토 담당. 수명: 이번 독립 재현과 후속 최적화의 실행 증거. 정책은 AGENTS, 중앙 정의는 [중앙 테스트 기록](../../../release-test-records.md)이 우선한다. 이전 actual 실패는 별도 통합 준비 기록에 보존하며 이번 완료 범위와 구분한다.

## 실행 전 정의

## 2번 실행 전 CP05~08 정의

CP07 한계는 메인과 확정했다. 공개 API는 semantic-invalid 원장을 catalog checkpoint까지 주입하도록 허용하지 않는다. 원본 replay가 exact 분기보다 앞서고 실패 즉시 반환함을 직접 리뷰하고, 실제 catalog/derived 불법 replay 음성을 재사용한다. private test hook이나 가짜 callback을 추가하지 않는다. checkpoint 내부에 invalid 원본을 직접 주입하는 검사는 미실행이며 도달 가능한 공개 경계 검사와 구별한다.

영향검증의 정확 명령은 순서대로 `bash scripts/internal/verify_v410_recording_catalog.sh`, `bash scripts/internal/verify_recording_derived_jobs.sh`, `bash scripts/internal/verify_recording_derived_job_service.sh`, `bash scripts/internal/verify_recording_public_media.sh`, `bash scripts/internal/verify_recording_public_timeline.sh`, `bash scripts/internal/verify_recording_derived_job_validation.sh --performance-budget`이다. env-i PATH/HOME=/tmp/TMPDIR=/tmp를 유지하고 cp2-{catalog,jobs,service,media,timeline,validation}.log에 직접 저장한다. 임시 계측 제거 뒤 build와 기본 CP도 실행한다. 불변 carrierEV15/consumer22는 이전 유효 증거를 유지한다.

1번 커밋 bd5f5ea8 이후 별도 최소fix다. CP05는 임시진단에서 byte-exact 동일후보의original replay1/candidate0을요구(현재후보replay는실행되므로예상RED), CP06은내부canonical비교exactpositive/동일길이다른payload/순서/개수negative, CP07은실제catalog semantic-invalid 경로의검사가능성을메인검토하며가짜callback으로대체하지않는다. CP08은 verify_v410_recording_catalog.sh의SC전수 changedcandidate/복구기존검사를유지한다. 명령 build→verify_recording_checkpoint_reproduction.sh --diagnostic-evidence→catalog/derived영향회귀→임시계측제거→build→기본CP. 각원출력 cp2-*.log 보존. 실제앱/대기정책/완전성/시간상한은변경하지않는다.

안전runner 최종baseline 재검증(메인승인): 기존명령에 --diagnostic-evidence를명시하여 ownedcache/stream별buffer/출력상한/종료보완을검증한다. cp-owned-baseline.log 보존. 진단모드만자동checkpoint count>0을요구하며 최종기본모드는 임시계측제거뒤shape/파일/예약회귀로한정한다. 자동경계는기존SC16으로교차검증한다. 후속CP05~08은1분할커밋뒤실행: CP05 exact동일 원본replay1/후보0 임시계측RED→GREEN, CP06 canonical길이같은다른내용/순서 음성, CP07 실제catalog semantic invalid거부, CP08 기존SC전수. orchestration callback추상화는추가하지않는다.

1차 linear clock은250samples/45slices지만mapping1/Ready183KB로 확인됐다(cp-retry.log). 실제 자동checkpoint1회는 관측했으나 목표mapping250 workload와 다르다. 이 baseline은 보존한다. 메인 승인 보강: CP01/02만 PTS/duration/identity 불변의 synthetic burst-arrival clock(mono_before=1e9+i*1e6, after+1000, UTC=fixed epoch+i*1e6)을 사용하여 기존 divergence 정책의250mappings를 만들고 literal검사한다. 실제 앱 clock의 동일 재현 주장은 아니다. CP03는 linear 유지, reference original frame258/PTS8566666666, unknown union[8333333333,9316000000)와 정확reason을assert하고 ready.unfulfilled 동일request구간·원본 수용ordinal250→300도 대조한다. Update계측은 mutex대기 포함 총시간이며 lock-held 측정이 아니다.

| 제목 | 수행내용 | 상세 oracle |
| --- | --- | --- |
| CP01 | 실제 H264 Ready/Complete 전이 크기·비용 | 30fps/GOP250/501frames, target2s managed writer. 첫 두 원본250samples. 요청[3000,4500)ms actual selection→service, Ready/Complete payload hash/bytes/source/sample/mapping/slice/AU 개수. 각 canonical Serialize/Parse3회. Complete·파일hash·예약release 확인 |
| CP02 | 자동1MiB checkpoint | 최대2개 독립job, explicit checkpoint/padding 금지. opt-in 임시계측 Update전체 및 Checkpoint Replay/Prepare/original Apply/candidate Apply/signature/commit 각각 count/bytes/elapsed. 자동commit>0, strict projection·잠금 불변 |
| CP03 | 3750ms 긴 GOP partial 원인 | 약300frames까지push, 첫source만finalized/다음GOP미닫힘, 요청[7816,9316)ms를실제packet pts/duration 합성증거가덮음. 동일snapshot worker3750ms→partial1, 저장selection/미충족reason·범위. writerStop후source2와sameevidence pureselection complete positivecontrol |

명령: `./server.sh build` 후 `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp bash scripts/internal/verify_recording_checkpoint_reproduction.sh`. owned root128MiB/실행60초, 실패시후속중지·cleanup. 제품 영구fix/실제앱/브라우저/전체통합은 실행하지 않는다. 합성decoded증거는 실제decoder 검증이 아니다. token 집계소스 없음. 준비실패는 예상RED가 아니다.

## CP06 추가 음성 검사 사전 정의

메인 리뷰에서 공개 serializer가 schema를 고정하고 미지원 enum 이름을 합칠 수 있음을 확인했다. CP06에 `different schema despite canonical equality rejected`, `different enum despite canonical equality rejected`를 추가한다. 두 경우 serialized bytes는 같아도 실제 필드가 달라 helper가 false여야 한다. `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp bash scripts/internal/verify_recording_checkpoint_reproduction.sh --identity-only`로 기존 코드 예상 RED를 확인한 뒤 schema/type 직접 비교만 보완한다. 공개 serializer와 parsed 정상 mutation의 동작은 바꾸지 않는다. 추가 단위 GREEN 뒤 최종 build·기본 CP·catalog를 대조하며, 직전 정상 매체 회귀는 변경 도달 조건을 검토해 유지한다.

## 1차·burst baseline 결과

안전runner최종baseline: [cp-owned-baseline.log](cp-owned-baseline.log), `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp bash scripts/internal/verify_recording_checkpoint_reproduction.sh --diagnostic-evidence` exit0. CP01/02/03 세행pass,250mapping CP04 shape출력, 자동checkpoint2회·상한위반없음. ownedcache/stream분리/종료보완정상경로가실행됐다. 강제시간/출력상한음성은별도미실행이며정상결과로대체하지않는다. 제품영구최적화는아직미실시다.

CP04는 승인된 burst clock을 적용한 실제250mapping workload다(source1/sample250/mapping250/slice45/AU250). 별도baseline을 반복하지 않는다. burst2의 original/candidate Apply는 서로중첩되지않는 두영역이며 합4245862μs(약4.245862초), 해당Update5682680μs의대부분이다. canonical exact identity boolean은이번에미관측이며후속2TDD에서확인한다.

정밀도 잔여: ready.unfulfilled에는 request-ns Unknown30개 외 original-pts-ns/file-duration-uncovered 1ns잔차5개가있다: [7899999999,7900000000), [7999999999,8000000000), [8099999999,8100000000), [8199999999,8200000000), [8299999999,8300000000). 파일duration축의실제잔차를삭제/반올림하지않았다. 후속positive는 pure selection.complete이며 remux request_fully_satisfied로확대하지않는다. worker+render4876ms이며3750ms는대기예산이다.

변경파일: 신규 scripts/internal/recording_checkpoint_reproduction_smoke.cpp와 verify_recording_checkpoint_reproduction.sh, optional인자만추가한 recording_media_test_fixture.h(기본10fps/keyint10불변), 임시 src/recording/recording_checkpoint_diagnostic.h와 recording_catalog.cpp, 본보고서/cp-*.log. 기존integration/carrier변경에는의존하지않는다. 커밋/푸시는메인담당으로미수행이다.

[제품빌드](cp-build.log) exit0. [최초 compile](cp-first.log) exit1은 공통 Shift 미사용 -Werror 준비실패이며 fixture에서 Shift(input,0) 사용 후 [linear baseline](cp-retry.log) exit0/3pass이다. [burst baseline](cp-burst.log) exit0/3pass, 자동checkpoint2회, 상한초과 없음. 둘 모두 위 env-i runner 명령으로 직접 파일 capture했다. 최초 실패는 지우지 않았으며 준비실패를 예상RED로 바꾸지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| CP 준비 | 독립fixture compile | fail | 최초 unused Shift, 입력불변 호출로 보완 |
| CP01 linear | 실제Ready/Complete·파일hash·예약해제 | pass | sample250/mapping1/slice45/AU250; 목표mapping규모 미충족 baseline |
| CP02 linear | 자동checkpoint 실제발생 | pass | runner count>0 필수·관측1 |
| CP03 linear | source1 partial→Stop후sameevidence complete | pass | 최초는 precise union 출력만, 후속보강으로 대체 |
| CP01 burst | 실제Ready/Complete·파일hash·예약해제 | pass | source1/sample250/mapping250/slice45/AU250 |
| CP02 burst | 자동checkpoint 원본/후보 비용 | pass | 자동2회·최대2job·explicit checkpoint/padding 없음 |
| CP03 precise | 원본미finalized Unknown union·ready미충족 동일·후속완전 | pass | frame258/PTS8566666666 고정, accepted ordinal250→300 |

burst Ready319533B/Complete319548B로 actual 약283KB와 같은크기가 아닌 유사규모 workload다. 실제파일/무작위ID·receipt가 포함되어 각실행hash는 달라질수있고 원출력에는 각record canonical hash와3회 Serialize/Parse시간을 모두 보존했다. raw canonical/미디어는 보존하지 않는다.

| 자동 checkpoint | original records/bytes/us | candidate records/bytes/us | 해당 Update 총us |
| --- | --- | --- | --- |
| linear1 | 18 / 1226817 / 724536 | 18 / 1226817 / 724879 | 1903854 |
| burst1 | 11 / 1125252 / 902384 | 11 / 1125252 / 902332 | 3049682 |
| burst2 | 17 / 2409583 / 2121410 | 17 / 2409583 / 2124452 | 5682680 |

Update는 mutex획득 이전부터 잰 총시간이다. 각 checkpoint 단계는 기존 lock안이며 중첩 총값을 합산하지 않는다. records/bytes동일만으로 canonical sequence 동일을 증명하지 않는다. 메인 static 검토의 no-op후보 반복검증은 별도 최적화 설계 후보다. 아직 checkpoint/제품 영구fix는 하지 않았다.

CP03은 [7816,9316)ms 요청에서 첫finalized 원본 끝8333333333ns부터9316000000ns까지 연속 Unknown, 정확reason=unconfirmed-interval-no-trusted-watermark를 slice마다assert했다. ready.unfulfilled의 request-ns union도 동일reason/범위를assert하고 모든구간을 원출력에 보존했다. 같은300sample증거와writerStop뒤 source2로 selector complete=true. 이 fixture에서는30fps1ns구멍이 positivecontrol을 막지 않았다. source파일 미확정이 partial 원인이 될수있음을 증명하며 actual archive의 개별원인까지 동일하다고 승격하지 않는다.

Push는 void API여서 반환bool 검사는 없다. writer.Stop은 동기이며 catalog finalized샘플수250/50·lastordinal250/300으로 입력수용과후속확정을 확인했다. CP03 worker는3750ms budget 그대로이며 새대기정책을 구현하지 않았다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/tmp/media-server-checkpoint-reproduction.TYUsH3 | compile실패 ownedroot | 0B | EXITcleanup | removed=true | cp-first |
| /private/tmp/media-server-checkpoint-reproduction.CpMpFa | linear ownedbinary/media/catalog | 10024163B | PID71456 exit0 뒤cleanup | removed=true | cp-retry |
| /private/tmp/media-server-checkpoint-reproduction.0xUpwX | burst ownedbinary/media/catalog | 11937194B | PID71619 exit0 뒤cleanup | removed=true | cp-burst |
| /private/tmp/media-server-checkpoint-reproduction.8UFXQc | 최종 ownedcache포함 binary/media/catalog | 13531406B | PID72007 exit0 뒤cleanup | removed=true | cp-owned-baseline·27초/output9960B·상한위반없음 |

서버/포트/외부서비스 없음. 임시 catalog계측은 남아 있어 최종완료 전에 제거·빌드대조가 필요하다. 다음 최적화는 메인결정 전 보류, 기존통합 실패와브라우저/장시간/재기동 미실행은 그대로다.

메인 최종runner안전검토 뒤 보완: child HOME/TMPDIR/GST_REGISTRY 두변수를ownedroot로고정, stdout/stderr별줄buffer, 출력4MiB상한,60초/128MiB위반시TERM→2초뒤동일ownedchild KILL→close확인. 이보완은현재코드에반영됐으나추가baseline재실행지시에따라아직미실행이며2TDD전검증대상이다. 과거실행은HOME=/tmp였다. 읽기확인한 /tmp/.cache/gstreamer-1.0, /tmp/Library/Caches/gstreamer-1.0, /private/tmp/.cache/gstreamer-1.0 세후보는부재였다(ls exit1/출력없음). 실제과거registry생성위치를전수확인한것은아니므로그한계는남긴다. 생성근거불명인기존물삭제는하지않았다.

메인 추가직접확인으로정정: 기존 env_common198~214는project .media_server.gstreamer 관리bundle을기본재사용하므로위 /tmp후보부재가registry미생성증거는아니다. 기존공용cache는이번소유물로삭제하지않았다. 새runner는ownedRUN_DIR/trap을먼저준비하고 MEDIA_SERVER_GST_CACHE_DIR와GST_REGISTRY/1_0를그안으로설정한뒤env_common적용으로보완했다. 기존실행의공용cache생성/변경개별소유는미확인이다.
