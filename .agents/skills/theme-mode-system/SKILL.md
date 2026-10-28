---
name: theme-mode-system
description: Production-grade Dark, Light, and System theme architecture for Next.js 16+ and Tailwind CSS v4. Enforces zero-flicker client hydration with inline script, theme persistence (localStorage + system preference), Tailwind v4 custom variants, contrast standards, and bleed-through prevention rules.
---

# Sistema de Temas: Claro, Oscuro y Automático (Tailwind CSS v4 & Next.js 16+)

Este estándar define la arquitectura para implementar soporte de tema **Claro (Light)**, **Oscuro (Dark)** y **Automático (Sistema)** en aplicaciones desarrolladas con **Next.js 16+ (App Router)** y **Tailwind CSS v4**.

---

## ⚡ 1. El Problema del Parpadeo (Anti-Flicker Architecture)

En aplicaciones renderizadas en el servidor (SSR / Server Components), si se espera a que React se hidrate en el cliente para leer `localStorage`, el navegador renderiza el tema por defecto (fondo blanco) y luego de 100-300ms conmuta bruscamente a fondo negro. Este destello blanco (FOUC: Flash of Unstyled Content) arruina la experiencia de usuario.

### La Solución Definitiva: Script Bloqueante en `<head>`
En `src/app/layout.tsx`, se inyecta un `<script>` síncrono e inline que evalúa `localStorage` y la media query del sistema (`prefers-color-scheme: dark`) antes de que el navegador pinte el primer frame del DOM.

```tsx
// src/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (!theme && supportDarkMode)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-dvh antialiased transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```
*Nota: Se añade `suppressHydrationWarning` en `<html>` para que React 19 no emita advertencias por la clase agregada por el script antes de la hidratación.*

---

## 🎨 2. Configuración en Tailwind CSS v4

En **Tailwind CSS v4**, la directiva `@custom-variant` permite vincular la clase `.dark` del elemento raíz `<html>`:

En `src/app/globals.css`:
```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  color-scheme: light;
}

.dark {
  color-scheme: dark;
}
```
*Al configurar `color-scheme`, los scrollbars nativos, calendarios (`<input type="date">`) y controles del navegador se adaptan automáticamente al modo correspondiente.*

---

## 🧩 3. Proveedor de Tema React (`ThemeProvider.tsx`)

Ubicación: `src/components/theme/ThemeProvider.tsx`

```tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Leer preferencia guardada al montar
    const saved = localStorage.getItem('theme') as ThemeMode | null;
    const initialTheme: ThemeMode = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
    setThemeState(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark =
        theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
        setResolvedTheme('dark');
      } else {
        root.classList.remove('dark');
        setResolvedTheme('light');
      }
    };

    applyTheme();

    // Guardar en localStorage
    if (theme === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', theme);
    }

    // Escuchar cambios de preferencia en el SO en tiempo real
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
}
```

---

## 🔘 4. Componente Conmutador de Tema (`ThemeToggle.tsx`)

Control con 3 estados (`[Claro | Oscuro | Sistema]`) accesible y con microinteracciones:

Ubicación: `src/components/ui/ThemeToggle.tsx`

```tsx
'use client';

import { useTheme } from '@/components/theme/ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder estático durante SSR para evitar layout shift
    return <div className="w-[104px] h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 animate-pulse" />;
  }

  const options: { mode: 'light' | 'dark' | 'system'; icon: typeof Sun; label: string }[] = [
    { mode: 'light', icon: Sun, label: 'Modo Claro' },
    { mode: 'dark', icon: Moon, label: 'Modo Oscuro' },
    { mode: 'system', icon: Monitor, label: 'Automático según el Sistema' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Selector de tema visual"
      className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 shadow-xs"
    >
      {options.map(({ mode, icon: Icon, label }) => {
        const isActive = theme === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            onClick={() => setTheme(mode)}
            className={`p-1.5 rounded-lg transition-all duration-150 flex items-center justify-center min-w-[28px] min-h-[28px] ${
              isActive
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs scale-100'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
```

---

## ⚠️ 5. Regla Crítica: Prevención de Sangrado de Fondo (Bleed-Through)

### El Error Común en Producción:
Al adaptar un componente que fue originalmente diseñado con fondos oscuros translúcidos o degradados:
```tsx
/* ❌ ERROR: Provoca que la tarjeta en modo oscuro se vea grisácea o descolorida */
<div className="bg-white dark:bg-gradient-to-br dark:from-zinc-900/90 dark:to-zinc-950 p-6 rounded-2xl">
```
**¿Por qué falla?** El navegador mantiene `background-color: white` debajo del degradado semitransparente oscuro, haciendo que el blanco "sangre" a través del degradado y convirtiendo los negros en grises lavados.

### ✅ Reglas Estrictas de Tokens de Color:
1. **Fondo Sólido / Reset Explícito**:
   Si usas un gradiente en modo oscuro, resetea el fondo:
   ```tsx
   /* ✅ Opción A: Reset explícito */
   <div className="bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950">
   
   /* ✅ Opción B (Recomendada): Colores sólidos con opacidad controlada */
   <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800">
   ```

2. **Matriz de Tokens Estándar**:

| Elemento UI | Modo Claro (Light) | Modo Oscuro (Dark) |
| :--- | :--- | :--- |
| **Fondo de Página** | `bg-slate-50` o `bg-zinc-50` | `bg-zinc-950` |
| **Tarjetas / Contenedores** | `bg-white border-slate-200` | `bg-zinc-900/80 border-zinc-800/80` |
| **Encabezados de Tabla** | `bg-slate-100/75 text-slate-700` | `bg-zinc-800/50 text-zinc-300` |
| **Texto Primario** | `text-slate-900` | `text-zinc-100` |
| **Texto Secundario / Labels** | `text-slate-500` | `text-zinc-400` |
| **Texto Terciario / Muted** | `text-slate-400` | `text-zinc-500` |
| **Inputs & Selects** | `bg-white border-slate-300 text-slate-900` | `bg-zinc-900/70 border-zinc-700 text-zinc-100` |
| **Divisores / Bordes** | `border-slate-200` | `border-zinc-800` |
| **Hover en Filas** | `hover:bg-slate-50` | `hover:bg-zinc-800/40` |

---

## 🔍 6. Contraste de Badges y Acentos de Color

Los badges de estado (Éxito, Peligro, Advertencia) deben mantener legibilidad en fondos claros y oscuros. No usar texto claro en fondos claros ni texto oscuro en fondos oscuros:

```tsx
// Éxito / Aprobado
<span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
  Activo
</span>

// Peligro / Cancelado
<span className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
  Cancelado
</span>

// Advertencia / Pendiente
<span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
  Pendiente
</span>

// Info / Proceso
<span className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
  En Ejecución
</span>
```

---

## ✅ 7. Checklist de Verificación de Temas

Antes de aprobar una pantalla:
- [ ] ¿Hay script inline anti-flicker en `<head>` de `layout.tsx`?
- [ ] ¿Al recargar la página en modo oscuro hay cero parpadeo blanco?
- [ ] ¿El selector tiene los 3 modos: Claro, Oscuro y Sistema?
- [ ] ¿Al cambiar el tema del SO en configuración de Windows/Mac/iOS/Android, la app reacciona inmediatamente en modo Sistema?
- [ ] ¿Se verificó que ninguna tarjeta oscura tenga `bg-white` sangrando por debajo de un gradiente?
- [ ] ¿Los campos de formulario y los textos en tablas son legibles en ambos modos?
