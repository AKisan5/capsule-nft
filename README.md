# Capsule — ONE Championship Moment Vault

> **A Sui-native DApp that lets fans seal the exact moment that moved them at a ONE Championship event—preserved as a photo plus their own raw words, minted on-chain, and designed to grow into a learning system that teaches fans how to share their passion with anyone.**

Built for the Sui Blockchain Hackathon.

---

## 🎯 The Problem We're Solving

Fandom has a memory problem.

When a ONE Championship event ends and the adrenaline fades, fans struggle to hold on to the exact feeling of *that* moment—the takedown that shouldn't have been survived, the walkout that made their hair stand up, the quiet look between fighters after the bell. Social media rushes in with everyone else's takes, and within hours a fan's own voice is drowned in the crowd.

There's also a communication problem. Passionate fans want to share why a moment mattered, but the gap in knowledge between a die-hard and a curious friend is enormous. "Did you see that scramble in round two?" means nothing without context. Fans give up, or worse, their love for the sport stops spreading.

**Capsule is our answer to both.**

---

## 💡 The Core Idea: Mint as a Boundary

The design is built on one principle that sounds simple but changes everything:

> **The act of minting is a boundary between "language for yourself" and "language for others."**

Before the mint, the fan does nothing but get their own feeling into words. No comment sections, no trending takes, no AI suggestions about what they "should" feel. Just the fan, the photo, and three structured steps that help them find their own language—based on the framework from Kaho Miyake's book *Jibun no Kotoba de Hanaseru Hito ga Yatteiru Koto* ("What People Who Speak in Their Own Words Actually Do").

The mint ritual seals those raw words on-chain, immutable. That moment becomes a piece of honest, unmediated personal history.

After the mint, a second layer begins: communicating that sealed moment to others. This is where AI translation, encrypted viewer profiles, and the learning dashboard come in—but **they cannot touch the original words**. The fan's voice is protected by the architecture itself.

This boundary isn't enforced by a warning message. It's enforced by Sui's object model: once a Capsule is minted, its content fields are immutable. Anything added later lives in dynamic fields, separately.

---

## 🏗️ Why Sui?

Every major architectural decision in Capsule points back to something Sui specifically offers. We didn't pick Sui and retrofit a use case—the use case demanded Sui's model.

### 1. Sui Move's Object Model

One emotion = one object. Each Capsule is a standalone Sui object owned by the fan who created it, not an entry in a giant mapping. This mirrors how the experience feels: a single moment, self-contained, transferable, yours.

Fields like the raw memo, the photo blob ID, and the emotion classification live directly on the object. They are immutable after mint. Post-mint data (feedback, AI translations, analytics) attaches via **dynamic fields**, keeping the original raw words untouchable.

### 2. Walrus for Heavy Content

Photos and long-form memos can't live directly on-chain without breaking gas costs. Walrus gives us Sui-native decentralized blob storage with high availability and cheap writes. Every photo, every encrypted viewer profile, every AI-generated translation variant is a Walrus blob referenced from the Capsule object.

### 3. Seal for Layered Privacy

Viewer profiles (what a viewer knows about the fighter, how they feel going in) are sensitive. We use Seal's programmable threshold encryption to ensure:
- **Viewer profiles**: only the viewer can decrypt
- **Feedback**: the capsule owner can decrypt individual responses, but aggregate analytics use a k-of-n community key for anonymized group stats

This lets us build a learning system on top of feedback data **without the operator ever seeing raw viewer responses**.

### 4. @mysten/dapp-kit + Wallet Standard

Sui's wallet ecosystem is mature. `@mysten/dapp-kit` auto-detects Sui Wallet, Suiet, Slush, Ethos, Surf, and Nightly. A judge can connect, mint, and verify on Suiscan in under a minute—which we think matters for a hackathon.

---

## 🧪 Current State (Hackathon Submission)

**The Pre-Mint layer is fully functional and deployed.** A fan can walk through the entire "language for yourself" flow and mint a Capsule to Sui Devnet right now.

### What Works Today

