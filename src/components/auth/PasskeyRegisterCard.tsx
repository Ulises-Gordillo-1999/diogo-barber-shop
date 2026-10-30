'use client';

import { useEffect, useState } from 'react';
import 'webauthn-polyfills';
import { Fingerprint, CheckCircle2, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export function PasskeyRegisterCard() {
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkSupport() {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        setIsSupported(false);
        return;
      }

      try {
        const available =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsSupported(available);
      } catch {
        setIsSupported(false);
      }
    }

    checkSupport();
  }, []);

  async function handleRegisterPasskey() {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/passkey/register-options');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al obtener opciones de registro.');
      }

      const optionsJSON = await res.json();

      const publicKey = (PublicKeyCredential as any).parseCreationOptionsFromJSON(
        optionsJSON
      );

      let credential: any;
      try {
        credential = await navigator.credentials.create({ publicKey });
      } catch (clientErr: any) {
        if (clientErr.name === 'NotAllowedError') {
          setLoading(false);
          return; // Cancelado por el usuario
        }
        if (clientErr.name === 'InvalidStateError') {
          throw new Error('Esta huella o celular ya se encuentra vinculado a tu cuenta.');
        }
        throw clientErr;
      }

      if (!credential) {
        throw new Error('No se generó la credencial biométrica.');
      }

      const credentialJSON = credential.toJSON ? credential.toJSON() : credential;

      const verifyRes = await fetch('/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialJSON),
      });

      if (!verifyRes.ok) {
        const verifyData = await verifyRes.json();
        throw new Error(verifyData.error || 'Fallo al guardar la biometría en el servidor.');
      }

      setSuccessMessage('¡Tu huella digital / biometría quedó vinculada con éxito!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al vincular el dispositivo.');
    } finally {
      setLoading(false);
    }
  }

  if (!isSupported) {
    return null;
  }

  return (
    <div className="p-5 rounded-2xl bg-zinc-900/60 border border-amber-500/30 backdrop-blur-sm shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
          <Fingerprint className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-100">
              Acceso Biométrico Rápido (Android / Huella / Face ID)
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
              PASSKEY
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
            Vinculá la huella de este celular para entrar a la gestión de Diogo Barber en 1 segundo, sin volver a escribir tu contraseña y de forma ultra segura.
          </p>
          {successMessage && (
            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {successMessage}
            </p>
          )}
          {errorMessage && (
            <p className="text-xs text-rose-400 mt-2 flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              {errorMessage}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleRegisterPasskey}
        disabled={loading}
        className="shrink-0 w-full md:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-950/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
            <span>Colocá tu huella...</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 text-zinc-950" />
            <span>Vincular Huella de este Celular</span>
          </>
        )}
      </button>
    </div>
  );
}
