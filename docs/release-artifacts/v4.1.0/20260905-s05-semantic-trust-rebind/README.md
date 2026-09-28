# v4.1.0 S05 종료 보완 의미 증적 재결속

## 범위

`src/analysis/event_storage.cpp`의 종료 대기 취소 로직 추가로 파일 trust binding이 바뀐
`EVT-008`, `EVT-009`만 독립 재검토한다. 기능 인벤토리의 나머지 984행은 기존
feature contract와 source-flow의 엄격 동등성을 확인한 뒤 기존 승인을 이관한다.
실제 UI·30분·120분·릴리즈 실행과 S06은 이 증적의 범위가 아니다.

## 최초 실패와 proof 보정

`./server.sh verify-project-inventory` 최초 실행은 17/1로 실패했다. 기능 인벤토리 문서
SHA와 구현 증적 manifest의 최상위 결속이 달랐고, `EVT-008`, `EVT-009`가 사용하는
`event_storage.cpp` blob trust binding이 현재 소스와 달랐다.

첫 fresh candidate에서 `EVT-009`의 중복 action locator가 오래된 행을 가리켜 unresolved로
분류됐다. 이를 현재 `3483/3491/3512/3536`, `server.sh:1661`로 보정하자 같은 중복 anchor를
쓰는 `EVT-010`, `EVT-011`의 오래된 위치도 fail-closed로 드러났고, 각각 현재 함수 범위로
보정했다. 독립 검토는 `EVT-008` proof가 더 오래된 `3318/3327/3350/3391`,
`server.sh:1537`에 남은 사실을 찾아 최초 거부했다. 현재 후보의
`3403/3412/3435/3476`, `server.sh:1661`로 보정한 뒤 재검토에서 승인됐다.

이 위치 보정은 anchor·context hash·feature contract·source-flow를 바꾸지 않는다. 최종
candidate digest는 기존 승인 후보와 같은
`648b9c8acb115fde2953fecf1aa3a30dc861ebaf23ed0fa3bf4ac038fd689e47`이고
986행 모두 resolved다.

## 독립 검토와 원자적 적용

동일한 독립 검토 에이전트가 현재 proof·fresh candidate·제품 소스를 다시 전수 대조했다.
종료 대기 취소 변경은 `CompactEventRecords`와 `ListCompactedEventRecordFiles`의 bounded
본문 밖에 있고, 두 함수 본문 hash와 readback·dispatch arm·source-flow가 유지됨을 확인했다.

| ID | 독립 판정 | 유지된 source-flow | 현재 본문 SHA-256 |
| --- | --- | --- | --- |
| EVT-008 | 승인 | `a41cce1c7bea9f921f1f9d7dc6221a24eb1089a471f592d150dd51bfeddb4f93` | `e29b001b6c06e66f8de1d208efbab20e4a239db6a05fef6242dcd034aa6da5e5` |
| EVT-009 | 승인 | `3cb4f43d1129d0cc7bf9b381405c9eee3aeefd39ad2c680a3fc3532ece29dac9` | `dde9950951a31beac431561bb6af867f7d0e510f537a01986383b218e0ddb6cd` |

공식 migration contract는 984행을 `strict-equivalence-carry-forward`, 위 두 행을
`independent-review-required`로 정확히 분할해 0건 실패로 통과했다. migration-aware
producer는 audit·approval·implementation manifest·native exact manifest를 원자적으로
검증한 뒤 적용했다. source-flow 의미가 같아 native exact manifest 내용은 변하지 않았다.

## 보존 증적과 검증

| 파일·항목 | SHA-256 또는 결과 |
| --- | --- |
| [독립 검토 패키지](review-package.json) | `3e20040043897fdb80d6d028326fac7ed4356fd9e27cacf185fe01744000435d` |
| [독립 판정](independent-decisions.json) | `4d71dc36733072b01721a6c791a05808e64435e036e300c487cf683ae86f0ea3` |
| 임시 migration evidence | `bbdbef8faf45d8841238fbbfdb7296bfd29341e691f278601e247247f3ad4d13`, 375,050byte |
| 임시 migration report | `a0612a4ee75ac3a10be7770e62546dfb8943817b1837b606459e9bf9c50e35ef`, 521,782byte |
| 독립 approval 재검증 | 986/986, 실패 0 |
| 구현 증적 | 986/986, validation 0, REVIEW4 global error 0, negative 15/15 |
| 프로젝트 인벤토리 | 18/0 |
| 기능 coverage | 986/986, 8/0 |
| 최종 제한 회귀 | lifecycle fixture 4/0, script inventory 11/0, release evidence index 8/0, 문서 링크 실패 0 |
| 정식 S05·build | 140/0+7/0+23/0+2/0, action 27/0, build 100% |

대용량 migration evidence/report와 중간 candidate는 승인 분할과 최종 hash를 이 문서에
이관한 뒤 삭제하는 재생성 가능 임시 파일이다. 두 보존 JSON은 독립 검토의 실제 입력과
판정을 유지한다. 이 결과를 실제 제품 lifecycle, UI 또는 장시간 PASS로 확대하지 않는다.
