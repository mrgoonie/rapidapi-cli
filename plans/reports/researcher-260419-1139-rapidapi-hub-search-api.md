# RapidAPI Hub Search API Research Report

**Date:** 2026-04-19 | **Researcher:** Claude Code (Haiku) | **Status:** Complete

---

## Executive Summary

**YES—official API exists** for RapidAPI Hub marketplace discovery. Primary entry point is **GraphQL Platform API** (Enterprise Hub customers) with GraphQL `searchApis` query. **No public REST search endpoint** documented; web frontend search uses internal methods. Community confirms API access for search functionality with API key authentication.

---

## 1. Official API: GraphQL Platform API (searchApis Query)

### Endpoint
- **URL pattern:** `https://graphql-{subdomain}.p.rapidapi.com/` (exact subdomain varies per Enterprise Hub instance)
- **Method:** POST
- **Content-Type:** application/json
- **Availability:** Enterprise Hub customers ONLY (not free rapidapi.com users)

### Authentication (Required)
Four headers required:
- `x-rapidapi-key` — app key from your Personal Account
- `x-rapidapi-host` — GraphQL endpoint identifier (provided in code snippets)
- `x-rapidapi-identity-key` — mandatory for team contexts; must be Personal Account API key
- `content-type: application/json`

### searchApis Query Structure

```graphql
query SearchApis(
  $where: SearchApiWhereInput!
  $pagination: PaginationInput!
  $orderBy: SearchApiOrderByInput
) {
  searchApis(where: $where, pagination: $pagination, orderBy: $orderBy) {
    edges {
      node {
        name
        description
        provider
        rating
        # ... other fields
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    total
  }
}
```

### Query Variables (Example)

```json
{
  "where": {
    "term": "email",
    "categoryNames": ["Email"],
    "exclude": [],
    "tags": [],
    "collectionIds": [],
    "locale": "EN_US"
  },
  "pagination": {
    "first": 10,
    "after": null
  },
  "orderBy": {
    "field": "popularity",
    "direction": "DESC"
  }
}
```

### Filters Available (SearchApiWhereInput)

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `term` | String | YES | Search keyword (title, description) |
| `categoryNames` | String[] | NO | Filter by category (e.g., "Email", "Weather", "Social") |
| `tags` | String[] | NO | Filter by tag name/value pairs |
| `collectionIds` | String[] | NO | Filter by collection ID |
| `exclude` | String[] | NO | Exclude specific APIs |
| `locale` | String | NO | Language/region (default: EN_US) |
| `privateApisJwt` | String | NO | JWT for accessing private APIs |

### Pagination (Cursor-Based)

- **PaginationInput fields:**
  - `first` — max items per page (integer)
  - `after` — cursor from previous response's `endCursor`
- **Response includes:**
  - `pageInfo.hasNextPage` — boolean
  - `pageInfo.endCursor` — cursor string for next request
  - `edges[].cursor` — item-level cursor
  - `total` — total matching results

### Rate Limiting
- **10 requests per minute per user**
- Exceeds return HTTP 429 (Too Many Requests)
- Implement exponential backoff retry logic

---

## 2. Alternative: Web Frontend (Reverse-Engineered)

RapidAPI's web search at https://rapidapi.com/search uses **internal GraphQL calls** (endpoint/auth hidden from public). No documented REST or public GraphQL endpoint for non-Enterprise customers.

**Web UI Search Flow:**
1. Enter query in search bar
2. Browser calls internal GraphQL endpoint (headers redacted in DevTools)
3. Results include APIs, collections, tags filtered by category/popularity
4. Supports filters: category, pricing, ratings, free/paid

**For CLI without Enterprise access:** Web scraping or calling existing GraphQL PAPI (if credentials obtained) are only documented options.

---

## 3. Categories, Tags & Collections Queries

Available for filtering searches:

```graphql
query GetCategories($where: CategoryWhereInput) {
  categoriesV2(where: $where) {
    name
    description
    thumbnail
    status
  }
}

query GetTags {
  tagDefinitions {
    name
    type
    color
    isVisible
  }
}

query GetCollections($orderBy: CollectionsOrderByInput) {
  collections(orderBy: $orderBy) {
    id
    name
    description
    apis {
      name
    }
  }
}
```

---

## 4. Example curl (Conceptual)

**Note:** Requires Enterprise Hub GraphQL credentials. Endpoint and auth headers must be obtained from RapidAPI's code snippets for your Hub instance.

