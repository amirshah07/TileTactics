import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Info } from 'lucide-react'; 
import './BoardAnalysis.css';
import Board from '../../components/Board/Board';
import Rack from '../../components/Rack/Rack';
import TileCounts from '../../components/TileCounts/TileCounts';
import { NoMoreTilesToastProvider } from '../../components/NoMoreTilesToast/NoMoreTilesToastContext';
import type { BoardState } from '../../utils/types';
import { analyzeBoard, type MoveResult } from '../../utils/wasmLoader';
import { LETTER_VALUES, LETTER_DISTRIBUTION } from '../../utils/constants';

export default function BoardAnalysis() {
  const initializeBoard = (): BoardState => {
    return Array(15).fill(null).map(() => Array(15).fill(null));
  };

  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [rackLetters, setRackLetters] = useState<string[]>([]);
  const [rackBlanks, setRackBlanks] = useState<boolean[]>([]);
  const [activeComponent, setActiveComponent] = useState<'board' | 'rack' | null>(null);
  const [selectedDictionary, setSelectedDictionary] = useState<string>('nwl2023');
  const boardRef = useRef<HTMLDivElement>(null);
  const [shouldClearFocus, setShouldClearFocus] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<MoveResult[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [hoveredMove, setHoveredMove] = useState<MoveResult | null>(null);
  
  // Tile counting calculation
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

  // Prevents unnecessary rerenders
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

  const handleMoveClick = useCallback((move: MoveResult) => {
    // Places the move on the board
    const newBoardState = [...(boardState || initializeBoard())];
    
    move.tilesPlaced.forEach(tp => {
      newBoardState[tp.position.row][tp.position.col] = {
        letter: tp.tile.letter,
        isBlank: tp.tile.isBlank
      };
    });
    
    setBoardState(newBoardState);
    
    // Updates rack - removes used tiles
    const usedTiles = move.tilesPlaced.map(tp => ({
      letter: tp.tile.letter,
      isBlank: tp.tile.isBlank
    }));
    
    const newRackLetters = [...rackLetters];
    const newRackBlanks = [...rackBlanks];
    
    // Removes used tiles from rack
    usedTiles.forEach(used => {
      let index = -1;
      
      if (used.isBlank) {
        // For blanks, finds any blank tile (empty letter with isBlank true)
        index = newRackLetters.findIndex((_, idx) => 
          newRackBlanks[idx] === true
        );
      } else {
        // For regular tiles, matches letter and ensures not a blank
        index = newRackLetters.findIndex((letter, idx) => 
          letter === used.letter && newRackBlanks[idx] === false
        );
      }
      
      if (index !== -1) {
        newRackLetters.splice(index, 1);
        newRackBlanks.splice(index, 1);
      }
    });
    
    setRackLetters(newRackLetters);
    setRackBlanks(newRackBlanks);
    
    // Clears analysis results after placing
    setAnalysisResults(null);
    setHoveredMove(null);
  }, [boardState, rackLetters, rackBlanks]);

  const handleAnalyseClick = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      // Converts board to WASM format
      const board = boardState || Array(15).fill(null).map(() => Array(15).fill(null));
      const boardForWasm = board.map(row => 
        row.map(cell => {
          if (!cell) return null;
          
          // Ensures letter exists and is not empty
          let letter = cell.letter?.toUpperCase() || '';
          
          // Handles edge cases for empty/invalid letters
          if (!letter || letter === '*') {
            // Skips blank tiles with no letter
            if (cell.isBlank) {
              return null;
            }
            // Non-blanks with invalid letters are errors
            return null;
          }
          
          return {
            letter: letter,
            value: cell.isBlank ? 0 : (LETTER_VALUES[letter] || 0),
            isBlank: cell.isBlank
          };
        })
      );
      
      // Converts rack to WASM format - handles blanks properly
      const rack = rackLetters
        .map((letter, idx) => {
          if (rackBlanks[idx]) {
            // Blank tiles in rack represented as '?'
            return {
              letter: '?',
              value: 0,
              isBlank: true
            };
          }
          
          const letterUpper = letter?.toUpperCase() || '';
          // Skips empty non-blank slots
          if (!letterUpper) return null;
          
          return {
            letter: letterUpper,
            value: LETTER_VALUES[letterUpper] || 0,
            isBlank: false
          };
        })
        .filter(tile => tile !== null);
      
      // Calculates remaining tiles
      const remainingTiles: Record<string, number> = {};
      Object.keys(LETTER_DISTRIBUTION).forEach(letter => {
        const key = letter === 'BLANK' ? '?' : letter;
        const used = letter === 'BLANK' ? blankCount : (usedTiles[letter] || 0);
        remainingTiles[key] = LETTER_DISTRIBUTION[letter as keyof typeof LETTER_DISTRIBUTION] - used;
      });
      
      const result = await analyzeBoard({
        board: boardForWasm,
        rack,
        remainingTiles,
        dictionary: selectedDictionary // Uses selected dictionary
      });
      
      setAnalysisResults(result.moves);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [boardState, rackLetters, rackBlanks, usedTiles, blankCount, selectedDictionary]);

  const handleDictionaryChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDictionary(event.target.value);
    // Clears analysis results when dictionary changes
    setAnalysisResults(null);
    setAnalysisError(null);
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
              <option value="nwl2023">NWL2023 (NASPA Word List)</option>
              <option value="csw24">CSW24 (Collins Scrabble Words)</option>
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
                hoveredMove={hoveredMove}
              />
            </div>
            <Rack 
              onRackChange={handleRackChange}
              usedTiles={usedTiles}
              blankCount={blankCount}
              isActive={activeComponent === 'rack'}
              onFocus={handleRackFocus}
              hoveredMove={hoveredMove}
              currentRackLetters={rackLetters}
              currentRackBlanks={rackBlanks}
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
          {analysisResults ? (
            <div className="analysis-results">
              {analysisResults.map((move, idx) => (
                <div 
                  key={idx} 
                  className="move-result"
                  onMouseEnter={() => setHoveredMove(move)}
                  onMouseLeave={() => setHoveredMove(null)}
                  onClick={() => handleMoveClick(move)}
                >
                  <div className="move-rank">
                    <span className="rank-number">{idx + 1}</span>
                    <div className="rank-indicator"></div>
                  </div>
                  <div className="move-details">
                    <span className="move-word">{move.word}</span>
                    <div className="move-score">
                      <span className="score-value">{move.score}</span>
                      <span className="score-label">pts</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>Enter your board state and rack letters, then click "Analyse Best Moves"</p>
          )}
          {analysisError && <p className="error-message">{analysisError}</p>}
          <div className="analyse-button-container">
            <button 
              className="analyse-button"
              onClick={handleAnalyseClick}
              disabled={!rackLetters.length || isAnalyzing}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyse Best Moves'}
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