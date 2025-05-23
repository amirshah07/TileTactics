import { useState, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import './BlankTileModal.css';

interface BlankTileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLetter: (letter: string) => void;
}

const BlankTileModal = ({ isOpen, onClose, onSelectLetter }: BlankTileModalProps) => {
  const [selectedLetter, setSelectedLetter] = useState<string>('');
  
  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent | any) => {
      if (/^[a-z]$/i.test(e.key)) {
        const letter = e.key.toUpperCase();
        setSelectedLetter(letter);
      }
      else if (e.key === 'Enter' && selectedLetter) {
        handleConfirm();
      }
      else if (e.key === 'Escape') {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, selectedLetter]); 
  
  const handleLetterClick = (letter: string) => {
    setSelectedLetter(letter);
  };
  
  const handleConfirm = () => {
    if (selectedLetter) {
      onSelectLetter(selectedLetter);
      setSelectedLetter('');
      onClose();
    }
  };
  
  const handleCancel = () => {
    setSelectedLetter('');
    onClose();
  };
  
  if (!isOpen) return null;
  
  const alphabet = [
    ['A', 'B', 'C', 'D', 'E'],
    ['F', 'G', 'H', 'I', 'J'],
    ['K', 'L', 'M', 'N', 'O'],
    ['P', 'Q', 'R', 'S', 'T'],
    ['U', 'V', 'W', 'X', 'Y'],
    ['Z']
  ];
  
  return (
    <div className="blank-modal-overlay">
      <div className="blank-modal">
        <div className="blank-modal-header">
          <h3>Select Letter for Blank Tile</h3>
        </div>
        <div className="blank-modal-content">
          <p>Choose which letter this blank tile should represent:</p>
          <div className="letter-grid">
            {alphabet.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="letter-row">
                {row.map(letter => (
                  <button
                    key={letter}
                    className={`letter-button ${selectedLetter === letter ? 'selected' : ''}`}
                    onClick={() => handleLetterClick(letter)}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="blank-modal-footer">
          <button 
            className="cancel-button" 
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button 
            className="confirm-button" 
            onClick={handleConfirm}
            disabled={!selectedLetter}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlankTileModal;