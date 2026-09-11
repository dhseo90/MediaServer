개발·검증 증적 독자용; lifecycle은 S09 실행48365 보존이며 결과 source-of-truth는 중앙 release-test-records.md이다.

# S09 foundation --all 48365 원출력

정확한 메인 실행명령: `./server.sh verify-v410-recording-foundation --all`, exit0. 원로그1553줄164097bytes에서 모든[pass]1054행/[fail]0행 및[measure]5행을 원래상대순서대로 전수보존했다. 표행1059개, Markdown escape만적용. runtime checks517 + app-auth535 + wrapper2=원출력1054pass. 실제동적finalized/관측수에따라독립이전run의assertion수가달라질수있으며기존개수와같다는이유로완료판정하지않는다.

suite integrationExecutionPass=true/fullFoundationPass=false/resourceTrendPass=false, 두stage exit0/cleanup=true, elapsed132661ms. app-auth elapsed48643ms(start1789082254826/end1789082303469), authSuiteCompleted=true/remainingCases=[]。 suite notRun=[]는두통합stage미실행없음만뜻하며 remaining=[resource-trend,30min,120min,UI]는남는다. token start/end/consumed=null(하위작업별자동집계없음). 실제120분/30분/UI/자원안정성완료로대체하지않는다.

보존대상1059행에는 rawURL/file::/Cookie/Bearer/passwordHash/tokenHash 패턴없음 확인. 전체원로그에는source URL/debug줄이있어그비대상내용은보존하지않는다. 원문인증값은메인프로세스임시환경만사용했고 runner credentialValuesPrinted=false/outputOverflow=false. 원로그는메인확인후삭제대기로유지한다.

