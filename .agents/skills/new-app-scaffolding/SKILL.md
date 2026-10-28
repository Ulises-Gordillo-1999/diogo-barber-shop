---
name: new-app-scaffolding
description: >-
  Architectural blueprint, setup protocol, and scaffolding rules for creating new full-stack applications
  destined for deployment on Hetzner VPS with Coolify. Enforces the core stack (Next.js 16 App Router,
  PostgreSQL 16, Drizzle ORM, Tailwind CSS v4, custom JWT RBAC auth, responsive design, and light/dark/system theme system)
  and guides selective inclusion of optional modules (PDF Engine, AES-256 Cryptography, Sharp WebP processing).
---

# Blueprint de Arquitectura: Nuevas Aplicaciones en Hetzner + Coolify

Este documento define el estándar oficial de ingeniería para iniciar y desarrollar cualquier nueva aplicación web que se despliegue en el **VPS Hetzner Cloud administrado mediante Coolify v4**.

---

## 🚀 1. Núcleo Tecnológico Obligatorio (Core Stack)

Todas las aplicaciones deben utilizar estrictamente este núcleo base:

| Capa | Tecnología | Justificación y Reglas |
| :--- | :--- | :--- |
| **Framework Full Stack** | **Next.js 16+ (App Router)** | Uso de Server Components para queries directas a BD, Server Actions para mutaciones tipadas y Turbopack para compilación rápida. `output: 'standalone'` en `next.config.ts`. |
| **Librería UI** | **React 19** | Tipado nativo y hooks modernos (`useActionState`, `useOptimistic`). |
| **Lenguaje** | **TypeScript 5 (Strict)** | Tipado de punta a punta (`end-to-end`) entre base de datos, backend y frontend. Sin uso de `any`. |
| **Base de Datos** | **PostgreSQL 16** | Nativo en contenedor Docker en desarrollo (`docker-compose.yml`), y recurso PostgreSQL administrado en Coolify en producción. |
| **ORM & Migraciones** | **Drizzle ORM & Drizzle Kit** | Máximo rendimiento, cero overhead de binarios pesados (a diferencia de Prisma), esquemas SQL declarativos en `src/db/schema.ts` y migraciones con `drizzle-kit push`. |
| **Temas & Estilos** | **Tailwind CSS v4 + Sistema Claro/Oscuro/Sistema** | Soporte de 3 modos con script anti-flicker inline en `<head>`, selector accesible y `@custom-variant dark`. Seguir la skill `theme-mode-system`. |
| **Diseño Responsivo** | **Mobile-First & Ergonomía Táctil** | Mobile Topbar con Off-Canvas Drawer, patrón híbrido (Tarjetas en móvil `< md` vs Tablas en desktop `md+`), inputs $\ge 16\text{px}$ contra auto-zoom iOS, touch targets $\ge 44\text{px}$. Seguir la skill `responsive-design`. |
| **Modales & Diálogos** | **React Portals** | Todos los modales desacoplados con `createPortal(..., document.body)`. `max-h-[90dvh]` con scroll interno. Prohibido el uso de `window.confirm` o `window.alert`. |
| **Autenticación & RBAC** | **JWT con `jose` + `bcryptjs`** | Autenticación propia sin proveedores externos costosos. Tokens firmados en cookies `HttpOnly`, `SameSite=Lax`, `Secure`. Middleware centralizado para control de acceso por roles. |
| **Contenerización** | **Dockerfile Multi-Stage** | Construcción ligera en 3 etapas (`deps` -> `builder` -> `runner`) basada en `node:20-alpine`, exponiendo el puerto `3000`. |
| **Despliegue** | **Coolify v4 + Traefik** | Despliegue automatizado por Git Webhook, SSL automático vía Let's Encrypt / Traefik y proxies inversos con Cloudflare DNS. |

---

## 📦 2. Módulos Condicionales (Se incluyen solo si el rubro lo exige)

No todas las aplicaciones necesitan el stack extendido de UPGRADE ERP. Evaluar según el dominio del negocio:

