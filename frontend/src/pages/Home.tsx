import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { classNames } from 'primereact/utils';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStartAgenda = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agendas', {
        method: 'POST',
      });
      const data = await response.json();
      navigate(`/agenda/${data._id}`);
    } catch (error) {
      console.error('Failed to create agenda', error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-column align-items-center justify-content-center min-h-screen relative overflow-hidden bg-gray-900 text-white">
      {/* Background glowing effects */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-50 left-50 w-30rem h-30rem bg-yellow-500 border-circle filter-blur blur-8xl" style={{ transform: 'translate(-50%, -50%)', opacity: 0.15 }}></div>
      </div>

      <div className="z-1 text-center glass-panel p-6 border-round-2xl shadow-8 flex flex-column align-items-center">
        <div className="flex align-items-center justify-content-center mb-4">
          <i className="pi pi-bolt text-yellow-400 text-6xl mr-3 pulse-animation"></i>
          <h1 className="text-5xl font-bold m-0 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600" style={{ letterSpacing: '-1px' }}>
            FlashAgenda
          </h1>
        </div>
        
        <p className="text-gray-300 text-xl mb-6 max-w-sm line-height-3">
          Schnell, einfach und ohne Account. Erstellen Sie Ihre Agenda in Sekundenbruchteilen.
        </p>

        <Button 
          label="Agenda starten" 
          icon="pi pi-bolt" 
          size="large"
          loading={loading}
          onClick={handleStartAgenda}
          className={classNames(
            "p-button-rounded font-bold text-xl px-5 py-3 shadow-6",
            "bg-yellow-500 border-none text-gray-900 hover:bg-yellow-400 transition-colors transition-duration-300"
          )}
        />
      </div>
    </div>
  );
}
