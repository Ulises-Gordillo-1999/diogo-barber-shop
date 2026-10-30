# Task List: Diogo Barber Shop Web System

## Fases 1 a 6: Núcleo Operativo v0.1.0 – v0.3.0 [COMPLETADAS]
- [x] Task 1.1 – 1.4: Scaffolding, Drizzle ORM, Theme System, JWT Auth
- [x] Task 2.1 – 2.2: Seed inicial y Login
- [x] Task 3.1 – 3.5: Disponibilidad, BookingWizard, Checkout Pro, Webhook MP, Confirmación y `/mi-turno`
- [x] Task 4.1 – 4.4: Agenda, Reprogramación 2 toques, WhatsApp Alert, Turno Manual
- [x] Task 5.1 – 5.4: Caja, KPIs, Movimientos, Exportación PDF
- [x] Task 6.1 – 6.2: ABM Servicios y Configuración de Horarios/Bloqueos

---

## Fase 7: Corrección de Fechas (Bug Domingo UTC-3) & Esquema Extendido de BD [COMPLETADA]

- [x] Task 7.1: Corregir desfase UTC después de las 21:00 hs en selector de fechas y bloquear días cerrados
  - Acceptance:
    - [x] Helper `getArgentinaCalendarDays(count, closedDaysOfWeek)` en `src/utils/dateHelpers.ts` calcula `dateStr` estrictamente en `America/Argentina/Catamarca`.
    - [x] Días cerrados (ej. Domingo) deshabilitados visualmente en el calendario de 30 días.
- [x] Task 7.2: Extender esquema de Base de Datos y auto-migración idempotente (`ensureExtendedSchema`)
  - Acceptance:
    - [x] Tablas `products`, `shippingZones`, `productOrders`, `blogPosts`, `passkeyCredentials` y campos agregados a `services` y `appointments`.
    - [x] `ensureExtendedSchema()` auto-crea tablas y datos semilla de zonas de cadete y productos sin tocar datos productivos.

---

## Fase 8: Inventario de Productos, Zonas de Cadete & Tienda Pública (`/tienda`) [COMPLETADA]

- [x] Task 8.1: Lógica de negocio y Server Actions de Inventario, Zonas de Envío y Pedidos con Mercado Pago
  - Acceptance:
    - [x] CRUD completo de productos con compresión WebP (`sharp`).
    - [x] Configuración de zonas de cadete (Catamarca Capital, Valle Viejo, Sumalao, etc.).
    - [x] Cobro total en Mercado Pago con discriminación contable: solo el producto ingresa a `cash_transactions` (`PRODUCT_SALE`), excluyendo el cadete.
- [x] Task 8.2: Panel Administrativo de Inventario, Envíos y Pedidos (`/dashboard/inventario`)
  - Acceptance:
    - [x] Catálogo con stock, venta presencial rápida con impacto en Caja, gestión de pedidos y tarifas de cadete.
- [x] Task 8.3: Tienda Online Pública (`/tienda`)
  - Acceptance:
    - [x] Catálogo público, carrito, selector de Retiro ($0) o Cadete por zona y confirmación con Mercado Pago Checkout Pro.

---

## Fase 9: Multi-Turnos (Amigos y Pack Mensual 30 días) + Upselling de Productos [COMPLETADA]

- [x] Task 9.1: Configuración de Productos Sugeridos en Carta de Servicios (`/dashboard/servicios`)
  - Acceptance:
    - [x] Diogo puede configurar qué productos sugerirle al cliente para cada corte o tratamiento.
- [x] Task 9.2: Wizard de Reserva con Multi-Turnos (30 días) y Upselling de Productos (`/reservar`)
  - Acceptance:
    - [x] Carrito multi-turno (turnos consecutivos para amigos o varios turnos en el mes) con 1 solo pago en Mercado Pago.
    - [x] Sugerencia interactiva de productos para retirar el día del corte sumados al checkout.

---

## Fase 10: Blog & Portfolio de Trabajos (`/blog` y `/dashboard/blog`) [COMPLETADA]

- [x] Task 10.1: Gestión de Blog & Cortes en el Panel (`/dashboard/blog`)
  - Acceptance:
    - [x] ABM de publicaciones con subida de fotos WebP, productos usados y servicios vinculados.
- [x] Task 10.2: Página Pública de Blog (`/blog`) e Integración en Home (`/`)
  - Acceptance:
    - [x] Lookbook editorial con productos aplicados y enlaces directos a tienda y reserva.

---

## Fase 11: App Instalable en Android (PWA) + Acceso Biométrico (Huella / Passkeys) [COMPLETADA]

- [x] Task 11.1: Configuración PWA Instalable en Android (`manifest.ts`, `sw.js`, `PwaInstaller`)
  - Acceptance:
    - [x] `manifest.ts` standalone con íconos de alta resolución (192 y 512).
    - [x] Service worker `sw.js` activo y banner de instalación para Android.
    - [x] Sesión JWT extendida a 30 días para Diogo.
- [x] Task 11.2: Autenticación Biométrica con Huella / Rostro (WebAuthn Passkeys)
  - Acceptance:
    - [x] Endpoints FIDO2/WebAuthn de registro y verificación con `@simplewebauthn/server`.
    - [x] Vinculación de huella/biometría desde el panel de administración.
    - [x] Botón "Ingresar con Huella / Face ID" y Conditional UI en `/login`.
