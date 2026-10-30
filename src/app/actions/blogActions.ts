'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { blogPosts } from '@/db/schema';
import { ensureExtendedSchema } from '@/db/ensureSchema';
import { eq, desc } from 'drizzle-orm';
import { getSession } from '@/utils/auth';
import { optimizeImageToWebpDataUri } from './productActions';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function getBlogPostsAction(onlyPublished = false) {
  await ensureExtendedSchema();
  const list = await db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.createdAt));

  return onlyPublished ? list.filter((p) => p.published) : list;
}

export async function saveBlogPostAction(input: {
  id?: string;
  title: string;
  excerpt?: string;
  content: string;
  imageUrl?: string;
  category?: string;
  serviceId?: string | null;
  productsUsedIds?: string[];
  published?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'No autorizado.' };

    await ensureExtendedSchema();

    if (!input.title.trim() || !input.content.trim()) {
      return {
        success: false,
        error: 'El título y la descripción del trabajo son obligatorios.',
      };
    }

    const optimizedImage = await optimizeImageToWebpDataUri(
      input.imageUrl || '/images/interior-sillas.webp'
    );
    const slug = `${slugify(input.title)}-${Date.now().toString().slice(-4)}`;

    if (input.id) {
      await db
        .update(blogPosts)
        .set({
          title: input.title.trim(),
          excerpt: input.excerpt?.trim() || null,
          content: input.content.trim(),
          imageUrl: optimizedImage,
          category: input.category?.trim() || 'Corte & Estilo',
          serviceId: input.serviceId || null,
          productsUsedJson: JSON.stringify(input.productsUsedIds || []),
          published: input.published ?? true,
          updatedAt: new Date(),
        })
        .where(eq(blogPosts.id, input.id));
    } else {
      await db.insert(blogPosts).values({
        title: input.title.trim(),
        slug,
        excerpt: input.excerpt?.trim() || null,
        content: input.content.trim(),
        imageUrl: optimizedImage,
        category: input.category?.trim() || 'Corte & Estilo',
        serviceId: input.serviceId || null,
        productsUsedJson: JSON.stringify(input.productsUsedIds || []),
        published: input.published ?? true,
      });
    }

    revalidatePath('/dashboard/blog');
    revalidatePath('/blog');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error guardando publicación de blog:', error);
    return { success: false, error: 'No se pudo guardar la publicación.' };
  }
}

export async function deleteBlogPostAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'No autorizado.' };

    await ensureExtendedSchema();
    await db.delete(blogPosts).where(eq(blogPosts.id, id));

    revalidatePath('/dashboard/blog');
    revalidatePath('/blog');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error eliminando post del blog:', error);
    return { success: false, error: 'No se pudo eliminar la publicación.' };
  }
}

