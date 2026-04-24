# Progress Log

## 2026-04-24 — Phase E5: 言語切り替えボタン追加完了

### 新規作成
- `app/src/components/LocaleSwitcher.tsx` — `useLocale` + `router.replace(pathname, { locale })` による JA/EN トグルボタン
- `app/src/components/Header.tsx` — グローバルスティッキーヘッダー: 左に「Capsule」ブランドリンク、右に `<LocaleSwitcher />` + `<ConnectButton connectText={t('connect')} />`

### 更新ファイル
- `app/src/app/[locale]/layout.tsx` — `<Header />` を `NextIntlClientProvider` 直下に追加 (h-12 = 48px)
- `app/src/components/PhotoBanner.tsx` — `sticky top-0 z-20` → `sticky top-12 z-20` (グローバルヘッダー分オフセット)
- `app/src/app/[locale]/my/page.tsx` — インライン sticky ヘッダーを `top-12 z-10` に変更
- `app/src/app/[locale]/my/capsule/[id]/page.tsx` — インライン sticky ヘッダーを `top-12 z-10` に変更

### 動作仕様
- `LocaleSwitcher` は URL のロケールセグメント (`/ja` / `/en`) を切り替える — `next-intl` の `router.replace(pathname, { locale })` を使用
- `useTransition` で切り替え中は disabled 表示
- ロケール永続化: URL セグメントベース (ブラウザを閉じて戻っても last visited URL のロケールが保持)
- Zustand store データはロケール非依存のため、入力途中でも切り替え後にデータが保持される

### 確認
- `pnpm tsc --noEmit` エラーなし
- `sticky top-0` は `Header.tsx` のみに限定、他はすべて `top-12` に更新済み

## 2026-04-24 — Phase E4: 全 UI 日本語ハードコード除去完了

### 更新ファイル
- `app/src/lib/constants/categories.ts` — `CATEGORIES` (日本語 value/label) を `CATEGORY_KEYS` / `CATEGORY_SUBCATEGORY_KEYS` (英語キーのみ) に完全置換
- `app/src/app/[locale]/create/step1/page.tsx` — CATEGORY_KEY/SUBCATEGORY_KEY マッピングテーブルを削除; 英語キーを直接使用
- `app/src/app/[locale]/create/step2/page.tsx` — 日本語 POLARITY/SUBCATEGORY 定数を削除; `'positive'`/`'negative'`/`'empathy'` 等の英語値を直接使用; `Step1Summary` に `useTranslations('create.step1')` 追加
- `app/src/app/[locale]/create/review/page.tsx` — Step1/Step2 サマリ表示を `tStep1`/`tStep2` で翻訳
- `app/src/app/[locale]/capsule/[id]/CapsuleViewer.tsx` — `RawCapsule` の category/polarity/subcategory 表示を `tStep1`/`tStep2` で翻訳
- `app/src/app/[locale]/layout.tsx` — `metadata` を `generateMetadata` に変更; `home.metaDescription` キーを使用
- `app/src/app/[locale]/my/capsule/[id]/page.tsx` — `useLocale()` で日付フォーマットをロケール対応化; `年` 正規表現を削除
- `app/src/lib/walrus/image.ts` — toast メッセージを英語に変更
- `app/src/lib/walrus/client.ts` — 日本語エラーメッセージを英語に変更
- `app/src/app/api/walrus/upload/route.ts` — エラーレスポンスを英語に変更
- `app/src/lib/sui/mint.ts` — フォーセットエラーメッセージを英語に変更
- `app/messages/ja.json` / `app/messages/en.json` — `home.metaDescription` キーを追加
- `app/src/lib/walrus/__tests__/client.test.ts` — エラーメッセージのテストアサーションを英語に更新

### オンチェーン値の変更
- Phase E3 まで: 日本語文字列がオンチェーンに保存されていた (`'入場・セレモニー'`, `'ポジティブ'` 等)
- Phase E4 以降: 英語キーがオンチェーンに保存される (`'entrance'`, `'positive'`, `'empathy'` 等)
- devnet のため既存データへの影響なし

### 確認
- `pnpm tsc --noEmit` エラーなし
- `grep -r '[ぁ-んァ-ン一-龥]' app/src/` → messages/*.json・コメント・LLM プロンプト (`api/pattern/`, `api/translate/`, `lib/ai/translate.ts`) のみ

## 2026-04-24 — Phase E3: useTranslations 導入完了

### 更新ファイル
- `app/src/app/[locale]/page.tsx`
- `app/src/app/[locale]/login/page.tsx`
- `app/src/app/[locale]/my/page.tsx`
- `app/src/app/[locale]/create/photo/page.tsx`
- `app/src/app/[locale]/create/step1/page.tsx`
- `app/src/app/[locale]/create/step2/page.tsx`
- `app/src/app/[locale]/create/step3/page.tsx`
- `app/src/app/[locale]/create/review/page.tsx`
- `app/src/app/[locale]/capsule/[id]/CapsuleViewer.tsx`
- `app/src/app/[locale]/my/capsule/[id]/page.tsx`
- `app/src/components/ViewerProfileModal.tsx`
- `app/src/components/create/StepProgress.tsx`

### 対応ポイント
- on-chain に保存される日本語 value (カテゴリ/感情分類) は変更せず、表示ラベルのみを `t()` に置換
- `CATEGORY_KEY` / `SUBCATEGORY_KEY` / `POLARITY_KEY` / `SUBCATEGORY_KEY` マッピングテーブルを各コンポーネントに追加
- recharts `dataKey` を安定した英語キーに変更し、ラベルのみ `t('dashboard.tiers.*')` / `t('dashboard.outcomes.*')` で翻訳

### 確認
- `pnpm tsc --noEmit` エラーなし
- 全ルート 200 (/, /ja, /en, /ja/login, /en/login)
- 残存日本語: on-chain value マッピング / JSX コメント / metadata のみ (UI テキストなし)

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
