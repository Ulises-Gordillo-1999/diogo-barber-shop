'use client';

import { useState, useTransition, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  ShieldCheck,
  Scissors,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  X,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  createStaffUserAction,
  toggleUserActiveAction,
  updateUserCredentialsAction,
} from '@/app/actions/usersActions';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'BARBER';
  phone: string | null;
  active: boolean;
  createdAt: Date | string;
}

interface UsersManagerProps {
  initialUsers: StaffMember[];
  isAdmin: boolean;
}

export function UsersManager({ initialUsers, isAdmin }: UsersManagerProps) {
  const [staff, setStaff] = useState<StaffMember[]>(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Create Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'BARBER'>('BARBER');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Edit / Change Password Form states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openEditModal = (member: StaffMember) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditPhone(member.phone || '');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setEditErrorMsg(null);
  };

  const handleToggle = (id: string, currentActive: boolean) => {
    setSuccessBanner(null);
    startTransition(async () => {
      const res = await toggleUserActiveAction(id, currentActive);
      if (res.success) {
        setStaff((prev) =>
          prev.map((u) => (u.id === id ? { ...u, active: !currentActive } : u))
        );
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessBanner(null);

    startTransition(async () => {
      const res = await createStaffUserAction({
        name,
        email,
        password,
        role,
        phone,
      });

      if (res.success && res.user) {
        setStaff((prev) => [...prev, res.user as StaffMember]);
        setName('');
        setEmail('');
        setPassword('');
        setPhone('');
        setIsModalOpen(false);
        setSuccessBanner('Nuevo integrante registrado correctamente.');
      } else {
        setErrorMsg(res.error || 'Error al crear el integrante.');
      }
    });
  };

  const handleUpdateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setEditErrorMsg(null);
    setSuccessBanner(null);

    startTransition(async () => {
      const res = await updateUserCredentialsAction({
        userId: editingMember.id,
        name: editName,
        email: editEmail,
        phone: editPhone,
        newPassword,
        confirmPassword,
      });

      if (res.success && res.user) {
        setStaff((prev) =>
          prev.map((u) => (u.id === editingMember.id ? (res.user as StaffMember) : u))
        );
        setEditingMember(null);
        setSuccessBanner(res.message || 'Credenciales actualizadas con éxito.');
      } else {
        setEditErrorMsg(res.error || 'Error al actualizar las credenciales.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs">
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#b38f2d] dark:text-[#d4af37] block mb-1">
            EQUIPO & CREDENCIALES RBAC
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-[#f4efe6]">
            Barberos & Administradores
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Gestioná el personal y actualizá las contraseñas de acceso al panel operativo.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 shadow-lg shadow-[#d4af37]/20 transition-all min-h-[46px] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Sumar Integrante</span>
          </button>
        )}
      </div>

      {/* Aviso de éxito al cambiar clave o crear usuario */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:opacity-75 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grilla de Integrantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {staff.map((member) => (
          <div
            key={member.id}
            className="p-6 rounded-3xl bg-white dark:bg-[#100f13] border border-zinc-200/90 dark:border-zinc-800/90 flex flex-col justify-between gap-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/35 flex items-center justify-center text-[#b38f2d] dark:text-[#d4af37] font-serif text-lg font-bold">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-zinc-950 dark:text-[#f4efe6]">
                    {member.name}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#b38f2d] dark:text-[#d4af37] font-bold mt-0.5">
                    {member.role === 'ADMIN' ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Administrador General
                      </>
                    ) : (
                      <>
                        <Scissors className="w-3.5 h-3.5" />
                        Barbero Profesional
                      </>
                    )}
                  </span>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  member.active
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                    : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                }`}
              >
                {member.active ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                {member.active ? 'Activo' : 'Suspendido'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-100 dark:border-zinc-800/80 space-y-1.5 font-mono text-xs">
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                <Mail className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <Phone className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>{member.phone}</span>
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openEditModal(member)}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#d4af37]/15 text-[#9a7b22] dark:text-[#d4af37] border border-[#d4af37]/30 hover:bg-[#d4af37] hover:text-zinc-950 transition-all min-h-[42px] cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Cambiar Clave / Editar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle(member.id, member.active)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-rose-500/15 hover:text-rose-500 hover:border-rose-500/30 transition-colors min-h-[42px] cursor-pointer"
                >
                  {member.active ? 'Pausar Acceso' : 'Habilitar Acceso'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Portal para Cambiar Contraseña / Editar Integrante */}
      {mounted &&
        editingMember &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-[#f4efe6]">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#d4af37] block">
                    SEGURIDAD & CREDENCIALES
                  </span>
                  <h3 className="text-lg font-extrabold">
                    Editar Acceso — {editingMember.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editErrorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleUpdateCredentials} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase text-zinc-500">
                    Nombre Visible *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-3 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono uppercase text-zinc-500">
                      Correo de Login *
                    </label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3.5 py-3 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono uppercase text-zinc-500">
                      WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+5493834..."
                      className="w-full px-3.5 py-3 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#b38f2d] dark:text-[#d4af37] flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      Cambiar Contraseña
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Opcional si solo editás datos
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono uppercase text-zinc-500">
                      Nueva Contraseña Robusta (mín. 8 caracteres)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Dejar en blanco para mantener la actual"
                        className="w-full pl-10 pr-10 py-3 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 cursor-pointer"
                        title={showPassword ? 'Ocultar clave' : 'Ver clave'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {newPassword.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-mono uppercase text-zinc-500">
                        Confirmar Nueva Contraseña *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repetí la nueva contraseña"
                          className="w-full pl-10 pr-3.5 py-3 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 min-h-[44px]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 min-h-[44px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#c59b27] text-zinc-950 inline-flex items-center gap-2 min-h-[44px] cursor-pointer shadow-md shadow-[#d4af37]/20"
                  >
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Portal para Nuevo Integrante */}
      {mounted &&
        isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white dark:bg-[#121115] border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-[#f4efe6]">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#d4af37] block">
                    ALTA DE PERSONAL
                  </span>
                  <h3 className="text-lg font-extrabold">Nuevo Integrante</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase text-zinc-500">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Lucas Nieva"
                    className="w-full px-3.5 py-3 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 min-h-[44px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase text-zinc-500">
                    Correo Electrónico (Login) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="barbero@diogobarber.com"
                    className="w-full px-3.5 py-3 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 min-h-[44px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase text-zinc-500">
                    Contraseña Inicial (mín. 8 caracteres) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full pl-10 pr-3.5 py-3 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono uppercase text-zinc-500">
                      Rol en el Sistema
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'ADMIN' | 'BARBER')}
                      className="w-full px-3 py-3 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 min-h-[44px]"
                    >
                      <option value="BARBER">Barbero</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono uppercase text-zinc-500">
                      WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="3834..."
                      className="w-full px-3 py-3 text-base md:text-sm rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 min-h-[44px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#d4af37] text-zinc-950 inline-flex items-center gap-2 min-h-[44px]"
                  >
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Crear Acceso</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
