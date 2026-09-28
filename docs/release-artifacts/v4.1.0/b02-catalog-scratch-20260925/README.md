# B02-Y Catalog 비공개 복원 후보 실행 자료

독자: 녹화 저장 구현·검증 담당자. 수명: B-02 구현부터 S11 최종 판정까지.
정책은 AGENTS.md, 실행 판정은 `docs/release-test-records.md`의 B02-Y 결과 표를 따른다.
이 디렉터리는 비공개 복원 후보의 단기 증거이며 공개 B Open·SQLite·Append·Checkpoint,
누적 비용 또는 S11 최종 PASS를 뜻하지 않는다.

| 자료 | 명령·결과 | 보존 이유 |
| --- | --- | --- |
| `b02-generation-scratch-red.log` | 구현 전 focused 예상 assertion RED, exit 1 | 최초 실패 보존 |
| `b02-generation-scratch-green.log` | 초기 기본 경로 GREEN, exit 0 | 기본 경계 이력 |
| `b02-generation-scratch-cases.log` | 추가 이벤트 fixture wrapper 오류, exit 1 | 제품 실패와 fixture 실패 구분 |
| `b02-generation-scratch-cases-fixed.log` | 예약 역순을 Journal Open이 먼저 거부했으나 fixture oracle이 성공을 요구, exit 2 | 선행 거부 위치 정정 이력 |
| `b02-generation-scratch-final.log` | runner 실행 비트 누락으로 dispatch 사전검사 exit 1, 제품 검사 미실행 | 준비 실패 보존 |
| `b02-generation-scratch-final-executable.log` | 공개 focused 16/16 PASS, exit 0 | 보강 전 직접 증거 |
| `b02-generation-scratch-reopen.log` | 재Open assertion 추가 후 공개 focused 17/17 PASS, exit 0 | 활성 source resident 검사 추가 전 이력 |
| `b02-generation-scratch-build.log` | `./server.sh build` exit 0 | 제품 컴파일 |
| `b02-generation-scratch-v1.log.gz` | `./server.sh verify-v410-recording-catalog` exit 0, 249 PASS | 기존 v1 원출력 무손실 압축 |
| `b02-generation-scratch-journal.log` | `./server.sh verify-v410-recording-journal-generation-readonly` exit 0, 78 PASS | B Journal 권위 영향 회귀 |
| `b02-generation-scratch-inventory.log` | `./server.sh verify-project-inventory` 최종 exit 0, 18/18 | 986개 기존 기능 행과 새 내부 ID 등록의 분리 확인 |
| `b02-generation-scratch-inventory-final.log` | 활성 source 수명 수정 후 같은 인벤토리 검사 exit 0, 18/18 | 최종 코드·문서 결속 확인 |
| `inventory-initial-failure.txt` | 해시 갱신 전 인벤토리 검사 exit 1·17/18 요약 | 최초 전체 stdout 미보존을 명시한 실패 이력 |
| `b02-generation-scratch-active-resident-red.log` | Y03 활성 source 보관 oracle 보강 후 예상 RED, exit 1 | 이전 17/17의 검사 공백 보존 |
| `b02-generation-scratch-active-resident-green.log` | 활성 source 수명 수정 후 focused 17/17 PASS, exit 0 | 최종 제품 단기 원출력 |
| `b02-generation-scratch-active-resident-build.log` | 수정 후 `./server.sh build` exit 0 | 제품 재컴파일 |
| `b02-generation-scratch-active-resident-v1.log.gz` | 수정 후 v1 Catalog 249/249 PASS, exit 0 | 기존 경로 원출력 무손실 압축 |

v1 원로그 두 개는 원출력의 줄 끝 공백을 바꾸지 않도록 gzip으로 무손실 보존했다.
압축 해제 SHA-256은 각각 `bff9f573b83e1959225378c64a08b85af0428b2502227483b031e50a54e1b3bf`,
`a0f239ccde95373d161bfd6d6aca86fb5552f584fa24fc6d60bc30a06931e9e0`으로 원본과 같다.
기록의 로컬 경로·source hash는 재현용이며 비밀번호·인증 토큰·원본 source URL은
포함하지 않도록 확인했다. 실행 소유 fixture는 각 로그의 `removed=true`로 정리됐고,
이 디렉터리는 실패 이력·개별 PASS·source provenance 확인을 위해 보존한다.
토큰 시작·끝·소비량을 제공하는 계측 source는 없어 미집계다.
