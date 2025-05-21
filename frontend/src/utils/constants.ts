import type { MultiplierType, LetterPoints } from './types';

export const LETTER_VALUES: LetterPoints = {
  'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
  'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
  'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10, '': 0
};

export const BOARD_LAYOUT: MultiplierType[][] = [
  ['TW', 'NONE', 'NONE', 'DL', 'NONE', 'NONE', 'NONE', 'TW', 'NONE', 'NONE', 'NONE', 'DL', 'NONE', 'NONE', 'TW'],
  ['NONE', 'DW', 'NONE', 'NONE', 'NONE', 'TL', 'NONE', 'NONE', 'NONE', 'TL', 'NONE', 'NONE', 'NONE', 'DW', 'NONE'],
  ['NONE', 'NONE', 'DW', 'NONE', 'NONE', 'NONE', 'DL', 'NONE', 'DL', 'NONE', 'NONE', 'NONE', 'DW', 'NONE', 'NONE'],
  ['DL', 'NONE', 'NONE', 'DW', 'NONE', 'NONE', 'NONE', 'DL', 'NONE', 'NONE', 'NONE', 'DW', 'NONE', 'NONE', 'DL'],
  ['NONE', 'NONE', 'NONE', 'NONE', 'DW', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE', 'DW', 'NONE', 'NONE', 'NONE', 'NONE'],
  ['NONE', 'TL', 'NONE', 'NONE', 'NONE', 'TL', 'NONE', 'NONE', 'NONE', 'TL', 'NONE', 'NONE', 'NONE', 'TL', 'NONE'],
  ['NONE', 'NONE', 'DL', 'NONE', 'NONE', 'NONE', 'DL', 'NONE', 'DL', 'NONE', 'NONE', 'NONE', 'DL', 'NONE', 'NONE'],
  ['TW', 'NONE', 'NONE', 'DL', 'NONE', 'NONE', 'NONE', 'STAR', 'NONE', 'NONE', 'NONE', 'DL', 'NONE', 'NONE', 'TW'],
  ['NONE', 'NONE', 'DL', 'NONE', 'NONE', 'NONE', 'DL', 'NONE', 'DL', 'NONE', 'NONE', 'NONE', 'DL', 'NONE', 'NONE'],
  ['NONE', 'TL', 'NONE', 'NONE', 'NONE', 'TL', 'NONE', 'NONE', 'NONE', 'TL', 'NONE', 'NONE', 'NONE', 'TL', 'NONE'],
  ['NONE', 'NONE', 'NONE', 'NONE', 'DW', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE', 'DW', 'NONE', 'NONE', 'NONE', 'NONE'],
  ['DL', 'NONE', 'NONE', 'DW', 'NONE', 'NONE', 'NONE', 'DL', 'NONE', 'NONE', 'NONE', 'DW', 'NONE', 'NONE', 'DL'],
  ['NONE', 'NONE', 'DW', 'NONE', 'NONE', 'NONE', 'DL', 'NONE', 'DL', 'NONE', 'NONE', 'NONE', 'DW', 'NONE', 'NONE'],
  ['NONE', 'DW', 'NONE', 'NONE', 'NONE', 'TL', 'NONE', 'NONE', 'NONE', 'TL', 'NONE', 'NONE', 'NONE', 'DW', 'NONE'],
  ['TW', 'NONE', 'NONE', 'DL', 'NONE', 'NONE', 'NONE', 'TW', 'NONE', 'NONE', 'NONE', 'DL', 'NONE', 'NONE', 'TW'],
];

export const MULTIPLIER_COLORS = {
  'TW': '#e63946', // Red 
  'DW': '#f5ba31', // Orange
  'TL': '#4895ef', // Dark Blue 
  'DL': '#98d6ed', // Light Blue 
  'STAR': '#f8c967', // Orange
  'NONE': '#1a6e3c', // Green 
};

export const MAX_RACK_SIZE = 7;

export const BOARD_SIZE = 15;

export type LetterDistribution = {
  [key: string]: number;
} & {
  'A': number; 'B': number; 'C': number; 'D': number; 'E': number;
  'F': number; 'G': number; 'H': number; 'I': number; 'J': number;
  'K': number; 'L': number; 'M': number; 'N': number; 'O': number;
  'P': number; 'Q': number; 'R': number; 'S': number; 'T': number;
  'U': number; 'V': number; 'W': number; 'X': number; 'Y': number;
  'Z': number; 'BLANK': number;
};

export const LETTER_DISTRIBUTION: LetterDistribution = {
  'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2, 'I': 9,
  'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2, 'Q': 1, 'R': 6,
  'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1, 'Y': 2, 'Z': 1, 'BLANK': 2
};