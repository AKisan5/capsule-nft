# アーキテクチャ設計

## 二層構造 (設計原則 #1)

```
Pre-Mint (自分のための言語化)        Post-Mint (他者への伝達)
┌─────────────────────────────┐    ┌─────────────────────────────┐
│ Step 1: 感動カテゴリ選択     │    │ 閲覧者が Capsule を開く      │
│ Step 2: 写真アップロード      │    │ → Walrus から写真取得        │
│ Step 3: 原液メモ (不変)      │───▶│ → AI 翻訳テキスト表示        │
│ Step 4: AI 翻訳プレビュー    │    │ → 感情タグ表示               │
│ Step 5: ミント               │    │ → フィードバック送信          │
└─────────────────────────────┘    └─────────────────────────────┘
```

## オンチェーンデータ構造 (実装済み)

```
Capsule (owned by creator / 不変コア)
├── photo_blob_id: String        ← Walrus Blob ID
├── step1_category: String
├── step1_items: vector<String>
├── step1_free_text: String
├── step2_polarity: String
├── step2_subcategory: String
├── step2_connection: String
├── step3_memo: String           ← 原液 (絶対変更不可)
├── minted_at_ms: u64            ← Clock から取得 (改ざん防止)
├── event_name: String
├── fighter_tag: String
└── creator: address

Dynamic Fields on Capsule (creator のみ書き込み可)
└── "translation_cache": VecMap<u8 (viewer_tier), TranslationRef>
        TranslationRef { walrus_blob_id, viewer_tier, generated_at_ms }

FeedbackRegistry (shared object / 誰でも書き込み可)
└── entries: Table<ID (capsule_id), vector<FeedbackRef>>
        FeedbackRef { walrus_blob_id, seal_policy_id, viewer_tier, outcome, submitted_at_ms }
```

## Post-Mint データ設計の判断

### 採用: FeedbackRegistry (shared object) パターン

**候補A: Capsule を freeze して dynamic field を読み取り専用に**
- 却下: freeze_object した Capsule は一切変更不可。dynamic field の追加も不可。

**候補B: Capsule を shared object に**
- 却下: shared object は全員が `&mut` を取得できる。
  `step3_memo` (原液) を含む Capsule が任意ユーザーに書き換えられるリスクがある。
  NFT としての「所有」セマンティクスが失われる。

**採用: shared FeedbackRegistry + owned Capsule**
```
Capsule (owned)          FeedbackRegistry (shared)
creator 所有              誰でも参照・書き込み可
      │                        │
      └──── capsule_id ────────┘
                         Table<ID, Vec<FeedbackRef>>
```
- Capsule の所有権・不変性を保持したまま、オープンなフィードバック収集が可能
- フィードバック本文は Walrus (Blob ID のみオンチェーン)
- プライバシー要素は Seal ポリシーで保護 (seal_policy_id を参照)

### 翻訳キャッシュは Capsule の dynamic field

- `cache_translation(&mut Capsule, ...)` — `&mut` が要るため creator のみ呼べる
- viewer_tier (0/1/2) をキーに VecMap で upsert
- 翻訳本文は Walrus に保存し、Blob ID のみオンチェーンに持つ

## データフロー

```
[Creator]
    │
    ├─ 写真 ──────────────▶ [Walrus] ──▶ photo_blob_id (Capsule にオンチェーン)
    │
    ├─ 原液メモ ──────────▶ [Claude API] ──▶ 翻訳テキスト ──▶ [Walrus]
    │                                                              │
    │                                                    translation_cache (df on Capsule)
    └─ TX送信 ────────────▶ [Sui] ──▶ Capsule NFT ミント
                  (zkLogin / Sponsored TX)

[Viewer]
    │
    ├─ Capsule を閲覧 (FeedbackRegistry から capsule_id で検索)
    │
    └─ フィードバック本文 ──▶ [Walrus] ──▶ fb_blob_id
                              (Seal 暗号化)
                                 └──▶ attach_feedback(registry, capsule_id, ...)
```

## モジュール構成

| モジュール | 役割 |
|-----------|------|
| `one_capsule::capsule` | Capsule struct 定義・mint・UID アクセサ |
| `one_capsule::feedback` | FeedbackRegistry (shared) + attach_feedback |
| `one_capsule::translation` | dynamic field キャッシュ + cache_translation |

## プライバシー戦略 (Seal)

- **公開**: photo_blob_id、step3_memo (原液)、翻訳 blob_id
- **Seal 暗号化**: フィードバック本文 (walrus_blob_id + seal_policy_id ペアで参照)
- 閲覧者ティア (viewer_tier) に応じた Seal ポリシーで差分開示を実現 (Phase 3 以降)

## zkLogin フロー

```
Google OAuth → JWT → zkLogin proof → Sui TX 署名
                           ↑
                  (ウォレット概念を隠蔽)
```
