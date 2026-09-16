import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

const client = new OAuth2Client();

// Verifies a Google Identity Services ID token client-side, returning the
// verified email address. Does not create or look up a user - the caller
// decides what an unrecognized email means (this app never self-registers
// a new account from a Google sign-in).
export async function verifyGoogleIdToken(idToken: string): Promise<string> {
  if (!env.googleClientId) {
    throw new UnauthorizedError('Google sign-in is not configured');
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw new UnauthorizedError('Invalid Google credential');
  }

  if (!payload?.email || !payload.email_verified) {
    throw new UnauthorizedError('Google account email is not verified');
  }

  return payload.email;
}
