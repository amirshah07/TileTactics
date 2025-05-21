import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Homepage from './pages/Homepage/Homepage';
import BoardAnalysis from './pages/BoardAnalysis/BoardAnalysisContent';
import VsAI from './pages/vsAI/VsAI';
import WordFinder from './pages/WordFinder/WordFinder';
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
            <Route path="/boardanalysis" element={<BoardAnalysis/>} />
            <Route path="/vsai" element={<VsAI/>} />
            <Route path="/wordfinder" element={<WordFinder/>} />
            <Route path="*" element={<PageNotFound/>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}