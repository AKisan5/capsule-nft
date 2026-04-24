# Progress Log

## 2026-04-24 — Phase E2: メッセージカタログ作成完了

### 作成
- `app/messages/ja.json` — 234 キー、全画面の日本語文言を網羅
- `app/messages/en.json` — 同一構造の英語版 (キー完全一致)

### キー構造
```
common / header / login / home / my
create.stepLabels / create.photo / create.step1 / create.step2 / create.step3 / create.review
capsule / capsule.profileModal
dashboard
errors
```

### カバレッジ
- ホーム・ログイン・マイページ
- 作成フロー全 5 ステップ (photo / step1 / step2 / step3 / review)
- カプセル閲覧 (翻訳スケルトン・原液トグル・URL コピー・ミント成功オーバーレイ)
- ビュアープロフィールモーダル (15 オプション × label/desc)
- ダッシュボード (my/capsule/[id]) 全ラベル
- エラーメッセージ

### 確認
- `node` で ja.json / en.json のキー一致チェック → 差分 0

### 次フェーズ (E3)
- 各コンポーネントに `useTranslations()` を導入してハードコードされた日本語文字列をすべて置換

## 2026-04-24 — Phase E1: [locale] セグメント移行完了

### ページ移動
- `src/app/(すべてのページ)` → `src/app/[locale]/` 配下に移動
- `layout.tsx` を最小 pass-through ルートレイアウト + フル locale レイアウトに分割

### 更新
- `app/src/app/layout.tsx` — `return children` のみの最小 root layout
- `app/src/app/page.tsx` — `redirect('/ja')` root redirect
- `app/src/app/[locale]/layout.tsx` — `NextIntlClientProvider` / fonts / Toaster を含むフル layout
- `app/src/app/[locale]/page.tsx` — ホームページ
- `app/src/i18n/request.ts` — Turbopack の dynamic import 制限を回避するため明示的 conditional import に変更
- `app/src/components/create/StepProgress.tsx` — `next/navigation` → `@/i18n/navigation`
- `app/src/app/[locale]/create/review/page.tsx` — mint 後 IDB ドラフト削除 + インライン成功画面
- すべての `Link/useRouter/usePathname` を `@/i18n/navigation` に統一

### バグ修正
- `app/messages/` への相対パスが `../../../` (誤) → `../../` (正) に修正

### 動作確認
- `pnpm tsc --noEmit` エラーなし
- `GET /` → `307 /ja`
- `GET /ja` → 200
- `GET /ja/login` → 200
- `GET /en/login` → 200

### 次フェーズ
- `ja.json` / `en.json` にキーを追加し、ハードコードされた日本語文字列を `useTranslations()` に置換

## 2026-04-24 — Phase E1: i18n 基盤ファイル作成完了

### インストール
- `next-intl@4.9.1` を `pnpm add next-intl` でインストール済み

### 新規作成
- `app/src/i18n/routing.ts` — `defineRouting({ locales: ['ja','en'], defaultLocale: 'ja', localePrefix: 'always' })`
- `app/src/i18n/navigation.ts` — `createNavigation(routing)` でロケール対応 Link/useRouter/usePathname をエクスポート
- `app/src/i18n/request.ts` — サーバー側メッセージロード (`getRequestConfig`)
- `app/src/middleware.ts` — `createMiddleware(routing)` でロケール自動リダイレクト
- `app/messages/ja.json` — 日本語カタログ空箱
- `app/messages/en.json` — 英語カタログ空箱

### 更新
- `app/next.config.ts` — `createNextIntlPlugin('./src/i18n/request.ts')` でラップ

### 動作確認
- `pnpm tsc --noEmit` エラーなし
- `GET /` → `307 /ja` (ミドルウェア正常動作)
- `GET /ja` → 404 (期待通り: ページ移動は次フェーズ)

### 次フェーズ
- `src/app/` 配下のページを `src/app/[locale]/` に移動
- `ja.json` / `en.json` にキーを追加し、ハードコードされた日本語文字列を `useTranslations()` に置換

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
