# P0 독립 전이·긴 GOP 재현

독자: P0 구현/검토 담당. 수명: 이번 독립 재현과 후속 최적화의 실행 증거. 정책은 AGENTS, 중앙 정의는 [중앙 테스트 기록](../../../release-test-records.md)이 우선한다. 이전 actual 실패는 별도 통합 준비 기록에 보존하며 이번 완료 범위와 구분한다.

## 실행 전 정의

안전runner 최종baseline 재검증(메인승인): 기존명령에 --diagnostic-evidence를명시하여 ownedcache/stream별buffer/출력상한/종료보완을검증한다. cp-owned-baseline.log 보존. 진단모드만자동checkpoint count>0을요구하며 최종기본모드는 임시계측제거뒤shape/파일/예약회귀로한정한다. 자동경계는기존SC16으로교차검증한다. 후속CP05~08은1분할커밋뒤실행: CP05 exact동일 원본replay1/후보0 임시계측RED→GREEN, CP06 canonical길이같은다른내용/순서 음성, CP07 실제catalog semantic invalid거부, CP08 기존SC전수. orchestration callback추상화는추가하지않는다.

1차 linear clock은250samples/45slices지만mapping1/Ready183KB로 확인됐다(cp-retry.log). 실제 자동checkpoint1회는 관측했으나 목표mapping250 workload와 다르다. 이 baseline은 보존한다. 메인 승인 보강: CP01/02만 PTS/duration/identity 불변의 synthetic burst-arrival clock(mono_before=1e9+i*1e6, after+1000, UTC=fixed epoch+i*1e6)을 사용하여 기존 divergence 정책의250mappings를 만들고 literal검사한다. 실제 앱 clock의 동일 재현 주장은 아니다. CP03는 linear 유지, reference original frame258/PTS8566666666, unknown union[8333333333,9316000000)와 정확reason을assert하고 ready.unfulfilled 동일request구간·원본 수용ordinal250→300도 대조한다. Update계측은 mutex대기 포함 총시간이며 lock-held 측정이 아니다.

| 제목 | 수행내용 | 상세 oracle |
| --- | --- | --- |
| CP01 | 실제 H264 Ready/Complete 전이 크기·비용 | 30fps/GOP250/501frames, target2s managed writer. 첫 두 원본250samples. 요청[3000,4500)ms actual selection→service, Ready/Complete payload hash/bytes/source/sample/mapping/slice/AU 개수. 각 canonical Serialize/Parse3회. Complete·파일hash·예약release 확인 |
| CP02 | 자동1MiB checkpoint | 최대2개 독립job, explicit checkpoint/padding 금지. opt-in 임시계측 Update전체 및 Checkpoint Replay/Prepare/original Apply/candidate Apply/signature/commit 각각 count/bytes/elapsed. 자동commit>0, strict projection·잠금 불변 |
| CP03 | 3750ms 긴 GOP partial 원인 | 약300frames까지push, 첫source만finalized/다음GOP미닫힘, 요청[7816,9316)ms를실제packet pts/duration 합성증거가덮음. 동일snapshot worker3750ms→partial1, 저장selection/미충족reason·범위. writerStop후source2와sameevidence pureselection complete positivecontrol |

명령: `./server.sh build` 후 `env -i PATH="$PATH" HOME=/tmp TMPDIR=/tmp bash scripts/internal/verify_recording_checkpoint_reproduction.sh`. owned root128MiB/실행60초, 실패시후속중지·cleanup. 제품 영구fix/실제앱/브라우저/전체통합은 실행하지 않는다. 합성decoded증거는 실제decoder 검증이 아니다. token 집계소스 없음. 준비실패는 예상RED가 아니다.

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
