# v3.0 Search DSL and Query Convert

Audience: MediaServer 개발/테스트 에이전트와 운영 검색 계약 검토자입니다.
Lifecycle: v3.0.0 `V300-S06 Search DSL and Query Convert`에서 시작한 historical-origin/current-contract 문서이며, 현재 source tree가 이 query 계약을 사용하는 동안 유지합니다.
Source-of-truth: AGENTS.md는 개발/테스트/보고 권한의 최상위 규칙이고, 이 문서는 V300-S06 query convert와 Search DSL 경계만 정의합니다.

## Scope

V300-S06은 운영자가 입력한 natural language query를 provider 호출 없이 제한된
`media-server.event-search-dsl.v1` Search DSL로 변환하고, EventRecord/FeatureSet에서
만든 로컬 문서에 대해 text/tags/filter matching을 수행하는 단계입니다.

포함:

- natural language token을 text term, `tag:*`, 허용 filter로 분리
- strict structured output 형태의 Search DSL JSON
- bounded `limit`, `offset`, `eventTimeDesc` 기본 정렬
- `status`, `sourceId`, `channelId`, `eventType`, `scenario`, `reviewState`,
  `zoneId`, `timestampMs`, `pinned` 필터
- text/tags/filter matching helper
- identity/watchlist query 거부

비범위:

- Feature/Search Index
- `/ops/events` UI
- vector search 또는 embedding search
- external LLM/VLM provider query conversion
- raw prompt/response durable retention
- client/viewer exposure
- 30분/120분 longrun 또는 UI 풀테스트 evidence

## DSL

DSL schema는 `media-server.event-search-dsl.v1`입니다.

```json
{
  "schema": "media-server.event-search-dsl.v1",
  "textTerms": ["person", "red", "jacket"],
  "tags": ["intrusion"],
  "filters": [
    {"field": "status", "op": "eq", "value": "open"},
    {"field": "sourceId", "op": "eq", "value": "cam-lobby"},
    {"field": "timestampMs", "op": "gte", "value": "1781950200000"},
    {"field": "pinned", "op": "eq", "value": "true"}
  ],
  "sort": "eventTimeDesc",
  "limit": 25,
  "offset": 0
}
```

Allowed conversion tokens:

| Token | DSL mapping |
| --- | --- |
| `tag:<value>` | tag match |
| `status:<value>` | `status eq <value>` |
| `source:<value>` | `sourceId eq <value>` |
| `channel:<value>` | `channelId eq <value>` |
| `event:<value>` | `eventType eq <value>` |
| `scenario:<value>` | `scenario eq <value>` |
| `review:<value>` | `reviewState eq <value>` |
| `zone:<value>` | `zoneId eq <value>` |
| `after:<epoch-ms>` | `timestampMs gte <epoch-ms>` |
| `before:<epoch-ms>` | `timestampMs lte <epoch-ms>` |
| `pinned` | `pinned eq true` |
| `limit:<n>` | bounded result limit |
| `offset:<n>` | bounded result offset |

Unsupported `key:value` tokens are rejected rather than passed through as
open-ended filters.

## Privacy And Boundary Guard

Query conversion is local and deterministic. It does not call a runtime
provider, does not run vector search, and does not require a search index or
Ops UI surface to be present.

The DSL records these invariants:

- `strictStructuredOutput=true`
- `rawPromptStored=false`
- `rawProviderResponseStored=false`
- `runtimeProviderCallPerformed=false`
- `vectorSearchPerformed=false`
- `eventPostPayloadChanged=false`
- `webrtcDataChannelSchemaChanged=false`
- `sseWsMetadataSchemaChanged=false`
- `rtspWebrtcMediaPathChanged=false`
- `viewerClientExposureAdded=false`

Queries asking for face recognition, watchlist matching, face embeddings,
person/account identity, ID card, or license plate identity search are rejected
with `identity-search-disallowed`.

## Verification

```bash
./server.sh verify-v300-search-dsl-query-convert
./server.sh verify-analysis-state
```

`verify-v300-search-dsl-query-convert` checks the fixture, C++ module,
analysis-state smoke, docs, backlog, stream verification, release records,
feature inventory, script inventory, CMake, and `server.sh` dispatch.

This verifier PASS is limited to V300-S06 Search DSL/query convert evidence.
It is not Feature/Search Index evidence, not `/ops/events` UI evidence, not
vector search evidence, not UI 풀테스트 evidence, not 30분/120분 longrun evidence,
and not published metadata evidence.
