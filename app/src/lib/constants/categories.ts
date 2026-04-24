export const CATEGORY_KEYS = ['entrance', 'fight', 'ending', 'afterFight', 'uneasy'] as const;
export type CategoryKey = typeof CATEGORY_KEYS[number];

export const CATEGORY_SUBCATEGORY_KEYS: Record<CategoryKey, readonly string[]> = {
  entrance:   ['entranceMusic', 'entranceFace', 'costume', 'cornerTalk', 'faceOff'],
  fight:      ['strategyShift', 'decisiveMove', 'endurance', 'secondVoice', 'crowdInteraction'],
  ending:     ['outcome', 'reaction', 'handshake', 'decision'],
  afterFight: ['interview', 'embrace', 'loserGrace', 'emotionBurst'],
  uneasy:     ['unsatisfied', 'unexpected', 'unclear', 'indescribable'],
};
