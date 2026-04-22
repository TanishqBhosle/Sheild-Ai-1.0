import { signOut, GoogleAuthProvider, signInWithPopup, signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase';
import { api } from './api';

export async function loginWithEmail(email: string, password: string) {
  const result = await api.post<{ token: string; firebaseToken: string; user: any }>('/v1/auth/login', { email, password });
  
  // Login to Firebase with custom token
  await signInWithCustomToken(auth, result.firebaseToken);
  
  localStorage.setItem('aegis_token', result.token);
  localStorage.setItem('aegis_user', JSON.stringify(result.user));
  return result;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  const token = await cred.user.getIdToken();
  // For Google, we still use Firebase token but our middleware handles it
  return cred;
}

export async function signup(email: string, password: string, displayName: string, role: string) {
  // Step 1: Call backend to create user + org + claims
  const result = await api.post<{ uid: string; orgId: string; role: string; token?: string }>('/v1/auth/signup', {
    email, password, displayName, role,
  });

  // Step 2: Login immediately to get the JWT
  await loginWithEmail(email, password);

  return result;
}

export async function logout() {
  localStorage.removeItem('aegis_token');
  localStorage.removeItem('aegis_user');
  return signOut(auth);
}

export function getCurrentUser() {
  const user = localStorage.getItem('aegis_user');
  return user ? JSON.parse(user) : auth.currentUser;
}
