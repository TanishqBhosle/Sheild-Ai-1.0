import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Check } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { setUserRole } from '../../services/auth.service'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ROUTES } from '../../constants'

const schema = z
  .object({
    displayName: z.string().min(2),
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Need uppercase')
      .regex(/[0-9]/, 'Need number'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Must match' })

type Form = z.infer<typeof schema>

export default function RegisterPage() {
  const { signUp } = useAuth()
  const nav = useNavigate()
  const [err, setErr] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Form) => {
    setErr(null)
    try {
      const user = await signUp(data.email, data.password, data.displayName)
      await setUserRole(user.uid, 'user')
      await user.getIdToken(true)
      nav(ROUTES.home)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Registration failed')
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
          <p className="text-ink-muted">Create your account</p>
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
      >
        <div className="mx-auto w-full max-w-md space-y-2">
          <h1 className="text-2xl font-semibold">Register</h1>
          <p className="text-sm text-ink-muted">Start moderating with ShieldAI</p>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mx-auto mt-8 w-full max-w-md space-y-3"
        >
          <Input placeholder="Display name" {...register('displayName')} />
          <Input type="email" placeholder="Email" {...register('email')} />
          <Input type="password" placeholder="Password" {...register('password')} />
          <Input
            type="password"
            placeholder="Confirm password"
            {...register('confirm')}
          />
          {formState.errors.confirm ? (
            <p className="text-xs text-red-400">{formState.errors.confirm.message}</p>
          ) : null}
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
          <Button
            type="submit"
            className="h-11 w-full"
            loading={formState.isSubmitting}
          >
            Create account
          </Button>
        </form>
        <p className="mx-auto mt-6 max-w-md text-center text-sm text-ink-muted">
          Already have an account?{' '}
          <Link className="text-indigo-400" to="/login">
            Login
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
