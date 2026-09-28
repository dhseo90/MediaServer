개발·검증 증적 독자용; lifecycle은 S09 실행17599 보존이며 실행 결과 source-of-truth는 중앙 release-test-records.md이다.

# S09 project inventory 17599 개별 원출력

메인 실행 `./server.sh verify-project-inventory`, exit0. 원로그5087줄210250bytes 중 [pass]5081행/[fail]0행을 원래순서로전수보존한다. 최상위 summary18pass/0fail 및 featureRows986과 내부개별5081행은 서로다른계층이며5081기능실행을뜻하지않는다. 정적기능/증거정합성검사이지 실제제품/UI/장시간실행이아니다. raw URL/file:: 및 Cookie/Bearer/passwordHash/tokenHash 노출패턴 없음 확인. Markdown표 escape만적용하며원문행의축약/재구성없음. elapsed/token은메인개별집계미전달로미집계.

| 원출력 순번 | 개별 원출력 | 결과 |
| --- | --- | --- |
| 1 | [pass] S05 개별 동작 등록 exact 연결 (실행 증거 아님) | pass |
| 2 | [pass] public docs index excludes internal feature inventory | pass |
| 3 | [pass] feature inventory pins current release scope | pass |
| 4 | [pass] required sections exist | pass |
| 5 | [pass] historical V280 source-of-truth keeps the 2.x runway boundary explicit | pass |
| 6 | [pass] historical V290 source-of-truth keeps source, published, and roadmap distinct | pass |
| 7 | [pass] inventory summary count 전체 기능 항목 986 | pass |
| 8 | [pass] inventory summary count UI 직접 필요 400 | pass |
| 9 | [pass] inventory summary count UI 간접 필요 36 | pass |
| 10 | [pass] inventory summary count UI 비대상 550 | pass |
| 11 | [pass] inventory summary count 테스트 필요 986 | pass |
| 12 | [pass] inventory summary count 안정화 대상 976 | pass |
| 13 | [pass] inventory summary count UI 풀테스트 대상 424 | pass |
| 14 | [pass] inventory summary count 30분 soak 대상 50 | pass |
| 15 | [pass] inventory summary count 120분 대상 7 | pass |
| 16 | [pass] summary counts match current feature IDs | pass |
| 17 | [pass] implementation evidence manifest matches all feature rows | pass |
| 18 | [pass] feature UI-001 name present | pass |
| 19 | [pass] feature UI-001 UI need 필요 | pass |
| 20 | [pass] feature UI-001 test need 필요 | pass |
| 21 | [pass] feature UI-001 test area assigned | pass |
| 22 | [pass] feature UI-001 pass criteria present | pass |
| 23 | [pass] feature UI-002 name present | pass |
| 24 | [pass] feature UI-002 UI need 필요 | pass |
| 25 | [pass] feature UI-002 test need 필요 | pass |
| 26 | [pass] feature UI-002 test area assigned | pass |
| 27 | [pass] feature UI-002 pass criteria present | pass |
| 28 | [pass] feature UI-003 name present | pass |
| 29 | [pass] feature UI-003 UI need 필요 | pass |
| 30 | [pass] feature UI-003 test need 필요 | pass |
| 31 | [pass] feature UI-003 test area assigned | pass |
| 32 | [pass] feature UI-003 pass criteria present | pass |
| 33 | [pass] feature UI-004 name present | pass |
| 34 | [pass] feature UI-004 UI need 필요 | pass |
| 35 | [pass] feature UI-004 test need 필요 | pass |
| 36 | [pass] feature UI-004 test area assigned | pass |
| 37 | [pass] feature UI-004 pass criteria present | pass |
| 38 | [pass] feature UI-005 name present | pass |
| 39 | [pass] feature UI-005 UI need 간접 | pass |
| 40 | [pass] feature UI-005 test need 필요 | pass |
| 41 | [pass] feature UI-005 test area assigned | pass |
| 42 | [pass] feature UI-005 pass criteria present | pass |
| 43 | [pass] feature UI-006 name present | pass |
| 44 | [pass] feature UI-006 UI need 간접 | pass |
| 45 | [pass] feature UI-006 test need 필요 | pass |
| 46 | [pass] feature UI-006 test area assigned | pass |
| 47 | [pass] feature UI-006 pass criteria present | pass |
| 48 | [pass] feature UI-007 name present | pass |
| 49 | [pass] feature UI-007 UI need 필요 | pass |
| 50 | [pass] feature UI-007 test need 필요 | pass |
| 51 | [pass] feature UI-007 test area assigned | pass |
| 52 | [pass] feature UI-007 pass criteria present | pass |
| 53 | [pass] feature UI-008 name present | pass |
| 54 | [pass] feature UI-008 UI need 필요 | pass |
| 55 | [pass] feature UI-008 test need 필요 | pass |
| 56 | [pass] feature UI-008 test area assigned | pass |
| 57 | [pass] feature UI-008 pass criteria present | pass |
| 58 | [pass] feature UI-009 name present | pass |
| 59 | [pass] feature UI-009 UI need 필요 | pass |
| 60 | [pass] feature UI-009 test need 필요 | pass |
| 61 | [pass] feature UI-009 test area assigned | pass |
| 62 | [pass] feature UI-009 pass criteria present | pass |
| 63 | [pass] feature UI-010 name present | pass |
| 64 | [pass] feature UI-010 UI need 필요 | pass |
| 65 | [pass] feature UI-010 test need 필요 | pass |
| 66 | [pass] feature UI-010 test area assigned | pass |
| 67 | [pass] feature UI-010 pass criteria present | pass |
| 68 | [pass] feature UI-011 name present | pass |
| 69 | [pass] feature UI-011 UI need 필요 | pass |
| 70 | [pass] feature UI-011 test need 필요 | pass |
| 71 | [pass] feature UI-011 test area assigned | pass |
| 72 | [pass] feature UI-011 pass criteria present | pass |
| 73 | [pass] feature UI-012 name present | pass |
| 74 | [pass] feature UI-012 UI need 필요 | pass |
| 75 | [pass] feature UI-012 test need 필요 | pass |
| 76 | [pass] feature UI-012 test area assigned | pass |
| 77 | [pass] feature UI-012 pass criteria present | pass |
| 78 | [pass] feature UI-013 name present | pass |
| 79 | [pass] feature UI-013 UI need 필요 | pass |
| 80 | [pass] feature UI-013 test need 필요 | pass |
| 81 | [pass] feature UI-013 test area assigned | pass |
| 82 | [pass] feature UI-013 pass criteria present | pass |
| 83 | [pass] feature UI-014 name present | pass |
| 84 | [pass] feature UI-014 UI need 필요 | pass |
| 85 | [pass] feature UI-014 test need 필요 | pass |
| 86 | [pass] feature UI-014 test area assigned | pass |
| 87 | [pass] feature UI-014 pass criteria present | pass |
| 88 | [pass] feature UI-015 name present | pass |
| 89 | [pass] feature UI-015 UI need 필요 | pass |
| 90 | [pass] feature UI-015 test need 필요 | pass |
| 91 | [pass] feature UI-015 test area assigned | pass |
| 92 | [pass] feature UI-015 pass criteria present | pass |
| 93 | [pass] feature UI-016 name present | pass |
| 94 | [pass] feature UI-016 UI need 필요 | pass |
| 95 | [pass] feature UI-016 test need 필요 | pass |
| 96 | [pass] feature UI-016 test area assigned | pass |
| 97 | [pass] feature UI-016 pass criteria present | pass |
| 98 | [pass] feature UI-017 name present | pass |
| 99 | [pass] feature UI-017 UI need 필요 | pass |
| 100 | [pass] feature UI-017 test need 필요 | pass |
| 101 | [pass] feature UI-017 test area assigned | pass |
| 102 | [pass] feature UI-017 pass criteria present | pass |
| 103 | [pass] feature UI-018 name present | pass |
| 104 | [pass] feature UI-018 UI need 비대상 | pass |
| 105 | [pass] feature UI-018 test need 필요 | pass |
| 106 | [pass] feature UI-018 test area assigned | pass |
| 107 | [pass] feature UI-018 pass criteria present | pass |
| 108 | [pass] feature UI-019 name present | pass |
| 109 | [pass] feature UI-019 UI need 필요 | pass |
| 110 | [pass] feature UI-019 test need 필요 | pass |
| 111 | [pass] feature UI-019 test area assigned | pass |
| 112 | [pass] feature UI-019 pass criteria present | pass |
| 113 | [pass] feature UI-020 name present | pass |
| 114 | [pass] feature UI-020 UI need 필요 | pass |
| 115 | [pass] feature UI-020 test need 필요 | pass |
| 116 | [pass] feature UI-020 test area assigned | pass |
| 117 | [pass] feature UI-020 pass criteria present | pass |
| 118 | [pass] feature UI-021 name present | pass |
| 119 | [pass] feature UI-021 UI need 필요 | pass |
| 120 | [pass] feature UI-021 test need 필요 | pass |
| 121 | [pass] feature UI-021 test area assigned | pass |
| 122 | [pass] feature UI-021 pass criteria present | pass |
| 123 | [pass] feature UI-022 name present | pass |
| 124 | [pass] feature UI-022 UI need 필요 | pass |
| 125 | [pass] feature UI-022 test need 필요 | pass |
| 126 | [pass] feature UI-022 test area assigned | pass |
| 127 | [pass] feature UI-022 pass criteria present | pass |
| 128 | [pass] feature UI-023 name present | pass |
| 129 | [pass] feature UI-023 UI need 필요 | pass |
| 130 | [pass] feature UI-023 test need 필요 | pass |
| 131 | [pass] feature UI-023 test area assigned | pass |
| 132 | [pass] feature UI-023 pass criteria present | pass |
| 133 | [pass] feature UI-024 name present | pass |
| 134 | [pass] feature UI-024 UI need 필요 | pass |
| 135 | [pass] feature UI-024 test need 필요 | pass |
| 136 | [pass] feature UI-024 test area assigned | pass |
| 137 | [pass] feature UI-024 pass criteria present | pass |
| 138 | [pass] feature UI-025 name present | pass |
| 139 | [pass] feature UI-025 UI need 필요 | pass |
| 140 | [pass] feature UI-025 test need 필요 | pass |
| 141 | [pass] feature UI-025 test area assigned | pass |
| 142 | [pass] feature UI-025 pass criteria present | pass |
| 143 | [pass] feature UI-026 name present | pass |
| 144 | [pass] feature UI-026 UI need 필요 | pass |
| 145 | [pass] feature UI-026 test need 필요 | pass |
| 146 | [pass] feature UI-026 test area assigned | pass |
| 147 | [pass] feature UI-026 pass criteria present | pass |
| 148 | [pass] feature UI-027 name present | pass |
| 149 | [pass] feature UI-027 UI need 필요 | pass |
| 150 | [pass] feature UI-027 test need 필요 | pass |
| 151 | [pass] feature UI-027 test area assigned | pass |
| 152 | [pass] feature UI-027 pass criteria present | pass |
| 153 | [pass] feature UI-028 name present | pass |
| 154 | [pass] feature UI-028 UI need 필요 | pass |
| 155 | [pass] feature UI-028 test need 필요 | pass |
| 156 | [pass] feature UI-028 test area assigned | pass |
| 157 | [pass] feature UI-028 pass criteria present | pass |
| 158 | [pass] feature UI-029 name present | pass |
| 159 | [pass] feature UI-029 UI need 필요 | pass |
| 160 | [pass] feature UI-029 test need 필요 | pass |
| 161 | [pass] feature UI-029 test area assigned | pass |
| 162 | [pass] feature UI-029 pass criteria present | pass |
| 163 | [pass] feature UI-030 name present | pass |
| 164 | [pass] feature UI-030 UI need 필요 | pass |
| 165 | [pass] feature UI-030 test need 필요 | pass |
| 166 | [pass] feature UI-030 test area assigned | pass |
| 167 | [pass] feature UI-030 pass criteria present | pass |
| 168 | [pass] feature UI-031 name present | pass |
| 169 | [pass] feature UI-031 UI need 필요 | pass |
| 170 | [pass] feature UI-031 test need 필요 | pass |
| 171 | [pass] feature UI-031 test area assigned | pass |
| 172 | [pass] feature UI-031 pass criteria present | pass |
| 173 | [pass] feature UI-032 name present | pass |
| 174 | [pass] feature UI-032 UI need 필요 | pass |
| 175 | [pass] feature UI-032 test need 필요 | pass |
| 176 | [pass] feature UI-032 test area assigned | pass |
| 177 | [pass] feature UI-032 pass criteria present | pass |
| 178 | [pass] feature UI-033 name present | pass |
| 179 | [pass] feature UI-033 UI need 필요 | pass |
| 180 | [pass] feature UI-033 test need 필요 | pass |
| 181 | [pass] feature UI-033 test area assigned | pass |
| 182 | [pass] feature UI-033 pass criteria present | pass |
| 183 | [pass] feature UI-034 name present | pass |
| 184 | [pass] feature UI-034 UI need 필요 | pass |
| 185 | [pass] feature UI-034 test need 필요 | pass |
| 186 | [pass] feature UI-034 test area assigned | pass |
| 187 | [pass] feature UI-034 pass criteria present | pass |
| 188 | [pass] feature UI-035 name present | pass |
| 189 | [pass] feature UI-035 UI need 필요 | pass |
| 190 | [pass] feature UI-035 test need 필요 | pass |
| 191 | [pass] feature UI-035 test area assigned | pass |
| 192 | [pass] feature UI-035 pass criteria present | pass |
| 193 | [pass] feature UI-036 name present | pass |
| 194 | [pass] feature UI-036 UI need 필요 | pass |
| 195 | [pass] feature UI-036 test need 필요 | pass |
| 196 | [pass] feature UI-036 test area assigned | pass |
| 197 | [pass] feature UI-036 pass criteria present | pass |
| 198 | [pass] feature UI-037 name present | pass |
| 199 | [pass] feature UI-037 UI need 필요 | pass |
| 200 | [pass] feature UI-037 test need 필요 | pass |
| 201 | [pass] feature UI-037 test area assigned | pass |
| 202 | [pass] feature UI-037 pass criteria present | pass |
| 203 | [pass] feature UI-038 name present | pass |
| 204 | [pass] feature UI-038 UI need 필요 | pass |
| 205 | [pass] feature UI-038 test need 필요 | pass |
| 206 | [pass] feature UI-038 test area assigned | pass |
| 207 | [pass] feature UI-038 pass criteria present | pass |
| 208 | [pass] feature UI-039 name present | pass |
| 209 | [pass] feature UI-039 UI need 필요 | pass |
| 210 | [pass] feature UI-039 test need 필요 | pass |
| 211 | [pass] feature UI-039 test area assigned | pass |
| 212 | [pass] feature UI-039 pass criteria present | pass |
| 213 | [pass] feature UI-040 name present | pass |
| 214 | [pass] feature UI-040 UI need 필요 | pass |
| 215 | [pass] feature UI-040 test need 필요 | pass |
| 216 | [pass] feature UI-040 test area assigned | pass |
| 217 | [pass] feature UI-040 pass criteria present | pass |
| 218 | [pass] feature UI-041 name present | pass |
| 219 | [pass] feature UI-041 UI need 필요 | pass |
| 220 | [pass] feature UI-041 test need 필요 | pass |
| 221 | [pass] feature UI-041 test area assigned | pass |
| 222 | [pass] feature UI-041 pass criteria present | pass |
| 223 | [pass] feature UI-042 name present | pass |
| 224 | [pass] feature UI-042 UI need 필요 | pass |
| 225 | [pass] feature UI-042 test need 필요 | pass |
| 226 | [pass] feature UI-042 test area assigned | pass |
| 227 | [pass] feature UI-042 pass criteria present | pass |
| 228 | [pass] feature UI-043 name present | pass |
| 229 | [pass] feature UI-043 UI need 필요 | pass |
| 230 | [pass] feature UI-043 test need 필요 | pass |
| 231 | [pass] feature UI-043 test area assigned | pass |
| 232 | [pass] feature UI-043 pass criteria present | pass |
| 233 | [pass] feature UI-044 name present | pass |
| 234 | [pass] feature UI-044 UI need 필요 | pass |
| 235 | [pass] feature UI-044 test need 필요 | pass |
| 236 | [pass] feature UI-044 test area assigned | pass |
| 237 | [pass] feature UI-044 pass criteria present | pass |
| 238 | [pass] feature UI-045 name present | pass |
| 239 | [pass] feature UI-045 UI need 필요 | pass |
| 240 | [pass] feature UI-045 test need 필요 | pass |
| 241 | [pass] feature UI-045 test area assigned | pass |
| 242 | [pass] feature UI-045 pass criteria present | pass |
| 243 | [pass] feature UI-046 name present | pass |
| 244 | [pass] feature UI-046 UI need 필요 | pass |
| 245 | [pass] feature UI-046 test need 필요 | pass |
| 246 | [pass] feature UI-046 test area assigned | pass |
| 247 | [pass] feature UI-046 pass criteria present | pass |
| 248 | [pass] feature UI-047 name present | pass |
| 249 | [pass] feature UI-047 UI need 필요 | pass |
| 250 | [pass] feature UI-047 test need 필요 | pass |
| 251 | [pass] feature UI-047 test area assigned | pass |
| 252 | [pass] feature UI-047 pass criteria present | pass |
| 253 | [pass] feature UI-048 name present | pass |
| 254 | [pass] feature UI-048 UI need 필요 | pass |
| 255 | [pass] feature UI-048 test need 필요 | pass |
| 256 | [pass] feature UI-048 test area assigned | pass |
| 257 | [pass] feature UI-048 pass criteria present | pass |
| 258 | [pass] feature UI-049 name present | pass |
| 259 | [pass] feature UI-049 UI need 필요 | pass |
| 260 | [pass] feature UI-049 test need 필요 | pass |
| 261 | [pass] feature UI-049 test area assigned | pass |
| 262 | [pass] feature UI-049 pass criteria present | pass |
| 263 | [pass] feature UI-050 name present | pass |
| 264 | [pass] feature UI-050 UI need 필요 | pass |
| 265 | [pass] feature UI-050 test need 필요 | pass |
| 266 | [pass] feature UI-050 test area assigned | pass |
| 267 | [pass] feature UI-050 pass criteria present | pass |
| 268 | [pass] feature UI-051 name present | pass |
| 269 | [pass] feature UI-051 UI need 필요 | pass |
| 270 | [pass] feature UI-051 test need 필요 | pass |
| 271 | [pass] feature UI-051 test area assigned | pass |
| 272 | [pass] feature UI-051 pass criteria present | pass |
| 273 | [pass] feature UI-052 name present | pass |
| 274 | [pass] feature UI-052 UI need 필요 | pass |
| 275 | [pass] feature UI-052 test need 필요 | pass |
| 276 | [pass] feature UI-052 test area assigned | pass |
| 277 | [pass] feature UI-052 pass criteria present | pass |
| 278 | [pass] feature UI-053 name present | pass |
| 279 | [pass] feature UI-053 UI need 필요 | pass |
| 280 | [pass] feature UI-053 test need 필요 | pass |
| 281 | [pass] feature UI-053 test area assigned | pass |
| 282 | [pass] feature UI-053 pass criteria present | pass |
| 283 | [pass] feature UI-054 name present | pass |
| 284 | [pass] feature UI-054 UI need 필요 | pass |
| 285 | [pass] feature UI-054 test need 필요 | pass |
| 286 | [pass] feature UI-054 test area assigned | pass |
| 287 | [pass] feature UI-054 pass criteria present | pass |
| 288 | [pass] feature UI-055 name present | pass |
| 289 | [pass] feature UI-055 UI need 필요 | pass |
| 290 | [pass] feature UI-055 test need 필요 | pass |
| 291 | [pass] feature UI-055 test area assigned | pass |
| 292 | [pass] feature UI-055 pass criteria present | pass |
| 293 | [pass] feature UI-056 name present | pass |
| 294 | [pass] feature UI-056 UI need 필요 | pass |
| 295 | [pass] feature UI-056 test need 필요 | pass |
| 296 | [pass] feature UI-056 test area assigned | pass |
| 297 | [pass] feature UI-056 pass criteria present | pass |
| 298 | [pass] feature UI-057 name present | pass |
| 299 | [pass] feature UI-057 UI need 필요 | pass |
| 300 | [pass] feature UI-057 test need 필요 | pass |
| 301 | [pass] feature UI-057 test area assigned | pass |
| 302 | [pass] feature UI-057 pass criteria present | pass |
| 303 | [pass] feature UI-058 name present | pass |
| 304 | [pass] feature UI-058 UI need 필요 | pass |
| 305 | [pass] feature UI-058 test need 필요 | pass |
| 306 | [pass] feature UI-058 test area assigned | pass |
| 307 | [pass] feature UI-058 pass criteria present | pass |
| 308 | [pass] feature UI-059 name present | pass |
| 309 | [pass] feature UI-059 UI need 필요 | pass |
| 310 | [pass] feature UI-059 test need 필요 | pass |
| 311 | [pass] feature UI-059 test area assigned | pass |
| 312 | [pass] feature UI-059 pass criteria present | pass |
| 313 | [pass] feature UI-060 name present | pass |
| 314 | [pass] feature UI-060 UI need 필요 | pass |
| 315 | [pass] feature UI-060 test need 필요 | pass |
| 316 | [pass] feature UI-060 test area assigned | pass |
| 317 | [pass] feature UI-060 pass criteria present | pass |
| 318 | [pass] feature UI-061 name present | pass |
| 319 | [pass] feature UI-061 UI need 필요 | pass |
| 320 | [pass] feature UI-061 test need 필요 | pass |
| 321 | [pass] feature UI-061 test area assigned | pass |
| 322 | [pass] feature UI-061 pass criteria present | pass |
| 323 | [pass] feature UI-062 name present | pass |
| 324 | [pass] feature UI-062 UI need 필요 | pass |
| 325 | [pass] feature UI-062 test need 필요 | pass |
| 326 | [pass] feature UI-062 test area assigned | pass |
| 327 | [pass] feature UI-062 pass criteria present | pass |
| 328 | [pass] feature UI-063 name present | pass |
| 329 | [pass] feature UI-063 UI need 필요 | pass |
| 330 | [pass] feature UI-063 test need 필요 | pass |
| 331 | [pass] feature UI-063 test area assigned | pass |
| 332 | [pass] feature UI-063 pass criteria present | pass |
| 333 | [pass] feature UI-064 name present | pass |
| 334 | [pass] feature UI-064 UI need 필요 | pass |
| 335 | [pass] feature UI-064 test need 필요 | pass |
| 336 | [pass] feature UI-064 test area assigned | pass |
| 337 | [pass] feature UI-064 pass criteria present | pass |
| 338 | [pass] feature UI-065 name present | pass |
| 339 | [pass] feature UI-065 UI need 필요 | pass |
| 340 | [pass] feature UI-065 test need 필요 | pass |
| 341 | [pass] feature UI-065 test area assigned | pass |
| 342 | [pass] feature UI-065 pass criteria present | pass |
| 343 | [pass] feature UI-066 name present | pass |
| 344 | [pass] feature UI-066 UI need 필요 | pass |
| 345 | [pass] feature UI-066 test need 필요 | pass |
| 346 | [pass] feature UI-066 test area assigned | pass |
| 347 | [pass] feature UI-066 pass criteria present | pass |
| 348 | [pass] feature UI-067 name present | pass |
| 349 | [pass] feature UI-067 UI need 필요 | pass |
| 350 | [pass] feature UI-067 test need 필요 | pass |
| 351 | [pass] feature UI-067 test area assigned | pass |
| 352 | [pass] feature UI-067 pass criteria present | pass |
| 353 | [pass] feature UI-068 name present | pass |
| 354 | [pass] feature UI-068 UI need 필요 | pass |
| 355 | [pass] feature UI-068 test need 필요 | pass |
| 356 | [pass] feature UI-068 test area assigned | pass |
| 357 | [pass] feature UI-068 pass criteria present | pass |
| 358 | [pass] feature UI-069 name present | pass |
| 359 | [pass] feature UI-069 UI need 필요 | pass |
| 360 | [pass] feature UI-069 test need 필요 | pass |
| 361 | [pass] feature UI-069 test area assigned | pass |
| 362 | [pass] feature UI-069 pass criteria present | pass |
| 363 | [pass] feature UI-070 name present | pass |
| 364 | [pass] feature UI-070 UI need 필요 | pass |
| 365 | [pass] feature UI-070 test need 필요 | pass |
| 366 | [pass] feature UI-070 test area assigned | pass |
| 367 | [pass] feature UI-070 pass criteria present | pass |
| 368 | [pass] feature UI-071 name present | pass |
| 369 | [pass] feature UI-071 UI need 필요 | pass |
| 370 | [pass] feature UI-071 test need 필요 | pass |
| 371 | [pass] feature UI-071 test area assigned | pass |
| 372 | [pass] feature UI-071 pass criteria present | pass |
| 373 | [pass] feature UI-072 name present | pass |
| 374 | [pass] feature UI-072 UI need 필요 | pass |
| 375 | [pass] feature UI-072 test need 필요 | pass |
| 376 | [pass] feature UI-072 test area assigned | pass |
| 377 | [pass] feature UI-072 pass criteria present | pass |
| 378 | [pass] feature UI-073 name present | pass |
| 379 | [pass] feature UI-073 UI need 필요 | pass |
| 380 | [pass] feature UI-073 test need 필요 | pass |
| 381 | [pass] feature UI-073 test area assigned | pass |
| 382 | [pass] feature UI-073 pass criteria present | pass |
| 383 | [pass] feature UI-074 name present | pass |
| 384 | [pass] feature UI-074 UI need 필요 | pass |
| 385 | [pass] feature UI-074 test need 필요 | pass |
| 386 | [pass] feature UI-074 test area assigned | pass |
| 387 | [pass] feature UI-074 pass criteria present | pass |
| 388 | [pass] feature UI-075 name present | pass |
| 389 | [pass] feature UI-075 UI need 필요 | pass |
| 390 | [pass] feature UI-075 test need 필요 | pass |
| 391 | [pass] feature UI-075 test area assigned | pass |
| 392 | [pass] feature UI-075 pass criteria present | pass |
| 393 | [pass] feature UI-076 name present | pass |
| 394 | [pass] feature UI-076 UI need 필요 | pass |
| 395 | [pass] feature UI-076 test need 필요 | pass |
| 396 | [pass] feature UI-076 test area assigned | pass |
| 397 | [pass] feature UI-076 pass criteria present | pass |
| 398 | [pass] feature UI-077 name present | pass |
| 399 | [pass] feature UI-077 UI need 필요 | pass |
| 400 | [pass] feature UI-077 test need 필요 | pass |
| 401 | [pass] feature UI-077 test area assigned | pass |
| 402 | [pass] feature UI-077 pass criteria present | pass |
| 403 | [pass] feature UI-078 name present | pass |
| 404 | [pass] feature UI-078 UI need 필요 | pass |
| 405 | [pass] feature UI-078 test need 필요 | pass |
| 406 | [pass] feature UI-078 test area assigned | pass |
| 407 | [pass] feature UI-078 pass criteria present | pass |
| 408 | [pass] feature UI-079 name present | pass |
| 409 | [pass] feature UI-079 UI need 필요 | pass |
| 410 | [pass] feature UI-079 test need 필요 | pass |
| 411 | [pass] feature UI-079 test area assigned | pass |
| 412 | [pass] feature UI-079 pass criteria present | pass |
| 413 | [pass] feature UI-080 name present | pass |
| 414 | [pass] feature UI-080 UI need 필요 | pass |
| 415 | [pass] feature UI-080 test need 필요 | pass |
| 416 | [pass] feature UI-080 test area assigned | pass |
| 417 | [pass] feature UI-080 pass criteria present | pass |
| 418 | [pass] feature UI-081 name present | pass |
| 419 | [pass] feature UI-081 UI need 필요 | pass |
| 420 | [pass] feature UI-081 test need 필요 | pass |
| 421 | [pass] feature UI-081 test area assigned | pass |
| 422 | [pass] feature UI-081 pass criteria present | pass |
| 423 | [pass] feature UI-082 name present | pass |
| 424 | [pass] feature UI-082 UI need 필요 | pass |
| 425 | [pass] feature UI-082 test need 필요 | pass |
| 426 | [pass] feature UI-082 test area assigned | pass |
| 427 | [pass] feature UI-082 pass criteria present | pass |
| 428 | [pass] feature UI-083 name present | pass |
| 429 | [pass] feature UI-083 UI need 필요 | pass |
| 430 | [pass] feature UI-083 test need 필요 | pass |
| 431 | [pass] feature UI-083 test area assigned | pass |
| 432 | [pass] feature UI-083 pass criteria present | pass |
| 433 | [pass] feature UI-084 name present | pass |
| 434 | [pass] feature UI-084 UI need 필요 | pass |
| 435 | [pass] feature UI-084 test need 필요 | pass |
| 436 | [pass] feature UI-084 test area assigned | pass |
| 437 | [pass] feature UI-084 pass criteria present | pass |
| 438 | [pass] feature UI-085 name present | pass |
| 439 | [pass] feature UI-085 UI need 필요 | pass |
| 440 | [pass] feature UI-085 test need 필요 | pass |
| 441 | [pass] feature UI-085 test area assigned | pass |
| 442 | [pass] feature UI-085 pass criteria present | pass |
| 443 | [pass] feature UI-086 name present | pass |
| 444 | [pass] feature UI-086 UI need 필요 | pass |
| 445 | [pass] feature UI-086 test need 필요 | pass |
| 446 | [pass] feature UI-086 test area assigned | pass |
| 447 | [pass] feature UI-086 pass criteria present | pass |
| 448 | [pass] feature UI-087 name present | pass |
| 449 | [pass] feature UI-087 UI need 필요 | pass |
| 450 | [pass] feature UI-087 test need 필요 | pass |
| 451 | [pass] feature UI-087 test area assigned | pass |
| 452 | [pass] feature UI-087 pass criteria present | pass |
| 453 | [pass] feature UI-088 name present | pass |
| 454 | [pass] feature UI-088 UI need 필요 | pass |
| 455 | [pass] feature UI-088 test need 필요 | pass |
| 456 | [pass] feature UI-088 test area assigned | pass |
| 457 | [pass] feature UI-088 pass criteria present | pass |
| 458 | [pass] feature UI-089 name present | pass |
| 459 | [pass] feature UI-089 UI need 필요 | pass |
| 460 | [pass] feature UI-089 test need 필요 | pass |
| 461 | [pass] feature UI-089 test area assigned | pass |
| 462 | [pass] feature UI-089 pass criteria present | pass |
| 463 | [pass] feature UI-090 name present | pass |
| 464 | [pass] feature UI-090 UI need 필요 | pass |
| 465 | [pass] feature UI-090 test need 필요 | pass |
| 466 | [pass] feature UI-090 test area assigned | pass |
| 467 | [pass] feature UI-090 pass criteria present | pass |
| 468 | [pass] feature UI-091 name present | pass |
| 469 | [pass] feature UI-091 UI need 필요 | pass |
| 470 | [pass] feature UI-091 test need 필요 | pass |
| 471 | [pass] feature UI-091 test area assigned | pass |
| 472 | [pass] feature UI-091 pass criteria present | pass |
| 473 | [pass] feature UI-092 name present | pass |
| 474 | [pass] feature UI-092 UI need 필요 | pass |
| 475 | [pass] feature UI-092 test need 필요 | pass |
| 476 | [pass] feature UI-092 test area assigned | pass |
| 477 | [pass] feature UI-092 pass criteria present | pass |
| 478 | [pass] feature UI-093 name present | pass |
| 479 | [pass] feature UI-093 UI need 필요 | pass |
| 480 | [pass] feature UI-093 test need 필요 | pass |
| 481 | [pass] feature UI-093 test area assigned | pass |
| 482 | [pass] feature UI-093 pass criteria present | pass |
| 483 | [pass] feature UI-094 name present | pass |
| 484 | [pass] feature UI-094 UI need 필요 | pass |
| 485 | [pass] feature UI-094 test need 필요 | pass |
| 486 | [pass] feature UI-094 test area assigned | pass |
| 487 | [pass] feature UI-094 pass criteria present | pass |
| 488 | [pass] feature UI-095 name present | pass |
| 489 | [pass] feature UI-095 UI need 필요 | pass |
| 490 | [pass] feature UI-095 test need 필요 | pass |
| 491 | [pass] feature UI-095 test area assigned | pass |
| 492 | [pass] feature UI-095 pass criteria present | pass |
| 493 | [pass] feature UI-096 name present | pass |
| 494 | [pass] feature UI-096 UI need 필요 | pass |
| 495 | [pass] feature UI-096 test need 필요 | pass |
| 496 | [pass] feature UI-096 test area assigned | pass |
| 497 | [pass] feature UI-096 pass criteria present | pass |
| 498 | [pass] feature UI-097 name present | pass |
| 499 | [pass] feature UI-097 UI need 필요 | pass |
| 500 | [pass] feature UI-097 test need 필요 | pass |
| 501 | [pass] feature UI-097 test area assigned | pass |
| 502 | [pass] feature UI-097 pass criteria present | pass |
| 503 | [pass] feature UI-098 name present | pass |
| 504 | [pass] feature UI-098 UI need 필요 | pass |
| 505 | [pass] feature UI-098 test need 필요 | pass |
| 506 | [pass] feature UI-098 test area assigned | pass |
| 507 | [pass] feature UI-098 pass criteria present | pass |
| 508 | [pass] feature UI-099 name present | pass |
| 509 | [pass] feature UI-099 UI need 필요 | pass |
| 510 | [pass] feature UI-099 test need 필요 | pass |
| 511 | [pass] feature UI-099 test area assigned | pass |
| 512 | [pass] feature UI-099 pass criteria present | pass |
| 513 | [pass] feature UI-100 name present | pass |
| 514 | [pass] feature UI-100 UI need 필요 | pass |
| 515 | [pass] feature UI-100 test need 필요 | pass |
| 516 | [pass] feature UI-100 test area assigned | pass |
| 517 | [pass] feature UI-100 pass criteria present | pass |
| 518 | [pass] feature UI-101 name present | pass |
| 519 | [pass] feature UI-101 UI need 필요 | pass |
| 520 | [pass] feature UI-101 test need 필요 | pass |
| 521 | [pass] feature UI-101 test area assigned | pass |
| 522 | [pass] feature UI-101 pass criteria present | pass |
| 523 | [pass] feature UI-102 name present | pass |
| 524 | [pass] feature UI-102 UI need 필요 | pass |
| 525 | [pass] feature UI-102 test need 필요 | pass |
| 526 | [pass] feature UI-102 test area assigned | pass |
| 527 | [pass] feature UI-102 pass criteria present | pass |
| 528 | [pass] feature UI-103 name present | pass |
| 529 | [pass] feature UI-103 UI need 필요 | pass |
| 530 | [pass] feature UI-103 test need 필요 | pass |
| 531 | [pass] feature UI-103 test area assigned | pass |
| 532 | [pass] feature UI-103 pass criteria present | pass |
| 533 | [pass] feature UI-104 name present | pass |
| 534 | [pass] feature UI-104 UI need 필요 | pass |
| 535 | [pass] feature UI-104 test need 필요 | pass |
| 536 | [pass] feature UI-104 test area assigned | pass |
| 537 | [pass] feature UI-104 pass criteria present | pass |
| 538 | [pass] feature UI-105 name present | pass |
| 539 | [pass] feature UI-105 UI need 필요 | pass |
| 540 | [pass] feature UI-105 test need 필요 | pass |
| 541 | [pass] feature UI-105 test area assigned | pass |
| 542 | [pass] feature UI-105 pass criteria present | pass |
| 543 | [pass] feature UI-106 name present | pass |
| 544 | [pass] feature UI-106 UI need 필요 | pass |
| 545 | [pass] feature UI-106 test need 필요 | pass |
| 546 | [pass] feature UI-106 test area assigned | pass |
| 547 | [pass] feature UI-106 pass criteria present | pass |
| 548 | [pass] feature UI-107 name present | pass |
| 549 | [pass] feature UI-107 UI need 필요 | pass |
| 550 | [pass] feature UI-107 test need 필요 | pass |
| 551 | [pass] feature UI-107 test area assigned | pass |
| 552 | [pass] feature UI-107 pass criteria present | pass |
| 553 | [pass] feature UI-108 name present | pass |
| 554 | [pass] feature UI-108 UI need 필요 | pass |
| 555 | [pass] feature UI-108 test need 필요 | pass |
| 556 | [pass] feature UI-108 test area assigned | pass |
| 557 | [pass] feature UI-108 pass criteria present | pass |
| 558 | [pass] feature UI-109 name present | pass |
| 559 | [pass] feature UI-109 UI need 필요 | pass |
| 560 | [pass] feature UI-109 test need 필요 | pass |
| 561 | [pass] feature UI-109 test area assigned | pass |
| 562 | [pass] feature UI-109 pass criteria present | pass |
| 563 | [pass] feature UI-110 name present | pass |
| 564 | [pass] feature UI-110 UI need 필요 | pass |
| 565 | [pass] feature UI-110 test need 필요 | pass |
| 566 | [pass] feature UI-110 test area assigned | pass |
| 567 | [pass] feature UI-110 pass criteria present | pass |
| 568 | [pass] feature UI-111 name present | pass |
| 569 | [pass] feature UI-111 UI need 필요 | pass |
| 570 | [pass] feature UI-111 test need 필요 | pass |
| 571 | [pass] feature UI-111 test area assigned | pass |
| 572 | [pass] feature UI-111 pass criteria present | pass |
| 573 | [pass] feature UI-112 name present | pass |
| 574 | [pass] feature UI-112 UI need 필요 | pass |
| 575 | [pass] feature UI-112 test need 필요 | pass |
| 576 | [pass] feature UI-112 test area assigned | pass |
| 577 | [pass] feature UI-112 pass criteria present | pass |
| 578 | [pass] feature UI-113 name present | pass |
| 579 | [pass] feature UI-113 UI need 필요 | pass |
| 580 | [pass] feature UI-113 test need 필요 | pass |
| 581 | [pass] feature UI-113 test area assigned | pass |
| 582 | [pass] feature UI-113 pass criteria present | pass |
| 583 | [pass] feature UI-114 name present | pass |
| 584 | [pass] feature UI-114 UI need 필요 | pass |
| 585 | [pass] feature UI-114 test need 필요 | pass |
| 586 | [pass] feature UI-114 test area assigned | pass |
| 587 | [pass] feature UI-114 pass criteria present | pass |
| 588 | [pass] feature UI-115 name present | pass |
| 589 | [pass] feature UI-115 UI need 필요 | pass |
| 590 | [pass] feature UI-115 test need 필요 | pass |
| 591 | [pass] feature UI-115 test area assigned | pass |
| 592 | [pass] feature UI-115 pass criteria present | pass |
| 593 | [pass] feature AUTH-001 name present | pass |
| 594 | [pass] feature AUTH-001 UI need 간접 | pass |
| 595 | [pass] feature AUTH-001 test need 필요 | pass |
| 596 | [pass] feature AUTH-001 test area assigned | pass |
| 597 | [pass] feature AUTH-001 pass criteria present | pass |
| 598 | [pass] feature AUTH-002 name present | pass |
| 599 | [pass] feature AUTH-002 UI need 비대상 | pass |
| 600 | [pass] feature AUTH-002 test need 필요 | pass |
| 601 | [pass] feature AUTH-002 test area assigned | pass |
| 602 | [pass] feature AUTH-002 pass criteria present | pass |
| 603 | [pass] feature AUTH-003 name present | pass |
| 604 | [pass] feature AUTH-003 UI need 비대상 | pass |
| 605 | [pass] feature AUTH-003 test need 필요 | pass |
| 606 | [pass] feature AUTH-003 test area assigned | pass |
| 607 | [pass] feature AUTH-003 pass criteria present | pass |
| 608 | [pass] feature AUTH-004 name present | pass |
| 609 | [pass] feature AUTH-004 UI need 간접 | pass |
| 610 | [pass] feature AUTH-004 test need 필요 | pass |
| 611 | [pass] feature AUTH-004 test area assigned | pass |
| 612 | [pass] feature AUTH-004 pass criteria present | pass |
| 613 | [pass] feature AUTH-005 name present | pass |
| 614 | [pass] feature AUTH-005 UI need 필요 | pass |
| 615 | [pass] feature AUTH-005 test need 필요 | pass |
| 616 | [pass] feature AUTH-005 test area assigned | pass |
| 617 | [pass] feature AUTH-005 pass criteria present | pass |
| 618 | [pass] feature AUTH-006 name present | pass |
| 619 | [pass] feature AUTH-006 UI need 필요 | pass |
| 620 | [pass] feature AUTH-006 test need 필요 | pass |
| 621 | [pass] feature AUTH-006 test area assigned | pass |
| 622 | [pass] feature AUTH-006 pass criteria present | pass |
| 623 | [pass] feature AUTH-007 name present | pass |
| 624 | [pass] feature AUTH-007 UI need 필요 | pass |
| 625 | [pass] feature AUTH-007 test need 필요 | pass |
| 626 | [pass] feature AUTH-007 test area assigned | pass |
| 627 | [pass] feature AUTH-007 pass criteria present | pass |
| 628 | [pass] feature AUTH-008 name present | pass |
| 629 | [pass] feature AUTH-008 UI need 비대상 | pass |
| 630 | [pass] feature AUTH-008 test need 필요 | pass |
| 631 | [pass] feature AUTH-008 test area assigned | pass |
| 632 | [pass] feature AUTH-008 pass criteria present | pass |
| 633 | [pass] feature AUTH-009 name present | pass |
| 634 | [pass] feature AUTH-009 UI need 비대상 | pass |
| 635 | [pass] feature AUTH-009 test need 필요 | pass |
| 636 | [pass] feature AUTH-009 test area assigned | pass |
| 637 | [pass] feature AUTH-009 pass criteria present | pass |
| 638 | [pass] feature AUTH-010 name present | pass |
| 639 | [pass] feature AUTH-010 UI need 비대상 | pass |
| 640 | [pass] feature AUTH-010 test need 필요 | pass |
| 641 | [pass] feature AUTH-010 test area assigned | pass |
| 642 | [pass] feature AUTH-010 pass criteria present | pass |
| 643 | [pass] feature AUTH-011 name present | pass |
| 644 | [pass] feature AUTH-011 UI need 비대상 | pass |
| 645 | [pass] feature AUTH-011 test need 필요 | pass |
| 646 | [pass] feature AUTH-011 test area assigned | pass |
| 647 | [pass] feature AUTH-011 pass criteria present | pass |
| 648 | [pass] feature AUTH-012 name present | pass |
| 649 | [pass] feature AUTH-012 UI need 비대상 | pass |
| 650 | [pass] feature AUTH-012 test need 필요 | pass |
| 651 | [pass] feature AUTH-012 test area assigned | pass |
| 652 | [pass] feature AUTH-012 pass criteria present | pass |
| 653 | [pass] feature AUTH-013 name present | pass |
| 654 | [pass] feature AUTH-013 UI need 비대상 | pass |
| 655 | [pass] feature AUTH-013 test need 필요 | pass |
| 656 | [pass] feature AUTH-013 test area assigned | pass |
| 657 | [pass] feature AUTH-013 pass criteria present | pass |
| 658 | [pass] feature AUTH-014 name present | pass |
| 659 | [pass] feature AUTH-014 UI need 비대상 | pass |
| 660 | [pass] feature AUTH-014 test need 필요 | pass |
| 661 | [pass] feature AUTH-014 test area assigned | pass |
| 662 | [pass] feature AUTH-014 pass criteria present | pass |
| 663 | [pass] feature AUTH-015 name present | pass |
| 664 | [pass] feature AUTH-015 UI need 비대상 | pass |
| 665 | [pass] feature AUTH-015 test need 필요 | pass |
| 666 | [pass] feature AUTH-015 test area assigned | pass |
| 667 | [pass] feature AUTH-015 pass criteria present | pass |
| 668 | [pass] feature AUTH-016 name present | pass |
| 669 | [pass] feature AUTH-016 UI need 간접 | pass |
| 670 | [pass] feature AUTH-016 test need 필요 | pass |
| 671 | [pass] feature AUTH-016 test area assigned | pass |
| 672 | [pass] feature AUTH-016 pass criteria present | pass |
| 673 | [pass] feature AUTH-017 name present | pass |
| 674 | [pass] feature AUTH-017 UI need 간접 | pass |
| 675 | [pass] feature AUTH-017 test need 필요 | pass |
| 676 | [pass] feature AUTH-017 test area assigned | pass |
| 677 | [pass] feature AUTH-017 pass criteria present | pass |
| 678 | [pass] feature AUTH-018 name present | pass |
| 679 | [pass] feature AUTH-018 UI need 필요 | pass |
| 680 | [pass] feature AUTH-018 test need 필요 | pass |
| 681 | [pass] feature AUTH-018 test area assigned | pass |
| 682 | [pass] feature AUTH-018 pass criteria present | pass |
| 683 | [pass] feature AUTH-019 name present | pass |
| 684 | [pass] feature AUTH-019 UI need 필요 | pass |
| 685 | [pass] feature AUTH-019 test need 필요 | pass |
| 686 | [pass] feature AUTH-019 test area assigned | pass |
| 687 | [pass] feature AUTH-019 pass criteria present | pass |
| 688 | [pass] feature AUTH-020 name present | pass |
| 689 | [pass] feature AUTH-020 UI need 필요 | pass |
| 690 | [pass] feature AUTH-020 test need 필요 | pass |
| 691 | [pass] feature AUTH-020 test area assigned | pass |
| 692 | [pass] feature AUTH-020 pass criteria present | pass |
| 693 | [pass] feature AUTH-021 name present | pass |
| 694 | [pass] feature AUTH-021 UI need 필요 | pass |
| 695 | [pass] feature AUTH-021 test need 필요 | pass |
| 696 | [pass] feature AUTH-021 test area assigned | pass |
| 697 | [pass] feature AUTH-021 pass criteria present | pass |
| 698 | [pass] feature AUTH-022 name present | pass |
| 699 | [pass] feature AUTH-022 UI need 필요 | pass |
| 700 | [pass] feature AUTH-022 test need 필요 | pass |
| 701 | [pass] feature AUTH-022 test area assigned | pass |
| 702 | [pass] feature AUTH-022 pass criteria present | pass |
| 703 | [pass] feature AUTH-023 name present | pass |
| 704 | [pass] feature AUTH-023 UI need 필요 | pass |
| 705 | [pass] feature AUTH-023 test need 필요 | pass |
| 706 | [pass] feature AUTH-023 test area assigned | pass |
| 707 | [pass] feature AUTH-023 pass criteria present | pass |
| 708 | [pass] feature AUTH-024 name present | pass |
| 709 | [pass] feature AUTH-024 UI need 필요 | pass |
| 710 | [pass] feature AUTH-024 test need 필요 | pass |
| 711 | [pass] feature AUTH-024 test area assigned | pass |
| 712 | [pass] feature AUTH-024 pass criteria present | pass |
| 713 | [pass] feature AUTH-025 name present | pass |
| 714 | [pass] feature AUTH-025 UI need 필요 | pass |
| 715 | [pass] feature AUTH-025 test need 필요 | pass |
| 716 | [pass] feature AUTH-025 test area assigned | pass |
| 717 | [pass] feature AUTH-025 pass criteria present | pass |
| 718 | [pass] feature AUTH-026 name present | pass |
| 719 | [pass] feature AUTH-026 UI need 필요 | pass |
| 720 | [pass] feature AUTH-026 test need 필요 | pass |
| 721 | [pass] feature AUTH-026 test area assigned | pass |
| 722 | [pass] feature AUTH-026 pass criteria present | pass |
| 723 | [pass] feature AUTH-027 name present | pass |
| 724 | [pass] feature AUTH-027 UI need 필요 | pass |
| 725 | [pass] feature AUTH-027 test need 필요 | pass |
| 726 | [pass] feature AUTH-027 test area assigned | pass |
| 727 | [pass] feature AUTH-027 pass criteria present | pass |
| 728 | [pass] feature AUTH-028 name present | pass |
| 729 | [pass] feature AUTH-028 UI need 간접 | pass |
| 730 | [pass] feature AUTH-028 test need 필요 | pass |
| 731 | [pass] feature AUTH-028 test area assigned | pass |
| 732 | [pass] feature AUTH-028 pass criteria present | pass |
| 733 | [pass] feature AUTH-029 name present | pass |
| 734 | [pass] feature AUTH-029 UI need 간접 | pass |
| 735 | [pass] feature AUTH-029 test need 필요 | pass |
| 736 | [pass] feature AUTH-029 test area assigned | pass |
| 737 | [pass] feature AUTH-029 pass criteria present | pass |
| 738 | [pass] feature AUTH-030 name present | pass |
| 739 | [pass] feature AUTH-030 UI need 간접 | pass |
| 740 | [pass] feature AUTH-030 test need 필요 | pass |
| 741 | [pass] feature AUTH-030 test area assigned | pass |
| 742 | [pass] feature AUTH-030 pass criteria present | pass |
| 743 | [pass] feature AUTH-031 name present | pass |
| 744 | [pass] feature AUTH-031 UI need 비대상 | pass |
| 745 | [pass] feature AUTH-031 test need 필요 | pass |
| 746 | [pass] feature AUTH-031 test area assigned | pass |
| 747 | [pass] feature AUTH-031 pass criteria present | pass |
| 748 | [pass] feature AUTH-032 name present | pass |
| 749 | [pass] feature AUTH-032 UI need 비대상 | pass |
| 750 | [pass] feature AUTH-032 test need 필요 | pass |
| 751 | [pass] feature AUTH-032 test area assigned | pass |
| 752 | [pass] feature AUTH-032 pass criteria present | pass |
| 753 | [pass] feature AUTH-033 name present | pass |
| 754 | [pass] feature AUTH-033 UI need 필요 | pass |
| 755 | [pass] feature AUTH-033 test need 필요 | pass |
| 756 | [pass] feature AUTH-033 test area assigned | pass |
| 757 | [pass] feature AUTH-033 pass criteria present | pass |
| 758 | [pass] feature AUTH-034 name present | pass |
| 759 | [pass] feature AUTH-034 UI need 필요 | pass |
| 760 | [pass] feature AUTH-034 test need 필요 | pass |
| 761 | [pass] feature AUTH-034 test area assigned | pass |
| 762 | [pass] feature AUTH-034 pass criteria present | pass |
| 763 | [pass] feature AUTH-035 name present | pass |
| 764 | [pass] feature AUTH-035 UI need 간접 | pass |
| 765 | [pass] feature AUTH-035 test need 필요 | pass |
| 766 | [pass] feature AUTH-035 test area assigned | pass |
| 767 | [pass] feature AUTH-035 pass criteria present | pass |
| 768 | [pass] feature AUTH-036 name present | pass |
| 769 | [pass] feature AUTH-036 UI need 필요 | pass |
| 770 | [pass] feature AUTH-036 test need 필요 | pass |
| 771 | [pass] feature AUTH-036 test area assigned | pass |
| 772 | [pass] feature AUTH-036 pass criteria present | pass |
| 773 | [pass] feature AUTH-037 name present | pass |
| 774 | [pass] feature AUTH-037 UI need 필요 | pass |
| 775 | [pass] feature AUTH-037 test need 필요 | pass |
| 776 | [pass] feature AUTH-037 test area assigned | pass |
| 777 | [pass] feature AUTH-037 pass criteria present | pass |
| 778 | [pass] feature AUTH-038 name present | pass |
| 779 | [pass] feature AUTH-038 UI need 필요 | pass |
| 780 | [pass] feature AUTH-038 test need 필요 | pass |
| 781 | [pass] feature AUTH-038 test area assigned | pass |
| 782 | [pass] feature AUTH-038 pass criteria present | pass |
| 783 | [pass] feature AUTH-039 name present | pass |
| 784 | [pass] feature AUTH-039 UI need 간접 | pass |
| 785 | [pass] feature AUTH-039 test need 필요 | pass |
| 786 | [pass] feature AUTH-039 test area assigned | pass |
| 787 | [pass] feature AUTH-039 pass criteria present | pass |
| 788 | [pass] feature AUTH-040 name present | pass |
| 789 | [pass] feature AUTH-040 UI need 간접 | pass |
| 790 | [pass] feature AUTH-040 test need 필요 | pass |
| 791 | [pass] feature AUTH-040 test area assigned | pass |
| 792 | [pass] feature AUTH-040 pass criteria present | pass |
| 793 | [pass] feature AUTH-041 name present | pass |
| 794 | [pass] feature AUTH-041 UI need 비대상 | pass |
| 795 | [pass] feature AUTH-041 test need 필요 | pass |
| 796 | [pass] feature AUTH-041 test area assigned | pass |
| 797 | [pass] feature AUTH-041 pass criteria present | pass |
| 798 | [pass] feature AUTH-042 name present | pass |
| 799 | [pass] feature AUTH-042 UI need 비대상 | pass |
| 800 | [pass] feature AUTH-042 test need 필요 | pass |
| 801 | [pass] feature AUTH-042 test area assigned | pass |
| 802 | [pass] feature AUTH-042 pass criteria present | pass |
| 803 | [pass] feature SRC-001 name present | pass |
| 804 | [pass] feature SRC-001 UI need 필요 | pass |
| 805 | [pass] feature SRC-001 test need 필요 | pass |
| 806 | [pass] feature SRC-001 test area assigned | pass |
| 807 | [pass] feature SRC-001 pass criteria present | pass |
| 808 | [pass] feature SRC-002 name present | pass |
| 809 | [pass] feature SRC-002 UI need 필요 | pass |
| 810 | [pass] feature SRC-002 test need 필요 | pass |
| 811 | [pass] feature SRC-002 test area assigned | pass |
| 812 | [pass] feature SRC-002 pass criteria present | pass |
| 813 | [pass] feature SRC-003 name present | pass |
| 814 | [pass] feature SRC-003 UI need 필요 | pass |
| 815 | [pass] feature SRC-003 test need 필요 | pass |
| 816 | [pass] feature SRC-003 test area assigned | pass |
| 817 | [pass] feature SRC-003 pass criteria present | pass |
| 818 | [pass] feature SRC-004 name present | pass |
| 819 | [pass] feature SRC-004 UI need 필요 | pass |
| 820 | [pass] feature SRC-004 test need 필요 | pass |
| 821 | [pass] feature SRC-004 test area assigned | pass |
| 822 | [pass] feature SRC-004 pass criteria present | pass |
| 823 | [pass] feature SRC-005 name present | pass |
| 824 | [pass] feature SRC-005 UI need 필요 | pass |
| 825 | [pass] feature SRC-005 test need 필요 | pass |
| 826 | [pass] feature SRC-005 test area assigned | pass |
| 827 | [pass] feature SRC-005 pass criteria present | pass |
| 828 | [pass] feature SRC-006 name present | pass |
| 829 | [pass] feature SRC-006 UI need 필요 | pass |
| 830 | [pass] feature SRC-006 test need 필요 | pass |
| 831 | [pass] feature SRC-006 test area assigned | pass |
| 832 | [pass] feature SRC-006 pass criteria present | pass |
| 833 | [pass] feature SRC-007 name present | pass |
| 834 | [pass] feature SRC-007 UI need 필요 | pass |
| 835 | [pass] feature SRC-007 test need 필요 | pass |
| 836 | [pass] feature SRC-007 test area assigned | pass |
| 837 | [pass] feature SRC-007 pass criteria present | pass |
| 838 | [pass] feature SRC-008 name present | pass |
| 839 | [pass] feature SRC-008 UI need 필요 | pass |
| 840 | [pass] feature SRC-008 test need 필요 | pass |
| 841 | [pass] feature SRC-008 test area assigned | pass |
| 842 | [pass] feature SRC-008 pass criteria present | pass |
| 843 | [pass] feature SRC-009 name present | pass |
| 844 | [pass] feature SRC-009 UI need 필요 | pass |
| 845 | [pass] feature SRC-009 test need 필요 | pass |
| 846 | [pass] feature SRC-009 test area assigned | pass |
| 847 | [pass] feature SRC-009 pass criteria present | pass |
| 848 | [pass] feature SRC-010 name present | pass |
| 849 | [pass] feature SRC-010 UI need 필요 | pass |
| 850 | [pass] feature SRC-010 test need 필요 | pass |
| 851 | [pass] feature SRC-010 test area assigned | pass |
| 852 | [pass] feature SRC-010 pass criteria present | pass |
| 853 | [pass] feature SRC-011 name present | pass |
| 854 | [pass] feature SRC-011 UI need 필요 | pass |
| 855 | [pass] feature SRC-011 test need 필요 | pass |
| 856 | [pass] feature SRC-011 test area assigned | pass |
| 857 | [pass] feature SRC-011 pass criteria present | pass |
| 858 | [pass] feature SRC-012 name present | pass |
| 859 | [pass] feature SRC-012 UI need 필요 | pass |
| 860 | [pass] feature SRC-012 test need 필요 | pass |
| 861 | [pass] feature SRC-012 test area assigned | pass |
| 862 | [pass] feature SRC-012 pass criteria present | pass |
| 863 | [pass] feature SRC-013 name present | pass |
| 864 | [pass] feature SRC-013 UI need 간접 | pass |
| 865 | [pass] feature SRC-013 test need 필요 | pass |
| 866 | [pass] feature SRC-013 test area assigned | pass |
| 867 | [pass] feature SRC-013 pass criteria present | pass |
| 868 | [pass] feature SRC-014 name present | pass |
| 869 | [pass] feature SRC-014 UI need 필요 | pass |
| 870 | [pass] feature SRC-014 test need 필요 | pass |
| 871 | [pass] feature SRC-014 test area assigned | pass |
| 872 | [pass] feature SRC-014 pass criteria present | pass |
| 873 | [pass] feature SRC-015 name present | pass |
| 874 | [pass] feature SRC-015 UI need 비대상 | pass |
| 875 | [pass] feature SRC-015 test need 필요 | pass |
| 876 | [pass] feature SRC-015 test area assigned | pass |
| 877 | [pass] feature SRC-015 pass criteria present | pass |
| 878 | [pass] feature SRC-016 name present | pass |
| 879 | [pass] feature SRC-016 UI need 필요 | pass |
| 880 | [pass] feature SRC-016 test need 필요 | pass |
| 881 | [pass] feature SRC-016 test area assigned | pass |
| 882 | [pass] feature SRC-016 pass criteria present | pass |
| 883 | [pass] feature SRC-017 name present | pass |
| 884 | [pass] feature SRC-017 UI need 필요 | pass |
| 885 | [pass] feature SRC-017 test need 필요 | pass |
| 886 | [pass] feature SRC-017 test area assigned | pass |
| 887 | [pass] feature SRC-017 pass criteria present | pass |
| 888 | [pass] feature SRC-018 name present | pass |
| 889 | [pass] feature SRC-018 UI need 필요 | pass |
| 890 | [pass] feature SRC-018 test need 필요 | pass |
| 891 | [pass] feature SRC-018 test area assigned | pass |
| 892 | [pass] feature SRC-018 pass criteria present | pass |
| 893 | [pass] feature SRC-019 name present | pass |
| 894 | [pass] feature SRC-019 UI need 필요 | pass |
| 895 | [pass] feature SRC-019 test need 필요 | pass |
| 896 | [pass] feature SRC-019 test area assigned | pass |
| 897 | [pass] feature SRC-019 pass criteria present | pass |
| 898 | [pass] feature SRC-020 name present | pass |
| 899 | [pass] feature SRC-020 UI need 필요 | pass |
| 900 | [pass] feature SRC-020 test need 필요 | pass |
| 901 | [pass] feature SRC-020 test area assigned | pass |
| 902 | [pass] feature SRC-020 pass criteria present | pass |
| 903 | [pass] feature SRC-021 name present | pass |
| 904 | [pass] feature SRC-021 UI need 필요 | pass |
| 905 | [pass] feature SRC-021 test need 필요 | pass |
| 906 | [pass] feature SRC-021 test area assigned | pass |
| 907 | [pass] feature SRC-021 pass criteria present | pass |
| 908 | [pass] feature SRC-022 name present | pass |
| 909 | [pass] feature SRC-022 UI need 필요 | pass |
| 910 | [pass] feature SRC-022 test need 필요 | pass |
| 911 | [pass] feature SRC-022 test area assigned | pass |
| 912 | [pass] feature SRC-022 pass criteria present | pass |
| 913 | [pass] feature SRC-023 name present | pass |
| 914 | [pass] feature SRC-023 UI need 필요 | pass |
| 915 | [pass] feature SRC-023 test need 필요 | pass |
| 916 | [pass] feature SRC-023 test area assigned | pass |
| 917 | [pass] feature SRC-023 pass criteria present | pass |
| 918 | [pass] feature SRC-024 name present | pass |
| 919 | [pass] feature SRC-024 UI need 간접 | pass |
| 920 | [pass] feature SRC-024 test need 필요 | pass |
| 921 | [pass] feature SRC-024 test area assigned | pass |
| 922 | [pass] feature SRC-024 pass criteria present | pass |
| 923 | [pass] feature SRC-025 name present | pass |
| 924 | [pass] feature SRC-025 UI need 필요 | pass |
| 925 | [pass] feature SRC-025 test need 필요 | pass |
| 926 | [pass] feature SRC-025 test area assigned | pass |
| 927 | [pass] feature SRC-025 pass criteria present | pass |
| 928 | [pass] feature SRC-026 name present | pass |
| 929 | [pass] feature SRC-026 UI need 필요 | pass |
| 930 | [pass] feature SRC-026 test need 필요 | pass |
| 931 | [pass] feature SRC-026 test area assigned | pass |
| 932 | [pass] feature SRC-026 pass criteria present | pass |
| 933 | [pass] feature SRC-027 name present | pass |
| 934 | [pass] feature SRC-027 UI need 간접 | pass |
| 935 | [pass] feature SRC-027 test need 필요 | pass |
| 936 | [pass] feature SRC-027 test area assigned | pass |
| 937 | [pass] feature SRC-027 pass criteria present | pass |
| 938 | [pass] feature SRC-028 name present | pass |
| 939 | [pass] feature SRC-028 UI need 필요 | pass |
| 940 | [pass] feature SRC-028 test need 필요 | pass |
| 941 | [pass] feature SRC-028 test area assigned | pass |
| 942 | [pass] feature SRC-028 pass criteria present | pass |
| 943 | [pass] feature SRC-029 name present | pass |
| 944 | [pass] feature SRC-029 UI need 필요 | pass |
| 945 | [pass] feature SRC-029 test need 필요 | pass |
| 946 | [pass] feature SRC-029 test area assigned | pass |
| 947 | [pass] feature SRC-029 pass criteria present | pass |
| 948 | [pass] feature SRC-030 name present | pass |
| 949 | [pass] feature SRC-030 UI need 필요 | pass |
| 950 | [pass] feature SRC-030 test need 필요 | pass |
| 951 | [pass] feature SRC-030 test area assigned | pass |
| 952 | [pass] feature SRC-030 pass criteria present | pass |
| 953 | [pass] feature SRC-031 name present | pass |
| 954 | [pass] feature SRC-031 UI need 간접 | pass |
| 955 | [pass] feature SRC-031 test need 필요 | pass |
| 956 | [pass] feature SRC-031 test area assigned | pass |
| 957 | [pass] feature SRC-031 pass criteria present | pass |
| 958 | [pass] feature SRC-032 name present | pass |
| 959 | [pass] feature SRC-032 UI need 간접 | pass |
| 960 | [pass] feature SRC-032 test need 필요 | pass |
| 961 | [pass] feature SRC-032 test area assigned | pass |
| 962 | [pass] feature SRC-032 pass criteria present | pass |
| 963 | [pass] feature SRC-033 name present | pass |
| 964 | [pass] feature SRC-033 UI need 비대상 | pass |
| 965 | [pass] feature SRC-033 test need 필요 | pass |
| 966 | [pass] feature SRC-033 test area assigned | pass |
| 967 | [pass] feature SRC-033 pass criteria present | pass |
| 968 | [pass] feature SRC-034 name present | pass |
| 969 | [pass] feature SRC-034 UI need 필요 | pass |
| 970 | [pass] feature SRC-034 test need 필요 | pass |
| 971 | [pass] feature SRC-034 test area assigned | pass |
| 972 | [pass] feature SRC-034 pass criteria present | pass |
| 973 | [pass] feature SRC-035 name present | pass |
| 974 | [pass] feature SRC-035 UI need 필요 | pass |
| 975 | [pass] feature SRC-035 test need 필요 | pass |
| 976 | [pass] feature SRC-035 test area assigned | pass |
| 977 | [pass] feature SRC-035 pass criteria present | pass |
| 978 | [pass] feature SRC-036 name present | pass |
| 979 | [pass] feature SRC-036 UI need 필요 | pass |
| 980 | [pass] feature SRC-036 test need 필요 | pass |
| 981 | [pass] feature SRC-036 test area assigned | pass |
| 982 | [pass] feature SRC-036 pass criteria present | pass |
| 983 | [pass] feature SRC-037 name present | pass |
| 984 | [pass] feature SRC-037 UI need 필요 | pass |
| 985 | [pass] feature SRC-037 test need 필요 | pass |
| 986 | [pass] feature SRC-037 test area assigned | pass |
| 987 | [pass] feature SRC-037 pass criteria present | pass |
| 988 | [pass] feature SRC-038 name present | pass |
| 989 | [pass] feature SRC-038 UI need 필요 | pass |
| 990 | [pass] feature SRC-038 test need 필요 | pass |
| 991 | [pass] feature SRC-038 test area assigned | pass |
| 992 | [pass] feature SRC-038 pass criteria present | pass |
| 993 | [pass] feature SRC-039 name present | pass |
| 994 | [pass] feature SRC-039 UI need 필요 | pass |
| 995 | [pass] feature SRC-039 test need 필요 | pass |
| 996 | [pass] feature SRC-039 test area assigned | pass |
| 997 | [pass] feature SRC-039 pass criteria present | pass |
| 998 | [pass] feature SRC-040 name present | pass |
| 999 | [pass] feature SRC-040 UI need 필요 | pass |
| 1000 | [pass] feature SRC-040 test need 필요 | pass |
| 1001 | [pass] feature SRC-040 test area assigned | pass |
| 1002 | [pass] feature SRC-040 pass criteria present | pass |
| 1003 | [pass] feature SRC-041 name present | pass |
| 1004 | [pass] feature SRC-041 UI need 비대상 | pass |
| 1005 | [pass] feature SRC-041 test need 필요 | pass |
| 1006 | [pass] feature SRC-041 test area assigned | pass |
| 1007 | [pass] feature SRC-041 pass criteria present | pass |
| 1008 | [pass] feature SRC-042 name present | pass |
| 1009 | [pass] feature SRC-042 UI need 비대상 | pass |
| 1010 | [pass] feature SRC-042 test need 필요 | pass |
| 1011 | [pass] feature SRC-042 test area assigned | pass |
| 1012 | [pass] feature SRC-042 pass criteria present | pass |
| 1013 | [pass] feature SRC-043 name present | pass |
| 1014 | [pass] feature SRC-043 UI need 비대상 | pass |
| 1015 | [pass] feature SRC-043 test need 필요 | pass |
| 1016 | [pass] feature SRC-043 test area assigned | pass |
| 1017 | [pass] feature SRC-043 pass criteria present | pass |
| 1018 | [pass] feature SRC-044 name present | pass |
| 1019 | [pass] feature SRC-044 UI need 비대상 | pass |
| 1020 | [pass] feature SRC-044 test need 필요 | pass |
| 1021 | [pass] feature SRC-044 test area assigned | pass |
| 1022 | [pass] feature SRC-044 pass criteria present | pass |
| 1023 | [pass] feature SRC-045 name present | pass |
| 1024 | [pass] feature SRC-045 UI need 비대상 | pass |
| 1025 | [pass] feature SRC-045 test need 필요 | pass |
| 1026 | [pass] feature SRC-045 test area assigned | pass |
| 1027 | [pass] feature SRC-045 pass criteria present | pass |
| 1028 | [pass] feature SRC-046 name present | pass |
| 1029 | [pass] feature SRC-046 UI need 비대상 | pass |
| 1030 | [pass] feature SRC-046 test need 필요 | pass |
| 1031 | [pass] feature SRC-046 test area assigned | pass |
| 1032 | [pass] feature SRC-046 pass criteria present | pass |
| 1033 | [pass] feature SRC-047 name present | pass |
| 1034 | [pass] feature SRC-047 UI need 비대상 | pass |
| 1035 | [pass] feature SRC-047 test need 필요 | pass |
| 1036 | [pass] feature SRC-047 test area assigned | pass |
| 1037 | [pass] feature SRC-047 pass criteria present | pass |
| 1038 | [pass] feature SRC-048 name present | pass |
| 1039 | [pass] feature SRC-048 UI need 비대상 | pass |
| 1040 | [pass] feature SRC-048 test need 필요 | pass |
| 1041 | [pass] feature SRC-048 test area assigned | pass |
| 1042 | [pass] feature SRC-048 pass criteria present | pass |
| 1043 | [pass] feature SRC-049 name present | pass |
| 1044 | [pass] feature SRC-049 UI need 비대상 | pass |
| 1045 | [pass] feature SRC-049 test need 필요 | pass |
| 1046 | [pass] feature SRC-049 test area assigned | pass |
| 1047 | [pass] feature SRC-049 pass criteria present | pass |
| 1048 | [pass] feature SRC-050 name present | pass |
| 1049 | [pass] feature SRC-050 UI need 비대상 | pass |
| 1050 | [pass] feature SRC-050 test need 필요 | pass |
| 1051 | [pass] feature SRC-050 test area assigned | pass |
| 1052 | [pass] feature SRC-050 pass criteria present | pass |
| 1053 | [pass] feature SRC-051 name present | pass |
| 1054 | [pass] feature SRC-051 UI need 비대상 | pass |
| 1055 | [pass] feature SRC-051 test need 필요 | pass |
| 1056 | [pass] feature SRC-051 test area assigned | pass |
| 1057 | [pass] feature SRC-051 pass criteria present | pass |
| 1058 | [pass] feature SRC-052 name present | pass |
| 1059 | [pass] feature SRC-052 UI need 비대상 | pass |
| 1060 | [pass] feature SRC-052 test need 필요 | pass |
| 1061 | [pass] feature SRC-052 test area assigned | pass |
| 1062 | [pass] feature SRC-052 pass criteria present | pass |
| 1063 | [pass] feature SRC-053 name present | pass |
| 1064 | [pass] feature SRC-053 UI need 비대상 | pass |
| 1065 | [pass] feature SRC-053 test need 필요 | pass |
| 1066 | [pass] feature SRC-053 test area assigned | pass |
| 1067 | [pass] feature SRC-053 pass criteria present | pass |
| 1068 | [pass] feature SRC-054 name present | pass |
| 1069 | [pass] feature SRC-054 UI need 비대상 | pass |
| 1070 | [pass] feature SRC-054 test need 필요 | pass |
| 1071 | [pass] feature SRC-054 test area assigned | pass |
| 1072 | [pass] feature SRC-054 pass criteria present | pass |
| 1073 | [pass] feature SRC-055 name present | pass |
| 1074 | [pass] feature SRC-055 UI need 비대상 | pass |
| 1075 | [pass] feature SRC-055 test need 필요 | pass |
| 1076 | [pass] feature SRC-055 test area assigned | pass |
| 1077 | [pass] feature SRC-055 pass criteria present | pass |
| 1078 | [pass] feature SRC-056 name present | pass |
| 1079 | [pass] feature SRC-056 UI need 비대상 | pass |
| 1080 | [pass] feature SRC-056 test need 필요 | pass |
| 1081 | [pass] feature SRC-056 test area assigned | pass |
| 1082 | [pass] feature SRC-056 pass criteria present | pass |
| 1083 | [pass] feature SRC-057 name present | pass |
| 1084 | [pass] feature SRC-057 UI need 비대상 | pass |
| 1085 | [pass] feature SRC-057 test need 필요 | pass |
| 1086 | [pass] feature SRC-057 test area assigned | pass |
| 1087 | [pass] feature SRC-057 pass criteria present | pass |
| 1088 | [pass] feature SRC-058 name present | pass |
| 1089 | [pass] feature SRC-058 UI need 비대상 | pass |
| 1090 | [pass] feature SRC-058 test need 필요 | pass |
| 1091 | [pass] feature SRC-058 test area assigned | pass |
| 1092 | [pass] feature SRC-058 pass criteria present | pass |
| 1093 | [pass] feature SRC-059 name present | pass |
| 1094 | [pass] feature SRC-059 UI need 비대상 | pass |
| 1095 | [pass] feature SRC-059 test need 필요 | pass |
| 1096 | [pass] feature SRC-059 test area assigned | pass |
| 1097 | [pass] feature SRC-059 pass criteria present | pass |
| 1098 | [pass] feature SRC-060 name present | pass |
| 1099 | [pass] feature SRC-060 UI need 비대상 | pass |
| 1100 | [pass] feature SRC-060 test need 필요 | pass |
| 1101 | [pass] feature SRC-060 test area assigned | pass |
| 1102 | [pass] feature SRC-060 pass criteria present | pass |
| 1103 | [pass] feature SRC-061 name present | pass |
| 1104 | [pass] feature SRC-061 UI need 비대상 | pass |
| 1105 | [pass] feature SRC-061 test need 필요 | pass |
| 1106 | [pass] feature SRC-061 test area assigned | pass |
| 1107 | [pass] feature SRC-061 pass criteria present | pass |
| 1108 | [pass] feature SRC-062 name present | pass |
| 1109 | [pass] feature SRC-062 UI need 비대상 | pass |
| 1110 | [pass] feature SRC-062 test need 필요 | pass |
| 1111 | [pass] feature SRC-062 test area assigned | pass |
| 1112 | [pass] feature SRC-062 pass criteria present | pass |
| 1113 | [pass] feature SRC-063 name present | pass |
| 1114 | [pass] feature SRC-063 UI need 비대상 | pass |
| 1115 | [pass] feature SRC-063 test need 필요 | pass |
| 1116 | [pass] feature SRC-063 test area assigned | pass |
| 1117 | [pass] feature SRC-063 pass criteria present | pass |
| 1118 | [pass] feature SRC-064 name present | pass |
| 1119 | [pass] feature SRC-064 UI need 비대상 | pass |
| 1120 | [pass] feature SRC-064 test need 필요 | pass |
| 1121 | [pass] feature SRC-064 test area assigned | pass |
| 1122 | [pass] feature SRC-064 pass criteria present | pass |
| 1123 | [pass] feature SRC-065 name present | pass |
| 1124 | [pass] feature SRC-065 UI need 간접 | pass |
| 1125 | [pass] feature SRC-065 test need 필요 | pass |
| 1126 | [pass] feature SRC-065 test area assigned | pass |
| 1127 | [pass] feature SRC-065 pass criteria present | pass |
| 1128 | [pass] feature SRC-066 name present | pass |
| 1129 | [pass] feature SRC-066 UI need 간접 | pass |
| 1130 | [pass] feature SRC-066 test need 필요 | pass |
| 1131 | [pass] feature SRC-066 test area assigned | pass |
| 1132 | [pass] feature SRC-066 pass criteria present | pass |
| 1133 | [pass] feature SRC-067 name present | pass |
| 1134 | [pass] feature SRC-067 UI need 간접 | pass |
| 1135 | [pass] feature SRC-067 test need 필요 | pass |
| 1136 | [pass] feature SRC-067 test area assigned | pass |
| 1137 | [pass] feature SRC-067 pass criteria present | pass |
| 1138 | [pass] feature SRC-068 name present | pass |
| 1139 | [pass] feature SRC-068 UI need 간접 | pass |
| 1140 | [pass] feature SRC-068 test need 필요 | pass |
| 1141 | [pass] feature SRC-068 test area assigned | pass |
| 1142 | [pass] feature SRC-068 pass criteria present | pass |
| 1143 | [pass] feature RULE-001 name present | pass |
| 1144 | [pass] feature RULE-001 UI need 필요 | pass |
| 1145 | [pass] feature RULE-001 test need 필요 | pass |
| 1146 | [pass] feature RULE-001 test area assigned | pass |
| 1147 | [pass] feature RULE-001 pass criteria present | pass |
| 1148 | [pass] feature RULE-002 name present | pass |
| 1149 | [pass] feature RULE-002 UI need 필요 | pass |
| 1150 | [pass] feature RULE-002 test need 필요 | pass |
| 1151 | [pass] feature RULE-002 test area assigned | pass |
| 1152 | [pass] feature RULE-002 pass criteria present | pass |
| 1153 | [pass] feature RULE-003 name present | pass |
| 1154 | [pass] feature RULE-003 UI need 필요 | pass |
| 1155 | [pass] feature RULE-003 test need 필요 | pass |
| 1156 | [pass] feature RULE-003 test area assigned | pass |
| 1157 | [pass] feature RULE-003 pass criteria present | pass |
| 1158 | [pass] feature RULE-004 name present | pass |
| 1159 | [pass] feature RULE-004 UI need 필요 | pass |
| 1160 | [pass] feature RULE-004 test need 필요 | pass |
| 1161 | [pass] feature RULE-004 test area assigned | pass |
| 1162 | [pass] feature RULE-004 pass criteria present | pass |
| 1163 | [pass] feature RULE-005 name present | pass |
| 1164 | [pass] feature RULE-005 UI need 필요 | pass |
| 1165 | [pass] feature RULE-005 test need 필요 | pass |
| 1166 | [pass] feature RULE-005 test area assigned | pass |
| 1167 | [pass] feature RULE-005 pass criteria present | pass |
| 1168 | [pass] feature RULE-006 name present | pass |
| 1169 | [pass] feature RULE-006 UI need 필요 | pass |
| 1170 | [pass] feature RULE-006 test need 필요 | pass |
| 1171 | [pass] feature RULE-006 test area assigned | pass |
| 1172 | [pass] feature RULE-006 pass criteria present | pass |
| 1173 | [pass] feature RULE-007 name present | pass |
| 1174 | [pass] feature RULE-007 UI need 필요 | pass |
| 1175 | [pass] feature RULE-007 test need 필요 | pass |
| 1176 | [pass] feature RULE-007 test area assigned | pass |
| 1177 | [pass] feature RULE-007 pass criteria present | pass |
| 1178 | [pass] feature RULE-008 name present | pass |
| 1179 | [pass] feature RULE-008 UI need 필요 | pass |
| 1180 | [pass] feature RULE-008 test need 필요 | pass |
| 1181 | [pass] feature RULE-008 test area assigned | pass |
| 1182 | [pass] feature RULE-008 pass criteria present | pass |
| 1183 | [pass] feature RULE-009 name present | pass |
| 1184 | [pass] feature RULE-009 UI need 필요 | pass |
| 1185 | [pass] feature RULE-009 test need 필요 | pass |
| 1186 | [pass] feature RULE-009 test area assigned | pass |
| 1187 | [pass] feature RULE-009 pass criteria present | pass |
| 1188 | [pass] feature RULE-010 name present | pass |
| 1189 | [pass] feature RULE-010 UI need 필요 | pass |
| 1190 | [pass] feature RULE-010 test need 필요 | pass |
| 1191 | [pass] feature RULE-010 test area assigned | pass |
| 1192 | [pass] feature RULE-010 pass criteria present | pass |
| 1193 | [pass] feature RULE-011 name present | pass |
| 1194 | [pass] feature RULE-011 UI need 필요 | pass |
| 1195 | [pass] feature RULE-011 test need 필요 | pass |
| 1196 | [pass] feature RULE-011 test area assigned | pass |
| 1197 | [pass] feature RULE-011 pass criteria present | pass |
| 1198 | [pass] feature RULE-012 name present | pass |
| 1199 | [pass] feature RULE-012 UI need 필요 | pass |
| 1200 | [pass] feature RULE-012 test need 필요 | pass |
| 1201 | [pass] feature RULE-012 test area assigned | pass |
| 1202 | [pass] feature RULE-012 pass criteria present | pass |
| 1203 | [pass] feature RULE-013 name present | pass |
| 1204 | [pass] feature RULE-013 UI need 필요 | pass |
| 1205 | [pass] feature RULE-013 test need 필요 | pass |
| 1206 | [pass] feature RULE-013 test area assigned | pass |
| 1207 | [pass] feature RULE-013 pass criteria present | pass |
| 1208 | [pass] feature RULE-014 name present | pass |
| 1209 | [pass] feature RULE-014 UI need 필요 | pass |
| 1210 | [pass] feature RULE-014 test need 필요 | pass |
| 1211 | [pass] feature RULE-014 test area assigned | pass |
| 1212 | [pass] feature RULE-014 pass criteria present | pass |
| 1213 | [pass] feature RULE-015 name present | pass |
| 1214 | [pass] feature RULE-015 UI need 필요 | pass |
| 1215 | [pass] feature RULE-015 test need 필요 | pass |
| 1216 | [pass] feature RULE-015 test area assigned | pass |
| 1217 | [pass] feature RULE-015 pass criteria present | pass |
| 1218 | [pass] feature RULE-016 name present | pass |
| 1219 | [pass] feature RULE-016 UI need 필요 | pass |
| 1220 | [pass] feature RULE-016 test need 필요 | pass |
| 1221 | [pass] feature RULE-016 test area assigned | pass |
| 1222 | [pass] feature RULE-016 pass criteria present | pass |
| 1223 | [pass] feature RULE-017 name present | pass |
| 1224 | [pass] feature RULE-017 UI need 필요 | pass |
| 1225 | [pass] feature RULE-017 test need 필요 | pass |
| 1226 | [pass] feature RULE-017 test area assigned | pass |
| 1227 | [pass] feature RULE-017 pass criteria present | pass |
| 1228 | [pass] feature RULE-018 name present | pass |
| 1229 | [pass] feature RULE-018 UI need 필요 | pass |
| 1230 | [pass] feature RULE-018 test need 필요 | pass |
| 1231 | [pass] feature RULE-018 test area assigned | pass |
| 1232 | [pass] feature RULE-018 pass criteria present | pass |
| 1233 | [pass] feature RULE-019 name present | pass |
| 1234 | [pass] feature RULE-019 UI need 필요 | pass |
| 1235 | [pass] feature RULE-019 test need 필요 | pass |
| 1236 | [pass] feature RULE-019 test area assigned | pass |
| 1237 | [pass] feature RULE-019 pass criteria present | pass |
| 1238 | [pass] feature RULE-020 name present | pass |
| 1239 | [pass] feature RULE-020 UI need 필요 | pass |
| 1240 | [pass] feature RULE-020 test need 필요 | pass |
| 1241 | [pass] feature RULE-020 test area assigned | pass |
| 1242 | [pass] feature RULE-020 pass criteria present | pass |
| 1243 | [pass] feature RULE-021 name present | pass |
| 1244 | [pass] feature RULE-021 UI need 필요 | pass |
| 1245 | [pass] feature RULE-021 test need 필요 | pass |
| 1246 | [pass] feature RULE-021 test area assigned | pass |
| 1247 | [pass] feature RULE-021 pass criteria present | pass |
| 1248 | [pass] feature RULE-022 name present | pass |
| 1249 | [pass] feature RULE-022 UI need 필요 | pass |
| 1250 | [pass] feature RULE-022 test need 필요 | pass |
| 1251 | [pass] feature RULE-022 test area assigned | pass |
| 1252 | [pass] feature RULE-022 pass criteria present | pass |
| 1253 | [pass] feature RULE-023 name present | pass |
| 1254 | [pass] feature RULE-023 UI need 필요 | pass |
| 1255 | [pass] feature RULE-023 test need 필요 | pass |
| 1256 | [pass] feature RULE-023 test area assigned | pass |
| 1257 | [pass] feature RULE-023 pass criteria present | pass |
| 1258 | [pass] feature RULE-024 name present | pass |
| 1259 | [pass] feature RULE-024 UI need 필요 | pass |
| 1260 | [pass] feature RULE-024 test need 필요 | pass |
| 1261 | [pass] feature RULE-024 test area assigned | pass |
| 1262 | [pass] feature RULE-024 pass criteria present | pass |
| 1263 | [pass] feature RULE-025 name present | pass |
| 1264 | [pass] feature RULE-025 UI need 필요 | pass |
| 1265 | [pass] feature RULE-025 test need 필요 | pass |
| 1266 | [pass] feature RULE-025 test area assigned | pass |
| 1267 | [pass] feature RULE-025 pass criteria present | pass |
| 1268 | [pass] feature RULE-026 name present | pass |
| 1269 | [pass] feature RULE-026 UI need 필요 | pass |
| 1270 | [pass] feature RULE-026 test need 필요 | pass |
| 1271 | [pass] feature RULE-026 test area assigned | pass |
| 1272 | [pass] feature RULE-026 pass criteria present | pass |
| 1273 | [pass] feature RULE-027 name present | pass |
| 1274 | [pass] feature RULE-027 UI need 필요 | pass |
| 1275 | [pass] feature RULE-027 test need 필요 | pass |
| 1276 | [pass] feature RULE-027 test area assigned | pass |
| 1277 | [pass] feature RULE-027 pass criteria present | pass |
| 1278 | [pass] feature RULE-028 name present | pass |
| 1279 | [pass] feature RULE-028 UI need 필요 | pass |
| 1280 | [pass] feature RULE-028 test need 필요 | pass |
| 1281 | [pass] feature RULE-028 test area assigned | pass |
| 1282 | [pass] feature RULE-028 pass criteria present | pass |
| 1283 | [pass] feature RULE-029 name present | pass |
| 1284 | [pass] feature RULE-029 UI need 필요 | pass |
| 1285 | [pass] feature RULE-029 test need 필요 | pass |
| 1286 | [pass] feature RULE-029 test area assigned | pass |
| 1287 | [pass] feature RULE-029 pass criteria present | pass |
| 1288 | [pass] feature RULE-030 name present | pass |
| 1289 | [pass] feature RULE-030 UI need 필요 | pass |
| 1290 | [pass] feature RULE-030 test need 필요 | pass |
| 1291 | [pass] feature RULE-030 test area assigned | pass |
| 1292 | [pass] feature RULE-030 pass criteria present | pass |
| 1293 | [pass] feature RULE-031 name present | pass |
| 1294 | [pass] feature RULE-031 UI need 필요 | pass |
| 1295 | [pass] feature RULE-031 test need 필요 | pass |
| 1296 | [pass] feature RULE-031 test area assigned | pass |
| 1297 | [pass] feature RULE-031 pass criteria present | pass |
| 1298 | [pass] feature RULE-032 name present | pass |
| 1299 | [pass] feature RULE-032 UI need 필요 | pass |
| 1300 | [pass] feature RULE-032 test need 필요 | pass |
| 1301 | [pass] feature RULE-032 test area assigned | pass |
| 1302 | [pass] feature RULE-032 pass criteria present | pass |
| 1303 | [pass] feature RULE-033 name present | pass |
| 1304 | [pass] feature RULE-033 UI need 필요 | pass |
| 1305 | [pass] feature RULE-033 test need 필요 | pass |
| 1306 | [pass] feature RULE-033 test area assigned | pass |
| 1307 | [pass] feature RULE-033 pass criteria present | pass |
| 1308 | [pass] feature RULE-034 name present | pass |
| 1309 | [pass] feature RULE-034 UI need 필요 | pass |
| 1310 | [pass] feature RULE-034 test need 필요 | pass |
| 1311 | [pass] feature RULE-034 test area assigned | pass |
| 1312 | [pass] feature RULE-034 pass criteria present | pass |
| 1313 | [pass] feature RULE-035 name present | pass |
| 1314 | [pass] feature RULE-035 UI need 필요 | pass |
| 1315 | [pass] feature RULE-035 test need 필요 | pass |
| 1316 | [pass] feature RULE-035 test area assigned | pass |
| 1317 | [pass] feature RULE-035 pass criteria present | pass |
| 1318 | [pass] feature RULE-036 name present | pass |
| 1319 | [pass] feature RULE-036 UI need 필요 | pass |
| 1320 | [pass] feature RULE-036 test need 필요 | pass |
| 1321 | [pass] feature RULE-036 test area assigned | pass |
| 1322 | [pass] feature RULE-036 pass criteria present | pass |
| 1323 | [pass] feature RULE-037 name present | pass |
| 1324 | [pass] feature RULE-037 UI need 필요 | pass |
| 1325 | [pass] feature RULE-037 test need 필요 | pass |
| 1326 | [pass] feature RULE-037 test area assigned | pass |
| 1327 | [pass] feature RULE-037 pass criteria present | pass |
| 1328 | [pass] feature RULE-038 name present | pass |
| 1329 | [pass] feature RULE-038 UI need 필요 | pass |
| 1330 | [pass] feature RULE-038 test need 필요 | pass |
| 1331 | [pass] feature RULE-038 test area assigned | pass |
| 1332 | [pass] feature RULE-038 pass criteria present | pass |
| 1333 | [pass] feature RULE-039 name present | pass |
| 1334 | [pass] feature RULE-039 UI need 필요 | pass |
| 1335 | [pass] feature RULE-039 test need 필요 | pass |
| 1336 | [pass] feature RULE-039 test area assigned | pass |
| 1337 | [pass] feature RULE-039 pass criteria present | pass |
| 1338 | [pass] feature RULE-040 name present | pass |
| 1339 | [pass] feature RULE-040 UI need 필요 | pass |
| 1340 | [pass] feature RULE-040 test need 필요 | pass |
| 1341 | [pass] feature RULE-040 test area assigned | pass |
| 1342 | [pass] feature RULE-040 pass criteria present | pass |
| 1343 | [pass] feature RULE-041 name present | pass |
| 1344 | [pass] feature RULE-041 UI need 필요 | pass |
| 1345 | [pass] feature RULE-041 test need 필요 | pass |
| 1346 | [pass] feature RULE-041 test area assigned | pass |
| 1347 | [pass] feature RULE-041 pass criteria present | pass |
| 1348 | [pass] feature RULE-042 name present | pass |
| 1349 | [pass] feature RULE-042 UI need 필요 | pass |
| 1350 | [pass] feature RULE-042 test need 필요 | pass |
| 1351 | [pass] feature RULE-042 test area assigned | pass |
| 1352 | [pass] feature RULE-042 pass criteria present | pass |
| 1353 | [pass] feature RULE-043 name present | pass |
| 1354 | [pass] feature RULE-043 UI need 필요 | pass |
| 1355 | [pass] feature RULE-043 test need 필요 | pass |
| 1356 | [pass] feature RULE-043 test area assigned | pass |
| 1357 | [pass] feature RULE-043 pass criteria present | pass |
| 1358 | [pass] feature RULE-044 name present | pass |
| 1359 | [pass] feature RULE-044 UI need 필요 | pass |
| 1360 | [pass] feature RULE-044 test need 필요 | pass |
| 1361 | [pass] feature RULE-044 test area assigned | pass |
| 1362 | [pass] feature RULE-044 pass criteria present | pass |
| 1363 | [pass] feature RULE-045 name present | pass |
| 1364 | [pass] feature RULE-045 UI need 필요 | pass |
| 1365 | [pass] feature RULE-045 test need 필요 | pass |
| 1366 | [pass] feature RULE-045 test area assigned | pass |
| 1367 | [pass] feature RULE-045 pass criteria present | pass |
| 1368 | [pass] feature RULE-046 name present | pass |
| 1369 | [pass] feature RULE-046 UI need 필요 | pass |
| 1370 | [pass] feature RULE-046 test need 필요 | pass |
| 1371 | [pass] feature RULE-046 test area assigned | pass |
| 1372 | [pass] feature RULE-046 pass criteria present | pass |
| 1373 | [pass] feature RULE-047 name present | pass |
| 1374 | [pass] feature RULE-047 UI need 필요 | pass |
| 1375 | [pass] feature RULE-047 test need 필요 | pass |
| 1376 | [pass] feature RULE-047 test area assigned | pass |
| 1377 | [pass] feature RULE-047 pass criteria present | pass |
| 1378 | [pass] feature RULE-048 name present | pass |
| 1379 | [pass] feature RULE-048 UI need 필요 | pass |
| 1380 | [pass] feature RULE-048 test need 필요 | pass |
| 1381 | [pass] feature RULE-048 test area assigned | pass |
| 1382 | [pass] feature RULE-048 pass criteria present | pass |
| 1383 | [pass] feature RULE-049 name present | pass |
| 1384 | [pass] feature RULE-049 UI need 필요 | pass |
| 1385 | [pass] feature RULE-049 test need 필요 | pass |
| 1386 | [pass] feature RULE-049 test area assigned | pass |
| 1387 | [pass] feature RULE-049 pass criteria present | pass |
| 1388 | [pass] feature RULE-050 name present | pass |
| 1389 | [pass] feature RULE-050 UI need 필요 | pass |
| 1390 | [pass] feature RULE-050 test need 필요 | pass |
| 1391 | [pass] feature RULE-050 test area assigned | pass |
| 1392 | [pass] feature RULE-050 pass criteria present | pass |
| 1393 | [pass] feature RULE-051 name present | pass |
| 1394 | [pass] feature RULE-051 UI need 필요 | pass |
| 1395 | [pass] feature RULE-051 test need 필요 | pass |
| 1396 | [pass] feature RULE-051 test area assigned | pass |
| 1397 | [pass] feature RULE-051 pass criteria present | pass |
| 1398 | [pass] feature RULE-052 name present | pass |
| 1399 | [pass] feature RULE-052 UI need 필요 | pass |
| 1400 | [pass] feature RULE-052 test need 필요 | pass |
| 1401 | [pass] feature RULE-052 test area assigned | pass |
| 1402 | [pass] feature RULE-052 pass criteria present | pass |
| 1403 | [pass] feature RULE-053 name present | pass |
| 1404 | [pass] feature RULE-053 UI need 필요 | pass |
| 1405 | [pass] feature RULE-053 test need 필요 | pass |
| 1406 | [pass] feature RULE-053 test area assigned | pass |
| 1407 | [pass] feature RULE-053 pass criteria present | pass |
| 1408 | [pass] feature RULE-054 name present | pass |
| 1409 | [pass] feature RULE-054 UI need 필요 | pass |
| 1410 | [pass] feature RULE-054 test need 필요 | pass |
| 1411 | [pass] feature RULE-054 test area assigned | pass |
| 1412 | [pass] feature RULE-054 pass criteria present | pass |
| 1413 | [pass] feature RULE-055 name present | pass |
| 1414 | [pass] feature RULE-055 UI need 필요 | pass |
| 1415 | [pass] feature RULE-055 test need 필요 | pass |
| 1416 | [pass] feature RULE-055 test area assigned | pass |
| 1417 | [pass] feature RULE-055 pass criteria present | pass |
| 1418 | [pass] feature RULE-056 name present | pass |
| 1419 | [pass] feature RULE-056 UI need 필요 | pass |
| 1420 | [pass] feature RULE-056 test need 필요 | pass |
| 1421 | [pass] feature RULE-056 test area assigned | pass |
| 1422 | [pass] feature RULE-056 pass criteria present | pass |
| 1423 | [pass] feature RULE-057 name present | pass |
| 1424 | [pass] feature RULE-057 UI need 필요 | pass |
| 1425 | [pass] feature RULE-057 test need 필요 | pass |
| 1426 | [pass] feature RULE-057 test area assigned | pass |
| 1427 | [pass] feature RULE-057 pass criteria present | pass |
| 1428 | [pass] feature RULE-058 name present | pass |
| 1429 | [pass] feature RULE-058 UI need 필요 | pass |
| 1430 | [pass] feature RULE-058 test need 필요 | pass |
| 1431 | [pass] feature RULE-058 test area assigned | pass |
| 1432 | [pass] feature RULE-058 pass criteria present | pass |
| 1433 | [pass] feature RULE-059 name present | pass |
| 1434 | [pass] feature RULE-059 UI need 필요 | pass |
| 1435 | [pass] feature RULE-059 test need 필요 | pass |
| 1436 | [pass] feature RULE-059 test area assigned | pass |
| 1437 | [pass] feature RULE-059 pass criteria present | pass |
| 1438 | [pass] feature RULE-060 name present | pass |
| 1439 | [pass] feature RULE-060 UI need 필요 | pass |
| 1440 | [pass] feature RULE-060 test need 필요 | pass |
| 1441 | [pass] feature RULE-060 test area assigned | pass |
| 1442 | [pass] feature RULE-060 pass criteria present | pass |
| 1443 | [pass] feature RULE-061 name present | pass |
| 1444 | [pass] feature RULE-061 UI need 필요 | pass |
| 1445 | [pass] feature RULE-061 test need 필요 | pass |
| 1446 | [pass] feature RULE-061 test area assigned | pass |
| 1447 | [pass] feature RULE-061 pass criteria present | pass |
| 1448 | [pass] feature RULE-062 name present | pass |
| 1449 | [pass] feature RULE-062 UI need 필요 | pass |
| 1450 | [pass] feature RULE-062 test need 필요 | pass |
| 1451 | [pass] feature RULE-062 test area assigned | pass |
| 1452 | [pass] feature RULE-062 pass criteria present | pass |
| 1453 | [pass] feature RULE-063 name present | pass |
| 1454 | [pass] feature RULE-063 UI need 필요 | pass |
| 1455 | [pass] feature RULE-063 test need 필요 | pass |
| 1456 | [pass] feature RULE-063 test area assigned | pass |
| 1457 | [pass] feature RULE-063 pass criteria present | pass |
| 1458 | [pass] feature RULE-064 name present | pass |
| 1459 | [pass] feature RULE-064 UI need 필요 | pass |
| 1460 | [pass] feature RULE-064 test need 필요 | pass |
| 1461 | [pass] feature RULE-064 test area assigned | pass |
| 1462 | [pass] feature RULE-064 pass criteria present | pass |
| 1463 | [pass] feature RULE-065 name present | pass |
| 1464 | [pass] feature RULE-065 UI need 필요 | pass |
| 1465 | [pass] feature RULE-065 test need 필요 | pass |
| 1466 | [pass] feature RULE-065 test area assigned | pass |
| 1467 | [pass] feature RULE-065 pass criteria present | pass |
| 1468 | [pass] feature RULE-066 name present | pass |
| 1469 | [pass] feature RULE-066 UI need 필요 | pass |
| 1470 | [pass] feature RULE-066 test need 필요 | pass |
| 1471 | [pass] feature RULE-066 test area assigned | pass |
| 1472 | [pass] feature RULE-066 pass criteria present | pass |
| 1473 | [pass] feature RULE-067 name present | pass |
| 1474 | [pass] feature RULE-067 UI need 필요 | pass |
| 1475 | [pass] feature RULE-067 test need 필요 | pass |
| 1476 | [pass] feature RULE-067 test area assigned | pass |
| 1477 | [pass] feature RULE-067 pass criteria present | pass |
| 1478 | [pass] feature RULE-068 name present | pass |
| 1479 | [pass] feature RULE-068 UI need 필요 | pass |
| 1480 | [pass] feature RULE-068 test need 필요 | pass |
| 1481 | [pass] feature RULE-068 test area assigned | pass |
| 1482 | [pass] feature RULE-068 pass criteria present | pass |
| 1483 | [pass] feature RULE-069 name present | pass |
| 1484 | [pass] feature RULE-069 UI need 필요 | pass |
| 1485 | [pass] feature RULE-069 test need 필요 | pass |
| 1486 | [pass] feature RULE-069 test area assigned | pass |
| 1487 | [pass] feature RULE-069 pass criteria present | pass |
| 1488 | [pass] feature RULE-070 name present | pass |
| 1489 | [pass] feature RULE-070 UI need 필요 | pass |
| 1490 | [pass] feature RULE-070 test need 필요 | pass |
| 1491 | [pass] feature RULE-070 test area assigned | pass |
| 1492 | [pass] feature RULE-070 pass criteria present | pass |
| 1493 | [pass] feature RULE-071 name present | pass |
| 1494 | [pass] feature RULE-071 UI need 필요 | pass |
| 1495 | [pass] feature RULE-071 test need 필요 | pass |
| 1496 | [pass] feature RULE-071 test area assigned | pass |
| 1497 | [pass] feature RULE-071 pass criteria present | pass |
| 1498 | [pass] feature RULE-072 name present | pass |
| 1499 | [pass] feature RULE-072 UI need 필요 | pass |
| 1500 | [pass] feature RULE-072 test need 필요 | pass |
| 1501 | [pass] feature RULE-072 test area assigned | pass |
| 1502 | [pass] feature RULE-072 pass criteria present | pass |
| 1503 | [pass] feature RULE-073 name present | pass |
| 1504 | [pass] feature RULE-073 UI need 필요 | pass |
| 1505 | [pass] feature RULE-073 test need 필요 | pass |
| 1506 | [pass] feature RULE-073 test area assigned | pass |
| 1507 | [pass] feature RULE-073 pass criteria present | pass |
| 1508 | [pass] feature RULE-074 name present | pass |
| 1509 | [pass] feature RULE-074 UI need 필요 | pass |
| 1510 | [pass] feature RULE-074 test need 필요 | pass |
| 1511 | [pass] feature RULE-074 test area assigned | pass |
| 1512 | [pass] feature RULE-074 pass criteria present | pass |
| 1513 | [pass] feature RULE-075 name present | pass |
| 1514 | [pass] feature RULE-075 UI need 필요 | pass |
| 1515 | [pass] feature RULE-075 test need 필요 | pass |
| 1516 | [pass] feature RULE-075 test area assigned | pass |
| 1517 | [pass] feature RULE-075 pass criteria present | pass |
| 1518 | [pass] feature RULE-076 name present | pass |
| 1519 | [pass] feature RULE-076 UI need 필요 | pass |
| 1520 | [pass] feature RULE-076 test need 필요 | pass |
| 1521 | [pass] feature RULE-076 test area assigned | pass |
| 1522 | [pass] feature RULE-076 pass criteria present | pass |
| 1523 | [pass] feature RULE-077 name present | pass |
| 1524 | [pass] feature RULE-077 UI need 필요 | pass |
| 1525 | [pass] feature RULE-077 test need 필요 | pass |
| 1526 | [pass] feature RULE-077 test area assigned | pass |
| 1527 | [pass] feature RULE-077 pass criteria present | pass |
| 1528 | [pass] feature RULE-078 name present | pass |
| 1529 | [pass] feature RULE-078 UI need 필요 | pass |
| 1530 | [pass] feature RULE-078 test need 필요 | pass |
| 1531 | [pass] feature RULE-078 test area assigned | pass |
| 1532 | [pass] feature RULE-078 pass criteria present | pass |
| 1533 | [pass] feature RULE-079 name present | pass |
| 1534 | [pass] feature RULE-079 UI need 필요 | pass |
| 1535 | [pass] feature RULE-079 test need 필요 | pass |
| 1536 | [pass] feature RULE-079 test area assigned | pass |
| 1537 | [pass] feature RULE-079 pass criteria present | pass |
| 1538 | [pass] feature RULE-080 name present | pass |
| 1539 | [pass] feature RULE-080 UI need 필요 | pass |
| 1540 | [pass] feature RULE-080 test need 필요 | pass |
| 1541 | [pass] feature RULE-080 test area assigned | pass |
| 1542 | [pass] feature RULE-080 pass criteria present | pass |
| 1543 | [pass] feature RULE-081 name present | pass |
| 1544 | [pass] feature RULE-081 UI need 필요 | pass |
| 1545 | [pass] feature RULE-081 test need 필요 | pass |
| 1546 | [pass] feature RULE-081 test area assigned | pass |
| 1547 | [pass] feature RULE-081 pass criteria present | pass |
| 1548 | [pass] feature RULE-082 name present | pass |
| 1549 | [pass] feature RULE-082 UI need 필요 | pass |
| 1550 | [pass] feature RULE-082 test need 필요 | pass |
| 1551 | [pass] feature RULE-082 test area assigned | pass |
| 1552 | [pass] feature RULE-082 pass criteria present | pass |
| 1553 | [pass] feature RULE-083 name present | pass |
| 1554 | [pass] feature RULE-083 UI need 필요 | pass |
| 1555 | [pass] feature RULE-083 test need 필요 | pass |
| 1556 | [pass] feature RULE-083 test area assigned | pass |
| 1557 | [pass] feature RULE-083 pass criteria present | pass |
| 1558 | [pass] feature RULE-084 name present | pass |
| 1559 | [pass] feature RULE-084 UI need 필요 | pass |
| 1560 | [pass] feature RULE-084 test need 필요 | pass |
| 1561 | [pass] feature RULE-084 test area assigned | pass |
| 1562 | [pass] feature RULE-084 pass criteria present | pass |
| 1563 | [pass] feature RULE-085 name present | pass |
| 1564 | [pass] feature RULE-085 UI need 필요 | pass |
| 1565 | [pass] feature RULE-085 test need 필요 | pass |
| 1566 | [pass] feature RULE-085 test area assigned | pass |
| 1567 | [pass] feature RULE-085 pass criteria present | pass |
| 1568 | [pass] feature RULE-086 name present | pass |
| 1569 | [pass] feature RULE-086 UI need 필요 | pass |
| 1570 | [pass] feature RULE-086 test need 필요 | pass |
| 1571 | [pass] feature RULE-086 test area assigned | pass |
| 1572 | [pass] feature RULE-086 pass criteria present | pass |
| 1573 | [pass] feature RULE-087 name present | pass |
| 1574 | [pass] feature RULE-087 UI need 필요 | pass |
| 1575 | [pass] feature RULE-087 test need 필요 | pass |
| 1576 | [pass] feature RULE-087 test area assigned | pass |
| 1577 | [pass] feature RULE-087 pass criteria present | pass |
| 1578 | [pass] feature RULE-088 name present | pass |
| 1579 | [pass] feature RULE-088 UI need 필요 | pass |
| 1580 | [pass] feature RULE-088 test need 필요 | pass |
| 1581 | [pass] feature RULE-088 test area assigned | pass |
| 1582 | [pass] feature RULE-088 pass criteria present | pass |
| 1583 | [pass] feature RULE-089 name present | pass |
| 1584 | [pass] feature RULE-089 UI need 필요 | pass |
| 1585 | [pass] feature RULE-089 test need 필요 | pass |
| 1586 | [pass] feature RULE-089 test area assigned | pass |
| 1587 | [pass] feature RULE-089 pass criteria present | pass |
| 1588 | [pass] feature RULE-090 name present | pass |
| 1589 | [pass] feature RULE-090 UI need 필요 | pass |
| 1590 | [pass] feature RULE-090 test need 필요 | pass |
| 1591 | [pass] feature RULE-090 test area assigned | pass |
| 1592 | [pass] feature RULE-090 pass criteria present | pass |
| 1593 | [pass] feature RULE-091 name present | pass |
| 1594 | [pass] feature RULE-091 UI need 필요 | pass |
| 1595 | [pass] feature RULE-091 test need 필요 | pass |
| 1596 | [pass] feature RULE-091 test area assigned | pass |
| 1597 | [pass] feature RULE-091 pass criteria present | pass |
| 1598 | [pass] feature RULE-092 name present | pass |
| 1599 | [pass] feature RULE-092 UI need 필요 | pass |
| 1600 | [pass] feature RULE-092 test need 필요 | pass |
| 1601 | [pass] feature RULE-092 test area assigned | pass |
| 1602 | [pass] feature RULE-092 pass criteria present | pass |
| 1603 | [pass] feature RULE-093 name present | pass |
| 1604 | [pass] feature RULE-093 UI need 필요 | pass |
| 1605 | [pass] feature RULE-093 test need 필요 | pass |
| 1606 | [pass] feature RULE-093 test area assigned | pass |
| 1607 | [pass] feature RULE-093 pass criteria present | pass |
| 1608 | [pass] feature RULE-094 name present | pass |
| 1609 | [pass] feature RULE-094 UI need 필요 | pass |
| 1610 | [pass] feature RULE-094 test need 필요 | pass |
| 1611 | [pass] feature RULE-094 test area assigned | pass |
| 1612 | [pass] feature RULE-094 pass criteria present | pass |
| 1613 | [pass] feature RULE-095 name present | pass |
| 1614 | [pass] feature RULE-095 UI need 필요 | pass |
| 1615 | [pass] feature RULE-095 test need 필요 | pass |
| 1616 | [pass] feature RULE-095 test area assigned | pass |
| 1617 | [pass] feature RULE-095 pass criteria present | pass |
| 1618 | [pass] feature RULE-096 name present | pass |
| 1619 | [pass] feature RULE-096 UI need 필요 | pass |
| 1620 | [pass] feature RULE-096 test need 필요 | pass |
| 1621 | [pass] feature RULE-096 test area assigned | pass |
| 1622 | [pass] feature RULE-096 pass criteria present | pass |
| 1623 | [pass] feature RULE-097 name present | pass |
| 1624 | [pass] feature RULE-097 UI need 필요 | pass |
| 1625 | [pass] feature RULE-097 test need 필요 | pass |
| 1626 | [pass] feature RULE-097 test area assigned | pass |
| 1627 | [pass] feature RULE-097 pass criteria present | pass |
| 1628 | [pass] feature RULE-098 name present | pass |
| 1629 | [pass] feature RULE-098 UI need 필요 | pass |
| 1630 | [pass] feature RULE-098 test need 필요 | pass |
| 1631 | [pass] feature RULE-098 test area assigned | pass |
| 1632 | [pass] feature RULE-098 pass criteria present | pass |
| 1633 | [pass] feature RULE-099 name present | pass |
| 1634 | [pass] feature RULE-099 UI need 간접 | pass |
| 1635 | [pass] feature RULE-099 test need 필요 | pass |
| 1636 | [pass] feature RULE-099 test area assigned | pass |
| 1637 | [pass] feature RULE-099 pass criteria present | pass |
| 1638 | [pass] feature RULE-100 name present | pass |
| 1639 | [pass] feature RULE-100 UI need 필요 | pass |
| 1640 | [pass] feature RULE-100 test need 필요 | pass |
| 1641 | [pass] feature RULE-100 test area assigned | pass |
| 1642 | [pass] feature RULE-100 pass criteria present | pass |
| 1643 | [pass] feature RULE-101 name present | pass |
| 1644 | [pass] feature RULE-101 UI need 필요 | pass |
| 1645 | [pass] feature RULE-101 test need 필요 | pass |
| 1646 | [pass] feature RULE-101 test area assigned | pass |
| 1647 | [pass] feature RULE-101 pass criteria present | pass |
| 1648 | [pass] feature RULE-102 name present | pass |
| 1649 | [pass] feature RULE-102 UI need 필요 | pass |
| 1650 | [pass] feature RULE-102 test need 필요 | pass |
| 1651 | [pass] feature RULE-102 test area assigned | pass |
| 1652 | [pass] feature RULE-102 pass criteria present | pass |
| 1653 | [pass] feature RULE-103 name present | pass |
| 1654 | [pass] feature RULE-103 UI need 필요 | pass |
| 1655 | [pass] feature RULE-103 test need 필요 | pass |
| 1656 | [pass] feature RULE-103 test area assigned | pass |
| 1657 | [pass] feature RULE-103 pass criteria present | pass |
| 1658 | [pass] feature RULE-104 name present | pass |
| 1659 | [pass] feature RULE-104 UI need 필요 | pass |
| 1660 | [pass] feature RULE-104 test need 필요 | pass |
| 1661 | [pass] feature RULE-104 test area assigned | pass |
| 1662 | [pass] feature RULE-104 pass criteria present | pass |
| 1663 | [pass] feature RULE-105 name present | pass |
| 1664 | [pass] feature RULE-105 UI need 비대상 | pass |
| 1665 | [pass] feature RULE-105 test need 필요 | pass |
| 1666 | [pass] feature RULE-105 test area assigned | pass |
| 1667 | [pass] feature RULE-105 pass criteria present | pass |
| 1668 | [pass] feature RULE-106 name present | pass |
| 1669 | [pass] feature RULE-106 UI need 비대상 | pass |
| 1670 | [pass] feature RULE-106 test need 필요 | pass |
| 1671 | [pass] feature RULE-106 test area assigned | pass |
| 1672 | [pass] feature RULE-106 pass criteria present | pass |
| 1673 | [pass] feature RULE-107 name present | pass |
| 1674 | [pass] feature RULE-107 UI need 비대상 | pass |
| 1675 | [pass] feature RULE-107 test need 필요 | pass |
| 1676 | [pass] feature RULE-107 test area assigned | pass |
| 1677 | [pass] feature RULE-107 pass criteria present | pass |
| 1678 | [pass] feature RULE-108 name present | pass |
| 1679 | [pass] feature RULE-108 UI need 비대상 | pass |
| 1680 | [pass] feature RULE-108 test need 필요 | pass |
| 1681 | [pass] feature RULE-108 test area assigned | pass |
| 1682 | [pass] feature RULE-108 pass criteria present | pass |
| 1683 | [pass] feature RULE-109 name present | pass |
| 1684 | [pass] feature RULE-109 UI need 비대상 | pass |
| 1685 | [pass] feature RULE-109 test need 필요 | pass |
| 1686 | [pass] feature RULE-109 test area assigned | pass |
| 1687 | [pass] feature RULE-109 pass criteria present | pass |
| 1688 | [pass] feature RULE-110 name present | pass |
| 1689 | [pass] feature RULE-110 UI need 비대상 | pass |
| 1690 | [pass] feature RULE-110 test need 필요 | pass |
| 1691 | [pass] feature RULE-110 test area assigned | pass |
| 1692 | [pass] feature RULE-110 pass criteria present | pass |
| 1693 | [pass] feature RULE-111 name present | pass |
| 1694 | [pass] feature RULE-111 UI need 필요 | pass |
| 1695 | [pass] feature RULE-111 test need 필요 | pass |
| 1696 | [pass] feature RULE-111 test area assigned | pass |
| 1697 | [pass] feature RULE-111 pass criteria present | pass |
| 1698 | [pass] feature RULE-112 name present | pass |
| 1699 | [pass] feature RULE-112 UI need 간접 | pass |
| 1700 | [pass] feature RULE-112 test need 필요 | pass |
| 1701 | [pass] feature RULE-112 test area assigned | pass |
| 1702 | [pass] feature RULE-112 pass criteria present | pass |
| 1703 | [pass] feature EVT-001 name present | pass |
| 1704 | [pass] feature EVT-001 UI need 필요 | pass |
| 1705 | [pass] feature EVT-001 test need 필요 | pass |
| 1706 | [pass] feature EVT-001 test area assigned | pass |
| 1707 | [pass] feature EVT-001 pass criteria present | pass |
| 1708 | [pass] feature EVT-002 name present | pass |
| 1709 | [pass] feature EVT-002 UI need 비대상 | pass |
| 1710 | [pass] feature EVT-002 test need 필요 | pass |
| 1711 | [pass] feature EVT-002 test area assigned | pass |
| 1712 | [pass] feature EVT-002 pass criteria present | pass |
| 1713 | [pass] feature EVT-003 name present | pass |
| 1714 | [pass] feature EVT-003 UI need 필요 | pass |
| 1715 | [pass] feature EVT-003 test need 필요 | pass |
| 1716 | [pass] feature EVT-003 test area assigned | pass |
| 1717 | [pass] feature EVT-003 pass criteria present | pass |
| 1718 | [pass] feature EVT-004 name present | pass |
| 1719 | [pass] feature EVT-004 UI need 필요 | pass |
| 1720 | [pass] feature EVT-004 test need 필요 | pass |
| 1721 | [pass] feature EVT-004 test area assigned | pass |
| 1722 | [pass] feature EVT-004 pass criteria present | pass |
| 1723 | [pass] feature EVT-005 name present | pass |
| 1724 | [pass] feature EVT-005 UI need 간접 | pass |
| 1725 | [pass] feature EVT-005 test need 필요 | pass |
| 1726 | [pass] feature EVT-005 test area assigned | pass |
| 1727 | [pass] feature EVT-005 pass criteria present | pass |
| 1728 | [pass] feature EVT-006 name present | pass |
| 1729 | [pass] feature EVT-006 UI need 간접 | pass |
| 1730 | [pass] feature EVT-006 test need 필요 | pass |
| 1731 | [pass] feature EVT-006 test area assigned | pass |
| 1732 | [pass] feature EVT-006 pass criteria present | pass |
| 1733 | [pass] feature EVT-007 name present | pass |
| 1734 | [pass] feature EVT-007 UI need 필요 | pass |
| 1735 | [pass] feature EVT-007 test need 필요 | pass |
| 1736 | [pass] feature EVT-007 test area assigned | pass |
| 1737 | [pass] feature EVT-007 pass criteria present | pass |
| 1738 | [pass] feature EVT-008 name present | pass |
| 1739 | [pass] feature EVT-008 UI need 비대상 | pass |
| 1740 | [pass] feature EVT-008 test need 필요 | pass |
| 1741 | [pass] feature EVT-008 test area assigned | pass |
| 1742 | [pass] feature EVT-008 pass criteria present | pass |
| 1743 | [pass] feature EVT-009 name present | pass |
| 1744 | [pass] feature EVT-009 UI need 비대상 | pass |
| 1745 | [pass] feature EVT-009 test need 필요 | pass |
| 1746 | [pass] feature EVT-009 test area assigned | pass |
| 1747 | [pass] feature EVT-009 pass criteria present | pass |
| 1748 | [pass] feature EVT-010 name present | pass |
| 1749 | [pass] feature EVT-010 UI need 비대상 | pass |
| 1750 | [pass] feature EVT-010 test need 필요 | pass |
| 1751 | [pass] feature EVT-010 test area assigned | pass |
| 1752 | [pass] feature EVT-010 pass criteria present | pass |
| 1753 | [pass] feature EVT-011 name present | pass |
| 1754 | [pass] feature EVT-011 UI need 비대상 | pass |
| 1755 | [pass] feature EVT-011 test need 필요 | pass |
| 1756 | [pass] feature EVT-011 test area assigned | pass |
| 1757 | [pass] feature EVT-011 pass criteria present | pass |
| 1758 | [pass] feature EVT-012 name present | pass |
| 1759 | [pass] feature EVT-012 UI need 비대상 | pass |
| 1760 | [pass] feature EVT-012 test need 필요 | pass |
| 1761 | [pass] feature EVT-012 test area assigned | pass |
| 1762 | [pass] feature EVT-012 pass criteria present | pass |
| 1763 | [pass] feature EVT-013 name present | pass |
| 1764 | [pass] feature EVT-013 UI need 비대상 | pass |
| 1765 | [pass] feature EVT-013 test need 필요 | pass |
| 1766 | [pass] feature EVT-013 test area assigned | pass |
| 1767 | [pass] feature EVT-013 pass criteria present | pass |
| 1768 | [pass] feature EVT-014 name present | pass |
| 1769 | [pass] feature EVT-014 UI need 간접 | pass |
| 1770 | [pass] feature EVT-014 test need 필요 | pass |
| 1771 | [pass] feature EVT-014 test area assigned | pass |
| 1772 | [pass] feature EVT-014 pass criteria present | pass |
| 1773 | [pass] feature EVT-015 name present | pass |
| 1774 | [pass] feature EVT-015 UI need 비대상 | pass |
| 1775 | [pass] feature EVT-015 test need 필요 | pass |
| 1776 | [pass] feature EVT-015 test area assigned | pass |
| 1777 | [pass] feature EVT-015 pass criteria present | pass |
| 1778 | [pass] feature EVT-016 name present | pass |
| 1779 | [pass] feature EVT-016 UI need 필요 | pass |
| 1780 | [pass] feature EVT-016 test need 필요 | pass |
| 1781 | [pass] feature EVT-016 test area assigned | pass |
| 1782 | [pass] feature EVT-016 pass criteria present | pass |
| 1783 | [pass] feature EVT-017 name present | pass |
| 1784 | [pass] feature EVT-017 UI need 필요 | pass |
| 1785 | [pass] feature EVT-017 test need 필요 | pass |
| 1786 | [pass] feature EVT-017 test area assigned | pass |
| 1787 | [pass] feature EVT-017 pass criteria present | pass |
| 1788 | [pass] feature EVT-018 name present | pass |
| 1789 | [pass] feature EVT-018 UI need 필요 | pass |
| 1790 | [pass] feature EVT-018 test need 필요 | pass |
| 1791 | [pass] feature EVT-018 test area assigned | pass |
| 1792 | [pass] feature EVT-018 pass criteria present | pass |
| 1793 | [pass] feature EVT-019 name present | pass |
| 1794 | [pass] feature EVT-019 UI need 필요 | pass |
| 1795 | [pass] feature EVT-019 test need 필요 | pass |
| 1796 | [pass] feature EVT-019 test area assigned | pass |
| 1797 | [pass] feature EVT-019 pass criteria present | pass |
| 1798 | [pass] feature EVT-020 name present | pass |
| 1799 | [pass] feature EVT-020 UI need 필요 | pass |
| 1800 | [pass] feature EVT-020 test need 필요 | pass |
| 1801 | [pass] feature EVT-020 test area assigned | pass |
| 1802 | [pass] feature EVT-020 pass criteria present | pass |
| 1803 | [pass] feature EVT-021 name present | pass |
| 1804 | [pass] feature EVT-021 UI need 필요 | pass |
| 1805 | [pass] feature EVT-021 test need 필요 | pass |
| 1806 | [pass] feature EVT-021 test area assigned | pass |
| 1807 | [pass] feature EVT-021 pass criteria present | pass |
| 1808 | [pass] feature EVT-022 name present | pass |
| 1809 | [pass] feature EVT-022 UI need 필요 | pass |
| 1810 | [pass] feature EVT-022 test need 필요 | pass |
| 1811 | [pass] feature EVT-022 test area assigned | pass |
| 1812 | [pass] feature EVT-022 pass criteria present | pass |
| 1813 | [pass] feature EVT-023 name present | pass |
| 1814 | [pass] feature EVT-023 UI need 필요 | pass |
| 1815 | [pass] feature EVT-023 test need 필요 | pass |
| 1816 | [pass] feature EVT-023 test area assigned | pass |
| 1817 | [pass] feature EVT-023 pass criteria present | pass |
| 1818 | [pass] feature EVT-024 name present | pass |
| 1819 | [pass] feature EVT-024 UI need 필요 | pass |
| 1820 | [pass] feature EVT-024 test need 필요 | pass |
| 1821 | [pass] feature EVT-024 test area assigned | pass |
| 1822 | [pass] feature EVT-024 pass criteria present | pass |
| 1823 | [pass] feature EVT-025 name present | pass |
| 1824 | [pass] feature EVT-025 UI need 필요 | pass |
| 1825 | [pass] feature EVT-025 test need 필요 | pass |
| 1826 | [pass] feature EVT-025 test area assigned | pass |
| 1827 | [pass] feature EVT-025 pass criteria present | pass |
| 1828 | [pass] feature EVT-026 name present | pass |
| 1829 | [pass] feature EVT-026 UI need 필요 | pass |
| 1830 | [pass] feature EVT-026 test need 필요 | pass |
| 1831 | [pass] feature EVT-026 test area assigned | pass |
| 1832 | [pass] feature EVT-026 pass criteria present | pass |
| 1833 | [pass] feature EVT-027 name present | pass |
| 1834 | [pass] feature EVT-027 UI need 비대상 | pass |
| 1835 | [pass] feature EVT-027 test need 필요 | pass |
| 1836 | [pass] feature EVT-027 test area assigned | pass |
| 1837 | [pass] feature EVT-027 pass criteria present | pass |
| 1838 | [pass] feature EVT-028 name present | pass |
| 1839 | [pass] feature EVT-028 UI need 필요 | pass |
| 1840 | [pass] feature EVT-028 test need 필요 | pass |
| 1841 | [pass] feature EVT-028 test area assigned | pass |
| 1842 | [pass] feature EVT-028 pass criteria present | pass |
| 1843 | [pass] feature EVT-029 name present | pass |
| 1844 | [pass] feature EVT-029 UI need 비대상 | pass |
| 1845 | [pass] feature EVT-029 test need 필요 | pass |
| 1846 | [pass] feature EVT-029 test area assigned | pass |
| 1847 | [pass] feature EVT-029 pass criteria present | pass |
| 1848 | [pass] feature EVT-030 name present | pass |
| 1849 | [pass] feature EVT-030 UI need 필요 | pass |
| 1850 | [pass] feature EVT-030 test need 필요 | pass |
| 1851 | [pass] feature EVT-030 test area assigned | pass |
| 1852 | [pass] feature EVT-030 pass criteria present | pass |
| 1853 | [pass] feature EVT-031 name present | pass |
| 1854 | [pass] feature EVT-031 UI need 필요 | pass |
| 1855 | [pass] feature EVT-031 test need 필요 | pass |
| 1856 | [pass] feature EVT-031 test area assigned | pass |
| 1857 | [pass] feature EVT-031 pass criteria present | pass |
| 1858 | [pass] feature EVT-032 name present | pass |
| 1859 | [pass] feature EVT-032 UI need 비대상 | pass |
| 1860 | [pass] feature EVT-032 test need 필요 | pass |
| 1861 | [pass] feature EVT-032 test area assigned | pass |
| 1862 | [pass] feature EVT-032 pass criteria present | pass |
| 1863 | [pass] feature EVT-033 name present | pass |
| 1864 | [pass] feature EVT-033 UI need 비대상 | pass |
| 1865 | [pass] feature EVT-033 test need 필요 | pass |
| 1866 | [pass] feature EVT-033 test area assigned | pass |
| 1867 | [pass] feature EVT-033 pass criteria present | pass |
| 1868 | [pass] feature EVT-034 name present | pass |
| 1869 | [pass] feature EVT-034 UI need 비대상 | pass |
| 1870 | [pass] feature EVT-034 test need 필요 | pass |
| 1871 | [pass] feature EVT-034 test area assigned | pass |
| 1872 | [pass] feature EVT-034 pass criteria present | pass |
| 1873 | [pass] feature EVT-035 name present | pass |
| 1874 | [pass] feature EVT-035 UI need 간접 | pass |
| 1875 | [pass] feature EVT-035 test need 필요 | pass |
| 1876 | [pass] feature EVT-035 test area assigned | pass |
| 1877 | [pass] feature EVT-035 pass criteria present | pass |
| 1878 | [pass] feature EVT-036 name present | pass |
| 1879 | [pass] feature EVT-036 UI need 간접 | pass |
| 1880 | [pass] feature EVT-036 test need 필요 | pass |
| 1881 | [pass] feature EVT-036 test area assigned | pass |
| 1882 | [pass] feature EVT-036 pass criteria present | pass |
| 1883 | [pass] feature EVT-037 name present | pass |
| 1884 | [pass] feature EVT-037 UI need 필요 | pass |
| 1885 | [pass] feature EVT-037 test need 필요 | pass |
| 1886 | [pass] feature EVT-037 test area assigned | pass |
| 1887 | [pass] feature EVT-037 pass criteria present | pass |
| 1888 | [pass] feature EVT-038 name present | pass |
| 1889 | [pass] feature EVT-038 UI need 필요 | pass |
| 1890 | [pass] feature EVT-038 test need 필요 | pass |
| 1891 | [pass] feature EVT-038 test area assigned | pass |
| 1892 | [pass] feature EVT-038 pass criteria present | pass |
| 1893 | [pass] feature EVT-039 name present | pass |
| 1894 | [pass] feature EVT-039 UI need 비대상 | pass |
| 1895 | [pass] feature EVT-039 test need 필요 | pass |
| 1896 | [pass] feature EVT-039 test area assigned | pass |
| 1897 | [pass] feature EVT-039 pass criteria present | pass |
| 1898 | [pass] feature EVT-040 name present | pass |
| 1899 | [pass] feature EVT-040 UI need 비대상 | pass |
| 1900 | [pass] feature EVT-040 test need 필요 | pass |
| 1901 | [pass] feature EVT-040 test area assigned | pass |
| 1902 | [pass] feature EVT-040 pass criteria present | pass |
| 1903 | [pass] feature EVT-041 name present | pass |
| 1904 | [pass] feature EVT-041 UI need 필요 | pass |
| 1905 | [pass] feature EVT-041 test need 필요 | pass |
| 1906 | [pass] feature EVT-041 test area assigned | pass |
| 1907 | [pass] feature EVT-041 pass criteria present | pass |
| 1908 | [pass] feature EVT-042 name present | pass |
| 1909 | [pass] feature EVT-042 UI need 필요 | pass |
| 1910 | [pass] feature EVT-042 test need 필요 | pass |
| 1911 | [pass] feature EVT-042 test area assigned | pass |
| 1912 | [pass] feature EVT-042 pass criteria present | pass |
| 1913 | [pass] feature EVT-043 name present | pass |
| 1914 | [pass] feature EVT-043 UI need 필요 | pass |
| 1915 | [pass] feature EVT-043 test need 필요 | pass |
| 1916 | [pass] feature EVT-043 test area assigned | pass |
| 1917 | [pass] feature EVT-043 pass criteria present | pass |
| 1918 | [pass] feature EVT-044 name present | pass |
| 1919 | [pass] feature EVT-044 UI need 필요 | pass |
| 1920 | [pass] feature EVT-044 test need 필요 | pass |
| 1921 | [pass] feature EVT-044 test area assigned | pass |
| 1922 | [pass] feature EVT-044 pass criteria present | pass |
| 1923 | [pass] feature EVT-045 name present | pass |
| 1924 | [pass] feature EVT-045 UI need 비대상 | pass |
| 1925 | [pass] feature EVT-045 test need 필요 | pass |
| 1926 | [pass] feature EVT-045 test area assigned | pass |
| 1927 | [pass] feature EVT-045 pass criteria present | pass |
| 1928 | [pass] feature EVT-046 name present | pass |
| 1929 | [pass] feature EVT-046 UI need 필요 | pass |
| 1930 | [pass] feature EVT-046 test need 필요 | pass |
| 1931 | [pass] feature EVT-046 test area assigned | pass |
| 1932 | [pass] feature EVT-046 pass criteria present | pass |
| 1933 | [pass] feature EVT-047 name present | pass |
| 1934 | [pass] feature EVT-047 UI need 필요 | pass |
| 1935 | [pass] feature EVT-047 test need 필요 | pass |
| 1936 | [pass] feature EVT-047 test area assigned | pass |
| 1937 | [pass] feature EVT-047 pass criteria present | pass |
| 1938 | [pass] feature EVT-048 name present | pass |
| 1939 | [pass] feature EVT-048 UI need 필요 | pass |
| 1940 | [pass] feature EVT-048 test need 필요 | pass |
| 1941 | [pass] feature EVT-048 test area assigned | pass |
| 1942 | [pass] feature EVT-048 pass criteria present | pass |
| 1943 | [pass] feature EVT-049 name present | pass |
| 1944 | [pass] feature EVT-049 UI need 필요 | pass |
| 1945 | [pass] feature EVT-049 test need 필요 | pass |
| 1946 | [pass] feature EVT-049 test area assigned | pass |
| 1947 | [pass] feature EVT-049 pass criteria present | pass |
| 1948 | [pass] feature EVT-050 name present | pass |
| 1949 | [pass] feature EVT-050 UI need 필요 | pass |
| 1950 | [pass] feature EVT-050 test need 필요 | pass |
| 1951 | [pass] feature EVT-050 test area assigned | pass |
| 1952 | [pass] feature EVT-050 pass criteria present | pass |
| 1953 | [pass] feature EVT-051 name present | pass |
| 1954 | [pass] feature EVT-051 UI need 필요 | pass |
| 1955 | [pass] feature EVT-051 test need 필요 | pass |
| 1956 | [pass] feature EVT-051 test area assigned | pass |
| 1957 | [pass] feature EVT-051 pass criteria present | pass |
| 1958 | [pass] feature EVT-052 name present | pass |
| 1959 | [pass] feature EVT-052 UI need 필요 | pass |
| 1960 | [pass] feature EVT-052 test need 필요 | pass |
| 1961 | [pass] feature EVT-052 test area assigned | pass |
| 1962 | [pass] feature EVT-052 pass criteria present | pass |
| 1963 | [pass] feature EVT-053 name present | pass |
| 1964 | [pass] feature EVT-053 UI need 필요 | pass |
| 1965 | [pass] feature EVT-053 test need 필요 | pass |
| 1966 | [pass] feature EVT-053 test area assigned | pass |
| 1967 | [pass] feature EVT-053 pass criteria present | pass |
| 1968 | [pass] feature EVT-054 name present | pass |
| 1969 | [pass] feature EVT-054 UI need 필요 | pass |
| 1970 | [pass] feature EVT-054 test need 필요 | pass |
| 1971 | [pass] feature EVT-054 test area assigned | pass |
| 1972 | [pass] feature EVT-054 pass criteria present | pass |
| 1973 | [pass] feature EVT-055 name present | pass |
| 1974 | [pass] feature EVT-055 UI need 필요 | pass |
| 1975 | [pass] feature EVT-055 test need 필요 | pass |
| 1976 | [pass] feature EVT-055 test area assigned | pass |
| 1977 | [pass] feature EVT-055 pass criteria present | pass |
| 1978 | [pass] feature EVT-056 name present | pass |
| 1979 | [pass] feature EVT-056 UI need 필요 | pass |
| 1980 | [pass] feature EVT-056 test need 필요 | pass |
| 1981 | [pass] feature EVT-056 test area assigned | pass |
| 1982 | [pass] feature EVT-056 pass criteria present | pass |
| 1983 | [pass] feature EVT-057 name present | pass |
| 1984 | [pass] feature EVT-057 UI need 필요 | pass |
| 1985 | [pass] feature EVT-057 test need 필요 | pass |
| 1986 | [pass] feature EVT-057 test area assigned | pass |
| 1987 | [pass] feature EVT-057 pass criteria present | pass |
| 1988 | [pass] feature EVT-058 name present | pass |
| 1989 | [pass] feature EVT-058 UI need 필요 | pass |
| 1990 | [pass] feature EVT-058 test need 필요 | pass |
| 1991 | [pass] feature EVT-058 test area assigned | pass |
| 1992 | [pass] feature EVT-058 pass criteria present | pass |
| 1993 | [pass] feature EVT-059 name present | pass |
| 1994 | [pass] feature EVT-059 UI need 비대상 | pass |
| 1995 | [pass] feature EVT-059 test need 필요 | pass |
| 1996 | [pass] feature EVT-059 test area assigned | pass |
| 1997 | [pass] feature EVT-059 pass criteria present | pass |
| 1998 | [pass] feature EVT-060 name present | pass |
| 1999 | [pass] feature EVT-060 UI need 비대상 | pass |
| 2000 | [pass] feature EVT-060 test need 필요 | pass |
| 2001 | [pass] feature EVT-060 test area assigned | pass |
| 2002 | [pass] feature EVT-060 pass criteria present | pass |
| 2003 | [pass] feature EVT-061 name present | pass |
| 2004 | [pass] feature EVT-061 UI need 필요 | pass |
| 2005 | [pass] feature EVT-061 test need 필요 | pass |
| 2006 | [pass] feature EVT-061 test area assigned | pass |
| 2007 | [pass] feature EVT-061 pass criteria present | pass |
| 2008 | [pass] feature EVT-062 name present | pass |
| 2009 | [pass] feature EVT-062 UI need 비대상 | pass |
| 2010 | [pass] feature EVT-062 test need 필요 | pass |
| 2011 | [pass] feature EVT-062 test area assigned | pass |
| 2012 | [pass] feature EVT-062 pass criteria present | pass |
| 2013 | [pass] feature EVT-063 name present | pass |
| 2014 | [pass] feature EVT-063 UI need 비대상 | pass |
| 2015 | [pass] feature EVT-063 test need 필요 | pass |
| 2016 | [pass] feature EVT-063 test area assigned | pass |
| 2017 | [pass] feature EVT-063 pass criteria present | pass |
| 2018 | [pass] feature EVT-064 name present | pass |
| 2019 | [pass] feature EVT-064 UI need 필요 | pass |
| 2020 | [pass] feature EVT-064 test need 필요 | pass |
| 2021 | [pass] feature EVT-064 test area assigned | pass |
| 2022 | [pass] feature EVT-064 pass criteria present | pass |
| 2023 | [pass] feature EVT-065 name present | pass |
| 2024 | [pass] feature EVT-065 UI need 필요 | pass |
| 2025 | [pass] feature EVT-065 test need 필요 | pass |
| 2026 | [pass] feature EVT-065 test area assigned | pass |
| 2027 | [pass] feature EVT-065 pass criteria present | pass |
| 2028 | [pass] feature EVT-066 name present | pass |
| 2029 | [pass] feature EVT-066 UI need 필요 | pass |
| 2030 | [pass] feature EVT-066 test need 필요 | pass |
| 2031 | [pass] feature EVT-066 test area assigned | pass |
| 2032 | [pass] feature EVT-066 pass criteria present | pass |
| 2033 | [pass] feature EVT-067 name present | pass |
| 2034 | [pass] feature EVT-067 UI need 필요 | pass |
| 2035 | [pass] feature EVT-067 test need 필요 | pass |
| 2036 | [pass] feature EVT-067 test area assigned | pass |
| 2037 | [pass] feature EVT-067 pass criteria present | pass |
| 2038 | [pass] feature EVT-068 name present | pass |
| 2039 | [pass] feature EVT-068 UI need 필요 | pass |
| 2040 | [pass] feature EVT-068 test need 필요 | pass |
| 2041 | [pass] feature EVT-068 test area assigned | pass |
| 2042 | [pass] feature EVT-068 pass criteria present | pass |
| 2043 | [pass] feature EVT-069 name present | pass |
| 2044 | [pass] feature EVT-069 UI need 필요 | pass |
| 2045 | [pass] feature EVT-069 test need 필요 | pass |
| 2046 | [pass] feature EVT-069 test area assigned | pass |
| 2047 | [pass] feature EVT-069 pass criteria present | pass |
| 2048 | [pass] feature EVT-070 name present | pass |
| 2049 | [pass] feature EVT-070 UI need 필요 | pass |
| 2050 | [pass] feature EVT-070 test need 필요 | pass |
| 2051 | [pass] feature EVT-070 test area assigned | pass |
| 2052 | [pass] feature EVT-070 pass criteria present | pass |
| 2053 | [pass] feature EVT-071 name present | pass |
| 2054 | [pass] feature EVT-071 UI need 필요 | pass |
| 2055 | [pass] feature EVT-071 test need 필요 | pass |
| 2056 | [pass] feature EVT-071 test area assigned | pass |
| 2057 | [pass] feature EVT-071 pass criteria present | pass |
| 2058 | [pass] feature EVT-072 name present | pass |
| 2059 | [pass] feature EVT-072 UI need 필요 | pass |
| 2060 | [pass] feature EVT-072 test need 필요 | pass |
| 2061 | [pass] feature EVT-072 test area assigned | pass |
| 2062 | [pass] feature EVT-072 pass criteria present | pass |
| 2063 | [pass] feature EVT-073 name present | pass |
| 2064 | [pass] feature EVT-073 UI need 비대상 | pass |
| 2065 | [pass] feature EVT-073 test need 필요 | pass |
| 2066 | [pass] feature EVT-073 test area assigned | pass |
| 2067 | [pass] feature EVT-073 pass criteria present | pass |
| 2068 | [pass] feature EVT-074 name present | pass |
| 2069 | [pass] feature EVT-074 UI need 비대상 | pass |
| 2070 | [pass] feature EVT-074 test need 필요 | pass |
| 2071 | [pass] feature EVT-074 test area assigned | pass |
| 2072 | [pass] feature EVT-074 pass criteria present | pass |
| 2073 | [pass] feature EVT-075 name present | pass |
| 2074 | [pass] feature EVT-075 UI need 필요 | pass |
| 2075 | [pass] feature EVT-075 test need 필요 | pass |
| 2076 | [pass] feature EVT-075 test area assigned | pass |
| 2077 | [pass] feature EVT-075 pass criteria present | pass |
| 2078 | [pass] feature EVT-076 name present | pass |
| 2079 | [pass] feature EVT-076 UI need 비대상 | pass |
| 2080 | [pass] feature EVT-076 test need 필요 | pass |
| 2081 | [pass] feature EVT-076 test area assigned | pass |
| 2082 | [pass] feature EVT-076 pass criteria present | pass |
| 2083 | [pass] feature EVT-077 name present | pass |
| 2084 | [pass] feature EVT-077 UI need 비대상 | pass |
| 2085 | [pass] feature EVT-077 test need 필요 | pass |
| 2086 | [pass] feature EVT-077 test area assigned | pass |
| 2087 | [pass] feature EVT-077 pass criteria present | pass |
| 2088 | [pass] feature EVT-078 name present | pass |
| 2089 | [pass] feature EVT-078 UI need 비대상 | pass |
| 2090 | [pass] feature EVT-078 test need 필요 | pass |
| 2091 | [pass] feature EVT-078 test area assigned | pass |
| 2092 | [pass] feature EVT-078 pass criteria present | pass |
| 2093 | [pass] feature EVT-079 name present | pass |
| 2094 | [pass] feature EVT-079 UI need 비대상 | pass |
| 2095 | [pass] feature EVT-079 test need 필요 | pass |
| 2096 | [pass] feature EVT-079 test area assigned | pass |
| 2097 | [pass] feature EVT-079 pass criteria present | pass |
| 2098 | [pass] feature EVT-080 name present | pass |
| 2099 | [pass] feature EVT-080 UI need 비대상 | pass |
| 2100 | [pass] feature EVT-080 test need 필요 | pass |
| 2101 | [pass] feature EVT-080 test area assigned | pass |
| 2102 | [pass] feature EVT-080 pass criteria present | pass |
| 2103 | [pass] feature EVT-081 name present | pass |
| 2104 | [pass] feature EVT-081 UI need 비대상 | pass |
| 2105 | [pass] feature EVT-081 test need 필요 | pass |
| 2106 | [pass] feature EVT-081 test area assigned | pass |
| 2107 | [pass] feature EVT-081 pass criteria present | pass |
| 2108 | [pass] feature EVT-082 name present | pass |
| 2109 | [pass] feature EVT-082 UI need 비대상 | pass |
| 2110 | [pass] feature EVT-082 test need 필요 | pass |
| 2111 | [pass] feature EVT-082 test area assigned | pass |
| 2112 | [pass] feature EVT-082 pass criteria present | pass |
| 2113 | [pass] feature EVT-083 name present | pass |
| 2114 | [pass] feature EVT-083 UI need 비대상 | pass |
| 2115 | [pass] feature EVT-083 test need 필요 | pass |
| 2116 | [pass] feature EVT-083 test area assigned | pass |
| 2117 | [pass] feature EVT-083 pass criteria present | pass |
| 2118 | [pass] feature EVT-084 name present | pass |
| 2119 | [pass] feature EVT-084 UI need 비대상 | pass |
| 2120 | [pass] feature EVT-084 test need 필요 | pass |
| 2121 | [pass] feature EVT-084 test area assigned | pass |
| 2122 | [pass] feature EVT-084 pass criteria present | pass |
| 2123 | [pass] feature EVT-085 name present | pass |
| 2124 | [pass] feature EVT-085 UI need 비대상 | pass |
| 2125 | [pass] feature EVT-085 test need 필요 | pass |
| 2126 | [pass] feature EVT-085 test area assigned | pass |
| 2127 | [pass] feature EVT-085 pass criteria present | pass |
| 2128 | [pass] feature EVT-086 name present | pass |
| 2129 | [pass] feature EVT-086 UI need 비대상 | pass |
| 2130 | [pass] feature EVT-086 test need 필요 | pass |
| 2131 | [pass] feature EVT-086 test area assigned | pass |
| 2132 | [pass] feature EVT-086 pass criteria present | pass |
| 2133 | [pass] feature EVT-087 name present | pass |
| 2134 | [pass] feature EVT-087 UI need 비대상 | pass |
| 2135 | [pass] feature EVT-087 test need 필요 | pass |
| 2136 | [pass] feature EVT-087 test area assigned | pass |
| 2137 | [pass] feature EVT-087 pass criteria present | pass |
| 2138 | [pass] feature CLIENT-001 name present | pass |
| 2139 | [pass] feature CLIENT-001 UI need 필요 | pass |
| 2140 | [pass] feature CLIENT-001 test need 필요 | pass |
| 2141 | [pass] feature CLIENT-001 test area assigned | pass |
| 2142 | [pass] feature CLIENT-001 pass criteria present | pass |
| 2143 | [pass] feature CLIENT-002 name present | pass |
| 2144 | [pass] feature CLIENT-002 UI need 필요 | pass |
| 2145 | [pass] feature CLIENT-002 test need 필요 | pass |
| 2146 | [pass] feature CLIENT-002 test area assigned | pass |
| 2147 | [pass] feature CLIENT-002 pass criteria present | pass |
| 2148 | [pass] feature CLIENT-003 name present | pass |
| 2149 | [pass] feature CLIENT-003 UI need 간접 | pass |
| 2150 | [pass] feature CLIENT-003 test need 필요 | pass |
| 2151 | [pass] feature CLIENT-003 test area assigned | pass |
| 2152 | [pass] feature CLIENT-003 pass criteria present | pass |
| 2153 | [pass] feature CLIENT-004 name present | pass |
| 2154 | [pass] feature CLIENT-004 UI need 간접 | pass |
| 2155 | [pass] feature CLIENT-004 test need 필요 | pass |
| 2156 | [pass] feature CLIENT-004 test area assigned | pass |
| 2157 | [pass] feature CLIENT-004 pass criteria present | pass |
| 2158 | [pass] feature CLIENT-005 name present | pass |
| 2159 | [pass] feature CLIENT-005 UI need 필요 | pass |
| 2160 | [pass] feature CLIENT-005 test need 필요 | pass |
| 2161 | [pass] feature CLIENT-005 test area assigned | pass |
| 2162 | [pass] feature CLIENT-005 pass criteria present | pass |
| 2163 | [pass] feature CLIENT-006 name present | pass |
| 2164 | [pass] feature CLIENT-006 UI need 필요 | pass |
| 2165 | [pass] feature CLIENT-006 test need 필요 | pass |
| 2166 | [pass] feature CLIENT-006 test area assigned | pass |
| 2167 | [pass] feature CLIENT-006 pass criteria present | pass |
| 2168 | [pass] feature CLIENT-007 name present | pass |
| 2169 | [pass] feature CLIENT-007 UI need 필요 | pass |
| 2170 | [pass] feature CLIENT-007 test need 필요 | pass |
| 2171 | [pass] feature CLIENT-007 test area assigned | pass |
| 2172 | [pass] feature CLIENT-007 pass criteria present | pass |
| 2173 | [pass] feature CLIENT-008 name present | pass |
| 2174 | [pass] feature CLIENT-008 UI need 간접 | pass |
| 2175 | [pass] feature CLIENT-008 test need 필요 | pass |
| 2176 | [pass] feature CLIENT-008 test area assigned | pass |
| 2177 | [pass] feature CLIENT-008 pass criteria present | pass |
| 2178 | [pass] feature CLIENT-009 name present | pass |
| 2179 | [pass] feature CLIENT-009 UI need 필요 | pass |
| 2180 | [pass] feature CLIENT-009 test need 필요 | pass |
| 2181 | [pass] feature CLIENT-009 test area assigned | pass |
| 2182 | [pass] feature CLIENT-009 pass criteria present | pass |
| 2183 | [pass] feature CLIENT-010 name present | pass |
| 2184 | [pass] feature CLIENT-010 UI need 필요 | pass |
| 2185 | [pass] feature CLIENT-010 test need 필요 | pass |
| 2186 | [pass] feature CLIENT-010 test area assigned | pass |
| 2187 | [pass] feature CLIENT-010 pass criteria present | pass |
| 2188 | [pass] feature CLIENT-011 name present | pass |
| 2189 | [pass] feature CLIENT-011 UI need 필요 | pass |
| 2190 | [pass] feature CLIENT-011 test need 필요 | pass |
| 2191 | [pass] feature CLIENT-011 test area assigned | pass |
| 2192 | [pass] feature CLIENT-011 pass criteria present | pass |
| 2193 | [pass] feature CLIENT-012 name present | pass |
| 2194 | [pass] feature CLIENT-012 UI need 필요 | pass |
| 2195 | [pass] feature CLIENT-012 test need 필요 | pass |
| 2196 | [pass] feature CLIENT-012 test area assigned | pass |
| 2197 | [pass] feature CLIENT-012 pass criteria present | pass |
| 2198 | [pass] feature CLIENT-013 name present | pass |
| 2199 | [pass] feature CLIENT-013 UI need 필요 | pass |
| 2200 | [pass] feature CLIENT-013 test need 필요 | pass |
| 2201 | [pass] feature CLIENT-013 test area assigned | pass |
| 2202 | [pass] feature CLIENT-013 pass criteria present | pass |
| 2203 | [pass] feature CLIENT-014 name present | pass |
| 2204 | [pass] feature CLIENT-014 UI need 필요 | pass |
| 2205 | [pass] feature CLIENT-014 test need 필요 | pass |
| 2206 | [pass] feature CLIENT-014 test area assigned | pass |
| 2207 | [pass] feature CLIENT-014 pass criteria present | pass |
| 2208 | [pass] feature CLIENT-015 name present | pass |
| 2209 | [pass] feature CLIENT-015 UI need 필요 | pass |
| 2210 | [pass] feature CLIENT-015 test need 필요 | pass |
| 2211 | [pass] feature CLIENT-015 test area assigned | pass |
| 2212 | [pass] feature CLIENT-015 pass criteria present | pass |
| 2213 | [pass] feature CLIENT-016 name present | pass |
| 2214 | [pass] feature CLIENT-016 UI need 필요 | pass |
| 2215 | [pass] feature CLIENT-016 test need 필요 | pass |
| 2216 | [pass] feature CLIENT-016 test area assigned | pass |
| 2217 | [pass] feature CLIENT-016 pass criteria present | pass |
| 2218 | [pass] feature CLIENT-017 name present | pass |
| 2219 | [pass] feature CLIENT-017 UI need 필요 | pass |
| 2220 | [pass] feature CLIENT-017 test need 필요 | pass |
| 2221 | [pass] feature CLIENT-017 test area assigned | pass |
| 2222 | [pass] feature CLIENT-017 pass criteria present | pass |
| 2223 | [pass] feature CLIENT-018 name present | pass |
| 2224 | [pass] feature CLIENT-018 UI need 필요 | pass |
| 2225 | [pass] feature CLIENT-018 test need 필요 | pass |
| 2226 | [pass] feature CLIENT-018 test area assigned | pass |
| 2227 | [pass] feature CLIENT-018 pass criteria present | pass |
| 2228 | [pass] feature CLIENT-019 name present | pass |
| 2229 | [pass] feature CLIENT-019 UI need 필요 | pass |
| 2230 | [pass] feature CLIENT-019 test need 필요 | pass |
| 2231 | [pass] feature CLIENT-019 test area assigned | pass |
| 2232 | [pass] feature CLIENT-019 pass criteria present | pass |
| 2233 | [pass] feature CLIENT-020 name present | pass |
| 2234 | [pass] feature CLIENT-020 UI need 필요 | pass |
| 2235 | [pass] feature CLIENT-020 test need 필요 | pass |
| 2236 | [pass] feature CLIENT-020 test area assigned | pass |
| 2237 | [pass] feature CLIENT-020 pass criteria present | pass |
| 2238 | [pass] feature CLIENT-021 name present | pass |
| 2239 | [pass] feature CLIENT-021 UI need 필요 | pass |
| 2240 | [pass] feature CLIENT-021 test need 필요 | pass |
| 2241 | [pass] feature CLIENT-021 test area assigned | pass |
| 2242 | [pass] feature CLIENT-021 pass criteria present | pass |
| 2243 | [pass] feature CLIENT-022 name present | pass |
| 2244 | [pass] feature CLIENT-022 UI need 필요 | pass |
| 2245 | [pass] feature CLIENT-022 test need 필요 | pass |
| 2246 | [pass] feature CLIENT-022 test area assigned | pass |
| 2247 | [pass] feature CLIENT-022 pass criteria present | pass |
| 2248 | [pass] feature CLIENT-023 name present | pass |
| 2249 | [pass] feature CLIENT-023 UI need 필요 | pass |
| 2250 | [pass] feature CLIENT-023 test need 필요 | pass |
| 2251 | [pass] feature CLIENT-023 test area assigned | pass |
| 2252 | [pass] feature CLIENT-023 pass criteria present | pass |
| 2253 | [pass] feature CLIENT-024 name present | pass |
| 2254 | [pass] feature CLIENT-024 UI need 필요 | pass |
| 2255 | [pass] feature CLIENT-024 test need 필요 | pass |
| 2256 | [pass] feature CLIENT-024 test area assigned | pass |
| 2257 | [pass] feature CLIENT-024 pass criteria present | pass |
| 2258 | [pass] feature CLIENT-025 name present | pass |
| 2259 | [pass] feature CLIENT-025 UI need 필요 | pass |
| 2260 | [pass] feature CLIENT-025 test need 필요 | pass |
| 2261 | [pass] feature CLIENT-025 test area assigned | pass |
| 2262 | [pass] feature CLIENT-025 pass criteria present | pass |
| 2263 | [pass] feature CLIENT-026 name present | pass |
| 2264 | [pass] feature CLIENT-026 UI need 비대상 | pass |
| 2265 | [pass] feature CLIENT-026 test need 필요 | pass |
| 2266 | [pass] feature CLIENT-026 test area assigned | pass |
| 2267 | [pass] feature CLIENT-026 pass criteria present | pass |
| 2268 | [pass] feature CLIENT-027 name present | pass |
| 2269 | [pass] feature CLIENT-027 UI need 필요 | pass |
| 2270 | [pass] feature CLIENT-027 test need 필요 | pass |
| 2271 | [pass] feature CLIENT-027 test area assigned | pass |
| 2272 | [pass] feature CLIENT-027 pass criteria present | pass |
| 2273 | [pass] feature CLIENT-028 name present | pass |
| 2274 | [pass] feature CLIENT-028 UI need 필요 | pass |
| 2275 | [pass] feature CLIENT-028 test need 필요 | pass |
| 2276 | [pass] feature CLIENT-028 test area assigned | pass |
| 2277 | [pass] feature CLIENT-028 pass criteria present | pass |
| 2278 | [pass] feature CLIENT-029 name present | pass |
| 2279 | [pass] feature CLIENT-029 UI need 필요 | pass |
| 2280 | [pass] feature CLIENT-029 test need 필요 | pass |
| 2281 | [pass] feature CLIENT-029 test area assigned | pass |
| 2282 | [pass] feature CLIENT-029 pass criteria present | pass |
| 2283 | [pass] feature CLIENT-030 name present | pass |
| 2284 | [pass] feature CLIENT-030 UI need 비대상 | pass |
| 2285 | [pass] feature CLIENT-030 test need 필요 | pass |
| 2286 | [pass] feature CLIENT-030 test area assigned | pass |
| 2287 | [pass] feature CLIENT-030 pass criteria present | pass |
| 2288 | [pass] feature CLIENT-031 name present | pass |
| 2289 | [pass] feature CLIENT-031 UI need 필요 | pass |
| 2290 | [pass] feature CLIENT-031 test need 필요 | pass |
| 2291 | [pass] feature CLIENT-031 test area assigned | pass |
| 2292 | [pass] feature CLIENT-031 pass criteria present | pass |
| 2293 | [pass] feature CLIENT-032 name present | pass |
| 2294 | [pass] feature CLIENT-032 UI need 필요 | pass |
| 2295 | [pass] feature CLIENT-032 test need 필요 | pass |
| 2296 | [pass] feature CLIENT-032 test area assigned | pass |
| 2297 | [pass] feature CLIENT-032 pass criteria present | pass |
| 2298 | [pass] feature CLIENT-033 name present | pass |
| 2299 | [pass] feature CLIENT-033 UI need 비대상 | pass |
| 2300 | [pass] feature CLIENT-033 test need 필요 | pass |
| 2301 | [pass] feature CLIENT-033 test area assigned | pass |
| 2302 | [pass] feature CLIENT-033 pass criteria present | pass |
| 2303 | [pass] feature CLIENT-034 name present | pass |
| 2304 | [pass] feature CLIENT-034 UI need 비대상 | pass |
| 2305 | [pass] feature CLIENT-034 test need 필요 | pass |
| 2306 | [pass] feature CLIENT-034 test area assigned | pass |
| 2307 | [pass] feature CLIENT-034 pass criteria present | pass |
| 2308 | [pass] feature CLIENT-035 name present | pass |
| 2309 | [pass] feature CLIENT-035 UI need 비대상 | pass |
| 2310 | [pass] feature CLIENT-035 test need 필요 | pass |
| 2311 | [pass] feature CLIENT-035 test area assigned | pass |
| 2312 | [pass] feature CLIENT-035 pass criteria present | pass |
| 2313 | [pass] feature CLIENT-036 name present | pass |
| 2314 | [pass] feature CLIENT-036 UI need 비대상 | pass |
| 2315 | [pass] feature CLIENT-036 test need 필요 | pass |
| 2316 | [pass] feature CLIENT-036 test area assigned | pass |
| 2317 | [pass] feature CLIENT-036 pass criteria present | pass |
| 2318 | [pass] feature CLIENT-037 name present | pass |
| 2319 | [pass] feature CLIENT-037 UI need 비대상 | pass |
| 2320 | [pass] feature CLIENT-037 test need 필요 | pass |
| 2321 | [pass] feature CLIENT-037 test area assigned | pass |
| 2322 | [pass] feature CLIENT-037 pass criteria present | pass |
| 2323 | [pass] feature CLIENT-038 name present | pass |
| 2324 | [pass] feature CLIENT-038 UI need 비대상 | pass |
| 2325 | [pass] feature CLIENT-038 test need 필요 | pass |
| 2326 | [pass] feature CLIENT-038 test area assigned | pass |
| 2327 | [pass] feature CLIENT-038 pass criteria present | pass |
| 2328 | [pass] feature CLIENT-039 name present | pass |
| 2329 | [pass] feature CLIENT-039 UI need 비대상 | pass |
| 2330 | [pass] feature CLIENT-039 test need 필요 | pass |
| 2331 | [pass] feature CLIENT-039 test area assigned | pass |
| 2332 | [pass] feature CLIENT-039 pass criteria present | pass |
| 2333 | [pass] feature CLIENT-040 name present | pass |
| 2334 | [pass] feature CLIENT-040 UI need 필요 | pass |
| 2335 | [pass] feature CLIENT-040 test need 필요 | pass |
| 2336 | [pass] feature CLIENT-040 test area assigned | pass |
| 2337 | [pass] feature CLIENT-040 pass criteria present | pass |
| 2338 | [pass] feature CLIENT-041 name present | pass |
| 2339 | [pass] feature CLIENT-041 UI need 필요 | pass |
| 2340 | [pass] feature CLIENT-041 test need 필요 | pass |
| 2341 | [pass] feature CLIENT-041 test area assigned | pass |
| 2342 | [pass] feature CLIENT-041 pass criteria present | pass |
| 2343 | [pass] feature CLIENT-042 name present | pass |
| 2344 | [pass] feature CLIENT-042 UI need 필요 | pass |
| 2345 | [pass] feature CLIENT-042 test need 필요 | pass |
| 2346 | [pass] feature CLIENT-042 test area assigned | pass |
| 2347 | [pass] feature CLIENT-042 pass criteria present | pass |
| 2348 | [pass] feature MEDIA-001 name present | pass |
| 2349 | [pass] feature MEDIA-001 UI need 비대상 | pass |
| 2350 | [pass] feature MEDIA-001 test need 필요 | pass |
| 2351 | [pass] feature MEDIA-001 test area assigned | pass |
| 2352 | [pass] feature MEDIA-001 pass criteria present | pass |
| 2353 | [pass] feature MEDIA-002 name present | pass |
| 2354 | [pass] feature MEDIA-002 UI need 비대상 | pass |
| 2355 | [pass] feature MEDIA-002 test need 필요 | pass |
| 2356 | [pass] feature MEDIA-002 test area assigned | pass |
| 2357 | [pass] feature MEDIA-002 pass criteria present | pass |
| 2358 | [pass] feature MEDIA-003 name present | pass |
| 2359 | [pass] feature MEDIA-003 UI need 비대상 | pass |
| 2360 | [pass] feature MEDIA-003 test need 필요 | pass |
| 2361 | [pass] feature MEDIA-003 test area assigned | pass |
| 2362 | [pass] feature MEDIA-003 pass criteria present | pass |
| 2363 | [pass] feature MEDIA-004 name present | pass |
| 2364 | [pass] feature MEDIA-004 UI need 비대상 | pass |
| 2365 | [pass] feature MEDIA-004 test need 필요 | pass |
| 2366 | [pass] feature MEDIA-004 test area assigned | pass |
| 2367 | [pass] feature MEDIA-004 pass criteria present | pass |
| 2368 | [pass] feature MEDIA-005 name present | pass |
| 2369 | [pass] feature MEDIA-005 UI need 비대상 | pass |
| 2370 | [pass] feature MEDIA-005 test need 필요 | pass |
| 2371 | [pass] feature MEDIA-005 test area assigned | pass |
| 2372 | [pass] feature MEDIA-005 pass criteria present | pass |
| 2373 | [pass] feature MEDIA-006 name present | pass |
| 2374 | [pass] feature MEDIA-006 UI need 비대상 | pass |
| 2375 | [pass] feature MEDIA-006 test need 필요 | pass |
| 2376 | [pass] feature MEDIA-006 test area assigned | pass |
| 2377 | [pass] feature MEDIA-006 pass criteria present | pass |
| 2378 | [pass] feature MEDIA-007 name present | pass |
| 2379 | [pass] feature MEDIA-007 UI need 비대상 | pass |
| 2380 | [pass] feature MEDIA-007 test need 필요 | pass |
| 2381 | [pass] feature MEDIA-007 test area assigned | pass |
| 2382 | [pass] feature MEDIA-007 pass criteria present | pass |
| 2383 | [pass] feature MEDIA-008 name present | pass |
| 2384 | [pass] feature MEDIA-008 UI need 비대상 | pass |
| 2385 | [pass] feature MEDIA-008 test need 필요 | pass |
| 2386 | [pass] feature MEDIA-008 test area assigned | pass |
| 2387 | [pass] feature MEDIA-008 pass criteria present | pass |
| 2388 | [pass] feature MEDIA-009 name present | pass |
| 2389 | [pass] feature MEDIA-009 UI need 간접 | pass |
| 2390 | [pass] feature MEDIA-009 test need 필요 | pass |
| 2391 | [pass] feature MEDIA-009 test area assigned | pass |
| 2392 | [pass] feature MEDIA-009 pass criteria present | pass |
| 2393 | [pass] feature MEDIA-010 name present | pass |
| 2394 | [pass] feature MEDIA-010 UI need 간접 | pass |
| 2395 | [pass] feature MEDIA-010 test need 필요 | pass |
| 2396 | [pass] feature MEDIA-010 test area assigned | pass |
| 2397 | [pass] feature MEDIA-010 pass criteria present | pass |
| 2398 | [pass] feature MEDIA-011 name present | pass |
| 2399 | [pass] feature MEDIA-011 UI need 비대상 | pass |
| 2400 | [pass] feature MEDIA-011 test need 필요 | pass |
| 2401 | [pass] feature MEDIA-011 test area assigned | pass |
| 2402 | [pass] feature MEDIA-011 pass criteria present | pass |
| 2403 | [pass] feature MEDIA-012 name present | pass |
| 2404 | [pass] feature MEDIA-012 UI need 비대상 | pass |
| 2405 | [pass] feature MEDIA-012 test need 필요 | pass |
| 2406 | [pass] feature MEDIA-012 test area assigned | pass |
| 2407 | [pass] feature MEDIA-012 pass criteria present | pass |
| 2408 | [pass] feature MEDIA-013 name present | pass |
| 2409 | [pass] feature MEDIA-013 UI need 비대상 | pass |
| 2410 | [pass] feature MEDIA-013 test need 필요 | pass |
| 2411 | [pass] feature MEDIA-013 test area assigned | pass |
| 2412 | [pass] feature MEDIA-013 pass criteria present | pass |
| 2413 | [pass] feature MEDIA-014 name present | pass |
| 2414 | [pass] feature MEDIA-014 UI need 비대상 | pass |
| 2415 | [pass] feature MEDIA-014 test need 필요 | pass |
| 2416 | [pass] feature MEDIA-014 test area assigned | pass |
| 2417 | [pass] feature MEDIA-014 pass criteria present | pass |
| 2418 | [pass] feature MEDIA-015 name present | pass |
| 2419 | [pass] feature MEDIA-015 UI need 비대상 | pass |
| 2420 | [pass] feature MEDIA-015 test need 필요 | pass |
| 2421 | [pass] feature MEDIA-015 test area assigned | pass |
| 2422 | [pass] feature MEDIA-015 pass criteria present | pass |
| 2423 | [pass] feature MEDIA-016 name present | pass |
| 2424 | [pass] feature MEDIA-016 UI need 필요 | pass |
| 2425 | [pass] feature MEDIA-016 test need 필요 | pass |
| 2426 | [pass] feature MEDIA-016 test area assigned | pass |
| 2427 | [pass] feature MEDIA-016 pass criteria present | pass |
| 2428 | [pass] feature MEDIA-017 name present | pass |
| 2429 | [pass] feature MEDIA-017 UI need 필요 | pass |
| 2430 | [pass] feature MEDIA-017 test need 필요 | pass |
| 2431 | [pass] feature MEDIA-017 test area assigned | pass |
| 2432 | [pass] feature MEDIA-017 pass criteria present | pass |
| 2433 | [pass] feature MEDIA-018 name present | pass |
| 2434 | [pass] feature MEDIA-018 UI need 비대상 | pass |
| 2435 | [pass] feature MEDIA-018 test need 필요 | pass |
| 2436 | [pass] feature MEDIA-018 test area assigned | pass |
| 2437 | [pass] feature MEDIA-018 pass criteria present | pass |
| 2438 | [pass] feature MEDIA-019 name present | pass |
| 2439 | [pass] feature MEDIA-019 UI need 간접 | pass |
| 2440 | [pass] feature MEDIA-019 test need 필요 | pass |
| 2441 | [pass] feature MEDIA-019 test area assigned | pass |
| 2442 | [pass] feature MEDIA-019 pass criteria present | pass |
| 2443 | [pass] feature MEDIA-020 name present | pass |
| 2444 | [pass] feature MEDIA-020 UI need 비대상 | pass |
| 2445 | [pass] feature MEDIA-020 test need 필요 | pass |
| 2446 | [pass] feature MEDIA-020 test area assigned | pass |
| 2447 | [pass] feature MEDIA-020 pass criteria present | pass |
| 2448 | [pass] feature MEDIA-021 name present | pass |
| 2449 | [pass] feature MEDIA-021 UI need 비대상 | pass |
| 2450 | [pass] feature MEDIA-021 test need 필요 | pass |
| 2451 | [pass] feature MEDIA-021 test area assigned | pass |
| 2452 | [pass] feature MEDIA-021 pass criteria present | pass |
| 2453 | [pass] feature MEDIA-022 name present | pass |
| 2454 | [pass] feature MEDIA-022 UI need 비대상 | pass |
| 2455 | [pass] feature MEDIA-022 test need 필요 | pass |
| 2456 | [pass] feature MEDIA-022 test area assigned | pass |
| 2457 | [pass] feature MEDIA-022 pass criteria present | pass |
| 2458 | [pass] feature MEDIA-023 name present | pass |
| 2459 | [pass] feature MEDIA-023 UI need 비대상 | pass |
| 2460 | [pass] feature MEDIA-023 test need 필요 | pass |
| 2461 | [pass] feature MEDIA-023 test area assigned | pass |
| 2462 | [pass] feature MEDIA-023 pass criteria present | pass |
| 2463 | [pass] feature MEDIA-024 name present | pass |
| 2464 | [pass] feature MEDIA-024 UI need 비대상 | pass |
| 2465 | [pass] feature MEDIA-024 test need 필요 | pass |
| 2466 | [pass] feature MEDIA-024 test area assigned | pass |
| 2467 | [pass] feature MEDIA-024 pass criteria present | pass |
| 2468 | [pass] feature MEDIA-025 name present | pass |
| 2469 | [pass] feature MEDIA-025 UI need 비대상 | pass |
| 2470 | [pass] feature MEDIA-025 test need 필요 | pass |
| 2471 | [pass] feature MEDIA-025 test area assigned | pass |
| 2472 | [pass] feature MEDIA-025 pass criteria present | pass |
| 2473 | [pass] feature MEDIA-026 name present | pass |
| 2474 | [pass] feature MEDIA-026 UI need 비대상 | pass |
| 2475 | [pass] feature MEDIA-026 test need 필요 | pass |
| 2476 | [pass] feature MEDIA-026 test area assigned | pass |
| 2477 | [pass] feature MEDIA-026 pass criteria present | pass |
| 2478 | [pass] feature MEDIA-027 name present | pass |
| 2479 | [pass] feature MEDIA-027 UI need 비대상 | pass |
| 2480 | [pass] feature MEDIA-027 test need 필요 | pass |
| 2481 | [pass] feature MEDIA-027 test area assigned | pass |
| 2482 | [pass] feature MEDIA-027 pass criteria present | pass |
| 2483 | [pass] feature LAB-001 name present | pass |
| 2484 | [pass] feature LAB-001 UI need 비대상 | pass |
| 2485 | [pass] feature LAB-001 test need 필요 | pass |
| 2486 | [pass] feature LAB-001 test area assigned | pass |
| 2487 | [pass] feature LAB-001 pass criteria present | pass |
| 2488 | [pass] feature LAB-002 name present | pass |
| 2489 | [pass] feature LAB-002 UI need 비대상 | pass |
| 2490 | [pass] feature LAB-002 test need 필요 | pass |
| 2491 | [pass] feature LAB-002 test area assigned | pass |
| 2492 | [pass] feature LAB-002 pass criteria present | pass |
| 2493 | [pass] feature LAB-003 name present | pass |
| 2494 | [pass] feature LAB-003 UI need 비대상 | pass |
| 2495 | [pass] feature LAB-003 test need 필요 | pass |
| 2496 | [pass] feature LAB-003 test area assigned | pass |
| 2497 | [pass] feature LAB-003 pass criteria present | pass |
| 2498 | [pass] feature LAB-004 name present | pass |
| 2499 | [pass] feature LAB-004 UI need 비대상 | pass |
| 2500 | [pass] feature LAB-004 test need 필요 | pass |
| 2501 | [pass] feature LAB-004 test area assigned | pass |
| 2502 | [pass] feature LAB-004 pass criteria present | pass |
| 2503 | [pass] feature LAB-005 name present | pass |
| 2504 | [pass] feature LAB-005 UI need 비대상 | pass |
| 2505 | [pass] feature LAB-005 test need 필요 | pass |
| 2506 | [pass] feature LAB-005 test area assigned | pass |
| 2507 | [pass] feature LAB-005 pass criteria present | pass |
| 2508 | [pass] feature LAB-006 name present | pass |
| 2509 | [pass] feature LAB-006 UI need 비대상 | pass |
| 2510 | [pass] feature LAB-006 test need 필요 | pass |
| 2511 | [pass] feature LAB-006 test area assigned | pass |
| 2512 | [pass] feature LAB-006 pass criteria present | pass |
| 2513 | [pass] feature LAB-007 name present | pass |
| 2514 | [pass] feature LAB-007 UI need 비대상 | pass |
| 2515 | [pass] feature LAB-007 test need 필요 | pass |
| 2516 | [pass] feature LAB-007 test area assigned | pass |
| 2517 | [pass] feature LAB-007 pass criteria present | pass |
| 2518 | [pass] feature LAB-008 name present | pass |
| 2519 | [pass] feature LAB-008 UI need 비대상 | pass |
| 2520 | [pass] feature LAB-008 test need 필요 | pass |
| 2521 | [pass] feature LAB-008 test area assigned | pass |
| 2522 | [pass] feature LAB-008 pass criteria present | pass |
| 2523 | [pass] feature LAB-009 name present | pass |
| 2524 | [pass] feature LAB-009 UI need 비대상 | pass |
| 2525 | [pass] feature LAB-009 test need 필요 | pass |
| 2526 | [pass] feature LAB-009 test area assigned | pass |
| 2527 | [pass] feature LAB-009 pass criteria present | pass |
| 2528 | [pass] feature LAB-010 name present | pass |
| 2529 | [pass] feature LAB-010 UI need 비대상 | pass |
| 2530 | [pass] feature LAB-010 test need 필요 | pass |
| 2531 | [pass] feature LAB-010 test area assigned | pass |
| 2532 | [pass] feature LAB-010 pass criteria present | pass |
| 2533 | [pass] feature LAB-011 name present | pass |
| 2534 | [pass] feature LAB-011 UI need 비대상 | pass |
| 2535 | [pass] feature LAB-011 test need 필요 | pass |
| 2536 | [pass] feature LAB-011 test area assigned | pass |
| 2537 | [pass] feature LAB-011 pass criteria present | pass |
| 2538 | [pass] feature LAB-012 name present | pass |
| 2539 | [pass] feature LAB-012 UI need 비대상 | pass |
| 2540 | [pass] feature LAB-012 test need 필요 | pass |
| 2541 | [pass] feature LAB-012 test area assigned | pass |
| 2542 | [pass] feature LAB-012 pass criteria present | pass |
| 2543 | [pass] feature LAB-013 name present | pass |
| 2544 | [pass] feature LAB-013 UI need 비대상 | pass |
| 2545 | [pass] feature LAB-013 test need 필요 | pass |
| 2546 | [pass] feature LAB-013 test area assigned | pass |
| 2547 | [pass] feature LAB-013 pass criteria present | pass |
| 2548 | [pass] feature LAB-014 name present | pass |
| 2549 | [pass] feature LAB-014 UI need 비대상 | pass |
| 2550 | [pass] feature LAB-014 test need 필요 | pass |
| 2551 | [pass] feature LAB-014 test area assigned | pass |
| 2552 | [pass] feature LAB-014 pass criteria present | pass |
| 2553 | [pass] feature LAB-015 name present | pass |
| 2554 | [pass] feature LAB-015 UI need 비대상 | pass |
| 2555 | [pass] feature LAB-015 test need 필요 | pass |
| 2556 | [pass] feature LAB-015 test area assigned | pass |
| 2557 | [pass] feature LAB-015 pass criteria present | pass |
| 2558 | [pass] feature LAB-016 name present | pass |
| 2559 | [pass] feature LAB-016 UI need 비대상 | pass |
| 2560 | [pass] feature LAB-016 test need 필요 | pass |
| 2561 | [pass] feature LAB-016 test area assigned | pass |
| 2562 | [pass] feature LAB-016 pass criteria present | pass |
| 2563 | [pass] feature LAB-017 name present | pass |
| 2564 | [pass] feature LAB-017 UI need 비대상 | pass |
| 2565 | [pass] feature LAB-017 test need 필요 | pass |
| 2566 | [pass] feature LAB-017 test area assigned | pass |
| 2567 | [pass] feature LAB-017 pass criteria present | pass |
| 2568 | [pass] feature LAB-018 name present | pass |
| 2569 | [pass] feature LAB-018 UI need 비대상 | pass |
| 2570 | [pass] feature LAB-018 test need 필요 | pass |
| 2571 | [pass] feature LAB-018 test area assigned | pass |
| 2572 | [pass] feature LAB-018 pass criteria present | pass |
| 2573 | [pass] feature LAB-019 name present | pass |
| 2574 | [pass] feature LAB-019 UI need 비대상 | pass |
| 2575 | [pass] feature LAB-019 test need 필요 | pass |
| 2576 | [pass] feature LAB-019 test area assigned | pass |
| 2577 | [pass] feature LAB-019 pass criteria present | pass |
| 2578 | [pass] feature LAB-020 name present | pass |
| 2579 | [pass] feature LAB-020 UI need 비대상 | pass |
| 2580 | [pass] feature LAB-020 test need 필요 | pass |
| 2581 | [pass] feature LAB-020 test area assigned | pass |
| 2582 | [pass] feature LAB-020 pass criteria present | pass |
| 2583 | [pass] feature LAB-021 name present | pass |
| 2584 | [pass] feature LAB-021 UI need 비대상 | pass |
| 2585 | [pass] feature LAB-021 test need 필요 | pass |
| 2586 | [pass] feature LAB-021 test area assigned | pass |
| 2587 | [pass] feature LAB-021 pass criteria present | pass |
| 2588 | [pass] feature LAB-022 name present | pass |
| 2589 | [pass] feature LAB-022 UI need 비대상 | pass |
| 2590 | [pass] feature LAB-022 test need 필요 | pass |
| 2591 | [pass] feature LAB-022 test area assigned | pass |
| 2592 | [pass] feature LAB-022 pass criteria present | pass |
| 2593 | [pass] feature LAB-023 name present | pass |
| 2594 | [pass] feature LAB-023 UI need 비대상 | pass |
| 2595 | [pass] feature LAB-023 test need 필요 | pass |
| 2596 | [pass] feature LAB-023 test area assigned | pass |
| 2597 | [pass] feature LAB-023 pass criteria present | pass |
| 2598 | [pass] feature LAB-024 name present | pass |
| 2599 | [pass] feature LAB-024 UI need 비대상 | pass |
| 2600 | [pass] feature LAB-024 test need 필요 | pass |
| 2601 | [pass] feature LAB-024 test area assigned | pass |
| 2602 | [pass] feature LAB-024 pass criteria present | pass |
| 2603 | [pass] feature LAB-025 name present | pass |
| 2604 | [pass] feature LAB-025 UI need 비대상 | pass |
| 2605 | [pass] feature LAB-025 test need 필요 | pass |
| 2606 | [pass] feature LAB-025 test area assigned | pass |
| 2607 | [pass] feature LAB-025 pass criteria present | pass |
| 2608 | [pass] feature LAB-026 name present | pass |
| 2609 | [pass] feature LAB-026 UI need 비대상 | pass |
| 2610 | [pass] feature LAB-026 test need 필요 | pass |
| 2611 | [pass] feature LAB-026 test area assigned | pass |
| 2612 | [pass] feature LAB-026 pass criteria present | pass |
| 2613 | [pass] feature LAB-027 name present | pass |
| 2614 | [pass] feature LAB-027 UI need 비대상 | pass |
| 2615 | [pass] feature LAB-027 test need 필요 | pass |
| 2616 | [pass] feature LAB-027 test area assigned | pass |
| 2617 | [pass] feature LAB-027 pass criteria present | pass |
| 2618 | [pass] feature LAB-028 name present | pass |
| 2619 | [pass] feature LAB-028 UI need 비대상 | pass |
| 2620 | [pass] feature LAB-028 test need 필요 | pass |
| 2621 | [pass] feature LAB-028 test area assigned | pass |
| 2622 | [pass] feature LAB-028 pass criteria present | pass |
| 2623 | [pass] feature LAB-029 name present | pass |
| 2624 | [pass] feature LAB-029 UI need 비대상 | pass |
| 2625 | [pass] feature LAB-029 test need 필요 | pass |
| 2626 | [pass] feature LAB-029 test area assigned | pass |
| 2627 | [pass] feature LAB-029 pass criteria present | pass |
| 2628 | [pass] feature LAB-030 name present | pass |
| 2629 | [pass] feature LAB-030 UI need 비대상 | pass |
| 2630 | [pass] feature LAB-030 test need 필요 | pass |
| 2631 | [pass] feature LAB-030 test area assigned | pass |
| 2632 | [pass] feature LAB-030 pass criteria present | pass |
| 2633 | [pass] feature LAB-031 name present | pass |
| 2634 | [pass] feature LAB-031 UI need 비대상 | pass |
| 2635 | [pass] feature LAB-031 test need 필요 | pass |
| 2636 | [pass] feature LAB-031 test area assigned | pass |
| 2637 | [pass] feature LAB-031 pass criteria present | pass |
| 2638 | [pass] feature LAB-032 name present | pass |
| 2639 | [pass] feature LAB-032 UI need 비대상 | pass |
| 2640 | [pass] feature LAB-032 test need 필요 | pass |
| 2641 | [pass] feature LAB-032 test area assigned | pass |
| 2642 | [pass] feature LAB-032 pass criteria present | pass |
| 2643 | [pass] feature LAB-033 name present | pass |
| 2644 | [pass] feature LAB-033 UI need 비대상 | pass |
| 2645 | [pass] feature LAB-033 test need 필요 | pass |
| 2646 | [pass] feature LAB-033 test area assigned | pass |
| 2647 | [pass] feature LAB-033 pass criteria present | pass |
| 2648 | [pass] feature LAB-034 name present | pass |
| 2649 | [pass] feature LAB-034 UI need 비대상 | pass |
| 2650 | [pass] feature LAB-034 test need 필요 | pass |
| 2651 | [pass] feature LAB-034 test area assigned | pass |
| 2652 | [pass] feature LAB-034 pass criteria present | pass |
| 2653 | [pass] feature LAB-035 name present | pass |
| 2654 | [pass] feature LAB-035 UI need 비대상 | pass |
| 2655 | [pass] feature LAB-035 test need 필요 | pass |
| 2656 | [pass] feature LAB-035 test area assigned | pass |
| 2657 | [pass] feature LAB-035 pass criteria present | pass |
| 2658 | [pass] feature LAB-036 name present | pass |
| 2659 | [pass] feature LAB-036 UI need 비대상 | pass |
| 2660 | [pass] feature LAB-036 test need 필요 | pass |
| 2661 | [pass] feature LAB-036 test area assigned | pass |
| 2662 | [pass] feature LAB-036 pass criteria present | pass |
| 2663 | [pass] feature LAB-037 name present | pass |
| 2664 | [pass] feature LAB-037 UI need 비대상 | pass |
| 2665 | [pass] feature LAB-037 test need 필요 | pass |
| 2666 | [pass] feature LAB-037 test area assigned | pass |
| 2667 | [pass] feature LAB-037 pass criteria present | pass |
| 2668 | [pass] feature LAB-038 name present | pass |
| 2669 | [pass] feature LAB-038 UI need 비대상 | pass |
| 2670 | [pass] feature LAB-038 test need 필요 | pass |
| 2671 | [pass] feature LAB-038 test area assigned | pass |
| 2672 | [pass] feature LAB-038 pass criteria present | pass |
| 2673 | [pass] feature LAB-039 name present | pass |
| 2674 | [pass] feature LAB-039 UI need 비대상 | pass |
| 2675 | [pass] feature LAB-039 test need 필요 | pass |
| 2676 | [pass] feature LAB-039 test area assigned | pass |
| 2677 | [pass] feature LAB-039 pass criteria present | pass |
| 2678 | [pass] feature LAB-040 name present | pass |
| 2679 | [pass] feature LAB-040 UI need 비대상 | pass |
| 2680 | [pass] feature LAB-040 test need 필요 | pass |
| 2681 | [pass] feature LAB-040 test area assigned | pass |
| 2682 | [pass] feature LAB-040 pass criteria present | pass |
| 2683 | [pass] feature LAB-041 name present | pass |
| 2684 | [pass] feature LAB-041 UI need 비대상 | pass |
| 2685 | [pass] feature LAB-041 test need 필요 | pass |
| 2686 | [pass] feature LAB-041 test area assigned | pass |
| 2687 | [pass] feature LAB-041 pass criteria present | pass |
| 2688 | [pass] feature LAB-042 name present | pass |
| 2689 | [pass] feature LAB-042 UI need 비대상 | pass |
| 2690 | [pass] feature LAB-042 test need 필요 | pass |
| 2691 | [pass] feature LAB-042 test area assigned | pass |
| 2692 | [pass] feature LAB-042 pass criteria present | pass |
| 2693 | [pass] feature LAB-043 name present | pass |
| 2694 | [pass] feature LAB-043 UI need 비대상 | pass |
| 2695 | [pass] feature LAB-043 test need 필요 | pass |
| 2696 | [pass] feature LAB-043 test area assigned | pass |
| 2697 | [pass] feature LAB-043 pass criteria present | pass |
| 2698 | [pass] feature LAB-044 name present | pass |
| 2699 | [pass] feature LAB-044 UI need 비대상 | pass |
| 2700 | [pass] feature LAB-044 test need 필요 | pass |
| 2701 | [pass] feature LAB-044 test area assigned | pass |
| 2702 | [pass] feature LAB-044 pass criteria present | pass |
| 2703 | [pass] feature LAB-045 name present | pass |
| 2704 | [pass] feature LAB-045 UI need 비대상 | pass |
| 2705 | [pass] feature LAB-045 test need 필요 | pass |
| 2706 | [pass] feature LAB-045 test area assigned | pass |
| 2707 | [pass] feature LAB-045 pass criteria present | pass |
| 2708 | [pass] feature LAB-046 name present | pass |
| 2709 | [pass] feature LAB-046 UI need 비대상 | pass |
| 2710 | [pass] feature LAB-046 test need 필요 | pass |
| 2711 | [pass] feature LAB-046 test area assigned | pass |
| 2712 | [pass] feature LAB-046 pass criteria present | pass |
| 2713 | [pass] feature LAB-047 name present | pass |
| 2714 | [pass] feature LAB-047 UI need 비대상 | pass |
| 2715 | [pass] feature LAB-047 test need 필요 | pass |
| 2716 | [pass] feature LAB-047 test area assigned | pass |
| 2717 | [pass] feature LAB-047 pass criteria present | pass |
| 2718 | [pass] feature LAB-048 name present | pass |
| 2719 | [pass] feature LAB-048 UI need 비대상 | pass |
| 2720 | [pass] feature LAB-048 test need 필요 | pass |
| 2721 | [pass] feature LAB-048 test area assigned | pass |
| 2722 | [pass] feature LAB-048 pass criteria present | pass |
| 2723 | [pass] feature LAB-049 name present | pass |
| 2724 | [pass] feature LAB-049 UI need 비대상 | pass |
| 2725 | [pass] feature LAB-049 test need 필요 | pass |
| 2726 | [pass] feature LAB-049 test area assigned | pass |
| 2727 | [pass] feature LAB-049 pass criteria present | pass |
| 2728 | [pass] feature LAB-050 name present | pass |
| 2729 | [pass] feature LAB-050 UI need 비대상 | pass |
| 2730 | [pass] feature LAB-050 test need 필요 | pass |
| 2731 | [pass] feature LAB-050 test area assigned | pass |
| 2732 | [pass] feature LAB-050 pass criteria present | pass |
| 2733 | [pass] feature LAB-051 name present | pass |
| 2734 | [pass] feature LAB-051 UI need 비대상 | pass |
| 2735 | [pass] feature LAB-051 test need 필요 | pass |
| 2736 | [pass] feature LAB-051 test area assigned | pass |
| 2737 | [pass] feature LAB-051 pass criteria present | pass |
| 2738 | [pass] feature LAB-052 name present | pass |
| 2739 | [pass] feature LAB-052 UI need 비대상 | pass |
| 2740 | [pass] feature LAB-052 test need 필요 | pass |
| 2741 | [pass] feature LAB-052 test area assigned | pass |
| 2742 | [pass] feature LAB-052 pass criteria present | pass |
| 2743 | [pass] feature LAB-053 name present | pass |
| 2744 | [pass] feature LAB-053 UI need 비대상 | pass |
| 2745 | [pass] feature LAB-053 test need 필요 | pass |
| 2746 | [pass] feature LAB-053 test area assigned | pass |
| 2747 | [pass] feature LAB-053 pass criteria present | pass |
| 2748 | [pass] feature LAB-054 name present | pass |
| 2749 | [pass] feature LAB-054 UI need 비대상 | pass |
| 2750 | [pass] feature LAB-054 test need 필요 | pass |
| 2751 | [pass] feature LAB-054 test area assigned | pass |
| 2752 | [pass] feature LAB-054 pass criteria present | pass |
| 2753 | [pass] feature LAB-055 name present | pass |
| 2754 | [pass] feature LAB-055 UI need 비대상 | pass |
| 2755 | [pass] feature LAB-055 test need 필요 | pass |
| 2756 | [pass] feature LAB-055 test area assigned | pass |
| 2757 | [pass] feature LAB-055 pass criteria present | pass |
| 2758 | [pass] feature LAB-056 name present | pass |
| 2759 | [pass] feature LAB-056 UI need 비대상 | pass |
| 2760 | [pass] feature LAB-056 test need 필요 | pass |
| 2761 | [pass] feature LAB-056 test area assigned | pass |
| 2762 | [pass] feature LAB-056 pass criteria present | pass |
| 2763 | [pass] feature LAB-057 name present | pass |
| 2764 | [pass] feature LAB-057 UI need 비대상 | pass |
| 2765 | [pass] feature LAB-057 test need 필요 | pass |
| 2766 | [pass] feature LAB-057 test area assigned | pass |
| 2767 | [pass] feature LAB-057 pass criteria present | pass |
| 2768 | [pass] feature LAB-058 name present | pass |
| 2769 | [pass] feature LAB-058 UI need 비대상 | pass |
| 2770 | [pass] feature LAB-058 test need 필요 | pass |
| 2771 | [pass] feature LAB-058 test area assigned | pass |
| 2772 | [pass] feature LAB-058 pass criteria present | pass |
| 2773 | [pass] feature LAB-059 name present | pass |
| 2774 | [pass] feature LAB-059 UI need 비대상 | pass |
| 2775 | [pass] feature LAB-059 test need 필요 | pass |
| 2776 | [pass] feature LAB-059 test area assigned | pass |
| 2777 | [pass] feature LAB-059 pass criteria present | pass |
| 2778 | [pass] feature LAB-060 name present | pass |
| 2779 | [pass] feature LAB-060 UI need 비대상 | pass |
| 2780 | [pass] feature LAB-060 test need 필요 | pass |
| 2781 | [pass] feature LAB-060 test area assigned | pass |
| 2782 | [pass] feature LAB-060 pass criteria present | pass |
| 2783 | [pass] feature LAB-061 name present | pass |
| 2784 | [pass] feature LAB-061 UI need 비대상 | pass |
| 2785 | [pass] feature LAB-061 test need 필요 | pass |
| 2786 | [pass] feature LAB-061 test area assigned | pass |
| 2787 | [pass] feature LAB-061 pass criteria present | pass |
| 2788 | [pass] feature LAB-062 name present | pass |
| 2789 | [pass] feature LAB-062 UI need 비대상 | pass |
| 2790 | [pass] feature LAB-062 test need 필요 | pass |
| 2791 | [pass] feature LAB-062 test area assigned | pass |
| 2792 | [pass] feature LAB-062 pass criteria present | pass |
| 2793 | [pass] feature LAB-063 name present | pass |
| 2794 | [pass] feature LAB-063 UI need 비대상 | pass |
| 2795 | [pass] feature LAB-063 test need 필요 | pass |
| 2796 | [pass] feature LAB-063 test area assigned | pass |
| 2797 | [pass] feature LAB-063 pass criteria present | pass |
| 2798 | [pass] feature LAB-064 name present | pass |
| 2799 | [pass] feature LAB-064 UI need 비대상 | pass |
| 2800 | [pass] feature LAB-064 test need 필요 | pass |
| 2801 | [pass] feature LAB-064 test area assigned | pass |
| 2802 | [pass] feature LAB-064 pass criteria present | pass |
| 2803 | [pass] feature LAB-065 name present | pass |
| 2804 | [pass] feature LAB-065 UI need 비대상 | pass |
| 2805 | [pass] feature LAB-065 test need 필요 | pass |
| 2806 | [pass] feature LAB-065 test area assigned | pass |
| 2807 | [pass] feature LAB-065 pass criteria present | pass |
| 2808 | [pass] feature LAB-066 name present | pass |
| 2809 | [pass] feature LAB-066 UI need 비대상 | pass |
| 2810 | [pass] feature LAB-066 test need 필요 | pass |
| 2811 | [pass] feature LAB-066 test area assigned | pass |
| 2812 | [pass] feature LAB-066 pass criteria present | pass |
| 2813 | [pass] feature LAB-067 name present | pass |
| 2814 | [pass] feature LAB-067 UI need 비대상 | pass |
| 2815 | [pass] feature LAB-067 test need 필요 | pass |
| 2816 | [pass] feature LAB-067 test area assigned | pass |
| 2817 | [pass] feature LAB-067 pass criteria present | pass |
| 2818 | [pass] feature LAB-068 name present | pass |
| 2819 | [pass] feature LAB-068 UI need 비대상 | pass |
| 2820 | [pass] feature LAB-068 test need 필요 | pass |
| 2821 | [pass] feature LAB-068 test area assigned | pass |
| 2822 | [pass] feature LAB-068 pass criteria present | pass |
| 2823 | [pass] feature LAB-069 name present | pass |
| 2824 | [pass] feature LAB-069 UI need 비대상 | pass |
| 2825 | [pass] feature LAB-069 test need 필요 | pass |
| 2826 | [pass] feature LAB-069 test area assigned | pass |
| 2827 | [pass] feature LAB-069 pass criteria present | pass |
| 2828 | [pass] feature LAB-070 name present | pass |
| 2829 | [pass] feature LAB-070 UI need 비대상 | pass |
| 2830 | [pass] feature LAB-070 test need 필요 | pass |
| 2831 | [pass] feature LAB-070 test area assigned | pass |
| 2832 | [pass] feature LAB-070 pass criteria present | pass |
| 2833 | [pass] feature LAB-071 name present | pass |
| 2834 | [pass] feature LAB-071 UI need 비대상 | pass |
| 2835 | [pass] feature LAB-071 test need 필요 | pass |
| 2836 | [pass] feature LAB-071 test area assigned | pass |
| 2837 | [pass] feature LAB-071 pass criteria present | pass |
| 2838 | [pass] feature LAB-072 name present | pass |
| 2839 | [pass] feature LAB-072 UI need 비대상 | pass |
| 2840 | [pass] feature LAB-072 test need 필요 | pass |
| 2841 | [pass] feature LAB-072 test area assigned | pass |
| 2842 | [pass] feature LAB-072 pass criteria present | pass |
| 2843 | [pass] feature LAB-073 name present | pass |
| 2844 | [pass] feature LAB-073 UI need 비대상 | pass |
| 2845 | [pass] feature LAB-073 test need 필요 | pass |
| 2846 | [pass] feature LAB-073 test area assigned | pass |
| 2847 | [pass] feature LAB-073 pass criteria present | pass |
| 2848 | [pass] feature LAB-074 name present | pass |
| 2849 | [pass] feature LAB-074 UI need 비대상 | pass |
| 2850 | [pass] feature LAB-074 test need 필요 | pass |
| 2851 | [pass] feature LAB-074 test area assigned | pass |
| 2852 | [pass] feature LAB-074 pass criteria present | pass |
| 2853 | [pass] feature LAB-075 name present | pass |
| 2854 | [pass] feature LAB-075 UI need 비대상 | pass |
| 2855 | [pass] feature LAB-075 test need 필요 | pass |
| 2856 | [pass] feature LAB-075 test area assigned | pass |
| 2857 | [pass] feature LAB-075 pass criteria present | pass |
| 2858 | [pass] feature LAB-076 name present | pass |
| 2859 | [pass] feature LAB-076 UI need 비대상 | pass |
| 2860 | [pass] feature LAB-076 test need 필요 | pass |
| 2861 | [pass] feature LAB-076 test area assigned | pass |
| 2862 | [pass] feature LAB-076 pass criteria present | pass |
| 2863 | [pass] feature LAB-077 name present | pass |
| 2864 | [pass] feature LAB-077 UI need 비대상 | pass |
| 2865 | [pass] feature LAB-077 test need 필요 | pass |
| 2866 | [pass] feature LAB-077 test area assigned | pass |
| 2867 | [pass] feature LAB-077 pass criteria present | pass |
| 2868 | [pass] feature LAB-078 name present | pass |
| 2869 | [pass] feature LAB-078 UI need 비대상 | pass |
| 2870 | [pass] feature LAB-078 test need 필요 | pass |
| 2871 | [pass] feature LAB-078 test area assigned | pass |
| 2872 | [pass] feature LAB-078 pass criteria present | pass |
| 2873 | [pass] feature LAB-079 name present | pass |
| 2874 | [pass] feature LAB-079 UI need 비대상 | pass |
| 2875 | [pass] feature LAB-079 test need 필요 | pass |
| 2876 | [pass] feature LAB-079 test area assigned | pass |
| 2877 | [pass] feature LAB-079 pass criteria present | pass |
| 2878 | [pass] feature LAB-080 name present | pass |
| 2879 | [pass] feature LAB-080 UI need 비대상 | pass |
| 2880 | [pass] feature LAB-080 test need 필요 | pass |
| 2881 | [pass] feature LAB-080 test area assigned | pass |
| 2882 | [pass] feature LAB-080 pass criteria present | pass |
| 2883 | [pass] feature LAB-081 name present | pass |
| 2884 | [pass] feature LAB-081 UI need 비대상 | pass |
| 2885 | [pass] feature LAB-081 test need 필요 | pass |
| 2886 | [pass] feature LAB-081 test area assigned | pass |
| 2887 | [pass] feature LAB-081 pass criteria present | pass |
| 2888 | [pass] feature LAB-082 name present | pass |
| 2889 | [pass] feature LAB-082 UI need 비대상 | pass |
| 2890 | [pass] feature LAB-082 test need 필요 | pass |
| 2891 | [pass] feature LAB-082 test area assigned | pass |
| 2892 | [pass] feature LAB-082 pass criteria present | pass |
| 2893 | [pass] feature LAB-083 name present | pass |
| 2894 | [pass] feature LAB-083 UI need 비대상 | pass |
| 2895 | [pass] feature LAB-083 test need 필요 | pass |
| 2896 | [pass] feature LAB-083 test area assigned | pass |
| 2897 | [pass] feature LAB-083 pass criteria present | pass |
| 2898 | [pass] feature LAB-084 name present | pass |
| 2899 | [pass] feature LAB-084 UI need 비대상 | pass |
| 2900 | [pass] feature LAB-084 test need 필요 | pass |
| 2901 | [pass] feature LAB-084 test area assigned | pass |
| 2902 | [pass] feature LAB-084 pass criteria present | pass |
| 2903 | [pass] feature LAB-085 name present | pass |
| 2904 | [pass] feature LAB-085 UI need 비대상 | pass |
| 2905 | [pass] feature LAB-085 test need 필요 | pass |
| 2906 | [pass] feature LAB-085 test area assigned | pass |
| 2907 | [pass] feature LAB-085 pass criteria present | pass |
| 2908 | [pass] feature LAB-086 name present | pass |
| 2909 | [pass] feature LAB-086 UI need 비대상 | pass |
| 2910 | [pass] feature LAB-086 test need 필요 | pass |
| 2911 | [pass] feature LAB-086 test area assigned | pass |
| 2912 | [pass] feature LAB-086 pass criteria present | pass |
| 2913 | [pass] feature LAB-087 name present | pass |
| 2914 | [pass] feature LAB-087 UI need 비대상 | pass |
| 2915 | [pass] feature LAB-087 test need 필요 | pass |
| 2916 | [pass] feature LAB-087 test area assigned | pass |
| 2917 | [pass] feature LAB-087 pass criteria present | pass |
| 2918 | [pass] feature LAB-088 name present | pass |
| 2919 | [pass] feature LAB-088 UI need 비대상 | pass |
| 2920 | [pass] feature LAB-088 test need 필요 | pass |
| 2921 | [pass] feature LAB-088 test area assigned | pass |
| 2922 | [pass] feature LAB-088 pass criteria present | pass |
| 2923 | [pass] feature LAB-089 name present | pass |
| 2924 | [pass] feature LAB-089 UI need 비대상 | pass |
| 2925 | [pass] feature LAB-089 test need 필요 | pass |
| 2926 | [pass] feature LAB-089 test area assigned | pass |
| 2927 | [pass] feature LAB-089 pass criteria present | pass |
| 2928 | [pass] feature LAB-090 name present | pass |
| 2929 | [pass] feature LAB-090 UI need 비대상 | pass |
| 2930 | [pass] feature LAB-090 test need 필요 | pass |
| 2931 | [pass] feature LAB-090 test area assigned | pass |
| 2932 | [pass] feature LAB-090 pass criteria present | pass |
| 2933 | [pass] feature LAB-091 name present | pass |
| 2934 | [pass] feature LAB-091 UI need 비대상 | pass |
| 2935 | [pass] feature LAB-091 test need 필요 | pass |
| 2936 | [pass] feature LAB-091 test area assigned | pass |
| 2937 | [pass] feature LAB-091 pass criteria present | pass |
| 2938 | [pass] feature LAB-092 name present | pass |
| 2939 | [pass] feature LAB-092 UI need 비대상 | pass |
| 2940 | [pass] feature LAB-092 test need 필요 | pass |
| 2941 | [pass] feature LAB-092 test area assigned | pass |
| 2942 | [pass] feature LAB-092 pass criteria present | pass |
| 2943 | [pass] feature LAB-093 name present | pass |
| 2944 | [pass] feature LAB-093 UI need 비대상 | pass |
| 2945 | [pass] feature LAB-093 test need 필요 | pass |
| 2946 | [pass] feature LAB-093 test area assigned | pass |
| 2947 | [pass] feature LAB-093 pass criteria present | pass |
| 2948 | [pass] feature LAB-094 name present | pass |
| 2949 | [pass] feature LAB-094 UI need 비대상 | pass |
| 2950 | [pass] feature LAB-094 test need 필요 | pass |
| 2951 | [pass] feature LAB-094 test area assigned | pass |
| 2952 | [pass] feature LAB-094 pass criteria present | pass |
| 2953 | [pass] feature LAB-095 name present | pass |
| 2954 | [pass] feature LAB-095 UI need 비대상 | pass |
| 2955 | [pass] feature LAB-095 test need 필요 | pass |
| 2956 | [pass] feature LAB-095 test area assigned | pass |
| 2957 | [pass] feature LAB-095 pass criteria present | pass |
| 2958 | [pass] feature LAB-096 name present | pass |
| 2959 | [pass] feature LAB-096 UI need 비대상 | pass |
| 2960 | [pass] feature LAB-096 test need 필요 | pass |
| 2961 | [pass] feature LAB-096 test area assigned | pass |
| 2962 | [pass] feature LAB-096 pass criteria present | pass |
| 2963 | [pass] feature LAB-097 name present | pass |
| 2964 | [pass] feature LAB-097 UI need 비대상 | pass |
| 2965 | [pass] feature LAB-097 test need 필요 | pass |
| 2966 | [pass] feature LAB-097 test area assigned | pass |
| 2967 | [pass] feature LAB-097 pass criteria present | pass |
| 2968 | [pass] feature LAB-098 name present | pass |
| 2969 | [pass] feature LAB-098 UI need 비대상 | pass |
| 2970 | [pass] feature LAB-098 test need 필요 | pass |
| 2971 | [pass] feature LAB-098 test area assigned | pass |
| 2972 | [pass] feature LAB-098 pass criteria present | pass |
| 2973 | [pass] feature LAB-099 name present | pass |
| 2974 | [pass] feature LAB-099 UI need 비대상 | pass |
| 2975 | [pass] feature LAB-099 test need 필요 | pass |
| 2976 | [pass] feature LAB-099 test area assigned | pass |
| 2977 | [pass] feature LAB-099 pass criteria present | pass |
| 2978 | [pass] feature LAB-100 name present | pass |
| 2979 | [pass] feature LAB-100 UI need 비대상 | pass |
| 2980 | [pass] feature LAB-100 test need 필요 | pass |
| 2981 | [pass] feature LAB-100 test area assigned | pass |
| 2982 | [pass] feature LAB-100 pass criteria present | pass |
| 2983 | [pass] feature LAB-101 name present | pass |
| 2984 | [pass] feature LAB-101 UI need 비대상 | pass |
| 2985 | [pass] feature LAB-101 test need 필요 | pass |
| 2986 | [pass] feature LAB-101 test area assigned | pass |
| 2987 | [pass] feature LAB-101 pass criteria present | pass |
| 2988 | [pass] feature LAB-102 name present | pass |
| 2989 | [pass] feature LAB-102 UI need 비대상 | pass |
| 2990 | [pass] feature LAB-102 test need 필요 | pass |
| 2991 | [pass] feature LAB-102 test area assigned | pass |
| 2992 | [pass] feature LAB-102 pass criteria present | pass |
| 2993 | [pass] feature LAB-103 name present | pass |
| 2994 | [pass] feature LAB-103 UI need 비대상 | pass |
| 2995 | [pass] feature LAB-103 test need 필요 | pass |
| 2996 | [pass] feature LAB-103 test area assigned | pass |
| 2997 | [pass] feature LAB-103 pass criteria present | pass |
| 2998 | [pass] feature LAB-104 name present | pass |
| 2999 | [pass] feature LAB-104 UI need 비대상 | pass |
| 3000 | [pass] feature LAB-104 test need 필요 | pass |
| 3001 | [pass] feature LAB-104 test area assigned | pass |
| 3002 | [pass] feature LAB-104 pass criteria present | pass |
| 3003 | [pass] feature LAB-105 name present | pass |
| 3004 | [pass] feature LAB-105 UI need 비대상 | pass |
| 3005 | [pass] feature LAB-105 test need 필요 | pass |
| 3006 | [pass] feature LAB-105 test area assigned | pass |
| 3007 | [pass] feature LAB-105 pass criteria present | pass |
| 3008 | [pass] feature LAB-106 name present | pass |
| 3009 | [pass] feature LAB-106 UI need 비대상 | pass |
| 3010 | [pass] feature LAB-106 test need 필요 | pass |
| 3011 | [pass] feature LAB-106 test area assigned | pass |
| 3012 | [pass] feature LAB-106 pass criteria present | pass |
| 3013 | [pass] feature LAB-107 name present | pass |
| 3014 | [pass] feature LAB-107 UI need 비대상 | pass |
| 3015 | [pass] feature LAB-107 test need 필요 | pass |
| 3016 | [pass] feature LAB-107 test area assigned | pass |
| 3017 | [pass] feature LAB-107 pass criteria present | pass |
| 3018 | [pass] feature LAB-108 name present | pass |
| 3019 | [pass] feature LAB-108 UI need 비대상 | pass |
| 3020 | [pass] feature LAB-108 test need 필요 | pass |
| 3021 | [pass] feature LAB-108 test area assigned | pass |
| 3022 | [pass] feature LAB-108 pass criteria present | pass |
| 3023 | [pass] feature LAB-109 name present | pass |
| 3024 | [pass] feature LAB-109 UI need 비대상 | pass |
| 3025 | [pass] feature LAB-109 test need 필요 | pass |
| 3026 | [pass] feature LAB-109 test area assigned | pass |
| 3027 | [pass] feature LAB-109 pass criteria present | pass |
| 3028 | [pass] feature LAB-110 name present | pass |
| 3029 | [pass] feature LAB-110 UI need 비대상 | pass |
| 3030 | [pass] feature LAB-110 test need 필요 | pass |
| 3031 | [pass] feature LAB-110 test area assigned | pass |
| 3032 | [pass] feature LAB-110 pass criteria present | pass |
| 3033 | [pass] feature LAB-111 name present | pass |
| 3034 | [pass] feature LAB-111 UI need 비대상 | pass |
| 3035 | [pass] feature LAB-111 test need 필요 | pass |
| 3036 | [pass] feature LAB-111 test area assigned | pass |
| 3037 | [pass] feature LAB-111 pass criteria present | pass |
| 3038 | [pass] feature LAB-112 name present | pass |
| 3039 | [pass] feature LAB-112 UI need 비대상 | pass |
| 3040 | [pass] feature LAB-112 test need 필요 | pass |
| 3041 | [pass] feature LAB-112 test area assigned | pass |
| 3042 | [pass] feature LAB-112 pass criteria present | pass |
| 3043 | [pass] feature LAB-113 name present | pass |
| 3044 | [pass] feature LAB-113 UI need 비대상 | pass |
| 3045 | [pass] feature LAB-113 test need 필요 | pass |
| 3046 | [pass] feature LAB-113 test area assigned | pass |
| 3047 | [pass] feature LAB-113 pass criteria present | pass |
| 3048 | [pass] feature LAB-114 name present | pass |
| 3049 | [pass] feature LAB-114 UI need 비대상 | pass |
| 3050 | [pass] feature LAB-114 test need 필요 | pass |
| 3051 | [pass] feature LAB-114 test area assigned | pass |
| 3052 | [pass] feature LAB-114 pass criteria present | pass |
| 3053 | [pass] feature LAB-115 name present | pass |
| 3054 | [pass] feature LAB-115 UI need 비대상 | pass |
| 3055 | [pass] feature LAB-115 test need 필요 | pass |
| 3056 | [pass] feature LAB-115 test area assigned | pass |
| 3057 | [pass] feature LAB-115 pass criteria present | pass |
| 3058 | [pass] feature LAB-116 name present | pass |
| 3059 | [pass] feature LAB-116 UI need 비대상 | pass |
| 3060 | [pass] feature LAB-116 test need 필요 | pass |
| 3061 | [pass] feature LAB-116 test area assigned | pass |
| 3062 | [pass] feature LAB-116 pass criteria present | pass |
| 3063 | [pass] feature LAB-117 name present | pass |
| 3064 | [pass] feature LAB-117 UI need 비대상 | pass |
| 3065 | [pass] feature LAB-117 test need 필요 | pass |
| 3066 | [pass] feature LAB-117 test area assigned | pass |
| 3067 | [pass] feature LAB-117 pass criteria present | pass |
| 3068 | [pass] feature LAB-118 name present | pass |
| 3069 | [pass] feature LAB-118 UI need 비대상 | pass |
| 3070 | [pass] feature LAB-118 test need 필요 | pass |
| 3071 | [pass] feature LAB-118 test area assigned | pass |
| 3072 | [pass] feature LAB-118 pass criteria present | pass |
| 3073 | [pass] feature LAB-119 name present | pass |
| 3074 | [pass] feature LAB-119 UI need 비대상 | pass |
| 3075 | [pass] feature LAB-119 test need 필요 | pass |
| 3076 | [pass] feature LAB-119 test area assigned | pass |
| 3077 | [pass] feature LAB-119 pass criteria present | pass |
| 3078 | [pass] feature LAB-120 name present | pass |
| 3079 | [pass] feature LAB-120 UI need 비대상 | pass |
| 3080 | [pass] feature LAB-120 test need 필요 | pass |
| 3081 | [pass] feature LAB-120 test area assigned | pass |
| 3082 | [pass] feature LAB-120 pass criteria present | pass |
| 3083 | [pass] feature LAB-121 name present | pass |
| 3084 | [pass] feature LAB-121 UI need 비대상 | pass |
| 3085 | [pass] feature LAB-121 test need 필요 | pass |
| 3086 | [pass] feature LAB-121 test area assigned | pass |
| 3087 | [pass] feature LAB-121 pass criteria present | pass |
| 3088 | [pass] feature LAB-122 name present | pass |
| 3089 | [pass] feature LAB-122 UI need 비대상 | pass |
| 3090 | [pass] feature LAB-122 test need 필요 | pass |
| 3091 | [pass] feature LAB-122 test area assigned | pass |
| 3092 | [pass] feature LAB-122 pass criteria present | pass |
| 3093 | [pass] feature LAB-123 name present | pass |
| 3094 | [pass] feature LAB-123 UI need 비대상 | pass |
| 3095 | [pass] feature LAB-123 test need 필요 | pass |
| 3096 | [pass] feature LAB-123 test area assigned | pass |
| 3097 | [pass] feature LAB-123 pass criteria present | pass |
| 3098 | [pass] feature LAB-124 name present | pass |
| 3099 | [pass] feature LAB-124 UI need 비대상 | pass |
| 3100 | [pass] feature LAB-124 test need 필요 | pass |
| 3101 | [pass] feature LAB-124 test area assigned | pass |
| 3102 | [pass] feature LAB-124 pass criteria present | pass |
| 3103 | [pass] feature LAB-125 name present | pass |
| 3104 | [pass] feature LAB-125 UI need 비대상 | pass |
| 3105 | [pass] feature LAB-125 test need 필요 | pass |
| 3106 | [pass] feature LAB-125 test area assigned | pass |
| 3107 | [pass] feature LAB-125 pass criteria present | pass |
| 3108 | [pass] feature LAB-126 name present | pass |
| 3109 | [pass] feature LAB-126 UI need 비대상 | pass |
| 3110 | [pass] feature LAB-126 test need 필요 | pass |
| 3111 | [pass] feature LAB-126 test area assigned | pass |
| 3112 | [pass] feature LAB-126 pass criteria present | pass |
| 3113 | [pass] feature SAFE-001 name present | pass |
| 3114 | [pass] feature SAFE-001 UI need 비대상 | pass |
| 3115 | [pass] feature SAFE-001 test need 필요 | pass |
| 3116 | [pass] feature SAFE-001 test area assigned | pass |
| 3117 | [pass] feature SAFE-001 pass criteria present | pass |
| 3118 | [pass] feature SAFE-002 name present | pass |
| 3119 | [pass] feature SAFE-002 UI need 비대상 | pass |
| 3120 | [pass] feature SAFE-002 test need 필요 | pass |
| 3121 | [pass] feature SAFE-002 test area assigned | pass |
| 3122 | [pass] feature SAFE-002 pass criteria present | pass |
| 3123 | [pass] feature SAFE-003 name present | pass |
| 3124 | [pass] feature SAFE-003 UI need 비대상 | pass |
| 3125 | [pass] feature SAFE-003 test need 필요 | pass |
| 3126 | [pass] feature SAFE-003 test area assigned | pass |
| 3127 | [pass] feature SAFE-003 pass criteria present | pass |
| 3128 | [pass] feature SAFE-004 name present | pass |
| 3129 | [pass] feature SAFE-004 UI need 비대상 | pass |
| 3130 | [pass] feature SAFE-004 test need 필요 | pass |
| 3131 | [pass] feature SAFE-004 test area assigned | pass |
| 3132 | [pass] feature SAFE-004 pass criteria present | pass |
| 3133 | [pass] feature SAFE-005 name present | pass |
| 3134 | [pass] feature SAFE-005 UI need 비대상 | pass |
| 3135 | [pass] feature SAFE-005 test need 필요 | pass |
| 3136 | [pass] feature SAFE-005 test area assigned | pass |
| 3137 | [pass] feature SAFE-005 pass criteria present | pass |
| 3138 | [pass] feature SAFE-006 name present | pass |
| 3139 | [pass] feature SAFE-006 UI need 비대상 | pass |
| 3140 | [pass] feature SAFE-006 test need 필요 | pass |
| 3141 | [pass] feature SAFE-006 test area assigned | pass |
| 3142 | [pass] feature SAFE-006 pass criteria present | pass |
| 3143 | [pass] feature SAFE-007 name present | pass |
| 3144 | [pass] feature SAFE-007 UI need 비대상 | pass |
| 3145 | [pass] feature SAFE-007 test need 필요 | pass |
| 3146 | [pass] feature SAFE-007 test area assigned | pass |
| 3147 | [pass] feature SAFE-007 pass criteria present | pass |
| 3148 | [pass] feature SAFE-008 name present | pass |
| 3149 | [pass] feature SAFE-008 UI need 비대상 | pass |
| 3150 | [pass] feature SAFE-008 test need 필요 | pass |
| 3151 | [pass] feature SAFE-008 test area assigned | pass |
| 3152 | [pass] feature SAFE-008 pass criteria present | pass |
| 3153 | [pass] feature SAFE-009 name present | pass |
| 3154 | [pass] feature SAFE-009 UI need 비대상 | pass |
| 3155 | [pass] feature SAFE-009 test need 필요 | pass |
| 3156 | [pass] feature SAFE-009 test area assigned | pass |
| 3157 | [pass] feature SAFE-009 pass criteria present | pass |
| 3158 | [pass] feature SAFE-010 name present | pass |
| 3159 | [pass] feature SAFE-010 UI need 비대상 | pass |
| 3160 | [pass] feature SAFE-010 test need 필요 | pass |
| 3161 | [pass] feature SAFE-010 test area assigned | pass |
| 3162 | [pass] feature SAFE-010 pass criteria present | pass |
| 3163 | [pass] feature SAFE-011 name present | pass |
| 3164 | [pass] feature SAFE-011 UI need 비대상 | pass |
| 3165 | [pass] feature SAFE-011 test need 필요 | pass |
| 3166 | [pass] feature SAFE-011 test area assigned | pass |
| 3167 | [pass] feature SAFE-011 pass criteria present | pass |
| 3168 | [pass] feature SAFE-012 name present | pass |
| 3169 | [pass] feature SAFE-012 UI need 비대상 | pass |
| 3170 | [pass] feature SAFE-012 test need 필요 | pass |
| 3171 | [pass] feature SAFE-012 test area assigned | pass |
| 3172 | [pass] feature SAFE-012 pass criteria present | pass |
| 3173 | [pass] feature SAFE-013 name present | pass |
| 3174 | [pass] feature SAFE-013 UI need 비대상 | pass |
| 3175 | [pass] feature SAFE-013 test need 필요 | pass |
| 3176 | [pass] feature SAFE-013 test area assigned | pass |
| 3177 | [pass] feature SAFE-013 pass criteria present | pass |
| 3178 | [pass] feature SAFE-014 name present | pass |
| 3179 | [pass] feature SAFE-014 UI need 비대상 | pass |
| 3180 | [pass] feature SAFE-014 test need 필요 | pass |
| 3181 | [pass] feature SAFE-014 test area assigned | pass |
| 3182 | [pass] feature SAFE-014 pass criteria present | pass |
| 3183 | [pass] feature SAFE-015 name present | pass |
| 3184 | [pass] feature SAFE-015 UI need 필요 | pass |
| 3185 | [pass] feature SAFE-015 test need 필요 | pass |
| 3186 | [pass] feature SAFE-015 test area assigned | pass |
| 3187 | [pass] feature SAFE-015 pass criteria present | pass |
| 3188 | [pass] feature SAFE-016 name present | pass |
| 3189 | [pass] feature SAFE-016 UI need 간접 | pass |
| 3190 | [pass] feature SAFE-016 test need 필요 | pass |
| 3191 | [pass] feature SAFE-016 test area assigned | pass |
| 3192 | [pass] feature SAFE-016 pass criteria present | pass |
| 3193 | [pass] feature SAFE-017 name present | pass |
| 3194 | [pass] feature SAFE-017 UI need 간접 | pass |
| 3195 | [pass] feature SAFE-017 test need 필요 | pass |
| 3196 | [pass] feature SAFE-017 test area assigned | pass |
| 3197 | [pass] feature SAFE-017 pass criteria present | pass |
| 3198 | [pass] feature SAFE-018 name present | pass |
| 3199 | [pass] feature SAFE-018 UI need 필요 | pass |
| 3200 | [pass] feature SAFE-018 test need 필요 | pass |
| 3201 | [pass] feature SAFE-018 test area assigned | pass |
| 3202 | [pass] feature SAFE-018 pass criteria present | pass |
| 3203 | [pass] feature SAFE-019 name present | pass |
| 3204 | [pass] feature SAFE-019 UI need 필요 | pass |
| 3205 | [pass] feature SAFE-019 test need 필요 | pass |
| 3206 | [pass] feature SAFE-019 test area assigned | pass |
| 3207 | [pass] feature SAFE-019 pass criteria present | pass |
| 3208 | [pass] feature SAFE-020 name present | pass |
| 3209 | [pass] feature SAFE-020 UI need 필요 | pass |
| 3210 | [pass] feature SAFE-020 test need 필요 | pass |
| 3211 | [pass] feature SAFE-020 test area assigned | pass |
| 3212 | [pass] feature SAFE-020 pass criteria present | pass |
| 3213 | [pass] feature SAFE-021 name present | pass |
| 3214 | [pass] feature SAFE-021 UI need 필요 | pass |
| 3215 | [pass] feature SAFE-021 test need 필요 | pass |
| 3216 | [pass] feature SAFE-021 test area assigned | pass |
| 3217 | [pass] feature SAFE-021 pass criteria present | pass |
| 3218 | [pass] feature SAFE-022 name present | pass |
| 3219 | [pass] feature SAFE-022 UI need 비대상 | pass |
| 3220 | [pass] feature SAFE-022 test need 필요 | pass |
| 3221 | [pass] feature SAFE-022 test area assigned | pass |
| 3222 | [pass] feature SAFE-022 pass criteria present | pass |
| 3223 | [pass] feature SAFE-023 name present | pass |
| 3224 | [pass] feature SAFE-023 UI need 비대상 | pass |
| 3225 | [pass] feature SAFE-023 test need 필요 | pass |
| 3226 | [pass] feature SAFE-023 test area assigned | pass |
| 3227 | [pass] feature SAFE-023 pass criteria present | pass |
| 3228 | [pass] feature SAFE-024 name present | pass |
| 3229 | [pass] feature SAFE-024 UI need 필요 | pass |
| 3230 | [pass] feature SAFE-024 test need 필요 | pass |
| 3231 | [pass] feature SAFE-024 test area assigned | pass |
| 3232 | [pass] feature SAFE-024 pass criteria present | pass |
| 3233 | [pass] feature SAFE-025 name present | pass |
| 3234 | [pass] feature SAFE-025 UI need 비대상 | pass |
| 3235 | [pass] feature SAFE-025 test need 필요 | pass |
| 3236 | [pass] feature SAFE-025 test area assigned | pass |
| 3237 | [pass] feature SAFE-025 pass criteria present | pass |
| 3238 | [pass] feature SAFE-026 name present | pass |
| 3239 | [pass] feature SAFE-026 UI need 비대상 | pass |
| 3240 | [pass] feature SAFE-026 test need 필요 | pass |
| 3241 | [pass] feature SAFE-026 test area assigned | pass |
| 3242 | [pass] feature SAFE-026 pass criteria present | pass |
| 3243 | [pass] feature SAFE-027 name present | pass |
| 3244 | [pass] feature SAFE-027 UI need 비대상 | pass |
| 3245 | [pass] feature SAFE-027 test need 필요 | pass |
| 3246 | [pass] feature SAFE-027 test area assigned | pass |
| 3247 | [pass] feature SAFE-027 pass criteria present | pass |
| 3248 | [pass] feature SAFE-028 name present | pass |
| 3249 | [pass] feature SAFE-028 UI need 필요 | pass |
| 3250 | [pass] feature SAFE-028 test need 필요 | pass |
| 3251 | [pass] feature SAFE-028 test area assigned | pass |
| 3252 | [pass] feature SAFE-028 pass criteria present | pass |
| 3253 | [pass] feature SAFE-029 name present | pass |
| 3254 | [pass] feature SAFE-029 UI need 비대상 | pass |
| 3255 | [pass] feature SAFE-029 test need 필요 | pass |
| 3256 | [pass] feature SAFE-029 test area assigned | pass |
| 3257 | [pass] feature SAFE-029 pass criteria present | pass |
| 3258 | [pass] feature SAFE-030 name present | pass |
| 3259 | [pass] feature SAFE-030 UI need 비대상 | pass |
| 3260 | [pass] feature SAFE-030 test need 필요 | pass |
| 3261 | [pass] feature SAFE-030 test area assigned | pass |
| 3262 | [pass] feature SAFE-030 pass criteria present | pass |
| 3263 | [pass] feature SAFE-031 name present | pass |
| 3264 | [pass] feature SAFE-031 UI need 필요 | pass |
| 3265 | [pass] feature SAFE-031 test need 필요 | pass |
| 3266 | [pass] feature SAFE-031 test area assigned | pass |
| 3267 | [pass] feature SAFE-031 pass criteria present | pass |
| 3268 | [pass] feature SAFE-032 name present | pass |
| 3269 | [pass] feature SAFE-032 UI need 비대상 | pass |
| 3270 | [pass] feature SAFE-032 test need 필요 | pass |
| 3271 | [pass] feature SAFE-032 test area assigned | pass |
| 3272 | [pass] feature SAFE-032 pass criteria present | pass |
| 3273 | [pass] feature SAFE-033 name present | pass |
| 3274 | [pass] feature SAFE-033 UI need 필요 | pass |
| 3275 | [pass] feature SAFE-033 test need 필요 | pass |
| 3276 | [pass] feature SAFE-033 test area assigned | pass |
| 3277 | [pass] feature SAFE-033 pass criteria present | pass |
| 3278 | [pass] feature SAFE-034 name present | pass |
| 3279 | [pass] feature SAFE-034 UI need 비대상 | pass |
| 3280 | [pass] feature SAFE-034 test need 필요 | pass |
| 3281 | [pass] feature SAFE-034 test area assigned | pass |
| 3282 | [pass] feature SAFE-034 pass criteria present | pass |
| 3283 | [pass] feature SAFE-035 name present | pass |
| 3284 | [pass] feature SAFE-035 UI need 비대상 | pass |
| 3285 | [pass] feature SAFE-035 test need 필요 | pass |
| 3286 | [pass] feature SAFE-035 test area assigned | pass |
| 3287 | [pass] feature SAFE-035 pass criteria present | pass |
| 3288 | [pass] feature SAFE-036 name present | pass |
| 3289 | [pass] feature SAFE-036 UI need 비대상 | pass |
| 3290 | [pass] feature SAFE-036 test need 필요 | pass |
| 3291 | [pass] feature SAFE-036 test area assigned | pass |
| 3292 | [pass] feature SAFE-036 pass criteria present | pass |
| 3293 | [pass] feature SAFE-037 name present | pass |
| 3294 | [pass] feature SAFE-037 UI need 비대상 | pass |
| 3295 | [pass] feature SAFE-037 test need 필요 | pass |
| 3296 | [pass] feature SAFE-037 test area assigned | pass |
| 3297 | [pass] feature SAFE-037 pass criteria present | pass |
| 3298 | [pass] feature SAFE-038 name present | pass |
| 3299 | [pass] feature SAFE-038 UI need 필요 | pass |
| 3300 | [pass] feature SAFE-038 test need 필요 | pass |
| 3301 | [pass] feature SAFE-038 test area assigned | pass |
| 3302 | [pass] feature SAFE-038 pass criteria present | pass |
| 3303 | [pass] feature SAFE-039 name present | pass |
| 3304 | [pass] feature SAFE-039 UI need 비대상 | pass |
| 3305 | [pass] feature SAFE-039 test need 필요 | pass |
| 3306 | [pass] feature SAFE-039 test area assigned | pass |
| 3307 | [pass] feature SAFE-039 pass criteria present | pass |
| 3308 | [pass] feature SAFE-040 name present | pass |
| 3309 | [pass] feature SAFE-040 UI need 비대상 | pass |
| 3310 | [pass] feature SAFE-040 test need 필요 | pass |
| 3311 | [pass] feature SAFE-040 test area assigned | pass |
| 3312 | [pass] feature SAFE-040 pass criteria present | pass |
| 3313 | [pass] feature SAFE-041 name present | pass |
| 3314 | [pass] feature SAFE-041 UI need 필요 | pass |
| 3315 | [pass] feature SAFE-041 test need 필요 | pass |
| 3316 | [pass] feature SAFE-041 test area assigned | pass |
| 3317 | [pass] feature SAFE-041 pass criteria present | pass |
| 3318 | [pass] feature SAFE-042 name present | pass |
| 3319 | [pass] feature SAFE-042 UI need 필요 | pass |
| 3320 | [pass] feature SAFE-042 test need 필요 | pass |
| 3321 | [pass] feature SAFE-042 test area assigned | pass |
| 3322 | [pass] feature SAFE-042 pass criteria present | pass |
| 3323 | [pass] feature SAFE-043 name present | pass |
| 3324 | [pass] feature SAFE-043 UI need 비대상 | pass |
| 3325 | [pass] feature SAFE-043 test need 필요 | pass |
| 3326 | [pass] feature SAFE-043 test area assigned | pass |
| 3327 | [pass] feature SAFE-043 pass criteria present | pass |
| 3328 | [pass] feature SAFE-044 name present | pass |
| 3329 | [pass] feature SAFE-044 UI need 비대상 | pass |
| 3330 | [pass] feature SAFE-044 test need 필요 | pass |
| 3331 | [pass] feature SAFE-044 test area assigned | pass |
| 3332 | [pass] feature SAFE-044 pass criteria present | pass |
| 3333 | [pass] feature SAFE-045 name present | pass |
| 3334 | [pass] feature SAFE-045 UI need 필요 | pass |
| 3335 | [pass] feature SAFE-045 test need 필요 | pass |
| 3336 | [pass] feature SAFE-045 test area assigned | pass |
| 3337 | [pass] feature SAFE-045 pass criteria present | pass |
| 3338 | [pass] feature SAFE-046 name present | pass |
| 3339 | [pass] feature SAFE-046 UI need 필요 | pass |
| 3340 | [pass] feature SAFE-046 test need 필요 | pass |
| 3341 | [pass] feature SAFE-046 test area assigned | pass |
| 3342 | [pass] feature SAFE-046 pass criteria present | pass |
| 3343 | [pass] feature SAFE-047 name present | pass |
| 3344 | [pass] feature SAFE-047 UI need 필요 | pass |
| 3345 | [pass] feature SAFE-047 test need 필요 | pass |
| 3346 | [pass] feature SAFE-047 test area assigned | pass |
| 3347 | [pass] feature SAFE-047 pass criteria present | pass |
| 3348 | [pass] feature SAFE-048 name present | pass |
| 3349 | [pass] feature SAFE-048 UI need 필요 | pass |
| 3350 | [pass] feature SAFE-048 test need 필요 | pass |
| 3351 | [pass] feature SAFE-048 test area assigned | pass |
| 3352 | [pass] feature SAFE-048 pass criteria present | pass |
| 3353 | [pass] feature SAFE-049 name present | pass |
| 3354 | [pass] feature SAFE-049 UI need 필요 | pass |
| 3355 | [pass] feature SAFE-049 test need 필요 | pass |
| 3356 | [pass] feature SAFE-049 test area assigned | pass |
| 3357 | [pass] feature SAFE-049 pass criteria present | pass |
| 3358 | [pass] feature SAFE-050 name present | pass |
| 3359 | [pass] feature SAFE-050 UI need 필요 | pass |
| 3360 | [pass] feature SAFE-050 test need 필요 | pass |
| 3361 | [pass] feature SAFE-050 test area assigned | pass |
| 3362 | [pass] feature SAFE-050 pass criteria present | pass |
| 3363 | [pass] feature SAFE-051 name present | pass |
| 3364 | [pass] feature SAFE-051 UI need 비대상 | pass |
| 3365 | [pass] feature SAFE-051 test need 필요 | pass |
| 3366 | [pass] feature SAFE-051 test area assigned | pass |
| 3367 | [pass] feature SAFE-051 pass criteria present | pass |
| 3368 | [pass] feature SAFE-052 name present | pass |
| 3369 | [pass] feature SAFE-052 UI need 필요 | pass |
| 3370 | [pass] feature SAFE-052 test need 필요 | pass |
| 3371 | [pass] feature SAFE-052 test area assigned | pass |
| 3372 | [pass] feature SAFE-052 pass criteria present | pass |
| 3373 | [pass] feature SAFE-053 name present | pass |
| 3374 | [pass] feature SAFE-053 UI need 필요 | pass |
| 3375 | [pass] feature SAFE-053 test need 필요 | pass |
| 3376 | [pass] feature SAFE-053 test area assigned | pass |
| 3377 | [pass] feature SAFE-053 pass criteria present | pass |
| 3378 | [pass] feature SAFE-054 name present | pass |
| 3379 | [pass] feature SAFE-054 UI need 필요 | pass |
| 3380 | [pass] feature SAFE-054 test need 필요 | pass |
| 3381 | [pass] feature SAFE-054 test area assigned | pass |
| 3382 | [pass] feature SAFE-054 pass criteria present | pass |
| 3383 | [pass] feature SAFE-055 name present | pass |
| 3384 | [pass] feature SAFE-055 UI need 필요 | pass |
| 3385 | [pass] feature SAFE-055 test need 필요 | pass |
| 3386 | [pass] feature SAFE-055 test area assigned | pass |
| 3387 | [pass] feature SAFE-055 pass criteria present | pass |
| 3388 | [pass] feature SAFE-056 name present | pass |
| 3389 | [pass] feature SAFE-056 UI need 필요 | pass |
| 3390 | [pass] feature SAFE-056 test need 필요 | pass |
| 3391 | [pass] feature SAFE-056 test area assigned | pass |
| 3392 | [pass] feature SAFE-056 pass criteria present | pass |
| 3393 | [pass] feature SAFE-057 name present | pass |
| 3394 | [pass] feature SAFE-057 UI need 비대상 | pass |
| 3395 | [pass] feature SAFE-057 test need 필요 | pass |
| 3396 | [pass] feature SAFE-057 test area assigned | pass |
| 3397 | [pass] feature SAFE-057 pass criteria present | pass |
| 3398 | [pass] feature SAFE-058 name present | pass |
| 3399 | [pass] feature SAFE-058 UI need 필요 | pass |
| 3400 | [pass] feature SAFE-058 test need 필요 | pass |
| 3401 | [pass] feature SAFE-058 test area assigned | pass |
| 3402 | [pass] feature SAFE-058 pass criteria present | pass |
| 3403 | [pass] feature SAFE-059 name present | pass |
| 3404 | [pass] feature SAFE-059 UI need 필요 | pass |
| 3405 | [pass] feature SAFE-059 test need 필요 | pass |
| 3406 | [pass] feature SAFE-059 test area assigned | pass |
| 3407 | [pass] feature SAFE-059 pass criteria present | pass |
| 3408 | [pass] feature SAFE-060 name present | pass |
| 3409 | [pass] feature SAFE-060 UI need 필요 | pass |
| 3410 | [pass] feature SAFE-060 test need 필요 | pass |
| 3411 | [pass] feature SAFE-060 test area assigned | pass |
| 3412 | [pass] feature SAFE-060 pass criteria present | pass |
| 3413 | [pass] feature SAFE-061 name present | pass |
| 3414 | [pass] feature SAFE-061 UI need 필요 | pass |
| 3415 | [pass] feature SAFE-061 test need 필요 | pass |
| 3416 | [pass] feature SAFE-061 test area assigned | pass |
| 3417 | [pass] feature SAFE-061 pass criteria present | pass |
| 3418 | [pass] feature SAFE-062 name present | pass |
| 3419 | [pass] feature SAFE-062 UI need 필요 | pass |
| 3420 | [pass] feature SAFE-062 test need 필요 | pass |
| 3421 | [pass] feature SAFE-062 test area assigned | pass |
| 3422 | [pass] feature SAFE-062 pass criteria present | pass |
| 3423 | [pass] feature SAFE-063 name present | pass |
| 3424 | [pass] feature SAFE-063 UI need 비대상 | pass |
| 3425 | [pass] feature SAFE-063 test need 필요 | pass |
| 3426 | [pass] feature SAFE-063 test area assigned | pass |
| 3427 | [pass] feature SAFE-063 pass criteria present | pass |
| 3428 | [pass] feature SAFE-064 name present | pass |
| 3429 | [pass] feature SAFE-064 UI need 비대상 | pass |
| 3430 | [pass] feature SAFE-064 test need 필요 | pass |
| 3431 | [pass] feature SAFE-064 test area assigned | pass |
| 3432 | [pass] feature SAFE-064 pass criteria present | pass |
| 3433 | [pass] feature SAFE-065 name present | pass |
| 3434 | [pass] feature SAFE-065 UI need 필요 | pass |
| 3435 | [pass] feature SAFE-065 test need 필요 | pass |
| 3436 | [pass] feature SAFE-065 test area assigned | pass |
| 3437 | [pass] feature SAFE-065 pass criteria present | pass |
| 3438 | [pass] feature SAFE-066 name present | pass |
| 3439 | [pass] feature SAFE-066 UI need 필요 | pass |
| 3440 | [pass] feature SAFE-066 test need 필요 | pass |
| 3441 | [pass] feature SAFE-066 test area assigned | pass |
| 3442 | [pass] feature SAFE-066 pass criteria present | pass |
| 3443 | [pass] feature SAFE-067 name present | pass |
| 3444 | [pass] feature SAFE-067 UI need 필요 | pass |
| 3445 | [pass] feature SAFE-067 test need 필요 | pass |
| 3446 | [pass] feature SAFE-067 test area assigned | pass |
| 3447 | [pass] feature SAFE-067 pass criteria present | pass |
| 3448 | [pass] feature SAFE-068 name present | pass |
| 3449 | [pass] feature SAFE-068 UI need 필요 | pass |
| 3450 | [pass] feature SAFE-068 test need 필요 | pass |
| 3451 | [pass] feature SAFE-068 test area assigned | pass |
| 3452 | [pass] feature SAFE-068 pass criteria present | pass |
| 3453 | [pass] feature SAFE-069 name present | pass |
| 3454 | [pass] feature SAFE-069 UI need 필요 | pass |
| 3455 | [pass] feature SAFE-069 test need 필요 | pass |
| 3456 | [pass] feature SAFE-069 test area assigned | pass |
| 3457 | [pass] feature SAFE-069 pass criteria present | pass |
| 3458 | [pass] feature SAFE-070 name present | pass |
| 3459 | [pass] feature SAFE-070 UI need 비대상 | pass |
| 3460 | [pass] feature SAFE-070 test need 필요 | pass |
| 3461 | [pass] feature SAFE-070 test area assigned | pass |
| 3462 | [pass] feature SAFE-070 pass criteria present | pass |
| 3463 | [pass] feature SAFE-071 name present | pass |
| 3464 | [pass] feature SAFE-071 UI need 비대상 | pass |
| 3465 | [pass] feature SAFE-071 test need 필요 | pass |
| 3466 | [pass] feature SAFE-071 test area assigned | pass |
| 3467 | [pass] feature SAFE-071 pass criteria present | pass |
| 3468 | [pass] feature SAFE-072 name present | pass |
| 3469 | [pass] feature SAFE-072 UI need 비대상 | pass |
| 3470 | [pass] feature SAFE-072 test need 필요 | pass |
| 3471 | [pass] feature SAFE-072 test area assigned | pass |
| 3472 | [pass] feature SAFE-072 pass criteria present | pass |
| 3473 | [pass] feature SAFE-073 name present | pass |
| 3474 | [pass] feature SAFE-073 UI need 비대상 | pass |
| 3475 | [pass] feature SAFE-073 test need 필요 | pass |
| 3476 | [pass] feature SAFE-073 test area assigned | pass |
| 3477 | [pass] feature SAFE-073 pass criteria present | pass |
| 3478 | [pass] feature SAFE-074 name present | pass |
| 3479 | [pass] feature SAFE-074 UI need 비대상 | pass |
| 3480 | [pass] feature SAFE-074 test need 필요 | pass |
| 3481 | [pass] feature SAFE-074 test area assigned | pass |
| 3482 | [pass] feature SAFE-074 pass criteria present | pass |
| 3483 | [pass] feature SAFE-075 name present | pass |
| 3484 | [pass] feature SAFE-075 UI need 비대상 | pass |
| 3485 | [pass] feature SAFE-075 test need 필요 | pass |
| 3486 | [pass] feature SAFE-075 test area assigned | pass |
| 3487 | [pass] feature SAFE-075 pass criteria present | pass |
| 3488 | [pass] feature SAFE-076 name present | pass |
| 3489 | [pass] feature SAFE-076 UI need 비대상 | pass |
| 3490 | [pass] feature SAFE-076 test need 필요 | pass |
| 3491 | [pass] feature SAFE-076 test area assigned | pass |
| 3492 | [pass] feature SAFE-076 pass criteria present | pass |
| 3493 | [pass] feature SAFE-077 name present | pass |
| 3494 | [pass] feature SAFE-077 UI need 비대상 | pass |
| 3495 | [pass] feature SAFE-077 test need 필요 | pass |
| 3496 | [pass] feature SAFE-077 test area assigned | pass |
| 3497 | [pass] feature SAFE-077 pass criteria present | pass |
| 3498 | [pass] feature SAFE-078 name present | pass |
| 3499 | [pass] feature SAFE-078 UI need 비대상 | pass |
| 3500 | [pass] feature SAFE-078 test need 필요 | pass |
| 3501 | [pass] feature SAFE-078 test area assigned | pass |
| 3502 | [pass] feature SAFE-078 pass criteria present | pass |
| 3503 | [pass] feature SAFE-079 name present | pass |
| 3504 | [pass] feature SAFE-079 UI need 비대상 | pass |
| 3505 | [pass] feature SAFE-079 test need 필요 | pass |
| 3506 | [pass] feature SAFE-079 test area assigned | pass |
| 3507 | [pass] feature SAFE-079 pass criteria present | pass |
| 3508 | [pass] feature SAFE-080 name present | pass |
| 3509 | [pass] feature SAFE-080 UI need 비대상 | pass |
| 3510 | [pass] feature SAFE-080 test need 필요 | pass |
| 3511 | [pass] feature SAFE-080 test area assigned | pass |
| 3512 | [pass] feature SAFE-080 pass criteria present | pass |
| 3513 | [pass] feature SAFE-081 name present | pass |
| 3514 | [pass] feature SAFE-081 UI need 비대상 | pass |
| 3515 | [pass] feature SAFE-081 test need 필요 | pass |
| 3516 | [pass] feature SAFE-081 test area assigned | pass |
| 3517 | [pass] feature SAFE-081 pass criteria present | pass |
| 3518 | [pass] feature SAFE-082 name present | pass |
| 3519 | [pass] feature SAFE-082 UI need 비대상 | pass |
| 3520 | [pass] feature SAFE-082 test need 필요 | pass |
| 3521 | [pass] feature SAFE-082 test area assigned | pass |
| 3522 | [pass] feature SAFE-082 pass criteria present | pass |
| 3523 | [pass] feature SAFE-083 name present | pass |
| 3524 | [pass] feature SAFE-083 UI need 비대상 | pass |
| 3525 | [pass] feature SAFE-083 test need 필요 | pass |
| 3526 | [pass] feature SAFE-083 test area assigned | pass |
| 3527 | [pass] feature SAFE-083 pass criteria present | pass |
| 3528 | [pass] feature SAFE-084 name present | pass |
| 3529 | [pass] feature SAFE-084 UI need 비대상 | pass |
| 3530 | [pass] feature SAFE-084 test need 필요 | pass |
| 3531 | [pass] feature SAFE-084 test area assigned | pass |
| 3532 | [pass] feature SAFE-084 pass criteria present | pass |
| 3533 | [pass] feature SAFE-085 name present | pass |
| 3534 | [pass] feature SAFE-085 UI need 비대상 | pass |
| 3535 | [pass] feature SAFE-085 test need 필요 | pass |
| 3536 | [pass] feature SAFE-085 test area assigned | pass |
| 3537 | [pass] feature SAFE-085 pass criteria present | pass |
| 3538 | [pass] feature SAFE-086 name present | pass |
| 3539 | [pass] feature SAFE-086 UI need 비대상 | pass |
| 3540 | [pass] feature SAFE-086 test need 필요 | pass |
| 3541 | [pass] feature SAFE-086 test area assigned | pass |
| 3542 | [pass] feature SAFE-086 pass criteria present | pass |
| 3543 | [pass] feature SAFE-087 name present | pass |
| 3544 | [pass] feature SAFE-087 UI need 비대상 | pass |
| 3545 | [pass] feature SAFE-087 test need 필요 | pass |
| 3546 | [pass] feature SAFE-087 test area assigned | pass |
| 3547 | [pass] feature SAFE-087 pass criteria present | pass |
| 3548 | [pass] feature SAFE-088 name present | pass |
| 3549 | [pass] feature SAFE-088 UI need 비대상 | pass |
| 3550 | [pass] feature SAFE-088 test need 필요 | pass |
| 3551 | [pass] feature SAFE-088 test area assigned | pass |
| 3552 | [pass] feature SAFE-088 pass criteria present | pass |
| 3553 | [pass] feature SAFE-089 name present | pass |
| 3554 | [pass] feature SAFE-089 UI need 비대상 | pass |
| 3555 | [pass] feature SAFE-089 test need 필요 | pass |
| 3556 | [pass] feature SAFE-089 test area assigned | pass |
| 3557 | [pass] feature SAFE-089 pass criteria present | pass |
| 3558 | [pass] feature SAFE-090 name present | pass |
| 3559 | [pass] feature SAFE-090 UI need 비대상 | pass |
| 3560 | [pass] feature SAFE-090 test need 필요 | pass |
| 3561 | [pass] feature SAFE-090 test area assigned | pass |
| 3562 | [pass] feature SAFE-090 pass criteria present | pass |
| 3563 | [pass] feature SAFE-091 name present | pass |
| 3564 | [pass] feature SAFE-091 UI need 비대상 | pass |
| 3565 | [pass] feature SAFE-091 test need 필요 | pass |
| 3566 | [pass] feature SAFE-091 test area assigned | pass |
| 3567 | [pass] feature SAFE-091 pass criteria present | pass |
| 3568 | [pass] feature SAFE-092 name present | pass |
| 3569 | [pass] feature SAFE-092 UI need 비대상 | pass |
| 3570 | [pass] feature SAFE-092 test need 필요 | pass |
| 3571 | [pass] feature SAFE-092 test area assigned | pass |
| 3572 | [pass] feature SAFE-092 pass criteria present | pass |
| 3573 | [pass] feature SAFE-093 name present | pass |
| 3574 | [pass] feature SAFE-093 UI need 비대상 | pass |
| 3575 | [pass] feature SAFE-093 test need 필요 | pass |
| 3576 | [pass] feature SAFE-093 test area assigned | pass |
| 3577 | [pass] feature SAFE-093 pass criteria present | pass |
| 3578 | [pass] feature SAFE-094 name present | pass |
| 3579 | [pass] feature SAFE-094 UI need 비대상 | pass |
| 3580 | [pass] feature SAFE-094 test need 필요 | pass |
| 3581 | [pass] feature SAFE-094 test area assigned | pass |
| 3582 | [pass] feature SAFE-094 pass criteria present | pass |
| 3583 | [pass] feature SAFE-095 name present | pass |
| 3584 | [pass] feature SAFE-095 UI need 비대상 | pass |
| 3585 | [pass] feature SAFE-095 test need 필요 | pass |
| 3586 | [pass] feature SAFE-095 test area assigned | pass |
| 3587 | [pass] feature SAFE-095 pass criteria present | pass |
| 3588 | [pass] feature SAFE-096 name present | pass |
| 3589 | [pass] feature SAFE-096 UI need 비대상 | pass |
| 3590 | [pass] feature SAFE-096 test need 필요 | pass |
| 3591 | [pass] feature SAFE-096 test area assigned | pass |
| 3592 | [pass] feature SAFE-096 pass criteria present | pass |
| 3593 | [pass] feature SAFE-097 name present | pass |
| 3594 | [pass] feature SAFE-097 UI need 비대상 | pass |
| 3595 | [pass] feature SAFE-097 test need 필요 | pass |
| 3596 | [pass] feature SAFE-097 test area assigned | pass |
| 3597 | [pass] feature SAFE-097 pass criteria present | pass |
| 3598 | [pass] feature SAFE-098 name present | pass |
| 3599 | [pass] feature SAFE-098 UI need 필요 | pass |
| 3600 | [pass] feature SAFE-098 test need 필요 | pass |
| 3601 | [pass] feature SAFE-098 test area assigned | pass |
| 3602 | [pass] feature SAFE-098 pass criteria present | pass |
| 3603 | [pass] feature SAFE-099 name present | pass |
| 3604 | [pass] feature SAFE-099 UI need 비대상 | pass |
| 3605 | [pass] feature SAFE-099 test need 필요 | pass |
| 3606 | [pass] feature SAFE-099 test area assigned | pass |
| 3607 | [pass] feature SAFE-099 pass criteria present | pass |
| 3608 | [pass] feature SAFE-100 name present | pass |
| 3609 | [pass] feature SAFE-100 UI need 비대상 | pass |
| 3610 | [pass] feature SAFE-100 test need 필요 | pass |
| 3611 | [pass] feature SAFE-100 test area assigned | pass |
| 3612 | [pass] feature SAFE-100 pass criteria present | pass |
| 3613 | [pass] feature SAFE-101 name present | pass |
| 3614 | [pass] feature SAFE-101 UI need 비대상 | pass |
| 3615 | [pass] feature SAFE-101 test need 필요 | pass |
| 3616 | [pass] feature SAFE-101 test area assigned | pass |
| 3617 | [pass] feature SAFE-101 pass criteria present | pass |
| 3618 | [pass] feature SAFE-102 name present | pass |
| 3619 | [pass] feature SAFE-102 UI need 비대상 | pass |
| 3620 | [pass] feature SAFE-102 test need 필요 | pass |
| 3621 | [pass] feature SAFE-102 test area assigned | pass |
| 3622 | [pass] feature SAFE-102 pass criteria present | pass |
| 3623 | [pass] feature SAFE-103 name present | pass |
| 3624 | [pass] feature SAFE-103 UI need 비대상 | pass |
| 3625 | [pass] feature SAFE-103 test need 필요 | pass |
| 3626 | [pass] feature SAFE-103 test area assigned | pass |
| 3627 | [pass] feature SAFE-103 pass criteria present | pass |
| 3628 | [pass] feature SAFE-104 name present | pass |
| 3629 | [pass] feature SAFE-104 UI need 필요 | pass |
| 3630 | [pass] feature SAFE-104 test need 필요 | pass |
| 3631 | [pass] feature SAFE-104 test area assigned | pass |
| 3632 | [pass] feature SAFE-104 pass criteria present | pass |
| 3633 | [pass] feature SAFE-105 name present | pass |
| 3634 | [pass] feature SAFE-105 UI need 필요 | pass |
| 3635 | [pass] feature SAFE-105 test need 필요 | pass |
| 3636 | [pass] feature SAFE-105 test area assigned | pass |
| 3637 | [pass] feature SAFE-105 pass criteria present | pass |
| 3638 | [pass] feature SAFE-106 name present | pass |
| 3639 | [pass] feature SAFE-106 UI need 필요 | pass |
| 3640 | [pass] feature SAFE-106 test need 필요 | pass |
| 3641 | [pass] feature SAFE-106 test area assigned | pass |
| 3642 | [pass] feature SAFE-106 pass criteria present | pass |
| 3643 | [pass] feature SAFE-107 name present | pass |
| 3644 | [pass] feature SAFE-107 UI need 필요 | pass |
| 3645 | [pass] feature SAFE-107 test need 필요 | pass |
| 3646 | [pass] feature SAFE-107 test area assigned | pass |
| 3647 | [pass] feature SAFE-107 pass criteria present | pass |
| 3648 | [pass] feature SAFE-108 name present | pass |
| 3649 | [pass] feature SAFE-108 UI need 필요 | pass |
| 3650 | [pass] feature SAFE-108 test need 필요 | pass |
| 3651 | [pass] feature SAFE-108 test area assigned | pass |
| 3652 | [pass] feature SAFE-108 pass criteria present | pass |
| 3653 | [pass] feature SAFE-109 name present | pass |
| 3654 | [pass] feature SAFE-109 UI need 필요 | pass |
| 3655 | [pass] feature SAFE-109 test need 필요 | pass |
| 3656 | [pass] feature SAFE-109 test area assigned | pass |
| 3657 | [pass] feature SAFE-109 pass criteria present | pass |
| 3658 | [pass] feature SAFE-110 name present | pass |
| 3659 | [pass] feature SAFE-110 UI need 필요 | pass |
| 3660 | [pass] feature SAFE-110 test need 필요 | pass |
| 3661 | [pass] feature SAFE-110 test area assigned | pass |
| 3662 | [pass] feature SAFE-110 pass criteria present | pass |
| 3663 | [pass] feature SAFE-111 name present | pass |
| 3664 | [pass] feature SAFE-111 UI need 필요 | pass |
| 3665 | [pass] feature SAFE-111 test need 필요 | pass |
| 3666 | [pass] feature SAFE-111 test area assigned | pass |
| 3667 | [pass] feature SAFE-111 pass criteria present | pass |
| 3668 | [pass] feature SAFE-112 name present | pass |
| 3669 | [pass] feature SAFE-112 UI need 비대상 | pass |
| 3670 | [pass] feature SAFE-112 test need 필요 | pass |
| 3671 | [pass] feature SAFE-112 test area assigned | pass |
| 3672 | [pass] feature SAFE-112 pass criteria present | pass |
| 3673 | [pass] feature SAFE-113 name present | pass |
| 3674 | [pass] feature SAFE-113 UI need 비대상 | pass |
| 3675 | [pass] feature SAFE-113 test need 필요 | pass |
| 3676 | [pass] feature SAFE-113 test area assigned | pass |
| 3677 | [pass] feature SAFE-113 pass criteria present | pass |
| 3678 | [pass] feature SAFE-114 name present | pass |
| 3679 | [pass] feature SAFE-114 UI need 비대상 | pass |
| 3680 | [pass] feature SAFE-114 test need 필요 | pass |
| 3681 | [pass] feature SAFE-114 test area assigned | pass |
| 3682 | [pass] feature SAFE-114 pass criteria present | pass |
| 3683 | [pass] feature SAFE-115 name present | pass |
| 3684 | [pass] feature SAFE-115 UI need 비대상 | pass |
| 3685 | [pass] feature SAFE-115 test need 필요 | pass |
| 3686 | [pass] feature SAFE-115 test area assigned | pass |
| 3687 | [pass] feature SAFE-115 pass criteria present | pass |
| 3688 | [pass] feature SAFE-116 name present | pass |
| 3689 | [pass] feature SAFE-116 UI need 비대상 | pass |
| 3690 | [pass] feature SAFE-116 test need 필요 | pass |
| 3691 | [pass] feature SAFE-116 test area assigned | pass |
| 3692 | [pass] feature SAFE-116 pass criteria present | pass |
| 3693 | [pass] feature SAFE-117 name present | pass |
| 3694 | [pass] feature SAFE-117 UI need 필요 | pass |
| 3695 | [pass] feature SAFE-117 test need 필요 | pass |
| 3696 | [pass] feature SAFE-117 test area assigned | pass |
| 3697 | [pass] feature SAFE-117 pass criteria present | pass |
| 3698 | [pass] feature SAFE-118 name present | pass |
| 3699 | [pass] feature SAFE-118 UI need 필요 | pass |
| 3700 | [pass] feature SAFE-118 test need 필요 | pass |
| 3701 | [pass] feature SAFE-118 test area assigned | pass |
| 3702 | [pass] feature SAFE-118 pass criteria present | pass |
| 3703 | [pass] feature SAFE-119 name present | pass |
| 3704 | [pass] feature SAFE-119 UI need 필요 | pass |
| 3705 | [pass] feature SAFE-119 test need 필요 | pass |
| 3706 | [pass] feature SAFE-119 test area assigned | pass |
| 3707 | [pass] feature SAFE-119 pass criteria present | pass |
| 3708 | [pass] feature SAFE-120 name present | pass |
| 3709 | [pass] feature SAFE-120 UI need 비대상 | pass |
| 3710 | [pass] feature SAFE-120 test need 필요 | pass |
| 3711 | [pass] feature SAFE-120 test area assigned | pass |
| 3712 | [pass] feature SAFE-120 pass criteria present | pass |
| 3713 | [pass] feature SAFE-121 name present | pass |
| 3714 | [pass] feature SAFE-121 UI need 필요 | pass |
| 3715 | [pass] feature SAFE-121 test need 필요 | pass |
| 3716 | [pass] feature SAFE-121 test area assigned | pass |
| 3717 | [pass] feature SAFE-121 pass criteria present | pass |
| 3718 | [pass] feature SAFE-122 name present | pass |
| 3719 | [pass] feature SAFE-122 UI need 필요 | pass |
| 3720 | [pass] feature SAFE-122 test need 필요 | pass |
| 3721 | [pass] feature SAFE-122 test area assigned | pass |
| 3722 | [pass] feature SAFE-122 pass criteria present | pass |
| 3723 | [pass] feature SAFE-123 name present | pass |
| 3724 | [pass] feature SAFE-123 UI need 비대상 | pass |
| 3725 | [pass] feature SAFE-123 test need 필요 | pass |
| 3726 | [pass] feature SAFE-123 test area assigned | pass |
| 3727 | [pass] feature SAFE-123 pass criteria present | pass |
| 3728 | [pass] feature SAFE-124 name present | pass |
| 3729 | [pass] feature SAFE-124 UI need 비대상 | pass |
| 3730 | [pass] feature SAFE-124 test need 필요 | pass |
| 3731 | [pass] feature SAFE-124 test area assigned | pass |
| 3732 | [pass] feature SAFE-124 pass criteria present | pass |
| 3733 | [pass] feature SAFE-125 name present | pass |
| 3734 | [pass] feature SAFE-125 UI need 비대상 | pass |
| 3735 | [pass] feature SAFE-125 test need 필요 | pass |
| 3736 | [pass] feature SAFE-125 test area assigned | pass |
| 3737 | [pass] feature SAFE-125 pass criteria present | pass |
| 3738 | [pass] feature SAFE-126 name present | pass |
| 3739 | [pass] feature SAFE-126 UI need 비대상 | pass |
| 3740 | [pass] feature SAFE-126 test need 필요 | pass |
| 3741 | [pass] feature SAFE-126 test area assigned | pass |
| 3742 | [pass] feature SAFE-126 pass criteria present | pass |
| 3743 | [pass] feature SAFE-127 name present | pass |
| 3744 | [pass] feature SAFE-127 UI need 비대상 | pass |
| 3745 | [pass] feature SAFE-127 test need 필요 | pass |
| 3746 | [pass] feature SAFE-127 test area assigned | pass |
| 3747 | [pass] feature SAFE-127 pass criteria present | pass |
| 3748 | [pass] feature SAFE-128 name present | pass |
| 3749 | [pass] feature SAFE-128 UI need 비대상 | pass |
| 3750 | [pass] feature SAFE-128 test need 필요 | pass |
| 3751 | [pass] feature SAFE-128 test area assigned | pass |
| 3752 | [pass] feature SAFE-128 pass criteria present | pass |
| 3753 | [pass] feature SAFE-129 name present | pass |
| 3754 | [pass] feature SAFE-129 UI need 필요 | pass |
| 3755 | [pass] feature SAFE-129 test need 필요 | pass |
| 3756 | [pass] feature SAFE-129 test area assigned | pass |
| 3757 | [pass] feature SAFE-129 pass criteria present | pass |
| 3758 | [pass] feature SAFE-130 name present | pass |
| 3759 | [pass] feature SAFE-130 UI need 필요 | pass |
| 3760 | [pass] feature SAFE-130 test need 필요 | pass |
| 3761 | [pass] feature SAFE-130 test area assigned | pass |
| 3762 | [pass] feature SAFE-130 pass criteria present | pass |
| 3763 | [pass] feature SAFE-131 name present | pass |
| 3764 | [pass] feature SAFE-131 UI need 필요 | pass |
| 3765 | [pass] feature SAFE-131 test need 필요 | pass |
| 3766 | [pass] feature SAFE-131 test area assigned | pass |
| 3767 | [pass] feature SAFE-131 pass criteria present | pass |
| 3768 | [pass] feature SAFE-132 name present | pass |
| 3769 | [pass] feature SAFE-132 UI need 필요 | pass |
| 3770 | [pass] feature SAFE-132 test need 필요 | pass |
| 3771 | [pass] feature SAFE-132 test area assigned | pass |
| 3772 | [pass] feature SAFE-132 pass criteria present | pass |
| 3773 | [pass] feature SAFE-133 name present | pass |
| 3774 | [pass] feature SAFE-133 UI need 비대상 | pass |
| 3775 | [pass] feature SAFE-133 test need 필요 | pass |
| 3776 | [pass] feature SAFE-133 test area assigned | pass |
| 3777 | [pass] feature SAFE-133 pass criteria present | pass |
| 3778 | [pass] feature SAFE-134 name present | pass |
| 3779 | [pass] feature SAFE-134 UI need 비대상 | pass |
| 3780 | [pass] feature SAFE-134 test need 필요 | pass |
| 3781 | [pass] feature SAFE-134 test area assigned | pass |
| 3782 | [pass] feature SAFE-134 pass criteria present | pass |
| 3783 | [pass] feature SAFE-135 name present | pass |
| 3784 | [pass] feature SAFE-135 UI need 비대상 | pass |
| 3785 | [pass] feature SAFE-135 test need 필요 | pass |
| 3786 | [pass] feature SAFE-135 test area assigned | pass |
| 3787 | [pass] feature SAFE-135 pass criteria present | pass |
| 3788 | [pass] feature SAFE-136 name present | pass |
| 3789 | [pass] feature SAFE-136 UI need 비대상 | pass |
| 3790 | [pass] feature SAFE-136 test need 필요 | pass |
| 3791 | [pass] feature SAFE-136 test area assigned | pass |
| 3792 | [pass] feature SAFE-136 pass criteria present | pass |
| 3793 | [pass] feature SAFE-137 name present | pass |
| 3794 | [pass] feature SAFE-137 UI need 비대상 | pass |
| 3795 | [pass] feature SAFE-137 test need 필요 | pass |
| 3796 | [pass] feature SAFE-137 test area assigned | pass |
| 3797 | [pass] feature SAFE-137 pass criteria present | pass |
| 3798 | [pass] feature SAFE-138 name present | pass |
| 3799 | [pass] feature SAFE-138 UI need 필요 | pass |
| 3800 | [pass] feature SAFE-138 test need 필요 | pass |
| 3801 | [pass] feature SAFE-138 test area assigned | pass |
| 3802 | [pass] feature SAFE-138 pass criteria present | pass |
| 3803 | [pass] feature SAFE-139 name present | pass |
| 3804 | [pass] feature SAFE-139 UI need 비대상 | pass |
| 3805 | [pass] feature SAFE-139 test need 필요 | pass |
| 3806 | [pass] feature SAFE-139 test area assigned | pass |
| 3807 | [pass] feature SAFE-139 pass criteria present | pass |
| 3808 | [pass] feature SAFE-140 name present | pass |
| 3809 | [pass] feature SAFE-140 UI need 필요 | pass |
| 3810 | [pass] feature SAFE-140 test need 필요 | pass |
| 3811 | [pass] feature SAFE-140 test area assigned | pass |
| 3812 | [pass] feature SAFE-140 pass criteria present | pass |
| 3813 | [pass] feature SAFE-141 name present | pass |
| 3814 | [pass] feature SAFE-141 UI need 비대상 | pass |
| 3815 | [pass] feature SAFE-141 test need 필요 | pass |
| 3816 | [pass] feature SAFE-141 test area assigned | pass |
| 3817 | [pass] feature SAFE-141 pass criteria present | pass |
| 3818 | [pass] feature SAFE-142 name present | pass |
| 3819 | [pass] feature SAFE-142 UI need 비대상 | pass |
| 3820 | [pass] feature SAFE-142 test need 필요 | pass |
| 3821 | [pass] feature SAFE-142 test area assigned | pass |
| 3822 | [pass] feature SAFE-142 pass criteria present | pass |
| 3823 | [pass] feature SAFE-143 name present | pass |
| 3824 | [pass] feature SAFE-143 UI need 비대상 | pass |
| 3825 | [pass] feature SAFE-143 test need 필요 | pass |
| 3826 | [pass] feature SAFE-143 test area assigned | pass |
| 3827 | [pass] feature SAFE-143 pass criteria present | pass |
| 3828 | [pass] feature SAFE-144 name present | pass |
| 3829 | [pass] feature SAFE-144 UI need 비대상 | pass |
| 3830 | [pass] feature SAFE-144 test need 필요 | pass |
| 3831 | [pass] feature SAFE-144 test area assigned | pass |
| 3832 | [pass] feature SAFE-144 pass criteria present | pass |
| 3833 | [pass] feature SAFE-145 name present | pass |
| 3834 | [pass] feature SAFE-145 UI need 비대상 | pass |
| 3835 | [pass] feature SAFE-145 test need 필요 | pass |
| 3836 | [pass] feature SAFE-145 test area assigned | pass |
| 3837 | [pass] feature SAFE-145 pass criteria present | pass |
| 3838 | [pass] feature SAFE-146 name present | pass |
| 3839 | [pass] feature SAFE-146 UI need 비대상 | pass |
| 3840 | [pass] feature SAFE-146 test need 필요 | pass |
| 3841 | [pass] feature SAFE-146 test area assigned | pass |
| 3842 | [pass] feature SAFE-146 pass criteria present | pass |
| 3843 | [pass] feature SAFE-147 name present | pass |
| 3844 | [pass] feature SAFE-147 UI need 비대상 | pass |
| 3845 | [pass] feature SAFE-147 test need 필요 | pass |
| 3846 | [pass] feature SAFE-147 test area assigned | pass |
| 3847 | [pass] feature SAFE-147 pass criteria present | pass |
| 3848 | [pass] feature SAFE-148 name present | pass |
| 3849 | [pass] feature SAFE-148 UI need 비대상 | pass |
| 3850 | [pass] feature SAFE-148 test need 필요 | pass |
| 3851 | [pass] feature SAFE-148 test area assigned | pass |
| 3852 | [pass] feature SAFE-148 pass criteria present | pass |
| 3853 | [pass] feature SAFE-149 name present | pass |
| 3854 | [pass] feature SAFE-149 UI need 비대상 | pass |
| 3855 | [pass] feature SAFE-149 test need 필요 | pass |
| 3856 | [pass] feature SAFE-149 test area assigned | pass |
| 3857 | [pass] feature SAFE-149 pass criteria present | pass |
| 3858 | [pass] feature SAFE-150 name present | pass |
| 3859 | [pass] feature SAFE-150 UI need 비대상 | pass |
| 3860 | [pass] feature SAFE-150 test need 필요 | pass |
| 3861 | [pass] feature SAFE-150 test area assigned | pass |
| 3862 | [pass] feature SAFE-150 pass criteria present | pass |
| 3863 | [pass] feature SAFE-151 name present | pass |
| 3864 | [pass] feature SAFE-151 UI need 비대상 | pass |
| 3865 | [pass] feature SAFE-151 test need 필요 | pass |
| 3866 | [pass] feature SAFE-151 test area assigned | pass |
| 3867 | [pass] feature SAFE-151 pass criteria present | pass |
| 3868 | [pass] feature SAFE-152 name present | pass |
| 3869 | [pass] feature SAFE-152 UI need 비대상 | pass |
| 3870 | [pass] feature SAFE-152 test need 필요 | pass |
| 3871 | [pass] feature SAFE-152 test area assigned | pass |
| 3872 | [pass] feature SAFE-152 pass criteria present | pass |
| 3873 | [pass] feature SAFE-153 name present | pass |
| 3874 | [pass] feature SAFE-153 UI need 비대상 | pass |
| 3875 | [pass] feature SAFE-153 test need 필요 | pass |
| 3876 | [pass] feature SAFE-153 test area assigned | pass |
| 3877 | [pass] feature SAFE-153 pass criteria present | pass |
| 3878 | [pass] feature SAFE-154 name present | pass |
| 3879 | [pass] feature SAFE-154 UI need 비대상 | pass |
| 3880 | [pass] feature SAFE-154 test need 필요 | pass |
| 3881 | [pass] feature SAFE-154 test area assigned | pass |
| 3882 | [pass] feature SAFE-154 pass criteria present | pass |
| 3883 | [pass] feature SAFE-155 name present | pass |
| 3884 | [pass] feature SAFE-155 UI need 비대상 | pass |
| 3885 | [pass] feature SAFE-155 test need 필요 | pass |
| 3886 | [pass] feature SAFE-155 test area assigned | pass |
| 3887 | [pass] feature SAFE-155 pass criteria present | pass |
| 3888 | [pass] feature SAFE-156 name present | pass |
| 3889 | [pass] feature SAFE-156 UI need 비대상 | pass |
| 3890 | [pass] feature SAFE-156 test need 필요 | pass |
| 3891 | [pass] feature SAFE-156 test area assigned | pass |
| 3892 | [pass] feature SAFE-156 pass criteria present | pass |
| 3893 | [pass] feature SAFE-157 name present | pass |
| 3894 | [pass] feature SAFE-157 UI need 비대상 | pass |
| 3895 | [pass] feature SAFE-157 test need 필요 | pass |
| 3896 | [pass] feature SAFE-157 test area assigned | pass |
| 3897 | [pass] feature SAFE-157 pass criteria present | pass |
| 3898 | [pass] feature SAFE-158 name present | pass |
| 3899 | [pass] feature SAFE-158 UI need 비대상 | pass |
| 3900 | [pass] feature SAFE-158 test need 필요 | pass |
| 3901 | [pass] feature SAFE-158 test area assigned | pass |
| 3902 | [pass] feature SAFE-158 pass criteria present | pass |
| 3903 | [pass] feature SAFE-159 name present | pass |
| 3904 | [pass] feature SAFE-159 UI need 비대상 | pass |
| 3905 | [pass] feature SAFE-159 test need 필요 | pass |
| 3906 | [pass] feature SAFE-159 test area assigned | pass |
| 3907 | [pass] feature SAFE-159 pass criteria present | pass |
| 3908 | [pass] feature SAFE-160 name present | pass |
| 3909 | [pass] feature SAFE-160 UI need 비대상 | pass |
| 3910 | [pass] feature SAFE-160 test need 필요 | pass |
| 3911 | [pass] feature SAFE-160 test area assigned | pass |
| 3912 | [pass] feature SAFE-160 pass criteria present | pass |
| 3913 | [pass] feature SAFE-161 name present | pass |
| 3914 | [pass] feature SAFE-161 UI need 비대상 | pass |
| 3915 | [pass] feature SAFE-161 test need 필요 | pass |
| 3916 | [pass] feature SAFE-161 test area assigned | pass |
| 3917 | [pass] feature SAFE-161 pass criteria present | pass |
| 3918 | [pass] feature SAFE-162 name present | pass |
| 3919 | [pass] feature SAFE-162 UI need 비대상 | pass |
| 3920 | [pass] feature SAFE-162 test need 필요 | pass |
| 3921 | [pass] feature SAFE-162 test area assigned | pass |
| 3922 | [pass] feature SAFE-162 pass criteria present | pass |
| 3923 | [pass] feature SAFE-163 name present | pass |
| 3924 | [pass] feature SAFE-163 UI need 비대상 | pass |
| 3925 | [pass] feature SAFE-163 test need 필요 | pass |
| 3926 | [pass] feature SAFE-163 test area assigned | pass |
| 3927 | [pass] feature SAFE-163 pass criteria present | pass |
| 3928 | [pass] feature SAFE-164 name present | pass |
| 3929 | [pass] feature SAFE-164 UI need 비대상 | pass |
| 3930 | [pass] feature SAFE-164 test need 필요 | pass |
| 3931 | [pass] feature SAFE-164 test area assigned | pass |
| 3932 | [pass] feature SAFE-164 pass criteria present | pass |
| 3933 | [pass] feature SAFE-165 name present | pass |
| 3934 | [pass] feature SAFE-165 UI need 비대상 | pass |
| 3935 | [pass] feature SAFE-165 test need 필요 | pass |
| 3936 | [pass] feature SAFE-165 test area assigned | pass |
| 3937 | [pass] feature SAFE-165 pass criteria present | pass |
| 3938 | [pass] feature SAFE-166 name present | pass |
| 3939 | [pass] feature SAFE-166 UI need 비대상 | pass |
| 3940 | [pass] feature SAFE-166 test need 필요 | pass |
| 3941 | [pass] feature SAFE-166 test area assigned | pass |
| 3942 | [pass] feature SAFE-166 pass criteria present | pass |
| 3943 | [pass] feature SAFE-167 name present | pass |
| 3944 | [pass] feature SAFE-167 UI need 비대상 | pass |
| 3945 | [pass] feature SAFE-167 test need 필요 | pass |
| 3946 | [pass] feature SAFE-167 test area assigned | pass |
| 3947 | [pass] feature SAFE-167 pass criteria present | pass |
| 3948 | [pass] feature SAFE-168 name present | pass |
| 3949 | [pass] feature SAFE-168 UI need 비대상 | pass |
| 3950 | [pass] feature SAFE-168 test need 필요 | pass |
| 3951 | [pass] feature SAFE-168 test area assigned | pass |
| 3952 | [pass] feature SAFE-168 pass criteria present | pass |
| 3953 | [pass] feature SAFE-169 name present | pass |
| 3954 | [pass] feature SAFE-169 UI need 비대상 | pass |
| 3955 | [pass] feature SAFE-169 test need 필요 | pass |
| 3956 | [pass] feature SAFE-169 test area assigned | pass |
| 3957 | [pass] feature SAFE-169 pass criteria present | pass |
| 3958 | [pass] feature SAFE-170 name present | pass |
| 3959 | [pass] feature SAFE-170 UI need 비대상 | pass |
| 3960 | [pass] feature SAFE-170 test need 필요 | pass |
| 3961 | [pass] feature SAFE-170 test area assigned | pass |
| 3962 | [pass] feature SAFE-170 pass criteria present | pass |
| 3963 | [pass] feature SAFE-171 name present | pass |
| 3964 | [pass] feature SAFE-171 UI need 비대상 | pass |
| 3965 | [pass] feature SAFE-171 test need 필요 | pass |
| 3966 | [pass] feature SAFE-171 test area assigned | pass |
| 3967 | [pass] feature SAFE-171 pass criteria present | pass |
| 3968 | [pass] feature SAFE-172 name present | pass |
| 3969 | [pass] feature SAFE-172 UI need 비대상 | pass |
| 3970 | [pass] feature SAFE-172 test need 필요 | pass |
| 3971 | [pass] feature SAFE-172 test area assigned | pass |
| 3972 | [pass] feature SAFE-172 pass criteria present | pass |
| 3973 | [pass] feature SAFE-173 name present | pass |
| 3974 | [pass] feature SAFE-173 UI need 비대상 | pass |
| 3975 | [pass] feature SAFE-173 test need 필요 | pass |
| 3976 | [pass] feature SAFE-173 test area assigned | pass |
| 3977 | [pass] feature SAFE-173 pass criteria present | pass |
| 3978 | [pass] feature SAFE-174 name present | pass |
| 3979 | [pass] feature SAFE-174 UI need 비대상 | pass |
| 3980 | [pass] feature SAFE-174 test need 필요 | pass |
| 3981 | [pass] feature SAFE-174 test area assigned | pass |
| 3982 | [pass] feature SAFE-174 pass criteria present | pass |
| 3983 | [pass] feature SAFE-175 name present | pass |
| 3984 | [pass] feature SAFE-175 UI need 비대상 | pass |
| 3985 | [pass] feature SAFE-175 test need 필요 | pass |
| 3986 | [pass] feature SAFE-175 test area assigned | pass |
| 3987 | [pass] feature SAFE-175 pass criteria present | pass |
| 3988 | [pass] feature SAFE-176 name present | pass |
| 3989 | [pass] feature SAFE-176 UI need 비대상 | pass |
| 3990 | [pass] feature SAFE-176 test need 필요 | pass |
| 3991 | [pass] feature SAFE-176 test area assigned | pass |
| 3992 | [pass] feature SAFE-176 pass criteria present | pass |
| 3993 | [pass] feature SAFE-177 name present | pass |
| 3994 | [pass] feature SAFE-177 UI need 비대상 | pass |
| 3995 | [pass] feature SAFE-177 test need 필요 | pass |
| 3996 | [pass] feature SAFE-177 test area assigned | pass |
| 3997 | [pass] feature SAFE-177 pass criteria present | pass |
| 3998 | [pass] feature SAFE-178 name present | pass |
| 3999 | [pass] feature SAFE-178 UI need 비대상 | pass |
| 4000 | [pass] feature SAFE-178 test need 필요 | pass |
| 4001 | [pass] feature SAFE-178 test area assigned | pass |
| 4002 | [pass] feature SAFE-178 pass criteria present | pass |
| 4003 | [pass] feature SAFE-179 name present | pass |
| 4004 | [pass] feature SAFE-179 UI need 비대상 | pass |
| 4005 | [pass] feature SAFE-179 test need 필요 | pass |
| 4006 | [pass] feature SAFE-179 test area assigned | pass |
| 4007 | [pass] feature SAFE-179 pass criteria present | pass |
| 4008 | [pass] feature SAFE-180 name present | pass |
| 4009 | [pass] feature SAFE-180 UI need 비대상 | pass |
| 4010 | [pass] feature SAFE-180 test need 필요 | pass |
| 4011 | [pass] feature SAFE-180 test area assigned | pass |
| 4012 | [pass] feature SAFE-180 pass criteria present | pass |
| 4013 | [pass] feature SAFE-181 name present | pass |
| 4014 | [pass] feature SAFE-181 UI need 비대상 | pass |
| 4015 | [pass] feature SAFE-181 test need 필요 | pass |
| 4016 | [pass] feature SAFE-181 test area assigned | pass |
| 4017 | [pass] feature SAFE-181 pass criteria present | pass |
| 4018 | [pass] feature SAFE-182 name present | pass |
| 4019 | [pass] feature SAFE-182 UI need 비대상 | pass |
| 4020 | [pass] feature SAFE-182 test need 필요 | pass |
| 4021 | [pass] feature SAFE-182 test area assigned | pass |
| 4022 | [pass] feature SAFE-182 pass criteria present | pass |
| 4023 | [pass] feature SAFE-183 name present | pass |
| 4024 | [pass] feature SAFE-183 UI need 비대상 | pass |
| 4025 | [pass] feature SAFE-183 test need 필요 | pass |
| 4026 | [pass] feature SAFE-183 test area assigned | pass |
| 4027 | [pass] feature SAFE-183 pass criteria present | pass |
| 4028 | [pass] feature SAFE-184 name present | pass |
| 4029 | [pass] feature SAFE-184 UI need 비대상 | pass |
| 4030 | [pass] feature SAFE-184 test need 필요 | pass |
| 4031 | [pass] feature SAFE-184 test area assigned | pass |
| 4032 | [pass] feature SAFE-184 pass criteria present | pass |
| 4033 | [pass] feature SAFE-185 name present | pass |
| 4034 | [pass] feature SAFE-185 UI need 비대상 | pass |
| 4035 | [pass] feature SAFE-185 test need 필요 | pass |
| 4036 | [pass] feature SAFE-185 test area assigned | pass |
| 4037 | [pass] feature SAFE-185 pass criteria present | pass |
| 4038 | [pass] feature SAFE-186 name present | pass |
| 4039 | [pass] feature SAFE-186 UI need 비대상 | pass |
| 4040 | [pass] feature SAFE-186 test need 필요 | pass |
| 4041 | [pass] feature SAFE-186 test area assigned | pass |
| 4042 | [pass] feature SAFE-186 pass criteria present | pass |
| 4043 | [pass] feature SAFE-187 name present | pass |
| 4044 | [pass] feature SAFE-187 UI need 비대상 | pass |
| 4045 | [pass] feature SAFE-187 test need 필요 | pass |
| 4046 | [pass] feature SAFE-187 test area assigned | pass |
| 4047 | [pass] feature SAFE-187 pass criteria present | pass |
| 4048 | [pass] feature SAFE-188 name present | pass |
| 4049 | [pass] feature SAFE-188 UI need 비대상 | pass |
| 4050 | [pass] feature SAFE-188 test need 필요 | pass |
| 4051 | [pass] feature SAFE-188 test area assigned | pass |
| 4052 | [pass] feature SAFE-188 pass criteria present | pass |
| 4053 | [pass] feature SAFE-189 name present | pass |
| 4054 | [pass] feature SAFE-189 UI need 비대상 | pass |
| 4055 | [pass] feature SAFE-189 test need 필요 | pass |
| 4056 | [pass] feature SAFE-189 test area assigned | pass |
| 4057 | [pass] feature SAFE-189 pass criteria present | pass |
| 4058 | [pass] feature SAFE-190 name present | pass |
| 4059 | [pass] feature SAFE-190 UI need 비대상 | pass |
| 4060 | [pass] feature SAFE-190 test need 필요 | pass |
| 4061 | [pass] feature SAFE-190 test area assigned | pass |
| 4062 | [pass] feature SAFE-190 pass criteria present | pass |
| 4063 | [pass] feature SAFE-191 name present | pass |
| 4064 | [pass] feature SAFE-191 UI need 비대상 | pass |
| 4065 | [pass] feature SAFE-191 test need 필요 | pass |
| 4066 | [pass] feature SAFE-191 test area assigned | pass |
| 4067 | [pass] feature SAFE-191 pass criteria present | pass |
| 4068 | [pass] feature SAFE-192 name present | pass |
| 4069 | [pass] feature SAFE-192 UI need 비대상 | pass |
| 4070 | [pass] feature SAFE-192 test need 필요 | pass |
| 4071 | [pass] feature SAFE-192 test area assigned | pass |
| 4072 | [pass] feature SAFE-192 pass criteria present | pass |
| 4073 | [pass] feature SAFE-193 name present | pass |
| 4074 | [pass] feature SAFE-193 UI need 비대상 | pass |
| 4075 | [pass] feature SAFE-193 test need 필요 | pass |
| 4076 | [pass] feature SAFE-193 test area assigned | pass |
| 4077 | [pass] feature SAFE-193 pass criteria present | pass |
| 4078 | [pass] feature SAFE-194 name present | pass |
| 4079 | [pass] feature SAFE-194 UI need 비대상 | pass |
| 4080 | [pass] feature SAFE-194 test need 필요 | pass |
| 4081 | [pass] feature SAFE-194 test area assigned | pass |
| 4082 | [pass] feature SAFE-194 pass criteria present | pass |
| 4083 | [pass] feature SAFE-195 name present | pass |
| 4084 | [pass] feature SAFE-195 UI need 비대상 | pass |
| 4085 | [pass] feature SAFE-195 test need 필요 | pass |
| 4086 | [pass] feature SAFE-195 test area assigned | pass |
| 4087 | [pass] feature SAFE-195 pass criteria present | pass |
| 4088 | [pass] feature SAFE-196 name present | pass |
| 4089 | [pass] feature SAFE-196 UI need 비대상 | pass |
| 4090 | [pass] feature SAFE-196 test need 필요 | pass |
| 4091 | [pass] feature SAFE-196 test area assigned | pass |
| 4092 | [pass] feature SAFE-196 pass criteria present | pass |
| 4093 | [pass] feature SAFE-197 name present | pass |
| 4094 | [pass] feature SAFE-197 UI need 비대상 | pass |
| 4095 | [pass] feature SAFE-197 test need 필요 | pass |
| 4096 | [pass] feature SAFE-197 test area assigned | pass |
| 4097 | [pass] feature SAFE-197 pass criteria present | pass |
| 4098 | [pass] feature SAFE-198 name present | pass |
| 4099 | [pass] feature SAFE-198 UI need 비대상 | pass |
| 4100 | [pass] feature SAFE-198 test need 필요 | pass |
| 4101 | [pass] feature SAFE-198 test area assigned | pass |
| 4102 | [pass] feature SAFE-198 pass criteria present | pass |
| 4103 | [pass] feature SAFE-199 name present | pass |
| 4104 | [pass] feature SAFE-199 UI need 비대상 | pass |
| 4105 | [pass] feature SAFE-199 test need 필요 | pass |
| 4106 | [pass] feature SAFE-199 test area assigned | pass |
| 4107 | [pass] feature SAFE-199 pass criteria present | pass |
| 4108 | [pass] feature SAFE-200 name present | pass |
| 4109 | [pass] feature SAFE-200 UI need 비대상 | pass |
| 4110 | [pass] feature SAFE-200 test need 필요 | pass |
| 4111 | [pass] feature SAFE-200 test area assigned | pass |
| 4112 | [pass] feature SAFE-200 pass criteria present | pass |
| 4113 | [pass] feature SAFE-201 name present | pass |
| 4114 | [pass] feature SAFE-201 UI need 비대상 | pass |
| 4115 | [pass] feature SAFE-201 test need 필요 | pass |
| 4116 | [pass] feature SAFE-201 test area assigned | pass |
| 4117 | [pass] feature SAFE-201 pass criteria present | pass |
| 4118 | [pass] feature SAFE-202 name present | pass |
| 4119 | [pass] feature SAFE-202 UI need 비대상 | pass |
| 4120 | [pass] feature SAFE-202 test need 필요 | pass |
| 4121 | [pass] feature SAFE-202 test area assigned | pass |
| 4122 | [pass] feature SAFE-202 pass criteria present | pass |
| 4123 | [pass] feature SAFE-203 name present | pass |
| 4124 | [pass] feature SAFE-203 UI need 비대상 | pass |
| 4125 | [pass] feature SAFE-203 test need 필요 | pass |
| 4126 | [pass] feature SAFE-203 test area assigned | pass |
| 4127 | [pass] feature SAFE-203 pass criteria present | pass |
| 4128 | [pass] feature SAFE-204 name present | pass |
| 4129 | [pass] feature SAFE-204 UI need 비대상 | pass |
| 4130 | [pass] feature SAFE-204 test need 필요 | pass |
| 4131 | [pass] feature SAFE-204 test area assigned | pass |
| 4132 | [pass] feature SAFE-204 pass criteria present | pass |
| 4133 | [pass] feature SAFE-205 name present | pass |
| 4134 | [pass] feature SAFE-205 UI need 비대상 | pass |
| 4135 | [pass] feature SAFE-205 test need 필요 | pass |
| 4136 | [pass] feature SAFE-205 test area assigned | pass |
| 4137 | [pass] feature SAFE-205 pass criteria present | pass |
| 4138 | [pass] feature SAFE-206 name present | pass |
| 4139 | [pass] feature SAFE-206 UI need 비대상 | pass |
| 4140 | [pass] feature SAFE-206 test need 필요 | pass |
| 4141 | [pass] feature SAFE-206 test area assigned | pass |
| 4142 | [pass] feature SAFE-206 pass criteria present | pass |
| 4143 | [pass] feature SAFE-207 name present | pass |
| 4144 | [pass] feature SAFE-207 UI need 비대상 | pass |
| 4145 | [pass] feature SAFE-207 test need 필요 | pass |
| 4146 | [pass] feature SAFE-207 test area assigned | pass |
| 4147 | [pass] feature SAFE-207 pass criteria present | pass |
| 4148 | [pass] feature SAFE-208 name present | pass |
| 4149 | [pass] feature SAFE-208 UI need 비대상 | pass |
| 4150 | [pass] feature SAFE-208 test need 필요 | pass |
| 4151 | [pass] feature SAFE-208 test area assigned | pass |
| 4152 | [pass] feature SAFE-208 pass criteria present | pass |
| 4153 | [pass] feature SAFE-209 name present | pass |
| 4154 | [pass] feature SAFE-209 UI need 비대상 | pass |
| 4155 | [pass] feature SAFE-209 test need 필요 | pass |
| 4156 | [pass] feature SAFE-209 test area assigned | pass |
| 4157 | [pass] feature SAFE-209 pass criteria present | pass |
| 4158 | [pass] feature SAFE-210 name present | pass |
| 4159 | [pass] feature SAFE-210 UI need 비대상 | pass |
| 4160 | [pass] feature SAFE-210 test need 필요 | pass |
| 4161 | [pass] feature SAFE-210 test area assigned | pass |
| 4162 | [pass] feature SAFE-210 pass criteria present | pass |
| 4163 | [pass] feature SAFE-211 name present | pass |
| 4164 | [pass] feature SAFE-211 UI need 비대상 | pass |
| 4165 | [pass] feature SAFE-211 test need 필요 | pass |
| 4166 | [pass] feature SAFE-211 test area assigned | pass |
| 4167 | [pass] feature SAFE-211 pass criteria present | pass |
| 4168 | [pass] feature SAFE-212 name present | pass |
| 4169 | [pass] feature SAFE-212 UI need 비대상 | pass |
| 4170 | [pass] feature SAFE-212 test need 필요 | pass |
| 4171 | [pass] feature SAFE-212 test area assigned | pass |
| 4172 | [pass] feature SAFE-212 pass criteria present | pass |
| 4173 | [pass] feature SAFE-213 name present | pass |
| 4174 | [pass] feature SAFE-213 UI need 비대상 | pass |
| 4175 | [pass] feature SAFE-213 test need 필요 | pass |
| 4176 | [pass] feature SAFE-213 test area assigned | pass |
| 4177 | [pass] feature SAFE-213 pass criteria present | pass |
| 4178 | [pass] feature SAFE-214 name present | pass |
| 4179 | [pass] feature SAFE-214 UI need 비대상 | pass |
| 4180 | [pass] feature SAFE-214 test need 필요 | pass |
| 4181 | [pass] feature SAFE-214 test area assigned | pass |
| 4182 | [pass] feature SAFE-214 pass criteria present | pass |
| 4183 | [pass] feature SAFE-215 name present | pass |
| 4184 | [pass] feature SAFE-215 UI need 비대상 | pass |
| 4185 | [pass] feature SAFE-215 test need 필요 | pass |
| 4186 | [pass] feature SAFE-215 test area assigned | pass |
| 4187 | [pass] feature SAFE-215 pass criteria present | pass |
| 4188 | [pass] feature SAFE-216 name present | pass |
| 4189 | [pass] feature SAFE-216 UI need 비대상 | pass |
| 4190 | [pass] feature SAFE-216 test need 필요 | pass |
| 4191 | [pass] feature SAFE-216 test area assigned | pass |
| 4192 | [pass] feature SAFE-216 pass criteria present | pass |
| 4193 | [pass] feature SAFE-217 name present | pass |
| 4194 | [pass] feature SAFE-217 UI need 비대상 | pass |
| 4195 | [pass] feature SAFE-217 test need 필요 | pass |
| 4196 | [pass] feature SAFE-217 test area assigned | pass |
| 4197 | [pass] feature SAFE-217 pass criteria present | pass |
| 4198 | [pass] feature OPS-035 name present | pass |
| 4199 | [pass] feature OPS-035 UI need 비대상 | pass |
| 4200 | [pass] feature OPS-035 test need 필요 | pass |
| 4201 | [pass] feature OPS-035 test area assigned | pass |
| 4202 | [pass] feature OPS-035 pass criteria present | pass |
| 4203 | [pass] feature OPS-036 name present | pass |
| 4204 | [pass] feature OPS-036 UI need 비대상 | pass |
| 4205 | [pass] feature OPS-036 test need 필요 | pass |
| 4206 | [pass] feature OPS-036 test area assigned | pass |
| 4207 | [pass] feature OPS-036 pass criteria present | pass |
| 4208 | [pass] feature OPS-037 name present | pass |
| 4209 | [pass] feature OPS-037 UI need 비대상 | pass |
| 4210 | [pass] feature OPS-037 test need 필요 | pass |
| 4211 | [pass] feature OPS-037 test area assigned | pass |
| 4212 | [pass] feature OPS-037 pass criteria present | pass |
| 4213 | [pass] feature OPS-038 name present | pass |
| 4214 | [pass] feature OPS-038 UI need 비대상 | pass |
| 4215 | [pass] feature OPS-038 test need 필요 | pass |
| 4216 | [pass] feature OPS-038 test area assigned | pass |
| 4217 | [pass] feature OPS-038 pass criteria present | pass |
| 4218 | [pass] feature OPS-039 name present | pass |
| 4219 | [pass] feature OPS-039 UI need 비대상 | pass |
| 4220 | [pass] feature OPS-039 test need 필요 | pass |
| 4221 | [pass] feature OPS-039 test area assigned | pass |
| 4222 | [pass] feature OPS-039 pass criteria present | pass |
| 4223 | [pass] feature OPS-040 name present | pass |
| 4224 | [pass] feature OPS-040 UI need 비대상 | pass |
| 4225 | [pass] feature OPS-040 test need 필요 | pass |
| 4226 | [pass] feature OPS-040 test area assigned | pass |
| 4227 | [pass] feature OPS-040 pass criteria present | pass |
| 4228 | [pass] feature OPS-041 name present | pass |
| 4229 | [pass] feature OPS-041 UI need 비대상 | pass |
| 4230 | [pass] feature OPS-041 test need 필요 | pass |
| 4231 | [pass] feature OPS-041 test area assigned | pass |
| 4232 | [pass] feature OPS-041 pass criteria present | pass |
| 4233 | [pass] feature OPS-042 name present | pass |
| 4234 | [pass] feature OPS-042 UI need 비대상 | pass |
| 4235 | [pass] feature OPS-042 test need 필요 | pass |
| 4236 | [pass] feature OPS-042 test area assigned | pass |
| 4237 | [pass] feature OPS-042 pass criteria present | pass |
| 4238 | [pass] feature OPS-043 name present | pass |
| 4239 | [pass] feature OPS-043 UI need 비대상 | pass |
| 4240 | [pass] feature OPS-043 test need 필요 | pass |
| 4241 | [pass] feature OPS-043 test area assigned | pass |
| 4242 | [pass] feature OPS-043 pass criteria present | pass |
| 4243 | [pass] feature OPS-044 name present | pass |
| 4244 | [pass] feature OPS-044 UI need 비대상 | pass |
| 4245 | [pass] feature OPS-044 test need 필요 | pass |
| 4246 | [pass] feature OPS-044 test area assigned | pass |
| 4247 | [pass] feature OPS-044 pass criteria present | pass |
| 4248 | [pass] feature OPS-045 name present | pass |
| 4249 | [pass] feature OPS-045 UI need 비대상 | pass |
| 4250 | [pass] feature OPS-045 test need 필요 | pass |
| 4251 | [pass] feature OPS-045 test area assigned | pass |
| 4252 | [pass] feature OPS-045 pass criteria present | pass |
| 4253 | [pass] feature OPS-046 name present | pass |
| 4254 | [pass] feature OPS-046 UI need 비대상 | pass |
| 4255 | [pass] feature OPS-046 test need 필요 | pass |
| 4256 | [pass] feature OPS-046 test area assigned | pass |
| 4257 | [pass] feature OPS-046 pass criteria present | pass |
| 4258 | [pass] feature OPS-047 name present | pass |
| 4259 | [pass] feature OPS-047 UI need 비대상 | pass |
| 4260 | [pass] feature OPS-047 test need 필요 | pass |
| 4261 | [pass] feature OPS-047 test area assigned | pass |
| 4262 | [pass] feature OPS-047 pass criteria present | pass |
| 4263 | [pass] feature OPS-048 name present | pass |
| 4264 | [pass] feature OPS-048 UI need 비대상 | pass |
| 4265 | [pass] feature OPS-048 test need 필요 | pass |
| 4266 | [pass] feature OPS-048 test area assigned | pass |
| 4267 | [pass] feature OPS-048 pass criteria present | pass |
| 4268 | [pass] feature OPS-049 name present | pass |
| 4269 | [pass] feature OPS-049 UI need 비대상 | pass |
| 4270 | [pass] feature OPS-049 test need 필요 | pass |
| 4271 | [pass] feature OPS-049 test area assigned | pass |
| 4272 | [pass] feature OPS-049 pass criteria present | pass |
| 4273 | [pass] feature OPS-050 name present | pass |
| 4274 | [pass] feature OPS-050 UI need 비대상 | pass |
| 4275 | [pass] feature OPS-050 test need 필요 | pass |
| 4276 | [pass] feature OPS-050 test area assigned | pass |
| 4277 | [pass] feature OPS-050 pass criteria present | pass |
| 4278 | [pass] feature OPS-051 name present | pass |
| 4279 | [pass] feature OPS-051 UI need 비대상 | pass |
| 4280 | [pass] feature OPS-051 test need 필요 | pass |
| 4281 | [pass] feature OPS-051 test area assigned | pass |
| 4282 | [pass] feature OPS-051 pass criteria present | pass |
| 4283 | [pass] feature OPS-052 name present | pass |
| 4284 | [pass] feature OPS-052 UI need 비대상 | pass |
| 4285 | [pass] feature OPS-052 test need 필요 | pass |
| 4286 | [pass] feature OPS-052 test area assigned | pass |
| 4287 | [pass] feature OPS-052 pass criteria present | pass |
| 4288 | [pass] feature OPS-053 name present | pass |
| 4289 | [pass] feature OPS-053 UI need 비대상 | pass |
| 4290 | [pass] feature OPS-053 test need 필요 | pass |
| 4291 | [pass] feature OPS-053 test area assigned | pass |
| 4292 | [pass] feature OPS-053 pass criteria present | pass |
| 4293 | [pass] feature OPS-054 name present | pass |
| 4294 | [pass] feature OPS-054 UI need 비대상 | pass |
| 4295 | [pass] feature OPS-054 test need 필요 | pass |
| 4296 | [pass] feature OPS-054 test area assigned | pass |
| 4297 | [pass] feature OPS-054 pass criteria present | pass |
| 4298 | [pass] feature OPS-055 name present | pass |
| 4299 | [pass] feature OPS-055 UI need 비대상 | pass |
| 4300 | [pass] feature OPS-055 test need 필요 | pass |
| 4301 | [pass] feature OPS-055 test area assigned | pass |
| 4302 | [pass] feature OPS-055 pass criteria present | pass |
| 4303 | [pass] feature OPS-056 name present | pass |
| 4304 | [pass] feature OPS-056 UI need 비대상 | pass |
| 4305 | [pass] feature OPS-056 test need 필요 | pass |
| 4306 | [pass] feature OPS-056 test area assigned | pass |
| 4307 | [pass] feature OPS-056 pass criteria present | pass |
| 4308 | [pass] feature OPS-057 name present | pass |
| 4309 | [pass] feature OPS-057 UI need 비대상 | pass |
| 4310 | [pass] feature OPS-057 test need 필요 | pass |
| 4311 | [pass] feature OPS-057 test area assigned | pass |
| 4312 | [pass] feature OPS-057 pass criteria present | pass |
| 4313 | [pass] feature OPS-058 name present | pass |
| 4314 | [pass] feature OPS-058 UI need 비대상 | pass |
| 4315 | [pass] feature OPS-058 test need 필요 | pass |
| 4316 | [pass] feature OPS-058 test area assigned | pass |
| 4317 | [pass] feature OPS-058 pass criteria present | pass |
| 4318 | [pass] feature OPS-059 name present | pass |
| 4319 | [pass] feature OPS-059 UI need 비대상 | pass |
| 4320 | [pass] feature OPS-059 test need 필요 | pass |
| 4321 | [pass] feature OPS-059 test area assigned | pass |
| 4322 | [pass] feature OPS-059 pass criteria present | pass |
| 4323 | [pass] feature OPS-060 name present | pass |
| 4324 | [pass] feature OPS-060 UI need 비대상 | pass |
| 4325 | [pass] feature OPS-060 test need 필요 | pass |
| 4326 | [pass] feature OPS-060 test area assigned | pass |
| 4327 | [pass] feature OPS-060 pass criteria present | pass |
| 4328 | [pass] feature OPS-061 name present | pass |
| 4329 | [pass] feature OPS-061 UI need 비대상 | pass |
| 4330 | [pass] feature OPS-061 test need 필요 | pass |
| 4331 | [pass] feature OPS-061 test area assigned | pass |
| 4332 | [pass] feature OPS-061 pass criteria present | pass |
| 4333 | [pass] feature OPS-062 name present | pass |
| 4334 | [pass] feature OPS-062 UI need 비대상 | pass |
| 4335 | [pass] feature OPS-062 test need 필요 | pass |
| 4336 | [pass] feature OPS-062 test area assigned | pass |
| 4337 | [pass] feature OPS-062 pass criteria present | pass |
| 4338 | [pass] feature OPS-063 name present | pass |
| 4339 | [pass] feature OPS-063 UI need 비대상 | pass |
| 4340 | [pass] feature OPS-063 test need 필요 | pass |
| 4341 | [pass] feature OPS-063 test area assigned | pass |
| 4342 | [pass] feature OPS-063 pass criteria present | pass |
| 4343 | [pass] feature OPS-064 name present | pass |
| 4344 | [pass] feature OPS-064 UI need 비대상 | pass |
| 4345 | [pass] feature OPS-064 test need 필요 | pass |
| 4346 | [pass] feature OPS-064 test area assigned | pass |
| 4347 | [pass] feature OPS-064 pass criteria present | pass |
| 4348 | [pass] feature OPS-065 name present | pass |
| 4349 | [pass] feature OPS-065 UI need 비대상 | pass |
| 4350 | [pass] feature OPS-065 test need 필요 | pass |
| 4351 | [pass] feature OPS-065 test area assigned | pass |
| 4352 | [pass] feature OPS-065 pass criteria present | pass |
| 4353 | [pass] feature OPS-066 name present | pass |
| 4354 | [pass] feature OPS-066 UI need 비대상 | pass |
| 4355 | [pass] feature OPS-066 test need 필요 | pass |
| 4356 | [pass] feature OPS-066 test area assigned | pass |
| 4357 | [pass] feature OPS-066 pass criteria present | pass |
| 4358 | [pass] feature OPS-067 name present | pass |
| 4359 | [pass] feature OPS-067 UI need 비대상 | pass |
| 4360 | [pass] feature OPS-067 test need 필요 | pass |
| 4361 | [pass] feature OPS-067 test area assigned | pass |
| 4362 | [pass] feature OPS-067 pass criteria present | pass |
| 4363 | [pass] feature OPS-068 name present | pass |
| 4364 | [pass] feature OPS-068 UI need 비대상 | pass |
| 4365 | [pass] feature OPS-068 test need 필요 | pass |
| 4366 | [pass] feature OPS-068 test area assigned | pass |
| 4367 | [pass] feature OPS-068 pass criteria present | pass |
| 4368 | [pass] feature OPS-069 name present | pass |
| 4369 | [pass] feature OPS-069 UI need 비대상 | pass |
| 4370 | [pass] feature OPS-069 test need 필요 | pass |
| 4371 | [pass] feature OPS-069 test area assigned | pass |
| 4372 | [pass] feature OPS-069 pass criteria present | pass |
| 4373 | [pass] feature OPS-070 name present | pass |
| 4374 | [pass] feature OPS-070 UI need 비대상 | pass |
| 4375 | [pass] feature OPS-070 test need 필요 | pass |
| 4376 | [pass] feature OPS-070 test area assigned | pass |
| 4377 | [pass] feature OPS-070 pass criteria present | pass |
| 4378 | [pass] feature OPS-071 name present | pass |
| 4379 | [pass] feature OPS-071 UI need 비대상 | pass |
| 4380 | [pass] feature OPS-071 test need 필요 | pass |
| 4381 | [pass] feature OPS-071 test area assigned | pass |
| 4382 | [pass] feature OPS-071 pass criteria present | pass |
| 4383 | [pass] feature OPS-072 name present | pass |
| 4384 | [pass] feature OPS-072 UI need 비대상 | pass |
| 4385 | [pass] feature OPS-072 test need 필요 | pass |
| 4386 | [pass] feature OPS-072 test area assigned | pass |
| 4387 | [pass] feature OPS-072 pass criteria present | pass |
| 4388 | [pass] feature OPS-073 name present | pass |
| 4389 | [pass] feature OPS-073 UI need 비대상 | pass |
| 4390 | [pass] feature OPS-073 test need 필요 | pass |
| 4391 | [pass] feature OPS-073 test area assigned | pass |
| 4392 | [pass] feature OPS-073 pass criteria present | pass |
| 4393 | [pass] feature OPS-074 name present | pass |
| 4394 | [pass] feature OPS-074 UI need 비대상 | pass |
| 4395 | [pass] feature OPS-074 test need 필요 | pass |
| 4396 | [pass] feature OPS-074 test area assigned | pass |
| 4397 | [pass] feature OPS-074 pass criteria present | pass |
| 4398 | [pass] feature OPS-075 name present | pass |
| 4399 | [pass] feature OPS-075 UI need 비대상 | pass |
| 4400 | [pass] feature OPS-075 test need 필요 | pass |
| 4401 | [pass] feature OPS-075 test area assigned | pass |
| 4402 | [pass] feature OPS-075 pass criteria present | pass |
| 4403 | [pass] feature OPS-076 name present | pass |
| 4404 | [pass] feature OPS-076 UI need 비대상 | pass |
| 4405 | [pass] feature OPS-076 test need 필요 | pass |
| 4406 | [pass] feature OPS-076 test area assigned | pass |
| 4407 | [pass] feature OPS-076 pass criteria present | pass |
| 4408 | [pass] feature OPS-077 name present | pass |
| 4409 | [pass] feature OPS-077 UI need 비대상 | pass |
| 4410 | [pass] feature OPS-077 test need 필요 | pass |
| 4411 | [pass] feature OPS-077 test area assigned | pass |
| 4412 | [pass] feature OPS-077 pass criteria present | pass |
| 4413 | [pass] feature OPS-078 name present | pass |
| 4414 | [pass] feature OPS-078 UI need 비대상 | pass |
| 4415 | [pass] feature OPS-078 test need 필요 | pass |
| 4416 | [pass] feature OPS-078 test area assigned | pass |
| 4417 | [pass] feature OPS-078 pass criteria present | pass |
| 4418 | [pass] feature OPS-079 name present | pass |
| 4419 | [pass] feature OPS-079 UI need 비대상 | pass |
| 4420 | [pass] feature OPS-079 test need 필요 | pass |
| 4421 | [pass] feature OPS-079 test area assigned | pass |
| 4422 | [pass] feature OPS-079 pass criteria present | pass |
| 4423 | [pass] feature OPS-080 name present | pass |
| 4424 | [pass] feature OPS-080 UI need 비대상 | pass |
| 4425 | [pass] feature OPS-080 test need 필요 | pass |
| 4426 | [pass] feature OPS-080 test area assigned | pass |
| 4427 | [pass] feature OPS-080 pass criteria present | pass |
| 4428 | [pass] feature OPS-081 name present | pass |
| 4429 | [pass] feature OPS-081 UI need 비대상 | pass |
| 4430 | [pass] feature OPS-081 test need 필요 | pass |
| 4431 | [pass] feature OPS-081 test area assigned | pass |
| 4432 | [pass] feature OPS-081 pass criteria present | pass |
| 4433 | [pass] feature OPS-082 name present | pass |
| 4434 | [pass] feature OPS-082 UI need 비대상 | pass |
| 4435 | [pass] feature OPS-082 test need 필요 | pass |
| 4436 | [pass] feature OPS-082 test area assigned | pass |
| 4437 | [pass] feature OPS-082 pass criteria present | pass |
| 4438 | [pass] feature OPS-083 name present | pass |
| 4439 | [pass] feature OPS-083 UI need 비대상 | pass |
| 4440 | [pass] feature OPS-083 test need 필요 | pass |
| 4441 | [pass] feature OPS-083 test area assigned | pass |
| 4442 | [pass] feature OPS-083 pass criteria present | pass |
| 4443 | [pass] feature OPS-084 name present | pass |
| 4444 | [pass] feature OPS-084 UI need 비대상 | pass |
| 4445 | [pass] feature OPS-084 test need 필요 | pass |
| 4446 | [pass] feature OPS-084 test area assigned | pass |
| 4447 | [pass] feature OPS-084 pass criteria present | pass |
| 4448 | [pass] feature OPS-085 name present | pass |
| 4449 | [pass] feature OPS-085 UI need 비대상 | pass |
| 4450 | [pass] feature OPS-085 test need 필요 | pass |
| 4451 | [pass] feature OPS-085 test area assigned | pass |
| 4452 | [pass] feature OPS-085 pass criteria present | pass |
| 4453 | [pass] feature OPS-086 name present | pass |
| 4454 | [pass] feature OPS-086 UI need 비대상 | pass |
| 4455 | [pass] feature OPS-086 test need 필요 | pass |
| 4456 | [pass] feature OPS-086 test area assigned | pass |
| 4457 | [pass] feature OPS-086 pass criteria present | pass |
| 4458 | [pass] feature OPS-087 name present | pass |
| 4459 | [pass] feature OPS-087 UI need 비대상 | pass |
| 4460 | [pass] feature OPS-087 test need 필요 | pass |
| 4461 | [pass] feature OPS-087 test area assigned | pass |
| 4462 | [pass] feature OPS-087 pass criteria present | pass |
| 4463 | [pass] feature OPS-088 name present | pass |
| 4464 | [pass] feature OPS-088 UI need 비대상 | pass |
| 4465 | [pass] feature OPS-088 test need 필요 | pass |
| 4466 | [pass] feature OPS-088 test area assigned | pass |
| 4467 | [pass] feature OPS-088 pass criteria present | pass |
| 4468 | [pass] feature OPS-089 name present | pass |
| 4469 | [pass] feature OPS-089 UI need 비대상 | pass |
| 4470 | [pass] feature OPS-089 test need 필요 | pass |
| 4471 | [pass] feature OPS-089 test area assigned | pass |
| 4472 | [pass] feature OPS-089 pass criteria present | pass |
| 4473 | [pass] feature OPS-090 name present | pass |
| 4474 | [pass] feature OPS-090 UI need 비대상 | pass |
| 4475 | [pass] feature OPS-090 test need 필요 | pass |
| 4476 | [pass] feature OPS-090 test area assigned | pass |
| 4477 | [pass] feature OPS-090 pass criteria present | pass |
| 4478 | [pass] feature OPS-091 name present | pass |
| 4479 | [pass] feature OPS-091 UI need 비대상 | pass |
| 4480 | [pass] feature OPS-091 test need 필요 | pass |
| 4481 | [pass] feature OPS-091 test area assigned | pass |
| 4482 | [pass] feature OPS-091 pass criteria present | pass |
| 4483 | [pass] feature OPS-092 name present | pass |
| 4484 | [pass] feature OPS-092 UI need 비대상 | pass |
| 4485 | [pass] feature OPS-092 test need 필요 | pass |
| 4486 | [pass] feature OPS-092 test area assigned | pass |
| 4487 | [pass] feature OPS-092 pass criteria present | pass |
| 4488 | [pass] feature OPS-093 name present | pass |
| 4489 | [pass] feature OPS-093 UI need 비대상 | pass |
| 4490 | [pass] feature OPS-093 test need 필요 | pass |
| 4491 | [pass] feature OPS-093 test area assigned | pass |
| 4492 | [pass] feature OPS-093 pass criteria present | pass |
| 4493 | [pass] feature OPS-094 name present | pass |
| 4494 | [pass] feature OPS-094 UI need 비대상 | pass |
| 4495 | [pass] feature OPS-094 test need 필요 | pass |
| 4496 | [pass] feature OPS-094 test area assigned | pass |
| 4497 | [pass] feature OPS-094 pass criteria present | pass |
| 4498 | [pass] feature OPS-095 name present | pass |
| 4499 | [pass] feature OPS-095 UI need 비대상 | pass |
| 4500 | [pass] feature OPS-095 test need 필요 | pass |
| 4501 | [pass] feature OPS-095 test area assigned | pass |
| 4502 | [pass] feature OPS-095 pass criteria present | pass |
| 4503 | [pass] feature OPS-096 name present | pass |
| 4504 | [pass] feature OPS-096 UI need 비대상 | pass |
| 4505 | [pass] feature OPS-096 test need 필요 | pass |
| 4506 | [pass] feature OPS-096 test area assigned | pass |
| 4507 | [pass] feature OPS-096 pass criteria present | pass |
| 4508 | [pass] feature OPS-097 name present | pass |
| 4509 | [pass] feature OPS-097 UI need 비대상 | pass |
| 4510 | [pass] feature OPS-097 test need 필요 | pass |
| 4511 | [pass] feature OPS-097 test area assigned | pass |
| 4512 | [pass] feature OPS-097 pass criteria present | pass |
| 4513 | [pass] feature OPS-098 name present | pass |
| 4514 | [pass] feature OPS-098 UI need 비대상 | pass |
| 4515 | [pass] feature OPS-098 test need 필요 | pass |
| 4516 | [pass] feature OPS-098 test area assigned | pass |
| 4517 | [pass] feature OPS-098 pass criteria present | pass |
| 4518 | [pass] feature OPS-099 name present | pass |
| 4519 | [pass] feature OPS-099 UI need 비대상 | pass |
| 4520 | [pass] feature OPS-099 test need 필요 | pass |
| 4521 | [pass] feature OPS-099 test area assigned | pass |
| 4522 | [pass] feature OPS-099 pass criteria present | pass |
| 4523 | [pass] feature OPS-100 name present | pass |
| 4524 | [pass] feature OPS-100 UI need 비대상 | pass |
| 4525 | [pass] feature OPS-100 test need 필요 | pass |
| 4526 | [pass] feature OPS-100 test area assigned | pass |
| 4527 | [pass] feature OPS-100 pass criteria present | pass |
| 4528 | [pass] feature OPS-101 name present | pass |
| 4529 | [pass] feature OPS-101 UI need 비대상 | pass |
| 4530 | [pass] feature OPS-101 test need 필요 | pass |
| 4531 | [pass] feature OPS-101 test area assigned | pass |
| 4532 | [pass] feature OPS-101 pass criteria present | pass |
| 4533 | [pass] feature OPS-102 name present | pass |
| 4534 | [pass] feature OPS-102 UI need 비대상 | pass |
| 4535 | [pass] feature OPS-102 test need 필요 | pass |
| 4536 | [pass] feature OPS-102 test area assigned | pass |
| 4537 | [pass] feature OPS-102 pass criteria present | pass |
| 4538 | [pass] feature OPS-103 name present | pass |
| 4539 | [pass] feature OPS-103 UI need 비대상 | pass |
| 4540 | [pass] feature OPS-103 test need 필요 | pass |
| 4541 | [pass] feature OPS-103 test area assigned | pass |
| 4542 | [pass] feature OPS-103 pass criteria present | pass |
| 4543 | [pass] feature OPS-104 name present | pass |
| 4544 | [pass] feature OPS-104 UI need 비대상 | pass |
| 4545 | [pass] feature OPS-104 test need 필요 | pass |
| 4546 | [pass] feature OPS-104 test area assigned | pass |
| 4547 | [pass] feature OPS-104 pass criteria present | pass |
| 4548 | [pass] feature OPS-105 name present | pass |
| 4549 | [pass] feature OPS-105 UI need 비대상 | pass |
| 4550 | [pass] feature OPS-105 test need 필요 | pass |
| 4551 | [pass] feature OPS-105 test area assigned | pass |
| 4552 | [pass] feature OPS-105 pass criteria present | pass |
| 4553 | [pass] feature OPS-106 name present | pass |
| 4554 | [pass] feature OPS-106 UI need 비대상 | pass |
| 4555 | [pass] feature OPS-106 test need 필요 | pass |
| 4556 | [pass] feature OPS-106 test area assigned | pass |
| 4557 | [pass] feature OPS-106 pass criteria present | pass |
| 4558 | [pass] feature OPS-107 name present | pass |
| 4559 | [pass] feature OPS-107 UI need 비대상 | pass |
| 4560 | [pass] feature OPS-107 test need 필요 | pass |
| 4561 | [pass] feature OPS-107 test area assigned | pass |
| 4562 | [pass] feature OPS-107 pass criteria present | pass |
| 4563 | [pass] feature OPS-108 name present | pass |
| 4564 | [pass] feature OPS-108 UI need 비대상 | pass |
| 4565 | [pass] feature OPS-108 test need 필요 | pass |
| 4566 | [pass] feature OPS-108 test area assigned | pass |
| 4567 | [pass] feature OPS-108 pass criteria present | pass |
| 4568 | [pass] feature OPS-109 name present | pass |
| 4569 | [pass] feature OPS-109 UI need 비대상 | pass |
| 4570 | [pass] feature OPS-109 test need 필요 | pass |
| 4571 | [pass] feature OPS-109 test area assigned | pass |
| 4572 | [pass] feature OPS-109 pass criteria present | pass |
| 4573 | [pass] feature OPS-110 name present | pass |
| 4574 | [pass] feature OPS-110 UI need 비대상 | pass |
| 4575 | [pass] feature OPS-110 test need 필요 | pass |
| 4576 | [pass] feature OPS-110 test area assigned | pass |
| 4577 | [pass] feature OPS-110 pass criteria present | pass |
| 4578 | [pass] feature OPS-111 name present | pass |
| 4579 | [pass] feature OPS-111 UI need 비대상 | pass |
| 4580 | [pass] feature OPS-111 test need 필요 | pass |
| 4581 | [pass] feature OPS-111 test area assigned | pass |
| 4582 | [pass] feature OPS-111 pass criteria present | pass |
| 4583 | [pass] feature OPS-112 name present | pass |
| 4584 | [pass] feature OPS-112 UI need 비대상 | pass |
| 4585 | [pass] feature OPS-112 test need 필요 | pass |
| 4586 | [pass] feature OPS-112 test area assigned | pass |
| 4587 | [pass] feature OPS-112 pass criteria present | pass |
| 4588 | [pass] feature OPS-113 name present | pass |
| 4589 | [pass] feature OPS-113 UI need 비대상 | pass |
| 4590 | [pass] feature OPS-113 test need 필요 | pass |
| 4591 | [pass] feature OPS-113 test area assigned | pass |
| 4592 | [pass] feature OPS-113 pass criteria present | pass |
| 4593 | [pass] feature OPS-114 name present | pass |
| 4594 | [pass] feature OPS-114 UI need 비대상 | pass |
| 4595 | [pass] feature OPS-114 test need 필요 | pass |
| 4596 | [pass] feature OPS-114 test area assigned | pass |
| 4597 | [pass] feature OPS-114 pass criteria present | pass |
| 4598 | [pass] feature OPS-115 name present | pass |
| 4599 | [pass] feature OPS-115 UI need 비대상 | pass |
| 4600 | [pass] feature OPS-115 test need 필요 | pass |
| 4601 | [pass] feature OPS-115 test area assigned | pass |
| 4602 | [pass] feature OPS-115 pass criteria present | pass |
| 4603 | [pass] feature OPS-116 name present | pass |
| 4604 | [pass] feature OPS-116 UI need 비대상 | pass |
| 4605 | [pass] feature OPS-116 test need 필요 | pass |
| 4606 | [pass] feature OPS-116 test area assigned | pass |
| 4607 | [pass] feature OPS-116 pass criteria present | pass |
| 4608 | [pass] feature OPS-117 name present | pass |
| 4609 | [pass] feature OPS-117 UI need 비대상 | pass |
| 4610 | [pass] feature OPS-117 test need 필요 | pass |
| 4611 | [pass] feature OPS-117 test area assigned | pass |
| 4612 | [pass] feature OPS-117 pass criteria present | pass |
| 4613 | [pass] feature OPS-118 name present | pass |
| 4614 | [pass] feature OPS-118 UI need 비대상 | pass |
| 4615 | [pass] feature OPS-118 test need 필요 | pass |
| 4616 | [pass] feature OPS-118 test area assigned | pass |
| 4617 | [pass] feature OPS-118 pass criteria present | pass |
| 4618 | [pass] feature OPS-119 name present | pass |
| 4619 | [pass] feature OPS-119 UI need 비대상 | pass |
| 4620 | [pass] feature OPS-119 test need 필요 | pass |
| 4621 | [pass] feature OPS-119 test area assigned | pass |
| 4622 | [pass] feature OPS-119 pass criteria present | pass |
| 4623 | [pass] feature OPS-120 name present | pass |
| 4624 | [pass] feature OPS-120 UI need 비대상 | pass |
| 4625 | [pass] feature OPS-120 test need 필요 | pass |
| 4626 | [pass] feature OPS-120 test area assigned | pass |
| 4627 | [pass] feature OPS-120 pass criteria present | pass |
| 4628 | [pass] feature OPS-121 name present | pass |
| 4629 | [pass] feature OPS-121 UI need 비대상 | pass |
| 4630 | [pass] feature OPS-121 test need 필요 | pass |
| 4631 | [pass] feature OPS-121 test area assigned | pass |
| 4632 | [pass] feature OPS-121 pass criteria present | pass |
| 4633 | [pass] feature OPS-122 name present | pass |
| 4634 | [pass] feature OPS-122 UI need 비대상 | pass |
| 4635 | [pass] feature OPS-122 test need 필요 | pass |
| 4636 | [pass] feature OPS-122 test area assigned | pass |
| 4637 | [pass] feature OPS-122 pass criteria present | pass |
| 4638 | [pass] feature OPS-123 name present | pass |
| 4639 | [pass] feature OPS-123 UI need 비대상 | pass |
| 4640 | [pass] feature OPS-123 test need 필요 | pass |
| 4641 | [pass] feature OPS-123 test area assigned | pass |
| 4642 | [pass] feature OPS-123 pass criteria present | pass |
| 4643 | [pass] feature OPS-124 name present | pass |
| 4644 | [pass] feature OPS-124 UI need 비대상 | pass |
| 4645 | [pass] feature OPS-124 test need 필요 | pass |
| 4646 | [pass] feature OPS-124 test area assigned | pass |
| 4647 | [pass] feature OPS-124 pass criteria present | pass |
| 4648 | [pass] feature OPS-125 name present | pass |
| 4649 | [pass] feature OPS-125 UI need 비대상 | pass |
| 4650 | [pass] feature OPS-125 test need 필요 | pass |
| 4651 | [pass] feature OPS-125 test area assigned | pass |
| 4652 | [pass] feature OPS-125 pass criteria present | pass |
| 4653 | [pass] feature OPS-126 name present | pass |
| 4654 | [pass] feature OPS-126 UI need 비대상 | pass |
| 4655 | [pass] feature OPS-126 test need 필요 | pass |
| 4656 | [pass] feature OPS-126 test area assigned | pass |
| 4657 | [pass] feature OPS-126 pass criteria present | pass |
| 4658 | [pass] feature OPS-127 name present | pass |
| 4659 | [pass] feature OPS-127 UI need 비대상 | pass |
| 4660 | [pass] feature OPS-127 test need 필요 | pass |
| 4661 | [pass] feature OPS-127 test area assigned | pass |
| 4662 | [pass] feature OPS-127 pass criteria present | pass |
| 4663 | [pass] feature OPS-128 name present | pass |
| 4664 | [pass] feature OPS-128 UI need 비대상 | pass |
| 4665 | [pass] feature OPS-128 test need 필요 | pass |
| 4666 | [pass] feature OPS-128 test area assigned | pass |
| 4667 | [pass] feature OPS-128 pass criteria present | pass |
| 4668 | [pass] feature OPS-129 name present | pass |
| 4669 | [pass] feature OPS-129 UI need 비대상 | pass |
| 4670 | [pass] feature OPS-129 test need 필요 | pass |
| 4671 | [pass] feature OPS-129 test area assigned | pass |
| 4672 | [pass] feature OPS-129 pass criteria present | pass |
| 4673 | [pass] feature OPS-130 name present | pass |
| 4674 | [pass] feature OPS-130 UI need 비대상 | pass |
| 4675 | [pass] feature OPS-130 test need 필요 | pass |
| 4676 | [pass] feature OPS-130 test area assigned | pass |
| 4677 | [pass] feature OPS-130 pass criteria present | pass |
| 4678 | [pass] feature OPS-131 name present | pass |
| 4679 | [pass] feature OPS-131 UI need 비대상 | pass |
| 4680 | [pass] feature OPS-131 test need 필요 | pass |
| 4681 | [pass] feature OPS-131 test area assigned | pass |
| 4682 | [pass] feature OPS-131 pass criteria present | pass |
| 4683 | [pass] feature OPS-132 name present | pass |
| 4684 | [pass] feature OPS-132 UI need 비대상 | pass |
| 4685 | [pass] feature OPS-132 test need 필요 | pass |
| 4686 | [pass] feature OPS-132 test area assigned | pass |
| 4687 | [pass] feature OPS-132 pass criteria present | pass |
| 4688 | [pass] feature OPS-133 name present | pass |
| 4689 | [pass] feature OPS-133 UI need 비대상 | pass |
| 4690 | [pass] feature OPS-133 test need 필요 | pass |
| 4691 | [pass] feature OPS-133 test area assigned | pass |
| 4692 | [pass] feature OPS-133 pass criteria present | pass |
| 4693 | [pass] feature OPS-134 name present | pass |
| 4694 | [pass] feature OPS-134 UI need 비대상 | pass |
| 4695 | [pass] feature OPS-134 test need 필요 | pass |
| 4696 | [pass] feature OPS-134 test area assigned | pass |
| 4697 | [pass] feature OPS-134 pass criteria present | pass |
| 4698 | [pass] feature OPS-135 name present | pass |
| 4699 | [pass] feature OPS-135 UI need 비대상 | pass |
| 4700 | [pass] feature OPS-135 test need 필요 | pass |
| 4701 | [pass] feature OPS-135 test area assigned | pass |
| 4702 | [pass] feature OPS-135 pass criteria present | pass |
| 4703 | [pass] feature OPS-136 name present | pass |
| 4704 | [pass] feature OPS-136 UI need 비대상 | pass |
| 4705 | [pass] feature OPS-136 test need 필요 | pass |
| 4706 | [pass] feature OPS-136 test area assigned | pass |
| 4707 | [pass] feature OPS-136 pass criteria present | pass |
| 4708 | [pass] feature OPS-137 name present | pass |
| 4709 | [pass] feature OPS-137 UI need 비대상 | pass |
| 4710 | [pass] feature OPS-137 test need 필요 | pass |
| 4711 | [pass] feature OPS-137 test area assigned | pass |
| 4712 | [pass] feature OPS-137 pass criteria present | pass |
| 4713 | [pass] feature OPS-138 name present | pass |
| 4714 | [pass] feature OPS-138 UI need 비대상 | pass |
| 4715 | [pass] feature OPS-138 test need 필요 | pass |
| 4716 | [pass] feature OPS-138 test area assigned | pass |
| 4717 | [pass] feature OPS-138 pass criteria present | pass |
| 4718 | [pass] feature OPS-139 name present | pass |
| 4719 | [pass] feature OPS-139 UI need 비대상 | pass |
| 4720 | [pass] feature OPS-139 test need 필요 | pass |
| 4721 | [pass] feature OPS-139 test area assigned | pass |
| 4722 | [pass] feature OPS-139 pass criteria present | pass |
| 4723 | [pass] feature OPS-140 name present | pass |
| 4724 | [pass] feature OPS-140 UI need 비대상 | pass |
| 4725 | [pass] feature OPS-140 test need 필요 | pass |
| 4726 | [pass] feature OPS-140 test area assigned | pass |
| 4727 | [pass] feature OPS-140 pass criteria present | pass |
| 4728 | [pass] feature OPS-141 name present | pass |
| 4729 | [pass] feature OPS-141 UI need 비대상 | pass |
| 4730 | [pass] feature OPS-141 test need 필요 | pass |
| 4731 | [pass] feature OPS-141 test area assigned | pass |
| 4732 | [pass] feature OPS-141 pass criteria present | pass |
| 4733 | [pass] feature OPS-142 name present | pass |
| 4734 | [pass] feature OPS-142 UI need 비대상 | pass |
| 4735 | [pass] feature OPS-142 test need 필요 | pass |
| 4736 | [pass] feature OPS-142 test area assigned | pass |
| 4737 | [pass] feature OPS-142 pass criteria present | pass |
| 4738 | [pass] feature OPS-143 name present | pass |
| 4739 | [pass] feature OPS-143 UI need 비대상 | pass |
| 4740 | [pass] feature OPS-143 test need 필요 | pass |
| 4741 | [pass] feature OPS-143 test area assigned | pass |
| 4742 | [pass] feature OPS-143 pass criteria present | pass |
| 4743 | [pass] feature OPS-144 name present | pass |
| 4744 | [pass] feature OPS-144 UI need 비대상 | pass |
| 4745 | [pass] feature OPS-144 test need 필요 | pass |
| 4746 | [pass] feature OPS-144 test area assigned | pass |
| 4747 | [pass] feature OPS-144 pass criteria present | pass |
| 4748 | [pass] feature OPS-145 name present | pass |
| 4749 | [pass] feature OPS-145 UI need 비대상 | pass |
| 4750 | [pass] feature OPS-145 test need 필요 | pass |
| 4751 | [pass] feature OPS-145 test area assigned | pass |
| 4752 | [pass] feature OPS-145 pass criteria present | pass |
| 4753 | [pass] feature OPS-146 name present | pass |
| 4754 | [pass] feature OPS-146 UI need 비대상 | pass |
| 4755 | [pass] feature OPS-146 test need 필요 | pass |
| 4756 | [pass] feature OPS-146 test area assigned | pass |
| 4757 | [pass] feature OPS-146 pass criteria present | pass |
| 4758 | [pass] feature OPS-147 name present | pass |
| 4759 | [pass] feature OPS-147 UI need 비대상 | pass |
| 4760 | [pass] feature OPS-147 test need 필요 | pass |
| 4761 | [pass] feature OPS-147 test area assigned | pass |
| 4762 | [pass] feature OPS-147 pass criteria present | pass |
| 4763 | [pass] feature OPS-148 name present | pass |
| 4764 | [pass] feature OPS-148 UI need 비대상 | pass |
| 4765 | [pass] feature OPS-148 test need 필요 | pass |
| 4766 | [pass] feature OPS-148 test area assigned | pass |
| 4767 | [pass] feature OPS-148 pass criteria present | pass |
| 4768 | [pass] feature OPS-149 name present | pass |
| 4769 | [pass] feature OPS-149 UI need 비대상 | pass |
| 4770 | [pass] feature OPS-149 test need 필요 | pass |
| 4771 | [pass] feature OPS-149 test area assigned | pass |
| 4772 | [pass] feature OPS-149 pass criteria present | pass |
| 4773 | [pass] feature OPS-150 name present | pass |
| 4774 | [pass] feature OPS-150 UI need 비대상 | pass |
| 4775 | [pass] feature OPS-150 test need 필요 | pass |
| 4776 | [pass] feature OPS-150 test area assigned | pass |
| 4777 | [pass] feature OPS-150 pass criteria present | pass |
| 4778 | [pass] feature OPS-151 name present | pass |
| 4779 | [pass] feature OPS-151 UI need 비대상 | pass |
| 4780 | [pass] feature OPS-151 test need 필요 | pass |
| 4781 | [pass] feature OPS-151 test area assigned | pass |
| 4782 | [pass] feature OPS-151 pass criteria present | pass |
| 4783 | [pass] feature OPS-152 name present | pass |
| 4784 | [pass] feature OPS-152 UI need 비대상 | pass |
| 4785 | [pass] feature OPS-152 test need 필요 | pass |
| 4786 | [pass] feature OPS-152 test area assigned | pass |
| 4787 | [pass] feature OPS-152 pass criteria present | pass |
| 4788 | [pass] feature OPS-153 name present | pass |
| 4789 | [pass] feature OPS-153 UI need 비대상 | pass |
| 4790 | [pass] feature OPS-153 test need 필요 | pass |
| 4791 | [pass] feature OPS-153 test area assigned | pass |
| 4792 | [pass] feature OPS-153 pass criteria present | pass |
| 4793 | [pass] feature OPS-154 name present | pass |
| 4794 | [pass] feature OPS-154 UI need 비대상 | pass |
| 4795 | [pass] feature OPS-154 test need 필요 | pass |
| 4796 | [pass] feature OPS-154 test area assigned | pass |
| 4797 | [pass] feature OPS-154 pass criteria present | pass |
| 4798 | [pass] feature OPS-155 name present | pass |
| 4799 | [pass] feature OPS-155 UI need 비대상 | pass |
| 4800 | [pass] feature OPS-155 test need 필요 | pass |
| 4801 | [pass] feature OPS-155 test area assigned | pass |
| 4802 | [pass] feature OPS-155 pass criteria present | pass |
| 4803 | [pass] feature OPS-156 name present | pass |
| 4804 | [pass] feature OPS-156 UI need 비대상 | pass |
| 4805 | [pass] feature OPS-156 test need 필요 | pass |
| 4806 | [pass] feature OPS-156 test area assigned | pass |
| 4807 | [pass] feature OPS-156 pass criteria present | pass |
| 4808 | [pass] feature OPS-157 name present | pass |
| 4809 | [pass] feature OPS-157 UI need 비대상 | pass |
| 4810 | [pass] feature OPS-157 test need 필요 | pass |
| 4811 | [pass] feature OPS-157 test area assigned | pass |
| 4812 | [pass] feature OPS-157 pass criteria present | pass |
| 4813 | [pass] feature OPS-158 name present | pass |
| 4814 | [pass] feature OPS-158 UI need 비대상 | pass |
| 4815 | [pass] feature OPS-158 test need 필요 | pass |
| 4816 | [pass] feature OPS-158 test area assigned | pass |
| 4817 | [pass] feature OPS-158 pass criteria present | pass |
| 4818 | [pass] feature OPS-159 name present | pass |
| 4819 | [pass] feature OPS-159 UI need 비대상 | pass |
| 4820 | [pass] feature OPS-159 test need 필요 | pass |
| 4821 | [pass] feature OPS-159 test area assigned | pass |
| 4822 | [pass] feature OPS-159 pass criteria present | pass |
| 4823 | [pass] feature OPS-160 name present | pass |
| 4824 | [pass] feature OPS-160 UI need 비대상 | pass |
| 4825 | [pass] feature OPS-160 test need 필요 | pass |
| 4826 | [pass] feature OPS-160 test area assigned | pass |
| 4827 | [pass] feature OPS-160 pass criteria present | pass |
| 4828 | [pass] feature OPS-161 name present | pass |
| 4829 | [pass] feature OPS-161 UI need 비대상 | pass |
| 4830 | [pass] feature OPS-161 test need 필요 | pass |
| 4831 | [pass] feature OPS-161 test area assigned | pass |
| 4832 | [pass] feature OPS-161 pass criteria present | pass |
| 4833 | [pass] feature OPS-162 name present | pass |
| 4834 | [pass] feature OPS-162 UI need 비대상 | pass |
| 4835 | [pass] feature OPS-162 test need 필요 | pass |
| 4836 | [pass] feature OPS-162 test area assigned | pass |
| 4837 | [pass] feature OPS-162 pass criteria present | pass |
| 4838 | [pass] feature OPS-163 name present | pass |
| 4839 | [pass] feature OPS-163 UI need 비대상 | pass |
| 4840 | [pass] feature OPS-163 test need 필요 | pass |
| 4841 | [pass] feature OPS-163 test area assigned | pass |
| 4842 | [pass] feature OPS-163 pass criteria present | pass |
| 4843 | [pass] feature OPS-164 name present | pass |
| 4844 | [pass] feature OPS-164 UI need 비대상 | pass |
| 4845 | [pass] feature OPS-164 test need 필요 | pass |
| 4846 | [pass] feature OPS-164 test area assigned | pass |
| 4847 | [pass] feature OPS-164 pass criteria present | pass |
| 4848 | [pass] feature OPS-165 name present | pass |
| 4849 | [pass] feature OPS-165 UI need 비대상 | pass |
| 4850 | [pass] feature OPS-165 test need 필요 | pass |
| 4851 | [pass] feature OPS-165 test area assigned | pass |
| 4852 | [pass] feature OPS-165 pass criteria present | pass |
| 4853 | [pass] feature OPS-166 name present | pass |
| 4854 | [pass] feature OPS-166 UI need 비대상 | pass |
| 4855 | [pass] feature OPS-166 test need 필요 | pass |
| 4856 | [pass] feature OPS-166 test area assigned | pass |
| 4857 | [pass] feature OPS-166 pass criteria present | pass |
| 4858 | [pass] feature OPS-167 name present | pass |
| 4859 | [pass] feature OPS-167 UI need 비대상 | pass |
| 4860 | [pass] feature OPS-167 test need 필요 | pass |
| 4861 | [pass] feature OPS-167 test area assigned | pass |
| 4862 | [pass] feature OPS-167 pass criteria present | pass |
| 4863 | [pass] feature OPS-168 name present | pass |
| 4864 | [pass] feature OPS-168 UI need 비대상 | pass |
| 4865 | [pass] feature OPS-168 test need 필요 | pass |
| 4866 | [pass] feature OPS-168 test area assigned | pass |
| 4867 | [pass] feature OPS-168 pass criteria present | pass |
| 4868 | [pass] feature OPS-169 name present | pass |
| 4869 | [pass] feature OPS-169 UI need 비대상 | pass |
| 4870 | [pass] feature OPS-169 test need 필요 | pass |
| 4871 | [pass] feature OPS-169 test area assigned | pass |
| 4872 | [pass] feature OPS-169 pass criteria present | pass |
| 4873 | [pass] feature OPS-170 name present | pass |
| 4874 | [pass] feature OPS-170 UI need 비대상 | pass |
| 4875 | [pass] feature OPS-170 test need 필요 | pass |
| 4876 | [pass] feature OPS-170 test area assigned | pass |
| 4877 | [pass] feature OPS-170 pass criteria present | pass |
| 4878 | [pass] feature OPS-171 name present | pass |
| 4879 | [pass] feature OPS-171 UI need 비대상 | pass |
| 4880 | [pass] feature OPS-171 test need 필요 | pass |
| 4881 | [pass] feature OPS-171 test area assigned | pass |
| 4882 | [pass] feature OPS-171 pass criteria present | pass |
| 4883 | [pass] feature OPS-172 name present | pass |
| 4884 | [pass] feature OPS-172 UI need 비대상 | pass |
| 4885 | [pass] feature OPS-172 test need 필요 | pass |
| 4886 | [pass] feature OPS-172 test area assigned | pass |
| 4887 | [pass] feature OPS-172 pass criteria present | pass |
| 4888 | [pass] feature OPS-173 name present | pass |
| 4889 | [pass] feature OPS-173 UI need 비대상 | pass |
| 4890 | [pass] feature OPS-173 test need 필요 | pass |
| 4891 | [pass] feature OPS-173 test area assigned | pass |
| 4892 | [pass] feature OPS-173 pass criteria present | pass |
| 4893 | [pass] feature OPS-174 name present | pass |
| 4894 | [pass] feature OPS-174 UI need 비대상 | pass |
| 4895 | [pass] feature OPS-174 test need 필요 | pass |
| 4896 | [pass] feature OPS-174 test area assigned | pass |
| 4897 | [pass] feature OPS-174 pass criteria present | pass |
| 4898 | [pass] feature OPS-175 name present | pass |
| 4899 | [pass] feature OPS-175 UI need 비대상 | pass |
| 4900 | [pass] feature OPS-175 test need 필요 | pass |
| 4901 | [pass] feature OPS-175 test area assigned | pass |
| 4902 | [pass] feature OPS-175 pass criteria present | pass |
| 4903 | [pass] feature OPS-176 name present | pass |
| 4904 | [pass] feature OPS-176 UI need 비대상 | pass |
| 4905 | [pass] feature OPS-176 test need 필요 | pass |
| 4906 | [pass] feature OPS-176 test area assigned | pass |
| 4907 | [pass] feature OPS-176 pass criteria present | pass |
| 4908 | [pass] feature OPS-177 name present | pass |
| 4909 | [pass] feature OPS-177 UI need 비대상 | pass |
| 4910 | [pass] feature OPS-177 test need 필요 | pass |
| 4911 | [pass] feature OPS-177 test area assigned | pass |
| 4912 | [pass] feature OPS-177 pass criteria present | pass |
| 4913 | [pass] feature OPS-178 name present | pass |
| 4914 | [pass] feature OPS-178 UI need 비대상 | pass |
| 4915 | [pass] feature OPS-178 test need 필요 | pass |
| 4916 | [pass] feature OPS-178 test area assigned | pass |
| 4917 | [pass] feature OPS-178 pass criteria present | pass |
| 4918 | [pass] feature OPS-179 name present | pass |
| 4919 | [pass] feature OPS-179 UI need 비대상 | pass |
| 4920 | [pass] feature OPS-179 test need 필요 | pass |
| 4921 | [pass] feature OPS-179 test area assigned | pass |
| 4922 | [pass] feature OPS-179 pass criteria present | pass |
| 4923 | [pass] feature OPS-180 name present | pass |
| 4924 | [pass] feature OPS-180 UI need 비대상 | pass |
| 4925 | [pass] feature OPS-180 test need 필요 | pass |
| 4926 | [pass] feature OPS-180 test area assigned | pass |
| 4927 | [pass] feature OPS-180 pass criteria present | pass |
| 4928 | [pass] feature OPS-181 name present | pass |
| 4929 | [pass] feature OPS-181 UI need 비대상 | pass |
| 4930 | [pass] feature OPS-181 test need 필요 | pass |
| 4931 | [pass] feature OPS-181 test area assigned | pass |
| 4932 | [pass] feature OPS-181 pass criteria present | pass |
| 4933 | [pass] feature OPS-182 name present | pass |
| 4934 | [pass] feature OPS-182 UI need 비대상 | pass |
| 4935 | [pass] feature OPS-182 test need 필요 | pass |
| 4936 | [pass] feature OPS-182 test area assigned | pass |
| 4937 | [pass] feature OPS-182 pass criteria present | pass |
| 4938 | [pass] feature OPS-183 name present | pass |
| 4939 | [pass] feature OPS-183 UI need 비대상 | pass |
| 4940 | [pass] feature OPS-183 test need 필요 | pass |
| 4941 | [pass] feature OPS-183 test area assigned | pass |
| 4942 | [pass] feature OPS-183 pass criteria present | pass |
| 4943 | [pass] feature OPS-184 name present | pass |
| 4944 | [pass] feature OPS-184 UI need 비대상 | pass |
| 4945 | [pass] feature OPS-184 test need 필요 | pass |
| 4946 | [pass] feature OPS-184 test area assigned | pass |
| 4947 | [pass] feature OPS-184 pass criteria present | pass |
| 4948 | [pass] feature rows have required matrix columns | pass |
| 4949 | [pass] inventory rejects separate test-area labels | pass |
| 4950 | [pass] coverage wording separates mapping from execution | pass |
| 4951 | [pass] current feature expansion rows exist | pass |
| 4952 | [pass] manual UI docs reference inventory | pass |
| 4953 | [pass] manual checklist references seed fixture | pass |
| 4954 | [pass] manual result template references seed fixture | pass |
| 4955 | [pass] VA seed inventory commands select the latest published baseline explicitly | pass |
| 4956 | [pass] AGENTS requires individual future feature test rows | pass |
| 4957 | [pass] manual UI seed account role admin | pass |
| 4958 | [pass] manual UI seed account role operator | pass |
| 4959 | [pass] manual UI seed account role viewer | pass |
| 4960 | [pass] manual UI seed account role integrator | pass |
| 4961 | [pass] manual UI seed profile 9101 numeric id | pass |
| 4962 | [pass] manual UI seed profile 9101 tracking classes present | pass |
| 4963 | [pass] manual UI seed profile 9102 numeric id | pass |
| 4964 | [pass] manual UI seed profile 9102 tracking classes present | pass |
| 4965 | [pass] manual UI seed profile 9103 numeric id | pass |
| 4966 | [pass] manual UI seed profile 9103 tracking classes present | pass |
| 4967 | [pass] manual UI seed profile 9104 numeric id | pass |
| 4968 | [pass] manual UI seed profile 9104 tracking classes present | pass |
| 4969 | [pass] manual UI seed profile 9105 numeric id | pass |
| 4970 | [pass] manual UI seed profile 9105 tracking classes present | pass |
| 4971 | [pass] manual UI seed profile 9106 numeric id | pass |
| 4972 | [pass] manual UI seed profile 9106 tracking classes present | pass |
| 4973 | [pass] manual UI seed profile 9107 numeric id | pass |
| 4974 | [pass] manual UI seed profile 9107 tracking classes present | pass |
| 4975 | [pass] manual UI seed event type presence | pass |
| 4976 | [pass] manual UI seed event type enter | pass |
| 4977 | [pass] manual UI seed event type exit | pass |
| 4978 | [pass] manual UI seed event type line-crossing | pass |
| 4979 | [pass] manual UI seed event type intrusion-dwell | pass |
| 4980 | [pass] manual UI seed event type re-entry | pass |
| 4981 | [pass] manual UI seed event type wrong-direction | pass |
| 4982 | [pass] manual UI seed event type intrusion-after-line-crossing | pass |
| 4983 | [pass] manual UI seed event type loitering | pass |
| 4984 | [pass] manual UI seed event type zone-occupancy | pass |
| 4985 | [pass] manual UI seed event template 9201 numeric id | pass |
| 4986 | [pass] manual UI seed event template 9201 event type presence | pass |
| 4987 | [pass] manual UI seed event template 9201 profile reference | pass |
| 4988 | [pass] manual UI seed event template 9202 numeric id | pass |
| 4989 | [pass] manual UI seed event template 9202 event type enter | pass |
| 4990 | [pass] manual UI seed event template 9202 profile reference | pass |
| 4991 | [pass] manual UI seed event template 9203 numeric id | pass |
| 4992 | [pass] manual UI seed event template 9203 event type exit | pass |
| 4993 | [pass] manual UI seed event template 9203 profile reference | pass |
| 4994 | [pass] manual UI seed event template 9204 numeric id | pass |
| 4995 | [pass] manual UI seed event template 9204 event type line-crossing | pass |
| 4996 | [pass] manual UI seed event template 9204 profile reference | pass |
| 4997 | [pass] manual UI seed event template 9205 numeric id | pass |
| 4998 | [pass] manual UI seed event template 9205 event type line-crossing | pass |
| 4999 | [pass] manual UI seed event template 9205 profile reference | pass |
| 5000 | [pass] manual UI seed event template 9206 numeric id | pass |
| 5001 | [pass] manual UI seed event template 9206 event type line-crossing | pass |
| 5002 | [pass] manual UI seed event template 9206 profile reference | pass |
| 5003 | [pass] manual UI seed event template 9207 numeric id | pass |
| 5004 | [pass] manual UI seed event template 9207 event type intrusion-dwell | pass |
| 5005 | [pass] manual UI seed event template 9207 profile reference | pass |
| 5006 | [pass] manual UI seed event template 9208 numeric id | pass |
| 5007 | [pass] manual UI seed event template 9208 event type re-entry | pass |
| 5008 | [pass] manual UI seed event template 9208 profile reference | pass |
| 5009 | [pass] manual UI seed event template 9209 numeric id | pass |
| 5010 | [pass] manual UI seed event template 9209 event type wrong-direction | pass |
| 5011 | [pass] manual UI seed event template 9209 profile reference | pass |
| 5012 | [pass] manual UI seed event template 9210 numeric id | pass |
| 5013 | [pass] manual UI seed event template 9210 event type intrusion-after-line-crossing | pass |
| 5014 | [pass] manual UI seed event template 9210 profile reference | pass |
| 5015 | [pass] manual UI seed event template 9211 numeric id | pass |
| 5016 | [pass] manual UI seed event template 9211 event type loitering | pass |
| 5017 | [pass] manual UI seed event template 9211 profile reference | pass |
| 5018 | [pass] manual UI seed event template 9212 numeric id | pass |
| 5019 | [pass] manual UI seed event template 9212 event type zone-occupancy | pass |
| 5020 | [pass] manual UI seed event template 9212 profile reference | pass |
| 5021 | [pass] manual UI seed line direction any | pass |
| 5022 | [pass] manual UI seed line direction forward | pass |
| 5023 | [pass] manual UI seed line direction reverse | pass |
| 5024 | [pass] manual UI seed scenario preset default | pass |
| 5025 | [pass] manual UI seed scenario preset road | pass |
| 5026 | [pass] manual UI seed scenario preset retail | pass |
| 5027 | [pass] manual UI seed scenario preset park | pass |
| 5028 | [pass] manual UI seed scenario preset indoor | pass |
| 5029 | [pass] manual UI seed scenario preset lobby | pass |
| 5030 | [pass] manual UI seed scenario preset platform | pass |
| 5031 | [pass] manual UI seed scenario preset entrance | pass |
| 5032 | [pass] manual UI seed scenario preset doorway | pass |
| 5033 | [pass] manual UI seed scenario preset parking | pass |
| 5034 | [pass] manual UI seed scenario preset elevator | pass |
| 5035 | [pass] manual UI seed scenario preset custom | pass |
| 5036 | [pass] manual UI seed vaRule 9301 numeric id | pass |
| 5037 | [pass] manual UI seed vaRule 9301 profile reference | pass |
| 5038 | [pass] manual UI seed vaRule 9301 event template reference | pass |
| 5039 | [pass] manual UI seed vaRule 9302 numeric id | pass |
| 5040 | [pass] manual UI seed vaRule 9302 profile reference | pass |
| 5041 | [pass] manual UI seed vaRule 9302 event template reference | pass |
| 5042 | [pass] manual UI seed vaRule 9303 numeric id | pass |
| 5043 | [pass] manual UI seed vaRule 9303 profile reference | pass |
| 5044 | [pass] manual UI seed vaRule 9303 event template reference | pass |
| 5045 | [pass] manual UI seed vaRule 9304 numeric id | pass |
| 5046 | [pass] manual UI seed vaRule 9304 profile reference | pass |
| 5047 | [pass] manual UI seed vaRule 9304 event template reference | pass |
| 5048 | [pass] manual UI seed vaRule 9305 numeric id | pass |
| 5049 | [pass] manual UI seed vaRule 9305 profile reference | pass |
| 5050 | [pass] manual UI seed vaRule 9305 event template reference | pass |
| 5051 | [pass] manual UI seed vaRule 9306 numeric id | pass |
| 5052 | [pass] manual UI seed vaRule 9306 profile reference | pass |
| 5053 | [pass] manual UI seed vaRule 9306 event template reference | pass |
| 5054 | [pass] manual UI seed vaRule 9307 numeric id | pass |
| 5055 | [pass] manual UI seed vaRule 9307 profile reference | pass |
| 5056 | [pass] manual UI seed vaRule 9307 event template reference | pass |
| 5057 | [pass] manual UI seed vaRule 9308 numeric id | pass |
| 5058 | [pass] manual UI seed vaRule 9308 profile reference | pass |
| 5059 | [pass] manual UI seed vaRule 9308 event template reference | pass |
| 5060 | [pass] manual UI seed vaRule 9309 numeric id | pass |
| 5061 | [pass] manual UI seed vaRule 9309 profile reference | pass |
| 5062 | [pass] manual UI seed vaRule 9309 event template reference | pass |
| 5063 | [pass] manual UI seed vaRule 9310 numeric id | pass |
| 5064 | [pass] manual UI seed vaRule 9310 profile reference | pass |
| 5065 | [pass] manual UI seed vaRule 9310 event template reference | pass |
| 5066 | [pass] manual UI seed vaRule 9311 numeric id | pass |
| 5067 | [pass] manual UI seed vaRule 9311 profile reference | pass |
| 5068 | [pass] manual UI seed vaRule 9311 event template reference | pass |
| 5069 | [pass] manual UI seed vaRule 9312 numeric id | pass |
| 5070 | [pass] manual UI seed vaRule 9312 profile reference | pass |
| 5071 | [pass] manual UI seed vaRule 9312 event template reference | pass |
| 5072 | [pass] manual UI seed tracker Re-ID pair none/off | pass |
| 5073 | [pass] manual UI seed tracker Re-ID pair lite/off | pass |
| 5074 | [pass] manual UI seed tracker Re-ID pair kalman-lite/off | pass |
| 5075 | [pass] manual UI seed tracker Re-ID pair bytetrack/off | pass |
| 5076 | [pass] manual UI seed tracker Re-ID pair lite/assist | pass |
| 5077 | [pass] manual UI seed tracker Re-ID pair kalman-lite/assist | pass |
| 5078 | [pass] manual UI seed tracker Re-ID pair bytetrack/assist | pass |
| 5079 | [pass] manual UI seed invalid policy tracker none Re-ID assist | pass |
| 5080 | [pass] manual UI seed final state minimum vaRules | pass |
| 5081 | [pass] manual UI VA seed matrix covers required current release cases | pass |
