import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { classNames } from 'primereact/utils';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'FlashAgenda';
  }, []);

  const handleStartAgenda = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agendas', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      if (!data?._id) {
        throw new Error('No agenda ID returned from server');
      }
      navigate(`/agenda/${data._id}`);
    } catch (error) {
      console.error('Failed to create agenda', error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-column align-items-center justify-content-center min-h-screen relative overflow-hidden bg-comic-red text-white">
      {/* Background glowing effects for comic feel */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
        <div className="absolute top-50 left-50 w-30rem h-30rem bg-yellow-400 border-circle filter-blur blur-8xl" style={{ transform: 'translate(-50%, -50%)', opacity: 0.4 }}></div>
      </div>

      <div className="z-1 text-center p-6 flex flex-column align-items-center">
        <div className="mb-6 css-logo-container">
          <i className="pi pi-bolt css-logo-bolt"></i>
          <h1 className="comic-font comic-text-shadow css-logo-text">FlashAgenda</h1>
        </div>

        <p className="text-white text-xl mb-6 max-w-sm line-height-3 font-bold" style={{ textShadow: '1px 1px 0 #000' }}>
          Schnell, einfach und ohne Account. Erstellen Sie Ihre Agenda in Sekundenbruchteilen.
        </p>

        <Button 
          label="AGENDA STARTEN!" 
          icon="pi pi-bolt font-bold" 
          size="large"
          loading={loading}
          onClick={handleStartAgenda}
          className={classNames(
            "text-2xl px-5 py-3",
            "bg-yellow-500 text-white comic-button"
          )}
        />
      </div>
    </div>
  );
}
