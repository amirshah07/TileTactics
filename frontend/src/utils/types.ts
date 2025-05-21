export type MultiplierType = 'DL' | 'TL' | 'DW' | 'TW' | 'STAR' | 'NONE';

export type BoardPosition = {
  row: number;
  col: number;
};

export interface SquareContent {
  letter: string;
  isBlank: boolean; //to check if blank for 0 score
}

export type BoardState = (SquareContent | null)[][];

export type RackState = string[];

export interface LetterPoints {
  [key: string]: number;
}