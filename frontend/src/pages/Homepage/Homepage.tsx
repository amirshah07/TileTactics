import { useNavigate } from 'react-router-dom';
import './Homepage.css';

export default function Homepage() {
  const navigate = useNavigate();
  
  const navigateToAnalysis = () => {
    navigate('/board-analysis');
  };
  
  const navigateToAI = () => {
    navigate('/vs-ai');
  };
  
  const navigateToWordFinder = () => {
    navigate('/word-finder');
  };

  return (
    <div className="homepage-container">
      <div className="homepage-content">

        <article className="homepage-section">
          <h2>Board Analysis: Find The Best Move</h2>
          
          <p>
            Enter your game position and rack tiles to discover strategically optimal plays. 
            The analyser evaluates moves based on score, leave quality, board position, defense, and game stage.
          </p>
          
          <div className="article-button">
            <button onClick={navigateToAnalysis} className="navigate-to">
              Analyse Board →
            </button>
          </div>
        </article>

        <article className="homepage-section">
          <h2>vs TileTacticsAI: The Ultimate Challenge</h2>
          
          <p>
            Play a complete game against an extremely strong AI opponent. 
            Features include tile exchanges, passing, and all standard game rules.
          </p>
          
          <div className="article-button">
            <button onClick={navigateToAI} className="navigate-to">
              Play vs AI →
            </button>
          </div>
        </article>

        <article className="homepage-section">
          <h2>Word Finder: Discover All Possibilities</h2>
          
          <p>
            Enter your tiles to find every possible valid word. 
            Results organised by length, with blank tile positions clearly marked.
          </p>
          
          <div className="article-button">
            <button onClick={navigateToWordFinder} className="navigate-to">
              Find Words →
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}