export type SourceType =
  | "manual"
  | "linkedin"
  | "blog"
  | "youtube"
  | "file";

export interface IngestedSource {
  type: SourceType;
  title: string;
  url: string | null;
  text: string;
  wordCount: number;
  meta: Record<string, string>;
}
