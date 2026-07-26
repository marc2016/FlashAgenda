import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AgendaDetail from './pages/AgendaDetail';

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/agenda/:id" element={<AgendaDetail />} />
      </Routes>
    </div>
  );
}

export default App;
