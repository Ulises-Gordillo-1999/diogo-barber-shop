'use client';

import { useEffect, useState } from 'react';
import { Smartphone, Download, CheckCircle2, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Registrar Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('Diogo PWA Service Worker activo'))
        .catch((err) => console.warn('Error registrando SW:', err));
    }

    // 2. Comprobar si ya está ejecutándose como aplicación standalone instalada
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(checkStandalone);

    // 3. Capturar evento de instalación nativo de Android / Chrome
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (isStandalone || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        'Para instalar Diogo Barber Shop en tu celular:\n1. Tocá el menú de tres puntos (⋮) de tu navegador.\n2. Seleccioná "Instalar aplicación" o "Agregar a pantalla principal".'
      );
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-md bg-zinc-900/95 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-2xl shadow-black/80 flex items-center justify-between gap-3 text-white transition-all animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Instalar App en tu Celular
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Accedé a Diogo Barber Shop directo desde tu pantalla de inicio, más rápido y sin navegador.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
        >
          {isInstalled ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />
              Instalada
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              Instalar
            </>
          )}
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
          title="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
