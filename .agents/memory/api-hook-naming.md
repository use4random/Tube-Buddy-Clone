---
name: API hook naming
description: Generated hook names don't always match intuition — always grep the generated api.ts file to confirm exact exported names before using them
---

Known naming gotchas in this project:
- Billing plans list: `useListBillingPlans` (NOT `useGetBillingPlans`)
- Always run `grep "^export function use" lib/api-client-react/src/generated/api.ts` to get the authoritative list

**Why:** Orval derives hook names from operationId in the OpenAPI spec. If operationId says `listBillingPlans`, the hook will be `useListBillingPlans`.

**How to apply:** Before importing any hook, grep the generated file to confirm the exact name.
