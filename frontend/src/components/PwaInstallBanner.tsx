import { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { usePwaInstall } from '../hooks/usePwaInstall';

export default function PwaInstallBanner() {
  const { isInstallable, isIos, isStandalone, triggerInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('flashagenda_pwa_banner_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('flashagenda_pwa_banner_dismissed', 'true');
  };

  // Do not render banner if already installed as PWA app or dismissed or on unsupported desktop
  if (isStandalone || dismissed || (!isInstallable && !isIos)) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-5 p-3 bg-comic-red border-top-3 border-black shadow-6 flex flex-column sm:flex-row align-items-center justify-content-between gap-3 animate-fadein">
      <div className="flex align-items-center gap-3">
        <div className="w-3rem h-3rem bg-yellow-400 border-2 border-black border-round-xl flex align-items-center justify-content-center flex-shrink-0 shadow-2">
          <i className="mdi mdi-flash text-black text-2xl"></i>
        </div>
        <div>
          <h4 className="m-0 text-white font-bold text-base comic-font">FlashAgenda als App nutzen</h4>
          <p className="m-0 text-xs text-yellow-300">
            {isIos ? (
              <>Tippe unten auf <strong>Teilen</strong> <i className="pi pi-share-alt"></i> und dann auf <strong>"Zum Home-Bildschirm"</strong> <i className="pi pi-plus-square"></i></>
            ) : (
              'Schnellerer Zugriff & Offline-Modus direkt auf deinem Home-Bildschirm!'
            )}
          </p>
        </div>
      </div>

      <div className="flex align-items-center gap-2 w-full sm:w-auto justify-content-end">
        {isInstallable && (
          <Button
            label="JETZT INSTALLIEREN"
            icon="pi pi-download"
            onClick={triggerInstall}
            className="comic-button p-button-sm font-bold bg-yellow-400 text-black border-black border-2"
          />
        )}
        <Button
          icon="pi pi-times"
          onClick={handleDismiss}
          className="p-button-rounded p-button-text p-button-plain text-white hover:bg-black-alpha-20"
          title="Schließen"
        />
      </div>
    </div>
  );
}
