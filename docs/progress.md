# Progress Log

## 2026-04-24 — zkLogin 削除・Wallet Connect 一本化完了

### 削除したファイル
- `app/src/app/auth/` (callback page 含む)
- `app/src/lib/sui/zklogin.ts`
- `app/src/app/api/sponsor/route.ts`
- `app/src/stores/auth.ts`

### 新規作成
- `app/src/lib/sui/session.ts` — `useCurrentSession` hook
- `app/src/hooks/useMintCapsule.ts` — wallet-first mint hook

### 書き換え
- `app/src/app/login/page.tsx` — ConnectButton のみのシンプルな画面
- `app/src/lib/sui/mint.ts` — zkLogin/Sponsored TX パスを削除、wallet + demo のみ
- `app/src/lib/seal/profile.ts` — `ZkLoginSession` を `SignPersonalMessageFn` に置き換え
- `app/src/app/capsule/[id]/CapsuleViewer.tsx` — `useAuthStore` → `useCurrentAccount`
- `app/src/app/my/page.tsx` — `useAuthStore` → `useCurrentAccount`
- `app/src/app/my/capsule/[id]/page.tsx` — session 参照を削除、Seal 未設定時は raw UTF-8 fallback
- `app/src/app/create/review/page.tsx` — session/Sponsored 分岐を削除

### 依存関係
- `@mysten/zklogin` を `pnpm remove` で削除
- `.env.local` から Google OAuth / zkLogin prover / Sponsor 変数を削除
