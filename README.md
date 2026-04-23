# Capsule NFT — ONE Championship Moment Vault

ONE Championship 観戦で心が震えた一瞬を、写真と「自分の言葉」でカプセルに封じ、Sui オンチェーンに永久保存する DApp。

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| スマートコントラクト | Sui Move |
| フロントエンド | Next.js 16 + TypeScript + Tailwind v4 |
| UI コンポーネント | shadcn/ui |
| ウォレット | @mysten/dapp-kit + zkLogin |
| ストレージ | Walrus (写真・閲覧者データ) |
| 暗号化 | Seal (プライバシー要素) |
| AI 翻訳 | Anthropic Claude API |
| 状態管理 | Zustand |

## セットアップ

### 前提条件

- Node.js 22+
- pnpm 10+
- Sui CLI (`sui` コマンドが使えること)

### インストール

```bash
# リポジトリルートで
pnpm install

# 環境変数の設定
cd app
cp .env.local.example .env.local
# .env.local を編集して各値を設定
```

### コントラクトのデプロイ

```bash
cd contracts

# ビルド
sui move build

# テスト
sui move test

# testnet にデプロイ
sui client publish --gas-budget 100000000
```

デプロイ後、出力された Package ID を `app/.env.local` の `NEXT_PUBLIC_PACKAGE_ID` に設定。

### フロントエンド起動

```bash
cd app
pnpm dev
```

http://localhost:3000 でアクセス。

## プロジェクト構成

```
one-capsule/
├── contracts/          # Sui Move コントラクト
│   ├── Move.toml
│   └── sources/
│       └── capsule.move
├── app/                # Next.js フロントエンド
│   └── src/
│       ├── app/        # App Router ページ
│       ├── components/ # UI コンポーネント
│       ├── lib/
│       │   ├── sui/    # Sui クライアント・TX ヘルパー
│       │   ├── walrus/ # Walrus アップロード
│       │   ├── seal/   # Seal 暗号化
│       │   └── ai/     # Claude API 翻訳
│       └── stores/     # Zustand ストア
└── docs/               # ドキュメント
```

## デプロイ済み環境

| 環境 | URL |
|------|-----|
| Production | https://app-akisan5s-projects.vercel.app |
| GitHub | https://github.com/AKisan5/capsule-nft |

### Sui Devnet コントラクト

| オブジェクト | ID |
|-------------|-----|
| Package | `0x45ec9297a4d71f2ffa044546ce008b808185509edec1304dcc8426b4ac4ed037` |
| FeedbackRegistry | `0xb8718218e89db7f5c237d4eb8286a749cdb7a4ecc14c4b5310773bf117618d1a` |
| ProfileRegistry | `0xd5bc064232736b917eebed9ddfb0fed3d760815c9ab3fb6974f0ff2b1a577543` |

## ミント フロー (5 ステップ)

1. **選手選択** — 対戦カードから感動した選手を選ぶ
2. **写真アップロード** — Walrus に保存、Blob ID 取得
3. **原液メモ** — 自分の言葉で感動を書く (オンチェーン不変)
4. **AI 翻訳** — Claude が英語・日本語に変換
5. **ミント** — Sui オンチェーンに永久保存
