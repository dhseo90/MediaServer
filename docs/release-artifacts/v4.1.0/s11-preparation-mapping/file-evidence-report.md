# 3-B 파일 증거 구현·비용 대조 기록

독자: 녹화 개발·검증 담당자. 수명: 2026-09-16의 개발 실행 이력.
정책은 AGENTS, 계약은 종료점 계약, 실행 source-of-truth는 중앙 release-test-records다.
중앙에서 연결한 개별 결과 보존물이며 릴리즈·S11 완료 증거가 아니다.

## 판정

이 절 이하의 완료 보류·미실행·미커밋 상태는 비용 보완 **이전 이력**이다. 현재 결과는
[비용 보완 기록](catalog-cost-report.md)과 중앙 기록을 따른다. 2026-09-16 후속 검토에서
아래4개 원출력 PASS를 추가로 무효화했다. V2 금지 wrapper에서 먼저 거부되어 실제 파일 검증에
도달하지 않은 FE06 oracle 결함이다. 원출력은 보존하고 완료 증거에서 제외한다.

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| full1:76 | forged sample hash physical Ready refusal | 잘못된 호출 경로 | 물리 파일 증거 거부를 입증하지 않음 |
| full3:76 | 같은 검사 | 잘못된 호출 경로 | 같음 |
| full5:76 | 같은 검사 | 잘못된 호출 경로 | 같음 |
| cost-baseline:76 | 같은 검사 | 잘못된 호출 경로 | 같음 |

따라서 아래176개는 당시 출력상 통과 개수이지 현재 유효한176개 검증이라는 뜻이 아니다.

3-A는 e48fb5e4로 커밋했다. 3-B는 기능 검사176개를 통과했으나 저장 비용 증가가 미해소라 **부분 구현·완료 보류**다.
4번 대기 정책은 사전등록/설계만 있으며 코드·실행은 건너뛰었다. 3-B 커밋·최종 푸시는 하지 않았다.
체크포인트 주기를 늘리거나 의미 검증을 제거하지 않았다. 현재 미커밋 구현은 보존한다.

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 3-A 계약 보완 | 완료·커밋 | 실제 forward 대응 및 rational 구간 계약 | e48fb5e4/중앙 FW 기록 |
| 2 | 3-B 증거 수집·저장·복구 | 부분 구현 | 기능176 assertion 통과, 비용 미해소·영향 회귀 미실행 | FE01~08 |
| 3 | 4번 대기 정책 | 건너뜀 | 선수3-B 미완료. WP01~10 등록/설계만 | foundation plan |
| 4 | 분할 커밋 | 일부 수행 | 3-A만 커밋. 미완료3-B 미커밋 | Git 상태 |
| 5 | 최종 보고 전 푸시 | 미수행 | 3-B 비용·회귀 미해소、scope 미커밋 | AGENTS3/5 |
| 6 | 남은 업무 목록 | 정리 | 먼저3-B 비용/회귀, 이후4→5→S11준비/최종 | 이 기록/기존 release-readiness 감사 |

## 변경과 불변 경계

- contracts의 optional typed file_evidence/strict 정수 tuple, 실제 collector와 native MP4 reader 추가.
- 실제 writer의 수락·mux·파일 내용·native 표를 같은 Ready/bound mutation에 결박.
- finalize recovery의 실제 파일 hash/native 증거 재검증. 파일 I/O는 catalog 잠금 밖.
- H264/MP4 core/parser/mux1.28.1, mp4mux/isomp4 및 기본 segment 변환만 증거 profile로 인정.
- 미입증/중복/4097샘플은 증거를 만들지 않고 기존 녹화 유지. 모든 입력 지원을 검증했다는 뜻은 아님.
- 기존 job4MiB/8원본을 보존하도록 신규 기존-profile job만 검증된13필드 projection 사용.
  증거 포함 기존 job은 full strict/ID 유지. 원본 catalog 증거는 삭제하지 않음.
- 공개 API·요청 충족 의미·기존 partial·원본 identity 불변.
  새 증거의 생성/Ready/타임라인 공통 소비와 실제2출력·재기동 통합은 후속5번.
- CMake/기존 standalone verifier 링크에 새 translation unit 연결. 기존 verifier 실행 완료는 아님.

## 동일 조건 비용

실제4096 AU 자료를8개 원본으로 복제한 격리 catalog 비교다. 물리 파일 확인은 catalog 호출 측정 전에 수행했다.
같은 환경의 단일 대조이며 운영 처리량·UI 지연·장시간 성능을 측정한 것은 아니다.

| 측정 | 새 증거 포함 | 기존 binding만 |
| --- | --- | --- |
| 8개 commit 합계 | 9.983233초 | 0.985843초 |
| 개별 commit 최대 | 1.923131초 | 0.387206초 |
| 명시 checkpoint | 1.486846초 | 0.343342초 |
| source snapshot | 64.390ms | 1.174ms |

4096 binding1,077,251B는 journal의 자동 checkpoint 조건1MiB보다 크다.
AppendAndApplyLocked는 catalog 잠금 안에서 CheckpointDue/CheckpointLocked를 호출하며,
CheckpointLocked는 원장전체 semantic replay를 수행한다. 크기·발동 조건·호출 경로는 직접 확인했다.
세부 구성별 시간을 모두 계측하지 않았으므로 증가분 전부를 한 함수 탓으로 단정하지 않는다.
8개 관측에서 누적 저장 비용 증가가 명확하여 단계 완료를 보류했다. 더 큰 catalog의 시간을 추정 PASS/FAIL로 쓰지 않는다.

