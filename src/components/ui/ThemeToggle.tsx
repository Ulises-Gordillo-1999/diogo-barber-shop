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
    return (
      <div className="w-[104px] h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 animate-pulse" />
    );
  }

  const options: {
    mode: 'light' | 'dark' | 'system';
    icon: typeof Sun;
    label: string;
  }[] = [
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
                ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-xs scale-100'
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
