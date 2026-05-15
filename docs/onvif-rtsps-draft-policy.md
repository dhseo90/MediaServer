# ONVIF RTSPS Draft Policy

이 문서는 v1.2.0 ONVIF probe에서 `rtsps://` GetStreamUri 결과를 어떻게 다루는지
고정합니다. 핵심은 automatic probe candidate, automatic import draft, manual
source registration이 `rtsps://`를 기존 `rtsp` source draft 범위 안에서만
다루도록 제한하는 것입니다.

관련 기준:

- [ONVIF Protocol Support Matrix](./onvif-protocol-support-matrix.md)
- [ONVIF Live Source Support](./onvif-live-source-support.md)
- [ONVIF TLS Transport Policy](./onvif-tls-transport-policy.md)

## 현재 정책

| 구간 | `rtsp://` | `rtsps://` | 기준 |
| --- | --- | --- | --- |
| ONVIF `GetStreamUri` parser/probe candidate | 허용 | 허용 | Media/Media2 live profile 후보로만 인정 |
| Automatic import draft API fixture contract | 허용 | 허용 | `expectedSourceDraft.kind=rtsp`, `rtspUrl`은 선택 profile URI와 일치 |
| `/ops/sources` manual ONVIF stream URI registration | 허용 | 허용 | 운영자가 입력한 live URI를 기존 `rtsp` source로 저장 |
| 실장비 재생 성공 보고 | 실장비 검증 필요 | 실장비 검증 필요 | no-device 환경에서는 둘 다 미확인 |

`rtsps://` stream URI 후보를 parser가 발견하면 automatic import draft API는
해당 URI를 새 schema 없이 기존 `expectedSourceDraft.kind=rtsp`와 `rtspUrl`에
그대로 축약합니다. no-device 검증은 이 draft 생성까지만 확인하며, 실제 camera
재생 성공은 미확인으로 보고합니다.

RTSPS API route smoke에는
`test/fixtures/onvif_probe_result_rtsps_stub.json` fixture를 사용합니다. 이 fixture는
`POST /ops/api/onvif/import-draft`가 `rtsps://` selected profile을 기존
`kind=rtsp` source draft로 반환하는지 확인하기 위한 합성 데이터이며, 제품 API
schema가 아닙니다.

## TLS 구분

`rtsps://`는 ONVIF Media/Media2 `GetStreamUri`가 반환하는 media playback URI의
scheme입니다. 이것은 ONVIF Device service SOAP endpoint의 `https://` transport와
다릅니다.

- ONVIF SOAP probe endpoint: 현재 `http://`만 transport smoke를 제공합니다.
- ONVIF SOAP `https://` endpoint: fail-closed입니다.
- ONVIF media stream `rtsps://`: parser candidate, automatic import draft, manual
  URI registration에서 기존 `rtsp` source로만 다룹니다.

## 보고 기준

지원으로 말할 수 있는 것:

- parser/probe는 `rtsp://`와 `rtsps://` GetStreamUri 결과를 live RTSP 후보로
  인식합니다.
- automatic import draft API는 `rtsps://` source draft를 기존 `kind=rtsp`
  draft로 생성할 수 있습니다.
- `/ops/sources` 수동 입력은 `rtsps://` ONVIF stream URI를 기존 `rtsp` source로
  저장할 수 있습니다.

지원으로 말하면 안 되는 것:

- no-device 검증이 `rtsps://` 실제 camera 재생 성공을 증명했다.
- ONVIF SOAP `https://` endpoint가 지원된다.

## 검증

```bash
./server.sh verify-onvif-rtsps-draft-policy
./server.sh verify-onvif-protocol-support-matrix
./server.sh verify-onvif-probe-draft-api --fixture test/fixtures/onvif_probe_result_rtsps_stub.json
git diff --check
```
