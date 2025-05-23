import { LETTER_DISTRIBUTION, LETTER_VALUES } from '../../utils/constants';
import './TileCounts.css';

interface TileCountsProps {
  boardLetters: {letter: string, isBlank: boolean}[];
  rackLetters: {letter: string, isBlank: boolean}[];
}

const TileCounts = ({ boardLetters, rackLetters }: TileCountsProps) => {
  const calculateRemainingTiles = () => {
    const usedTiles: Record<string, number> = {};
    let blankCount = 0;
    
    [...boardLetters, ...rackLetters].forEach(tile => {
      if (tile.isBlank) {
        blankCount++;
      } else if (tile.letter) {
        const letter = tile.letter.toUpperCase();
        usedTiles[letter] = (usedTiles[letter] || 0) + 1;
      }
    });
    
    const remainingTiles: Record<string, number> = {};
    Object.keys(LETTER_DISTRIBUTION).forEach(letter => {
      if (letter === 'BLANK') {
        remainingTiles[letter] = (LETTER_DISTRIBUTION as Record<string, number>)[letter] - blankCount;
      } else {
        remainingTiles[letter] = (LETTER_DISTRIBUTION as Record<string, number>)[letter] - (usedTiles[letter] || 0);
      }
    });
    
    return remainingTiles;
  };
  
  const remainingTiles = calculateRemainingTiles();
  
  const letters = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 
    'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 
    'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
  ];
  
  const totalRemaining = Object.values(remainingTiles).reduce((sum, count) => sum + Math.max(0, count), 0);
  
  const renderTile = (letter: string, count: number, points: number, isBlank = false) => {
    const isDepleted = count === 0;
    
    return (
      <div key={isBlank ? 'BLANK' : letter} className="tile-wrapper">
        <div className={`compact-tile ${isDepleted ? 'depleted' : ''}`}>
          <div className="tile-top">
            <span className="tile-letter">{!isBlank ? letter : ''}</span>
            <span className="tile-points">{points}</span>
          </div>
          <div className="tile-count">{count}</div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="tile-counts-container">
      <div className="tile-counts-header">
        <div className="header-text">Remaining Tiles</div>
        <div className={`total-count ${totalRemaining === 0 ? 'depleted' : ''}`}>{totalRemaining}</div>
      </div>
      
      <div className="tile-grid">
        {letters.map(letter => renderTile(
          letter,
          remainingTiles[letter] || 0,
          LETTER_VALUES[letter] || 0
        ))}
        
        {renderTile('', remainingTiles['BLANK'] || 0, 0, true)}
      </div>
    </div>
  );
};

export default TileCounts;