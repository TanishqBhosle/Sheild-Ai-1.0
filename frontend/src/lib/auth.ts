import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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
  const result = await api.post<{ uid: string; orgId: string; role: string }>('/v1/auth/signup', {
    email, password, displayName, role,
  });
  // Now sign in with the created credentials
  await signInWithEmailAndPassword(auth, email, password);
  return result;
}

export async function logout() {
  return signOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}
