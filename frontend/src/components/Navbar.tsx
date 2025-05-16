import "./Navbar.css"

export default function Navbar() {
  return (
    <div className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <a href="/">
            <h1>TileTactics</h1>
          </a>
        </div>
        
        <div className="navbar-center">
          <a href="/boardnalysis">Board Analysis</a>
          <a href="/vsai">vs TileTacticsAI</a>
          <a href="/wordfinder">Word Finder</a>
        </div>
        
        <div className="navbar-right">
          {/* Empty for balance */}
        </div>
      </div>
    </div>
  );
}

