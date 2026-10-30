# Implementation Plan: Diogo Barber Shop Web System

## Overview
Construcción y evolución del ecosistema web integral para **Diogo Barber Shop** (@diogobarbershopp):
1. Reserva pública express con cobro anticipado 100% mediante Mercado Pago Checkout Pro, bloqueo anti-colisión de 10 minutos y portal de autogestión de reprogramación (`/mi-turno`).
2. **Reserva Múltiple (Amigos y Pack Mensual a 30 días):** Carrito de turnos que permite reservar 1, 2, 3 o más turnos (en el mismo día o en distintos días del mes) y abonarlos en un único Checkout Pro.
3. **E-Commerce de Barbería, Stock & Envíos por Cadete (`/tienda` y `/dashboard/inventario`):** Catálogo de productos con control de stock, compra online con Mercado Pago, opción de Retiro en Local ($0) o Envío por Cadete (Catamarca Capital, Valle Viejo, Sumalao, etc.) con separación contable automática en Caja (`PRODUCT_SALE` sin inflar ganancias con el costo del cadete).
4. **Cross-Selling / Sugerencia Inteligente de Productos en Reserva:** Asociación de productos recomendados por servicio en la Carta de Servicios y sugerencia de 1 toque durante la reserva del turno.
5. **Blog & Portfolio de Trabajos (`/blog` y `/dashboard/blog`):** Publicación de cortes realizados, técnica aplicada y productos utilizados con links directos a reserva y compra.
6. **PWA Instalable en Android + Acceso Biométrico (WebAuthn Passkeys):** Aplicación instalable en pantalla completa para el celular de Diogo con inicio de sesión por huella digital / rostro.

## Architecture Decisions
1. **Drizzle ORM sobre PostgreSQL 16 + Auto-Migración Idempotente (`ensureExtendedSchema`):** Esquemas declarativos en `src/db/schema.ts` acompañados de verificación `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN IF NOT EXISTS` en el arranque para despliegue zero-touch en Coolify v4.
2. **Zona Horaria Estricta (`America/Argentina/Catamarca` / `UTC-3`):** Generación de fechas `YYYY-MM-DD` fijada en zona horaria de Catamarca (`formatDateStrArgentina`) evitando saltos de día cuando el reloj UTC pasa las 00:00 (21:00 hs Argentina).
3. **Separación Contable Producto vs. Cadete:** En pedidos de productos con envío, Mercado Pago cobra `subtotalProductos + shippingCost`, pero el Webhook de confirmación acredita en `cash_transactions` únicamente `subtotalProductos` bajo la categoría `PRODUCT_SALE`, dejando el monto del cadete discriminado en la orden de entrega.
4. **WebAuthn / Passkeys Estándar (`@simplewebauthn/server` + `webauthn-polyfills`):** Implementación de registro y autenticación biométrica siguiendo las guías oficiales de `modern-web-guidance` (`passkeys`, `passkey-registration`, `passkey-authentication`).

---

## Fases del Proyecto

### Fases 1 a 6: Núcleo Operativo v0.1.0 – v0.3.0 [COMPLETADAS]
- [x] Fase 1: Scaffolding, Base de Datos & Arquitectura Base
- [x] Fase 2: Autenticación, Catálogo Inicial & Semillado
- [x] Fase 3: Módulo Público de Reserva Express & Integración Mercado Pago + Autogestión `/mi-turno`
- [x] Fase 4: Panel de Agenda, Carga Manual & Reprogramación Ágil
- [x] Fase 5: Módulo de Caja, Finanzas & Reportes PDF
- [x] Fase 6: Configuración de Servicios, Horarios & Bloqueos

### Fase 7: Corrección de Fechas (Bug Domingo UTC-3) & Esquema Extendido de BD
- [ ] Task 7.1: Utilidad `getUpcomingDatesArgentina(days)` y test unitario TDD que verifica que a las 22:30 hs de Argentina (01:30 UTC del día siguiente) la fecha `dateStr` coincide exactamente con el día local y que los días cerrados (Domingo) se identifican y bloquean.
- [ ] Task 7.2: Extensión de `src/db/schema.ts` y `src/db/ensureSchema.ts` con tablas `products`, `shipping_zones`, `product_orders`, `blog_posts`, `passkey_credentials` y columnas de multi-turno y productos sugeridos.

### Checkpoint 1: Fechas UTC-3 y Esquema Extendido
- [ ] Tests de zona horaria y disponibilidad pasando al 100%.
- [ ] Esquema Drizzle compilando con cero errores TypeScript.

### Fase 8: Inventario de Productos, Zonas de Cadete & Tienda Pública (`/tienda`)
- [ ] Task 8.1: Server Actions de Inventario, Zonas de Envío (Catamarca Capital, Valle Viejo, Sumalao, etc.) y Órdenes de Productos con Mercado Pago + separación contable en Webhook.
- [ ] Task 8.2: Panel Administrativo `/dashboard/inventario` (ABM de Productos con stock, foto, categoría; configuración de Zonas de Cadete; listado de Pedidos por entregar/enviar).
- [ ] Task 8.3: Tienda Pública `/tienda` con carrito de compras, selector de Retiro en Barbería vs. Envío por Cadete (Catamarca Capital y alrededores) y pago por Mercado Pago.

### Fase 9: Multi-Turnos (Amigos y Pack Mensual 30 días) + Upselling de Productos por Servicio
- [ ] Task 9.1: Vincular productos sugeridos a cada servicio en `/dashboard/servicios` (`suggestedProductIds`).
- [ ] Task 9.2: Actualizar `BookingWizard.tsx` y `bookingActions.ts` para soportar calendario de 30 días, carrito de múltiples turnos (amigos el mismo día o 3-4 cortes en el mes) y agregado de productos sugeridos en el mismo pago de Mercado Pago.

### Checkpoint 2: E-Commerce, Multi-Turnos y Webhook Contable
- [ ] Tests unitarios de órdenes, multi-turnos y separación contable de cadete en verde.

### Fase 10: Blog & Portfolio de Trabajos (`/blog` y `/dashboard/blog`)
- [ ] Task 10.1: Server Actions y Panel `/dashboard/blog` para publicar cortes, descripción técnica, fotos y productos utilizados.
- [ ] Task 10.2: Página pública `/blog` y sección destacada en Home (`/`) mostrando los trabajos de Diogo con botones para reservar ese servicio o comprar los productos usados.

### Fase 11: PWA Instalable en Android + Acceso Biométrico (Huella / Passkeys)
- [ ] Task 11.1: Web App Manifest (`src/app/manifest.ts`), Service Worker (`public/sw.js`) y botón de instalación rápida de la App Android en el panel y login.
- [ ] Task 11.2: Endpoints y componentes WebAuthn (`/api/auth/passkey/*`) para registrar la huella digital del celular de Diogo en el panel e iniciar sesión con 1 toque en `/login`.

### Checkpoint Final: Suite TDD Completa, Build & Release SemVer v0.4.0
- [ ] Todos los tests en `vitest` pasando.
- [ ] `npx tsc --noEmit` con 0 errores.
- [ ] Incremento SemVer MINOR (`0.3.0` -> `0.4.0`) y push a GitHub.
