# B08-I01 실제 앱 개별 결과

독자: v4.1.0 검증 담당자. 수명: 2026-09-26 현행 5단계 실행 이력.
정책은 AGENTS.md, 실행 전 정의는 중앙 테스트 기록의 B08-I01을 따른다.
아래 27행은 [같은 실행의 원출력](b08-current-integration-i02-fixed.log)에 있는
`[pass] S11-...` 행과 한 행씩 대조했다. 다른 네 단계의 개별 검사는 원출력의
API 35·인증 40·전송 수명 10·기본 구성 46행에 있다. 두 서버 exit0, 포트 해제,
격리 root 부재를 종료 요약으로 확인했다. 첫 세 번의 실패는 [실행 이력](results.md)에
별도로 남고 아래 최종 pass로 삭제되지 않는다.

| 제목 | 테스트내용 | 결과(pass/fail) |
| --- | --- | --- |
| S11-CI09 기동1 ICE | 격리된 첫 서버 ICE health 확인 | pass |
| S11-CI07 기동1 이벤트 | 실제 EventRecord와 녹화 참조 결박 | pass |
| S11-CI07 기동1 출력 목록 | 전체 페이지·독립 terminal 관측에서 새 출력 2개 확인 | pass |
| S11-CI07 기동1 출력1 HTTP | 첫 출력 영상 HTTP 200 | pass |
| S11-CI07 기동1 출력2 HTTP | 둘째 출력 영상 HTTP 200 | pass |
| S11-CI11 기동1 발행 종료 | archive 전에 dispatch 발행 완료 | pass |
| S11-CI08 기동1 종료 | 서버 exit0·포트 반환 | pass |
| S11-CI11 기동1 복제 | Open 전에 원본·복제 byte/hash 일치 | pass |
| S11-CI11 기동1 원본 근거 | 동일 시간축 두 원본의 typed 증거 결박 | pass |
| S11-CI11 기동1 원본 불변 | 복제·복구 후 원본 불변 | pass |
| S11-CI07 기동1 출력1 파일 | 소유 regular 영상 파일 hash 확인 | pass |
| S11-CI07 기동1 출력2 파일 | 소유 regular 영상 파일 hash 확인 | pass |
| S11-CI09 기동2 ICE | 격리된 두 번째 서버 ICE health 확인 | pass |
| S11-CI08 기동2 기존 출력1 | 첫 기동 영상 HTTP 200 | pass |
| S11-CI08 기동2 기존 출력2 | 첫 기동 영상 HTTP 200 | pass |
| S11-CI07 기동2 이벤트 | 새 실제 EventRecord와 녹화 참조 결박 | pass |
| S11-CI07 기동2 출력 목록 | 전체 페이지·독립 terminal 관측에서 새 출력 2개 확인 | pass |
| S11-CI07 기동2 출력1 HTTP | 새 첫 출력 영상 HTTP 200 | pass |
| S11-CI07 기동2 출력2 HTTP | 새 둘째 출력 영상 HTTP 200 | pass |
| S11-CI08 재기동 불변·분리 | 기존 ID/hash 보존과 새 이벤트·참조·작업·출력 분리 | pass |
| S11-CI11 기동2 발행 종료 | archive 전에 dispatch 발행 완료 | pass |
| S11-CI08 기동2 종료 | 서버 exit0·포트 반환 | pass |
| S11-CI11 기동2 복제 | Open 전에 원본·복제 byte/hash 일치 | pass |
| S11-CI11 기동2 원본 근거 | 동일 시간축 두 원본의 typed 증거 결박 | pass |
| S11-CI11 기동2 원본 불변 | 복제·복구 후 원본 불변 | pass |
| S11-CI07 기동2 출력1 파일 | 소유 regular 영상 파일 hash 확인 | pass |
| S11-CI07 기동2 출력2 파일 | 소유 regular 영상 파일 hash 확인 | pass |

실제 타임라인 응답 114회 중 최대 관측값은 3,717ms이며 기존 4초 상한을
바꾸지 않았다. 이는 현행 통합 단기 실행의 결과다. 실제 UI·30분·120분 및
장시간 자원 추세는 이 결과로 대체하지 않는다. token start/end/consumed는
전용 집계가 없어 미집계이며 source는 위 로컬 실행 원출력이다.
