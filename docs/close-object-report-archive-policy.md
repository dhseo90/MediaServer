# Close-object Report Archive Policy

Schema: `media-server.close-object-report-archive-policy.v1`

이 문서는 v1.4.0 close-object tracker 비교에서 생성되는 summary/report 산출물의
보존 경계를 정의합니다. 목적은 field-driving fixture 검증 evidence를 남기되,
제품 default-on 승인, 고객 영상 보존, release asset 업로드로 과장하지 않는 것입니다.

## 적용 범위

- `compare-close-object-tracker` 단일 비교 summary/report
- `compare-close-object-tracker --fixture-matrix` matrix summary/report
- `--history-dir`로 누적되는 `index.json`, `index.md`, run별 summary/report 사본
- `field-new-york-driving` 같은 승인된 repo fixture의 반복 검증 report

## 보존 가능

| 산출물 | 보존 위치 | 조건 |
| --- | --- | --- |
| `summary.json` | `/private/tmp` 또는 명시한 history dir | local verification evidence |
| `report.md` | `/private/tmp` 또는 명시한 history dir | summary와 같은 run id 아래 보존 |
| `matrix-summary.json` | `/private/tmp` 또는 명시한 history dir | fixture matrix gate 결과 |
| `matrix-report.md` | `/private/tmp` 또는 명시한 history dir | fixture별 report path 포함 |
| `index.json` / `index.md` | `--history-dir` root | run id, judgement, warning count, default-on boundary 보존 |

위 파일은 검증 evidence입니다. `productDefaultOn=False`, `defaultOnDecision`,
`defaultOnCandidate`, warning/hold/fail count를 함께 읽어야 하며, 단독으로 제품
기본 활성화 완료 근거가 될 수 없습니다.

## 보존 금지

- 고객/현장 원본 영상, source URL, credential, auth/session 파일
- close-object 비교 중 생성된 raw frame, crop, embedding, model path, checksum
- 개인정보 review가 끝나지 않은 screenshot 또는 overlay image
- `field-new-york-driving` 외부의 승인되지 않은 field sample
- long-running soak output을 v1.4.0 검증 완료로 표시하는 report

이미지 파일은 문서용 고정 asset 또는 UI screenshot artifact policy를 따릅니다.
close-object report archive에는 raw media image를 포함하지 않습니다. UI screenshot
검증 산출물은 기존 UI visual artifact maintenance 정책으로 관리하고, 이 정책의
history dir에는 summary/report/index만 둡니다.

## v1.4.0 판정

- field-driving fixture report archive policy는 v1.4.0 안정화/릴리즈 마무리 범위입니다.
- field sample scheduler, dataset ingest, 고객 영상 보존 자동화는 v1.4.0 범위 밖입니다.
- 제품 default-on 승격 검토는 별도 Phase gate입니다.
- push, tag, GitHub Release, release asset 업로드는 명시 요청 전까지 수행하지 않습니다.

## v1.5.0 Field Smoke Summary Evidence Boundary

v1.5.0 `V150-P1-03 Field smoke summary evidence boundary`는 이 archive
정책을 Tracker/Re-ID opt-in field-like smoke 결과 해석까지 확장합니다.
`field-smoke-summary-evidence`는 summary/report/history index evidence만
retained evidence로 보존한다는 표시입니다.

보존 대상:

- `summary.json`, `report.md`
- `matrix-summary.json`, `matrix-report.md`
- history `index.json`, `index.md`
- `productDefaultOn`, `defaultOnDecision`, `defaultOnCandidate`, warning/hold/fail
  count처럼 제품 default-on이 아니라 후보/관찰 상태를 분리하는 summary field

보존 금지:

- raw media, raw frame, crop, embedding
- model path/checksum/provenance
- source URL/URI/file
- credential/auth/session material
- 실장비 ONVIF field smoke 성공을 대체하는 문구
- release asset 업로드 또는 고객/현장 영상 archive

이 boundary는 완료/미확인/비범위를 분리하기 위한 evidence 경계입니다.
`compare-close-object-tracker --history-dir`가 만드는 history는 사용자 opt-in
튜닝 참고용이며, 제품 default-on 승인, 실장비 ONVIF field smoke 성공, 장기
field sample history review workflow 완료로 해석하지 않습니다.

## 권장 명령

```bash
./server.sh compare-close-object-tracker \
  --fixture-matrix \
  --fixture-ids field-new-york-driving \
  --tracker-policy bytetrack \
  --history-dir /private/tmp/media_server_v140_field_driving_report_archive

./server.sh compare-close-object-tracker \
  --tracker-policy bytetrack \
  --reid-policy assist \
  --history-dir /private/tmp/media_server_v140_reid_assist_warning_trend
```

## 검증

```bash
./server.sh verify-v140-report-archive-policy
./server.sh verify-docs-links
git diff --check
```
