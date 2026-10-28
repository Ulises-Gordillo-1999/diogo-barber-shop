# Implementation Plan: Diogo Barber Shop Web System

## Overview
Construcción y despliegue del sistema web para **Diogo Barber Shop** enfocado en reserva pública de turnos express para Instagram con cobro anticipado 100% mediante Mercado Pago Checkout Pro, bloqueo temporal anti-colisión de 10 minutos, agenda operativa para el barbero con reprogramación ágil por WhatsApp y libro mayor financiero de caja (ingresos automáticos y egresos con reportes PDF).

## Architecture Decisions
1. **Drizzle ORM sobre PostgreSQL 16 nativo:** Máxima velocidad de ejecución en contenedor Docker / Coolify con cero latencia de binarios. Esquemas estrictamente tipados en TypeScript con enums de base de datos.
2. **Bloqueo Temporal Anti-Colisión (10 min):** Al momento de presionar *"Pagar y Confirmar"*, el turno se guarda en `PENDING_PAYMENT` con `expiresAt = NOW() + 10 minutos`. Las consultas de disponibilidad ignoran turnos expirados en estado pendiente, liberando automáticamente el hueco sin necesidad de crons complejos.
3. **Checkout Pro + Webhooks Criptográficos:** La preferencia de Mercado Pago tiene vencimiento sincronizado con el turno. El webhook en `/api/webhooks/mercadopago` valida `x-signature`, actualiza el turno a `CONFIRMED` e inserta automáticamente la transacción en `cash_transactions`.
4. **Ergonomía Mobile-First & Anti-Flicker:** Enfoque prioritario en clientes que acceden desde el navegador de Instagram: inputs $\ge 16\text{px}$ para prevenir auto-zoom en iOS Safari, touch targets $\ge 44\text{px}$, script inline anti-flicker en `<head>` y React Portals para todos los modales.
5. **Autenticación Ligera Propia:** JWT con `jose` en cookies `HttpOnly`, `SameSite=Lax`, `Secure`, con contraseñas hash con `bcryptjs` y protección por middleware (`src/middleware.ts`).

---

## Fases del Proyecto

### Fase 1: Scaffolding, Base de Datos & Arquitectura Base (Completada en este paso)
- [x] Configuración de Next.js 16+, React 19, Tailwind CSS v4, Dockerfile multi-stage y docker-compose.yml.
- [x] Esquema Drizzle ORM (`src/db/schema.ts`) con tablas: `users`, `services`, `business_hours`, `schedule_blocks`, `appointments`, `cash_transactions` y sus relaciones.
- [x] Arquitectura de temas Claro/Oscuro/Sistema (`theme-mode-system`) y componentes base (`AppLayout`, `ThemeToggle`, `Modal`).
- [x] Configuración de JWT (`jose`), `bcryptjs` y `middleware.ts`.

### Fase 2: Autenticación, Catálogo Inicial & Semillado de Base de Datos [Completada]
- [x] Task 2.1: Script de semillado (`seed.ts`) con usuario administrador inicial y catálogo de servicios típicos de barbería (Corte clásico, Corte + Barba, Perfilado, etc.) y horarios semanales.
- [x] Task 2.2: Pantalla de Login (`/login`) estilizada con Enterprise Dark / Barbería moderna, validación de credenciales y seteo de cookies seguras.

### Fase 3: Módulo Público de Reserva Express & Integración Mercado Pago [Completada]
- [x] Task 3.1: Algoritmo de cálculo de huecos libres en tiempo real (`getAvailableSlots`) considerando duración de servicio, franjas laborales, bloqueos y turnos vigentes (`CONFIRMED` o `PENDING_PAYMENT` no expirados).
- [x] Task 3.2: Wizard público en 3 pasos (`/reservar`): Selección de servicio, Selección de fecha y hora libre, Datos mínimos del cliente (Nombre y WhatsApp).
- [x] Task 3.3: Server Action de creación de reserva con bloqueo de 10 min y generación de preferencia Checkout Pro en Mercado Pago.
- [x] Task 3.4: Endpoint de Webhooks `/api/webhooks/mercadopago` con validación criptográfica `x-signature`, confirmación de turno e inserción automática en `cash_transactions`.
- [x] Task 3.5: Pantalla de confirmación y estado de pago (`/confirmacion?status=...`).

### Fase 4: Panel de Agenda, Carga Manual & Reprogramación Ágil [Completada]
- [x] Task 4.1: Vista de Agenda diaria y semanal en `/dashboard` con filtros por barbero y estado de turno.
- [x] Task 4.2: Modal de reprogramación en 2 toques con cálculo de nuevos huecos libres y actualización instantánea con `useOptimistic`.
- [x] Task 4.3: Botón de acción directa con deep-link a WhatsApp (`https://wa.me/...`) con mensaje pre-armado de aviso de nuevo horario.
- [x] Task 4.4: Modal de carga de turno manual/presencial con selección de método de pago (`CASH`, `TRANSFER`, `MERCADOPAGO`).

### Fase 5: Módulo de Caja, Finanzas & Reportes PDF [Completada]
- [x] Task 5.1: Libro diario de movimientos en `/dashboard/caja` con filtros por fecha, tipo (`INCOME`/`EXPENSE`) y medio de pago (`MERCADOPAGO`, `CASH`, `TRANSFER`).
- [x] Task 5.2: Tarjetas KPI de métricas en vivo: Ingresos Totales, Egresos Totales y Ganancia Neta.
- [x] Task 5.3: Formulario modal para registro rápido de egresos categorizados (Insumos, Alquiler, Servicios, Retiros) y ventas de productos.
- [x] Task 5.4: Generación y descarga de reporte balance en PDF con `jspdf` y `jspdf-autotable`.

### Fase 6: Configuración de Servicios, Horarios & Bloqueos [Completada]
- [x] Task 6.1: ABM de Servicios en `/dashboard/servicios` (nombre, descripción, duración, precio, activar/desactivar).
- [x] Task 6.2: Configuración de franjas horarias semanales y bloqueos rápidos de fechas (feriados, vacaciones) en `/dashboard/horarios`.

---

## Riesgos y Mitigaciones
| Riesgo | Impacto | Mitigación |
| :--- | :--- | :--- |
| **Race Conditions en Reserva de Turnos** | Alto | Bloqueo temporal inmediato en BD con estado `PENDING_PAYMENT` y `expiresAt = NOW() + 10 min` en transacción atómica. |
| **Notificaciones falsas o repetidas de Webhook** | Alto | Validación estricta de cabecera `x-signature` y verificación de idempotencia en BD (`mpPaymentId` único). |
| **Auto-zoom en iOS al escribir en formularios** | Medio | Todos los inputs cuentan con `text-base md:text-sm` ($\ge 16\text{px}$) según la skill `responsive-design`. |
| **Destello blanco al cargar la página (FOUC)** | Medio | Script inline bloqueante en `<head>` de `layout.tsx` evaluando `localStorage` y media query antes de pintar el DOM. |

## Open Questions
- ¿Desea el barbero que el comprobante de turno incluya código QR de verificación para el cliente o es suficiente con el resumen de confirmación en pantalla y WhatsApp? (Resumen de confirmación en pantalla y link a WhatsApp configurados por defecto).
