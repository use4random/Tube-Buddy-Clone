---
name: Auth pattern
description: How authentication works end-to-end in TubePulse
---

- Backend: bcryptjs + jsonwebtoken, `SESSION_SECRET` env var used as JWT secret
- Token stored in `localStorage` under key `"token"`
- All API requests send `Authorization: Bearer <token>` header
- `requireAuth` middleware at `artifacts/api-server/src/middlewares/requireAuth.ts` validates JWT and attaches `req.userId` and `req.userTier`
- Frontend `AuthContext` in `artifacts/web/src/lib/auth.tsx` wraps `useGetMe` with `enabled: !!token`
- `ChannelContext` in `artifacts/web/src/lib/channel.tsx` auto-selects first active channel, persists `selectedChannelId` to localStorage

**Why:** Stateless JWT avoids session store complexity; localStorage is acceptable for this SaaS tool since it's not handling financial transactions directly.