| Módulo | Paquetes / Dependencias | ¿Cuándo incluirlo? | ¿Cuándo OMITIRLO? |
| :--- | :--- | :--- | :--- |
| **PDF Engine** | `jspdf`, `jspdf-autotable` | Facturación, cotizaciones formales, reportes impresos, órdenes de trabajo, certificados médicos o diplomas. | Dashboards puramente interactivos, apps de mensajería, inventarios sin impresión, portales de clientes. |
| **Criptografía de Bóveda** | Node.js `crypto` nativo (AES-256-CBC) | Apps que custodian contraseñas de terceros, tokens API, claves bancarias o secretos IT. | Aplicaciones estándar donde la seguridad se resuelve con hash de contraseñas (`bcryptjs`) y HTTPS. |
| **Procesamiento de Imágenes** | `sharp` | Subida de fotos de productos, comprobantes de pago, avatares o recibos comprimidos a WebP. | Apps basadas únicamente en datos de texto, catálogos sin fotos o apps con almacenamiento en CDN externo (Cloudinary / S3). |
| **Control Métrico / Cable** | Esquema dinámico estimado vs real | Obras físicas donde el consumo real difiere del presupuesto inicial (redes, construcción, talleres). | Ventas tradicionales, eCommerce de stock unitario, turnos o SaaS. |

---

## 🗂️ 3. Estructura de Directorios Estándar

```text
├── .agents/
│   ├── rules/
│   │   └── project-context.md       # Regla de contexto propia del proyecto
│   └── skills/
│       ├── responsive-design/       # Skill de diseño responsivo y mobile-first
│       ├── theme-mode-system/       # Skill de arquitectura de temas Claro/Oscuro/Sistema
│       └── semver-version-control/  # Skill de versionado SemVer
├── docker-compose.yml               # PostgreSQL 16 para desarrollo local
├── Dockerfile                       # Multi-stage standalone para Coolify
├── next.config.ts                   # { output: 'standalone' }
├── package.json
├── src/
│   ├── app/                         # App Router (páginas y Server Actions)
│   │   ├── actions/                 # Server Actions por entidad (usuarios, clientes, etc.)
│   │   ├── (auth)/login/            # Pantalla de login
│   │   ├── dashboard/               # Panel principal protegido
│   │   ├── globals.css              # Tailwind v4 (@import "tailwindcss"; @custom-variant dark ...)
│   │   ├── layout.tsx               # Layout raíz con script anti-flicker y Viewport export
│   │   └── page.tsx
│   ├── components/                  # Componentes cliente y servidor
│   │   ├── layout/
│   │   │   └── AppLayout.tsx        # Layout con Sidebar desktop y Off-Canvas Drawer móvil
│   │   ├── theme/
│   │   │   └── ThemeProvider.tsx    # Context de React 19 para Claro/Oscuro/Sistema
│   │   ├── ui/
│   │   │   ├── ThemeToggle.tsx      # Selector de tema 3 estados
│   │   │   └── Modal.tsx            # Modal responsive con React Portals
│   │   └── [modulo]/                # Tablas híbridas (cards en mobile, tabla en desktop)
│   ├── db/
│   │   ├── index.ts                 # Conexión Postgres con Drizzle
│   │   └── schema.ts                # Esquema de tablas y enums
│   ├── middleware.ts                # Validación JWT y RBAC
│   ├── types/                       # Tipos de TypeScript
│   └── utils/                       # auth.ts, formateadores
```

---

## 🛠️ 4. Protocolo de Inicio para una Nueva Aplicación

1. **Inicialización**:
   ```bash
   npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --no-import-alias --turbopack
   ```
2. **Dependencias Core**:
   ```bash
   npm i drizzle-orm postgres jose bcryptjs lucide-react
   npm i -D drizzle-kit @types/bcryptjs
   ```
3. **Dependencias Condicionales** (si aplica):
   - PDF: `npm i jspdf jspdf-autotable`
   - Imágenes: `npm i sharp @types/sharp`
4. **Configurar Dockerfile Standalone** para Coolify:
   - Configurar `output: 'standalone'` en `next.config.ts`.
5. **Implementar Temas y Responsive**:
   - Consultar la skill `theme-mode-system` para el script anti-flicker en `layout.tsx` y el `ThemeProvider`.
   - Consultar la skill `responsive-design` para la navegación con Topbar móvil y Drawer Off-Canvas, y las vistas de datos híbridas (Tarjetas en móvil / Tablas en desktop).
6. **Configurar regla local**: Copiar la plantilla de contexto en `.agents/rules/`.
