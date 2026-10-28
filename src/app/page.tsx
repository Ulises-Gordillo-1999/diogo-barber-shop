import Link from 'next/link';
import {
  Scissors,
  Clock,
  ShieldCheck,
  Calendar,
  ArrowRight,
  ArrowUpRight,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  MapPin,
  CreditCard,
  Zap,
  Award,
  Play,
  Lock,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { db } from '@/db';
import { services } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function InstagramIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13.5 21v-7.5h2.6l.4-3h-3v-1.9c0-.9.3-1.5 1.6-1.5H16.7V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.1H7.7v3h2.6V21h3.2z" />
    </svg>
  );
}

// Determinar en vivo si la barbería está abierta en horario de Catamarca (UTC-3)
function getBarberLiveStatus() {
  const now = new Date();
  const arTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Argentina/Catamarca' })
  );
  const day = arTime.getDay(); // 0 = Domingo, 1..6 = Lun..Sab
  const minutes = arTime.getHours() * 60 + arTime.getMinutes();

  const isMorningOpen = minutes >= 10 * 60 && minutes < 13 * 60;
  const isEveningOpen = minutes >= 17 * 60 + 30 && minutes < 22 * 60;
  const isOpenNow = day !== 0 && (isMorningOpen || isEveningOpen);

  if (isOpenNow) {
    return {
      isOpen: true,
      badge: 'ESTUDIO ABIERTO AHORA',
      detail: 'Atendiendo en el local • Reserva online activa',
    };
  }

  return {
    isOpen: false,
    badge: 'RESERVA ONLINE 24/7 ACTIVA',
    detail: 'Lun a Sáb: 10:00–13:00 y 17:30–22:00 hs',
  };
}

const SERVICE_TAGS: Record<number, { code: string; tag: string; highlight: boolean }> = {
  0: { code: '01', tag: 'CLÁSICO & MODERNO', highlight: false },
  1: { code: '02', tag: 'EXPERIENCIA COMPLETA ★', highlight: true },
  2: { code: '03', tag: 'RITUAL DE NAVAJA', highlight: false },
  3: { code: '04', tag: 'COLORIMETRÍA DE AUTOR', highlight: false },
};

