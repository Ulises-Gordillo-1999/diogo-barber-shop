'use client';

import { useState, useTransition } from 'react';
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Upload,
  CheckCircle2,
  Sparkles,
  Scissors,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { saveBlogPostAction, deleteBlogPostAction } from '@/app/actions/blogActions';
import type { BlogPost, Product, Service } from '@/db/schema';

interface BlogManagerProps {
  initialPosts: BlogPost[];
  services: Service[];
  products: Product[];
}

export function BlogManager({ initialPosts, services, products }: BlogManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Fade & Textura');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('/images/interior-sillas.webp');
  const [serviceId, setServiceId] = useState<string>('');
  const [selectedProdIds, setSelectedProdIds] = useState<string[]>([]);
  const [published, setPublished] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const openNewPostModal = () => {
    setEditingPost(null);
    setTitle('');
    setCategory('Fade & Textura');
    setExcerpt('');
    setContent('');
    setImageUrl('/images/interior-sillas.webp');
    setServiceId(services[0]?.id || '');
    setSelectedProdIds([]);
    setPublished(true);
    setModalOpen(true);
  };

  const openEditPostModal = (post: BlogPost) => {
    setEditingPost(post);
    setTitle(post.title);
    setCategory(post.category);
    setExcerpt(post.excerpt || '');
    setContent(post.content);
    setImageUrl(post.imageUrl);
    setServiceId(post.serviceId || '');
    try {
      const parsed = JSON.parse(post.productsUsedJson || '[]');
      setSelectedProdIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSelectedProdIds([]);
    }
    setPublished(post.published);
    setModalOpen(true);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleProdUsed = (id: string) => {
    setSelectedProdIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await saveBlogPostAction({
        id: editingPost?.id,
        title,
        category,
        excerpt,
        content,
        imageUrl,
        serviceId: serviceId || null,
        productsUsedIds: selectedProdIds,
        published,
      });

      if (res.success) {
        setModalOpen(false);
        setFeedback({
          type: 'ok',
          text: editingPost
            ? 'Publicación actualizada en el Blog.'
            : 'Nuevo trabajo publicado en el Blog de Diogo Barber Shop.',
        });
      } else {
        setFeedback({ type: 'err', text: res.error || 'Error al guardar.' });
      }
    });
  };

  return (
    <div className="space-y-6 text-left">
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#b38f2d] dark:text-[#d4af37] font-semibold block">
            PORTFOLIO EDITORIAL & ESTILOS
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-[#f4efe6] mt-0.5">
            Blog de Trabajos & Cortes Realizados
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Subí fotos de tus cortes, contá la técnica aplicada y etiquetá los productos que usaste para que tus clientes los vean y compren.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewPostModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 shadow-md shadow-[#d4af37]/20 min-h-[44px] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Publicar Nuevo Trabajo</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {initialPosts.map((post) => {
          let prodIds: string[] = [];
          try {
            prodIds = JSON.parse(post.productsUsedJson || '[]');
          } catch {
            prodIds = [];
          }
          const usedProducts = products.filter((p) => prodIds.includes(p.id));
          const linkedService = services.find((s) => s.id === post.serviceId);

          return (
            <div
              key={post.id}
              className="rounded-3xl bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800/90 overflow-hidden flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="relative h-56 bg-zinc-900 overflow-hidden">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold bg-zinc-950/85 text-[#d4af37] border border-[#d4af37]/30 backdrop-blur-md">
                      {post.category}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="text-lg font-extrabold text-zinc-900 dark:text-[#f4efe6]">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-xs font-semibold text-[#b38f2d] dark:text-[#d4af37]">
                      {post.excerpt}
                    </p>
                  )}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3 whitespace-pre-line">
                    {post.content}
                  </p>

                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {linkedService && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800">
                        <Scissors className="w-3 h-3 text-[#d4af37]" />
                        <span>Servicio: {linkedService.name}</span>
                      </span>
                    )}
                    {usedProducts.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37] border border-[#d4af37]/30"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{p.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                <span className="font-mono text-[11px] text-zinc-400">
                  {post.published ? '● Publicado en /blog' : '○ Borrador oculto'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditPostModal(post)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 hover:border-[#d4af37] min-h-[40px] cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await deleteBlogPostAction(post.id);
                      })
                    }
                    className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-rose-500 hover:bg-rose-500/10 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL PUBLICAR / EDITAR TRABAJO DEL BLOG */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPost ? 'Editar Trabajo del Blog' : 'Publicar Nuevo Trabajo en el Blog'}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">
              Título del Corte / Trabajo *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Mid Fade a Navaja + Textura Superior Mate"
              className="w-full px-3.5 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">
                Categoría / Estilo
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej: Fade & Textura"
                className="w-full px-3.5 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">
                Servicio Realizado
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full px-3 py-2.5 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 min-h-[44px]"
              >
                <option value="">— Seleccionar servicio —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (${Number(s.price).toLocaleString('es-AR')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">
              Resumen Corto (Subtítulo)
            </label>
            <input
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Degradado limpio con terminación a navaja y fijación sin brillo..."
              className="w-full px-3.5 py-2 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 min-h-[42px]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">
              Detalle del Trabajo, Técnica y Recomendación *
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contá cómo hiciste el corte, qué máquina/tijera aplicaste y cómo lograr el peinado con los productos..."
              className="w-full p-3 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            />
          </div>

          {/* Foto del Corte */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase text-zinc-500">
              Foto del Trabajo (Subir desde tu celular o URL)
            </label>
            <div className="flex items-center gap-3">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-16 h-16 rounded-2xl object-cover border border-[#d4af37]/40 shrink-0"
              />
              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#d4af37]/15 text-[#b38f2d] dark:text-[#d4af37] border border-[#d4af37]/30 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir Foto del Corte (WebP)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFile}
                    className="hidden"
                  />
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                />
              </div>
            </div>
          </div>

          {/* Productos utilizados en este corte */}
          {products.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase text-zinc-500">
                Productos Utilizados en este Corte (aparecerán con botón de compra):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {products.map((prod) => {
                  const active = selectedProdIds.includes(prod.id);
                  return (
                    <label
                      key={prod.id}
                      className={`p-2 rounded-xl border text-xs flex items-center gap-2 cursor-pointer ${
                        active
                          ? 'border-[#d4af37] bg-[#d4af37]/15 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleProdUsed(prod.id)}
                        className="w-4 h-4 accent-[#d4af37]"
                      />
                      <span className="truncate">{prod.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-zinc-300 dark:border-zinc-700 min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#d4af37] text-zinc-950 min-h-[44px] flex items-center gap-2 cursor-pointer"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <BookOpen className="w-4 h-4" />
              <span>Publicar en el Blog</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

