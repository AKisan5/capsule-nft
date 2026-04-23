import { create } from 'zustand';

export interface CapsuleDraft {
  eventName: string;
  fighterName: string;
  rawMemo: string;
  photoFile: File | null;
  photoBlobId: string;
  translatedEn: string;
  translatedJa: string;
  emotionTag: string;
}

interface CapsuleStore {
  draft: CapsuleDraft;
  step: number;
  setDraftField: <K extends keyof CapsuleDraft>(key: K, value: CapsuleDraft[K]) => void;
  setStep: (step: number) => void;
  resetDraft: () => void;
}

const initialDraft: CapsuleDraft = {
  eventName: '',
  fighterName: '',
  rawMemo: '',
  photoFile: null,
  photoBlobId: '',
  translatedEn: '',
  translatedJa: '',
  emotionTag: '',
};

export const useCapsuleStore = create<CapsuleStore>((set) => ({
  draft: initialDraft,
  step: 1,
  setDraftField: (key, value) =>
    set((state) => ({ draft: { ...state.draft, [key]: value } })),
  setStep: (step) => set({ step }),
  resetDraft: () => set({ draft: initialDraft, step: 1 }),
}));
