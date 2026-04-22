import { signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';
import { api } from './api';

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signup(email: string, password: string, displayName: string, role: string) {
  // Step 1: Call backend to create user + org + claims
  const result = await api.post<{ uid: string; orgId: string; role: string }>('/v1/auth/signup', {
    email, password, displayName, role,
  });

  // Step 2: Sign in with the created credentials
  await signInWithEmailAndPassword(auth, email, password);

  // Step 3: Force token refresh to pick up the new custom claims
  if (auth.currentUser) {
    await auth.currentUser.getIdToken(true);
  }

  return result;
}

export async function logout() {
  return signOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}
