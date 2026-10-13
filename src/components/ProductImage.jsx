import { useEffect, useState } from 'react'
import { Sofa } from 'lucide-react'

// Shows a neutral placeholder if the image URL is missing or fails to load.
export default function ProductImage({ src, alt = '', className = '' }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-stone-100 text-stone-300 ${className}`}>
        <Sofa size={40} />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  )
}
