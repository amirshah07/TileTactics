import './Homepage.css';

export default function Homepage() {
  const navigateToAnalysis = () => {
    window.location.href = '/board-analysis';
  };
  
  const navigateToAI = () => {
    window.location.href = '/vs-ai';
  };
  
  const navigateToWordFinder = () => {
    window.location.href = '/word-finder';
  };

  return (
    <div className="homepage-container">
      <header className="homepage-header">
        <h1>TileTactics</h1>
      </header>

      <div className="homepage-content">

        <article className="homepage-section">
          <h2>Board Analysis: Find The Best Move</h2>
          
          <p>
            Explain this here
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
            Explain this here
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
            Explain this here
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