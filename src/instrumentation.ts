import { sql } from 'drizzle-orm';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { db } = await import('./db');
      const { users, services, businessHours } = await import('./db/schema');
      const bcrypt = await import('bcryptjs');

      // 1. Crear ENUMs de forma idempotente si no existen en una base de datos nueva (ej. VPS Coolify)
      await db.execute(sql`
        DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('ADMIN', 'BARBER');
        EXCEPTION WHEN duplicate_object THEN null; END $$;

        DO $$ BEGIN
          CREATE TYPE appointment_status AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'NO_SHOW');
        EXCEPTION WHEN duplicate_object THEN null; END $$;

        DO $$ BEGIN
          CREATE TYPE payment_method AS ENUM ('MERCADOPAGO', 'CASH', 'TRANSFER');
        EXCEPTION WHEN duplicate_object THEN null; END $$;

        DO $$ BEGIN
          CREATE TYPE payment_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED');
        EXCEPTION WHEN duplicate_object THEN null; END $$;

        DO $$ BEGIN
          CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');
        EXCEPTION WHEN duplicate_object THEN null; END $$;

        DO $$ BEGIN
          CREATE TYPE transaction_category AS ENUM ('APPOINTMENT', 'PRODUCT_SALE', 'OTHER_INCOME', 'SUPPLIES', 'PRODUCTS_STOCK', 'RENT', 'SERVICES', 'MAINTENANCE', 'WITHDRAWAL', 'OTHER_EXPENSE');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
      `);

      // 2. Crear Tablas si no existen
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role user_role NOT NULL DEFAULT 'BARBER',
          phone VARCHAR(50),
          active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS services (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          duration_minutes INTEGER NOT NULL,
          price NUMERIC(10, 2) NOT NULL,
          active BOOLEAN NOT NULL DEFAULT true,
          image_url TEXT,
          display_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS business_hours (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          day_of_week INTEGER NOT NULL,
          is_open BOOLEAN NOT NULL DEFAULT true,
          open_time VARCHAR(5) NOT NULL,
          close_time VARCHAR(5) NOT NULL,
          has_break BOOLEAN NOT NULL DEFAULT false,
          open_time_2 VARCHAR(5),
          close_time_2 VARCHAR(5),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS schedule_blocks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          reason TEXT,
          start_date TIMESTAMPTZ NOT NULL,
          end_date TIMESTAMPTZ NOT NULL,
          is_all_day BOOLEAN NOT NULL DEFAULT false,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS appointments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
          barber_id UUID REFERENCES users(id) ON DELETE SET NULL,
          customer_name VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(50) NOT NULL,
          customer_email VARCHAR(255),
          customer_notes TEXT,
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ NOT NULL,
          status appointment_status NOT NULL DEFAULT 'PENDING_PAYMENT',
          expires_at TIMESTAMPTZ,
          price NUMERIC(10, 2) NOT NULL,
          payment_method payment_method NOT NULL DEFAULT 'MERCADOPAGO',
          payment_status payment_status NOT NULL DEFAULT 'PENDING',
          mp_preference_id VARCHAR(255),
          mp_payment_id VARCHAR(255),
          mp_merchant_order_id VARCHAR(255),
          cancelled_at TIMESTAMPTZ,
          cancellation_reason TEXT,
          rescheduled_from_id UUID,
          internal_notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS cash_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type transaction_type NOT NULL,
          category transaction_category NOT NULL,
          amount NUMERIC(10, 2) NOT NULL,
          payment_method payment_method NOT NULL,
          description TEXT NOT NULL,
          appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          receipt_url TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // 3. Seed automático inicial si la base de datos está recién creada
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length === 0) {
        const passwordHash = await bcrypt.hash('admin1234', 10);
        await db.insert(users).values({
          name: 'Diego Rodolfo Nieva (Diogo)',
          email: 'admin@diogobarber.com',
          passwordHash,
          role: 'ADMIN',
          phone: '5493834064982',
          active: true,
        });
      }

      const existingServices = await db.select().from(services).limit(1);
      if (existingServices.length === 0) {
        await db.insert(services).values([
          {
            name: 'Corte de Cabello',
            description:
              'Corte clásico o moderno personalizado, fade, degradado, tijera o máquina con terminación a navaja.',
            durationMinutes: 30,
            price: '25000.00',
            displayOrder: 1,
            active: true,
          },
          {
            name: 'Corte + Barba',
            description:
              'Servicio completo de corte de cabello más perfilado, rebaje e hidratación de barba.',
            durationMinutes: 40,
            price: '30000.00',
            displayOrder: 2,
            active: true,
          },
          {
            name: 'Barba (Perfilado & Arreglo)',
            description:
              'Alineado y rebaje de barba con máquina y ritual de terminación a navaja.',
            durationMinutes: 20,
            price: '15000.00',
            displayOrder: 3,
            active: true,
          },
          {
            name: 'Color / Tintura',
            description:
              'Aplicación de color, reflejos o platinado profesional con productos de primera línea.',
            durationMinutes: 30,
            price: '35000.00',
            displayOrder: 4,
            active: true,
          },
        ]);
      }

      const existingHours = await db.select().from(businessHours).limit(1);
      if (existingHours.length === 0) {
        const days = [
          { dayOfWeek: 0, isOpen: false, openTime: '10:00', closeTime: '13:00', hasBreak: false, openTime2: null, closeTime2: null },
          { dayOfWeek: 1, isOpen: true, openTime: '10:00', closeTime: '13:00', hasBreak: true, openTime2: '17:30', closeTime2: '22:00' },
          { dayOfWeek: 2, isOpen: true, openTime: '10:00', closeTime: '13:00', hasBreak: true, openTime2: '17:30', closeTime2: '22:00' },
          { dayOfWeek: 3, isOpen: true, openTime: '10:00', closeTime: '13:00', hasBreak: true, openTime2: '17:30', closeTime2: '22:00' },
          { dayOfWeek: 4, isOpen: true, openTime: '10:00', closeTime: '13:00', hasBreak: true, openTime2: '17:30', closeTime2: '22:00' },
          { dayOfWeek: 5, isOpen: true, openTime: '10:00', closeTime: '13:00', hasBreak: true, openTime2: '17:30', closeTime2: '22:00' },
          { dayOfWeek: 6, isOpen: true, openTime: '10:00', closeTime: '13:00', hasBreak: true, openTime2: '17:30', closeTime2: '22:00' },
        ];
        await db.insert(businessHours).values(days);
      }
    } catch (error) {
      console.error('[Instrumentation] Error verificando esquema inicial:', error);
    }
  }
}

