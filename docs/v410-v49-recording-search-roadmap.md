# v4.1.0~v4.9.0 녹화·검색 로드맵

- 2026-09-24 O29 선행 판정: O28 후속 순차 개발에서 저장 처리 수명과 복구 원자성 경계를 확인했다.
  현 형식의 중복 파싱 개선과 전체 이력 처리를 분리하는 영속 구조 변경은 같은 범위가 아니다.
  형식·손상 검출 시점 변경 포함 여부를 질문했으며, 선택 전 제품 구현·실제 앱/장시간 실행은 착수하지 않았다.
  [계약과 실행 상태](release-test-records.md#v410-s11-o29-저장-처리-구조-선행-판정).

- 2026-09-24 O28 최신 판정: 진단·자료 보존·누적 비용·소유 수명 비교를 마감했다. 전체 삭제 이력 재처리와
  8192행 cache 경계, 복구64개 재사용 한계가 남아 있다. 상세 resident 해제는 해당 입력에서 확인했지만 전체 RSS
  귀속/O26 최초 snapshot 실패는 미확정이다. 다음은 저장 처리 구조 보완이며 새 제품 수정·실제 앱/장시간 검증·
  S11 완료가 아니다. [직접 근거와 후속 범위](release-artifacts/v4.1.0/lp26-o10-accumulation-20260923/o28-results.md#5번-근본-원인-판정과-최소-후속-방향).

## 문서 상태

- 2026-09-24 LP26-O14/O16/O23 판정: 2,049개 원본의 자동 전체 체크포인트는 공개 삭제 96회 뒤 확인됐고 LP26-O16 결박 보완 뒤에도 7.719초 잠금(원장 읽기 2.734초·전체 의미 재적용 4.764초)으로 4초 동시 HTTP 보장은 아니다. 8,196행이 후보 상한 8,192행을 넘는 경계가 확인됐다. O15 원조건 1,035개 상태 HTTP 200건·최대 2.919초는 겹침 없는 집중 결과다. 과거 O14 5단계 실행기의 두 번째 출력 대기 30.597초는 30초 제한을 넘었으므로 그 PASS 증거는 무효이며 O16/O18 실패도 보존한다. O23은 현재 요청의 제한된 후보 재검증 후 실제 앱 두 기동의 완전 출력2개·HTTP·해시·재기동을 각각 20.214/22.548초 대기와 타임라인 HTTP 최대 2.329초로 통과했다. 이는 현행 5단계 최종·누적 status·30분/UI/녹화120분 PASS가 아니다. [직접 결과와 정정](release-test-records.md#v410-s11-lp26-o14-누적-지연-원인-분리).

- 2026-09-23 LP26-O08 현재: 삭제 원본의 중복 SQLite 투영·원장 물리 행을 회수한 뒤
  관측기 누적 입력의 단일 3초 호출 시간초과를 분할 처리로 보완했다. 관측기 자기검사63/63과
  격리 실제 앱 단기71/71은 통과했으나 녹화 전용120분 2차는 약6분34초에 native 관측
  실패, 3차는 약17분35초에 `GET /ops/api/recordings/status` 4초 시간초과로 실패했다.
  3차의 저장 root는338,741,538B/469,762,048B로 용량 초과가 아니며 서버·포트·임시
  root 정리는 통과했다. HTTP 내부의 잠금 대기·체크포인트·상태 계산 중 지연 원인은
  미확정이다. 120분·자원 추세·영향받는 UI 최종 판정과 릴리즈는 미완료다.
  실패를 이전 1차 root 상한 문제와 합치거나 timeout 완화로 완료 처리하지 않는다.
  상세는 중앙 테스트 기록 LP26-O08을 따른다. 아래 항목은 당시 시점 기록이다.

- 2026-09-23 S11-I30 수정 후: 현재 앱의 신규 managed 이벤트 출력은 MP4로 전환했고
  저장된 구형 TS 작업과 비사용 V1 경로는 기존 계약으로 유지했다. 관련 단기 회귀·HTTP 인증/Range와
  실제 브라우저의 이벤트 우선 두 출력 재생을 확인했다. 기존 TS 재생 실패 이력은 보존한다.
  새 화면 증거 파일이 없어 UI 전수 Policy 적격으로 확대하지 않는다. 새 소스 30분은
  20회·109 PASS·0 FAIL로 완료했다. 공통120분은 최초 무음 H.264 probe 시간초과 이력을
  남기고 동일 기준 재실행 80회·409 PASS·0 FAIL로 통과했으나 최초 원인은 미확정이다.
  녹화 전용120분 1차는 37분 38초에 격리 root 상한으로 실패해 저장 비용·상한 관계를 조사 중이다.
  UI 증거 적격·최종 릴리즈 판정도 잔여다. 상세는 중앙 기록의 S11-I30 수정 후 결과를 따른다.

- 2026-09-23 LP31 현재: 이전 LP29의 EVT-058 실패와 source1ab의 Policy 실패를 보존한 채,
  source8fa98a99의 실제 baseline UI424개·조작1,089행·시각80개·Policy 적격이 모두 PASS했다.
  최신 전체 증거4,565파일은 압축·복원 해시 대조 후 저장소에 이관했다.
  이는 녹화 실UI I27~34 8개/31조작, 별도 브라우저 미디어, 공통/녹화120분의 PASS가 아니다.
  해당 순서와 최종 정리·기록·개발브랜치 푸시는 사용자 승인 범위에서 진행한다.
  단기·실제30분의 유효한 결과를 자동 폐기하지 않는다. 상세는 중앙 release-test-records의 LP31을 따른다.
  아래 LP29는 당시 실패 이력이다.

- 2026-09-22 LP29 현재: 공통 주석 검사 누락으로 앞선 단기 전체 완료 표현을 정정한 뒤 주석만 보완하고
  관련 정적·증거 동등성 검사를 통과했다. 실제30분은20반복/108PASS·0FAIL로 완료했다.
  실제 UI424개는423PASS/1FAIL(EVT-058)이며 원인은 미확정이다. 전체 증거 보존·정리는 완료했고,
  시각 교차·녹화 실UI·별도 브라우저미디어·공통/녹화120분은 잔여다. 제품/합격 기준 변경은 없다.
  상세 결과·실패 이력은 중앙 release-test-records의 LP29를 따른다. 아래 날짜별 기록은 당시 상태다.

- 2026-09-21 LP28: 위치 처리/실제 소스 재연결 보완과 공개 문서·출처 정합을 분할 커밋했다.
  구형 자료는 소비자가 남아 삭제하지 않았고 제품287파일의 내용 digest를 고정했다.
  독립 검토 최초37개 기각은 실제 성공/조작 연결 보완 후 재검토했다.307개 승인·679개 엄격 동등 승계와
  소스986행/반례15·인벤토리·native 계약을 통과해 PREP 재결속을 마감했다. S11 최종 단기도
  빌드·인증19/72/146·녹화156·환경20·버전/문서 경계를 통과했다. close-out의 낡은 현재 버전 설명을
  같은 단계에서 보완하고 최초 실패→재검증을 보존했다. 제품·timeout·합격 기준 변경은 없다.
  이전 LP27의435ID 오류를 제품435개 회귀로 해석하지 않는다. 실제 UI·30분·120분은 이번 미실행,
  외부 서비스·실기기는 사용자 명시 제외(PASS 아님)다. 아래 날짜별 기록은 당시 결과다.

- 2026-09-21 LP26: 검증 전용 현행 원장 관측·monotonic/영속순서 장시간 준비·실제 managed UI seed를 구현하고
  단기 자체/영향 검사와 재기동 관측을 수행했다. 기능별 실행 연결을 재대조했으며 초기 고정ID/일부 복합 요구·ENV12 실행 준비는 남는다.
  제품 시간·ID·저장/보존/API 변경은 없다. 실제 브라우저·30분·120분·S10 전체 코드고정·S11 완료가 아니다.
  현재 결과는 중앙 LP26, 릴리즈 전수 잔여는 증적 색인에서 연결한다. 아래 LP25 이하 날짜는 당시 이력이다.

- 2026-09-21 LP25 현재: 시간 정확도를 바꾸지 않는 opt-in 파일별 미배치 그룹, 완료 관측/전수 페이지 분리,
  기존 LP22 요청 내 검증 재사용을 구현·영향 검증·분할 커밋했다. 현행5단계156검사와 실제 기동별 완전2출력,
  HTTP229건 최장1.613초(기준4초), 파일 hash·재기동·프로세스/포트/임시 자료 정리를 확인했다.
  최종 기록·개발 브랜치 푸시를 마감하는 범위이며 S10 코드 고정/S11 최종 안정화·30분/UI·필요120분·릴리즈 완료는 아니다.
  구형 검증 연결/불필요 legacy 정리·HW 자동 디코딩 영향 미확인은 별도 잔여다.
  개별 결과와 최초 실패는 중앙 테스트 기록 LP25를 따른다. 아래 LP24 이전의 미완료/미커밋 표기는 당시 이력이다.

- 2026-09-20 LP24 현재 승인: LP23에서 재산정한 복구 중복 처리→시간 정확도/표출 분리→완료 관측/전수 페이지 분리→
  기존 LP22 변경/영향 회귀→실제 HTTP/현행 통합→기록/커밋/조건부 푸시를 순차 수행한다.
  최신 승인1-A/1-B 중1-A 준비 정합은 완료: legacy 오류 진단·native4Complete/8파일·partial/full 분리 검증을 마쳤다.
  1-B도 실제 크기SQL4.635초/JSONL4.160초·14반례·원장/파일 동등성 통과로 완료했다. 기존 영향214·build 증거는 보존한다.
  1-A cb7d93e2 후 복구 제품을 별도 커밋한다.2~6은 미실행이며 기존LP22 미완료 변경을 보존한다. 기존15초/HTTP4초/관측30초 기준을 유지한다.
  세부 정의·결과는 중앙 테스트 기록 LP24를 따른다. S10 코드 고정/S11 최종cut·장시간/UI·릴리즈 완료가 아니다.
  아래 LP23과 LP22의 승인·실패 설명은 당시 이력이다.

- 2026-09-20 LP23 착수: 보존 자료의 사후 진단 지연/정리와 UTC unknown 원인·보존 경계 분석까지만 승인됐다.
  제품 시간 정책·타임라인 표출/완료 관측 보완은 후속이며 자동 착수하지 않는다. 분할 커밋, 푸시 미승인.
  1번 진단·정리는 완료: 반복 검증/적용 후 SQLite 재투영에서15초 초과, JSONL 상태/상세 확보 후180358628B 삭제.
  2번도 분석 완료: 합성8개/실입력250샘플 PASS, 안정된 시계에서도 cadence 차이로 mapping161개 중160 unknown 확인.
  원본/UTC 정확도/표출/완료관측을 분리하는 계약을 정리했다. 과거 OS 시계 보정 여부는 미확인이고 제품 보완은 후속이다.
  SQLite 제품 실패는 미해결. 중앙 LP23을 현재 범위로 따른다. 아래 LP22는 당시 실패다.

- 2026-09-20 현재: LP21 누적·동시 비용/삭제·재개방/2-job 단기 검증 이후 LP22 관측 진단을 보완했다.
  진단 자체검증168개·전체build는 통과했다. 실제앱1회는 대상job의 실행중Complete를 확인했으나 HTTP4초를 넘겨 FAIL이다.
  이후 요청 내 재사용 구현·단기129개·build는 통과했다. HTTP02의 timeline297개는 모두200/최장2091ms지만,
  대상 Complete 이후 페이지 총계가 계속 변경되어 완료 관측에 실패했다. 사후 상태 진단도 timeout으로 실패하여
  서버·포트 종료와 별개로 임시 자료180358628B의 정리 blocker가 남았다. 현행 통합·제품 변경 커밋·푸시는 중단했다.
  S10 코드고정/S11 최종 검증은 남아 있다. 상세 현재 판정은 구현계획/중앙 기록 LP22를 따른다.
  아래 날짜별 상태는 당시 이력이며 현재 완료로 소급하지 않는다.

- 2026-09-19 현재 우선: 사용자 승인 LP18 제품 보완(공통 소유/검증 계약→중복 보관→재검증→상세 RAM 수명→관련 회귀/실제 HTTP)에 착수했다.
  journal/checkpoint envelope·accepted 기록·typed binding/job의 동일 상태 공유, 정상 호출/자동checkpoint 내용 Parse·Intent 반복 검증 제거와 관련 단기 회귀는 통과했다. 공개/자기완결 snapshot·과거 payload 상주는 남으며 상세 RAM 수명·누적/실제 HTTP는 미완료다.
  기존 미커밋 변경은3묶음으로 보존했고 공통 계약은 `1d13b08a`로 커밋했다. 제품 보완 전체 완료나 성능 PASS는 아니다.
  순서·직접 실행 결과는 상세 구현계획 LP18과 중앙 테스트 기록을 따른다. 푸시·장시간/UI는 이번 개발 범위 밖이다.
  앞선 LP17 판정 기준·비교 설계·저장 수명 안전 계약을 작성·재검토했다.
  [누적 비용 보완 계약](superpowers/specs/2026-09-19-recording-catalog-cost-contract.md)과
  [구현계획 LP17](superpowers/plans/2026-09-02-v410-recording-foundation-implementation-plan.md#lp17-판정-기준-비교-설계-저장-계약)을 따른다.
  재검토로 RSS 판정/진단 진행 조건, 실험 준비 비용, 2-job 대조, RAM 내림/영구 회수의 경계를 보완했다.
  후속 비교 도구·소형/32원본·2-job 진단을 실행하고 테스트/캐시 비용과 삭제 후 상세 증거 잔존을 구분했다.
  제품 자원 예산 선정·제품 구조 변경은 미완료다. 진단 전용 실행 상한과 제품 합격을 분리했으며 LP16의 자원 FAIL과 실제 HTTP 미확인을 유지한다.
  실제 실행·실패·제품 미해결은 중앙 테스트 기록을 따르며
  아래 날짜별 완료 이력을 현재 전체 완료로 확대하지 않는다. S10 부분 완료·S11 미실행 상태는 유지한다.

- 2026-09-16 현재 우선 잔여: 종료점3-A와3-B 증거 저장·최소 중복 처리 보완 및 단기 회귀를 마쳤다.
  동일 조건 잠금 점유 합계는34.7% 줄었지만 최대1.227초가 남아3-B의 운영성능 합격은 미판정이다.
  누적 catalog/실제HTTP 지연 판정, 4번 제한 대기와5번 공통 소비·실제 통합은 남아 있다.
  기존 단계의 완료 이력과 구분하며 상세 상태는 구현계획·중앙 테스트 기록을 따른다.

- 2026-09-23 S11 수정 전 기록: 기본 actual UI424/424·시각80·Policy 적격 증거는 보존했다.
  별도 녹화 UI 31개 action은 30 PASS·1 FAIL이다. 공백에서 시간 귀속 미확인 영상을
  자동 재생하던 I31 결함은 수정·직접 재검증했으나, 이벤트 파생 MPEG-TS가 Chrome
  기본 플레이어에서 재생되지 않아 I30과 `event > continuous` 기본 재생은 미충족이다.
  별도 실제 브라우저 미디어 8/8은 통과했지만 이 실패를 대체하지 않는다. 공통·녹화
  120분은 미실행이다. 세부 결과와 실패 이력은 S11 녹화 UI 증거와 중앙 기록을 따른다.
- 상태: 2026-09-02 사용자 설계 승인. S00~S08의 기존 단계 구현·검증 이력을 유지하며,
  2026-09-12 사용자 승인으로 S09 통합 검증 단계를 설계 보완 필요에 따라 종료·대체한다.
  S10은 S10-3A/B 저장 기반과 S10-3C V2 시간 계약·catalog·ready 복구를 부분 구현했다.
  입력 관측·명시 주입 writer와 내부 분석·이벤트 파생 영상 연결(3C-5.4)을 구현·단기 검증했다.
  3D-1 적용 계약과 3D-2 서버 기본 구성 연결·관련 단기 검증을 마쳤다.
  공개 조회·미디어 제공/UI 소비 전환(3D-3)은 구현과 승인된 단기 검증을 마쳤다.
  이번 실제 브라우저 검증은 사용자 제외이므로 D08 재생 확인은 미실행으로 남긴다. S11은 계획·미실행이다.
  S06 조회·재생 UI, S07 검색용 관측·FrameLocator,
  S08 최종화·손상·시작 복구가 구현됐다. S08은 `11953256`까지 커밋·푸시했다.
  과거 단계별 실패·수정·개별 테스트 결과는 release-test-records에 보존하며 이 로드맵에
  반복하지 않는다. S09 종료는 성공 또는 버전 전체 UI/장시간·릴리즈 완료를 뜻하지 않는다.
  S10 변경 후 기존 증거의 유효 범위를 대조하며, S11 완료 전 버전 완료로 판정하지 않는다.
- 현재 작성 브랜치: `v4.1.0`
- 공통 반영 시점: v4.1.0을 `main`에 머지할 때 장기 로드맵도 함께 반영
- 이후 소유 브랜치: `main`. 후속 버전 브랜치는 장기 로드맵이 반영된 최신 `main`에서 생성
- 현재 소스 버전: `4.1.0`
- 적용 라이선스: Apache License 2.0 유지
- 세부 설계: [2026-09-02-v410-recording-search-foundation-design.md](superpowers/specs/2026-09-02-v410-recording-search-foundation-design.md)
- 상세 구현계획: [2026-09-02-v410-recording-foundation-implementation-plan.md](superpowers/plans/2026-09-02-v410-recording-foundation-implementation-plan.md)

단계 재편의 현재 기준은 이 문서의 S09~S11 절이다. 기존 설계·구현계획의 S09 실행 내용은
이전 계획과 증거로 보존한다. S10-1의 승인된 방향과 S10-2 입력 조사·재현 기준은 기존 설계
명세의 S10 절에 모았다. 수치 정책 모델·writer 특성 재현 이후 저장 schema와 명시 주입 writer를 구현했다.
후속2는 `a5673050`으로 커밋·푸시했다. 후속3의 내부 위치 해석(3A)과 보존·재생 보호(3B)는
구현·단기 검증을 마쳤다. 내부 이벤트·분석(3C)은 `f94faffc`까지 구현·푸시했다.
3D는 적용 계약(3D-1) → 기본 구성 연결(3D-2) → 공개 조회·재생/UI(3D-3) 순서다.
3D-1은 문서 계약 확정, 3D-2는 숫자 참조·관리 저장소·실제 writer·분석 증거·파생 작업 및
복구/종료 수명 연결이다. 새 기본 경로의 단기 검증 결과는 중앙 테스트 기록의 3D-2 절을 따른다.
3D-3은 새 catalog 기반 timeline·미디어 제공·UI 소비를 연결하고 단기 API/권한/전송 종료 검증을 마쳤다.
실제 브라우저 재생(D08)은 사용자 제외로 미실행이며, S10 전체·버전 완료를 뜻하지 않는다.
기존 legacy root는 자동 변환·삭제하지 않았다. 종료점 증거 저장·제한 대기·공통 소비의 관련 단기 증거와
LP25 실제 통합 마감을 바탕으로 현행 검증 준비와 불필요 legacy 코드·개발 데이터 소유/의존 대조·정리,
S10 코드 고정, S11 최종 검증으로 이어진다. 문서 반영을 후속 실행 승인으로 해석하지 않는다.

이 로드맵은 v4.1.0에서 안정적인 녹화 기반을 만들고, 이전 버전의 계약을 뜯어고치지
않은 채 구조화 검색, 벡터 검색, 증거 검토, 상관관계 분석, 자연어 질의와 녹화 재생을
순서대로 추가하는 것을 목표로 한다.

최종 사용 흐름은 다음과 같다.

```text
자연어 질문
  -> 버전이 고정된 QueryPlan
  -> 구조화/벡터/관계 검색
  -> 근거 영상과 분석 메타데이터 결합
  -> JSON 결과
  -> 해당 카메라와 시간의 녹화영상 재생
```

예상 질의:

```text
3시에 자동차 근처에 서성인 사람 찾아줘
```

최종 결과는 해석된 시간 범위, 객체, 행동, 공간 관계와 함께 `camera_id`, 녹화
시작/종료 시각, 관련 track/event/evidence ID, 선정 이유, 점수, 재생 위치를 반환해야
한다. 제품 UI와 공개 API는 같은 application service와 결과 계약을 사용한다.

## 최상위 원칙

1. v4.1.0은 녹화 기능에 집중한다. 검색 기능은 구현하지 않지만 검색 가능한 데이터
   기반은 함께 만든다.
2. 상시녹화는 기본 비활성화하고 채널별 명시 설정으로 켠다.
3. 상시녹화는 고정 길이 세그먼트를 연속 기록한다. 설정 용량을 초과하면 가장 오래된
   상시녹화부터 삭제하고 녹화를 계속한다.
4. 상시녹화와 이벤트 녹화의 용량·보존 정책을 분리한다. 이벤트 클립은 이벤트 보존
   한도에 도달하기 전까지 상시녹화 정리로부터 보호한다.
5. 이벤트 발생 시 겹치는 상시녹화 세그먼트에서 pre/event/post 파생 클립을 만들고,
   상시녹화에 공백이 있으면 기존 이벤트 프레임 버퍼 녹화를 fallback으로 사용한다.
6. 동일 시간에 상시녹화와 이벤트 녹화가 모두 있으면 UI/API의 기본 표출과 재생은
   `event > continuous` 우선순위를 따른다.
7. 영상 파일, 메타데이터 원장, 검색 인덱스를 분리한다. 검색·임베딩·상관관계 인덱스는
   모두 재생성 가능한 파생 데이터다.
8. 공개된 ID와 필드 의미를 다음 버전에서 바꾸지 않는다. 새 요구는 additive schema와
   새 contract version으로 추가한다.
9. 외부 LLM이 없어도 기본 시간·객체·행동·관계 질의가 로컬에서 동작해야 한다. 로컬
   또는 외부 LLM은 선택형 query interpretation adapter다.
10. 이 저장소의 Apache-2.0을 유지한다. 호환되지 않거나 라이선스가 불명확한 코드는
    포함하지 않는다.
11. 의도된 공개용 영문 문서를 제외한 모든 문서는 한글을 기본으로 작성한다. 기술
    식별자와 표준 고유명사는 원문을 유지할 수 있지만 설명과 판정은 한글로 기록한다.

## 브랜치 운용 모델

이 장기 로드맵은 v4.1.0 개발 변경에 포함하고 v4.1.0을 `main`에 머지할 때 공통
source-of-truth로 반영한다. 그 뒤 `v4.2.0`, `v4.3.0` 같은 브랜치는 장기 로드맵이
반영된 최신 `main`에서 만들어 같은 문서를 상속한다. 현재 버전의 구현자는 앞 버전의
불변 계약과 뒤 버전의 소비 목적을 함께 확인할 수 있어야 한다.

각 개별 버전 브랜치는 다음 규칙을 따른다.

1. 브랜치의 개발·테스트 범위는 해당 버전 절과 단계에 한정한다.
2. 후속 버전 절은 현재 데이터·API 계약을 왜 안정적으로 유지해야 하는지 설명하는
   설계 문맥이며, 후속 기능을 미리 구현할 권한이 아니다.
3. 현재 버전에서 후속 버전의 구현을 당겨 넣지 않는다. 대신 후속 버전이 소비할 stable
   ID, time, lifecycle, application interface만 현재 버전의 승인 범위에서 고정한다.
4. 현재 버전 구현 중 장기 로드맵 변경이 필요해지면 임의 수정하지 않고 사용자와
   재조율한다. v4.1.0에서는 승인된 변경을 v4.1.0 머지에 포함하고, 이후 버전에서는 다음
   브랜치를 만들기 전에 `main` 공통 로드맵에 반영한다.
5. 버전 브랜치를 종료할 때 해당 절의 실제 구현·미구현·검증 상태만 갱신한다. 후속
   버전의 계획 상태를 완료로 바꾸지 않는다.
6. 다음 버전 브랜치는 이전 버전의 로드맵·계약 변경이 머지된 최신 `main`에서 생성해
   공통 로드맵과 이전 릴리즈 계약 fixture를 함께 상속한다.

따라서 각 브랜치는 `현재 버전 집중 범위`와 `후속 버전 소비 문맥`을 동시에 가지되,
실제 개발은 현재 버전 집중 범위만 수행한다.

## 참고 자료와 독립 구현 경계

다음 자료는 설계 개념을 검토하는 참고 자료이며, MediaServer는 별도 저장소, submodule,
runtime dependency 또는 동기화 대상이 되지 않는다.

- [MyLocalLLM `VATester-Vector-Search-cpp`](https://github.com/dhseo90/MyLocalLLM/tree/VATester-Vector-Search-cpp):
  임베딩 계약, 벡터 검색 정렬·커서·평가 방식 참고
- [VARuleLens](https://github.com/dhseo90/VARuleLens): 증거 패키지, frame sequence,
  supports/questions/contradictions/unclear 형태의 검토 개념 참고
- [공유 GPT 대화](https://chatgpt.com/share/6a982ed2-2dd4-83ee-b78b-07f9f4b34861):
  Recording -> Search -> Evidence -> Correlation -> Investigation 단계 참고

원본 두 저장소는 그대로 유지하며 수정하지 않는다. 필요한 설계와 로직은 MediaServer의
구조와 Apache-2.0 경계 안에서 독립적으로 재구현한다. 소스 코드를 직접 복사하지 않는다.

## 표준·오픈소스·지식재산 조사 게이트

저장 계약을 고정하기 전에 아래를 조사하고 결과를 설계 결정 기록으로 남긴다.

- [ONVIF Profile G](https://www.onvif.org/profiles/profile-g/)의 녹화 검색·재생 의미 체계
- [ONVIF Profile M](https://www.onvif.org/profiles/profile-m/)과
  [ONVIF Analytics](https://www.onvif.org/specs/2206/Analytics.html)의 UTC frame,
  object, appearance, behaviour 의미 체계
- [GStreamer `splitmuxsink`](https://gstreamer.freedesktop.org/documentation/multifile/splitmuxsink.html)의
  keyframe 경계 분할과 fragment finalize 동작
- Apache-2.0과 호환되는 공개 구현의 세그먼트·보존·복구 패턴
- 한국, 미국, 유럽 및 PCT 계열의 특허 위험 screening

특허 조사는 아이디어를 얻는 용도가 아니라 위험 접근을 제외하는 필터로만 사용한다.
활성 특허와 실질적으로 겹칠 가능성이 있으면 상세 구현을 설계 입력으로 사용하지 않고
해당 접근 전체를 제외한다. 제품 설계 근거에는 공개 표준, 권리 상태가 안전한 자료,
호환 오픈소스와 독립 설계만 남긴다. 불확실하면 기능을 축소하거나 구현을 보류한다.
이 기록은 법률 의견이나 FTO 검토를 대신하지 않는다.

## 버전 경계

| 버전 | 목표 | 이전 버전에서 소비하는 불변 기반 | 이 버전의 명시적 비범위 |
| --- | --- | --- | --- |
| v4.1.0 | Recording Foundation | 기존 EventRecord, FrameRef, event clip | 구조화 검색 UI, 임베딩, 자연어 질의 |
| v4.2.0 | Structured Search | v4.1 녹화 카탈로그와 분석 요약 | 벡터 유사도, VLM 판단 |
| v4.3.0 | Visual Vector Search | v4.1 FrameLocator, v4.2 결과 계약 | 증거 판단, Entity 확정 |
| v4.4.0 | Evidence Package | 녹화·프레임·트랙·이벤트 ID | VLM 결론, 교차 카메라 동일성 |
| v4.5.0 | VA Review | v4.4 불변 증거 패키지 | 교차 카메라 Entity 확정 |
| v4.6.0 | Correlation | track/event/evidence와 검토 결과 | 자연어 조사 UI |
| v4.7.0 | Natural Language Query API | 구조화·벡터·증거·상관관계 service | 대화형 제품 UI |
| v4.8.0 | Conversational Search & Playback | v4.7 QueryPlan/JSON response | 공개 API 호환성 종료 선언 |
| v4.9.0 | Stabilization & Public API | v4.1~v4.8 고정 계약 | 호환성을 깨는 major 변경 |

v5.0.0은 자동 조사 agent, 분산 검색 또는 호환성을 깨는 데이터 모델 변경처럼 실제
major 변경이 확인될 때만 별도로 설계한다. 현재 목표를 이유로 v4.7~v4.9를 건너뛰지
않는다.

## v4.1.0 — Recording Foundation

목표:

```text
상시녹화를 중단 없이 순환 보관하고 이벤트 구간을 우선 증거로 연결하며, 후속 검색이
원본 녹화 구조를 변경하지 않고 사용할 수 있는 시간·ID·분석 메타데이터 기반을 만든다.
```

| 단계 | ID | 우선순위 | 산출물 |
| --- | --- | --- | --- |
| 0 | V410-S00 | P0 | 표준·오픈소스·IP screening, 라이선스·provenance 기록, 최종 설계 freeze |
| 1 | V410-S01 | P0 | RecordingSegmentV1, FrameLocatorV1, EventRecordingLinkV1, AnalysisObservationV1 계약과 migration/rebuild 규칙 |
| 2 | V410-S02 | P0 | 채널별 opt-in 연속 세그먼트 recorder, keyframe 경계, atomic finalize, 재시작 복구 |
| 3 | V410-S03 | P0 | SQLite 메타데이터 카탈로그와 append-only JSONL 복구 저널, SQLite 미사용 fallback |
| 4 | V410-S04 | P0 | 완료: 상시/이벤트 용량·기간 분리, oldest-first 순환 삭제, pin·hold·tombstone, 채널별 pending 복구, dirfd 결박 unlink/truncate, 실제 쓰기량 정산, 채널 간 in-flight disk reserve·writer admission, 내구 cleanup 마커 재시작 복구 |
| 5 | V410-S05 | P0 | 구현 완료·실제 foreground/nohup/launchd PASS: finalized 원본 연결, 명시적 PTS/UTC 시간축, 비동기 H.264/MP4→MPEG-TS remux, 실측 범위, fallback, quota·hold, UUID v2 partial·재시작 복구. 종료 시 미래 post-event frame 대기만 취소하고 접수 EventRecord를 drain한다. 개별 ID 27개·check 92개, 등록기 35·C++ 140·application 7·runtime 23·mutation 2·계약 45·build 통과. 정식 payload 판독 12/0, foreground 22/0, 실제 nohup/launchd 각 29/0 통과 |
| 6 | V410-S06 | P0 | 구현·단계 검증 완료: event 우선 timeline/status API, 권한별 채널 투영, opaque GET/HEAD·Range 재생, fd/hold·삭제 경쟁·종료 보호, Ops 필터·페이지·원본 전환·player. 최종 focused152/API31/auth37/lifecycle10 및 관련 회귀·범위 한정 직접 UI 통과. 개별 결과와 실패 수정 이력은 release-test-records의 잔여 3~6번을 따름. 버전 전체 UI·30분/120분 완료는 아님 |
| 7 | V410-S07 | P1 | 구현·단계 검증 완료: 기존 V1과 분리된 V2 관측, start/interval/event/end·요약, bounded 비동기 저장, 입력 시점 PTS/epoch와 finalize 위치 연결. 모호한 시간축은 null. 상세 구현·검증은 release-evidence-v410의 S07 절 |
| 8 | V410-S08 | P0 | crash/disk-full/corrupt catalog/gap/migration/호환성 검증과 문서·evidence 연결 |
| 9 | V410-S09 | P0 | 종료·대체됨(성공 완료 아님): 기존 통합 검증의 성과·실패·수정 이력 보존. 설계 보강은 S10, 최종 검증은 S11로 분리 |
| 10 | V410-S10 | P0 | 제품 구현·구형 소비자 조사·제품 코드 고정·PREP 소스 증적 재결속 완료. 실제 브라우저 및 S11 전체 완료는 아님 |
| 11 | V410-S11 | P0 | 주석 보완·관련 단기·수정 후 실제30분(20회·109 PASS·0 FAIL) 완료. 기본 실제UI424/424·시각80·Policy 적격 PASS; 과거 EVT-058/Policy 실패 보존. 수정 전 녹화 UI31조작은 30 PASS·1 FAIL(이벤트 TS 재생), 별도 브라우저 미디어8/8 PASS. 신규 managed 이벤트 MP4의 관련 단기·실제 브라우저 우선 재생은 범위 한정 재검증 PASS. 공통120분 재실행은80회·409 PASS·0 FAIL이나 최초 실패 원인 미확정. 녹화 전용120분은 1차 root 상한, 2차 native 관측, 3차 HTTP 4초 시간초과로 각각 FAIL. LP26-O14 실제 HTTP 집중 114건·최대967ms는 해당 범위에서 통과했으나 O14 5단계 통합의 두 번째 기동은 30초 제한을 넘은 늦은 반환을 PASS로 받아들인 것으로 재판정했다. O16/O18 실제 앱 재현도 같은 구간에서 실패했다. 새 소스 UI 전수 적격·녹화120분·최종 증거/버전 완료 판정은 잔여 |

S11 저장 비용 잔여는 [B안 구현 계약](superpowers/specs/2026-09-19-recording-catalog-cost-contract.md#b안-구현-계약)에 따라
현재 상태·증분 원장·과거 증거 분리로 순차 보완한다. O28 비용 측정과 O29 분기 반례의 과거 결과는 유지한다.
B안 제품 구현·누적 비용·녹화 전용 120분은 이 계약 작성만으로 완료되지 않는다.

2026-09-25 B의 기존 수용·snapshot 분할 동등성과 공개 읽기·현재 상태 SQLite 연결까지
집중 검증을 마쳤다. 읽기 연결 최종106개와 기존 회귀386개·빌드가 통과했으며
[개별 결과](release-artifacts/v4.1.0/b02-public-read-20260925/results.md)와 중앙 기록에서 초기 실패와 범위를 구분한다.
이후 내부 opt-in 내구 쓰기·예약·수동/자동 세대 회전까지 집중·영향 검증과 빌드를 마쳤다.
최종 회전123개와 관련1,340 assertion의 범위·초기 실패·비용 계측은 중앙 테스트 기록에서 구분한다.
이후 원문 보존 전환·게시 및 중단 복구165개와 저장 영향 회귀1,409개·전체 빌드를 통과했다.
[전환/복구 기록](release-artifacts/v4.1.0/b04-generation-transaction-20260925/results.md)에 최초 실패와
반례 승계를 보존한다. 실제 소비자와 runtime 기본 연결·누적/최종 검증은 아직 완료하지 않았다.

### S09 종료·대체와 기존 작업 보존

S09에서 발견한 시간·식별 기반의 설계 이슈를 통합 테스트의 잔여 수정으로 계속 확장하지 않는다.
기존 종료 충돌 보완, UI 보완, 검증 도구와 개별 PASS/FAIL 기록은 폐기하거나 성공으로 덮어쓰지 않는다.
특히 약 93분에 실패한 녹화 검증은 120분 PASS가 아니며, S11 결과로 과거 실패를 지우지 않는다.
기존 미커밋 변경은 S09 성과 보존·S10 영향 수정·S11 검증 준비로 소속을 대조한 뒤 처리한다.
단계 재편만으로 파일 삭제, 커밋, 되돌리기 또는 기존 제품 수정의 완료 판정을 하지 않는다.

### S10 녹화 시간·식별 기반 보강

2026-09-21 현재: LP27 HW 영향 codec67/ICE8 회귀를 마감했고 PREP 복합8/실제환경94를 통과했다.
기존 독립 검토 원장435개 ID의 source/locator/oracle 결속 불일치로 PREP 전체 마감은 보류한다.
구형 정리·S10 코드 고정·S11 최종 실행은 아직 남아 있다. 아래 초기 단계별 설명은 당시 이력이며
“아직 writer 미연결/기본 비활성”을 현재 서버 기본 구성으로 해석하지 않는다.
현재 실행 결과·연결의 기준은 중앙 release-test-records와 LP27 전수 대조다.

현재 상세 기준은 [설계 명세의 S10 절](superpowers/specs/2026-09-02-v410-recording-search-foundation-design.md#s10-시간식별-계약)이다.
S10-1 방향은 2026-09-12 사용자 승인으로 채택했다. S10-2는 입력 조사·정책 모델·순수 UTC
writer 특성 재현까지 수행했다. 실제 재정렬·cache/분석 전달·frame 끝·저장량 상한의 제품 통합은
미검증이며 S10-T01~09 제품 합격 전수 PASS나 S10 전체 완료를 뜻하지 않는다.
S10-3A는 journal replay의 미지원 record 분류와 catalog Open/rebuild guard를 추가했다.
관련 catalog 검증84개가 통과했으며 실제 파일·함수·개별 결과는 상세 구현계획 S10-3A와 중앙
테스트 기록에 보존한다. 이어 S10-3B의 `ReserveRecordingOrder`·versioned parser와 catalog
읽기 호환을 구현했고 기존84개를 포함한 최종139검사를 통과했다. 같은 요청 재시도·프로세스
동시 발급·충돌/손상 거부의 개별 근거는 중앙 S10-3B 기록에 보존한다. 이 API는 실제 writer에
아직 연결하지 않았으며 store 전체 소유권·downgrade·장기 성능은 활성화 전 경계다.
S10-3C는 V2 시간 계약·catalog 저장·ready 복구를 구현하고 한정 검증135/172/52개를 통과했다.
세부 변경과 검증 범위는 기존 상세 구현계획 S10-3C 절을 따른다. V2는 기본 비활성이며
실제 writer 활성화·입력/소비자 통합·S11 최종 검증은 완료하지 않았다.

후속 저장소 활성화 선행 1번은 구현·한정 검증을 완료했다. journal 수명 소유권·구형 기본
접근 차단, catalog 단일 소유권·경로 결박, 증분 조회·원장 체크포인트를 구현했다.
catalog focused 246개와 finalize 복구52개를 통과했다. 실제 writer 활성화·소비자 전환·
기존 코드/개발 데이터 제거와 S10/S11 전체 완료를 뜻하지 않는다.

후속 2번은 원본 입력 관측과 관리 저장소 writer의 명시 주입 경로를 구현했다.
세대 순서·불변 ID·내구 저장 순서와 UTC 매핑을 분리하고, 실제 H264/VP8 파일의 분할·복구·디코딩을 확인했다.
입력14개·writer37개·active ready55개·기존 recorder118개 단기 검증이 통과했다.
전체 제품 빌드도 통과했다. 최초 미디어 회귀의 빈 STUN 설정은 외부 기본값으로 fallback하여 무효였다.
이후 사용자 승인으로 검증 전용 loopback STUN·실제 config 가드를 보완하고 동일 미디어 회귀
codec67/ICE8/metadata 실제10개·문서 검증·cleanup을 통과해 후속2 범위를 완료했다. 최초 실패는 보존한다.
서버 기본 경로는 아직 기존 소비자와 함께 유지한다. 다음 소비자 연결 단계에서 조회·보존·분석·이벤트 경계를
함께 전환해야 하며, 이번 결과를 운영 기본 전환이나 S10 전체 완료로 사용하지 않는다.
전체 제품 영향 회귀의 실제 결과·실패·정리 상태는 중앙 테스트 기록의 S10 후속2 절을 따른다.

사용자는 기존 녹화 데이터가 전부 개발·검증용임을 확인했다. 따라서 V1 데이터 마이그레이션과
영구 병행 지원은 목표에서 제외한다. 새 입력·소비자 경로를 검증한 뒤 불필요한 기존 녹화
코드·개발 데이터를 정리하고 단일 구현으로 마감한다. 저장 형식 식별자와 필요한 최소 검증
fixture·과거 실행 기록은 유지한다. 아래 기존 데이터 보존·호환 문구는 임의 의미 변환 금지의
안전 원칙이며, 불필요한 개발 데이터를 영구 보존하라는 요구로 적용하지 않는다.

목적은 v4.2 이후 검색·증거·상관관계·재생이 같은 녹화 시간·식별 계약을 소비하게 하는 것이다.
다음 순서로 범위를 고정하고 진행한다. 아래는 개발 계획이며 상세 schema·임계값의 확정 기록은 아니다.

1. **계약 확정:** 물리 세그먼트 ID, 미디어 연속 구간, UTC 매핑 구간, 영속 녹화 순서의 역할을
   분리한다. 촬영/수신/추정 시각의 출처·유효 범위·불확실성을 명시한다. 기존 `stream_epoch_id`의
   의미를 조용히 바꾸지 않고, 필요한 확장은 버전이 명시된 계약으로 정의한다.
2. **입력·불연속 설계:** 관측 지점, PTS/DTS 및 재정렬, 소스 재시작, 시각 후퇴·전진·드리프트를
   구분한다. 시계 보정 감지 기준과 키프레임 사이의 매핑 경계 처리를 확정한다.
   시스템 UTC 차이를 미디어 경과 시간으로 대신하거나 PTS 감소만으로 재시작을 단정하지 않는다.
3. **원장·복구:** 시간 매핑과 녹화 순서를 영속화하고 재시작·JSONL rebuild·SQLite projection에서
   동일하게 복원한다. finalize 순서·UTC 정렬·ID 문자열을 녹화 순서로 추정하지 않는다.
   보존의 oldest-first 기준과 기존 데이터의 순서 불확실성 처리도 계약에 포함한다.
4. **기존 소비자 연결:** writer, 시간 snapshot, 분석 FrameLocator, 이벤트 연결, 조회·재생 위치가
   공통 시간 해석을 사용하게 한다. 중복 UTC·공백·삭제·모호한 위치를 정상 단일 결과로 꾸미지 않는다.
   기존 미디어·ID·확정 증거는 보존하고, 표현 불가능한 V1 결과를 의미 변경으로 감추지 않는다.
5. **구현·관련 검증:** 확정한 계약의 기능 항목을 사전 등록하고, 짧은 결정적 재현과 영향 회귀로
   보강한다. 정상 입력, 시간 불연속, PTS 재정렬/재시작, 경계 프레임, 복구, 보존·삭제,
   분석/이벤트의 동일 프레임 연결과 기존 데이터 호환을 확인한다.

완료 조건은 계약·호환 방안 확정, 승인 범위 구현, 개별 검증 증거와 영향 범위 기록이다.
시각 보정만으로 원본 녹화를 버리거나 과거 UTC를 임의 보정하지 않는다. 기존 저장 데이터를 새 촬영
시각으로 승격하지 않으며, 상세 보정 기준·입력 특성·전환 방식이 미정이면 구현 완료로 표시하지 않는다.

비범위: 구조화/벡터 검색, 자연어 질의, 자동 연속 재생 UI, 모든 카메라의 촬영 시각 동기화,
새 외부 의존성·실기기 검증의 자동 추가. 후속 재생을 위한 식별·순서 계약은 포함하되 제품 기능은 당겨 넣지 않는다.

### S11 최종 통합 검증

S10 완료와 코드 고정 후 S09에서 의도했던 버전 최종 검증을 수행한다. 단계 이름만 바꿔 기존
결과를 PASS로 승격하거나 전체를 무조건 다시 실행하지 않는다.

1. S09 보존 증거와 최종 diff·실행 환경·판정 조건을 대조해 유지/부분 무효/전체 무효를 기록한다.
   소실·불충분 증거와 실제 실패는 유효 PASS로 사용하지 않는다.
2. AGENTS.md 7.6.2에 따라 안정화·30분·UI·120분 영역의 최종 대상과 실행 승인 상태를 확정한다.
   30분/UI의 버전 완료 필수 조건을 유지하고, 녹화 전용 120분과 공통 장시간 검증을 서로 대체하지 않는다.
3. 승인된 대상만 실행하며 실패가 생기면 원인·영향을 먼저 특정한다. 수정 후 영향받는 결과를
   재검증하고, 새 설계 범위를 검증 단계에 자동 편입하지 않는다.
4. 실패 증거 보존·임시 산출물 정리·남은 조건을 확인한 뒤 최종 버전 완료 가능 여부를 판정한다.
   커밋·푸시·PR·merge·tag·Release는 별도 명시 승인 대상이다.

기존 S00~S08의 단계별 완료 이력은 유지하되 S10 변경 후의 제품 전체 PASS를 의미하지 않는다.
이번 단계 재편은 S11 실행 승인이나 기존 테스트 전수 재실행 지시가 아니다.

### S10·S11 담당 및 모델 기준

| 단계 | 런타임 패밀리 | 담당 | 추천 모델 | 추론 수준 | 선정 근거 |
| --- | --- | --- | --- | --- | --- |
| S10 | Codex | 메인 설계·안전 계약·최종 판정, 확정 구현은 단일 서브 위임 가능 | gpt-6-astra | medium 기본, 사용자 설정 유지 | 영향2/불확실2/검증2/범위2=8. 시간·저장·복구의 교차 계약을 메인이 판단한다. 추가 추론 사용은 승인과 실제 설정 확인 후이며 이번 문서 변경으로 상향하지 않음 |
| S11 | Codex | 메인 증거 유효성·완료 판정, 확정 검증 수집은 단일 서브 위임 가능 | gpt-6-astra | medium 기본, 사용자 설정 유지 | 영향2/불확실1/검증2/범위1=6. 기존 증거와 최종 코드의 교차 대조가 필요하다. 반복 실패는 메인 회수하며 자동 상향하지 않음 |

S05 후속 환경 보완(2026-09-04)은 **수정·제한 범위 재검증 통과**다. `env_common.sh`·
`gst_plugin_cache.py`의 프로젝트 한정 플러그인 검색/캐시와 wrapper 환경 전달을 추가했다.
최초 Bash 3.2·fixture 실패 뒤 상속 경로·`.so`·root 순서·CLI 초기화 범위도 보완해 환경
20/0을 확인했다. macOS arm64 실제 cold/warm 1525 features 일치·필수 factory 44개·
READY·무음 H264·plugin 우선순위, S05 전체와 증분 build를 재검증했다. S05 등록기 총계는
별도 승인 후 보완했으며 기존 986개/S05 27개 검증을 유지한다. 다른 PC·UI·장시간은
미실행이다. SSIM blacklist는 Homebrew GStreamer에 포함된 GstValidate 전용 모듈을 일반
plugin scanner가 validate 초기화 전에 읽을 때의 의도된 실패로 확정했고, 제품은 해당
모듈을 링크·호출하지 않는다. S06 전 종료 범위
격리를 위해 `MEDIA_SERVER_STATE_DIR`와 고유 `MEDIA_SERVER_LAUNCHD_LABEL`을 추가했다.
명시 상태에서는 exact label·설정/기록 포트의 listener PID만 종료하고 기본 포트·label
fallback을 사용하지 않는다. start도 이미 등록된 exact label을 선제 종료하지 않고
fail-closed한다. 13개 실행 기반 fixture와 기존 환경 20개, 실제 nohup/launchd lifecycle
각 29개가 통과했다. 실제 검증은 격리된 로컬 macOS arm64 한 대의 결과이며 다른 PC나
장시간 운용 PASS가 아니다.
파일·함수·개별 결과·최초 실패는 `docs/release-test-records.md`에 보존한다.

V410-S00 완료: 공개 표준과 라이선스 metadata, 특정 특허 상세를 반입하지 않는 IP
clean-room 차단선, source `4.1.0` baseline을 고정했다. V410-S01 완료: segment/frame/
event link/analysis observation/tombstone v1 계약과 golden JSONL 호환 경계를 고정했다.
V410-S02 완료: 채널별 opt-in Recorder subscriber, H.264/MP4·VP8/WebM keyframe segment,
atomic finalize와 source policy round-trip을 구현했다. V410-S03 완료: fsync JSONL 원장,
SQLite primary/rebuild와 fallback projection, source policy supervisor를 제품 composition root에
연결했다. V410-S04 완료: 등급별 quota·기간, oldest-first 선택, journal 선행 삭제 상태기,
pin·hold 보호, 채널별 pending 재시도, dirfd 결박 unlink, 예상 segment 크기·partial 실제
쓰기량·다중 채널 in-flight 예약을 반영한 disk reserve, event quota와 continuous admission
독립 판정, SQLite projection 장애의 JSONL fallback, 채널별 `storage-blocked`/새 epoch 재개를
제품 composition에 연결했다. writer cleanup 마커를 내구 기록하고 재시작 catalog에서 추적
media 보존·미추적 orphan 정리 또는 fail-closed하도록 연결했다. V410-S05 local 완료: EventStorage와
녹화 catalog 사이에 narrow bridge를 두고 명시적 `utc-ms`/`media-pts-ms` 시간축만 연결한다.
겹치는 finalized continuous segment를 원자적으로 hold한 뒤 별도 worker에서 검증된
video-only H.264/MP4를 video 재인코딩 없이 MPEG-TS로 overlap remux하고, 실제 출력 packet
timestamp로 요청 범위와 keyframe 확대 범위를 함께 기록한다. VP8/WebM event 파생은 재생
불가능한 결과를 허용하지 않고 fail-closed해 기존
bounded frame-buffer fallback으로 보낸다. 공백·epoch/codec 불일치·시간축 불명확은 complete로
승격하지 않으며 기존 bounded
frame-buffer 결과를 같은 link의 fallback evidence로 남긴다. 이벤트 파생물은 Event 등급
quota로만 admission/oldest-first 정리하고 동일 event ID와 재시작은 SHA-256 결정
link/segment ID로 중복 생성을 막는다. anchor 없는 media PTS는 UTC로 추측하지 않고 segment
mapping으로만 복구하며 같은 process에서 segment finalize 뒤 재시도한다. EventRecord bounded
queue보다 link 내구 기록을 먼저 수행하고 queue/worker 포화 pending도 durable catalog에서
다시 흡수한다. 실제 remux 중에는 다른 event의 link admission lock을 풀며, marker 제거 뒤
terminal resource-release pending을 기록하고 source/output hold와 reservation 해제가
끝난 뒤에만 complete로 승격한다. UUID v2 marker가 지목한 단일-link partial만 재시작
정리하고 v1/foreign final·partial, tombstone ID 재사용을 보수적으로 거부한다.
아래는 S05 단계의 검증 이력이며, 현재 단계 상태는 문서 상단을 따른다.
S05의 `event_storage_recording_runtime_smoke.cpp`와 전용 runner는
고정 설정·시각·가용량과 latch를 제외한 실제 EventStorage·catalog·journal·bridge·deriver를 실행한다.
JSONL 활성/비활성 모두 queue=2/enqueued=5/dropped=2와 연결 5개 보존, 별도 프로세스에서
새 SQLite 재구축·후행 H264 source 연결·파생 5개·재접수 ID 불변을 확인했다.
기존 runtime check 20개와 source mutation 2개에 종료 취소 check 3개를 더해 S05 gate에
필수 연결했으며,
이는 HTTP/전체 서버 재시작, 장시간/UI/field smoke를 대체하지 않는다.
terminal complete 기록 전까지 catalog가 참조 source/output의 삭제를 차단하며, 복구 중
후속 event/fallback 갱신은 단계를 보존하고 UTC 확장은 내구 대기 후 순서대로 파생한다.
anchor 없는 후속 PTS 확장도 같은 epoch의 segment map으로 변환하거나 별도 내구 대기하며,
복구할 finalized 파생물이 없으면 확장 요청을 먼저 소비해 Partial/Failed로 수렴한다.

v4.1.0에서 검색-ready 메타데이터를 저장하지만 검색 DSL, 검색 결과 랭킹, 벡터 인덱스,
자연어 해석은 구현하지 않는다. 객체의 모든 분석 frame을 무제한 저장하지 않고,
event/track 시작·종료·요약은 보존하며 중간 관측은 대표 frame 또는 설정 주기로 저장한다.

## v4.2.0 — Structured Search

1. v4.1.0 카탈로그를 소비하는 별도 read model을 만든다.
2. 카메라, 시간, 객체, track, event, zone, rule, behaviour filter를 제공한다.
3. 안정 정렬과 query checksum에 묶인 cursor pagination을 고정한다.
4. 검색 결과에서 원본 녹화의 정확한 시간으로 이동한다.
5. 같은 시간의 이벤트 녹화를 상시녹화보다 우선 반환한다.
6. v4.1.0 fixture를 수정하지 않고 migration·query compatibility를 검증한다.

## v4.3.0 — Visual Vector Search

1. image/text/cross-modal embedding contract와 contract ID를 versioning한다.
2. 이벤트 snapshot과 대표 frame부터 색인한다.
3. exact top-k를 기준 구현으로 먼저 두고 안정 정렬과 threshold를 고정한다.
4. 텍스트에서 영상 대표 frame을 찾는 cross-modal 검색을 추가한다.
5. 상시녹화의 설정 주기 대표 frame 색인을 후반 단계로 확장한다.
6. Hit@K, MRR, 지연시간, memory/disk 사용량 fixture를 유지한다.

임베딩은 파생 데이터이며 embedding contract가 바뀌면 새 공간으로 재색인한다. 오래된
벡터를 의미가 다른 새 contract로 자동 승격하지 않는다.

## v4.4.0 — Evidence Package

1. 검색 결과를 녹화, clip, 대표 frame, track, event, observation과 묶는 EvidencePackageV1을 고정한다.
2. `FrameLocatorV1`로 같은 frame을 결정적으로 다시 추출한다.
3. package manifest에 시간 범위, provenance, checksum, 누락·삭제 상태를 포함한다.
4. 원본 녹화가 순환 삭제돼도 보존 등급이 높은 파생 evidence의 독립성을 검증한다.

## v4.5.0 — VA Review

1. VARuleLens의 개념을 참고하되 MediaServer 내부에서 독립 구현한다.
2. 단일 이미지뿐 아니라 시간 순서가 있는 frame sequence를 입력으로 사용한다.
3. supports, questions, contradictions, unclear와 confidence를 구조화해 저장한다.
4. 외부 LLM/VLM 실패가 녹화, event, search 결과를 막지 않게 한다.
5. local-first와 provider opt-in 정책을 유지한다.

## v4.6.0 — Correlation

1. track과 event 위에 별도의 versioned EntityLink를 추가한다.
2. 같은 카메라의 시간 연속 관계부터 시작하고 교차 카메라 후보로 확장한다.
3. 자동 동일성 확정과 후보 관계를 구분하고 근거·불확실성을 보존한다.
4. 기존 track/event ID를 변경하거나 재사용하지 않는다.

## v4.7.0 — Natural Language Query API

1. 자연어를 `QueryPlanV1`으로 변환한다.
2. 시간대, 카메라 범위, 객체, 행동, 공간 관계, 결과 제한을 명시적으로 표현한다.
3. 구조화·벡터·증거·상관관계 검색을 하나의 application service에서 조합한다.
4. UI와 외부 client가 함께 사용하는 JSON response를 고정한다.
5. 결과마다 camera/time/track/event/evidence/recording/playback locator와 선정 이유를 반환한다.
6. 모호한 시간이나 조건은 임의 확정하지 않고 interpretation과 uncertainty를 반환한다.

## v4.8.0 — Conversational Search & Playback

1. GPT 형태의 자연어 입력 UI를 제공한다.
2. 결과 card에 카메라, 시간, 대표 image, 근거와 confidence를 표시한다.
3. 선택한 결과를 정확한 녹화 위치에서 재생한다.
4. 이벤트 clip이 있으면 이를 우선하고 없으면 원본 segment range를 재생한다.
5. 후속 질문은 기존 `QueryPlanV1`을 명시적으로 좁히는 방식으로 처리한다.
6. UI 전용 검색 로직을 만들지 않고 v4.7.0 application service만 소비한다.

## v4.9.0 — Stabilization & Public API

1. 자연어 표현과 camera/time/object/relation별 품질 fixture를 고정한다.
2. 다중 camera와 장시간 녹화에서 latency와 resource budget을 검증한다.
3. role/scope/camera 접근 권한, redaction, query·playback audit를 완성한다.
4. long-running query의 async state, cancel, timeout, pagination을 안정화한다.
5. v4.1.0부터의 schema migration과 이전 fixture compatibility를 검증한다.
6. 공개 API 문서와 semantic versioning 경계를 확정한다.

## 버전 간 재작업 방지 규칙

- ID는 path, SQLite rowid, 화면 순서에 종속시키지 않는다.
- ID는 삭제 뒤 재사용하지 않는다.
- UTC wall clock과 media PTS/time base를 모두 보존한다.
- segment는 finalize 후 불변으로 취급하고 교체가 필요하면 새 ID를 만든다.
- field의 기존 의미를 바꾸지 않고 optional field 또는 새 contract version을 추가한다.
- catalog migration은 forward migration과 JSONL rebuild를 함께 검증한다.
- 각 릴리즈의 golden fixture는 다음 릴리즈에서 수정하지 않는다.
- 검색, embedding, review, correlation은 source-of-truth가 아니라 재구축 가능한 projection이다.
- 다음 버전은 이전 버전의 application contract를 사용하고 내부 파일을 직접 해석하지 않는다.
- 호환성을 깨야 하면 minor 버전에서 숨기지 않고 별도 major 설계 승인을 받는다.

## 기존 v4.1.0 후보 재분류

기존 backlog의 Incident OS 제품 승격, Evidence default-on, 로컬 Action Execution,
credential store, tracker 기본 선택, 로컬 VLM 운영 경로는 이번 v4.1.0 범위가 아니다.
해당 항목은 삭제하지 않고 보류 후보로 유지하되, 사용자가 별도 버전과 순서를 승인하기
전에는 이 로드맵 단계에 자동 편입하지 않는다.

## 완료 판정 경계

이 문서의 단계는 계획일 뿐이다. 각 단계는 해당 구현, 관련 개별 테스트, 문서/evidence,
`git diff --check`, 영향·회귀 보고가 모두 갖춰져야 완료다. 안정화 테스트, 30분, UI
풀테스트, 120분, commit, push, PR, merge, tag, GitHub Release는 AGENTS.md와 사용자의
명시 승인 범위에서만 실행한다.
