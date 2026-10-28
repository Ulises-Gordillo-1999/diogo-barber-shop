'use client';

import { MessageCircle } from 'lucide-react';

interface WhatsAppAlertButtonProps {
  customerPhone: string;
  customerName: string;
  serviceName: string;
  startTime: Date | string;
  variant?: 'reschedule' | 'reminder' | 'general';
  className?: string;
}

export function WhatsAppAlertButton({
  customerPhone,
  customerName,
  serviceName,
  startTime,
  variant = 'reschedule',
  className = '',
}: WhatsAppAlertButtonProps) {
  // Limpiar número de teléfono (quitar caracteres no numéricos)
  let cleanPhone = customerPhone.replace(/\D/g, '');

  // Si no empieza con código de país 54 (Argentina), agregarlo
  if (!cleanPhone.startsWith('54')) {
    cleanPhone = `54${cleanPhone}`;
  }

  const startDate = new Date(startTime);
  const formattedDate = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(startDate);

  const formattedTime = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(startDate);

  let message = '';
  if (variant === 'reschedule') {
    message = `¡Hola ${customerName}! Te escribo de Diogo Barber Shop para avisarte que tu turno de ${serviceName} ha sido reprogramado para el ${formattedDate} a las ${formattedTime} hs. ¡Te esperamos! 💈`;
  } else if (variant === 'reminder') {
    message = `¡Hola ${customerName}! Te recordamos tu turno en Diogo Barber Shop para ${serviceName} el día ${formattedDate} a las ${formattedTime} hs. ¡Nos vemos pronto! 💈`;
  } else {
    message = `¡Hola ${customerName}! Nos comunicamos desde Diogo Barber Shop en relación a tu turno de ${serviceName}.`;
  }

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Avisar a ${customerName} por WhatsApp`}
      title="Avisar por WhatsApp"
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 transition-all min-h-[44px] sm:min-h-[36px] ${className}`}
    >
      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
      <span>Avisar WhatsApp</span>
    </a>
  );
}
