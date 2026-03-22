import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Check } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ROUTES } from '../../constants'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type Form = z.infer<typeof schema>

const mapFirebaseError = (code: string): string => {
  if (code === 'auth/user-not-found') {
    return 'No account found with this email'
  }
  if (code === 'auth/wrong-password') {
    return 'Incorrect password'
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Try later.'
  }
  return 'Sign in failed'
}

export default function LoginPage() {
  const { signInEmail, signInGoogle } = useAuth()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: { pathname: string } } }
  const [err, setErr] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Form) => {
    setErr(null)
    try {
      await signInEmail(data.email, data.password)
      const to = loc.state?.from?.pathname ?? ROUTES.home
      nav(to, { replace: true })
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e
          ? String((e as { code: string }).code)
          : ''
      setErr(mapFirebaseError(code))
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-5">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-950 via-[#09090b] to-[#09090b] md:col-span-2 md:flex md:flex-col md:justify-between md:p-10">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_40%)]" />
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <Shield className="h-8 w-8 text-indigo-400" />
            ShieldAI
          </div>
          <p className="text-ink-muted">AI-powered moderation at scale</p>
          <ul className="space-y-2 text-sm text-ink-muted">
            {[
              'Real-time AI content analysis',
              'Gemini-powered severity detection',
              'Full audit trail and compliance',
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <motion.div
        className="col-span-3 flex flex-col justify-center px-6 py-12"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="mx-auto w-full max-w-md space-y-2">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-ink-muted">Sign in to your account</p>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mx-auto mt-8 w-full max-w-md space-y-4"
        >
          <Input type="email" placeholder="Email" {...register('email')} />
          <div className="relative">
            <Input
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-2 top-2 text-xs text-ink-muted"
              onClick={() => setShowPw((s) => !s)}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
          {err ? (
            <motion.p
              className="text-sm text-red-400"
              initial={{ x: -4 }}
              animate={{ x: [0, -4, 4, 0] }}
              transition={{ duration: 0.2 }}
            >
              {err}
            </motion.p>
          ) : null}
          <Button
            type="submit"
            className="h-11 w-full"
            loading={formState.isSubmitting}
          >
            Sign in
          </Button>
        </form>
        <div className="mx-auto mt-6 w-full max-w-md space-y-4">
          <p className="text-center text-xs text-ink-muted">or continue with</p>
          <Button
            type="button"
            variant="secondary"
            className="w-full bg-white text-black hover:bg-zinc-100"
            onClick={() => void signInGoogle().then(() => nav(ROUTES.home))}
          >
            Google
          </Button>
          <p className="text-center text-sm text-ink-muted">
            Don&apos;t have an account?{' '}
            <Link className="text-indigo-400" to="/register">
              Register
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
