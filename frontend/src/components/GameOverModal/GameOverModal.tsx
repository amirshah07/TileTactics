import './GameOverModal.css';

interface GameOverModalProps {
  playerScore: number;
  aiScore: number;
  winner: 'player' | 'ai';
  resigned?: boolean;  // Optional prop for resignation
  onNewGame: () => void;
}

const GameOverModal = ({ playerScore, aiScore, winner, resigned, onNewGame }: GameOverModalProps) => {
  const getMessage = () => {
    if (resigned) {
      if (winner === 'player') {
        return "The AI resigned. You win!";
      } else {
        return "You resigned. Better luck next time!";
      }
    }
    
    if (winner === 'player') {
      return "Congratulations! You've defeated the AI!";
    } else if (playerScore === aiScore) {
      return "It's a tie! Well played!";
    } else {
      return "The AI wins this time. Try again!";
    }
  };

  return (
    <div className="modal-overlay">
      <div className="game-over-modal">
        <h2>Game Over</h2>
        
        <div className="final-scores">
          <div className={`final-score ${winner === 'player' ? 'winner' : ''}`}>
            <span className="player-label">You</span>
            <span className="score-value">{playerScore}</span>
          </div>
          
          <div className="vs-divider">vs</div>
          
          <div className={`final-score ${winner === 'ai' ? 'winner' : ''}`}>
            <span className="player-label">AI</span>
            <span className="score-value">{aiScore}</span>
          </div>
        </div>
        
        <p className="game-over-message">{getMessage()}</p>
        
        <button className="new-game-btn" onClick={onNewGame}>
          New Game
        </button>
      </div>
    </div>
  );
};

export default GameOverModal;