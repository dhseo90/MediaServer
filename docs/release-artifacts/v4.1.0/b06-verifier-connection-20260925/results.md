# B-06 현행 검증 연결

독자: v4.1.0 검증 개발 담당자. 수명: B 저장 형식 연결과 S11 최종 증거 판정까지.
정책은 AGENTS.md, 사전 정의는 중앙 테스트 기록 B06-V01~V04다.

현행 검증기 연결과 관련 단기를 마쳤다. 제품 코드/공개 API/판정 시간제한을 바꾸지 않았다.
종료 복제본은 실제 Catalog, live는 기존 C++ 값 codec 기반 읽기 관측으로 구분한다.
원래7번의 범위이며 원래8번의 누적 비용·HTTP 통합과9번의 최종 판정은 별도다.

V03 최초 실제 B fixture 생성 후 `--observe-generation` dispatch 미구현의 고정 오류/exit1을
확인했다. 1개 예상 RED이며 fixture 생산·컴파일 실패는 아니다. 연결 후 초기9개 통과,
직접 검토에서 확정 prefix LF/과거 ordinal cut/receipt 시각/파일 시각 결박을 추가했다.
초기9개를 보완 소스의 최종 결과로 승계하지 않는다.

32MiB는 한 호출의 누적 파일 읽기와 출력 admission이며 C++ 객체/복사까지 포함한 RSS
보장이 아니다. 매 관측은 snapshot/identity와 현재 active 전체를 읽고 파싱한다. 이미 소비한
봉인 archive 상세만 다시 읽지 않는다. 이 비용은 원래8번에서 측정하며 `신규 자료만 처리`라고
확대하지 않는다. 이전 원문 이력 전수 재검증/제품 복구 PASS와도 다르다.

임시 root·원출력 정리와 개별 결과는 아래 보존 자료에서 이어 기록한다.
token start/end/consumed는 전용 집계 source 부재로 미집계다.

## 실제 실행 결과

원출력28개·개별 결과784행(중간 실행 포함)은 [실행 목록](execution-manifest.json),
[개별 결과](individual-results.json.gz)에 보존했다. 아래는 최종 소스에 유효한 결과만 적었다.
Node test wrapper 통과와 내부 assertion을 이중 가산하지 않는다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| V01 archive probe | `node --test scripts/internal/recording_current_archive_probe.test.mjs`, exit0·53개 | pass |
| V01 state/helper 영향 | `node --test scripts/internal/recording_current_state_diagnostics.test.mjs scripts/internal/recording_current_integration.test.mjs`, exit0·59개 | pass |
| V02 실제 seed | `bash scripts/internal/verify_recording_current_ui_seed.sh --self-test`, exit0·9개 | pass |
| V03 B 관측 | `bash scripts/internal/verify_recording_current_observer.sh --generation-self-test`, exit0·15개 | pass |
| V03 기존 관측 영향 | 같은 runner `--self-test`, exit0·67개 | pass |
| V04 용량 분류 | `node scripts/internal/recording_current_root_storage.test.mjs`, exit0·8개 | pass |
| V04 실제 hold cache | `node --test scripts/internal/recording_current_lifecycle_cache.test.mjs`, exit0·4개 | pass |
| 공통 관측/진단 영향 | observation·fixture_generation·http_diagnostics·longrun_diagnostics·longrun_progress·longrun_cadence·longrun_summary·archive_diagnostic_profile `.test.mjs` 8파일의 `node --test`, exit0·Node71개 및 wrapper 내부8/45/51개 | pass |

## 최초 실패와 보완

| 실행 | 실제 결과 | 조치·한계 |
| --- | --- | --- |
| probe RED | 정상 B fixture가 admission 미설정으로 거부(exit1) | 기존 C++ Catalog에 같은 검증용 byte/count 상한 전달 후53개 통과 |
| seed RED | 실제 B manifest 부재(exit1) | RuntimeStorage로 생성·재개방하고 기존 공개 기대값9개 유지 |
| 용량 RED | B 구성 파일이 기타로 분류(exit1) | 현재 cache와 세대별 자료·거래 준비물을 중복 없이 분류 |
| 관측 RED | 실제 B 준비 뒤 미구현 dispatch 고정 오류(exit1) | 기존 C++ codec·bounded nofollow 읽기 연결, 최초 root는 최소 증거 보존 뒤 정리 |
| 영향 helpers 최초 | 68 Node PASS·2 FAIL(exit1), 예상 RED 아님 | constructor exact anchor의 limits 전달과 전체 tree 불변 assertion으로 수정. 최종71개 통과 |

