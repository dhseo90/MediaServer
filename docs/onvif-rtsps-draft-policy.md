# ONVIF RTSPS Draft Policy

이 문서는 v1.2.0 ONVIF probe에서 `rtsps://` GetStreamUri 결과를 어떻게 다루는지
고정합니다. 핵심은 automatic probe candidate, automatic import draft, manual
source registration을 서로 다른 범위로 분리하는 것입니다.

관련 기준:

- [ONVIF Protocol Support Matrix](./onvif-protocol-support-matrix.md)
- [ONVIF Live Source Support](./onvif-live-source-support.md)
- [ONVIF TLS Transport Policy](./onvif-tls-transport-policy.md)

## 현재 정책

| 구간 | `rtsp://` | `rtsps://` | 기준 |
| --- | --- | --- | --- |
| ONVIF `GetStreamUri` parser/probe candidate | 허용 | 허용 | Media/Media2 live profile 후보로만 인정 |
| Automatic import draft API fixture contract | 허용 | 보류 | 현재 `expectedSourceDraft.rtspUrl`은 `rtsp://`로 고정 |
| `/ops/sources` manual ONVIF stream URI registration | 허용 | 허용 | 운영자가 입력한 live URI를 기존 `rtsp` source로 저장 |
| 실장비 재생 성공 보고 | 실장비 검증 필요 | 실장비 검증 필요 | no-device 환경에서는 둘 다 미확인 |

`rtsps://` stream URI 후보를 parser가 발견했다는 사실은 automatic import draft가
저장 가능한 source draft를 만들었다는 뜻이 아닙니다. 현재 automatic draft API는
검증 fixture에서 `rtsp://` source draft만 통과시키며, `rtsps://` source draft
자동 저장 성공을 완료로 보고하지 않습니다.

## TLS 구분

`rtsps://`는 ONVIF Media/Media2 `GetStreamUri`가 반환하는 media playback URI의
scheme입니다. 이것은 ONVIF Device service SOAP endpoint의 `https://` transport와
다릅니다.

- ONVIF SOAP probe endpoint: 현재 `http://`만 transport smoke를 제공합니다.
- ONVIF SOAP `https://` endpoint: fail-closed입니다.
- ONVIF media stream `rtsps://`: parser candidate와 manual URI registration만
  정책으로 인정합니다.

## 보고 기준

지원으로 말할 수 있는 것:

- parser/probe는 `rtsp://`와 `rtsps://` GetStreamUri 결과를 live RTSP 후보로
  인식합니다.
- `/ops/sources` 수동 입력은 `rtsps://` ONVIF stream URI를 기존 `rtsp` source로
  저장할 수 있습니다.

지원으로 말하면 안 되는 것:

- automatic import draft API가 `rtsps://` source draft 저장을 검증 완료했다.
- no-device 검증이 `rtsps://` 실제 camera 재생 성공을 증명했다.
- ONVIF SOAP `https://` endpoint가 지원된다.

## 검증

```bash
./server.sh verify-onvif-rtsps-draft-policy
./server.sh verify-onvif-protocol-support-matrix
git diff --check
```
