import { Star } from 'lucide-react'

export default function Rating({ value = 0, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}
        />
      ))}
    </span>
  )
}
