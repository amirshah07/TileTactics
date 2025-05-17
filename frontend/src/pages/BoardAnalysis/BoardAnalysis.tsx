import './BoardAnalysis.css';

export default function BoardAnalysis() {
  return (
    <div className="board-analysis-container">

      <div className='board-analysis-container-left'>
        <h1>board goes here</h1>
      </div>

      <div className='board-analysis-container-right'>

        <div className='board-analysis-container-right-top'>
          <h1>solutions goes here</h1>
        </div>

        <div className='board-analysis-container-right-bottom'>
          <h1>tile counts goes here</h1>
        </div>        

      </div>
    
    </div>
  );
}