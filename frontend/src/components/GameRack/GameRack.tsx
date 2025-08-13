import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { GameTile } from '../../utils/gameTypes';
import './GameRack.css';

// Define drag item types
const ItemTypes = {
  TILE: 'tile'
};

// Define drag item interface
interface DragItem {
  tile: GameTile;
  source: 'board' | 'rack';
  sourcePosition?: { row: number; col: number };
  sourceIndex?: number;
}

interface GameRackProps {
  tiles: GameTile[];
  onTilesChange: (tiles: GameTile[]) => void;
  disabled: boolean;
  onTileFromBoardToRack?: (sourceRow: number, sourceCol: number) => void;
}

// Individual draggable rack tile component
const DraggableRackTile: React.FC<{
  tile: GameTile;
  index: number;
  disabled: boolean;
}> = ({ tile, index, disabled }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TILE,
    item: (): DragItem => ({
      tile,
      source: 'rack',
      sourceIndex: index
    }),
    canDrag: !disabled,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  drag(ref);

  return (
    <div
      ref={ref}
      className={`game-rack-tile ${tile.isBlank ? 'blank-tile' : ''} ${!disabled ? 'draggable' : ''}`}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: !disabled ? 'move' : 'default',
        touchAction: 'none' 
      }}
    >
      <div className="game-rack-letter-content">
        <span className="tile-letter">
          {tile.letter === '?' ? '' : tile.letter}
        </span>
        {tile.isBlank ? (
          <span className="tile-value">0</span>
        ) : (
          <span className="tile-value">{tile.value}</span>
        )}
      </div>
    </div>
  );
};

// Individual droppable rack slot component
const DroppableRackSlot: React.FC<{
  tile: GameTile | null;
  index: number;
  disabled: boolean;
  onDrop: (item: DragItem, targetIndex: number) => void;
}> = ({ tile, index, disabled, onDrop }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.TILE,
    canDrop: () => !disabled,
    drop: (item: DragItem) => {
      onDrop(item, index);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  drop(ref);

  return (
    <div
      ref={ref}
      className={`game-rack-slot ${tile ? 'has-tile' : 'empty'} ${isOver ? 'dragged-over' : ''}`}
      style={{
        touchAction: 'none' 
      }}
    >
      {tile && (
        <DraggableRackTile
          tile={tile}
          index={index}
          disabled={disabled}
        />
      )}
    </div>
  );
};

// Main rack container that can also accept drops
const RackContainer: React.FC<{
  children: React.ReactNode;
  disabled: boolean;
  onDropToEnd: (item: DragItem) => void;
}> = ({ children, disabled, onDropToEnd }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [, drop] = useDrop({
    accept: ItemTypes.TILE,
    canDrop: (item: DragItem) => !disabled && item.source === 'board',
    drop: (item: DragItem, monitor) => {
      // Only handle if not dropped on a specific slot
      const didDropOnSlot = monitor.didDrop();
      if (!didDropOnSlot) {
        onDropToEnd(item);
      }
    }
  });

  drop(ref);

  return (
    <div 
      ref={ref}
      className="game-rack-container"
      style={{
        touchAction: 'none' 
      }}
    >
      <div className="game-rack">
        {children}
      </div>
    </div>
  );
};

const GameRack = ({ tiles, onTilesChange, disabled, onTileFromBoardToRack }: GameRackProps) => {
  // Handle drop on rack slot
  const handleDrop = (item: DragItem, targetIndex: number) => {
    if (disabled) return;
    
    if (item.source === 'rack' && item.sourceIndex !== undefined) {
      // Reordering within rack
      const newTiles = [...tiles];
      const [movedTile] = newTiles.splice(item.sourceIndex, 1);
      
      // Insert at new position
      if (targetIndex > item.sourceIndex) {
        newTiles.splice(targetIndex - 1, 0, movedTile);
      } else {
        newTiles.splice(targetIndex, 0, movedTile);
      }
      
      onTilesChange(newTiles);
    } else if (item.source === 'board') {
      // Tile returning from board to rack - insert at specific position
      const newTiles = [...tiles];
      
      // Reset blank to '?' if needed
      const tileToAdd = { ...item.tile };
      if (tileToAdd.isBlank && tileToAdd.letter !== '?') {
        tileToAdd.letter = '?';
      }
      
      // Insert at the target position
      if (targetIndex <= newTiles.length) {
        newTiles.splice(targetIndex, 0, tileToAdd);
      } else {
        newTiles.push(tileToAdd);
      }
      
      onTilesChange(newTiles);
      
      // Remove tile from board
      if (onTileFromBoardToRack && item.sourcePosition) {
        onTileFromBoardToRack(item.sourcePosition.row, item.sourcePosition.col);
      }
    }
  };

  // Handle drop on empty rack area (add to end)
  const handleDropToEnd = (item: DragItem) => {
    if (disabled || tiles.length >= 7) return;
    
    if (item.source === 'board') {
      // Reset blank to '?' if needed
      const tileToAdd = { ...item.tile };
      if (tileToAdd.isBlank && tileToAdd.letter !== '?') {
        tileToAdd.letter = '?';
      }
      
      // Add tile from board to end of rack
      const newTiles = [...tiles, tileToAdd];
      onTilesChange(newTiles);
      
      // Remove tile from board
      if (onTileFromBoardToRack && item.sourcePosition) {
        onTileFromBoardToRack(item.sourcePosition.row, item.sourcePosition.col);
      }
    }
  };

  // Fill rack to 7 slots for display
  const displaySlots = Array(7).fill(null).map((_, index) => tiles[index] || null);

  return (
    <RackContainer disabled={disabled} onDropToEnd={handleDropToEnd}>
      {displaySlots.map((tile, index) => (
        <DroppableRackSlot
          key={`rack-slot-${index}`}
          tile={tile}
          index={index}
          disabled={disabled}
          onDrop={handleDrop}
        />
      ))}
    </RackContainer>
  );
};

export default GameRack;