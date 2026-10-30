import { db } from '@/db';
import { products, services, shippingZones, blogPosts } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';

let schemaEnsured = false;

/**
 * Asegura de forma idempotente que todas las tablas y columnas nuevas de v0.4.0
 * existan en PostgreSQL (tanto en desarrollo local como en Coolify en producción)
 * sin requerir ejecución manual de migraciones por consola.
 */
export async function ensureExtendedSchema(): Promise<void> {
  if (schemaEnsured) return;

  try {
    // 1. Nuevas columnas en tablas existentes
    await db.execute(sql`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS suggested_product_ids TEXT DEFAULT '[]';
    `);

    await db.execute(sql`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS group_booking_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS attached_products_json TEXT;
    `);

    // 2. Tabla de Productos (Inventario & Tienda)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL DEFAULT 'HAIR',
        price NUMERIC(10, 2) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        image_url TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        featured BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Tabla de Zonas de Envío por Cadete (Catamarca Capital y alrededores)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shipping_zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Tabla de Órdenes de Compra de Productos
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        delivery_type VARCHAR(30) NOT NULL DEFAULT 'PICKUP',
        shipping_zone_id UUID,
        shipping_zone_name VARCHAR(255),
        shipping_address TEXT,
        shipping_notes TEXT,
        items_json TEXT NOT NULL,
        products_subtotal NUMERIC(10, 2) NOT NULL,
        shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
        total_paid NUMERIC(10, 2) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',
        payment_method payment_method NOT NULL DEFAULT 'MERCADOPAGO',
        payment_status payment_status NOT NULL DEFAULT 'PENDING',
        mp_preference_id VARCHAR(255),
        mp_payment_id VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 5. Tabla de Blog & Portfolio de Trabajos
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        image_url TEXT NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'Corte & Estilo',
        service_id UUID,
        products_used_json TEXT NOT NULL DEFAULT '[]',
        published BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 6. Tabla de Credenciales Biométricas WebAuthn (Huella / Rostro en Android)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS passkey_credentials (
        id VARCHAR(512) PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_public_key TEXT NOT NULL,
        counter INTEGER NOT NULL DEFAULT 0,
        credential_device_type VARCHAR(50) NOT NULL DEFAULT 'multiDevice',
        credential_backed_up BOOLEAN NOT NULL DEFAULT false,
        transports TEXT NOT NULL DEFAULT '["internal","hybrid"]',
        device_name VARCHAR(255) NOT NULL DEFAULT 'Celular Android (Huella / Biometría)',
        aaguid VARCHAR(100) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ
      );
    `);

    // 7. Semillado inicial de Zonas de Cadete (Catamarca Capital y alrededores) si está vacío
    const existingZones = await db.select().from(shippingZones).limit(1);
    if (existingZones.length === 0) {
      await db.insert(shippingZones).values([
        {
          name: 'Catamarca Capital (Centro / 4 Avenidas y barrios cercanos)',
          description: 'Envío en el día con cadete de la barbería dentro de San Fernando del Valle de Catamarca',
          price: '2500.00',
          active: true,
          displayOrder: 1,
        },
        {
          name: 'Valle Viejo (Villa Dolores, Santa Rosa, San Isidro)',
          description: 'Envío por cadete a zona Valle Viejo',
          price: '3500.00',
          active: true,
          displayOrder: 2,
        },
        {
          name: 'Sumalao / Pozo El Mistol',
          description: 'Envío por cadete a zona Sumalao y alrededores',
          price: '3800.00',
          active: true,
          displayOrder: 3,
        },
        {
          name: 'Fray Mamerto Esquiú / Banda de Varela',
          description: 'Envío por cadete a Banda de Varela y Fray Mamerto Esquiú',
          price: '4200.00',
          active: true,
          displayOrder: 4,
        },
      ]);
    }

    // 8. Semillado inicial de Productos Profesionales si está vacío + Vinculación con Servicios
    const existingProducts = await db.select().from(products).limit(1);
    if (existingProducts.length === 0) {
      const insertedProducts = await db
        .insert(products)
        .values([
          {
            name: 'Cera Modeladora Efecto Mate',
            description:
              'Fijación media-alta sin brillo graso. Ideal para peinados texturizados, crop y estilos naturales de larga duración.',
            category: 'HAIR',
            price: '12000.00',
            stock: 15,
            imageUrl: '/images/interior-sillas.webp',
            active: true,
            featured: true,
          },
          {
            name: 'Polvo Texturizador Voluminizador',
            description:
              'Aporta volumen instantáneo desde la raíz y control mate ultraligero para cabellos finos o degradados.',
            category: 'HAIR',
            price: '14000.00',
            stock: 12,
            imageUrl: '/images/interior-espejos.webp',
            active: true,
            featured: true,
          },
          {
            name: 'Aceite Nutritivo de Barba Premium',
            description:
              'Hidrata profundamente el vello facial y la piel, evita la picazón y deja un aroma amaderado de autor.',
            category: 'BEARD',
            price: '13500.00',
            stock: 10,
            imageUrl: '/images/cartel-diogo.webp',
            active: true,
            featured: true,
          },
          {
            name: 'Bálsamo Modelador After-Shave & Barba',
            description:
              'Calma la irritación post-navaja y doma los vellos rebeldes de la barba con fijación suave.',
            category: 'COMBO',
            price: '13000.00',
            stock: 10,
            imageUrl: '/images/interior-sillas.webp',
            active: true,
            featured: false,
          },
        ])
        .returning();

      const hairIds = insertedProducts
        .filter((p) => p.category === 'HAIR')
        .map((p) => p.id);
      const beardIds = insertedProducts
        .filter((p) => p.category === 'BEARD' || p.category === 'COMBO')
        .map((p) => p.id);
      const allIds = insertedProducts.map((p) => p.id);

      // Vincular automáticamente sugerencias inteligentes a los servicios existentes
      const allServices = await db.select().from(services);
      for (const srv of allServices) {
        const lower = srv.name.toLowerCase();
        let suggested: string[] = [];
        if (lower.includes('corte') && lower.includes('barba')) {
          suggested = allIds; // Sugiere productos de cabello + barba
        } else if (lower.includes('barba')) {
          suggested = beardIds; // Sugiere aceite y bálsamo de barba
        } else {
          suggested = hairIds; // Sugiere cera mate y polvo texturizador para el pelo
        }

        await db
          .update(services)
          .set({ suggestedProductIds: JSON.stringify(suggested) })
          .where(eq(services.id, srv.id));
      }

      // 9. Semillado inicial de Blog / Trabajos de Diogo si está vacío
      const existingPosts = await db.select().from(blogPosts).limit(1);
      if (existingPosts.length === 0) {
        const corteService = allServices.find((s) =>
          s.name.toLowerCase().includes('corte')
        );
        await db.insert(blogPosts).values([
          {
            title: 'Mid Fade de Precisión + Textura en Cima con Acabado Mate',
            slug: 'mid-fade-precision-textura-mate',
            excerpt:
              'Degradado medio limpio a navaja combinado con desconexión superior trabajada a tijera y sellado con polvo texturizador.',
            content:
              'En este trabajo realizamos un Mid Fade progresivo cuidando la transición en la zona parietal para mantener una estructura masculina y cuadrada.\n\nEn la zona superior trabajamos textura a tijera y point-cutting para lograr movimiento natural sin peso excesivo. Para el peinado final aplicamos Polvo Texturizador en raíz y Cera Efecto Mate en puntas, logrando fijación todo el día sin rastro graso.',
            imageUrl: '/images/interior-sillas.webp',
            category: 'Fade & Textura',
            serviceId: corteService?.id || null,
            productsUsedJson: JSON.stringify(hairIds),
            published: true,
          },
          {
            title: 'Perfilado Esculpido de Barba a Vapor & Degradé Clásico',
            slug: 'perfilado-barba-vapor-degrade-clasico',
            excerpt:
              'Alineación geométrica con navaja, rebaje gradual de volumen e hidratación profunda con aceite nutritivo.',
            content:
              'El ritual completo de Corte + Barba en Diogo Barber Shop: primero definimos las líneas de mejilla y cuello respetando las facciones del rostro.\n\nLuego aplicamos Bálsamo After-Shave en las zonas afeitadas a navaja y finalizamos con 4 gotas de Aceite Nutritivo de Barba para suavizar la fibra y darle un brillo sano y prolijo.',
            imageUrl: '/images/interior-espejos.webp',
            category: 'Barba & Ritual',
            serviceId: corteService?.id || null,
            productsUsedJson: JSON.stringify(beardIds),
            published: true,
          },
        ]);
      }
    }

    schemaEnsured = true;
  } catch (error) {
    console.error('[ensureExtendedSchema] Error asegurando esquema extendido:', error);
  }
}

