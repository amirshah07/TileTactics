import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Info } from 'lucide-react'; 
import './BoardAnalysis.css';
import Board from '../../components/Board/Board';
import Rack from '../../components/Rack/Rack';
import TileCounts from '../../components/TileCounts/TileCounts';
import { NoMoreTilesToastProvider } from '../../components/NoMoreTilesToast/NoMoreTilesToastContext';
import type { BoardState } from '../../utils/types';

export default function BoardAnalysis() {
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [rackLetters, setRackLetters] = useState<string[]>([]);
  const [rackBlanks, setRackBlanks] = useState<boolean[]>([]);
  const [activeComponent, setActiveComponent] = useState<'board' | 'rack' | null>(null);
  const [selectedDictionary, setSelectedDictionary] = useState<string>('csw24');
  const boardRef = useRef<HTMLDivElement>(null);
  const [shouldClearFocus, setShouldClearFocus] = useState(false);
  
  // Tile counting 
  const { usedTiles, blankCount } = useMemo(() => {
    const tiles: Record<string, number> = {};
    let blanks = 0;
    
    // Board tiles
    if (boardState) {
      boardState.forEach(row => {
        row.forEach(cell => {
          if (cell) {
            if (cell.isBlank) {
              blanks++;
            } else if (cell.letter) {
              const letter = cell.letter.toUpperCase();
              tiles[letter] = (tiles[letter] || 0) + 1;
            }
          }
        });
      });
    }
    
    // Rack tiles
    rackLetters.forEach((letter, index) => {
      if (rackBlanks[index]) {
        blanks++;
      } else {
        tiles[letter] = (tiles[letter] || 0) + 1;
      }
    });
    
    return { usedTiles: tiles, blankCount: blanks };
  }, [boardState, rackLetters, rackBlanks]);
  
  // Effect to handle clicks outside the board
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        activeComponent === 'board' && 
        boardRef.current && 
        !boardRef.current.contains(event.target as Node)
      ) {
        setShouldClearFocus(true);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeComponent]);
  
  // Wait 100ms for Board component to process the clear focus signal, then reset flag to prepare for next outside click
  useEffect(() => {
    if (shouldClearFocus) {
      const timer = setTimeout(() => {
        setShouldClearFocus(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldClearFocus]);
  
  const boardLetters = useMemo(() => {
    const letters: {letter: string, isBlank: boolean}[] = [];
    
    if (boardState) {
      boardState.forEach(row => {
        row.forEach(cell => {
          if (cell && cell.letter) {
            letters.push({
              letter: cell.letter,
              isBlank: cell.isBlank
            });
          }
        });
      });
    }
    
    return letters;
  }, [boardState]);
  
  const rackLetterObjects = useMemo(() => {
    return rackLetters.map((letter, index) => ({
      letter,
      isBlank: rackBlanks[index]
    }));
  }, [rackLetters, rackBlanks]);

  // Use useCallback to prevent unnecessary rerenders
  const handleRackChange = useCallback((letters: string[], blanks: boolean[]) => {
    setRackLetters(letters);
    setRackBlanks(blanks);
  }, []);

  const handleBoardChange = useCallback((newBoardState: BoardState) => {
    setBoardState(newBoardState);
  }, []);

  const handleBoardFocus = useCallback(() => {
    setActiveComponent('board');
  }, []);

  const handleRackFocus = useCallback(() => {
    setActiveComponent('rack');
  }, []);

  const handleAnalyseClick = useCallback(() => {
    console.log('Current board state:', boardState);
    console.log('Current rack letters:', rackLetters);
    console.log('Current dictionary:', selectedDictionary);
    console.log('Blank tiles in rack:', rackBlanks);
  }, [boardState, rackLetters, rackBlanks, selectedDictionary]);

  const handleDictionaryChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDictionary(event.target.value);
  }, []);

  return (
    <div className="board-analysis-container">
      <div className="board-analysis-left">
        <div className="dictionary-container">
          <h3 className="section-heading">Dictionary</h3>
          <div className="custom-select-wrapper">
            <select 
              className="custom-select" 
              value={selectedDictionary}
              onChange={handleDictionaryChange}
            >
              <option value="csw24">CSW24 (Collins Scrabble Words)</option>
              <option value="nwl2023">NWL2023 (NASPA Word List)</option>
            </select>
            <div className="select-arrow"></div>
          </div>
        </div>
        
        <div className="how-to-play-container">
          <h3 className="section-heading">How to Play</h3>
          <ol className="how-to-play-list">
            <li>Choose your preferred dictionary for word validation</li>
            <li>Set up the board by clicking on tiles and typing letters</li>
            <li>After typing, focus moves right. Hold "shift" to move down instead</li>
            <li>Press "space" for blank tiles and "backspace" to remove a tile</li>
            <li>Use arrow keys to navigate between tiles</li>
            <li>Click on rack tiles and type letters to fill your rack</li>
            <li>Click "Analyse Best Moves" to find optimal plays</li>
          </ol>
        </div>
      </div>

      <div className='board-analysis-center'>
        <NoMoreTilesToastProvider>
          <div className="board-rack-wrapper">
            <div ref={boardRef}>
              <Board 
                onBoardChange={handleBoardChange} 
                usedTiles={usedTiles}
                blankCount={blankCount}
                isActive={activeComponent === 'board'}
                onFocus={handleBoardFocus}
                clearFocus={shouldClearFocus}
              />
            </div>
            <Rack 
              onRackChange={handleRackChange}
              usedTiles={usedTiles}
              blankCount={blankCount}
              isActive={activeComponent === 'rack'}
              onFocus={handleRackFocus}
            />
          </div>
        </NoMoreTilesToastProvider>
      </div>

      <div className='board-analysis-right'>
        <div className='board-analysis-right-top'>
          <h3>
            Best Moves
            <a 
              href="/best-moves-explanation" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="info-icon-link"
              aria-label="Learn more about how best moves are calculated"
            >
              <Info className="info-icon" />
            </a>
          </h3>
          <p>Enter your board state and rack letters, then click "Analyse Best Moves"</p>
          <div className="analyse-button-container">
            <button 
              className="analyse-button"
              onClick={handleAnalyseClick}
              disabled={!rackLetters.length}
            >
              Analyse Best Moves
            </button>
          </div>
        </div>

        <div className='board-analysis-right-bottom'>
          <TileCounts
            boardLetters={boardLetters}
            rackLetters={rackLetterObjects}
          />
        </div>
      </div>
    </div>
  );
}