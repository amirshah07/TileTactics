import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Homepage from './pages/Homepage';
import BoardAnalysis from './pages/BoardAnalysis';
import VsAI from './pages/VsAI';
import WordFinder from './pages/WordFinder';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Homepage/>} />
            <Route path="/boardnalysis" element={<BoardAnalysis/>} />
            <Route path="/vsai" element={<VsAI/>} />
            <Route path="/wordfinder" element={<WordFinder/>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}