import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function formatCurrency(n){
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function ProductCard({ product, onAdd }){
  return (
    <div className="group rounded-xl border bg-white/70 p-4 backdrop-blur transition hover:shadow-lg">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
        <img src={product.images?.[0] || `https://picsum.photos/seed/${product.id}/600/600`} alt={product.title} className="h-full w-full object-cover transition group-hover:scale-105"/>
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="line-clamp-1 text-sm font-semibold text-gray-900">{product.title}</h3>
          <p className="mt-1 text-xs text-gray-500 line-clamp-2">{product.description}</p>
        </div>
        <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{formatCurrency(product.price)}</span>
      </div>
      <button onClick={()=>onAdd(product)} className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700">Ajouter au panier</button>
    </div>
  )
}

function Cart({ items, onChangeQty, onCheckout }){
  const subtotal = items.reduce((s,i)=> s + i.price * i.quantity, 0)
  return (
    <div className="sticky top-20 rounded-xl border bg-white/70 p-4 backdrop-blur">
      <h3 className="text-lg font-semibold">Panier</h3>
      <div className="mt-3 space-y-3 max-h-[50vh] overflow-auto pr-2">
        {items.length===0 && <p className="text-sm text-gray-500">Votre panier est vide.</p>}
        {items.map((it)=> (
          <div key={it.id} className="flex items-center gap-3">
            <img src={it.images?.[0] || `https://picsum.photos/seed/${it.id}/80/80`} className="h-12 w-12 rounded object-cover"/>
            <div className="flex-1">
              <p className="text-sm font-medium">{it.title}</p>
              <p className="text-xs text-gray-500">{formatCurrency(it.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-6 w-6 rounded border" onClick={()=>onChangeQty(it.id, Math.max(1, it.quantity-1))}>-</button>
              <span className="text-sm w-6 text-center">{it.quantity}</span>
              <button className="h-6 w-6 rounded border" onClick={()=>onChangeQty(it.id, it.quantity+1)}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">Sous-total</span>
        <span className="text-sm font-semibold">{formatCurrency(subtotal)}</span>
      </div>
      <button disabled={items.length===0} onClick={onCheckout} className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white disabled:opacity-50">Commander</button>
    </div>
  )
}

export default function App(){
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const filtered = useMemo(()=>{
    if(!query) return products
    const q = query.toLowerCase()
    return products.filter(p=> (p.title||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q))
  },[query, products])

  useEffect(()=>{
    const controller = new AbortController()
    setLoading(true)
    fetch(`${API_BASE}/api/products`, { signal: controller.signal })
      .then(r=>r.json())
      .then(setProducts)
      .catch(()=>{})
      .finally(()=>setLoading(false))
    return ()=>controller.abort()
  },[])

  function addToCart(product){
    setCart(prev=>{
      const ex = prev.find(p=>p.id===product.id)
      if(ex){ return prev.map(p=> p.id===product.id ? { ...p, quantity: p.quantity+1 } : p) }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  function changeQty(id, qty){
    setCart(prev=> prev.map(p=> p.id===id ? { ...p, quantity: qty } : p))
  }

  async function checkout(){
    setMessage('')
    try{
      const subtotal = cart.reduce((s,i)=> s + i.price * i.quantity, 0)
      const payload = {
        user_id: 'guest',
        items: cart.map(({id,title,price,quantity,images})=>({ product_id: id, title, price, quantity, image: images?.[0] })),
        subtotal,
        shipping: 0,
        total: subtotal,
        status: 'pending',
        shipping_info: { full_name: 'Guest', address: 'N/A', city: 'N/A', postal_code: '00000', country: 'FR' }
      }
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer guest-token' },
        body: JSON.stringify(payload)
      })
      if(!res.ok){
        const e = await res.json(); throw new Error(e.detail||'Erreur de commande')
      }
      setCart([])
      setMessage('Commande créée ! (paiement mock)')
    }catch(e){
      setMessage(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">BlueShop</h1>
          <div className="flex w-full max-w-md items-center gap-2">
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Rechercher un produit" className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
            <button onClick={()=>{}} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white">Rechercher</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <h2 className="mb-3 text-lg font-semibold">Produits</h2>
            {loading ? (
              <p className="text-sm text-gray-500">Chargement...</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {filtered.map(p=> (
                  <ProductCard key={p.id} product={p} onAdd={addToCart} />
                ))}
              </div>
            )}
          </div>
          <div className="lg:col-span-1">
            <Cart items={cart} onChangeQty={changeQty} onCheckout={checkout} />
            {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
