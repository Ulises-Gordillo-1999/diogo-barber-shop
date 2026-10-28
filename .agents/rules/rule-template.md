---
trigger: always_on
---

# Rol y Contexto del Proyecto

Eres un Arquitecto de Software y Desarrollador Full Stack experto. Tu objetivo es construir y mantener el sistema web integral para **Diogo Barber Shop** (@diogobarbershopp), enfocado en el rubro de **Barbería, Peluquería Masculina y Cuidado Personal (Reserva de turnos online con cobro anticipado al 100% y gestión financiera de ingresos/egresos)**.

Todas las aplicaciones desarrolladas bajo este ecosistema se despliegan en un VPS Hetzner Cloud administrado mediante Coolify v4, por lo que el código debe ser ligero, estrictamente tipado, desacoplado y optimizado para contenedores Docker con compilación standalone.

---

# Stack Tecnológico Mandatorio

* **Frontend / Backend:** Next.js 16+ (App Router, Server Actions para mutaciones, Server Components para consultas a BD, Turbopack y `output: 'standalone'` en `next.config.ts`).
* **Librería UI:** React 19 con tipado nativo y hooks modernos (`useActionState`, `useOptimistic`).
* **Lenguaje:** TypeScript 5 con tipado estricto end-to-end (`strict: true`, prohibido el uso de `any`).
* **Estilos, Temas & Ergonomía Móvil:** 
  * Tailwind CSS v4, Lucide React Icons, estética Enterprise Dark / Barbería Moderna (`bg-zinc-950`, `border-zinc-800`, detalles en acento dorado/ámbar o zinc, glassmorphism suave).
  * Sistema Claro/Oscuro/Sistema con script anti-flicker inline en `<head>` y `@custom-variant dark` (Skill: `theme-mode-system`).
  * Diseño Mobile-First & Ergonomía Táctil pensado para clientes que ingresan desde el navegador in-app de Instagram: Mobile Topbar con Off-Canvas Drawer, patrón híbrido (Tarjetas en móvil `< md` vs Tablas en desktop `md+`), inputs `>= 16px` contra auto-zoom en iOS y touch targets `>= 44px` (Skill: `responsive-design`).
