# v4.2.0 semantic trust migration 독립 검토

검토자: gpt-6-astra/xhigh independent semantic_review. 검토 시각: 2026-10-03T02:42:24.178Z. 구현 및 후보 생성에 참여하지 않은 별도 검토이며 하위 위임을 하지 않았다.

299행의 **source-flow trust 재결박을 승인**한다. 거부/보류 행은 없다. 이는 실행 PASS·릴리즈 승인·새 검색 기능 전체의 정확성 판정이 아니다. 판단은 아래 동결 입력에만 유효하다.

- HEAD: c13317ede01635c52ee7f1243a8b91ed3ba2b2da
- 동결 tree: 2a8afda89ab67776518584d059283c4d57d54c88
- candidate digest: 36516b45bf5be60a1e678cd27a843a8c5e389fbae3a99ed2413bad857233c4a9
- 이전 candidate digest: a24b2712b859c41677a56a45b7d3845a2bc08319b47802183b00cf577335f88d
- review-package.json SHA-256: f59ce57f0669f838efa81905e9d8d5b57615bb95e67b7223a255f2e2ba0ab562
- reviewed.patch 및 현재 tracked diff SHA-256: 46f480815571eb6f0ec6fca356b24b79fe1538cc34db678ca203d83ffdb55b06
- 판정 파일: independent-decisions.json. 299개 ID 순서와 각 행의 feature/source/verifier/dispatch/evidence/action/state 및 근거 hash를 원본에 결박했다.

## 직접 확인한 변경과 판단

1. **HTTP route 본문 — 297행.** 이전 승인 trackedBlob SHA-256과 일치하는 Git 원본을 찾아 전체 diff를 읽었다. src/ingress/webrtc_http_server_runtime.cpp의 이전 원본은 b0fc2ea7db4900bbd5bc01b1e0e8d0cc1de6ca5e:해당 경로, blob ea487ce9fb7b4400498d4a3ecc651389a0076d5c다. 유일한 source 변경은 현재 771~787행의 /search 및 /search/seek GET 17행 추가이다. 공통 Start 및 그 안에 결박된 broad body의 hash가 바뀐 것이며 기존 297개 행의 route/dispatch/action/state/readback 의미는 유지된다.

   현재 435~450행은 녹화 prefix와 RecordingRequestGate::Flight를 한정하고 개별 요청 thread에서 처리한다. 738~760행은 기존 require_ops_principal 및 source:read:<channel> authorizer를 유지한다. http_auth.cpp:2805~2827의 RequireRole/RequireScope를 읽어 admin 예외, authenticated operator+ops:read, viewer/integrator 거부를 확인했다. 녹화 검색 service의 Search/SearchSeek는 Parse→Authorized를 source/snapshot 조회보다 먼저 수행하고 principal/scope/query로 snapshot을 결박한다. 응답은 지정 필드만 직렬화한다. runtime.cpp:790 이후 media range/fd hold, close_webrtc_session의 subscriber→tap→bridge 순서, generic/WHEP/WHIP session owner/capability 분기와 Stop의 Gate Close/Drain은 diff에서 변하지 않는다. 검색을 미디어 callback이나 source worker 생성 경로에 넣는 변경도 없다.

2. **공통 CSS — UI-020/021.** 이전 원본은 037d42ee754a6d17162fd1d0bf2d75a627bb1b7d:src/ingress/product_ui_css.cpp, blob 0216bae7aa462c8d2444a480ef6c30a0eb8ebda1다. 현재 5683행의 #opsRecordingPlayer selector에 #opsSearchPlayer를 추가했을 뿐 모든 선언은 같다. desktop·760/560px media 규칙, token, 기존 nav/table/form 및 모바일 control 제약은 그대로이고 새 플레이어도 width:100%/object-fit:contain을 사용한다. 반응형 소스 연결의 유지로 승인한다. 기존 readback은 CSS assertion이므로 1180px 이상 또는 320/390px 실제 시각 PASS를 뜻하지 않는다.