초기 증거8원본 job-json-cap 회귀는 projection으로 해소했다. 동일 job1,269,547B 및 ID가 기존과 일치한다.
저장 비용은 이 job 크기 문제와 별개다. 최소 표현·불변 증거 참조·검증된 checkpoint 재사용 등의
대안을 먼저 대조해야 한다. 주기만 늘리기, 의미 검증 삭제, timeout 연장은 적용하지 않았다.

## 명령 및 실패 이력

공통 명령: bash scripts/internal/verify_recording_file_evidence.sh <label>.
red/red2/green1/green2는 당시 단계별 runner/fixture이며 최종176검사와 범위가 다르다.

| 실행 | exit | 판정·보완 | 원출력 |
| --- | --- | --- | --- |
| red | 1 | 준비 실패: fixture 미사용 함수 -Werror. 예상 RED 아님 | [로그](file-evidence-output-red.txt) |
| red2 | 1 | 예상 RED: 실제 writer binding에 file_evidence 미구현 | [로그](file-evidence-output-red2.txt) |
| green1 | 1 | 구현 컴파일 실패: size_t/uint64_t 동시 auto 선언 | [로그](file-evidence-output-green1.txt) |
| green2 | 0 | 실제 writer 발급 첫 GREEN; 당시1검사만 | [로그](file-evidence-output-green2.txt) |
| full1 | 0 | 99 assertion 통과지만 증거8원본 job-json-cap 회귀 관측. 단계 PASS 아님 | [로그](file-evidence-output-full1.txt) |
| full2 | 1 | 검증 컴파일 실패: private API 직접 호출. 실제 admission 경로로 수정 | [로그](file-evidence-output-full2.txt) |
| full3 | 1 | fixture policy 누락으로 정상 admission 실패. 관련 음성5개 무효 | [로그](file-evidence-output-full3.txt) |
| full4 | 1 | 검증 컴파일 실패: admission 결과의 message 대신 reason 참조 | [로그](file-evidence-output-full4.txt) |
| full5 | 0 | 150 assertion 통과. catalog 비용 증가로 완료 보류 | [로그](file-evidence-output-full5.txt) |
| cost-baseline | 0 | 176 assertion 통과. 동일 legacy 대조로 저장 비용 증가 확인, 완료 보류 | [로그](file-evidence-output-cost-baseline.txt) |

full3의 admission 음성은 policy 선수조건 누락으로 무효다. full5/cost-baseline은 정상 policy와
정확한 live-source 거부 사유까지 검사했다. assertion 통과와 성능 허용·단계 완료를 구분한다.

## 개별 실행 전수 결과

