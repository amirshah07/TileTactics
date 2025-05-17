import { useState, useEffect } from 'react';
import "./Navbar.css";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleMenu = () => setIsOpen(!isOpen);
  
  useEffect(() => {
    const handleResize = () => {
      
      if (window.innerWidth > 1200) { // If window width is larger than breakpoint, close mobile menu
        setIsOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return (
    <div className="navbar">
      <div className="navbar-container">
        
        <div className="navbar-left">
          <a href="/">
            <h1>TileTactics</h1>
          </a>
        </div>
        
        <div className="navbar-center desktop-menu">
          <a href="/boardnalysis">Board Analysis</a>
          <a href="/vsai">vs TileTacticsAI</a>
          <a href="/wordfinder">Word Finder</a>
        </div>
        
        <div className="navbar-right">
          <div className="hamburger-menu" onClick={toggleMenu}>
            <div className={`hamburger-icon ${isOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
      
      <div className={`mobile-menu ${isOpen ? 'open' : ''}`}>
        <a href="/boardnalysis">Board Analysis</a>
        <a href="/vsai">vs TileTacticsAI</a>
        <a href="/wordfinder">Word Finder</a>
      </div>
    </div>
  );
}