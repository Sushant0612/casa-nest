import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="text-6xl font-bold text-brand-300">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-1 text-stone-500">The page you are looking for does not exist.</p>
      <Link to="/" className="btn-primary mt-6">Go home</Link>
    </div>
  )
}