| Capability | Status |
|---|---|
| Wallet connection (Sui Wallet / Suiet / Slush / Ethos) | ✅ |
| Fighter selection from an event card | ✅ |
| Photo upload to Walrus | ✅ |
| Three-step language framework (Miyake's method) | ✅ |
| Raw memo writing (the "original") | ✅ |
| Bilingual UI (JA / EN) with instant toggle | ✅ |
| Mint ritual confirmation screen | ✅ |
| On-chain mint to Sui Devnet | ✅ |
| Owned capsules listing | ✅ |

### What's Designed but Not Yet Built (Post-Mint Layer)

The Post-Mint layer is fully specified in `docs/` and is the reason the Pre-Mint layer's data model looks the way it does. It's what turns Capsule from a memory vault into a learning system.

1. **Viewer profiling with Seal encryption** — When a new viewer opens someone else's Capsule, they'll answer a short profile (how well they know the fighter, their MMA knowledge level, their going-in mood). This is encrypted with Seal so only the viewer can decrypt, and stored on Walrus.

2. **AI translation engine** — The Claude API takes the Capsule's raw words plus the viewer's profile and generates a version tuned to that viewer: unfamiliar jargon annotated, the strongest sentence pulled to the front, the owner's voice preserved as theirs. Critically, **AI doesn't rewrite—it translates.** The raw words remain visible, collapsible, and authoritative.

3. **Feedback loop** — Viewers tell us whether the moment landed, whether they want to know more, or whether they read it differently. Responses are encrypted with Seal and attached as dynamic fields on the Capsule.

4. **The Learning Dashboard** — This is the endgame. Owners see, per capsule and across their whole collection, which phrasing worked for beginners, which didn't land with hardcore fans, which expressions communicate across every level. The dashboard teaches the fan how their own words travel.

5. **The "Talking Points" feature** — Before a fan talks to a friend or coworker about a fighter, they pick who they're talking to (MMA beginner, sports fan, etc.) and the app surfaces their own previously-effective phrasing as a cheat sheet. Not a script. A scaffold for their own words.

**The final goal is not to have AI speak for the fan. It's to teach the fan how to speak, so they outgrow the app.**

That's why every post-mint feature feeds back into the owner's dashboard, not into some pool of "content." The system is designed to graduate its users.

---

## 📐 Why the Data Model Looks This Way

A few design choices become clearer if you know what's coming in the post-mint layer:

- **The Capsule struct is immutable, but has no feedback or translation fields.** Those live in dynamic fields attached after mint. This means the raw words can never be corrupted by future features.
- **The event name and fighter tag are on-chain.** This enables future leaderboards, per-fighter collections, and event-specific aggregations—but only at the metadata level, never touching the raw memo.
- **There's a `FeedbackRegistry` and `ProfileRegistry` shared object.** These give us a clean place to attach viewer-generated data without making every Capsule a shared object (which would prevent ownership transfer later).
- **Photos live on Walrus, not IPFS or centralized storage.** This keeps the whole stack Sui-native and gives us the blob lifecycle management we need for the (future) user-controlled deletion of post-mint data.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Smart contracts | Sui Move |
| Frontend | Next.js 16 + TypeScript + Tailwind v4 |
| UI components | shadcn/ui |
| Wallet | @mysten/dapp-kit |
| Storage | Walrus (photos, viewer data, AI variants) |
| Encryption | Seal (programmable threshold encryption) |
| AI (post-mint) | Anthropic Claude API |
| State management | Zustand |
| i18n | next-intl (JA / EN) |

---

## 🚀 Setup

### Prerequisites

- Node.js 22+
- pnpm 10+
- Sui CLI

### Install

```bash
# At repository root
pnpm install

# Environment variables
cd app
cp .env.local.example .env.local
# Edit .env.local to set the required values
```

### Deploy the contract

```bash
cd contracts

# Build
sui move build

# Test
sui move test

# Deploy to devnet
sui client publish --gas-budget 100000000
```

After deploying, set the resulting Package ID and registry object IDs in `app/.env.local`:

```
NEXT_PUBLIC_PACKAGE_ID=0x...
NEXT_PUBLIC_FEEDBACK_REGISTRY_ID=0x...
NEXT_PUBLIC_PROFILE_REGISTRY_ID=0x...
```

### Run the frontend

```bash
cd app
pnpm dev
```

Open http://localhost:3000.

---

## 📁 Project Structure

```
one-capsule/
├── contracts/              # Sui Move contracts
│   ├── Move.toml
│   └── sources/
│       └── capsule.move
├── app/                    # Next.js frontend
│   ├── messages/           # i18n catalogs (ja.json / en.json)
│   └── src/
│       ├── app/[locale]/   # App Router pages (localized)
│       ├── components/     # UI components
│       ├── i18n/           # next-intl config
│       ├── lib/
│       │   ├── sui/        # Sui client, tx helpers
│       │   ├── walrus/     # Walrus upload
│       │   ├── seal/       # Seal encryption (post-mint)
│       │   └── ai/         # Claude translation (post-mint)
│       └── stores/         # Zustand stores
└── docs/                   # Architecture, requirements, roadmap
```

---

## 🌐 Deployed Environments

| Environment | URL |
|---|---|
| Production | https://app-akisan5s-projects.vercel.app |
| GitHub | https://github.com/AKisan5/capsule-nft |

### Sui Devnet contract

| Object | ID |
|---|---|
| Package | `0x45ec9297a4d71f2ffa044546ce008b808185509edec1304dcc8426b4ac4ed037` |
| FeedbackRegistry | `0xb8718218e89db7f5c237d4eb8286a749cdb7a4ecc14c4b5310773bf117618d1a` |
| ProfileRegistry | `0xd5bc064232736b917eebed9ddfb0fed3d760815c9ab3fb6974f0ff2b1a577543` |

Verify on Suiscan: https://suiscan.xyz/devnet/object/0x45ec9297a4d71f2ffa044546ce008b808185509edec1304dcc8426b4ac4ed037

---

## 🎬 Pre-Mint Flow (What You Can Try Today)

1. **Connect wallet** — Sui Wallet, Suiet, Slush, or Ethos
2. **Pick a fighter** — choose from the event card
3. **Upload a photo** — stored on Walrus, Blob ID returned
4. **Step 1: Name the moment** — pick a category (walk-out, fight progression, outcome, post-fight, unease) and describe what specifically stood out
5. **Step 2: Find the feeling** — positive or negative, then empathy / surprise / unpleasant / boring, then connect it to your own experience
6. **Step 3: Write it down** — raw words, any style, "damn, just damn" is a valid sentence
7. **Mint ritual** — confirmation screen with the warning that the words become permanent
8. **Mint** — Capsule is created on Sui Devnet, visible in your collection

The entire flow is bilingual (JA / EN) with a one-tap toggle in the header.

---

## 🗺️ Roadmap Beyond the Hackathon

### Immediate post-hackathon (Post-Mint layer, already designed)
- Viewer profiling + Seal encryption flow
- Claude API translation engine (viewer-tier adaptive)
- Feedback loop with encrypted attachments via dynamic fields
- Owner's Learning Dashboard with per-tier effective/ineffective phrasing
- "Talking Points" feature for real-world conversations

### Medium term
- Official ONE Championship partnership for event-tied capsule drops
- Fighter-side feedback aggregation — let fighters see which moments resonated with which fan segments (privacy-preserving via Seal thresholds)
- Additional languages (Korean, Mandarin) — ONE's primary markets

### Long term
- Sui Kiosk integration for capsule secondary trading with fighter royalties
- SBT-based fandom tier system (capsule count + cross-event diversity)
- Capsule-to-capsule relations (reply, inspired-by) as a social graph layer

---

## 🧭 Design Philosophy (For Judges)

If you only take away three things from this project:

1. **The mint is a boundary, not a button.** The whole architecture enforces the separation between a fan's raw voice and everything the world does to it afterward. Sui's object + dynamic field model is what makes that boundary real, not just rhetorical.

2. **AI is a teacher, not a ghostwriter.** Post-mint AI translations exist to help viewers understand, and—crucially—to show owners *how* their own words traveled. The goal is for fans to internalize communication skills, not to depend on AI to speak for them.

3. **Privacy isn't a compliance feature, it's a product feature.** Seal's programmable encryption lets us build a learning system on feedback data while giving viewers real, cryptographic ownership over what they shared. This is only possible because the Sui stack provides encryption as a native primitive.

We think Capsule is a case study in what becomes possible when Sui's object model, Walrus's blob storage, and Seal's encryption are treated as a single design surface rather than independent tools. The Pre-Mint layer you can try today is the foundation. The Post-Mint layer is where the full thesis lands.

Thanks for taking the time to look.

---

## 📄 License

MIT

## 🙏 Acknowledgments

- The language framework is inspired by Kaho Miyake's *Jibun no Kotoba de Hanaseru Hito ga Yatteiru Koto*
- Built during the Sui Blockchain Hackathon
- Domain context from ONE Championship events
