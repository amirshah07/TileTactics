import { useState, useEffect, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import Tile from '../Tile/Tile';
import BlankTileModal from '../BlankTileModal/BlankTileModal';
import { BOARD_LAYOUT, BOARD_SIZE, LETTER_DISTRIBUTION } from '../../utils/constants';
import { useNoMoreTilesToast } from '../NoMoreTilesToast/useNoMoreTilesToast';
import type { BoardState, BoardPosition, MultiplierType } from '../../utils/types';
import type { MoveResult } from '../../utils/wasmLoader';
import './Board.css';

interface BoardProps {
  onBoardChange: (boardState: BoardState) => void; 
  usedTiles: Record<string, number>;
  blankCount: number;
  isActive: boolean;
  onFocus: () => void;
  clearFocus?: boolean;
  hoveredMove?: MoveResult | null;
}

const Board = ({ onBoardChange, usedTiles, blankCount, isActive, onFocus, clearFocus = false, hoveredMove }: BoardProps) => {
  // Initialises empty board
  const initializeBoard = (): BoardState => {
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  };

  const [boardState, setBoardState] = useState<BoardState>(initializeBoard());
  const [selectedPosition, setSelectedPosition] = useState<BoardPosition | null>(null);
  const [isBlankModalOpen, setIsBlankModalOpen] = useState(false);
  const [isShiftPressedForBlank, setIsShiftPressedForBlank] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { showNoMoreTilesError } = useNoMoreTilesToast();

  // Calculates preview positions from hovered move
  const previewPositions = useMemo(() => {
    if (!hoveredMove) return [];
    
    // The tilesPlaced array only contains NEW tiles being placed
    const positions = hoveredMove.tilesPlaced.map(tp => {
      const position = {
        row: tp.position.row,
        col: tp.position.col,
        letter: tp.tile.letter || '',  // Keep the letter as-is from WASM
        isBlank: tp.tile.isBlank
      };
      
      return position;
    });
    
    return positions;
  }, [hoveredMove]);

  // Handles click on board square
  const handleTileClick = (row: number, col: number) => {
    onFocus();
    setSelectedPosition({ row, col });
  };

  // Notifies parent component when board changes
  useEffect(() => {
    onBoardChange(boardState); 
  }, [boardState, onBoardChange]);

  // Clears selection when focus is lost
  useEffect(() => {
    if (!isActive) {
      setSelectedPosition(null);
    }
  }, [isActive]);
  
  // Clears selection when clearFocus is true
  useEffect(() => {
    if (clearFocus && selectedPosition) {
      setSelectedPosition(null);
    }
  }, [clearFocus, selectedPosition]);

  // Checks if adding letter would exceed tile limits
  const canAddLetter = (letter: string, isBlank: boolean): boolean => {
    if (isBlank) {
      return blankCount < (LETTER_DISTRIBUTION as Record<string, number>)['BLANK'];
    } else {
      return (usedTiles[letter] || 0) < (LETTER_DISTRIBUTION as Record<string, number>)[letter];
    }
  };

  // Helper function to move position in specific direction
  const movePosition = (position: BoardPosition, direction: 'right' | 'left' | 'up' | 'down'): BoardPosition => {
    const { row, col } = position;
    
    switch (direction) {
      case 'right':
        return { row, col: Math.min(BOARD_SIZE - 1, col + 1) };
      case 'left':
        return { row, col: Math.max(0, col - 1) };
      case 'up':
        return { row: Math.max(0, row - 1), col };
      case 'down':
        return { row: Math.min(BOARD_SIZE - 1, row + 1), col };
      default:
        return position;
    }
  };

  // Handles keyboard input when square is selected
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || !selectedPosition || isBlankModalOpen) return;

      const { row, col } = selectedPosition;
      const key = e.key.toUpperCase();
      const isShiftPressed = e.shiftKey;

      // Handles letter input
      if (/^[A-Z]$/.test(key)) {
        if (canAddLetter(key, false)) {
          const newBoardState = [...boardState];
          newBoardState[row][col] = { letter: key, isBlank: false };
          setBoardState(newBoardState);          
          const direction = isShiftPressed ? 'down' : 'right';
          setSelectedPosition(movePosition(selectedPosition, direction));
        } else {
          showNoMoreTilesError(`No more '${key}' tiles available!`);
        }
      }
      
      // Handles space for blank tiles
      else if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        if (canAddLetter('', true)) {
          setIsShiftPressedForBlank(isShiftPressed);
          setIsBlankModalOpen(true);
        } else {
          showNoMoreTilesError('No more blank tiles available!');
        }
      }
      
      // Handles backspace
      else if (e.key === 'Backspace' || e.key === 'Delete') {
        const newBoardState = [...boardState];
        newBoardState[row][col] = null;
        setBoardState(newBoardState);        
        const direction = isShiftPressed ? 'up' : 'left';
        setSelectedPosition(movePosition(selectedPosition, direction));
      }
      
      // Handles arrow keys for manual navigation 
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault(); 
        let direction: 'up' | 'down' | 'left' | 'right';
        
        switch (e.key) {
          case 'ArrowUp':
            direction = 'up';
            break;
          case 'ArrowDown':
            direction = 'down';
            break;
          case 'ArrowLeft':
            direction = 'left';
            break;
          case 'ArrowRight':
            direction = 'right';
            break;
          default:
            return;
        }
        
        setSelectedPosition(movePosition(selectedPosition, direction));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPosition, boardState, usedTiles, blankCount, isActive, isBlankModalOpen, showNoMoreTilesError]);

  // Handles blank tile selection
  const handleBlankTileSelection = (letter: string) => {
    if (selectedPosition) {
      const { row, col } = selectedPosition;
      const newBoardState = [...boardState];
      newBoardState[row][col] = { letter, isBlank: true };
      setBoardState(newBoardState);      
      const direction = isShiftPressedForBlank ? 'down' : 'right';
      setSelectedPosition(movePosition(selectedPosition, direction));
    }
    
    setIsBlankModalOpen(false);
  };

  const clearBoard = () => {
    setBoardState(initializeBoard());
    setSelectedPosition(null);
    setShowClearConfirm(false);
  };

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  // Checks if position has preview tile
  const getPreviewTile = (row: number, col: number) => {
    // Only show preview for positions where new tiles are being placed
    const previewTile = previewPositions.find(p => p.row === row && p.col === col);
    return previewTile;
  };

  return (
    <div className="board-wrapper" onClick={onFocus}>
      <div className="board-container">
        <button 
          className="clear-board-button" 
          onClick={handleClearClick}
          title="Clear Board"
        >
          <Trash2 size={16} />
        </button>
        
        <div className="column-labels">
          {Array(BOARD_SIZE).fill(null).map((_, index) => (
            <div key={`col-${index}`} className="column-label">{String.fromCharCode(65 + index)}</div>
          ))}
        </div>
        
        <div className="board-with-row-labels">
          <div className="row-labels">
            {Array(BOARD_SIZE).fill(null).map((_, index) => (
              <div key={`row-${index}`} className="row-label">{index + 1}</div>
            ))}
          </div>
          
          <div className="board">
            {boardState.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="board-row">
                {row.map((squareContent, colIndex) => {
                  const multiplier: MultiplierType = BOARD_LAYOUT[rowIndex][colIndex];
                  const isSelected = isActive && selectedPosition?.row === rowIndex && selectedPosition?.col === colIndex;
                  const previewTile = getPreviewTile(rowIndex, colIndex);
                  
                  // Only show preview if there's no existing tile at this position
                  const isPreview = !squareContent && !!previewTile;
                  const displayLetter = squareContent?.letter || previewTile?.letter || '';
                  const displayIsBlank = squareContent?.isBlank || (previewTile?.isBlank || false);
                  
                  return (
                    <Tile
                      key={`tile-${rowIndex}-${colIndex}`}
                      letter={displayLetter}
                      multiplier={multiplier}
                      position={{ row: rowIndex, col: colIndex }}
                      isSelected={isSelected}
                      isBlank={displayIsBlank}
                      isPreview={isPreview}
                      onClick={handleTileClick}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Clear Board?</h3>
            <p>This will remove all letters from the board. This action cannot be undone.</p>
            <div className="modal-buttons">
              <button className="modal-btn cancel" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
              <button className="modal-btn confirm" onClick={clearBoard}>
                Clear Board
              </button>
            </div>
          </div>
        </div>
      )}
      
      <BlankTileModal 
        isOpen={isBlankModalOpen}
        onClose={() => setIsBlankModalOpen(false)}
        onSelectLetter={handleBlankTileSelection}
      />
    </div>
  );
};

export default Board;