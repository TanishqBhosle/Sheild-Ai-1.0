import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#09090b] p-6 text-center">
      <h1 className="text-4xl font-semibold">404</h1>
      <p className="text-ink-muted">This page does not exist.</p>
      <Link to="/">
        <Button>Go home</Button>
      </Link>
    </div>
  )
}
