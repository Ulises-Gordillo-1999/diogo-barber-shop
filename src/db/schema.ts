import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// 1. ENUMS (PostgreSQL)
// ==========================================

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'BARBER']);

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'PENDING_PAYMENT', // Bloqueo temporal anti-colisión (10 minutos)
  'CONFIRMED',       // Pagado al 100% o agendado por el barbero
  'COMPLETED',       // Servicio brindado con éxito
  'RESCHEDULED',     // Reubicado en otro horario
  'CANCELLED',       // Venció el tiempo o cancelado manualmente
  'NO_SHOW',         // El cliente no asistió al turno
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'MERCADOPAGO',
  'CASH',
  'TRANSFER',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REFUNDED',
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
  'INCOME',
  'EXPENSE',
]);

export const transactionCategoryEnum = pgEnum('transaction_category', [
  // Categorías de Ingresos
  'APPOINTMENT',     // Cobro de turno (Mercado Pago o presencial)
  'PRODUCT_SALE',   // Venta de ceras, aceites, pomadas, navajas
  'OTHER_INCOME',   // Otros ingresos
  // Categorías de Egresos
  'SUPPLIES',       // Insumos descartables (filos, hojas, talco, toallas)
  'PRODUCTS_STOCK', // Reposición de mercadería para venta
  'RENT',           // Alquiler del local
  'SERVICES',       // Servicios públicos (Luz, Agua, Internet, Gas)
  'MAINTENANCE',    // Afilado de máquinas, arreglos, limpieza
  'WITHDRAWAL',     // Retiro de ganancias del dueño/barbero
  'OTHER_EXPENSE',  // Otros gastos operativos
]);

// ==========================================
// 2. TABLAS
// ==========================================

/**
 * Tabla de Usuarios (Administrador y Barberos para acceso al panel)
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').default('BARBER').notNull(),
  phone: varchar('phone', { length: 50 }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Catálogo de Servicios de la Barbería
 */
export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(), // Ej: 30, 45, 60
  price: numeric('price', { precision: 10, scale: 2 }).notNull(), // Monto en ARS
  active: boolean('active').default(true).notNull(),
  imageUrl: text('image_url'),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Configuración de Horarios Laborales de Atención Semanal
 * 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
 */
export const businessHours = pgTable('business_hours', {
  id: uuid('id').defaultRandom().primaryKey(),
  dayOfWeek: integer('day_of_week').notNull(), // 0: Domingo a 6: Sábado
  isOpen: boolean('is_open').default(true).notNull(),
  openTime: varchar('open_time', { length: 5 }).notNull(),   // Ej: "10:00"
  closeTime: varchar('close_time', { length: 5 }).notNull(), // Ej: "13:00"
  hasBreak: boolean('has_break').default(false).notNull(),
  openTime2: varchar('open_time_2', { length: 5 }),          // Ej: "17:00"
  closeTime2: varchar('close_time_2', { length: 5 }),        // Ej: "21:00"
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Bloqueos Rápidos de Agenda (Feriados, Vacaciones, Días libres o Franjas puntuales)
 */
export const scheduleBlocks = pgTable('schedule_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  reason: text('reason'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  isAllDay: boolean('is_all_day').default(false).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Turnos de Barbería (Públicos sin cuenta previa y Gestión de Agenda)
 */
export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serviceId: uuid('service_id')
      .references(() => services.id, { onDelete: 'restrict' })
      .notNull(),
    barberId: uuid('barber_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 50 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }),
    customerNotes: text('customer_notes'),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    status: appointmentStatusEnum('status').default('PENDING_PAYMENT').notNull(),
    // Bloqueo temporal: expira en 10 min si no se abona
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum('payment_method')
      .default('MERCADOPAGO')
      .notNull(),
    paymentStatus: paymentStatusEnum('payment_status')
      .default('PENDING')
      .notNull(),
    // Referencias Mercado Pago Checkout Pro
    mpPreferenceId: varchar('mp_preference_id', { length: 255 }),
    mpPaymentId: varchar('mp_payment_id', { length: 255 }),
    mpMerchantOrderId: varchar('mp_merchant_order_id', { length: 255 }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    rescheduledFromId: uuid('rescheduled_from_id'),
    internalNotes: text('internal_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_appointments_start_time').on(table.startTime),
    index('idx_appointments_status').on(table.status),
    index('idx_appointments_expires_at').on(table.expiresAt),
    index('idx_appointments_customer_phone').on(table.customerPhone),
  ]
);

/**
 * Movimientos de Caja / Finanzas (Libro Diario de Ingresos y Egresos)
 */
export const cashTransactions = pgTable(
  'cash_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: transactionTypeEnum('type').notNull(),
    category: transactionCategoryEnum('category').notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    description: text('description').notNull(),
    appointmentId: uuid('appointment_id').references(() => appointments.id, {
      onDelete: 'set null',
    }),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    transactionDate: timestamp('transaction_date', { withTimezone: true })
      .defaultNow()
      .notNull(),
    receiptUrl: text('receipt_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_cash_tx_date').on(table.transactionDate),
    index('idx_cash_tx_type').on(table.type),
    index('idx_cash_tx_category').on(table.category),
    index('idx_cash_tx_payment_method').on(table.paymentMethod),
  ]
);

// ==========================================
// 3. RELACIONES (Drizzle ORM Relations)
// ==========================================

export const usersRelations = relations(users, ({ many }) => ({
  appointments: many(appointments),
  scheduleBlocks: many(scheduleBlocks),
  cashTransactions: many(cashTransactions),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  appointments: many(appointments),
}));

export const scheduleBlocksRelations = relations(scheduleBlocks, ({ one }) => ({
  creator: one(users, {
    fields: [scheduleBlocks.createdBy],
    references: [users.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
  barber: one(users, {
    fields: [appointments.barberId],
    references: [users.id],
  }),
  transactions: many(cashTransactions),
}));

export const cashTransactionsRelations = relations(
  cashTransactions,
  ({ one }) => ({
    appointment: one(appointments, {
      fields: [cashTransactions.appointmentId],
      references: [appointments.id],
    }),
    user: one(users, {
      fields: [cashTransactions.userId],
      references: [users.id],
    }),
  })
);

// ==========================================
// 4. TIPADOS TS INFERIDOS
// ==========================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;

export type BusinessHour = typeof businessHours.$inferSelect;
export type NewBusinessHour = typeof businessHours.$inferInsert;

export type ScheduleBlock = typeof scheduleBlocks.$inferSelect;
export type NewScheduleBlock = typeof scheduleBlocks.$inferInsert;

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

export type CashTransaction = typeof cashTransactions.$inferSelect;
export type NewCashTransaction = typeof cashTransactions.$inferInsert;
