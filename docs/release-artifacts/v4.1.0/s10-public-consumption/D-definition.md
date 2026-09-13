# 3D-3 D 실행 전 정의

독자는 구현·검토 담당자다. 이번 실행 보존 기록이며 정책은 AGENTS, 현재 계약은 S10 설계/계획, 결과 source-of-truth는 중앙 테스트 기록이다. 실제 브라우저는 사용자 제외다.

실행 순서: 격리 V2 seed 준비 → `node scripts/internal/verify_v410_recording_ui_contract.mjs --http-api` → `--http-auth` → `--http-lifecycle` → `bash scripts/internal/verify_v410_recording_timeline.sh --harness-self-test` → 최종 build/docs/diff 검증. 운영·외부 입력/장시간/브라우저 모드는 실행하지 않는다. 필요한 fixture 예상 RED는 actual managed job/output 부재 assertion이며 컴파일/기존 legacy seed startup 오류는 준비 실패로 구분한다.

| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
| D3D-01 | 관리 fixture | 자체 H264→숫자1 managed writer→실제2출력 jobComplete·manifest containment; startup 재개방 동일 ID | v4.1.0 |
| D3D-02 | 실제 timeline DTO | GET known/unknown 독립 수량·itemId·문자열/ns/null·request축·전체/부분 중첩·복수 출력 | v4.1.0 |
| D3D-03 | 입력 오류 | 실제 HTTP invalid query400, 없는 opaque media404, 내부 경로/원본/hash 미노출 | v4.1.0 |
| D3D-04 | 실제 파생 파일 | 각 generated output GET200·MPEGTS MIME·전체 bytes/hash와 원본 fixture 파일 대조 | v4.1.0 |
| D3D-05 | Range/HEAD | 대소문자 Range·닫힌/열린/suffix206·invalid/overflow/다중416·HEAD body0·정확 length/range | v4.1.0 |
| D3D-06 | 인증/권한 | 임시 난수5개 메모리 only, admin/operator/viewer/no-source/no-ops 및 미인증401·다른 채널403 matrix | v4.1.0 |
| D3D-07 | 대용량 유효 파일 | 별도 Continuous MP4 trailing free atom64MiB·최종size/hash·startup physical 검증·full GET hash·256KiB 경계Range | v4.1.0 |
| D3D-08 | 응답 hold | V2 states SQL로 pause hold1·full/disconnect hold0·정확 생성ID 대조 | v4.1.0 |
| D3D-09 | 종료/정리 | pause 중 SIGTERM·자식 종료·동적 loopback ports 반환·소유 temp 삭제; 강제종료 정상 PASS 금지 | v4.1.0 |
| D3D-10 | 내구 시작복구 | seed 종료 뒤 제품 첫 기동의 managed marker/원장 복구→동일 output 목록·ID와 파일 제공; 실제 서버 두 번째 기동은 미실행 | v4.1.0 |
| D3D-11 | harness 보존 | 기존 --harness-self-test 전수; 격리env/종료/port/temp·실패경계 유지. 실제 UI 대체 아님 | v4.1.0 |
| D3D-12 | 최종 gate | 코드 고정 build·docs-links/docs-ui-assets·diffcheck·신규 로그 whitespace·fingerprint/전수 결과/cleanup | v4.1.0 |

64MiB 파일은 실제 writer 원본에 유효 free atom을 붙인 전송 fixture이며 writer가64MiB를 생성했다거나 Event remux가이를출력했다는 증거가 아니다. 비밀번호5개는 실행별 CSPRNG 메모리→Node fetch body만 허용하며 argv/log/파일/Git/운영 계정으로 전달하지 않는다. 소유temp manifest는 내부 상대경로·opaqueID만 사용하며 삭제 후 actual경로/size/cleanup을 별도 기록한다. token 계측 도구 부재는 미집계로 기록한다.
