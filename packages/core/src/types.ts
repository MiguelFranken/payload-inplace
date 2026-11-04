/** Stable provenance for one block, independent of native field positions or frameworks. */
export interface BlockIdentity {
  root: string;
  blockId: string;
  ancestors?: string[];
}
