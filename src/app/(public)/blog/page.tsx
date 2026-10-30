import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  ShoppingBag,
  Scissors,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getBlogPostsAction } from '@/app/actions/blogActions';
import { getProductsAction } from '@/app/actions/productActions';
import { db } from '@/db';
import { services } from '@/db/schema';
import { asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function PublicBlogPage() {
  const [posts, productsList, servicesList] = await Promise.all([
    getBlogPostsAction(true),
    getProductsAction(true),
    db.select().from(services).orderBy(asc(services.displayOrder)),
  ]);

  return (
    <div className="min-h-dvh flex flex-col bg-[#f8f6f2] dark:bg-[#09090b] text-zinc-900 dark:text-[#f4efe6] transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-40 h-16 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-[#f8f6f2]/85 dark:bg-[#09090b]/85 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:text-[#d4af37] py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 min-h-[40px]"
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
              LOOKBOOK & TRABAJOS
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/tienda"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:text-[#d4af37] px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 min-h-[38px]"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Tienda</span>
          </Link>
          <Link
            href="/reservar"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider bg-[#d4af37] text-zinc-950 font-bold px-3.5 py-2 rounded-xl min-h-[38px]"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Reservar</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 text-left">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#b38f2d] dark:text-[#d4af37] font-semibold block mb-1.5">
            PORTFOLIO DE AUTOR • @DIOGOBARBERSHOPP
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-[#f4efe6]">
            Nuestros{' '}
            <span className="font-serif italic font-normal text-[#b38f2d] dark:text-[#d4af37]">
              trabajos & estilos
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-2xl">
            Conocé al detalle los cortes realizados en el estudio, la técnica empleada en cada cliente y los productos profesionales utilizados para lograr el acabado perfecto.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          {posts.map((post) => {
            let prodIds: string[] = [];
            try {
              prodIds = JSON.parse(post.productsUsedJson || '[]');
            } catch {
              prodIds = [];
            }
            const usedProducts = productsList.filter((p) => prodIds.includes(p.id));
            const linkedService = servicesList.find((s) => s.id === post.serviceId);

            return (
              <article
                key={post.id}
                className="rounded-3xl bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800/90 overflow-hidden flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="relative h-72 bg-zinc-900 overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full text-[11px] font-mono uppercase font-bold bg-zinc-950/90 text-[#d4af37] border border-[#d4af37]/40 backdrop-blur-md">
                        {post.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-[#f4efe6] leading-snug">
                      {post.title}
                    </h2>

                    {post.excerpt && (
                      <p className="text-xs sm:text-sm font-semibold text-[#b38f2d] dark:text-[#d4af37]">
                        {post.excerpt}
                      </p>
                    )}

                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>

                    {/* Productos Utilizados con botón de compra */}
                    {usedProducts.length > 0 && (
                      <div className="p-4 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 space-y-2.5">
                        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest font-bold text-[#b38f2d] dark:text-[#d4af37]">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>PRODUCTOS UTILIZADOS EN ESTE CORTE:</span>
                        </span>
                        <div className="space-y-1.5">
                          {usedProducts.map((prod) => (
                            <div
                              key={prod.id}
                              className="flex items-center justify-between gap-2 text-xs bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800"
                            >
                              <span className="font-bold text-zinc-900 dark:text-white">
                                {prod.name} (${Number(prod.price).toLocaleString('es-AR')})
                              </span>
                              <Link
                                href={`/tienda?productId=${prod.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#b38f2d] dark:text-[#d4af37] hover:underline"
                              >
                                <span>Comprar</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={
                      linkedService
                        ? `/reservar?serviceId=${linkedService.id}`
                        : '/reservar'
                    }
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider bg-[#d4af37] hover:bg-[#e5c158] text-zinc-950 min-h-[44px]"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>
                      Reservar {linkedService ? linkedService.name : 'este Estilo'}
                    </span>
                  </Link>

                  <Link
                    href="/tienda"
                    className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 hover:border-[#d4af37] min-h-[44px]"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#d4af37]" />
                    <span>Ver Tienda</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}

