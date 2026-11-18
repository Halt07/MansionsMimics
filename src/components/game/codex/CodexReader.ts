import type { MimicCharacter } from "@/api/schemas/mimicCharacter";

/**
 * Whose knowledge the Codex is showing: one mimic (picked with the pill at the top), or all of
 * them pooled. Sections that only reveal what's been discovered take this.
 */
export interface CodexReader {
  /** The mimic picked, or null for all of them. */
  viewedMimic: MimicCharacter | null;
  /** Whose discoveries count: [viewedMimic], or every mimic. */
  knowers: readonly MimicCharacter[];
}
