import { useCallback, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { BOARD_LAYOUT, BOARD_SIZE } from '../../utils/constants';
import type { GameTile, Move } from '../../utils/gameTypes';
import type { MultiplierType } from '../../utils/types';
import './GameBoard.css';

const ItemTypes = {
  TILE: 'tile'
};

interface DragItem {
  tile: GameTile;
  source: 'board' | 'rack';
  sourcePosition?: { row: number; col: number };
  sourceIndex?: number;
}

interface GameBoardProps {
  boardState: (GameTile | null)[][];
  onTilePlaced: (row: number, col: number, tile: GameTile | null, sourcePosition?: { row: number; col: number }) => void;
  disabled: boolean;
  lastAiMove?: Move | null;
  turnStartBoard?: (GameTile | null)[][]; // Board state at start of turn
}

// Individual draggable tile component
const DraggableTile: React.FC<{
  tile: GameTile;
  row: number;
  col: number;
  canDrag: boolean;
  onDragStart?: () => void;
}> = ({ tile, row, col, canDrag, onDragStart }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TILE,
    item: (): DragItem => ({
      tile,
      source: 'board',
      sourcePosition: { row, col }
    }),
    canDrag,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    end: () => {
      if (onDragStart) onDragStart();
    }
  });

  drag(ref);

  return (
    <div
      ref={ref}
      className={`game-tile ${tile.isBlank ? 'blank-tile' : ''} ${canDrag ? 'draggable' : ''}`}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: canDrag ? 'move' : 'default',
        touchAction: 'none' 
      }}
    >
      <div className="game-letter-content">
        <span className="game-tile-letter">
          {tile.letter === '?' ? '' : tile.letter}
        </span>
        {tile.isBlank ? (
          <span className="game-tile-value">0</span>
        ) : (
          <span className="game-tile-value">{tile.value}</span>
        )}
      </div>
    </div>
  );
};

// Individual droppable board square component
const DroppableSquare: React.FC<{
  row: number;
  col: number;
  tile: GameTile | null;
  multiplier: MultiplierType;
  isAiMove: boolean;
  canDragTile: boolean;
  disabled: boolean;
  onDrop: (item: DragItem) => void;
  onDragTileStart?: () => void;
}> = ({ row, col, tile, multiplier, isAiMove, canDragTile, disabled, onDrop, onDragTileStart }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.TILE,
    canDrop: () => !disabled && !tile,
    drop: (item: DragItem) => {
      onDrop(item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  drop(ref);

  // Get multiplier class name
  const getMultiplierClass = (mult: MultiplierType): string => {
    switch (mult) {
      case 'TW': return 'triple-word';
      case 'DW': return 'double-word';
      case 'TL': return 'triple-letter';
      case 'DL': return 'double-letter';
      case 'STAR': return 'star';
      default: return '';
    }
  };

  // Get multiplier text
  const getMultiplierText = (mult: MultiplierType): string => {
    switch (mult) {
      case 'TW': return 'TRIPLE WORD';
      case 'DW': return 'DOUBLE WORD';
      case 'TL': return 'TRIPLE LETTER';
      case 'DL': return 'DOUBLE LETTER';
      case 'STAR': return '★';
      default: return '';
    }
  };

  const isDraggedOver = isOver && canDrop;

  return (
    <div
      ref={ref}
      className={`game-board-square ${getMultiplierClass(multiplier)} ${tile ? 'has-tile' : ''} ${isAiMove ? 'ai-move' : ''} ${isDraggedOver ? 'dragged-over' : ''}`}
      style={{
        touchAction: 'none' 
      }}
    >
      {tile ? (
        <DraggableTile
          tile={tile}
          row={row}
          col={col}
          canDrag={!disabled && canDragTile}
          onDragStart={onDragTileStart}
        />
      ) : (
        <span className="game-multiplier-text">{getMultiplierText(multiplier)}</span>
      )}
    </div>
  );
};

const GameBoard = ({ boardState, onTilePlaced, disabled, lastAiMove, turnStartBoard }: GameBoardProps) => {
  // Check if a tile can be dragged (only if placed this turn)
  const canDragTile = useCallback((row: number, col: number): boolean => {
    if (disabled) return false;
    
    // If no turnStartBoard provided, allow dragging (backwards compatibility)
    if (!turnStartBoard) return true;
    
    // Can only drag tiles that weren't there at the start of the turn
    return !turnStartBoard[row][col];
  }, [disabled, turnStartBoard]);

  // Handle drop on board square
  const handleDrop = useCallback((row: number, col: number, item: DragItem) => {
    if (disabled) return;
    
    // Check if square is empty
    if (boardState[row][col] !== null) {
      return;
    }
    
    // Place tile on board
    onTilePlaced(row, col, item.tile, item.sourcePosition);
  }, [boardState, onTilePlaced, disabled]);

  // Check if position is part of last AI move
  const isLastAiMoveTile = useCallback((row: number, col: number) => {
    if (!lastAiMove) return false;
    return lastAiMove.tiles.some(t => t.row === row && t.col === col);
  }, [lastAiMove]);

  // Get multiplier for position
  const getMultiplier = (row: number, col: number): MultiplierType => {
    return BOARD_LAYOUT[row][col];
  };

  return (
    <div className="game-board-container">
      <div className="game-column-labels">
        {Array(BOARD_SIZE).fill(null).map((_, index) => (
          <div key={`col-${index}`} className="game-column-label">
            {String.fromCharCode(65 + index)}
          </div>
        ))}
      </div>
      
      <div className="game-board-with-row-labels">
        <div className="game-row-labels">
          {Array(BOARD_SIZE).fill(null).map((_, index) => (
            <div key={`row-${index}`} className="game-row-label">
              {index + 1}
            </div>
          ))}
        </div>
        
        <div className="game-board">
          {boardState.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="game-board-row">
              {row.map((tile, colIndex) => {
                const multiplier = getMultiplier(rowIndex, colIndex);
                const isAiMove = isLastAiMoveTile(rowIndex, colIndex);
                
                return (
                  <DroppableSquare
                    key={`tile-${rowIndex}-${colIndex}`}
                    row={rowIndex}
                    col={colIndex}
                    tile={tile}
                    multiplier={multiplier}
                    isAiMove={isAiMove}
                    canDragTile={canDragTile(rowIndex, colIndex)}
                    disabled={disabled}
                    onDrop={(item) => handleDrop(rowIndex, colIndex, item)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;