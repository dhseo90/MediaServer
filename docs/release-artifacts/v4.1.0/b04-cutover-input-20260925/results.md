# B-04 원문 전환 준비 결과

독자: 녹화 저장 구현·검증 담당자. 수명: 전환 준비 reader의 과거 증거.
정책은 AGENTS.md, 현재 단계는 중앙 테스트 기록을 따른다. 형식 전환 완료 증거는 아니다.

## 결과와 경계

`VisitRecordingCutoverInput`은 빌린 FD를 pread로 한 행씩 읽는다. 기존 strict16MiB 행 상한,
plain outer 공백·순서·추가 필드, payload 표현, 압축 wrapper·receipt·같은 ID 물리 재시도를
유지한다. 빈 LF는 ordinal을 소비하지 않는다. 원본 FD offset/내용을 쓰거나 닫지 않는다.
전체 길이/SHA와 전후 inode/device/size/mtime/ctime가 맞아야 summary를 채택한다.
실패 전에 일부 callback이 실행될 수 있어 비공개 후보에서만 사용한다. 경로/독점 lease·
Catalog domain·상태 전이·전환 게시/복구는 caller 및 다음 단위의 책임이다.

최종 focused는26 PASS/0 FAIL(P01=3/P02=1/P03=10/P04=8/P05=2/P06=2),
crypto-on25/off1이다. 1/4096행 비교는 순서·행별 callback·독립 전체 SHA 검사이며 RAM 실측이 아니다.
최종 실행은2026-09-25T07:38:37Z~07:38:41Z(4초), Darwin27 arm64·Apple clang21이다.
`./server.sh build`도 exit0이며 메인은 실제 diff·개별 원출력·hash와 cleanup을 대조했다.

| 원출력 | 실제 명령 | exit | 결과 |
| --- | --- | --- | --- |
| [예상 RED](red.log.gz) | `bash scripts/internal/verify_recording_cutover_input.sh` | 1 | stub의 정상 방문 거부1개 |
| [첫 구현](green-first.log.gz) | 같은 명령 | 1 | 18 PASS 뒤 crypto-off 검사 함수의 unused -Werror; 예상 RED 아님 |
| [컴파일 보완](green-final.log.gz) | 같은 명령 | 0 | 22 PASS |
| [최종 반례](final.log.gz) | 같은 명령 | 0 | 26 PASS |
| [전체 빌드](build.log.gz) | `./server.sh build` | 0 | 새 reader가 포함된 전체 제품 빌드 |

`server.sh verify-v410-recording-cutover-input` dispatch도 같은 runner에 연결했으며 중복 실행은 하지 않았다.
기존 Journal/Catalog cpp/header가54eaba09와 불변임을 직접 대조해 이전 Journal78/Catalog249 증거는
유지했다. 새 reader 검사만으로 이 기존 검사를 재실행했다고 주장하지 않는다.
기존 증거는 [앞 단위 결과](../b03-checkpoint-20260925/results.md)를 따른다.

문서 링크335파일/13,579링크/오류0, UI 자산10 PASS, 인벤토리986행/18 PASS와
`git diff --check` exit0도 확인했다. [정적 원출력 명세](static-artifact-manifest.json)와
[정적 개별 결과](static-individual-results.json.gz)에 실제 출력·정리를 보존한다.

## 정리·미실행

[원출력·정리 명세](artifact-manifest.json)에 각 파일의 SHA·byte·소유·실제 fixture 부재를,
[개별 결과](individual-results.json.gz)에 중간 실패를 포함한 전체 출력 행을 보존한다.
소유 fixture4개는 runner가 제거했다. 원문 로그는 gzip 해제 byte·소유/hash 대조 후 삭제하며
그 결과를 명세에 남긴다. 저장소 gzip에서 원출력을 복원할 수 있다. 제품 빌드는 유지한다.
실제 서버/포트/계정/영상·외부 데이터는 사용하지 않았다. 제품 전환·실제 앱·UI·30분·120분은
미실행이며 reader PASS로 대체하지 않는다. token start/end/consumed는 계측 source 부재로 미집계다.
