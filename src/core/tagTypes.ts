export type AiTagKind = 'expiry' | 'sync';

export type AiTagEntry = {
  kind: AiTagKind;
  payload: string;
  raw: string;
  line: number;
  startChar: number;
  endChar: number;
};
