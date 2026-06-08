---
name: Orval TanStack Query v5 type fix
description: orval-generated query hooks need `as any` cast on the query options object because UseQueryOptions requires queryKey in TanStack Query v5
---

When passing `{ enabled: bool }` to orval-generated hooks, TS errors with:
"Property 'queryKey' is missing in type '{ enabled: boolean }' but required in type 'UseQueryOptions<...>'"

**Why:** Orval generates hooks where the `query` option is typed as full `UseQueryOptions`, but TanStack Query v5 made `queryKey` required. The hook auto-generates queryKey internally, so the cast is safe.

**How to apply:** Always write `{ query: { enabled: !!someValue } as any, request: { headers: ... } }` pattern for all generated hooks in this project.
