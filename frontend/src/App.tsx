import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Homepage from './pages/Homepage/Homepage';
import BoardAnalysis from './pages/BoardAnalysis/BoardAnalysisContent';
import VsAI from './pages/vsAI/VsAI';
import WordFinder from './pages/WordFinder/WordFinder';
import BestMovesExplanation from './pages/BestMovesExplanation/BestMovesExplanation';
import PageNotFound from './pages/PageNotFound/PageNotFound';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Homepage/>} />
            <Route path="/board-analysis" element={<BoardAnalysis/>} />
            <Route path="/vs-ai" element={<VsAI/>} />
            <Route path="/word-finder" element={<WordFinder/>} />
            <Route path="/best-moves-explanation" element={<BestMovesExplanation/>} />
            <Route path="*" element={<PageNotFound/>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}