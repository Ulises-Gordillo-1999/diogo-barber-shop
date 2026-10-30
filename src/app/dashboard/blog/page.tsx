import { AppLayout } from '@/components/layout/AppLayout';
import { BlogManager } from '@/components/blog/BlogManager';
import { getBlogPostsAction } from '@/app/actions/blogActions';
import { getProductsAction } from '@/app/actions/productActions';
import { db } from '@/db';
import { services } from '@/db/schema';
import { asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function BlogDashboardPage() {
  const [posts, productsList, servicesList] = await Promise.all([
    getBlogPostsAction(false),
    getProductsAction(false),
    db.select().from(services).orderBy(asc(services.displayOrder)),
  ]);

  return (
    <AppLayout>
      <BlogManager
        initialPosts={posts}
        products={productsList}
        services={servicesList}
      />
    </AppLayout>
  );
}

