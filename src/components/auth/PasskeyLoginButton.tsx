'use client';

import { useEffect, useState, useRef } from 'react';
import 'webauthn-polyfills';
import { Fingerprint, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function PasskeyLoginButton() {
  const router = useRouter();
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function checkSupport() {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        setIsSupported(false);
        return;
      }

      try {
        // Verificar si el dispositivo soporta biometría local (plataforma)
        const available =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsSupported(available);

        // Si soporta Conditional UI (autofill de huella en inputs), inicializarlo
        if (
          available &&
          typeof (PublicKeyCredential as any).getClientCapabilities === 'function'
        ) {
          const caps = await (PublicKeyCredential as any).getClientCapabilities();
          if (caps.conditionalGet) {
            initConditionalAutofill();
          }
        }
      } catch {
        setIsSupported(false);
      }
    }

    checkSupport();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  async function initConditionalAutofill() {
    try {
      abortControllerRef.current = new AbortController();
      const res = await fetch('/api/auth/passkey/login-options');
      if (!res.ok) return;
      const optionsJSON = await res.json();

      const publicKey = (PublicKeyCredential as any).parseRequestOptionsFromJSON(
        optionsJSON
      );

      const credential = (await navigator.credentials.get({
        publicKey,
        signal: abortControllerRef.current.signal,
        mediation: 'conditional' as any,
      })) as any;

      if (credential) {
        await verifyAndLogin(credential);
      }
    } catch {
      // Ignorar errores silenciosos en conditional autofill
    }
  }

  async function verifyAndLogin(credential: any) {
    setLoading(true);
    setErrorMessage(null);

    const credentialJSON = credential.toJSON ? credential.toJSON() : credential;

    try {
      const verifyRes = await fetch('/api/auth/passkey/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialJSON),
      });

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json();
        // Signal API en 404 (modern-web-guidance)
        if (
          verifyRes.status === 404 &&
          typeof (PublicKeyCredential as any).signalUnknownCredential === 'function'
        ) {
          try {
            await (PublicKeyCredential as any).signalUnknownCredential({
              rpId: window.location.hostname,
              credentialId: credentialJSON.id,
            });
          } catch {
            // Fallback graceful
          }
        }
        throw new Error(errorData.error || 'Fallo en la verificación biométrica.');
      }

      // Redirigir a la gestión
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión con biometría.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyClick() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/passkey/login-options');
      if (!res.ok) {
        throw new Error('No se pudo iniciar el servicio de biometría.');
      }
      const optionsJSON = await res.json();

      const publicKey = (PublicKeyCredential as any).parseRequestOptionsFromJSON(
        optionsJSON
      );

      let credential: any;
      try {
        credential = await navigator.credentials.get({
          publicKey,
          signal: abortControllerRef.current.signal,
        });
      } catch (clientErr: any) {
        if (
          clientErr.name === 'NotAllowedError' ||
          clientErr.name === 'AbortError'
        ) {
          // El usuario canceló el sensor de huella
          setLoading(false);
          return;
        }
        throw clientErr;
      }

      if (credential) {
        await verifyAndLogin(credential);
      }
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          'No se pudo acceder con biometría. Verificá si tenés tu huella configurada en el celular.'
      );
      setLoading(false);
    }
  }

  if (!isSupported) {
    return null;
  }

  return (
    <div className="w-full space-y-2 mt-3">
      <button
        type="button"
        onClick={handlePasskeyClick}
        disabled={loading}
        className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-500/30 border border-amber-500/40 hover:border-amber-500/60 text-amber-300 font-semibold text-sm rounded-xl transition-all shadow-lg shadow-amber-950/20 flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Verificando Huella / Biometría...</span>
          </>
        ) : (
          <>
            <Fingerprint className="w-5 h-5 text-amber-400 animate-pulse" />
            <span>Ingresar con Huella / Face ID</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400/70" />
          </>
        )}
      </button>

      {errorMessage && (
        <p className="text-xs text-rose-400 text-center bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
          {errorMessage}
        </p>
      )}

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-zinc-800"></div>
        <span className="flex-shrink mx-3 text-zinc-500 text-[10px] uppercase tracking-widest font-mono">
          O con contraseña
        </span>
        <div className="flex-grow border-t border-zinc-800"></div>
      </div>
    </div>
  );
}
