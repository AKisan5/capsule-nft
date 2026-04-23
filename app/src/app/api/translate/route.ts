import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ViewerProfile } from '@/lib/seal/profile';

// ── リクエスト / レスポンス型 ──────────────────────────────────────────────

export interface TranslateRequest {
  capsule: {
    step1Category: string;
    step1Items: string[];
    step1FreeText: string;
    step2Polarity: string;
    step2Subcategory: string;
    step2Connection: string;
    step3Memo: string;
    eventName: string;
    fighterTag: string;
  };
  profile: ViewerProfile;
}

export interface TranslateResponse {
  /** 15 文字以内の見出し */
  headline: string;
  /** 閲覧者向けに翻訳した感情解説 (80–120 文字) */
  bridge: string;
  /** この閲覧者に最も刺さるはずの一文 (40–60 文字) */
  essence: string;
}

// ── プロファイルの日本語記述 ───────────────────────────────────────────────

const FIGHTER_KNOWLEDGE_LABEL: Record<string, string> = {
  '1': 'この選手を全く知らない',
  '2': 'この選手の名前は知っている',
  '3': 'この選手の試合を見たことがある',
  '4': 'この選手をよく追いかけている',
  '5': 'この選手を熟知している',
};

const FIGHTER_IMPRESSION_LABEL: Record<string, string> = {
  '1': 'この選手に無関心',
  '2': 'この選手が少し気になる',
  '3': 'この選手に興味がある',
  '4': 'この選手を応援している',
  '5': 'この選手の大ファン',
};

const MMA_KNOWLEDGE_LABEL: Record<string, string> = {
  '1': '格闘技は今日が初めて',
  '2': '格闘技を少し知っている',
  '3': '格闘技をよく観る',
  '4': '格闘技に詳しい',
  '5': '格闘技マニア',
};

// ── Fallback (API キー未設定時) ────────────────────────────────────────────

function fallbackTranslation(req: TranslateRequest): TranslateResponse {
  const { capsule, profile } = req;
  return {
    headline: `${capsule.step2Subcategory}の瞬間`,
    bridge: `${MMA_KNOWLEDGE_LABEL[profile.mmaKnowledge]}視点から見ると、この「${capsule.step1Category}」の瞬間は${capsule.step2Subcategory}を呼び起こすシーンです。${capsule.fighterTag}のパフォーマンスがその核心にあります。`,
    essence: `${capsule.step2Subcategory}として刻まれた、あの瞬間の真実。`,
  };
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: TranslateRequest;
  try {
    body = (await req.json()) as TranslateRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(fallbackTranslation(body));
  }

  const { capsule, profile } = body;
  const items = capsule.step1Items.length
    ? `（${capsule.step1Items.join(' / ')}）`
    : '';

  const prompt = `あなたはONE Championship観戦体験の「感情翻訳機」です。
あるファンが残したカプセルNFTのメモを、別のファンの視点に翻訳してください。

【カプセルの内容】
- 瞬間の種類: ${capsule.step1Category}${items}
- 感情の核: ${capsule.step2Subcategory}（${capsule.step2Polarity}）
- 繋がり方: "${capsule.step2Connection}"
- 原液メモ: "${capsule.step3Memo}"
- イベント: ${capsule.eventName}　ファイター: ${capsule.fighterTag}

【閲覧者プロファイル】
- この選手の知識: ${FIGHTER_KNOWLEDGE_LABEL[profile.fighterKnowledge] ?? profile.fighterKnowledge}
- この選手への印象: ${FIGHTER_IMPRESSION_LABEL[profile.fighterImpression] ?? profile.fighterImpression}
- 格闘技全般の知識: ${MMA_KNOWLEDGE_LABEL[profile.mmaKnowledge] ?? profile.mmaKnowledge}${profile.selfIntro ? `\n- 自己紹介: "${profile.selfIntro}"` : ''}

この閲覧者に響くよう翻訳した JSON を返してください:
{
  "headline": "この瞬間を一言で表す見出し（最大15文字、日本語）",
  "bridge": "閲覧者向けに翻訳した感情解説（80〜120文字、日本語、です/ます調不要）",
  "essence": "この閲覧者に最も刺さるはずの一文（40〜60文字、日本語）"
}

JSON のみを返すこと。コードブロックや前置き文は不要。`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      message.content[0].type === 'text' ? message.content[0].text : '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');
    const result = JSON.parse(jsonMatch[0]) as TranslateResponse;

    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/translate]', err);
    return NextResponse.json(fallbackTranslation(body));
  }
}
