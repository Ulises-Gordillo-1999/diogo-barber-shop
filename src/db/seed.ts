import { db } from './index';
import { users, services, businessHours } from './schema';
import { hashPassword } from '../utils/auth';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Iniciando semillado de base de datos para Diogo Barber Shop...');

  // 1. Crear Usuario Administrador inicial
  const adminEmail = 'admin@diogobarber.com';
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existingAdmin.length === 0) {
    const passwordHash = await hashPassword('admin1234');
    await db.insert(users).values({
      name: 'Diogo Barber',
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      phone: '+5491100000000',
      active: true,
    });
    console.log(`✅ Administrador creado: ${adminEmail} / admin1234`);
  } else {
    console.log(`ℹ️ El administrador ${adminEmail} ya existe.`);
  }

  // 2. Crear Servicios Oficiales de Diogo Barber Shop
  const initialServices = [
    {
      name: 'Corte de Cabello',
      description:
        'Corte clásico o moderno personalizado a máquina y tijera, con degradé o estilo a elección y terminación a navaja.',
      durationMinutes: 30,
      price: '25000.00',
      imageUrl: '/images/galeria-1.webp',
      displayOrder: 1,
      active: true,
    },
    {
      name: 'Corte + Barba',
      description:
        'El servicio completo de Diogo Barber Shop: corte de cabello personalizado más perfilado, rebaje y arreglo de barba.',
      durationMinutes: 40,
      price: '30000.00',
      imageUrl: '/images/galeria-4.webp',
      displayOrder: 2,
      active: true,
    },
    {
      name: 'Barba (Perfilado & Arreglo)',
      description:
        'Esculpido y perfilado de barba con navaja, rebaje prolijo e hidratación con productos profesionales.',
      durationMinutes: 20,
      price: '15000.00',
      imageUrl: '/images/galeria-3.webp',
      displayOrder: 3,
      active: true,
    },
    {
      name: 'Color / Tintura',
      description:
        'Coloración masculina, reflejos, platinado o cobertura con productos de primera línea.',
      durationMinutes: 30,
      price: '35000.00',
      imageUrl: '/images/galeria-2.webp',
      displayOrder: 4,
      active: true,
    },
  ];

  for (const s of initialServices) {
    const existing = await db
      .select()
      .from(services)
      .where(eq(services.name, s.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(services).values(s);
      console.log(`✅ Servicio creado: ${s.name} ($${s.price})`);
    } else {
      console.log(`ℹ️ Servicio existente: ${s.name}`);
    }
  }

  // 3. Configurar Horarios Laborales Semanales
  // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const existingHours = await db.select().from(businessHours);

  if (existingHours.length === 0) {
    const weeklySchedule = [
      {
        dayOfWeek: 0, // Domingo (Cerrado)
        isOpen: false,
        openTime: '10:00',
        closeTime: '13:00',
        hasBreak: false,
      },
      {
        dayOfWeek: 1, // Lunes
        isOpen: true,
        openTime: '10:00',
        closeTime: '13:00',
        hasBreak: true,
        openTime2: '17:30',
        closeTime2: '22:00',
      },
      {
        dayOfWeek: 2, // Martes
        isOpen: true,
        openTime: '10:00',
        closeTime: '13:00',
        hasBreak: true,
        openTime2: '17:30',
        closeTime2: '22:00',
      },
      {
        dayOfWeek: 3, // Miércoles
        isOpen: true,
        openTime: '10:00',
        closeTime: '13:00',
        hasBreak: true,
        openTime2: '17:30',
        closeTime2: '22:00',
      },
      {
        dayOfWeek: 4, // Jueves
        isOpen: true,
        openTime: '10:00',
        closeTime: '13:00',
        hasBreak: true,
        openTime2: '17:30',
        closeTime2: '22:00',
      },
      {
        dayOfWeek: 5, // Viernes
        isOpen: true,
        openTime: '10:00',
        closeTime: '13:00',
        hasBreak: true,
        openTime2: '17:30',
        closeTime2: '22:00',
      },
      {
        dayOfWeek: 6, // Sábado
        isOpen: true,
        openTime: '10:00',
        closeTime: '13:00',
        hasBreak: true,
        openTime2: '17:30',
        closeTime2: '22:00',
      },
    ];

    await db.insert(businessHours).values(weeklySchedule);
    console.log('✅ Horarios semanales configurados (Lunes a Sábado 10:00-13:00 y 17:30-22:00).');
  } else {
    console.log('ℹ️ Los horarios de atención ya estaban configurados.');
  }

  console.log('🎉 Semillado completado con éxito.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error durante el semillado:', err);
  process.exit(1);
});
