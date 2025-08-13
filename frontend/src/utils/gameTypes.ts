export interface GameTile {
  id: number;
  letter: string;
  value: number;
  isBlank: boolean;
}

export interface PlacedTile {
  row: number;
  col: number;
  tile: GameTile;
}

export interface Move {
  tiles: PlacedTile[];
  word: string;
  score: number;
  player?: 'player' | 'ai';
}

export interface TileBagState {
  tiles: GameTile[];
  remaining: number;
}

export interface GameState {
  board: (GameTile | null)[][];
  playerRack: GameTile[];
  aiRack: GameTile[];
  tileBag: TileBagState;
  playerScore: number;
  aiScore: number;
  currentTurn: 'player' | 'ai';
  moveHistory: Move[];
  consecutivePasses: number;
  isFirstMove: boolean;
  gameOver: boolean;
  dictionary: 'nwl2023' | 'csw24';
}

export interface DragTileData {
  tile: GameTile;
  source: 'rack' | 'board';
  sourceIndex?: number;
  sourcePosition?: { row: number; col: number };
}