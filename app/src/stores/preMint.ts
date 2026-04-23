import { create } from 'zustand';

export interface Step1State {
  category: string;
  items: string[];
  freeText: string;
}

export interface Step2State {
  polarity: string;
  subcategory: string;
  connection: string;
}

export interface Step3State {
  memo: string;
}

interface PreMintState {
  photoBlobId: string | null;
  photoPreviewUrl: string | null;
  step1: Step1State;
  step2: Step2State;
  step3: Step3State;
  eventName: string;
  fighterTag: string;
}

interface PreMintActions {
  setPhoto: (blobId: string, previewUrl: string) => void;
  setStep1: (data: Partial<Step1State>) => void;
  setStep2: (data: Partial<Step2State>) => void;
  setStep3: (data: Partial<Step3State>) => void;
  setEventName: (name: string) => void;
  setFighterTag: (tag: string) => void;
  reset: () => void;
}

const initialStep1: Step1State = { category: '', items: [], freeText: '' };
const initialStep2: Step2State = { polarity: '', subcategory: '', connection: '' };
const initialStep3: Step3State = { memo: '' };

const initialState: PreMintState = {
  photoBlobId: null,
  photoPreviewUrl: null,
  step1: initialStep1,
  step2: initialStep2,
  step3: initialStep3,
  eventName: '',
  fighterTag: '',
};

export const usePreMintStore = create<PreMintState & PreMintActions>((set) => ({
  ...initialState,
  setPhoto: (blobId, previewUrl) =>
    set({ photoBlobId: blobId, photoPreviewUrl: previewUrl }),
  setStep1: (data) =>
    set((s) => ({ step1: { ...s.step1, ...data } })),
  setStep2: (data) =>
    set((s) => ({ step2: { ...s.step2, ...data } })),
  setStep3: (data) =>
    set((s) => ({ step3: { ...s.step3, ...data } })),
  setEventName: (name) => set({ eventName: name }),
  setFighterTag: (tag) => set({ fighterTag: tag }),
  reset: () => set(initialState),
}));
