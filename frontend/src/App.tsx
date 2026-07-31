import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AgendaDetail from './pages/AgendaDetail';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/agenda/:id" element={<AgendaDetail />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </div>
  );
}

export default App;
