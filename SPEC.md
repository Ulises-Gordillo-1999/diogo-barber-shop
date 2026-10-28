# Especificación Técnica: Diogo Barber Shop Web System

## 1. Objective
Construir una plataforma web integral, moderna y mobile-first para **Diogo Barber Shop** (@diogobarbershopp) que resuelva dos pilares fundamentales:
1. **Reserva Pública de Turnos Express con Cobro 100% Anticipado:** Flujo ultra rápido en 3 pasos para clientes que ingresan desde el link in-app de Instagram, seleccionando servicio, fecha y horario libre, con bloqueo anti-colisión de 10 minutos y confirmación automática mediante Mercado Pago Checkout Pro y Webhooks.
2. **Panel de Gestión Operativa y Financiera (Admin & Barberos):** Agenda diaria/semanal interactiva con reprogramación ágil en 2 toques (botón directo de aviso a WhatsApp), carga de turnos presenciales y control de caja (ingresos automáticos/manuales y egresos categorizados con métricas y exportación PDF).

## 2. Tech Stack
- **Framework Full Stack:** Next.js 16+ (App Router, Server Actions, Server Components, `output: 'standalone'`, Turbopack).
- **Librería UI & React:** React 19 con tipado nativo y hooks modernos (`useActionState`, `useOptimistic`).
- **Lenguaje:** TypeScript 5 estrictamente tipado (`strict: true`, prohibido el uso de `any`).
- **Estilos & Diseño:** Tailwind CSS v4, Lucide React Icons, estética Enterprise Dark / Barbería Moderna (`bg-zinc-950`, `border-zinc-800`, acentos ámbar/dorado).
- **Temas:** Sistema Claro, Oscuro y Automático según SO (`theme-mode-system`) con script inline bloqueante anti-flicker en `<head>` y `@custom-variant dark`.
- **Ergonomía Móvil:** Mobile-First (`responsive-design`), Topbar móvil con Off-Canvas Drawer, patrón híbrido (Cards `< md` vs Tablas `md+`), touch targets $\ge 44\text{px}$, inputs $\ge 16\text{px}$ contra auto-zoom iOS y unidades `dvh`.
- **Modales:** React Portals (`createPortal(..., document.body)`) con `max-h-[90dvh]` y scroll interno.
- **Base de Datos & ORM:** PostgreSQL 16 nativo (Docker Compose local / Coolify prod) + Drizzle ORM (`drizzle-orm`, `drizzle-kit`).
- **Autenticación & RBAC:** Propia con JWT (`jose`), contraseñas con hash `bcryptjs`, cookies HttpOnly seguras y middleware centralizado (`src/middleware.ts`) para roles `ADMIN` y `BARBER`.
- **Pasarela de Pagos:** Mercado Pago SDK v2 (`mercadopago`) Checkout Pro + Webhooks criptográficos en `/api/webhooks/mercadopago`.
- **Documentos & Reportes:** `jspdf` + `jspdf-autotable` para balances de caja.
- **Procesamiento Multimedia:** `sharp` para compresión WebP.

## 3. Commands
- **Instalación de dependencias:** `npm install`
- **Desarrollo local:** `npm run dev` (Next.js con Turbopack en puerto 3000)
- **Base de datos local:** `docker compose up -d`
- **Push de esquema Drizzle:** `npm run db:push`
- **Drizzle Studio:** `npm run db:studio`
- **Compilación de producción:** `npm run build`
- **Inicio de servidor producción:** `npm run start`
- **Linter:** `npm run lint`

