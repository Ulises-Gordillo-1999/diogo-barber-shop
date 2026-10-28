<div align="center">
  <img src="public/images/logo-diogo.webp" alt="Diogo Barber Shop Logo" width="120" style="border-radius: 50%; box-shadow: 0 4px 20px rgba(212, 175, 55, 0.25);" />
  
  # DIOGO BARBER SHOP
  ### *Plataforma Integral de Reservas Online con Cobro 100% Anticipado & Gestión de Barbería*

  [![Next.js 16](https://img.shields.io/badge/Next.js-16.4.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
  [![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
  [![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=for-the-badge&logo=drizzle)](https://orm.drizzle.team/)
  [![Mercado Pago](https://img.shields.io/badge/Mercado_Pago-Checkout_Pro-009EE3?style=for-the-badge&logo=mercadopago)](https://www.mercadopago.com.ar/)
  [![Docker Standalone](https://img.shields.io/badge/Docker-Multi--stage-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)

  <p align="center">
    <strong>Estética Editorial Noir & Brass Atelier • Arquitectura Standalone Optimizada • Despliegue en Coolify v4 & Hetzner VPS</strong>
  </p>
</div>

---

## 📌 Descripción General

**Diogo Barber Shop** es una solución web de nivel empresarial desarrollada específicamente para el rubro de barberías y cuidado masculino de autor. Combina una experiencia de reserva pública ultra fluida y mobile-first (optimizada para tráfico in-app desde Instagram) con un panel operativo de gestión en vivo, control de caja de doble entrada y prevención estricta de colisiones de turnos con cobro anticipado.

---

## 💈 Características Principales

### 1. Reserva Pública Express (Sin Fricción)
* **Embudo en 3 pasos:** Selección de servicio, fecha/horario libre y datos de contacto (WhatsApp). Sin requerir creación de cuentas ni contraseñas a los clientes.
* **Bloqueo Temporal Anti-Colisión (10 min):** Al avanzar hacia el pago, el slot queda reservado bajo `PENDING_PAYMENT` durante 10 minutos para evitar reservas duplicadas en simultáneo.
* **Cobro 100% Anticipado:** Integración nativa con **Mercado Pago Checkout Pro** sincronizada a 10 minutos. Confirmación criptográfica automática mediante Webhook oficial.
* **Aviso Inmediato por WhatsApp:** Botón con deep link y mensaje pre-armado con fecha, hora y servicio listo para enviar a la barbería.

### 2. Panel Administrativo Operativo (Staff & Admin)
* **Agenda en Vivo con Auto-Sincronización:** Vista interactiva de turnos del día, estados en tiempo real (`CONFIRMED`, `COMPLETED`, `RESCHEDULED`, `CANCELLED`), cinta rápida de 7 días y filtros de búsqueda reactivos.
* **Reprogramación Ágil:** Modal en React Portal con recálculo dinámico de huecos libres y actualización visual instantánea con `useOptimistic`.
* **Carga de Turno Manual / Presencial:** Permite agendar clientes en el local eligiendo medio de cobro (`EFECTIVO`, `TRANSFERENCIA`, `MERCADO PAGO`).

### 3. Módulo Financiero & Libro Mayor de Caja
* **Registro Automatizado de Ingresos:** Los turnos abonados por Mercado Pago impactan directamente como `INCOME` en `cash_transactions` con idempotencia estricta.
* **Control de Egresos Operativos:** Registro de gastos categorizados (Insumos, Alquiler, Servicios, Retiros, Mantenimiento).
* **KPIs & Exportación:** Resumen ejecutivo de facturación, ganancia neta y balance semanal/mensual exportable a **PDF profesional** con `jspdf`.

### 4. Seguridad & Control de Accesos (RBAC)
* **Autenticación Robusta:** Tokens JWT (`jose`) en cookies seguras `HttpOnly`, `SameSite=Lax` y contraseñas hasheadas con `bcryptjs` (12 rondas).
* **Protección Anti-Fuerza Bruta:** Rate limiting en login por IP/correo (bloqueo preventivo tras 5 intentos fallidos consecutivos).
* **Prevención de Ataques de Tiempo:** Comparación de credenciales en tiempo constante (`DUMMY_BCRYPT_HASH`).
* **Verificación HMAC-SHA256:** Validación de firmas criptográficas `x-signature` en Webhooks de Mercado Pago.
* **Cabeceras HTTP Blindadas:** Configuración estricta de HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Permissions-Policy`.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Framework Full Stack** | [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Turbopack) |
| **Biblioteca de UI** | [React 19](https://react.dev/) (`useOptimistic`, `useTransition`, React Portals) |
| **Tipado Estático** | [TypeScript 5](https://www.typescriptlang.org/) (Modo `strict` end-to-end) |
| **Estilos & Diseño** | [Tailwind CSS v4](https://tailwindcss.com/) + Lucide React Icons |
| **Base de Datos** | [PostgreSQL 16](https://www.postgresql.org/) (Relacional nativo) |
| **ORM & Migraciones** | [Drizzle ORM](https://orm.drizzle.team/) + `drizzle-kit` |
| **Pagos Online** | [Mercado Pago SDK Oficial v2](https://www.mercadopago.com.ar/developers) (Checkout Pro) |
| **Reportes & Medios** | `jspdf` + `jspdf-autotable`, `sharp` WebP |
| **Contenerización** | Docker Multi-stage (`node:20-alpine`, `output: 'standalone'`) |

---

## 📂 Arquitectura del Proyecto

```text
diogo-barber-shop/
├── public/                     # Favicons, WebP posters, videos y assets públicos
├── src/
│   ├── app/
│   │   ├── (auth)/login/       # Inicio de sesión seguro con protección anti brute-force
│   │   ├── (public)/           # Landing page, catálogo y wizard de reservas express
│   │   │   ├── reservar/       # Selección de servicio y fecha/hora en vivo
│   │   │   └── confirmacion/   # Recepción y comprobante de pago Mercado Pago
│   │   ├── actions/            # Server Actions mutaciones de BD con RBAC
│   │   ├── api/webhooks/       # Receptor seguro de notificaciones criptográficas de MP
│   │   └── dashboard/          # Agenda, Caja, Servicios, Horarios y Equipo
│   ├── components/             # Componentes modulares accesibles y desacoplados
│   ├── db/                     # Conexión Postgres, esquemas Drizzle y seed inicial
│   └── utils/                  # Auth JWT, disponibilidad horaria, MP SDK y rate limiting
├── drizzle/                    # Migraciones declarativas SQL
├── Dockerfile                  # Multi-stage build optimizado para Coolify
├── next.config.ts              # Configuración Next.js standalone y security headers
└── package.json                # Scripts y dependencias SemVer
```

---

## ⚙️ Variables de Entorno

Crear un archivo `.env` en la raíz (basado en `.env.example`):

```env
# Base de Datos PostgreSQL 16
DATABASE_URL="postgresql://usuario:password@localhost:5432/diogo_barber"

# Autenticación JWT (mínimo 32 caracteres aleatorios)
JWT_SECRET="tu_jwt_secret_ultra_seguro"

# URL Pública de la Aplicación
NEXT_PUBLIC_APP_URL="https://tu-dominio.com"

# Pasarela Mercado Pago
MERCADOPAGO_ACCESS_TOKEN="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxx"
MERCADOPAGO_WEBHOOK_SECRET="tu_webhook_secret_de_mp"

# Datos Comerciales
NEXT_PUBLIC_BUSINESS_NAME="Diogo Barber Shop"
NEXT_PUBLIC_BUSINESS_PHONE="5493834064982"
NEXT_PUBLIC_BUSINESS_INSTAGRAM="@diogobarbershopp"
NEXT_PUBLIC_BUSINESS_FACEBOOK="https://www.facebook.com/DiogoBarberShopCatamarca"
```

---

## 🚀 Despliegue en Producción (Coolify v4 & Hetzner VPS)

1. **Vincular Repositorio:** Conectar el repositorio de GitHub en Coolify apuntando a la rama `main`.
2. **Build Pack:** Seleccionar `Dockerfile` (utiliza el `Dockerfile` multi-stage con compilación standalone expuesto en el puerto `3000`).
3. **Zona Horaria:** El contenedor incluye `tzdata` configurado en `America/Argentina/Catamarca` (`UTC-3`) para garantizar la exactitud de los turnos.
4. **Configurar Variables:** Cargar las variables de entorno en Coolify (`Developer View`).
5. **Certificados SSL:** Traefik administra automáticamente los certificados TLS Let's Encrypt mediante reverse proxy.

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con una suite completa de pruebas unitarias e integración para lógica crítica de negocio y seguridad:

```bash
# Ejecutar suite de pruebas
npm test

# Verificación de tipado estricto
npx tsc --noEmit
```

---

## 📄 Licencia & Créditos

Desarrollado para **Diogo Barber Shop** (@diogobarbershopp) • Catamarca, Argentina.  
Diseño, arquitectura y desarrollo por **Upgrade Informática**.
