---
name: responsive-design
description: Standards, architecture, and ergonomics for building fully responsive, mobile-first web applications with Next.js 16+ and Tailwind CSS v4. Enforces mobile topbars with off-canvas drawers, hybrid card-to-table data views, minimum 44px touch targets, dynamic viewport units (dvh), iOS auto-zoom prevention (16px form inputs), and mobile modal ergonomics.
---

# Responsive Design & Mobile-First Engineering Standard

Este estándar define las reglas obligatorias de diseño responsivo y ergonomía móvil para todas las aplicaciones desarrolladas con **Next.js 16+ (App Router)** y **Tailwind CSS v4**.

---

## 🎯 1. Filosofía: Mobile-First en Software Operativo

En aplicaciones de gestión empresarial, ERPs, clínicas, logística o inventarios:
- **Técnicos, secretarias y operarios** utilizan teléfonos inteligentes y tablets en movimiento o en el mostrador.
- **Supervisores y administradores** operan en computadoras de escritorio.

**Regla de Oro**: Ninguna pantalla puede desarrollarse asumiendo un monitor de 1920px. Toda vista debe diseñarse primero para pantallas de **360px a 390px (Mobile)**, escalar de forma natural a **768px - 1024px (Tablet)** y expandirse con máxima densidad de información en **1280px+ (Desktop)**.

### Breakpoints Oficiales (Tailwind CSS v4)
- **Mobile (Por defecto)**: `< 640px` (Vista a 1 columna, tarjetas compactas, topbar + drawer).
- **Mobile Grande / Phablet (`sm:`)**: `640px - 767px` (Parrillas de 2 columnas, modales centrados).
- **Tablet (`md:`)**: `768px - 1023px` (Inicio de tablas de datos, layouts híbridos).
- **Desktop (`lg:`)**: `1024px - 1279px` (Sidebar lateral fijo visible, densidad completa).
- **Wide Desktop (`xl:`, `2xl:`)**: `1280px+` (Contenedores con `max-w-7xl` o layouts extendidos).

---

## 📱 2. Configuración de Viewport y Unidades Dinámicas (Next.js 15+)

### A. Viewport Export en `src/app/layout.tsx`
Evita el zoom automático accidental y declara colores de barra de estado según el tema:

```typescript
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};
```

### B. Unidades de Alto Dinámico (`dvh` en vez de `vh`)
En navegadores móviles (iOS Safari, Android Chrome), la barra de direcciones del navegador cambia de tamaño al hacer scroll. Usar `100vh` rompe la vista y corta botones inferiores.

- ✅ **Correcto**: `min-h-dvh`, `h-dvh`, `max-h-[90dvh]`
- ❌ **Prohibido**: `h-screen` o `100vh` en contenedores raíz o modales móviles.

---

## 🧭 3. Arquitectura de Navegación Responsiva

Toda aplicación debe implementar un sistema de doble navegación:
1. **Desktop (`lg:flex`)**: Sidebar lateral fijo (`w-64` o `w-72`) con menú jerárquico.
2. **Mobile/Tablet (`lg:hidden`)**: Mobile Topbar con botón hamburguesa (`Menu`) y un **Off-Canvas Drawer** animado.