영문 제목은 실제 검사 식별자를 보존한다. 중복 문자열은 label/원출력행으로 구분한다.
과거 source의 결과는 당시 이력이며 최종 source 결과로 재사용하지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| red:build | C++ 빌드 준비 — 준비 실패: fixture 미사용 함수 -Werror. 예상 RED 아님 | fail | 예상 RED 아님 |
| red2:2 | FE01 expected file_evidence on actual writer binding (feature absent) | fail | 당시 source 이력; 실행표 한계 참조 |
| green1:build | C++ 빌드 준비 — 구현 컴파일 실패: size_t/uint64_t 동시 auto 선언 | fail | 예상 RED 아님 |
| green2:2 | FE01 actual writer file_evidence persisted | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:2 | FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:3 | FE04 bound finalized mutation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:4 | FE04 bound finalized mutation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:6 | FE02 expected segment count | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:7 | FE01 expected file_evidence on actual writer binding (feature absent) | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:8 | FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:10 | FE01 expected file_evidence on actual writer binding (feature absent) | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:11 | FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:13 | FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:14 | FE04 bound finalized mutation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:16 | FE02 expected segment count | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:17 | FE01 expected file_evidence on actual writer binding (feature absent) | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:18 | FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:20 | FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:21 | FE04 bound finalized mutation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:23 | FE02 expected segment count | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:24 | FE01 expected file_evidence on actual writer binding (feature absent) | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:25 | FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:27 | FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:28 | FE04 bound finalized mutation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:30 | FE02 expected segment count | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:31 | FE01 expected file_evidence on actual writer binding (feature absent) | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:32 | FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:34 | FE01 strict evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:35 | FE01 absent existing bytes unchanged | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:36 | FE06 reject ordinal | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:37 | FE06 reject original PTS | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:38 | FE06 reject origin | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:39 | FE06 reject mux DTS | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:40 | FE06 reject native PTS | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:41 | FE06 reject native duration | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:42 | FE06 reject timescale | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:43 | FE06 reject duplicate VCL | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:44 | FE06 reject duplicate raw | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:45 | FE06 reject missing sample | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:46 | FE06 reject profile | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:47 | FE06 reject hash format | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:48 | FE06 reject overflow | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:49 | FE06 reject file hash binding | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:50 | FE06 unknown duplicate or oversize JSON | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:51 | FE06 unknown duplicate or oversize JSON | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:52 | FE06 unknown duplicate or oversize JSON | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:53 | FE06 reject evidence version | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:54 | FE03 reject zero box with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:55 | FE03 reject duplicate box with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:56 | FE03 reject outside mdat with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:57 | FE03 reject table count with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:58 | FE03 reject sample count overflow with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:59 | FE03 reject box overflow with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:60 | FE03 reject edit rate with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:61 | FE03 reject edit version with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:62 | FE03 reject truncated with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:63 | FE05 journal reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:64 | FE05 SQLite reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:65 | FE05 exact evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:66 | FE05 checkpoint | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:68 | FE05 journal reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:69 | FE05 JSONL fallback reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:70 | FE05 exact evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:71 | FE04 write exact evidence Ready | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:72 | FE05 Ready journal | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:73 | FE05 Ready catalog | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:74 | FE05 Ready replay actual file verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:75 | FE04 Ready cleaned | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:76 | FE06 forged sample hash physical Ready refusal | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:77 | FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:78 | FE04 bound finalized mutation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:80 | FE07 4096 single segment | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:81 | FE07 actual4096 within2MiB | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:83 | FE07 structure-only validation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:84 | FE07 structure-only validation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:85 | FE07 structure-only validation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:86 | FE07 structure-only validation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:87 | FE07 structure-only validation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:88 | FE07 structure-only validation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:89 | FE07 structure-only validation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:90 | FE07 structure-only validation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:91 | FE07 structure-only validation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:92 | FE07 structure-only validation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:94 | FE07 4097 structure refusal | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:96 | FE07 two evidence or legacy-eight intent roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:99 | FE07 two evidence or legacy-eight intent roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:101 | FE07 two evidence or legacy-eight intent roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:102 | FE05 journal reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:103 | FE05 SQLite reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:104 | FE05 exact evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:105 | FE05 checkpoint | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:107 | FE05 journal reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:108 | FE05 JSONL fallback reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:109 | FE05 exact evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:110 | FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:112 | FE04 bound finalized mutation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:114 | FE08 cap keeps existing recording | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:115 | FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:117 | FE04 bound finalized mutation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:119 | FE08 ambiguous VCL keeps recording | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:120 | FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:122 | FE04 bound finalized mutation | pass | 당시 source 이력; 실행표 한계 참조 |
| full1:124 | FE08 unsupported original DTS keeps recording | pass | 당시 source 이력; 실행표 한계 참조 |
| full2:build | C++ 빌드 준비 — 검증 컴파일 실패: private API 직접 호출. 실제 admission 경로로 수정 | fail | 예상 RED 아님 |
| full3:2 | actual-1 FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:3 | actual-1 FE04 bound finalized mutation segment0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:4 | actual-1 FE04 bound finalized mutation segment1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:6 | actual-1 FE02 expected segment count | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:7 | TP01/segment0 FE01 actual evidence persisted | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:8 | TP01/segment0 FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:10 | TP01/segment1 FE01 actual evidence persisted | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:11 | TP01/segment1 FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:13 | actual-2 FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:14 | actual-2 FE04 bound finalized mutation segment0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:16 | actual-2 FE02 expected segment count | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:17 | TP02/segment0 FE01 actual evidence persisted | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:18 | TP02/segment0 FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:20 | actual-3 FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:21 | actual-3 FE04 bound finalized mutation segment0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:23 | actual-3 FE02 expected segment count | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:24 | TP03/segment0 FE01 actual evidence persisted | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:25 | TP03/segment0 FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:27 | actual-4 FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:28 | actual-4 FE04 bound finalized mutation segment0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:30 | actual-4 FE02 expected segment count | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:31 | TP04/segment0 FE01 actual evidence persisted | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:32 | TP04/segment0 FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:34 | TP01/contract FE01 strict evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:35 | TP01/contract FE01 absent existing bytes unchanged | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:36 | TP01/contract FE06 reject ordinal | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:37 | TP01/contract FE06 reject original PTS | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:38 | TP01/contract FE06 reject origin | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:39 | TP01/contract FE06 reject mux DTS | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:40 | TP01/contract FE06 reject native PTS | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:41 | TP01/contract FE06 reject native duration | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:42 | TP01/contract FE06 reject timescale | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:43 | TP01/contract FE06 reject duplicate VCL | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:44 | TP01/contract FE06 reject duplicate raw | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:45 | TP01/contract FE06 reject missing sample | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:46 | TP01/contract FE06 reject profile | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:47 | TP01/contract FE06 reject hash format | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:48 | TP01/contract FE06 reject overflow | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:49 | TP01/contract FE06 reject file hash binding | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:50 | TP01/contract FE06 JSON unknown field | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:51 | TP01/contract FE06 JSON duplicate field | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:52 | TP01/contract FE06 JSON oversize | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:53 | TP01/contract FE06 reject evidence version | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:54 | TP01/malformed FE03 reject zero box with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:55 | TP01/malformed FE03 reject duplicate box with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:56 | TP01/malformed FE03 reject outside mdat with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:57 | TP01/malformed FE03 reject table count with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:58 | TP01/malformed FE03 reject sample count overflow with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:59 | TP01/malformed FE03 reject box overflow with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:60 | TP01/malformed FE03 reject edit rate with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:61 | TP01/malformed FE03 reject edit version with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:62 | TP01/malformed FE03 reject truncated with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:63 | actual-1/sqlite/checkpoint FE05 journal reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:64 | actual-1/sqlite/checkpoint FE05 SQLite reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:65 | actual-1/sqlite/checkpoint FE05 exact evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:66 | actual-1/sqlite/checkpoint FE05 checkpoint | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:68 | actual-1/jsonl/replay FE05 journal reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:69 | actual-1/jsonl/replay FE05 JSONL fallback reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:70 | actual-1/jsonl/replay FE05 exact evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:71 | actual-1/ready FE04 write exact evidence Ready | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:72 | actual-1/ready FE05 Ready journal | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:73 | actual-1/ready FE05 Ready catalog | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:74 | actual-1/ready FE05 Ready replay actual file verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:75 | actual-1/ready FE04 Ready cleaned | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:76 | actual-1/ready FE06 forged sample hash physical Ready refusal | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:77 | cap4096 FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:78 | cap4096 FE04 bound finalized mutation segment0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:80 | cap4096 FE07 4096 single segment | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:81 | cap4096/capacity FE07 actual4096 within2MiB | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:83 | cap4096/capacity FE07 structure-only validation iteration0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:84 | cap4096/capacity FE07 structure-only validation iteration1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:85 | cap4096/capacity FE07 structure-only validation iteration2 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:86 | cap4096/capacity FE07 structure-only validation iteration3 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:87 | cap4096/capacity FE07 structure-only validation iteration4 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:88 | cap4096/capacity FE07 structure-only validation iteration5 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:89 | cap4096/capacity FE07 structure-only validation iteration6 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:90 | cap4096/capacity FE07 structure-only validation iteration7 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:91 | cap4096/capacity FE07 structure-only validation iteration8 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:92 | cap4096/capacity FE07 structure-only validation iteration9 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:94 | cap4096/capacity FE07 4097 structure refusal | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:96 | cap4096/capacity FE07 intent roundtrip source2 legacy0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:98 | cap4096/capacity FE07 intent roundtrip source8 legacy0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:100 | cap4096/capacity FE07 intent roundtrip source2 legacy1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:101 | cap4096/capacity FE08 projection preserves full intent bytes and ID source2 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:103 | cap4096/capacity FE07 intent roundtrip source8 legacy1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:104 | cap4096/capacity FE08 projection preserves full intent bytes and ID source8 | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:105 | cap4096/sqlite/checkpoint FE05 journal reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:106 | cap4096/sqlite/checkpoint FE05 SQLite reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:107 | cap4096/sqlite/checkpoint FE05 exact evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:108 | cap4096/sqlite/checkpoint FE05 checkpoint | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:110 | cap4096/jsonl/replay FE05 journal reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:111 | cap4096/jsonl/replay FE05 JSONL fallback reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:112 | cap4096/jsonl/replay FE05 exact evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:113 | cap4096/legacy-job FE08 new job identity and bytes unchanged | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:114 | cap4096/legacy-job FE08 invalid optional proof is rejected before projection | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:115 | cap4096/legacy-job FE08 preexisting proof job retains proof and ID | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:116 | cap4096/legacy-job FE08 compatibility journal | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:117 | cap4096/legacy-job FE08 compatibility catalog | pass | 당시 source 이력; 실행표 한계 참조 |
| full3:123 | cap4096/legacy-job FE08 legacy job accepts exact live identity with optional proof | fail | 당시 source 이력; 실행표 한계 참조 |
| full4:build | C++ 빌드 준비 — 검증 컴파일 실패: admission 결과의 message 대신 reason 참조 | fail | 예상 RED 아님 |
| full5:2 | actual-1 FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:3 | actual-1 FE04 bound finalized mutation segment0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:4 | actual-1 FE04 bound finalized mutation segment1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:6 | actual-1 FE02 expected segment count | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:7 | TP01/segment0 FE01 actual evidence persisted | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:8 | TP01/segment0 FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:10 | TP01/segment1 FE01 actual evidence persisted | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:11 | TP01/segment1 FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:13 | actual-2 FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:14 | actual-2 FE04 bound finalized mutation segment0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:16 | actual-2 FE02 expected segment count | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:17 | TP02/segment0 FE01 actual evidence persisted | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:18 | TP02/segment0 FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:20 | actual-3 FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:21 | actual-3 FE04 bound finalized mutation segment0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:23 | actual-3 FE02 expected segment count | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:24 | TP03/segment0 FE01 actual evidence persisted | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:25 | TP03/segment0 FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:27 | actual-4 FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:28 | actual-4 FE04 bound finalized mutation segment0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:30 | actual-4 FE02 expected segment count | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:31 | TP04/segment0 FE01 actual evidence persisted | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:32 | TP04/segment0 FE02 physical native and hash verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:34 | TP01/contract FE01 strict evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:35 | TP01/contract FE01 absent existing bytes unchanged | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:36 | TP01/contract FE06 reject ordinal | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:37 | TP01/contract FE06 reject original PTS | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:38 | TP01/contract FE06 reject origin | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:39 | TP01/contract FE06 reject mux DTS | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:40 | TP01/contract FE06 reject native PTS | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:41 | TP01/contract FE06 reject native duration | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:42 | TP01/contract FE06 reject timescale | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:43 | TP01/contract FE06 reject duplicate VCL | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:44 | TP01/contract FE06 reject duplicate raw | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:45 | TP01/contract FE06 reject missing sample | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:46 | TP01/contract FE06 reject profile | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:47 | TP01/contract FE06 reject hash format | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:48 | TP01/contract FE06 reject overflow | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:49 | TP01/contract FE06 reject file hash binding | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:50 | TP01/contract FE06 JSON unknown field | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:51 | TP01/contract FE06 JSON duplicate field | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:52 | TP01/contract FE06 JSON oversize | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:53 | TP01/contract FE06 reject evidence version | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:54 | TP01/malformed FE03 reject zero box with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:55 | TP01/malformed FE03 reject duplicate box with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:56 | TP01/malformed FE03 reject outside mdat with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:57 | TP01/malformed FE03 reject table count with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:58 | TP01/malformed FE03 reject sample count overflow with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:59 | TP01/malformed FE03 reject box overflow with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:60 | TP01/malformed FE03 reject edit rate with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:61 | TP01/malformed FE03 reject edit version with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:62 | TP01/malformed FE03 reject truncated with recomputed file hash | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:63 | actual-1/sqlite/checkpoint FE05 journal reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:64 | actual-1/sqlite/checkpoint FE05 SQLite reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:65 | actual-1/sqlite/checkpoint FE05 exact evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:66 | actual-1/sqlite/checkpoint FE05 checkpoint | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:68 | actual-1/jsonl/replay FE05 journal reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:69 | actual-1/jsonl/replay FE05 JSONL fallback reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:70 | actual-1/jsonl/replay FE05 exact evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:71 | actual-1/ready FE04 write exact evidence Ready | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:72 | actual-1/ready FE05 Ready journal | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:73 | actual-1/ready FE05 Ready catalog | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:74 | actual-1/ready FE05 Ready replay actual file verification | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:75 | actual-1/ready FE04 Ready cleaned | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:76 | actual-1/ready FE06 forged sample hash physical Ready refusal | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:77 | cap4096 FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:78 | cap4096 FE04 bound finalized mutation segment0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:80 | cap4096 FE07 4096 single segment | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:81 | cap4096/capacity FE07 actual4096 within2MiB | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:83 | cap4096/capacity FE07 structure-only validation iteration0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:84 | cap4096/capacity FE07 structure-only validation iteration1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:85 | cap4096/capacity FE07 structure-only validation iteration2 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:86 | cap4096/capacity FE07 structure-only validation iteration3 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:87 | cap4096/capacity FE07 structure-only validation iteration4 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:88 | cap4096/capacity FE07 structure-only validation iteration5 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:89 | cap4096/capacity FE07 structure-only validation iteration6 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:90 | cap4096/capacity FE07 structure-only validation iteration7 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:91 | cap4096/capacity FE07 structure-only validation iteration8 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:92 | cap4096/capacity FE07 structure-only validation iteration9 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:94 | cap4096/capacity FE07 4097 structure refusal | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:96 | cap4096/capacity FE07 intent roundtrip source2 legacy0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:98 | cap4096/capacity FE07 intent roundtrip source8 legacy0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:100 | cap4096/capacity FE07 intent roundtrip source2 legacy1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:101 | cap4096/capacity FE08 projection preserves full intent bytes and ID source2 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:103 | cap4096/capacity FE07 intent roundtrip source8 legacy1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:104 | cap4096/capacity FE08 projection preserves full intent bytes and ID source8 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:105 | cap4096/sqlite/checkpoint FE05 journal reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:106 | cap4096/sqlite/checkpoint FE05 SQLite reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:107 | cap4096/sqlite/checkpoint FE05 exact evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:108 | cap4096/sqlite/checkpoint FE05 checkpoint | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:110 | cap4096/jsonl/replay FE05 journal reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:111 | cap4096/jsonl/replay FE05 JSONL fallback reopen | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:112 | cap4096/jsonl/replay FE05 exact evidence roundtrip | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:113 | cap4096/legacy-job FE08 new job identity and bytes unchanged | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:114 | cap4096/legacy-job FE08 invalid optional proof is rejected before projection | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:115 | cap4096/legacy-job FE08 preexisting proof job retains proof and ID | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:116 | cap4096/legacy-job FE08 compatibility journal | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:117 | cap4096/legacy-job FE08 compatibility catalog | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:118 | cap4096/legacy-job FE08 admission policy registered | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:119 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:120 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:121 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant2 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:122 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant3 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:123 | cap4096/legacy-job FE08 proof job requires full live evidence match | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:124 | cap4096/legacy-job FE08 legacy job accepts exact live identity with optional proof | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:125 | cap4096/legacy-job FE08 proof job accepts exact full live proof | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:126 | cap4096/legacy-job FE08 proof and legacy job checkpoint | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:127 | cap4096/legacy-job FE08 job recovery journal sql1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:128 | cap4096/legacy-job FE08 job recovery catalog sql1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:129 | cap4096/legacy-job FE08 immutable recovered job proof0 sql1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:130 | cap4096/legacy-job FE08 immutable recovered job proof1 sql1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:131 | cap4096/legacy-job FE08 job recovery journal sql0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:132 | cap4096/legacy-job FE08 job recovery catalog sql0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:133 | cap4096/legacy-job FE08 immutable recovered job proof0 sql0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:134 | cap4096/legacy-job FE08 immutable recovered job proof1 sql0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:135 | cap4096/catalog8 FE07 catalog8 reserve0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:136 | cap4096/catalog8 FE07 catalog8 verify outside catalog0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:137 | cap4096/catalog8 FE07 catalog8 commit0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:139 | cap4096/catalog8 FE07 catalog8 reserve1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:140 | cap4096/catalog8 FE07 catalog8 verify outside catalog1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:141 | cap4096/catalog8 FE07 catalog8 commit1 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:143 | cap4096/catalog8 FE07 catalog8 reserve2 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:144 | cap4096/catalog8 FE07 catalog8 verify outside catalog2 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:145 | cap4096/catalog8 FE07 catalog8 commit2 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:147 | cap4096/catalog8 FE07 catalog8 reserve3 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:148 | cap4096/catalog8 FE07 catalog8 verify outside catalog3 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:149 | cap4096/catalog8 FE07 catalog8 commit3 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:151 | cap4096/catalog8 FE07 catalog8 reserve4 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:152 | cap4096/catalog8 FE07 catalog8 verify outside catalog4 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:153 | cap4096/catalog8 FE07 catalog8 commit4 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:155 | cap4096/catalog8 FE07 catalog8 reserve5 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:156 | cap4096/catalog8 FE07 catalog8 verify outside catalog5 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:157 | cap4096/catalog8 FE07 catalog8 commit5 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:159 | cap4096/catalog8 FE07 catalog8 reserve6 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:160 | cap4096/catalog8 FE07 catalog8 verify outside catalog6 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:161 | cap4096/catalog8 FE07 catalog8 commit6 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:163 | cap4096/catalog8 FE07 catalog8 reserve7 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:164 | cap4096/catalog8 FE07 catalog8 verify outside catalog7 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:165 | cap4096/catalog8 FE07 catalog8 commit7 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:167 | cap4096/catalog8 FE07 catalog8 source snapshot | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:169 | cap4096/catalog8 FE07 catalog8 checkpoint | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:171 | cap4097 FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:173 | cap4097 FE04 bound finalized mutation segment0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:175 | cap4097 FE08 cap keeps existing recording | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:176 | duplicate FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:178 | duplicate FE04 bound finalized mutation segment0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:180 | duplicate FE08 ambiguous VCL keeps recording | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:181 | missing-dts FE02 writer start | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:183 | missing-dts FE04 bound finalized mutation segment0 | pass | 당시 source 이력; 실행표 한계 참조 |
| full5:185 | missing-dts FE08 unsupported original DTS keeps recording | pass | 당시 source 이력; 실행표 한계 참조 |
| cost-baseline:2 | actual-1 FE02 writer start | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:3 | actual-1 FE04 bound finalized mutation segment0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:4 | actual-1 FE04 bound finalized mutation segment1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:6 | actual-1 FE02 expected segment count | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:7 | TP01/segment0 FE01 actual evidence persisted | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:8 | TP01/segment0 FE02 physical native and hash verification | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:10 | TP01/segment1 FE01 actual evidence persisted | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:11 | TP01/segment1 FE02 physical native and hash verification | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:13 | actual-2 FE02 writer start | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:14 | actual-2 FE04 bound finalized mutation segment0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:16 | actual-2 FE02 expected segment count | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:17 | TP02/segment0 FE01 actual evidence persisted | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:18 | TP02/segment0 FE02 physical native and hash verification | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:20 | actual-3 FE02 writer start | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:21 | actual-3 FE04 bound finalized mutation segment0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:23 | actual-3 FE02 expected segment count | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:24 | TP03/segment0 FE01 actual evidence persisted | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:25 | TP03/segment0 FE02 physical native and hash verification | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:27 | actual-4 FE02 writer start | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:28 | actual-4 FE04 bound finalized mutation segment0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:30 | actual-4 FE02 expected segment count | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:31 | TP04/segment0 FE01 actual evidence persisted | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:32 | TP04/segment0 FE02 physical native and hash verification | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:34 | TP01/contract FE01 strict evidence roundtrip | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:35 | TP01/contract FE01 absent existing bytes unchanged | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:36 | TP01/contract FE06 reject ordinal | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:37 | TP01/contract FE06 reject original PTS | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:38 | TP01/contract FE06 reject origin | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:39 | TP01/contract FE06 reject mux DTS | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:40 | TP01/contract FE06 reject native PTS | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:41 | TP01/contract FE06 reject native duration | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:42 | TP01/contract FE06 reject timescale | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:43 | TP01/contract FE06 reject duplicate VCL | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:44 | TP01/contract FE06 reject duplicate raw | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:45 | TP01/contract FE06 reject missing sample | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:46 | TP01/contract FE06 reject profile | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:47 | TP01/contract FE06 reject hash format | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:48 | TP01/contract FE06 reject overflow | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:49 | TP01/contract FE06 reject file hash binding | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:50 | TP01/contract FE06 JSON unknown field | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:51 | TP01/contract FE06 JSON duplicate field | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:52 | TP01/contract FE06 JSON oversize | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:53 | TP01/contract FE06 reject evidence version | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:54 | TP01/malformed FE03 reject zero box with recomputed file hash | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:55 | TP01/malformed FE03 reject duplicate box with recomputed file hash | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:56 | TP01/malformed FE03 reject outside mdat with recomputed file hash | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:57 | TP01/malformed FE03 reject table count with recomputed file hash | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:58 | TP01/malformed FE03 reject sample count overflow with recomputed file hash | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:59 | TP01/malformed FE03 reject box overflow with recomputed file hash | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:60 | TP01/malformed FE03 reject edit rate with recomputed file hash | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:61 | TP01/malformed FE03 reject edit version with recomputed file hash | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:62 | TP01/malformed FE03 reject truncated with recomputed file hash | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:63 | actual-1/sqlite/checkpoint FE05 journal reopen | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:64 | actual-1/sqlite/checkpoint FE05 SQLite reopen | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:65 | actual-1/sqlite/checkpoint FE05 exact evidence roundtrip | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:66 | actual-1/sqlite/checkpoint FE05 checkpoint | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:68 | actual-1/jsonl/replay FE05 journal reopen | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:69 | actual-1/jsonl/replay FE05 JSONL fallback reopen | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:70 | actual-1/jsonl/replay FE05 exact evidence roundtrip | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:71 | actual-1/ready FE04 write exact evidence Ready | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:72 | actual-1/ready FE05 Ready journal | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:73 | actual-1/ready FE05 Ready catalog | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:74 | actual-1/ready FE05 Ready replay actual file verification | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:75 | actual-1/ready FE04 Ready cleaned | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:76 | actual-1/ready FE06 forged sample hash physical Ready refusal | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:77 | cap4096 FE02 writer start | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:78 | cap4096 FE04 bound finalized mutation segment0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:80 | cap4096 FE07 4096 single segment | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:81 | cap4096/capacity FE07 actual4096 within2MiB | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:83 | cap4096/capacity FE07 structure-only validation iteration0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:84 | cap4096/capacity FE07 structure-only validation iteration1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:85 | cap4096/capacity FE07 structure-only validation iteration2 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:86 | cap4096/capacity FE07 structure-only validation iteration3 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:87 | cap4096/capacity FE07 structure-only validation iteration4 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:88 | cap4096/capacity FE07 structure-only validation iteration5 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:89 | cap4096/capacity FE07 structure-only validation iteration6 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:90 | cap4096/capacity FE07 structure-only validation iteration7 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:91 | cap4096/capacity FE07 structure-only validation iteration8 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:92 | cap4096/capacity FE07 structure-only validation iteration9 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:94 | cap4096/capacity FE07 4097 structure refusal | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:96 | cap4096/capacity FE07 intent roundtrip source2 legacy0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:98 | cap4096/capacity FE07 intent roundtrip source8 legacy0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:100 | cap4096/capacity FE07 intent roundtrip source2 legacy1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:101 | cap4096/capacity FE08 projection preserves full intent bytes and ID source2 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:103 | cap4096/capacity FE07 intent roundtrip source8 legacy1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:104 | cap4096/capacity FE08 projection preserves full intent bytes and ID source8 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:105 | cap4096/sqlite/checkpoint FE05 journal reopen | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:106 | cap4096/sqlite/checkpoint FE05 SQLite reopen | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:107 | cap4096/sqlite/checkpoint FE05 exact evidence roundtrip | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:108 | cap4096/sqlite/checkpoint FE05 checkpoint | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:110 | cap4096/jsonl/replay FE05 journal reopen | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:111 | cap4096/jsonl/replay FE05 JSONL fallback reopen | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:112 | cap4096/jsonl/replay FE05 exact evidence roundtrip | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:113 | cap4096/legacy-job FE08 new job identity and bytes unchanged | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:114 | cap4096/legacy-job FE08 invalid optional proof is rejected before projection | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:115 | cap4096/legacy-job FE08 preexisting proof job retains proof and ID | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:116 | cap4096/legacy-job FE08 compatibility journal | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:117 | cap4096/legacy-job FE08 compatibility catalog | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:118 | cap4096/legacy-job FE08 admission policy registered | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:119 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:120 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:121 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant2 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:122 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant3 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:123 | cap4096/legacy-job FE08 proof job requires full live evidence match | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:124 | cap4096/legacy-job FE08 legacy job accepts exact live identity with optional proof | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:125 | cap4096/legacy-job FE08 proof job accepts exact full live proof | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:126 | cap4096/legacy-job FE08 proof and legacy job checkpoint | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:127 | cap4096/legacy-job FE08 job recovery journal sql1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:128 | cap4096/legacy-job FE08 job recovery catalog sql1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:129 | cap4096/legacy-job FE08 immutable recovered job proof0 sql1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:130 | cap4096/legacy-job FE08 immutable recovered job proof1 sql1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:131 | cap4096/legacy-job FE08 job recovery journal sql0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:132 | cap4096/legacy-job FE08 job recovery catalog sql0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:133 | cap4096/legacy-job FE08 immutable recovered job proof0 sql0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:134 | cap4096/legacy-job FE08 immutable recovered job proof1 sql0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:135 | cap4096/catalog8-evidence FE07 catalog8 reserve0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:136 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:137 | cap4096/catalog8-evidence FE07 catalog8 commit0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:139 | cap4096/catalog8-evidence FE07 catalog8 reserve1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:140 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:141 | cap4096/catalog8-evidence FE07 catalog8 commit1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:143 | cap4096/catalog8-evidence FE07 catalog8 reserve2 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:144 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog2 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:145 | cap4096/catalog8-evidence FE07 catalog8 commit2 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:147 | cap4096/catalog8-evidence FE07 catalog8 reserve3 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:148 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog3 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:149 | cap4096/catalog8-evidence FE07 catalog8 commit3 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:151 | cap4096/catalog8-evidence FE07 catalog8 reserve4 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:152 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog4 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:153 | cap4096/catalog8-evidence FE07 catalog8 commit4 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:155 | cap4096/catalog8-evidence FE07 catalog8 reserve5 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:156 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog5 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:157 | cap4096/catalog8-evidence FE07 catalog8 commit5 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:159 | cap4096/catalog8-evidence FE07 catalog8 reserve6 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:160 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog6 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:161 | cap4096/catalog8-evidence FE07 catalog8 commit6 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:163 | cap4096/catalog8-evidence FE07 catalog8 reserve7 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:164 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog7 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:165 | cap4096/catalog8-evidence FE07 catalog8 commit7 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:167 | cap4096/catalog8-evidence FE07 catalog8 source snapshot | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:169 | cap4096/catalog8-evidence FE07 catalog8 checkpoint | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:171 | cap4096/catalog8-legacy FE07 catalog8 reserve0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:172 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:173 | cap4096/catalog8-legacy FE07 catalog8 commit0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:175 | cap4096/catalog8-legacy FE07 catalog8 reserve1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:176 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:177 | cap4096/catalog8-legacy FE07 catalog8 commit1 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:179 | cap4096/catalog8-legacy FE07 catalog8 reserve2 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:180 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog2 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:181 | cap4096/catalog8-legacy FE07 catalog8 commit2 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:183 | cap4096/catalog8-legacy FE07 catalog8 reserve3 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:184 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog3 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:185 | cap4096/catalog8-legacy FE07 catalog8 commit3 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:187 | cap4096/catalog8-legacy FE07 catalog8 reserve4 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:188 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog4 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:189 | cap4096/catalog8-legacy FE07 catalog8 commit4 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:191 | cap4096/catalog8-legacy FE07 catalog8 reserve5 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:192 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog5 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:193 | cap4096/catalog8-legacy FE07 catalog8 commit5 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:195 | cap4096/catalog8-legacy FE07 catalog8 reserve6 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:196 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog6 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:197 | cap4096/catalog8-legacy FE07 catalog8 commit6 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:199 | cap4096/catalog8-legacy FE07 catalog8 reserve7 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:200 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog7 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:201 | cap4096/catalog8-legacy FE07 catalog8 commit7 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:203 | cap4096/catalog8-legacy FE07 catalog8 source snapshot | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:205 | cap4096/catalog8-legacy FE07 catalog8 checkpoint | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:207 | cap4097 FE02 writer start | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:209 | cap4097 FE04 bound finalized mutation segment0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:211 | cap4097 FE08 cap keeps existing recording | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:212 | duplicate FE02 writer start | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:214 | duplicate FE04 bound finalized mutation segment0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:216 | duplicate FE08 ambiguous VCL keeps recording | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:217 | missing-dts FE02 writer start | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:219 | missing-dts FE04 bound finalized mutation segment0 | pass | 최종 focused; 전체 완료 아님 |
| cost-baseline:221 | missing-dts FE08 unsupported original DTS keeps recording | pass | 최종 focused; 전체 완료 아님 |

