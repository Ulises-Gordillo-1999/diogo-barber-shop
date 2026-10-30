import Link from 'next/link';
import { ArrowLeft, Calendar, RotateCcw, BookOpen } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { PublicStoreView } from '@/components/tienda/PublicStoreView';
import {
  getProductsAction,
  getShippingZonesAction,
} from '@/app/actions/productActions';

export const dynamic = 'force-dynamic';

interface TiendaPageProps {
  searchParams: Promise<{
    productId?: string;
  }>;
}

export default async function TiendaPublicPage({ searchParams }: TiendaPageProps) {
  const { productId } = await searchParams;

  const [activeProducts, activeZones] = await Promise.all([
    getProductsAction(true),
    getShippingZonesAction(true),
  ]);

  return (
    <div className="min-h-dvh flex flex-col bg-[#f8f6f2] dark:bg-[#09090b] text-zinc-900 dark:text-[#f4efe6] transition-colors">
      {/* Navbar Pública */}
      <header className="sticky top-0 z-40 h-16 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-[#f8f6f2]/85 dark:bg-[#09090b]/85 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:text-[#d4af37] transition-colors py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 min-h-[40px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Inicio</span>
        </Link>

        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-[#d4af37]/50 bg-zinc-900">
            <img
              src="/images/logo-diogo.webp"
              alt="Diogo Barber Shop"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden sm:block text-left">
            <span className="font-extrabold text-sm tracking-tight block leading-none">
              DIOGO BARBER
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#b38f2d] dark:text-[#d4af37]">
              BOUTIQUE & GROOMING
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/blog"
            className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:text-[#d4af37] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 min-h-[38px]"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Blog & Cortes</span>
          </Link>
          <Link
            href="/reservar"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider bg-[#d4af37] text-zinc-950 font-bold px-3.5 py-2 rounded-xl min-h-[38px]"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Reservar Turno</span>
          </Link>
          <Link
            href="/mi-turno"
            className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:text-[#d4af37] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 min-h-[38px]"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Mi Turno</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 text-left">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#b38f2d] dark:text-[#d4af37] font-semibold block mb-1.5">
            TIENDA OFICIAL DIOGO BARBER SHOP
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-[#f4efe6]">
            Productos de{' '}
            <span className="font-serif italic font-normal text-[#b38f2d] dark:text-[#d4af37]">
              cuidado masculino
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Ceras mate, polvos texturizadores, aceites de barba y bálsamos profesionales utilizados en nuestro estudio.
          </p>
        </div>

        <PublicStoreView
          products={activeProducts}
          shippingZones={activeZones}
          preselectedProductId={productId}
        />
      </main>
    </div>
  );
}

