# S09 UI 실행 67127 실패 기록

## 재검증 61366 — 423pass/1fail, EVT-058 응답 누락 재발

독자: 개발·검증 담당자. lifecycle: v4.1.0 실행 증적. source-of-truth는 중앙 release-test-records이며 이 절은 실제 61366 원본의 안전한 필드만 보존한다. 과거 결과를 복제하지 않았다.

명령 `./test_ui.sh`; source522aab3e; terminal exit1(메인 관찰). canonical 시작 2026-09-11T09:22:05.027Z / 종료 2026-09-11T09:46:05.756Z, elapsed 1440729ms. root summary sourceProvenanceEnd capturedAt=2026-09-11T09:46:09.094Z는 최종 provenance 관찰시각이며 프로세스 exit 시각과 동일시하지 않는다. root summary에 독립 terminal timing 필드는 없다. token start7868391(메인 제공, startUTC09:21:35), end/consumed는 아래 메인 후속 관찰값으로 보존했다.

Canonical selected424/attempted424/pass423/fail1/notRun0/unsupported0. 각424 summary SHA 및 ID/status, policyInput SHA를 실제 원본과 대조: mismatch0. action 1089행을 trace 배열 순서대로 아래 별도 보존. action status 미기록은 pass로 승격하지 않는다. 실제424 case PASS 합계와 action 판정을 혼합하지 않는다.

finalizer: aggregate에 suiteFinalizer 필드 없음, suite-finalizer 폴더 존재=false. 실패 case 때문에 실제80 visual probe finalizer 실행은 미진입이다. qualification/120은 not-run. cleanup/ui-final-integrity PASS는 실패 증거의 정합성/정리 범위이며 UI 전체PASS가 아니다. 녹화8ID 포함432전체 및S09완료 근거가 아니다.

### 61366 stage 전수14개

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| preflight | validate actual bundle inputs; duration0ms | pass | stage 원출력 |
| build | ./server.sh build; duration758ms | pass | stage 원출력 |
| ui-environment-bootstrap | bootstrap acceptance-owned throwaway server/auth roles/Playwright storage-state; duration1125ms | pass | stage 원출력 |
| ui-exact-424 | ./server.sh run-v390-ui-native-exact-cases --output-dir /Users/dhseo/Workspace/mediaServer/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911092202-72829/ui-exact-424 --http-base <URL-omitted> --role-state-map /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-xDjXTc/role-state-map.json --server-log /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-xDjXTc/media-server.log --runtime-descriptor /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-xDjXTc/runtime-descriptor.json --build-path build-gst-onnx/media_server; duration1441325ms | fail | stage 원출력 |
| ui-server-cleanup | stop exact UI throwaway server and verify ports; duration0ms | pass | stage 원출력 |
| cleanup | validate child cleanup and preserved evidence; duration0ms | pass | stage 원출력 |
| ui-final-integrity | validate canonical UI parent/424 children/Policy/current run/source/cleanup; duration0ms | pass | stage 원출력 |
| report | write acceptance summary/report; duration0ms | pass | stage 원출력 |

미실행 stage(완료 evidence 불가):

| 제목 | 수행내용 | 사유 |
| --- | --- | --- |
| feature-gates | 실행하지 않음 | summary status=not-run; suite 선택 또는 선행실패 이후 미진입 |
| server-longrun-30 | 실행하지 않음 | summary status=not-run; suite 선택 또는 선행실패 이후 미진입 |
| ui-fulltest-qualification | 실행하지 않음 | summary status=not-run; suite 선택 또는 선행실패 이후 미진입 |
| longrun-120-decision | 실행하지 않음 | summary status=not-run; suite 선택 또는 선행실패 이후 미진입 |
| server-longrun-120 | 실행하지 않음 | summary status=not-run; suite 선택 또는 선행실패 이후 미진입 |
| final-integrity | 실행하지 않음 | summary status=not-run; suite 선택 또는 선행실패 이후 미진입 |

### 61366 실패 세부

EVT-058: REQUEST_LIFECYCLE_FAILED / RESPONSE_MISSING. {"census":{"requestCount":131,"responseCount":130,"classified":131,"unclassified":0,"multiplyClassified":0,"captureErrors":0,"duplicateResponses":0,"failureCount":1},"target":{"requestIdentity":"EVT-058:object-111","legacyRequestId":"native-request-57","method":"GET","path":"/ops/api/site-operations/impact-graph","start":{"sequence":165,"timestamp":1789119672434},"responses":[],"finished":[],"failed":[]},"seal":null,"afterSealCount":0,"diagnosticErrors":0}

원본 terminal 값은 해당 요청의 response/finished/failed가 모두 없으며 seal=null이다. 이전67127이나 단일31380 성공의 terminal 추론을 이 실행에 대입하지 않는다. EVT-058은 1789119671587~1789119703667, 32080ms이며 action3개는 PASS다. primaryFailureEvidence와 failureProvenance는 null이다. seal=null은 settle 성공 경계 미도달 근거이며 timeout 원인은 직접 로그 부재로 미확정이다. 원인 판단/재실행은 별도 메인 범위다.

### 61366 case 전수424행

| 제목 | 테스트내용 | pass/fail | 원본 child summary SHA256 일치 | 원본 trace SHA256 |
| --- | --- | --- | --- | --- |
| 1. UI-001 | / → /login; role anonymous→anonymous; 390×844→390×844; light→light; child exit0; 872ms | pass | 56a773a311ebfc5a5cf5f34010213f17156534285224765d64bea19467b7b0cf | d3d29bd08a1c1ce1e5bf12149a6c1823c019708303dce9d45b4e68dd04f328bf |
| 2. UI-002 | /setup → /setup; role anonymous→anonymous; 390×844→390×844; light→light; child exit0; 2138ms | pass | ed8b12ab0a58ce5f8559fe1cead04f7291e140eb8169a3e2a7d43b99427b665f | b836ca6e22046a9bd1d353a11b8700cef8250bce969e2691d2c147ca974038dd |
| 3. UI-003 | /login → /login; role anonymous→anonymous; 390×844→390×844; light→light; child exit0; 2273ms | pass | c97f0a0325436e81a2fd12ac12d6de350f4392b9fb9ad8a0ba39ded6fbe65987 | 600597e509aecb47cdde98b90aa697c0814daa6f43e44ea6a451b93c8ab72c02 |
| 4. UI-004 | /password/change → /password/change; role operator→operator; 390×844→390×844; light→light; child exit0; 2657ms | pass | e9d9ef6438dc443cfe16c0e544e3f2e865297b4c1138e8e889de1d0657747b3d | 8cdc83da8dee0eaf54234098fc251a4b2a02ef2afc4ab1627604e5f6fa83ae39 |
| 5. UI-005 | /logout → /ops/home; role operator→operator; 390×844→390×844; light→light; child exit0; 2125ms | pass | ad4d11799a93f8b82d565641f80a741fc4a77a51854454e3c96073d8bfaed68d | 3a85d47878e1656baa4d1a34e403e0c60b99d402f43d5d6ce6986273dd229237 |
| 6. UI-007 | /invite/setup → /invite/setup; role anonymous→anonymous; 390×844→390×844; light→light; child exit0; 2300ms | pass | 01f2746ec29664e1d5b2f8fa763bbfd6fdca93236045c44dbb18f327b03aaea4 | 0aa56aef226396c3f62d7a5b8fae317a7a017b30975b125ee778b98d449c078c |
| 7. UI-008 | /client/request-access → /client/request-access; role anonymous→anonymous; 390×844→390×844; light→light; child exit0; 1925ms | pass | 11c5b3cf6048da27acbed7e581c9cfe52c046ebbf33550bb708d9ec6f5fde155 | 7f6f95b5e13f53d9f1dfd2f493ce2a45977344a9e592053dd20676030a27cb1b |
| 8. UI-009 | /ops/home → /ops/home; role operator→operator; 390×844→390×844; light→light; child exit0; 1734ms | pass | e6fa0133de4ded9dbe0f53cd301ce04ff65391d2ef525e73ddac879b76df91cd | c007c0e90fe638f0b8405e09403bd41fa84e66d5a87dc2650c6cc4f932ab330e |
| 9. UI-010 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1813ms | pass | 674e408f21bfd701949dbfc9b219d310e5b9dc6025524b3c40aa4f3381ef0ff0 | 7ce725aebb0c8d4d5dc79ac8ccc0ae14aa9fe66428c0d8cb5794e418b4dc9fff |
| 10. UI-011 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1747ms | pass | 39839fb50ab419caf1a0810ff4b17fb302dc3137e36abe3bc70921f36d9a0731 | cf167cea512acbe778d5eb261dfcf706b360e15e5dd126c906faaabe0071257e |
| 11. UI-012 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 1707ms | pass | f9cd57985639a19732f69d1cde4c41577c87f09b4597c7d1d868fcc350206a14 | a749a5715fa361a961473610c69a2440f98e09fe4f9b61c2e7e4e823d5f19017 |
| 12. UI-013 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1703ms | pass | ed7f1b375975499a12b63d22ede4af924d2ffcc9f663a8b4deafa95b9be58d88 | 96c2b48482573284f25592fcb6d8092a834b1f9d0cd8123de2ea3368b97fc81b |
| 13. UI-014 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1917ms | pass | 024e0d50b06b13339dfecaaf3b9048c9407afa5d9e36cdb96075b76523fbbf4c | d2c84aacde3231fe0a11c428afd41b699740fe5ae1e278d54dd14e0cc93859ee |
| 14. UI-015 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1734ms | pass | 61e799d460817c48d27b4c6a60d20022de4074edc1752e2b4a041de6c31e6f4b | 01818e82b21107757772fb4358dc872c70ac9621677f404439af444265f82cd5 |
| 15. UI-016 | /client/dashboard → /client/dashboard; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1681ms | pass | 9ea07d3a3195d02cd42f229dbb78edbb8ccf969b3673b8f36a40e596f69a37fd | 9e5a599e421bf8fde4ea0988bd149a0e4fa051c3c807642843e42e8ebb7ecc2d |
| 16. UI-017 | /client/events → /client/events; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1622ms | pass | 32bc2790826a11f61498cda6fe63d9af83ffadc58eb7fb29f39e32d13c012098 | 67320f940a22d315aceafea7b29d8946822fcc942d594ef0bb4e4eb50f7564c6 |
| 17. UI-018 | /lab → /lab; role operator→operator; 390×844→390×844; light→light; child exit0; 873ms | pass | e7384d8264b6c24d01b70447b221c03f3f98f128c44342a14b5ce08f9f5c6839 | e68b1391cba27aa2929da0b06f100de454c8147a59475e6b337f6cdacf572edf |
| 18. UI-019 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1680ms | pass | 33158760668fc92d9e61aef30325196fef9f43e012381b91c5e6b2d71f676d77 | aa881b478460d0ea5903a1853ef4438e33f7ac5fc42d27fe4034d1d3ca71cf1e |
| 19. UI-020 | /ops/dashboard → /ops/dashboard; role operator→operator; 1440×900→1440×900; light→light; child exit0; 1942ms | pass | 1e6d05f848d28ee005ceba3ceef23b8e55f59bcf52a138e73d8d0c5fd92873d8 | 81e1113c1628c8f3d332c5c854fefb6098a68720f2ec4d13f33bb3df8aeb6eca |
| 20. UI-021 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1703ms | pass | 7f6a82616a4f8861899dd27efc877f302be9a70171965f09f34e467ad6b25744 | 6102fba9921c765948a3e32bbbde9ca04d323791852a78ab64488fce463a7231 |
| 21. UI-022 | /ops/vlm → /ops/vlm; role operator→operator; 390×844→390×844; light→light; child exit0; 1780ms | pass | 2e5ccc506545524a94d28522157a482f6f85f83e42df4b214f54951917609371 | a8a52842bf7a7649a5cf18af581dd7159b2c05828d58782ae398c18b53082698 |
| 22. UI-023 | /ops/vlm → /ops/vlm; role operator→operator; 390×844→390×844; light→light; child exit0; 2777ms | pass | 53e2842b53409ec39b89410e4ada4bdca1fae688818620cf74ae16b48d36fcb8 | 43797214fceb9187de20ae91f14d7c9d027150a18bce7e6e89e856057aa18b2b |
| 23. UI-024 | /ops/vlm → /ops/vlm; role operator→operator; 390×844→390×844; light→light; child exit0; 1740ms | pass | 4b7c29b5844d71c407db278020df0e05761621358804e97f8c63af6c1f31050a | be291f3f54a6f9f46bbe9c50d51b2b30c92a33090d154c87bfe877cd652721af |
| 24. UI-025 | /ops/vlm → /ops/vlm; role operator→operator; 390×844→390×844; light→light; child exit0; 1981ms | pass | f11ae4e83b72bdc14338c02b49effceea0cd874b95aa86d249e61ce8b92d6179 | 06c0c9f32b8c7f6c3ca1fd978536719b8c605586004cd471082a680ee8d85afc |
| 25. UI-026 | /ops/vlm → /ops/vlm; role operator→operator; 390×844→390×844; light→light; child exit0; 1956ms | pass | 8e6df642b84ef0d376baf58c7e04b058b65213f1de483b1092f0093e4f633135 | c652d48cd927b4e8f50c5bde570642200af04cac5341adf792cd42da39f92c29 |
| 26. UI-027 | /ops/vlm → /ops/vlm; role operator→operator; 390×844→390×844; light→light; child exit0; 1728ms | pass | 59376ec4aa99d4313aadad9580fafd7e00c908c393960fc45d823ffc35d072d1 | 7cbb17555dd5d4950b40f810fa98c1faaedc8dca2d40d11f1bd1aff348d84804 |
| 27. UI-028 | /ops/vlm → /ops/vlm; role operator→operator; 390×844→390×844; light→light; child exit0; 1923ms | pass | 9ee1eae75bde1100585af96d1be79c0499af81221ba4e8a088f8de48e05834e9 | 048504207110144b8f7200ae0aa5de87abc24d0a6d7b287fc1d73db091c68c52 |
| 28. UI-029 | /ops/vlm → /ops/vlm; role operator→operator; 390×844→390×844; light→light; child exit0; 3175ms | pass | 53c00775c956ef797864e67b709f02f585749ac586f07d85f5003d2902341de9 | 08732b25c69cddedf06124427fa02f3c680b8c0be5764d0e19d7aefa63273704 |
| 29. UI-030 | /ops/vlm → /ops/vlm; role operator→operator; 390×844→390×844; light→light; child exit0; 1762ms | pass | 4af3dbfa794e6af593f32f078b0b2bc2fd84695e596d52eaa3a534dc34b243f8 | 32377d44f2a16cff4202f1f76169b62daa6d0e0d289cd0f6a73003125a7d0f38 |
| 30. UI-031 | /ops/vlm → /ops/vlm; role operator→operator; 390×844→390×844; light→light; child exit0; 1648ms | pass | 4f992e7e0f325fde40fe23615e888c5ccd1d81b82c44ec70c7cae1fd267243a0 | c9cef0c56608a7774af7ff5658af2525139f02598fed80bd1901b3e5400435c0 |
| 31. UI-032 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1951ms | pass | bcbedb8c00718521f2ce2baf996755337800b2eebc9570b52956f975c9e288be | 1273f9716abd9a4b19e69f80dcc411fa0a8a0f34f6d1b023b2241c0978a2af71 |
| 32. UI-033 | /ops/vlm → /ops/vlm; role operator→operator; 390×844→390×844; light→light; child exit0; 1669ms | pass | fe0995e6a171eb5abe4fb1df39768c8e09d13f6709748092364b42088ac668f0 | a109428a5db052869e9bc58f144bb89b001cf07ef270cfd1a0b34bddd00aaf97 |
| 33. UI-034 | /ops/vlm → /ops/vlm; role operator→operator; 390×844→390×844; light→light; child exit0; 1761ms | pass | 697d887ccc792e687bcf1c2c5ac00de89ca7a9fce8e5662de683acfd47eeeba4 | 9327f8e53a02c6ed4058f5885cae663153b70b4b2728664434d2d1e30de3edd8 |
| 34. UI-035 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1958ms | pass | 95f345f5caf3afa0c59e8bf5f31dbaf5df18100ee54bc52e077b2c9d7df643a9 | 9bcb8933fa5b0753c4f6c8f84f969c96c9b8d1dbcf0f725396cdfa6287c92c65 |
| 35. UI-036 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 2054ms | pass | 6e06478fcab97ebb4742106ed4b35e0732c0160fbf8b1afb5da0a13bcf7c714f | 2170ce954e028af169cdc51aaed914b3984131c37a72e8e9d4e2baafa8fe7150 |
| 36. UI-037 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1662ms | pass | f2a2b4ccf93127eb3d7264b55fb85422552af2a7a9acd197af53b53754538c05 | a22274fb9d8a5dffc7ee43fe63f31668450b52727baea2529c3a8fa2707b6f95 |
| 37. UI-038 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1663ms | pass | 587138820be1d3c68b604d0b293294384bea0a4941684f22627e96e5d7aa22b7 | b1303b9b1895419592e04ad02d43cdd1f8f1b0af01779fe880a30ab62c35e880 |
| 38. UI-039 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1667ms | pass | 7f3cf607820ea09d41f466f7c7b1775c26d6c3553b453d1ed9f6b777b95e06ed | de0fd72d191eae595f4e9414e27e7918f3fb6394f35a850c6ef923d2806c76d4 |
| 39. UI-040 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1678ms | pass | 5cea23bc4b3f8be091cdb8c4c0eda47da37be3aa551a49b8198538a2e3f61a76 | 8bde24444ca1de60da459cbf962d4407d4d4279239aeb59e9f4f5ae8d3c01a5a |
| 40. UI-041 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1667ms | pass | 5a1d5e06f9e498316b392158501b5b9fa925159df74ff294dc335454ab5e4a04 | 76b7f33bbf3c8736be922e97a72b675fcdad046abeb24e9219f0045e817baa0a |
| 41. UI-042 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1686ms | pass | 0d17cfd9e5728ba39eb60700346e93429469ade947202ed990e693ef049d9810 | 135200d433885be5ace6b9a941e09ac81d1920eda6427a5970391866b801ae40 |
| 42. UI-043 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1708ms | pass | c761052795198e3946f160c93c0cdaa219f19e79812bed89cb465128de4ece4d | 37a840e8d6efff585e2d2841b825950b7e5399c0d3e09b7d8cc524bc2922fbe9 |
| 43. UI-044 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1671ms | pass | dd9fe3149dcd05678f25812a25badab26f085d174de13b1a59d90dd58186eccb | f8d6ea340cf56de35bd3712aca7da3e9b0f62300c89a1e2b0e4489f19d5c110f |
| 44. UI-045 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1955ms | pass | e448d034aafce6fb8a8f2ccca0edc7e0bfb8e7e507aa11b95137b6e465b7e4ab | 31eb2ad9a264101c95dfed8e2348a13f6150d9966d934e7f911c2936bbf76744 |
| 45. UI-046 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2231ms | pass | 8f310f32c812739a46660a6bcfd40f77a2a8357e5b6328d0b9c6916dc6c9d63c | d1956b3699609bffc1ebed5a146e329c4dca526a4f3b475699f68f6767aefe57 |
| 46. UI-047 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1782ms | pass | 634772ef770444cea9562abaa1d9c1277f38a70c2ee04ab2147b0cf9ac2965e1 | ece8433f3efbe21014b05deff637c4ee728db595bcc8bfc93d1dd6be670266d2 |
| 47. UI-048 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1812ms | pass | aae1c53b7b4bca75d7303efe1cad739a994f16a86407ae5386ae18d44d134974 | 10b6179a5ba50357b2ae812814ebe3678cc53024b2a6e836d2bd78e44cf2f172 |
| 48. UI-049 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 1939ms | pass | 5150c5961e9cf09c3709e86eb49d9f47f25c61f058a8db0cf5dec98b35eae285 | 257751483fd88d9a1165562f8921e18df68eb535a402abec0afc083150cc1365 |
| 49. UI-050 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1667ms | pass | 11d8a6d4810a2ba6ef53b21307569f319771f63ddb2e2476ba7c8f15db8fbd5c | 9c14488bb887cc040cef5bdca225a949c985f01d469ea310486f152c4b7c7b78 |
| 50. UI-051 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1745ms | pass | a711f3675b48fb3279eb439704db4a73acb2a74beaf3169f9f64cea2a2bd6c88 | 4523be8b5fb79cb7e0c414a60649af3cff595198178c1fc17b506b38e6db228c |
| 51. UI-052 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1781ms | pass | ffb9d79b5d2a2a9a463e3123ad9d7110ff0b141887bd2219a9c724adda470fe0 | edb15d4273b146fb1188136154f1ff62edae82231822c786adbeaf1782ef627b |
| 52. UI-053 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1782ms | pass | 14405ebefdd46958d4dd6f6bccfb47fd23c927afcfb3260bf7145878cca8b08d | 2660f640e57cde6391ffb0db3598ef08e1639459fb0427c98aa4617b6df91143 |
| 53. UI-054 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1684ms | pass | cb6abd2ec1b843d59f75607f48f62fdea9858ba36420c4f69d4b5515140be7d1 | 39ba2548a07f0ac46ca9255b7262609b7cf2e61125e3811f5edf5d0abce85d98 |
| 54. UI-055 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1677ms | pass | df4437d2cd879cb3d0602c62a69d48cbd5af4068b1165adf4e1c46b825a951d5 | 7b21f1dd84553bed51c00da013079094acf1b7cb30cb3a4c54691c7df2251dc0 |
| 55. UI-056 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 1724ms | pass | 84887934fb5bc782a6a1c50d0b29c9d30f66c24597fbd49a3d01927c88c1f2bc | 56623f13de57761ea64b6e18cd7ea6c76d3c43b085fe8cb7fb9ef5a3a42d513c |
| 56. UI-057 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1724ms | pass | e7c8247517a5daa47db2b4618b99ac8dad93db0273dc71ae82083aaf3eac6630 | eb88e6f94d9917f5b4c695a18ff7d69e693817174dd065edfbaee6341b1ca359 |
| 57. UI-058 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1657ms | pass | be99deba884536d0ea70a41d7bc04648938227474bf8ce84127156d0e35c63e6 | 4018e91aa5848d05f1f5073db027893f309cea2f913cb14a445983943ad3ffd6 |
| 58. UI-059 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1713ms | pass | cd09281eccc135c6ebe6ec357bab62c7547a5e7d51adb00bef165eed3df5a696 | 2c20bc8bf31e086f92b59be387fa59dc7a23088828fb531b3d694ea0d569a4da |
| 59. UI-060 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1713ms | pass | e029fa26b1b3b73df8403de94d4ff374ecbcf32990a53cea784123a5a0f0afe4 | 9bbce7e6e9d6b0494221caa4cd284c6e98826a0b2f0b39568e60031296be3ff6 |
| 60. UI-061 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1677ms | pass | d9cecb028a0c89b56a8b7253473c95ea5ba7695f476ec076ed7cf82bdc61c01b | 6184ce96f4e6e9006478e2e32b29d9bef4ada5d8bc84db8a5544f60d11a60c8d |
| 61. UI-062 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1701ms | pass | c4f67144453694f09a8a1991f13975fde4f85db3b3b59104285665973f8ea80b | cda8cfa99ae3c242d74cdb1d99833f643907f943e0b86ec10ecb8a35db9693fb |
| 62. UI-063 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1681ms | pass | 9d273a6e35bbc0fdb1c88e3863899de565262980c79eba3ef6cc9155ea9d602a | 00593ace82ba7b2c611be52f025973273daba7442f22d7859c9db6e1de2f68c0 |
| 63. UI-064 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1737ms | pass | ddf7ed6a04ba88491f08c8b042f02d2d6a18a9915241f3fa18cdac2820758c18 | 86a4e10b18fd346728ef80db0c897cfcf9f94ac8a8ddc0933c1ca3b721349cbd |
| 64. UI-065 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1773ms | pass | fa3a73d87255f0e12686b81894ed377e362c8fe0a16259683ae76ecd5fc40a55 | ddb43c308409cdeeded4d20f24745d08bb4fe222a663bb5546ddc0df68581899 |
| 65. UI-066 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1838ms | pass | 66155e4ccc25723989c2b096dcd0bd989ee2c2653a1d5e6380f79d82b5273b02 | b856757863e7e844cc9e1e69a7aff072c7070d69f2d90e0659674a3939b43cd5 |
| 66. UI-067 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1773ms | pass | 931a16fe77ff720562ee55a12a0f8414f4200aa02defc69e739910399265d614 | 3ea6affaad55b11321923de645f7b073752744b313ce8611050172b2545b44c0 |
| 67. UI-068 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1728ms | pass | c561ede58fd23b8d57e1bc6ff78b839eb8271eb1266f5fa928112c17017eb3db | c415c4b4937e5c0fc8e682e0cee3a72fac454ef0d8f6aab73d42cb4e427f25e7 |
| 68. UI-069 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1768ms | pass | 65ae5551b21971235840c2be658b7146d276b7cd56d9b3cb54f9a1cc8a27eb4d | 7b917416046d8e22500a0feba34708e4f9b148843b04d5136f482baba4a8b591 |
| 69. UI-070 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1782ms | pass | 2495306ee93e23e6650c123b96306def001aeeba0d28ea9b43d6b27abf6de59e | d5109db129c4fe9d09839f4b9dce0a38b126cb5af997383495401da8e1fe4593 |
| 70. UI-071 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1779ms | pass | aef22ce0076fe5d4aafe3e5c9d0e464e835427ec3faf8f22076ac3100f89b0f0 | 0b39063afa6153b592a92aeb9a6bb6c787505ff00a7d0c1e29c97d7bf29c3093 |
| 71. UI-072 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1714ms | pass | 38b0e76f223231d4745c5a1102ff50e95e4e58079fa8c77b571c83b8b46a2897 | 8eb99326ff5cb83e610158f3e2c54065bc3fd0dd0569120e4de17b83d318326f |
| 72. UI-073 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1785ms | pass | 5c55381a294f1cda8e75a607e091e795b33963bf80b283512d761a8e12f59f43 | e081f10e692c6b82076f01f84e4e00e1d1393c751c4ca755958e4335df02d4de |
| 73. UI-074 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1755ms | pass | 7ce92201e00607a49d93dc2bea69c0d96c1577513e3480a56e7d7712e4d72fb6 | a294aaee81808db74df1fcb5cb315d4e242c873afa6683900c791a78fcaa1572 |
| 74. UI-075 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1764ms | pass | 62fe3f68c51e4dc2de1d34bcfd6ce03adfc6f55b40143d653d91edec4d2a2f09 | c1d1c67db106e8caa0c41bf6e06abb4c6b509f3d624a4e4a7fb6ce909e19d6a1 |
| 75. UI-076 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1667ms | pass | 1bfca6494911a1b861c95b743a4822360bb47a4b3a6f72f4b49de1c2b740991b | 90c0a856bbbdd81953efcc1b50be06a4e153c826a35f9167c72f7d5a78c95a7b |
| 76. UI-077 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1670ms | pass | a44b6b25d9c787e68ab1299ba3d82139183d5c40c3bc29d788a54b9a8503a017 | 9e9b5bb30520a0f112426f9deeeacc8332798e63c5ba0b3510d27db395329bb4 |
| 77. UI-078 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1682ms | pass | bfc4caecc2e62a6d5da2c1b15cefdd18d80da05eadb586a92c01d0557aba8f3d | caa0167a20f534d4087c27a47146a85557aa0701beb22f3182a68a52cc334471 |
| 78. UI-079 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1688ms | pass | 7a07067fa94067fd0641f67e1cd5b551d754f0b4177724f685518b330eb45af6 | 52813259c1470a0ca90bb4c6276f1cf1c4a120e9cf4394f92c109fbda913f39c |
| 79. UI-080 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1785ms | pass | 285dc5f5640458ff8ed7d89266671384a0a8e3fdb44ec1bc059efb0b29ac9ac5 | 208892667ffe1d4d6349b518b523e8ca1b43402ad4a05161c70a5952125504e3 |
| 80. UI-081 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1825ms | pass | 09fabb8de70912dd0f242abe79e2c85231b97834b49517c4a2c3689db5aad046 | 2e925111b6eaa176acefbc22a70e93b8614c76205770d8bc4e785b554aa84fcf |
| 81. UI-082 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1795ms | pass | cb6a8912c8eeba0a11bd8255497f2f1c235260a96f1982cf8c5301f1211df8e2 | 1c2f0858cfe517c60ad0362a6089a58a1a0e35b7273f2a50bc4d8b79ee4204f6 |
| 82. UI-083 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1682ms | pass | 9f3cd6bec685c8a4cb8b15f5b5a0e1edcfb98da4f40a81233ac0abfe3bd2f77e | ceacefef816cdb52a8148089166059abbeb02b9f08169f39f307106a8a9122dd |
| 83. UI-084 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1709ms | pass | 89812912cd610bbb2202e1bfd8733c83595bb214e390ec07786e7f0a82de2969 | e9eff976074d3f8717cdd70b279544e383b69303fa94592a2b8d88ea9273284b |
| 84. UI-085 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1845ms | pass | db993643fbfac7bd3e1d5677d6eef91a55d8b8b6143e536206ebb77bd225a6b3 | 8eb3f2ca703c246ded4607a208d76fb26e482319af34dd1ce9ab87f3f3e79205 |
| 85. UI-086 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1807ms | pass | 38723aa270ffd7c8bf78e6259967c4348a3853c5035b23f18e1a1ff87b1086c9 | b9a408ba912906cad05d2e951effe4647bb0b11ec17a60606661fec22d114470 |
| 86. UI-087 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1914ms | pass | 6d9e1cb4c65a6be23d230f094b9a1dce09d5a19f47dd21e6bc2ffd90ad890511 | 5fc891d16f4d60614d3b3987a77f3a8da5a600e47e6aaa609b71c4da3adfd56a |
| 87. UI-088 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1900ms | pass | f3c54fc0fbec3ceeb3e1c67ac0bec8f0870313c4fc14b9e1699a1636d792c170 | 42312e7d8ede585d6dabf9e305d3b5b69aea0f244c2515fa942f4383c5803bf7 |
| 88. UI-089 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1906ms | pass | 608d9d82c3c9ec0788223ee9ae3e9846c33dbe98d93cbbe76076722204a08b65 | f8d7d2a25aa276146b71e01b4fe5924c54181438463a9389046f7062ad888012 |
| 89. UI-090 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1885ms | pass | 8a039fc292a3021647c7ebfe026c7ff15bded9221013c9a37cf78e48aa4161f5 | 1b7aaa358ec974b17a397d183e8cad037408406cccde34441414d6cec04a9cd5 |
| 90. UI-091 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1886ms | pass | a0427c092242347b461d85cf23c38438e3ef82007fad01bac5673a360b4b5a33 | 79d87a15c1ffe2f6a4c666f808204d849b73101e45386a3cb1d4c9c7884f8c2c |
| 91. UI-092 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1894ms | pass | 93a28399cf09522beffcf7fd23c37d6575cd753a7e2d912a3ce8f148ea269ebf | 3319966c55bb89cfc9008122b3e20c1741427323d152571a61517beeff4c9627 |
| 92. UI-093 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1942ms | pass | e6d4f0ab173dfc099c336bf593a7509b3281d7d401be5a82621999d5b2ded960 | b8e2f2b55ff1f48f62a1183cebe6d4db987d0b457180a87c7dabf420b2fb8005 |
| 93. UI-094 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1928ms | pass | 33cebe3e95222f4d36a78d25fefe3f09c7fa1bbf40ca00353fbe815768c2315b | 28f7548356af4589524bd36bcb7d9023dfa8121ebe1a0d457cac34242d5369c0 |
| 94. UI-095 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1953ms | pass | 1e9eac4173801018476e8c1530a8d9da6a735b3989e471b5a12d5d1daaca3b2c | 028600ad737c9afa9308818f550cd8e32a19d60ba1a5d084e15f263f424cd0ce |
| 95. UI-096 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 2010ms | pass | e218afe17826be3971b3e4b2d0e9bf0d2131ce555e9081b4b98fcf3cc20c1f7f | 5606dfc0fd8df3ee3422533e88f9bee52e3df8995dff7b4ca809789bb0682c75 |
| 96. UI-097 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1881ms | pass | ca081837c2777bebb577b831d999cf656e56b7a1d9ed178d97de788885cdc766 | 5b4380beb3716b5c18b9d2aeb970cb271ba20039731e8c07856feb98d1f270d6 |
| 97. UI-098 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1909ms | pass | 024e38d67371e519c9db638d91025bb0187e01d8d7c9868d0b22dc6f9c0a6493 | 999a3a248c56d7987a21ff808ff768c8bd6e4c86bc930a55f2fb822fff1b633b |
| 98. UI-099 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1908ms | pass | e252e30ba952c4d38d5668a42f5f61dd2ac8850123ec01ab33248f6ac51a4b9d | a23c5cf4906035d2704d108d35c15dd4c21528e82edd970d132fad788c0c1730 |
| 99. UI-100 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1898ms | pass | c14948fa5f2192c717921d2042e7b24a408379171ec1ac7333a07514942f1d3a | 3e6bebcce1af346ae6d8da12ca759dbf704a8c03ea6aba5f7d7c9e54d86856fe |
| 100. UI-101 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1916ms | pass | 87bdf7c2e61ad00bc4ca7d6bc278ca4e54037ff27086330872fc5e4009204f7b | c73bd4c8d149fbee1b277c26d21384ce25968168e033b35d5332c29a573d63cf |
| 101. UI-102 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1854ms | pass | cb58faed7b2d46dcd3be6526317d74d36deb0e7ca7347a30f08a799e07c97df0 | 23cd5200755de9c09b4c1ae3906edb49e7a163deaedcd2dc1f1bd9a02611c0b5 |
| 102. UI-103 | /client/dashboard → /client/dashboard; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1706ms | pass | 2ec18e2bc18fa8f2c8bbf57c0d8ca4d22fc2b325a8c8b8dc41b3281f78d841c0 | 30c8a950427557d854ca4e736d65b9e952d6135d9c54f3cd7de394e87779361b |
| 103. UI-104 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1948ms | pass | 5040a6a3b8292ab5572cc6b6fe09e5b202f1ef5b5885badb4cd87094d0efdbb6 | f63c0c978edb2355334546858bd7d336f43f4c4353d919d636e24cc37d08c843 |
| 104. UI-105 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1951ms | pass | 7f61774939a6f61aea79b13bc53f8e89bbde3c5f2d45cef9874fdb5f900cf8ce | 708fce3d30360681e2d45890fa8a4b55bceb395a0db323b4065ce7b481facf67 |
| 105. UI-106 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1803ms | pass | 31e9893fb68ba8d7ce4e9ab718f38ac6c75271100bab0640e2be44d5b381fd51 | fe3211bee6e5da378495b21d40f8056bc374dc9057bf863e099d019678e59a45 |
| 106. UI-107 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1849ms | pass | b23cee2df7e58af3bc790a67b1d503538cd61d1c0ab2c44c277a511d4e881252 | 1c2c955b8701d8053289092de68e622015486ca7e137d5e8c11027bb168432f9 |
| 107. UI-108 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1721ms | pass | 42c8196ce6c1c1403743997b172830ede033f34ccdafca61572a20ac47a5c3e6 | 6b816c98ffe70520eb99e38283a7880a9381e01c661e8b7465e7e4e277455a81 |
| 108. UI-109 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 3041ms | pass | 493187bdf380e7803a657ffb07a87be132457e86dfa468ea727d5fd79c0d1a77 | d54fd178be81e32270b1cb16e21a313d9dea4e28b0706ffb004e2706ef2c01fe |
| 109. UI-110 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 1770ms | pass | 8fc4d4b23d3ba8e9fd8af7f124c634a4f6a1ee6281afa5fe8f9e6b1f8365fd26 | 2f9e0955fc61dd268a35bfadf00d0836bd9cb7d2e7df6b435e10f88a6f36940c |
| 110. UI-111 | /ops/vlm → /ops/vlm; role operator→operator; 390×844→390×844; light→light; child exit0; 1775ms | pass | c6aecce1e421835cc84aef1590afce25fd25ec6a616c7694e674ce4671a582f4 | b3f41d33d701a1765e19e557ea82a56db0a88e2b527239101bf02089e78174b3 |
| 111. UI-112 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1685ms | pass | afa1c4e09bd73ff14ced958ac74b908ddea8ab2d4a511243f18a38ba60a12c99 | 124f4de8f0b370cf33c1736a6c4b3a52e8174ba2e4536af11023638288eb8115 |
| 112. UI-113 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1853ms | pass | 2e7e1356fe67ff6a643fe8c26ceed3dd17ab54d89d551a8929f6c7ed52652470 | f45d5fe826d54cc72cd50933ece27d1b48793ab1dc0e605f533c45f0b5bdfeaa |
| 113. UI-114 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1965ms | pass | ef6823dbdae789728ce3117e39476a1e3b829af17610b8344fbcf73412b0ca8d | f981e14efe57de3213e5617f5f3c531ab19afcc20334dd7479749749d6b40b2f |
| 114. UI-115 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 1900ms | pass | 389a9f50f00272f3727d49dec153451f28fcfff745934895051265bdceb1240d | 9375c2c6bceaaebc59f8917b298130a9557468f2329dc7bb4d5e2b664d8e5090 |
| 115. AUTH-004 | /login → /login; role anonymous→anonymous; 390×844→390×844; light→light; child exit0; 2278ms | pass | f18dff574858c61b64e9be9c0e1c7dbb28b56bc2c14b0a74e3c4dbb7ebe7912f | eb49f57a66ac2ca0edf43f9365e356caab3f48f7d58d165e18805ffbfabbb864 |
| 116. AUTH-005 | /setup → /setup; role anonymous→anonymous; 390×844→390×844; light→light; child exit0; 2162ms | pass | f4e9c26fc118073ab25558c98e2a443bb7b41a76b3f8523e8753393cd8a7a571 | 127752fe7adb6329798041eda33a837a2264714071ef8efb82da485f7171a2d0 |
| 117. AUTH-006 | /setup → /setup; role anonymous→anonymous; 390×844→390×844; light→light; child exit0; 2265ms | pass | f25c5910dd50ba9ca55ffa76c62423a15f89334d517c721421fa5fd6d51620f8 | 1d863975d05cbf3b58ccf430d25c19ca22243bfb278911fde766f08e6ff3582a |
| 118. AUTH-007 | /login → /login; role anonymous→anonymous; 390×844→390×844; light→light; child exit0; 2018ms | pass | 457a7fdb8f37c4beb3f67e8a956ac7aa00035ceb487f6c8b95c6092c6362f6a2 | 101d20ddf809d07727b3daba1220bbcd79dce40203acadfb4027e4946aacf92e |
| 119. AUTH-012 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1646ms | pass | d0daf291d4b75c061adcf86ea13abca8825406cf4775df65e6a1a3335600dd16 | b4cfef2c7a7f8cf6796bd4fb69361dbf6b3ec452c96663ece195d5d2a459b965 |
| 120. AUTH-013 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1689ms | pass | 3a14ecac80b2bd9d9f6903916f53544a25002edf4354fe1061fff88e664fd892 | 879e6be8131991624828a28308a47185cb4c3a03869e899ea7ebcd4615ed19c5 |
| 121. AUTH-014 | /login → /ops/users; role anonymous→admin; 390×844→390×844; light→light; child exit0; 2218ms | pass | a296de5949a95fd35b55f83b4406094888e335169347c3ae3eda82b0084d5679 | 16acba6d7ac704f5c080ac01210131e2ed1ee5621e9d8fb8711195ed9763b633 |
| 122. AUTH-015 | /invite/setup → /ops/users; role anonymous→admin; 390×844→390×844; light→light; child exit0; 2182ms | pass | 9b167c94de73f2d3c6d830cad63453ab6f4d126556ee082fd2a89f3eba05bf00 | 9f5cd1450777948901933e1354d8ee7d0129428edbbcd074258397305dbf348f |
| 123. AUTH-016 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1706ms | pass | cca3301237ba283e014886951273b7dd62271328e87c50a6b86977faf15cea8c | d8e0fe1d5e48f332f3c6889fd7a58c23c2dbf286b7837941a9281a8431e558af |
| 124. AUTH-018 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 2581ms | pass | 75e1e00b5a4b07790f2183f1b9d649bb0d75aad18b0682e6ff3ae3c1cdd14ce1 | 6157da570d4e328cdabc5111d3ecbb9dbd7cd2a7d3a90d52fef090cf5ff361d3 |
| 125. AUTH-019 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 2718ms | pass | d9834c85272388f090f49dfbbab28a620e45a477e58e4eca0323ae26dd1a2221 | 2e9af2c2af4eaee27b855c5cade82bca73a485d1a8b902e26e859e32e55d1729 |
| 126. AUTH-020 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 2847ms | pass | fd5d5bb34818920be65569fb749050f1992aa5c1a361f6331d9387b850da6455 | 8fa46e9f5ea565732248b199667c054f9ac6a6fd49d1d4da3a0b38cfba3a3181 |
| 127. AUTH-021 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1657ms | pass | 0d638e85e78110fb01a64ef22832b631055a09b3b65607420197e1b4ac530100 | aaac743653169861bb1e6ad0dab836dddd99a420259c054c47872370d265e28e |
| 128. AUTH-022 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1637ms | pass | 5881e1d8cd6fc0c40cfd40ecd8d17e48a1b07e7bdd3e59536ada8feaf2588b0c | abe21c89d966e44bff0407da0dc3e5c57d306ee7c8840c7b960b8830c0d5424c |
| 129. AUTH-023 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1630ms | pass | f436f2b5625841776b3a29e3af8371ad4d9b592690ddfbec1ebdf7f6dc4e02de | edaa24a92ade8caff518f8fa68ba284c3caa2f6fd482e56027713fc23057976e |
| 130. AUTH-024 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1648ms | pass | 6f28d986a3ecd0b1eafcc992ec8a116a5d6665d6890b4b6147d7ab9902fa5adc | fad11033011ca4504f1dcc0d1a4619e660f319c7bf42d901779c6de9c63e1775 |
| 131. AUTH-025 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1683ms | pass | 1ae61eca1ec1180fd825b621343514ca8ca35fc78cfa38c19dc6add5643f4cb2 | 824cb4682492a9196924f8d6802097acb1bf62003e9a312ebf36b81222bed0a2 |
| 132. AUTH-026 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1644ms | pass | 228d0bd6117b4985f68e2ee75bc25c1385962e3aea4ff2c41e49a8789c2261cb | 4ed6dbefe0e172b989f1e5a3f60a2562e63954ad519cdb230d473b08a6999e4f |
| 133. AUTH-027 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1671ms | pass | 1991905265daf3ff4511a0b6492fc3a95e0478e7e966ce94eef8af330923a07c | 5df078bb61f4b2ae768c0b1d07fa368010820d90468eaa6e4c8c9d5c6ca91fb3 |
| 134. AUTH-028 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1683ms | pass | 5155209cf5ed4564287b3d153e5529ebf92529de346c9463f5ef4a56a8c5db4d | 0fafe3243f02cea28006efb0c0c93061cf31af6cba5d412966366d8fba514688 |
| 135. AUTH-029 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1643ms | pass | 35cc6b372ee929a0c012f696855a3038a4869d4f5d4a92b22b80c51128e42b78 | 930e4b4e61afe1abe55d967da5237d8b86245c8c2baed335f8efde1943bc2551 |
| 136. AUTH-030 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1657ms | pass | 358450bd9acec641fc8bd3ff25713007be6808ff137555e9cd4a821a25c2e974 | 5403663f512252f47eb0a1139be45664963e5b7705e431d1a9ef4413e3cc3495 |
| 137. AUTH-033 | /invite/setup → /ops/users; role anonymous→admin; 390×844→390×844; light→light; child exit0; 2164ms | pass | 5f454cd6e9477e0aa735347d878cca9f38ebec47d0e35f58531d82122fe0a210 | 05af3c7d00abc2e3b93fc1c32e6a47f8b9d9dad184816f43492f48af30bd5507 |
| 138. AUTH-034 | /invite/setup → /invite/setup; role anonymous→anonymous; 390×844→390×844; light→light; child exit0; 2276ms | pass | bca6ab7585cefc679c0420455f987872f5499ebb3517ec6ac6cc8c14a241e2d4 | fb8b1c2f55288d41766d7ec3a15232ac319404d02bccafa3c2e5f5b841c2c354 |
| 139. AUTH-035 | /invite/setup → /invite/setup; role anonymous→anonymous; 390×844→390×844; light→light; child exit0; 2430ms | pass | f745bebf33804291cbfbb42073d84461760e74c6d3a0e863e926dccabcd0153c | 77e6396529132abda956cc0ddca9566cef339a74b35565bf4b3f7730e7729755 |
| 140. AUTH-036 | /login → /client/request-access; role anonymous→anonymous; 390×844→390×844; light→light; child exit0; 1967ms | pass | 33cc49acfa741bcf2b495fcbc6a434264d8d6fb57c10e380f18f57a728bc809a | b02db73f230d860376d74177d534099ab5dd7444ca5fb42cd2d8c3df4f602f42 |
| 141. AUTH-037 | /invite/setup → /ops/users; role anonymous→admin; 390×844→390×844; light→light; child exit0; 2623ms | pass | 83886544ea76eb12073dacfdb28f70ed8f7370beab706c2566b24a999723ff00 | 5ea3a180f1942f21b59fc9def3e6f65898ad70e2e55a2138d03a0d9bf0d14208 |
| 142. AUTH-038 | /invite/setup → /ops/users; role anonymous→admin; 390×844→390×844; light→light; child exit0; 3093ms | pass | 0bc963243e85273c4c4e4811b8536632d6ab8d2f65d46c62d67258eff921d515 | 97594ba84261c3836d7ea7c82083576d73015c9ff10eddadc67ddd8c23fedb2f |
| 143. AUTH-039 | /ops/users → /client/request-access; role admin→anonymous; 390×844→390×844; light→light; child exit0; 2588ms | pass | 48bb5318a83a366389b448e13b1e6a40c9cc20e84658ba66854967a72f21511d | 6b056387273f7c3fbe7ba91972ddccd26108975a556f1de1753915bebd3016cf |
| 144. AUTH-040 | /ops/users → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 1651ms | pass | 2c753997a14ff5557d290acb16370f77e6fbf7fb4efd0cd8425a01e4ef0b199e | 63139c290e88976b8f2e2d85246d7c6a422f722ebc5c89b96af6ee8d79cb766b |
| 145. SRC-001 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 2845ms | pass | b8852e4f7f8f931b0400f6ed279d71ba447d8f2149148e5e5ffbf1785ecbb875 | 6ada80bb4c971f4c7c644b20c0924496670d73a6b8c13a68004d543d170b4d04 |
| 146. SRC-002 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 2838ms | pass | edbe48fb768c1b43dc5249491f5f05fbb79fc6e02820e8459f449d0713c42cf9 | 9164d0442d32a92ee00a00eeee4a3d8ffee2dc7d884d47002134942d215264c4 |
| 147. SRC-003 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 2860ms | pass | 8ca857be3477ca30acd6812d2a243d105111ef247bd5760efe31f6a224a78070 | 4c469af6f4d8422a1dc368544a94baf0d16e7e71ea2ac9aa26eb91189c22191d |
| 148. SRC-004 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 2851ms | pass | 85862163e8e3c4dc28653e54145b369e6c3b4888a68e5a0b7517fe065350a7e5 | 29846ba3124fc37259045b23c6fc7ae4e3517e74b523dfbafdf5e819383e9c70 |
| 149. SRC-005 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 2885ms | pass | 9b4a89d31f77798a4a4857f479f9ae13035eb7c3c159cd687ba6ec78a0159590 | b3e467c3fb7c04eac24d483c164699f84e82c8fdff0a0cb77588ea54b9cb7b5d |
| 150. SRC-006 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1688ms | pass | a07a6d069db9cbb8e27b750449ae65b052f001db9f621f36deabe6469c7377b0 | 3f5da0c0763d8fa3b6ad8f9d4d19647b0356f03e2aca057bcd1f9a9a637ea942 |
| 151. SRC-007 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1702ms | pass | 3ef7a0cabb1235a8f986920a90fdea774a3561e2dc71e7bd9079f7fc8615c55f | 48871203bb575f52bed1c3849da837ee7bc06b60b9c4f1bdada9531a04bfa742 |
| 152. SRC-008 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 2808ms | pass | a33b33420a89ed6b55a79ad4688290b1a84c8565a4179e339a964b4d5a5871a8 | 47dc40bc28174eb6a567ceb088ad6c49cdb157b305a2114ad14da4a195fbb8ff |
| 153. SRC-009 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 3062ms | pass | 636c57047caedf97069f7a48c6e66462c57ed9458a5f265e4d1536da8ba907d8 | d063a9df99db731442850df345491d7e1b980f3cb9fc3de66b1cb8db445d483c |
| 154. SRC-010 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 3067ms | pass | e4bed8e227e697b931765db609529089e12ca772a66668cb12b2cc046ab016d6 | 21d2336764172646998bb4b544f82a74d41559ac6ee245d437a72e28a6cefeaa |
| 155. SRC-011 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1696ms | pass | f0c277a6450995df785ee888c94a6744f1fca5eb87a151ec9a0af58ad63857af | 67adf03b828c4bcf7fb6dce45d63ab519f5e7c66b3021fec27efe014e650ce86 |
| 156. SRC-012 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1651ms | pass | a0263d49907bf98fbcc7a7d15a1c66ddacc2f19c119237b52037fa5c3819c66e | 6dfef534d03b66971b3e6c759f041c350bf1c5ab450663d0c8324f2334a19383 |
| 157. SRC-014 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1684ms | pass | e558d28090adb1df7c9776139d525965ea1018d7b13ef69e7c2e9c6aadee3715 | 31700392e6f78a832e2dd74cfc3ab59c897b962d099d6ed78ec5531ecdcdedf0 |
| 158. SRC-016 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1699ms | pass | c5c5041eaf5d2d04ad6020329839bdd89450f752d9302938c322fbdb2f72c21e | c8eecad4afc827801bbae8e2dc0fc2f5aa15ac230542816d3aa645b46a65d5a9 |
| 159. SRC-017 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 2860ms | pass | 585afb17b3efa7d2a78ae9a5f8c83fd636d4b8563f8d70eb1ad20824bfe9e481 | 69116a995729a115b871e527151de60ce7033d0cafd38348bb83fae9100f2cc9 |
| 160. SRC-018 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 3079ms | pass | 083c8afa33673b0dc9a55b80af13b105fb069899f9e5b2bb7abc3c9073421eec | 6f5861992f6d083e67e75cc154a6cc5f271c4e92ccf068eec34895afda7247d7 |
| 161. SRC-019 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 3166ms | pass | 188d50f716b63c954485095f9d24f01884d5aea4ce9b216a96f793a352dddbec | a5ece527bddbdc6873dbff157eeb0abfc8f614657c08b74efff668c3b27574ee |
| 162. SRC-020 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1675ms | pass | 29597650a3cf0bf2e88ea8fac3890f501d73d2f105187cf7a2a66b4fa15111a0 | e6569017ef25889222eb65464ec4baa36dd124f77fe6899edb10bedba6cdeac8 |
| 163. SRC-021 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1731ms | pass | 243542b796ea1f9b7ab77905f4aa949c7bd51f740f9299fb71e5ee5086a1a8fd | 300bf91de89d72006d50a0dfcad343364cc06b0f79c5c6dec780f69cf63e4775 |
| 164. SRC-022 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1702ms | pass | 21be2200562568c9c6868d84e418e3101af6a699912684fa864347e38559680f | 3d61c10441761c71ffed7cdf8d6795d25d526beac72607916c641b57b544309d |
| 165. SRC-023 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1687ms | pass | ac0dd7fb34453d26152ddac2134159e5b2254b18c90a6f80dec81c4ee5b8bf55 | 9e1a810780bb7f69f4bde60634b74990391417aeb876047654abe547a8744cb5 |
| 166. SRC-024 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 2047ms | pass | 707dae151e9ab66baa374711430629f558fb6fa8eb44c29d1494d7ced560eff2 | fbbad37460694f79f75c4dd63e308b1567e9b68bd91306c8c599554df141ded4 |
| 167. SRC-025 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1695ms | pass | 3b98193378e3f1c6109c21df841191887d6cf2848fd1c8d0a4206c770f340eb8 | 403a6daf5e10a40fc6f2d37868fa9c72176a25fc6a52697e37653f28ad319e85 |
| 168. SRC-026 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1686ms | pass | a8b62a9b49cca03b2bb257385e8be77e81d2a199d9d73a1f70827cc9280b6fc0 | f4bb376627cef5e336ad8cc375f792378bc56ac6d041d948345dd32d1fe4d69b |
| 169. SRC-028 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1695ms | pass | c23d30b27d5c588480c079d148a23f02c7e7513c1a69301f6ccc4cedca363f96 | d1e6f15a7fdbf9d06e35d529aab3c04889013aa5ef19e43bb1f9dc1f9639403b |
| 170. SRC-029 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1713ms | pass | 9d833ba0165cd65c60666426125ef2316dc827fb434a8bcfce06481d7f6c3b15 | f6c016ab75badf5a9beb2b7538bb5ba74b08620ab51f92f64a699712f4158fe3 |
| 171. SRC-030 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1710ms | pass | d90f5bdb83e1ab2257ee62e16ce97543c4bb66274d42c0037f4254c60e2aa651 | cf929e9349c3697f729f83d17f807f8659a519ef8a1b3236ebf932531f859399 |
| 172. SRC-031 | /ops/api/onvif/import-draft → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 2160ms | pass | 9d3c28d616c2453bc80658c9509824f7ea1caa55ce9c9c5ab48cf2881182b00d | 7814cc249f7994d346fb903d583439cf5f14b845147b5090898d24615d11433b |
| 173. SRC-032 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1743ms | pass | 80e9b909937da541a3972bb6fc05e402d71743e6fca6a3e4f90a8270e8a4a99e | 5f2d9f796cda0f12ff1c46b0e631f8f998fa4331f79477d72ada2183f3e93158 |
| 174. SRC-034 | /ops/api/source-registry/onboarding-quality → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1170ms | pass | acbfcc784bc10709fda75e2be3ea993a35e90fde34c8355c6f47f9b1ed189aa3 | 9a916641a2458478996403c3d14cf0e91aeb69b2eee79508023c0a9ec8552cee |
| 175. SRC-035 | /ops/api/source-registry/reliability-timeline → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1159ms | pass | a3e5314b41ee8ec44b9635c2334b95bc68b9e6aef5b8720d1e6c8a1a7431abc7 | 318fcc6e80f0a988569f61ecf1f929de7ca8e420e45f02a247381f6cc23f2dd6 |
| 176. SRC-036 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1114ms | pass | ef7df82d01c6e063b39e88c5018733df8e686a847e28ab8fc66c2204bc25046d | 639025ced9f002ee4baba37630c94865b83e1ee4c6ae651816318381cbb95ffb |
| 177. SRC-037 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1101ms | pass | 6bfa519ab2ded4c074d160f02b87549f8a61c68c6837de08c81cdba47612215e | a6a32d28198d11e1f81edcb974b83d530b64718e03caf2b1838029536c53322a |
| 178. SRC-038 | /client/api/views/{id}/events → /client/events; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1058ms | pass | cfe4266363b279dc6b6c077ff51694ffb565aa4ca6b60f3b3d24b94b03b494f8 | 4d2821512ffd8be4f747477d226b3e647773d911484d7f09e029d587ff26ffd8 |
| 179. SRC-039 | /ops/api/source-registry/reliability-search-metrics → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1197ms | pass | 251b980f3e3a7bc7f3a8b17f66cc33f911b71a1aca386da0157e605d6ac3bc55 | f3ed863f7b000e32d072c4bab4b83461fda0c26e0ea8ca75d04c546625edecfa |
| 180. SRC-040 | /ops/api/source-registry/backup-recovery-handoff → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1193ms | pass | 513a4a16c13aa5fe1915a71aaa5bd79440554352b0371cdc1878572eec2bd219 | d0333912ad55713bc953eb98a04464f74911ab3c4e5c1d803260b3cdef1a0f9c |
| 181. SRC-065 | /ops/api/onvif/credential-provider-status → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1169ms | pass | dc576c60366e554db7c63b3028eb999f4903fbfa9b0d0895f21e05d73c05f483 | ce58f4a5d3df45748743661d447af2f9a4af65e5fa64a2f239f0ff0fe2422ea8 |
| 182. SRC-066 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 3053ms | pass | 4ed4f3bc7c58929b339c4c0ba9c17e80163ddb80b1fe7485b43e46182f4cb8f6 | c9b2cd128de8654ee401e254d94b5f179f86fc2940c7bb5cddeaf84cd3265dd0 |
| 183. SRC-067 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1700ms | pass | 6fb762299a96922fb0b81068423735dfe81458f10a6e015dc851ed9f4118f31f | 95f65654b0298f8a7c425f469778440dad543932b5cca329c9b2e70ad8131dad |
| 184. SRC-068 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1704ms | pass | e9c9c682af077de336cf67250f9ab7ed2631208181bcf296b4abd9e7ad975dcb | 1e70a9df51475f37d215bc64ab4ac98c582f245948b42c038f12d07278a41884 |
| 185. RULE-001 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 1157ms | pass | bc099e3661ff584627cc4e6dc6e04487649b08d155498036e5679503a84d65df | eacf50c64c4e780757b0b1cb24fb0f5e521d7be200a72690a887f86461869ebb |
| 186. RULE-002 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 1175ms | pass | e47931e3210e2f662eb04580925913a5bfa497e4e0f2790687c287122ec64988 | 6b321c3ca893add5bd253dd31eee48ba9f1ec53b9c75443eac482375ca0d36af |
| 187. RULE-003 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 1208ms | pass | ae423e1a499d208bcc13ea92004610ba568544d1a39f38b7aa6ab2e70ba9993d | 45ce2b8817dab6afc9ff5e646b3aebe77fb7fc4eced5a87ae243949244edcb95 |
| 188. RULE-004 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4618ms | pass | 910f7b674cf41e20fe83882fbbe26d9e23f1d82211c5ce2effc2d5ceb676dbe5 | 5cf3c74f259a15b5c6b5a4e0b2a755336077f7cdc477c80828c65a983f0c8ff3 |
| 189. RULE-005 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4708ms | pass | f596fd65f2fc4dfe45112af741b4e6bb744d89d328c2c93f61c195f5b0c3cf53 | b59cb2f4883e3ebced729c55d9f19671b0c32cc7e89eefae67eb853a0a8463b0 |
| 190. RULE-006 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 3866ms | pass | b95c610b57b7a04ca5937bc816b4a7c6317127fef9bd5306c3006130fde8b858 | be5f6135f5552c4778543f8f342f87a3a4459979bb332a632c1d49273dfe2ab7 |
| 191. RULE-007 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 1761ms | pass | 5cd98ea6fad67afd7758782700f373d736e0ddad5cd50b25714e5801dbcf42e7 | 615f20b79d2ce34ffc0eee5816f8511de5bb3b652b8ff12837c543a264ec74c2 |
| 192. RULE-008 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4746ms | pass | 4c1f09aebe480d35206113063e342242c50dfd679f5e9d7484d7257c5f3e00ae | 19df350e47b64c745f9277ff88582aa5accfd4a3707868118e7bad17784ffcbf |
| 193. RULE-009 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 1785ms | pass | 43a510e7543008d8348f7806c0c7cd9e6539a3d33b8869f8b1db429ee9673b57 | 4cd43e44a6cc9e6671edbe0846f3bdace5167ef2e1737dff38910e3e4cc8f2fa |
| 194. RULE-010 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4101ms | pass | 3120561e62c88b6d7c0f0178f9cb05004d8115ad5363600ee0a275e0fdc9f7bf | 02998ab9b579d49aea0fb506f72a8b99264fabfbc59d8c81473053bbe32b0f00 |
| 195. RULE-011 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4696ms | pass | df4723b7cdf3b9c65c09fa0c8fcf7ecf866e13cd9704fb926c141a06ef609d2f | 6536ee565d0f9ce01284adc4d7735bbb3ee5335500b1978296b8b9f7fd86b531 |
| 196. RULE-012 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4695ms | pass | c6e5e45dd66a5c14605f655900980675438f83913e1defd97bdbda3e1ef2a653 | fcef6e403897200d4648404f05f53022abf0f6199e89198667f3efee2aa94063 |
| 197. RULE-013 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 3602ms | pass | 3af17d35559cdbf12e620df77b43a84d4f62134eca9f906535b48a4532ce9a91 | b86f48101a0388824307fe4d2a1bbadb5d93f2b17aad7ab7a3a211bf89f2b10c |
| 198. RULE-014 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 1753ms | pass | 2d7f7df171f4c4c7de87f18dc72335b7747c4b2dbfb347a602439e284e6d7ea5 | c39897bf688debde4b72e5ba09cceb9d2c0adbbbb8cb9a5131cb4a13c6a1eeac |
| 199. RULE-015 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 1727ms | pass | 630052d7849704bcd0a44b427b4133ac010e80e76f0f4081a2abe9dc4df525d9 | b4961aa8b141135e8bee21bae64610e88d9483675ffcb1735322f7100247fc5c |
| 200. RULE-016 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4594ms | pass | 4c004e27a6893c12f84ddf4eae40abcad918d13d477fb96cefb09b295a574a53 | 24959d2e8657ccba7a3e8a1dbca5efe30da709069a16b28161416feae37cd3c5 |
| 201. RULE-017 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 1758ms | pass | ed751742c407da0241993f46f0410fc059c7734e5f174fc3e41eceaefb998c51 | 3151ca4f55585236184d28b2b74e6f3645e2834fcbcf1a41e21354f6e636c8b9 |
| 202. RULE-018 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4573ms | pass | 3f7442eae016c08560a6a1ea28919cae51969b9be32088b1d83fa498643fde92 | 39f791fc9598f5c7553d0d1b31fa98a465c03a7cb87d5754da2d76ec8150354d |
| 203. RULE-019 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4859ms | pass | 2233eaee4a8bdaf704572723970f452d401bc715a10938f8040194c963c1e0e1 | 8ad62b9c567a5346411a9cdc969a36187eacaa5be70a0d45f43d633eb77e0a55 |
| 204. RULE-020 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 3866ms | pass | 6389160cc7d9db845d6b7aac074eab71b1bc7a0747f0e6852a98390b22a0587f | 78a77775989e0b64745e2723a86ab88306c6e4ec7a87033bbf7709d82537a2ac |
| 205. RULE-021 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 2817ms | pass | b8f895e2389aa67b0fad6092208d9f92d85c3deb46e0930f68bb69f43769854c | 099229197b2821210e005659bf8c520222ca40a71c961a48be069666dfa125da |
| 206. RULE-022 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4597ms | pass | 0a2b859556456cb378a381dc4387d6dfd6a121aebd6f31be1d3474c3ce750415 | 17f9a3905355f3a72ffc9fb65dec8401850b5617301be73ac654b347c0411412 |
| 207. RULE-023 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4730ms | pass | d1791f61f07b7aade41090fc7fe1e7b94e9130b8afc11f68a0fe133c20f3de38 | 23b0547bcfe86bd17a2e630fecd68cf46d80f11dce8aca8c0cbada9da769f1e2 |
| 208. RULE-024 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 3899ms | pass | 7fd93d150abefbb0bdc4319ad7076322b3cb4ebb74232f1c6f06b099b8d00a03 | 5c2e4f37303412fd2e5e723485c32be5e04e25657bef66e91475d4ef20846133 |
| 209. RULE-025 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 1756ms | pass | b95a92723f9ba60db991014763542976fce5502ca6050394f32464cceb7a1ab6 | 75968f0be2f509a2d6293a96b6773e1f31574d5d78b4efe4f14ff0f92efad1b5 |
| 210. RULE-026 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4693ms | pass | fd93fa92e988baf9a1c25d42dafd2169df2f07672013841fe3512b9eb9b85155 | 53adfabcfb26e740296bbafd48ef9ed9d2e310634873bc125d3c97b16dce401d |
| 211. RULE-027 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4753ms | pass | c718e735c9bd598a8ace13201875a1b4f7098e9a5ad7d3545e2079a912ff658c | 6ef9c0f4100b9ff5a0f209bf33da872b6f653ebb22c3ebf7913006b99ec3cc84 |
| 212. RULE-028 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4770ms | pass | 6943d47c69b1cf6b3d81f4f5fc7b24ae70937b500c4ef821616ea5325cc40e17 | 79104002faf9a586fb835e26583dac9db585e258f8a5835bb712bcb0d02717ff |
| 213. RULE-029 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4719ms | pass | 6b8367e7c8c2ce8191ba0c3e3411064a1c38e18cbac516284ebd935eb424298b | 8f68df2fdcda8a10a81389081877ea9ef6c927eba690cf9a50d42384308536d5 |
| 214. RULE-030 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4705ms | pass | 8d071d3300d71783c71ca14e7b32e657b1ba752339224a7da274c9e3eb390085 | 311c9d7b55a48a62e54017dd9e2f7048bce5e1f0507a80ae2e3348654b8687d4 |
| 215. RULE-031 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4725ms | pass | f0e35d8ff21eab065aa8fd582393746dc4ae6943a3bf9840d0e897a19e6e95b0 | 8dffe19b7175ebbdb4e5c432f55f11d2c6f6f9ff0e2fa3aba453e7ae2e45d288 |
| 216. RULE-032 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4716ms | pass | b577348841b93755894ae26e7c9a3967213b8a33d5323639a6d52d7ed87d8ff6 | f933cf031e57944bae3676cc1c97f70cf15009c5603d40e68efd8bfacdcbb9c1 |
| 217. RULE-033 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4734ms | pass | 9c2418f8b0af9dce9e2137523e1495c95f01ce10f36923f563c85cc210b06d8d | 1f7d8703e9ec8da2c11e63a29ac4e2bc6268cc8d397f915ee83759d5f70a8808 |
| 218. RULE-034 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4662ms | pass | c640cd263049b9ae599d64a0197813fda00933536adb1700eb832ce28ace9e57 | d605de719cd326adc056378588a285f668ae4c8af276516b82646f2e2e1cf46e |
| 219. RULE-035 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4718ms | pass | 6cbbe08be3c88834f99e2f034a314a37b851bae7c2be2afcff79b890177a6d60 | b522c72107de67eb398e4f47d825695838eca3cc727b9f05a637248f9fbaa7e1 |
| 220. RULE-036 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4705ms | pass | cf05ab6cce8351ffa22ed4f53e7e82cf33277613053e0d91f6749f76c79ca5f0 | f8db62fb7c598f7cc43df75368ed12ed1e401d17ae974c5a0ec4a79537c34ca4 |
| 221. RULE-037 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4694ms | pass | bf705288eb3be3c00bd85abcb744fadd58e5ed244fb673fcc1b2fe12b0bf1623 | 85513cefeacb99230e56ffa0fe91bd6431bc4c53feb9d7f5de939208e2faa425 |
| 222. RULE-038 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4675ms | pass | 683f0a736df79508dabc551fee5c9be107d09e951f3c7e495d3c88acc37d957a | f28bd9c1d834de97224433d335c1f91f56f494bd277e14262bef0bd441be994b |
| 223. RULE-039 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4850ms | pass | 14ed32ef7947365c90e94bbaf711e85f9b40d2d37742461d6a2ec171e57a7281 | db46e5589c3378bd57f01dcc80e7b86e55d080c6683081d1434ed2830b725b45 |
| 224. RULE-040 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 1795ms | pass | 9c8fc92d94df0c21d8bac87826d759e508299ce7284011c0fd79b50df7095c8b | a3ff0e10b74a1707e706d48d82032c991be27c7a839ba6fbcde18414b42a9a24 |
| 225. RULE-041 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4816ms | pass | 4d5c4fdac72eb163d3ae1168cdf018193172fa67bb5b37e8b8ce3af1054306cf | af7d5bdd378a5293d7ffbdfe796c8c9cdb943d9edfd879916e8a968e8d3a187c |
| 226. RULE-042 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4702ms | pass | 4352a240f374c70ffb42111284663c26a5336918fdcc47e186446e6d5da7201f | eac00537f4e43f74315daa428b6973b607287e464a31b9ca528ad3f6036a2e59 |
| 227. RULE-043 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4807ms | pass | b9508efe88e1ca7e5dace3a61cebfc8acfdfeb19ebe42496134b0bef2ac3a56b | b83b55ae70c4209acb6e2ffd2e3e20db80b73c9d1de2cc565e791ac438b07f47 |
| 228. RULE-044 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4710ms | pass | c35039a4ad1e16bd42e60c97b841d953605ee95e9d344bfa878e273d67369bb7 | 24629331e67ee52d74f5dcafeda9e02d8536bdcdfbb5d155de334b8ac199b1ab |
| 229. RULE-045 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4722ms | pass | 8bd29e4a6c9e23d2cc986b658fb7380a5e5ff5bc685ccfc85f6b91c8977d27fe | 22e3858e00caf5b5f01ca3be7bbfbf9260c6a810a88b32da694cc675ce11f633 |
| 230. RULE-046 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4761ms | pass | 2e6981611172bb828c5d89c2c43197522b75cec84ea0618c8e3925e8b39b9b24 | f54748d130dc34376c5fcca1d9a7c4ba143389500dcf5c6fd883a78beb817fdf |
| 231. RULE-047 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4785ms | pass | 376fb7fdb3018f75f60c9c2a29bf7aefcfabe2b3c031c61990639560970f0ebb | 9087901d6d330b00ff7f42162bbf29b306cc13f1b36439533c2f21fc05700f53 |
| 232. RULE-048 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4739ms | pass | b11f7f7bb16b797aeb5854bd6190febd9b02df6d8f76fede42c4ee8fa3ecc72f | fb4c7232454fd996081f0227a6a393e65a8c07c4641d9f3352fa146adbca2d10 |
| 233. RULE-049 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4733ms | pass | 75d35c024ce7a1ad5c0615f9caa1791c5552d11233f431bda4c6f387a5f3f753 | e263543bf7c0dc80e2de143f2f31ec1183f1a7c7462685664615a38dc08f5d47 |
| 234. RULE-050 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4774ms | pass | 1ca588498f5af7f61f3096d8c938ce6e6da0a313c67b8675cbd638cf4b68d32b | f194a27d127d52232c80d0e43446820b1a6c27257357c61b15abe117cce5af00 |
| 235. RULE-051 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4749ms | pass | 04a29975b25c67d36bbef592cee3049887f84e63bbb22b4e2b22e52f25b43dfc | bff4d2d1da7af2b53eb92718413c4420099c4985c0610df8dd8823717ec4d50b |
| 236. RULE-052 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4760ms | pass | 3fe231a5f46270fffc7c5f29db265d573984622444da3aa1d9605356d1a09203 | 82d58553e8929bd2c91544ffea893de4873feea5b47058dc241aa4949ba5fc8c |
| 237. RULE-053 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4808ms | pass | e97f6e67db46bde31618ebfbf853b473314fd978e8e30d0ca3789ca4e0f354fa | dcc9611d5397f5d39e79f78aa93fcf75d17a90c52dad3dcd0c4e6507f7c18d19 |
| 238. RULE-054 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4727ms | pass | 8eb70670954fdefbc147054156c3822969166fce0d59761dd6364b676694e480 | a0f80d5abfc66be92201a44045d2f03bad91a90b4663a9675d5b808b27d75efc |
| 239. RULE-055 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4740ms | pass | 6413dd417560f5623088fbd5bac9460b061b0cac764c41a675dc81fd0877b8c1 | cec5c5402629aab1d17808ab4422c93fef610cb808a24775d945fcabbd286200 |
| 240. RULE-056 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4765ms | pass | eeea803c9f4a1464df6ece07643f20b7bf9a3ed8500ef44f6e0fea629f114815 | 9c3b63a0a09764006097b5eae3457f76d140b86536ab109bb23bc30e7f7b1dd0 |
| 241. RULE-057 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4703ms | pass | 8d29024659a1a93c1b6e650a9fdb5a109dc51427036e72d0491e0d9fd8703d63 | f755efabd373914dd13b297e47c7aad0d392755f610cfd3cae821bd7e5a09f02 |
| 242. RULE-058 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4743ms | pass | 21b9df243056be7ade292c3744471618c4a063ca8820edb6d81b7d3409313e5a | df62daa5ce23cb2664a895c2b7f13d3f52225cc875f87372b147f09eac043e1f |
| 243. RULE-059 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4755ms | pass | 6aebb62830bca11ac8d300dac557b3243164f0cb0eb52a3390ddc3bfad42c704 | 76a62e44989aee6b627ab3fbda7de6e5eb43c9532ab9aae4e4ccd9d290d8fe7e |
| 244. RULE-060 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4716ms | pass | 477328134e523b20e6b09dea45675e70e01995084066378ccc15fcd6f2e88ca8 | 22465dd3b654e594ce6ce9ce8f5b28f91ccc7be68749286608ac336ee4196223 |
| 245. RULE-061 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4799ms | pass | 4649d2281f0f1bfe46c2f062a8a3def8e3268c1493320cc29b6a97f40d9da7e1 | bf54bb094f75921bd06000a679e8597a6b9fafe4ba5b7e969534fd949e5c48bf |
| 246. RULE-062 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4727ms | pass | 6dddd73982fadca0c4ed33aee6d4a78efe74f36227997935fec02e951d9e5189 | 1b8cc015bfa700302cb86b6dd3033e108085a18a0abbfc155473c43c4c3e299b |
| 247. RULE-063 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4798ms | pass | 1991204277f3c2365570278c0984c90ec4674f6643570d99b0ebaf8a28d54ad3 | 789758bc12472a9b14007431fc1d8d33c226ec13ef00139c3d089f043319ab88 |
| 248. RULE-064 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4689ms | pass | cca81fe7d1d51f8d82477d7b3abd7ac7be514f91ef741700dffb35bdb5c95dda | a462769c322ded45e578a18bcfda1489b162d466d0c3be88fc04a461f759fba2 |
| 249. RULE-065 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4865ms | pass | 7217f51c47c2986693fe57a931d0d997f470cdd8caa5ef926cfa33652750f96f | a3832923b488b02c5343f06650297b33c3b3904db32ce40bd60c7ea32e5a5e7a |
| 250. RULE-066 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4735ms | pass | 9ed6a63e1d2a56293d858155a47d1a32094bbe321900c9f81e551b8524be1847 | 9a710dbc8c5202d16ae63f18ac24387917b59378f51fad2ff22dd3aa52edebbe |
| 251. RULE-067 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4816ms | pass | 38ef317978cb7927c19c95e7e9808927c2c65e769eeb491b5e51f0dd1f9daab4 | cc1ebe2a25964863d2616cdc9a2b154607e48548aaaacb5af72715a8a714d52a |
| 252. RULE-068 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4732ms | pass | 081a59431edc086b678f6796d55d1be135505196c28a9b5ec027d48aa450a20a | 4174436d1b91dd945acd4fe07e77ae244f57068e56307fd19e389da3f1edbb79 |
| 253. RULE-069 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4695ms | pass | ce3101b3f716e23eaac9a7eaaed5494807667dc0134c56e426bdf24d34d9604f | 877c740cb313702737e522a91626e8105ae85457270102679bb6705b20854e11 |
| 254. RULE-070 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4724ms | pass | 2ed0cd0aa45e8b48fcc893d375c9c21699944d9ae292ccfc755c1c2933c1ce4a | 798ac0003e395b289e55679231155e3aecedbd513536ba02626b798786064f64 |
| 255. RULE-071 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4760ms | pass | 43a7c5727bc84d41b1c31e78f0dae46215a10d5acdbd6f2554769580f4cc662d | feb357bc667a88be7dbc1906394280981ef2a0bc8ed242ecfbcc3879794603b3 |
| 256. RULE-072 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4793ms | pass | ba47218573e4d9274c2552d7d4e41d66a8a232cb4053d5b33b0bbe5a074d449c | c1712ad8676a818478d69a8db287e2dfa5c3059658c7060c3249405ae3e00ef3 |
| 257. RULE-073 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4766ms | pass | 82ac7848bbb77ba81fd8bcdeede36fecd6e3713361283ce993ef92b72a736167 | bc8a16929c1ff8dca375d6d54ed72ae9c4b8b7e7c8f3766b4f3c6fbe873a53fe |
| 258. RULE-074 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4712ms | pass | d5040bbdfcc6db30cda960d61a5f26a0c0f4908fe17cac5820c1b27396986135 | ffd446c29e8f6894983ec0235e19776db91ff7061112d003eee04e48f6735b23 |
| 259. RULE-075 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4765ms | pass | 8e54e84e91fa016af2c5015358a4bf2462a6675af23383bf117069f5e1f2f38a | 2d30b82f82bb2cb35410d0e3e2f5d4337930cb02f63a8e10bcf42351c655e5c0 |
| 260. RULE-076 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4757ms | pass | 280340130c9492a1281a1ba3b63f0d5ee475e0759560a5ffe854dff525b69303 | eadc2586e8a1682fea5e495f719340fab1a852936688bb5b87900a193e5a0285 |
| 261. RULE-077 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4772ms | pass | 0d60b4659fe6cad4ac81d6cdf2be256994d3aba1403d0875c7e99a16758a83b9 | cca480afd1e2ae25f235116d891da4ccfdeb791d32aaca3b6e295bff8d42c92e |
| 262. RULE-078 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4741ms | pass | e5f570e4447cfebccc08ac55b7c68feeeab05717ab24852f5467383a1532df72 | 0b0d0eb15615b10e5bb8ab254270fcdaae4be8c629fc6ac80b107218382768cd |
| 263. RULE-079 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4749ms | pass | 3ad36c3c726e491e154ae3d88d7403ecab8ee46a9c93634c3413b8d7aac7e673 | a12546ad20a019268c9e4fd718e1513e96e2b38c95ec09ec55f41734973305b6 |
| 264. RULE-080 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4744ms | pass | d125626d54280182b9de1d0bf6d1646483a09118719259fae7ed8eddfd26cc20 | b57ac2cbaf4833f8e0015a2dac8701f8ef64769f100deb66d1d5036f58382990 |
| 265. RULE-081 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4721ms | pass | fb245f8f213a7620d5ac2222d1f39e3d7e928fc909d1c4d96d01bf9a61be5824 | ca807cb5f8b49d089191ac7c5e383e84d57ec4fd7b57e3b9d3a421820f404ad4 |
| 266. RULE-082 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4770ms | pass | 49babba701841013ec504685decce7af09af759de57ef0e0f6650d294b9545cb | ddb6b6eb50fb84852e9ed80ff53260c0eca6af39a91c325c4da48d49a3c235ad |
| 267. RULE-083 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4748ms | pass | dd8e3c122476cae0e47abc66907fef1371e787278ed1829eb52838c772f75461 | 30e3a3fa401b2ba73f4e940053ad6a6eaa469db1d8e8ee13ca1ef700e8e4aa4f |
| 268. RULE-084 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4764ms | pass | cbceef0d05696599d489c88071efd2a1f0c91f79d3d4e272b520ea6fa0c251aa | 07a414fe4ee8f5f653ad6f331627052cf12639ae7b1c324ceca907d72dbe256a |
| 269. RULE-085 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4749ms | pass | 6d14f0fe07ba016d7d3fcf298dbecde6b283c8e4d285c658833948112ddf3a22 | f5623e450f82d8b295834320ce597def7be69910d46209046bbf9d2e80b4e200 |
| 270. RULE-086 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4737ms | pass | c13419df78cb8b112376f6d6fd6f896fab157f2d841bc1b462fa71c67f459fea | 06e51a429072e333b4e339394c9632603376cd8c45cc3bcbacc87bbd8621b185 |
| 271. RULE-087 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4783ms | pass | 3b30d8796edb26bd0eb1805ee5bf1f7da63605c184961364154ab81396e4f402 | 0329c842349ab293312da76bf690d0b362a40a64e6c3c6ea30ea32a188934ac5 |
| 272. RULE-088 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4753ms | pass | ab448e42e138ceb2903d63600a52755acef6b68b2c971e61bca112f50af8b9de | 59576dfa73f1944ccc002ce96270a21c35bb77a01ab20578ac46684ab2dd0589 |
| 273. RULE-089 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4763ms | pass | 1023a4a3647eb3e5a24ab9ac8284e24b527143ae71064aee5b161cfc520beb0a | 52ce3f87dab2d11c85d8650a98ad1b7ab2f21c554426ac611a9ce857f4a8c66a |
| 274. RULE-090 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4789ms | pass | 680779f4e594acb780caf7ba6e7989058b15426d83fd3527a0f7a5738135efd3 | c29ff34faa9decb239aa333462e033bdf6178bd9bafe79893533eda3652cc332 |
| 275. RULE-091 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4733ms | pass | 25c4c9c74b41b8a53ba85f59143c661b71183dac814ea5c67c68815dc70f20dc | aabdbf2cf8239105216ec737958b46b1c17452f1107cf177dd826ee5530541f7 |
| 276. RULE-092 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 4233ms | pass | e89e6c2c3ee59cb029ba3dfe65d120c84b604f4760f258d448d11b0c90388f8e | 934eea498b08f5cc514218d0c7c3ff5cd7aa6cc474bff9c70ccf570d2fecb685 |
| 277. RULE-093 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 5470ms | pass | 9a9319f4746fad5a645705138bc407bb0f8b68a32d202cf47ca99dcd98a71d3b | adb9dc8bf9bf59faa191e9563bdd704f41aa2707e7d5b9d01f74fb9dbe0d5a44 |
| 278. RULE-094 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 6028ms | pass | 51cf756d24d665b3150d792d5e4c82ee77ad7fd59a7bb83713a9eed50f3e638d | 3b1a1b6a111f96c686c88c8115a703b2a3a456458eddcd59c53b8d6673f64842 |
| 279. RULE-095 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 3618ms | pass | d19c6986b0d450a7d069057375be0b8120000dba1ef20f32135a54616eda5332 | 8cbddbb3163b68c058fa4b1969dbcab08c12ceb2685f4e61b94676eb035ad183 |
| 280. RULE-096 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 3957ms | pass | 45571d4d4de49697ff826a79503b451f4901c6f377930589d05ac4211a797cd4 | d8e37c8ae60cd4831a9915005740d07f75cca0d15a54d6857a7840d18a758cb0 |
| 281. RULE-097 | /ops/rules → /client/live; role operator→viewer; 390×844→390×844; light→light; child exit0; 3850ms | pass | 49b3423715c665e347fd7afa85709a6bad65a524a7894fa44b124b7aec34f392 | 834107aa68d05c28e8d427edd7f89b9456060abc5f13299a34b7540cf4b264f5 |
| 282. RULE-098 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 2876ms | pass | af5cc0b7e881c8f30fde46b2594fc80da87ee9a0199f51eb72ff5324f2c9f93d | 1f5169abb2337d810153b96a8ba98179ab4ab17c09994d1cd956102d3f34bed9 |
| 283. RULE-100 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 5646ms | pass | 4a063628f041eafbc5acd3afd0e8557d7ca6ae04d82e048baa93a583ede6429d | db6b3da5ceac69cca58e4e269c03a829f1011bc56d5d6a7574eac664103d1bce |
| 284. RULE-101 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 5777ms | pass | 8f95fb4c462316482c7013008710f1fbd94a5d775ccc43fbf6fcbb8aea2e82d9 | 6319855c943dfa0506a3b1a2a1e7a92bc95c72c95df4ca10d99c790a83a2bf64 |
| 285. RULE-102 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 2041ms | pass | 20d2f034b62aec794fc01a1c9b80d3ad4dae23715c3fa3adc013988ede2e6926 | 0f52588e79a36293baa5024e16695f0a843ab4d2ae5e61d43670a8ca48f46949 |
| 286. RULE-103 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 10076ms | pass | d424df1097f6188b337b58dab665945d5cd6e8e9589a1c79543052e199e0eff7 | 190ae8d8abc1f4eff5e12960b7a493f69b40b4ae616d5de3d5b8bda19f1f9ab6 |
| 287. RULE-104 | /ops/rules → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2430ms | pass | 7b239b31521cf7118577c461807328ec374c82e30b373ef621f14e3de1762755 | dad445ee11a9ff4fd872292d82fa94c044f9998c7b5fa3c1111b158756078525 |
| 288. RULE-111 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 2245ms | pass | 79715000128da5f866ea9248ac4099f2e7201f38a0d4a0929ed943582cf75809 | d1c574686de18fa664a5c4ed4d4d523b7b9ad6ce9ae1f00983a83acdd8aa623c |
| 289. EVT-001 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 2606ms | pass | bbd9a5083b5743248a316fa5414560d0232da85d16eeaa86652e1bdb6943ebbd | 65dc3c00f934c46f2455b0befec3c7c60983baa8f837582c4b7759ce86149af8 |
| 290. EVT-003 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 2288ms | pass | adc0302f127af2e5b82182a50f1c660e743ed42adeb884391022426dcdf7a0d1 | 7a96f6db5ee8a57f72284a185f9cc94d64742bfa19db7fd3c41cd38f2ff867f8 |
| 291. EVT-004 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 3267ms | pass | 40460d39cfef59cbee514b89607b8147294aaca91f7f1b9f9673682842716dbe | 578370a80f3346c1706f779f41c80425dd9bd5e65cc3fa3b03424eacf33d12db |
| 292. EVT-007 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 4287ms | pass | 94742ab0a4cd249009ade7474e5cf7cf75e9e8eecd0b7d9b8b1f9baf47295a57 | af8ecf27f2bbbb62c77d64b751b95fc89eb75bab9ff53f38c7bca9d7a1a3d323 |
| 293. EVT-016 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1986ms | pass | 0261b29d410684a45ea190260f8fae62b4b27749dd0bdb684ae7e69710d82553 | 2809b0460921e6edc4c35981db816c66282b68e5b18f12574ff61ca5e82b46e3 |
| 294. EVT-017 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2108ms | pass | f3e9b8b0af99affccfcbcaa3ad1c37268edc8caebca50b3c3f5e741c762ef26e | dd8d6153f85b8b59466a9244f57159d82cc2fb4523b2923842d18af6068a6064 |
| 295. EVT-018 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 3343ms | pass | 2f1dd5ec90c0c99aeb346aaf8b301ddd73f3cb06edd6424a243bd77d270633da | 5accf47281db1377403dc0fde3f5964038182d72ac5842802b83369f3ffd1be8 |
| 296. EVT-019 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2187ms | pass | b9ccc73b2479d460e2279b462c48d6d1fe072c1590191a23a24b3636410ce5fa | 9322a876040d8bafd628ede6203c4d6a0583672d3a48d7d1807837e7b34fe14a |
| 297. EVT-020 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2221ms | pass | 4f7e0048444b4e6e759d5fcee6579ac565ac8113ee75ad4b5d51f006b6090333 | 1dd58093a9f266a56c35b3d1007829fae9a044837b4b4a4043dfbe75f23ed5a8 |
| 298. EVT-021 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 3172ms | pass | 33b59ea96ce30d1c66af84a66720ad619bcdcb5cc86de30814348ac7a121c629 | 8aaacd67a0b772f51124c210fd2bc6fdc811b1fbc094d5f569f212fcaa4527c3 |
| 299. EVT-022 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2339ms | pass | f3ad32f699454713bc4a44fa7b38bb45e59400644d25dd75a1bbc890b349e475 | bcb87cbbda8afb6dc534072962582eb04ea107949833e755754317fef21d74d1 |
| 300. EVT-023 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 2335ms | pass | 17198af0610cd037bb8ff510d648aa0dfb935dc0c4f6b2dd61f9e082de5672df | dc2b7aba912cec3feb403c41e4c04e204bcf8fcea8f1bf87a78e0795440f72ac |
| 301. EVT-024 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 3443ms | pass | bde5883124b758a528c4260c8bbfb9af4319af2bef1c54bcdb2e069e55579ca3 | f39edf689f298c1dd8dddc20d5581557ff4acee99e3d9400d231d7a1782f6949 |
| 302. EVT-025 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 2130ms | pass | 7966b51c0f78933c74cdae2196cc918eeb6abb47b1410149f279620b8ee49011 | 0c82eb2c7a467b755ba97fc207ddf989e9f311ddb3642485902805965db6d149 |
| 303. EVT-026 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 2635ms | pass | cb2c30403cd086d0b353e5d2def684a72063c26cd42176c5f92a52bc290e548d | ff81658d468aeb674fd9d1b303443ad85b3e1addcc3fb0c8c95a59db43241f32 |
| 304. EVT-028 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2036ms | pass | 39ae5881ecc2497ecc695696bff24ada7c8514269fdf4a049203e6f1ffe1aa39 | 10cb01e21736ce6793b7da10d74da8de0e604444bc632845b9d92fa5ed23a3d2 |
| 305. EVT-030 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2270ms | pass | bcebe08ec8d465f400e4f883c411614a53c7eb739102d964bc59336baf6c2cbd | 3a000bf2fcd531d270d476997646ac07713aa65d8427b4ce31f6e672eacd2fd1 |
| 306. EVT-031 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2081ms | pass | 9520826199fb269e75b049b5d85cc315e159d16d58a749b2d545e709f7219057 | 3f88cba335b9787a6ee066e265f7c95b380a99a3af721519f7d7ee2b9f0baca3 |
| 307. EVT-036 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2016ms | pass | b5f0ad54a1cc57f2ddd4d19c973b37e6c98542c7be00895722373590178cb733 | 4947ae621d88c9db3f2b39fe7e4c7a5ce674cfe0488fed0878aaf48febb793cf |
| 308. EVT-037 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 3138ms | pass | f87c6e3fca9658320626625994abf33897b54c0e10c5e717951cdea97b5ac8d6 | 15137ab4d41a41f8337d53be44c115133a64f97d7c2f33e7ffc66d479c363fae |
| 309. EVT-038 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 3326ms | pass | 3386c1748aa2ce4f847b668acb5f60775a72d62a7f2eaacbcf377b8f42caeec3 | 73a37489ae8f1799584d3902c56a77d55b5cb189d7bbce3cd2cc948ed8e4c0c5 |
| 310. EVT-041 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1535ms | pass | 07f2002fb34ebd05fe9fd306d2e722e748ea629c9f77de83694ae8a99e48cd9b | e44a13f3bf745b9d4b05f88918175d15c1790e25533ba23b4c28982a5e587ff3 |
| 311. EVT-042 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2227ms | pass | 9b420c8be3b15ac425a09007f2adddf539e7538e707471bad8e4c59b9d0e62d0 | f95feee14be1f88ad3eaf685c89a6aa8207230b7bef6ca3d54ed1947a5cd17db |
| 312. EVT-043 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2053ms | pass | 8584b0efcc021e6e7df3436c3c07604b050a65f2cb29c3e58788081847fa5797 | 14e9cac9e3ce7fb1e4e71ddfb66e3464212f0702155953d38657aeef1306b3ed |
| 313. EVT-044 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2432ms | pass | 61478ad6fa20ed6c04e5b11ee55c45a2b72d4729e815933156532db7ea2fbdf2 | 16f33ad3abad97e09cd851e8393937350ee0b830971c9996cd4b89bc6b80bbf7 |
| 314. EVT-046 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1593ms | pass | d3241e16625ef2424a57e7d7c35b2af7b6f871344cc17c2a373c381733182b0f | f294f0dd68ba351f95710c7c7f9d45456ced45117f7e08267dcbc43c491855e1 |
| 315. EVT-047 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2050ms | pass | 551e60484daef346dbb015c00acd7277a2116db542fd8ad1d1244ec6a8c6caf2 | e6cc01e8caabf6972025972228feb94d539b6d166bb8e7ee04fc8fd47177198c |
| 316. EVT-048 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit0; 2266ms | pass | 43b8af5cb587115ef98b66d5af1343dd18c714d6e01b64fd36c7a96c48979290 | 2c992b951eafb0998a9bd17516452bdf899fc439ef517db53fe1b391fc488a21 |
| 317. EVT-049 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2364ms | pass | 05db01b30c3b6b4dd899546c61cf470283752d0d94ac61a37f0762bc02a9f0be | ba2cce384b242b77063fca520167e46f2b141603eca39ad6284517cfe1c4e977 |
| 318. EVT-050 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2238ms | pass | be45013b868bf1bb2efae7e4caeeb87f5a6d132ee490316f3ac67d4700e2683f | e21f3d05964490c5cd8485d4b57ccee4b79a01e28040604fb55a955bd8ae784b |
| 319. EVT-051 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2059ms | pass | a5cd38bd28263a3b2d7c745ee4866b156f3ac2a0349173ff1ae7ba3465e715b9 | 56796ebde686dde0bd77aa252ffae8f3aca74f525451db9eac0c6cbfb6d64a0a |
| 320. EVT-052 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2226ms | pass | c59e88ae118ff627b0c58c7b7f4e94525fcd2bb5835c7eac4b3a08f684c78c9e | 0fff47b9ee068f17340983d7ca464c778e25e436f54f8ee6b793c8fc87c88786 |
| 321. EVT-053 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2048ms | pass | 9feffa77f45632550db502c68bd31001cafc00ee5df091b87e1db00f43fe4e99 | 6affab3a1d0007e0398700289e4ede15665ea7f8299b344422f2bd9ca8a38ecd |
| 322. EVT-054 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2213ms | pass | 1a19f66408ea9fd77a781cb5bce2e696a3ff011bdfc696eb25dca3150e331ab7 | 2839d48a604596845fa9d3ef29d8e884bf25b497d17bf0852d85a6319ff32b9c |
| 323. EVT-055 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2545ms | pass | 81bff87715d6c8902a8f0b6830b6a91049603c0093faf6a7f7ad966d79a5c7d3 | 7ff3b9ba12ba3df8abe61393e2cb6cc0f6b625836b41e4c406e653c3377de6e5 |
| 324. EVT-056 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2115ms | pass | 2013ca0431c1a9dd7c6144fd52fe966791a9111e6b13da64a9f2a535f86c549f | e277fb559edb8b7c7197a0a764e3d01021d9d106b42a8578ef11724f65ac269f |
| 325. EVT-057 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2300ms | pass | d287c30a71ddc97a66ccfb697f184fd6b7d8586e86753d98b7551a3216f97fcd | 5ad81b1e1c22cf3b0d5a7c63896d416b551e5768a04e895cdb995135240dfac0 |
| 326. EVT-058 | /ops/dashboard → /ops/dashboard; role operator→operator; 390×844→390×844; light→light; child exit1; 32080ms | fail | d733b8db5440ce615dd8ab75539ba27bd9f7493366f6a7d883f9541fb8f53963 | cc51ed59ac4987f8e0ce525d66902a96b8fb1dd59b82a175f2a5afcefe7ea174 |
| 327. EVT-061 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 3247ms | pass | 59a68e14d650811dac78703100497f955a185a2639a2791cd04511b6fada08e0 | 67e9764fb9528b734eec19d311318f2b3bac56d8d07c87c5798ab85081f35818 |
| 328. EVT-064 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2337ms | pass | dd02424ff951fae62bac1b94f1276185a03d32f4ef75628f08ac3ace62c2fa4a | af61eab93d326bae4167fe3a82b068877fc77fbfe7a6280be522ac04249b5022 |
| 329. EVT-065 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2234ms | pass | cfaaa24d1a01b5e883ee19a681ac38c50dcbff9a6ee2d5235e4da1b4a6a0d8c2 | 02227146e22b1ef092388e6fa54e419bf864bec429872a20cf54d64a86ee6008 |
| 330. EVT-066 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2293ms | pass | 2938a6c0487678e6c418ed86cf60bfae2c8659c9a1a5dd2827520609d7d25ea4 | 85f0accac8c448a6d5ffc15b8148714b89a25269db0f574d973f263c17f8a041 |
| 331. EVT-067 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1991ms | pass | f12a821845b6f6266f46b22684a8a0a99ff488b331ee8cf58a1b7a95137ae787 | 2aff604fc6cbaec136ec1438a0d8886b2782502659d8e76cde35df7bcd801a21 |
| 332. EVT-068 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 3235ms | pass | a198681b75b35b20481117b744b489b47e710976c3809bb2bd5d1caf4104da79 | e8c9477531d82234dacf80ee13823c993e709cbee075bcbe224b3efe9cf00548 |
| 333. EVT-069 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2048ms | pass | 3994b44e88f1041d654f35e4019081054a049a7f51ac35d2ca52ca1c3b90db64 | b37dc83d0aba9800c4bf2b4ab026c22fee7df4649cc74d1fa476f1e39458d22f |
| 334. EVT-070 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1577ms | pass | 5f415275f3fd227d0b39ecbb62e2ae2e62831088a4c2b590f6a76e47a7ccf7bc | 79dc31fc139d1f7a846f934f884d500a16d430941e501bec5e288c825b9a9f85 |
| 335. EVT-071 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2065ms | pass | 5548e317fbf0b4a1ecb98822903ecc47d56b47ba973c26b1af5fd85f65fee4ab | 8aeaf70b26793dd967c7589787ba2f8c501de29778c54d0ef7635890ddfddc4c |
| 336. EVT-072 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2214ms | pass | 32cb0d6c43cb2cdb0c1bc69d9ffa6dd8cbeea54d4a2726ed58683f8dc0758b14 | 0c0d5b95c609741b6fdab539e1bc324522bc0e4145277ec02d194dd1baa1c1fa |
| 337. EVT-075 | /ops/api/events/reviews → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2028ms | pass | 722cdccdec25ad4120dbea01b14723f15facd2cd507505bbdfedc2255c98c956 | 69e5ce39682ec5468e9c31e1935ed26f209eb7c0f9aabd99a2f6b44b03b1bf42 |
| 338. CLIENT-001 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1809ms | pass | 0947bdca2581c775c900f8032dc85bdaaddfee6d3e4323ec6f6fb0233dc939bf | a30121d0fbdb667760353948145686b2a444673948bf6749d1d7f18a979c7c7d |
| 339. CLIENT-002 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 3453ms | pass | 1e4029fd5760dee559c96ba9634f68bd29dfe0a556e4b6cc9f216f191f42287a | 6c799ba86091f6aa5e547bf68371a99b714d5a0dd8f46f481dd1e5fa5e6a3e03 |
| 340. CLIENT-005 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 3651ms | pass | 5007ebb541d58cc8403fe149c03d550ae56b52c6dc5767efe91ad8f29de3fa22 | 29765bb041cde8e0085d40b330b323013d1aea0cd72c42b6c64a0c61599ac315 |
| 341. CLIENT-006 | /client/dashboard → /client/dashboard; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1787ms | pass | 3ed5a64baf3f852ba5586b1f44f30b6499fb83e24d6d860ab41ba36f36577f31 | 6a5684034ca2df8e2f56e38cf557fbde705355dd0b305dd6154fce6dbc962acc |
| 342. CLIENT-007 | /client/events → /client/events; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1850ms | pass | d7757876946696a5c9c8459554667b87668bf85c4668210f6db1caa614e38d76 | 8311066a6e7e1cf56aab7527e2f66833405318cad63fed1d1e25c96972f65805 |
| 343. CLIENT-009 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 2698ms | pass | a456aa9190550f436722369c0683b02059a9d33ee649852db258f767d3fb2835 | bfa73958a204d8e6efe6a97b5c79270ea43a35cfce92a3cfccdd2dee6e34532c |
| 344. CLIENT-010 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1888ms | pass | 94c7933a8e42c9981588524082de381bc3eb342089a477f864fa16e887e9bbd6 | ded9a596d7721e1e0b1d1c4cc1074ba1fdc689af2dae3b118c52fc5c4be1ee71 |
| 345. CLIENT-011 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1738ms | pass | a5605ab3cd49b17ef1fbdff2e7adf5c2363d6199db19beb6666f0e1780a1c134 | 8c042d040a7ad76f5599ae319731bba038715ea2b32575616ea8f102bfba4f9b |
| 346. CLIENT-012 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1181ms | pass | 64c4f71cbe9d0ad11d444b0131c749953aef14586aa9665c3f848f639c4a72f9 | 2f8d7638f2cfc0bca979fa72622d40cd2b130deeb9490d9ef54f7c2aa085a52f |
| 347. CLIENT-013 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1203ms | pass | 7ed392c564c6960835115a0abc69f2f90cbc3984e62ae3a1f4a474a86c1f5f1d | 9bff71b0f7707f8c51ffab63455ebed84ca363703d1c5a35ebf7330ea4189a87 |
| 348. CLIENT-014 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1242ms | pass | f821a5a82347d5b4874baa58162fc0496b92ac8b99d86ed96789304f85532a02 | d10b8bbede4fd5efd9a234a06753769c1fa67e41c40f2edbd7516537b9b9f3b2 |
| 349. CLIENT-015 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1234ms | pass | 126b4ced20b37ca937eab2e073d4a631c50b4c0a984e4eb571f6e81bd838236a | be5eaccd6576728bbebecf96684cb74c57c5bd606ac799d2aa01764f341b91d9 |
| 350. CLIENT-016 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1212ms | pass | a7b477b9947f3c4112d52df3f2d0e0946fe280b6d00ea2c98596224b8f0c659e | 5458739b0415336c08aebbc2d18e08846d7b5f098827fdbcca2a5078617312e0 |
| 351. CLIENT-017 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1277ms | pass | 51a51b9baac44423e9d5bd9e2ba5a030a5c0fb21b7c88e76ed69b1d89cdb8612 | 8b594cd883b34bd4e86ed46a49a64c6fab4329b41526692b26208ac0f5ac29cf |
| 352. CLIENT-018 | /client/live → /client/live; role admin→admin; 390×844→390×844; light→light; child exit0; 1806ms | pass | 397e8572ef2c1da20783154d69972f1a954d3f998e7cc234e4c21d8e4aae1a73 | 05673e72a92cbd948b8f174dceb28be87b4423c247993f2584f630ec204bc039 |
| 353. CLIENT-019 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 2158ms | pass | 09e40fb81cccf2db41b444899c94f65209ba2ce96dda965ea3c38137d0f6540c | 76e0252c9d51f9fb451b6374dd08dd9af87859a87b005686f3061aa9cf73d5b8 |
| 354. CLIENT-020 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 2590ms | pass | c99981560db82c4b334d8cb5e6bc5f930ee290a2c50e8035f15293e099757e77 | 97d2b80147e137c35018e7f4726b2033d74ee164080a7be8707fd39059f7b0dd |
| 355. CLIENT-021 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 3624ms | pass | 24c74e0c77aae71a20d740cbfa939eeff028d5e954071ce9d09726e942dc3af3 | abed324de6fca0e5412cabc26bfa48fa46fb76ddb077a39b5c6f7cfedf8ad598 |
| 356. CLIENT-022 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1820ms | pass | 5e5521ed72187cbf2746d8e4ae00074ae3a83d1f5b2d18acb7302c89e5cb707b | 759312048b5b651eaa32a08f3046ad9b1c4adf2e20fdcc7b30a9b53ec4900d27 |
| 357. CLIENT-023 | /client/api/views/{id}/events → /client/events; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1872ms | pass | dba1cb392ef264d3da8aee31988d939c8008b751aeb094eb2d81b92c7289c387 | 20f54dd02b7b63cf8ec72e0126484b8154704b9ba12214529f1284f59120fc5f |
| 358. CLIENT-024 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1904ms | pass | 3ad50cbb05dde90d44445ac2770c0fd040a67af335e58c1ffde0bdf6ed204ee8 | 2ff375722bee9e253aa67c6510a965031ca1ae468bae8c3c99ee255b3d9c40c5 |
| 359. CLIENT-025 | /client/events → /client/events; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1866ms | pass | 177adfc2b36f3504b7b6faf74823b73e7dd73099844abf6d8016f8bf5b102b09 | 3bc0141e316a451e49cb1b3de8825364b1bb09fa36a3e13cb5e772e06df44b57 |
| 360. CLIENT-027 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1970ms | pass | 0f3c6ab93b52e994af75cff7028da6794fde11512af632e54b949eb9666f2031 | a134a098486f2f295ecb04c3445bd7d5945df6dd108c89eb43dd323541d18f6d |
| 361. CLIENT-028 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1930ms | pass | 6755b2207367b1aa9d5df899d5f4ffe917f5a189d74bf6bec5823c41f60abb33 | f70255dbdc2a680af6038c93843e3e4d430da9dda2ce5457b75ed49c92aa0aef |
| 362. CLIENT-029 | /client/api/views/{id}/events → /client/events; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1856ms | pass | 4f4f390113e1100820ec7c8bb97a172b2781e302a32cf013c608921680d11397 | 04d1387e600c1990234f0581eb89ebefebcaffdd55006a1dec37dc88fd96e083 |
| 363. CLIENT-031 | /client/api/views/{id}/events → /client/events; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1884ms | pass | 5347164b134673b39021703da10fc5bdba3d410f94f8ea908972bf17710e2143 | 69fff4735ccb6aeb1349a54b90bf3ceffaeb79d26441826458cdfa23bc7fa44e |
| 364. CLIENT-032 | /client/api/views/{id}/events → /client/events; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1856ms | pass | a6380c06e280d0f42399569a81874114ed5a4d4adcf506ee4a676f4fc53bc479 | 3978c06e39e3d3b82edc03e4a00241fe60daf800748ce79865b1bed0ace50652 |
| 365. CLIENT-040 | /client/api/views/{id}/events → /client/events; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1832ms | pass | 8f0360271e526e007070a410e9c3f6b9121f736438833b7c707c16f9a197bd7d | 362a563f974cf7a0ac6351728b976633eb9b9e30c3c2971f3f9dcf8d170c65d7 |
| 366. CLIENT-041 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1867ms | pass | e4cd66ce483669e21b77fddc5df1f3e7cbc36a58c80319b1756438bfd37b9196 | 3d2e2a21aba98bf5412ca0451c850bdc576b2585b65771cefb2b309dab8e1251 |
| 367. CLIENT-042 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1192ms | pass | d5f8f3ac0fdd39936df3175d66222cdbd58238cc8739e520934547d2917f3b10 | c91afc4706190ae48601d01e321198ac920f07e6a87afd66a2ee62bb99a8cea9 |
| 368. MEDIA-016 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 2123ms | pass | 11eaed77c362e14f21c1a742febba62fed04ef56773da5b57b42d5a134c76065 | c6ce048af89c87718c50682694f9e6d7bd757b00da7b4bfed5bfda3f19eab804 |
| 369. MEDIA-017 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 3829ms | pass | 82ecb8cb469a2d5ceefe0e4fa53de0c4373857d356dcc307dddbb33cc02e8bb5 | 60ca4e070ae28da2e5d9df7bbf22679b1a3e80627093eade4e977ade01f377dd |
| 370. SAFE-015 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1288ms | pass | c61f873dd74351906bc9915411d184d397b0cbb86061c43a72fb3e4af5df0856 | a45ee0a1d49af8865eb7b9b2da991cadfd2b595b7bd045627513e1661695a595 |
| 371. SAFE-016 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1057ms | pass | d240bfa03c68cf7510b8516434823a8407573c1abdd9477608d0babd407103b1 | ccbb6ad6637da59d9c29c224ab5e5cccd018ca4ffe99bacbea2063833b2533ab |
| 372. SAFE-017 | /lab → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1065ms | pass | c9aca6142e4bfada0b2662c4d0b94aa648f8506c8d2b04addb5f326773323d12 | b98e1fe2429adb23784bb1343086d6d25259177c80e9f090d16992992bc9fa0e |
| 373. SAFE-018 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1232ms | pass | 80b062493bb99489820a5622deba06fe2d78be498abee2436cfd9fcf7d9fe914 | 1ff0968608ef7d78712402e703f69f4b2fef7a444515a804fb1c23734633460c |
| 374. SAFE-019 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1304ms | pass | bb7e9dd7d84fdec37beb9bdddfc8b49c0c453b0f1596d2f3ed1bb39329285cf7 | e67da0f655abbc3521f204db5422843f0344eaf959f09a5c7d08b5ad2223d1e5 |
| 375. SAFE-020 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1778ms | pass | bb912679b3c8ab3cdab1f219ebf5575a2ce662e7df7162319b5671f6bbdb78f8 | 04500a7fa05406432d1d6b67abed5c530eff106ab35df3acd0f83f7c9310c8c3 |
| 376. SAFE-021 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1857ms | pass | d753f0de07cce0e954ed6c7c8c7cf004e5f992c5587363e55c645f5de446848f | 3e9347d0b6c8cb88fb06094d9532dbc922f0f0b377491c29026ccb5bc86039e1 |
| 377. SAFE-024 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1796ms | pass | c17ba7ebf3d753ad9aa39743619eadbed1e279141191038a7307df1537d7ceb3 | 3c159fbd24054ce2b2825c84587a238d854524a4371e5e2c9d86c4002bcfc4db |
| 378. SAFE-028 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1319ms | pass | 8125c49fe6da3d36fd1064a9588abd673afb3d3a3d23d857f872b0bbcfb61f3f | d888353202656752c1b95f0830723a0ae628048e95778a479e3f9b5b4d9e040d |
| 379. SAFE-031 | /client/live → /client/live; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1280ms | pass | 789687a0a21f62ca15623ae032386fe1e4e4339509ce892c6eab8fc9045116f9 | 474dc5586a71e2002b16ed9eb7c0456c6eb52b05432ead843038d028e30d6a58 |
| 380. SAFE-033 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1860ms | pass | a38092323fdd21f5f14a19f427e163da1c216e2e3dce43483531f38748703c49 | dc60d4b6590013987405894bd9938d503e5d29b2f99b7203d4256fd8bf370f6b |
| 381. SAFE-038 | /ops/rules → /ops/rules; role operator→operator; 390×844→390×844; light→light; child exit0; 2237ms | pass | 60406e871b3cdb8374adfb6826f15fdd871df390893945c635f109a3e09a0ade | 892fa04e0887ed37eb951c527ae459c28120068b1b0d594ba352ada9ddac9001 |
| 382. SAFE-041 | /ops/api/audit → /ops/users; role admin→admin; 390×844→390×844; light→light; child exit0; 2083ms | pass | 7b504c1c7b9c033010415749373f78725d58406389c8902452315926f5a9c519 | 62b20d7a4291638ff9ae279a4fa91357c1b72ccca10c243720579c36790b9cc3 |
| 383. SAFE-042 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1772ms | pass | 757c393c7458822edc099eda8e27f3ccb9ec20353e1dc69f791433824fc713bc | 4650a858d9e967fe99ce0e61e8664d332056b829c6465f75b1b79487c6aaefde |
| 384. SAFE-045 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1279ms | pass | 25c7ad99a58adcc8d0be197a72f0e965e0808d250f6864ad25efb1c7e052f7c9 | a2a89f895581edb50509d7e4f85d6e737a2a2141cec2aeb2bb82ebdce8eb68df |
| 385. SAFE-046 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1870ms | pass | 47afc83e67cb98cf929737e264bea2d8d495a771fef6dac93966111b2bcd19cb | 3033613a652193f65af148923d78fc4624483a48d07e9bdae32db97ac775ac9b |
| 386. SAFE-047 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1797ms | pass | e3f89c8441ad0cd17901356315127838f39611b1e9e3cba71f6b8cfc93a08edb | 29d9d91a14bd1d170afc3942b95083ea2a2331f6d8a2598e94d96e29c9bbb4bc |
| 387. SAFE-048 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1843ms | pass | f8fcf5559166dafa478789794e7108d7c91b799677cb86d9c99882d0f3a0fbe2 | 5e3eb40ff7088475660d7e6d2a84facacee14ecd025c1ffcd41a44904c3b6121 |
| 388. SAFE-049 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1803ms | pass | 9081c8b3b1772a063553da2d4e397a697d7145dcb1d1b2ed65075feac82f24eb | 3276f0d08f4e6d67295baf73c0979b764bd542dfe1728defd634326d79f0c699 |
| 389. SAFE-050 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1292ms | pass | ac431a785107ed061a78fb9ebe87e7202e62e3b4064f6780a11c207f0c85d7fb | d8c11ca81b585617bb8b41c98b29eb8a6085e1e9ca5ef70938fbd0c33211b205 |
| 390. SAFE-052 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 2257ms | pass | b4d871a12520f3203ed59d74881d002d02cf6c7b82b380684b0365747f1265f7 | e249d4cfa898298ca2b2bd382c41fdfddecee09c2488f99e457252eeeb1c4746 |
| 391. SAFE-053 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1962ms | pass | 9fdd54f7f20593e66bdd39677f203fa81a257ba59f21b91aa73f65ce77a0a3bd | 1565ffa50f026737ecf2f758c549a9b89889419dc750284cf9953fcc58c850b2 |
| 392. SAFE-054 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1276ms | pass | 0517a98c526852a8ed3194467140c52b94928f599633d885a86fb17c147b6e49 | cef44bae526f8939ba01824d3db817c08e1bcdd9db705fccaef63d05e6051f9e |
| 393. SAFE-055 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1821ms | pass | f721d04530abc92c7d64d3750972e8d94c7e089185e5755b8c20d7a7ee609e59 | b8203e14b9ade0b6392e76e77a59f2aaa90dbaa3568559b3d38a752bff66a8d4 |
| 394. SAFE-056 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1811ms | pass | f181fd0dbfef96d3e2deae60fd582aa431e46cd97581c95a2b916338a1bb366b | a458cd4dbb5f10600e6f8a32ec724278719d246127f331dddd65d28c3c0f009b |
| 395. SAFE-058 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1999ms | pass | 02a8737ddcf726cc2157900b0c78743b4da5c97389dfcf415b28b6348a03c0ad | 21e2c355ac156b11d144dedbca5f31c06f772de2d954e4bb6677764975986921 |
| 396. SAFE-059 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1999ms | pass | 2e0dc1de366da703e16f5fc4cdfab40541e7bd3f6db389b9a568e1e4048043d8 | 02ab8e14630d6597747ecfbcd84bf75902876a4b8f8b407afd75816c7f7378b0 |
| 397. SAFE-060 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1897ms | pass | 548fec5c35fa8e190be1f69b84993789922700f56b85183e901a928246d0b95d | 94f3cd4292d1a2551ff637cd242aa78319997e7bca96d002f97c835a56a69dca |
| 398. SAFE-061 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1990ms | pass | 092bafb8383d110d41e17d40b9f3cb05e2da4ca0bd48f8a659e34c4554b688c6 | 206f9357b8e0effac76e119329216d8fe3c80e5bd92c47042870746d304ee027 |
| 399. SAFE-062 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1801ms | pass | da4987c7eb0c0d3602dc932fab814acc9bf08dae41d304b1c549474e078c4082 | 80bef94861a2f3634435df7babdea226a1f17da27cc47f50fd3648fc2f10e9fa |
| 400. SAFE-065 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1843ms | pass | 174da92ae176ba8a128796283e45da42cf491c68cc53482322572944800a8663 | e2b5ca8d6b4437838484d5b16a9dde37ee6da4a10091000a691d61cadb53ed91 |
| 401. SAFE-066 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1823ms | pass | adf96ebfc99279630cc2fbe5e21a721a31b4820a4b04f1dfe3e1254f98c8180d | 15d13b965eb87b90812a584d5c9a2845bba17ea75892d08e7eba38f52142f5c8 |
| 402. SAFE-067 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1819ms | pass | 11e3f8c8f65c176fb4d20c6ee048c6811805c2e6c76597b988ba8da804df49ab | fc813d5e45e301dd1de8ecbe1376b19c0a8e4928d2d5aa899a45bbeba29f3564 |
| 403. SAFE-068 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1838ms | pass | d474e1d8f7a08e8556e41138e9ea9092677bf7ab5f3574f20cafa92eea8f2d09 | 1effb4aaf4db92e4e86316404c5122eff1e193d4956d3e3b1400475cfde71b77 |
| 404. SAFE-069 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1830ms | pass | 3006aa63ece658cbff3b1ab70d9949444549703711eeedaaf5deb5e80015676d | ef282178ca28f5b7b3d9c20cd645615f66e8dfe754e69a811111054c04fcfab2 |
| 405. SAFE-098 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1855ms | pass | 9364c6150284b5df5747da5f1165a5d704c61f9c04f24a610aaa7e2d33bdf17b | bea42f56c1737677ab5724c3f49cecf91548afc334b9939bb6e66051f687331b |
| 406. SAFE-104 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1318ms | pass | 0bf620d61b0e5bfafb83a6d3e9f1a1625fd042c3bceede9f21ff1fa761e6e228 | f0e4e9f548a2486ceb6da6136d2932c41453e30505fff9c1a23206eae93355e5 |
| 407. SAFE-105 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1798ms | pass | 29173d80c4ea518995cbbd118dffea393157732b9e7d9fa187671aac3e7d3852 | be88b290a8e64cab9b28210d4bd112cdb3323793876d70645802da05604b1e08 |
| 408. SAFE-106 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1844ms | pass | 58c949a9cd1984f84832c8976ca3a7b85e937d6614c944d6acf5f542c9ba6ba1 | 351a85f2dad5a8325eab02481818fde02810466465b3388385ef07ab8cdb00d9 |
| 409. SAFE-107 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1789ms | pass | 7685ad8e70f098af2768aa6f46017c73e414722cd290fbd7093358ceaa35c270 | 62c8264222b8b3706a1076b5423673f45b3121beed918e9fe1d0f686631f8e91 |
| 410. SAFE-108 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1835ms | pass | 1cea203b096adb5a56cb62757efcbbb57327eb1472e1e59a87497b7acefc5bd0 | 9575f9073838a7f652092bbfcdf8c1ff3dab2825585c7c300d76cd8d98f1b0ee |
| 411. SAFE-109 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1869ms | pass | ac52f222fd0ba2de082eab35212ffa4bf05eae3f98cf1cfa29d31f443955af8e | a0012e3cdaa48e6c18504100814c5c88d214520c893ab9a730c492a63dd450bc |
| 412. SAFE-110 | /client/api/views/{id}/events → /client/events; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1793ms | pass | e1e2ba2a984341ade981644da2514dd49adadd7d477a10c59b54303a172146de | 36409059cc3e97af3c6045381a528cbcf666fc067adb6abb6d3abfb0863aee75 |
| 413. SAFE-111 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1852ms | pass | 90c0fd12ea5761a3452bc4d0e593bbb6f897419f87bbaebdfe94a97bd5f88772 | e76c9386b25cba44afbda3463be41a9fcb57285afafc073d156dfb89eb7981dc |
| 414. SAFE-117 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1791ms | pass | e0031dacd17c97419cc50a6438a9bceb1e867bc72b93507d87f0c7701a6998ba | 896282b24b9417c0ac6b08db946ca2c2c9398662354c358afae07152e54e9f40 |
| 415. SAFE-118 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1779ms | pass | c06aa5d7f362a1f7e95d6d6549a0ac62e05ac405d62dddc796dd76da21479dc3 | fb99116c275b912f01ee6883c572322dfb09f81976dad8fc2160cd0d50be6b03 |
| 416. SAFE-119 | /client/api/views/{id}/events → /client/events; role viewer→viewer; 390×844→390×844; light→light; child exit0; 1829ms | pass | 422a6e09bd669897ac054c629bfd85a633c595f3c216ddfef03322c9f1e409ea | e75b8ae9254e18c14771f50d8a888a814e6a27908a804523f5ee9c3d42525637 |
| 417. SAFE-121 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1821ms | pass | c2fcd5c416e7a21bee059582a91d875281bb0d59f40233249b260238bb6f7afb | 59d57c3d19c36897b06aaf075608332a3028c9e2ee8407ade1b8b7cf397e95f2 |
| 418. SAFE-122 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1770ms | pass | 5578b8648d8b2d58f0845b996bf218cf24b89921e3679dbf385d3b6b4057bd30 | bc034135c0a96be33fd30746478c4f3efaba19245e31700d7afde5d8dec8c53c |
| 419. SAFE-129 | /ops/sources → /ops/sources; role operator→operator; 390×844→390×844; light→light; child exit0; 1833ms | pass | 2fd377ffdb404126de327676c4208dc912bc303cdfb89b7a9aaf145d80c41f55 | a780cc8f397815756a33518b05b156fb39fd8b4c95730ce7a2eeeb144da0c4cf |
| 420. SAFE-130 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1872ms | pass | 124e54b448792454038a02c3986358e1921b6ad15a1436635bc789f5ce6b91cb | 32122f61e1437319602cdc7174d2021f919c35d17d41ec897b8507498b8538e2 |
| 421. SAFE-131 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1831ms | pass | 407d0083e240e9726ad976a2bf2235824c8aa1751c3078dc426a449cce1fcd4c | 29953b7c931f01a8516b33d2eee1fc6d5764ddca57dd5b27bc4b0dda13691bc0 |
| 422. SAFE-132 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1780ms | pass | f1fa99f54ce079c9880ce5300e573bd070fbbac92f141db3fad7cf8d244154de | 39bfa383ecced2681af0d629fcc38338791f479beaa8a7f2546c778cd66a0d11 |
| 423. SAFE-138 | /ops/events → /ops/events; role operator→operator; 390×844→390×844; light→light; child exit0; 1266ms | pass | 0b85d2713a5f69befbdf4de9903b27db4c0d68389971516d955011d6581d0711 | fa93f07b534c0589e77430d66558a137dc9f534dc9b675371dcb007a8edaf748 |
| 424. SAFE-140 | /ops → /ops; role operator→operator; 390×844→390×844; light→light; child exit0; 1791ms | pass | 165d6d303e36d1cf14ff47a00cfeb05d3308be904437b34bbb42c3b949bad822 | cf60e71e3658a2496e866b4abd19e9fc146a9deef3836b570fb797d345435481 |

### 61366 trace action 전수

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| UI-001/1 | UI-001:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-001/2 | UI-001:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-002/3 | UI-002:wait-visible; wait-visible; control=[data-testid="auth-setup-form"] button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-002/4 | UI-002:submit-form; submit-form; control=[data-testid="auth-setup-form"] button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-002/5 | UI-002:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-003/6 | UI-003:wait-visible; wait-visible; control=[data-testid="auth-login-form"] button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-003/7 | UI-003:submit-form; submit-form; control=[data-testid="auth-login-form"] button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-003/8 | UI-003:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-004/9 | UI-004:wait-visible; wait-visible; control=[data-testid="auth-password-change-form"] button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-004/10 | UI-004:submit-form; submit-form; control=[data-testid="auth-password-change-form"] button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-004/11 | UI-004:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-005/12 | UI-005:wait-visible; wait-visible; control=form[action="/logout"] button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-005/13 | UI-005:submit-form; submit-form; control=form[action="/logout"] button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-005/14 | UI-005:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-007/15 | UI-007:wait-visible; wait-visible; control=[data-testid="auth-invite-setup-form"] button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-007/16 | UI-007:submit-form; submit-form; control=[data-testid="auth-invite-setup-form"] button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-007/17 | UI-007:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-008/18 | UI-008:wait-visible; wait-visible; control=#request-form button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-008/19 | UI-008:submit-form; submit-form; control=#request-form button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-008/20 | UI-008:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-009/21 | UI-009:wait-visible; wait-visible; control=[data-testid="ops-home-page"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-009/22 | UI-009:assert-visible-read-model; assert-visible-read-model; control=[data-testid="ops-home-page"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-009/23 | UI-009:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-010/24 | UI-010:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-010/25 | UI-010:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-011/26 | UI-011:wait-visible; wait-visible; control=[data-testid="source-reliability-search-metrics"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-011/27 | UI-011:assert-visible-read-model; assert-visible-read-model; control=[data-testid="source-reliability-search-metrics"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-011/28 | UI-011:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-012/29 | UI-012:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-012/30 | UI-012:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-013/31 | UI-013:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-013/32 | UI-013:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-014/33 | UI-014:wait-visible; wait-visible; control=#opsIncidentSearchInput; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-014/34 | UI-014:fill-control; fill-control; control=#opsIncidentSearchInput; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-014/35 | UI-014:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-015/36 | UI-015:wait-visible; wait-visible; control=[data-testid="client-live-action-reduction"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-015/37 | UI-015:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-live-action-reduction"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-015/38 | UI-015:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-016/39 | UI-016:wait-visible; wait-visible; control=[data-testid="client-dashboard-shell"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-016/40 | UI-016:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-dashboard-shell"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-016/41 | UI-016:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-017/42 | UI-017:wait-visible; wait-visible; control=.client-viewer-events; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-017/43 | UI-017:assert-visible-read-model; assert-visible-read-model; control=.client-viewer-events; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-017/44 | UI-017:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-018/45 | UI-018:navigate; navigate-negative; control=not-specified; executed=true; completion=primary-action | pass | 原 status=PASS; case=PASS |
| UI-019/46 | UI-019:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-019/47 | UI-019:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-020/48 | UI-020:wait-visible; wait-visible; control=.ops-workspace-diagnostic-grid; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-020/49 | UI-020:assert-visible-read-model; assert-visible-read-model; control=.ops-workspace-diagnostic-grid; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-020/50 | UI-020:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-021/51 | UI-021:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-021/52 | UI-021:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-022/53 | UI-022:assert-disabled-control; assert-disabled-control; control=#opsVlmExternalTransferWarningAck; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-022/54 | UI-022:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-023/55 | UI-023:wait-visible; wait-visible; control=#opsVlmSaveProfile; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-023/56 | UI-023:execute-persisted-action; execute-persisted-action; control=#opsVlmSaveProfile; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-023/57 | UI-023:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-024/58 | UI-024:wait-visible; wait-visible; control=#opsVlmPrivacyGuardList; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-024/59 | UI-024:assert-visible-read-model; assert-visible-read-model; control=#opsVlmPrivacyGuardList; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-024/60 | UI-024:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-025/61 | UI-025:wait-visible; wait-visible; control=#opsVlmDisabledReason; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-025/62 | UI-025:fill-control; fill-control; control=#opsVlmDisabledReason; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-025/63 | UI-025:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-026/64 | UI-026:wait-visible; wait-visible; control=[data-vlm-option-id="local-qwen3-vl-4b"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-026/65 | UI-026:activate-control; activate-control; control=[data-vlm-option-id="local-qwen3-vl-4b"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-026/66 | UI-026:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-027/67 | UI-027:wait-visible; wait-visible; control=#opsVlmRuntimeStatusList; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-027/68 | UI-027:assert-visible-read-model; assert-visible-read-model; control=#opsVlmRuntimeStatusList; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-027/69 | UI-027:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-028/70 | UI-028:wait-visible; wait-visible; control=#opsVlmProfileEnabled; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-028/71 | UI-028:toggle-checkbox; toggle-checkbox; control=#opsVlmProfileEnabled; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-028/72 | UI-028:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-029/73 | UI-029:wait-visible; wait-visible; control=[data-delete-vlm-profile="ui-029-review4-fixture"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-029/74 | UI-029:execute-persisted-action; execute-persisted-action; control=[data-delete-vlm-profile="ui-029-review4-fixture"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-029/75 | UI-029:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-030/76 | UI-030:wait-visible; wait-visible; control=#opsVlmEvaluationRows; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-030/77 | UI-030:assert-visible-read-model; assert-visible-read-model; control=#opsVlmEvaluationRows; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-030/78 | UI-030:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-031/79 | UI-031:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-031/80 | UI-031:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-032/81 | UI-032:wait-visible; wait-visible; control=#opsIncidentSearchInput; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-032/82 | UI-032:fill-control; fill-control; control=#opsIncidentSearchInput; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-032/83 | UI-032:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-033/84 | UI-033:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-033/85 | UI-033:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-034/86 | UI-034:wait-visible; wait-visible; control=#opsVlmEvaluationRows; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-034/87 | UI-034:assert-visible-read-model; assert-visible-read-model; control=#opsVlmEvaluationRows; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-034/88 | UI-034:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-035/89 | UI-035:wait-visible; wait-visible; control=#opsIncidentSearchInput; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-035/90 | UI-035:fill-control; fill-control; control=#opsIncidentSearchInput; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-035/91 | UI-035:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-036/92 | UI-036:wait-visible; wait-visible; control=[data-vlm-rule-draft-index]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-036/93 | UI-036:activate-control; activate-control; control=[data-vlm-rule-draft-index]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-036/94 | UI-036:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-037/95 | UI-037:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-037/96 | UI-037:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-038/97 | UI-038:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-038/98 | UI-038:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-039/99 | UI-039:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-039/100 | UI-039:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-040/101 | UI-040:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-040/102 | UI-040:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-041/103 | UI-041:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-041/104 | UI-041:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-042/105 | UI-042:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-042/106 | UI-042:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-043/107 | UI-043:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-043/108 | UI-043:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-044/109 | UI-044:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-044/110 | UI-044:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-045/111 | UI-045:wait-visible; wait-visible; control=#opsIncidentSearchInput; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-045/112 | UI-045:fill-control; fill-control; control=#opsIncidentSearchInput; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-045/113 | UI-045:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-046/114 | UI-046:wait-visible; wait-visible; control=[data-incident-rule-draft-route]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-046/115 | UI-046:activate-control; activate-control; control=[data-incident-rule-draft-route]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-046/116 | UI-046:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-047/117 | UI-047:wait-visible; wait-visible; control=[data-testid="source-backup-recovery-handoff"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-047/118 | UI-047:assert-visible-read-model; assert-visible-read-model; control=[data-testid="source-backup-recovery-handoff"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-047/119 | UI-047:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-048/120 | UI-048:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-048/121 | UI-048:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-049/122 | UI-049:wait-visible; wait-visible; control=#opsScenarioBuilderType; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-049/123 | UI-049:select-control; select-control; control=#opsScenarioBuilderType; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-049/124 | UI-049:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-050/125 | UI-050:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-050/126 | UI-050:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-051/127 | UI-051:wait-visible; wait-visible; control=#opsIncidentTriageBoardRows; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-051/128 | UI-051:assert-visible-read-model; assert-visible-read-model; control=#opsIncidentTriageBoardRows; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-051/129 | UI-051:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-052/130 | UI-052:wait-visible; wait-visible; control=[data-testid="ops-operational-action-pack"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-052/131 | UI-052:assert-visible-read-model; assert-visible-read-model; control=[data-testid="ops-operational-action-pack"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-052/132 | UI-052:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-053/133 | UI-053:wait-visible; wait-visible; control=[data-testid="ops-rule-what-if-preview"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-053/134 | UI-053:assert-visible-read-model; assert-visible-read-model; control=[data-testid="ops-rule-what-if-preview"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-053/135 | UI-053:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-054/136 | UI-054:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-054/137 | UI-054:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-055/138 | UI-055:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-055/139 | UI-055:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-056/140 | UI-056:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-056/141 | UI-056:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-057/142 | UI-057:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-057/143 | UI-057:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-058/144 | UI-058:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-058/145 | UI-058:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-059/146 | UI-059:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-059/147 | UI-059:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-060/148 | UI-060:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-060/149 | UI-060:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-061/150 | UI-061:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-061/151 | UI-061:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-062/152 | UI-062:wait-visible; wait-visible; control=#opsV320ResolutionTimeline; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-062/153 | UI-062:assert-visible-read-model; assert-visible-read-model; control=#opsV320ResolutionTimeline; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-062/154 | UI-062:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-063/155 | UI-063:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-063/156 | UI-063:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-064/157 | UI-064:wait-visible; wait-visible; control=#v320SourceReliabilityGrid; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-064/158 | UI-064:assert-visible-read-model; assert-visible-read-model; control=#v320SourceReliabilityGrid; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-064/159 | UI-064:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-065/160 | UI-065:wait-visible; wait-visible; control=#v320AiReviewQualityGrid; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-065/161 | UI-065:assert-visible-read-model; assert-visible-read-model; control=#v320AiReviewQualityGrid; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-065/162 | UI-065:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-066/163 | UI-066:wait-visible; wait-visible; control=#v320OperatorResolutionFlowGrid; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-066/164 | UI-066:assert-visible-read-model; assert-visible-read-model; control=#v320OperatorResolutionFlowGrid; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-066/165 | UI-066:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-067/166 | UI-067:wait-visible; wait-visible; control=#v320ActionReadinessChecklistGrid; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-067/167 | UI-067:assert-visible-read-model; assert-visible-read-model; control=#v320ActionReadinessChecklistGrid; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-067/168 | UI-067:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-068/169 | UI-068:wait-visible; wait-visible; control=[data-testid="client-safe-resolution-digest"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-068/170 | UI-068:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-safe-resolution-digest"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-068/171 | UI-068:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-069/172 | UI-069:wait-visible; wait-visible; control=#v320ResolutionSearchMetricsGrid; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-069/173 | UI-069:assert-visible-read-model; assert-visible-read-model; control=#v320ResolutionSearchMetricsGrid; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-069/174 | UI-069:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-070/175 | UI-070:wait-visible; wait-visible; control=#v330IncidentSourceCorrelationGrid; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-070/176 | UI-070:assert-visible-read-model; assert-visible-read-model; control=#v330IncidentSourceCorrelationGrid; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-070/177 | UI-070:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-071/178 | UI-071:wait-visible; wait-visible; control=#v330OperatorRecheckRecoveryQueueGrid; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-071/179 | UI-071:assert-visible-read-model; assert-visible-read-model; control=#v330OperatorRecheckRecoveryQueueGrid; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-071/180 | UI-071:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-072/181 | UI-072:wait-visible; wait-visible; control=[data-testid="client-safe-source-status-digest"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-072/182 | UI-072:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-safe-source-status-digest"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-072/183 | UI-072:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-073/184 | UI-073:wait-visible; wait-visible; control=[data-testid="source-reliability-search-metrics"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-073/185 | UI-073:assert-visible-read-model; assert-visible-read-model; control=[data-testid="source-reliability-search-metrics"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-073/186 | UI-073:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-074/187 | UI-074:wait-visible; wait-visible; control=[data-testid="source-backup-recovery-handoff"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-074/188 | UI-074:assert-visible-read-model; assert-visible-read-model; control=[data-testid="source-backup-recovery-handoff"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-074/189 | UI-074:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-075/190 | UI-075:wait-visible; wait-visible; control=[data-testid="ops-continuity-drill-workspace"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-075/191 | UI-075:assert-visible-read-model; assert-visible-read-model; control=[data-testid="ops-continuity-drill-workspace"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-075/192 | UI-075:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-076/193 | UI-076:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-076/194 | UI-076:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-077/195 | UI-077:wait-visible; wait-visible; control=[data-testid="client-safe-maintenance-digest"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-077/196 | UI-077:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-safe-maintenance-digest"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-077/197 | UI-077:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-078/198 | UI-078:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-078/199 | UI-078:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-079/200 | UI-079:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-079/201 | UI-079:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-080/202 | UI-080:wait-visible; wait-visible; control=#v350IncidentCommandHandoffGrid; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-080/203 | UI-080:assert-visible-read-model; assert-visible-read-model; control=#v350IncidentCommandHandoffGrid; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-080/204 | UI-080:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-081/205 | UI-081:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-081/206 | UI-081:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-082/207 | UI-082:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-082/208 | UI-082:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-083/209 | UI-083:wait-visible; wait-visible; control=[data-testid="client-impact-forecast"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-083/210 | UI-083:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-impact-forecast"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-083/211 | UI-083:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-084/212 | UI-084:wait-visible; wait-visible; control=[data-testid="client-operations-notice"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-084/213 | UI-084:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-operations-notice"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-084/214 | UI-084:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-085/215 | UI-085:wait-visible; wait-visible; control=#dashCommandWorkspaceExportBundleMap; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-085/216 | UI-085:assert-visible-read-model; assert-visible-read-model; control=#dashCommandWorkspaceExportBundleMap; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-085/217 | UI-085:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-086/218 | UI-086:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-086/219 | UI-086:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-087/220 | UI-087:wait-visible; wait-visible; control=#dashCommandWorkspaceVlmAssistedExplanation; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-087/221 | UI-087:assert-visible-read-model; assert-visible-read-model; control=#dashCommandWorkspaceVlmAssistedExplanation; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-087/222 | UI-087:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-088/223 | UI-088:wait-visible; wait-visible; control=[data-v360-simulation-workspace-entry="simulation-route-family"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-088/224 | UI-088:assert-visible-read-model; assert-visible-read-model; control=[data-v360-simulation-workspace-entry="simulation-route-family"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-088/225 | UI-088:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-089/226 | UI-089:wait-visible; wait-visible; control=#dashSimulationWorkspaceLedgerList > [data-v360-simulation-run-ledger-entry]:nth-child(2); executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-089/227 | UI-089:assert-visible-read-model; assert-visible-read-model; control=#dashSimulationWorkspaceLedgerList > [data-v360-simulation-run-ledger-entry]:nth-child(2); executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-089/228 | UI-089:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-090/229 | UI-090:wait-visible; wait-visible; control=#dashSimulationWorkspaceNoticePreviewList > [data-v360-client-notice-preview-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-090/230 | UI-090:assert-visible-read-model; assert-visible-read-model; control=#dashSimulationWorkspaceNoticePreviewList > [data-v360-client-notice-preview-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-090/231 | UI-090:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-091/232 | UI-091:wait-visible; wait-visible; control=#dashSimulationWorkspaceWhatIfReplayList > [data-v360-rule-va-what-if-replay-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-091/233 | UI-091:assert-visible-read-model; assert-visible-read-model; control=#dashSimulationWorkspaceWhatIfReplayList > [data-v360-rule-va-what-if-replay-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-091/234 | UI-091:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-092/235 | UI-092:wait-visible; wait-visible; control=#dashSimulationWorkspaceExportBundleList > [data-v360-simulation-export-bundle-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-092/236 | UI-092:assert-visible-read-model; assert-visible-read-model; control=#dashSimulationWorkspaceExportBundleList > [data-v360-simulation-export-bundle-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-092/237 | UI-092:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-093/238 | UI-093:wait-visible; wait-visible; control=#dashSimulationWorkspaceFieldEvidenceAdapterList > [data-v360-field-evidence-simulation-adapter-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-093/239 | UI-093:assert-visible-read-model; assert-visible-read-model; control=#dashSimulationWorkspaceFieldEvidenceAdapterList > [data-v360-field-evidence-simulation-adapter-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-093/240 | UI-093:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-094/241 | UI-094:wait-visible; wait-visible; control=#dashSimulationWorkspaceVlmAssistedExplanationList > [data-v360-vlm-assisted-simulation-explanation-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-094/242 | UI-094:assert-visible-read-model; assert-visible-read-model; control=#dashSimulationWorkspaceVlmAssistedExplanationList > [data-v360-vlm-assisted-simulation-explanation-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-094/243 | UI-094:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-095/244 | UI-095:wait-visible; wait-visible; control=#dashSiteOperationsSiteList > [data-v370-site-operations-workspace-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-095/245 | UI-095:assert-visible-read-model; assert-visible-read-model; control=#dashSiteOperationsSiteList > [data-v370-site-operations-workspace-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-095/246 | UI-095:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-096/247 | UI-096:wait-visible; wait-visible; control=#dashSiteClientNoticePreviewList > [data-v370-client-notice-by-site-view-group-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-096/248 | UI-096:assert-visible-read-model; assert-visible-read-model; control=#dashSiteClientNoticePreviewList > [data-v370-client-notice-by-site-view-group-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-096/249 | UI-096:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-097/250 | UI-097:wait-visible; wait-visible; control=#dashSiteRuleVaWhatIfCandidateList > [data-v370-rule-va-what-if-by-site-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-097/251 | UI-097:assert-visible-read-model; assert-visible-read-model; control=#dashSiteRuleVaWhatIfCandidateList > [data-v370-rule-va-what-if-by-site-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-097/252 | UI-097:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-098/253 | UI-098:wait-visible; wait-visible; control=#dashSiteFieldEvidenceAttachmentList > [data-v370-field-evidence-attachment-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-098/254 | UI-098:assert-visible-read-model; assert-visible-read-model; control=#dashSiteFieldEvidenceAttachmentList > [data-v370-field-evidence-attachment-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-098/255 | UI-098:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-099/256 | UI-099:wait-visible; wait-visible; control=#dashSiteLimitedSafeExecutionPilotList > [data-v370-limited-safe-execution-pilot-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-099/257 | UI-099:assert-visible-read-model; assert-visible-read-model; control=#dashSiteLimitedSafeExecutionPilotList > [data-v370-limited-safe-execution-pilot-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-099/258 | UI-099:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-100/259 | UI-100:wait-visible; wait-visible; control=#dashSiteOutcomeReconciliationSourceList > [data-v370-outcome-reconciliation-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-100/260 | UI-100:assert-visible-read-model; assert-visible-read-model; control=#dashSiteOutcomeReconciliationSourceList > [data-v370-outcome-reconciliation-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-100/261 | UI-100:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-101/262 | UI-101:wait-visible; wait-visible; control=#dashSiteExportHandoffBundleList > [data-v370-export-handoff-bundle-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-101/263 | UI-101:assert-visible-read-model; assert-visible-read-model; control=#dashSiteExportHandoffBundleList > [data-v370-export-handoff-bundle-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-101/264 | UI-101:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-102/265 | UI-102:wait-visible; wait-visible; control=#dashActionControlRequestList > [data-v380-action-control-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-102/266 | UI-102:assert-visible-read-model; assert-visible-read-model; control=#dashActionControlRequestList > [data-v380-action-control-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-102/267 | UI-102:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-103/268 | UI-103:wait-visible; wait-visible; control=[data-testid="client-action-notice-preview"] .client-action-notice-item:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-103/269 | UI-103:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-action-notice-preview"] .client-action-notice-item:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-103/270 | UI-103:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-104/271 | UI-104:wait-visible; wait-visible; control=#dashActionOutcomeSourceList > [data-v380-outcome-observer-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-104/272 | UI-104:assert-visible-read-model; assert-visible-read-model; control=#dashActionOutcomeSourceList > [data-v380-outcome-observer-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-104/273 | UI-104:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-105/274 | UI-105:wait-visible; wait-visible; control=#dashActionReceiptBundleList > [data-v380-action-receipt-entry]:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-105/275 | UI-105:assert-visible-read-model; assert-visible-read-model; control=#dashActionReceiptBundleList > [data-v380-action-receipt-entry]:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-105/276 | UI-105:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-106/277 | UI-106:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-106/278 | UI-106:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-107/279 | UI-107:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-107/280 | UI-107:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-108/281 | UI-108:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-108/282 | UI-108:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-109/283 | UI-109:wait-visible; wait-visible; control=#channel-save-selected; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-109/284 | UI-109:execute-persisted-action; execute-persisted-action; control=#channel-save-selected; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-109/285 | UI-109:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-110/286 | UI-110:wait-visible; wait-visible; control=#opsVlmRuleDraftBridgeStatus; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-110/287 | UI-110:assert-visible-read-model; assert-visible-read-model; control=#opsVlmRuleDraftBridgeStatus; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-110/288 | UI-110:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-111/289 | UI-111:assert-disabled-control; assert-disabled-control; control=#opsVlmExternalTransferWarningAck; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-111/290 | UI-111:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-112/291 | UI-112:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-112/292 | UI-112:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-113/293 | UI-113:wait-visible; wait-visible; control=#dashActionExecutionDeferralList; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-113/294 | UI-113:assert-visible-read-model; assert-visible-read-model; control=#dashActionExecutionDeferralList; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-113/295 | UI-113:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-114/296 | UI-114:wait-visible; wait-visible; control=#dashFieldEvidenceBridgeList; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| UI-114/297 | UI-114:assert-visible-read-model; assert-visible-read-model; control=#dashFieldEvidenceBridgeList; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-114/298 | UI-114:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| UI-115/299 | UI-115:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| UI-115/300 | UI-115:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-004/301 | AUTH-004:wait-visible; wait-visible; control=[data-testid="auth-login-form"] button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-004/302 | AUTH-004:submit-form; submit-form; control=[data-testid="auth-login-form"] button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-004/303 | AUTH-004:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-005/304 | AUTH-005:wait-visible; wait-visible; control=[data-testid="auth-setup-form"] button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-005/305 | AUTH-005:submit-form; submit-form; control=[data-testid="auth-setup-form"] button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-005/306 | AUTH-005:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-006/307 | AUTH-006:wait-visible; wait-visible; control=[data-testid="auth-setup-form"] button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-006/308 | AUTH-006:submit-form; submit-form; control=[data-testid="auth-setup-form"] button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-006/309 | AUTH-006:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-007/310 | AUTH-007:wait-visible; wait-visible; control=[data-testid="auth-login-form"] button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-007/311 | AUTH-007:submit-form; submit-form; control=[data-testid="auth-login-form"] button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-007/312 | AUTH-007:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-012/313 | AUTH-012:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-012/314 | AUTH-012:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-013/315 | AUTH-013:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-013/316 | AUTH-013:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-014/317 | AUTH-014:navigate-action-route; navigate-action-route; control=not-specified; executed=true; completion=setup-navigation | pass | 原 status=PASS; case=PASS |
| AUTH-014/318 | AUTH-014:wait-visible; wait-visible; control=#user-save-selected; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-014/319 | AUTH-014:submit-form; submit-form; control=#user-save-selected; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-014/320 | AUTH-014:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-015/321 | AUTH-015:navigate-action-route; navigate-action-route; control=not-specified; executed=true; completion=setup-navigation | pass | 原 status=PASS; case=PASS |
| AUTH-015/322 | AUTH-015:wait-visible; wait-visible; control=#invite-create-form button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-015/323 | AUTH-015:submit-form; submit-form; control=#invite-create-form button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-015/324 | AUTH-015:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-016/325 | AUTH-016:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-016/326 | AUTH-016:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-018/327 | AUTH-018:wait-visible; wait-visible; control=#user-save-selected; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-018/328 | AUTH-018:execute-persisted-action; execute-persisted-action; control=#user-save-selected; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-018/329 | AUTH-018:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-019/330 | AUTH-019:wait-visible; wait-visible; control=#user-save-selected; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-019/331 | AUTH-019:execute-persisted-action; execute-persisted-action; control=#user-save-selected; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-019/332 | AUTH-019:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-020/333 | AUTH-020:execute-endpoint-action; execute-endpoint-action; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-020/334 | AUTH-020:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-021/335 | AUTH-021:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-021/336 | AUTH-021:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-022/337 | AUTH-022:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-022/338 | AUTH-022:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-023/339 | AUTH-023:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-023/340 | AUTH-023:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-024/341 | AUTH-024:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-024/342 | AUTH-024:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-025/343 | AUTH-025:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-025/344 | AUTH-025:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-026/345 | AUTH-026:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-026/346 | AUTH-026:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-027/347 | AUTH-027:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-027/348 | AUTH-027:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-028/349 | AUTH-028:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-028/350 | AUTH-028:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-029/351 | AUTH-029:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-029/352 | AUTH-029:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-030/353 | AUTH-030:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-030/354 | AUTH-030:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-033/355 | AUTH-033:navigate-action-route; navigate-action-route; control=not-specified; executed=true; completion=setup-navigation | pass | 原 status=PASS; case=PASS |
| AUTH-033/356 | AUTH-033:wait-visible; wait-visible; control=#invite-create-form button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-033/357 | AUTH-033:submit-form; submit-form; control=#invite-create-form button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-033/358 | AUTH-033:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-034/359 | AUTH-034:wait-visible; wait-visible; control=[data-testid="auth-invite-setup-form"] button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-034/360 | AUTH-034:submit-form; submit-form; control=[data-testid="auth-invite-setup-form"] button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-034/361 | AUTH-034:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-035/362 | AUTH-035:wait-visible; wait-visible; control=[data-testid="auth-invite-setup-form"] button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-035/363 | AUTH-035:submit-form; submit-form; control=[data-testid="auth-invite-setup-form"] button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-035/364 | AUTH-035:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-036/365 | AUTH-036:navigate-action-route; navigate-action-route; control=not-specified; executed=true; completion=setup-navigation | pass | 原 status=PASS; case=PASS |
| AUTH-036/366 | AUTH-036:wait-visible; wait-visible; control=#request-form button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-036/367 | AUTH-036:submit-form; submit-form; control=#request-form button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-036/368 | AUTH-036:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-037/369 | AUTH-037:navigate-action-route; navigate-action-route; control=not-specified; executed=true; completion=setup-navigation | pass | 原 status=PASS; case=PASS |
| AUTH-037/370 | AUTH-037:wait-visible; wait-visible; control=[data-request-approve="auth-037-review4-fixture"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-037/371 | AUTH-037:execute-persisted-action; execute-persisted-action; control=[data-request-approve="auth-037-review4-fixture"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-037/372 | AUTH-037:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-038/373 | AUTH-038:navigate-action-route; navigate-action-route; control=not-specified; executed=true; completion=setup-navigation | pass | 原 status=PASS; case=PASS |
| AUTH-038/374 | AUTH-038:wait-visible; wait-visible; control=[data-request-reject="auth-038-review4-fixture"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-038/375 | AUTH-038:execute-persisted-action; execute-persisted-action; control=[data-request-reject="auth-038-review4-fixture"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-038/376 | AUTH-038:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-039/377 | AUTH-039:navigate-action-route; navigate-action-route; control=not-specified; executed=true; completion=setup-navigation | pass | 原 status=PASS; case=PASS |
| AUTH-039/378 | AUTH-039:wait-visible; wait-visible; control=#request-form button[type="submit"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| AUTH-039/379 | AUTH-039:execute-persisted-action; execute-persisted-action; control=#request-form button[type="submit"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-039/380 | AUTH-039:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-040/381 | AUTH-040:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| AUTH-040/382 | AUTH-040:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-001/383 | SRC-001:wait-visible; wait-visible; control=#channel-save-selected; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SRC-001/384 | SRC-001:execute-persisted-action; execute-persisted-action; control=#channel-save-selected; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-001/385 | SRC-001:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-002/386 | SRC-002:wait-visible; wait-visible; control=#channel-save-selected; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SRC-002/387 | SRC-002:execute-persisted-action; execute-persisted-action; control=#channel-save-selected; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-002/388 | SRC-002:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-003/389 | SRC-003:wait-visible; wait-visible; control=#channel-save-selected; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SRC-003/390 | SRC-003:execute-persisted-action; execute-persisted-action; control=#channel-save-selected; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-003/391 | SRC-003:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-004/392 | SRC-004:wait-visible; wait-visible; control=#channel-save-selected; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SRC-004/393 | SRC-004:execute-persisted-action; execute-persisted-action; control=#channel-save-selected; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-004/394 | SRC-004:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-005/395 | SRC-005:wait-visible; wait-visible; control=#channel-save-selected; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SRC-005/396 | SRC-005:execute-persisted-action; execute-persisted-action; control=#channel-save-selected; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-005/397 | SRC-005:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-006/398 | SRC-006:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-006/399 | SRC-006:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-007/400 | SRC-007:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-007/401 | SRC-007:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-008/402 | SRC-008:execute-endpoint-action; execute-endpoint-action; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-008/403 | SRC-008:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-009/404 | SRC-009:wait-visible; wait-visible; control=#channel-save-selected; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SRC-009/405 | SRC-009:execute-persisted-action; execute-persisted-action; control=#channel-save-selected; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-009/406 | SRC-009:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-010/407 | SRC-010:execute-endpoint-action; execute-endpoint-action; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-010/408 | SRC-010:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-011/409 | SRC-011:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-011/410 | SRC-011:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-012/411 | SRC-012:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-012/412 | SRC-012:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-014/413 | SRC-014:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-014/414 | SRC-014:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-016/415 | SRC-016:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-016/416 | SRC-016:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-017/417 | SRC-017:wait-visible; wait-visible; control=#channel-save-selected; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SRC-017/418 | SRC-017:execute-persisted-action; execute-persisted-action; control=#channel-save-selected; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-017/419 | SRC-017:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-018/420 | SRC-018:wait-visible; wait-visible; control=#channel-save-selected; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SRC-018/421 | SRC-018:execute-persisted-action; execute-persisted-action; control=#channel-save-selected; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-018/422 | SRC-018:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-019/423 | SRC-019:execute-endpoint-action; execute-endpoint-action; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-019/424 | SRC-019:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-020/425 | SRC-020:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-020/426 | SRC-020:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-021/427 | SRC-021:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-021/428 | SRC-021:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-022/429 | SRC-022:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-022/430 | SRC-022:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-023/431 | SRC-023:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-023/432 | SRC-023:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-024/433 | SRC-024:wait-visible; wait-visible; control=#add-channel; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SRC-024/434 | SRC-024:activate-control; activate-control; control=#add-channel; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-024/435 | SRC-024:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-025/436 | SRC-025:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-025/437 | SRC-025:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-026/438 | SRC-026:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-026/439 | SRC-026:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-028/440 | SRC-028:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-028/441 | SRC-028:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-029/442 | SRC-029:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-029/443 | SRC-029:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-030/444 | SRC-030:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-030/445 | SRC-030:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-031/446 | SRC-031:execute-endpoint-action; execute-endpoint-action; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-031/447 | SRC-031:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-032/448 | SRC-032:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-032/449 | SRC-032:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-034/450 | SRC-034:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-034/451 | SRC-034:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-035/452 | SRC-035:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-035/453 | SRC-035:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-036/454 | SRC-036:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-036/455 | SRC-036:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-037/456 | SRC-037:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-037/457 | SRC-037:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-038/458 | SRC-038:wait-visible; wait-visible; control=[data-testid="client-safe-source-status-digest"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SRC-038/459 | SRC-038:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-safe-source-status-digest"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-038/460 | SRC-038:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-039/461 | SRC-039:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-039/462 | SRC-039:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-040/463 | SRC-040:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-040/464 | SRC-040:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-065/465 | SRC-065:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-065/466 | SRC-065:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-066/467 | SRC-066:wait-visible; wait-visible; control=#channel-save-selected; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SRC-066/468 | SRC-066:execute-persisted-action; execute-persisted-action; control=#channel-save-selected; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-066/469 | SRC-066:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-067/470 | SRC-067:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-067/471 | SRC-067:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-068/472 | SRC-068:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SRC-068/473 | SRC-068:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-001/474 | RULE-001:wait-visible; wait-visible; control=#opsVaRuleRows > tr:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-001/475 | RULE-001:assert-visible-read-model; assert-visible-read-model; control=#opsVaRuleRows > tr:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-001/476 | RULE-001:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-002/477 | RULE-002:wait-visible; wait-visible; control=#opsEventRuleRows > tr:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-002/478 | RULE-002:assert-visible-read-model; assert-visible-read-model; control=#opsEventRuleRows > tr:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-002/479 | RULE-002:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-003/480 | RULE-003:wait-visible; wait-visible; control=#opsProfileRows > tr:first-child; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-003/481 | RULE-003:assert-visible-read-model; assert-visible-read-model; control=#opsProfileRows > tr:first-child; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-003/482 | RULE-003:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-004/483 | RULE-004:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-004/484 | RULE-004:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-004/485 | RULE-004:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-005/486 | RULE-005:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-005/487 | RULE-005:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-005/488 | RULE-005:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-006/489 | RULE-006:wait-visible; wait-visible; control=[data-ops-rule-action="delete-va"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-006/490 | RULE-006:execute-persisted-action; execute-persisted-action; control=[data-ops-rule-action="delete-va"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-006/491 | RULE-006:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-007/492 | RULE-007:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-007/493 | RULE-007:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-008/494 | RULE-008:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-008/495 | RULE-008:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-008/496 | RULE-008:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-009/497 | RULE-009:wait-visible; wait-visible; control=#opsRulesValidationList; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-009/498 | RULE-009:assert-visible-read-model; assert-visible-read-model; control=#opsRulesValidationList; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-009/499 | RULE-009:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-010/500 | RULE-010:wait-visible; wait-visible; control=#opsVaRuleTemplateSeedSelect; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-010/501 | RULE-010:assert-visible-read-model; assert-visible-read-model; control=#opsVaRuleTemplateSeedSelect; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-010/502 | RULE-010:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-011/503 | RULE-011:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-011/504 | RULE-011:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-011/505 | RULE-011:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-012/506 | RULE-012:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-012/507 | RULE-012:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-012/508 | RULE-012:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-013/509 | RULE-013:wait-visible; wait-visible; control=#opsVaRuleGeometrySummary; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-013/510 | RULE-013:assert-visible-read-model; assert-visible-read-model; control=#opsVaRuleGeometrySummary; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-013/511 | RULE-013:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-014/512 | RULE-014:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-014/513 | RULE-014:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-015/514 | RULE-015:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-015/515 | RULE-015:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-016/516 | RULE-016:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-016/517 | RULE-016:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-016/518 | RULE-016:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-017/519 | RULE-017:assert-hidden-control; assert-hidden-control; control=#opsEventRuleIdInput; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-017/520 | RULE-017:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-018/521 | RULE-018:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-018/522 | RULE-018:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-018/523 | RULE-018:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-019/524 | RULE-019:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-019/525 | RULE-019:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-019/526 | RULE-019:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-020/527 | RULE-020:wait-visible; wait-visible; control=[data-ops-rule-action="delete-event-template"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-020/528 | RULE-020:execute-persisted-action; execute-persisted-action; control=[data-ops-rule-action="delete-event-template"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-020/529 | RULE-020:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-021/530 | RULE-021:wait-visible; wait-visible; control=#opsEventRuleDetailSummary; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-021/531 | RULE-021:assert-visible-read-model; assert-visible-read-model; control=#opsEventRuleDetailSummary; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-021/532 | RULE-021:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-022/533 | RULE-022:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-022/534 | RULE-022:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-022/535 | RULE-022:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-023/536 | RULE-023:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-023/537 | RULE-023:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-023/538 | RULE-023:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-024/539 | RULE-024:wait-visible; wait-visible; control=[data-ops-rule-action="delete-profile"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-024/540 | RULE-024:execute-persisted-action; execute-persisted-action; control=[data-ops-rule-action="delete-profile"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-024/541 | RULE-024:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-025/542 | RULE-025:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-025/543 | RULE-025:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-026/544 | RULE-026:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-026/545 | RULE-026:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-026/546 | RULE-026:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-027/547 | RULE-027:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-027/548 | RULE-027:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-027/549 | RULE-027:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-028/550 | RULE-028:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-028/551 | RULE-028:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-028/552 | RULE-028:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-029/553 | RULE-029:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-029/554 | RULE-029:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-029/555 | RULE-029:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-030/556 | RULE-030:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-030/557 | RULE-030:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-030/558 | RULE-030:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-031/559 | RULE-031:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-031/560 | RULE-031:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-031/561 | RULE-031:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-032/562 | RULE-032:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-032/563 | RULE-032:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-032/564 | RULE-032:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-033/565 | RULE-033:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-033/566 | RULE-033:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-033/567 | RULE-033:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-034/568 | RULE-034:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-034/569 | RULE-034:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-034/570 | RULE-034:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-035/571 | RULE-035:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-035/572 | RULE-035:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-035/573 | RULE-035:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-036/574 | RULE-036:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-036/575 | RULE-036:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-036/576 | RULE-036:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-037/577 | RULE-037:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-037/578 | RULE-037:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-037/579 | RULE-037:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-038/580 | RULE-038:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-038/581 | RULE-038:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-038/582 | RULE-038:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-039/583 | RULE-039:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-039/584 | RULE-039:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-039/585 | RULE-039:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-040/586 | RULE-040:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-040/587 | RULE-040:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-041/588 | RULE-041:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-041/589 | RULE-041:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-041/590 | RULE-041:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-042/591 | RULE-042:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-042/592 | RULE-042:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-042/593 | RULE-042:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-043/594 | RULE-043:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-043/595 | RULE-043:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-043/596 | RULE-043:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-044/597 | RULE-044:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-044/598 | RULE-044:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-044/599 | RULE-044:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-045/600 | RULE-045:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-045/601 | RULE-045:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-045/602 | RULE-045:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-046/603 | RULE-046:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-046/604 | RULE-046:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-046/605 | RULE-046:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-047/606 | RULE-047:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-047/607 | RULE-047:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-047/608 | RULE-047:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-048/609 | RULE-048:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-048/610 | RULE-048:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-048/611 | RULE-048:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-049/612 | RULE-049:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-049/613 | RULE-049:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-049/614 | RULE-049:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-050/615 | RULE-050:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-050/616 | RULE-050:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-050/617 | RULE-050:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-051/618 | RULE-051:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-051/619 | RULE-051:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-051/620 | RULE-051:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-052/621 | RULE-052:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-052/622 | RULE-052:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-052/623 | RULE-052:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-053/624 | RULE-053:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-053/625 | RULE-053:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-053/626 | RULE-053:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-054/627 | RULE-054:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-054/628 | RULE-054:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-054/629 | RULE-054:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-055/630 | RULE-055:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-055/631 | RULE-055:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-055/632 | RULE-055:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-056/633 | RULE-056:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-056/634 | RULE-056:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-056/635 | RULE-056:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-057/636 | RULE-057:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-057/637 | RULE-057:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-057/638 | RULE-057:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-058/639 | RULE-058:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-058/640 | RULE-058:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-058/641 | RULE-058:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-059/642 | RULE-059:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-059/643 | RULE-059:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-059/644 | RULE-059:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-060/645 | RULE-060:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-060/646 | RULE-060:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-060/647 | RULE-060:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-061/648 | RULE-061:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-061/649 | RULE-061:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-061/650 | RULE-061:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-062/651 | RULE-062:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-062/652 | RULE-062:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-062/653 | RULE-062:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-063/654 | RULE-063:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-063/655 | RULE-063:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-063/656 | RULE-063:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-064/657 | RULE-064:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-064/658 | RULE-064:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-064/659 | RULE-064:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-065/660 | RULE-065:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-065/661 | RULE-065:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-065/662 | RULE-065:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-066/663 | RULE-066:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-066/664 | RULE-066:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-066/665 | RULE-066:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-067/666 | RULE-067:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-067/667 | RULE-067:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-067/668 | RULE-067:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-068/669 | RULE-068:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-068/670 | RULE-068:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-068/671 | RULE-068:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-069/672 | RULE-069:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-069/673 | RULE-069:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-069/674 | RULE-069:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-070/675 | RULE-070:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-070/676 | RULE-070:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-070/677 | RULE-070:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-071/678 | RULE-071:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-071/679 | RULE-071:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-071/680 | RULE-071:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-072/681 | RULE-072:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-072/682 | RULE-072:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-072/683 | RULE-072:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-073/684 | RULE-073:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-073/685 | RULE-073:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-073/686 | RULE-073:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-074/687 | RULE-074:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-074/688 | RULE-074:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-074/689 | RULE-074:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-075/690 | RULE-075:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-075/691 | RULE-075:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-075/692 | RULE-075:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-076/693 | RULE-076:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-076/694 | RULE-076:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-076/695 | RULE-076:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-077/696 | RULE-077:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-077/697 | RULE-077:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-077/698 | RULE-077:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-078/699 | RULE-078:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-078/700 | RULE-078:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-078/701 | RULE-078:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-079/702 | RULE-079:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-079/703 | RULE-079:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-079/704 | RULE-079:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-080/705 | RULE-080:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-080/706 | RULE-080:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-080/707 | RULE-080:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-081/708 | RULE-081:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-081/709 | RULE-081:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-081/710 | RULE-081:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-082/711 | RULE-082:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-082/712 | RULE-082:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-082/713 | RULE-082:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-083/714 | RULE-083:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-083/715 | RULE-083:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-083/716 | RULE-083:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-084/717 | RULE-084:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-084/718 | RULE-084:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-084/719 | RULE-084:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-085/720 | RULE-085:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-085/721 | RULE-085:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-085/722 | RULE-085:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-086/723 | RULE-086:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-086/724 | RULE-086:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-086/725 | RULE-086:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-087/726 | RULE-087:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-087/727 | RULE-087:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-087/728 | RULE-087:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-088/729 | RULE-088:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-088/730 | RULE-088:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-088/731 | RULE-088:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-089/732 | RULE-089:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-089/733 | RULE-089:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-089/734 | RULE-089:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-090/735 | RULE-090:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-090/736 | RULE-090:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-090/737 | RULE-090:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-091/738 | RULE-091:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-091/739 | RULE-091:execute-persisted-action; execute-persisted-action; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-091/740 | RULE-091:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-092/741 | RULE-092:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-092/742 | RULE-092:activate-control; activate-control; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-092/743 | RULE-092:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-093/744 | RULE-093:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-093/745 | RULE-093:activate-control; activate-control; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-093/746 | RULE-093:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-094/747 | RULE-094:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-094/748 | RULE-094:activate-control; activate-control; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-094/749 | RULE-094:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-095/750 | RULE-095:wait-visible; wait-visible; control=#opsRulesRefresh; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-095/751 | RULE-095:activate-control; activate-control; control=#opsRulesRefresh; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-095/752 | RULE-095:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-096/753 | RULE-096:wait-visible; wait-visible; control=#opsRulesRefresh; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-096/754 | RULE-096:activate-control; activate-control; control=#opsRulesRefresh; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-096/755 | RULE-096:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-097/756 | RULE-097:navigate-action-route; navigate-action-route; control=not-specified; executed=true; completion=setup-navigation | pass | 原 status=PASS; case=PASS |
| RULE-097/757 | RULE-097:wait-visible; wait-visible; control=[data-testid="client-live-source-tree"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-097/758 | RULE-097:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-live-source-tree"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-097/759 | RULE-097:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-098/760 | RULE-098:wait-visible; wait-visible; control=#opsRulesValidationList; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-098/761 | RULE-098:assert-visible-read-model; assert-visible-read-model; control=#opsRulesValidationList; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-098/762 | RULE-098:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-100/763 | RULE-100:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-100/764 | RULE-100:activate-control; activate-control; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-100/765 | RULE-100:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-101/766 | RULE-101:wait-visible; wait-visible; control=#opsRulesComposerSave; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-101/767 | RULE-101:activate-control; activate-control; control=#opsRulesComposerSave; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-101/768 | RULE-101:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-102/769 | RULE-102:wait-visible; wait-visible; control=#opsEventRuleTypeSelect; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-102/770 | RULE-102:select-control; select-control; control=#opsEventRuleTypeSelect; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-102/771 | RULE-102:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-103/772 | RULE-103:wait-visible; wait-visible; control=#opsRulesRefresh; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-103/773 | RULE-103:activate-control; activate-control; control=#opsRulesRefresh; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-103/774 | RULE-103:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-104/775 | RULE-104:navigate-action-route; navigate-action-route; control=not-specified; executed=true; completion=setup-navigation | pass | 原 status=PASS; case=PASS |
| RULE-104/776 | RULE-104:wait-visible; wait-visible; control=[data-approval-gated-rule-draft-route]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-104/777 | RULE-104:activate-control; activate-control; control=[data-approval-gated-rule-draft-route]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-104/778 | RULE-104:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-111/779 | RULE-111:wait-visible; wait-visible; control=[data-vlm-rule-draft-index]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| RULE-111/780 | RULE-111:activate-control; activate-control; control=[data-vlm-rule-draft-index]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| RULE-111/781 | RULE-111:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-001/782 | EVT-001:wait-visible; wait-visible; control=#dashRuntimeTrendSparkline; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-001/783 | EVT-001:assert-visible-read-model; assert-visible-read-model; control=#dashRuntimeTrendSparkline; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-001/784 | EVT-001:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-003/785 | EVT-003:wait-visible; wait-visible; control=#dashRootCauseList; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-003/786 | EVT-003:assert-visible-read-model; assert-visible-read-model; control=#dashRootCauseList; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-003/787 | EVT-003:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-004/788 | EVT-004:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-004/789 | EVT-004:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-007/790 | EVT-007:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-007/791 | EVT-007:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-016/792 | EVT-016:wait-visible; wait-visible; control=#opsV320ResolutionTimeline; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-016/793 | EVT-016:assert-visible-read-model; assert-visible-read-model; control=#opsV320ResolutionTimeline; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-016/794 | EVT-016:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-017/795 | EVT-017:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-017/796 | EVT-017:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-018/797 | EVT-018:wait-visible; wait-visible; control=#alertDeliveryTest; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-018/798 | EVT-018:execute-persisted-action; execute-persisted-action; control=#alertDeliveryTest; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-018/799 | EVT-018:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-019/800 | EVT-019:wait-visible; wait-visible; control=[data-testid="ops-vlm-event-review-card"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-019/801 | EVT-019:assert-visible-read-model; assert-visible-read-model; control=[data-testid="ops-vlm-event-review-card"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-019/802 | EVT-019:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-020/803 | EVT-020:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-020/804 | EVT-020:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-021/805 | EVT-021:wait-visible; wait-visible; control=[data-event-review-save]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-021/806 | EVT-021:execute-persisted-action; execute-persisted-action; control=[data-event-review-save]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-021/807 | EVT-021:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-022/808 | EVT-022:wait-visible; wait-visible; control=#event-review-audit-list; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-022/809 | EVT-022:assert-visible-read-model; assert-visible-read-model; control=#event-review-audit-list; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-022/810 | EVT-022:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-023/811 | EVT-023:wait-visible; wait-visible; control=#dashCommandWorkspaceLedgerList; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-023/812 | EVT-023:assert-visible-read-model; assert-visible-read-model; control=#dashCommandWorkspaceLedgerList; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-023/813 | EVT-023:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-024/814 | EVT-024:wait-visible; wait-visible; control=#dashRuntimeTrendSparkline; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-024/815 | EVT-024:assert-visible-read-model; assert-visible-read-model; control=#dashRuntimeTrendSparkline; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-024/816 | EVT-024:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-025/817 | EVT-025:wait-visible; wait-visible; control=#dashRuntimeTrendSparkline; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-025/818 | EVT-025:assert-visible-read-model; assert-visible-read-model; control=#dashRuntimeTrendSparkline; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-025/819 | EVT-025:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-026/820 | EVT-026:wait-visible; wait-visible; control=#dashRootCauseList; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-026/821 | EVT-026:assert-visible-read-model; assert-visible-read-model; control=#dashRootCauseList; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-026/822 | EVT-026:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-028/823 | EVT-028:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-028/824 | EVT-028:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-030/825 | EVT-030:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-030/826 | EVT-030:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-031/827 | EVT-031:wait-visible; wait-visible; control=[data-testid="ops-vlm-event-review-card"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-031/828 | EVT-031:assert-visible-read-model; assert-visible-read-model; control=[data-testid="ops-vlm-event-review-card"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-031/829 | EVT-031:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-036/830 | EVT-036:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-036/831 | EVT-036:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-037/832 | EVT-037:wait-visible; wait-visible; control=[data-event-review-save]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-037/833 | EVT-037:execute-persisted-action; execute-persisted-action; control=[data-event-review-save]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-037/834 | EVT-037:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-038/835 | EVT-038:wait-visible; wait-visible; control=#alertDeliveryDryRun; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-038/836 | EVT-038:execute-persisted-action; execute-persisted-action; control=#alertDeliveryDryRun; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-038/837 | EVT-038:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-041/838 | EVT-041:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-041/839 | EVT-041:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-042/840 | EVT-042:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-042/841 | EVT-042:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-043/842 | EVT-043:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-043/843 | EVT-043:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-044/844 | EVT-044:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-044/845 | EVT-044:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-046/846 | EVT-046:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-046/847 | EVT-046:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-047/848 | EVT-047:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-047/849 | EVT-047:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-048/850 | EVT-048:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-048/851 | EVT-048:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-049/852 | EVT-049:wait-visible; wait-visible; control=#eventRecordsEvidenceSelect; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-049/853 | EVT-049:select-control; select-control; control=#eventRecordsEvidenceSelect; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-049/854 | EVT-049:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-050/855 | EVT-050:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-050/856 | EVT-050:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-051/857 | EVT-051:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-051/858 | EVT-051:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-052/859 | EVT-052:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-052/860 | EVT-052:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-053/861 | EVT-053:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-053/862 | EVT-053:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-054/863 | EVT-054:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-054/864 | EVT-054:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-055/865 | EVT-055:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-055/866 | EVT-055:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-056/867 | EVT-056:wait-visible; wait-visible; control=#opsApprovalGatedRuleDraftReadinessRows; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-056/868 | EVT-056:assert-visible-read-model; assert-visible-read-model; control=#opsApprovalGatedRuleDraftReadinessRows; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-056/869 | EVT-056:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-057/870 | EVT-057:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-057/871 | EVT-057:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-058/872 | EVT-058:wait-visible; wait-visible; control=#dashRuntimeTrendSparkline; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=FAIL |
| EVT-058/873 | EVT-058:assert-visible-read-model; assert-visible-read-model; control=#dashRuntimeTrendSparkline; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=FAIL |
| EVT-058/874 | EVT-058:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=FAIL |
| EVT-061/875 | EVT-061:wait-visible; wait-visible; control=[data-event-review-save]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-061/876 | EVT-061:execute-persisted-action; execute-persisted-action; control=[data-event-review-save]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-061/877 | EVT-061:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-064/878 | EVT-064:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-064/879 | EVT-064:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-065/880 | EVT-065:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-065/881 | EVT-065:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-066/882 | EVT-066:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-066/883 | EVT-066:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-067/884 | EVT-067:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-067/885 | EVT-067:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-068/886 | EVT-068:wait-visible; wait-visible; control=[data-event-review-save]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| EVT-068/887 | EVT-068:execute-persisted-action; execute-persisted-action; control=[data-event-review-save]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-068/888 | EVT-068:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-069/889 | EVT-069:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-069/890 | EVT-069:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-070/891 | EVT-070:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-070/892 | EVT-070:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-071/893 | EVT-071:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-071/894 | EVT-071:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-072/895 | EVT-072:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-072/896 | EVT-072:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-075/897 | EVT-075:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| EVT-075/898 | EVT-075:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-001/899 | CLIENT-001:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-001/900 | CLIENT-001:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-002/901 | CLIENT-002:wait-visible; wait-visible; control=[data-tile="0"] [data-action="toggle-playback"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| CLIENT-002/902 | CLIENT-002:activate-control; activate-control; control=[data-tile="0"] [data-action="toggle-playback"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-002/903 | CLIENT-002:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-005/904 | CLIENT-005:wait-visible; wait-visible; control=#liveAllStop; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| CLIENT-005/905 | CLIENT-005:activate-control; activate-control; control=#liveAllStop; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-005/906 | CLIENT-005:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-006/907 | CLIENT-006:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-006/908 | CLIENT-006:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-007/909 | CLIENT-007:wait-visible; wait-visible; control=.client-viewer-events; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| CLIENT-007/910 | CLIENT-007:assert-visible-read-model; assert-visible-read-model; control=.client-viewer-events; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-007/911 | CLIENT-007:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-009/912 | CLIENT-009:wait-visible; wait-visible; control=#liveSaveLayoutPreference; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| CLIENT-009/913 | CLIENT-009:execute-persisted-action; execute-persisted-action; control=#liveSaveLayoutPreference; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-009/914 | CLIENT-009:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-010/915 | CLIENT-010:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-010/916 | CLIENT-010:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-011/917 | CLIENT-011:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-011/918 | CLIENT-011:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-012/919 | CLIENT-012:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-012/920 | CLIENT-012:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-013/921 | CLIENT-013:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-013/922 | CLIENT-013:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-014/923 | CLIENT-014:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-014/924 | CLIENT-014:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-015/925 | CLIENT-015:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-015/926 | CLIENT-015:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-016/927 | CLIENT-016:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-016/928 | CLIENT-016:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-017/929 | CLIENT-017:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-017/930 | CLIENT-017:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-018/931 | CLIENT-018:wait-visible; wait-visible; control=.client-preview-redaction-strip; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| CLIENT-018/932 | CLIENT-018:assert-visible-read-model; assert-visible-read-model; control=.client-preview-redaction-strip; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-018/933 | CLIENT-018:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-019/934 | CLIENT-019:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-019/935 | CLIENT-019:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-020/936 | CLIENT-020:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-020/937 | CLIENT-020:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-021/938 | CLIENT-021:wait-visible; wait-visible; control=[data-tile="0"] [data-mode-action="va-overlay"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| CLIENT-021/939 | CLIENT-021:activate-control; activate-control; control=[data-tile="0"] [data-mode-action="va-overlay"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-021/940 | CLIENT-021:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-022/941 | CLIENT-022:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-022/942 | CLIENT-022:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-023/943 | CLIENT-023:wait-visible; wait-visible; control=[data-testid="client-safe-incident-digest"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| CLIENT-023/944 | CLIENT-023:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-safe-incident-digest"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-023/945 | CLIENT-023:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-024/946 | CLIENT-024:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-024/947 | CLIENT-024:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-025/948 | CLIENT-025:wait-visible; wait-visible; control=[data-testid="client-safe-event-digest"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| CLIENT-025/949 | CLIENT-025:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-safe-event-digest"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-025/950 | CLIENT-025:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-027/951 | CLIENT-027:wait-visible; wait-visible; control=[data-testid="client-safe-resolution-digest"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| CLIENT-027/952 | CLIENT-027:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-safe-resolution-digest"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-027/953 | CLIENT-027:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-028/954 | CLIENT-028:wait-visible; wait-visible; control=[data-testid="client-safe-source-status-digest"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| CLIENT-028/955 | CLIENT-028:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-safe-source-status-digest"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-028/956 | CLIENT-028:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-029/957 | CLIENT-029:wait-visible; wait-visible; control=[data-testid="client-safe-maintenance-digest"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| CLIENT-029/958 | CLIENT-029:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-safe-maintenance-digest"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-029/959 | CLIENT-029:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-031/960 | CLIENT-031:wait-visible; wait-visible; control=[data-testid="client-impact-forecast"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| CLIENT-031/961 | CLIENT-031:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-impact-forecast"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-031/962 | CLIENT-031:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-032/963 | CLIENT-032:wait-visible; wait-visible; control=[data-testid="client-operations-notice"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| CLIENT-032/964 | CLIENT-032:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-operations-notice"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-032/965 | CLIENT-032:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-040/966 | CLIENT-040:wait-visible; wait-visible; control=[data-testid="client-action-notice-preview"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| CLIENT-040/967 | CLIENT-040:assert-visible-read-model; assert-visible-read-model; control=[data-testid="client-action-notice-preview"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-040/968 | CLIENT-040:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-041/969 | CLIENT-041:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-041/970 | CLIENT-041:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-042/971 | CLIENT-042:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| CLIENT-042/972 | CLIENT-042:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| MEDIA-016/973 | MEDIA-016:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| MEDIA-016/974 | MEDIA-016:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| MEDIA-017/975 | MEDIA-017:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| MEDIA-017/976 | MEDIA-017:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-015/977 | SAFE-015:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-015/978 | SAFE-015:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-016/979 | SAFE-016:navigate-negative; navigate-negative; control=not-specified; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SAFE-017/980 | SAFE-017:navigate-negative; navigate-negative; control=not-specified; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SAFE-018/981 | SAFE-018:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-018/982 | SAFE-018:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-019/983 | SAFE-019:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-019/984 | SAFE-019:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-020/985 | SAFE-020:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-020/986 | SAFE-020:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-021/987 | SAFE-021:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-021/988 | SAFE-021:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-024/989 | SAFE-024:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-024/990 | SAFE-024:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-028/991 | SAFE-028:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-028/992 | SAFE-028:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-031/993 | SAFE-031:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-031/994 | SAFE-031:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-033/995 | SAFE-033:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-033/996 | SAFE-033:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-038/997 | SAFE-038:wait-visible; wait-visible; control=[data-vlm-rule-draft-index]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SAFE-038/998 | SAFE-038:activate-control; activate-control; control=[data-vlm-rule-draft-index]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-038/999 | SAFE-038:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-041/1000 | SAFE-041:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-041/1001 | SAFE-041:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-042/1002 | SAFE-042:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-042/1003 | SAFE-042:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-045/1004 | SAFE-045:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-045/1005 | SAFE-045:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-046/1006 | SAFE-046:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-046/1007 | SAFE-046:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-047/1008 | SAFE-047:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-047/1009 | SAFE-047:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-048/1010 | SAFE-048:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-048/1011 | SAFE-048:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-049/1012 | SAFE-049:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-049/1013 | SAFE-049:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-050/1014 | SAFE-050:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-050/1015 | SAFE-050:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-052/1016 | SAFE-052:wait-visible; wait-visible; control=#opsIncidentSearchInput; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SAFE-052/1017 | SAFE-052:fill-control; fill-control; control=#opsIncidentSearchInput; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-052/1018 | SAFE-052:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-053/1019 | SAFE-053:wait-visible; wait-visible; control=[data-incident-rule-draft-route]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SAFE-053/1020 | SAFE-053:assert-visible-read-model; assert-visible-read-model; control=[data-incident-rule-draft-route]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-053/1021 | SAFE-053:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-054/1022 | SAFE-054:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-054/1023 | SAFE-054:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-055/1024 | SAFE-055:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-055/1025 | SAFE-055:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-056/1026 | SAFE-056:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-056/1027 | SAFE-056:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-058/1028 | SAFE-058:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-058/1029 | SAFE-058:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-059/1030 | SAFE-059:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-059/1031 | SAFE-059:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-060/1032 | SAFE-060:wait-visible; wait-visible; control=[data-testid="ops-operational-action-pack"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SAFE-060/1033 | SAFE-060:assert-visible-read-model; assert-visible-read-model; control=[data-testid="ops-operational-action-pack"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-060/1034 | SAFE-060:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-061/1035 | SAFE-061:wait-visible; wait-visible; control=[data-testid="ops-rule-what-if-preview"]; executed=not-recorded; completion=not-recorded | pass | 原 status=PASS; case=PASS |
| SAFE-061/1036 | SAFE-061:assert-visible-read-model; assert-visible-read-model; control=[data-testid="ops-rule-what-if-preview"]; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-061/1037 | SAFE-061:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-062/1038 | SAFE-062:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-062/1039 | SAFE-062:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-065/1040 | SAFE-065:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-065/1041 | SAFE-065:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-066/1042 | SAFE-066:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-066/1043 | SAFE-066:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-067/1044 | SAFE-067:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-067/1045 | SAFE-067:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-068/1046 | SAFE-068:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-068/1047 | SAFE-068:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-069/1048 | SAFE-069:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-069/1049 | SAFE-069:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-098/1050 | SAFE-098:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-098/1051 | SAFE-098:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-104/1052 | SAFE-104:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-104/1053 | SAFE-104:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-105/1054 | SAFE-105:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-105/1055 | SAFE-105:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-106/1056 | SAFE-106:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-106/1057 | SAFE-106:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-107/1058 | SAFE-107:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-107/1059 | SAFE-107:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-108/1060 | SAFE-108:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-108/1061 | SAFE-108:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-109/1062 | SAFE-109:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-109/1063 | SAFE-109:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-110/1064 | SAFE-110:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-110/1065 | SAFE-110:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-111/1066 | SAFE-111:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-111/1067 | SAFE-111:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-117/1068 | SAFE-117:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-117/1069 | SAFE-117:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-118/1070 | SAFE-118:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-118/1071 | SAFE-118:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-119/1072 | SAFE-119:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-119/1073 | SAFE-119:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-121/1074 | SAFE-121:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-121/1075 | SAFE-121:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-122/1076 | SAFE-122:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-122/1077 | SAFE-122:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-129/1078 | SAFE-129:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-129/1079 | SAFE-129:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-130/1080 | SAFE-130:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-130/1081 | SAFE-130:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-131/1082 | SAFE-131:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-131/1083 | SAFE-131:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-132/1084 | SAFE-132:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-132/1085 | SAFE-132:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-138/1086 | SAFE-138:assert-product-boundary; assert-product-boundary; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-138/1087 | SAFE-138:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-140/1088 | SAFE-140:assert-product-state; assert-product-state; control=not-specified; executed=true; completion=awaiting-independent-readback | pass | 原 status=PASS; case=PASS |
| SAFE-140/1089 | SAFE-140:verify-independent-readback; verify-independent-readback; control=not-specified; executed=not-recorded; completion=independent-readback | pass | 原 status=PASS; case=PASS |

### 61366 최소 digest와 보존/정리 경계

- token end7943312, consumed74921(7943312−7868391): 메인 제공 shared goal 관찰점 차이이며 전체 종료 후 기록 시점까지 포함한다. 실행 전용 토큰 비용으로 해석하지 않는다. 정확한 launcher exit 시각은 미계측이며 canonical 종료와 최종 provenance 시각만 확인됐다.
- 메인 승격 read-only ps/lsof: PID72971 및 TCP57492/57493 출력 없음·exit1(nomatches). runtime `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-xDjXTc`는 1582578bytes 정리 후 absent=true. UI output root는 메인 측정1852files/180782113bytes이며 메인 이관 검토 후1852파일/180782113bytes를 삭제했고 absent=true 확인했다.
- summary.json: 60893bytes, SHA256 0cdcf0ae87550b756a5ab1ddeab2f40f88b03e69f1d0d480a2264d849cda7bf2
- runs/v390-test-acceptance-20260911092202-72829/ui-exact-424/summary.json: 502926bytes, SHA256 a2a2f37e02821d86b936aa40ba701e16eac1ec16f60a20a98369f04163b0d921
- 원본 UI output/run root는 메인이 전수 해시·행 대조 후 삭제했다. run-owned UI 서버 정리/포트 및 rootcleanup은 summary상 PASS; 저장소 임시 output 자체의 최종삭제와 구분한다.
- 원본 URL/query/header/body/auth secret/raw debug는 이 절에 포함하지 않았다. method/path, opaque ID, 상태, 시간, hash 및 control selector만 이관했다.
- 코드/설정 수정, 테스트·서버 재실행, 커밋·푸시 없음.



## 재검증 58281 — 개별424 통과, 정리 실패

명령 ./test_ui.sh; source1b703487; 시작1789115563032 종료1789117075909, elapsed1512877ms, exit1. Canonical424pass/0fail/0notRun. Policy v4 qualification stage PASS이나 최종 cleanup FAIL로 ineligible/uiFulltestPass=false. 전체432 UI 또는 S09 완료 증거가 아니다. UI-004와 EVT-058(131request/131response)은 이번 실행에서 통과했으며 이전 실패 이력은 유지한다.

정리 실패 원인: SAFE-138과 finalizer visual-UI-014-390-light의 독립 촬영 PNG가 동일 SHA256(80a8d6e05938b715683fccf67b84facbb1ee4d43febcbf9340d0b4749c69a57c), 각57027bytes다. 동일 operator /ops/events 390×844 light 화면을 별도로 촬영했다. runner의 case별 dedup은 cases 하위만 확인하고 finalizer 분기는 전체 dedup을 통과하지 않아 sibling 간 중복이 남았다. cleanup은 runDir 전체 중복0을 요구한다. 기준 완화·촬영 생략·제품 변경 없이 원인을 기록한다.

메인 첫 PNG 시각 확인 완료. 서버 PID28701 및 TCP64853/64854는 ps/lsof 결과 없음으로 종료 확인했고 소유 runtime1613776bytes는 runner 삭제·부재 확인. 아래는 원본424개 summary SHA와 실제 action 행을 대조해 보존한 기록이다. 30분·120분과 녹화추가8개ID31action은 이번 범위 제외로 미실행. token start/end/consumed: 실행 시작 당시 goal blocked로 유효 전체구간값이 없어 미집계, elapsed source=launcher exit.json.

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| UI-001 | / → /login; anonymous; 390×844 light; exit0 | pass | SHA256 4786c69f3f682caa01aaff68eca531aed4a6e47116de02c002f76e7ca9bd5847 |
| UI-001 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-001 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-002 | /setup → /setup; anonymous; 390×844 light; exit0 | pass | SHA256 a50197876a7f2533c864bd976e1935473d9c034caee35903ef2b69be8419f61b |
| UI-002 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-002 action 2 | submit-form; control [data-testid="auth-setup-form"] button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-002 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-003 | /login → /login; anonymous; 390×844 light; exit0 | pass | SHA256 93845517e5b548d3100b79a41df268f631359cdccba573a034e63e9f4f76b555 |
| UI-003 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-003 action 2 | submit-form; control [data-testid="auth-login-form"] button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-003 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-004 | /password/change → /password/change; operator; 390×844 light; exit0 | pass | SHA256 78fcdc3813124c385305d1a35d2e461ef14a976ef7875ccff0494ecf91897276 |
| UI-004 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-004 action 2 | submit-form; control [data-testid="auth-password-change-form"] button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-004 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-005 | /logout → /ops/home; operator; 390×844 light; exit0 | pass | SHA256 6cf0b085dddedc7c7c0dcbfd41dbce81745633406b552b25a63951dd86ae6335 |
| UI-005 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-005 action 2 | submit-form; control form[action="/logout"] button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-005 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-007 | /invite/setup → /invite/setup; anonymous; 390×844 light; exit0 | pass | SHA256 dc8549557d33b54502dbe15d515f7eb5d7cb59f0a46e5cabf1ec1795ab191f4b |
| UI-007 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-007 action 2 | submit-form; control [data-testid="auth-invite-setup-form"] button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-007 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-008 | /client/request-access → /client/request-access; anonymous; 390×844 light; exit0 | pass | SHA256 1969547ffae6dc8021402548d3c77abb15d8ccc7ce6bada69bca1012965b5916 |
| UI-008 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-008 action 2 | submit-form; control #request-form button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-008 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-009 | /ops/home → /ops/home; operator; 390×844 light; exit0 | pass | SHA256 9d1ea4e68441818cd6d019e156b6c5af095292483d35d21a94b2e09bcfd4d6fe |
| UI-009 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-009 action 2 | assert-visible-read-model; control [data-testid="ops-home-page"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-009 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-010 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 c67a4a9262947829a79c2f307709e622fdfce1f0c5b09586f5485fc1a60fe499 |
| UI-010 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-010 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-011 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 e0d74923a218f9d5d0b566db86e88a678bb542c10a10247be6cd89ebd7df3949 |
| UI-011 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-011 action 2 | assert-visible-read-model; control [data-testid="source-reliability-search-metrics"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-011 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-012 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 abdab8ed73c8b7795bdfc683349cd7a470c3a675d6236fc7485163a3a150d627 |
| UI-012 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-012 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-013 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 2b1222f1ca8381747828a34d6fe60a3215de1acb66cfd0def8eebe63052db6e7 |
| UI-013 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-013 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-014 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 766f4a86fd91d790aa51140cebf0dbbbd024d698065c0a1662b8743535c0501a |
| UI-014 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-014 action 2 | fill-control; control #opsIncidentSearchInput; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-014 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-015 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 0405cea75e6275847a1e9a34c3448a6a34c5a21dd1325e8af59f1ee360ce0ab9 |
| UI-015 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-015 action 2 | assert-visible-read-model; control [data-testid="client-live-action-reduction"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-015 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-016 | /client/dashboard → /client/dashboard; viewer; 390×844 light; exit0 | pass | SHA256 a0705474936d8e4c6b58a3bfe28c4d2ef9479497b0382911c1ea4c0d7bcd7602 |
| UI-016 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-016 action 2 | assert-visible-read-model; control [data-testid="client-dashboard-shell"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-016 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-017 | /client/events → /client/events; viewer; 390×844 light; exit0 | pass | SHA256 849fb6348d96fe5652b4f5a518ce74a458e5c3b8101553261f622e6eab0d63d3 |
| UI-017 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-017 action 2 | assert-visible-read-model; control .client-viewer-events; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-017 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-018 | /lab → /lab; operator; 390×844 light; exit0 | pass | SHA256 6c195cf1cbb885665ad4d9ed290ea36292dfa75a03cc23746ad160b7f872b881 |
| UI-018 action 1 | navigate-negative; control 없음; completion primary-action | pass | 실제 action status PASS |
| UI-019 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 30c55910d9eaf28d3b4dbfb4a2e2ccb727df9134023c351509a60164de0027cd |
| UI-019 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-019 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-020 | /ops/dashboard → /ops/dashboard; operator; 1440×900 light; exit0 | pass | SHA256 f8c81e7726d60040594d7e1879f5c5cea68fd13eb46aca71b5a8c551af95325b |
| UI-020 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-020 action 2 | assert-visible-read-model; control .ops-workspace-diagnostic-grid; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-020 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-021 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 dc4c7e5d26dfa6df2488ae8980e8129a3da168c37b972e6aaec3e292861ed733 |
| UI-021 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-021 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-022 | /ops/vlm → /ops/vlm; operator; 390×844 light; exit0 | pass | SHA256 ccfd1dcd38b485b659a9cb4a8dfc8ee75c2a5047514c7252b2102d331037347b |
| UI-022 action 1 | assert-disabled-control; control #opsVlmExternalTransferWarningAck; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-022 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-023 | /ops/vlm → /ops/vlm; operator; 390×844 light; exit0 | pass | SHA256 d3b766486d72276eb5aa2e93f0ea133abf242b0a99f07b4bc079bd465c4e2118 |
| UI-023 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-023 action 2 | execute-persisted-action; control #opsVlmSaveProfile; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-023 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-024 | /ops/vlm → /ops/vlm; operator; 390×844 light; exit0 | pass | SHA256 e35a0170f5295ab6443f1d0b69bedf4bdf58b1856d1357a0041be4e04ea420b1 |
| UI-024 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-024 action 2 | assert-visible-read-model; control #opsVlmPrivacyGuardList; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-024 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-025 | /ops/vlm → /ops/vlm; operator; 390×844 light; exit0 | pass | SHA256 924bddd167dfbc37739e12bba4747bc37f3ff992f1328051fb57bc63a59ca1ec |
| UI-025 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-025 action 2 | fill-control; control #opsVlmDisabledReason; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-025 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-026 | /ops/vlm → /ops/vlm; operator; 390×844 light; exit0 | pass | SHA256 64de309283a736de772b81b2e0a5e7c5ab02e114bae3658a7598883ad8227340 |
| UI-026 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-026 action 2 | activate-control; control [data-vlm-option-id="local-qwen3-vl-4b"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-026 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-027 | /ops/vlm → /ops/vlm; operator; 390×844 light; exit0 | pass | SHA256 6d01d5f868b9a9055d5d7c1583f58e70dcd89b02f3b038a6276fa9be604f426b |
| UI-027 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-027 action 2 | assert-visible-read-model; control #opsVlmRuntimeStatusList; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-027 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-028 | /ops/vlm → /ops/vlm; operator; 390×844 light; exit0 | pass | SHA256 4b6150cba2d85191b179f9018984acce16772501fa59ce2c5ae55065f9f2c164 |
| UI-028 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-028 action 2 | toggle-checkbox; control #opsVlmProfileEnabled; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-028 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-029 | /ops/vlm → /ops/vlm; operator; 390×844 light; exit0 | pass | SHA256 f02926fbe4da1c6a6a759d3333db03eebd6a0662f7ebfdd7ad1d0942815ef691 |
| UI-029 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-029 action 2 | execute-persisted-action; control [data-delete-vlm-profile="ui-029-review4-fixture"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-029 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-030 | /ops/vlm → /ops/vlm; operator; 390×844 light; exit0 | pass | SHA256 6928a7c5276484b29d45ec17cee2dfef1dc569840686dd779171b4f215c9726c |
| UI-030 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-030 action 2 | assert-visible-read-model; control #opsVlmEvaluationRows; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-030 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-031 | /ops/vlm → /ops/vlm; operator; 390×844 light; exit0 | pass | SHA256 98903f86e30c1a03b3c903b8e71e7173d56d96823a704446db406ff54d9c34e1 |
| UI-031 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-031 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-032 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 0d26bddb1f68e949199e36bace0c03ab91bda8f176b6dbfdec9420d53b50be65 |
| UI-032 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-032 action 2 | fill-control; control #opsIncidentSearchInput; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-032 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-033 | /ops/vlm → /ops/vlm; operator; 390×844 light; exit0 | pass | SHA256 cdf57a15afd7791bfc536493a97c9c24f7ec185f97dfb1fbb44dd142a91e08cb |
| UI-033 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-033 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-034 | /ops/vlm → /ops/vlm; operator; 390×844 light; exit0 | pass | SHA256 1c725414bec2d817c13bcd67be8178276408d340b3c1c87f0eadabd2e73951fd |
| UI-034 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-034 action 2 | assert-visible-read-model; control #opsVlmEvaluationRows; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-034 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-035 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 2eafb2bfc699248929318948b401aef5eef34b442587be67adabd485f0114d1f |
| UI-035 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-035 action 2 | fill-control; control #opsIncidentSearchInput; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-035 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-036 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 e06b7bd7a9104a1cc7807bec9c3b17438e81214959db26d72d6fbc31a48f4cf6 |
| UI-036 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-036 action 2 | activate-control; control [data-vlm-rule-draft-index]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-036 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-037 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 39c6e9d05662fa29211a76cb2460280264e4a4b06b4f44539d6c1e0603a1b181 |
| UI-037 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-037 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-038 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 a0ba9fe00d35962046056e600a801187a2991fd64b8c02da6c141cb5d1e10b90 |
| UI-038 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-038 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-039 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 e8589d1a6892781dcdded7ee1ac40ee51ba22c939a3a1f4ad3d692d16d9cde2b |
| UI-039 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-039 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-040 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 bd3b2514df738a2213c11e0f6ce13e43f7d27c206623c67d4be7a24c9b8b1fcf |
| UI-040 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-040 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-041 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 3b77dbd2da178bf3281e67888f4c20eab4f9cf8e99d976ae0c66949e26e2f3ed |
| UI-041 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-041 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-042 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 216e932bf419c8b374ce746152e1593815e091d2adde1c50c3a0b6ce22c2c630 |
| UI-042 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-042 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-043 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 d64e166015b9b55287cd0cf76e524ceebfb0dc37cf4e63fdaf673ac0976f69ce |
| UI-043 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-043 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-044 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 04f9c6440340bb7253a4e7a42ca5ca91cce37402674328a329a3d2c3ad3e288c |
| UI-044 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-044 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-045 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 3542ce1619753fd129d29033ee90dbfcb8ba658a7b329ede4c2318111cabd719 |
| UI-045 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-045 action 2 | fill-control; control #opsIncidentSearchInput; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-045 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-046 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 d11b61e05dc85fe2b40923f363e3e7910a235c076fe8836e17ecac4531239090 |
| UI-046 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-046 action 2 | activate-control; control [data-incident-rule-draft-route]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-046 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-047 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 fb8742307ec6bd665a1b89c6e404201596a27e21438dda497ca04be228d72db4 |
| UI-047 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-047 action 2 | assert-visible-read-model; control [data-testid="source-backup-recovery-handoff"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-047 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-048 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 107cc3dcc204587ac1bd60d4d428ae26c0ea4a7cb73b5404d6edad317f3b280d |
| UI-048 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-048 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-049 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 7b4d509333765f5fa896eb5ba92c5b47230549541fd82e0076bb705e8a23bbb3 |
| UI-049 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-049 action 2 | select-control; control #opsScenarioBuilderType; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-049 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-050 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 a616f8a97d21e0e6f91420a9181bc6c258442d066bd1c62184370d395b9ca0c7 |
| UI-050 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-050 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-051 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 7dd1d9d53a01bf9e2ef725586d9ba2f2f21c1334f3ee84a66bf9006c91ce984b |
| UI-051 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-051 action 2 | assert-visible-read-model; control #opsIncidentTriageBoardRows; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-051 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-052 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 3f2366895d37eea793734ec41141f6452c300ece970ff72613a2ee1e5d8a2321 |
| UI-052 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-052 action 2 | assert-visible-read-model; control [data-testid="ops-operational-action-pack"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-052 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-053 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 cabc1fb6eea7028841254922cad7f5d4449425311ff1a1c5cd7d43780a09bf91 |
| UI-053 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-053 action 2 | assert-visible-read-model; control [data-testid="ops-rule-what-if-preview"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-053 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-054 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 69e4b0fcb07efd1e7555d2f1bd61c0d8f8bc159ef4eb8b5d01b83d0f64c6e6f9 |
| UI-054 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-054 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-055 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 ecaa40c50dddfacfc4730d2c041bd4a36c17ff307dd2860fd140da18647b80de |
| UI-055 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-055 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-056 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 18a3ab1beec1bc6393c544e8f29e73aa245b894be4b790703fec3bc21225e3ae |
| UI-056 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-056 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-057 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 44c51b271996606cce6468c09f575163e2c7ed55ce433563cd080e6931d5ff1b |
| UI-057 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-057 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-058 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 3e9b9ec42a17e5ed2e232e3629653428c477881e160393c764c54ebf45a74d36 |
| UI-058 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-058 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-059 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 f0b0387fd3413dce8dd7e6d08f57e1b8f6f061d657f73e25368691e673f76ccc |
| UI-059 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-059 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-060 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 57711e364302cbcf7da35ef47e8f3a21765eb24f9883f92e2efc24d5e1d5b17b |
| UI-060 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-060 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-061 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 e7c153892d560ee3c5dec0a0465abc329b994ccbc6a14319b470762a31ebe59e |
| UI-061 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-061 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-062 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 79dc25ffccd584cd032338629085d4da511a4d48b098fbd7bc2e9f8be53252ca |
| UI-062 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-062 action 2 | assert-visible-read-model; control #opsV320ResolutionTimeline; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-062 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-063 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 7fddaeb362ea6835e7526e39cf7bb91b2d0f8742246fea5e14a4ad121ebc99e1 |
| UI-063 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-063 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-064 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 24692fedeafd3da4595d9b95927cc2787cdbbaeb80a0b1f3f3cb9f9cc0e2ed13 |
| UI-064 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-064 action 2 | assert-visible-read-model; control #v320SourceReliabilityGrid; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-064 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-065 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 1dedb8402c0473e2ed741789461d32313ac93e6d97555abca9820ed9adc0cd23 |
| UI-065 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-065 action 2 | assert-visible-read-model; control #v320AiReviewQualityGrid; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-065 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-066 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 4c93e73d876acecb2af2146dbdeb4aeaa8ec6a62b314bd6bda8cb22d463e3ceb |
| UI-066 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-066 action 2 | assert-visible-read-model; control #v320OperatorResolutionFlowGrid; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-066 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-067 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 effa069496185717db861ff191de8e1a7d0e88975657be8307ce2b46db54f537 |
| UI-067 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-067 action 2 | assert-visible-read-model; control #v320ActionReadinessChecklistGrid; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-067 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-068 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 0727f5b1d96007cf607a37c7882d99e3d15682100600c63793252fe2956998e8 |
| UI-068 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-068 action 2 | assert-visible-read-model; control [data-testid="client-safe-resolution-digest"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-068 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-069 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 252755ad34fc2893ed2fd4b68eba307ca8ba30f1b8477505d8d8cdbca669297d |
| UI-069 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-069 action 2 | assert-visible-read-model; control #v320ResolutionSearchMetricsGrid; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-069 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-070 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 debd09c645d711a511628d645791fc6d2a0512fe7a2e3985f8b805cf03f3c5f2 |
| UI-070 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-070 action 2 | assert-visible-read-model; control #v330IncidentSourceCorrelationGrid; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-070 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-071 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 2be3aa1511a23c31bc85ec2704a803f375bfbbc5f2fad75dc007b2c39b4b1c11 |
| UI-071 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-071 action 2 | assert-visible-read-model; control #v330OperatorRecheckRecoveryQueueGrid; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-071 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-072 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 c0b2ad144482dcb7581456c8951a1cd58d014ab7c9c6328badb2d2dbf9cc1e68 |
| UI-072 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-072 action 2 | assert-visible-read-model; control [data-testid="client-safe-source-status-digest"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-072 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-073 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 c55bc3536a74c971be4ad30a1e107c297a140899b62319e513e6a93bd8e34cd7 |
| UI-073 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-073 action 2 | assert-visible-read-model; control [data-testid="source-reliability-search-metrics"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-073 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-074 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 bded5ed55426027078bf12f151a781517f40782394fdf8cd908e702971167654 |
| UI-074 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-074 action 2 | assert-visible-read-model; control [data-testid="source-backup-recovery-handoff"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-074 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-075 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 e28ac8c5465307e5b0524d8cf459346fae4d092008119343dc43365426f12fec |
| UI-075 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-075 action 2 | assert-visible-read-model; control [data-testid="ops-continuity-drill-workspace"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-075 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-076 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 09545103851f08c4c918042057cc11f328f179a4f163a1ff9d87ee03386658d0 |
| UI-076 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-076 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-077 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 864f7d0c25442bab050fa26139c27710ecc6ac56dcd7de671d09de3d720bce6c |
| UI-077 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-077 action 2 | assert-visible-read-model; control [data-testid="client-safe-maintenance-digest"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-077 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-078 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 cd9b14537775d1fc76bbd49c0ee6455e98fa850e24074a33d75f2b5f78c5c132 |
| UI-078 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-078 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-079 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 3f8d299ffad89793a43f285d5cae1b4ba372ed68585a4b2aadab971dda192c23 |
| UI-079 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-079 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-080 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 3bc9e440a1120a09b5e5ce5c204993c0a12819e47df5d2e0446293b3d5f6ab48 |
| UI-080 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-080 action 2 | assert-visible-read-model; control #v350IncidentCommandHandoffGrid; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-080 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-081 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 82bf6195e94f403267a1888965f792c5fc6c51a335545b22ccce5771d277d151 |
| UI-081 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-081 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-082 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 cdcc24092321099fe3c76d7a47ae96dc1c13a26f409f648f3a9eccdd659e7f03 |
| UI-082 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-082 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-083 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 22a0b0f993293a4b6a568bd5d44ba2ddcbed7c7e236104361a10ce2a4d52519f |
| UI-083 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-083 action 2 | assert-visible-read-model; control [data-testid="client-impact-forecast"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-083 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-084 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 be56c15b4c8fa2635bee40476bf6efe7969f03bf21eadc18160aa99413aa79e1 |
| UI-084 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-084 action 2 | assert-visible-read-model; control [data-testid="client-operations-notice"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-084 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-085 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 05aaa3d3e4e15d415fbe4c80df5ff331ec58670a98858a8ce4b488190efdf6c4 |
| UI-085 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-085 action 2 | assert-visible-read-model; control #dashCommandWorkspaceExportBundleMap; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-085 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-086 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 b0b316c864eebae1e3a17fe25ef511b692e85081e1250803084a0771ba022106 |
| UI-086 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-086 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-087 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 9e510aa56bd66fd85eff7ad0c6dd1f82c6b8a609be41b3ad53bf75299f1779b0 |
| UI-087 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-087 action 2 | assert-visible-read-model; control #dashCommandWorkspaceVlmAssistedExplanation; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-087 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-088 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 c765ca421d971847cd8b4d938fa9a0f745ee340c043d48a8cbf4d185b3e522cc |
| UI-088 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-088 action 2 | assert-visible-read-model; control [data-v360-simulation-workspace-entry="simulation-route-family"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-088 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-089 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 9cfd4ff58aa1a1867f765ff512bbea1efd47c5713ba416162e14a0b3d5daff92 |
| UI-089 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-089 action 2 | assert-visible-read-model; control #dashSimulationWorkspaceLedgerList > [data-v360-simulation-run-ledger-entry]:nth-child(2); completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-089 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-090 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 3829c2ef5700991c2bb513d4b5915dca9243d4aade4ba4bb725a5edaba1a7e40 |
| UI-090 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-090 action 2 | assert-visible-read-model; control #dashSimulationWorkspaceNoticePreviewList > [data-v360-client-notice-preview-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-090 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-091 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 35046a35374afa315fd1f2334dc9530e5ddc423d769fe0ca04261f7734af4021 |
| UI-091 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-091 action 2 | assert-visible-read-model; control #dashSimulationWorkspaceWhatIfReplayList > [data-v360-rule-va-what-if-replay-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-091 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-092 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 5507c722bffede2eba2edef1b427d10d9826c808a7bd92f75faff51fa29ef0b2 |
| UI-092 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-092 action 2 | assert-visible-read-model; control #dashSimulationWorkspaceExportBundleList > [data-v360-simulation-export-bundle-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-092 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-093 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 6e3855162ca1946ffa8c3af9f79cce53b2c74ebc94d4201ad2fa1f7796de82b6 |
| UI-093 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-093 action 2 | assert-visible-read-model; control #dashSimulationWorkspaceFieldEvidenceAdapterList > [data-v360-field-evidence-simulation-adapter-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-093 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-094 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 1bfbfdf570ca76f544a388121c280ec005a5ecdc5219abb56060ae53264132ac |
| UI-094 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-094 action 2 | assert-visible-read-model; control #dashSimulationWorkspaceVlmAssistedExplanationList > [data-v360-vlm-assisted-simulation-explanation-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-094 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-095 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 4c5a09b3f4a13700efc3cddffa04d3d8b9892fee6c62c549413ae784d3eb20d0 |
| UI-095 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-095 action 2 | assert-visible-read-model; control #dashSiteOperationsSiteList > [data-v370-site-operations-workspace-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-095 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-096 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 2095b9c64f4c9a9628f44bd410e7dfe3e9f897b92b49847946b4da96cec115a4 |
| UI-096 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-096 action 2 | assert-visible-read-model; control #dashSiteClientNoticePreviewList > [data-v370-client-notice-by-site-view-group-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-096 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-097 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 2c11f7a8f571cbaa0336723d06febe7f719d756d3287640ccdb5ca9493625773 |
| UI-097 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-097 action 2 | assert-visible-read-model; control #dashSiteRuleVaWhatIfCandidateList > [data-v370-rule-va-what-if-by-site-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-097 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-098 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 c1e9279144c74d43d660d85651fe24bdc7da71c8b9e00331ff07ecde1137ee90 |
| UI-098 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-098 action 2 | assert-visible-read-model; control #dashSiteFieldEvidenceAttachmentList > [data-v370-field-evidence-attachment-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-098 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-099 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 74f92b00541d552e72de51c279cf7f5cc6c04e2a61643be1c9b9094c35a5e2b6 |
| UI-099 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-099 action 2 | assert-visible-read-model; control #dashSiteLimitedSafeExecutionPilotList > [data-v370-limited-safe-execution-pilot-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-099 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-100 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 6bd58b514ccddd033482a55c3554cdec90687fcb8c89a9dd8a0cb8913596dc75 |
| UI-100 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-100 action 2 | assert-visible-read-model; control #dashSiteOutcomeReconciliationSourceList > [data-v370-outcome-reconciliation-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-100 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-101 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 b1d75f370e8d41326603dd2f9814e0b78cc1efd520eb269fcc30738961a69667 |
| UI-101 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-101 action 2 | assert-visible-read-model; control #dashSiteExportHandoffBundleList > [data-v370-export-handoff-bundle-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-101 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-102 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 785ac53bbe4d260c3da79c50f580741d27c60acb79266f77c9721191e0f80b79 |
| UI-102 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-102 action 2 | assert-visible-read-model; control #dashActionControlRequestList > [data-v380-action-control-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-102 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-103 | /client/dashboard → /client/dashboard; viewer; 390×844 light; exit0 | pass | SHA256 66dce318b6a97c40741efad4744a2f376ce46d25a4e6904747eaa21e7713852c |
| UI-103 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-103 action 2 | assert-visible-read-model; control [data-testid="client-action-notice-preview"] .client-action-notice-item:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-103 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-104 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 2a8188520d5efd3a0802668e92fa33ed1fd42ef2ad9d9921d894b6ed9ce0520b |
| UI-104 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-104 action 2 | assert-visible-read-model; control #dashActionOutcomeSourceList > [data-v380-outcome-observer-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-104 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-105 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 a575e91b2ecca4dbf8f575f9cd44e76e97b38ab401f60109b6f6367c7636ddeb |
| UI-105 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-105 action 2 | assert-visible-read-model; control #dashActionReceiptBundleList > [data-v380-action-receipt-entry]:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-105 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-106 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 3e9b80e9881c6c2933c9ec927eb862ac4f2b9d5a423c6d84757b0f8c35741f40 |
| UI-106 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-106 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-107 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 22a3c2fbf1e9fed1f138b5e9febbc33b0b1ffa81a8e10618072fdbf19f71c6b5 |
| UI-107 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-107 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-108 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 dc278fe44f672c523c58d6b019c2b2d62cf0e3cd005aa79f339db03ce4e24eb6 |
| UI-108 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-108 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-109 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 aa9dc8e9475163a86a9584ced46fdd96e67f2a3680b1ca77c9e4c16cf6a621d5 |
| UI-109 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-109 action 2 | execute-persisted-action; control #channel-save-selected; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-109 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-110 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 0662c7d455bc26811e571327066f59f6c6b1ee2fb86155253b33d2d6ed120849 |
| UI-110 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-110 action 2 | assert-visible-read-model; control #opsVlmRuleDraftBridgeStatus; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-110 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-111 | /ops/vlm → /ops/vlm; operator; 390×844 light; exit0 | pass | SHA256 72818c46483ccbdd60669d621d226b647d576e06d1e957878e471c453b7ed88a |
| UI-111 action 1 | assert-disabled-control; control #opsVlmExternalTransferWarningAck; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-111 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-112 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 26d1aae040ff8d9c32281092a58e7004f8c1dc1ffb77d7ff92abd86e4aed6364 |
| UI-112 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-112 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-113 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 c4aa3283dcdf7d41a1621905075bf076bbdb7de19628fe2bc234919ed4e7eb3d |
| UI-113 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-113 action 2 | assert-visible-read-model; control #dashActionExecutionDeferralList; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-113 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-114 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 ec7658c1f284f0c8bdef494b9dfe2c7d80d56b6c4fdb507afc175890b5298e70 |
| UI-114 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| UI-114 action 2 | assert-visible-read-model; control #dashFieldEvidenceBridgeList; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-114 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| UI-115 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 72ec86d3c29ff7d46e4c7a4f9b39d33527cb11015f5febec60c709fefa05a864 |
| UI-115 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| UI-115 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-004 | /login → /login; anonymous; 390×844 light; exit0 | pass | SHA256 a679e62d9de04a4ed5bf9cb75ae0254573dafe77ead8966a92ffa685fac8d2d5 |
| AUTH-004 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-004 action 2 | submit-form; control [data-testid="auth-login-form"] button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-004 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-005 | /setup → /setup; anonymous; 390×844 light; exit0 | pass | SHA256 e3fd627b6c29241591f7a75ed9745c3f1f479643aea82cc7596a6c4474bb52b8 |
| AUTH-005 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-005 action 2 | submit-form; control [data-testid="auth-setup-form"] button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-005 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-006 | /setup → /setup; anonymous; 390×844 light; exit0 | pass | SHA256 c9e17c992551b628666569bad1c7fee91c5e8bf2ed253be33f1ae7865219911b |
| AUTH-006 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-006 action 2 | submit-form; control [data-testid="auth-setup-form"] button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-006 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-007 | /login → /login; anonymous; 390×844 light; exit0 | pass | SHA256 d12476559f4a462a98c33da1cf7eea1da3922a09baf34d80da9546b3aeb71fdb |
| AUTH-007 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-007 action 2 | submit-form; control [data-testid="auth-login-form"] button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-007 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-012 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 ad94bbc9b97f6aeb1b978179dda3c5dbbe29a6037c9305cefb2812124a9c68c0 |
| AUTH-012 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-012 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-013 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 b6bccd34d26a8944a18c1bcbfb154ab0f9deb2e1d1de0e5bc4c3d723ec74aeb5 |
| AUTH-013 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-013 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-014 | /login → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 d77cba5902d8fc0a923540ec9a62d4b56e7621c1486f799040626d86dab2717e |
| AUTH-014 action 1 | navigate-action-route; control 없음; completion setup-navigation | pass | 실제 action status PASS |
| AUTH-014 action 2 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-014 action 3 | submit-form; control #user-save-selected; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-014 action 4 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-015 | /invite/setup → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 5720241352160907cf2d467cd0f62a8ce87c2273f9caa6cb79670658c2033314 |
| AUTH-015 action 1 | navigate-action-route; control 없음; completion setup-navigation | pass | 실제 action status PASS |
| AUTH-015 action 2 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-015 action 3 | submit-form; control #invite-create-form button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-015 action 4 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-016 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 48b443550c459a50a59c882a202efe6af4d660342122e77a95380c5cf8ea0998 |
| AUTH-016 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-016 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-018 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 707094272528e7f72c5b6a89e4c98e81fa10dd3f7ed69219654f4a52c7e22906 |
| AUTH-018 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-018 action 2 | execute-persisted-action; control #user-save-selected; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-018 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-019 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 38c022113cb3b36395fb8db609d1d3267c7d42839025d4b7e33088db358877da |
| AUTH-019 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-019 action 2 | execute-persisted-action; control #user-save-selected; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-019 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-020 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 5da6134ce8330bb172970bbed17b9687fb233660714b05635f01632556152c35 |
| AUTH-020 action 1 | execute-endpoint-action; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-020 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-021 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 1efe7a4500fd651fe7441186e56c3242ed3bf8fbe422c71a37f57c6d33b82677 |
| AUTH-021 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-021 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-022 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 76913cbf3ccb227e15ad82538a9b5ac8026786c1edcb9dd9996195a279284f57 |
| AUTH-022 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-022 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-023 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 7f79ca34697b9488ac0ca582cb5c18f935f665f257c86aa1eb6a748d87b9445a |
| AUTH-023 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-023 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-024 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 aab87f5ef97c4c64f321108691a540af7aa642b3c9510c98da9e6c1a546aa803 |
| AUTH-024 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-024 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-025 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 f5749a34572c1b10c6fecdc01f64ebbef95902c8188971c950c154b74c95c35f |
| AUTH-025 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-025 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-026 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 f4fcb8b97bad427a4ae8f2c1af4c436028815c25ad54eb767e45e32ed4635629 |
| AUTH-026 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-026 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-027 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 ac4df467818c1e1d1bf97405310ae740f79313702df8d336091156d4745b200c |
| AUTH-027 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-027 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-028 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 8b09b7acc00c8a5e0b7f859725956babbb7cf7934c0b22d24a5f21446bf520e0 |
| AUTH-028 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-028 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-029 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 a3e34715f44b5ae530603eb54f02cb57a91de7dcf48f1b0e1d6aa7c4af66c109 |
| AUTH-029 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-029 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-030 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 db5c3a8db196b32fdae6bf56ec6aba774851331c4f36bf9abe70842d397f1d25 |
| AUTH-030 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-030 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-033 | /invite/setup → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 b93b321abb02654648555a9aa10c24d900d8a36d127f35b1e3bddf52b5d5b9a7 |
| AUTH-033 action 1 | navigate-action-route; control 없음; completion setup-navigation | pass | 실제 action status PASS |
| AUTH-033 action 2 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-033 action 3 | submit-form; control #invite-create-form button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-033 action 4 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-034 | /invite/setup → /invite/setup; anonymous; 390×844 light; exit0 | pass | SHA256 62fff808638c6ca1b8c7903a535071fee3f99ab2dcff1524e4d63ff7aba9f339 |
| AUTH-034 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-034 action 2 | submit-form; control [data-testid="auth-invite-setup-form"] button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-034 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-035 | /invite/setup → /invite/setup; anonymous; 390×844 light; exit0 | pass | SHA256 68638e9440e3dbc8cd67c821da32d057df5628ca914bb449842093ef352a782f |
| AUTH-035 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-035 action 2 | submit-form; control [data-testid="auth-invite-setup-form"] button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-035 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-036 | /login → /client/request-access; anonymous; 390×844 light; exit0 | pass | SHA256 50c7b866fb136e2ff6cf8af729349ca2dfd12f7b2749c7ae9617ec0f9b49859d |
| AUTH-036 action 1 | navigate-action-route; control 없음; completion setup-navigation | pass | 실제 action status PASS |
| AUTH-036 action 2 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-036 action 3 | submit-form; control #request-form button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-036 action 4 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-037 | /invite/setup → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 70140252d488ac837b1c210f1126971cac85fbc247b87ae8492418958e0b1b13 |
| AUTH-037 action 1 | navigate-action-route; control 없음; completion setup-navigation | pass | 실제 action status PASS |
| AUTH-037 action 2 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-037 action 3 | execute-persisted-action; control [data-request-approve="auth-037-review4-fixture"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-037 action 4 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-038 | /invite/setup → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 c71a0ba76071744337bb55dac0d9957da032ac9f2a3463bf4e51f061bc9e0c68 |
| AUTH-038 action 1 | navigate-action-route; control 없음; completion setup-navigation | pass | 실제 action status PASS |
| AUTH-038 action 2 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-038 action 3 | execute-persisted-action; control [data-request-reject="auth-038-review4-fixture"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-038 action 4 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-039 | /ops/users → /client/request-access; anonymous; 390×844 light; exit0 | pass | SHA256 a1f7763a2b5d2b997aef418345669952344d316f72b1529bafb15d01bbdb2317 |
| AUTH-039 action 1 | navigate-action-route; control 없음; completion setup-navigation | pass | 실제 action status PASS |
| AUTH-039 action 2 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| AUTH-039 action 3 | execute-persisted-action; control #request-form button[type="submit"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-039 action 4 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| AUTH-040 | /ops/users → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 b01037169c2f708f1e3b566ccce65274ee6fa1d64dbcf66bd3c564a7eac4e2db |
| AUTH-040 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| AUTH-040 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-001 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 6674dc116a767712ae26b3bd2ee25565ce75723956d96891a2ef5bbb2c9881f8 |
| SRC-001 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SRC-001 action 2 | execute-persisted-action; control #channel-save-selected; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-001 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-002 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 f33a276a09c419e8d62b9e108e7ff1998eaa0c6f8260a4eb86ac4d546af45129 |
| SRC-002 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SRC-002 action 2 | execute-persisted-action; control #channel-save-selected; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-002 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-003 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 e9b009fd651387f773005aa6926c0d5d78c525011334273328b48d369b45d2e3 |
| SRC-003 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SRC-003 action 2 | execute-persisted-action; control #channel-save-selected; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-003 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-004 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 24d40fb5038595cc39cfc74d410e6ce703aa4dee8861685a8d3e5365d19e0658 |
| SRC-004 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SRC-004 action 2 | execute-persisted-action; control #channel-save-selected; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-004 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-005 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 b0e0df7d821b18f3e16c3bbdc932f1b9a10015ac078809fee07e66e930ea2272 |
| SRC-005 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SRC-005 action 2 | execute-persisted-action; control #channel-save-selected; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-005 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-006 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 0d519cec680c8677b9a6362fe11f741c4614e66519117660bd9d36cbba876d5c |
| SRC-006 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-006 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-007 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 9e6df0a1bc8e65c5f6d7186a8eff4672c867925347acc41fb2f6fc234e37e41d |
| SRC-007 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-007 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-008 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 8a10db76a28a0e271569a75a1f2da901b2da030b3a1dd0df0e0270f74826c7b3 |
| SRC-008 action 1 | execute-endpoint-action; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-008 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-009 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 d3ffb9bdb8c99f99a02d3ad7c5b188ea54a0ccfbce2ed6230764ae43207b4f1f |
| SRC-009 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SRC-009 action 2 | execute-persisted-action; control #channel-save-selected; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-009 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-010 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 33d6ccba3fdf8167724152659e11639f3976b6528341450aeda3ef3339a47aaf |
| SRC-010 action 1 | execute-endpoint-action; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-010 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-011 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 592a655a0106056b9978fcb07ce60c21d50bf72cf14a0f2676039cb7b075a2b9 |
| SRC-011 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-011 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-012 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 5dae0bfef89cceb0a00158d022a68e6c8a09ecd004b4564397e4592a8c320f4c |
| SRC-012 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-012 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-014 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 3ea4b0d0ee57cdb58378da47934e4c2bf4def5f13d76ef283772a57fdcd32f17 |
| SRC-014 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-014 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-016 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 c37e74c80342de4a1a521e6d1723ea1f0e29da97cb0f46db61fe7b6beb952420 |
| SRC-016 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-016 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-017 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 d174d2874702885132424ff529676234e9f2346c32cea01132de8f8ae653d415 |
| SRC-017 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SRC-017 action 2 | execute-persisted-action; control #channel-save-selected; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-017 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-018 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 6ec48aecb00e2bf3e7c1bf708ab5608621c6e112d854d4f6bf55f2823329ad1e |
| SRC-018 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SRC-018 action 2 | execute-persisted-action; control #channel-save-selected; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-018 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-019 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 8e89b81a7460d5b99b2a4dd0f3ec2249003bd232c5b11ab3cd0b6ebe8189b1bd |
| SRC-019 action 1 | execute-endpoint-action; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-019 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-020 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 b3750ef8e4206f1d14cc79921b0a10d235feb7fd159ae116a112178bfa3b8c71 |
| SRC-020 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-020 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-021 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 6634762c9887cd858ed2bcd4c62441faf1210987baf007c18c11aec4a8d45bfc |
| SRC-021 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-021 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-022 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 0991bd0b37131a85cafedec6d8ffa8f0b908611db43ba16c76e2e74677f6eef7 |
| SRC-022 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-022 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-023 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 e3741046ccdfb4b6db115503cbcbd5466b168a5736b69a8d90696229bd6725ef |
| SRC-023 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-023 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-024 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 3d821484807a171a2a657eefd07df0d1d238bfe64825a62a7847dd358525717b |
| SRC-024 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SRC-024 action 2 | activate-control; control #add-channel; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-024 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-025 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 e7ae83964b2f1270ac89361082a2d60fdb5ac90c834bffd5b64c33b838b60ca1 |
| SRC-025 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-025 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-026 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 4796c8448a324f6e48a25cccba81b6f10d45dcce9efd74667273dee774c9e724 |
| SRC-026 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-026 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-028 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 2e82b9845bbca220ad560e2894a4acacf48c13d81c779d805b27ba50c0c07662 |
| SRC-028 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-028 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-029 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 cbaed5f0169a20c6715d56fc21d29d754cd2b05776f9689a5e4c243e855fa8aa |
| SRC-029 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-029 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-030 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 da96ff4bca6d2191f8b7ad7027e51a33878b83c8a96ccd34941ad5903c1c7743 |
| SRC-030 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-030 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-031 | /ops/api/onvif/import-draft → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 3eadd3aeb0603f759fce04da08cdd6fab3c1bfb8d79e70aa7ab8cd38392243ea |
| SRC-031 action 1 | execute-endpoint-action; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-031 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-032 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 e6875e3423959e98dce989b2827ababc18144205939a230c3266e8d94f6a83b8 |
| SRC-032 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-032 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-034 | /ops/api/source-registry/onboarding-quality → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 aeeee386fad310e0b097fde0db77f93fb6e8866424acf3b24ca518455afdfd9a |
| SRC-034 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-034 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-035 | /ops/api/source-registry/reliability-timeline → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 35d913063a177ae120eff847c7e7e02388e3e4071dc6e159b0d344f232c82ad6 |
| SRC-035 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-035 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-036 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 c1e723c2fc86950284bf063b45e051b9e2e253ba4bdff81e7c07f89990c4c22f |
| SRC-036 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-036 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-037 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 2aeffc340a60a24be65dc98f4ec52b5efff2f5dcd82b4ee32c717ecaac696bbf |
| SRC-037 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-037 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-038 | /client/api/views/{id}/events → /client/events; viewer; 390×844 light; exit0 | pass | SHA256 232f029081d9de2d70fb90a6789588c7df6695cf76730d1d1eb870160b134f82 |
| SRC-038 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SRC-038 action 2 | assert-visible-read-model; control [data-testid="client-safe-source-status-digest"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-038 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-039 | /ops/api/source-registry/reliability-search-metrics → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 9bd7abc695e65ca3e304c8d8e9117d044c683ccc0a9b8af3cdd10a7e1e4e3c31 |
| SRC-039 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-039 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-040 | /ops/api/source-registry/backup-recovery-handoff → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 a2996873599d8edfea84d4fc31ed7eb9910e253082788138e36e14d51b1361f5 |
| SRC-040 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-040 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-065 | /ops/api/onvif/credential-provider-status → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 b97537b2cef654d17aeeefd56fb2db32db27d3400656e881ae4284acf0427d5c |
| SRC-065 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-065 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-066 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 6bf500c7615e84a3c13871b7b5f318ab4e7ce138ee2edab7120b529a203e98e5 |
| SRC-066 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SRC-066 action 2 | execute-persisted-action; control #channel-save-selected; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-066 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-067 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 b415b5884f050b02d2d2dd82f9e472f3842c49c70d91372ebbc00a90062dcf56 |
| SRC-067 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-067 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SRC-068 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 c11f0cf3571c87a433a69efb40792a7f43dc2146f72b4ff439097c8e13420fb1 |
| SRC-068 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SRC-068 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-001 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 468f4c7994e9962d891f77b3b1a59c0ecc50118944ef3dd5290e66cdde23e209 |
| RULE-001 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-001 action 2 | assert-visible-read-model; control #opsVaRuleRows > tr:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-001 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-002 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 7812c060a8ad036933a6457bab1bfdfc5f4154692d72048cfedcfa96d964d2b7 |
| RULE-002 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-002 action 2 | assert-visible-read-model; control #opsEventRuleRows > tr:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-002 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-003 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 d476b32211baee04442496e9614ceb9961d9574a3236dc71e0439913ba786022 |
| RULE-003 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-003 action 2 | assert-visible-read-model; control #opsProfileRows > tr:first-child; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-003 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-004 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 48194d88d5d278a305319d32905f184ba0ee0179447e8256835810ff6416c24b |
| RULE-004 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-004 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-004 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-005 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 48828ca39873af78a2bf73d9888d25c5d208ca65f7bf45ecf3ec7a3188ae2519 |
| RULE-005 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-005 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-005 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-006 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 9dc2423c390a27c57e5f07cb12bafd445b4bc882b5a55d41d46389cc3233cdc7 |
| RULE-006 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-006 action 2 | execute-persisted-action; control [data-ops-rule-action="delete-va"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-006 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-007 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 07b0c4af23c464a1135b38a95033691870c2dabff1ca948eb8d59a43f90a1af7 |
| RULE-007 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-007 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-008 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 bbb6bdbe4c395649f7c6fc6db631f958479a78b3b1857ce324a71ad6995aa3c1 |
| RULE-008 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-008 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-008 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-009 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 bebc6508e810899d890741fb9e6d3609397470551a87e8617bb595d3280ddfb9 |
| RULE-009 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-009 action 2 | assert-visible-read-model; control #opsRulesValidationList; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-009 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-010 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 33cc699a7389baac92e51c49557e5b9ff3389d33c509fc0ca9e3f3f79dc74d5b |
| RULE-010 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-010 action 2 | assert-visible-read-model; control #opsVaRuleTemplateSeedSelect; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-010 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-011 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 ad43e54d175a158e65f1284e2d7d8a96b6c7214492b36a9b73b4d310ca51a6e0 |
| RULE-011 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-011 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-011 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-012 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 91af9fbf7232ecb2f53e6b31862178628958a3f9e47b325d3e466ecac74fbb05 |
| RULE-012 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-012 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-012 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-013 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 eeb3b31f3e699822b30de241469cf5f71ed02b88dcaa4d93d2f183adab5acc30 |
| RULE-013 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-013 action 2 | assert-visible-read-model; control #opsVaRuleGeometrySummary; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-013 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-014 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 029eedbacaca7fca34c8eab0c1fe6f9a653bc4b11620f9cc4fc42bb9260b508b |
| RULE-014 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-014 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-015 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 5b4236ba05f036f87e8015693d16dddd30cec5d06893241c30143fba94e6aac4 |
| RULE-015 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-015 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-016 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 2eb714ca47a35835a620538fc270b6d1880a2ca883369229194402c6cebaebe0 |
| RULE-016 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-016 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-016 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-017 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 7c0573dc03c158d6f31241a7b7fe9701ad7fe3b88d3242af79fb63f50fed9a6d |
| RULE-017 action 1 | assert-hidden-control; control #opsEventRuleIdInput; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-017 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-018 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 ad278b09d87846c2102be7b1a46fb242a93a36934a90d175abc771484a8c49b4 |
| RULE-018 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-018 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-018 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-019 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 1bd7e6ce43fc662fb022a616dd21b7ac6d8404b29a90236b3795b2d50ea36af8 |
| RULE-019 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-019 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-019 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-020 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 501148b0a3a08a16feec0c2143862a588f7c7daa6df86383776f3327c9867e6d |
| RULE-020 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-020 action 2 | execute-persisted-action; control [data-ops-rule-action="delete-event-template"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-020 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-021 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 14a695a8c3c17ea9f87f3b28e43c64d83a42ccd74f3c1f115803c8f49504ccbd |
| RULE-021 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-021 action 2 | assert-visible-read-model; control #opsEventRuleDetailSummary; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-021 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-022 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 1db1779269f23828e411e5871e66efc2b2d3c5865920b96360ac163ca7b06c11 |
| RULE-022 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-022 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-022 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-023 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 f85b44e8f83692b620e02f2863c1f79db40ee2dbc80e37e023b7f0ccb5eb5496 |
| RULE-023 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-023 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-023 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-024 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 dc565caadfa6b41670c76e054232c2ce634addb409512442eb3d1cd9c1b2ef9d |
| RULE-024 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-024 action 2 | execute-persisted-action; control [data-ops-rule-action="delete-profile"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-024 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-025 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 f699c44392d760055fc794d4b93c62edf0dab9517d83cb503f348247438f86c6 |
| RULE-025 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-025 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-026 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 e6b2414717aed163c656d09350eb0d29b5b64d25b4ab8dee938258d143e88bd9 |
| RULE-026 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-026 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-026 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-027 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 daa5c0a994f102ce312ddfc67b5b3eae818a63492fd259be59eb9311afc89983 |
| RULE-027 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-027 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-027 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-028 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 cc41bdb358b73b0049b083764820bf00e930731a38d519f6effedb120df0c5d7 |
| RULE-028 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-028 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-028 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-029 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 29326f262463e20d2e098c14f269e199b60c1f3d79c9b11acb2ce3a652874f0a |
| RULE-029 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-029 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-029 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-030 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 8dd3f82e32ec1bbe454d5206c818eedd5f907656e13e25e6506010384618ead3 |
| RULE-030 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-030 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-030 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-031 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 06ebb9fa5841c41678af7e02bd0ebbf2dfb805aa05bc8cfe55b045a24eaf54e3 |
| RULE-031 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-031 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-031 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-032 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 d12d4e9479e92c826bc1f2bab193ef376c9b8cdfaae3f4b2f71b8cd7e72a5d14 |
| RULE-032 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-032 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-032 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-033 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 55e308d7fc34dd43ac243fa408c69036d66eea49c040278fc5786a5d7ae13af1 |
| RULE-033 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-033 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-033 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-034 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 31b49fd72f9b8690a0fed2adfdfef15fd679f430512f0a8d5d7a6938e3d35d98 |
| RULE-034 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-034 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-034 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-035 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 d8b392f1409afb95f295203ead78d5c24d096320b1029c88ca34c62b5fa46226 |
| RULE-035 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-035 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-035 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-036 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 1be0cb4b195d08c7b578713380fa1a7140939fbb7f2496783b6495f8b47ea582 |
| RULE-036 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-036 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-036 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-037 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 c394bfc09078b09e305896b076a090c9a1a7fef172834bb24b980b79034a268a |
| RULE-037 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-037 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-037 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-038 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 935322071f0440bfca315db3de59470ca6e6e14f67465f03ceafc34ebdec7dd5 |
| RULE-038 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-038 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-038 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-039 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 3a1828edee92c2f974c271c87dac449faa6eff1208651feec8f652e30b8acf42 |
| RULE-039 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-039 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-039 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-040 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 28f68bc3e1d673dd83535d858aeaa86714e7b63c17478beafc35238856f80fcc |
| RULE-040 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-040 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-041 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 14e25f2b9077dc1c6676f50134ddc952921948f3850f736d3d76adca71e87091 |
| RULE-041 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-041 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-041 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-042 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 c3f3e7579d35024676b74a3e02d1d387c9f1a256da0bcb3b915f89d28731031a |
| RULE-042 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-042 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-042 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-043 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 4fc8cc4643ff3994acdb465f858453ae9cd1bfbcff6010024ef98951bdfe521e |
| RULE-043 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-043 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-043 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-044 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 302a4ef205abfe449cbef317e638807cc4078bac254f400f92bfdf3ab95e2272 |
| RULE-044 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-044 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-044 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-045 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 b3a3254fff0a70cfca740fcf7f49f016262a8d3718067ff0fbecde4dde78b19e |
| RULE-045 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-045 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-045 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-046 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 77472df7812bb1d78494dd24bed121644380da2b8b52c1eab5a76c59df740727 |
| RULE-046 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-046 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-046 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-047 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 04de2e0423612250ea046b54544748a0c23de92ef04969943b605d510b85572d |
| RULE-047 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-047 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-047 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-048 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 60e6e3298e8c004e3352f3eacca6de053d66aeb421fdaecbcbbeed993c61f009 |
| RULE-048 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-048 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-048 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-049 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 7fa4a091270a9243907108867762e86174d2bcd98832ec98d5ed79b5ea17e44a |
| RULE-049 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-049 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-049 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-050 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 47b93a1bdb453d6ace5cb456149e450e746d7e181b7855444bc8cf3a5eb08fbb |
| RULE-050 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-050 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-050 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-051 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 ef62842d94ada288479c21a2c65808c409a027317eff72a035cffb1077b5dd45 |
| RULE-051 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-051 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-051 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-052 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 2a222782bb013562c170a9fbccfd2aa5c4202a1660ea0d40fa36e8e7ca94efd9 |
| RULE-052 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-052 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-052 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-053 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 6fc06eb505c1c4764a908dbbd9a8412dbc08b9d4a6a79e63052c0a3e05c8df08 |
| RULE-053 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-053 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-053 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-054 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 a1fb12755afd01814af50ec37babb328f8153a0841e2cbe9d061bff974351505 |
| RULE-054 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-054 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-054 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-055 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 c929e8d1d556a2919cf8d93e76c86f48cd2091c1870bb6fecb2bad35130147a0 |
| RULE-055 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-055 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-055 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-056 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 09a2b001bf621dc5ff3ab896de61b9d892632fabe579efc6c37999f287ab6aa8 |
| RULE-056 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-056 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-056 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-057 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 edefd82e3594e8dc3aea08726808f192c2762beb28cd3fe212435080187e23c6 |
| RULE-057 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-057 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-057 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-058 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 b5601fddc769fda330ba202ee2c37ade8af86db270cd20f6c39c10c3c8d46eca |
| RULE-058 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-058 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-058 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-059 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 3f5f52c7a320cafd82afc89e2afb5edecfab52da19a1446bd18efe2c699b2e29 |
| RULE-059 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-059 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-059 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-060 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 16ec55980c6bfb8420f116bbc944afff95a20b1ab7ff73c309f637491bb42591 |
| RULE-060 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-060 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-060 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-061 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 b89dd1fa3096bbe9a25f1c9240a234f65315042b8962db50215c07ce29250af2 |
| RULE-061 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-061 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-061 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-062 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 036b8119c649b7d9e089a107a77d5b31c12d8acbb07981564948598801035e62 |
| RULE-062 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-062 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-062 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-063 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 4deb77175b7ceae6b3f9f2df732a6b89b03611ca62d2cb0ead7755fae6fe6d4b |
| RULE-063 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-063 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-063 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-064 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 4e19760248a521d6aca2c65397182dba8a296b6cab077e8d9306a520625943e3 |
| RULE-064 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-064 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-064 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-065 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 8a2ce7633ef29b4c20127b84aaeba7629d390e3cb9f52d27455adf15032a59eb |
| RULE-065 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-065 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-065 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-066 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 298a4b24bda554482a7ad9c02e69e399ded3d6520e97005d93c2c833cff65a52 |
| RULE-066 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-066 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-066 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-067 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 a80b94783c9387bb3fb70bda620818175a12665d214a81712ead1ee87bd963a0 |
| RULE-067 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-067 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-067 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-068 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 7414a325d8ea4f7f499da30e67ff753d756b560c4a477b31fa094e09291b7785 |
| RULE-068 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-068 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-068 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-069 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 6932687cf20836153d2bd9a7dd186560af24347e178d6d2b6834458e3024a3c6 |
| RULE-069 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-069 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-069 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-070 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 1452e2ca73421597a10ce10b55a6592f3ae2015ead61e6c63cb5301fdc709993 |
| RULE-070 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-070 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-070 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-071 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 65f7e8ae19a984219c79b12a52dc90ac4be99888cfa03e3dbc37d85cd35e578a |
| RULE-071 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-071 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-071 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-072 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 45e1836839ed5ceda0728f7144a52c2a5380cce8ab3cae2bed31fc1f4fd63871 |
| RULE-072 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-072 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-072 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-073 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 cabb1dd1713777c3bfc53f1f78c6fe8479eb65fabd543f34ea4d2c565be627cc |
| RULE-073 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-073 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-073 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-074 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 f0a4a1adb310a4ddaf6846420f563baa1bc663b2ae05b8d2ba9097d3e4f04496 |
| RULE-074 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-074 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-074 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-075 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 a64227f09c481901086ad09384504da17e2a26633a09205fad7fe0ea6bc836e4 |
| RULE-075 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-075 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-075 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-076 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 e6e258b73f17c2e7addfa63ae6909d1806b94a64f194aa71f7bd26687e95dd92 |
| RULE-076 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-076 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-076 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-077 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 af9653307d9faf1fefa6b43536b7544b7cd998b6e14533f4782267df3e725921 |
| RULE-077 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-077 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-077 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-078 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 bcadd3d0a07ecf84842ed1b8b5b95e08a395deb89439195d66650ad8c6dfe067 |
| RULE-078 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-078 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-078 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-079 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 b2ba0011802db787eede364538502a76910c60eda235b2869a4651570c0ccc39 |
| RULE-079 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-079 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-079 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-080 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 854be43ff56d2c4d70e8fcca60dbb59bfefbe4fb0808359c495c935bdcd677c4 |
| RULE-080 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-080 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-080 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-081 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 8599f3d14e5c37a49ed114de564a7cc6b4fd3fc66ece670e856ade8cf862ea5f |
| RULE-081 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-081 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-081 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-082 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 adff23435fb34559a557630a8dd22aad993e1b44913fc30ebec743da954d26be |
| RULE-082 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-082 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-082 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-083 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 818de3e01fbaabec904072701f6e0418fdf7904c000c0c6bb6a063b53b3b73ff |
| RULE-083 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-083 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-083 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-084 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 d2351080795849038d3b46bdadc3b5073e8308f2cc3a898942f96053c713b9ae |
| RULE-084 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-084 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-084 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-085 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 6030fb64f6736646c9bbdbab463086e2103ff45e5f46755f7e38838ff1c5f72d |
| RULE-085 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-085 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-085 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-086 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 7d6c2ccdf20b6ddf3e9e19b24975e448fef280e86132f693cd540aea343bc6a2 |
| RULE-086 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-086 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-086 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-087 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 6ee0938d6a099369f6b9bf057b74681ee9cd36dcfe42c495782a8a100f8e0a15 |
| RULE-087 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-087 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-087 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-088 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 2ec9d7962b5be1b12d93e934c397ed9846c76c5a855c9077efea801903187f18 |
| RULE-088 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-088 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-088 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-089 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 53eda4be89f7c4376c7db5bd1737616e78a29ef0a94a54ca1b76774b45c5fa40 |
| RULE-089 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-089 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-089 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-090 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 44ebc75974baa4b069d62405f8d73a5aa818168a8ed1162bced3f5d0bc52f22c |
| RULE-090 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-090 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-090 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-091 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 7b9fa93a029d4fdbb19c14bee7bf01f832f03ff5315c725f1abed0ab8eef2baa |
| RULE-091 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-091 action 2 | execute-persisted-action; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-091 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-092 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 1b16534ac83d2d62fd0704bc23b3021999283866ae9e91644065af3005820523 |
| RULE-092 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-092 action 2 | activate-control; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-092 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-093 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 cb31f17b7e44452523c721827960c83b4b7dbc9aa047eb4d3cc0a3595ffaa8eb |
| RULE-093 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-093 action 2 | activate-control; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-093 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-094 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 3517b5bd383388b821cd26fdac72b3eb097f9e5f1fa7e01d83a542fe6cc3ea5a |
| RULE-094 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-094 action 2 | activate-control; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-094 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-095 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 544a8296a4d422931d1b970a696cd0956e60a0ec90bbd5a6e6531767d39f4f1d |
| RULE-095 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-095 action 2 | activate-control; control #opsRulesRefresh; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-095 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-096 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 b4ba78ec85eb2a7c916160a54ba36526e52429f583cb7ac283d93f96a3131a0c |
| RULE-096 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-096 action 2 | activate-control; control #opsRulesRefresh; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-096 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-097 | /ops/rules → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 51be32645678df41ab82b10ca58effd6fc002186052b82246b9165a4baa77884 |
| RULE-097 action 1 | navigate-action-route; control 없음; completion setup-navigation | pass | 실제 action status PASS |
| RULE-097 action 2 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-097 action 3 | assert-visible-read-model; control [data-testid="client-live-source-tree"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-097 action 4 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-098 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 3c33427a4e741f5f1998d7d8ea3c0225d84bae1f55245465be451b6ddd003b9f |
| RULE-098 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-098 action 2 | assert-visible-read-model; control #opsRulesValidationList; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-098 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-100 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 67131a9f1f81e69eb775a52227e4e2ea5a83175ac623ea0c43a25a9decb5e34a |
| RULE-100 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-100 action 2 | activate-control; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-100 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-101 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 93f2f29d2564ebc69ce5293f57cce38c7d47a8b0ad0f48f2671d869b71099dac |
| RULE-101 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-101 action 2 | activate-control; control #opsRulesComposerSave; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-101 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-102 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 c9274eedb131c30de8e9a37e23894af4a03e6a0d0cf57e3ec71dae77fa335d70 |
| RULE-102 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-102 action 2 | select-control; control #opsEventRuleTypeSelect; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-102 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-103 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 3ad8d3d7058a6d2a8516b372f9d40e4cbad5e7bf25ff2dfcfddb6c7753d64f96 |
| RULE-103 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-103 action 2 | activate-control; control #opsRulesRefresh; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-103 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-104 | /ops/rules → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 357ad6b550e40e1ab45043a6b6deaaf20d9c8d2d664dd9c054b85375091b3c3d |
| RULE-104 action 1 | navigate-action-route; control 없음; completion setup-navigation | pass | 실제 action status PASS |
| RULE-104 action 2 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-104 action 3 | activate-control; control [data-approval-gated-rule-draft-route]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-104 action 4 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| RULE-111 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 21274f852742a1cc2f268e463f126899d06ab663507cdcbca2e201594978095c |
| RULE-111 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| RULE-111 action 2 | activate-control; control [data-vlm-rule-draft-index]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| RULE-111 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-001 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 d2f893307026cda3ebb67e6a1e877b61e2b344f52f69b16b4898fe84e4560837 |
| EVT-001 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-001 action 2 | assert-visible-read-model; control #dashRuntimeTrendSparkline; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-001 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-003 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 c5fd32622cfd5b93032b583eaaa344f1733af52d551e9506de528dcc9759e6b8 |
| EVT-003 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-003 action 2 | assert-visible-read-model; control #dashRootCauseList; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-003 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-004 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 97495dfd3455408d1797616b4798940898109687c472257ce19df4a0b1561d85 |
| EVT-004 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-004 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-007 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 bc300a5c8fcbf6b164cf3d393dbbe136bd3dc90cbc617b9a3c35e13ffd963666 |
| EVT-007 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-007 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-016 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 009443c0c8f364a16014623341e3439db43777dc359e6ddd185f1c3931842430 |
| EVT-016 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-016 action 2 | assert-visible-read-model; control #opsV320ResolutionTimeline; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-016 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-017 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 36a5132eb93f9ea09ea1288b8a69816acbdd747ccc8c693af72ad2dbb140fde9 |
| EVT-017 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-017 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-018 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 ed67489d029d5f5fcfd6196f8cdf55efe7005c99f12496a5b669c5111e544f27 |
| EVT-018 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-018 action 2 | execute-persisted-action; control #alertDeliveryTest; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-018 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-019 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 519a75f2a157be15044f66c6a37fa3e09aa80f0d6a82f03a3afdb2d188362f51 |
| EVT-019 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-019 action 2 | assert-visible-read-model; control [data-testid="ops-vlm-event-review-card"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-019 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-020 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 b773be66b486a96476f9babab5672ba8d051c1a6a12d2cdce3541c909e65ad64 |
| EVT-020 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-020 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-021 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 32211d4d9ad0daa7044dea8ae1fde560a7e9d1eccd06f204d3a69b8ffc749242 |
| EVT-021 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-021 action 2 | execute-persisted-action; control [data-event-review-save]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-021 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-022 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 ffa347ffff53ae750b396cd7d6289416c88c78483a2b2076591e1ed9963c331a |
| EVT-022 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-022 action 2 | assert-visible-read-model; control #event-review-audit-list; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-022 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-023 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 f1afc9c3b091104edf556ecff1927235708798757996dd1766912912aef22b3b |
| EVT-023 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-023 action 2 | assert-visible-read-model; control #dashCommandWorkspaceLedgerList; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-023 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-024 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 ef23b3aecf398295a4ef239fa0bdf8c807205a1d253207031c418fd8c5a237ec |
| EVT-024 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-024 action 2 | assert-visible-read-model; control #dashRuntimeTrendSparkline; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-024 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-025 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 0ca59be6094cc35801e427bd9386b18a1b06e65970e5b7c76f4c0dfef7f52675 |
| EVT-025 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-025 action 2 | assert-visible-read-model; control #dashRuntimeTrendSparkline; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-025 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-026 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 19d8923a7335f3e0f6eb64839032fe1e807fa8dd47f7ef8918022dca74b84d8d |
| EVT-026 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-026 action 2 | assert-visible-read-model; control #dashRootCauseList; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-026 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-028 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 0347e06c86f97e097da04ea7804d7f2bea45c318d2edefe6d4102b8ec9508769 |
| EVT-028 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-028 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-030 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 5f405b52bbbb1fd2349fb433964ff0596f77783f406dc15b0d1c4ecdc7763171 |
| EVT-030 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-030 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-031 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 295d14a788d58775ff846ae8202791eeb4574dec72ad995d4763b41c7deebe92 |
| EVT-031 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-031 action 2 | assert-visible-read-model; control [data-testid="ops-vlm-event-review-card"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-031 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-036 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 a95bffc1812bcd38360d34cd122a56c0fe99840ced7210822ab04e4976972037 |
| EVT-036 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-036 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-037 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 14598665c1ee24e0749557cd4e48e31c92fbda28d6cd7e29ac1f486a7a2326a6 |
| EVT-037 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-037 action 2 | execute-persisted-action; control [data-event-review-save]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-037 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-038 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 55bacd57959c6fbaafaeadac747b33d6e9d2a7993ec762e9640928d3dc61d784 |
| EVT-038 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-038 action 2 | execute-persisted-action; control #alertDeliveryDryRun; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-038 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-041 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 4ac8d8a0993355cbcf17a6d40f51ab9f9c4002698005fa492190d0a35063c0d1 |
| EVT-041 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-041 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-042 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 b67ae19c39ab09d16b02588614520faf7f3b5f2fa39254c231967a3873215ec6 |
| EVT-042 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-042 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-043 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 8f7b343addeecbf537263e22ab38035524de6a6bb37a6e29578ed9ba6a32d935 |
| EVT-043 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-043 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-044 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 229bfd73f6d9ab7b51a57e5608482b70e1ce71d14e1eee9987a4b6dd8e859d97 |
| EVT-044 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-044 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-046 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 244c201b5ab517cdada61bdcc6cd50c01ce0776080cf52665851690f38b29b1b |
| EVT-046 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-046 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-047 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 a68f3529eedd0e0d17cedf3016379ac2e30c3d18bf164a1dbb70792a70a17632 |
| EVT-047 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-047 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-048 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 8f6debaa378f69e1aa0be467efcc0af3ff3aa2bd5e7f7c7f677a6226e09f493c |
| EVT-048 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-048 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-049 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 e8f89a76e76ada991010057ca1ec3daeaf104bfea19b0521ca3c8b67a3962d0e |
| EVT-049 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-049 action 2 | select-control; control #eventRecordsEvidenceSelect; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-049 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-050 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 5a04511491a20b7cd6edc5dce7949dc1d4d8370292c3ea2b2839ba09fb5ffbc3 |
| EVT-050 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-050 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-051 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 5e65442a68cc6d70ded45a4e592aa936fe0d6a3ab079f5016d2b1936cd7e8053 |
| EVT-051 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-051 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-052 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 7aadea144a195b08a32133f090aa1634c3bbb3c025e340c472527a7d3b5dcccc |
| EVT-052 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-052 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-053 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 4fa78207549dcdcc128f980c5426d351f036993da4ccd5627e24193a84ae63bb |
| EVT-053 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-053 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-054 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 fdcad435fc6cb4482fd59ff5493bf3c49d8c624f0bc0b55475661062c6c94924 |
| EVT-054 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-054 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-055 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 4c7d996f5788d4a9005b4b064ea92be4cc41158c98cc9c0c6cee0c4fc2fcb8d0 |
| EVT-055 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-055 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-056 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 e13f946227d47a8412ce45ed6730edee1ad342ce1fdf0de888a7d08c0b0d36f4 |
| EVT-056 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-056 action 2 | assert-visible-read-model; control #opsApprovalGatedRuleDraftReadinessRows; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-056 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-057 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 dd37ed3ba1125e4089787a7656cd62244e926fc51c8265ab59d95c34fbe15cc3 |
| EVT-057 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-057 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-058 | /ops/dashboard → /ops/dashboard; operator; 390×844 light; exit0 | pass | SHA256 fc5f89ec606a6e3837942ffa3208954cba3840fc83beaba87c27b9f52a7251ca |
| EVT-058 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-058 action 2 | assert-visible-read-model; control #dashRuntimeTrendSparkline; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-058 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-061 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 170683143a81bdaa214d05e463c7ffc27b695b6658b117e6e9236b5da7620f00 |
| EVT-061 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-061 action 2 | execute-persisted-action; control [data-event-review-save]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-061 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-064 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 942ff0fccd01abb82b21eb3e0d6e08aaa1bfbdccfbb4b25937fcc0c76795245f |
| EVT-064 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-064 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-065 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 25de63d51bc9ae0066ee6a0d5ec999a627f3e23ec285940150cedb71e121f307 |
| EVT-065 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-065 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-066 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 e2d1bade51dfc7b99dffaceb27a55408ba79569bfd3ff7ae32035c465fdf4440 |
| EVT-066 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-066 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-067 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 dbfe9628b3cb182aad7add60eed459b13aae5a481fa9fa1a6f7d04ede7fc23cf |
| EVT-067 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-067 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-068 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 bbe2afc9b079fdab88a99a3463eb506408a4539bf7524ede698f2c633b60eef1 |
| EVT-068 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| EVT-068 action 2 | execute-persisted-action; control [data-event-review-save]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-068 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-069 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 792e147645e6d5b6d536b21808e57ed85f3957bbe3de4f5a533125671402bdf0 |
| EVT-069 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-069 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-070 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 53ec3e0e11b043d8a8873d4d9e4d0d2eebac8add3213c33afffa740540437631 |
| EVT-070 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-070 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-071 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 b09dc5f3a9a1cdb35f4133150616a24bc0f20cf5aa4a4302453c7d98083ab3f0 |
| EVT-071 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-071 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-072 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 04666e1bb08e7948644e23ce9bd607d826d9a7cbc1f29597342e41acf2f1fbf0 |
| EVT-072 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-072 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| EVT-075 | /ops/api/events/reviews → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 e99ce3f25b0099bc039a520b82e50810b026efa55ef7ebe91d0af779edf271af |
| EVT-075 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| EVT-075 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-001 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 0da88769498c50c36f4b3689f5da11a0d321bd6add8de76be1d02e2b9104b825 |
| CLIENT-001 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-001 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-002 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 e6451f9b82b21acb790e85a9fb43ef6f0ce48fb061becda1b3a9e1320cf1a5af |
| CLIENT-002 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| CLIENT-002 action 2 | activate-control; control [data-tile="0"] [data-action="toggle-playback"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-002 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-005 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 82428cca42b00be55990e6ace57c4ca0d9acb0bc83aac3936aa61ce635094e0c |
| CLIENT-005 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| CLIENT-005 action 2 | activate-control; control #liveAllStop; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-005 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-006 | /client/dashboard → /client/dashboard; viewer; 390×844 light; exit0 | pass | SHA256 aedf5d406d46f6ad39d58a59683f9519ea919204436fc27152eda07388506fb6 |
| CLIENT-006 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-006 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-007 | /client/events → /client/events; viewer; 390×844 light; exit0 | pass | SHA256 b95fc8c2c60ae4d0a1ed36afba1cd04cda55697e083a87237d48defe3a63684a |
| CLIENT-007 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| CLIENT-007 action 2 | assert-visible-read-model; control .client-viewer-events; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-007 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-009 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 72c16b3b203be23331c280e2721e4c13ac642160cb996b759021476656bf7a42 |
| CLIENT-009 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| CLIENT-009 action 2 | execute-persisted-action; control #liveSaveLayoutPreference; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-009 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-010 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 7cb6368c060e05a371b854d288020599b37953ff0efaca4211fb6cc6b4eea92b |
| CLIENT-010 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-010 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-011 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 e0dd94042af5771e5a04824315e67767a242c4b4eed6e6c6544728327a2ce816 |
| CLIENT-011 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-011 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-012 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 421a6240b4312f642b2a8b44963e9da9a5e4573b0e57c549cc793e4b0521a628 |
| CLIENT-012 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-012 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-013 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 6a00280128e412b86be7ee8f987fe9c9fb27e1ab32553485e0f2a516b9489ce0 |
| CLIENT-013 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-013 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-014 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 6b9060bb83878c224cd16c9ce8ace898b5556507c4d2f2b9b0ef81665584e6f0 |
| CLIENT-014 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-014 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-015 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 700453d4e659291072012bdefdfc6369c65f7a1ccc266c257760d6f07f0f83c3 |
| CLIENT-015 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-015 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-016 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 b191ee1fd76cf5747e9835d897e7821276cebd8a4b1f2acd82a7047a66055aec |
| CLIENT-016 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-016 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-017 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 d652738bb959ec410b3ccf0087d32629010ea41dd416d7ecbbd8c27e38eb8c3d |
| CLIENT-017 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-017 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-018 | /client/live → /client/live; admin; 390×844 light; exit0 | pass | SHA256 a92b33e108a130f14119beb19aacacf9f8f6666e1b61f7717c1ca6200130326d |
| CLIENT-018 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| CLIENT-018 action 2 | assert-visible-read-model; control .client-preview-redaction-strip; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-018 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-019 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 491255ec02e0a06c36469c01b40af31f28ae7c5ae5f89473f97986ae364a73eb |
| CLIENT-019 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-019 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-020 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 3703a4ec53febaefad2ee3378e70f140065695688ac42dfa76ebced8027336f6 |
| CLIENT-020 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-020 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-021 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 b71d2758d0d330f20f135b1b5aeb6dff1633e36368cded36e4f5041788fafbb0 |
| CLIENT-021 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| CLIENT-021 action 2 | activate-control; control [data-tile="0"] [data-mode-action="va-overlay"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-021 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-022 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 d966495bd6c8f0708177cc288d05e6ec046eb44a70b3f8d5a75d9d1539730bc9 |
| CLIENT-022 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-022 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-023 | /client/api/views/{id}/events → /client/events; viewer; 390×844 light; exit0 | pass | SHA256 bece3e84348cf29f2142651fcf65959a40c619b038082a15063c422e62497de6 |
| CLIENT-023 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| CLIENT-023 action 2 | assert-visible-read-model; control [data-testid="client-safe-incident-digest"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-023 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-024 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 a6c7ea9635fc73dcc9ae7897f34facd39e1b76c6f70f27ebeab337aabfc1b8e2 |
| CLIENT-024 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-024 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-025 | /client/events → /client/events; viewer; 390×844 light; exit0 | pass | SHA256 1d2c883c9931aabdf9480b457b213468bfe153a85fb3487f654e46b87dffaabe |
| CLIENT-025 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| CLIENT-025 action 2 | assert-visible-read-model; control [data-testid="client-safe-event-digest"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-025 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-027 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 8324e25b7487ae7ad001211507661d019201ccd458ac61e7b563f1d73e9bb3d6 |
| CLIENT-027 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| CLIENT-027 action 2 | assert-visible-read-model; control [data-testid="client-safe-resolution-digest"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-027 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-028 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 91e27cc101aec05960fa57f8a324632a7337b00f17538db73a512169d87ab2d3 |
| CLIENT-028 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| CLIENT-028 action 2 | assert-visible-read-model; control [data-testid="client-safe-source-status-digest"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-028 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-029 | /client/api/views/{id}/events → /client/events; viewer; 390×844 light; exit0 | pass | SHA256 c862ed422f25cf02ecae890716b543eeac890cb624f3057383026cdef22ec01b |
| CLIENT-029 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| CLIENT-029 action 2 | assert-visible-read-model; control [data-testid="client-safe-maintenance-digest"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-029 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-031 | /client/api/views/{id}/events → /client/events; viewer; 390×844 light; exit0 | pass | SHA256 e894a8f62e13cda9ce9f04076303b775a4a93f7ef18777a271a21d47913ce538 |
| CLIENT-031 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| CLIENT-031 action 2 | assert-visible-read-model; control [data-testid="client-impact-forecast"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-031 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-032 | /client/api/views/{id}/events → /client/events; viewer; 390×844 light; exit0 | pass | SHA256 ffb935857e928e152d67e7ab232babcd690e013a6c951d6d6bef66e50e76b461 |
| CLIENT-032 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| CLIENT-032 action 2 | assert-visible-read-model; control [data-testid="client-operations-notice"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-032 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-040 | /client/api/views/{id}/events → /client/events; viewer; 390×844 light; exit0 | pass | SHA256 efbd024a7271fe8002c9c62ada088b31249e8a79ab20137a2e91fb4bf364dabf |
| CLIENT-040 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| CLIENT-040 action 2 | assert-visible-read-model; control [data-testid="client-action-notice-preview"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-040 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-041 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 070aabc5f7b676a7a9c8a2d19cd0b13830b0b152f072c1b47dc9dd96c84c7585 |
| CLIENT-041 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-041 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| CLIENT-042 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 a117c54e927ac4da53da21f349eb5757bd9fc5ed624d91cebe18c5873b39becd |
| CLIENT-042 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| CLIENT-042 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| MEDIA-016 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 aea30c89893efa7e4f47630e0c7b1eae1ffc576f92f9e677236bae48a6143118 |
| MEDIA-016 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| MEDIA-016 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| MEDIA-017 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 27f547d3ef846ab4169f39b5b2883cd9ea3cc92abe8e78fbda365bc14f6e0433 |
| MEDIA-017 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| MEDIA-017 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-015 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 9ca9748f46da17138bf95a7560f2043a4d986dc26e320c8d796e89b6282e9fe8 |
| SAFE-015 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-015 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-016 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 5bf1a62199a4f25b0c8027c7a07d84dc0464032c66f35d06439d96d913593590 |
| SAFE-016 action 1 | navigate-negative; control 없음; completion 없음 | pass | 실제 action status PASS |
| SAFE-017 | /lab → /ops; operator; 390×844 light; exit0 | pass | SHA256 00856094972afe41eea92d3eb74e50a43b24789a05f0c7271e9771916e180142 |
| SAFE-017 action 1 | navigate-negative; control 없음; completion 없음 | pass | 실제 action status PASS |
| SAFE-018 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 cb8995dc6d4c0bdf0b2fddfdcdd433b355a8fa1a1b7998d5dd02adc70f34e099 |
| SAFE-018 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-018 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-019 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 81a8a0e3f221d87fe7c6471c65d4912fe79cf2ffe1d3d4a28f7db289d50453a5 |
| SAFE-019 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-019 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-020 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 01d633dec94c75e30a54cebb2b93194bee7d0949a6d6403fd465283d1228a1e5 |
| SAFE-020 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-020 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-021 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 14ca0a84cfa2a672ab8fb458fed911b4d871884967c2262922136c1aba5358ca |
| SAFE-021 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-021 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-024 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 e96c50e4cfa206f9b8056e9210b2bf7e1c0b531199e859e4861cec46436660d1 |
| SAFE-024 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-024 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-028 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 1e245c5a314d953fd8466b93c71447937fbccf4182847b535744856ffc01c996 |
| SAFE-028 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-028 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-031 | /client/live → /client/live; viewer; 390×844 light; exit0 | pass | SHA256 00917ce1a8ca7a851b5e74c83bd937fcc0220e1fe86d5d804e091d2bcf22e29c |
| SAFE-031 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-031 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-033 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 89e76d71d1ee3f4fdecb02c3f49c0977cd42fd7a814b05aa87d44d1e919756ee |
| SAFE-033 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-033 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-038 | /ops/rules → /ops/rules; operator; 390×844 light; exit0 | pass | SHA256 dd850d4112292886cd9835a57e6eadc129e3843d29cf8bf103e751a5cabd5d7e |
| SAFE-038 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SAFE-038 action 2 | activate-control; control [data-vlm-rule-draft-index]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-038 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-041 | /ops/api/audit → /ops/users; admin; 390×844 light; exit0 | pass | SHA256 d4830193e4ad4d496e19790e1795587e0c14cd93a4f89df22330ef9c5329a1ab |
| SAFE-041 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-041 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-042 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 193385f358e8e8abd4f5bff6688ac394f8fb5ebc9c83aafb9388b1094a993ab4 |
| SAFE-042 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-042 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-045 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 a33edbaeb9b1328899b4578a745055bddaa6e95d226ebd4b5369af812d51296c |
| SAFE-045 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-045 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-046 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 b98af5ae25362df749287f1152d72f2269033b90a68d9860b355d796ef67308d |
| SAFE-046 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-046 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-047 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 33946514d25f1d9f37488826054d7692676414b2e36ebc66d6a0cffb621cfc38 |
| SAFE-047 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-047 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-048 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 e0b28f603e3763e531ca88bbbe423c9c75e3932bf7821a29426112390d4684df |
| SAFE-048 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-048 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-049 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 d37631803a0ba4e0f5fdc8b2020e21df2c45b75272f8975a0216dc0ba916a436 |
| SAFE-049 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-049 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-050 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 2da58a65508ac8d5d88f236a2c3bc0bc5b2a659da27639aba780d077afd63dce |
| SAFE-050 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-050 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-052 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 39d2c5db669c47453f42c0f549378925ea6aa99978b554c70696723713f6f3f0 |
| SAFE-052 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SAFE-052 action 2 | fill-control; control #opsIncidentSearchInput; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-052 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-053 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 a1a8ea92ccb99596924be09e72584ae5a3de0275f5b3667cdd3dccbc21d487d8 |
| SAFE-053 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SAFE-053 action 2 | assert-visible-read-model; control [data-incident-rule-draft-route]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-053 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-054 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 48ef56d8bdfdc62b04075d03c0583a76fdb6b4169a7f7bd43cee25524dfca8c3 |
| SAFE-054 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-054 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-055 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 c3ecbd064a0ec2f0d8e4b3ce76b6cc972f219c6a75352205aeb5b77a690b3c6c |
| SAFE-055 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-055 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-056 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 2e7446ea505268a8ddf702361c0bc8d078ab0d4b091d33228110c8e4cdef0f1b |
| SAFE-056 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-056 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-058 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 6cc5fd6058f2f7b68d2fafeded5edc6fe93f56caaa48eea1ff132da24b067d82 |
| SAFE-058 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-058 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-059 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 264619ccdbc58cff08e15e95099d3ee2d927eb4f46c1cfbdfb7dc7f587e78440 |
| SAFE-059 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-059 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-060 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 94e9bd98fee87ebf562368bb25a30593b8a196df55e6cd2c6a1b71e6df6e9b7c |
| SAFE-060 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SAFE-060 action 2 | assert-visible-read-model; control [data-testid="ops-operational-action-pack"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-060 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-061 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 267275cbdf66bd0d8b878efd301b95738f44d3c603927ff6bd5f285727f54524 |
| SAFE-061 action 1 | wait-visible; control 없음; completion 없음 | pass | 실제 action status PASS |
| SAFE-061 action 2 | assert-visible-read-model; control [data-testid="ops-rule-what-if-preview"]; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-061 action 3 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-062 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 0e586d6da2cd2bec56c4f205a3ab94e6cc118d9f5f0b5cc813833802c4ffef7b |
| SAFE-062 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-062 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-065 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 94aafb2cf1e0694163ceb451122376cfca37d0440d20f7b1ba827c72490fe094 |
| SAFE-065 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-065 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-066 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 dd99a255ec1636c0ae0a432160f59925882101d9e4c2aea6717e11e8e721668e |
| SAFE-066 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-066 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-067 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 d15f8abeee8439dd2be26396d779da6be4447aefde609752bf6268808b239661 |
| SAFE-067 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-067 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-068 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 a6b937357d29181d3ee8221b41e1a7e7e51cb1850129ae75e6bae082184ab1bc |
| SAFE-068 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-068 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-069 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 7834921f357d6984dc46bc6bdcce54e65d13489ac14e7b3d605f07a1858449c8 |
| SAFE-069 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-069 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-098 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 6b38376b14444dffe893f11a4a6aaebd2e7558f029816a3c952c9a9ccd753cb6 |
| SAFE-098 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-098 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-104 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 0cd62d45e903e1c440d4d3980db30505cb5083004c7fd4d34b8bfaa6711b2e22 |
| SAFE-104 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-104 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-105 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 6c5eb5acd3b8dadd941ca1e4a84cf5e71dfc1295d9ad7fbd14da97b35597cdf0 |
| SAFE-105 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-105 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-106 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 0222e919162a48389a468459bf50e5bdc3ae2ea9de4d4da7d3e202d963139ba6 |
| SAFE-106 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-106 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-107 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 7aaf96e5b0f36f124a1567d3d194947b1d20102b500b4c45c0444f6334478d7e |
| SAFE-107 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-107 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-108 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 f94027488b9007f54e4b272f76a4824139d241a534b2c300bea4a3e906ece1b2 |
| SAFE-108 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-108 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-109 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 35a640b6b3ae7b431dea425faf25f3a810bfbcc05e0222a123c27ef3d90775ef |
| SAFE-109 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-109 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-110 | /client/api/views/{id}/events → /client/events; viewer; 390×844 light; exit0 | pass | SHA256 a5ed31f3bb26e95f60ea4f1b513c7d0e301b2ac165d078e2c86be9ddfc1876a1 |
| SAFE-110 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-110 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-111 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 b4bd8df1fc7b82f822b50da51b1d4f5b48eb5fa6e2bfdfeb34eb33215eb424b6 |
| SAFE-111 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-111 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-117 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 f17b3800a3ac08295f454a764a07ecbe26358bcceab0e692a8c662c434ec32cc |
| SAFE-117 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-117 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-118 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 abe8a76f0101e0ba4e916b0c844e6634fd69a89b03640b2a4ab5b296d1a9e589 |
| SAFE-118 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-118 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-119 | /client/api/views/{id}/events → /client/events; viewer; 390×844 light; exit0 | pass | SHA256 8be11339812bb3d4d64f98fc1895ae216acee9f1094c9dc18a16902722125124 |
| SAFE-119 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-119 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-121 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 d3419b8d4fd1d303279dc883a4cdd9bff29071eae70be86588f1b30f89da71e7 |
| SAFE-121 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-121 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-122 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 d26f89f307846482074feb7bcf778025adcd6d737bf99664c25cb89f2b3f7546 |
| SAFE-122 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-122 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-129 | /ops/sources → /ops/sources; operator; 390×844 light; exit0 | pass | SHA256 3a6fd49fb27545e3eb3aa76f7be0e289ca75c0b8df9f25e3bb5680a3caa8386c |
| SAFE-129 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-129 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-130 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 71f42dcc04f5a12dbf2caa6be2fda062db5e5f89e75647ec1852534a8c26c484 |
| SAFE-130 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-130 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-131 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 0b0efc68ec4878ca554afec42c294cd5a2288cebc585de5ff08699df460174de |
| SAFE-131 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-131 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-132 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 30ba351d77c178453361f7af688bbf4c8e6338a2e341924dc19bb3d708f799f4 |
| SAFE-132 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-132 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-138 | /ops/events → /ops/events; operator; 390×844 light; exit0 | pass | SHA256 0402236535feb0f74ae5c91ee6f459512b72b596a94beb07a4692e5e85d27032 |
| SAFE-138 action 1 | assert-product-boundary; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-138 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| SAFE-140 | /ops → /ops; operator; 390×844 light; exit0 | pass | SHA256 61caa042d8efc75654604e25ac00c55449efdb74be2170deaebfbe7f42d4345f |
| SAFE-140 action 1 | assert-product-state; control 없음; completion awaiting-independent-readback | pass | 실제 action status PASS |
| SAFE-140 action 2 | verify-independent-readback; control 없음; completion independent-readback | pass | 실제 action status PASS |
| preflight | stage PASS; exit 0 | pass | 미실행은 pass 근거 아님 |
| build | stage PASS; exit 0 | pass | 미실행은 pass 근거 아님 |
| feature-gates | stage not-run; exit 없음 | fail | 미실행은 pass 근거 아님 |
| server-longrun-30 | stage not-run; exit 없음 | fail | 미실행은 pass 근거 아님 |
| ui-environment-bootstrap | stage PASS; exit 0 | pass | 미실행은 pass 근거 아님 |
| ui-exact-424 | stage PASS; exit 0 | pass | 미실행은 pass 근거 아님 |
| ui-server-cleanup | stage PASS; exit 0 | pass | 미실행은 pass 근거 아님 |
| ui-fulltest-qualification | stage PASS; exit 0 | pass | 미실행은 pass 근거 아님 |
| longrun-120-decision | stage not-run; exit 없음 | fail | 미실행은 pass 근거 아님 |
| server-longrun-120 | stage not-run; exit 없음 | fail | 미실행은 pass 근거 아님 |
| cleanup | stage FAIL; exit 1 | fail | 미실행은 pass 근거 아님 |
| ui-final-integrity | stage FAIL; exit 1 | fail | 미실행은 pass 근거 아님 |
| report | stage PASS; exit 0 | pass | 미실행은 pass 근거 아님 |
| final-integrity | stage not-run; exit 없음 | fail | 미실행은 pass 근거 아님 |
| visual-UI-009-320-light | /ops/home; operator; 320×844 light; target [data-testid="ops-home-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 5e152429ed87175914df0437e10e9699a27dc2226fd0bd982abff168e87750f0; 전체UI 최종PASS 아님 |
| visual-UI-009-320-dark | /ops/home; operator; 320×844 dark; target [data-testid="ops-home-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 7e95112d877d1b7e9a29d26c5f4005094f5ef7be88218bb111b49b4d2dd4e08e; 전체UI 최종PASS 아님 |
| visual-UI-009-390-light | /ops/home; operator; 390×844 light; target [data-testid="ops-home-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 61021c051b55ca51764d42d20e8d1f500f43e22757616c9494703c32c74c0510; 전체UI 최종PASS 아님 |
| visual-UI-009-390-dark | /ops/home; operator; 390×844 dark; target [data-testid="ops-home-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 1b0934f4a80682c6824b63c267300a71951223edfe720f7f30a2095f87e8b4f1; 전체UI 최종PASS 아님 |
| visual-UI-009-760-light | /ops/home; operator; 760×844 light; target [data-testid="ops-home-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA ccc3bd9c7556be01c34a836a8ca7800880b3cb23cd027e20f8e7f81ff46b2c2f; 전체UI 최종PASS 아님 |
| visual-UI-009-760-dark | /ops/home; operator; 760×844 dark; target [data-testid="ops-home-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 87014fabd4ada221e2ac7f0d17b5784da07eb2c12ca12de5b6a1186ae2284a56; 전체UI 최종PASS 아님 |
| visual-UI-009-1180-light | /ops/home; operator; 1180×844 light; target [data-testid="ops-home-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA a67430ec2431ce59c516e470e903fd63bad16eb23f80a8a1f8974aeb63888fe8; 전체UI 최종PASS 아님 |
| visual-UI-009-1180-dark | /ops/home; operator; 1180×844 dark; target [data-testid="ops-home-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA a96811b58805fd468ea55c595cb6ae70f4fd9a0fd6e95b6375e2117b8da950ce; 전체UI 최종PASS 아님 |
| visual-UI-010-320-light | /ops/dashboard; operator; 320×844 light; target [data-testid="ops-dashboard-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 983c5a037fcb6befcba6a87bb2f0458905640cce33c9f544da830a7d2da11580; 전체UI 최종PASS 아님 |
| visual-UI-010-320-dark | /ops/dashboard; operator; 320×844 dark; target [data-testid="ops-dashboard-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 9a42f93686e751cc8e994c3e9a001438c04374357f6f036e757b844dd6b6d9f9; 전체UI 최종PASS 아님 |
| visual-UI-010-390-light | /ops/dashboard; operator; 390×844 light; target [data-testid="ops-dashboard-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 5361419154e860645b4d2683a96dbe168c07476ee126634b962c7f564730980c; 전체UI 최종PASS 아님 |
| visual-UI-010-390-dark | /ops/dashboard; operator; 390×844 dark; target [data-testid="ops-dashboard-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA b5166da9b9eb3b1a77021dd6ee37cf83a0330f5711acc56487a15d3407c56a79; 전체UI 최종PASS 아님 |
| visual-UI-010-760-light | /ops/dashboard; operator; 760×844 light; target [data-testid="ops-dashboard-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 92f0950fbed24daf5b3e7838f6db4f452b6e03a91c9454e4abec82b9e5966812; 전체UI 최종PASS 아님 |
| visual-UI-010-760-dark | /ops/dashboard; operator; 760×844 dark; target [data-testid="ops-dashboard-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 41d05a94df610a9c2bc98466c0c2000771cae595e1eb942c26ddb0c84df047ca; 전체UI 최종PASS 아님 |
| visual-UI-010-1180-light | /ops/dashboard; operator; 1180×844 light; target [data-testid="ops-dashboard-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA cb852a38cbaa89d205817e3a003c586cece69fd9abee8557afb8f12e7514628c; 전체UI 최종PASS 아님 |
| visual-UI-010-1180-dark | /ops/dashboard; operator; 1180×844 dark; target [data-testid="ops-dashboard-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 0d807c71fbc750f85d959661c0ed0ec0c5691488031a518fcc2e99c7ef917ac0; 전체UI 최종PASS 아님 |
| visual-UI-011-320-light | /ops/sources; operator; 320×844 light; target [data-testid="ops-sources-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA bcb5235d8ded6dadf550ed0e5895d1b10d1b7d0908114f2faa3432486e717e81; 전체UI 최종PASS 아님 |
| visual-UI-011-320-dark | /ops/sources; operator; 320×844 dark; target [data-testid="ops-sources-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 16e992f53b1ddd2a2341d0c15491e6a8c438fb72cc20633dfd2617aadab75193; 전체UI 최종PASS 아님 |
| visual-UI-011-390-light | /ops/sources; operator; 390×844 light; target [data-testid="ops-sources-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 59c9130cde73ed99bcf77e31539ab9e2508171c64e55d6f9318bd705eb6a7e94; 전체UI 최종PASS 아님 |
| visual-UI-011-390-dark | /ops/sources; operator; 390×844 dark; target [data-testid="ops-sources-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 3bbedfc7ccd422f63ca6d32b30a19ab514216631ad4bd389b8aad4d7299450a3; 전체UI 최종PASS 아님 |
| visual-UI-011-760-light | /ops/sources; operator; 760×844 light; target [data-testid="ops-sources-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 0c59ff448303f4b185b6c64377d554eb16558a832842a1da8637b91d82a51907; 전체UI 최종PASS 아님 |
| visual-UI-011-760-dark | /ops/sources; operator; 760×844 dark; target [data-testid="ops-sources-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 353d3fd1595d72bf4cbba5cf6324e43e23dc10cfee7c4f680a33fa3179c44d56; 전체UI 최종PASS 아님 |
| visual-UI-011-1180-light | /ops/sources; operator; 1180×844 light; target [data-testid="ops-sources-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 6318ee541537abff9583949b540112fc38c4985d858b683fcf2fefcc4a0f4b26; 전체UI 최종PASS 아님 |
| visual-UI-011-1180-dark | /ops/sources; operator; 1180×844 dark; target [data-testid="ops-sources-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 82d47572e2200420665b0a83b649586bca975afb6195fd7d5f732d1bde211b5f; 전체UI 최종PASS 아님 |
| visual-UI-012-320-light | /ops/rules; operator; 320×844 light; target [data-testid="ops-rules-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA e3657dfb855af577b596dde11d88ad6284b1bfed6cf8dec025a37d795ffb9e0f; 전체UI 최종PASS 아님 |
| visual-UI-012-320-dark | /ops/rules; operator; 320×844 dark; target [data-testid="ops-rules-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA ef247b909bbc8c4fab1c18517e428c6dac30fc3026e06bd1a21495bcee383b64; 전체UI 최종PASS 아님 |
| visual-UI-012-390-light | /ops/rules; operator; 390×844 light; target [data-testid="ops-rules-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 212d88ca123d3c0000434f66a44c773e6aa6dd6f62abd4bbfee035d0da5cf8a9; 전체UI 최종PASS 아님 |
| visual-UI-012-390-dark | /ops/rules; operator; 390×844 dark; target [data-testid="ops-rules-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 3cec7cefd655f95109311d4c9fd41b09ab51a2ba90fc3e598ea8a7fb3be79a88; 전체UI 최종PASS 아님 |
| visual-UI-012-760-light | /ops/rules; operator; 760×844 light; target [data-testid="ops-rules-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 2e91149cfd43ca305ad2b067601775e39dbc6fd6a17f3f5cf05c2c0c2610b3b2; 전체UI 최종PASS 아님 |
| visual-UI-012-760-dark | /ops/rules; operator; 760×844 dark; target [data-testid="ops-rules-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA f965b1c6e382dd34296e20db5660f9ff001612b526e02d7cca4dde1717d99412; 전체UI 최종PASS 아님 |
| visual-UI-012-1180-light | /ops/rules; operator; 1180×844 light; target [data-testid="ops-rules-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA d97685a41f5185986c233db88849a1eecab382328bd79927156e82309e158b08; 전체UI 최종PASS 아님 |
| visual-UI-012-1180-dark | /ops/rules; operator; 1180×844 dark; target [data-testid="ops-rules-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA c3a562def83c5279589edc9521dc7c3eee1bbb2e5658feeb3b2ff72b4cef8b7a; 전체UI 최종PASS 아님 |
| visual-UI-013-320-light | /ops/users; admin; 320×844 light; target [data-testid="ops-users-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 87379a751099137df0a12f127c6579e899757fac727ad6e08a1eb9648bbbc2b4; 전체UI 최종PASS 아님 |
| visual-UI-013-320-dark | /ops/users; admin; 320×844 dark; target [data-testid="ops-users-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA ddd9a95fa8e7b34078bcb4f6d5ec3607dfbf29a910e38f5ce1cb670133f18d47; 전체UI 최종PASS 아님 |
| visual-UI-013-390-light | /ops/users; admin; 390×844 light; target [data-testid="ops-users-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 65fb2b3eecb8fb8598a31f6b969ed0e96db32b04a73a720fbdc2ba15bc7be64d; 전체UI 최종PASS 아님 |
| visual-UI-013-390-dark | /ops/users; admin; 390×844 dark; target [data-testid="ops-users-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 0b8a2677b97a603213ae59e9e21c752e5d72530498b3f05057b5abaf04f6f0d0; 전체UI 최종PASS 아님 |
| visual-UI-013-760-light | /ops/users; admin; 760×844 light; target [data-testid="ops-users-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA a95dee1711bfeea422b041e7aebc232a556d5deef9ec87feccd0af12d8a3a713; 전체UI 최종PASS 아님 |
| visual-UI-013-760-dark | /ops/users; admin; 760×844 dark; target [data-testid="ops-users-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA f4c9a24fd0bc379c750198ccf229b4518326d1768695073179eb2b1f6181b3a8; 전체UI 최종PASS 아님 |
| visual-UI-013-1180-light | /ops/users; admin; 1180×844 light; target [data-testid="ops-users-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 2f60f5a633a8e60e9c7fc9bb880fb4477201d1ba3f2db556acfe9c587b7b4a76; 전체UI 최종PASS 아님 |
| visual-UI-013-1180-dark | /ops/users; admin; 1180×844 dark; target [data-testid="ops-users-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 5cc6a55ec8df1580e8d73ef2ac7ec106dc50a8a9b12e9f1861cc8a62d3edf8ce; 전체UI 최종PASS 아님 |
| visual-UI-014-320-light | /ops/events; operator; 320×844 light; target [data-testid="ops-events-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 8d9e9678474d253e80765fed0289708892010bc3b3b797436c9baa534abd1f99; 전체UI 최종PASS 아님 |
| visual-UI-014-320-dark | /ops/events; operator; 320×844 dark; target [data-testid="ops-events-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 6e036a905031c11cf7d6345a2e45955b091cbf5e1e6a2843dbaea5d35ec1381c; 전체UI 최종PASS 아님 |
| visual-UI-014-390-light | /ops/events; operator; 390×844 light; target [data-testid="ops-events-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 80a8d6e05938b715683fccf67b84facbb1ee4d43febcbf9340d0b4749c69a57c; 전체UI 최종PASS 아님 |
| visual-UI-014-390-dark | /ops/events; operator; 390×844 dark; target [data-testid="ops-events-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA b08c64f185111857ca62b8183d205658da1fe5e25d86c804983ee18609f2076f; 전체UI 최종PASS 아님 |
| visual-UI-014-760-light | /ops/events; operator; 760×844 light; target [data-testid="ops-events-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 393a49a3a082e3bef904698215e3b14a36b9a2707c05dc59a2038103427152ef; 전체UI 최종PASS 아님 |
| visual-UI-014-760-dark | /ops/events; operator; 760×844 dark; target [data-testid="ops-events-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA b26e6f6bc4259907b7bba0fd5b64386e0332d3737bb3bfd83bf3ca4e6c929f88; 전체UI 최종PASS 아님 |
| visual-UI-014-1180-light | /ops/events; operator; 1180×844 light; target [data-testid="ops-events-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA f926fb608db7e0bee23464ca13a59d5645687ba1e49dd7d34a65fd9c034fc077; 전체UI 최종PASS 아님 |
| visual-UI-014-1180-dark | /ops/events; operator; 1180×844 dark; target [data-testid="ops-events-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 5e03d965d4205141551f901ab9a7536a18d75d1a0495a846df47524639446078; 전체UI 최종PASS 아님 |
| visual-UI-022-320-light | /ops/vlm; operator; 320×844 light; target [data-testid="ops-vlm-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA b6454fa797db542728427f5cb203561c39b9ff442d9b4bd6c41680eb93bc50d2; 전체UI 최종PASS 아님 |
| visual-UI-022-320-dark | /ops/vlm; operator; 320×844 dark; target [data-testid="ops-vlm-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA b2c654191ec422e0cb0875d7ed55a79290b136ce446ae322960bfade95d40962; 전체UI 최종PASS 아님 |
| visual-UI-022-390-light | /ops/vlm; operator; 390×844 light; target [data-testid="ops-vlm-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 971fcccf4d20f96f8e80bee7b586e53556832804fc0dc7e58cf42b643d3ad598; 전체UI 최종PASS 아님 |
| visual-UI-022-390-dark | /ops/vlm; operator; 390×844 dark; target [data-testid="ops-vlm-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA bc3e8ac812016ff2b9760a9c7bed227f75dfbbbf6e56abf0a8bb20bb867528bc; 전체UI 최종PASS 아님 |
| visual-UI-022-760-light | /ops/vlm; operator; 760×844 light; target [data-testid="ops-vlm-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA ae37ca14389abf16d91d46672f6dfdd42057b5eb19bf727231d43679fa0ffea2; 전체UI 최종PASS 아님 |
| visual-UI-022-760-dark | /ops/vlm; operator; 760×844 dark; target [data-testid="ops-vlm-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA 63e6ca492f77dd5009ddc490b43207d3ac9c689e8d4544f0b8044bae973667b5; 전체UI 최종PASS 아님 |
| visual-UI-022-1180-light | /ops/vlm; operator; 1180×844 light; target [data-testid="ops-vlm-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA e5a93ae703f532dcb5cb40d4f8a8b99252a9ba9e74b5f39143e85281f10ef5f2; 전체UI 최종PASS 아님 |
| visual-UI-022-1180-dark | /ops/vlm; operator; 1180×844 dark; target [data-testid="ops-vlm-page"] > .ops-workspace-hero visible=true | pass | 실제 측정 완료; PNG SHA f360c9b30a64e321eb7d72784191c2a93da324719f31747a86d2d23fd831ebe1; 전체UI 최종PASS 아님 |
| visual-UI-015-320-light | /client/live; viewer; 320×844 light; target [data-testid="client-live-workspace"] .live-toolbar visible=true | pass | 실제 측정 완료; PNG SHA 37586bd531863d433738774a5febe87fa9d0fe989f2a70ed36df75cbe1e945b4; 전체UI 최종PASS 아님 |
| visual-UI-015-320-dark | /client/live; viewer; 320×844 dark; target [data-testid="client-live-workspace"] .live-toolbar visible=true | pass | 실제 측정 완료; PNG SHA e1c4eb9e0c1b22d6d47f2b58994a2a188e0de7aa8b78fd98457fa3bf3e7cd01d; 전체UI 최종PASS 아님 |
| visual-UI-015-390-light | /client/live; viewer; 390×844 light; target [data-testid="client-live-workspace"] .live-toolbar visible=true | pass | 실제 측정 완료; PNG SHA 0117add4f4cdd79d7dcb769d943f877c72282792c8c3c686975819a230306fe4; 전체UI 최종PASS 아님 |
| visual-UI-015-390-dark | /client/live; viewer; 390×844 dark; target [data-testid="client-live-workspace"] .live-toolbar visible=true | pass | 실제 측정 완료; PNG SHA ae9ccd2f432a8f83265fa7922bb3def381d5b1a827d6d9671c3631f18554f349; 전체UI 최종PASS 아님 |
| visual-UI-015-760-light | /client/live; viewer; 760×844 light; target [data-testid="client-live-workspace"] .live-toolbar visible=true | pass | 실제 측정 완료; PNG SHA 0bbb9d0f882a5b9872312be01d6dc035231c9f0707aea4a3dee6a8ef8990a4a4; 전체UI 최종PASS 아님 |
| visual-UI-015-760-dark | /client/live; viewer; 760×844 dark; target [data-testid="client-live-workspace"] .live-toolbar visible=true | pass | 실제 측정 완료; PNG SHA b7e2f96dd7f55b1058a5d89f91b18a861c2ba1a5b373002e27f0b04fa4f196c5; 전체UI 최종PASS 아님 |
| visual-UI-015-1180-light | /client/live; viewer; 1180×844 light; target [data-testid="client-live-workspace"] .live-toolbar visible=true | pass | 실제 측정 완료; PNG SHA fed2f788979194a6ff6cd4b9532c5a51523514faebbbf1ae5f7f9d9e3093d20c; 전체UI 최종PASS 아님 |
| visual-UI-015-1180-dark | /client/live; viewer; 1180×844 dark; target [data-testid="client-live-workspace"] .live-toolbar visible=true | pass | 실제 측정 완료; PNG SHA b04f71172c666c819ec0f376378e8aad4d02cbfde2bfba718f4f43f8b75b255d; 전체UI 최종PASS 아님 |
| visual-UI-016-320-light | /client/dashboard; viewer; 320×844 light; target [data-testid="client-dashboard-shell"] > .client-dashboard-head visible=true | pass | 실제 측정 완료; PNG SHA 3004a3ffb687af9b02a2a8cfb5f1f65a451e6d8e3f672ac29d6a55c9d2386476; 전체UI 최종PASS 아님 |
| visual-UI-016-320-dark | /client/dashboard; viewer; 320×844 dark; target [data-testid="client-dashboard-shell"] > .client-dashboard-head visible=true | pass | 실제 측정 완료; PNG SHA 75728b9b4a694bb71d84776a7b6783efdd809a40b26841b4225b625e22fa9bc9; 전체UI 최종PASS 아님 |
| visual-UI-016-390-light | /client/dashboard; viewer; 390×844 light; target [data-testid="client-dashboard-shell"] > .client-dashboard-head visible=true | pass | 실제 측정 완료; PNG SHA 725c3c3035a8b55e030f03d5405efd6e26e551def1f60428bcda17e87007902b; 전체UI 최종PASS 아님 |
| visual-UI-016-390-dark | /client/dashboard; viewer; 390×844 dark; target [data-testid="client-dashboard-shell"] > .client-dashboard-head visible=true | pass | 실제 측정 완료; PNG SHA 2b3b52e2e2c437115412fee723affd1b520ec17e9d80808707e9bdcec8e01600; 전체UI 최종PASS 아님 |
| visual-UI-016-760-light | /client/dashboard; viewer; 760×844 light; target [data-testid="client-dashboard-shell"] > .client-dashboard-head visible=true | pass | 실제 측정 완료; PNG SHA 819253e3e4aae31752d3186366c222e6876d951bf7e928202f80aa67c15eacc3; 전체UI 최종PASS 아님 |
| visual-UI-016-760-dark | /client/dashboard; viewer; 760×844 dark; target [data-testid="client-dashboard-shell"] > .client-dashboard-head visible=true | pass | 실제 측정 완료; PNG SHA 571cf18ed7f507ba825b811c813ba2766c5f084c5fccabf9a509b90886865975; 전체UI 최종PASS 아님 |
| visual-UI-016-1180-light | /client/dashboard; viewer; 1180×844 light; target [data-testid="client-dashboard-shell"] > .client-dashboard-head visible=true | pass | 실제 측정 완료; PNG SHA 21ab9b59e6c2f647307594e8a93feec79f06ca49be94929f55caf4de80a74430; 전체UI 최종PASS 아님 |
| visual-UI-016-1180-dark | /client/dashboard; viewer; 1180×844 dark; target [data-testid="client-dashboard-shell"] > .client-dashboard-head visible=true | pass | 실제 측정 완료; PNG SHA 047f96c8dc7c694b0d3955f1407b3edb76fa0b01a6325fbef064332dc1082e3e; 전체UI 최종PASS 아님 |
| visual-UI-017-320-light | /client/events; viewer; 320×844 light; target .client-viewer-events > .client-events-head visible=true | pass | 실제 측정 완료; PNG SHA 5bc46c0d7f3140f12795a424c22bc2bb9e420adc09c421b7a4c6509d92d420cf; 전체UI 최종PASS 아님 |
| visual-UI-017-320-dark | /client/events; viewer; 320×844 dark; target .client-viewer-events > .client-events-head visible=true | pass | 실제 측정 완료; PNG SHA d3c848a295963ce2342f2621b7d30ce27102bc0fbb6bac0b3ef82eff57c4ea27; 전체UI 최종PASS 아님 |
| visual-UI-017-390-light | /client/events; viewer; 390×844 light; target .client-viewer-events > .client-events-head visible=true | pass | 실제 측정 완료; PNG SHA b8c204f1577b084e65cc79260bd1ef44207f50f9f514eab64574759e2f28f63e; 전체UI 최종PASS 아님 |
| visual-UI-017-390-dark | /client/events; viewer; 390×844 dark; target .client-viewer-events > .client-events-head visible=true | pass | 실제 측정 완료; PNG SHA d6ba33e8de990c6cdf35e1f3faf0d2153b9870dcfb2bfb6af4a4196f184f1b3b; 전체UI 최종PASS 아님 |
| visual-UI-017-760-light | /client/events; viewer; 760×844 light; target .client-viewer-events > .client-events-head visible=true | pass | 실제 측정 완료; PNG SHA 8cac747fa7cefa880ae40c5c1528e251f0e490cb79a8f411a45429367f99d575; 전체UI 최종PASS 아님 |
| visual-UI-017-760-dark | /client/events; viewer; 760×844 dark; target .client-viewer-events > .client-events-head visible=true | pass | 실제 측정 완료; PNG SHA 845f9e392873a7c2d3df678320ff9372e318da90e9629d929abbd0fdb01c205e; 전체UI 최종PASS 아님 |
| visual-UI-017-1180-light | /client/events; viewer; 1180×844 light; target .client-viewer-events > .client-events-head visible=true | pass | 실제 측정 완료; PNG SHA 62853328b330c24b19b03cd120195b6429da40ec80cc4c2f2a2da7ab14a08590; 전체UI 최종PASS 아님 |
| visual-UI-017-1180-dark | /client/events; viewer; 1180×844 dark; target .client-viewer-events > .client-events-head visible=true | pass | 실제 측정 완료; PNG SHA 0d7a49ae1ef58da725347908da2a6ea685d074494245183f35a367b915c9d018; 전체UI 최종PASS 아님 |

독자: S09 검증 담당자. 수명: 실패 증거 보존. 정책은 AGENTS.md, 결과 색인은 release-test-records.md를 따른다.

명령: `./test_ui.sh`; exit 1; 시작1789104049523, 종료1789105578521; elapsed1528998ms(25분28.998초). 기준commit4ebd2cb2fc73dc1fea3d516cb03a05ec28a2df85.

개별424개 중423 pass/1 fail. UI 전체 FAIL. EVT-058의 REQUEST_LIFECYCLE_FAILED/RESPONSE_MISSING(object-112), 요청131/응답130. 주 action reviews200은 이 실패를 상쇄하지 않는다. 원인은 미확정. 최종 정합성은 기본 .media_server/recordings 파일4개 생성에 따른 final-source-end-drift/final-current-source-drift로 FAIL.

Policy v4 qualification, 녹화추가8개ID/31action 및 녹화전용120분 미실행. 개별 child PASS는 전체 UI 적격·시각검수 PASS가 아니다. token start/end/consumed: 미집계(정확한 실행경계 snapshot 없음); source: launcher와 child summary; elapsed는 launcher Date.now 차이.

## 단계

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| preflight | validate actual bundle inputs; exit 0 | pass | PASS; 미실행은 완료증거 불가 |
| build | ./server.sh build; exit 0 | pass | PASS; 미실행은 완료증거 불가 |
| feature-gates | ; exit null | fail | not-run; 미실행은 완료증거 불가 |
| server-longrun-30 | ; exit null | fail | not-run; 미실행은 완료증거 불가 |
| ui-environment-bootstrap | bootstrap acceptance-owned throwaway server/auth roles/Playwright storage-state; exit 0 | pass | PASS; 미실행은 완료증거 불가 |
| ui-exact-424 | ./server.sh run-v390-ui-native-exact-cases --output-dir <workspace>/.media_server.test/v4.1.0/ui-acceptance-current/runs/v390-test-acceptance-20260911052110-85870/ui-exact-424 --http-base http://127.0.0.1:55094 --role-state-map /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-RMsiLs/role-state-map.json --server-log /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-RMsiLs/media-server.log --runtime-descriptor /var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media_server_v390_ui-RMsiLs/runtime-descriptor.json --build-path build-gst-onnx/media_server; exit 1 | fail | FAIL; 미실행은 완료증거 불가 |
| ui-server-cleanup | stop exact UI throwaway server and verify ports; exit 0 | pass | PASS; 미실행은 완료증거 불가 |
| ui-fulltest-qualification | ; exit null | fail | not-run; 미실행은 완료증거 불가 |
| longrun-120-decision | ; exit null | fail | not-run; 미실행은 완료증거 불가 |
| server-longrun-120 | ; exit null | fail | not-run; 미실행은 완료증거 불가 |
| cleanup | validate child cleanup and preserved evidence; exit 0 | pass | PASS; 미실행은 완료증거 불가 |
| ui-final-integrity | validate canonical UI parent/424 children/Policy/current run/source/cleanup; exit 1 | fail | FAIL; 미실행은 완료증거 불가 |
| report | write acceptance summary/report; exit 0 | pass | PASS; 미실행은 완료증거 불가 |
| final-integrity | ; exit null | fail | not-run; 미실행은 완료증거 불가 |

## UI 전수

각 행은 원본 child summary와 policy input에서 추출. SHA는 child summary의 SHA256. 전체 UI 적격 증거로 재사용하지 않는다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| UI-001 | /; anonymous; 390×844 light;  → ; 1138ms | pass | child execution PASS; SHA ab0728551e341372586e385ee49e840ecaff50b2833aa847484acfedd99d646e |
| UI-002 | /setup; anonymous; 390×844 light; [data-testid="auth-setup-form"] → [data-testid="auth-setup-form"] button[type="submit"]; 2170ms | pass | child execution PASS; SHA e7aca72ba5c77b426b8fadbcfe639853e373e7b0a398d8d306db1b86759dbdee |
| UI-003 | /login; anonymous; 390×844 light; [data-testid="auth-login-form"] → [data-testid="auth-login-form"] button[type="submit"]; 2292ms | pass | child execution PASS; SHA 9d1a3d9f9551390a8986b4ef8dac1a682bdc8b7d98a4bed2e755af2cf9dafe05 |
| UI-004 | /password/change; operator; 390×844 light; [data-testid="auth-password-change-form"] → [data-testid="auth-password-change-form"] button[type="submit"]; 2694ms | pass | child execution PASS; SHA 8d51fe646db14a5c21cb69cd698388a402ca1e9e0afac4913f0f5010fe49a258 |
| UI-005 | /logout; operator; 390×844 light; [data-testid="auth-password-change-form"] → form[action="/logout"] button[type="submit"]; 2059ms | pass | child execution PASS; SHA 1ec5258b96ff712241f8586a3d2fd37a42bac22a95d9970ff16a666dd7be39c6 |
| UI-007 | /invite/setup; anonymous; 390×844 light; [data-testid="auth-invite-setup-form"] → [data-testid="auth-invite-setup-form"] button[type="submit"]; 2327ms | pass | child execution PASS; SHA ec543f3f57506776bd81251dc703203368095eda4d38f11c0c9b45cfd070e737 |
| UI-008 | /client/request-access; anonymous; 390×844 light;  → #request-form button[type="submit"]; 2011ms | pass | child execution PASS; SHA ea471f97d8357d54034128143aa088d1563ff5fef9916e1547cd6a7da504ff27 |
| UI-009 | /ops/home; operator; 390×844 light; [data-testid="ops-home-page"] → [data-testid="ops-home-page"]; 1709ms | pass | child execution PASS; SHA d7e7b59f1604c46420c1358d9d230bd74edbe69ed395f4f6676f5afd05db5890 |
| UI-010 | /ops/dashboard; operator; 390×844 light;  → ; 1830ms | pass | child execution PASS; SHA 71e86eb6f7c276b81c31e98e777b889e589383f968c8fd88e925a9f383cfafc1 |
| UI-011 | /ops/sources; operator; 390×844 light; [data-testid="source-reliability-search-metrics"] → [data-testid="source-reliability-search-metrics"]; 1827ms | pass | child execution PASS; SHA 4b73e0126eec75c0c47d69ddc9e3ca3e8e1a3ca70a81737904c5f4f3808e7334 |
| UI-012 | /ops/rules; operator; 390×844 light;  → ; 1688ms | pass | child execution PASS; SHA 3a8fbeb1af4391bfc2301e6a1c5744760b4a130db538cb5a3b3ea9879a000b6d |
| UI-013 | /ops/users; admin; 390×844 light;  → ; 1672ms | pass | child execution PASS; SHA 0d93d9c2e15b402e794828576f04e1b28b9d9546b70e4132c5c5580abf6c346c |
| UI-014 | /ops/events; operator; 390×844 light; #opsIncidentSearchInput → #opsIncidentSearchInput; 1964ms | pass | child execution PASS; SHA 420d4c27d46a6b5afb14daacdac580562a13dc60c1176198e8948a51b27e4452 |
| UI-015 | /client/live; viewer; 390×844 light; [data-testid="client-live-action-reduction"] → [data-testid="client-live-action-reduction"]; 1687ms | pass | child execution PASS; SHA 629c50d6d7c2f4f762f298afdbf2a8503ae7529f536dbb0a5282f34063fa59f4 |
| UI-016 | /client/dashboard; viewer; 390×844 light; [data-testid="client-dashboard-shell"] → [data-testid="client-dashboard-shell"]; 1711ms | pass | child execution PASS; SHA ea5cb9b1ea97b741fb12aa4dcf2ddce75c7f4f807ec5ae6b8d43d65833f02ff9 |
| UI-017 | /client/events; viewer; 390×844 light; .client-viewer-events → .client-viewer-events; 1628ms | pass | child execution PASS; SHA eed52bae4d26e8de4f522375387bf099d5bff120dcf497a4d1df86b03b9b4435 |
| UI-018 | /lab; operator; 390×844 light;  → ; 923ms | pass | child execution PASS; SHA 0810a3cc4ae388a2b662143348f4ccd2b945b27ee52565521f18220460e1aa24 |
| UI-019 | /ops; operator; 390×844 light;  → ; 1644ms | pass | child execution PASS; SHA 7e4409276b19a4add3d8cd0b0e612c3714a531593afd5926e6eb24b553885754 |
| UI-020 | /ops/dashboard; operator; 1440×900 light; .ops-workspace-diagnostic-grid → .ops-workspace-diagnostic-grid; 2014ms | pass | child execution PASS; SHA bdfa78d9ba5dd8f25dfcf4fd63bd8e41de84329dbff5f0ae9f314b02acbdb5e0 |
| UI-021 | /ops; operator; 390×844 light;  → ; 1684ms | pass | child execution PASS; SHA e7c33d241a8df32b4829db6a80177b062a449ffac8eac644d5eeb0ebfae71d48 |
| UI-022 | /ops/vlm; operator; 390×844 light; #opsVlmExternalTransferWarningAck → #opsVlmExternalTransferWarningAck; 1752ms | pass | child execution PASS; SHA 1861b016314d779c3c2719e1dcf14245b963a4b56a041f4dc3b34bc71c7b3993 |
| UI-023 | /ops/vlm; operator; 390×844 light; #opsVlmProfileEnabled → #opsVlmSaveProfile; 2789ms | pass | child execution PASS; SHA 73edc82c3909088325e755b535be9257f7e60ba45192b2c4a5d6ea0d1b1391db |
| UI-024 | /ops/vlm; operator; 390×844 light; #opsVlmPrivacyGuardList → #opsVlmPrivacyGuardList; 1849ms | pass | child execution PASS; SHA cf96446c5f56c9d500f75b9e9b920faabdb083695bc567443e5dd9a5920dc862 |
| UI-025 | /ops/vlm; operator; 390×844 light; #opsVlmDisabledReason → #opsVlmDisabledReason; 1978ms | pass | child execution PASS; SHA 54f8f170a66a54ae39a46bcdfadc0f1dac9700e38d8f59c54fed31634f453e09 |
| UI-026 | /ops/vlm; operator; 390×844 light; [data-vlm-option-id="local-qwen3-vl-4b"] → [data-vlm-option-id="local-qwen3-vl-4b"]; 1989ms | pass | child execution PASS; SHA a1be51a62a54c51be4712eed9efa891400c86c8f40272b6400a1781fd9f4a4d9 |
| UI-027 | /ops/vlm; operator; 390×844 light; #opsVlmRuntimeStatusList → #opsVlmRuntimeStatusList; 1790ms | pass | child execution PASS; SHA 67cbecaf455d32a04c6fb6bf2e5825008d3d09540e2d99ee3e6a8ea6312948e9 |
| UI-028 | /ops/vlm; operator; 390×844 light; #opsVlmProfileEnabled → #opsVlmProfileEnabled; 1980ms | pass | child execution PASS; SHA 443526efd30406aa7ed54982f0edc883bc160d5c3b4a5f060dbe87b03647ccce |
| UI-029 | /ops/vlm; operator; 390×844 light; #v320ActionReadinessChecklistGrid → [data-delete-vlm-profile="ui-029-review4-fixture"]; 3165ms | pass | child execution PASS; SHA b75f2037052a0af03b27efe26aa9eea97dcd159c797aad72f29350c87ba6df3a |
| UI-030 | /ops/vlm; operator; 390×844 light; #opsVlmEvaluationRows → #opsVlmEvaluationRows; 1745ms | pass | child execution PASS; SHA 842ee0c470bb067f8e2403f5e2e3953d934aecf88cd5aa32d1a42e2c56e758ff |
| UI-031 | /ops/vlm; operator; 390×844 light;  → ; 1762ms | pass | child execution PASS; SHA e86dee533395422277fd9ecd21c00e0d996fcc63c472234644a8ceb850036072 |
| UI-032 | /ops/events; operator; 390×844 light; #opsIncidentSearchInput → #opsIncidentSearchInput; 1947ms | pass | child execution PASS; SHA 2c75868a3a92981b0f9458f59cf3fd47f59270d281119ea1495e49cd0c18baaf |
| UI-033 | /ops/vlm; operator; 390×844 light;  → ; 1670ms | pass | child execution PASS; SHA 9b9410374b6ad73cb6e626beaffaa71eadf3cd0e3ac507f12a21b57593438f10 |
| UI-034 | /ops/vlm; operator; 390×844 light; #opsVlmEvaluationRows → #opsVlmEvaluationRows; 1750ms | pass | child execution PASS; SHA cdf7065e5f4763ed2964f18e3c37e3cae639e998c6e4a89093c6d275fe601e58 |
| UI-035 | /ops/events; operator; 390×844 light; #opsIncidentSearchInput → #opsIncidentSearchInput; 1982ms | pass | child execution PASS; SHA a8246887bd69c650ad007dd972af1037eae5c1f4bf45f59069c015a7c568ff91 |
| UI-036 | /ops/rules; operator; 390×844 light; #opsEventRuleIdInput → [data-vlm-rule-draft-index]; 2035ms | pass | child execution PASS; SHA 7760889e040fa0ddb4673d722b9598f41db14d095b202e2a1b0fd146e0c484ab |
| UI-037 | /ops/events; operator; 390×844 light;  → ; 1665ms | pass | child execution PASS; SHA 511711d49f7093205f8eb33761c347f383b29eea36fb40d457c2974d98b7d436 |
| UI-038 | /ops/events; operator; 390×844 light;  → ; 1686ms | pass | child execution PASS; SHA 817d0d476c9051ec199a8b5433b3e432a7fab806b6803395e8562ec57d1b8745 |
| UI-039 | /ops/events; operator; 390×844 light;  → ; 1686ms | pass | child execution PASS; SHA 3af7db5873bb9a19e967129d7cce0c30c3531473d174d6a5ea7fb68ce016e719 |
| UI-040 | /ops/events; operator; 390×844 light;  → ; 1705ms | pass | child execution PASS; SHA 2bbb1f650b0bb19e3e7bccfb2f821958f0c81fbbf3d4d18593b85c2b1e2a556e |
| UI-041 | /ops/events; operator; 390×844 light;  → ; 1685ms | pass | child execution PASS; SHA 4cefb4909501488e1803d6f0cee57da1ffa375803be0fb582f2776cbf8c2c550 |
| UI-042 | /ops/events; operator; 390×844 light;  → ; 1698ms | pass | child execution PASS; SHA e3c6fc0fc7c7ce227731254de2f08d10bb81c2a492b01d2668acf735156ab038 |
| UI-043 | /ops/events; operator; 390×844 light;  → ; 1666ms | pass | child execution PASS; SHA 0338d7e72a7ff6a44c4c25168c8ff551943123215f8b574c38ec42a866ee9529 |
| UI-044 | /ops/events; operator; 390×844 light;  → ; 1723ms | pass | child execution PASS; SHA 5c751f4a440b37c78d00fe315c46d20fe3eb6aa809ce2d154739fee1ba83bcf9 |
| UI-045 | /ops/events; operator; 390×844 light; #opsIncidentSearchInput → #opsIncidentSearchInput; 1936ms | pass | child execution PASS; SHA 0583bd45d24daa2c509cdd10546cee020984a026045f10bda4729946325daa5d |
| UI-046 | /ops/events; operator; 390×844 light; [data-incident-rule-draft-route] → [data-incident-rule-draft-route]; 2284ms | pass | child execution PASS; SHA e1b964c3fa79aeec7276a0735a3f55c4a8317f9bc5eeba3d5f3fc3e7c46bf806 |
| UI-047 | /ops/sources; operator; 390×844 light; [data-testid="source-backup-recovery-handoff"] → [data-testid="source-backup-recovery-handoff"]; 1757ms | pass | child execution PASS; SHA 92be3538ec6601054551a04d55bc31381eda342df9200986d0ad027584e7c485 |
| UI-048 | /ops/dashboard; operator; 390×844 light;  → ; 1886ms | pass | child execution PASS; SHA 55a9c7d96374b2143f131321ac90181125174e3ff3b472f6beb4c8e4ecb76b4a |
| UI-049 | /ops/rules; operator; 390×844 light; #opsScenarioBuilderType → #opsScenarioBuilderType; 1906ms | pass | child execution PASS; SHA aed2290c8c043be9d760ad4014b969c5f4e1b781f35978a231126881119058f3 |
| UI-050 | /ops/events; operator; 390×844 light;  → ; 1739ms | pass | child execution PASS; SHA 07f19f23a27e1a0daa58cd50d884c8eedb2d2aee0d1fda3c3697134c0803bac6 |
| UI-051 | /ops/events; operator; 390×844 light; #opsIncidentTriageBoardRows → #opsIncidentTriageBoardRows; 1755ms | pass | child execution PASS; SHA f227388cba744bd14753f200184555c6fbdf89994dd06ae65bb19d68e246c94a |
| UI-052 | /ops/events; operator; 390×844 light; [data-testid="ops-operational-action-pack"] → [data-testid="ops-operational-action-pack"]; 1780ms | pass | child execution PASS; SHA 8fc1d213d54a86f98c75d99f88c977bd108c34d545a27e058d7c63c106b016a3 |
| UI-053 | /ops/events; operator; 390×844 light; [data-testid="ops-rule-what-if-preview"] → [data-testid="ops-rule-what-if-preview"]; 1876ms | pass | child execution PASS; SHA a676725480607584539f8e66bcd0a6a1809f2e24e6c3665a0da2b5bc053fdb7f |
| UI-054 | /ops/events; operator; 390×844 light;  → ; 1680ms | pass | child execution PASS; SHA 9915ddca544b14f2567d2e7976381941ccc959c65f2d6f954d3f610a3b0ee7cc |
| UI-055 | /ops/events; operator; 390×844 light;  → ; 1684ms | pass | child execution PASS; SHA 388619cf7ef4008991ad5e890c579723a6d092346cbadbd39868d2fa172df8ef |
| UI-056 | /ops/rules; operator; 390×844 light;  → ; 1765ms | pass | child execution PASS; SHA ca2f230f8f6a13df2a032ced2ac78ab926e7c65c5545fdea46abe4564d3e5de0 |
| UI-057 | /ops/events; operator; 390×844 light;  → ; 1711ms | pass | child execution PASS; SHA 408aeba38bb070873264379fe1b5d8d40dc320f4a56f1040c292a44318d0b246 |
| UI-058 | /ops/events; operator; 390×844 light;  → ; 1701ms | pass | child execution PASS; SHA 3cf8cf440064bf5c3691b081a24a29b60606da7b42de4ff7f22ace1bb1a3edd4 |
| UI-059 | /ops/events; operator; 390×844 light;  → ; 1714ms | pass | child execution PASS; SHA b854a98ac03d417bf51e56cc75da641daee4d8350431bf87abeddf1fab4214cc |
| UI-060 | /ops/events; operator; 390×844 light;  → ; 1695ms | pass | child execution PASS; SHA ade6d8b76ca90714128f7ff0f2063bc1d50c27b2b350d4f9d3744b14668904d4 |
| UI-061 | /ops/events; operator; 390×844 light;  → ; 1676ms | pass | child execution PASS; SHA b68c604b1cbb61a0b33e8feb18b4c2018696e64df39bf75220d0f89101ce8734 |
| UI-062 | /ops/events; operator; 390×844 light; #opsV320ResolutionTimeline → #opsV320ResolutionTimeline; 1789ms | pass | child execution PASS; SHA 847873bb096dff7bde7ce4b386a2975f25ca5297e50043a9b778116d113140a8 |
| UI-063 | /ops/events; operator; 390×844 light;  → ; 1729ms | pass | child execution PASS; SHA bbd5d02f8f3decd1b7d71c342b172c55c835644ba9aa7fde396c0e516809c8da |
| UI-064 | /ops/events; operator; 390×844 light; #v320SourceReliabilityGrid → #v320SourceReliabilityGrid; 1806ms | pass | child execution PASS; SHA 60df23b528b73f225feefbdf186ff5e61b7bcb22d2337e3e173f5749c17bbbe8 |
| UI-065 | /ops/events; operator; 390×844 light; #v320AiReviewQualityGrid → #v320AiReviewQualityGrid; 1819ms | pass | child execution PASS; SHA eab136c6e92c72fc4d24d91703cfdbf1a520208ecb327e9cd859bf7ac3889600 |
| UI-066 | /ops/events; operator; 390×844 light; #v320OperatorResolutionFlowGrid → #v320OperatorResolutionFlowGrid; 1831ms | pass | child execution PASS; SHA fc1f40081107609da3f958b41ae0b9f69ff36932c1004b167889f9d6ce0119dc |
| UI-067 | /ops/events; operator; 390×844 light; #v320ActionReadinessChecklistGrid → #v320ActionReadinessChecklistGrid; 1801ms | pass | child execution PASS; SHA 2eb54e0921bb0df3a01ca2eccccc0aad03279840557fedcdff26238dbd7dd13c |
| UI-068 | /client/live; viewer; 390×844 light; [data-testid="client-safe-resolution-digest"] → [data-testid="client-safe-resolution-digest"]; 1786ms | pass | child execution PASS; SHA a3ebf043ba3e4c133861ebb7584cb11a35fb08a2a4304d9c383e87fdc48f8bb3 |
| UI-069 | /ops/events; operator; 390×844 light; #v320ResolutionSearchMetricsGrid → #v320ResolutionSearchMetricsGrid; 1802ms | pass | child execution PASS; SHA e4cc0d33d860b389430102bd137a930ea6093eff9075f5e91032dd8c33750db9 |
| UI-070 | /ops/events; operator; 390×844 light; #v330IncidentSourceCorrelationGrid → #v330IncidentSourceCorrelationGrid; 1809ms | pass | child execution PASS; SHA cafa9c285f97529ef4f02a26c132ec3fef85ed9efb45f576e4559852c35d1150 |
| UI-071 | /ops/events; operator; 390×844 light; #v330OperatorRecheckRecoveryQueueGrid → #v330OperatorRecheckRecoveryQueueGrid; 1796ms | pass | child execution PASS; SHA 78530106b2d6dd4202bc57ea1c2ae53595bd02d07848b3c0357b2af121cc7c21 |
| UI-072 | /client/live; viewer; 390×844 light; [data-testid="client-safe-source-status-digest"] → [data-testid="client-safe-source-status-digest"]; 1698ms | pass | child execution PASS; SHA dc80f05d609d4ff4a614cb6925224822765c6c4493bba8ce06f305fbe654c6c7 |
| UI-073 | /ops/sources; operator; 390×844 light; [data-testid="source-reliability-search-metrics"] → [data-testid="source-reliability-search-metrics"]; 1790ms | pass | child execution PASS; SHA fe51a186de3c74cdfc2ad3f52f58910279a90d476af54d2e6c5130f97b7d3fab |
| UI-074 | /ops/sources; operator; 390×844 light; [data-testid="source-backup-recovery-handoff"] → [data-testid="source-backup-recovery-handoff"]; 1815ms | pass | child execution PASS; SHA 4ac4d25f6bd130b26d160231e2ccc7fdc61425e8daef5fc57089c7ab3721e018 |
| UI-075 | /ops/sources; operator; 390×844 light; [data-testid="ops-continuity-drill-workspace"] → [data-testid="ops-continuity-drill-workspace"]; 1767ms | pass | child execution PASS; SHA 4c24ebea7c574f7699cea75571339814e776ea739b1720f92efd931173ff4642 |
| UI-076 | /ops/sources; operator; 390×844 light;  → ; 1721ms | pass | child execution PASS; SHA f6ae6958da33fa77505f4b8ed3fa8a4e9d0d6deba1847a8c243621e0922d399b |
| UI-077 | /client/live; viewer; 390×844 light; [data-testid="client-safe-maintenance-digest"] → [data-testid="client-safe-maintenance-digest"]; 1707ms | pass | child execution PASS; SHA 5a2620c77a91e69b81aa4e31c623695f1ff3e984d66453960db43a67b9e47f13 |
| UI-078 | /ops/sources; operator; 390×844 light;  → ; 1709ms | pass | child execution PASS; SHA 237d4f121a5ab437158d1beb2b2cc5ab4feb70baa453093dd8fe21b2368334b6 |
| UI-079 | /ops/sources; operator; 390×844 light;  → ; 1724ms | pass | child execution PASS; SHA aa0c877b7c7d5ad1d0974b37f19664d28fb3bf62a065c136c6aca902908149e8 |
| UI-080 | /ops/events; operator; 390×844 light; #v350IncidentCommandHandoffGrid → #v350IncidentCommandHandoffGrid; 1808ms | pass | child execution PASS; SHA f70ed0b156bde2f853b399e2bf28e6f57dc65b5c08327ba10a5f9c347de0bfa6 |
| UI-081 | /ops/dashboard; operator; 390×844 light;  → ; 1850ms | pass | child execution PASS; SHA 36ee0f8e6058f331dd583305fc88f03ef53a10f9210bb7ec2892fcb1e44e0c6e |
| UI-082 | /ops/dashboard; operator; 390×844 light;  → ; 1865ms | pass | child execution PASS; SHA 6c4db6a78ff617184694ed1b50a74feeb590f6c7e45d95de052cc08502c5e0bd |
| UI-083 | /client/live; viewer; 390×844 light; [data-testid="client-impact-forecast"] → [data-testid="client-impact-forecast"]; 1730ms | pass | child execution PASS; SHA 4350e3ade00955998251899fd0559f06d10c087d679462895865812d12ac71c6 |
| UI-084 | /client/live; viewer; 390×844 light; [data-testid="client-operations-notice"] → [data-testid="client-operations-notice"]; 1752ms | pass | child execution PASS; SHA c61b8e2e934d606d28c5c464d3050b50bf79385a0d389ab5f4e1f97a5e4620d9 |
| UI-085 | /ops/dashboard; operator; 390×844 light; #dashCommandWorkspaceExportBundleMap → #dashCommandWorkspaceExportBundleMap; 1874ms | pass | child execution PASS; SHA 1f43fdcfad02de0ad851254da3a53284209ccb6460960a5116ffc0f570d203f8 |
| UI-086 | /ops/dashboard; operator; 390×844 light;  → ; 1833ms | pass | child execution PASS; SHA 6387cb1acf28d0e5d0f4ea296d75c40c0e0b81b1c1fd96f6235a6dc62af3d6c9 |
| UI-087 | /ops/dashboard; operator; 390×844 light; #dashCommandWorkspaceVlmAssistedExplanation → #dashCommandWorkspaceVlmAssistedExplanation; 1935ms | pass | child execution PASS; SHA c384d411dedce190b72939278bd3ad36619f2998fb66f14726551689c3783e4a |
| UI-088 | /ops/dashboard; operator; 390×844 light; [data-v360-simulation-workspace-entry="simulation-route-family"] → [data-v360-simulation-workspace-entry="simulation-route-family"]; 1890ms | pass | child execution PASS; SHA 3741332238b105a9a00d674b3316878a0f8a8f23f129030da4b6202847edb16f |
| UI-089 | /ops/dashboard; operator; 390×844 light; #dashSimulationWorkspaceLedgerList > [data-v360-simulation-run-ledger-entry]:nth-child(2) → #dashSimulationWorkspaceLedgerList > [data-v360-simulation-run-ledger-entry]:nth-child(2); 1927ms | pass | child execution PASS; SHA d5d381e51db9586b69199c42d7a0e901669787754ff9e333f232b0f2c77138d4 |
| UI-090 | /ops/dashboard; operator; 390×844 light; #dashSimulationWorkspaceNoticePreviewList > [data-v360-client-notice-preview-entry]:first-child → #dashSimulationWorkspaceNoticePreviewList > [data-v360-client-notice-preview-entry]:first-child; 1928ms | pass | child execution PASS; SHA 731e791be1a5171a0269ab39967ec7fffd933704b8504f03c6ddb7ed5326650b |
| UI-091 | /ops/dashboard; operator; 390×844 light; #dashSimulationWorkspaceWhatIfReplayList > [data-v360-rule-va-what-if-replay-entry]:first-child → #dashSimulationWorkspaceWhatIfReplayList > [data-v360-rule-va-what-if-replay-entry]:first-child; 1950ms | pass | child execution PASS; SHA 86708e636ebb6f4d8d9dc780a311dc0a054591449924f8b9015d43afc431b195 |
| UI-092 | /ops/dashboard; operator; 390×844 light; #dashSimulationWorkspaceExportBundleList > [data-v360-simulation-export-bundle-entry]:first-child → #dashSimulationWorkspaceExportBundleList > [data-v360-simulation-export-bundle-entry]:first-child; 1913ms | pass | child execution PASS; SHA d025665ed0ae1cb9a7cf80077272108205b3d510080ff6c142456d88fcbbcb6d |
| UI-093 | /ops/dashboard; operator; 390×844 light; #dashSimulationWorkspaceFieldEvidenceAdapterList > [data-v360-field-evidence-simulation-adapter-entry]:first-child → #dashSimulationWorkspaceFieldEvidenceAdapterList > [data-v360-field-evidence-simulation-adapter-entry]:first-child; 1938ms | pass | child execution PASS; SHA b0c740d2218fad7593071640420fc87b5057e779ed250a51579e0cc6cce91277 |
| UI-094 | /ops/dashboard; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList > [data-v360-vlm-assisted-simulation-explanation-entry]:first-child → #dashSimulationWorkspaceVlmAssistedExplanationList > [data-v360-vlm-assisted-simulation-explanation-entry]:first-child; 1984ms | pass | child execution PASS; SHA ca7f4668dd3552a73bfab29fa601e24c3d4d413b83639c8a534b536c1d81feee |
| UI-095 | /ops/dashboard; operator; 390×844 light; #dashSiteOperationsSiteList > [data-v370-site-operations-workspace-entry]:first-child → #dashSiteOperationsSiteList > [data-v370-site-operations-workspace-entry]:first-child; 1972ms | pass | child execution PASS; SHA 39d81b33deb3a640da39a94bd746608f3401a1bcc6f25b18435e3c7c999e9e50 |
| UI-096 | /ops/dashboard; operator; 390×844 light; #dashSiteClientNoticePreviewList > [data-v370-client-notice-by-site-view-group-entry]:first-child → #dashSiteClientNoticePreviewList > [data-v370-client-notice-by-site-view-group-entry]:first-child; 1885ms | pass | child execution PASS; SHA 12d156a730a4f2ac8dca4ba71f0b19e1ef198347eb5eac4cdf4811eb964e1724 |
| UI-097 | /ops/dashboard; operator; 390×844 light; #dashSiteRuleVaWhatIfCandidateList > [data-v370-rule-va-what-if-by-site-entry]:first-child → #dashSiteRuleVaWhatIfCandidateList > [data-v370-rule-va-what-if-by-site-entry]:first-child; 1916ms | pass | child execution PASS; SHA a0d67ac06b22d9186c485775da72425305b8b86432dfcfad9f8cd91fc3d8a2ed |
| UI-098 | /ops/dashboard; operator; 390×844 light; #dashSiteFieldEvidenceAttachmentList > [data-v370-field-evidence-attachment-entry]:first-child → #dashSiteFieldEvidenceAttachmentList > [data-v370-field-evidence-attachment-entry]:first-child; 1969ms | pass | child execution PASS; SHA 4c779371db498ba9332d6162182812349b9ea2adbf4b412c50cd8476e213d6ae |
| UI-099 | /ops/dashboard; operator; 390×844 light; #dashSiteLimitedSafeExecutionPilotList > [data-v370-limited-safe-execution-pilot-entry]:first-child → #dashSiteLimitedSafeExecutionPilotList > [data-v370-limited-safe-execution-pilot-entry]:first-child; 1916ms | pass | child execution PASS; SHA 0682eaf11d923ab71269bfc715179742cb80e98ed4e415c778eb9cc290b07263 |
| UI-100 | /ops/dashboard; operator; 390×844 light; #dashSiteOutcomeReconciliationSourceList > [data-v370-outcome-reconciliation-entry]:first-child → #dashSiteOutcomeReconciliationSourceList > [data-v370-outcome-reconciliation-entry]:first-child; 1924ms | pass | child execution PASS; SHA 505d48073ca5766f7ed06efb5e429473f9411cb8b7a6ed9ee6b9655f923575aa |
| UI-101 | /ops/dashboard; operator; 390×844 light; #dashSiteExportHandoffBundleList > [data-v370-export-handoff-bundle-entry]:first-child → #dashSiteExportHandoffBundleList > [data-v370-export-handoff-bundle-entry]:first-child; 2027ms | pass | child execution PASS; SHA 37ff1948cc291f229838db7d2523b4a3f1d096115f662566c509106acefe6487 |
| UI-102 | /ops/dashboard; operator; 390×844 light; #dashActionControlRequestList > [data-v380-action-control-entry]:first-child → #dashActionControlRequestList > [data-v380-action-control-entry]:first-child; 1935ms | pass | child execution PASS; SHA a78dab8691494ce12ddf30625350a3158f05ac6c5af5754bf14ec61e9c46936a |
| UI-103 | /client/dashboard; viewer; 390×844 light; [data-testid="client-action-notice-preview"] .client-action-notice-item:first-child → [data-testid="client-action-notice-preview"] .client-action-notice-item:first-child; 1737ms | pass | child execution PASS; SHA 59139d4360a700090e6481249f16e01fa440c1477233d122297f54dcb1c6a243 |
| UI-104 | /ops/dashboard; operator; 390×844 light; #dashActionOutcomeSourceList > [data-v380-outcome-observer-entry]:first-child → #dashActionOutcomeSourceList > [data-v380-outcome-observer-entry]:first-child; 1937ms | pass | child execution PASS; SHA fa0d2925e58200e1595874f12cc3e196c6d7787cce4b90ecad38cdb5129ab315 |
| UI-105 | /ops/dashboard; operator; 390×844 light; #dashActionReceiptBundleList > [data-v380-action-receipt-entry]:first-child → #dashActionReceiptBundleList > [data-v380-action-receipt-entry]:first-child; 1937ms | pass | child execution PASS; SHA 9d37ac105e3d3200eb6355bd676d282b83d36d73b9acc11d92fbd03b8cbd9576 |
| UI-106 | /ops/dashboard; operator; 390×844 light;  → ; 1873ms | pass | child execution PASS; SHA 3cb684eb9393fce8ec14a91d27d18b68da8ba6df1798accd1a7a513f23a4eb65 |
| UI-107 | /ops/dashboard; operator; 390×844 light; #opsIncidentActionReadinessQueueRows → ; 1805ms | pass | child execution PASS; SHA b8c0df2ed66f7ac6345cc515f23d6a7b05ba986cdca5c82864c48457fd61da34 |
| UI-108 | /ops/sources; operator; 390×844 light;  → ; 1713ms | pass | child execution PASS; SHA a6a2ddc00ef819bc35fd84176ca4dab323a18685254778478294a70e822bec24 |
| UI-109 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 3023ms | pass | child execution PASS; SHA e95048ffc73cb70e98a7fe2db5408b018296f52c05f795c029d8915ad7e1753e |
| UI-110 | /ops/rules; operator; 390×844 light; #opsVlmRuleDraftBridgeStatus → #opsVlmRuleDraftBridgeStatus; 1851ms | pass | child execution PASS; SHA 8cba4b34a608be911f0c3f671cc274e864559c5618d24546cb7559b8160c4549 |
| UI-111 | /ops/vlm; operator; 390×844 light; #opsVlmExternalTransferWarningAck → #opsVlmExternalTransferWarningAck; 1725ms | pass | child execution PASS; SHA 1d59b945ec79df99b3b92461164fd7e0140fdcfa8b8d4a5f28e0fd3874e53f6f |
| UI-112 | /ops/sources; operator; 390×844 light;  → ; 1724ms | pass | child execution PASS; SHA a1075a306e46dc3c4d351d71a069fc9c60bd47222a48bc755c9649f94c8a5205 |
| UI-113 | /ops/dashboard; operator; 390×844 light; #dashActionExecutionDeferralList → #dashActionExecutionDeferralList; 1981ms | pass | child execution PASS; SHA b9294ad395576ae8006e2837cf3c2afc3266de43c06fa9544394c06c317c5eb3 |
| UI-114 | /ops/dashboard; operator; 390×844 light; #dashFieldEvidenceBridgeList → #dashFieldEvidenceBridgeList; 1944ms | pass | child execution PASS; SHA bed489bb2dbc60118379c0be22a3812ed88798cd012d141fa1007320b6a3d97a |
| UI-115 | /ops/dashboard; operator; 390×844 light;  → ; 1920ms | pass | child execution PASS; SHA 23586d0fe0e33fe3613698e2dd407cb981ade13f2735295081c9287136a9fce2 |
| AUTH-004 | /login; anonymous; 390×844 light; [data-testid="auth-login-form"] → [data-testid="auth-login-form"] button[type="submit"]; 2326ms | pass | child execution PASS; SHA dd46a051435eb2b432a5bbb2ac9d99d9b73bd423ea7c868cb0adafd92059c99d |
| AUTH-005 | /setup; anonymous; 390×844 light; [data-testid="auth-login-form"] → [data-testid="auth-setup-form"] button[type="submit"]; 2185ms | pass | child execution PASS; SHA 5560a4af789f0363885e03bd33f8e7940f4cb32774f3ce13bd440c9e77a2c736 |
| AUTH-006 | /setup; anonymous; 390×844 light; [data-testid="auth-setup-form"] → [data-testid="auth-setup-form"] button[type="submit"]; 2323ms | pass | child execution PASS; SHA b53d9afd6b02316b33d42036553e9c4294d02f5eeb75b246f9ad52434077569e |
| AUTH-007 | /login; anonymous; 390×844 light; [data-testid="auth-password-policy"] → [data-testid="auth-login-form"] button[type="submit"]; 2064ms | pass | child execution PASS; SHA 449f997c862b9617d1e9f6a9a4391f2ce9e4e7c116a8e16e18a3275f6d3b2fe9 |
| AUTH-012 | /ops/users; admin; 390×844 light;  → ; 1677ms | pass | child execution PASS; SHA 2f9b566be058c154b9b5a8aef52e924fe489a13c0f304da00c61fefd6ce8e283 |
| AUTH-013 | /ops/users; admin; 390×844 light;  → ; 1652ms | pass | child execution PASS; SHA 289de66181c3f9ebf6751e9463bcc750ec27152366e6f4040a3cd34500b5864e |
| AUTH-014 | /login; anonymous; 390×844 light; [data-testid="auth-login-form"] → #user-save-selected; 2238ms | pass | child execution PASS; SHA 8e971ed7ec90cbe1997530e5a7f9b94eb1bf5d649654a3fc27fe58ddcf9509fd |
| AUTH-015 | /invite/setup; anonymous; 390×844 light; [data-testid="auth-invite-setup-form"] → #invite-create-form button[type="submit"]; 2220ms | pass | child execution PASS; SHA ecd7b488890716f210d0ad7bb2d807757de27750d62bb5a5075d4631661ee65c |
| AUTH-016 | /ops/users; admin; 390×844 light;  → ; 1642ms | pass | child execution PASS; SHA 3769a9f805092b731d8d858c489531624a0b20e68ab638a11fbe9d4e3b24d2b8 |
| AUTH-018 | /ops/users; admin; 390×844 light;  → #user-save-selected; 2619ms | pass | child execution PASS; SHA 7add09253dd0766c0f38b49c173698dbebb3e18904e475dc5e3df22c40a48f47 |
| AUTH-019 | /ops/users; admin; 390×844 light;  → #user-save-selected; 2754ms | pass | child execution PASS; SHA 0a02372e65e31de41f53cdcdd6ee0163a6b48fd40f006d51f86a28fd75598c8c |
| AUTH-020 | /ops/users; admin; 390×844 light;  → ; 2931ms | pass | child execution PASS; SHA 4e2f8f67eb757dc193585659fcbfad45cbf1bc0ff274b74e80caf4dd4918799a |
| AUTH-021 | /ops/users; admin; 390×844 light;  → ; 1689ms | pass | child execution PASS; SHA 5707e5c2496ea9bed3dd12e8b5fdb333153390a8202f199e8618cbe4c1a6ac96 |
| AUTH-022 | /ops/users; admin; 390×844 light;  → ; 1674ms | pass | child execution PASS; SHA f99b435adc4112dbfddc5f8c52ee8c7b1a44f0b6eb9a7211c8c0b2db9cb53f1c |
| AUTH-023 | /ops/users; admin; 390×844 light;  → ; 1710ms | pass | child execution PASS; SHA 0413289cbb52f2111f776a74c424ff612cdb77293edbcac2cc4d941d62794f2e |
| AUTH-024 | /ops/users; admin; 390×844 light;  → ; 1646ms | pass | child execution PASS; SHA 21db8d4efb57c3c345047bca1a559daa339c19f95c318dffe53cffec8f468a5b |
| AUTH-025 | /ops/users; admin; 390×844 light;  → ; 1665ms | pass | child execution PASS; SHA 573768c804b79135d4df2dcc9ea2aef11cd9f3c296ee9469eeba5099555aefd2 |
| AUTH-026 | /ops/users; admin; 390×844 light;  → ; 1767ms | pass | child execution PASS; SHA 38aceb54fb994e55bf4e691faaa30b9f015baa69a18c254fb66764f8d911d587 |
| AUTH-027 | /ops/users; admin; 390×844 light;  → ; 1658ms | pass | child execution PASS; SHA 2f56ce8a2cc49c86ca3f19698458c7534cf52571876387cfe13178621817c4bb |
| AUTH-028 | /ops/users; admin; 390×844 light;  → ; 1749ms | pass | child execution PASS; SHA 4dc7130cb966cd60b47d57177161d6c911566b6a872d27434f799eb5731344b1 |
| AUTH-029 | /ops/users; admin; 390×844 light;  → ; 1666ms | pass | child execution PASS; SHA ac8df3c4708461c321556119153de1617f2b9cd6cb39ab23e004ff129ce36402 |
| AUTH-030 | /ops/users; admin; 390×844 light;  → ; 1664ms | pass | child execution PASS; SHA b52fcb924dd9ad398f5ad2cbccb14227d468d01ac96ab9efaf033d0aca387a03 |
| AUTH-033 | /invite/setup; anonymous; 390×844 light; [data-testid="auth-invite-setup-form"] → #invite-create-form button[type="submit"]; 2245ms | pass | child execution PASS; SHA e48b493e981330fc248221f2de0bc5a65891fcec634af8fdc3453daabb0144d5 |
| AUTH-034 | /invite/setup; anonymous; 390×844 light; [data-testid="auth-invite-setup-form"] → [data-testid="auth-invite-setup-form"] button[type="submit"]; 2345ms | pass | child execution PASS; SHA 3277479d29beb22bfbd00986982f91d1fb0fe0ffc282a378aaea722f57f9b0b2 |
| AUTH-035 | /invite/setup; anonymous; 390×844 light; [data-testid="auth-invite-setup-form"] → [data-testid="auth-invite-setup-form"] button[type="submit"]; 2464ms | pass | child execution PASS; SHA 8d41565ca18332be2ca4e3494711ae7aa7d58ccf6f6eeb4dc409a9de4660a845 |
| AUTH-036 | /login; anonymous; 390×844 light; #request-form → #request-form button[type="submit"]; 1983ms | pass | child execution PASS; SHA 037857007a17910dc927feae8601fcc6ed048a82dee55bd62a46ea71ab58d155 |
| AUTH-037 | /invite/setup; anonymous; 390×844 light; [data-testid="auth-invite-setup-form"] → [data-request-approve="auth-037-review4-fixture"]; 2638ms | pass | child execution PASS; SHA 5c1b12e7805a307606817c53e031423822563844ee79566d4f3937449b48f472 |
| AUTH-038 | /invite/setup; anonymous; 390×844 light; [data-testid="auth-invite-setup-form"] → [data-request-reject="auth-038-review4-fixture"]; 3130ms | pass | child execution PASS; SHA c852753aabc6d176d16c91cfc4da5c6d7e0bb6f4a2db45a096a2f4a02e9871f0 |
| AUTH-039 | /ops/users; admin; 390×844 light;  → #request-form button[type="submit"]; 2544ms | pass | child execution PASS; SHA 78ffa46433df682e69be203ef25649575c560a5af034cfbad872600c9bfacb77 |
| AUTH-040 | /ops/users; admin; 390×844 light;  → ; 1709ms | pass | child execution PASS; SHA 4149c49067e4140638ccb22fb87f1778e16741fc1635df6d451ec0aab34367ef |
| SRC-001 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 2889ms | pass | child execution PASS; SHA 4fbd736464256a6c3783f6ad8627a2fc580849b15cf01faffb988eecb5e55f77 |
| SRC-002 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 2876ms | pass | child execution PASS; SHA 9e6918c911af0959d1d0d70686a03f8300604caf4042bf9fe48d13b50a770f40 |
| SRC-003 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 2823ms | pass | child execution PASS; SHA 525434ffc0b67929b0b18c9f6514b5376763056e9b0208b3701a2e344400b4dd |
| SRC-004 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 2894ms | pass | child execution PASS; SHA a295aa5d3de170fe806dd64640f2bf228553070c19379dec9a082fba944b60ff |
| SRC-005 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 2958ms | pass | child execution PASS; SHA 0f3d781935c40273c9dd7448de830eafe9992d216bd03a1c6095c1de62fc7b4b |
| SRC-006 | /ops/sources; operator; 390×844 light;  → ; 1737ms | pass | child execution PASS; SHA 03af48cd14e58bd03183b587e8a5c2aff0065d1e8e7030e9ad0ad32148256a22 |
| SRC-007 | /ops/sources; operator; 390×844 light;  → ; 1760ms | pass | child execution PASS; SHA 6d91f32dd9fdb81d637bac655e1d37d396040a1be8820ec37db90e10fe4062f7 |
| SRC-008 | /ops/sources; operator; 390×844 light;  → ; 2895ms | pass | child execution PASS; SHA 2b8013dbec7c16c71255ece25f128b48a8d95b8ea4c9cba091bb5f8363997299 |
| SRC-009 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 3115ms | pass | child execution PASS; SHA a8262696e1ab020100303c5f93a48f19300f0e493e99791210578a71e732d022 |
| SRC-010 | /ops/sources; operator; 390×844 light;  → ; 3217ms | pass | child execution PASS; SHA b7e2efb764a4c2c22b5f1b606e1bb200663adb9f61ac2e55b444e3c9c2d8d6aa |
| SRC-011 | /ops/sources; operator; 390×844 light; #channelScopePolicy → ; 1673ms | pass | child execution PASS; SHA 220b6036a7752f21d48341713a54caef84a104d8e4147d0b360514f86980b159 |
| SRC-012 | /ops/sources; operator; 390×844 light;  → ; 1710ms | pass | child execution PASS; SHA 79115f053918b5f1c44182afecfa5dfab43a002f7ca2b300d77323d09cceeef6 |
| SRC-014 | /ops/sources; operator; 390×844 light;  → ; 1737ms | pass | child execution PASS; SHA 903b9d0e1bcf1af168fccee2ac06401ada8e731d4bf302fe8a7d201f40eee8ba |
| SRC-016 | /ops/sources; operator; 390×844 light;  → ; 1667ms | pass | child execution PASS; SHA ad3fddd61bdf0b5fd04a9399dac59f2a162adc6742939b6dcf2daffc1930da60 |
| SRC-017 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 2896ms | pass | child execution PASS; SHA 3fb53bc5ed83dd7306588fac97d00b535a800ee42a1166faf3d95ab64770b474 |
| SRC-018 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 3109ms | pass | child execution PASS; SHA a9ad775c0aaa6bd36182d711bb0d3d8281634ca58d575ea843311afa36943951 |
| SRC-019 | /ops/sources; operator; 390×844 light;  → ; 3155ms | pass | child execution PASS; SHA e109ea9f1f26978ef4575be712f74137b072168cf5c4dd8862f05f30952af05a |
| SRC-020 | /ops/sources; operator; 390×844 light;  → ; 1704ms | pass | child execution PASS; SHA 2cfbc4d53b8786843b2b3070c26efc8b9835bc60f7ceb355ecbb90134b8ee7cc |
| SRC-021 | /ops/sources; operator; 390×844 light;  → ; 1719ms | pass | child execution PASS; SHA 3058a0ec96af9b9169fa758178a5a5e304fcbf880b9acb924fce588777208089 |
| SRC-022 | /ops/sources; operator; 390×844 light;  → ; 1700ms | pass | child execution PASS; SHA e48ee90564482399f9ad52e5f7230db0c965a0c3758705658746974fe9775a57 |
| SRC-023 | /ops/sources; operator; 390×844 light;  → ; 1691ms | pass | child execution PASS; SHA 93616516b4bdcddf753b9767454ee27c9509ea6d823dc1d842698dc4046527ea |
| SRC-024 | /ops/sources; operator; 390×844 light; #add-channel → #add-channel; 2133ms | pass | child execution PASS; SHA 835a8265fe9f00748c0c68cd203c0f44474ca9f69b7d10cd491ca4b7aa731b59 |
| SRC-025 | /ops/sources; operator; 390×844 light;  → ; 1725ms | pass | child execution PASS; SHA 4aca0c3a12f444e4d6d902d2a3c27f9e2fbb3d8807ed7ffadc17bdcf23dca334 |
| SRC-026 | /ops/sources; operator; 390×844 light;  → ; 1713ms | pass | child execution PASS; SHA 082b841eca564daed826d0c93f409857c3d26b09a7d1788c363da54860caaba4 |
| SRC-028 | /ops/sources; operator; 390×844 light;  → ; 1704ms | pass | child execution PASS; SHA d01e2ed2f3ff807e74cacd59bec42641e55d9b94f27553d3c7ce98612fbbc5e2 |
| SRC-029 | /ops/sources; operator; 390×844 light;  → ; 1717ms | pass | child execution PASS; SHA 50c9049511f022ab53519fefe47d2688b50da79f35ef5d8f15a4c521c209e4ca |
| SRC-030 | /ops/sources; operator; 390×844 light;  → ; 1729ms | pass | child execution PASS; SHA 7077ef1d7a0887a9f1daa9e2b05bc522d0d30110b5d77ca679dff3066b31089d |
| SRC-031 | /ops/api/onvif/import-draft; operator; 390×844 light;  → ; 2134ms | pass | child execution PASS; SHA 65b45030dab1e2ae9f785b05df1e75c80a006713e2921cda5aebb2874c94c34e |
| SRC-032 | /ops/sources; operator; 390×844 light;  → ; 1697ms | pass | child execution PASS; SHA 0fc5d129cad3c53a85aca3905016d525ef8da819ac159de2adfed06c950122d2 |
| SRC-034 | /ops/api/source-registry/onboarding-quality; operator; 390×844 light;  → ; 1215ms | pass | child execution PASS; SHA 3a5da0871270b25f7f19990da7ff90f5d6134486c5615103093fd517fcae14a8 |
| SRC-035 | /ops/api/source-registry/reliability-timeline; operator; 390×844 light;  → ; 1180ms | pass | child execution PASS; SHA d3adc6a4863a49121cbde2fd2ebb2f733ce746163066a1d863c7aeb2eca7b326 |
| SRC-036 | /ops/api/events/reviews; operator; 390×844 light;  → ; 1201ms | pass | child execution PASS; SHA 8dc1f136f51c9dd13119bedbf61251da205a1d518ae562c84bd1154d0b013a6b |
| SRC-037 | /ops/api/events/reviews; operator; 390×844 light;  → ; 1129ms | pass | child execution PASS; SHA 12b900d2e55a87390e894c7779fd8b437df84c6369ed0e7925fc106bc1e705c3 |
| SRC-038 | /client/api/views/{id}/events; viewer; 390×844 light; [data-testid="${escapeHtml(testId)}"] → [data-testid="client-safe-source-status-digest"]; 1118ms | pass | child execution PASS; SHA 698fbee03441f0b4c43e0d86d6fafdce9fea62d491945face7401036b957187e |
| SRC-039 | /ops/api/source-registry/reliability-search-metrics; operator; 390×844 light;  → ; 1179ms | pass | child execution PASS; SHA 02fa977f72f14ab504d332e8ded157dc77e987045011896987b21c24f9c603c9 |
| SRC-040 | /ops/api/source-registry/backup-recovery-handoff; operator; 390×844 light;  → ; 1234ms | pass | child execution PASS; SHA 5db2183bc71c4e046acf20f5c046b85d624dfc544cfc2b7df07814ac59ac8f41 |
| SRC-065 | /ops/api/onvif/credential-provider-status; operator; 390×844 light;  → ; 1152ms | pass | child execution PASS; SHA 31418c0a0f5bbd30753f277281c14b807c7b015e1042acb4df81fa399a967228 |
| SRC-066 | /ops/sources; operator; 390×844 light;  → #channel-save-selected; 3071ms | pass | child execution PASS; SHA bc16707de8de3951bd34218256eadccb1d518f2e16bc28aebfbf48ee536ef334 |
| SRC-067 | /ops/sources; operator; 390×844 light;  → ; 1717ms | pass | child execution PASS; SHA ef47ec5d24df52e8585c85501a2d1e68c091d47a5a962c7edcca597a489a5c9f |
| SRC-068 | /ops/sources; operator; 390×844 light;  → ; 1698ms | pass | child execution PASS; SHA d959edae521485856fe4ca2a31a703c7b74830eb661a62b39297b8882a3b23f1 |
| RULE-001 | /ops/rules; operator; 390×844 light; #v320ActionReadinessChecklistGrid → #opsVaRuleRows > tr:first-child; 1174ms | pass | child execution PASS; SHA 99015c6b7b1b6cad5d209f99dbf39d5dc1b5fb95002e79bf673eddef45427d13 |
| RULE-002 | /ops/rules; operator; 390×844 light;  → #opsEventRuleRows > tr:first-child; 1179ms | pass | child execution PASS; SHA 5e5f3c57dea195a734cdc5142a06beba999756d5f23d3d3aa5a879805729ac2c |
| RULE-003 | /ops/rules; operator; 390×844 light; #v320ActionReadinessChecklistGrid → #opsProfileRows > tr:first-child; 1209ms | pass | child execution PASS; SHA 5775037fd80ee5d25fd2283778b0248efedbd63ac2bd74e42d10ff82dc348549 |
| RULE-004 | /ops/rules; operator; 390×844 light; #opsVaRuleIdInput → #opsRulesComposerSave; 4635ms | pass | child execution PASS; SHA deb09d0574369ebdf9435ac714f71a3b9202807c508b1ab135835ac816551c51 |
| RULE-005 | /ops/rules; operator; 390×844 light; #opsVaRuleTemplateSeedSelect → #opsRulesComposerSave; 4789ms | pass | child execution PASS; SHA bf2560579a8cf2f60d2754a9ada0b2b9bf706c832e70a67916de2f94d984ffc7 |
| RULE-006 | /ops/rules; operator; 390×844 light; #opsVaRuleTemplateSeedSelect → [data-ops-rule-action="delete-va"]; 3913ms | pass | child execution PASS; SHA 0d2fd957cefffa85379dc366dcdd948e9250320e210590025c0780641be8911e |
| RULE-007 | /ops/rules; operator; 390×844 light; #opsEventRuleIdInput → ; 1754ms | pass | child execution PASS; SHA 4b4955d74c3a6a58b086069f0ae83c3c5ed8b0a298481430d4cb6fca183487fa |
| RULE-008 | /ops/rules; operator; 390×844 light; #opsVaRuleTemplateSeedSelect → #opsRulesComposerSave; 4750ms | pass | child execution PASS; SHA e1f1f7ca452a7e56411e87e23a37428961f8f0e418ff57009f74f318e3c528f1 |
| RULE-009 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesValidationList; 1840ms | pass | child execution PASS; SHA c8443a5e788dab3ba8dc5576f0b89304177524424d6242f5db92f825f87d900d |
| RULE-010 | /ops/rules; operator; 390×844 light; #opsVaRuleTrackingSummary → #opsVaRuleTemplateSeedSelect; 3992ms | pass | child execution PASS; SHA 30a7c02d5ea2054f6fdd4a35e5cbefd3af5415c8362cc74123adf328d49ee81f |
| RULE-011 | /ops/rules; operator; 390×844 light; #opsVaRuleIdInput → #opsRulesComposerSave; 4706ms | pass | child execution PASS; SHA 231d75fc130f8a58f06e88e4f556bdae95127278681e9772eb048dbc9bc8c708 |
| RULE-012 | /ops/rules; operator; 390×844 light; #opsVaRuleIdInput → #opsRulesComposerSave; 4747ms | pass | child execution PASS; SHA 3e2e7cfbc9e672863d7d2e52574802604f1e909bb47f7afe7df4771191c6edc9 |
| RULE-013 | /ops/rules; operator; 390×844 light; #opsVaRuleGeometryMinimumText → #opsVaRuleGeometrySummary; 3624ms | pass | child execution PASS; SHA 9e78ab5fa7be17f7db1b68f8f4cca947521365cb98453c70cf18691da73c5d15 |
| RULE-014 | /ops/rules; operator; 390×844 light;  → ; 1754ms | pass | child execution PASS; SHA a9645685a5c6571fe3894c0cea4acac3e8efb4b56d2b67b860b6e2b1488b3b74 |
| RULE-015 | /ops/rules; operator; 390×844 light;  → ; 1786ms | pass | child execution PASS; SHA a0fe817379a97b5db963633c542ca9d18001ae87f798347342de4d71fa484499 |
| RULE-016 | /ops/rules; operator; 390×844 light;  → #opsRulesComposerSave; 4596ms | pass | child execution PASS; SHA 51ca081cf2a38494fa258fd9dbc1f5474275b98dd24cd9cb620c76fb0934a379 |
| RULE-017 | /ops/rules; operator; 390×844 light; #opsEventRuleIdInput → #opsEventRuleIdInput; 1798ms | pass | child execution PASS; SHA 4f98966c0f3db22ef19786fe9cbaf8dd002e16cf440cc5ce8f4ea249c6e1addd |
| RULE-018 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSelect → #opsRulesComposerSave; 4645ms | pass | child execution PASS; SHA acaa8250b926754b6987037b281d53c687ec7951e40208cb2cc19e487d57f708 |
| RULE-019 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4717ms | pass | child execution PASS; SHA adbe07ed38bcf89477f57fc22c3c4743f4c5eab11aa560e0b1fafe6c78a0ec56 |
| RULE-020 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → [data-ops-rule-action="delete-event-template"]; 3938ms | pass | child execution PASS; SHA 3003067372f0ad2d7979b7b70ebe9e0c702bca2529c9034aec25e6e35d315b69 |
| RULE-021 | /ops/rules; operator; 390×844 light; #opsEvidenceIntakeFieldReadinessRows → #opsEventRuleDetailSummary; 2838ms | pass | child execution PASS; SHA 06133baa82ccdca50dad6a365fff3fc8e528b6f24429e15f589681101018079d |
| RULE-022 | /ops/rules; operator; 390×844 light; #opsVaRuleReidSelect → #opsRulesComposerSave; 4633ms | pass | child execution PASS; SHA 41b372c704b91efa575cd6f8d54001d916fd241cb7d52fe411f7d39f9abcad82 |
| RULE-023 | /ops/rules; operator; 390×844 light; #opsVaRuleIdInput → #opsRulesComposerSave; 4699ms | pass | child execution PASS; SHA 246343dde9d9d3c365ad43304b0c6e73636dfed2dd0c005b95565c0a01eed2ee |
| RULE-024 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → [data-ops-rule-action="delete-profile"]; 3933ms | pass | child execution PASS; SHA 5c773f31a8f0a860921b6693eb4bf1d16d84a3061809662855cc7b1742c30a13 |
| RULE-025 | /ops/rules; operator; 390×844 light; #opsEventRuleIdInput → ; 1790ms | pass | child execution PASS; SHA 6ca7afddafecef3272a13b52e69d53f8ab3373611fb3503b70c9de221665a804 |
| RULE-026 | /ops/rules; operator; 390×844 light; #opsProfileDetectorSelect → #opsRulesComposerSave; 4760ms | pass | child execution PASS; SHA ea0dbb78bd9bf260aa0f6b4a249da952809c07b0203282d46534bfc740c1a9f0 |
| RULE-027 | /ops/rules; operator; 390×844 light; #opsProfileDetectorSelect → #opsRulesComposerSave; 4714ms | pass | child execution PASS; SHA 816d606e35f986be96efb20275db7ada84bfc278d7540121d4cff86706feea75 |
| RULE-028 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4700ms | pass | child execution PASS; SHA 014da2bbff2cf4ed5b5d173e641cc50a602747b118468c543f2006b68640ae70 |
| RULE-029 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4777ms | pass | child execution PASS; SHA 51d24974df84f11d9bb809745667c87b1338921d170943be38358f0cc9745c3c |
| RULE-030 | /ops/rules; operator; 390×844 light; #opsEventRuleIdInput → #opsRulesComposerSave; 4736ms | pass | child execution PASS; SHA 3b7bb8561e54ccce5bc8bc9c1faa5a66e93b7dddc88db6703be2e0d0a3386fb6 |
| RULE-031 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4755ms | pass | child execution PASS; SHA 43e6ca6837e3fe7a5e68605168571b077aa30632af54fda38631c89c3b43dee3 |
| RULE-032 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4768ms | pass | child execution PASS; SHA e6a0720bb5ac2aff36fe3ceb7fa00c46b8877a12d9e3b0fbb5055cbd0fac9658 |
| RULE-033 | /ops/rules; operator; 390×844 light; #opsEventRuleModeSelect → #opsRulesComposerSave; 4775ms | pass | child execution PASS; SHA beb098668025659c5bd33b1d99a7d4621c8f6891756668ad78af18adf569683a |
| RULE-034 | /ops/rules; operator; 390×844 light; #opsVaRuleTrackerSelect → #opsRulesComposerSave; 4729ms | pass | child execution PASS; SHA ef948be83d4f266d726862671bbb20cd51899f70a0e92852ae969fc4ad8b4c20 |
| RULE-035 | /ops/rules; operator; 390×844 light; #dashIncidentTimeline → #opsRulesComposerSave; 4716ms | pass | child execution PASS; SHA e7ee562c9e474696e02c7c1c5aebc5f4832dffc20bc03a31fdac61c7125309a9 |
| RULE-036 | /ops/rules; operator; 390×844 light; #opsVaRuleTrackerSelect → #opsRulesComposerSave; 4748ms | pass | child execution PASS; SHA cec7f802b109b5e244d73ccbabf50bd14b92857515af5809b1a1bf4e73775ccc |
| RULE-037 | /ops/rules; operator; 390×844 light; #opsVaRuleTrackerSelect → #opsRulesComposerSave; 4676ms | pass | child execution PASS; SHA 469c86338dec41c7f0cd38697caa830afa50fbd7ac3633f760c1dc27993159d0 |
| RULE-038 | /ops/rules; operator; 390×844 light;  → #opsRulesComposerSave; 4712ms | pass | child execution PASS; SHA 14f8f3bc94ce641c70824ea332bd0342f44a932744fb15dd89143aba35dff118 |
| RULE-039 | /ops/rules; operator; 390×844 light; #opsVaRuleTrackerSelect → #opsRulesComposerSave; 4725ms | pass | child execution PASS; SHA 9ae0fe3efb19909d4c08275891892cff34d3a6588ce027f3302713a0896738d6 |
| RULE-040 | /ops/rules; operator; 390×844 light; #dashReidAssistDecisionList → ; 1763ms | pass | child execution PASS; SHA e61296d0b954cc542466ae15505159fe0b9a54e0f8c7da429aaa7633c638fa51 |
| RULE-041 | /ops/rules; operator; 390×844 light; #dashRootCauseList → #opsRulesComposerSave; 4764ms | pass | child execution PASS; SHA f2fe1efdb7039906b42d255861fc16ff993884c839a4587a83f182cacfcf0b62 |
| RULE-042 | /ops/rules; operator; 390×844 light; #dashRootCauseList → #opsRulesComposerSave; 4684ms | pass | child execution PASS; SHA aeb1e79c0f5f4373669390742ff01d7b61965db1d2695afe43bae3b41751d34a |
| RULE-043 | /ops/rules; operator; 390×844 light; #dashRootCauseList → #opsRulesComposerSave; 4772ms | pass | child execution PASS; SHA bb4b0a3ee183a3993d7509e54eab05ad9d3fc2d8a624ba6d29b85b31ce1dc2a8 |
| RULE-044 | /ops/rules; operator; 390×844 light;  → #opsRulesComposerSave; 4708ms | pass | child execution PASS; SHA 81c8ac4138912d8b43794f68be9706f1ec0acb580e62d3c8c1dd87e0ca1f5f48 |
| RULE-045 | /ops/rules; operator; 390×844 light; #opsScenarioBuilderClasses → #opsRulesComposerSave; 4678ms | pass | child execution PASS; SHA aca93f6177dc8056d2fb2444da610d8eb792928a60c39bf96443482683f71de9 |
| RULE-046 | /ops/rules; operator; 390×844 light; #opsEventRuleTriggerDirectionSelect → #opsRulesComposerSave; 4722ms | pass | child execution PASS; SHA fb06a87d4294ef7e4fd98278fc0204a3bbcca2a227c10ee89757332acd735d57 |
| RULE-047 | /ops/rules; operator; 390×844 light; #opsScenarioBuilderClasses → #opsRulesComposerSave; 4766ms | pass | child execution PASS; SHA e054abd3ef4e17db0751c8f73347880f76039091d2f7197253c64c847525dc2e |
| RULE-048 | /ops/rules; operator; 390×844 light; #opsEventRuleTypeSelect → #opsRulesComposerSave; 4766ms | pass | child execution PASS; SHA 921a367b6d0f9c2f0722b9d1a7952309ca9d87681de860661ab276ecc6260f36 |
| RULE-049 | /ops/rules; operator; 390×844 light; #opsScenarioBuilderType → #opsRulesComposerSave; 4799ms | pass | child execution PASS; SHA b38903ba679dec233657f4348c7bb265872cf2eb2e91e88aa636a214ff3c408e |
| RULE-050 | /ops/rules; operator; 390×844 light; [data-testid="ops-scenario-builder"] → #opsRulesComposerSave; 4732ms | pass | child execution PASS; SHA 334647b811d0aff5a93787b17da21d66af08e10e96d76eb23ab807f7e54faf60 |
| RULE-051 | /ops/rules; operator; 390×844 light; #opsEventRuleSettingsHeading → #opsRulesComposerSave; 4715ms | pass | child execution PASS; SHA fb29412fc3b74fdacc047d2bd7f0281242026ee74bd3ac688a78c3ab001ff419 |
| RULE-052 | /ops/rules; operator; 390×844 light; #opsScenarioBuilderType → #opsRulesComposerSave; 4761ms | pass | child execution PASS; SHA 24a6b6166027095e110cbb960138e4ca604d9b758900c9363360972445e7ad93 |
| RULE-053 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4734ms | pass | child execution PASS; SHA 5ab4f9634a65e3123590af8daf994856787512761b6ef4700662ced5dbd2feda |
| RULE-054 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4748ms | pass | child execution PASS; SHA 728a544bb21c3b3a4c1811ea7e1defa38cd1bc1c40509afed164d70e9992e9dd |
| RULE-055 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4758ms | pass | child execution PASS; SHA fadb7894212810cf8fe7407def83c68ff1e8f13a36d1fd77071312196578c300 |
| RULE-056 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4729ms | pass | child execution PASS; SHA 79942ba215ec41e3d830db8df02a3e466f4d6fe6da9faff44a95f7e3ea84e64d |
| RULE-057 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4709ms | pass | child execution PASS; SHA 9bda9ea8548b9271b55e3f34e36d149ff80650d07ea1279120350fa2dad85797 |
| RULE-058 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4808ms | pass | child execution PASS; SHA fd863294ede7ae98f31553c074eb6f87b34cfbf4a4396843a6e01373f91ea5dc |
| RULE-059 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4723ms | pass | child execution PASS; SHA 470f9e26c4244a66e7852adc74f070ed091a210d89b0216265bfedfd5cb9e4aa |
| RULE-060 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4762ms | pass | child execution PASS; SHA 7c5b29416b44585b12ad171a0de7827f1ee9fe9e1578dcf1952ef0507fe81c2f |
| RULE-061 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4775ms | pass | child execution PASS; SHA 6b5e677de10f18c50552dd59dc5271819f0305b29f109706c0873406535efbe8 |
| RULE-062 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4681ms | pass | child execution PASS; SHA ba45f39d5581f41baf4e84d6a807a64bb9750011e5478fc435b09fe52ba697cd |
| RULE-063 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4792ms | pass | child execution PASS; SHA d7988e28d7abac4f79c8f1450dbbd3161597b22efbb6c34fe756156892b702dd |
| RULE-064 | /ops/rules; operator; 390×844 light; #dashSimulationWorkspaceVlmAssistedExplanationList → #opsRulesComposerSave; 4737ms | pass | child execution PASS; SHA 7db8429e010dab1ce27b76dfabd1162d165bfab4c34cfd1af9c5aa2c15c7ffe6 |
| RULE-065 | /ops/rules; operator; 390×844 light; #dashVaQualityFilterInput → #opsRulesComposerSave; 4717ms | pass | child execution PASS; SHA 47a45f882fb29d0b5b5468c8f6d015c298642d10c4ab7579bacef3aac7eaf0c0 |
| RULE-066 | /ops/rules; operator; 390×844 light; #opsEventRuleTypeSelect → #opsRulesComposerSave; 4752ms | pass | child execution PASS; SHA 139a7e8bbea8ecb1099b40739429df40d952f1ecb373cea862c37e49d52afed0 |
| RULE-067 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4731ms | pass | child execution PASS; SHA e5185b33064cbfc4edf8e8a2ff753fa667ea7da81503d79de196238e4034598a |
| RULE-068 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4767ms | pass | child execution PASS; SHA 57c3751e487f0be8d4381b54f331200fc428870806df114ecb4ee28111fc97d2 |
| RULE-069 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4834ms | pass | child execution PASS; SHA 8f3b599191439bfb5b368cacfb903940c4902fc288851f2b6b53afcbbbc5bfda |
| RULE-070 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4795ms | pass | child execution PASS; SHA b52f0212798c666eb0c15b45e851975814c08d16ea9d15fc0e637dcf9070e2ee |
| RULE-071 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4771ms | pass | child execution PASS; SHA e47f9e0d0724f1c8ca7f537560b889afa03c4fe5b3e4c6a78ed10bd47417cb36 |
| RULE-072 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4746ms | pass | child execution PASS; SHA 9ee15bb7e3381c2904538e7843f54d2ce3525b3840e55282c2e0aeb790da10b6 |
| RULE-073 | /ops/rules; operator; 390×844 light; #opsRulesComposerSave → #opsRulesComposerSave; 4821ms | pass | child execution PASS; SHA 6c44b81780b962b6e91690e8b56c776be13ae8c7c38b3b3baa23ed868ffe1389 |
| RULE-074 | /ops/rules; operator; 390×844 light; #opsVaRuleTemplateSeedSelect → #opsRulesComposerSave; 4695ms | pass | child execution PASS; SHA 204283dce10b446dc08f35414de4f88c4d8245c0e17259b426fc86886316e87e |
| RULE-075 | /ops/rules; operator; 390×844 light; #opsRulesComposerSave → #opsRulesComposerSave; 4738ms | pass | child execution PASS; SHA 40f5fd61ff71ef7d264873386d4ad46cd55164b209cc272745d3e527835c9178 |
| RULE-076 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4789ms | pass | child execution PASS; SHA d511a69afd5df070bf1fc0e440be0ae89a917e65ec4ccffcf39d695033b6f496 |
| RULE-077 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4719ms | pass | child execution PASS; SHA 02435cac79a72abb125d2493c24fb7f9ad9921028c475346d683dc8ed6681c6d |
| RULE-078 | /ops/rules; operator; 390×844 light; [data-testid="ops-scenario-builder"] → #opsRulesComposerSave; 4755ms | pass | child execution PASS; SHA 86e7223cbbd48d97d6c6a3900b3488348379e0a164cd1e80399a35a4266ae30b |
| RULE-079 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4721ms | pass | child execution PASS; SHA 5b9b2df5d897b64002d585d171746feec187b6e671c4fb17e7c881bb9af84e06 |
| RULE-080 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4743ms | pass | child execution PASS; SHA 4f3c3c227cb53ced735132570bdfcd0ff3cba9f2a08528d3ad5b617018f2e953 |
| RULE-081 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4804ms | pass | child execution PASS; SHA 145dafc9b248e28d29a4a9414209ef9632cb41a6b0bf58fdc95032d4749f7def |
| RULE-082 | /ops/rules; operator; 390×844 light; [data-testid="ops-scenario-builder"] → #opsRulesComposerSave; 4745ms | pass | child execution PASS; SHA 7372bc85da85aef9c638ebd54cdf1a2d0fce68ee6d756c75c457c14b01252a41 |
| RULE-083 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4721ms | pass | child execution PASS; SHA d7f123f34e88c7711725eb36a77c9dd74d25c363af986504e9701f098e1e8918 |
| RULE-084 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4714ms | pass | child execution PASS; SHA e920d1271cf11deb97816651c2cdb59a088252809d4c2b152b8fe03266bf391f |
| RULE-085 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4809ms | pass | child execution PASS; SHA 74f27c20a0ecc544d56ffb8b4f91d40aedd539e611a485180ccdff1845cc0289 |
| RULE-086 | /ops/rules; operator; 390×844 light; #opsRulesValidationList → #opsRulesComposerSave; 4777ms | pass | child execution PASS; SHA 57a96be5485cd204a8893b2da75ad3435f08077bf3f93df9c0729715edd20336 |
| RULE-087 | /ops/rules; operator; 390×844 light; #opsEventRuleLoiteringGroundPlaneToggle → #opsRulesComposerSave; 4725ms | pass | child execution PASS; SHA f221b1b67b0c96fa88a190655b4055ab240a832f0b7e4fab44a69fc882764165 |
| RULE-088 | /ops/rules; operator; 390×844 light; [data-testid="ops-scenario-builder"] → #opsRulesComposerSave; 4730ms | pass | child execution PASS; SHA 0b9b06becd1b2350d7305dce9ca773b20c2e7495f32fb203116275440821522d |
| RULE-089 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4775ms | pass | child execution PASS; SHA ef43a9670286dd91980081d69425e6edb218de92cd1b1de508661c01de1454cf |
| RULE-090 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4770ms | pass | child execution PASS; SHA a90e523161e80d0a97861f0245001b7198dccb9b2e2b85b9ff38f9ff42c4b79f |
| RULE-091 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSummary → #opsRulesComposerSave; 4725ms | pass | child execution PASS; SHA 6a59980cdb381e6a24ee10826b0b920d2e9045fdd5cab196739582f0dcb43c3a |
| RULE-092 | /ops/rules; operator; 390×844 light; [data-testid="ops-incident-rule-suggestion-review"] → #opsRulesComposerSave; 4213ms | pass | child execution PASS; SHA 265dede604249133b872ab29702911fd91f2edaede2d4733a013245f9c12b52a |
| RULE-093 | /ops/rules; operator; 390×844 light;  → #opsRulesComposerSave; 5452ms | pass | child execution PASS; SHA a47f3f31a7d4bd400186a8599c9777a1b7aeeb84dfee6b8a433ddfb717bd2524 |
| RULE-094 | /ops/rules; operator; 390×844 light;  → #opsRulesComposerSave; 6008ms | pass | child execution PASS; SHA 532bfc518d13b82a9e748bb9988593b640a1d1400c15a65040c752d4bc5221ee |
| RULE-095 | /ops/rules; operator; 390×844 light;  → #opsRulesRefresh; 3558ms | pass | child execution PASS; SHA 4a4269aa8ff0ad45166b8aa8c8783fefcd060abc6ee8ed1d317b3495c4590148 |
| RULE-096 | /ops/rules; operator; 390×844 light; [data-testid="ops-incident-rule-suggestion-review"] → #opsRulesRefresh; 3929ms | pass | child execution PASS; SHA d171f1e2c56c1ca5d2b51658847333f79ea709d728f1db0377aa226eba8373ea |
| RULE-097 | /ops/rules; operator; 390×844 light;  → [data-testid="client-live-source-tree"]; 3864ms | pass | child execution PASS; SHA 6ca1c26e1732bf0ad71aba41e3c0dad2aaafedf0f8b9d5493986edb09676fee0 |
| RULE-098 | /ops/rules; operator; 390×844 light; #opsVlmRuleDraftKindSelect → #opsRulesValidationList; 2910ms | pass | child execution PASS; SHA b88028f89bfb845eafd7a53d9f3b7f33aa5f8c45414242e142c929c6229bc450 |
| RULE-100 | /ops/rules; operator; 390×844 light; [data-testid="ops-incident-rule-suggestion-review"] → #opsRulesComposerSave; 5658ms | pass | child execution PASS; SHA 2b5eb9d4e4b3c7c84c8b0f584e8737007a834bbfd6c435add57459eb8247070f |
| RULE-101 | /ops/rules; operator; 390×844 light; #opsEventRuleIdInput → #opsRulesComposerSave; 5685ms | pass | child execution PASS; SHA 22242b416abae6071c8ef4b343a7d86506b72172af4a8e990ba167552ab0e93c |
| RULE-102 | /ops/rules; operator; 390×844 light; #opsEventRulePresetSelect → #opsEventRuleTypeSelect; 2002ms | pass | child execution PASS; SHA 2fbc59e5fcc87327f0dfbcadf04320a5ebb3291b079c2e50530cbb304bc32a03 |
| RULE-103 | /ops/rules; operator; 390×844 light;  → #opsRulesRefresh; 10432ms | pass | child execution PASS; SHA deee4f1880f836431e5528e6a1b2a19dfa02bb574e40a2ffa7387b41bff268fe |
| RULE-104 | /ops/rules; operator; 390×844 light; #opsOperatorOutcomeMemoryRows → [data-approval-gated-rule-draft-route]; 2406ms | pass | child execution PASS; SHA fc949593c0347421b2124761e9efdb6300177fe67b4c6b34c9b9868cc72d9bbb |
| RULE-111 | /ops/rules; operator; 390×844 light; #opsVlmRuleDraftKindSelect → [data-vlm-rule-draft-index]; 2313ms | pass | child execution PASS; SHA c5ae264dac833774e61de87f52cd6ba088998a35a565b1d9e14930e1fa61159c |
| EVT-001 | /ops/dashboard; operator; 390×844 light; #dashRuntimeTrendSparkline → #dashRuntimeTrendSparkline; 2634ms | pass | child execution PASS; SHA d4bba997da97357b7c9ce39335c73bed7649eff62707d7bce4d366bbf989ea4f |
| EVT-003 | /ops/dashboard; operator; 390×844 light; #dashRootCauseActionOutput → #dashRootCauseList; 2441ms | pass | child execution PASS; SHA 05709b10906e4343f91d5f3ded6260e65a636fed08d710bef256c396827e0bed |
| EVT-004 | /ops/events; operator; 390×844 light;  → ; 3167ms | pass | child execution PASS; SHA 4f15e4c25154640c2337e7708c9dd7237b25a5bcdff5af727eba555ae9746623 |
| EVT-007 | /ops/events; operator; 390×844 light;  → ; 4294ms | pass | child execution PASS; SHA 84966c443bb701f3c5207bd9a225b60e86c79f7489caa341998610a38aa4730c |
| EVT-016 | /ops/events; operator; 390×844 light; #opsV320ResolutionTimeline → #opsV320ResolutionTimeline; 1997ms | pass | child execution PASS; SHA 0155f582127135aea8a654a15de9fc7d320c074b41bc2a113fb82d203597b9e8 |
| EVT-017 | /ops/events; operator; 390×844 light;  → ; 2077ms | pass | child execution PASS; SHA 5690df7bd5ab62a6471463af4e2fbbcb365c82411454877d138bd8e694b5c3a9 |
| EVT-018 | /ops/events; operator; 390×844 light; #dashRuntimeOpsList → #alertDeliveryTest; 3355ms | pass | child execution PASS; SHA aa2dc91ea4207af9551ee37a1f1cd6890eac4fb1ce6133817768d2e32f3c2131 |
| EVT-019 | /ops/events; operator; 390×844 light; [data-testid="ops-vlm-event-review-card"] → [data-testid="ops-vlm-event-review-card"]; 2157ms | pass | child execution PASS; SHA c73d8c6d7749d4107bca627c03eccf8d4e627c8c816e6ebef7a4b9cf0a78feb4 |
| EVT-020 | /ops/events; operator; 390×844 light;  → ; 2202ms | pass | child execution PASS; SHA 470698b9dd13e3b25b381ca98e7ea6ed4570b0846dfac1c3ca93a6740713ac69 |
| EVT-021 | /ops/events; operator; 390×844 light; #eventReviewRows → [data-event-review-save]; 3155ms | pass | child execution PASS; SHA 2bd15bf005fc705ec32c366373469cc74635bdc87bbd65bf18b81600f2843572 |
| EVT-022 | /ops/events; operator; 390×844 light; #dashRootCauseActionOutput → #event-review-audit-list; 2328ms | pass | child execution PASS; SHA 4e63191c305bd426a29c90f552bc7253d103dcc84e45b3db02a828f675b6b161 |
| EVT-023 | /ops/dashboard; operator; 390×844 light; #dashCommandWorkspaceLedgerList → #dashCommandWorkspaceLedgerList; 2325ms | pass | child execution PASS; SHA cfb0ec456efa6ed7b929199f7dbf6b650acdfee642e53d85b2476ad5f57cce6c |
| EVT-024 | /ops/dashboard; operator; 390×844 light; #dashRuntimeTrendSparkline → #dashRuntimeTrendSparkline; 3501ms | pass | child execution PASS; SHA 26d845803ec921f2d5b02ca4d7d83d9d9278b163c660821d0b083c3179449ba4 |
| EVT-025 | /ops/dashboard; operator; 390×844 light; #dashRuntimeTrendSparkline → #dashRuntimeTrendSparkline; 2153ms | pass | child execution PASS; SHA e15ae80b6555b629ff8fb026aab93886f2e64004c2a35c7c24e21bd5c0e596e7 |
| EVT-026 | /ops/dashboard; operator; 390×844 light; #dashRootCauseList → #dashRootCauseList; 2652ms | pass | child execution PASS; SHA 589abe9498ec15d695d9b6a525ce2d0790aff6a3e07bfa0582c46d71cf0cc70a |
| EVT-028 | /ops/events; operator; 390×844 light;  → ; 2036ms | pass | child execution PASS; SHA 27736f0803a07dc33fe94a2839f8bd162601d24030b4adc0405e05fd92aa6e5b |
| EVT-030 | /ops/events; operator; 390×844 light; #opsRulesReviewEventRecordLink → ; 2273ms | pass | child execution PASS; SHA ac32ac9e0d8aeaaea3c4eb51b14fcd1186f3ac75ec3243b34b20fdb06786c2c0 |
| EVT-031 | /ops/events; operator; 390×844 light; [data-testid="ops-vlm-event-review-card"] → [data-testid="ops-vlm-event-review-card"]; 2062ms | pass | child execution PASS; SHA ed01920336913abbd7bea28ce1ccbcee7075e2c16c11e898ad7e34b9fa98899a |
| EVT-036 | /ops/events; operator; 390×844 light; #opsRulesDetailPanel → ; 2006ms | pass | child execution PASS; SHA 20f6d184dee9b9afe6f8fe8f3ca0668fc97d0292436468f545ff8fb737489d67 |
| EVT-037 | /ops/events; operator; 390×844 light;  → [data-event-review-save]; 3185ms | pass | child execution PASS; SHA 8f03f6a387d6c4eadefc7851cd99b2d85dce788ae995daf567697a0eeb43a8b8 |
| EVT-038 | /ops/events; operator; 390×844 light;  → #alertDeliveryDryRun; 3344ms | pass | child execution PASS; SHA 9558b59cd68533b344223eed8d8e0f6537ef8908e62b876a66da1a1844900115 |
| EVT-041 | /ops/api/events/reviews; operator; 390×844 light;  → ; 1571ms | pass | child execution PASS; SHA 0f6b607c0ace215e5202b3edfd30cb6e7010691c49f95cfe4b3ef2ba3868293c |
| EVT-042 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2229ms | pass | child execution PASS; SHA 3f940b0d2118c163c00a5f0f1c56b5a64211253a45267c6c8d732029c4a3860e |
| EVT-043 | /ops/api/events/reviews; operator; 390×844 light;  → ; 1998ms | pass | child execution PASS; SHA d70add4937a70ea7f6558f6cb6a800915f5c658c6ab9f15ebfcccf40adebe10e |
| EVT-044 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2457ms | pass | child execution PASS; SHA b8e25e087a23d5780a49449df02a6a284568996130b4dd3405c46715bc15c95d |
| EVT-046 | /ops/api/events/reviews; operator; 390×844 light;  → ; 1556ms | pass | child execution PASS; SHA b55d996b53f838d387fd09860168b07d39598b171e3256d05b1170617b6176c8 |
| EVT-047 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2069ms | pass | child execution PASS; SHA 7cf3dca4919c09051805f2811dfe805be9f0b11036c9e2476084f6d492db3587 |
| EVT-048 | /ops/dashboard; operator; 390×844 light;  → ; 2365ms | pass | child execution PASS; SHA c6041dc2e4bed061b08308404a658284af8eb524ddbc18c0bc9d483c736d8b2a |
| EVT-049 | /ops/events; operator; 390×844 light; #eventRecordsEvidenceSelect → #eventRecordsEvidenceSelect; 2422ms | pass | child execution PASS; SHA 09e7867e762662fb37a9fbeada1b690858e917c5fa849204839e2bd91793e8aa |
| EVT-050 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2243ms | pass | child execution PASS; SHA bd6eff0a27219dc410d730fbc92bb30653c2f6ffe6b95fed646b11b2cc513977 |
| EVT-051 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2031ms | pass | child execution PASS; SHA b92a36c6750a370057871702de8fa21b2eac9bbaef816cacf4f1ce23efecb665 |
| EVT-052 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2208ms | pass | child execution PASS; SHA bd6cec27b38167a1865b6d7fdbea41e193ae34186d5350a1e178c129f0273aa0 |
| EVT-053 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2053ms | pass | child execution PASS; SHA fd67be662430ecf0d9da74615692eebb30e956c79a5a78d76b83340f2529cb63 |
| EVT-054 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2248ms | pass | child execution PASS; SHA bf751015a5074296e25fd3408a22869a3501dc2478a7a8841e781c444743ffd8 |
| EVT-055 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2572ms | pass | child execution PASS; SHA c2d77b4c8e59138f4e10d817e9a692031f70d27fb763e282ce1092b93e48f144 |
| EVT-056 | /ops/events; operator; 390×844 light; #opsApprovalGatedRuleDraftReadinessRows → #opsApprovalGatedRuleDraftReadinessRows; 2126ms | pass | child execution PASS; SHA 29eb19c7267326b656fe9656b242b2d9fdf6bd98e1569078af01f58a31c232c0 |
| EVT-057 | /ops/events; operator; 390×844 light; #opsEvidenceIntakeFieldReadinessRows → ; 2268ms | pass | child execution PASS; SHA 0e07a24374102b6694b026671d649d5eefc534e0500d6fc7b57b88c7cc45c422 |
| EVT-058 | /ops/dashboard; operator; 390×844 light; #dashRuntimeTrendSparkline → #dashRuntimeTrendSparkline; 32022ms | fail | REQUEST_LIFECYCLE_FAILED; SHA 503e9798302bd80353ac66f95e11aeaf5a56c191a3f1946dd1b93f503f9c4ffe |
| EVT-061 | /ops/api/events/reviews; operator; 390×844 light;  → [data-event-review-save]; 3265ms | pass | child execution PASS; SHA 9a452837ad9894f962c328b3b27ed72beb794fdbe17212c4177777ee1726a3ff |
| EVT-064 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2337ms | pass | child execution PASS; SHA 42f874482006a56533c4513fc2db1f513bd0d8349f489cc52510a64bd8c438bb |
| EVT-065 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2231ms | pass | child execution PASS; SHA 13202496310397fc239923a9a9b795347e7cf6437034bf8dd8081d887a6c476c |
| EVT-066 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2409ms | pass | child execution PASS; SHA c5a906eae32fcb83dd959fa0dadd80120144c265f20023e3336fa7b96d59389a |
| EVT-067 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2094ms | pass | child execution PASS; SHA eae21b172675f2d3275b549b3431390fea06e6399bae2e11b01b0b113263e2bb |
| EVT-068 | /ops/api/events/reviews; operator; 390×844 light;  → [data-event-review-save]; 3138ms | pass | child execution PASS; SHA f46de5d801c960c8c858a3fdb5ffdb6464a6365381a8c785e3abf0b8f48f57a9 |
| EVT-069 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2036ms | pass | child execution PASS; SHA fd6ff25202ec2ad9f299e6250341d98c63a84152e9707c35d1624c3f0f71b48c |
| EVT-070 | /ops/events; operator; 390×844 light;  → ; 1538ms | pass | child execution PASS; SHA 1b34d2ee2ceef288dd0254df2a25d3d3b33da02d2b2f8f094cae43b26b9d947d |
| EVT-071 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2017ms | pass | child execution PASS; SHA e0c069e9e5360feb03ac6c72ab1684460ada7a94ba16a6193a8436b9e1bdb222 |
| EVT-072 | /ops/events; operator; 390×844 light;  → ; 2211ms | pass | child execution PASS; SHA 4b2d849a96264485f5bd18e4819367ed00064f5de0e793849f981ea3ac1ced80 |
| EVT-075 | /ops/api/events/reviews; operator; 390×844 light;  → ; 2048ms | pass | child execution PASS; SHA d2a9bd4226a0a900a854edf18f197da550c67d8d88865c0a76d7d3ecc43c74d9 |
| CLIENT-001 | /client/live; viewer; 390×844 light;  → ; 1766ms | pass | child execution PASS; SHA d1a31be885d6a57698b1fb162b0294238c73c8059cb19c9525c39ba5e411095c |
| CLIENT-002 | /client/live; viewer; 390×844 light;  → [data-tile="0"] [data-action="toggle-playback"]; 3413ms | pass | child execution PASS; SHA 7a6956b4d837c7422cb93d6ac0e295d295db5c3ffffdf911e6dd8ebf1b147403 |
| CLIENT-005 | /client/live; viewer; 390×844 light;  → #liveAllStop; 3629ms | pass | child execution PASS; SHA 4bf77cf9db29a2e984a5cce35152aef3e740c3b39bcaa2785f5d846ceb104049 |
| CLIENT-006 | /client/dashboard; viewer; 390×844 light;  → ; 1763ms | pass | child execution PASS; SHA f2864e25272ba766e804a20505c2da9e30dd09527e4c78046b9351c1aab49803 |
| CLIENT-007 | /client/events; viewer; 390×844 light; [data-testid="${escapeHtml(testId)}"] → .client-viewer-events; 1846ms | pass | child execution PASS; SHA f0d97194cf75fcad6f489f63bba23728320e4653776ab37c1bbc5a04ef5a13b8 |
| CLIENT-009 | /client/live; viewer; 390×844 light;  → #liveSaveLayoutPreference; 2746ms | pass | child execution PASS; SHA 7f4b147c6603ffd92badd4a64cef965b817cb508dc9bac5b86616f166c6621e4 |
| CLIENT-010 | /client/live; viewer; 390×844 light;  → ; 1961ms | pass | child execution PASS; SHA ef494e1dc873963a51a088e74f7501009d0347df6dda431a6764b03aa2b2390e |
| CLIENT-011 | /client/live; viewer; 390×844 light;  → ; 1702ms | pass | child execution PASS; SHA c42d74335264f8179d512841a34c65899b4f38619538ed4801be1eaf2cda0a94 |
| CLIENT-012 | /client/live; viewer; 390×844 light;  → ; 1201ms | pass | child execution PASS; SHA 096be6019e9c2dacd260937a055cc6ad5d9a7bbf4f1a64ed7913e6cb5e8b80f6 |
| CLIENT-013 | /client/live; viewer; 390×844 light;  → ; 1212ms | pass | child execution PASS; SHA 12f87d8e30f3429fbd8f13412f374c1951bf9256f6c5c78568972c19c8589db1 |
| CLIENT-014 | /client/live; viewer; 390×844 light; [data-testid="client-live-dock-event-feed"] → ; 1236ms | pass | child execution PASS; SHA cc8dfbe17bdfad2ed559ba964bfa8732ad6803349af5d5011f2f67c78a387d9b |
| CLIENT-015 | /client/live; viewer; 390×844 light;  → ; 1274ms | pass | child execution PASS; SHA df025201106475aa270a2f4624a76174ad1483fea345faf8e11173f448aa8721 |
| CLIENT-016 | /client/live; viewer; 390×844 light;  → ; 1257ms | pass | child execution PASS; SHA ca5ede2443c05c51e9601cc73e51a5c67f083f903a07190e5ff7e874914593a0 |
| CLIENT-017 | /client/live; viewer; 390×844 light; [data-testid="client-live-va-overlay-toggle"] → ; 1309ms | pass | child execution PASS; SHA 614dd1067beb49c60151163bb364300a2236200e7b3c94c8a87901c2219eb36f |
| CLIENT-018 | /client/live; admin; 390×844 light; [data-testid="client-dashboard-shell"] → .client-preview-redaction-strip; 1818ms | pass | child execution PASS; SHA 322e2bce9c3da24be40d0f35366be56fd17f370d368117297bb49a1ea2139219 |
| CLIENT-019 | /client/live; viewer; 390×844 light;  → ; 2156ms | pass | child execution PASS; SHA 5753035dc506917f8bf7b389b366e4db22864409a6005458ce6058d69ae6455d |
| CLIENT-020 | /client/live; viewer; 390×844 light;  → ; 2605ms | pass | child execution PASS; SHA 5082a2b8a789946ee16203fd78012adb58fb85f484539a8788246b984f0a2161 |
| CLIENT-021 | /client/live; viewer; 390×844 light; [data-testid="client-safe-followup-digest"] → [data-tile="0"] [data-mode-action="va-overlay"]; 3534ms | pass | child execution PASS; SHA 18705af5bbc00703d4380a6c0b254bd3c998f9932ac46e30b29b1407c76e95ad |
| CLIENT-022 | /client/live; viewer; 390×844 light;  → ; 1714ms | pass | child execution PASS; SHA e76a1a91ea4c883f3d2b47afcb0d5ba4e07be60045a59f989002a6ee71fe4316 |
| CLIENT-023 | /client/api/views/{id}/events; viewer; 390×844 light; [data-testid="client-safe-incident-digest"] → [data-testid="client-safe-incident-digest"]; 1886ms | pass | child execution PASS; SHA dbe09cd903893ef61905d50dfab00f3d072f35d8e3e8f1eb6be80793506bde7c |
| CLIENT-024 | /client/live; viewer; 390×844 light;  → ; 1906ms | pass | child execution PASS; SHA 7ddff8a3870949533b134e5fc7442fe1af33bfdbb6f593ab4e48eb1bc83d1d93 |
| CLIENT-025 | /client/events; viewer; 390×844 light; [data-testid="client-safe-event-digest"] → [data-testid="client-safe-event-digest"]; 1875ms | pass | child execution PASS; SHA 6d4a47225dfad613204932652a609d4ada0122998dae124bc1a27856ea9a4c41 |
| CLIENT-027 | /client/live; viewer; 390×844 light; [data-testid="client-safe-resolution-digest"] → [data-testid="client-safe-resolution-digest"]; 1908ms | pass | child execution PASS; SHA 9e03737a09a8e28f9d2e9b2f5760dfa80a17c15cc58875033ebf10458e28160f |
| CLIENT-028 | /client/live; viewer; 390×844 light; [data-testid="client-safe-source-status-digest"] → [data-testid="client-safe-source-status-digest"]; 1945ms | pass | child execution PASS; SHA 5b56bc9f5b24f7c83664c5b4687978287051e986e1f0d0b84dc0d9845e180cc4 |
| CLIENT-029 | /client/api/views/{id}/events; viewer; 390×844 light; [data-testid="client-safe-maintenance-digest"] → [data-testid="client-safe-maintenance-digest"]; 1878ms | pass | child execution PASS; SHA d47f6406de3918f193a8e9eea96c397030484de8157498c63f8b62a88bbc6fb6 |
| CLIENT-031 | /client/api/views/{id}/events; viewer; 390×844 light; [data-testid="client-impact-forecast"] → [data-testid="client-impact-forecast"]; 1873ms | pass | child execution PASS; SHA 4ceac318ac03bc22f04edf675c4ff500d89e05e8f3207d14cdbc70ede9707188 |
| CLIENT-032 | /client/api/views/{id}/events; viewer; 390×844 light; [data-testid="client-operations-notice"] → [data-testid="client-operations-notice"]; 1877ms | pass | child execution PASS; SHA 584077d950c5ac6c34f615f832248a233930d7c721e2a3e27fa35df00c2dc3e8 |
| CLIENT-040 | /client/api/views/{id}/events; viewer; 390×844 light; [data-testid="client-action-notice-preview"] → [data-testid="client-action-notice-preview"]; 1862ms | pass | child execution PASS; SHA 07c1556400e9e5845d1045c89199164fa463ae69c19562ef6e92d7b45cac9851 |
| CLIENT-041 | /ops; operator; 390×844 light;  → ; 1801ms | pass | child execution PASS; SHA 74e737a55eff9b17c2ab481263d8d4a85bcaa359059b909631bc4cd7db8c8a61 |
| CLIENT-042 | /ops; operator; 390×844 light;  → ; 1225ms | pass | child execution PASS; SHA 63345e2af8634d6bc9d01fd3dedaf93492d075c01662f07bf5402fb1789a95b3 |
| MEDIA-016 | /client/live; viewer; 390×844 light;  → ; 2111ms | pass | child execution PASS; SHA ac282d37ffe0d96cae83e3507e5bfdd77b77303262fc300fddf962d7f8c39475 |
| MEDIA-017 | /client/live; viewer; 390×844 light;  → ; 3779ms | pass | child execution PASS; SHA 490c8d5dbad485ef3d42c23e862009cc96e3cfee8c96393a22a605e4dde2d6d6 |
| SAFE-015 | /ops; operator; 390×844 light;  → ; 1339ms | pass | child execution PASS; SHA 4a424cc5161d0c309ef007e79e9d529ee88804b21fea61b6f293a87bf32ec73a |
| SAFE-016 | /ops; operator; 390×844 light;  → ; 1056ms | pass | child execution PASS; SHA 1ae62d2ef15b3761a19998833feb2e0365b66a692de68f94504824b2b7d1b1d1 |
| SAFE-017 | /lab; operator; 390×844 light;  → ; 1063ms | pass | child execution PASS; SHA 547f8800e2a036c63116cd62064fd0490ad38201751c6ac97ca99a23f0de165d |
| SAFE-018 | /client/live; viewer; 390×844 light;  → ; 1226ms | pass | child execution PASS; SHA bd1f47ca6075d6d9e17e294249c73180303b7bdf36aeada9a7d29ca523580ac5 |
| SAFE-019 | /ops; operator; 390×844 light;  → ; 1296ms | pass | child execution PASS; SHA c5f79ac02f78c4e68d196a1ca4156dfa3184bc0e8fcb1af23b63d5dd447f919b |
| SAFE-020 | /ops; operator; 390×844 light;  → ; 1750ms | pass | child execution PASS; SHA 530c3135afee8451d257416079acdb6cc035b328df0167ee77cd8bda93b25b08 |
| SAFE-021 | /ops; operator; 390×844 light;  → ; 1797ms | pass | child execution PASS; SHA e1cf9c5bbedc5ede8c8dfce6215857dcbe6d380958746ae0badfc96476952839 |
| SAFE-024 | /ops; operator; 390×844 light;  → ; 1848ms | pass | child execution PASS; SHA f4a1ba4b7ae97e7e70877772a66bbe75345d802161196cce90a4dceacc3a14fe |
| SAFE-028 | /ops; operator; 390×844 light;  → ; 1301ms | pass | child execution PASS; SHA b3ca7765f5f4af107b5db651cea0b50a61d0491b6ede8eef32dfc9ca302bfd75 |
| SAFE-031 | /client/live; viewer; 390×844 light;  → ; 1266ms | pass | child execution PASS; SHA 31e4a915a603a3ab60ac6c9dcc3adc66b80c2db4045cdfbedba1f9dfed647cf8 |
| SAFE-033 | /ops; operator; 390×844 light;  → ; 1942ms | pass | child execution PASS; SHA 2bd31953c817578173d2c41ed76f0ca221739ef80c7aeaf55789f14d3408bfe8 |
| SAFE-038 | /ops/rules; operator; 390×844 light; #opsVlmRuleDraftKindSelect → [data-vlm-rule-draft-index]; 2154ms | pass | child execution PASS; SHA e6e94ebca65a00d1f6b1386e4b10d0ebd441ece92f03698e68838121be47cbfc |
| SAFE-041 | /ops/api/audit; admin; 390×844 light;  → ; 2116ms | pass | child execution PASS; SHA d8ebb49ef71e36d2421f66d5305c9ee0dd2f85fea1029bf13800cda254af480f |
| SAFE-042 | /ops; operator; 390×844 light;  → ; 1805ms | pass | child execution PASS; SHA a8ea0e3dd11cc2e23c1ecd43dd35a7081a0b64402bf3ba39774bf94433b21136 |
| SAFE-045 | /ops/events; operator; 390×844 light;  → ; 1234ms | pass | child execution PASS; SHA 52ed6ceb4a22d41495c9ddcfd461b5ee7bb70e3c81c8f87ac3038240b9b721f7 |
| SAFE-046 | /ops; operator; 390×844 light;  → ; 1828ms | pass | child execution PASS; SHA e2c0f71710fef1ec4477d2e58fc4d4a6844741e0cdaeabf434c2a6a52e7ef405 |
| SAFE-047 | /ops; operator; 390×844 light;  → ; 1804ms | pass | child execution PASS; SHA 702a64ebb3a8131d6e24bfb3b1c8610f52fc99dd91d46e36f576a85e0e713be7 |
| SAFE-048 | /ops; operator; 390×844 light;  → ; 1851ms | pass | child execution PASS; SHA db2fd0b0238524fb200b1bd94c9ae60cb8bb1da0edf94e6a4b19c7cc0f94b266 |
| SAFE-049 | /ops; operator; 390×844 light;  → ; 1837ms | pass | child execution PASS; SHA de7aa03b6ef6f76aa1f46034a90363342072f93793a04ff909df0db8905ea50e |
| SAFE-050 | /ops; operator; 390×844 light;  → ; 1239ms | pass | child execution PASS; SHA a1ab0b4bfd0aa46f5dd580be292d13a711399120f2bb2824a2f21cccd73cfe38 |
| SAFE-052 | /ops/events; operator; 390×844 light; #opsIncidentSearchInput → #opsIncidentSearchInput; 2327ms | pass | child execution PASS; SHA f2f5e6406591a3e18fc6aecc1342eac5a1fd9c84bdd350ce30fcbd27d81498b3 |
| SAFE-053 | /ops/events; operator; 390×844 light; #opsEventRulePresetSelect → [data-incident-rule-draft-route]; 1981ms | pass | child execution PASS; SHA 9f01c6fb28b70ef2e9e09e16867871dc6ad1c73aabb6e5713fb83ae9c138037d |
| SAFE-054 | /ops; operator; 390×844 light;  → ; 1259ms | pass | child execution PASS; SHA 3fcec983572dbaf53c720516bfebb15e69c7b42bd62422b6ecd2b668be5a4233 |
| SAFE-055 | /ops; operator; 390×844 light;  → ; 1786ms | pass | child execution PASS; SHA 06c93e1712c99791859b30926c7de5d03791f3a83c42d3b3b69ccf1d85e4ed6d |
| SAFE-056 | /ops; operator; 390×844 light;  → ; 1769ms | pass | child execution PASS; SHA c9749157a49f84c53e1f766165fe9e40fc4f4a3549d0828f5486812c6eb75224 |
| SAFE-058 | /ops/events; operator; 390×844 light;  → ; 1998ms | pass | child execution PASS; SHA d021746444dcbc6527988aef734dacecc8ce71788116c1e27e7fd784fcc4efe3 |
| SAFE-059 | /ops/events; operator; 390×844 light;  → ; 2031ms | pass | child execution PASS; SHA 23edb4ec733a454413b73a909d7f325752de6528fe9139347e671cc188773e6a |
| SAFE-060 | /ops/events; operator; 390×844 light; #dashRuntimeOpsList → [data-testid="ops-operational-action-pack"]; 1851ms | pass | child execution PASS; SHA 789581fc66581b18751a2af26941d111ae2172f26126a2a43bf0230bc9e90bd7 |
| SAFE-061 | /ops/events; operator; 390×844 light; #opsEventRulePresetSelect → [data-testid="ops-rule-what-if-preview"]; 1957ms | pass | child execution PASS; SHA 2306bd9b7ea0e0d38cfb779655e68757bbe887ee30e5e0215eb358677fefb4e9 |
| SAFE-062 | /ops; operator; 390×844 light;  → ; 1876ms | pass | child execution PASS; SHA 4a583f67f8a15dded655647da686e575b72fb684c83e7f89a159ad8a94e74892 |
| SAFE-065 | /ops; operator; 390×844 light;  → ; 1836ms | pass | child execution PASS; SHA 2863e93acd2fa127a3c52e59b1d4db1875a6b46f54556617391a6c0352a02c15 |
| SAFE-066 | /ops; operator; 390×844 light;  → ; 1781ms | pass | child execution PASS; SHA bd1a801211ad38a527053d9ab5392de9e7ad5b507e8d886cf572cc3cbb7994bb |
| SAFE-067 | /ops; operator; 390×844 light;  → ; 1800ms | pass | child execution PASS; SHA af2f22a07f7d9ceeb5c4326204608ea7bac3c5684de8c6eef423a66ea4c9e3b0 |
| SAFE-068 | /ops; operator; 390×844 light;  → ; 1815ms | pass | child execution PASS; SHA 6cb36a88e4d7bd78e8eb1201a7d8aad38523f863ff4d5845450895e3829c5917 |
| SAFE-069 | /ops; operator; 390×844 light;  → ; 1905ms | pass | child execution PASS; SHA be9cda5a21a38310704d1ec8ca74ea5d73148dd8dfc75b32120c1e0401e92f77 |
| SAFE-098 | /ops; operator; 390×844 light;  → ; 1838ms | pass | child execution PASS; SHA be621e0090096586d50fd802d29c0c034d0f48bf47539ecef58b56d55e52646d |
| SAFE-104 | /ops/events; operator; 390×844 light;  → ; 1294ms | pass | child execution PASS; SHA 49248fcaa51c2eb7911b6b0df6e89601b3353bc623efc342967091a254bf09fa |
| SAFE-105 | /ops; operator; 390×844 light;  → ; 1791ms | pass | child execution PASS; SHA 4c11910e82738e39e769942c5986b3b562a1b7dca2b112d4383765e7737c88fb |
| SAFE-106 | /ops; operator; 390×844 light;  → ; 1809ms | pass | child execution PASS; SHA 14330b81be6183bb2adbfe7da1f122bd7c33c0b17b37778a709570bf58ab9fd6 |
| SAFE-107 | /ops; operator; 390×844 light;  → ; 1768ms | pass | child execution PASS; SHA 93b94499f2c99521b3c63c54d781b4cb3fa9612d5b460ed772988246a17793f4 |
| SAFE-108 | /ops; operator; 390×844 light;  → ; 1793ms | pass | child execution PASS; SHA a785a2a001cd69ba904ccead2dd7204dcbd02acc17e1ba8bab0b34ef94f21a02 |
| SAFE-109 | /ops; operator; 390×844 light;  → ; 1814ms | pass | child execution PASS; SHA dee0f8a852da7a2eb8d95297a69f70b7fd41eee0ac043d59ef81707af2e8e446 |
| SAFE-110 | /client/api/views/{id}/events; viewer; 390×844 light; [data-testid="client-safe-resolution-digest"] → ; 1783ms | pass | child execution PASS; SHA 301c86aa71986789b102b3f0e5200469c9bdab48b4a9d4e9d6f31000f164b5b1 |
| SAFE-111 | /ops; operator; 390×844 light;  → ; 1820ms | pass | child execution PASS; SHA c8194220a2efdc64f9fc118adc1126099ef9a75b2ee76b4cd8db6888f15cd68a |
| SAFE-117 | /ops; operator; 390×844 light;  → ; 1783ms | pass | child execution PASS; SHA e7dbe3ef68561ffe7a0e5ce30c30b96c67786113e586c1bb84058738e669ff9f |
| SAFE-118 | /ops; operator; 390×844 light;  → ; 1794ms | pass | child execution PASS; SHA 74cd48a0edf203ad5e0ca20d0050c12a1a85a24b09ffa6cebcf4463eb17413df |
| SAFE-119 | /client/api/views/{id}/events; viewer; 390×844 light;  → ; 1790ms | pass | child execution PASS; SHA 3b69b3398962755051d7f8ed99135acd1393beca53fd77fdf7098de3cbc95dbb |
| SAFE-121 | /ops; operator; 390×844 light;  → ; 1779ms | pass | child execution PASS; SHA d4c3f616ad6f53081731be7a6325cf2fbbd79cddb467d8612b5fe0bf6c0ed58c |
| SAFE-122 | /ops; operator; 390×844 light;  → ; 1779ms | pass | child execution PASS; SHA bdf2d37f091f314e12c25b79e5db72b96fd1dd0cf0694e6d28199a79d3215063 |
| SAFE-129 | /ops/sources; operator; 390×844 light;  → ; 1762ms | pass | child execution PASS; SHA 4bc9a665fbdbb9f7fb66c8f750bc34843d6cce8031e7e3243046ce5c8fc3afa1 |
| SAFE-130 | /ops; operator; 390×844 light;  → ; 1824ms | pass | child execution PASS; SHA 40b156bd65475b1239593183b599bb3991d379d3d42a6edf4d6bf98e0b0b3de6 |
| SAFE-131 | /ops; operator; 390×844 light;  → ; 1878ms | pass | child execution PASS; SHA 5fcd9f3198325cb29fe1ced989de4ca265e19a58409e7ffee58c71cbb39448aa |
| SAFE-132 | /ops; operator; 390×844 light;  → ; 1796ms | pass | child execution PASS; SHA 7441dcec110e11de7c7f82ed6e1f4c3178886ff5092aac2089a46b401df9ecba |
| SAFE-138 | /ops/events; operator; 390×844 light; #opsEventRulePresetSelect → ; 1229ms | pass | child execution PASS; SHA 1f2f49c172804aee20736d80b0c03102b9f9aa89ae9cc83615e0487ac7e4b73f |
| SAFE-140 | /ops; operator; 390×844 light;  → ; 1784ms | pass | child execution PASS; SHA 164bf74be6b202b8370c1111bebec4af0da0f7fd600c89d72b411dc7e562fdf3 |

## 원본 결속

| 파일 | bytes | SHA256 |
| --- | ---: | --- |
| summary.json | 62126 | 8ddc5a2681e7d705e83c43a11e58ba70f71d23c53e1752783b78f2cc81a1e8e4 |
| test-run-summary.json | 97564 | 2d8f7ad0045971e240c84184e72bf1458bfafd820fc7dcad1aea01acdc48ccd6 |
| runs/v390-test-acceptance-20260911052110-85870/ui-final-integrity.json | 2441 | 7f97f9884b4003f8aa4d52c11027ece355e7d4d81259101b7cb518018681d401 |
| runs/v390-test-acceptance-20260911052110-85870/ui-exact-424/summary.json | 502884 | f213651452a5527f689e1c2dc533ea06ee3906411dc2a05cc7fe818ccb61c99f |
| runs/v390-test-acceptance-20260911052110-85870/ui-server-cleanup.log | 2059 | 032a373899d3010eb616d0a84113190c03298891ac70326e99381ad3d99b19c2 |
| runs/v390-test-acceptance-20260911052110-85870/cleanup.log | 827 | ddd749b92f9877ea3b3a52b1b5ca5066def738e83fdf8fc68945288df5188f7c |

## 정리 상태

## 후속 단일 진단 사전조건 실패

명령: `node scripts/internal/run_v390_ui_native_diagnostic_sweep.mjs --case-id EVT-058 --output-dir .media_server.test/v3.9.0/ui-diagnostic-sweep/s09-evt058-1789106562662` (설치된 Playwright/Chrome 경로 명시).
시작1789106562662, 종료1789106563551, elapsed889ms, exit1. UI 브라우저·서버·컴파일 미실행.
원본 summary는 `diagnostic-current-source-build-failed`, `DIAGNOSTIC_CURRENT_SOURCE_BUILD_FAILED`, actualBrowserExecution=false다.
main이 `buildCurrentSourceBoundBinary`를 확인했으며 첫 clean-worktree assertion이 spawnSync(build)보다 먼저 실패했다. 제품 빌드 실패로 해석하지 않는다.
summary SHA256: `c656c27c6305e27752e51cd7c271ea506a507cba2f618b6aeb85d34727e76203`.
token start7322309/end7340216/차이17907은 진단 준비·후처리를 포함한 goal 전체 차이이며889ms 테스트 단독 사용량이 아니다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| EVT-058 진단 사전조건 | clean current-source worktree 요구를 미충족하여 exit1 | fail | 실제 UI·컴파일 전에 중단; 사전확인 누락 |
| EVT-058 실제 UI | 브라우저 action 미실행 | fail | 사전조건 실패로 건너뜀; PASS 근거 없음 |
| 격리 실제 재현 | 새 runtime 기동 미실행 | fail | root 설정의 actual runtime 검증을 대체하지 않음 |

이 진단 생성물3파일14011755bytes 및 capture2파일424bytes는 값 이관 후 정확 경로·크기를 재확인해 삭제했고 부재를 확인했다. 실제 녹화 기본 경로는 생성되지 않았다. 커밋 조건을 우회하지 않고 진단 준비 변경을 먼저 커밋해야 재개할 수 있다.

최종 보정: 아래 초기 정리 문장은 당시 상태 기록이다. 이후 메인이 권한을 갖춘 ps/lsof로 서버 PID84796/86459·포트55094/55095·DB 열린 핸들 부재를 확인했다. 모든424 summary SHA와 실패 파일 복사본 SHA를 대조했다. capture25129bytes, UI출력152603313bytes, 빈 recordings131072bytes를 정확 경로로 삭제하고 부재를 확인했다. runtime root도 부재다. 정리 완료이며 테스트 판정 FAIL은 변하지 않는다.

보존 정책 정정: 실패 trace707719bytes와 화면·콘솔은 원본 SHA 대조 후 공개 후보에서 제외하고 gitignore된 .media_server.test/v4.1.0/s09-evt058-diagnostic-source/로 이동했다. 진단 중 임시자료이며 최종 증거 링크가 아니다. 필요한 값만 이 문서로 이관한 뒤 삭제한다. credential 패턴0건, 실패화면 직접확인. 원시자료 정리는 진단 종료까지 미완료다.

runner 기록: PID86459 종료, 포트55094/55095 해제, 소유 runtime root1462336bytes 삭제 후0. 메인 ps 조회는 sandbox에서 거부되어 성공으로 기록하지 않는다. 전체 output1853파일/152603313bytes, capture root, 기본 recordings의 최종 보존·삭제는 진행 중이며 cleanup 완료 아님. 실패 화면은 메인이 직접 확인했으나 전체 시각 검수는 미완료.
