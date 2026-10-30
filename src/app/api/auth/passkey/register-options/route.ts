import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getSessionUser } from '@/utils/auth';
import { db } from '@/db';
import { passkeyCredentials } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  RP_NAME,
  getWebAuthnServerConfig,
  setPasskeyChallengeCookie,
} from '@/utils/webauthnHelpers';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión previamente.' },
        { status: 401 }
      );
    }

    const { rpID } = getWebAuthnServerConfig(request);

    // Obtener credenciales existentes del usuario para excluirlas
    const existingCreds = await db
      .select({ id: passkeyCredentials.id, transports: passkeyCredentials.transports })
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, session.id));

    const excludeCredentials = existingCreds.map((cred) => {
      let transportsArr: any[] | undefined = undefined;
      try {
        transportsArr = JSON.parse(cred.transports);
      } catch {
        transportsArr = undefined;
      }
      return {
        id: cred.id,
        transports: transportsArr,
      };
    });

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userID: new Uint8Array(Buffer.from(session.id)),
      userName: session.email,
      userDisplayName: session.name || session.email,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // Obliga al sensor biométrico del dispositivo (Android/FaceID)
      },
    });

    await setPasskeyChallengeCookie(options.challenge);

    return NextResponse.json(options);
  } catch (error) {
    console.error('Error generando opciones de registro WebAuthn:', error);
    return NextResponse.json(
      { error: 'Error al iniciar vinculación biométrica.' },
      { status: 500 }
    );
  }
}
