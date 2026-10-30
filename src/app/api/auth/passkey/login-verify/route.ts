import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { db } from '@/db';
import { passkeyCredentials, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { signToken } from '@/utils/auth';
import {
  getWebAuthnServerConfig,
  getAndClearPasskeyChallengeCookie,
} from '@/utils/webauthnHelpers';

export async function POST(request: NextRequest) {
  try {
    const expectedChallenge = await getAndClearPasskeyChallengeCookie();
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: 'El desafío de inicio de sesión expiró. Intentá nuevamente.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const credentialId = body.id;

    if (!credentialId) {
      return NextResponse.json(
        { error: 'Identificador de credencial faltante.' },
        { status: 400 }
      );
    }

    // 1. Buscar la credencial en la base de datos
    const credRows = await db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.id, credentialId))
      .limit(1);

    const credentialRecord = credRows[0];
    if (!credentialRecord) {
      // 404 explícito para que el cliente pueda invocar Signal API si corresponde
      return NextResponse.json(
        { error: 'Credencial biométrica no registrada en este sistema.' },
        { status: 404 }
      );
    }

    // 2. Buscar al usuario asociado
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.id, credentialRecord.userId))
      .limit(1);

    const user = userRows[0];
    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'La cuenta asociada está inactiva o no existe.' },
        { status: 403 }
      );
    }

    const { rpID, origin } = getWebAuthnServerConfig(request);

    let transportsArr: any[] | undefined = undefined;
    try {
      transportsArr = JSON.parse(credentialRecord.transports);
    } catch {
      transportsArr = undefined;
    }

    const publicKeyBytes = new Uint8Array(
      Buffer.from(credentialRecord.credentialPublicKey, 'base64url')
    );

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credentialRecord.id,
        publicKey: publicKeyBytes,
        counter: credentialRecord.counter,
        transports: transportsArr,
      },
      requireUserVerification: false, // Permite authenticators configurados con UV preferred
    });

    if (!verification.verified || !verification.authenticationInfo) {
      return NextResponse.json(
        { error: 'Fallo en la validación de la huella digital.' },
        { status: 400 }
      );
    }

    // 3. Actualizar contador y fecha de último uso
    await db
      .update(passkeyCredentials)
      .set({
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      })
      .where(eq(passkeyCredentials.id, credentialRecord.id));

    // 4. Emitir JWT de sesión por 30 días para PWA Android
    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 días
    });

    return NextResponse.json({
      ok: true,
      redirectUrl: '/dashboard',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error en login-verify WebAuthn:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al verificar la biometría.' },
      { status: 500 }
    );
  }
}