* **Modales & Diálogos:** Todos los modales desacoplados del DOM mediante React Portals (`createPortal(..., document.body)`) con `max-h-[90dvh]` y scroll interno. Prohibido el uso de `window.confirm` o `window.alert` nativos.
* **Base de Datos:** PostgreSQL 16 nativo (contenedor Docker local en desarrollo vía `docker-compose.yml`, recurso PostgreSQL administrado en Coolify en producción).
* **ORM & Migraciones:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`) con esquemas declarativos en `src/db/schema.ts` y migraciones con `drizzle-kit push`.
* **Autenticación & Autorización (RBAC):** Sistema propio sin dependencias externas de pago usando tokens JWT (`jose`), contraseñas con hash `bcryptjs`, cookies seguras (`HttpOnly`, `SameSite=Lax`, `Secure`) y Middleware centralizado de Next.js (`src/middleware.ts`) que valida sesiones y roles (`ADMIN`, `BARBER`). *Nota: Los clientes reservan turnos mediante flujo público rápido sin necesidad de registro ni login.*
* **Pasarela de Pagos:** Mercado Pago SDK Oficial v2 (`mercadopago`) implementado mediante **Checkout Pro** + Webhooks verificados criptográficamente (`/api/webhooks/mercadopago`).
* **Despliegue en Producción:** VPS Hetzner Cloud administrado con Coolify v4 + Traefik + Cloudflare DNS. `Dockerfile` multi-stage en 3 etapas (`deps` -> `builder` -> `runner`) basado en `node:20-alpine` exponiendo el puerto `3000`.

---

# Jerarquía de Agent Skills (`.agents/skills`)

1. **Prioridad Absoluta (Reglas de Plantilla Local):** Prevalecen siempre las reglas del Stack Tecnológico Mandatorio y las skills de interfaz propias (`theme-mode-system` y `responsive-design`). Nunca introduzcas ORMs alternativos, librerías de componentes pesadas ni sistemas de autenticación de terceros.
2. **Prioridad Metodológica (Workflow Skills):** Aplica activamente las skills ubicadas en `.agents/skills/` según la tarea:
   * Planificación y arquitectura: `spec-driven-development`, `planning-and-task-breakdown`, `api-and-interface-design`.
   * Desarrollo e interfaz: `frontend-ui-engineering`, `incremental-implementation`, `code-simplification`.
   * Seguridad y pagos: `security-and-hardening` (especialmente en validación de firmas de Webhooks de Mercado Pago, prevención de doble reserva y protección de rutas administrativas).
   * Calidad y pruebas: `test-driven-development`, `code-review-and-quality`, `debugging-and-error-recovery`.

---

# Módulos Opcionales Activos en este Proyecto

- [x] **Buscadores y Filtros Reactivos:** Barras de búsqueda en vivo con filtros de categorías, fechas, métodos de pago y estados integradas en tablas/listados mediante `useMemo`.
- [x] **Generador de Documentos / Reportes PDF:** `jspdf` + `jspdf-autotable` (para exportar cierres de caja semanales/mensuales y reportes financieros).
- [x] **Procesamiento de Imágenes a WebP:** `sharp` con almacenamiento optimizado (para imágenes de servicios o cortes de referencia).
- [ ] **Criptografía de Secretos / Bóveda:** Cifrado simétrico AES-256 en Node.js `crypto` (solo si se almacenan credenciales de API en base de datos en lugar de variables de entorno).

---

# Módulos y Lógica de Negocio de este Proyecto (Diogo Barber Shop)

### 1. Reserva Pública de Turnos Express (Mobile-First y Sin Fricción)
* Flujo público ultra rápido en 3 pasos diseñado para clientes que acceden desde el link de Instagram:
  1. Selección del servicio (Corte, Corte + Barba, Perfilado, etc.) mostrando duración y precio.
  2. Selección de fecha y horario disponible en tiempo real (calculando únicamente los huecos libres según la duración del servicio y los bloqueos vigentes).
  3. Ingreso de datos mínimos del cliente: **Nombre completo y Teléfono (WhatsApp)**, sin exigir creación de cuenta ni contraseña.

### 2. Cobro 100% Obligatorio con Mercado Pago y Bloqueo Temporal Anti-Colisión
* **Regla de oro:** Ningún turno reservado por un cliente en la web pública queda confirmado sin el pago del 100% del valor del servicio.
* **Prevención de solapamientos (Race Conditions):** Al presionar *"Pagar y Confirmar Turno"*, una Server Action crea el registro del turno en estado `PENDING_PAYMENT` y asigna un `expiresAt = NOW() + 10 minutos`. Durante esos 10 minutos, ese bloque horario deja de estar disponible para otros usuarios.
* **Preferencia de Pago:** Se genera una preferencia en Mercado Pago Checkout Pro con fecha de expiración sincronizada a 10 minutos, vinculando el `id` del turno en el campo `external_reference`.
* **Confirmación por Webhook (`/api/webhooks/mercadopago/route.ts`):**
  * Valida la autenticidad de la notificación de Mercado Pago (`x-signature`).
  * Si el pago resulta `approved`, actualiza el turno a estado `CONFIRMED`, limpia el `expiresAt`, guarda el `mpPaymentId` e **inserta automáticamente un movimiento de tipo `INCOME` en la tabla de caja (`cash_transactions`)** asociado al turno.
  * Si el pago es rechazado o vence el plazo de 10 minutos sin concretarse, el turno pasa a `CANCELLED` (o se ignora en las consultas de disponibilidad si `status = 'PENDING_PAYMENT' AND expiresAt < NOW()`), liberando el horario inmediatamente.

### 3. Gestión de Agenda y Reprogramación Rápida (Panel Administrativo)
* **Vista de Agenda Diaria/Semanal:** Interfaz clara para el dueño donde visualiza los turnos del día con su estado (`CONFIRMED`, `COMPLETED`, `RESCHEDULED`, `CANCELLED`, `PENDING_PAYMENT`).
* **Reprogramación en 2 toques:** Desde cualquier turno activo, el administrador puede abrir un modal (`createPortal`) que muestra los horarios libres, cambiar la fecha/hora con respuesta inmediata en UI mediante `useOptimistic` y disparar un botón de acción directa *"Avisar por WhatsApp"* (`https://wa.me/...`) con el mensaje pre-armado informando el nuevo horario al cliente.
* **Carga de Turno Manual / Presencial:** Permite al dueño agendar un turno manualmente para clientes que están en el local o se comunican directo, marcándolo como `CONFIRMED` y eligiendo el método de cobro (`CASH`, `TRANSFER`, `MERCADOPAGO`).

### 4. Control de Ingresos y Egresos (Módulo de Caja y Finanzas)
* **Libro Mayor / Movimientos de Caja (`cash_transactions`):**
  * **Ingresos (`INCOME`):** Se registran automáticamente al acreditarse un turno por Mercado Pago, o manualmente por el dueño (turnos presenciales, venta de productos de barbería como ceras, pomadas, aceites, etc.).
  * **Egresos (`EXPENSE`):** Registro rápido de gastos operativos del negocio categorizados (Insumos/Filos, Productos, Alquiler, Servicios/Internet, Mantenimiento, Retiros).
* **Dashboard Financiero:** Resumen con tarjetas KPI de **Ingresos Totales, Egresos Totales, Ganancia Neta** y desglose por medio de pago (`MERCADOPAGO`, `CASH`, `TRANSFER`), filtrable por día, semana, mes o rango de fechas personalizado, con opción de exportar el balance en PDF (`jspdf`).

### 5. Catálogo de Servicios y Configuración de Horarios Laborales
* **ABM de Servicios:** Creación, edición y activación/desactivación de servicios con nombre, descripción breve, duración en minutos y precio actual.
* **Configuración de Disponibilidad:** Definición de días y franjas horarias de atención (ej. Martes a Sábados de 10:00 a 13:00 y de 17:00 a 21:00) y bloqueo rápido de días no laborables, feriados o vacaciones.