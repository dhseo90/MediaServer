# B-04 원문 방문 세션과 snapshot 경계

독자: 녹화 저장 구현·검증 담당자. 수명: 형식 전환 준비의 과거 증거.
정책은 AGENTS.md, 현재 단계는 중앙 테스트 기록이 기준이다. 실제 형식 전환 완료 증거는 아니다.

## 구현 범위

정당한 기존 managed-format-v1 Journal과 Catalog attachment에만 private 동기 방문을 허용한다.
방문 중 Append·Reserve·Checkpoint·재Open·중첩 방문은 거부하고 읽기/cold 권위는 유지한다.
callback은 Journal 잠금 밖에서 실행한다. callback false/throw 뒤 freeze를 해제하고,
원본·marker·root·attachment·FD/lease 권위 상실은 poison으로 후속 읽기/쓰기를 차단한다.
원문·SQLite·미디어·cleanup marker를 변경하지 않는다.

원문 전체를 SHA 선계산과 strict 방문으로 두 번 streaming한다. 행별 logical identity,
range/ref와 전체 SHA·전후 stat를 대조한다. 행별 raw SHA를 별도 대조한 결과로 보고하지 않는다.
summary는 dev/inode를 포함하지 않으며 게시 단계는 새 freeze와 원본 결박을 다시 확인해야 한다.
미개방 Catalog의 내부 값 생성을 위한 private helper를 분리했으나 공개 export의
opened·owner·lease 검사는 그대로다. helper나 방문 성공은 게시 권위가 아니다.

## 실행 결과

집중 명령은 `bash scripts/internal/verify_recording_cutover_session.sh`다.
최종46 PASS/0 FAIL(S01=14/S02=5/S03=5/S04=10/S05=5/S06=7), exit0이다.
backend/crypto 1/1=42, 1/0=2, 0/1=2이며 최종 실행은
2026-09-25T07:58:29Z~07:58:48Z, 19초다. 최초 stub의 정상 방문 거부만 예상 RED다.
이 단위에는 준비·컴파일 실패가 없었다. 39→44→46개는 반례 보강에 따른 focused 재실행이다.

| 원출력 | 실제 명령 | exit | 개별 결과 |
| --- | --- | --- | --- |
| red.log.gz | 위 focused | 1 | stub 정상 방문1 FAIL, 예상 RED |
| green-first.log.gz | 위 focused | 0 | 39 PASS |
| final.log.gz | 위 focused | 0 | 44 PASS |
| final-binding.log.gz | 위 focused | 0 | 46 PASS |
| checkpoint-first.log.gz | `./server.sh verify-v410-recording-generation-checkpoint` | 0 | 기존123+S07 8개, 총131 PASS |
| journal.log.gz | `./server.sh verify-v410-recording-journal-generation-readonly` | 0 | 78 PASS |
| catalog.log.gz | `./server.sh verify-v410-recording-catalog` | 0 | 기존 관리/비관리·crypto-on/off 회귀249 PASS |
| append.log.gz | `./server.sh verify-v410-recording-generation-append` | 0 | 219 PASS |
| readonly.log.gz | `./server.sh verify-v410-recording-catalog-generation-readonly` | 0 | 106 PASS |
| build.log.gz | `./server.sh build` | 0 | 변경된 Journal·snapshot helper 전체 빌드 |

S07은 두 지원 조합에서 각각 미개방 owner·scratch 공개 거부, 내부 값의 exact snapshot byte 일치,
store 불일치 거부4개를 확인한다. 공개 권한을 테스트 bool로 우회하지 않는다.
최종 집중+영향 회귀는829개 assertion이며 중간39/44개를 최종 합계에 중복 합산하지 않는다.
문서 링크336파일/13,584링크/오류0, 자산10 PASS, inventory986행/18 PASS,
`git diff --check` exit0이다. [정적 원출력 명세](static-artifact-manifest.json)와
[정적 개별 결과](static-individual-results.json.gz)에 결과·정리를 보존한다.

## 증거·정리·한계

[원출력 명세](artifact-manifest.json)·[개별 결과](individual-results.json.gz)에 원출력·소유 정리를 보존한다. gzip 해제 byte/hash와
원문 소유를 확인한 뒤 원문 로그를 삭제하며 복구는 보존 gzip에서 가능하다.
fixture는 각 runner가 제거하고 메인이 부재를 대조한다. 제품 build 산출물은 유지한다.
실제 서버/포트·운영 계정·외부 데이터는 사용하지 않았다. Catalog domain 전환 후보,
marker/manifest 게시·중단 복구·서버 기본 활성화·실제 앱·UI·30분·120분은 이 결과로 대체하지 않는다.
token start/end/consumed는 실제 집계 source 부재로 미집계다. 개별 시각은 원출력 기준이며
기존 Catalog runner에는 별도 시작/끝 시각 출력이 없어 정확한 elapsed를 추정하지 않는다.
