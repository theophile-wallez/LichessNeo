/** One independent part of the extension, started once when its script loads. */
export interface Feature {
  readonly name: string;
  readonly start: () => void;
}

/** Starts each feature in order; one that throws doesn't keep the others from starting. */
export function startFeatures(features: readonly Feature[]): void {
  for (const feature of features) {
    try {
      feature.start();
    } catch (error) {
      console.error(`[LichessNeo] ${feature.name} failed to start`, error);
    }
  }
}
