export interface Category {
  value: string;
  label: string;
  subcategories: string[];
}

export const CATEGORIES: Category[] = [
  {
    value: '入場・セレモニー',
    label: '入場・セレモニー',
    subcategories: [
      '入場曲',
      '表情・佇まい',
      '衣装',
      'コーナーやりとり',
      'フェイスオフ',
    ],
  },
  {
    value: '試合の展開',
    label: '試合の展開',
    subcategories: [
      'ラウンド戦略の変化',
      '決定的な技',
      '耐えた瞬間',
      'セコンドの声かけ',
      '観客との相互作用',
    ],
  },
  {
    value: '結末',
    label: '結末',
    subcategories: [
      '勝敗の決まり方',
      '勝利/敗北の受け止め',
      '相手選手との握手',
      '判定への反応',
    ],
  },
  {
    value: '試合後',
    label: '試合後',
    subcategories: [
      'インタビュー',
      '家族・セコンドとの抱擁',
      '敗者の振る舞い',
      '感情の爆発',
    ],
  },
  {
    value: '違和感・モヤモヤ',
    label: '違和感・モヤモヤ',
    subcategories: [
      '納得いかなかった判定',
      '期待と違った展開',
      '理解できなかった演出',
      'まだ言葉にできない',
    ],
  },
];

export function getCategoryByValue(value: string): Category | undefined {
  return CATEGORIES.find((c) => c.value === value);
}
