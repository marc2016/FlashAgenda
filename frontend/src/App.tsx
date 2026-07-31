import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AgendaDetail from './pages/AgendaDetail';
import AdminPage from './pages/AdminPage';

// Instant synchronous userTransfer interceptor before app render
if (typeof window !== 'undefined') {
  try {
    const params = new URLSearchParams(window.location.search);
    const transferParam = params.get('userTransfer');
    if (transferParam) {
      const transferredUser = JSON.parse(decodeURIComponent(transferParam));
      if (transferredUser && (transferredUser.name || transferredUser.id)) {
        const claimedUser = { ...transferredUser, isRegistered: true };
        localStorage.setItem('flashagenda_last_user', JSON.stringify(claimedUser));
        
        const pathMatch = window.location.pathname.match(/\/agenda\/([^\/]+)/);
        if (pathMatch && pathMatch[1]) {
          localStorage.setItem(`flashagenda_${pathMatch[1]}_user`, JSON.stringify(claimedUser));
        }

        const url = new URL(window.location.href);
        url.searchParams.delete('userTransfer');
        window.history.replaceState({}, '', url.toString());
      }
    }
  } catch (err) {
    console.error('Failed instant userTransfer parsing:', err);
  }
}

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
