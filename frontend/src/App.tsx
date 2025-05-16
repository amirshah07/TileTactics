import Homepage from "./pages/Homepage"
import Navbar from "./components/Navbar"
import "./App.css"

export default function App() {
  return (
    <div className="app-container">
      <Navbar/>
      <main>
        <Homepage/>
      </main>
    </div>
  )
}