전수 결과 530행. 무효 5행은 아래 별도 상태로 보존한다.

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| full3:118 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant0 | policy 선수조건 누락 | 원출력 pass지만 요구한 거부 원인 미검사; 무효 |
| full3:119 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant1 | policy 선수조건 누락 | 원출력 pass지만 요구한 거부 원인 미검사; 무효 |
| full3:120 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant2 | policy 선수조건 누락 | 원출력 pass지만 요구한 거부 원인 미검사; 무효 |
| full3:121 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant3 | policy 선수조건 누락 | 원출력 pass지만 요구한 거부 원인 미검사; 무효 |
| full3:122 | cap4096/legacy-job FE08 proof job requires full live evidence match | policy 선수조건 누락 | 원출력 pass지만 요구한 거부 원인 미검사; 무효 |

## 정리·미실행

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.gsTFfg | red 소유 빌드/store·media | 0B | 원출력 보존 후 삭제 | removed=true | red 로그 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.G2Bfib | red2 소유 빌드/store·media | 4377050B | 원출력 보존 후 삭제 | removed=true | red2 로그 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.ZTRwmu | green1 소유 빌드/store·media | 0B | 원출력 보존 후 삭제 | removed=true | green1 로그 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.iUlQTo | green2 소유 빌드/store·media | 4646986B | 원출력 보존 후 삭제 | removed=true | green2 로그 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.em26Tr | full1 소유 빌드/store·media | 18860347B | 원출력 보존 후 삭제 | removed=true | full1 로그 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.q5KYrR | full2 소유 빌드/store·media | 0B | 원출력 보존 후 삭제 | removed=true | full2 로그 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.saIuvT | full3 소유 빌드/store·media | 14308493B | 원출력 보존 후 삭제 | removed=true | full3 로그 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.6Hxet2 | full4 소유 빌드/store·media | 0B | 원출력 보존 후 삭제 | removed=true | full4 로그 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.FQqPQZ | full5 소유 빌드/store·media | 68586029B | 원출력 보존 후 삭제 | removed=true | full5 로그 |
| /private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.nGjTWP | cost-baseline 소유 빌드/store·media | 100986707B | 원출력 보존 후 삭제 | removed=true | cost-baseline 로그 |

