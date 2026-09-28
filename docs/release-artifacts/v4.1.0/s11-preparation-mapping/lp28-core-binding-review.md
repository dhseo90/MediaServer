# LP28 core binding 읽기 검토

독자: 메인 구현·검증 담당자. 고정 binding 준비 실패의 정적 근거 기록이며 실제 UI/PASS evidence가 아니다.

`coreProjectionSha256`는 sourceSemanticDigest 하나가 아니라 canonical 5필드와 semantic context/expectedBehavior/verifier 7필드를 해시한다(코어 파일 671~683행). HEAD 값 `64f441ae…23727`에서 현재 `6bbf0508…4305`로 변경됐으며, JSON에 14행의 변경 필드를 전수 기록했다.

UI-005/018·AUTH-029 context 재연결 외 11행은 앞서 승인된 SRC/RULE action·readback 연결을 소비한다. **의미 무변경이 아니다.** canonical·controlSelector·requirement·flowKind·semanticObligation·expectedBehaviorSHA 및 native diff의 실행 route/method/status/selector 기준은 유지된다. 이전 source-binding 승인을 실제 UI나 전체 requiredOutcome 성공으로 확대하지 않는다.

추가로 core 자체검사 28행의 `ba1b213d…e9d`는 HEAD core 상수와도 불일치했다. 상수 한 곳만 수정하면 같은 종류의 다음 실패가 남는다. 메인이 2개 상수를 명시 보완하고 core/native/combined 기존 계약검사를 수행할 예정이다.

core → combined catalog SHA → native case projection/catalog SHA로 파급된다. 직접 소비자 15파일을 JSON에 전수 기록했다. 이미 producer가 반영한 native는 176행의 결속/identity 등 변경이며 130행 exact oracle spec SHA가 달라졌다. 자동 재생성·자동 승인은 하지 않았다. event/client-safe는 별도 고정 catalog지만 combined SHA 파급은 받는다.

추가 조사·테스트·저장소 수정·candidate/proof 변경·producer 실행 없음. 이 두 temp 산출물만 메인 이관용으로 보존한다. 프로세스/포트/fixture를 만들지 않았으므로 별도 cleanup 대상 없음.
