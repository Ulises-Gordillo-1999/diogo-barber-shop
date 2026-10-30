import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getSessionUser } from '@/utils/auth';
import { db } from '@/db';
import { passkeyCredentials } from '@/db/schema';
import {
  getWebAuthnServerConfig,
  getAndClearPasskeyChallengeCookie,
} from '@/utils/webauthnHelpers';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { error: 'Sesión no válida o expirada.' },
        { status: 401 }
      );
    }

    const expectedChallenge = await getAndClearPasskeyChallengeCookie();
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: 'El desafío de seguridad expiró. Intentalo de nuevo.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rpID, origin } = getWebAuthnServerConfig(request);

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false, // preferred
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'No se pudo verificar la huella o biometría.' },
        { status: 400 }
      );
    }

    const { credential, credentialDeviceType, credentialBackedUp, aaguid } =
      verification.registrationInfo;

    const base64PublicKey = Buffer.from(credential.publicKey).toString('base64url');
    const transportsJson = JSON.stringify(body.response?.transports || ['internal', 'hybrid']);
    const deviceName = 'Celular Android / Biometría vinculada';

    // Guardar credencial biométrica en base de datos
    await db.insert(passkeyCredentials).values({
      id: credential.id,
      userId: session.id,
      credentialPublicKey: base64PublicKey,
      counter: credential.counter,
      credentialDeviceType,
      credentialBackedUp,
      transports: transportsJson,
      deviceName,
      aaguid: aaguid || '00000000-0000-0000-0000-000000000000',
    });

    return NextResponse.json({
      ok: true,
      message: '¡Huella / Biometría vinculada con éxito!',
      deviceName,
    });
  } catch (error) {
    console.error('Error verificando registro WebAuthn:', error);
    return NextResponse.json(
      { error: 'Error al verificar la biometría en el servidor.' },
      { status: 500 }
    );
  }
}

