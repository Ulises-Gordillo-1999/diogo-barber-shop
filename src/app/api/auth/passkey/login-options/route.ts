import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import {
  getWebAuthnServerConfig,
  setPasskeyChallengeCookie,
} from '@/utils/webauthnHelpers';

export async function GET(request: NextRequest) {
  try {
    const { rpID } = getWebAuthnServerConfig(request);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [], // Discoverable credential: el dispositivo identifica al usuario
      userVerification: 'preferred',
    });

    await setPasskeyChallengeCookie(options.challenge);

    return NextResponse.json(options);
  } catch (error) {
    console.error('Error generando opciones de login WebAuthn:', error);
    return NextResponse.json(
      { error: 'Error al iniciar acceso biométrico.' },
      { status: 500 }
    );
  }
}
