import { pipeline } from "@huggingface/transformers";

const MODEL_ID = "Xenova/ast-finetuned-audioset-10-10-0.4593";

export interface SoundScore {
  label: string;
  score: number;
}

type Classifier = Awaited<ReturnType<typeof pipeline<"audio-classification">>>;

let classifierPromise: Promise<Classifier> | null = null;

export function loadClassifier(onProgress?: (percent: number) => void): Promise<Classifier> {
  if (!classifierPromise) {
    classifierPromise = pipeline("audio-classification", MODEL_ID, {
      dtype: "q8",
      progress_callback: (info) => {
        if (info.status === "progress") onProgress?.(info.progress);
      },
    }).catch((err: unknown) => {
      classifierPromise = null;
      throw err;
    });
  }
  return classifierPromise;
}

export async function classifySound(audio: Float32Array, onProgress?: (percent: number) => void): Promise<SoundScore[]> {
  const classifier = await loadClassifier(onProgress);
  const output = (await classifier(audio, { top_k: 527 })) as SoundScore[];
  return output;
}
