import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, BookOpen } from 'lucide-react';
import Rack from '../../components/Rack/Rack';
import { useNoMoreTilesToast } from '../../components/NoMoreTilesToast/useNoMoreTilesToast';
import './WordFinder.css';

interface WordsByLength {
  [key: number]: string[];
}

const WordFinderContent = () => {
  const [selectedDictionary, setSelectedDictionary] = useState('csw24');
  const [dictionaryWords, setDictionaryWords] = useState<Set<string>>(new Set());
  const [isLoadingDictionary, setIsLoadingDictionary] = useState(false);
  const [rackLetters, setRackLetters] = useState<string[]>([]);
  const [rackBlanks, setRackBlanks] = useState<boolean[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [foundWords, setFoundWords] = useState<WordsByLength>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [wordsWithBlanks, setWordsWithBlanks] = useState<Record<string, number[]>>({});
  const { showNoMoreTilesError } = useNoMoreTilesToast();

  // Calculate used tiles based on current rack
  const usedTiles = useMemo(() => {
    const counts: Record<string, number> = {};
    rackLetters.forEach((letter, index) => {
      if (letter && !rackBlanks[index]) {
        counts[letter] = (counts[letter] || 0) + 1;
      }
    });
    return counts;
  }, [rackLetters, rackBlanks]);

  // Calculate blank count
  const blankCount = useMemo(() => {
    return rackBlanks.filter(isBlank => isBlank).length;
  }, [rackBlanks]);

  // Load dictionary
  useEffect(() => {
    const loadDictionary = async () => {
      setIsLoadingDictionary(true);
      try {
        const filename = selectedDictionary === 'csw24' ? 'CSW24.txt' : 'NWL2023.txt';
        const response = await fetch(`/dictionaries/${filename}`);
        const text = await response.text();
        const words = text.split('\n')
          .map(word => word.trim().toUpperCase())
          .filter(word => word.length > 0);
        setDictionaryWords(new Set(words));
      } catch (error) {
        console.error('Failed to load dictionary:', error);
        showNoMoreTilesError('Failed to load dictionary');
      } finally {
        setIsLoadingDictionary(false);
      }
    };

    loadDictionary();
  }, [selectedDictionary, showNoMoreTilesError]);

  // Handle rack change
  const handleRackChange = useCallback((letters: string[], blanks: boolean[]) => {
    setRackLetters(letters);
    setRackBlanks(blanks);
    setHasSearched(false); // Reset search when rack changes
  }, []);

  // Generate all possible words from rack letters
  const findAllWords = useCallback(() => {
    if (rackLetters.length === 0 || dictionaryWords.size === 0) {
      return {};
    }

    setIsSearching(true);
    const wordsByLength: WordsByLength = {};
    const wordsWithBlanksTemp: Record<string, number[]> = {};

    // Collect actual letters and blank count
    const actualLetters: string[] = [];
    let blankCount = 0;
    
    rackLetters.forEach((letter, index) => {
      if (rackBlanks[index]) {
        blankCount++;
      } else if (letter) {
        actualLetters.push(letter);
      }
    });

    // Check if a word can be formed with given letters and blanks
    const canFormWord = (word: string, availableLetters: string[], blanksAvailable: number): { canForm: boolean; blankPositions: number[] } => {
      const letterCounts: Record<string, number> = {};
      availableLetters.forEach(letter => {
        letterCounts[letter] = (letterCounts[letter] || 0) + 1;
      });
      
      let blanksNeeded = 0;
      const blankPositions: number[] = [];
      
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        if (letterCounts[char] && letterCounts[char] > 0) {
          letterCounts[char]--;
        } else {
          blanksNeeded++;
          blankPositions.push(i);
          if (blanksNeeded > blanksAvailable) {
            return { canForm: false, blankPositions: [] };
          }
        }
      }
      
      return { canForm: true, blankPositions };
    };

    // Check all words in dictionary
    dictionaryWords.forEach(word => {
      if (word.length > 0 && word.length <= actualLetters.length + blankCount) {
        const result = canFormWord(word, actualLetters, blankCount);
        if (result.canForm) {
          const length = word.length;
          if (!wordsByLength[length]) {
            wordsByLength[length] = [];
          }
          wordsByLength[length].push(word);
          if (result.blankPositions.length > 0) {
            wordsWithBlanksTemp[word] = result.blankPositions;
          }
        }
      }
    });

    // Sort words within each length group
    Object.keys(wordsByLength).forEach(length => {
      wordsByLength[parseInt(length)].sort();
    });

    setWordsWithBlanks(wordsWithBlanksTemp);
    setIsSearching(false);
    return wordsByLength;
  }, [rackLetters, rackBlanks, dictionaryWords]);

  // Handle Find Words button click
  const handleFindWords = () => {
    const words = findAllWords();
    setFoundWords(words);
    setHasSearched(true);
  };

  // Calculate total word count
  const totalWordCount = useMemo(() => {
    return Object.values(foundWords).reduce((sum, words) => sum + words.length, 0);
  }, [foundWords]);

  return (
    <div className="word-finder-container">
      <div className="word-finder-left">
        <div className="dictionary-container">
          <h2 className="section-heading">Dictionary</h2>
          <div className="custom-select-wrapper">
            <select
              className="custom-select"
              value={selectedDictionary}
              onChange={(e) => setSelectedDictionary(e.target.value)}
              disabled={isLoadingDictionary}
            >
              <option value="csw24">CSW24 (Collins Scrabble Words)</option>
              <option value="nwl2023">NWL2023 (NASPA Word List)</option>
            </select>
            <div className="select-arrow"></div>
          </div>
        </div>

        <div className="how-to-play-container">
          <h2 className="section-heading">How to Play</h2>
          <ol className="how-to-play-list">
            <li>Choose your preferred dictionary for word validation</li>
            <li>Enter letters in the rack by typing</li>
            <li>Press "space" to add blank tiles</li>
            <li>Click "Find Words" to discover all valid words</li>
            <li>Results are grouped by word length</li>
            <li>Green letters indicate where blanks are used</li>
          </ol>
        </div>
      </div>

      <div className="word-finder-center">
        <div className="rack-section">
          <h1 className="page-title"><BookOpen className="title-icon" /> Word Finder</h1>
          <Rack
            onRackChange={handleRackChange}
            usedTiles={usedTiles}
            blankCount={blankCount}
            isActive={true}
            onFocus={() => {}}
            currentRackLetters={rackLetters}
            currentRackBlanks={rackBlanks}
          />
          <button 
            className="find-words-button"
            onClick={handleFindWords}
            disabled={rackLetters.length === 0 || isLoadingDictionary || isSearching}
          >
            {isSearching ? (
              <>
                <span className="spinner" />
                Searching...
              </>
            ) : (
              <>
                <Search className="button-icon" />
                Find Words
              </>
            )}
          </button>
        </div>

        {hasSearched && (
          <div className="results-section">
            <div className="results-header">
              <h3>Found Words</h3>
              {totalWordCount > 0 && (
                <span className="word-count">
                  {totalWordCount} {totalWordCount === 1 ? 'word' : 'words'} total
                </span>
              )}
            </div>
            
            {totalWordCount === 0 ? (
              <div className="no-words-found">
                <p>No valid words found with these tiles</p>
                <p className="hint">Try adding more tiles to find valid words</p>
              </div>
            ) : (
              <div className="words-by-length">
                {Object.keys(foundWords)
                  .sort((a, b) => parseInt(b) - parseInt(a))
                  .map(length => (
                    foundWords[parseInt(length)].length > 0 && (
                      <div key={length} className="length-group">
                        <div className="length-header">
                          <span className="length-label">{length} Letters</span>
                          <span className="length-count">
                            {foundWords[parseInt(length)].length} {foundWords[parseInt(length)].length === 1 ? 'word' : 'words'}
                          </span>
                        </div>
                        <div className="words-grid">
                          {foundWords[parseInt(length)].map(word => {
                            const blankPositions = wordsWithBlanks[word] || [];
                            return (
                              <div 
                                key={word} 
                                className={`word-tile ${blankPositions.length > 0 ? 'has-blanks' : ''}`}
                              >
                                {word.split('').map((letter, index) => (
                                  <span 
                                    key={index}
                                    className={blankPositions.includes(index) ? 'blank-letter' : ''}
                                  >
                                    {letter}
                                  </span>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WordFinderContent;