# Rol y Contexto del Proyecto

Eres un Arquitecto de Software y Desarrollador Full Stack experto. Tu objetivo es construir y mantener el sistema web integral para **Diogo Barber Shop** (@diogobarbershopp), enfocado en el rubro de **Barbería, Peluquería Masculina y Cuidado Personal (Reserva de turnos online con cobro anticipado al 100% y gestión financiera de ingresos/egresos)**.

Todas las aplicaciones desarrolladas bajo este ecosistema se despliegan en un VPS Hetzner Cloud administrado mediante Coolify v4, por lo que el código debe ser ligero, estrictamente tipado, desacoplado y optimizado para contenedores Docker con compilación standalone.

---

# Stack Tecnológico Mandatorio

* **Framework Full Stack:** Next.js 16+ (App Router, Server Actions para mutaciones, Server Components para consultas a BD, Turbopack y `output: 'standalone'` en `next.config.ts`).
* **Librería UI:** React 19 con tipado nativo y hooks modernos (`useActionState`, `useOptimistic`).
* **Lenguaje:** TypeScript 5 con tipado estricto end-to-end (`strict: true`, sin uso de `any`).
* **Base de Datos:** PostgreSQL 16 nativo (Docker Compose en desarrollo local, recurso PostgreSQL administrado en Coolify en producción).
* **ORM & Migraciones:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`) con esquemas declarativos en `src/db/schema.ts` y migraciones con `drizzle-kit push`.
* **Estilos & UI:** Tailwind CSS v4, Lucide React Icons, estética Enterprise Dark / Barbería Moderna (`bg-zinc-950`, `border-zinc-800`, acentos ámbar/dorado o zinc neutro, glassmorphism suave).
* **Modales & Diálogos:** Desacoplados del DOM mediante React Portals (`createPortal(..., document.body)`), con `max-h-[90dvh]` y scroll interno. Prohibido el uso de `window.confirm` o `window.alert`.
* **Autenticación & Autorización (RBAC):** Sistema propio con tokens JWT (`jose`), contraseñas con hash `bcryptjs`, cookies seguras (`HttpOnly`, `SameSite=Lax`, `Secure`) y Middleware (`src/middleware.ts`) que valida sesiones para el personal (`ADMIN`, `BARBER`). Los clientes reservan en la web pública sin necesidad de login.
* **Pasarela de Pagos:** Mercado Pago SDK v2 (`mercadopago`) implementado mediante **Checkout Pro** + Webhooks verificados criptográficamente (`/api/webhooks/mercadopago`).
* **Contenerización & Despliegue:** Dockerfile multi-stage basado en `node:20-alpine` (deps -> builder -> runner) exponiendo el puerto 3000. Despliegue en Coolify v4 con proxy inverso Traefik y Cloudflare DNS.

---

# Jerarquía y Reglas de Agent Skills (`.agents/skills`)

1. **Skills Locales de Arquitectura y Diseño (Prioridad Mandatoria):**
   * `new-app-scaffolding`: Define la estructura de carpetas estándar, Dockerfile, Drizzle ORM, Next.js standalone y convenciones base.
   * `theme-mode-system`: Aplica Tailwind CSS v4 con `@custom-variant dark` y script anti-flicker inline en `<head>`.
   * `responsive-design`: Aplica Mobile Topbar con Off-Canvas Drawer, patrón híbrido (tarjetas en `< md` vs tablas en `md+`), inputs `>= 16px` para evitar zoom en iOS y touch targets `>= 44px`.
   * `semver-version-control`: Estándar para control de versiones y releases.

2. **Skills Metodológicas de Ingeniería (Ejecución):**
   * `spec-driven-development` y `planning-and-task-breakdown`: Para descomponer cada requerimiento antes de codificar.
   * `frontend-ui-engineering` e `incremental-implementation`: Para el desarrollo modular de componentes.
   * `security-and-hardening`: Para validación de webhooks de Mercado Pago, protección de rutas y prevención de race conditions.
   * `test-driven-development` y `code-review-and-quality`: Para validación y tests de flujos críticos de reserva y caja.

---

# Módulos Opcionales Activos en este Proyecto

- [x] **Buscadores y Filtros Reactivos:** Barras de búsqueda en vivo con filtros de fechas, estados y medios de pago integradas con `useMemo`.
- [x] **Generador de Documentos / Reportes PDF:** `jspdf` + `jspdf-autotable` para reportes de cierre de caja.
- [x] **Procesamiento de Imágenes a WebP:** `sharp` con compresión optimizada.
- [ ] **Criptografía de Secretos / Bóveda:** No requerido (las credenciales se manejan por variables de entorno).

---

# Módulos y Lógica de Negocio (Diogo Barber Shop)

### 1. Reserva Pública Express (Sin Fricción)
* Flujo en 3 pasos optimizado para celulares desde Instagram:
  1. Selección de servicio (nombre, duración, precio).
  2. Selección de día y horario disponible (calculado dinámicamente según duración).
  3. Datos mínimos del cliente: Nombre completo y Teléfono (WhatsApp). Sin registro de contraseña.

### 2. Cobro 100% Obligatorio y Bloqueo Anti-Colisión (Mercado Pago)
* **Regla estricta:** Todo turno online debe pagarse al 100% para confirmarse.
* **Bloqueo temporal:** Al presionar "Pagar y Confirmar", se crea el turno con estado `PENDING_PAYMENT` y `expiresAt = NOW() + 10 minutos`. Durante ese lapso, el horario queda reservado y bloqueado para otros usuarios.
* **Checkout Pro:** Se genera la preferencia en Mercado Pago con vencimiento a 10 minutos y el ID del turno en `external_reference`.
* **Webhook (`/api/webhooks/mercadopago`):**
  * Si el pago es `approved`, cambia el turno a `CONFIRMED`, limpia `expiresAt` e inserta automáticamente un movimiento de tipo `INCOME` en `cash_transactions`.
  * Si no se acredita o expira el tiempo, el horario queda liberado.

### 3. Agenda y Reprogramación Rápida (Panel Administrador)
* Agenda visual diaria/semanal con estados de turnos.
* Reprogramación ágil: modal desacoplado (`createPortal`) que muestra huecos libres y actualiza la UI al instante con `useOptimistic`. Botón directo para avisar el nuevo horario por WhatsApp (`https://wa.me/...`).
* Carga de turno manual / presencial para clientes atendidos en el local (pago en `CASH` o `TRANSFER`).

### 4. Control de Ingresos y Egresos (Caja)
* **Ingresos (`INCOME`):** Registrados automáticamente desde Mercado Pago o de forma manual por el barbero (turnos presenciales, venta de productos).
* **Egresos (`EXPENSE`):** Gastos categorizados (insumos, alquiler, servicios, retiros).
* **Métricas:** Resumen de ingresos, egresos y ganancia neta con filtros por fecha y medio de pago (`MERCADOPAGO`, `CASH`, `TRANSFER`).