export default async function HomePage() {
  const activeServices = await db
    .select()
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.displayOrder));

  const liveStatus = getBarberLiveStatus();
  const whatsappPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '5493834064982';
  const instagramUrl =
    process.env.NEXT_PUBLIC_BUSINESS_INSTAGRAM ||
    'https://www.instagram.com/diogobarbershopp/';
  const facebookUrl =
    process.env.NEXT_PUBLIC_BUSINESS_FACEBOOK ||
    'https://www.facebook.com/DiogoBarberShopCatamarca';

  return (
    <div className="min-h-dvh flex flex-col bg-[#faf8f5] dark:bg-[#09090b] text-zinc-900 dark:text-[#f4efe6] relative overflow-x-hidden">
      {/* =====================================================================
          1. TOP ARCHITECTURAL TICKER BAR
      ====================================================================== */}
      <div className="bg-zinc-950 text-[#f4efe6] border-b border-[#d4af37]/20 text-[11px] py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  liveStatus.isOpen ? 'bg-emerald-400' : 'bg-[#d4af37]'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  liveStatus.isOpen ? 'bg-emerald-500' : 'bg-[#d4af37]'
                }`}
              />
            </span>
            <span className="font-mono font-bold tracking-widest uppercase text-[#d4af37]">
              {liveStatus.badge}
            </span>
            <span className="hidden sm:inline text-zinc-400">—</span>
            <span className="hidden sm:inline text-zinc-300">{liveStatus.detail}</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[10px] tracking-wider uppercase text-zinc-400">
            <span className="hidden md:inline-flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#d4af37]" />
              Catamarca, Argentina
            </span>
            <span className="text-[#d4af37]/40 hidden md:inline">|</span>
            <span className="inline-flex items-center gap-1 text-zinc-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Mercado Pago Oficial
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. STICKY LUXURY HEADER
      ====================================================================== */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-[#faf8f5]/85 dark:bg-[#09090b]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Emblem */}
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#9a7b2c] via-[#e5c158] to-[#9a7b2c] shadow-md shadow-[#d4af37]/10 group-hover:scale-105 transition-transform">
              <img
                src="/images/logo-diogo.webp"
                alt="Diogo Barber Shop"
                className="w-full h-full rounded-full object-cover bg-zinc-950"
              />
            </div>
            <div>
              <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-[#f4efe6] block leading-none">
                DIOGO
              </span>
              <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#b38f2d] dark:text-[#d4af37] font-semibold block mt-1">
                BARBER SHOP
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600 dark:text-zinc-400">
            <a
              href="#servicios"
              className="hover:text-zinc-950 dark:hover:text-[#d4af37] transition-colors py-2"
            >
              Menú & Tarifas
            </a>
            <a
              href="#protocolo"
              className="hover:text-zinc-950 dark:hover:text-[#d4af37] transition-colors py-2"
            >
              Cómo Funciona
            </a>
            <a
              href="#lookbook"
              className="hover:text-zinc-950 dark:hover:text-[#d4af37] transition-colors py-2"
            >
              El Estudio & Reels
            </a>
            <a
              href="#horarios"
              className="hover:text-zinc-950 dark:hover:text-[#d4af37] transition-colors py-2"
            >
              Horarios
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider px-3.5 py-2.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-[#f4efe6] border border-zinc-300/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all min-h-[44px]"
            >
              <Lock className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Staff</span>
            </Link>
            <Link
              href="/reservar"
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-zinc-950 dark:bg-[#d4af37] text-[#f4efe6] dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-[#e5c158] shadow-lg shadow-[#d4af37]/15 transition-all hover:-translate-y-0.5 min-h-[44px]"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Reservar Turno</span>
            </Link>
          </div>
        </div>
      </header>

      {/* =====================================================================
          3. ASYMMETRIC EDITORIAL HERO SECTION
      ====================================================================== */}
      <section className="relative pt-8 pb-16 sm:py-20 lg:py-24 border-b border-zinc-200 dark:border-zinc-800/80 bg-atelier-grid overflow-hidden">
        {/* Ambient radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 right-1/4 w-[520px] h-[520px] rounded-full bg-[#d4af37]/10 blur-[130px]"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Column: High-Impact Editorial Copy (7 cols) */}
            <div className="lg:col-span-7 space-y-8 text-left">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-900/5 dark:bg-zinc-900/90 border border-zinc-300 dark:border-[#d4af37]/30">
                <Sparkles className="w-3.5 h-3.5 text-[#b38f2d] dark:text-[#d4af37]" />
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-700 dark:text-[#d4af37]">
                  Barbería Masculina & Grooming de Autor
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-6xl lg:text-[64px] font-extrabold tracking-tight leading-[1.04] text-zinc-950 dark:text-[#f4efe6]">
                  La precisión de un clásico.{' '}
                  <span className="font-serif italic font-normal text-[#b38f2d] dark:text-[#d4af37] block sm:inline">
                    Sin esperas.
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl leading-relaxed">
                  Olvidate de consultar horarios por mensaje y esperar respuesta. Elegí tu
                  servicio, visualizá los huecos libres de{' '}
                  <strong className="text-zinc-900 dark:text-[#f4efe6] font-semibold">
                    Diogo Barber Shop
                  </strong>{' '}
                  en tiempo real y asegurá tu silla al instante.
                </p>
              </div>

              {/* Primary & Secondary CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
                <Link
                  href="/reservar"
                  className="group inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 shadow-xl shadow-[#d4af37]/20 hover:shadow-[#d4af37]/35 transition-all hover:-translate-y-0.5 min-h-[54px]"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Agendar Turno Online</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <a
                  href="#servicios"
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-semibold border border-zinc-300 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 hover:border-[#d4af37]/60 text-zinc-800 dark:text-zinc-200 transition-all min-h-[54px]"
                >
                  <span>Ver Carta de Servicios</span>
                </a>
              </div>

              {/* Architectural KPI Strip */}
              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800/80 grid grid-cols-3 gap-4 sm:gap-8">
                <div>
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-[#f4efe6] block">
                    100%
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                    Turno Garantizado Sin Demoras
                  </span>
                </div>
                <div className="border-l border-zinc-200 dark:border-zinc-800 pl-4 sm:pl-6">
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-[#b38f2d] dark:text-[#d4af37] block">
                    10 min
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                    Bloqueo Exclusivo al Reservar
                  </span>
                </div>
                <div className="border-l border-zinc-200 dark:border-zinc-800 pl-4 sm:pl-6">
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-[#f4efe6] block">
                    24/7
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                    Agenda Abierta Todo el Día
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Architectural Visual Composition + Live Digital Pass (5 cols) */}
            <div className="lg:col-span-5 relative">
              {/* Main Studio Frame */}
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Decorative Brass Frame Offset */}
                <div
                  aria-hidden="true"
                  className="absolute -inset-2.5 rounded-[28px] border border-[#d4af37]/30 translate-x-3 translate-y-3 pointer-events-none hidden sm:block"
                />

                <div className="relative rounded-3xl overflow-hidden border border-zinc-300 dark:border-zinc-800 bg-zinc-950 shadow-2xl aspect-[4/5]">
                  <img
                    src="/images/galeria-2.webp"
                    alt="Interior de Diogo Barber Shop Catamarca"
                    className="w-full h-full object-cover object-center scale-102 hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/35 to-transparent" />

                  {/* Top Floating Pill inside Image */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-zinc-950/80 backdrop-blur-md text-[#f4efe6] border border-white/10">
                      <Award className="w-3.5 h-3.5 text-[#d4af37]" />
                      Estudio Oficial
                    </span>
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono bg-zinc-950/80 backdrop-blur-md text-[#d4af37] border border-[#d4af37]/30 hover:bg-zinc-900 transition-colors"
                    >
                      <InstagramIcon className="w-3.5 h-3.5" />
                      @diogobarbershopp
                    </a>
                  </div>

                  {/* Bottom Interactive "Digital Boarding Pass" Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 p-5 rounded-2xl bg-zinc-950/90 backdrop-blur-xl border border-[#d4af37]/35 text-left shadow-2xl space-y-3.5">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src="/images/logo-diogo.webp"
                          alt="Logo Diogo"
                          className="w-9 h-9 rounded-full object-cover border border-[#d4af37]/50"
                        />
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37] block">
                            PASE DE TURNO DIGITAL
                          </span>
                          <span className="text-sm font-bold text-white block">
                            Reserva Instantánea
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                        EN VIVO
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 block">
                          Servicio Destacado
                        </span>
                        <span className="font-bold text-white mt-0.5 block">
                          Corte + Barba
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 block">
                          Confirmación
                        </span>
                        <span className="font-bold text-[#d4af37] mt-0.5 block">
                          Mercado Pago 100%
                        </span>
                      </div>
                    </div>

                    <Link
                      href="/reservar"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#d4af37]/15 hover:bg-[#d4af37] text-[#d4af37] hover:text-zinc-950 border border-[#d4af37]/40 text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-all"
                    >
                      <span>Seleccionar horario disponible</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. INFINITE BRASS MARQUEE TICKER
      ====================================================================== */}
      <div className="bg-zinc-950 border-b border-zinc-800 py-3.5 overflow-hidden select-none">
        <div className="animate-marquee flex items-center gap-10 text-xs font-mono uppercase tracking-[0.25em] text-zinc-400">
          {[...Array(2)].map((_, idx) => (
            <div key={idx} className="flex items-center gap-10 shrink-0">
              <span className="flex items-center gap-3">
                <Scissors className="w-3.5 h-3.5 text-[#d4af37]" />
                CORTE DE CABELLO DE AUTOR
              </span>
              <span className="text-[#d4af37]">✦</span>
              <span>PERFILADO DE BARBA A NAVAJA</span>
              <span className="text-[#d4af37]">✦</span>
              <span>FADE & DEGRADADOS DE PRECISIÓN</span>
              <span className="text-[#d4af37]">✦</span>
              <span>COLORIMETRÍA & PLATINADOS</span>
              <span className="text-[#d4af37]">✦</span>
              <span>RESERVA ONLINE CON CONFIRMACIÓN INMEDIATA</span>
              <span className="text-[#d4af37]">✦</span>
            </div>
          ))}
        </div>
      </div>

      {/* =====================================================================
          5. BESPOKE MENU OF SERVICES (CARTA DE SERVICIOS & TARIFAS)
      ====================================================================== */}
      <section id="servicios" className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#b38f2d] dark:text-[#d4af37] font-semibold block mb-2">
              01 // CARTA DE SERVICIOS & TARIFAS
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-[#f4efe6]">
              Elegí tu{' '}
              <span className="font-serif italic font-normal text-[#b38f2d] dark:text-[#d4af37]">
                ritual de estilo
              </span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
            Tocá cualquier servicio para ir directamente al calendario en vivo con la
            duración exacta ya configurada.
          </p>
        </div>

        {/* Architectural Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {activeServices.map((srv, index) => {
            const meta = SERVICE_TAGS[index] || {
              code: `0${index + 1}`,
              tag: 'SERVICIO PROFESIONAL',
              highlight: false,
            };

            return (
              <Link
                key={srv.id}
                href={`/reservar?serviceId=${srv.id}`}
                className={`group relative rounded-3xl p-6 sm:p-8 transition-all duration-300 flex flex-col justify-between text-left overflow-hidden border ${
                  meta.highlight
                    ? 'bg-zinc-950 text-[#f4efe6] border-[#d4af37]/60 shadow-xl shadow-[#d4af37]/10'
                    : 'bg-white dark:bg-[#121114] text-zinc-900 dark:text-[#f4efe6] border-zinc-200/90 dark:border-zinc-800/90 hover:border-[#d4af37]/60'
                }`}
              >
                {/* Top Index + Tag */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-5">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37] border border-[#d4af37]/30">
                      N° {meta.code}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] px-3 py-1 rounded-full ${
                        meta.highlight
                          ? 'bg-[#d4af37] text-zinc-950'
                          : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {meta.tag}
                    </span>
                  </div>

                  {/* Service Name & Price */}
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight group-hover:text-[#b38f2d] dark:group-hover:text-[#d4af37] transition-colors">
                      {srv.name}
                    </h3>
                    <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#b38f2d] dark:text-[#d4af37] shrink-0">
                      ${Number(srv.price).toLocaleString('es-AR')}
                    </span>
                  </div>

                  {srv.description && (
                    <p
                      className={`text-xs sm:text-sm mt-3 leading-relaxed ${
                        meta.highlight
                          ? 'text-zinc-300'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {srv.description}
                    </p>
                  )}
                </div>

                {/* Bottom Bar: Duration + Direct Action */}
                <div
                  className={`mt-7 pt-4 border-t flex items-center justify-between ${
                    meta.highlight
                      ? 'border-zinc-800'
                      : 'border-zinc-100 dark:border-zinc-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-[#d4af37]" />
                      {srv.durationMinutes} MINUTOS
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      DISPONIBLE HOY
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#b38f2d] dark:text-[#d4af37] group-hover:translate-x-1 transition-transform">
                    <span>Elegir Horario</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          6. EL PROTOCOLO DIOGO BARBER (CÓMO FUNCIONA + REGLAS CLARAS)
      ====================================================================== */}
      <section
        id="protocolo"
        className="py-20 sm:py-24 bg-zinc-950 text-[#f4efe6] border-y border-zinc-800/90 relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl mb-14">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#d4af37] font-semibold block mb-2">
              02 // SISTEMA DE RESERVA SIN FRICCIÓN
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Cómo asegurás tu lugar en{' '}
              <span className="font-serif italic font-normal text-[#d4af37]">
                menos de 60 segundos
              </span>
            </h2>
          </div>

          {/* 3 Steps Architectural Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-7 rounded-3xl bg-[#121115] border border-zinc-800/90 space-y-4 relative">
              <div className="flex items-center justify-between">
                <span className="font-mono text-3xl font-extrabold text-[#d4af37]/30">
                  01
                </span>
                <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white">
                Elegí Día y Hora en Tiempo Real
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Nuestro motor calcula automáticamente los bloques libres según la duración de
                tu corte o barba. Sin superposiciones ni esperas en el salón.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#121115] border border-[#d4af37]/40 space-y-4 relative shadow-lg shadow-[#d4af37]/5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-3xl font-extrabold text-[#d4af37]">
                  02
                </span>
                <div className="w-10 h-10 rounded-xl bg-[#d4af37] text-zinc-950 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white">
                Bloqueo Anti-Colisión por 10 Minutos
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Al tocar <em>&ldquo;Pagar y Confirmar&rdquo;</em>, el sistema congela ese horario
                exclusivamente para vos durante 10 minutos mientras completás el pago en
                Mercado Pago.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#121115] border border-zinc-800/90 space-y-4 relative">
              <div className="flex items-center justify-between">
                <span className="font-mono text-3xl font-extrabold text-[#d4af37]/30">
                  03
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white">
                Confirmación & Compromiso de Puntualidad
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Tu turno queda <strong>100% confirmado</strong> al instante. Contás con una
                tolerancia máxima de <strong>10 minutos</strong> para mantener la excelencia en la
                agenda de todos los clientes.
              </p>
            </div>
          </div>

          {/* VIP Black Card: Condiciones y Datos Oficiales del Titular */}
          <div className="rounded-3xl bg-gradient-to-r from-[#17151b] via-[#121115] to-[#17151b] border border-[#d4af37]/35 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#d4af37]">
                <CreditCard className="w-4 h-4" />
                <span>Política de Reserva Garantizada</span>
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-white">
                Los turnos se confirman únicamente con el pago del 100% del servicio
              </h4>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                El importe abonado no es reembolsable en caso de inasistencia. Podés abonar de
                forma automática con <strong>Mercado Pago</strong> (dinero en cuenta, débito o
                crédito) y descargar tu comprobante al instante.
              </p>
            </div>

            {/* Datos Oficiales de Respaldo */}
            <div className="w-full lg:w-auto shrink-0 p-4 sm:p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800 font-mono text-xs space-y-1.5 min-w-[270px]">
              <div className="text-[10px] uppercase tracking-widest text-[#d4af37] pb-1 border-b border-zinc-800 mb-2">
                TITULAR OFICIAL • DIOGO BARBER
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Titular:</span>
                <span className="text-zinc-200 font-semibold">Diego Rodolfo Nieva</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Alias Oficial:</span>
                <span className="text-[#d4af37] font-bold">diogo46</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">CUIT:</span>
                <span className="text-zinc-300">20-27496305-1</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. EDITORIAL LOOKBOOK & REELS BENTO GRID
      ====================================================================== */}
      <section id="lookbook" className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#b38f2d] dark:text-[#d4af37] font-semibold block mb-2">
              03 // LOOKBOOK & REELS EN VIVO
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-[#f4efe6]">
              Conocé nuestro{' '}
              <span className="font-serif italic font-normal text-[#b38f2d] dark:text-[#d4af37]">
                trabajo y estudio
              </span>
            </h2>
          </div>

          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-800 hover:border-[#d4af37] text-xs font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 transition-colors self-start md:self-auto"
          >
            <InstagramIcon className="w-4 h-4 text-[#d4af37]" />
            <span>Seguir @diogobarbershopp</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Reels Cinema Row + Gallery Bento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Reel 1 (4 cols) */}
          <div className="lg:col-span-4 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 flex flex-col justify-between shadow-lg">
            <div className="relative aspect-[9/14] w-full bg-black overflow-hidden">
              <video
                className="w-full h-full object-cover"
                controls
                playsInline
                preload="metadata"
                poster="/images/reel1-poster.webp"
              >
                <source src="/vids/reel1.mp4" type="video/mp4" />
              </video>
              <div className="pointer-events-none absolute top-3 left-3 px-3 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md border border-white/10 text-[10px] font-mono uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                <Play className="w-3 h-3 fill-current" />
                Reel Destacado #01
              </div>
            </div>
            <div className="p-4 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300">
                Técnica & Fade en Vivo
              </span>
              <a
                href="https://www.instagram.com/reel/DdKFzhDtrGy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#d4af37] hover:underline inline-flex items-center gap-1"
              >
                Ver en IG <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Reel 2 (4 cols) */}
          <div className="lg:col-span-4 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 flex flex-col justify-between shadow-lg">
            <div className="relative aspect-[9/14] w-full bg-black overflow-hidden">
              <video
                className="w-full h-full object-cover"
                controls
                playsInline
                preload="metadata"
                poster="/images/reel2-poster.webp"
              >
                <source src="/vids/reel2.mp4" type="video/mp4" />
              </video>
              <div className="pointer-events-none absolute top-3 left-3 px-3 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md border border-white/10 text-[10px] font-mono uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                <Play className="w-3 h-3 fill-current" />
                Reel Destacado #02
              </div>
            </div>
            <div className="p-4 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300">
                Terminación & Detalle a Navaja
              </span>
              <a
                href="https://www.instagram.com/reel/DdXLjQYNFxw/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#d4af37] hover:underline inline-flex items-center gap-1"
              >
                Ver en IG <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 4-Photo Studio Mosaic (4 cols) */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-4 content-between">
            {[
              { src: '/images/galeria-1.webp', label: 'El Salón' },
              { src: '/images/galeria-2.webp', label: 'Sillones & Confort' },
              { src: '/images/galeria-3.webp', label: 'Instrumental Pro' },
              { src: '/images/galeria-4.webp', label: 'Cortes de Autor' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="group relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 aspect-[3/4] bg-zinc-900"
              >
                <img
                  src={item.src}
                  alt={item.label}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                <span className="absolute bottom-2.5 left-3 text-[11px] font-mono uppercase tracking-wider text-[#f4efe6]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. HORARIOS SEMANALES & CONVERSIÓN FINAL
      ====================================================================== */}
      <section
        id="horarios"
        className="py-20 sm:py-24 border-t border-zinc-200 dark:border-zinc-800/80 bg-white/50 dark:bg-[#0d0c10]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Schedule Card (6 cols) */}
            <div className="lg:col-span-6 p-7 sm:p-9 rounded-3xl bg-white dark:bg-[#131217] border border-zinc-200 dark:border-zinc-800 shadow-lg space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div>
                  <span className="font-mono text-xs uppercase tracking-widest text-[#b38f2d] dark:text-[#d4af37] block">
                    CRONOGRAMA SEMANAL
                  </span>
                  <h3 className="text-2xl font-bold mt-0.5">Horarios de Atención</h3>
                </div>
                <Clock className="w-7 h-7 text-[#d4af37]" />
              </div>

              <div className="space-y-3 text-sm">
                {[
                  { day: 'Lunes a Viernes', hours: '10:00 – 13:00  y  17:30 – 22:00', open: true },
                  { day: 'Sábados', hours: '10:00 – 13:00  y  17:30 – 22:00', open: true },
                  { day: 'Domingos', hours: 'Cerrado', open: false },
                ].map((row) => (
                  <div
                    key={row.day}
                    className="flex items-center justify-between py-2.5 border-b border-dashed border-zinc-200 dark:border-zinc-800 last:border-none"
                  >
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {row.day}
                    </span>
                    <span
                      className={`font-mono text-xs px-3 py-1 rounded-lg ${
                        row.open
                          ? 'bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37] font-bold'
                          : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {row.hours}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#d4af37]" />
                  San Fernando del Valle de Catamarca
                </span>
                <span className="font-mono text-[11px]">WhatsApp: 3834 06-4982</span>
              </div>
            </div>

            {/* Final CTA Banner (6 cols) */}
            <div className="lg:col-span-6 p-8 sm:p-10 rounded-3xl bg-zinc-950 text-[#f4efe6] border border-[#d4af37]/40 relative overflow-hidden space-y-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-[#d4af37]/15 blur-3xl"
              />
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/15 text-[#d4af37] font-mono text-[11px] uppercase tracking-wider">
                <Scissors className="w-3.5 h-3.5" />
                Reservá en 3 toques
              </span>

              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                ¿Listo para tu próximo corte en{' '}
                <span className="font-serif italic font-normal text-[#d4af37]">
                  Diogo Barber Shop
                </span>
                ?
              </h3>

              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Elegí tu servicio ahora, bloqueá tu horario preferido y recibí tu comprobante
                digital al instante.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/reservar"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl text-xs font-bold uppercase tracking-wider bg-[#d4af37] hover:bg-[#e5c158] text-zinc-950 shadow-lg shadow-[#d4af37]/20 transition-all min-h-[48px]"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Reservar Turno Online</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
                    '¡Hola Diogo Barber Shop! Tengo una consulta.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl text-xs font-bold uppercase tracking-wider border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-200 transition-all min-h-[48px]"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Consultar por WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          9. FOOTER OFICIAL
      ====================================================================== */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 border-t border-zinc-200 dark:border-zinc-800/80 bg-[#faf8f5] dark:bg-[#09090b] pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo-diogo.webp"
              alt="Diogo Barber Shop"
              className="w-9 h-9 rounded-full object-cover border border-[#d4af37]/40"
            />
            <div className="text-left">
              <span className="text-sm font-bold block">Diogo Barber Shop</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                © {new Date().getFullYear()} • Catamarca, Argentina
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-10 h-10 rounded-xl border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-[#d4af37] hover:border-[#d4af37] transition-colors"
            >
              <InstagramIcon className="w-4 h-4" />
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-10 h-10 rounded-xl border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-[#d4af37] hover:border-[#d4af37] transition-colors"
            >
              <FacebookIcon className="w-4 h-4" />
            </a>
            <a
              href={`https://wa.me/${whatsappPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="w-10 h-10 rounded-xl border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          10. STICKY MOBILE BOTTOM CTA BAR (PARA CLIENTES DESDE INSTAGRAM)
      ====================================================================== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-zinc-950/95 backdrop-blur-xl border-t border-[#d4af37]/30 flex items-center justify-between gap-3">
        <div className="text-left pl-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37] block">
            AGENDA EN TIEMPO REAL
          </span>
          <span className="text-xs font-bold text-white block">
            Cortes desde $15.000
          </span>
        </div>
        <Link
          href="/reservar"
          className="px-5 py-3 rounded-xl bg-[#d4af37] text-zinc-950 font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-md shadow-[#d4af37]/20 shrink-0 min-h-[44px]"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Reservar Ahora</span>
        </Link>
      </div>
    </div>
  );
}