최종 runner elapsed34초, token start/end/consumed는 실제 집계 소스 부재로 미집계.
새 서버·port·계정·브라우저·외부 영상 사용 없음. 생성 영상·소유 root는 삭제하고 숫자/실패 로그만 보존했다.

| 항목 | 상태 | 다음 조건 |
| --- | --- | --- |
| 3-B 저장 비용 | 미해소 | 최소 영속 표현/중복 처리 설계 대조. 안전 계약 변경 전 사용자 판단 |
| source-binding/write-boundaries/finalize 영향 회귀 | 미실행 | 비용 보완 및 source 고정 뒤 실행 |
| 전체 build | 미실행 | 비용 보완 뒤 제품 링크·ABI 확인 |
| 명시적 VP8 실파일·최악 숫자4096 envelope | 미실행 | 기존 지원/상한 확인 뒤3-B 종료 |
| 4번 WP01~10 | 미구현·미실행 | 3-B 합격 후 |
| 5번 공통 소비·실제 통합 | 범위 밖·잔여 | 4번 이후 별도 지시 |
| S11 30분·UI·120분 | 미실행 | 준비/코드 고정/정확 묶음·승인. UI 제외 유지 |
| 3-B/4 커밋·최종 push | 미수행 | 단계 완료 조건 충족 후 기존 승인 범위 수행 |

다음 수정은 증거·원본 식별·정확 시간 계약을 유지해야 한다. 새로운 저장소 수명/복구 계약이나
checkpoint 검증 책임 이동을 이 실패 보완에 자동으로 끼워 넣지 않는다.
