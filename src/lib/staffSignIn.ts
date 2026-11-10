import { signInWithEmailAndPassword, type Auth } from 'firebase/auth';

/**
 * Email sign-in for staff screens. Phones often add a space before or after
 * a typed or pasted password; when the exact password is refused and it has
 * one, the trimmed password is tried once before giving up.
 */
export async function staffSignIn(auth: Auth, email: string, password: string) {
  try {
    return await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (err: any) {
    const trimmed = password.trim();
    if (trimmed && trimmed !== password && String(err?.code || '').includes('invalid-credential')) {
      return signInWithEmailAndPassword(auth, email.trim(), trimmed);
    }
    throw err;
  }
}
