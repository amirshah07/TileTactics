import { useState, useEffect, useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { HTML5Backend } from 'react-dnd-html5-backend';
import GameBoard from '../../components/GameBoard/GameBoard';
import GameRack from '../../components/GameRack/GameRack';
import BlankTileModal from '../../components/BlankTileModal/BlankTileModal';
import TileExchangeModal from '../../components/TileExchangeModal/TileExchangeModal';
import GameOverModal from '../../components/GameOverModal/GameOverModal';
import { useNoMoreTilesToast } from '../../components/NoMoreTilesToast/useNoMoreTilesToast';
import { loadWasm, analyzeBoard, validateWords as validateWordsWasm } from '../../utils/wasmLoader';
import { LETTER_DISTRIBUTION, LETTER_VALUES, BOARD_LAYOUT } from '../../utils/constants';
import type { GameTile, GameState, Move, TileBagState, PlacedTile } from '../../utils/gameTypes';
import './VsAI.css';

// Detect if device supports touch
const isTouchDevice = () => {
  return (('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    ((navigator as any).msMaxTouchPoints > 0));
};

// Select appropriate backend based on device capabilities
const DndBackend = isTouchDevice() ? TouchBackend : HTML5Backend;

// Backend options for touch support
const backendOptions = isTouchDevice() ? {
  enableMouseEvents: true, // Allows both touch and mouse events
  enableKeyboardEvents: true,
  delayTouchStart: 200, // Delay before drag starts (prevents conflicts with scrolling)
  touchSlop: 5, // Movement threshold before drag starts
} : {};

// Initialise tile bag with standard distribution
const initialiseTileBag = (): TileBagState => {
  const tiles: GameTile[] = [];
  let id = 0;
  
  Object.entries(LETTER_DISTRIBUTION).forEach(([letter, count]) => {
    if (letter === 'BLANK') {
      // Ensure exactly 2 blanks, regardless of what's in LETTER_DISTRIBUTION
      const blankCount = Math.min(count, 2);
      for (let i = 0; i < blankCount; i++) {
        tiles.push({ id: id++, letter: '?', value: 0, isBlank: true });
      }
    } else {
      for (let i = 0; i < count; i++) {
        tiles.push({ 
          id: id++, 
          letter, 
          value: LETTER_VALUES[letter], 
          isBlank: false 
        });
      }
    }
  });
  
  // Shuffle tiles
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  
  return { tiles, remaining: tiles.length };
};

// Draw tiles from bag
const drawTiles = (bag: TileBagState, count: number): { tiles: GameTile[], newBag: TileBagState } => {
  const drawnTiles = bag.tiles.slice(0, Math.min(count, bag.tiles.length));
  const newBag = {
    tiles: bag.tiles.slice(drawnTiles.length),
    remaining: bag.tiles.length - drawnTiles.length
  };
  return { tiles: drawnTiles, newBag };
};

export default function VsAIContent() {
  const { showNoMoreTilesError } = useNoMoreTilesToast();
  
  const [gameState, setGameState] = useState<GameState>({
    board: Array(15).fill(null).map(() => Array(15).fill(null)),
    playerRack: [],
    aiRack: [],
    tileBag: initialiseTileBag(),
    playerScore: 0,
    aiScore: 0,
    currentTurn: 'player',
    moveHistory: [],
    consecutivePasses: 0,
    isFirstMove: true,
    gameOver: false,
    dictionary: 'csw24'
  });

  const [selectedDictionary, setSelectedDictionary] = useState<'nwl2023' | 'csw24'>('csw24');
  const [gameStarted, setGameStarted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [lastAiMove, setLastAiMove] = useState<Move | null>(null);
  const [turnStartState, setTurnStartState] = useState<{
    board: (GameTile | null)[][];
    rack: GameTile[];
  }>({
    board: Array(15).fill(null).map(() => Array(15).fill(null)),
    rack: []
  });
  const [blankTilePosition, setBlankTilePosition] = useState<{ row: number; col: number } | null>(null);
  const [showBlankModal, setShowBlankModal] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [resignedPlayer, setResignedPlayer] = useState<'player' | 'ai' | null>(null);

  // Track if tiles have been placed this turn
  const tilesPlacedThisTurn = useMemo(() => {
    const placedTiles: PlacedTile[] = [];
    
    if (!turnStartState.board || turnStartState.board.length === 0) return placedTiles;
    
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        const currentTile = gameState.board[row][col];
        const previousTile = turnStartState.board[row][col];
        
        // Tile was placed if current has tile but previous doesn't
        if (currentTile && !previousTile) {
          placedTiles.push({ row, col, tile: currentTile });
        }
      }
    }
    
    return placedTiles;
  }, [gameState.board, turnStartState.board]);

  // Combined loading state
  const isLoading = isThinking || isValidating;

  // Load WASM on component mount
  useEffect(() => {
    loadWasm().catch(() => {
      // Silent fail - error handling done elsewhere
    });
  }, []);

  // Start new game
  const startNewGame = useCallback(() => {
    const initialBag = initialiseTileBag();
    
    // Draw initial tiles for both players
    const { tiles: playerTiles, newBag: bagAfterPlayer } = drawTiles(initialBag, 7);
    const { tiles: aiTiles, newBag: finalBag } = drawTiles(bagAfterPlayer, 7);
    
    const initialBoard = Array(15).fill(null).map(() => Array(15).fill(null));
    
    setGameState({
      board: initialBoard,
      playerRack: playerTiles,
      aiRack: aiTiles,
      tileBag: finalBag,
      playerScore: 0,
      aiScore: 0,
      currentTurn: 'player',
      moveHistory: [],
      consecutivePasses: 0,
      isFirstMove: true,
      gameOver: false,
      dictionary: selectedDictionary
    });
    
    setTurnStartState({
      board: initialBoard.map(row => [...row]),
      rack: [...playerTiles]
    });
    setGameStarted(true);
    setShowGameOverModal(false);
    setLastAiMove(null);
    setResignedPlayer(null);
    setIsValidating(false);
    setIsThinking(false);
  }, [selectedDictionary]);

  // Get all words formed by placed tiles
  const getFormedWords = useCallback((board: (GameTile | null)[][], placedTiles: PlacedTile[]): string[] => {
    const words: string[] = [];
    const processedPositions = new Set<string>();

    // For each placed tile, find all words it's part of
    placedTiles.forEach(placed => {
      // Check horizontal word
      let startCol = placed.col;
      let endCol = placed.col;
      
      // Find start of horizontal word
      while (startCol > 0 && board[placed.row][startCol - 1]) {
        startCol--;
      }
      
      // Find end of horizontal word
      while (endCol < 14 && board[placed.row][endCol + 1]) {
        endCol++;
      }
      
      // Extract horizontal word if longer than 1 letter
      if (endCol > startCol) {
        const posKey = `h-${placed.row}-${startCol}-${endCol}`;
        if (!processedPositions.has(posKey)) {
          processedPositions.add(posKey);
          let word = '';
          for (let col = startCol; col <= endCol; col++) {
            const tile = board[placed.row][col];
            if (tile) {
              word += tile.isBlank ? tile.letter.toLowerCase() : tile.letter;
            }
          }
          if (word.length > 1) {
            words.push(word);
          }
        }
      }
      
      // Check vertical word
      let startRow = placed.row;
      let endRow = placed.row;
      
      // Find start of vertical word
      while (startRow > 0 && board[startRow - 1][placed.col]) {
        startRow--;
      }
      
      // Find end of vertical word
      while (endRow < 14 && board[endRow + 1][placed.col]) {
        endRow++;
      }
      
      // Extract vertical word if longer than 1 letter
      if (endRow > startRow) {
        const posKey = `v-${placed.col}-${startRow}-${endRow}`;
        if (!processedPositions.has(posKey)) {
          processedPositions.add(posKey);
          let word = '';
          for (let row = startRow; row <= endRow; row++) {
            const tile = board[row][placed.col];
            if (tile) {
              word += tile.isBlank ? tile.letter.toLowerCase() : tile.letter;
            }
          }
          if (word.length > 1) {
            words.push(word);
          }
        }
      }
      
      // If single tile placement forms both horizontal and vertical words of length 1, still need to include the single letter
      if (startCol === endCol && startRow === endRow) {
        const tile = board[placed.row][placed.col];
        if (tile) {
          const letter = tile.isBlank ? tile.letter.toLowerCase() : tile.letter;
          words.push(letter);
        }
      }
    });
    
    return words;
  }, []);

  // Validate if tiles are connected
  const validateTilesConnected = useCallback((placedTiles: PlacedTile[]): boolean => {
    if (placedTiles.length === 0) return false;
    if (placedTiles.length === 1) return true;
    
    // Check if all tiles are in same row or column
    const rows = new Set(placedTiles.map(t => t.row));
    const cols = new Set(placedTiles.map(t => t.col));
    
    const isHorizontal = rows.size === 1;
    const isVertical = cols.size === 1;
    
    if (!isHorizontal && !isVertical) {
      return false;
    }
    
    // Check if tiles form continuous line (no gaps)
    if (isHorizontal) {
      const row = placedTiles[0].row;
      const sortedCols = placedTiles.map(t => t.col).sort((a, b) => a - b);
      
      for (let col = sortedCols[0]; col <= sortedCols[sortedCols.length - 1]; col++) {
        // Must have a tile at each position (either placed or existing)
        const hasPlacedTile = placedTiles.some(t => t.col === col);
        const hasExistingTile = turnStartState.board[row][col] !== null;
        
        if (!hasPlacedTile && !hasExistingTile) {
          return false;
        }
      }
    } else {
      const col = placedTiles[0].col;
      const sortedRows = placedTiles.map(t => t.row).sort((a, b) => a - b);
      
      for (let row = sortedRows[0]; row <= sortedRows[sortedRows.length - 1]; row++) {
        // Must have a tile at each position (either placed or existing)
        const hasPlacedTile = placedTiles.some(t => t.row === row);
        const hasExistingTile = turnStartState.board[row][col] !== null;
        
        if (!hasPlacedTile && !hasExistingTile) {
          return false;
        }
      }
    }
    
    return true;
  }, [turnStartState.board]);

  // Validate if move connects to existing tiles (for non-first moves)
  const validateConnectsToBoard = useCallback((placedTiles: PlacedTile[], isFirstMove: boolean): boolean => {
    if (isFirstMove) {
      // First move must cross centre
      return placedTiles.some(t => t.row === 7 && t.col === 7);
    }
    
    // Non-first move must connect to existing tiles
    return placedTiles.some(placed => {
      // Check adjacent positions
      const adjacentPositions = [
        { row: placed.row - 1, col: placed.col },
        { row: placed.row + 1, col: placed.col },
        { row: placed.row, col: placed.col - 1 },
        { row: placed.row, col: placed.col + 1 }
      ];
      
      return adjacentPositions.some(pos => {
        if (pos.row >= 0 && pos.row < 15 && pos.col >= 0 && pos.col < 15) {
          return turnStartState.board[pos.row][pos.col] !== null;
        }
        return false;
      });
    });
  }, [turnStartState.board]);

  // Calculate score for a move with proper multipliers
  const calculateScore = useCallback((placedTiles: PlacedTile[], board: (GameTile | null)[][]): number => {
    let totalScore = 0;
    const processedWords = new Set<string>();
    
    // Process each placed tile
    placedTiles.forEach(placed => {
      // Check horizontal word
      let hStart = placed.col;
      let hEnd = placed.col;
      
      while (hStart > 0 && board[placed.row][hStart - 1]) hStart--;
      while (hEnd < 14 && board[placed.row][hEnd + 1]) hEnd++;
      
      if (hEnd > hStart) {
        const wordKey = `h-${placed.row}-${hStart}-${hEnd}`;
        if (!processedWords.has(wordKey)) {
          processedWords.add(wordKey);
          
          let wordScore = 0;
          let wordMultiplier = 1;
          
          for (let col = hStart; col <= hEnd; col++) {
            const tile = board[placed.row][col];
            if (!tile) continue;
            
            // Check if this is a newly placed tile
            const isNewTile = placedTiles.some(p => p.row === placed.row && p.col === col);
            
            if (isNewTile) {
              // Apply multipliers for new tiles
              const multiplier = BOARD_LAYOUT[placed.row][col];
              let letterScore = tile.value;
              
              if (multiplier === 'DL') letterScore *= 2;
              else if (multiplier === 'TL') letterScore *= 3;
              else if (multiplier === 'DW' || multiplier === 'STAR') wordMultiplier *= 2;
              else if (multiplier === 'TW') wordMultiplier *= 3;
              
              wordScore += letterScore;
            } else {
              // Existing tile - just add face value
              wordScore += tile.value;
            }
          }
          
          totalScore += wordScore * wordMultiplier;
        }
      }
      
      // Check vertical word
      let vStart = placed.row;
      let vEnd = placed.row;
      
      while (vStart > 0 && board[vStart - 1][placed.col]) vStart--;
      while (vEnd < 14 && board[vEnd + 1][placed.col]) vEnd++;
      
      if (vEnd > vStart) {
        const wordKey = `v-${placed.col}-${vStart}-${vEnd}`;
        if (!processedWords.has(wordKey)) {
          processedWords.add(wordKey);
          
          let wordScore = 0;
          let wordMultiplier = 1;
          
          for (let row = vStart; row <= vEnd; row++) {
            const tile = board[row][placed.col];
            if (!tile) continue;
            
            // Check if this is a newly placed tile
            const isNewTile = placedTiles.some(p => p.row === row && p.col === placed.col);
            
            if (isNewTile) {
              // Apply multipliers for new tiles
              const multiplier = BOARD_LAYOUT[row][placed.col];
              let letterScore = tile.value;
              
              if (multiplier === 'DL') letterScore *= 2;
              else if (multiplier === 'TL') letterScore *= 3;
              else if (multiplier === 'DW' || multiplier === 'STAR') wordMultiplier *= 2;
              else if (multiplier === 'TW') wordMultiplier *= 3;
              
              wordScore += letterScore;
            } else {
              // Existing tile - just add face value
              wordScore += tile.value;
            }
          }
          
          totalScore += wordScore * wordMultiplier;
        }
      }
    });
    
    // Add 50 point bonus for using all 7 tiles
    if (placedTiles.length === 7) {
      totalScore += 50;
    }
    
    return totalScore;
  }, []);

  // Validate words against dictionary
  const validateWords = useCallback(async (words: string[]): Promise<{ isValid: boolean; invalidWords?: string[] }> => {
    try {
      // Call WASM validation function
      const response = await validateWordsWasm(words, gameState.dictionary);
      
      return {
        isValid: response.allValid,
        invalidWords: response.invalidWords
      };
    } catch (error) {
      // Return false on error to be safe
      return {
        isValid: false,
        invalidWords: words
      };
    }
  }, [gameState.dictionary]);

  // Submit player move
  const handleSubmitMove = useCallback(async () => {
    if (tilesPlacedThisTurn.length === 0) {
      showNoMoreTilesError('Please place tiles on the board first');
      return;
    }

    // Start validation loading state
    setIsValidating(true);

    // Add small delay to make loading state visible
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      // Validate tiles are connected in a line
      if (!validateTilesConnected(tilesPlacedThisTurn)) {
        showNoMoreTilesError('Tiles must be placed in a straight line without gaps');
        return;
      }

      // Validate move connects to existing tiles
      if (!validateConnectsToBoard(tilesPlacedThisTurn, gameState.isFirstMove)) {
        if (gameState.isFirstMove) {
          showNoMoreTilesError('First word must cross the centre star');
        } else {
          showNoMoreTilesError('Words must connect to existing tiles');
        }
        return;
      }

      // Get all formed words
      const formedWords = getFormedWords(gameState.board, tilesPlacedThisTurn);
      
      if (formedWords.length === 0) {
        showNoMoreTilesError('No valid words formed');
        return;
      }

      // Validate all words
      const validationResult = await validateWords(formedWords);
      if (!validationResult.isValid) {
        if (validationResult.invalidWords && validationResult.invalidWords.length > 0) {
          // Convert all letters to uppercase for display
          const invalidWordsList = validationResult.invalidWords
            .map(word => word.toUpperCase())
            .join(', ');
          showNoMoreTilesError(`Invalid word${validationResult.invalidWords.length > 1 ? 's' : ''}: ${invalidWordsList}`);
        } else {
          showNoMoreTilesError('One or more words are not in the dictionary');
        }
        return;
      }

      // Calculate score with proper multipliers
      const moveScore = calculateScore(tilesPlacedThisTurn, gameState.board);

      // Create move object
      const move: Move = {
        tiles: tilesPlacedThisTurn,
        word: formedWords[0], // Main word
        score: moveScore
      };

      // Draw new tiles
      const tilesToDraw = tilesPlacedThisTurn.length;
      const { tiles: newTiles, newBag } = drawTiles(gameState.tileBag, tilesToDraw);

      // Update game state
      setGameState(prev => ({
        ...prev,
        playerRack: [...prev.playerRack, ...newTiles],
        tileBag: newBag,
        playerScore: prev.playerScore + moveScore,
        currentTurn: 'ai',
        moveHistory: [...prev.moveHistory, { ...move, player: 'player' }],
        consecutivePasses: 0,
        isFirstMove: false
      }));
    } catch (error) {
      console.error('Error during move validation:', error);
      showNoMoreTilesError('An error occurred while validating your move');
    } finally {
      // Always reset validation state
      setIsValidating(false);
    }
  }, [tilesPlacedThisTurn, gameState, calculateScore, getFormedWords, validateTilesConnected, validateConnectsToBoard, validateWords, showNoMoreTilesError]);

  // Handle blank tile placement
  const handleBlankTileSelect = useCallback((letter: string) => {
    if (blankTilePosition) {
      setGameState(prev => {
        const newBoard = prev.board.map(row => [...row]);
        const tile = newBoard[blankTilePosition.row][blankTilePosition.col];
        if (tile && tile.isBlank) {
          tile.letter = letter;
        }
        return { ...prev, board: newBoard };
      });
    }
    setShowBlankModal(false);
    setBlankTilePosition(null);
  }, [blankTilePosition]);

  // Check if game has ended
  const checkGameEnd = useCallback((tileBag: TileBagState, aiRack: GameTile[], playerRack: GameTile[]) => {
    // Game ends if a player uses all tiles and bag is empty
    if (tileBag.remaining === 0 && (playerRack.length === 0 || aiRack.length === 0)) {
      setGameState(prev => ({ ...prev, gameOver: true }));
      setResignedPlayer(null); // Normal game end, not resignation
      setShowGameOverModal(true);
    }
  }, []);

  // Handle pass
  const handlePass = useCallback((player: 'player' | 'ai') => {
    setGameState(prev => {
      const newConsecutivePasses = prev.consecutivePasses + 1;
      const nextTurn = player === 'player' ? 'ai' : 'player';
      
      // If switching to player's turn, set the turn start state
      if (nextTurn === 'player') {
        setTimeout(() => {
          setTurnStartState({
            board: prev.board.map(row => row.map(tile => tile)),
            rack: [...prev.playerRack]
          });
        }, 0);
      }
      
      // Check if game ends due to consecutive passes (4 passes = game over)
      if (newConsecutivePasses >= 4) {
        setResignedPlayer(null); // Normal game end, not resignation
        return {
          ...prev,
          consecutivePasses: newConsecutivePasses,
          gameOver: true,
          currentTurn: nextTurn
        };
      }
      
      return {
        ...prev,
        consecutivePasses: newConsecutivePasses,
        currentTurn: nextTurn
      };
    });
  }, []);

  // Reset board to beginning of turn
  const handleResetTurn = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      board: turnStartState.board.map(row => row.map(tile => tile)),
      playerRack: [...turnStartState.rack]
    }));
  }, [turnStartState]);

  // Make AI move
  const makeAiMove = useCallback(async (currentBoard: (GameTile | null)[][], currentTileBag: TileBagState, currentPlayerRack: GameTile[]) => {
    try {
      // Convert board to format expected by WASM
      const boardForAnalysis = currentBoard.map(row => 
        row.map(tile => {
          if (!tile) return null;
          
          // For blanks already on the board, send the designated letter
          // For regular tiles, send the letter as-is
          return {
            letter: tile.letter === '?' ? '' : tile.letter,  // WASM expects empty string for undesignated blanks
            value: tile.value,
            isBlank: tile.isBlank
          };
        })
      );
      
      // Convert AI rack for analysis
      const rackForAnalysis = gameState.aiRack.map(tile => ({
        letter: tile.isBlank ? '' : tile.letter,  // Blanks should have empty string for WASM
        value: tile.value,
        isBlank: tile.isBlank
      }));
      
      // Calculate remaining tiles for evaluation
      const remainingTiles: Record<string, number> = {};
      currentTileBag.tiles.forEach(tile => {
        const key = tile.letter;  // Keep '?' for blanks
        remainingTiles[key] = (remainingTiles[key] || 0) + 1;
      });
      currentPlayerRack.forEach(tile => {
        const key = tile.letter;  // Keep '?' for blanks  
        remainingTiles[key] = (remainingTiles[key] || 0) + 1;
      });
      
      // Analyse position
      const response = await analyzeBoard({
        board: boardForAnalysis,
        rack: rackForAnalysis,
        remainingTiles,
        dictionary: gameState.dictionary
      });
      
      if (response.moves && response.moves.length > 0) {
        // Take the best move
        const bestMove = response.moves[0];
        
        // Apply AI move
        const newBoard = [...currentBoard];
        
        // Build a map of the complete word on the board
        const wordMap: { [key: string]: string } = {};
        
        if (bestMove.direction === 'H') {
          // Horizontal word
          for (let i = 0; i < bestMove.word.length; i++) {
            const col = bestMove.position.col + i;
            const key = `${bestMove.position.row},${col}`;
            wordMap[key] = bestMove.word[i].toUpperCase();
          }
        } else if (bestMove.direction === 'V') {
          // Vertical word
          for (let i = 0; i < bestMove.word.length; i++) {
            const row = bestMove.position.row + i;
            const key = `${row},${bestMove.position.col}`;
            wordMap[key] = bestMove.word[i].toUpperCase();
          }
        }
        
        // Now assign letters to tiles, using the word map for blanks
        const aiMove: Move = {
          tiles: bestMove.tilesPlaced.map(tp => {
            let letter = tp.tile.letter;
            
            // If it's a blank with no letter, get it from word map
            if (tp.tile.isBlank && (!letter || letter === '')) {
              const key = `${tp.position.row},${tp.position.col}`;
              letter = wordMap[key] || '?';
            }
            
            return {
              row: tp.position.row,
              col: tp.position.col,
              tile: {
                id: -1, // AI tiles don't need IDs
                letter: letter,
                value: tp.tile.value,
                isBlank: tp.tile.isBlank
              }
            };
          }),
          word: bestMove.word,
          score: bestMove.score
        };
        
        aiMove.tiles.forEach(tile => {
          newBoard[tile.row][tile.col] = tile.tile;
        });
        
        // Update AI rack - remove used tiles
        const usedTiles = bestMove.tilesPlaced.map(tp => tp.tile);
        const newAiRack = [...gameState.aiRack];
        
        usedTiles.forEach(usedTile => {
          // Find matching tile in rack
          const index = newAiRack.findIndex(t => {
            // For blanks, just match any blank (since they're interchangeable)
            if (usedTile.isBlank && t.isBlank) return true;
            // For regular tiles, match on letter and ensure not blank
            return !t.isBlank && !usedTile.isBlank && t.letter === usedTile.letter;
          });
          if (index !== -1) {
            newAiRack.splice(index, 1);
          }
        });
        
        // Draw new tiles for AI
        const tilesToDraw = 7 - newAiRack.length;
        const { tiles: newTiles, newBag } = drawTiles(currentTileBag, tilesToDraw);
        
        setGameState(prev => ({
          ...prev,
          board: newBoard,
          aiRack: [...newAiRack, ...newTiles],
          tileBag: newBag,
          aiScore: prev.aiScore + bestMove.score,
          currentTurn: 'player',
          moveHistory: [...prev.moveHistory, { ...aiMove, player: 'ai' }],
          consecutivePasses: 0,
          isFirstMove: false  
        }));
        
        // Set turn start state for player's next turn
        setTurnStartState({
          board: newBoard.map(row => row.map(tile => tile)),
          rack: [...currentPlayerRack]
        });
        
        setLastAiMove(aiMove);
        
        // Check for game end
        checkGameEnd(newBag, [...newAiRack, ...newTiles], currentPlayerRack);
      } else {
        // AI passes
        showNoMoreTilesError('AI passes', 3000);
        handlePass('ai');
        // Still need to set turn start state when AI passes
        setTurnStartState({
          board: currentBoard.map(row => row.map(tile => tile)),
          rack: [...currentPlayerRack]
        });
      }
    } catch (error) {
      showNoMoreTilesError('AI passes', 3000);
      handlePass('ai');
      // Set turn start state even on error
      setTurnStartState({
        board: currentBoard.map(row => row.map(tile => tile)),
        rack: [...currentPlayerRack]
      });
    } finally {
      setIsThinking(false);
    }
  }, [gameState.aiRack, gameState.dictionary, checkGameEnd, handlePass, showNoMoreTilesError]);

  // Handle tile exchange
  const handleExchange = useCallback((tilesToExchange: GameTile[]) => {
    // Return tiles to bag and shuffle
    const returnedBag = {
      tiles: [...gameState.tileBag.tiles, ...tilesToExchange],
      remaining: gameState.tileBag.remaining + tilesToExchange.length
    };
    
    // Shuffle bag
    for (let i = returnedBag.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [returnedBag.tiles[i], returnedBag.tiles[j]] = [returnedBag.tiles[j], returnedBag.tiles[i]];
    }
    
    // Draw new tiles
    const { tiles: newTiles, newBag } = drawTiles(returnedBag, tilesToExchange.length);
    
    // Update rack
    const exchangeIds = new Set(tilesToExchange.map(t => t.id));
    const keptTiles = gameState.playerRack.filter(t => !exchangeIds.has(t.id));
    
    setGameState(prev => ({
      ...prev,
      playerRack: [...keptTiles, ...newTiles],
      tileBag: newBag,
      currentTurn: 'ai',
      consecutivePasses: 0
    }));
    
    setShowExchangeModal(false);
  }, [gameState]);

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    if (gameState.currentTurn === 'ai' && !gameState.gameOver && gameStarted) {
      // Set thinking state immediately when AI turn starts
      setIsThinking(true);
      
      const timer = setTimeout(() => {
        makeAiMove(gameState.board, gameState.tileBag, gameState.playerRack);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentTurn, gameState.gameOver, gameStarted, gameState.board, gameState.tileBag, gameState.playerRack, makeAiMove]);

  // Show game over when game ends
  useEffect(() => {
    if (gameState.gameOver) {
      setShowGameOverModal(true);
    }
  }, [gameState.gameOver]);

  return (
    <DndProvider backend={DndBackend} options={backendOptions}>
      <div className="vsai-container">
        {!gameStarted ? (
          <div className="vsai-setup">
            <h1>Play vs TileTacticsAI</h1>
            <div className="vsai-setup-card">
              <h2>Choose Dictionary</h2>
              <div className="vsai-dictionary-options">
                <label>
                  <input
                    type="radio"
                    value="csw24"
                    checked={selectedDictionary === 'csw24'}
                    onChange={(e) => setSelectedDictionary(e.target.value as 'csw24')}
                  />
                  CSW24 (Collins Scrabble Words)
                </label>
                <label>
                  <input
                    type="radio"
                    value="nwl2023"
                    checked={selectedDictionary === 'nwl2023'}
                    onChange={(e) => setSelectedDictionary(e.target.value as 'nwl2023')}
                  />
                  NWL2023 (NASPA Word List)
                </label>
              </div>
              <button className="vsai-start-btn" onClick={startNewGame}>
                Start Game
              </button>
            </div>
          </div>
        ) : (
          <div className="vsai-game-container">
            <div className="vsai-game-left">
              <div className="vsai-info-container">
                <h2 className="vsai-section-heading">Game Status</h2>
                <div className="vsai-scores">
                  <div className={`vsai-score-display ${gameState.currentTurn === 'player' ? 'active' : ''}`}>
                    <span>You</span>
                    <span className="vsai-score">{gameState.playerScore}</span>
                  </div>
                  <div className={`vsai-score-display ${gameState.currentTurn === 'ai' ? 'active' : ''}`}>
                    <span>AI</span>
                    <span className="vsai-score">{gameState.aiScore}</span>
                  </div>
                </div>
                
                <div className="vsai-tiles-remaining">
                  <span>Tiles in bag:</span>
                  <span className="vsai-count">{gameState.tileBag.remaining}</span>
                </div>
              </div>
              
              <div className="vsai-rules-container">
                <h3 className="vsai-section-heading">How to Play</h3>
                <ol className="vsai-rules-list">
                  <li>Drag tiles from rack to board</li>
                  <li>First word must cross centre star</li>
                  <li>All tiles must form valid words</li>
                  <li>Click Submit to play move</li>
                  <li>Exchange tiles if needed (lose turn)</li>
                  <li>Pass if no valid moves</li>
                </ol>
              </div>
            </div>
            
            <div className="vsai-game-center">
              <div className="vsai-board-rack-wrapper">
                <GameBoard
                  boardState={gameState.board}
                  turnStartBoard={turnStartState.board}
                  onTilePlaced={(rowIdx: number, colIdx: number, placedTile: GameTile | null, sourcePosition?: { row: number; col: number }) => {
                    setGameState(prev => {
                      const newBoard = prev.board.map(row => [...row]);
                      const oldTile = newBoard[rowIdx][colIdx];
                      
                      // Don't allow placing on occupied squares
                      if (oldTile && placedTile) {
                        return prev;
                      }
                      
                      // Place tile at target position
                      newBoard[rowIdx][colIdx] = placedTile;
                      
                      // Check if placing a blank tile
                      if (placedTile && placedTile.isBlank && placedTile.letter === '?') {
                        setBlankTilePosition({ row: rowIdx, col: colIdx });
                        setShowBlankModal(true);
                      }
                      
                      // Handle rack updates
                      let newRack = [...prev.playerRack];
                      
                      // If this is a board-to-board move, clear the source position
                      if (sourcePosition && placedTile) {
                        newBoard[sourcePosition.row][sourcePosition.col] = null;
                        // Don't add to rack - tile is just moving positions on board
                      } 
                      // If removing tile from board (not a board-to-board move)
                      else if (oldTile && !placedTile) {
                        // Check if the square was empty at turn start
                        const wasEmptyAtTurnStart = !turnStartState.board[rowIdx][colIdx];
                        if (wasEmptyAtTurnStart) {
                          // Reset blank to '?' when returning to rack
                          const tileToReturn = { ...oldTile };
                          if (tileToReturn.isBlank && tileToReturn.letter !== '?') {
                            tileToReturn.letter = '?';
                          }
                          newRack.push(tileToReturn);
                        }
                      }
                      // If placing tile from rack, remove it from rack
                      else if (placedTile && !oldTile && !sourcePosition) {
                        const tileIndex = newRack.findIndex(t => t.id === placedTile.id);
                        if (tileIndex !== -1) {
                          newRack.splice(tileIndex, 1);
                        }
                      }
                      
                      return {
                        ...prev,
                        board: newBoard,
                        playerRack: newRack
                      };
                    });
                  }}
                  disabled={gameState.currentTurn !== 'player' || isLoading}
                  lastAiMove={lastAiMove}
                />
                
                <GameRack
                  tiles={gameState.playerRack}
                  onTilesChange={(newRack) => {
                    // Check if a new tile was added (rack grew)
                    if (newRack.length > gameState.playerRack.length) {
                      // Find the new tile(s)
                      const existingIds = new Set(gameState.playerRack.map(t => t.id));
                      const processedRack = newRack.map(tile => {
                        // If this is a new tile being added to the rack and it's a blank
                        if (!existingIds.has(tile.id) && tile.isBlank && tile.letter !== '?') {
                          // Reset blank to '?'
                          return { ...tile, letter: '?' };
                        }
                        return tile;
                      });
                      setGameState(prev => ({ ...prev, playerRack: processedRack }));
                    } else {
                      // Normal rack change (reordering, removing, etc.)
                      setGameState(prev => ({ ...prev, playerRack: newRack }));
                    }
                  }}
                  onTileFromBoardToRack={(row, col) => {
                    // Remove tile from board when dragged to rack
                    setGameState(prev => {
                      const newBoard = [...prev.board].map(r => [...r]);
                      newBoard[row][col] = null;
                      return { ...prev, board: newBoard };
                    });
                  }}
                  disabled={gameState.currentTurn !== 'player' || isLoading}
                />
              </div>
            </div>
            
            <div className="vsai-game-right">
              <div className="vsai-controls-container">
                <h3 className="vsai-section-heading">Actions</h3>
                <p>Place your tiles and submit your move, or choose another action.</p>
                
                <div className="vsai-controls">
                  <button 
                    className="vsai-btn vsai-submit-btn"
                    onClick={handleSubmitMove}
                    disabled={gameState.currentTurn !== 'player' || isLoading || tilesPlacedThisTurn.length === 0}
                  >
                    Submit Move
                  </button>
                  
                  <button 
                    className="vsai-btn vsai-reset-btn"
                    onClick={handleResetTurn}
                    disabled={gameState.currentTurn !== 'player' || isLoading || tilesPlacedThisTurn.length === 0}
                  >
                    Reset Turn
                  </button>
                  
                  <button 
                    className="vsai-btn vsai-exchange-btn"
                    onClick={() => setShowExchangeModal(true)}
                    disabled={
                      gameState.currentTurn !== 'player' || 
                      isLoading || 
                      gameState.tileBag.remaining < 7 ||
                      tilesPlacedThisTurn.length > 0
                    }
                  >
                    Exchange Tiles
                  </button>
                  
                  <button 
                    className="vsai-btn vsai-pass-btn"
                    onClick={() => handlePass('player')}
                    disabled={gameState.currentTurn !== 'player' || isLoading}
                  >
                    Pass Turn
                  </button>
                  
                  <button 
                    className="vsai-btn vsai-resign-btn"
                    onClick={() => setShowResignConfirm(true)}
                  >
                    Resign
                  </button>
                </div>
              </div>
              
              {tilesPlacedThisTurn.length > 0 && (
                <div className="vsai-placed-info">
                  <h4>Tiles Placed: {tilesPlacedThisTurn.length}</h4>
                  <p>Click Submit to confirm your move</p>
                </div>
              )}
              
              {isLoading && (
                <div className="vsai-ai-thinking">
                  <div className="vsai-spinner-container">
                    <div className="vsai-spinner"></div>
                    <p className="vsai-spinner-text">
                      {isValidating ? 'Validating move...' : 'AI is analysing the board...'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <BlankTileModal
          isOpen={showBlankModal}
          onClose={() => {
            setShowBlankModal(false);
            setBlankTilePosition(null);
          }}
          onSelectLetter={handleBlankTileSelect}
        />
        
        {showExchangeModal && (
          <TileExchangeModal
            tiles={gameState.playerRack}
            onExchange={handleExchange}
            onCancel={() => setShowExchangeModal(false)}
          />
        )}
        
        {showResignConfirm && (
          <div className="modal-overlay" onClick={() => setShowResignConfirm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Resign?</h3>
              <p>This will end the game and declare AI as the winner. This action cannot be undone.</p>
              <div className="modal-buttons">
                <button className="modal-btn cancel" onClick={() => setShowResignConfirm(false)}>
                  Cancel
                </button>
                <button 
                  className="modal-btn confirm" 
                  onClick={() => {
                    setShowResignConfirm(false);
                    setGameState(prev => ({ ...prev, gameOver: true }));
                    setResignedPlayer('player');
                    setShowGameOverModal(true);
                  }}
                >
                  Resign
                </button>
              </div>
            </div>
          </div>
        )}
        
        {showGameOverModal && (
          <GameOverModal
            playerScore={gameState.playerScore}
            aiScore={gameState.aiScore}
            winner={resignedPlayer ? (resignedPlayer === 'player' ? 'ai' : 'player') : (gameState.playerScore > gameState.aiScore ? 'player' : 'ai')}
            resigned={resignedPlayer !== null}
            onNewGame={startNewGame}
          />
        )}
      </div>
    </DndProvider>
  );
}