'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Calendar,
  Scissors,
  DollarSign,
  Clock,
  Users,
  ExternalLink,
  LogOut,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Package,
  BookOpen,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { logoutAction } from '@/app/actions/authActions';
import { PwaInstaller } from '@/components/pwa/PwaInstaller';

const NAV_ITEMS = [
  {
    code: '01',
    href: '/dashboard',
    label: 'Agenda de Turnos',
    sublabel: 'Citas en vivo & WhatsApp',
    icon: Calendar,
  },
  {
    code: '02',
    href: '/dashboard/caja',
    label: 'Caja & Finanzas',
    sublabel: 'Ingresos, gastos & PDF',
    icon: DollarSign,
  },
  {
    code: '03',
    href: '/dashboard/inventario',
    label: 'Stock & Tienda',
    sublabel: 'Productos, ventas & cadete',
    icon: Package,
  },
  {
    code: '04',
    href: '/dashboard/blog',
    label: 'Blog & Portfolio',
    sublabel: 'Cortes, técnicas & fotos',
    icon: BookOpen,
  },
  {
    code: '05',
    href: '/dashboard/servicios',
    label: 'Carta de Servicios',
    sublabel: 'Cortes, precios & sugerencias',
    icon: Scissors,
  },
  {
    code: '06',
    href: '/dashboard/horarios',
    label: 'Horarios & Bloqueos',
    sublabel: 'Apertura, feriados & franco',
    icon: Clock,
  },
  {
    code: '07',
    href: '/dashboard/usuarios',
    label: 'Equipo & Accesos',
    sublabel: 'Barberos & biometría',
    icon: Users,
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const currentSection =
    NAV_ITEMS.find((item) =>
      item.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(item.href)
    ) || NAV_ITEMS[0];

  // Cerrar el drawer automáticamente al cambiar de ruta
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Bloquear scroll de la página cuando el drawer móvil está abierto
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const todayFormatted = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  return (
    <div className="flex h-dvh bg-[#f6f4f0] dark:bg-[#09090b] text-zinc-900 dark:text-[#f4efe6] overflow-hidden">
      {/* =====================================================================
          1. SIDEBAR EJECUTIVO DESKTOP (lg+)
      ====================================================================== */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 border-r border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#100f13] shrink-0 select-none">
        {/* Cabecera de Marca Despejada */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80">
          <Link href="/dashboard" className="flex items-center gap-3.5 group">
            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#9a7b2c] via-[#e5c158] to-[#9a7b2c] shadow-md shadow-[#d4af37]/15 shrink-0">
              <img
                src="/images/logo-diogo.webp"
                alt="Diogo Barber Shop"
                className="w-full h-full rounded-full object-cover bg-zinc-950"
              />
            </div>
            <div className="min-w-0">
              <span className="font-serif text-lg font-bold tracking-tight text-zinc-950 dark:text-[#f4efe6] block leading-none truncate">
                DIOGO BARBER
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#b38f2d] dark:text-[#d4af37] font-bold block mt-1.5">
                ATELIER OS • ADMIN
              </span>
            </div>
          </Link>

          {/* Estado Operativo */}
          <div className="mt-4 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/90 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-2 font-mono text-zinc-600 dark:text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Catamarca • Online
            </span>
            <span className="font-mono text-[10px] text-[#b38f2d] dark:text-[#d4af37] uppercase font-semibold">
              MP Sync
            </span>
          </div>
        </div>

        {/* Navegación Numerada Estilo Boutique */}
        <div className="px-4 pt-5 pb-2">
          <span className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500 font-semibold">
            MÓDULOS DE GESTIÓN
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-200 ${
                  active
                    ? 'bg-zinc-950 dark:bg-[#d4af37] text-white dark:text-zinc-950 shadow-lg shadow-zinc-950/10 dark:shadow-[#d4af37]/15'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-900/70 hover:text-zinc-950 dark:hover:text-[#f4efe6]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      active
                        ? 'bg-[#d4af37] dark:bg-zinc-950 text-zinc-950 dark:text-[#d4af37]'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 group-hover:text-[#b38f2d] dark:group-hover:text-[#d4af37]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono text-[10px] ${
                          active
                            ? 'text-[#d4af37] dark:text-zinc-800 font-bold'
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        {item.code}
                      </span>
                      <span className="text-sm font-bold truncate block leading-tight">
                        {item.label}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] truncate block mt-0.5 ${
                        active
                          ? 'text-zinc-300 dark:text-zinc-800 font-medium'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {item.sublabel}
                    </span>
                  </div>
                </div>

                <ChevronRight
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    active
                      ? 'translate-x-0 opacity-100'
                      : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Tarjeta Inferior del Sidebar: Acceso Web Pública y Cerrar Sesión */}
        <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2 bg-zinc-50/50 dark:bg-zinc-950/40">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-[#d4af37]/60 transition-all min-h-[42px]"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Abrir Web de Clientes</span>
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37] font-bold">
              EN VIVO
            </span>
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors min-h-[42px] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión Segura</span>
            </button>
          </form>
        </div>
      </aside>

      {/* =====================================================================
          2. DRAWER OFF-CANVAS MÓVIL (< lg)
      ====================================================================== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-80 max-w-[86vw] bg-white dark:bg-[#100f13] border-r border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl lg:hidden transform transition-transform duration-300 ease-in-out flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-[#9a7b2c] via-[#e5c158] to-[#9a7b2c] shrink-0">
              <img
                src="/images/logo-diogo.webp"
                alt="Diogo Barber Shop"
                className="w-full h-full rounded-full object-cover bg-zinc-950"
              />
            </div>
            <div>
              <span className="font-serif text-base font-bold text-zinc-950 dark:text-[#f4efe6] block leading-none">
                DIOGO BARBER
              </span>
              <span className="font-mono text-[10px] text-[#b38f2d] dark:text-[#d4af37] font-bold uppercase tracking-widest block mt-1">
                PANEL DE CONTROL
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
            className="p-2 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-colors min-h-[52px] ${
                  active
                    ? 'bg-[#d4af37] text-zinc-950 font-bold shadow-md'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <div>
                  <span className="text-sm font-bold block leading-tight">
                    {item.label}
                  </span>
                  <span
                    className={`text-[11px] block ${
                      active ? 'text-zinc-800' : 'text-zinc-400'
                    }`}
                  >
                    {item.sublabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 min-h-[44px]"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-[#d4af37]" />
              Ver Web Pública
            </span>
            <span className="font-mono text-[10px] text-[#d4af37]">Abrir ↗</span>
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 min-h-[44px] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </form>
        </div>
      </aside>

      {/* =====================================================================
          3. ÁREA DE CONTENIDO PRINCIPAL + HEADER SUPERIOR EJECUTIVO
      ====================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-atelier-grid">
        {/* Topbar Unificada (Móvil y Desktop) */}
        <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-[#100f13]/85 backdrop-blur-xl flex items-center justify-between gap-4 shrink-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
              className="lg:hidden p-2 -ml-1 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <span className="hidden sm:inline-flex font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37] border border-[#d4af37]/30">
                {currentSection.code}
              </span>
              <div className="truncate">
                <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-[#f4efe6] truncate leading-tight">
                  {currentSection.label}
                </h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:block truncate">
                  {currentSection.sublabel}
                </p>
              </div>
            </div>
          </div>

          {/* Controles Derechos: Fecha + Tema + Perfil */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 font-mono text-xs text-zinc-600 dark:text-zinc-300 capitalize">
              <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>{todayFormatted}</span>
            </div>

            <ThemeToggle />

            <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <img
                src="/images/logo-diogo.webp"
                alt="Admin"
                className="w-8 h-8 rounded-full object-cover border border-[#d4af37]/50"
              />
              <div className="text-left leading-none">
                <span className="text-xs font-bold text-zinc-900 dark:text-[#f4efe6] block">
                  Diogo
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#b38f2d] dark:text-[#d4af37] block mt-0.5">
                  ADMIN
                </span>
              </div>
              <form action={logoutAction} className="ml-1">
                <button
                  type="submit"
                  title="Cerrar Sesión"
                  aria-label="Cerrar Sesión"
                  className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Contenido Principal con Scroll y Espacio para Barra Móvil */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>

        {/* Notificación de Instalación PWA en Celular */}
        <PwaInstaller />

        {/* Barra de Navegación Rápida Inferior en Celulares (< lg) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#100f13]/95 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 px-2 py-1.5 grid grid-cols-5 gap-1">
          {NAV_ITEMS.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors min-h-[48px] ${
                  active
                    ? 'text-[#b38f2d] dark:text-[#d4af37] font-bold bg-[#d4af37]/10'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] mt-1 truncate max-w-full">
                  {item.label.split(' ')[0]}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors min-h-[48px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-[#d4af37]"
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px] mt-1">Más</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
