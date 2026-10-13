import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight,RotateCcw,ShieldCheck,Truck} from 'lucide-react'

import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import ProductImage from '../components/ProductImage'
import Spinner from '../components/Spinner'

import { FREE_SHIPPING_THRESHOLD,formatPrice,} from '../lib/format'

export default function Home() {
  const [categories, setCategories] = useState([])
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const perks = [
    {
      Icon: Truck,
      title: 'Free delivery',
      text: `On orders above ${formatPrice(FREE_SHIPPING_THRESHOLD)}`,
    },
    {
      Icon: ShieldCheck,
      title: 'Quality assured',
      text: 'Built from solid, responsibly sourced materials',
    },
    {
      Icon: RotateCcw,
      title: 'Easy cancellations',
      text: 'Cancel anytime before your order ships',
    },
  ]

  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      try {
        const [categoriesResult, productsResult] = await Promise.all([
          supabase
            .from('categories')
            .select('*')
            .order('name'),

          supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .eq('is_featured', true)
            .order('created_at', { ascending: false })
            .limit(8),
        ])

        if (categoriesResult.error) {
          throw categoriesResult.error
        }

        if (productsResult.error) {
          throw productsResult.error
        }

        if (!mounted) return

        setCategories(categoriesResult.data ?? [])
        setFeatured(productsResult.data ?? [])

        // Log the fetched data directly.
        console.log('Featured products:', productsResult.data)
      } catch (err) {
        console.error('Error fetching home page data:', err)

        if (mounted) {
          setError('Unable to load store data. Please try again.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      mounted = false
    }
  }, [])


  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-100">
        <div className="container-page grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">
              New season collection
            </p>

            <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
              Furniture that makes a house feel like home.
            </h1>

            <p className="mt-4 max-w-lg text-stone-600">
              Solid-wood beds, cosy sofas, dining sets and décor —
              designed to last and delivered to your door.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary">
                Shop now <ArrowRight size={16} />
              </Link>

              <Link
                to="/shop?category=living-room"
                className="btn-outline"
              >
                Living room
              </Link>
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-xl">
            <ProductImage
              src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200"
              alt="Bright living room"
              className="h-full w-full"
            />
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="container-page grid gap-4 py-10 sm:grid-cols-3">
        {perks.map(({ Icon, title, text }) => (
          <div
            key={title}
            className="card flex items-start gap-4 p-5"
          >
            <div className="rounded-lg bg-brand-100 p-2.5 text-brand-700">
              <Icon size={22} />
            </div>

            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-stone-500">{text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section className="container-page py-6">
        <h2 className="text-2xl font-semibold">Shop by room</h2>

        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="mt-5 text-red-600">{error}</p>
        ) : categories.length === 0 ? (
          <p className="mt-5 text-stone-500">
            No categories available yet.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/shop?category=${encodeURIComponent(c.slug)}`}
                className="group"
              >
                <div className="aspect-square overflow-hidden rounded-xl bg-stone-100">
                  <ProductImage
                    src={c.image_url}
                    alt={c.name}
                    className="h-full w-full transition duration-300 group-hover:scale-105"
                  />
                </div>

                <p className="mt-2 text-center text-sm font-medium group-hover:text-brand-700">
                  {c.name}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured products */}
      <section className="container-page py-10">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold">Featured pieces</h2>

          <Link
            to="/shop"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            View all
          </Link>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="mt-5 text-stone-500">
            Featured products could not be loaded.
          </p>
        ) : featured.length === 0 ? (
          <p className="mt-6 text-stone-500">
            No featured products yet. Mark products as featured
            in the admin panel.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}