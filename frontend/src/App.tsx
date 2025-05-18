import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Homepage from './pages/Homepage/Homepage';
import BoardAnalysis from './pages/BoardAnalysis/BoardAnalysis';
import VsAI from './pages/vsAI/VsAI';
import WordFinder from './pages/WordFinder/WordFinder';
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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}