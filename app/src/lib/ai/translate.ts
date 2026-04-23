import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface TranslationResult {
  en: string;
  ja: string;
  emotionTag: string;
}

export async function translateMemo(rawMemo: string, fighterName: string, eventName: string): Promise<TranslationResult> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a translator for ONE Championship fight memories.
The user has written a raw emotional memo after watching a fight.

Event: ${eventName}
Fighter: ${fighterName}
Raw memo (Japanese): ${rawMemo}

Please provide:
1. An English translation that captures the raw emotion
2. A refined Japanese version suitable for sharing
3. A single emotion tag (e.g., "震撼", "感動", "歓喜", "鳥肌", "涙")

Respond in JSON format:
{
  "en": "English translation",
  "ja": "Refined Japanese",
  "emotionTag": "emotion tag"
}`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI response parsing failed');
  return JSON.parse(jsonMatch[0]) as TranslationResult;
}