### Patrón de Layout Principal (`src/components/layout/AppLayout.tsx`)

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Home, Users, Package, Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/inventario', label: 'Inventario', icon: Package },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar el drawer automáticamente al cambiar de ruta
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Bloquear scroll de la página cuando el drawer móvil está abierto
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-dvh bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 overflow-hidden">
      {/* 1. Sidebar Fijo en Desktop (lg+) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-4 shrink-0">
        <div className="flex items-center justify-between mb-8">
          <span className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400">UPGRADE</span>
          <ThemeToggle />
        </div>
        <nav className="flex-1 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 2. Drawer Off-Canvas Móvil con Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 p-5 shadow-2xl lg:hidden transform transition-transform duration-300 ease-in-out flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800 mb-6">
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">UPGRADE</span>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-zinc-400">Tema</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* 3. Área de Contenido Principal con Topbar Móvil */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar visible solo en Mobile/Tablet (< lg) */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shrink-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            className="p-2.5 -ml-2 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Menu className="w-6 h-6" />
          </button>

          <span className="font-semibold text-slate-900 dark:text-zinc-100 truncate">
            UPGRADE
          </span>

          <ThemeToggle />
        </header>

        {/* Contenido con scroll dinámico */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

---

## 📊 4. Patrón Híbrido: Tarjetas en Mobile vs Tablas en Desktop

Las tablas con 5+ columnas colapsan en pantallas móviles, obligando a un scroll horizontal incómodo o cortando el texto.

**El Estándar Oficial**: Usar el **Patrón Híbrido**:
- En pantallas móviles (`< md`): Se renderizan **Tarjetas Interactivas** (`Card View`) con jerarquía visual clara.
- En pantallas medianas y grandes (`md+`): Se renderiza la **Tabla de Datos Completa** (`Table View`).

### Ejemplo de Implementación Híbrida (`src/components/clientes/TablaClientes.tsx`)

```tsx
'use client';

interface Cliente {
  id: string;
  nombre: string;
  cuit: string;
  telefono: string;
  estado: 'Activo' | 'Inactivo';
}

export function TablaClientes({ clientes }: { clientes: Cliente[] }) {
  return (
    <div className="w-full">
      {/* VISTA MÓVIL: Tarjetas (< md) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {clientes.map((c) => (
          <div
            key={c.id}
            className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-zinc-100">{c.nombre}</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">CUIT: {c.cuit}</p>
              </div>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  c.estado === 'Activo'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {c.estado}
              </span>
            </div>

            <div className="text-sm text-slate-600 dark:text-zinc-300">
              <span className="text-xs text-slate-400">Tel:</span> {c.telefono}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex justify-end gap-2">
              <button className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200">
                Ver Detalles
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* VISTA DESKTOP/TABLET: Tabla Tradicional (>= md) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-xs">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">CUIT</th>
              <th className="px-4 py-3 font-semibold">Teléfono</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-zinc-100">{c.nombre}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">{c.cuit}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">{c.telefono}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      c.estado === 'Activo'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {c.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="px-2.5 py-1 text-xs font-medium rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 🖐️ 5. Ergonomía Táctil y Formularios Móviles

### A. Touch Targets (Objetivos Táctiles $\ge 44 \times 44\text{px}$)
El dedo pulgar requiere un área de contacto mínima de 44x44 píxeles según las pautas de Apple HIG y Google Material Design.
- Todos los botones interactivos, switches y selectores deben tener `min-h-[44px] min-w-[44px]` o contar con un padding contenedor que lo garantice (`p-2.5` en íconos).

### B. Prevención de Zoom Forzado en iOS Safari (`text-base md:text-sm`)
Si un `<input>`, `<select>` o `<textarea>` tiene un `font-size` menor a **16px** (como `text-sm` = 14px o `text-xs` = 12px), iOS Safari realiza un molesto zoom automático al enfocar el campo, rompiendo la composición de la pantalla.

- ✅ **Regla Estricta**: Usar siempre `text-base md:text-sm` en todos los inputs.
```tsx
<input
  type="text"
  className="w-full px-3.5 py-2.5 text-base md:text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
/>
```

### C. Teclados Virtuales Móviles (`inputMode`)
Optimiza el teclado que despliega el smartphone según el tipo de dato:
- Montos / Precios / Monedas: `inputMode="decimal"`
- SKUs / Códigos de barra / Teléfonos: `inputMode="numeric"`
- Emails: `type="email" autoCapitalize="none" autoCorrect="off"`
- Búsquedas: `type="search"`

---

## 🪟 6. Modales y Diálogos Responsivos

Los modales en pantallas móviles no deben cortarse ni quedar ocultos debajo de la barra de navegación del celular.

1. **Montaje en Portal**: Siempre usar `createPortal(..., document.body)`.
2. **Contenedor Móvil**:
   - Centrado con margen: `p-4 flex items-center justify-center`.
   - Altura máxima controlada: `max-h-[90dvh] flex flex-col`.
   - Cabecera fija (`shrink-0`), contenido con scroll suave (`overflow-y-auto flex-1 p-5`), pie de botones fijo (`shrink-0 p-4 border-t`).
3. **Distribución de Botones de Acción**:
   - En mobile: Apilados verticalmente con el botón principal arriba o con orden inverso de cancelación (`flex flex-col-reverse sm:flex-row sm:justify-end gap-2`).
   - Cada botón con `w-full sm:w-auto min-h-[44px]` para ser pulsado con comodidad.

---

## ✅ 7. Checklist de Auditoría Responsive

Antes de dar por finalizada cualquier pantalla o módulo, verificar:
- [ ] ¿Se probó la vista en ancho estrecho (375px - iPhone SE / iPhone 13)?
- [ ] ¿El menú lateral se convierte en drawer deslizable con backdrop?
- [ ] ¿Las tablas de muchas columnas tienen vista alternativa en tarjetas (`Card View`) en `< md`?
- [ ] ¿Los botones e íconos tienen un área táctil mínima de 44x44px?
- [ ] ¿Los campos de formulario usan `text-base md:text-sm` para evitar el auto-zoom en iPhone?
- [ ] ¿Los modales usan `max-h-[90dvh]` con scroll interno y `createPortal`?
- [ ] ¿Los montos y números activan el teclado adecuado con `inputMode="decimal"` o `"numeric"`?
