
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
                <a href="/boardnalysis">Analyse Board State</a>
                <a href="/vsai">vs TileTacticsAI</a>
            </div>

          </div>
    </div>
  );
}

