'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getSessionUser, hashPassword } from '@/utils/auth';

export async function createStaffUserAction(input: {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'BARBER';
  phone?: string;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return {
      success: false,
      error: 'No autorizado. Solo un administrador puede registrar personal.',
    };
  }

  try {
    const cleanEmail = input.email.trim().toLowerCase();
    if (!input.name.trim() || !cleanEmail || input.password.length < 8) {
      return {
        success: false,
        error: 'Completá nombre, correo y una contraseña de al menos 8 caracteres.',
      };
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: 'Ya existe un integrante registrado con ese correo electrónico.',
      };
    }

    const passwordHash = await hashPassword(input.password);

    const [created] = await db
      .insert(users)
      .values({
        name: input.name.trim(),
        email: cleanEmail,
        passwordHash,
        role: input.role === 'ADMIN' ? 'ADMIN' : 'BARBER',
        phone: input.phone?.trim() || null,
        active: true,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone: users.phone,
        active: users.active,
        createdAt: users.createdAt,
      });

    revalidatePath('/dashboard/usuarios');
    return { success: true, user: created };
  } catch (error) {
    console.error('Error creando usuario:', error);
    return { success: false, error: 'Error al registrar el usuario.' };
  }
}

export async function updateUserCredentialsAction(input: {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  newPassword?: string;
  confirmPassword?: string;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return {
      success: false,
      error: 'No autorizado. Solo un administrador puede actualizar credenciales.',
    };
  }

  try {
    const cleanName = input.name.trim();
    const cleanEmail = input.email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      return {
        success: false,
        error: 'El nombre y el correo electrónico son obligatorios.',
      };
    }

    // Verificar que otro usuario no esté usando ese email
    const duplicate = await db
      .select()
      .from(users)
      .where(and(eq(users.email, cleanEmail), ne(users.id, input.userId)))
      .limit(1);

    if (duplicate.length > 0) {
      return {
        success: false,
        error: 'Ese correo electrónico ya pertenece a otro integrante.',
      };
    }

    const updateData: {
      name: string;
      email: string;
      phone: string | null;
      passwordHash?: string;
      updatedAt: Date;
    } = {
      name: cleanName,
      email: cleanEmail,
      phone: input.phone?.trim() || null,
      updatedAt: new Date(),
    };

    // Si ingresó una nueva contraseña, validarla y hashearla con bcrypt (12 rondas)
    if (input.newPassword && input.newPassword.trim().length > 0) {
      if (input.newPassword.length < 8) {
        return {
          success: false,
          error: 'La nueva contraseña debe tener al menos 8 caracteres por seguridad.',
        };
      }
      if (input.newPassword !== input.confirmPassword) {
        return {
          success: false,
          error: 'Las contraseñas ingresadas no coinciden.',
        };
      }
      updateData.passwordHash = await hashPassword(input.newPassword);
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, input.userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone: users.phone,
        active: users.active,
        createdAt: users.createdAt,
      });

    revalidatePath('/dashboard/usuarios');
    revalidatePath('/dashboard');

    return {
      success: true,
      user: updated,
      message: updateData.passwordHash
        ? 'Contraseña y datos actualizados con éxito.'
        : 'Datos del usuario actualizados con éxito.',
    };
  } catch (error) {
    console.error('Error actualizando credenciales de usuario:', error);
    return {
      success: false,
      error: 'Error interno al actualizar las credenciales.',
    };
  }
}

export async function toggleUserActiveAction(id: string, currentActive: boolean) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return {
      success: false,
      error: 'No autorizado. Solo un administrador puede modificar accesos.',
    };
  }

  if (sessionUser.id === id && currentActive) {
    return {
      success: false,
      error: 'No podés suspender tu propia cuenta de administrador activa.',
    };
  }

  try {
    await db
      .update(users)
      .set({ active: !currentActive, updatedAt: new Date() })
      .where(eq(users.id, id));

    revalidatePath('/dashboard/usuarios');
    return { success: true };
  } catch (error) {
    console.error('Error actualizando estado de usuario:', error);
    return { success: false, error: 'No se pudo actualizar el usuario.' };
  }
}