| 순번 | 원출력 | 결과/종류 |
| --- | --- | --- |
| 1 | [pass] RT04 production analysis registry binding | pass |
| 2 | [measure] before-warmup threads=3 fd=3 rss_bytes=26689536 rss_verdict=not-assessed | measurement-not-verdict |
| 3 | [pass] cycle0 journal open | pass |
| 4 | [pass] cycle0 catalog open | pass |
| 5 | [pass] cycle0 RT01 source opt-in persisted | pass |
| 6 | [pass] cycle0 RT01 supervisor start | pass |
| 7 | [pass] cycle0 RT01 exact one source worker stream recorder subscriber | pass |
| 8 | [pass] cycle0 RT04 actual decoder detector tracker attached | pass |
| 9 | [pass] cycle0 RT02 reconcile and analysis share original worker | pass |
| 10 | [pass] cycle0 RT04 production projector durable locator exists | pass |
| 11 | [pass] cycle0 RT09 common cleanup all owners zero | pass |
| 12 | [pass] cycle0 RT06 file idle grace cleanup finished | pass |
| 13 | [pass] cycle0 RT03 actual source finalized segment exists | pass |
| 14 | [pass] cycle0 RT03 bytes SHA UTC PTS seg-9101-1789082179977-1 | pass |
| 15 | [pass] cycle0 RT03 bytes SHA UTC PTS seg-9101-1789082188324-2 | pass |
| 16 | [pass] cycle0 RT05 identity half-open UTC obs-029c89b8e7546fdb96ede04d8c963af6 | pass |
| 17 | [pass] cycle0 RT05 identity half-open UTC obs-03eb5395ff4f64fe03845c93f81bde9f | pass |
| 18 | [pass] cycle0 RT05 identity half-open UTC obs-06a4f0a4f7018877a57ee9ea15266afe | pass |
| 19 | [pass] cycle0 RT05 identity half-open UTC obs-094338aba4e1f975a9bbf40e76ddc264 | pass |
| 20 | [pass] cycle0 RT05 identity half-open UTC obs-0968335a7c8100d9634580c071496d40 | pass |
| 21 | [pass] cycle0 RT05 identity half-open UTC obs-09f190751e48ce4b1530fb89c1f1be72 | pass |
| 22 | [pass] cycle0 RT05 identity half-open UTC obs-0bd9833378ec2855f0893e08cd9efb4c | pass |
| 23 | [pass] cycle0 RT05 identity half-open UTC obs-0ca33f8124fd68468b794a242b06bda1 | pass |
| 24 | [pass] cycle0 RT05 identity half-open UTC obs-0ff3692da23d2aabb334dfed58a5956e | pass |
| 25 | [pass] cycle0 RT05 identity half-open UTC obs-11f6079ab65b538ebc7d283a2c6c0497 | pass |
| 26 | [pass] cycle0 RT05 identity half-open UTC obs-133c19fdd6841d119d75e2dda623b5e0 | pass |
| 27 | [pass] cycle0 RT05 identity half-open UTC obs-178049f62be61cbe6e4ff44b3aa2192f | pass |
| 28 | [pass] cycle0 RT05 identity half-open UTC obs-18698f084ae0843f0372bb77c490cb26 | pass |
| 29 | [pass] cycle0 RT05 identity half-open UTC obs-1a8faa322fcc23643f00f5ee9a4f5449 | pass |
| 30 | [pass] cycle0 RT05 identity half-open UTC obs-22679a13778e49a4b180f2662c16aa15 | pass |
| 31 | [pass] cycle0 RT05 identity half-open UTC obs-2281b00e49e1c7f1d8b753ad4642cac6 | pass |
| 32 | [pass] cycle0 RT05 identity half-open UTC obs-22fa833de27a067c5f33960b2cfa0699 | pass |
| 33 | [pass] cycle0 RT05 identity half-open UTC obs-2339e6affc129b81d3470487bcef05e8 | pass |
| 34 | [pass] cycle0 RT05 identity half-open UTC obs-2373f6a42204b4d5f0bb3799334cfcd0 | pass |
| 35 | [pass] cycle0 RT05 identity half-open UTC obs-2a7e06a5dc8bb7bfb0d8d7da58708f8a | pass |
| 36 | [pass] cycle0 RT05 identity half-open UTC obs-2a8511c70e6769463dedfbe4436a859b | pass |
| 37 | [pass] cycle0 RT05 identity half-open UTC obs-2aed6193e18ac1b3948c26df8a15a5f2 | pass |
| 38 | [pass] cycle0 RT05 identity half-open UTC obs-2b2e2d10389fd9a352897a15a77c6504 | pass |
| 39 | [pass] cycle0 RT05 identity half-open UTC obs-2ca53b7ddbdb318d7cb97c56e9bb665c | pass |
| 40 | [pass] cycle0 RT05 identity half-open UTC obs-2e02192c230c8e3984b83f89ca5b28bc | pass |
| 41 | [pass] cycle0 RT05 identity half-open UTC obs-324cbd0d26edc1ac3babf770df9d9fdd | pass |
| 42 | [pass] cycle0 RT05 identity half-open UTC obs-35327b549d2c473b0d030493e0600c66 | pass |
| 43 | [pass] cycle0 RT05 identity half-open UTC obs-36e17935d29a8ccc85912ca82900e4e9 | pass |
| 44 | [pass] cycle0 RT05 identity half-open UTC obs-3857e9a6f2a92eb396e3b35d9607efca | pass |
| 45 | [pass] cycle0 RT05 identity half-open UTC obs-39619d35769bd58e6fc4d7deaa1d0a93 | pass |
| 46 | [pass] cycle0 RT05 identity half-open UTC obs-3a9112d5f1ce1642dba2ff4138f4c2bf | pass |
| 47 | [pass] cycle0 RT05 identity half-open UTC obs-3c85ff61a405df30d136accd02ca264f | pass |
| 48 | [pass] cycle0 RT05 identity half-open UTC obs-3d97aa719ac3f10f0795e9c1459a98f2 | pass |
| 49 | [pass] cycle0 RT05 identity half-open UTC obs-3fe1761545138620db3532dab536d461 | pass |
| 50 | [pass] cycle0 RT05 identity half-open UTC obs-423bd2caa2072b4cdd05419c992f0e75 | pass |
| 51 | [pass] cycle0 RT05 identity half-open UTC obs-42c698c2892b205f6052176a20e7e412 | pass |
| 52 | [pass] cycle0 RT05 identity half-open UTC obs-489d05ee5f7c67c3f47b120f4f34290a | pass |
| 53 | [pass] cycle0 RT05 identity half-open UTC obs-4a05f9ead4cf38a571fa11b2e49d7c50 | pass |
| 54 | [pass] cycle0 RT05 identity half-open UTC obs-4a4bd4ec6d58d6c2768e1f75b3a0d19f | pass |
| 55 | [pass] cycle0 RT05 identity half-open UTC obs-4f6fdd1a655f90482ebc26202d30b341 | pass |
| 56 | [pass] cycle0 RT05 identity half-open UTC obs-50227e52123e63de8dd99ed140069413 | pass |
| 57 | [pass] cycle0 RT05 identity half-open UTC obs-54b00c56b999e991e1aa6843b7ff55c0 | pass |
| 58 | [pass] cycle0 RT05 identity half-open UTC obs-590869f577d67c2d7e0a87975c43bf74 | pass |
| 59 | [pass] cycle0 RT05 identity half-open UTC obs-59144dcde758825ee004c6d479c86b53 | pass |
| 60 | [pass] cycle0 RT05 identity half-open UTC obs-61c6101330f9507cac05f6747503156d | pass |
| 61 | [pass] cycle0 RT05 identity half-open UTC obs-66c685d98d707da48e31bd7d303dc7f1 | pass |
| 62 | [pass] cycle0 RT05 identity half-open UTC obs-683944fae1460bc05ae79786c1633255 | pass |
| 63 | [pass] cycle0 RT05 identity half-open UTC obs-6bbd65dbfd4b3992024732a7ef7f594f | pass |
| 64 | [pass] cycle0 RT05 identity half-open UTC obs-712b1476b6602a407feffc91e962561d | pass |
| 65 | [pass] cycle0 RT05 identity half-open UTC obs-754f00b323a436b5a6e7baf5680d06c0 | pass |
| 66 | [pass] cycle0 RT05 identity half-open UTC obs-783b72bf0cb542b26e037fc05c6adae1 | pass |
| 67 | [pass] cycle0 RT05 identity half-open UTC obs-789ba0834aeb7c896fbc8c89686bc5ac | pass |
| 68 | [pass] cycle0 RT05 identity half-open UTC obs-7e40d02ef8be5535372f86dde5a8adf0 | pass |
| 69 | [pass] cycle0 RT05 identity half-open UTC obs-80cdbd81e4bb51484c6347905bfd090f | pass |
| 70 | [pass] cycle0 RT05 identity half-open UTC obs-80d71ab6ccc884155d458ffa83683958 | pass |
| 71 | [pass] cycle0 RT05 identity half-open UTC obs-81ddf57bfaf595ebb1a585e91d8603d6 | pass |
| 72 | [pass] cycle0 RT05 identity half-open UTC obs-8250eee3bd8308cb44a083f28d79977a | pass |
| 73 | [pass] cycle0 RT05 identity half-open UTC obs-83698ff3fad283086f79ccf54958e04d | pass |
| 74 | [pass] cycle0 RT05 identity half-open UTC obs-84abb66063b0bb60311ddf8e2fb14845 | pass |
| 75 | [pass] cycle0 RT05 identity half-open UTC obs-857d8c4aadcdda5facc7353e5a5ce576 | pass |
| 76 | [pass] cycle0 RT05 identity half-open UTC obs-86f39f1e0a37af4e6a2fcbdf2d4f611b | pass |
| 77 | [pass] cycle0 RT05 identity half-open UTC obs-8ab7dd7ab5d4c2098f1bd1ed54b2f768 | pass |
| 78 | [pass] cycle0 RT05 identity half-open UTC obs-8b4270d0d8ccf840c473cf6bdcae3107 | pass |
| 79 | [pass] cycle0 RT05 identity half-open UTC obs-8cb92cded34d2363f2755bef53b7c03a | pass |
| 80 | [pass] cycle0 RT05 identity half-open UTC obs-8ee6d5561ebb0e56fade9f571aba5537 | pass |
| 81 | [pass] cycle0 RT05 identity half-open UTC obs-932884f0df6fd1a83798629dc58a5031 | pass |
| 82 | [pass] cycle0 RT05 identity half-open UTC obs-937b992c08193391bbd50dae58c5ea0c | pass |
| 83 | [pass] cycle0 RT05 identity half-open UTC obs-94154d5024efb950beaa9483df4753f5 | pass |
| 84 | [pass] cycle0 RT05 identity half-open UTC obs-9493509d125edc418b9e01e290a4ba1e | pass |
| 85 | [pass] cycle0 RT05 identity half-open UTC obs-9a37a8d71a69eb45619a1f950b724434 | pass |
| 86 | [pass] cycle0 RT05 identity half-open UTC obs-9af5d1aa4e60ceeb180317641061d0e2 | pass |
| 87 | [pass] cycle0 RT05 identity half-open UTC obs-9c1a546cb489f02889c38aa0ff4c2771 | pass |
| 88 | [pass] cycle0 RT05 identity half-open UTC obs-9c7390f9b5f5d156886148459f11dbbb | pass |
| 89 | [pass] cycle0 RT05 identity half-open UTC obs-9d11e653f94862a2a6bbf55e58f9963b | pass |
| 90 | [pass] cycle0 RT05 identity half-open UTC obs-a13b4bdad0cf9ff1c1e7b48ca22d9cec | pass |
| 91 | [pass] cycle0 RT05 identity half-open UTC obs-a333d8dfc95e639adef7fdbef3a6772b | pass |
| 92 | [pass] cycle0 RT05 identity half-open UTC obs-a8cb9b857495b5e7404a587e2b54780a | pass |
| 93 | [pass] cycle0 RT05 identity half-open UTC obs-a9edd3f4ac4414eab9a2c4c14c24391b | pass |
| 94 | [pass] cycle0 RT05 identity half-open UTC obs-ad421a8e1a21e7d652a03bbdfd60bc87 | pass |
| 95 | [pass] cycle0 RT05 identity half-open UTC obs-ae5fa325beee10ce4069eba6cb091fcb | pass |
| 96 | [pass] cycle0 RT05 identity half-open UTC obs-afcb505ee3b9bf794678701f07f62dde | pass |
| 97 | [pass] cycle0 RT05 identity half-open UTC obs-b1bd6b0149afd467d5461f6245831652 | pass |
| 98 | [pass] cycle0 RT05 identity half-open UTC obs-b29541f4eea04ccf655cea7949e1e6fe | pass |
| 99 | [pass] cycle0 RT05 identity half-open UTC obs-baacb27232a1a76c2958ea3f9ad0d0d9 | pass |
| 100 | [pass] cycle0 RT05 identity half-open UTC obs-bc9cac252be451054db74e9125800c64 | pass |
| 101 | [pass] cycle0 RT05 identity half-open UTC obs-bf496c6fc1353282c3484531b6651a83 | pass |
| 102 | [pass] cycle0 RT05 identity half-open UTC obs-c0053e6823dd0eeed84ceb329badea33 | pass |
| 103 | [pass] cycle0 RT05 identity half-open UTC obs-c0126e5b544d5794f546320e5dafdcd5 | pass |
| 104 | [pass] cycle0 RT05 identity half-open UTC obs-c077b714bd515338b1a3f7d966ec4355 | pass |
| 105 | [pass] cycle0 RT05 identity half-open UTC obs-c0a982514974dfeb2fca649df16cf4a2 | pass |
| 106 | [pass] cycle0 RT05 identity half-open UTC obs-c1742777830eb04dc6d93407cbddc138 | pass |
| 107 | [pass] cycle0 RT05 identity half-open UTC obs-c1d78e52387f3d388b498fedb89ac5e9 | pass |
| 108 | [pass] cycle0 RT05 identity half-open UTC obs-c69e8cf6de6450ad9d5ea6244f6fae34 | pass |
| 109 | [pass] cycle0 RT05 identity half-open UTC obs-c760dcbac991c9c6d734cc650803223f | pass |
| 110 | [pass] cycle0 RT05 identity half-open UTC obs-c97d34e5a2b315261ff4c49648ed59df | pass |
| 111 | [pass] cycle0 RT05 identity half-open UTC obs-cd197bca4951901fa4f9548254dcdde2 | pass |
| 112 | [pass] cycle0 RT05 identity half-open UTC obs-cd9f29feeb881a94106179077348f8c1 | pass |
| 113 | [pass] cycle0 RT05 identity half-open UTC obs-d4a5037f155313f749f33daa71000b64 | pass |
| 114 | [pass] cycle0 RT05 identity half-open UTC obs-d4b049f1ac418d2ff70847013be7257e | pass |
| 115 | [pass] cycle0 RT05 identity half-open UTC obs-d59d1eaf2866d6b131aa08a3a53ef444 | pass |
| 116 | [pass] cycle0 RT05 identity half-open UTC obs-da724597118334882ab3bad631afecdd | pass |
| 117 | [pass] cycle0 RT05 identity half-open UTC obs-dbc41d5ce14cd9648d199eaf9c92fffd | pass |
| 118 | [pass] cycle0 RT05 identity half-open UTC obs-dcd624529d49f4e17fe13495149a9d50 | pass |
| 119 | [pass] cycle0 RT05 identity half-open UTC obs-dfb274d365bd8dd1d4a3e276c6f73734 | pass |
| 120 | [pass] cycle0 RT05 identity half-open UTC obs-e0e80c139c3d0614fbf19961719f23e5 | pass |
| 121 | [pass] cycle0 RT05 identity half-open UTC obs-e158cadd2c03e8825eaa626affd2d51f | pass |
| 122 | [pass] cycle0 RT05 identity half-open UTC obs-e37f621d3670552e22b63cae401fa4a9 | pass |
| 123 | [pass] cycle0 RT05 identity half-open UTC obs-e56d1022f7be1e529bc0c1b37003b513 | pass |
| 124 | [pass] cycle0 RT05 identity half-open UTC obs-e75ee204a9295a94bd5c4d31748c5ccf | pass |
| 125 | [pass] cycle0 RT05 identity half-open UTC obs-e88a8cd83ef0de67b5488d66467df576 | pass |
| 126 | [pass] cycle0 RT05 identity half-open UTC obs-ecfca1edf9143eed35543c3bfdd4abc8 | pass |
| 127 | [pass] cycle0 RT05 identity half-open UTC obs-edfab7ccfc9d383b901c71539c084006 | pass |
| 128 | [pass] cycle0 RT05 identity half-open UTC obs-ee8023be7e4f5e5cbe141cac742c5545 | pass |
| 129 | [pass] cycle0 RT05 identity half-open UTC obs-fe14f9450fb47c82f645a951050e48d7 | pass |
| 130 | [pass] cycle0 RT04 nonempty real tracks and media | pass |
| 131 | [pass] cycle0 RT06 all runtime owners and held stream stopped | pass |
| 132 | [pass] cycle0 RT06 projector drained without storage rejection | pass |
| 133 | [pass] cycle0 RT06 no partial ready cleanup marker | pass |
| 134 | [measure] warmup-stop threads=10 fd=3 rss_bytes=199622656 rss_verdict=not-assessed | measurement-not-verdict |
| 135 | [pass] RT07 supported process measurements 0 | pass |
| 136 | [pass] cycle1 journal open | pass |
| 137 | [pass] cycle1 catalog open | pass |
| 138 | [pass] cycle1 RT01 source opt-in persisted | pass |
| 139 | [pass] cycle1 RT01 supervisor start | pass |
| 140 | [pass] cycle1 RT01 exact one source worker stream recorder subscriber | pass |
| 141 | [pass] cycle1 RT04 actual decoder detector tracker attached | pass |
| 142 | [pass] cycle1 RT02 reconcile and analysis share original worker | pass |
| 143 | [pass] cycle1 RT04 production projector durable locator exists | pass |
| 144 | [pass] cycle1 RT09 common cleanup all owners zero | pass |
| 145 | [pass] cycle1 RT06 file idle grace cleanup finished | pass |
| 146 | [pass] cycle1 RT03 actual source finalized segment exists | pass |
| 147 | [pass] cycle1 RT03 bytes SHA UTC PTS seg-9101-1789082198615-1 | pass |
| 148 | [pass] cycle1 RT03 bytes SHA UTC PTS seg-9101-1789082206964-2 | pass |
| 149 | [pass] cycle1 RT05 identity half-open UTC obs-01a85d8be72db45bcdc7d3efe2156d46 | pass |
| 150 | [pass] cycle1 RT05 identity half-open UTC obs-029b18604407ec737394b00bd1ccffe0 | pass |
| 151 | [pass] cycle1 RT05 identity half-open UTC obs-034d799ec4bd4a6f1de7ac51d2df9ece | pass |
| 152 | [pass] cycle1 RT05 identity half-open UTC obs-062ff7476d4fbefafacee9312e8d5cdb | pass |
| 153 | [pass] cycle1 RT05 identity half-open UTC obs-0bf1b03001d2627dbc00397a12ff018c | pass |
| 154 | [pass] cycle1 RT05 identity half-open UTC obs-0bfd6d52f4d22d783f2c21ba54886bc9 | pass |
| 155 | [pass] cycle1 RT05 identity half-open UTC obs-0e01f6e318e471af69215b211c9e0c1e | pass |
| 156 | [pass] cycle1 RT05 identity half-open UTC obs-0f7adece0a7b5c59ba9e6cdc98dcff76 | pass |
| 157 | [pass] cycle1 RT05 identity half-open UTC obs-111c5aadb0388ffbb83042f2afe51906 | pass |
| 158 | [pass] cycle1 RT05 identity half-open UTC obs-112670d7f8cd9e1c1700624601ab9b57 | pass |
| 159 | [pass] cycle1 RT05 identity half-open UTC obs-11f15a95f964e06a4a2716f2b5164eeb | pass |
| 160 | [pass] cycle1 RT05 identity half-open UTC obs-142435455e0abe36eb5b03500b32334b | pass |
| 161 | [pass] cycle1 RT05 identity half-open UTC obs-163bc6770120e162dcd5b1e33410311f | pass |
| 162 | [pass] cycle1 RT05 identity half-open UTC obs-1721aa77d0412c89b6dfca4686f00b7c | pass |
| 163 | [pass] cycle1 RT05 identity half-open UTC obs-1ab9e5bc082701e4028862287ae5f041 | pass |
| 164 | [pass] cycle1 RT05 identity half-open UTC obs-1acdce0df0ed366b45e7aab847bbf136 | pass |
| 165 | [pass] cycle1 RT05 identity half-open UTC obs-1bfb75f5dac0d2031d3304b70c0abb52 | pass |
| 166 | [pass] cycle1 RT05 identity half-open UTC obs-1ee3ddb700036edd1003867bf74d21e4 | pass |
| 167 | [pass] cycle1 RT05 identity half-open UTC obs-2230148b1a29377289474f6fbff88e0b | pass |
| 168 | [pass] cycle1 RT05 identity half-open UTC obs-2267ecf7a351ba8844987e62cdfe6f39 | pass |
| 169 | [pass] cycle1 RT05 identity half-open UTC obs-294562313f29707892841e8257e90725 | pass |
| 170 | [pass] cycle1 RT05 identity half-open UTC obs-2a09a45752e760fab72d58142f91876f | pass |
| 171 | [pass] cycle1 RT05 identity half-open UTC obs-2abf4fd8819a29c4e55106a360afbcf9 | pass |
| 172 | [pass] cycle1 RT05 identity half-open UTC obs-2bb514cebe4e174b3b5e0344b1544586 | pass |
| 173 | [pass] cycle1 RT05 identity half-open UTC obs-2c7cec288d00ac3c1723273f9c035fab | pass |
| 174 | [pass] cycle1 RT05 identity half-open UTC obs-3090b2196a86133f1997e83993e21284 | pass |
| 175 | [pass] cycle1 RT05 identity half-open UTC obs-33278841ad828aece79de7fcb0275531 | pass |
| 176 | [pass] cycle1 RT05 identity half-open UTC obs-33e62abc5ca3699f0f975f5fa1a12d96 | pass |
| 177 | [pass] cycle1 RT05 identity half-open UTC obs-360d1cfc41ff33faf4fe1147788fb597 | pass |
| 178 | [pass] cycle1 RT05 identity half-open UTC obs-3888c0d358d689d2d178295c96160a71 | pass |
| 179 | [pass] cycle1 RT05 identity half-open UTC obs-3964b2c37a7a9c10761b083330cb7499 | pass |
| 180 | [pass] cycle1 RT05 identity half-open UTC obs-3985950d4fb260b72ff59069aba60c22 | pass |
| 181 | [pass] cycle1 RT05 identity half-open UTC obs-3b9a4d8726d71bf897833424d3e7b8a1 | pass |
| 182 | [pass] cycle1 RT05 identity half-open UTC obs-3c35b118ca76f882927b86b3abad6f8f | pass |
| 183 | [pass] cycle1 RT05 identity half-open UTC obs-3fc4c56856b4d90d62495b442401dbc8 | pass |
| 184 | [pass] cycle1 RT05 identity half-open UTC obs-449a15fcd71e95c6f87d4ddfefdcd66b | pass |
| 185 | [pass] cycle1 RT05 identity half-open UTC obs-456912036d01c0848b3b3bc16a943241 | pass |
| 186 | [pass] cycle1 RT05 identity half-open UTC obs-472482c568d06eb3d92e6dc17c5714a0 | pass |
| 187 | [pass] cycle1 RT05 identity half-open UTC obs-472627443f4a27daf70a8a0aa9252bab | pass |
| 188 | [pass] cycle1 RT05 identity half-open UTC obs-47d0f26f5e8c3b21c9238b466b361a14 | pass |
| 189 | [pass] cycle1 RT05 identity half-open UTC obs-491b70cd6824aad5170e7411a412be76 | pass |
| 190 | [pass] cycle1 RT05 identity half-open UTC obs-4f40f2d55744660ad932f25cbc949c83 | pass |
| 191 | [pass] cycle1 RT05 identity half-open UTC obs-50ba4142f082f54069e6e68190c0a7c9 | pass |
| 192 | [pass] cycle1 RT05 identity half-open UTC obs-5138e00c36b07f753b7a61585f0b73c8 | pass |
| 193 | [pass] cycle1 RT05 identity half-open UTC obs-5752b51ea451d0d93e97413859d0ab7c | pass |
| 194 | [pass] cycle1 RT05 identity half-open UTC obs-5f7ee80911351d650bebdc670f9b1004 | pass |
| 195 | [pass] cycle1 RT05 identity half-open UTC obs-6537aa86c7ee6a2c353ca9905d4bcb71 | pass |
| 196 | [pass] cycle1 RT05 identity half-open UTC obs-6554a3db7967f1aedcdd2b78200a78d7 | pass |
| 197 | [pass] cycle1 RT05 identity half-open UTC obs-66d2b124744acf4049ce0c49d5c97be9 | pass |
| 198 | [pass] cycle1 RT05 identity half-open UTC obs-681cf66382819ac275e2fbf4d379e6cf | pass |
| 199 | [pass] cycle1 RT05 identity half-open UTC obs-683e8cb69fee41a05cf338d19e1d5e59 | pass |
| 200 | [pass] cycle1 RT05 identity half-open UTC obs-68b869ed9a6a68699694b25a1a6f7aa4 | pass |
| 201 | [pass] cycle1 RT05 identity half-open UTC obs-68caccba8c41229b3501537058c38f5e | pass |
| 202 | [pass] cycle1 RT05 identity half-open UTC obs-708048eae919e2e16c9c28ac85a7e9a4 | pass |
| 203 | [pass] cycle1 RT05 identity half-open UTC obs-709e8f6ab9923b6d5364d61d883ac434 | pass |
| 204 | [pass] cycle1 RT05 identity half-open UTC obs-72cdeefb5a200f2cf49cca646a849041 | pass |
| 205 | [pass] cycle1 RT05 identity half-open UTC obs-751b1164f487e1459b3909dbde21ef6c | pass |
| 206 | [pass] cycle1 RT05 identity half-open UTC obs-774706a70b850da3339cea6e8c688782 | pass |
| 207 | [pass] cycle1 RT05 identity half-open UTC obs-7783eb7c02d47935b8cad9fe4f3758a6 | pass |
| 208 | [pass] cycle1 RT05 identity half-open UTC obs-7c99f49505751ff4001e9d17db0d5301 | pass |
| 209 | [pass] cycle1 RT05 identity half-open UTC obs-8186203260ad32d7c9e3f1e0cb82e3a6 | pass |
| 210 | [pass] cycle1 RT05 identity half-open UTC obs-871196956230f9f13aeb74e4476696b4 | pass |
| 211 | [pass] cycle1 RT05 identity half-open UTC obs-8821eee29fa85ca2c45743241319a3b1 | pass |
| 212 | [pass] cycle1 RT05 identity half-open UTC obs-8e4568c8ee350d2cf4794feab0ad2771 | pass |
| 213 | [pass] cycle1 RT05 identity half-open UTC obs-8f32ea2a663e949d075a59a79b30f708 | pass |
| 214 | [pass] cycle1 RT05 identity half-open UTC obs-8f336cf60b82c80922b0c8c58a33de0c | pass |
| 215 | [pass] cycle1 RT05 identity half-open UTC obs-92971a80dbff51ccf41736ea5dda562d | pass |
| 216 | [pass] cycle1 RT05 identity half-open UTC obs-9426e98a6b601ccc89d7efbd4f4ba4ad | pass |
| 217 | [pass] cycle1 RT05 identity half-open UTC obs-95a721ca8de6aa4956f2e232ddad38bc | pass |
| 218 | [pass] cycle1 RT05 identity half-open UTC obs-95ae8121af7daaad7cea0286bd5f90b8 | pass |
| 219 | [pass] cycle1 RT05 identity half-open UTC obs-9c1e9f7ca5a98e1f9f8e2ff7044b4b62 | pass |
| 220 | [pass] cycle1 RT05 identity half-open UTC obs-9dd7676530ae6989c9b3dfe1e9578abc | pass |
| 221 | [pass] cycle1 RT05 identity half-open UTC obs-a241a6f38566a15c17c884d3ac860995 | pass |
| 222 | [pass] cycle1 RT05 identity half-open UTC obs-a55fcd424644d4d770d3896ae427dfba | pass |
| 223 | [pass] cycle1 RT05 identity half-open UTC obs-a67cee47d7d17a754f3e1690968e74d4 | pass |
| 224 | [pass] cycle1 RT05 identity half-open UTC obs-a85806491dc89b0668328ddc43520d37 | pass |
| 225 | [pass] cycle1 RT05 identity half-open UTC obs-a9c4ae2616485123f9b63ba34d5ffdca | pass |
| 226 | [pass] cycle1 RT05 identity half-open UTC obs-abf4476c91d8a125d18ef9d9c8bc5a9c | pass |
| 227 | [pass] cycle1 RT05 identity half-open UTC obs-ae9ee0d6dd9a0913cf5d3c5b2f10ebf6 | pass |
| 228 | [pass] cycle1 RT05 identity half-open UTC obs-b0a1f17856ec215eda62cc26caa9fbaf | pass |
| 229 | [pass] cycle1 RT05 identity half-open UTC obs-b192f595ee1a495786885fc7ee16c146 | pass |
| 230 | [pass] cycle1 RT05 identity half-open UTC obs-b44e3fb23ed4d90fc7af9b1971596226 | pass |
| 231 | [pass] cycle1 RT05 identity half-open UTC obs-b62e72a1def029ae139c71605cddf99f | pass |
| 232 | [pass] cycle1 RT05 identity half-open UTC obs-b77b13a45739bd7cd852b4aa55f68719 | pass |
| 233 | [pass] cycle1 RT05 identity half-open UTC obs-bdb72243f6fa268a857ca44bf150347f | pass |
| 234 | [pass] cycle1 RT05 identity half-open UTC obs-c0caf391b979b53e687992d02e7ef043 | pass |
| 235 | [pass] cycle1 RT05 identity half-open UTC obs-c1942f378018d2130f44fc03031d56da | pass |
| 236 | [pass] cycle1 RT05 identity half-open UTC obs-c63525f3b765bf033c499ec49dfa09d6 | pass |
| 237 | [pass] cycle1 RT05 identity half-open UTC obs-c8fea05fe5cc86a36f60c5959d7034fa | pass |
| 238 | [pass] cycle1 RT05 identity half-open UTC obs-cc0029d35aba61f6f670d51cbf476057 | pass |
| 239 | [pass] cycle1 RT05 identity half-open UTC obs-cf0b174a4c433101778d36fd0a76aa50 | pass |
| 240 | [pass] cycle1 RT05 identity half-open UTC obs-d01b3146411d49362a9df5955952fd6f | pass |
| 241 | [pass] cycle1 RT05 identity half-open UTC obs-d1249783ab7f65269cd3f335e278ae8d | pass |
| 242 | [pass] cycle1 RT05 identity half-open UTC obs-d301cf3bec73b110ac3122402f3c2ced | pass |
| 243 | [pass] cycle1 RT05 identity half-open UTC obs-d3f1f20496304e2ddb71549d9635320c | pass |
| 244 | [pass] cycle1 RT05 identity half-open UTC obs-d4bf4e729029e4dcdde1d6086d7d7fdd | pass |
| 245 | [pass] cycle1 RT05 identity half-open UTC obs-e0928abc6978c4624aba8c1e2b296b53 | pass |
| 246 | [pass] cycle1 RT05 identity half-open UTC obs-e0f79c9d9246c9d385159bf2a75f1686 | pass |
| 247 | [pass] cycle1 RT05 identity half-open UTC obs-e36b45ccf44021e6e8b4f789057d5eb1 | pass |
| 248 | [pass] cycle1 RT05 identity half-open UTC obs-e95b88347258f07009e3d5a1c8efb651 | pass |
| 249 | [pass] cycle1 RT05 identity half-open UTC obs-e9fd0ca5c653098de8907e0ec5315e6c | pass |
| 250 | [pass] cycle1 RT05 identity half-open UTC obs-eb83413546f1e187b213e6d54cb619e6 | pass |
| 251 | [pass] cycle1 RT05 identity half-open UTC obs-ed2e0834dada3e621d990b88e0aed51f | pass |
| 252 | [pass] cycle1 RT05 identity half-open UTC obs-eda6a6a686bd1dcb42ab3546528e8e06 | pass |
| 253 | [pass] cycle1 RT05 identity half-open UTC obs-f186f3559907d770d9c4f51b9f736211 | pass |
| 254 | [pass] cycle1 RT05 identity half-open UTC obs-f1efeafbc563c4c4a4b127776de881c9 | pass |
| 255 | [pass] cycle1 RT05 identity half-open UTC obs-fb714a01a327344e1980eb09f9acf45f | pass |
| 256 | [pass] cycle1 RT05 identity half-open UTC obs-fe56677b34919572b7bf8ca405dd2c77 | pass |
| 257 | [pass] cycle1 RT05 identity half-open UTC obs-fe92cf3321fef4712edafeffcfc05390 | pass |
| 258 | [pass] cycle1 RT05 identity half-open UTC obs-fe9cf18475deff510bdca5908ba0aca0 | pass |
| 259 | [pass] cycle1 RT04 nonempty real tracks and media | pass |
| 260 | [pass] cycle1 RT06 all runtime owners and held stream stopped | pass |
| 261 | [pass] cycle1 RT06 projector drained without storage rejection | pass |
| 262 | [pass] cycle1 RT06 no partial ready cleanup marker | pass |
| 263 | [measure] repeat-stop-1 threads=10 fd=3 rss_bytes=196427776 rss_verdict=not-assessed | measurement-not-verdict |
| 264 | [pass] RT07 supported process measurements 1 | pass |
| 265 | [pass] cycle2 journal open | pass |
| 266 | [pass] cycle2 catalog open | pass |
| 267 | [pass] cycle2 RT01 source opt-in persisted | pass |
| 268 | [pass] cycle2 RT01 supervisor start | pass |
| 269 | [pass] cycle2 RT01 exact one source worker stream recorder subscriber | pass |
| 270 | [pass] cycle2 RT04 actual decoder detector tracker attached | pass |
| 271 | [pass] cycle2 RT02 reconcile and analysis share original worker | pass |
| 272 | [pass] cycle2 RT04 production projector durable locator exists | pass |
| 273 | [pass] cycle2 RT09 common cleanup all owners zero | pass |
| 274 | [pass] cycle2 RT06 file idle grace cleanup finished | pass |
| 275 | [pass] cycle2 RT03 actual source finalized segment exists | pass |
| 276 | [pass] cycle2 RT03 bytes SHA UTC PTS seg-9101-1789082217261-1 | pass |
| 277 | [pass] cycle2 RT03 bytes SHA UTC PTS seg-9101-1789082225612-2 | pass |
| 278 | [pass] cycle2 RT05 identity half-open UTC obs-0a6d64a98841e202eb279728f3b87d13 | pass |
| 279 | [pass] cycle2 RT05 identity half-open UTC obs-0d0bc92e12923229e73db344e3206464 | pass |
| 280 | [pass] cycle2 RT05 identity half-open UTC obs-0dac233be26115afdb77d5ff0cf0f22a | pass |
| 281 | [pass] cycle2 RT05 identity half-open UTC obs-1084c35ed10a354b9fbba8a821ac19ee | pass |
| 282 | [pass] cycle2 RT05 identity half-open UTC obs-10e10528b599a4d8c1dcf95e6e146029 | pass |
| 283 | [pass] cycle2 RT05 identity half-open UTC obs-119ba066b3658fef9d6e48af0235d30e | pass |
| 284 | [pass] cycle2 RT05 identity half-open UTC obs-12a11b72fcec907462c8a57974f45669 | pass |
| 285 | [pass] cycle2 RT05 identity half-open UTC obs-14dc4f5fd060b244583acd63ab808223 | pass |
| 286 | [pass] cycle2 RT05 identity half-open UTC obs-16b969eded8643d92000c8e1a336bd76 | pass |
| 287 | [pass] cycle2 RT05 identity half-open UTC obs-1b0fdfa9ce4d364ec567f05a4ad2f1cb | pass |
| 288 | [pass] cycle2 RT05 identity half-open UTC obs-21f7b692f9b401b2789a8951c07891a3 | pass |
| 289 | [pass] cycle2 RT05 identity half-open UTC obs-25f87b382f33c76dba72114176bccaf4 | pass |
| 290 | [pass] cycle2 RT05 identity half-open UTC obs-26fda5e739b0ec6c56212fdd3891b5ad | pass |
| 291 | [pass] cycle2 RT05 identity half-open UTC obs-2783ab32cbb60dc2f1a74c5904a15db1 | pass |
| 292 | [pass] cycle2 RT05 identity half-open UTC obs-29207cc908b43ee5b393be236352ebf8 | pass |
| 293 | [pass] cycle2 RT05 identity half-open UTC obs-295af4f89012506d8da534d642ae384c | pass |
| 294 | [pass] cycle2 RT05 identity half-open UTC obs-2a9f7d55fe80aad024a5ec7a996a8fed | pass |
| 295 | [pass] cycle2 RT05 identity half-open UTC obs-2cf6e4b28e7c50761ba06e2fa2c20917 | pass |
| 296 | [pass] cycle2 RT05 identity half-open UTC obs-2e87cad647de62b8104794a1386497e9 | pass |
| 297 | [pass] cycle2 RT05 identity half-open UTC obs-3255c1f87af4617bc2a900b278f12506 | pass |
| 298 | [pass] cycle2 RT05 identity half-open UTC obs-3265b7e4a015d5de7d4bbdb7f53e681b | pass |
| 299 | [pass] cycle2 RT05 identity half-open UTC obs-367c323d0885c1790745b4ff367cd7a6 | pass |
| 300 | [pass] cycle2 RT05 identity half-open UTC obs-37373e55808efba7f65316a098106c3e | pass |
| 301 | [pass] cycle2 RT05 identity half-open UTC obs-39dd158ec6434da22b3b5a30d3761237 | pass |
| 302 | [pass] cycle2 RT05 identity half-open UTC obs-3a5375fa2f23d52506b6f0063cc82894 | pass |
| 303 | [pass] cycle2 RT05 identity half-open UTC obs-3b9863031d73f85b9d78759ef8c41e3a | pass |
| 304 | [pass] cycle2 RT05 identity half-open UTC obs-423f11f5db0181f5fea3088fdb868730 | pass |
| 305 | [pass] cycle2 RT05 identity half-open UTC obs-46548cd303ab4069ec8f43b4c272a218 | pass |
| 306 | [pass] cycle2 RT05 identity half-open UTC obs-4d3734d109e6d30baa9872d7d9e35728 | pass |
| 307 | [pass] cycle2 RT05 identity half-open UTC obs-4f3ea2e5bff065b1555b72621666420c | pass |
| 308 | [pass] cycle2 RT05 identity half-open UTC obs-50da4cf59d09368ecbb4cb42a625fa9f | pass |
| 309 | [pass] cycle2 RT05 identity half-open UTC obs-51716872751c695185206f30f9a62360 | pass |
| 310 | [pass] cycle2 RT05 identity half-open UTC obs-522f483024482bf6791a83afa1a11533 | pass |
| 311 | [pass] cycle2 RT05 identity half-open UTC obs-544db8f33d900241cb756b782a965ec8 | pass |
| 312 | [pass] cycle2 RT05 identity half-open UTC obs-578468268d72d687c950c951af0d4ca2 | pass |
| 313 | [pass] cycle2 RT05 identity half-open UTC obs-5c35bffa323224011abfa6390d7823ac | pass |
| 314 | [pass] cycle2 RT05 identity half-open UTC obs-5c6fcfee58243d556a866e547a20bc7c | pass |
| 315 | [pass] cycle2 RT05 identity half-open UTC obs-5ed4342b37a7c8875198a77dd7f69f42 | pass |
| 316 | [pass] cycle2 RT05 identity half-open UTC obs-5f6a727a0088add93a8259f02349dc80 | pass |
| 317 | [pass] cycle2 RT05 identity half-open UTC obs-60e609e0ef3e39cfcc52dc6222d37e7a | pass |
| 318 | [pass] cycle2 RT05 identity half-open UTC obs-617fee7f7a397c483f7f2434b8076d09 | pass |
| 319 | [pass] cycle2 RT05 identity half-open UTC obs-636241614ab7c236e9df3e0a0f6b6d57 | pass |
| 320 | [pass] cycle2 RT05 identity half-open UTC obs-63bd34410c23284a227d3564fa9faa23 | pass |
| 321 | [pass] cycle2 RT05 identity half-open UTC obs-666f0ca5eeb07ce11c89e05a75792f84 | pass |
| 322 | [pass] cycle2 RT05 identity half-open UTC obs-66eb3205b89a7c4431e45c667fc3b063 | pass |
| 323 | [pass] cycle2 RT05 identity half-open UTC obs-67e08585c1ab3a9c0b67ef04669f0aa5 | pass |
| 324 | [pass] cycle2 RT05 identity half-open UTC obs-694b5d26b72415d194bf72d42156bf6c | pass |
| 325 | [pass] cycle2 RT05 identity half-open UTC obs-696256b338afa1eb22696b1797c2e04e | pass |
| 326 | [pass] cycle2 RT05 identity half-open UTC obs-6deefe0a1c2e99b2d2919277fe039bab | pass |
| 327 | [pass] cycle2 RT05 identity half-open UTC obs-6ea86ccb3db5c240b4de4aeab38304d9 | pass |
| 328 | [pass] cycle2 RT05 identity half-open UTC obs-75638c3e9d9ab927d6f22fd4c5973032 | pass |
| 329 | [pass] cycle2 RT05 identity half-open UTC obs-756bbe836d4743a8270a81847ac22439 | pass |
| 330 | [pass] cycle2 RT05 identity half-open UTC obs-769383bbd0e3798f2cd06c2b3fbfc03e | pass |
| 331 | [pass] cycle2 RT05 identity half-open UTC obs-76be615352780ae71063b21bdab077ea | pass |
| 332 | [pass] cycle2 RT05 identity half-open UTC obs-77ff4e3138cf3b6ad5d0ffa60f4d1ec5 | pass |
| 333 | [pass] cycle2 RT05 identity half-open UTC obs-790aea197c9fd7e01ff2b71600cf9a57 | pass |
| 334 | [pass] cycle2 RT05 identity half-open UTC obs-79e92f95ce0ea1fd9635201427d89372 | pass |
| 335 | [pass] cycle2 RT05 identity half-open UTC obs-7bcb1eefcf20db874e4c089eb094a328 | pass |
| 336 | [pass] cycle2 RT05 identity half-open UTC obs-7bf74028d14f0fd2553f54e7741a620b | pass |
| 337 | [pass] cycle2 RT05 identity half-open UTC obs-7d664fe428f4b934d65583d1889fd949 | pass |
| 338 | [pass] cycle2 RT05 identity half-open UTC obs-7d8f085ee750bd730c0cd199c3f01c2e | pass |
| 339 | [pass] cycle2 RT05 identity half-open UTC obs-839314abb5d25d4b0a2ec252e78f203a | pass |
| 340 | [pass] cycle2 RT05 identity half-open UTC obs-88908b35a7648d2c99d1c8355ca05b71 | pass |
| 341 | [pass] cycle2 RT05 identity half-open UTC obs-88e90ae3890537b0cd335e08ef976f11 | pass |
| 342 | [pass] cycle2 RT05 identity half-open UTC obs-89a53fec1a00f45c28109ec313ebda75 | pass |
| 343 | [pass] cycle2 RT05 identity half-open UTC obs-9277d7b46355b52a0b0395cbdd03f9af | pass |
| 344 | [pass] cycle2 RT05 identity half-open UTC obs-94ce6a11533ead200754383c57838af1 | pass |
| 345 | [pass] cycle2 RT05 identity half-open UTC obs-955fbd5d50d93f71db2e77c833251a78 | pass |
| 346 | [pass] cycle2 RT05 identity half-open UTC obs-9a77f581dacbceeeb1d52bf1419b4c27 | pass |
| 347 | [pass] cycle2 RT05 identity half-open UTC obs-9d9292706ec004770a7d779588d08a96 | pass |
| 348 | [pass] cycle2 RT05 identity half-open UTC obs-9ec4e6e8faccd00f5852e9f27d7135ba | pass |
| 349 | [pass] cycle2 RT05 identity half-open UTC obs-9fd9ab6961a017d372550e04945eeec6 | pass |
| 350 | [pass] cycle2 RT05 identity half-open UTC obs-a1111d72f65fd4777a1a27be15ec30d8 | pass |
| 351 | [pass] cycle2 RT05 identity half-open UTC obs-a34cbb47ba9c7d5cb2b44866719064e1 | pass |
| 352 | [pass] cycle2 RT05 identity half-open UTC obs-a35f84e0e4cf8db8b2ff049b50521345 | pass |
| 353 | [pass] cycle2 RT05 identity half-open UTC obs-a77b6fe20e79cf32611d8367cefd4267 | pass |
| 354 | [pass] cycle2 RT05 identity half-open UTC obs-a7ee3cddcea257f331213f17e3456242 | pass |
| 355 | [pass] cycle2 RT05 identity half-open UTC obs-acd2cf034d792381cc9dcaa25ea1e7a0 | pass |
| 356 | [pass] cycle2 RT05 identity half-open UTC obs-ad23d883f4f6c8ef01ad0490db5a90ca | pass |
| 357 | [pass] cycle2 RT05 identity half-open UTC obs-ae4b724f94c6759beb4d722dd060d60a | pass |
| 358 | [pass] cycle2 RT05 identity half-open UTC obs-b06993803676eb9e5f69c6567aba134b | pass |
| 359 | [pass] cycle2 RT05 identity half-open UTC obs-b8260365ae72c991fccbe5742ee9c540 | pass |
| 360 | [pass] cycle2 RT05 identity half-open UTC obs-bda6ecef3a3e85e874918f6796069e65 | pass |
| 361 | [pass] cycle2 RT05 identity half-open UTC obs-bffc42218da71c2e40611ce11294f2e3 | pass |
| 362 | [pass] cycle2 RT05 identity half-open UTC obs-c2b69e42b4f9a85661e9890444ff3daf | pass |
| 363 | [pass] cycle2 RT05 identity half-open UTC obs-c5e2f60b4a890d9c264126be853be7c1 | pass |
| 364 | [pass] cycle2 RT05 identity half-open UTC obs-c6bfdb837fbe6031163fe10aa75bbe5c | pass |
| 365 | [pass] cycle2 RT05 identity half-open UTC obs-cb90d0fe2db876c28062bc81d87f917f | pass |
| 366 | [pass] cycle2 RT05 identity half-open UTC obs-cde1133e98f9b1139cf9202b82312326 | pass |
| 367 | [pass] cycle2 RT05 identity half-open UTC obs-cfebcd3b502cc70e719c1a9f18044af7 | pass |
| 368 | [pass] cycle2 RT05 identity half-open UTC obs-d0376127ff75d0bfa54fa0fa15f39276 | pass |
| 369 | [pass] cycle2 RT05 identity half-open UTC obs-d0d4f0b5fb43aa254db675d356b68778 | pass |
| 370 | [pass] cycle2 RT05 identity half-open UTC obs-d2fab7fa704a6aa06fcaa1aaabcc948d | pass |
| 371 | [pass] cycle2 RT05 identity half-open UTC obs-d6814729a28ba61a9b3bf43bf71c6e9b | pass |
| 372 | [pass] cycle2 RT05 identity half-open UTC obs-d6e68346cd05f0cdf00607388f764390 | pass |
| 373 | [pass] cycle2 RT05 identity half-open UTC obs-d92d9a3ec2ab8cac9f9f8b2d7f6039ed | pass |
| 374 | [pass] cycle2 RT05 identity half-open UTC obs-dc74b49fa60c6ab7e1304835b4e8f05e | pass |
| 375 | [pass] cycle2 RT05 identity half-open UTC obs-dce91cc103ff38bd2ebb904e9b5fee1c | pass |
| 376 | [pass] cycle2 RT05 identity half-open UTC obs-ddeabbcd2c9763386aa28bcf1c6c9c7d | pass |
| 377 | [pass] cycle2 RT05 identity half-open UTC obs-e0d604f246e9c842e2442412d108a8f3 | pass |
| 378 | [pass] cycle2 RT05 identity half-open UTC obs-e12b9de1bd7083a5572a8806badd9388 | pass |
| 379 | [pass] cycle2 RT05 identity half-open UTC obs-e171f0078d8be142f5e0c760f9dc7dcf | pass |
| 380 | [pass] cycle2 RT05 identity half-open UTC obs-e1eda3b87bec8ae8502033afc8d7cfe3 | pass |
| 381 | [pass] cycle2 RT05 identity half-open UTC obs-e3682c57f56ee0448f72469c34453ae1 | pass |
| 382 | [pass] cycle2 RT05 identity half-open UTC obs-ebd2a5c28d08767c329a8aa7a4ac78c9 | pass |
| 383 | [pass] cycle2 RT05 identity half-open UTC obs-f11f53974f7e71681eca3d287b40dce5 | pass |
| 384 | [pass] cycle2 RT05 identity half-open UTC obs-f1e07bad0c5387d55ee9ab206ba7cbbc | pass |
| 385 | [pass] cycle2 RT05 identity half-open UTC obs-f43969fb830a185ee4974b73bb16040f | pass |
| 386 | [pass] cycle2 RT05 identity half-open UTC obs-f8187eeb29c0ceb25a87477dc86fcb53 | pass |
| 387 | [pass] cycle2 RT05 identity half-open UTC obs-f9a32364aa1218196d6b49a9b3fc6958 | pass |
| 388 | [pass] cycle2 RT04 nonempty real tracks and media | pass |
| 389 | [pass] cycle2 RT06 all runtime owners and held stream stopped | pass |
| 390 | [pass] cycle2 RT06 projector drained without storage rejection | pass |
| 391 | [pass] cycle2 RT06 no partial ready cleanup marker | pass |
| 392 | [measure] repeat-stop-2 threads=10 fd=3 rss_bytes=225198080 rss_verdict=not-assessed | measurement-not-verdict |
| 393 | [pass] RT07 supported process measurements 2 | pass |
| 394 | [pass] cycle3 journal open | pass |
| 395 | [pass] cycle3 catalog open | pass |
| 396 | [pass] cycle3 RT01 source opt-in persisted | pass |
| 397 | [pass] cycle3 RT01 supervisor start | pass |
| 398 | [pass] cycle3 RT01 exact one source worker stream recorder subscriber | pass |
| 399 | [pass] cycle3 RT04 actual decoder detector tracker attached | pass |
| 400 | [pass] cycle3 RT02 reconcile and analysis share original worker | pass |
| 401 | [pass] cycle3 RT04 production projector durable locator exists | pass |
| 402 | [pass] cycle3 RT09 common cleanup all owners zero | pass |
| 403 | [pass] cycle3 RT06 file idle grace cleanup finished | pass |
| 404 | [pass] cycle3 RT03 actual source finalized segment exists | pass |
| 405 | [pass] cycle3 RT03 bytes SHA UTC PTS seg-9101-1789082235897-1 | pass |
| 406 | [pass] cycle3 RT03 bytes SHA UTC PTS seg-9101-1789082244247-2 | pass |
| 407 | [pass] cycle3 RT05 identity half-open UTC obs-0248fbf76ce78ba6c70fec34c8b270db | pass |
| 408 | [pass] cycle3 RT05 identity half-open UTC obs-031ea2dcf6602b2a359eed8b1bd616a3 | pass |
| 409 | [pass] cycle3 RT05 identity half-open UTC obs-07077a40bee5d61a6e291c28844a8757 | pass |
| 410 | [pass] cycle3 RT05 identity half-open UTC obs-0c3b54209c9513509740acb3e5ea8ba5 | pass |
| 411 | [pass] cycle3 RT05 identity half-open UTC obs-0deddd08f7907c8433392a9c052b74f5 | pass |
| 412 | [pass] cycle3 RT05 identity half-open UTC obs-0e70eee448f19338ec5a762e3e28d9b1 | pass |
| 413 | [pass] cycle3 RT05 identity half-open UTC obs-0eb5c02178146dd3ec4c1516f07efe46 | pass |
| 414 | [pass] cycle3 RT05 identity half-open UTC obs-0f13eb19050a77ce7dac5fb4425a39df | pass |
| 415 | [pass] cycle3 RT05 identity half-open UTC obs-0ffd0e93b0215ae58de6cc9b2de8aab0 | pass |
| 416 | [pass] cycle3 RT05 identity half-open UTC obs-100482faf62412c5ff025f046bb1b280 | pass |
| 417 | [pass] cycle3 RT05 identity half-open UTC obs-1272d85db3b3da1f3105468f3fff70b6 | pass |
| 418 | [pass] cycle3 RT05 identity half-open UTC obs-148bf3d059c7b2716a18a406a5dc5564 | pass |
| 419 | [pass] cycle3 RT05 identity half-open UTC obs-18fdf9bdb0a37fc5b968abbc224f04ca | pass |
| 420 | [pass] cycle3 RT05 identity half-open UTC obs-1bc6e76f43826181f4174fd7ef98c528 | pass |
| 421 | [pass] cycle3 RT05 identity half-open UTC obs-2839751fe30e8451a6ffc6249f282ca0 | pass |
| 422 | [pass] cycle3 RT05 identity half-open UTC obs-3108998ac13138952a189e62b6b6a284 | pass |
| 423 | [pass] cycle3 RT05 identity half-open UTC obs-35d0ad8be1ea18aaa7f89bdce84fe46b | pass |
| 424 | [pass] cycle3 RT05 identity half-open UTC obs-39203ef12b873f0725ad4070aff956da | pass |
| 425 | [pass] cycle3 RT05 identity half-open UTC obs-3a6a1c173fb2e7aa9515244b7f10751d | pass |
| 426 | [pass] cycle3 RT05 identity half-open UTC obs-3e35ecd5d60487c728e3f13479586e70 | pass |
| 427 | [pass] cycle3 RT05 identity half-open UTC obs-41d8b3ec4e5f8aef56c46f514b296956 | pass |
| 428 | [pass] cycle3 RT05 identity half-open UTC obs-4537d8d4c38cddcc6efea4c8b3af30bd | pass |
| 429 | [pass] cycle3 RT05 identity half-open UTC obs-4821b2aab8b4caac642bdb47268028f5 | pass |
| 430 | [pass] cycle3 RT05 identity half-open UTC obs-4bdd352cfa0876bd3927cf64341ad424 | pass |
| 431 | [pass] cycle3 RT05 identity half-open UTC obs-4f0f9deff1eac322c798c8e4fa072d6f | pass |
| 432 | [pass] cycle3 RT05 identity half-open UTC obs-4f73285e157d0bcf6cf8f832a7ac97fe | pass |
| 433 | [pass] cycle3 RT05 identity half-open UTC obs-5066087383951f420df052b7eaefddd7 | pass |
| 434 | [pass] cycle3 RT05 identity half-open UTC obs-51c93950b1ca4134954ffdbbbef73031 | pass |
| 435 | [pass] cycle3 RT05 identity half-open UTC obs-55efc6e4b0837cdae9faaa6f8993e2b7 | pass |
| 436 | [pass] cycle3 RT05 identity half-open UTC obs-57d87ba3dd62e7d185513191a2cbe768 | pass |
| 437 | [pass] cycle3 RT05 identity half-open UTC obs-5ac6be2e8311b47cae679a62bd969151 | pass |
| 438 | [pass] cycle3 RT05 identity half-open UTC obs-5dc6bd4d75e62f8c9c5d1f8ef898c33b | pass |
| 439 | [pass] cycle3 RT05 identity half-open UTC obs-61d774970126549af04c5f9c227f593b | pass |
| 440 | [pass] cycle3 RT05 identity half-open UTC obs-64a0a8a3a995890e7e5db4378dfc1a1b | pass |
| 441 | [pass] cycle3 RT05 identity half-open UTC obs-6502ef9a5b52da3f392a5dab134b42ee | pass |
| 442 | [pass] cycle3 RT05 identity half-open UTC obs-69c79b33b35e5b90572d44bce36d69b5 | pass |
| 443 | [pass] cycle3 RT05 identity half-open UTC obs-6ae820cbf625de7e67a14bb0273fb443 | pass |
| 444 | [pass] cycle3 RT05 identity half-open UTC obs-6f0e99e7807106a944862bba947e3b48 | pass |
| 445 | [pass] cycle3 RT05 identity half-open UTC obs-76891978a05d84b9aa72dd2286351a98 | pass |
| 446 | [pass] cycle3 RT05 identity half-open UTC obs-7bf21a30a4168d27470eee1f46d447ae | pass |
| 447 | [pass] cycle3 RT05 identity half-open UTC obs-7dc74904a5d23c442d77894d944b923b | pass |
| 448 | [pass] cycle3 RT05 identity half-open UTC obs-7f78dbcac713734b6f0bf3a08489a376 | pass |
| 449 | [pass] cycle3 RT05 identity half-open UTC obs-81bb05e69be4a82cc79b2896e94730ed | pass |
| 450 | [pass] cycle3 RT05 identity half-open UTC obs-81c1a89edd74b0a289de1a23c31d09af | pass |
| 451 | [pass] cycle3 RT05 identity half-open UTC obs-8695571565bc49d526e3fb7f64ef0248 | pass |
| 452 | [pass] cycle3 RT05 identity half-open UTC obs-890513ff010aa0eea266eaaec3107423 | pass |
| 453 | [pass] cycle3 RT05 identity half-open UTC obs-8e66c0c374ce16713f238a45d2334554 | pass |
| 454 | [pass] cycle3 RT05 identity half-open UTC obs-8f560e0c92b962d6220deb853f0e121d | pass |
| 455 | [pass] cycle3 RT05 identity half-open UTC obs-905f0055c11049ac31d1fb14c069551d | pass |
| 456 | [pass] cycle3 RT05 identity half-open UTC obs-91eca35e0b0e5fb8026fe2de69b95141 | pass |
| 457 | [pass] cycle3 RT05 identity half-open UTC obs-95f1be532fba2a6ca27e91ab38db5f25 | pass |
| 458 | [pass] cycle3 RT05 identity half-open UTC obs-960f368f838c740d9f984f48557670b8 | pass |
| 459 | [pass] cycle3 RT05 identity half-open UTC obs-96234ba8cc1c518c089ac19115d172a9 | pass |
| 460 | [pass] cycle3 RT05 identity half-open UTC obs-96ac860442508747c14c029704714dea | pass |
| 461 | [pass] cycle3 RT05 identity half-open UTC obs-9dfc5208ec8579479b8979879a8b859a | pass |
| 462 | [pass] cycle3 RT05 identity half-open UTC obs-a1329f6223ffa10a2805e89633726183 | pass |
| 463 | [pass] cycle3 RT05 identity half-open UTC obs-a149da6470fd9f7b470bf53a0fad510e | pass |
| 464 | [pass] cycle3 RT05 identity half-open UTC obs-a335c1de8b7478b72e00b7d08fd75b30 | pass |
| 465 | [pass] cycle3 RT05 identity half-open UTC obs-a458719e82d03728bbe11d17eea7b53b | pass |
| 466 | [pass] cycle3 RT05 identity half-open UTC obs-a6a4aacfd488dce9e9972a1e0bad5688 | pass |
| 467 | [pass] cycle3 RT05 identity half-open UTC obs-a9478e66252d1325c45d52c41aefa1ac | pass |
| 468 | [pass] cycle3 RT05 identity half-open UTC obs-b027f9885ad22c58a125972c82ae6555 | pass |
| 469 | [pass] cycle3 RT05 identity half-open UTC obs-b143bcbfdb387a56527b47c1c67465ab | pass |
| 470 | [pass] cycle3 RT05 identity half-open UTC obs-b2cbac18a5c104f05ae04cea1b970d6d | pass |
| 471 | [pass] cycle3 RT05 identity half-open UTC obs-b564c2b6f42c3011fc7e893c1218eef8 | pass |
| 472 | [pass] cycle3 RT05 identity half-open UTC obs-b9344ad9bb625599c8a7515bc59263cc | pass |
| 473 | [pass] cycle3 RT05 identity half-open UTC obs-b93f4f1dd672e1b07d950ac02b6141c5 | pass |
| 474 | [pass] cycle3 RT05 identity half-open UTC obs-bb1f5e06862cc092344371ec7429cad3 | pass |
| 475 | [pass] cycle3 RT05 identity half-open UTC obs-be1fa160aceb7df6f698f5d090cd2d2f | pass |
| 476 | [pass] cycle3 RT05 identity half-open UTC obs-bf550cbbe70e7d9552ac203daa343c40 | pass |
| 477 | [pass] cycle3 RT05 identity half-open UTC obs-c1631771b6d0824d5d8f45478d9c6104 | pass |
| 478 | [pass] cycle3 RT05 identity half-open UTC obs-c2bb32896ab00e0bc421c70955ade782 | pass |
| 479 | [pass] cycle3 RT05 identity half-open UTC obs-c33f9d0a270d26d42beb361d8e8de53d | pass |
| 480 | [pass] cycle3 RT05 identity half-open UTC obs-c382bf38e81850c8d5ad66de93b7386d | pass |
| 481 | [pass] cycle3 RT05 identity half-open UTC obs-c58841306915375d0a49b16f12a017e8 | pass |
| 482 | [pass] cycle3 RT05 identity half-open UTC obs-c666380febde454ad39ef46c238a909b | pass |
| 483 | [pass] cycle3 RT05 identity half-open UTC obs-c7b29c67e8ef84d636e62c4e11ffaf4f | pass |
| 484 | [pass] cycle3 RT05 identity half-open UTC obs-c8289727356d9d0ba626655b31f52f40 | pass |
| 485 | [pass] cycle3 RT05 identity half-open UTC obs-c8cd5dc9cedea51c7a843311fb1fabdd | pass |
| 486 | [pass] cycle3 RT05 identity half-open UTC obs-c9aadd2d5097709b1d25d03cd568e702 | pass |
| 487 | [pass] cycle3 RT05 identity half-open UTC obs-cb01d31ccc4b3cb7f394ef1414fe68d2 | pass |
| 488 | [pass] cycle3 RT05 identity half-open UTC obs-ccd705529f5e6af0a780dd3c5c2680ed | pass |
| 489 | [pass] cycle3 RT05 identity half-open UTC obs-cdc515d251cab5194009b592d93d659c | pass |
| 490 | [pass] cycle3 RT05 identity half-open UTC obs-cedcfec452ef2363f51a9d1e98d2a2fa | pass |
| 491 | [pass] cycle3 RT05 identity half-open UTC obs-d15f2cf88fdbaf8b807652b6a002d7b6 | pass |
| 492 | [pass] cycle3 RT05 identity half-open UTC obs-d25659cd40c10036155469877dcb6b7f | pass |
| 493 | [pass] cycle3 RT05 identity half-open UTC obs-d2b14cad022c664a51f63a83644516bb | pass |
| 494 | [pass] cycle3 RT05 identity half-open UTC obs-d4699ac7d95933065d073b48f02f7cbb | pass |
| 495 | [pass] cycle3 RT05 identity half-open UTC obs-d5027073c60d51f0dbb98075815f543d | pass |
| 496 | [pass] cycle3 RT05 identity half-open UTC obs-d5175ce843042d5132dd739b87c64d38 | pass |
| 497 | [pass] cycle3 RT05 identity half-open UTC obs-d5632511e4b9bae17ff5195e8adc0d0c | pass |
| 498 | [pass] cycle3 RT05 identity half-open UTC obs-d70e7f502355a767f181cc797399b65a | pass |
| 499 | [pass] cycle3 RT05 identity half-open UTC obs-dce316761237d7b2a1e1dd7060e12533 | pass |
| 500 | [pass] cycle3 RT05 identity half-open UTC obs-de7e1cbc0a73194fc61a7033020ca33a | pass |
| 501 | [pass] cycle3 RT05 identity half-open UTC obs-e1dc945be421464471ede6a0ad2d110b | pass |
| 502 | [pass] cycle3 RT05 identity half-open UTC obs-e26f398ae3baa4cfa1f94e5306a3ddb2 | pass |
| 503 | [pass] cycle3 RT05 identity half-open UTC obs-e56e1e1427714fa55b675c821a108790 | pass |
| 504 | [pass] cycle3 RT05 identity half-open UTC obs-e758c70ec9f454a5367bd66b913cda8a | pass |
| 505 | [pass] cycle3 RT05 identity half-open UTC obs-eb091f62b60354943707e3434c8fe225 | pass |
| 506 | [pass] cycle3 RT05 identity half-open UTC obs-eb4449d656d6c26e86d1cf3b0e9bbdc7 | pass |
| 507 | [pass] cycle3 RT05 identity half-open UTC obs-ec4bf661a9d479afeb751c7497279412 | pass |
| 508 | [pass] cycle3 RT05 identity half-open UTC obs-ed0c025a3d01021713bb7709d252b436 | pass |
| 509 | [pass] cycle3 RT05 identity half-open UTC obs-ed4331f6769dd3245520becbd146c319 | pass |
| 510 | [pass] cycle3 RT05 identity half-open UTC obs-f04969fd27815afabb6287c1976d85b3 | pass |
| 511 | [pass] cycle3 RT05 identity half-open UTC obs-f29778bd3e84c93172b4f266cd57c744 | pass |
| 512 | [pass] cycle3 RT05 identity half-open UTC obs-f40de3f85048e7bf21a3cc37b4a6f02e | pass |
| 513 | [pass] cycle3 RT05 identity half-open UTC obs-f4da91ebf9956bfdf3b9bc75191c518a | pass |
| 514 | [pass] cycle3 RT05 identity half-open UTC obs-faca4dd05c6b8e37fbcb6d3db1f34766 | pass |
| 515 | [pass] cycle3 RT05 identity half-open UTC obs-fccf0accef1c36a80741a1cfe6d15b3d | pass |
| 516 | [pass] cycle3 RT05 identity half-open UTC obs-ff6e23a5dbd876d86dd979d974708895 | pass |
| 517 | [pass] cycle3 RT04 nonempty real tracks and media | pass |
| 518 | [pass] cycle3 RT06 all runtime owners and held stream stopped | pass |
| 519 | [pass] cycle3 RT06 projector drained without storage rejection | pass |
| 520 | [pass] cycle3 RT06 no partial ready cleanup marker | pass |
| 521 | [measure] repeat-stop-3 threads=10 fd=3 rss_bytes=223887360 rss_verdict=not-assessed | measurement-not-verdict |
| 522 | [pass] RT07 supported process measurements 3 | pass |
| 523 | [pass] RT08 wrapper completed and cleanup absent | pass |
| 524 | [pass] AP12 distinct loopback ports | pass |
| 525 | [pass] AP12 actual foreground healthy \| pid=28017 cwd=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-s09-foundation-7yLNdP | pass |
| 526 | [pass] AP10-B production setup \| status=302 | pass |
| 527 | [pass] AP10-B production login \| status=302 | pass |
| 528 | [pass] POST /ops/api/users \| status=201 | pass |
| 529 | [pass] AP10-B production login \| status=302 | pass |
| 530 | [pass] POST /ops/api/users \| status=201 | pass |
| 531 | [pass] AP10-B production login \| status=302 | pass |
| 532 | [pass] POST /ops/api/users \| status=201 | pass |
| 533 | [pass] AP10-B production login \| status=302 | pass |
| 534 | [pass] POST /ops/api/users \| status=201 | pass |
| 535 | [pass] AP10-B production login \| status=302 | pass |
| 536 | [pass] AP10-B isolated users no plaintext credential | pass |
| 537 | [pass] AP10-B accounts bootstrapped through product API | pass |
| 538 | [pass] GET /ops/api/sources \| status=200 | pass |
| 539 | [pass] AP10-F independent initial source IDs \| ids=["1","2","3","4","5"] | pass |
| 540 | [pass] POST /ops/api/sources \| status=201 | pass |
| 541 | [pass] AP10-F successful POST identity | pass |
| 542 | [pass] AP01 V1 identity seg-9101-1789082256573-1 | pass |
| 543 | [pass] AP01 positive UTC/PTS seg-9101-1789082256573-1 | pass |
| 544 | [pass] AP01 actual bytes SHA seg-9101-1789082256573-1 \| bytes=4096788 sha256=027c447b66eeced12029dbd0135d47da5810bb10f68045a28841d1e37f709233 | pass |
| 545 | [pass] GET /ops/api/recordings/timeline?channelId=9101&startTimeMs=1789082256573&endTimeMs=1789082264883 \| status=200 | pass |
| 546 | [pass] AP10-C actual continuous timeline media | pass |
| 547 | [pass] AP10-C continuous six byte fixture prefix | pass |
| 548 | [pass] AP10-C continuous principal0 literal Range206 | pass |
| 549 | [pass] AP10-C continuous principal1 literal Range206 | pass |
| 550 | [pass] AP10-D continuous unauth media denied \| status=401 | pass |
| 551 | [pass] AP10-D continuous unauth no sensitive media response | pass |
| 552 | [pass] AP10-D continuous other-channel media denied \| status=404 | pass |
| 553 | [pass] AP10-D continuous other-channel no sensitive media response | pass |
| 554 | [pass] AP10-D continuous viewer media denied \| status=403 | pass |
| 555 | [pass] AP10-D continuous viewer no sensitive media response | pass |
| 556 | [pass] AP10-D continuous no-ops media denied \| status=403 | pass |
| 557 | [pass] AP10-D continuous no-ops no sensitive media response | pass |
| 558 | [pass] AP10-D continuous other-channel known nonexistent indistinguishable | pass |
| 559 | [pass] AP10-D continuous admin timeline200 | pass |
| 560 | [pass] AP10-D continuous admin timeline channel scope | pass |
| 561 | [pass] AP10-D continuous allowed timeline200 | pass |
| 562 | [pass] AP10-D continuous allowed timeline channel scope | pass |
| 563 | [pass] AP10-D continuous unauth timeline401 | pass |
| 564 | [pass] AP10-D continuous other-channel timeline403 | pass |
| 565 | [pass] AP10-D continuous viewer timeline403 | pass |
| 566 | [pass] AP10-D continuous no-ops timeline403 | pass |
| 567 | [pass] AP10-E continuous unauth status401 | pass |
| 568 | [pass] AP10-E continuous status principal0 \| status=200 | pass |
| 569 | [pass] AP10-E continuous status redaction principal0 | pass |
| 570 | [pass] AP10-E continuous exact scope channels principal0 \| expected=["1","2","3","4","5","9101"] observed=["1","2","3","4","5","9101"] | pass |
| 571 | [pass] AP10-E continuous status principal1 \| status=200 | pass |
| 572 | [pass] AP10-E continuous status redaction principal1 | pass |
| 573 | [pass] AP10-E continuous exact scope channels principal1 \| expected=["9101"] observed=["9101"] | pass |
| 574 | [pass] AP10-E continuous no global observations principal1 | pass |
| 575 | [pass] AP10-E continuous status principal2 \| status=200 | pass |
| 576 | [pass] AP10-E continuous status redaction principal2 | pass |
| 577 | [pass] AP10-E continuous exact scope channels principal2 \| expected=[] observed=[] | pass |
| 578 | [pass] AP10-E continuous no global observations principal2 | pass |
| 579 | [pass] AP10-E continuous status principal3 \| status=403 | pass |
| 580 | [pass] AP10-E continuous status redaction principal3 | pass |
| 581 | [pass] AP10-E continuous status principal4 \| status=403 | pass |
| 582 | [pass] AP10-E continuous status redaction principal4 | pass |
| 583 | [pass] AP02 actual finalized barrier before rule and tap | pass |
| 584 | [pass] PUT /lab/analysis/rules/9101 \| status=200 | pass |
| 585 | [pass] POST /lab/analysis/taps?file=identity.mp4&va=1&fps=8&maxQueue=1&trackIds=1 \| status=200 | pass |
| 586 | [pass] AP02 actual tap created | pass |
| 587 | [pass] GET /lab/analysis/taps/analysis-tap-1/events?dispatch=1 \| status=200 | pass |
| 588 | [pass] GET /lab/analysis/taps/analysis-tap-1/events?dispatch=1 \| status=200 | pass |
| 589 | [pass] AP02/03 actual EventRecord identity fallback \| eventId=evt_1789082265225_2 linkId=event-link-sha256-84522757c19a5361b83313ae85d74737ba16aedf569dcff6884f759dcdd99eb0 | pass |
| 590 | [pass] AP02/03 actual nonnegative padded event start fallback \| startTime=8333 updateTime=8333 timeBasis=media-pts-ms | pass |
| 591 | [pass] AP02/03 durable link source fallback | pass |
| 592 | [pass] GET /ops/api/recordings/timeline?channelId=9101&startTimeMs=1789082263406&endTimeMs=1789082266432 \| status=200 | pass |
| 593 | [pass] AP04 fallback event priority | pass |
| 594 | [pass] AP04 fallback path redaction | pass |
| 595 | [pass] AP02 fallback remains partial requested-fallback | pass |
| 596 | [pass] AP02 encoded WebM eventId/encoded contract/size/isolated path | pass |
| 597 | [pass] AP05 fallback playable local URL | pass |
| 598 | [pass] AP05 fallback actual file prefix | pass |
| 599 | [pass] AP05 fallback literal GET Range \| status=206 contentRange=bytes 2-5/22910 bodyHex=dfa30100 | pass |
| 600 | [pass] AP10-C fallback six byte fixture prefix | pass |
| 601 | [pass] AP10-C fallback principal0 literal Range206 | pass |
| 602 | [pass] AP10-C fallback principal1 literal Range206 | pass |
| 603 | [pass] AP10-D fallback unauth media denied \| status=401 | pass |
| 604 | [pass] AP10-D fallback unauth no sensitive media response | pass |
| 605 | [pass] AP10-D fallback other-channel media denied \| status=404 | pass |
| 606 | [pass] AP10-D fallback other-channel no sensitive media response | pass |
| 607 | [pass] AP10-D fallback viewer media denied \| status=403 | pass |
| 608 | [pass] AP10-D fallback viewer no sensitive media response | pass |
| 609 | [pass] AP10-D fallback no-ops media denied \| status=403 | pass |
| 610 | [pass] AP10-D fallback no-ops no sensitive media response | pass |
| 611 | [pass] AP10-D fallback other-channel known nonexistent indistinguishable | pass |
| 612 | [pass] AP10-D fallback admin timeline200 | pass |
| 613 | [pass] AP10-D fallback admin timeline channel scope | pass |
| 614 | [pass] AP10-D fallback allowed timeline200 | pass |
| 615 | [pass] AP10-D fallback allowed timeline channel scope | pass |
| 616 | [pass] AP10-D fallback unauth timeline401 | pass |
| 617 | [pass] AP10-D fallback other-channel timeline403 | pass |
| 618 | [pass] AP10-D fallback viewer timeline403 | pass |
| 619 | [pass] AP10-D fallback no-ops timeline403 | pass |
| 620 | [pass] AP10-E fallback unauth status401 | pass |
| 621 | [pass] AP10-E fallback status principal0 \| status=200 | pass |
| 622 | [pass] AP10-E fallback status redaction principal0 | pass |
| 623 | [pass] AP10-E fallback exact scope channels principal0 \| expected=["1","2","3","4","5","9101"] observed=["1","2","3","4","5","9101"] | pass |
| 624 | [pass] AP10-E fallback status principal1 \| status=200 | pass |
| 625 | [pass] AP10-E fallback status redaction principal1 | pass |
| 626 | [pass] AP10-E fallback exact scope channels principal1 \| expected=["9101"] observed=["9101"] | pass |
| 627 | [pass] AP10-E fallback no global observations principal1 | pass |
| 628 | [pass] AP10-E fallback status principal2 \| status=200 | pass |
| 629 | [pass] AP10-E fallback status redaction principal2 | pass |
| 630 | [pass] AP10-E fallback exact scope channels principal2 \| expected=[] observed=[] | pass |
| 631 | [pass] AP10-E fallback no global observations principal2 | pass |
| 632 | [pass] AP10-E fallback status principal3 \| status=403 | pass |
| 633 | [pass] AP10-E fallback status redaction principal3 | pass |
| 634 | [pass] AP10-E fallback status principal4 \| status=403 | pass |
| 635 | [pass] AP10-E fallback status redaction principal4 | pass |
| 636 | [pass] DELETE /lab/analysis/taps/analysis-tap-1 \| status=200 | pass |
| 637 | [pass] AP01 V1 identity seg-9101-1789082256573-1 | pass |
| 638 | [pass] AP01 positive UTC/PTS seg-9101-1789082256573-1 | pass |
| 639 | [pass] AP01 actual bytes SHA seg-9101-1789082256573-1 \| bytes=4096788 sha256=027c447b66eeced12029dbd0135d47da5810bb10f68045a28841d1e37f709233 | pass |
| 640 | [pass] AP01 V1 identity seg-9101-1789082264932-2 | pass |
| 641 | [pass] AP01 positive UTC/PTS seg-9101-1789082264932-2 | pass |
| 642 | [pass] AP01 actual bytes SHA seg-9101-1789082264932-2 \| bytes=4813100 sha256=882f2c0171f805751d478980d69ea71c0f225a0ec88f91943feb379ae169fa3f | pass |
| 643 | [pass] POST /lab/analysis/taps?file=identity.mp4&va=1&fps=8&maxQueue=1&trackIds=1 \| status=200 | pass |
| 644 | [pass] AP03 actual tap created | pass |
| 645 | [pass] AP03 finalized boundary available | pass |
| 646 | [pass] GET /lab/analysis/taps/analysis-tap-2 \| status=200 | pass |
| 647 | [pass] GET /lab/analysis/taps/analysis-tap-2 \| status=200 | pass |
| 648 | [pass] GET /lab/analysis/taps/analysis-tap-2 \| status=200 | pass |
| 649 | [pass] GET /lab/analysis/taps/analysis-tap-2 \| status=200 | pass |
| 650 | [pass] GET /lab/analysis/taps/analysis-tap-2 \| status=200 | pass |
| 651 | [pass] GET /lab/analysis/taps/analysis-tap-2 \| status=200 | pass |
| 652 | [pass] PUT /lab/analysis/rules/9102 \| status=200 | pass |
| 653 | [pass] GET /lab/analysis/taps/analysis-tap-2/events?dispatch=1 \| status=200 | pass |
| 654 | [pass] AP02/03 actual EventRecord identity derived \| eventId=evt_1789082274101_83 linkId=event-link-sha256-bd7be33f47fbe6e642dd84c6da2b1cf9ea5efa4d01d2c12a42e9b0c599aa5a88 | pass |
| 655 | [pass] AP02/03 actual nonnegative padded event start derived \| startTime=17400 updateTime=17400 timeBasis=media-pts-ms | pass |
| 656 | [pass] AP02/03 durable link source derived | pass |
| 657 | [pass] GET /ops/api/recordings/timeline?channelId=9101&startTimeMs=1789082272493&endTimeMs=1789082275493 \| status=200 | pass |
| 658 | [pass] AP04 derived event priority | pass |
| 659 | [pass] AP04 derived path redaction | pass |
| 660 | [pass] AP03 actual derived remux metadata | pass |
| 661 | [pass] AP01 V1 identity event-seg-sha256-d12b7c8a871f63387dedd22b44a6684d4c3bd65cc99b7929b134a1325c186183 | pass |
| 662 | [pass] AP01 positive UTC/PTS event-seg-sha256-d12b7c8a871f63387dedd22b44a6684d4c3bd65cc99b7929b134a1325c186183 | pass |
| 663 | [pass] AP01 actual bytes SHA event-seg-sha256-d12b7c8a871f63387dedd22b44a6684d4c3bd65cc99b7929b134a1325c186183 \| bytes=1110704 sha256=980eceea5ab3c008c6e0922789469b0ead01b073e4bf4a5d6fda88576cf46879 | pass |
| 664 | [pass] AP03 Complete actual overlaps | pass |
| 665 | [pass] AP04 continuous superseded with priority100 | pass |
| 666 | [pass] AP05 derived playable local URL | pass |
| 667 | [pass] AP05 derived actual file prefix | pass |
| 668 | [pass] AP05 derived literal GET Range \| status=206 contentRange=bytes 2-5/1110704 bodyHex=0032a600 | pass |
| 669 | [pass] AP10-C derived six byte fixture prefix | pass |
| 670 | [pass] AP10-C derived principal0 literal Range206 | pass |
| 671 | [pass] AP10-C derived principal1 literal Range206 | pass |
| 672 | [pass] AP10-D derived unauth media denied \| status=401 | pass |
| 673 | [pass] AP10-D derived unauth no sensitive media response | pass |
| 674 | [pass] AP10-D derived other-channel media denied \| status=404 | pass |
| 675 | [pass] AP10-D derived other-channel no sensitive media response | pass |
| 676 | [pass] AP10-D derived viewer media denied \| status=403 | pass |
| 677 | [pass] AP10-D derived viewer no sensitive media response | pass |
| 678 | [pass] AP10-D derived no-ops media denied \| status=403 | pass |
| 679 | [pass] AP10-D derived no-ops no sensitive media response | pass |
| 680 | [pass] AP10-D derived other-channel known nonexistent indistinguishable | pass |
| 681 | [pass] AP10-D derived admin timeline200 | pass |
| 682 | [pass] AP10-D derived admin timeline channel scope | pass |
| 683 | [pass] AP10-D derived allowed timeline200 | pass |
| 684 | [pass] AP10-D derived allowed timeline channel scope | pass |
| 685 | [pass] AP10-D derived unauth timeline401 | pass |
| 686 | [pass] AP10-D derived other-channel timeline403 | pass |
| 687 | [pass] AP10-D derived viewer timeline403 | pass |
| 688 | [pass] AP10-D derived no-ops timeline403 | pass |
| 689 | [pass] AP10-E derived unauth status401 | pass |
| 690 | [pass] AP10-E derived status principal0 \| status=200 | pass |
| 691 | [pass] AP10-E derived status redaction principal0 | pass |
| 692 | [pass] AP10-E derived exact scope channels principal0 \| expected=["1","2","3","4","5","9101"] observed=["1","2","3","4","5","9101"] | pass |
| 693 | [pass] AP10-E derived status principal1 \| status=200 | pass |
| 694 | [pass] AP10-E derived status redaction principal1 | pass |
| 695 | [pass] AP10-E derived exact scope channels principal1 \| expected=["9101"] observed=["9101"] | pass |
| 696 | [pass] AP10-E derived no global observations principal1 | pass |
| 697 | [pass] AP10-E derived status principal2 \| status=200 | pass |
| 698 | [pass] AP10-E derived status redaction principal2 | pass |
| 699 | [pass] AP10-E derived exact scope channels principal2 \| expected=[] observed=[] | pass |
| 700 | [pass] AP10-E derived no global observations principal2 | pass |
| 701 | [pass] AP10-E derived status principal3 \| status=403 | pass |
| 702 | [pass] AP10-E derived status redaction principal3 | pass |
| 703 | [pass] AP10-E derived status principal4 \| status=403 | pass |
| 704 | [pass] AP10-E derived status redaction principal4 | pass |
| 705 | [pass] DELETE /lab/analysis/taps/analysis-tap-2 \| status=200 | pass |
| 706 | [pass] AP02/03 fallback and derived independent events | pass |
| 707 | [pass] AP06 actual H264 generator \| exit=0 log=Setting pipeline to PAUSED ... Pipeline is PREROLLING ... Redistribute latency... Redistribute latency... Pipeline is PREROLLED ... Setting pipeline to PLAYING ... Redistribute latency... New clock: GstSystemClock Got EOS from element "pipeline0". EOS received - stopping pipeline... Execution ended after 0:00:00.221920042 Setting pipeline to NULL ... Freeing pipeline ...  | pass |
| 708 | [pass] AP12 generated input bounded \| bytes=62334405 limitBytes=100663296 | pass |
| 709 | [pass] POST /ops/api/sources \| status=201 | pass |
| 710 | [pass] AP10-F successful POST identity | pass |
| 711 | [pass] AP01 V1 identity seg-9201-1789082282556-1 | pass |
| 712 | [pass] AP01 positive UTC/PTS seg-9201-1789082282556-1 | pass |
| 713 | [pass] AP01 actual bytes SHA seg-9201-1789082282556-1 \| bytes=15581582 sha256=091671f255c3162f9b70d71308a343245cdd8eafb0d0ac65629fa3b203aea148 | pass |
| 714 | [pass] AP01 V1 identity seg-9201-1789082283613-2 | pass |
| 715 | [pass] AP01 positive UTC/PTS seg-9201-1789082283613-2 | pass |
| 716 | [pass] AP01 actual bytes SHA seg-9201-1789082283613-2 \| bytes=31168171 sha256=794e74f5f3568cb39305f6ee854e6b45d30a9b29cb4f821d540092cdc70165cc | pass |
| 717 | [pass] AP01 V1 identity seg-9201-1789082285612-3 | pass |
| 718 | [pass] AP01 positive UTC/PTS seg-9201-1789082285612-3 | pass |
| 719 | [pass] AP01 actual bytes SHA seg-9201-1789082285612-3 \| bytes=15586426 sha256=d3d61ac4ea76de069fcd2a52fa9730ae3e1ad6c1d0b3022c99cc195bbd6e2f4b | pass |
| 720 | [pass] AP01 V1 identity seg-9201-1789082286601-4 | pass |
| 721 | [pass] AP01 positive UTC/PTS seg-9201-1789082286601-4 | pass |
| 722 | [pass] AP01 actual bytes SHA seg-9201-1789082286601-4 \| bytes=15581582 sha256=e2eaa0ae70cd6cf1e6d1c689a0619e4534a4551592644e72e52461599db81004 | pass |
| 723 | [pass] AP06 each actual segment below reservation | pass |
| 724 | [pass] AP06 actual total exceeds future quota \| count=4 bytes=77917761 oldest=seg-9201-1789082282556-1,seg-9201-1789082283613-2,seg-9201-1789082285612-3,seg-9201-1789082286601-4 | pass |
| 725 | [pass] PUT /ops/api/sources/9201 \| status=200 | pass |
| 726 | [pass] AP07 oldest deletion request independent order | pass |
| 727 | [pass] AP07 durable completed seg-9201-1789082282556-1 | pass |
| 728 | [pass] AP07 physical absent seg-9201-1789082282556-1 | pass |
| 729 | [pass] AP07 durable completed seg-9201-1789082283613-2 | pass |
| 730 | [pass] AP07 physical absent seg-9201-1789082283613-2 | pass |
| 731 | [pass] AP07 durable completed seg-9201-1789082285612-3 | pass |
| 732 | [pass] AP07 physical absent seg-9201-1789082285612-3 | pass |
| 733 | [pass] AP07 durable completed seg-9201-1789082286601-4 | pass |
| 734 | [pass] AP07 physical absent seg-9201-1789082286601-4 | pass |
| 735 | [pass] AP08 new finalized then ordered deleted physical absence seg-9201-1789082287814-1 | pass |
| 736 | [pass] AP08 new finalized then ordered deleted physical absence seg-9201-1789082289626-2 | pass |
| 737 | [pass] AP08 actual recording resumes after quota deletion | pass |
| 738 | [pass] PUT /ops/api/sources/9201 \| status=200 | pass |
| 739 | [pass] AP08 restored quota new finalized | pass |
| 740 | [pass] AP12 app0 exit0 \| exit=0 signal=null | pass |
| 741 | [pass] AP01 V1 identity seg-9101-1789082256573-1 | pass |
| 742 | [pass] AP01 positive UTC/PTS seg-9101-1789082256573-1 | pass |
| 743 | [pass] AP01 actual bytes SHA seg-9101-1789082256573-1 \| bytes=4096788 sha256=027c447b66eeced12029dbd0135d47da5810bb10f68045a28841d1e37f709233 | pass |
| 744 | [pass] AP01 V1 identity seg-9101-1789082264932-2 | pass |
| 745 | [pass] AP01 positive UTC/PTS seg-9101-1789082264932-2 | pass |
| 746 | [pass] AP01 actual bytes SHA seg-9101-1789082264932-2 \| bytes=4813100 sha256=882f2c0171f805751d478980d69ea71c0f225a0ec88f91943feb379ae169fa3f | pass |
| 747 | [pass] AP01 V1 identity seg-9101-1789082273259-3 | pass |
| 748 | [pass] AP01 positive UTC/PTS seg-9101-1789082273259-3 | pass |
| 749 | [pass] AP01 actual bytes SHA seg-9101-1789082273259-3 \| bytes=5222837 sha256=82ee5b43a9142175af966436865ed62684ffdb024b34f77ccea0d3aef92772cd | pass |
| 750 | [pass] AP01 V1 identity event-seg-sha256-3872c05fa4106c8ae3f0e7fdaee28889cfba9b9de98dc7e811893ac87a6b550e | pass |
| 751 | [pass] AP01 positive UTC/PTS event-seg-sha256-3872c05fa4106c8ae3f0e7fdaee28889cfba9b9de98dc7e811893ac87a6b550e | pass |
| 752 | [pass] AP01 actual bytes SHA event-seg-sha256-3872c05fa4106c8ae3f0e7fdaee28889cfba9b9de98dc7e811893ac87a6b550e \| bytes=1110704 sha256=980eceea5ab3c008c6e0922789469b0ead01b073e4bf4a5d6fda88576cf46879 | pass |
| 753 | [pass] AP01 V1 identity event-seg-sha256-ef660025b4709ce67fb1caab5464a1e754837d132c71d18be1e8f70a15234e80 | pass |
| 754 | [pass] AP01 positive UTC/PTS event-seg-sha256-ef660025b4709ce67fb1caab5464a1e754837d132c71d18be1e8f70a15234e80 | pass |
| 755 | [pass] AP01 actual bytes SHA event-seg-sha256-ef660025b4709ce67fb1caab5464a1e754837d132c71d18be1e8f70a15234e80 \| bytes=1110704 sha256=980eceea5ab3c008c6e0922789469b0ead01b073e4bf4a5d6fda88576cf46879 | pass |
| 756 | [pass] AP01 V1 identity event-seg-sha256-516a2a1a68db180977aee121fe147f7159056cff0da6f6d785eaa8edb8b6983c | pass |
| 757 | [pass] AP01 positive UTC/PTS event-seg-sha256-516a2a1a68db180977aee121fe147f7159056cff0da6f6d785eaa8edb8b6983c | pass |
| 758 | [pass] AP01 actual bytes SHA event-seg-sha256-516a2a1a68db180977aee121fe147f7159056cff0da6f6d785eaa8edb8b6983c \| bytes=1110704 sha256=980eceea5ab3c008c6e0922789469b0ead01b073e4bf4a5d6fda88576cf46879 | pass |
| 759 | [pass] AP01 V1 identity event-seg-sha256-f666fc904e905744ed3e8113adb0779d091334a50fab873de6d23dbdd8edb36b | pass |
| 760 | [pass] AP01 positive UTC/PTS event-seg-sha256-f666fc904e905744ed3e8113adb0779d091334a50fab873de6d23dbdd8edb36b | pass |
| 761 | [pass] AP01 actual bytes SHA event-seg-sha256-f666fc904e905744ed3e8113adb0779d091334a50fab873de6d23dbdd8edb36b \| bytes=1110704 sha256=980eceea5ab3c008c6e0922789469b0ead01b073e4bf4a5d6fda88576cf46879 | pass |
| 762 | [pass] AP01 V1 identity event-seg-sha256-a5ab10c7d2785cdd655b9750a33abf5d8273c79d80d5adb6f8541c6ac6e2073b | pass |
| 763 | [pass] AP01 positive UTC/PTS event-seg-sha256-a5ab10c7d2785cdd655b9750a33abf5d8273c79d80d5adb6f8541c6ac6e2073b | pass |
| 764 | [pass] AP01 actual bytes SHA event-seg-sha256-a5ab10c7d2785cdd655b9750a33abf5d8273c79d80d5adb6f8541c6ac6e2073b \| bytes=1110704 sha256=980eceea5ab3c008c6e0922789469b0ead01b073e4bf4a5d6fda88576cf46879 | pass |
| 765 | [pass] AP01 V1 identity event-seg-sha256-b70910298f7d763dfe5f424ed08042afa0c9e33d1f165a1a5294351bfbf1c596 | pass |
| 766 | [pass] AP01 positive UTC/PTS event-seg-sha256-b70910298f7d763dfe5f424ed08042afa0c9e33d1f165a1a5294351bfbf1c596 | pass |
| 767 | [pass] AP01 actual bytes SHA event-seg-sha256-b70910298f7d763dfe5f424ed08042afa0c9e33d1f165a1a5294351bfbf1c596 \| bytes=1110704 sha256=980eceea5ab3c008c6e0922789469b0ead01b073e4bf4a5d6fda88576cf46879 | pass |
| 768 | [pass] AP01 V1 identity event-seg-sha256-cd473a9bec1fbec3a57dc2f9e58b693aa7dec49577f8676c80c3b8c30cb47770 | pass |
| 769 | [pass] AP01 positive UTC/PTS event-seg-sha256-cd473a9bec1fbec3a57dc2f9e58b693aa7dec49577f8676c80c3b8c30cb47770 | pass |
| 770 | [pass] AP01 actual bytes SHA event-seg-sha256-cd473a9bec1fbec3a57dc2f9e58b693aa7dec49577f8676c80c3b8c30cb47770 \| bytes=1110704 sha256=980eceea5ab3c008c6e0922789469b0ead01b073e4bf4a5d6fda88576cf46879 | pass |
| 771 | [pass] AP01 V1 identity event-seg-sha256-d12b7c8a871f63387dedd22b44a6684d4c3bd65cc99b7929b134a1325c186183 | pass |
| 772 | [pass] AP01 positive UTC/PTS event-seg-sha256-d12b7c8a871f63387dedd22b44a6684d4c3bd65cc99b7929b134a1325c186183 | pass |
| 773 | [pass] AP01 actual bytes SHA event-seg-sha256-d12b7c8a871f63387dedd22b44a6684d4c3bd65cc99b7929b134a1325c186183 \| bytes=1110704 sha256=980eceea5ab3c008c6e0922789469b0ead01b073e4bf4a5d6fda88576cf46879 | pass |
| 774 | [pass] AP01 V1 identity seg-9101-1789082281590-4 | pass |
| 775 | [pass] AP01 positive UTC/PTS seg-9101-1789082281590-4 | pass |
| 776 | [pass] AP01 actual bytes SHA seg-9101-1789082281590-4 \| bytes=2940815 sha256=a583e1854a6168984e55a0d7eb8cec5e174af04646fc8ab563dd42bd7e56b2cd | pass |
| 777 | [pass] AP01 V1 identity seg-9201-1789082290612-3 | pass |
| 778 | [pass] AP01 positive UTC/PTS seg-9201-1789082290612-3 | pass |
| 779 | [pass] AP01 actual bytes SHA seg-9201-1789082290612-3 \| bytes=3116891 sha256=141e9c475a3bcbdfb1219ad66756cf497d0f78bfe238758de8e76955d929d082 | pass |
| 780 | [pass] AP01 V1 identity seg-9201-1789082290790-1 | pass |
| 781 | [pass] AP01 positive UTC/PTS seg-9201-1789082290790-1 | pass |
| 782 | [pass] AP01 actual bytes SHA seg-9201-1789082290790-1 \| bytes=31167191 sha256=a0a09e7f34ed8999802f15f399a8b5dea25adb20f6cddea5e917028e855b4908 | pass |
| 783 | [pass] AP01 V1 identity seg-9201-1789082292625-2 | pass |
| 784 | [pass] AP01 positive UTC/PTS seg-9201-1789082292625-2 | pass |
| 785 | [pass] AP01 actual bytes SHA seg-9201-1789082292625-2 \| bytes=9869422 sha256=ec7e1400eefb39d17e991fe9b2cc74991444b93e54a3211a0ec92d8a6f431c62 | pass |
| 786 | [pass] AP01 V1 identity seg-9101-1789082286589-5 | pass |
| 787 | [pass] AP01 positive UTC/PTS seg-9101-1789082286589-5 | pass |
| 788 | [pass] AP01 actual bytes SHA seg-9101-1789082286589-5 \| bytes=3149221 sha256=cc7fa12155c42246356c7308d89c5c948051777a62028bc4d92c98e6ed4a10ec | pass |
| 789 | [pass] AP12 distinct loopback ports | pass |
| 790 | [pass] AP12 actual foreground healthy \| pid=28037 cwd=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-s09-foundation-7yLNdP | pass |
| 791 | [pass] AP10-B production login \| status=302 | pass |
| 792 | [pass] AP10-B production login \| status=302 | pass |
| 793 | [pass] AP10-B production login \| status=302 | pass |
| 794 | [pass] AP10-B production login \| status=302 | pass |
| 795 | [pass] AP10-B production login \| status=302 | pass |
| 796 | [pass] AP10-B isolated users no plaintext credential | pass |
| 797 | [pass] AP10-B restart relogin without setup | pass |
| 798 | [pass] GET /ops/api/sources \| status=200 | pass |
| 799 | [pass] AP10-F restart source IDs exact \| expected=["1","2","3","4","5","9101","9201"] observed=["1","2","3","4","5","9101","9201"] | pass |
| 800 | [pass] AP09 restart actual new PID | pass |
| 801 | [pass] AP10-C restart-continuous six byte fixture prefix | pass |
| 802 | [pass] AP10-C restart-continuous principal0 literal Range206 | pass |
| 803 | [pass] AP10-C restart-continuous principal1 literal Range206 | pass |
| 804 | [pass] AP10-D restart-continuous unauth media denied \| status=401 | pass |
| 805 | [pass] AP10-D restart-continuous unauth no sensitive media response | pass |
| 806 | [pass] AP10-D restart-continuous other-channel media denied \| status=404 | pass |
| 807 | [pass] AP10-D restart-continuous other-channel no sensitive media response | pass |
| 808 | [pass] AP10-D restart-continuous viewer media denied \| status=403 | pass |
| 809 | [pass] AP10-D restart-continuous viewer no sensitive media response | pass |
| 810 | [pass] AP10-D restart-continuous no-ops media denied \| status=403 | pass |
| 811 | [pass] AP10-D restart-continuous no-ops no sensitive media response | pass |
| 812 | [pass] AP10-D restart-continuous other-channel known nonexistent indistinguishable | pass |
| 813 | [pass] AP10-D restart-continuous admin timeline200 | pass |
| 814 | [pass] AP10-D restart-continuous admin timeline channel scope | pass |
| 815 | [pass] AP10-D restart-continuous allowed timeline200 | pass |
| 816 | [pass] AP10-D restart-continuous allowed timeline channel scope | pass |
| 817 | [pass] AP10-D restart-continuous unauth timeline401 | pass |
| 818 | [pass] AP10-D restart-continuous other-channel timeline403 | pass |
| 819 | [pass] AP10-D restart-continuous viewer timeline403 | pass |
| 820 | [pass] AP10-D restart-continuous no-ops timeline403 | pass |
| 821 | [pass] AP10-E restart-continuous unauth status401 | pass |
| 822 | [pass] AP10-E restart-continuous status principal0 \| status=200 | pass |
| 823 | [pass] AP10-E restart-continuous status redaction principal0 | pass |
| 824 | [pass] AP10-E restart-continuous exact scope channels principal0 \| expected=["1","2","3","4","5","9101","9201"] observed=["1","2","3","4","5","9101","9201"] | pass |
| 825 | [pass] AP10-E restart-continuous status principal1 \| status=200 | pass |
| 826 | [pass] AP10-E restart-continuous status redaction principal1 | pass |
| 827 | [pass] AP10-E restart-continuous exact scope channels principal1 \| expected=["9101"] observed=["9101"] | pass |
| 828 | [pass] AP10-E restart-continuous no global observations principal1 | pass |
| 829 | [pass] AP10-E restart-continuous status principal2 \| status=200 | pass |
| 830 | [pass] AP10-E restart-continuous status redaction principal2 | pass |
| 831 | [pass] AP10-E restart-continuous exact scope channels principal2 \| expected=["9201"] observed=["9201"] | pass |
| 832 | [pass] AP10-E restart-continuous no global observations principal2 | pass |
| 833 | [pass] AP10-E restart-continuous status principal3 \| status=403 | pass |
| 834 | [pass] AP10-E restart-continuous status redaction principal3 | pass |
| 835 | [pass] AP10-E restart-continuous status principal4 \| status=403 | pass |
| 836 | [pass] AP10-E restart-continuous status redaction principal4 | pass |
| 837 | [pass] AP10-C restart-fallback six byte fixture prefix | pass |
| 838 | [pass] AP10-C restart-fallback principal0 literal Range206 | pass |
| 839 | [pass] AP10-C restart-fallback principal1 literal Range206 | pass |
| 840 | [pass] AP10-D restart-fallback unauth media denied \| status=401 | pass |
| 841 | [pass] AP10-D restart-fallback unauth no sensitive media response | pass |
| 842 | [pass] AP10-D restart-fallback other-channel media denied \| status=404 | pass |
| 843 | [pass] AP10-D restart-fallback other-channel no sensitive media response | pass |
| 844 | [pass] AP10-D restart-fallback viewer media denied \| status=403 | pass |
| 845 | [pass] AP10-D restart-fallback viewer no sensitive media response | pass |
| 846 | [pass] AP10-D restart-fallback no-ops media denied \| status=403 | pass |
| 847 | [pass] AP10-D restart-fallback no-ops no sensitive media response | pass |
| 848 | [pass] AP10-D restart-fallback other-channel known nonexistent indistinguishable | pass |
| 849 | [pass] AP10-D restart-fallback admin timeline200 | pass |
| 850 | [pass] AP10-D restart-fallback admin timeline channel scope | pass |
| 851 | [pass] AP10-D restart-fallback allowed timeline200 | pass |
| 852 | [pass] AP10-D restart-fallback allowed timeline channel scope | pass |
| 853 | [pass] AP10-D restart-fallback unauth timeline401 | pass |
| 854 | [pass] AP10-D restart-fallback other-channel timeline403 | pass |
| 855 | [pass] AP10-D restart-fallback viewer timeline403 | pass |
| 856 | [pass] AP10-D restart-fallback no-ops timeline403 | pass |
| 857 | [pass] AP10-E restart-fallback unauth status401 | pass |
| 858 | [pass] AP10-E restart-fallback status principal0 \| status=200 | pass |
| 859 | [pass] AP10-E restart-fallback status redaction principal0 | pass |
| 860 | [pass] AP10-E restart-fallback exact scope channels principal0 \| expected=["1","2","3","4","5","9101","9201"] observed=["1","2","3","4","5","9101","9201"] | pass |
| 861 | [pass] AP10-E restart-fallback status principal1 \| status=200 | pass |
| 862 | [pass] AP10-E restart-fallback status redaction principal1 | pass |
| 863 | [pass] AP10-E restart-fallback exact scope channels principal1 \| expected=["9101"] observed=["9101"] | pass |
| 864 | [pass] AP10-E restart-fallback no global observations principal1 | pass |
| 865 | [pass] AP10-E restart-fallback status principal2 \| status=200 | pass |
| 866 | [pass] AP10-E restart-fallback status redaction principal2 | pass |
| 867 | [pass] AP10-E restart-fallback exact scope channels principal2 \| expected=["9201"] observed=["9201"] | pass |
| 868 | [pass] AP10-E restart-fallback no global observations principal2 | pass |
| 869 | [pass] AP10-E restart-fallback status principal3 \| status=403 | pass |
| 870 | [pass] AP10-E restart-fallback status redaction principal3 | pass |
| 871 | [pass] AP10-E restart-fallback status principal4 \| status=403 | pass |
| 872 | [pass] AP10-E restart-fallback status redaction principal4 | pass |
| 873 | [pass] AP10-C restart-derived six byte fixture prefix | pass |
| 874 | [pass] AP10-C restart-derived principal0 literal Range206 | pass |
| 875 | [pass] AP10-C restart-derived principal1 literal Range206 | pass |
| 876 | [pass] AP10-D restart-derived unauth media denied \| status=401 | pass |
| 877 | [pass] AP10-D restart-derived unauth no sensitive media response | pass |
| 878 | [pass] AP10-D restart-derived other-channel media denied \| status=404 | pass |
| 879 | [pass] AP10-D restart-derived other-channel no sensitive media response | pass |
| 880 | [pass] AP10-D restart-derived viewer media denied \| status=403 | pass |
| 881 | [pass] AP10-D restart-derived viewer no sensitive media response | pass |
| 882 | [pass] AP10-D restart-derived no-ops media denied \| status=403 | pass |
| 883 | [pass] AP10-D restart-derived no-ops no sensitive media response | pass |
| 884 | [pass] AP10-D restart-derived other-channel known nonexistent indistinguishable | pass |
| 885 | [pass] AP10-D restart-derived admin timeline200 | pass |
| 886 | [pass] AP10-D restart-derived admin timeline channel scope | pass |
| 887 | [pass] AP10-D restart-derived allowed timeline200 | pass |
| 888 | [pass] AP10-D restart-derived allowed timeline channel scope | pass |
| 889 | [pass] AP10-D restart-derived unauth timeline401 | pass |
| 890 | [pass] AP10-D restart-derived other-channel timeline403 | pass |
| 891 | [pass] AP10-D restart-derived viewer timeline403 | pass |
| 892 | [pass] AP10-D restart-derived no-ops timeline403 | pass |
| 893 | [pass] AP10-E restart-derived unauth status401 | pass |
| 894 | [pass] AP10-E restart-derived status principal0 \| status=200 | pass |
| 895 | [pass] AP10-E restart-derived status redaction principal0 | pass |
| 896 | [pass] AP10-E restart-derived exact scope channels principal0 \| expected=["1","2","3","4","5","9101","9201"] observed=["1","2","3","4","5","9101","9201"] | pass |
| 897 | [pass] AP10-E restart-derived status principal1 \| status=200 | pass |
| 898 | [pass] AP10-E restart-derived status redaction principal1 | pass |
| 899 | [pass] AP10-E restart-derived exact scope channels principal1 \| expected=["9101"] observed=["9101"] | pass |
| 900 | [pass] AP10-E restart-derived no global observations principal1 | pass |
| 901 | [pass] AP10-E restart-derived status principal2 \| status=200 | pass |
| 902 | [pass] AP10-E restart-derived status redaction principal2 | pass |
| 903 | [pass] AP10-E restart-derived exact scope channels principal2 \| expected=["9201"] observed=["9201"] | pass |
| 904 | [pass] AP10-E restart-derived no global observations principal2 | pass |
| 905 | [pass] AP10-E restart-derived status principal3 \| status=403 | pass |
| 906 | [pass] AP10-E restart-derived status redaction principal3 | pass |
| 907 | [pass] AP10-E restart-derived status principal4 \| status=403 | pass |
| 908 | [pass] AP10-E restart-derived status redaction principal4 | pass |
| 909 | [pass] AP09 immutable segment seg-9101-1789082256573-1 | pass |
| 910 | [pass] AP09 immutable segment seg-9101-1789082264932-2 | pass |
| 911 | [pass] AP09 immutable segment seg-9101-1789082273259-3 | pass |
| 912 | [pass] AP09 immutable segment event-seg-sha256-3872c05fa4106c8ae3f0e7fdaee28889cfba9b9de98dc7e811893ac87a6b550e | pass |
| 913 | [pass] AP09 immutable segment event-seg-sha256-ef660025b4709ce67fb1caab5464a1e754837d132c71d18be1e8f70a15234e80 | pass |
| 914 | [pass] AP09 immutable segment event-seg-sha256-516a2a1a68db180977aee121fe147f7159056cff0da6f6d785eaa8edb8b6983c | pass |
| 915 | [pass] AP09 immutable segment event-seg-sha256-f666fc904e905744ed3e8113adb0779d091334a50fab873de6d23dbdd8edb36b | pass |
| 916 | [pass] AP09 immutable segment event-seg-sha256-a5ab10c7d2785cdd655b9750a33abf5d8273c79d80d5adb6f8541c6ac6e2073b | pass |
| 917 | [pass] AP09 immutable segment event-seg-sha256-b70910298f7d763dfe5f424ed08042afa0c9e33d1f165a1a5294351bfbf1c596 | pass |
| 918 | [pass] AP09 immutable segment event-seg-sha256-cd473a9bec1fbec3a57dc2f9e58b693aa7dec49577f8676c80c3b8c30cb47770 | pass |
| 919 | [pass] AP09 immutable segment event-seg-sha256-d12b7c8a871f63387dedd22b44a6684d4c3bd65cc99b7929b134a1325c186183 | pass |
| 920 | [pass] AP09 immutable segment seg-9201-1789082282556-1 | pass |
| 921 | [pass] AP09 immutable segment seg-9201-1789082283613-2 | pass |
| 922 | [pass] AP09 immutable segment seg-9101-1789082281590-4 | pass |
| 923 | [pass] AP09 immutable segment seg-9201-1789082285612-3 | pass |
| 924 | [pass] AP09 immutable segment seg-9201-1789082286601-4 | pass |
| 925 | [pass] AP09 immutable segment seg-9201-1789082287615-5 | pass |
| 926 | [pass] AP09 immutable segment seg-9201-1789082287814-1 | pass |
| 927 | [pass] AP09 immutable segment seg-9201-1789082289626-2 | pass |
| 928 | [pass] AP09 immutable segment seg-9201-1789082290612-3 | pass |
| 929 | [pass] AP09 immutable segment seg-9201-1789082290790-1 | pass |
| 930 | [pass] AP09 immutable segment seg-9201-1789082292625-2 | pass |
| 931 | [pass] AP09 immutable segment seg-9101-1789082286589-5 | pass |
| 932 | [pass] AP09 immutable media SHA seg-9101-1789082256573-1 | pass |
| 933 | [pass] AP09 immutable media SHA seg-9101-1789082264932-2 | pass |
| 934 | [pass] AP09 immutable media SHA seg-9101-1789082273259-3 | pass |
| 935 | [pass] AP09 immutable media SHA event-seg-sha256-3872c05fa4106c8ae3f0e7fdaee28889cfba9b9de98dc7e811893ac87a6b550e | pass |
| 936 | [pass] AP09 immutable media SHA event-seg-sha256-ef660025b4709ce67fb1caab5464a1e754837d132c71d18be1e8f70a15234e80 | pass |
| 937 | [pass] AP09 immutable media SHA event-seg-sha256-516a2a1a68db180977aee121fe147f7159056cff0da6f6d785eaa8edb8b6983c | pass |
| 938 | [pass] AP09 immutable media SHA event-seg-sha256-f666fc904e905744ed3e8113adb0779d091334a50fab873de6d23dbdd8edb36b | pass |
| 939 | [pass] AP09 immutable media SHA event-seg-sha256-a5ab10c7d2785cdd655b9750a33abf5d8273c79d80d5adb6f8541c6ac6e2073b | pass |
| 940 | [pass] AP09 immutable media SHA event-seg-sha256-b70910298f7d763dfe5f424ed08042afa0c9e33d1f165a1a5294351bfbf1c596 | pass |
| 941 | [pass] AP09 immutable media SHA event-seg-sha256-cd473a9bec1fbec3a57dc2f9e58b693aa7dec49577f8676c80c3b8c30cb47770 | pass |
| 942 | [pass] AP09 immutable media SHA event-seg-sha256-d12b7c8a871f63387dedd22b44a6684d4c3bd65cc99b7929b134a1325c186183 | pass |
| 943 | [pass] AP09 immutable media SHA seg-9101-1789082281590-4 | pass |
| 944 | [pass] AP09 immutable media SHA seg-9201-1789082290612-3 | pass |
| 945 | [pass] AP09 immutable media SHA seg-9201-1789082290790-1 | pass |
| 946 | [pass] AP09 immutable media SHA seg-9201-1789082292625-2 | pass |
| 947 | [pass] AP09 immutable media SHA seg-9101-1789082286589-5 | pass |
| 948 | [pass] AP09 immutable links evt_1789082265225_2 | pass |
| 949 | [pass] AP09 immutable links evt_1789082265225_3 | pass |
| 950 | [pass] AP09 immutable links evt_1789082265226_4 | pass |
| 951 | [pass] AP09 immutable links evt_1789082265227_5 | pass |
| 952 | [pass] AP09 immutable links evt_1789082274097_76 | pass |
| 953 | [pass] AP09 immutable links evt_1789082274097_77 | pass |
| 954 | [pass] AP09 immutable links evt_1789082274098_78 | pass |
| 955 | [pass] AP09 immutable links evt_1789082274099_79 | pass |
| 956 | [pass] AP09 immutable links evt_1789082274099_80 | pass |
| 957 | [pass] AP09 immutable links evt_1789082274100_81 | pass |
| 958 | [pass] AP09 immutable links evt_1789082274100_82 | pass |
| 959 | [pass] AP09 immutable links evt_1789082274101_83 | pass |
| 960 | [pass] AP09 immutable observations obs-6ed813f72410cbbb0a7fcc96a34ec26a | pass |
| 961 | [pass] AP09 immutable observations obs-0c56d28b707c3af66e88a6120fac4dbb | pass |
| 962 | [pass] AP09 immutable observations obs-ad5e5443fa319fed20e78d80f3840d20 | pass |
| 963 | [pass] AP09 immutable observations obs-0205fa335fe792382f966b8f1c0725d9 | pass |
| 964 | [pass] AP09 immutable observations obs-064bf9ef909b27d23e9ce60621954283 | pass |
| 965 | [pass] AP09 immutable observations obs-edf7e808562f804f65422d52a7533d92 | pass |
| 966 | [pass] AP09 immutable observations obs-98e16e4c1395490c45128ae6c6b19531 | pass |
| 967 | [pass] AP09 immutable observations obs-29d68ddcbc0dfb695605585c0d3d06b8 | pass |
| 968 | [pass] AP09 immutable observations obs-ef2c011c42d42b21dc98d815ad5379ba | pass |
| 969 | [pass] AP09 immutable observations obs-120c09ec11138492222a4ab3976053f9 | pass |
| 970 | [pass] AP09 immutable observations obs-29e33cc56bbf4ea3fdf59dabf36b8550 | pass |
| 971 | [pass] AP09 immutable observations obs-969f98cfc4786f1cd3398adae4fa68ff | pass |
| 972 | [pass] AP09 immutable observations obs-eee71ab0864460c3f4f11174a872c924 | pass |
| 973 | [pass] AP09 immutable observations obs-3ae795f9564fe1182e598f626f275077 | pass |
| 974 | [pass] AP09 immutable observations obs-7e1ac64498aeaadd3cf81adae9b52a32 | pass |
| 975 | [pass] AP09 immutable observations obs-0c87c11bc1082a5a2210fc9a8daf2675 | pass |
| 976 | [pass] AP09 immutable observations obs-00ac4c0c30736591aafd85f52d5a6396 | pass |
| 977 | [pass] AP09 immutable observations obs-c26ad585c0b92ed697b30e606d2d9f41 | pass |
| 978 | [pass] AP09 immutable observations obs-e84669455c1df6e33bb6c758a9531b64 | pass |
| 979 | [pass] AP09 immutable observations obs-551eff4c7d323ed8fd909b8d1020aa87 | pass |
| 980 | [pass] AP09 immutable observations obs-87c05d1258265564f3f5e393e72d2853 | pass |
| 981 | [pass] AP09 immutable observations obs-2a30dd77d9fd00b36c39cf426ddf2914 | pass |
| 982 | [pass] AP09 immutable observations obs-24b3974cff9b9576ac8562008463d5a1 | pass |
| 983 | [pass] AP09 immutable observations obs-df4ded5d0bed690510a55bb82c21f4ea | pass |
| 984 | [pass] AP09 immutable observations obs-1df5980a1b74fa73b36fe26cf845e500 | pass |
| 985 | [pass] AP09 immutable observations obs-edb871625f6e6e5a136e61fbc1ee1141 | pass |
| 986 | [pass] AP09 immutable observations obs-e25e2ed64f617c7183ff9186693ba0ba | pass |
| 987 | [pass] AP09 immutable observations obs-2f08413260d96f38b86045530c27fbb3 | pass |
| 988 | [pass] AP09 immutable observations obs-07aabdc2f796dbb28552cddd4cf76f35 | pass |
| 989 | [pass] AP09 immutable observations obs-5c254643bc44beebbe3227993d04fb78 | pass |
| 990 | [pass] AP09 immutable observations obs-cbe362c3499d487d0eb625cf2d5de56e | pass |
| 991 | [pass] AP09 immutable observations obs-6d901362af7c4ed3d077d638e38965e0 | pass |
| 992 | [pass] AP09 immutable observations obs-1f901cbec42627a2a74eeb9bcdca9559 | pass |
| 993 | [pass] AP09 immutable observations obs-b6287649d34e14844a30d3548d46e8a3 | pass |
| 994 | [pass] AP09 immutable observations obs-79b2fbb34dbb8510516e96097117e3eb | pass |
| 995 | [pass] AP09 immutable observations obs-d1ea5f36c438ad66edb399a6f1d927ed | pass |
| 996 | [pass] AP09 immutable observations obs-245c3449d9e495ff6a3540cd55f5fdac | pass |
| 997 | [pass] AP09 immutable observations obs-425725380319a66bf0694f4b475a2058 | pass |
| 998 | [pass] AP09 immutable observations obs-ccade81dd105253ea670121be9fdd369 | pass |
| 999 | [pass] AP09 immutable observations obs-b13fe516d20c60f9a3604f19f2fc1cee | pass |
| 1000 | [pass] AP09 immutable observations obs-e0ade52a0f00958ccc10bf157f4d5b8b | pass |
| 1001 | [pass] AP09 immutable observations obs-dee3caa17916b63f402b67fc48e0dda0 | pass |
| 1002 | [pass] AP09 immutable observations obs-16a80e411910252ba29117c2e0b148bc | pass |
| 1003 | [pass] AP09 immutable observations obs-0be8acd0a8e4a08c7b41a9b960dec61b | pass |
| 1004 | [pass] AP09 immutable observations obs-86051d70382855f9308b4eee2419b0de | pass |
| 1005 | [pass] AP09 immutable observations obs-c3c5d5834ef5805268056f02b361a84d | pass |
| 1006 | [pass] AP09 immutable observations obs-b40a263dbd5884f30f289c41b33dd920 | pass |
| 1007 | [pass] AP09 immutable observations obs-31c5816f9b29d3dc71a5ca8229f340bf | pass |
| 1008 | [pass] AP09 immutable observations obs-149d32b7431c5db56253a1a99e498a3e | pass |
| 1009 | [pass] AP09 immutable observations obs-02e2e1ec37ae69b6126105345d87026d | pass |
| 1010 | [pass] AP09 immutable observations obs-49159d01cc872633dcd3541c5dc86060 | pass |
| 1011 | [pass] AP09 immutable observations obs-8411405c5d0e644849be10e66e7018b3 | pass |
| 1012 | [pass] AP09 immutable observations obs-5b3a57714ef119a17ac42834b2022132 | pass |
| 1013 | [pass] AP09 immutable observations obs-1b0e7af186b621eed3926337092ad9a5 | pass |
| 1014 | [pass] AP09 immutable observations obs-841e681abcc1960c58a605514a625763 | pass |
| 1015 | [pass] AP09 immutable observations obs-3c68486ea6b390a3d6876d09b3cb6b54 | pass |
| 1016 | [pass] AP09 immutable observations obs-4aad5d1545916ed6cec64f2aa45ab801 | pass |
| 1017 | [pass] AP09 immutable observations obs-45e60cc267c685d5d2a4e18de77c6502 | pass |
| 1018 | [pass] AP09 immutable observations obs-bcaa78e5501c7a8967539b7384986ed6 | pass |
| 1019 | [pass] AP09 immutable observations obs-214dfc07a7ca38967566187cdb45acf1 | pass |
| 1020 | [pass] AP09 immutable observations obs-d7be66fadcc1c5d3bef2cade377d9974 | pass |
| 1021 | [pass] AP09 immutable observations obs-c69cd06487bde398435d97deb1d368af | pass |
| 1022 | [pass] AP09 immutable observations obs-6d40ce33f92a125468ba45f399e47157 | pass |
| 1023 | [pass] AP09 immutable observations obs-af02bde4e344e46bdc987761d4ca79f0 | pass |
| 1024 | [pass] AP09 immutable observations obs-596e49e7674daa2246afc045473ac771 | pass |
| 1025 | [pass] AP09 immutable observations obs-6980dc8da3b7605901aacb6483dcbba2 | pass |
| 1026 | [pass] AP09 immutable observations obs-1567a4d38622c680e7fdfbdd915df967 | pass |
| 1027 | [pass] AP09 immutable observations obs-18d74239765bbc3ff3d0bc928926cce0 | pass |
| 1028 | [pass] AP09 immutable observations obs-f5e5bcdcacc660329f9712c46426f90d | pass |
| 1029 | [pass] AP09 immutable observations obs-7ed5fa31607b87f1a375a527a748a60e | pass |
| 1030 | [pass] AP09 immutable observations obs-035783487141852a8ca1d3854e267d3b | pass |
| 1031 | [pass] AP09 immutable observations obs-33e614faa060ac234280e3dd88a50326 | pass |
| 1032 | [pass] AP09 immutable observations obs-b758e29b8f8d24008b4d474ea4a522ed | pass |
| 1033 | [pass] AP09 immutable observations obs-78332836cdcf5cd9f197fe328c06dcc0 | pass |
| 1034 | [pass] AP09 immutable observations obs-f0285e3691d3e0dde2828bd71973fada | pass |
| 1035 | [pass] AP09 immutable observations obs-d21ba3b1f4ebb9f2e757bc91031fd7fd | pass |
| 1036 | [pass] AP09 immutable observations obs-e63ff1178e3fdbaf84d9a57a59575880 | pass |
| 1037 | [pass] AP09 immutable observations obs-a68090d61d8991a412e4c0d802c9dcab | pass |
| 1038 | [pass] AP09 immutable observations obs-8d585d3cef08604360fc38b3e722be68 | pass |
| 1039 | [pass] AP09 immutable observations obs-01955591705421910e5da4f185420632 | pass |
| 1040 | [pass] AP09 immutable observations obs-c9b32172fb5d37686a51e418fb763c33 | pass |
| 1041 | [pass] AP09 immutable observations obs-cb172e95ffe18456db665c7ec10c1515 | pass |
| 1042 | [pass] AP09 immutable tombstones seg-9201-1789082282556-1 | pass |
| 1043 | [pass] AP09 immutable tombstones seg-9201-1789082283613-2 | pass |
| 1044 | [pass] AP09 immutable tombstones seg-9201-1789082285612-3 | pass |
| 1045 | [pass] AP09 immutable tombstones seg-9201-1789082286601-4 | pass |
| 1046 | [pass] AP09 immutable tombstones seg-9201-1789082287615-5 | pass |
| 1047 | [pass] AP09 immutable tombstones seg-9201-1789082287814-1 | pass |
| 1048 | [pass] AP09 immutable tombstones seg-9201-1789082289626-2 | pass |
| 1049 | [pass] AP09 duplicate mutation IDs zero | pass |
| 1050 | [pass] AP09 actual post-restart finalized | pass |
| 1051 | [pass] AP12 app2 exit0 \| exit=0 signal=null | pass |
| 1052 | [pass] AP12 root below 512MiB cap \| bytes=322688966 | pass |
| 1053 | [pass] AP10 required suite coverage complete | pass |
| 1054 | [pass] AP12 port absent 50678 | pass |
| 1055 | [pass] AP12 port absent 50679 | pass |
| 1056 | [pass] AP12 port absent 50805 | pass |
| 1057 | [pass] AP12 port absent 50806 | pass |
| 1058 | [pass] AP12 root cleanup \| path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-s09-foundation-7yLNdP bytes=322688966 absent=true | pass |
| 1059 | [pass] AP wrapper completed and cleanup absent | pass |
