import type { MultiplierType } from '../../utils/types';
import { LETTER_VALUES } from '../../utils/constants';
import './Tile.css';

interface TileProps {
  letter: string;
  multiplier: MultiplierType;
  position: { row: number; col: number };
  isSelected: boolean;
  isBlank: boolean;
  isPreview?: boolean;
  onClick: (row: number, col: number) => void;
}

const Tile = ({ letter, multiplier, position, isSelected, isBlank, isPreview = false, onClick }: TileProps) => {
  const { row, col } = position;
  
  const handleClick = () => {
    onClick(row, col);
  };

  const getMultiplierLabel = (type: MultiplierType): string => {
    switch (type) {
      case 'DL': return 'DOUBLE LETTER';
      case 'TL': return 'TRIPLE LETTER';
      case 'DW': return 'DOUBLE WORD';
      case 'TW': return 'TRIPLE WORD';
      case 'STAR': return '★';
      default: return '';
    }
  };

  // Build className string
  const classNames = [
    'tile',
    isSelected && 'selected',
    letter && 'has-letter',
    isBlank && 'is-blank',
    isPreview && 'preview'
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={classNames}
      data-multiplier={multiplier}
      onClick={handleClick}
    >
      {letter ? (
        <div className="letter-content">
          <span className="letter">{letter.toUpperCase()}</span>
          <span className="points">{isBlank ? 0 : LETTER_VALUES[letter.toUpperCase()]}</span>
        </div>
      ) : (
        <span className={`multiplier-label ${multiplier === 'STAR' ? 'star-label' : ''}`}>
          {getMultiplierLabel(multiplier)}
        </span>
      )}
    </div>
  );
};

export default Tile;