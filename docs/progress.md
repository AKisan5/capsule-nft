# 開発進捗

## Phase 0: モノレポ初期化 ✅ (2026-04-21)

### 完了した作業

- [x] `pnpm-workspace.yaml` でモノレポ構成 (`app/`, `contracts/`)
- [x] Next.js 16 App Router + TypeScript + Tailwind v4 初期化
- [x] shadcn/ui 導入 (button, card, dialog, input, textarea, radio-group, checkbox, progress, tabs)
- [x] Sui 関連パッケージインストール (`@mysten/sui`, `@mysten/dapp-kit`, `@mysten/zklogin`)
- [x] `@anthropic-ai/sdk` インストール
- [x] Zustand インストール
- [x] `contracts/Move.toml` + `capsule.move` スケルトン作成
- [x] `src/lib/sui/client.ts` — SuiClient 初期化
- [x] `src/lib/walrus/upload.ts` — Walrus アップロードヘルパー
- [x] `src/lib/seal/encrypt.ts` — Seal 暗号化スタブ
- [x] `src/lib/ai/translate.ts` — Claude 翻訳エンジン
- [x] `src/stores/capsule-store.ts` — Zustand ドラフトストア
- [x] `.gitignore`, `README.md`, `docs/` 整備

### 技術スタックバージョン

| パッケージ | バージョン |
|-----------|-----------|
| Next.js | 16.2.4 |
| Tailwind CSS | 4.2.3 |
| @mysten/sui | 2.16.0 |
| @mysten/dapp-kit | 1.0.4 |
| @anthropic-ai/sdk | 0.90.0 |
| zustand | 5.0.12 |
| shadcn/ui | latest |

---

## Phase 1: コントラクト実装 ✅ (2026-04-21)

### 完了した作業

- [x] `Move.toml` パッケージ名 `one_capsule` に変更
- [x] `capsule.move` フル実装
  - `Capsule` struct (key, store): 13フィールド
  - `MintedEvent` (copy, drop): capsule_id / creator / minted_at_ms
  - `mint()`: Clock から minted_at_ms 取得、event emit、creator に transfer
  - ビュー関数: photo_blob_id / step3_memo / event_name / fighter_tag / minted_at_ms / creator
- [x] `contracts/tests/capsule_tests.move` 作成
  - `test_mint_transfers_to_creator` — transfer 先の確認
  - `test_mint_fields_integrity` — 全フィールドの整合性チェック (6 assert)
  - `test_mint_multiple_creators_isolated` — 複数 creator の分離確認
- [x] `sui move test`: 3/3 PASS、警告ゼロ

### 設計メモ

- `mint()` は `transfer::transfer(capsule, creator)` で self_transfer (linter suppress 済み)
  - 将来 PTB composability のため返り値化を検討
- Clock 必須化でクライアント側の timestamp 改ざんを排除

---

## Phase 1.5: Post-Mint データ設計 ✅ (2026-04-22)

### 完了した作業

- [x] `capsule.move` に `uid_ref` / `uid_mut` (public(package)) を追加
- [x] `feedback.move` 実装
  - `FeedbackRef` (store, copy, drop): walrus_blob_id / seal_policy_id / viewer_tier / outcome / submitted_at_ms
  - `FeedbackRegistry` (shared key): Table<ID, vector<FeedbackRef>>
  - `create_registry()`: shared object として公開
  - `attach_feedback()`: 誰でも呼べる (capsule 参照不要、capsule_id のみ)
  - `feedback_count()` / `get_feedback()` ビュー関数
  - `FeedbackSubmittedEvent` emit
- [x] `translation.move` 実装
  - `TranslationRef` (store, copy, drop): walrus_blob_id / viewer_tier / generated_at_ms
  - `cache_translation()`: Capsule の df "translation_cache" に VecMap<u8, TranslationRef> を upsert
  - `get_translation()`: Option<TranslationRef> を返す
- [x] `tests/feedback_tests.move` 作成 (4 テスト)
  - registry が shared であることを確認
  - フィードバック追加でカウント増加
  - 複数 viewer が append 可能
  - Capsule 本体に影響しないことを確認
- [x] `tests/translation_tests.move` 作成 (4 テスト)
  - 未キャッシュは none を返す
  - キャッシュと取得
  - 複数 tier を独立管理
  - upsert で最新に更新
- [x] `sui move test`: 11/11 PASS、警告ゼロ
- [x] `docs/architecture.md` に設計判断を記録

### 設計判断

| 案 | 結論 |
|----|------|
| Capsule を freeze | ❌ dynamic field が一切追加不可 |
| Capsule を shared | ❌ step3_memo が書き換えられるリスク・所有セマンティクス消失 |
| **FeedbackRegistry (shared) + owned Capsule** | ✅ 採用 |

---

## Phase 2a: Provider / レイアウト基盤 ✅ (2026-04-22)

### 完了した作業

- [x] `src/lib/sui/client.ts` 更新
  - `NETWORK: AppNetwork = 'devnet'`(env 可変, mainnet は MVP 対象外)
  - `CAPSULE_PACKAGE_ID` env 読み込み
  - `createNetworkConfig` で devnet / testnet を定義 (variables に packageId 付き)
  - `getSuiClient()` シングルトン (Server Components / Route Handlers 用)
  - `useNetworkVariable` / `useNetworkVariables` を re-export
