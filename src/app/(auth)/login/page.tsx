'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { loginAction, type AuthState } from '@/app/actions/authActions';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<AuthState | null, FormData>(
    loginAction,
    null
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-dvh flex flex-col justify-between bg-[#faf8f5] dark:bg-[#09090b] text-zinc-900 dark:text-[#f4efe6] bg-atelier-grid transition-colors p-4 sm:p-6">
      {/* Barra superior de navegación rápida */}
      <header className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-[#d4af37] transition-colors py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-[#d4af37]/50 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Estudio</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Contenedor central del Formulario */}
      <main className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-md bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Acento decorativo superior */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#9a7b2c] via-[#e5c158] to-[#9a7b2c]" />

          {/* Cabecera con Logo Oficial */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full p-0.5 bg-gradient-to-tr from-[#9a7b2c] via-[#e5c158] to-[#9a7b2c] mx-auto mb-4 shadow-lg shadow-[#d4af37]/15">
              <img
                src="/images/logo-diogo.webp"
                alt="Diogo Barber Shop"
                className="w-full h-full rounded-full object-cover bg-zinc-950"
              />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#b38f2d] dark:text-[#d4af37] font-bold block mb-1">
              ACCESO RESTRINGIDO • RBAC
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-[#f4efe6]">
              Diogo Barber Shop
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Ingresá tus credenciales de administración o barbero
            </p>
          </div>

          {/* Alerta de Error + Contador de Intentos */}
          {state?.error && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs space-y-1.5 animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{state.error}</span>
              </div>
              {typeof state.remainingAttempts === 'number' &&
                state.remainingAttempts > 0 && (
                  <p className="font-mono text-[11px] pl-6 text-rose-600/80 dark:text-rose-300/80">
                    Intentos restantes antes del bloqueo temporal:{' '}
                    <strong>{state.remainingAttempts}</strong>
                  </p>
                )}
            </div>
          )}

          {/* Formulario */}
          <form action={formAction} className="space-y-4">
            {/* Campo Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block font-mono text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@diogobarber.com"
                  className="w-full pl-10 pr-3.5 py-3.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-[#f4efe6] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] min-h-[46px] transition-all"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block font-mono text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-[#f4efe6] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] min-h-[46px] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-[#f4efe6] min-w-[42px] justify-center cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Botón de Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 shadow-lg shadow-[#d4af37]/20 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99] min-h-[48px] cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Panel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Indicador de Seguridad Activa */}
          <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] uppercase tracking-wider font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sesión Cifrada HttpOnly • Protección Anti-Fuerza Bruta</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center font-mono text-[11px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 py-2">
        Diogo Barber Shop © {new Date().getFullYear()} • Catamarca
      </footer>
    </div>
  );
}
