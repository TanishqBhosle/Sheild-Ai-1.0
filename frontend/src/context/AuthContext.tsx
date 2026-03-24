import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { fbAuth } from '../config/firebase'
import type { UserRole } from '../types'

interface AuthState {
  user: User | null
  role: UserRole
  loading: boolean
}

interface AuthContextType extends AuthState {
  signInEmail: (email: string, password: string) => Promise<void>
  signInGoogle: () => Promise<void>
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(
    (s: AuthState, a: Partial<AuthState>) => ({ ...s, ...a }),
    { user: null, role: 'user', loading: true }
  )

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(fbAuth, async (user) => {
      if (user) {
        const tokenResult = await user.getIdTokenResult()
        const role = (tokenResult.claims['role'] as UserRole) ?? 'user'
        dispatch({ user, role, loading: false })
      } else {
        dispatch({ user: null, role: 'user', loading: false })
      }
    })
    return unsubscribe
  }, [])

  const signInEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(fbAuth, email, password)
  }

  const signInGoogle = async () => {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    await signInWithPopup(fbAuth, provider)
  }

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    const cred = await createUserWithEmailAndPassword(
      fbAuth,
      email,
      password
    )
    await updateProfile(cred.user, { displayName })
    return cred.user
  }

  const logout = async () => {
    await signOut(fbAuth)
    window.location.replace('/login')
  }

  return (
    <AuthContext.Provider
      value={{ ...state, signInEmail, signInGoogle, signUp, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext must be used inside AuthProvider')
  }
  return ctx
}
