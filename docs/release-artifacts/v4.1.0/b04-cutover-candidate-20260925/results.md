# B-04 실제 원장의 비공개 전환 후보

독자: 녹화 저장 구현·검증 담당자. 수명: 게시 전 후보 생성의 구현 증거.
정책은 AGENTS.md, 현행 진행 상태는 중앙 테스트 기록을 따른다.

## 범위와 직접 확인

미개방 Catalog가 정당한 managed Journal에 붙어 원문 방문 세션의 각 행을 strict Apply한다.
원문·marker·SQLite·미디어·cleanup marker는 그대로 두고 caller 소유의 새 stage에
canonical archive, 최소 identity chain, 현재 snapshot, 빈 active를 생성한다.
archive는8MiB/4096행 목표로 나누며 큰 정상 단일 행은 쪼개지 않는다. 원문 전체 vector는 만들지 않는다.
16종 현재 값·accepted provenance·예약·pending hold를 독립 B projection과 대조하고
진행 작업의 원본만 resident로 유지한다. 비활성 최신 상세는 검증된 cold link로 남긴다.

원본 bytes 보존, 빈 LF/비정규 plain/압축 wrapper/receipt/동일 ID 물리 재시도,65조각,
9MiB 단일 행,4096행 및 byte 경계, 뒤 행 domain 실패, 쓰기/fsync·stage/파일 교체를 검사했다.
메인 검토에서 non-active 파일의 동일 bytes·다른 inode 교체를 발견하여 최종 소유 결박을
모든 파일에 적용했다. 새4개 반례는 사전등록한 C06에 포함한다. 생성 보고는 실패해도 보존한다.

결과는 변조 가능한 DTO이며 게시 권위가 아니다. stage 밖 실제 marker/manifest 게시,
중단 복구, runtime 기본 활성화, 실제 앱·총 RAM/HTTP·장시간·UI 완료는 주장하지 않는다.

## 실제 실행

집중 명령은 `bash scripts/internal/verify_recording_cutover_candidate.sh`다.
최종68 PASS/0 FAIL, exit0(C01=31/C02=3/C03=3/C04=6/C05=7/C06=12/C07=6),
backend/crypto 1/1·1/0·0/1 조합이다. 최종08:28:04~08:28:44 UTC,40초.
SQLite 활성 컴파일의 별도 focused 실행은 하지 않았다. 전체 서버 빌드 연결은 exit0이다.

| 원출력 | exit | 실제 결과·이력 |
| --- | --- | --- |
| red.log.gz | 1 | runner hash 참조 경로 오타. 컴파일 전 준비 실패이며 예상 RED가 아님 |
| red-ready.log.gz | 1 | stub 정상 후보 거부1 FAIL. 사전 지정 예상 RED |
| green-empty.log.gz | 0 | 3 PASS이나 실행 중 소스 변경으로 최종 증거 제외 |
| green-domain.log.gz | 1 | 4 PASS/1 FAIL. fixture의 선행 consumer reference 누락 |
| domain-diagnostic.log.gz | 1 | 4 PASS/1 FAIL. 고정 callback 오류에 가린 같은 원인을 상세 진단 |
| domain-fixed.log.gz | 0 | fixture의 정상 순서 보완 후27 PASS |
| expanded.log.gz | 0 | 반례 확장55 PASS |
| final.log.gz | 0 | 최초 최종64 PASS |
| final-inode.log.gz | 0 | 메인 소유 결박 리뷰 보완 후68 PASS |
| build.log.gz | 0 | `./server.sh build`, 신규 후보/stage writer 연결 |

[개별228행](individual-results.json.gz)은 중간/실패 이력을 포함하며 최종68에 중복 합산하지 않는다.
[소스31개 hash](source-sha256.json)는 메인이 현재 파일과 일치함을 확인했다.
메인은 후보·stage writer·smoke 실제 본문과 원출력을 직접 검토했다.
문서 링크338파일/오류0·자산10개·인벤토리986행/18개·diffcheck는 exit0이다.
기존986개 기능 행은 이전 커밋과 같으며 새 결과/사전등록으로 바뀐 문서 SHA만 재결박했다.
[정적 원출력](static-artifact-manifest.json)·[정적 개별 결과](static-individual-results.json.gz)에 보존한다.

## 검증 재사용 판정

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화: 후보·빌드 | 진행 대상 | 새 비공개 후보/파일 생성 경계 | B04-C01~C07, 위 명령 | 이번1~9번 승인 |
| 안정화: 기존 Journal/Catalog/B 읽기·쓰기 | 미진행(유효 증거 유지) | 기존 함수 본문·guard·runner 미변경, 헤더에는 private 선언/friend만 추가 | 73350277의 세션 기록: Journal78/Catalog249/append219/readonly106/checkpoint131 | 인계만으로 재실행하지 않음 |
| 30분/120분/UI | 미진행 | 제품 기본 미연결, 게시/복구 선행 미완료 | 원래9번 고정 뒤 영향 범위 판정 | 이번 후보 검사에서는 실행 안 함 |

## 보존·정리

[원출력·cleanup 명세](artifact-manifest.json)에10개 로그와9개 실행 디렉터리의 실제 크기를
기록했다. 로그 총57,413B이며 gzip의 원문 bytes/hash를 대조하여 보존한다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| 명세 cleanup9개 | 실행 전용 fixture/바이너리 | 명세의 개별 bytes | runner 소유 확인 후 삭제 | 메인 부재 확인 | artifact-manifest.json |
| 명세 source10개 | 원출력 로그 | 총57,413B | gzip 이관 후 삭제 | originalRemoved로 확인; gzip으로 복구 가능 | artifact-manifest.json |
| 이 디렉터리 | 비민감 증거 | 명세 참조 | 보존 | 기존 실패/중간 결과와 최종 소스 연결 | 중앙 기록 |

실제 서버/포트·운영 계정·외부 입력은 사용하지 않았다. build 산출물은 유지한다.
token start/end/consumed는 집계 source가 없어 미집계다. 각 focused 시각은 로그에 있고
빌드는 별도 시작/끝 시각이 없어 정확한 elapsed를 추정하지 않는다.
