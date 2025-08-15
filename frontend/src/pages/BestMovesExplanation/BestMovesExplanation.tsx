import './BestMovesExplanation.css';

function BestMovesExplanation() {
  return (
    <div className="explanation-container">
      <h1>How are the best moves calculated?</h1>
      
      <div className="explanation-intro">
        <p>
          The analyser evaluates moves beyond just points, considering strategic factors that 
          adjust in importance throughout the game.
        </p>
      </div>

      <div className="evaluation-factors">
        <h2>Evaluation Factors</h2>
        
        <div className="factor-card">
          <h3>1. Score</h3>
          <p>
            The base points earned from the move, including letter values and board multipliers.
          </p>
        </div>

        <div className="factor-card">
          <h3>2. Leave Quality</h3>
          <p>
            Analyses tiles remaining on your rack after the move. Values blank tiles highly, 
            maintains vowel-consonant balance, rewards synergistic combinations (QU, ING, ER), 
            and penalises duplicate tiles.
          </p>
        </div>

        <div className="factor-card">
          <h3>3. Board Position</h3>
          <p>
            Evaluates strategic placement including centre control, access to premium squares, 
            and avoiding opening triple word scores for opponents.
          </p>
        </div>

        <div className="factor-card">
          <h3>4. Defence</h3>
          <p>
            Considers how the move limits opponent opportunities by blocking squares and 
            high-value scoring spots.
          </p>
        </div>

        <div className="factor-card">
          <h3>5. Volatility Management</h3>
          <p>
            Tracks high-value tiles played to reduce board volatility and prevent opponents 
            from using power tiles against you.
          </p>
        </div>
      </div>
    </div>
  );
}

export default BestMovesExplanation;