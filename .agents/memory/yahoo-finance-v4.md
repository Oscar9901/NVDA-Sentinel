---
name: Yahoo Finance v4 API quirks
description: Breaking changes from v2 to v4 that affect the trading-tool API server
---

## Rule
yahoo-finance2 v4 is a class, not a pre-instantiated singleton. Always `new YahooFinance()`.

**Why:** v4 changed its default export from an instance to a class. Calling methods on the raw import throws "Call `const yahooFinance = new YahooFinance()` first."

**How to apply:** Shared instance lives in `artifacts/api-server/src/lib/yahoo.ts` as `export const yf = new YahooFinance()`. Import `{ yf as yahooFinance }` from there in all route files.

## Rule
`chart()` in v4 uses `period1` (ISO date string), NOT `range`.

**Why:** The `range` option was removed in v4. Passing `{ range: "1mo" }` throws an AJV validation error about missing required `period1`.

**How to apply:** Convert range strings to a `period1` date: subtract N days from `Date.now()`, format as `YYYY-MM-DD`. See `market.ts` `rangeDaysMap` for the mapping.

## Rule
`screener()` return type is `any`-cast required — TypeScript infers `never` for `r.value` in `Promise.allSettled` chains with yahoo-finance2 types.

**Why:** The union types from yahoo-finance2 v4 are too wide for TypeScript to narrow automatically in allSettled callbacks.

**How to apply:** Cast `r.value as any` before accessing market data fields.