helpers 두 실패는 제품 회귀가 아니라 이번 검증기 변경으로 낡은 source anchor가 된 경계다.
계측 지점·중복 anchor 거부·15초/16KiB·최초 실패 보존은 유지했다. 옛 journal 한 파일 hash를
없앤 대신 모든 원본 파일의 경로·개수·크기·해시를 복사 전후 대조하며 손상 거부를 완화하지 않았다.

## 구현·소비자 대조

| 소비자 | 실제 연결·확인 | 유지/제외 |
| --- | --- | --- |
| 종료 probe | `recording_current_archive_probe.cpp` → 실제 read-only Catalog·B admission | 원본은 읽기/복제만, Runtime 전환을 진단에 넣지 않음 |
| UI seed | `recording_current_ui_seed.cpp` → RuntimeStorage/Catalog 예약·writer·파생 | 생성·재개방의 marker/manifest/구성파일 hash 불변. 실제 UI는 미실행 |
| live 관측 | `recording_generation_observation.h` → 기존 manifest/snapshot/identity/mutation codec | product lease·복구 authority 아님. 신규 행128개씩 반환, prefix·시각·ID 전수 대조 |
| longrun | 현재 observer·전체 tree 복제·15초 native snapshot | 120분 명령/합격 기준 그대로, 이번 장시간 미실행 |
| HTTP lifecycle | managed marker에 맞는 실제 current SQLite hold 관측 | stale legacy cache 대체 금지. 실제 HTTP는 원래8번 |
| actual-app/5단계 | 전체 tree·archive probe·기존 공개 API oracle | 구형 파일 직접 해석 없음, 실제 재실행은 원래8번 |
| 구형 fixture/probe | legacy 양성·이행 입력·이전 비용 비교 | `recording_catalog_scale_probe`, `recording_accumulation_probe`, profile CLI의 selectReference 등은 명시 legacy 전용. B 비용 증거로 사용하지 않음 |

live 관측에서 진행 중 거래·세대 교체는 busy이며 종료 완결로 인정하지 않는다.
처음부터 busy였어도 이후 legacy 파일로 돌아가지 않는다. 새 파일의 canonical 내용/EOF,
기존 prefix, 최초 수용 순서·reservation, fd·경로·시각·세대 결박을 유지했다.
실제 B writer·삭제2개·봉인된 상세 파일과 별도 native Catalog의 생존/삭제 수를 직접 대조했다.
실제 서버의 HTTP 지연·동시 읽기와 누적 비용은 이 결과로 대체하지 않는다.

## 정리·미실행

각 성공 runner가 소유 root를 제거하고 부재를 확인했다. profile helper는 크기·removed만
기록하므로 기록하지 않은 경로를 추정 복원하지 않는다. 최초 관측 RED root는
[소유·원문 hash·수동 정리](generation-red-cleanup.json)에 보존 후 제거했다.
서버·계정·HTTP listener는 만들지 않았다. 원로그28개75,904B는 내용 동일 gzip31,418B로 보존했다.
원로그는 inode/uid/hash를 다시 대조한 뒤 정확한 해당 파일만 제거했고 부재를 확인했다.

| 미실행/제외 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| 누적 규모·실제 HTTP/2출력·재기동 | 원래8번 | 현행 검증 연결 선행 | 이번 준비 자체검사로 PASS 불가 |
| 최종 안정화·30분·UI·120분 | 원래9번의 증거 영향 판정 뒤 | 코드 고정 선행 | 과거 PASS 자동 승계/전체 재실행 모두 하지 않음 |
| 외부 서비스·실기기 | 사용자 명시 제외 | 실행하지 않음 | PASS 아님 |

제품 소스는939826a5에서 불변이므로6번 빌드·867개 제품 영향 증거는 유지한다.
원래7번의 최종 문서·인벤토리·공백 검사는 아래 정적 기록으로 보완한다.

문서 링크13,617개·오류0, 자산10개 PASS, 인벤토리986행/18그룹 PASS,
`git diff --check` exit0. [정적 원출력](static-manifest.json)과
[개별 정적 결과](static-individual-results.json.gz)를 보존했다. 기존986개 행은 HEAD와 동일하며
manifest의 inventory SHA만 재결속했다. 실제988개 등으로 기능 수를 부풀리지 않았다.
정적 원로그3개도 같은 소유·hash 대조 뒤 삭제했으며 총31개 원로그의 부재를 확인했다.