3. **동일 파일의 Rule UI — 11행의 보조 영향 확인.** product_ui_page_scripts.cpp의 이전 원본은 c37949e31985ea351d86cf0a262a95420ac96a5e, blob 48bb2d86d0164d23d3a34789eef1f482611d0455다. RULE-001/002/003/008/011/012/013/014/015/016이 사용하는 refresh/render/form body는 그대로다. 추가 코드는 10369행부터 /ops/events + opsSearchForm 존재 조건의 독립 lexical block이며 opsSearch ID만 조작한다. product_ui_server_pages.cpp의 이전 원본은 037d42ee754a6d17162fd1d0bf2d75a627bb1b7d, blob 74414b40917e9674340319bd069e64567d0c2761다. RULE-017의 AppendOpsRulesPage 842~1515행은 그대로이며 새 form은 뒤의 AppendOpsEventsPage에만 추가된다. 기존 Rule/Profile payload와 vaRule 호출 정책에 간섭하지 않는다.

4. **중복 anchor locator 보정.** 검토 범위의 MEDIA-007은 4999행의 session owner/capability 및 missing ICE payload guard 뒤 AddRemoteIceCandidate 호출로, LAB-026은 4675행의 snapshot JPEG response로, LAB-027은 4734행의 overlay JPEG response로 직접 확인했다. 같은 문장의 다른 분기로 이동하지 않았다. 검토 범위 밖 EVT-009/010/011/060, SAFE-084는 위치 보정 뒤 이전 hard candidate와 strict equality로 돌아온 5행이며 새 독립 승인을 만들지 않는다.

## 행별 범위와 소스 대조

UI 13, AUTH 25, SRC 43, RULE 89, EVT 31, CLIENT 38, MEDIA 9, LAB 35, SAFE 7, OPS 9 = 299행의 기대 계약과 route/action/state 연결을 읽고 위 실제 변경과 대조했다. 각 행의 구체적 연결 위치·의미적 승인 이유는 판정 JSON에 기록했다. hash 일치만으로 승인하지 않았다.

읽기 전용 비교에서 299행의 78개 파일, verifier 외 1,521개 role의 실제 blob·body·anchor가 후보와 동결 tree에 모두 일치했다. 61개 verifier command의 현재 파일·dispatch arm·연결된 harness binding도 일치했다. 299행은 trustBindings를 제외한 hard semantic 필드가 이전 후보와 모두 같고, 별도 687행은 strict hard equality를 유지했다. 이전 audit→approval의 ID/source-flow 직접 결박도 확인했다. 후보/기대값/승인원장을 수정하거나 생성기를 실행한 결과가 아니다.

읽기 전용 dispatch 비교 초안에서 optional connectedExecSha256의 undefined와 직렬화된 null을 서로 다른 값으로 취급해 불일치가 출력됐다. 기존 buildReview4TrustBindings의 null 정규화와 같은 기준으로 다시 비교해 실제 file/arm/harness 차이가 없음을 확인했다. 이는 검토용 비교식 오류이며 제품 검사 실패 또는 제품 PASS로 보고하지 않는다.

## 한계와 미실행

제품·정책·fixture·승인원장 수정, 테스트/빌드/UI/장시간 실행, stage/commit/push를 하지 않았다. 소스 검토와 JSON/바이트 대조만 수행했다. 새 V420 UI 30개 연결의 동작/시각·플랫폼·장시간 완료는 이 승인에 포함되지 않는다.

메인이 알린 Linux/GCC 16 raw_video_decoder.cpp:363의 std::atomic<bool> 불완전 타입 빌드 실패는 독립적으로 실행·확인하지 않았으며, semantic 재결박 승인으로 해소되거나 PASS로 승격되지 않는다. 해당 플랫폼 빌드 blocker는 메인 실행 기록에서 계속 추적해야 한다.

출력은 이 디렉터리의 independent-decisions.json 및 review-notes.md 두 파일뿐이다. 서비스·브라우저·포트·지속 프로세스를 시작하지 않았다. 동결 diff를 다시 읽어 동일함을 확인한 뒤 기록했다.
