import { useState } from 'react';
import type { GameTile } from '../../utils/gameTypes';
import './TileExchangeModal.css';

interface TileExchangeModalProps {
  tiles: GameTile[];
  onExchange: (tilesToExchange: GameTile[]) => void;
  onCancel: () => void;
}

const TileExchangeModal = ({ tiles, onExchange, onCancel }: TileExchangeModalProps) => {
  const [selectedTiles, setSelectedTiles] = useState<Set<number>>(new Set());

  const toggleTileSelection = (tileId: number) => {
    const newSelection = new Set(selectedTiles);
    if (newSelection.has(tileId)) {
      newSelection.delete(tileId);
    } else {
      newSelection.add(tileId);
    }
    setSelectedTiles(newSelection);
  };

  const handleExchange = () => {
    const tilesToExchange = tiles.filter(tile => selectedTiles.has(tile.id));
    onExchange(tilesToExchange);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="exchange-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Exchange Tiles</h2>
        <p>Select tiles to exchange. This will end your turn.</p>
        
        <div className="exchange-tiles">
          {tiles.map(tile => (
            <div
              key={tile.id}
              className={`exchange-tile ${selectedTiles.has(tile.id) ? 'selected' : ''} ${tile.isBlank ? 'blank-tile' : ''}`}
              onClick={() => toggleTileSelection(tile.id)}
            >
              <span className="tile-letter">
                {tile.letter === '?' ? '' : tile.letter}
              </span>
              <span className="tile-value">
                {tile.isBlank ? 0 : tile.value}
              </span>
            </div>
          ))}
        </div>
        
        <div className="modal-buttons">
          <button 
            className="modal-btn cancel" 
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className="modal-btn confirm" 
            onClick={handleExchange}
            disabled={selectedTiles.size === 0}
          >
            Exchange {selectedTiles.size} {selectedTiles.size === 1 ? 'Tile' : 'Tiles'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TileExchangeModal;