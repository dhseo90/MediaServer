# B08-Q 요청 한정 원장 증거 집중 검사 개별 결과

독자: v4.1.0 녹화 검증 담당자. 수명: B08-I01 실패 구간의 집중 실행 이력.
정책·실행 전 정의는 AGENTS.md 및 중앙 릴리즈 테스트 기록 B08-Q01~Q04를 따른다.
아래 52행은 최종 실행의 실제 개별 assertion이며 UI·HTTP·장시간 PASS가 아니다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| B08-Q01 | `crypto=1 sqlite=1 backend=1`: same request repeated typed Complete acquisition hashes archive once | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 44행 |
| B08-Q01 | `crypto=1 sqlite=1 backend=1`: strict typed acquisition stores one private proof | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 45행 |
| B08-Q02 | `crypto=1 sqlite=1 backend=1`: B logical context charge is nonzero and bounded | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 46행 |
| B08-Q02 | `crypto=1 sqlite=1 backend=1`: copy retains typed candidates but never proof | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 47행 |
| B08-Q02 | `crypto=1 sqlite=1 backend=1`: copied request repeats full archive verification | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 48행 |
| B08-Q02 | `crypto=1 sqlite=1 backend=1`: new request repeats full archive verification | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 49행 |
| B08-Q02 | `crypto=1 sqlite=1 backend=1`: zero optional budget uses strict fallback | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 50행 |
| B08-Q04 | `crypto=1 sqlite=1 backend=1`: proof preserves media eligibility and acquire/release hold | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 51행 |
| B08-Q03 | `crypto=1 sqlite=1 backend=1`: fork cannot reuse request proof | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 52행 |
| B08-Q03 | `crypto=1 sqlite=1 backend=1`: foreign Journal proof rejected even with equal archive bytes | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 53행 |
| B08-Q03 | `crypto=1 sqlite=1 backend=1`: request proof retains one archive descriptor | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 54행 |
| B08-Q03 | `crypto=1 sqlite=1 backend=1`: request destruction releases retained archive descriptor | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 55행 |
| B08-Q02 | `crypto=1 sqlite=1 backend=1`: own active append invalidates proof and fully verifies again | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 56행 |
| B08-Q02 | `crypto=1 sqlite=1 backend=1`: normal generation rotation returns to full verification | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 57행 |
| B08-Q02 | `crypto=1 sqlite=1 backend=1`: fresh owner strictly verifies archive again | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 58행 |
| B08-Q03 | `crypto=1 sqlite=1 backend=1`: same-size tamper rejects without strict fallback accepting changed archive | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 59행 |
| B08-Q03 | `crypto=1 sqlite=1 backend=1`: same-size poisoned owner stays rejected | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 60행 |
| B08-Q03 | `crypto=1 sqlite=1 backend=1`: other-row tamper rejects without strict fallback accepting changed archive | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 61행 |
| B08-Q03 | `crypto=1 sqlite=1 backend=1`: other-row poisoned owner stays rejected | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 62행 |
| B08-Q03 | `crypto=1 sqlite=1 backend=1`: inode tamper rejects without strict fallback accepting changed archive | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 63행 |
| B08-Q03 | `crypto=1 sqlite=1 backend=1`: inode poisoned owner stays rejected | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 64행 |
| B08-Q03 | `crypto=1 sqlite=1 backend=1`: symlink tamper rejects without strict fallback accepting changed archive | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 65행 |
| B08-Q03 | `crypto=1 sqlite=1 backend=1`: symlink poisoned owner stays rejected | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 66행 |
| B08-Q03 | `crypto=1 sqlite=1 backend=1`: hardlink tamper rejects without strict fallback accepting changed archive | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 67행 |
| B08-Q03 | `crypto=1 sqlite=1 backend=1`: hardlink poisoned owner stays rejected | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 68행 |
| B08-Q01 | `crypto=1 sqlite=0 backend=1`: same request repeated typed Complete acquisition hashes archive once | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 71행 |
| B08-Q01 | `crypto=1 sqlite=0 backend=1`: strict typed acquisition stores one private proof | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 72행 |
| B08-Q02 | `crypto=1 sqlite=0 backend=1`: B logical context charge is nonzero and bounded | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 73행 |
| B08-Q02 | `crypto=1 sqlite=0 backend=1`: copy retains typed candidates but never proof | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 74행 |
| B08-Q02 | `crypto=1 sqlite=0 backend=1`: copied request repeats full archive verification | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 75행 |
| B08-Q02 | `crypto=1 sqlite=0 backend=1`: new request repeats full archive verification | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 76행 |
| B08-Q02 | `crypto=1 sqlite=0 backend=1`: zero optional budget uses strict fallback | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 77행 |
| B08-Q04 | `crypto=1 sqlite=0 backend=1`: proof preserves media eligibility and acquire/release hold | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 78행 |
| B08-Q03 | `crypto=1 sqlite=0 backend=1`: fork cannot reuse request proof | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 79행 |
| B08-Q03 | `crypto=1 sqlite=0 backend=1`: foreign Journal proof rejected even with equal archive bytes | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 80행 |
| B08-Q03 | `crypto=1 sqlite=0 backend=1`: request proof retains one archive descriptor | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 81행 |
| B08-Q03 | `crypto=1 sqlite=0 backend=1`: request destruction releases retained archive descriptor | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 82행 |
| B08-Q02 | `crypto=1 sqlite=0 backend=1`: own active append invalidates proof and fully verifies again | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 83행 |
| B08-Q02 | `crypto=1 sqlite=0 backend=1`: normal generation rotation returns to full verification | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 84행 |
| B08-Q02 | `crypto=1 sqlite=0 backend=1`: fresh owner strictly verifies archive again | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 85행 |
| B08-Q03 | `crypto=1 sqlite=0 backend=1`: same-size tamper rejects without strict fallback accepting changed archive | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 86행 |
| B08-Q03 | `crypto=1 sqlite=0 backend=1`: same-size poisoned owner stays rejected | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 87행 |
| B08-Q03 | `crypto=1 sqlite=0 backend=1`: other-row tamper rejects without strict fallback accepting changed archive | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 88행 |
| B08-Q03 | `crypto=1 sqlite=0 backend=1`: other-row poisoned owner stays rejected | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 89행 |
| B08-Q03 | `crypto=1 sqlite=0 backend=1`: inode tamper rejects without strict fallback accepting changed archive | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 90행 |
| B08-Q03 | `crypto=1 sqlite=0 backend=1`: inode poisoned owner stays rejected | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 91행 |
| B08-Q03 | `crypto=1 sqlite=0 backend=1`: symlink tamper rejects without strict fallback accepting changed archive | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 92행 |
| B08-Q03 | `crypto=1 sqlite=0 backend=1`: symlink poisoned owner stays rejected | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 93행 |
| B08-Q03 | `crypto=1 sqlite=0 backend=1`: hardlink tamper rejects without strict fallback accepting changed archive | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 94행 |
| B08-Q03 | `crypto=1 sqlite=0 backend=1`: hardlink poisoned owner stays rejected | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 95행 |
| B08-Q04 | `crypto=0 sqlite=1 backend=1`: v1 remains available in unsupported B build | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 97행 |
| B08-Q04 | `crypto=1 sqlite=1 backend=0`: v1 remains available in unsupported B build | pass | [최종 원출력](public-evidence-459a06e5288db79e.txt) 99행 |

최종 명령: `bash scripts/internal/verify_recording_generation_request_proof.sh`, exit0.
crypto/SQLite/backend 구성은 1/1/1, 1/0/1, 0/1/1, 1/1/0 순서다.
총 52 PASS·0 FAIL, 격리 fixture 정리 `removed=true`다. 최초 실패·수정 이력은 [B08 실행 기록](results.md)에 별도로 보존한다.
