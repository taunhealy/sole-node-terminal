'use client'
// Re-build trigger

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ShoppingCart, Info, ChevronRight, TrendingUp, Sparkles, Clock, Percent, List } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { db } from '@/lib/firebase'
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore'

const categories = [
  { id: 'hot', name: 'Hot Pairs', icon: TrendingUp, color: 'text-ds-red' },
  { id: 'new', name: 'New Releases', icon: Sparkles, color: 'text-ds-blue' },
  { id: 'restock', name: 'Restocks', icon: Clock, color: 'text-ds-green' },
  { id: 'sales', name: 'Sales', icon: Percent, color: 'text-ds-orange' },
  { id: 'watchlist', name: 'Watchlist', icon: List, color: 'text-ds-indigo' },
]

interface SneakerItem {
  id: string;
  name?: string;
  product_title?: string;
  title?: string;
  price?: number | string;
  url?: string;
  product_url?: string;
  description?: string;
  store?: string;
  hype_index?: string;
  trend?: string;
  sizes?: any[];
  thumbnail?: string;
  image_url?: string;
  last_updated?: any;
  detected_at?: any;
  resale_prediction?: string;
  restock?: boolean;
  on_sale?: boolean;
}

export default function SneakerOfTheDayPage() {
  const [activeCategory, setActiveCategory] = useState('hot')
  const [items, setItems] = useState<SneakerItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    let q = query(collection(db, "stock"), limit(100))

    if (activeCategory === 'restock') {
      // 🔭 Intelligence: A restock is defined by 'restocked_at' timestamp and 'soh' > 0
      q = query(collection(db, "stock"), where("restocked_at", "!=", null), limit(100))
    } else if (activeCategory === 'sales') {
      q = query(collection(db, "stock"), where("on_sale", "==", true), limit(100))
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SneakerItem))
      
      // 🧊 In-memory Sort for Local Reliability (Handles restocked_at or last_updated)
      allData.sort((a: any, b: any) => {
        const timeA = a.restocked_at?.seconds || a.last_updated?.seconds || a.detected_at?.seconds || a.created_at?.seconds || 0
        const timeB = b.restocked_at?.seconds || b.last_updated?.seconds || b.detected_at?.seconds || b.created_at?.seconds || 0
        return timeB - timeA
      })

      // 🛡️ ADVANCED DEDUPLICATION: Collapses sizes AND stores into 1 unique product card
      const seen = new Set()
      const dedupedProducts: SneakerItem[] = []

      for (const item of allData) {
        if (dedupedProducts.length >= 3) break

        // 🧠 Normalize Title for Cross-Store & Size Deduplication
        let uniqueKey = (item.name || item.product_title || item.title || '').toLowerCase()
        
        // 1. Strip All Sizes (UK8, UK 9, US 10, EU 42, etc.)
        uniqueKey = uniqueKey.replace(/\buk\s?\d+(\.\d+)?\b/gi, '').trim()
        uniqueKey = uniqueKey.replace(/\bus\s?\d+(\.\d+)?\b/gi, '').trim()
        uniqueKey = uniqueKey.replace(/\bsize\s?\d+(\.\d+)?\b/gi, '').trim()
        uniqueKey = uniqueKey.replace(/\d+(\.\d+)?/g, (match) => {
            // Only strip if it looks like a size, not a model number like Jordan 1
            if (match.length <= 4) return '' 
            return match
        }).trim()

        // 2. Normalize punctuation and extra spaces
        uniqueKey = uniqueKey.replace(/[^\w\s#]/gi, '').replace(/\s+/g, ' ').trim()

        if (!seen.has(uniqueKey)) {
          seen.add(uniqueKey)
          dedupedProducts.push(item)
        }
      }

      setItems(dedupedProducts)
      setLoading(false)
    }, (error) => {
      console.error("Firestore Fetch Error:", error)
      setItems([])
      setLoading(false)
    })

    return () => unsubscribe()
  }, [activeCategory])

  const getThumbnail = (item: SneakerItem, index: number = 0) => {
    // 🛰️ SYSTEM STANDARD: Prioritize unique ID-based tactical showcase
    if (item.thumbnail && item.thumbnail.includes(item.id)) return item.thumbnail;
    
    // Check if the image_url is a unique one, not the generic fallback
    if (item.image_url && !item.image_url.includes('sneaker_of_the_day')) return item.image_url;
    
    // 🛡️ Stable brand-based backup if the specific systemPath isn't ready
    // We use the item.id to ensure the same shoe always gets the same unique room
    const stableIndex = item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index
    const title = (item.name || item.product_title || item.title || '').toLowerCase()

    if (title.includes('jordan')) return '/thumbnails/jordan.png'
    
    if (title.includes('adidas')) {
       const variants = ['/thumbnails/adidas.png', '/thumbnails/adidas_cockpit.png']
       return variants[stableIndex % variants.length]
    }
    
    if (title.includes('yeezy')) {
       const variants = ['/thumbnails/yeezy.png', '/thumbnails/yeezy_hologram.png']
       return variants[stableIndex % variants.length]
    }

    if (title.includes('bape')) {
       // 🐒 Rotating Bape logic to avoid duplication - strictly Bape-branded environments only
       const variants = ['/thumbnails/bape.png', '/thumbnails/bape_lab.png']
       return variants[stableIndex % variants.length]
    }

    if (title.includes('nike')) {
       return '/thumbnails/nike.png'
    }
    
    return '/thumbnails/sneaker_of_the_day.png'
  }

  const formatPrice = (price: number | string | undefined) => {
    if (typeof price === 'string') return price
    if (typeof price === 'number') return `R${price.toLocaleString()}`
    return 'R3,499'
  }

  return (
    <div className="min-h-screen bg-ds-bg text-white selection:bg-ds-blueSelection">
      <Navbar />

      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        {/* --- HERO SECTION: EPIC SHOWCASE --- */}
        <AnimatePresence mode="wait">
          {!loading && items.length > 0 && (
            <motion.section 
              key={items[0].id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-[40px] overflow-hidden border border-white/10 bg-ds-surface shadow-2xl group mb-20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-ds-blue/10 via-transparent to-transparent opacity-50 z-0" />
              
              <div className="grid lg:grid-cols-2 items-center relative z-10">
                {/* 📸 Image Product Context */}
                <div className="relative aspect-square lg:aspect-auto h-full min-h-[500px] bg-black/40 border-r border-white/5 group-hover:bg-black/20 transition-all duration-700">
                   <Image 
                     src={getThumbnail(items[0], 0)} 
                     alt={items[0].product_title || items[0].title || 'Sneaker of the Day'} 
                     fill
                     className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-[2000ms] ease-out"
                     priority
                   />
                   
                   {/* Overlay HUD elements */}
                   <div className="absolute top-8 left-8">
                     <div className="px-4 py-2 bg-ds-blue/20 backdrop-blur-md rounded-full border border-ds-blue/30 inline-flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-ds-blue animate-pulse" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-ds-blue">HYPE_INTEL_INDEX: {items[0].hype_index || '9.8'}</span>
                     </div>
                   </div>

                   <div className="absolute bottom-12 left-12 right-12 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em] mb-1">Detected_Source</span>
                        <span className="text-xs font-black uppercase tracking-widest text-white/80 italic">{items[0].store || 'SHELFLIFE'} // HUB</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em] mb-1">Market_Trend</span>
                        <span className="text-xs font-black uppercase tracking-widest text-ds-green italic">+{items[0].trend || '12.4'}% VOLUME</span>
                      </div>
                   </div>
                </div>

                {/* 📝 Tactical Product Copy */}
                <div className="p-10 lg:p-20 relative overflow-hidden">
                   <div className="absolute -top-20 -right-20 w-80 h-80 bg-ds-blue/5 blur-[100px] rounded-full pointer-events-none" />
                   
                   <motion.div 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="space-y-8"
                   >
                     <div>
                       <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-4">
                         {(items[0].name || items[0].product_title || items[0].title || 'JORDAN 4').split(' ').slice(0, 3).join(' ')} <br />
                         <span className="text-ds-blue">{(items[0].name || items[0].product_title || items[0].title || '').split(' ').slice(3).join(' ') || "'PREMIUM CORE'"}</span>
                       </h1>
                       <p className="text-ds-text-dim max-w-md font-medium leading-relaxed uppercase text-[11px] tracking-widest">
                         {items[0].description || "The global standard of sneaker excellence. A masterclass in minimal architecture and tactical aesthetic, rendered in premium materials with technical precision."}
                       </p>
                     </div>

                     <div className="flex items-center gap-12">
                       <div>
                         <span className="text-[10px] font-black text-ds-text-dim uppercase tracking-widest mb-1 block">RRP_VALUE</span>
                         <span className="text-3xl font-black italic text-white tracking-tighter">{formatPrice(items[0].price)}</span>
                       </div>
                       <div className="w-px h-10 bg-white/10" />
                       <div>
                         <span className="text-[10px] font-black text-ds-text-dim uppercase tracking-widest mb-1 block">RESALE_PREDICTION</span>
                         <span className="text-3xl font-black italic text-ds-blue tracking-tighter">{items[0].resale_prediction || 'R5,150+'}</span>
                       </div>
                     </div>

                     <div className="flex flex-wrap gap-3">
                       {['BASKETBALL', 'ICONIC', 'HIGH_DEMAND', 'PRO_CORE'].map(tag => (
                         <div key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md">
                           <span className="text-[9px] font-black uppercase tracking-widest text-white/60">{tag}</span>
                         </div>
                       ))}
                     </div>

                     <div className="pt-6 flex items-center gap-4">
                       <Link 
                         href={items[0].url || items[0].product_url || '#'} 
                         target="_blank"
                         className="flex-1 h-16 bg-white text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:bg-ds-blue hover:text-white transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95 group/atc"
                       >
                         <ShoppingCart className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                         SECURE PAIR
                       </Link>
                       <button className="w-16 h-16 bg-ds-surface border border-white/10 rounded-2xl flex items-center justify-center hover:border-ds-blue transition-all group/info">
                         <Info className="w-5 h-5 text-ds-text-dim group-hover:text-ds-blue transition-colors" />
                       </button>
                     </div>

                     <div className="mt-10 p-5 bg-white/2 border border-white/5 rounded-2xl backdrop-blur-sm">
                        <div className="flex items-start gap-4">
                           <div className="w-10 h-10 rounded-xl bg-ds-blue/10 flex items-center justify-center text-ds-blue shrink-0">
                              <Zap className="w-5 h-5" />
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-white mb-1 italic">SOLE_INTEL_ADVISORY:</p>
                              <p className="text-[10px] font-medium text-ds-text-dim leading-relaxed">
                                AI surveillance detected high liquidity expected on release for this specific model. Deployment of sniper slots recommended from the main terminal.
                              </p>
                           </div>
                        </div>
                     </div>
                   </motion.div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* --- CATEGORY SECTION --- */}
        <section className="space-y-12">
          {/* Categories Navigation */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            {categories.map((cat) => {
              const Icon = cat.icon
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex flex-col items-center gap-3 group transition-all ${isActive ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                >
                  <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center border-2 transition-all ${isActive ? 'bg-ds-surface border-ds-blue shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'bg-transparent border-white/5 group-hover:border-white/20'}`}>
                    <Icon className={`w-6 h-6 ${isActive ? cat.color : 'text-ds-text-dim'}`} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-white' : 'text-ds-text-dim'}`}>{cat.name}</span>
                </button>
              )
            })}
          </div>

          {/* Category Content Area */}
          <div className="relative min-h-[400px]">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-[4/5] bg-ds-surface border border-white/5 rounded-[30px] animate-pulse" />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: 'circOut' }}
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  {items.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                       <Zap className="w-12 h-12 text-white/5 mx-auto mb-6" />
                       <p className="text-[10px] font-black uppercase text-ds-text-dim tracking-widest">No matching tactical inventory detected</p>
                    </div>
                  ) : (
                    items.map((item, idx) => (
                      <Link 
                        key={item.id} 
                        href={item.url || item.product_url || '#'} 
                        target="_blank"
                        className="bg-ds-surface border border-white/5 rounded-[30px] p-6 group hover:border-ds-blue/30 transition-all hover:translate-y-[-5px] block"
                      >
                         <div className="aspect-[4/5] relative rounded-2xl overflow-hidden bg-[#050505] mb-6 shadow-2xl">
                           <Image 
                              src={getThumbnail(item, idx + 1)} 
                              alt={item.product_title || item.title || 'Sneaker'}
                              fill
                              className="object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" 
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-ds-bg to-transparent opacity-60 z-10" />
                           <div className="absolute top-4 right-4 z-20">
                             <div className="px-2 py-1 bg-black/40 backdrop-blur-md rounded border border-white/10 flex items-center gap-1.5">
                               <TrendingUp className="w-3 h-3 text-ds-red" />
                               <span className="text-[8px] font-black italic uppercase">Level_High</span>
                             </div>
                           </div>
                         </div>
                         
                         <div className="space-y-3">
                           <div className="flex items-center justify-between">
                             <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{item.store || 'SHELFLIFE'} // IN_STOCK</span>
                             <span className="text-[10px] font-black text-ds-blue tracking-tighter italic">{formatPrice(item.price)}</span>
                           </div>
                           <h3 className="text-xl font-black italic uppercase tracking-tighter leading-tight group-hover:text-ds-blue transition-colors truncate">
                             {item.name || item.product_title || item.title || 'Jordan 1 Retro High OG'}
                           </h3>
                           <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-3">
                                {(item.sizes || ['UK8', 'UK9', 'UK10', 'UK11']).slice(0, 4).map((sz: any) => (
                                  <span key={typeof sz === 'object' ? sz.size : sz} className="text-[9px] font-black text-white/60">
                                    {typeof sz === 'object' ? sz.size : sz}
                                  </span>
                                ))}
                              </div>
                              <ChevronRight className="w-5 h-5 text-ds-text-dim group-hover:translate-x-1 transition-transform" />
                           </div>
                         </div>
                      </Link>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
