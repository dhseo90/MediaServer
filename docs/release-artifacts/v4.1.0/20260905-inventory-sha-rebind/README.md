# v4.1.0 기능 인벤토리 증적 SHA 재결속

## 범위

커밋 `4332e916db99118c7820e2f6e9aab745064e26b7`에서 v4.1.0 S05 ID 매핑 항목을
`docs/project-feature-test-inventory.md`에 반영하면서 문서 SHA-256은
`e2eb2071bd06288a210e5ad297007e27e8ae0bd4952b801f8a3cfb881dfa6386`으로
변경됐지만, 구현 증적 manifest의 최상위 `inventorySha256`은 이전 값에 머물렀다.
기능 행 986개와 독립 승인 내용은 변하지 않았으며, 이번 보정은 해당 최상위 SHA 한
필드만 현재 인벤토리에 다시 결속한다.

공식 `--refresh-manifest`는 현재 REVIEW4 정책 문자열과 파일 직렬화 전체를 함께
바꾸므로 사용 결과를 채택하지 않고 즉시 원복했다. 기능 행, source-flow, 승인 원장,
검증기 계약은 수정하지 않았다.

## 최초 실패와 최종 검증

| 항목 | 결과 | 해석 |
| --- | --- | --- |
| `./server.sh verify-project-inventory` 최초 실행 | 17/1 FAIL | 최상위 인벤토리 SHA 불일치 탐지 |
| 독립 source approval | 986/0 PASS | 기존 독립 승인 986개 유지 |
| 구현 증적 | 986/0, negative 15/15 PASS | 기능 행과 음성 fixture 불변 |
| 의미 closure 계약 | 31/0 PASS | 의미 연결 불변 |
| 프로젝트 인벤토리 | 18/0 PASS | SHA 재결속 뒤 전체 통과 |
| 기능 인벤토리 coverage | 8/0 PASS | 986/986 직접 coverage 유지 |
| `git diff --check` | PASS | whitespace 오류 없음 |

이 결과는 실제 제품 서버, UI, 30분·120분 또는 릴리즈 검증의 실행 증거가 아니다.
제품 코드·API·schema·media path와 S06은 변경하지 않았다.
