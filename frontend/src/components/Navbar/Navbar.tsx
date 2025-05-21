import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
          <Link to="/">
            <h1>TileTactics</h1>
          </Link>
        </div>
        
        <div className="navbar-center desktop-menu">
          <Link to="/boardanalysis">Board Analysis</Link>
          <Link to="/vsai">vs TileTacticsAI</Link>
          <Link to="/wordfinder">Word Finder</Link>
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
        <Link to="/boardnalysis" onClick={toggleMenu}>Board Analysis</Link>
        <Link to="/vsai" onClick={toggleMenu}>vs TileTacticsAI</Link>
        <Link to="/wordfinder" onClick={toggleMenu}>Word Finder</Link>
      </div>
    </div>
  );
}