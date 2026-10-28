# Task List: Diogo Barber Shop Web System

## Fase 1: Scaffolding, Base de Datos & Arquitectura Base [COMPLETADA]

- [x] Task 1.1: Scaffolding de Next.js 16+, React 19, Tailwind CSS v4, Dockerfile standalone y Docker Compose
  - Acceptance: package.json, next.config.ts standalone, Dockerfile multi-stage, docker-compose.yml con PostgreSQL 16 y tsconfig.json strict configurados.
  - Verify: Archivos generados correctamente en el directorio raíz.
  - Files: `package.json`, `next.config.ts`, `Dockerfile`, `docker-compose.yml`, `tsconfig.json`.

- [x] Task 1.2: Esquema declarativo de Drizzle ORM
  - Acceptance: Esquema completo en `src/db/schema.ts` con tablas `users` (ADMIN, BARBER), `services`, `business_hours`, `schedule_blocks`, `appointments` (soporte de 10 min de bloqueo temporal, cliente guest, MP data) y `cash_transactions` (ingresos y egresos categorizados), más todas las relaciones y tipos inferidos.
  - Verify: Archivo `src/db/schema.ts` creado y tipado sin errores de sintaxis.
  - Files: `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`.

- [x] Task 1.3: Sistema de temas y ergonomía móvil
  - Acceptance: `globals.css` con `@custom-variant dark`, `layout.tsx` con script anti-flicker inline y export de `viewport`, `ThemeProvider`, `ThemeToggle`, `Modal` desacoplado con React Portals y `AppLayout` responsive.
  - Verify: Componentes creados bajo `src/components/` y `src/app/`.
  - Files: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/theme/ThemeProvider.tsx`, `src/components/ui/ThemeToggle.tsx`, `src/components/ui/Modal.tsx`, `src/components/layout/AppLayout.tsx`.

- [x] Task 1.4: Módulo base de autenticación JWT y Middleware RBAC
  - Acceptance: Utilidades `src/utils/auth.ts` con firma/verificación JWT (`jose`), hash de contraseñas (`bcryptjs`) y `src/middleware.ts` para protección de `/dashboard/*`.
  - Verify: Funciones exportadas y middleware compilando limpiamente.
  - Files: `src/utils/auth.ts`, `src/middleware.ts`.

### Checkpoint 1: Base de Arquitectura y Base de Datos Verificada
- [x] Scaffolding completo.
- [x] Esquema Drizzle ORM completo y alineado con las reglas de negocio.
- [x] Documentación SPEC.md y tasks/ generadas.

---

## Fase 2: Autenticación, Catálogo Inicial & Semillado [COMPLETADA]

- [x] Task 2.1: Script de semillado (`src/db/seed.ts`)
  - Description: Crear script de inicialización con usuario admin por defecto, servicios de barbería (Corte clásico, Barba, Perfilado) y franjas horarias semanales de atención (Martes a Sábado 10-13 y 17-21).
  - Acceptance: Al ejecutar el script, la base de datos se puebla con registros iniciales sin duplicar.
  - Verify: Script ejecutado exitosamente con `npm run db:seed`.
  - Files: `src/db/seed.ts`, `package.json`.

- [x] Task 2.2: Pantalla de Login y Server Action de Autenticación
  - Description: Crear página `/login` con diseño estilizado barbería oscura/ámbar, formulario con inputs $\ge 16\text{px}$, Server Action de login que valida hash `bcryptjs` y coloca cookie `auth_token` HttpOnly.
  - Acceptance: El usuario administrador o barbero puede iniciar sesión y es redirigido a `/dashboard`.
  - Verify: Compilado exitosamente, tipado estricto verificado y página `/dashboard` conectada.
  - Files: `src/app/(auth)/login/page.tsx`, `src/app/actions/authActions.ts`, `src/app/dashboard/page.tsx`.

---

## Fase 3: Módulo Público de Reserva Express & Cobro con Mercado Pago [COMPLETADA]

- [x] Task 3.1: Motor de cálculo de disponibilidad de turnos (`src/utils/availability.ts`)
  - Description: Función que recibe servicioId y fecha, lee los horarios laborales del día, resta bloqueos (`schedule_blocks`) y turnos vigentes (`CONFIRMED` o `PENDING_PAYMENT` con `expiresAt > NOW()`), y devuelve los slots libres según la duración del servicio.
  - Acceptance: No devuelve horarios ocupados ni horarios donde un turno pendiente de pago esté dentro de sus 10 minutos. Horarios pendientes vencidos se consideran libres.
  - Verify: Probado y verificado en compilación y cálculo de slots dinámicos.
  - Files: `src/utils/availability.ts`.

- [x] Task 3.2: Flujo Wizard público de reserva (`/reservar`)
  - Description: Interfaz mobile-first ultra rápida en 3 pasos: 1) Selección de servicio, 2) Selección de fecha y hora libre, 3) Datos del cliente (Nombre completo y WhatsApp).
  - Acceptance: Flujo sin login, responsive en 375px, validación de inputs y feedback visual de cada paso.
  - Verify: Componente `BookingWizard` y página `/reservar` construidos y tipados.
  - Files: `src/app/(public)/reservar/page.tsx`, `src/components/booking/BookingWizard.tsx`.

- [x] Task 3.3: Server Action de reserva y generación de Checkout Pro Mercado Pago
  - Description: Server Action que inserta el turno con estado `PENDING_PAYMENT` y `expiresAt = NOW() + 10 min`, e interactúa con el SDK de Mercado Pago para generar la preferencia con vencimiento a 10 minutos y `external_reference = appointment.id`.
  - Acceptance: Retorna el init_point de Mercado Pago para redireccionar al cliente a pagar el 100%.
  - Verify: Server Action `createBookingAction` y helper `mercadopago.ts` integrados.
  - Files: `src/app/actions/bookingActions.ts`, `src/utils/mercadopago.ts`.

- [x] Task 3.4: Webhook de Mercado Pago (`/api/webhooks/mercadopago/route.ts`)
  - Description: Endpoint de Webhook que valida `x-signature`, consulta el pago en la API de Mercado Pago, y si es `approved`: cambia el turno a `CONFIRMED`, limpia `expiresAt`, guarda `mpPaymentId` e inserta automáticamente un movimiento de tipo `INCOME` en `cash_transactions`.
  - Acceptance: Confirmación automática e idempotente (evita doble inserción en caja).
  - Verify: Endpoint POST `/api/webhooks/mercadopago` compilado exitosamente con tipado estricto.
  - Files: `src/app/api/webhooks/mercadopago/route.ts`.

- [x] Task 3.5: Pantalla de resultado y confirmación (`/confirmacion`)
  - Description: Página a la que regresa el cliente desde Mercado Pago con detalles del turno, badge de estado y botón directo a WhatsApp de la barbería.
  - Acceptance: Muestra datos del turno confirmado o mensaje claro si el pago fue cancelado/rechazado.
  - Verify: Página dinámica renderizada según status con link a WhatsApp pre-armado.
  - Files: `src/app/(public)/confirmacion/page.tsx`.

### Checkpoint 2: Flujo Público y Pasarela de Pago Operativos
- [x] Reserva pública de punta a punta funcional.
- [x] Cobro con Mercado Pago sincronizado a 10 min.
- [x] Webhook acreditando pagos y registrando ingresos en caja.

---

## Fase 4: Agenda, Reprogramación Rápida & Turno Presencial [COMPLETADA]

- [x] Task 4.1: Vista de Agenda en `/dashboard`
  - Description: Vista diaria y semanal para el barbero con listado/grilla de turnos, estado (`CONFIRMED`, `PENDING_PAYMENT`, etc.) y datos de contacto del cliente.
  - Acceptance: Visualización clara con filtros de fecha, estado y buscador con patrón híbrido (cards en mobile, tabla en desktop).
  - Verify: Componente `AgendaView` renderizado en `/dashboard` con tipado estricto.
  - Files: `src/app/dashboard/page.tsx`, `src/components/agenda/AgendaView.tsx`.

- [x] Task 4.2: Modal de reprogramación rápida en 2 toques
  - Description: Modal desacoplado (`createPortal`) que muestra huecos libres de otra fecha/hora y actualiza al instante con `useOptimistic`.
  - Acceptance: Reprograma el turno sin recargar la página.
  - Verify: Componente `RescheduleModal` y Server Action `rescheduleAppointmentAction`.
  - Files: `src/components/agenda/RescheduleModal.tsx`, `src/app/actions/agendaActions.ts`.

- [x] Task 4.3: Acción directa "Avisar por WhatsApp"
  - Description: Botón directo que genera enlace `https://wa.me/{phone}?text={mensaje}` con texto formateado avisando al cliente sobre el nuevo horario de su turno.
  - Acceptance: Abre WhatsApp Web o la app nativa con el texto pre-cargado.
  - Verify: Componente `WhatsAppAlertButton` integrado en cards y tabla.
  - Files: `src/components/agenda/WhatsAppAlertButton.tsx`.

- [x] Task 4.4: Modal de Carga de Turno Manual / Presencial
  - Description: Modal para que el barbero cargue turnos de clientes en el local o por teléfono, marcándolo directamente como `CONFIRMED` y eligiendo medio de cobro (`CASH`, `TRANSFER`, `MERCADOPAGO`).
  - Acceptance: Se agenda el turno e impacta en caja si se marca como cobrado.
  - Verify: Componente `ManualAppointmentModal` y Server Action `createManualAppointmentAction`.
  - Files: `src/components/agenda/ManualAppointmentModal.tsx`.

---

## Fase 5: Control Financiero de Caja & Reportes PDF [COMPLETADA]

- [x] Task 5.1: Vista de Caja en `/dashboard/caja` con filtros reactivos
  - Description: Libro diario con lista de movimientos (`cash_transactions`), filtrable por fecha, tipo (`INCOME`/`EXPENSE`) y medio de pago con `useMemo`. Patrón híbrido (cards en mobile, tabla en desktop).
  - Acceptance: Búsqueda y filtrado instantáneo en UI.
  - Verify: Página `/dashboard/caja` y componente `CashFlowView` compilados y probados.
  - Files: `src/app/dashboard/caja/page.tsx`, `src/components/caja/CashFlowView.tsx`.

- [x] Task 5.2: Tarjetas KPI Financieras
  - Description: Métricas de Ingresos Totales, Egresos Totales y Ganancia Neta con desglose por medio de pago.
  - Acceptance: Cálculos exactos según el filtro temporal seleccionado.
  - Verify: Componente `FinancialKPICards` integrado con desglose MP, Efectivo y Transferencia.
  - Files: `src/components/caja/FinancialKPICards.tsx`.

- [x] Task 5.3: Modal de Registro de Egresos y Ventas de Productos
  - Description: Formulario para registrar gastos operativos (insumos, alquiler, servicios, retiros) o venta de ceras/pomadas.
  - Acceptance: Registra el movimiento en `cash_transactions` y actualiza las métricas.
  - Verify: Componente `NewTransactionModal` y Server Action `createTransactionAction`.
  - Files: `src/components/caja/NewTransactionModal.tsx`, `src/app/actions/cashActions.ts`.

- [x] Task 5.4: Exportación de Balance a PDF con `jspdf`
  - Description: Botón de descarga de reporte formal en PDF con encabezado de Diogo Barber Shop, resumen de KPIs y tabla de movimientos del período.
  - Acceptance: Genera y descarga el archivo PDF en cliente.
  - Verify: Módulo `pdfExport.ts` y componente `ExportPdfButton` integrados.
  - Files: `src/utils/pdfExport.ts`, `src/components/caja/ExportPdfButton.tsx`.

---

## Fase 6: Configuración de Servicios, Horarios & Bloqueos [COMPLETADA]

- [x] Task 6.1: ABM de Servicios (`/dashboard/servicios`)
  - Description: Gestión de catálogo: crear, editar precio/duración y activar/desactivar servicios.
  - Acceptance: Modificaciones reflejadas de inmediato en el wizard de reserva pública.
  - Verify: Componentes `ServicesManager` y `ServiceModal` probados y compilados.
  - Files: `src/app/dashboard/servicios/page.tsx`, `src/components/servicios/ServicesManager.tsx`, `src/components/servicios/ServiceModal.tsx`.

- [x] Task 6.2: Configuración de Horarios y Bloqueo de Días (`/dashboard/horarios`)
  - Description: Panel para modificar las franjas horarias de atención semanal y bloquear feriados o vacaciones.
  - Acceptance: Los bloqueos inhabilitan automáticamente los turnos en el wizard de clientes.
  - Verify: Componentes `ScheduleManager` y `NewBlockModal` probados y compilados.
  - Files: `src/app/dashboard/horarios/page.tsx`, `src/components/horarios/ScheduleManager.tsx`, `src/components/horarios/NewBlockModal.tsx`.
