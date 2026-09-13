# 3D-3 D 정리 전수

독자는 구현·검토 담당자다. 소유 경로/프로세스/포트 원출력과 실제 경로 부재를 대조한 실행 증적이다. 비밀번호·계정 원문은 보존하지 않는다.

| 경로/대상 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| PID 23704 | H02 소유 child | 비대상 | harness 종료 | exit0, graceful=true | [D-Harness.log](D-Harness.log) |
| PID 23407 | 제품 서버 | 비대상 | 정상 종료 | exit0, graceful=true | [D-HttpApiAuthorized.log](D-HttpApiAuthorized.log) |
| 127.0.0.1:51508 | rtsp port | 비대상 | 서버 종료 뒤 확인 | ECONNREFUSED, closed=true | [D-HttpApiAuthorized.log](D-HttpApiAuthorized.log) |
| 127.0.0.1:51509 | http port | 비대상 | 서버 종료 뒤 확인 | ECONNREFUSED, closed=true | [D-HttpApiAuthorized.log](D-HttpApiAuthorized.log) |
| PID 23518 | 제품 서버 | 비대상 | 정상 종료 | exit0, graceful=true | [D-HttpAuth.log](D-HttpAuth.log) |
| 127.0.0.1:51580 | rtsp port | 비대상 | 서버 종료 뒤 확인 | ECONNREFUSED, closed=true | [D-HttpAuth.log](D-HttpAuth.log) |
| 127.0.0.1:51581 | http port | 비대상 | 서버 종료 뒤 확인 | ECONNREFUSED, closed=true | [D-HttpAuth.log](D-HttpAuth.log) |
| PID 23631 | 제품 서버 | 비대상 | 정상 종료 | exit0, graceful=true | [D-HttpLifecycle.log](D-HttpLifecycle.log) |
| 127.0.0.1:51649 | rtsp port | 비대상 | 서버 종료 뒤 확인 | ECONNREFUSED, closed=true | [D-HttpLifecycle.log](D-HttpLifecycle.log) |
| 127.0.0.1:51650 | http port | 비대상 | 서버 종료 뒤 확인 | ECONNREFUSED, closed=true | [D-HttpLifecycle.log](D-HttpLifecycle.log) |
| `/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v410-s06-h01-J3VncZ` | 소유 fixture/원장/미디어/계정 저장소 또는 compile | 107 bytes | 종료 cleanup 삭제 | 실제 부재 재확인 | [D-Harness.log](D-Harness.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-http-seed.2qAI2m` | 소유 fixture/원장/미디어/계정 저장소 또는 compile | 5385032 bytes | 종료 cleanup 삭제 | 실제 부재 재확인 | [D-HttpApi.log](D-HttpApi.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v410-s06-0twvdx` | 소유 fixture/원장/미디어/계정 저장소 또는 compile | 566128 bytes | 종료 cleanup 삭제 | 실제 부재 재확인 | [D-HttpApi.log](D-HttpApi.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-http-seed.uPqgAG` | 소유 fixture/원장/미디어/계정 저장소 또는 compile | 5385032 bytes | 종료 cleanup 삭제 | 실제 부재 재확인 | [D-HttpApiAuthorized.log](D-HttpApiAuthorized.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v410-s06-vc5brb` | 소유 fixture/원장/미디어/계정 저장소 또는 compile | 2181571 bytes | 종료 cleanup 삭제 | 실제 부재 재확인 | [D-HttpApiAuthorized.log](D-HttpApiAuthorized.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-http-seed.pux1bB` | 소유 fixture/원장/미디어/계정 저장소 또는 compile | 5385032 bytes | 종료 cleanup 삭제 | 실제 부재 재확인 | [D-HttpAuth.log](D-HttpAuth.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v410-s06-AecCKJ` | 소유 fixture/원장/미디어/계정 저장소 또는 compile | 2453757 bytes | 종료 cleanup 삭제 | 실제 부재 재확인 | [D-HttpAuth.log](D-HttpAuth.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-http-seed.cIoB2A` | 소유 fixture/원장/미디어/계정 저장소 또는 compile | 5385032 bytes | 종료 cleanup 삭제 | 실제 부재 재확인 | [D-HttpLifecycle.log](D-HttpLifecycle.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-v410-s06-Hw164C` | 소유 fixture/원장/미디어/계정 저장소 또는 compile | 69292320 bytes | 종료 cleanup 삭제 | 실제 부재 재확인 | [D-HttpLifecycle.log](D-HttpLifecycle.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-http-seed.Iv0PQI` | 소유 fixture/원장/미디어/계정 저장소 또는 compile | 0 bytes | 종료 cleanup 삭제 | 실제 부재 재확인 | [D-SeedExpectedRed.log](D-SeedExpectedRed.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-http-seed.CCyeLf` | 소유 fixture/원장/미디어/계정 저장소 또는 compile | 4201358 bytes | 종료 cleanup 삭제 | 실제 부재 재확인 | [D-SeedExpectedRedFixed.log](D-SeedExpectedRedFixed.log) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-http-seed.MrsFoA` | 소유 fixture/원장/미디어/계정 저장소 또는 compile | 5813840 bytes | 종료 cleanup 삭제 | 실제 부재 재확인 | [D-SeedGreen.log](D-SeedGreen.log) |

기록된 소유 임시경로 12개 모두 부재. actual 제품 서버3개/port6개와 harness 소유 child를 별도 구분했다. EPERM 최초실행은 서버 미시작/port미할당이다. raw 미디어·users/쿠키 저장소·manifest는 이관하지 않았고 소형 로그/표/fingerprint만 보존한다.
