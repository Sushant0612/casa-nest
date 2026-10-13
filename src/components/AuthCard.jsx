export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-stone-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-stone-600">{footer}</div>}
      </div>
    </div>
  )
}
