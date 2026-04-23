import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PatternFeedback {
  tier: 0 | 1 | 2;        // 0=beginner 1=intermediate 2=hardcore
  outcome: 0 | 1 | 2;     // 0=communicated 1=wantMore 2=different
  text?: string;           // decrypted feedback body (optional)
}

export interface PatternRequest {
  capsule: {
    step1Category: string;
    step2Subcategory: string;
    step2Connection: string;
    step3Memo: string;
    eventName: string;
    fighterTag: string;
  };
  feedbacks: PatternFeedback[];
}

export interface TierInsight {
  tier: 'beginner' | 'intermediate' | 'hardcore';
  label: string;
  insight: string;
}

export interface PatternResponse {
  effectiveExpressions: string[];    // 効いた表現・語彙
  ineffectiveVocabulary: string[];   // 響かなかった語彙
  tierInsights: TierInsight[];       // 層別洞察
  summary: string;                   // 総括
}

// ── Tier labels ────────────────────────────────────────────────────────────────

const TIER_LABEL = {
  0: '初心者 (beginner)',
  1: '中級者 (intermediate)',
  2: '上級者 (hardcore)',
} as const;

const OUTCOME_LABEL = {
  0: '「伝わった」',
  1: '「もっと知りたい」',
  2: '「違う解釈」',
} as const;

// ── Fallback ───────────────────────────────────────────────────────────────────

function fallbackPattern(req: PatternRequest): PatternResponse {
  const { capsule, feedbacks } = req;
  const communicated = feedbacks.filter((f) => f.outcome === 0);
  const tierMap = new Map<number, number>();
  for (const f of feedbacks) tierMap.set(f.tier, (tierMap.get(f.tier) ?? 0) + 1);

  const topTier = [...tierMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;

  return {
    effectiveExpressions: [capsule.step2Subcategory, capsule.step1Category].filter(Boolean),
    ineffectiveVocabulary: [],
    tierInsights: [
      {
        tier: 'beginner',
        label: '初心者',
        insight:
          communicated.filter((f) => f.tier === 0).length > 0
            ? '身体感覚に訴える言葉が有効'
            : 'データ不足',
      },
    ],
    summary: `${TIER_LABEL[topTier as keyof typeof TIER_LABEL]}層からの反応が最多。原液メモの感情表現が共感を生んでいます。`,
  };
}

// ── Prompt builder ─────────────────────────────────────────────────────────────

function buildPrompt(req: PatternRequest): string {
  const { capsule, feedbacks } = req;

  const feedbackLines = feedbacks.map((fb, i) => {
    const tierLabel = TIER_LABEL[fb.tier as keyof typeof TIER_LABEL] ?? `tier ${fb.tier}`;
    const outcomeLabel = OUTCOME_LABEL[fb.outcome as keyof typeof OUTCOME_LABEL] ?? `outcome ${fb.outcome}`;
    const text = fb.text ? `\n   本文: "${fb.text}"` : '';
    return `  ${i + 1}. [${tierLabel}] 反応: ${outcomeLabel}${text}`;
  });

  return `あなたはONE Championship観戦記録の「感情伝達アナリスト」です。
カプセルNFTに集まったフィードバックを分析し、どんな表現が誰に響いたかを特定してください。

【カプセル情報】
- イベント: ${capsule.eventName}
- ファイター: ${capsule.fighterTag}
- 瞬間カテゴリ: ${capsule.step1Category}
- 感情: ${capsule.step2Subcategory}
- 繋がり方: "${capsule.step2Connection}"
- 原液メモ: "${capsule.step3Memo}"

【フィードバック (${feedbacks.length}件)】
${feedbackLines.join('\n') || '  (なし)'}

分析結果を以下の JSON で返してください:
{
  "effectiveExpressions": ["響いた表現・語彙を3〜5個、具体的に"],
  "ineffectiveVocabulary": ["響かなかった・曖昧すぎた表現を1〜3個"],
  "tierInsights": [
    { "tier": "beginner", "label": "初心者", "insight": "初心者に何が刺さったか、または刺さらなかったか" },
    { "tier": "intermediate", "label": "中級者", "insight": "中級者への有効性" },
    { "tier": "hardcore", "label": "上級者", "insight": "上級者への有効性" }
  ],
  "summary": "全体を通じて学べるパターンを2〜3文で。例: 「初心者層には身体反応の言葉が効いている」"
}

JSON のみを返すこと。コードブロックや前置き文は不要。`;
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: PatternRequest;
  try {
    body = (await req.json()) as PatternRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.capsule || !Array.isArray(body.feedbacks)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(fallbackPattern(body));
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(body) }],
    });

    const text =
      message.content[0].type === 'text' ? message.content[0].text : '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const result = JSON.parse(jsonMatch[0]) as PatternResponse;
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/pattern]', err);
    return NextResponse.json(fallbackPattern(body));
  }
}
