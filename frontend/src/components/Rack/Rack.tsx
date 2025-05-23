import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { MAX_RACK_SIZE, LETTER_VALUES, LETTER_DISTRIBUTION } from '../../utils/constants';
import { useNoMoreTilesToast } from '../NoMoreTilesToast/useNoMoreTilesToast';
import './Rack.css';

interface RackProps {
  onRackChange: (letters: string[], blanks: boolean[]) => void;  
  usedTiles: Record<string, number>;
  blankCount: number;
  isActive: boolean;
  onFocus: () => void;
}

interface RackTile {
  letter: string;
  isBlank: boolean;
}

const Rack = ({ onRackChange, usedTiles, blankCount, isActive, onFocus }: RackProps) => {
  const [rackTiles, setRackTiles] = useState<RackTile[]>(
    Array(MAX_RACK_SIZE).fill(null).map(() => ({ letter: '', isBlank: false }))
  );
  const [focused, setFocused] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { showNoMoreTilesError } = useNoMoreTilesToast();

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]); 

  useEffect(() => {
    const letters = rackTiles
      .filter(tile => tile.letter !== '' || tile.isBlank)
      .map(tile => tile.letter);
    const blanks = rackTiles
      .filter(tile => tile.letter !== '' || tile.isBlank)
      .map(tile => tile.isBlank);
    onRackChange(letters, blanks); 
  }, [rackTiles, onRackChange]);

  useEffect(() => {
    if (!isActive) {
      setFocused(null);
    }
  }, [isActive]);

  const canAddLetter = useCallback((letter: string, isBlank: boolean): boolean => {
    if (isBlank) {
      return blankCount < (LETTER_DISTRIBUTION as Record<string, number>)['BLANK'];
    } else {
      return (usedTiles[letter] || 0) < (LETTER_DISTRIBUTION as Record<string, number>)[letter];
    }
  }, [blankCount, usedTiles]);

  // Move focus to next available tile
  const advanceToNextTile = useCallback((index: number) => {
    const nextEmptyIndex = rackTiles.findIndex(
      (tile, i) => i > index && tile.letter === '' && !tile.isBlank
    );
    
    if (nextEmptyIndex !== -1) {
      setFocused(nextEmptyIndex);
      setTimeout(() => {
        inputRefs.current[nextEmptyIndex]?.focus();
      }, 0);
    } else {
      // If no empty tiles, find the next tile (wrap around)
      const nextIndex = (index + 1) % MAX_RACK_SIZE;
      setFocused(nextIndex);
      setTimeout(() => {
        inputRefs.current[nextIndex]?.focus();
      }, 0);
    }
  }, [rackTiles]);

  const handleInputChange = useCallback((index: number, value: string) => {
    if (value === '') {
      const newRackTiles = [...rackTiles];
      newRackTiles[index] = { letter: '', isBlank: false };
      setRackTiles(newRackTiles);
    }
  }, [rackTiles]);

  const handleInputFocus = useCallback((index: number) => {
    onFocus();
    setFocused(index);
  }, [onFocus]);

  const handleBlankTileClick = useCallback((index: number) => {
    if (rackTiles[index].isBlank) {
      const newRackTiles = [...rackTiles];
      newRackTiles[index] = { letter: '', isBlank: false };
      setRackTiles(newRackTiles);
    }
  }, [rackTiles]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    // Check for letter keys
    if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault(); 
      
      const letter = e.key.toUpperCase();
      const currentTile = rackTiles[index];
      
      if (currentTile.letter === letter && !currentTile.isBlank) {
        advanceToNextTile(index);
        return;
      }
      
      // Check availability of tile
      const canPlace = (() => {
        const currentCount = usedTiles[letter] || 0;
        const maxAllowed = (LETTER_DISTRIBUTION as Record<string, number>)[letter];
        
        if (currentTile.letter !== '' && !currentTile.isBlank && currentTile.letter !== letter) {
          return currentCount < maxAllowed;
        }
        
        return currentCount < maxAllowed;
      })();
      
      if (canPlace) {
        const newRackTiles = [...rackTiles];
        newRackTiles[index] = { letter, isBlank: false };
        setRackTiles(newRackTiles);
        advanceToNextTile(index);
      } else {
        showNoMoreTilesError(`No more '${letter}' tiles available!`);
      }
      return;
    }
    
    // Backspace handling
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      
      const newRackTiles = [...rackTiles];
      newRackTiles[index] = { letter: '', isBlank: false };
      setRackTiles(newRackTiles);
      
      if (index > 0) {
        const prevIndex = index - 1;
        setFocused(prevIndex);
        setTimeout(() => {
          inputRefs.current[prevIndex]?.focus();
        }, 0);
      }
      return;
    }

    // Space handling for blank tiles
    if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault();

      if (canAddLetter('', true)) {
        const newRackTiles = [...rackTiles];
        newRackTiles[index] = { letter: '', isBlank: true };
        setRackTiles(newRackTiles);
        
        advanceToNextTile(index);
      } else {
        showNoMoreTilesError('No more blank tiles available!');
      }
      return;
    }

    // Tab key handling
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      advanceToNextTile(index);
      return;
    }

    // Left arrow key handling
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = index - 1 >= 0 ? index - 1 : MAX_RACK_SIZE - 1;
      setFocused(prevIndex);
      setTimeout(() => {
        inputRefs.current[prevIndex]?.focus();
      }, 0);
      return;
    }

    // Right arrow key handling
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = index + 1 < MAX_RACK_SIZE ? index + 1 : 0;
      setFocused(nextIndex);
      setTimeout(() => {
        inputRefs.current[nextIndex]?.focus();
      }, 0);
      return;
    }
  }, [rackTiles, canAddLetter, advanceToNextTile, showNoMoreTilesError]);

  useEffect(() => {
    if (isActive && focused !== null) {
      const inputElement = document.getElementById(`rack-tile-${focused}`);
      if (inputElement) {
        inputElement.focus();
      }
    }
  }, [focused, isActive]);

  const clearRack = useCallback(() => {
    setRackTiles(Array(MAX_RACK_SIZE).fill(null).map(() => ({ letter: '', isBlank: false })));
    setFocused(0);
    setShowClearConfirm(false);
  }, []);

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  return (
    <div className={`rack-container ${focused !== null ? 'has-selection' : ''}`} onClick={onFocus}>
      <div className="rack-wrapper">
        <div className="rack">
          {Array(MAX_RACK_SIZE).fill(null).map((_, index) => {
            const tile = rackTiles[index] || { letter: '', isBlank: false };
            return (
              <div 
                key={`rack-${index}`} 
                className={`rack-tile ${(tile.letter !== '' || tile.isBlank) ? 'has-letter' : ''} ${tile.isBlank ? 'is-blank' : ''} ${focused === index ? 'selected' : ''}`}
                onClick={() => tile.isBlank && handleBlankTileClick(index)}
              >
                <input
                  id={`rack-tile-${index}`}
                  ref={el => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={tile.isBlank ? '' : tile.letter}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onFocus={() => handleInputFocus(index)}
                  onBlur={() => setFocused(null)}
                />
                {(tile.letter !== '' || tile.isBlank) && (
                  <span className="points">{tile.isBlank ? 0 : LETTER_VALUES[tile.letter]}</span>
                )}
              </div>
            );
          })}
        </div>
        <button 
          className="clear-rack-button" 
          onClick={handleClearClick}
          title="Clear Rack"
        >
          <Trash2 />
        </button>
      </div>
      
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Clear Rack?</h3>
            <p>This will remove all letters from your tile rack. This action cannot be undone.</p>
            <div className="modal-buttons">
              <button className="modal-btn cancel" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
              <button className="modal-btn confirm" onClick={clearRack}>
                Clear Rack
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rack;