```bash
curl -X POST https://graphql-{subdomain}.p.rapidapi.com/ \
  -H "x-rapidapi-key: YOUR_KEY" \
  -H "x-rapidapi-host: graphql-{subdomain}.p.rapidapi.com" \
  -H "x-rapidapi-identity-key: YOUR_PERSONAL_KEY" \
  -H "content-type: application/json" \
  -d '{
    "query": "query SearchApis($where: SearchApiWhereInput!, $pagination: PaginationInput!) { searchApis(where: $where, pagination: $pagination) { edges { node { name description provider } } pageInfo { hasNextPage endCursor } total } }",
    "variables": {
      "where": { "term": "email", "categoryNames": ["Email"] },
      "pagination": { "first": 5 }
    }
  }'
```

---

## 5. Authentication Approach

**For CLI Implementation:**

- **Option A (Enterprise):** Use GraphQL PAPI if your target audience has RapidAPI Enterprise Hub
  - Requires user to provide x-rapidapi-key + endpoint info
  - Full rich filtering, pagination, rate limits documented
  
- **Option B (Public):** Reverse-engineer or request official public API from RapidAPI
  - No documented public endpoint currently
  - Community forums indicate demand for this
  - Could contact RapidAPI to request public search API
  
- **Option C (Web Scraping):** Scrape rapidapi.com/search results
  - Violates ToS; not recommended
  - Fragile; breaks on UI changes
  - No auth required but risky

**Recommendation:** Start with Option A (GraphQL PAPI) if targeting Enterprise customers, with clear docs that personal account API keys alone won't work.

---

## 6. Rate Limits & Terms of Service

| Aspect | Details |
|--------|---------|
| **Rate Limit** | 10 requests/minute per user (return 429 on exceed) |
| **ToS** | GraphQL PAPI for Enterprise Hub only; web scraping violates public ToS |
| **Pricing** | Enterprise Hub required (not publicly available pricing documented) |
| **Usage Tracking** | All calls logged for billing/analytics in Enterprise dashboards |

---

## 7. Existing Implementations

**npm packages/CLIs found:**
- `rapidapi-nodejs-sdk` — Node SDK for RapidAPI blocks (GitHub/RapidAPI)
- `@rapidapi/testing-worker` — Testing worker CLI (not for search)
- `rapidapi-connect` — API marketplace connector (limited details)

**No dedicated open-source CLI for marketplace search found.** Building one represents novel utility.

---

## 8. Unresolved Questions

1. **Exact GraphQL endpoint URL format** — "graphql-{subdomain}.p.rapidapi.com" pattern unclear; must be obtained from user's Enterprise dashboard
2. **Public search API availability** — No official public/free endpoint documented; clarify if RapidAPI plans to release one
3. **searchApis response schema** — Full list of available node fields (rating, endpoints count, pricing tiers, etc.) not shown in docs; requires schema introspection
4. **orderBy field options** — "popularity" used in example, but full list of sortable fields not documented
5. **Authentication for non-Enterprise** — Can personal account API keys access searchApis? Docs unclear; assume Enterprise-only
6. **Web frontend endpoint** — Can we call rapidapi.com's internal GraphQL directly without breaking ToS? (Likely not)

---

## 9. Architecture Decision

**Recommended CLI approach:**
1. Implement as **wrapper around GraphQL Platform API (searchApis)**
2. Default to **Enterprise Hub** support; document clearly
3. Accept user-provided endpoint + API key (via env or config)
4. Implement cursor-based pagination with async support
5. Retry logic for 429s (exponential backoff)
6. Future: Request RapidAPI for public search API to make CLI accessible to free tier

---

## Sources

- [Getting Started with the GQL Platform API](https://docs.rapidapi.com/docs/getting-started-with-the-graphql-platform-api)
- [Reading API Information (GQL PAPI)](https://docs.rapidapi.com/docs/papi-gql-examples-reading-api-information)
- [Pagination (GQL)](https://docs.rapidapi.com/docs/graphql-platform-api-pagination)
- [Authorization (GQL)](https://docs.rapidapi.com/docs/graphql-platform-api-authorization)
- [Categories, Tags, and Collections (GQL)](https://docs.rapidapi.com/docs/graphql-platform-api-examples-categories-tags-and-collections)
- [RapidAPI Community: Is there an API available for RapidAPI?](https://community.latenode.com/t/is-there-an-api-available-for-rapidapi/1689)
- [RapidAPI Hub](https://rapidapi.com/)