## 4. Project Structure
```text
├── .agents/                    # Reglas y skills del proyecto
├── docker-compose.yml          # Contenedor PostgreSQL 16 para desarrollo
├── Dockerfile                  # Multi-stage standalone para Coolify (deps -> builder -> runner)
├── drizzle.config.ts           # Configuración de Drizzle Kit
├── next.config.ts              # Next.js con output: 'standalone'
├── package.json
├── tsconfig.json
├── tasks/
│   ├── plan.md                 # Plan de arquitectura y fases
│   └── todo.md                 # Desglose de tareas con criterios y verificación
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/          # Acceso de administradores/barberos
│   │   ├── (public)/
│   │   │   ├── reservar/       # Wizard de reserva express en 3 pasos
│   │   │   └── confirmacion/   # Feedback post-pago de Mercado Pago
│   │   ├── api/
│   │   │   └── webhooks/
│   │   │       └── mercadopago/# Webhook IPN oficial con validación x-signature
│   │   ├── dashboard/
│   │   │   ├── page.tsx        # Agenda visual diaria/semanal
│   │   │   ├── caja/           # Control financiero de ingresos y egresos
│   │   │   ├── servicios/      # ABM de servicios y precios
│   │   │   ├── horarios/       # Configuración de franjas y bloqueos
│   │   │   └── usuarios/       # Gestión de personal (solo ADMIN)
│   │   ├── actions/            # Server Actions por dominio (turnos, caja, servicios)
│   │   ├── globals.css         # Tailwind v4, custom variants y tokens
│   │   ├── layout.tsx          # Root layout con anti-flicker y ThemeProvider
│   │   └── page.tsx            # Landing page pública
│   ├── components/
│   │   ├── layout/             # AppLayout (Sidebar desktop + Off-canvas mobile)
│   │   ├── theme/              # ThemeProvider y hooks
│   │   ├── ui/                 # ThemeToggle, Modal con Portals, Badges, Botones
│   │   ├── booking/            # Wizard en 3 pasos para clientes
│   │   ├── agenda/             # Calendario, tarjetas de turnos, modal reprogramación
│   │   └── caja/               # Libro mayor, métricas y exportador PDF
│   ├── db/
│   │   ├── index.ts            # Conexión Postgres con Drizzle
│   │   └── schema.ts           # Esquema declarativo Drizzle ORM
│   ├── middleware.ts           # Validación de sesiones y RBAC
│   ├── types/                  # Tipados TypeScript
│   └── utils/                  # auth.ts, mercadopago.ts, dates.ts, formatters.ts
```

## 5. Code Style
- **TypeScript estricto:** Tipado explícito en Server Actions y componentes. Sin uso de `any`.
- **Server Actions con estado tipado:**
```tsx
export async function reservarTurnoAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Validar inputs
  // 2. Verificar no solapamiento
  // 3. Crear turno PENDING_PAYMENT con expiresAt = NOW() + 10m
  // 4. Crear preferencia Checkout Pro en Mercado Pago
}
```
- **Modales en Portals:** Todo modal se renderiza con `createPortal(..., document.body)` y `max-h-[90dvh]`.
- **Optimistic UI:** Usar `useOptimistic` al cambiar estado de turnos o reprogramar horarios para respuesta inmediata antes de la confirmación de red.

## 6. Testing & Quality Strategy
- Verificación de tipos estricta con `npm run build` sin errores de compilación.
- Validación de idempotencia en Webhook de Mercado Pago para no duplicar movimientos de caja.
- Validación de expiración de turnos `PENDING_PAYMENT` en consultas de disponibilidad para evitar falsos bloqueos.
- Verificación visual en pantallas móviles (375px) contra auto-zoom iOS y cortes de viewport.

## 7. Boundaries
- **Siempre:** Validar firmas criptográficas de Webhooks (`x-signature`).
- **Siempre:** Exigir `expiresAt` en reservas pendientes de pago para evitar retención indefinida de horarios.
- **Siempre:** Insertar transacción `INCOME` automática en caja cuando un turno es pagado exitosamente.
- **Consultar primero:** Alteraciones estructurales al esquema de base de datos (`schema.ts`).
- **Nunca:** Permitir confirmación de turnos online sin acreditación verificada por Mercado Pago.
- **Nunca:** Usar `window.confirm` o `window.alert` en la interfaz.
- **Nunca:** Introducir librerías pesadas de terceros (Prisma, NextAuth, Axios).

## 8. Success Criteria
1. Un cliente sin cuenta puede agendar un corte en menos de 2 minutos desde el celular, pagar con Mercado Pago y recibir confirmación inmediata.
2. Dos clientes concurrentes no pueden reservar el mismo horario gracias al bloqueo temporal de 10 minutos.
3. El webhook de Mercado Pago actualiza el estado a `CONFIRMED` e impacta en la caja automáticamente.
4. El administrador puede reprogramar un turno en 2 toques y disparar un mensaje directo a WhatsApp al cliente con los datos actualizados.
5. El módulo de caja refleja la ganancia neta en tiempo real y permite descargar el cierre de caja en PDF.
6. Cero parpadeo de tema (FOUC) al alternar entre Claro, Oscuro y Sistema.

## 9. Open Questions
- ¿Desea el barbero que se configure una notificación automática por WhatsApp vía API externa (como Twilio o Evolution API) a futuro, o el enlace manual `https://wa.me/...` es suficiente para la versión inicial? (Respuesta inicial: enlace `https://wa.me/...` sin costo extra).