- [x] `src/app/providers.tsx` 作成
  - `QueryClientProvider` (QueryClient を useState で生成、SSR 安全)
  - `SuiClientProvider` (networkConfig + defaultNetwork)
  - `WalletProvider` (autoConnect: true, theme: null で dapp-kit CSS-in-JS を無効化)
- [x] `src/app/layout.tsx` 更新
  - `<html lang="ja" className="dark ...">` — dark モード強制
  - `capsule-gradient` クラスの固定オーバーレイ div
  - Metadata (OGP 含む) / Viewport 設定
  - Providers でラップ
- [x] `src/app/globals.css` 更新
  - `.dark` カラートークンを紫 (oklch 0.72 0.22 295) → 藍 (oklch 0.28 0.08 265) 系に変更
  - `@layer utilities { .capsule-gradient }` 追加 (3重ラジアル)
- [x] `.env.local.example` 整備 (8 変数)
- [x] `tsc --noEmit`: エラーゼロ
- [x] `pnpm build`: 成功

### 設計メモ

- `WalletProvider theme: null` → dapp-kit の CSS Variables inject を止め、Tailwind に一本化
- `NETWORK` の型を `'devnet' | 'testnet'` に絞ることで、networkConfig の型安全を確保

---

## Phase 2b: zkLogin 実装 ✅ (2026-04-22)

### 完了した作業

- [x] `src/lib/sui/zklogin.ts`
  - `buildOAuthUrl()` — ephemeral keypair 生成 → maxEpoch 取得 → nonce 生成 → IDB 保存 → OAuth URL 返却
  - `processOAuthCallback(jwt)` — IDB から ephemeral 復元 → salt 管理 → `jwtToAddress` → zkProof 取得 → ZkLoginSession 返却
  - `zkLoginSignAndExecute(tx, session)` — `signTransaction` で intent 付き署名 → `getZkLoginSignature` で zkLogin 署名合成 → `executeTransactionBlock`
  - IndexedDB ラッパー (openZkLoginDB / idbGet / idbPut) — STORE_EPHEMERAL + STORE_SALT の 2 ストア
  - `fetchZkProof()` — Mysten prover へ POST
- [x] `src/stores/auth.ts` — Zustand store (status / address / session / error)
- [x] `src/app/login/page.tsx` — Google ログインボタン (「Google で金庫を開く」)
- [x] `src/app/auth/callback/page.tsx` — URL hash から id_token を取得 → processOAuthCallback → /my へリダイレクト
- [x] `tsc --noEmit`: エラーゼロ
- [x] `pnpm build`: 成功 (4 routes)

### 設計メモ

- **salt 管理**: IDB に `sub` をキーとして保存。同一 Google アカウントなら同一 zkLogin アドレスを保証
- **JWT 露出**: 現状クライアントから prover に直送 (MVP)。本番では Route Handler 経由で秘匿化が必要
- **ephemeral key の寿命**: `maxEpoch = currentEpoch + 10` (devnet で約数時間相当)。OAuth フロー中断しても再ログイン可能
- **「ウォレット」表現なし**: ログインページは「カプセル金庫」「金庫を開く」に統一

---

## Phase 2c: Walrus クライアント実装 ✅ (2026-04-22)

### 完了した作業

- [x] `src/lib/walrus/client.ts`
  - `uploadBlob(data, epochs?)` — Uint8Array / Blob 両対応、newlyCreated / alreadyCertified 両ケース処理
  - `downloadBlob(blobId)` — Uint8Array で返却
  - `getBlobUrl(blobId)` — aggregator 公開 URL
  - エラーは HTTP ステータス + body を含めて throw (握りつぶさない)
- [x] `src/lib/walrus/image.ts`
  - `uploadImage(file)` — Canvas で WebP 変換 (quality 0.8) → 2 MB チェック → uploadBlob → blobId 返却
  - `getImageUrl(blobId)` — getBlobUrl のラッパー
  - sonner でアップロード進行中 / 成功 / 失敗を Toast 通知
- [x] `src/app/layout.tsx` に `<Toaster>` 追加 (dark テーマ、bottom-center)
- [x] 旧 `src/lib/walrus/upload.ts` を削除
- [x] `src/lib/walrus/__tests__/client.test.ts` — 14 テスト
  - uploadBlob: 6 テスト (newlyCreated / alreadyCertified / Blob 入力 / epochs URL / HTTP エラー / ネットワーク障害 / 予期しない JSON)
  - downloadBlob: 4 テスト (バイト一致 / 404 / ネットワーク障害 / **ラウンドトリップ一致**)
  - getBlobUrl: 3 テスト
- [x] `vitest.config.ts` 作成 (happy-dom / @/* alias)
- [x] `package.json` に test / test:watch / test:coverage スクリプト追加
- [x] `tsc --noEmit`: エラーゼロ
- [x] `pnpm test`: 14/14 PASS
- [x] `pnpm build`: 成功

### 設計メモ

- `@mysten/walrus` SDK は npm 未公開 → HTTP API (PUT /v1/blobs, GET /v1/blobs/{id}) を直接使用
- `Uint8Array → Blob` 変換時に `new Uint8Array(data)` でコピー (ArrayBufferLike vs ArrayBuffer の型問題を回避)
- Toast は `image.ts` (client-only) で呼ぶ。`client.ts` は UI 依存なしで純粋に fetch のみ

---

## Phase 2d: フロントエンド実装 (次フェーズ)

- [ ] 5ステップミントフォーム UI
- [ ] Claude API 翻訳 Route Handler
- [ ] testnet デプロイ + Package ID 設定
