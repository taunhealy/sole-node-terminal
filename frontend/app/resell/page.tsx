'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingBag, 
  MessageSquare, 
  Zap, 
  ChevronRight, 
  Activity, 
  Search, 
  Filter,
  Package,
  ArrowUpRight,
  Shield,
  Tag
} from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore'

export default function ResellPage() {
  const [activeTab, setActiveTab] = useState<'soleseek' | 'discord'>('soleseek')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // 🛡️ URL Protocol Initialization
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    if (tabParam === 'discord') setActiveTab('discord')
  }, [])

  useEffect(() => {
    setLoading(true)
    // Simplify queries to avoid index errors for the rollout
    const q = activeTab === 'soleseek' 
      ? query(collection(db, "stock"), limit(40))
      : query(collection(db, "resell_items"), limit(40))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Clientside filtering for Discord sources
      if (activeTab === 'discord') {
         data = data.filter((d: any) => d.source === 'discord')
      }

      // Sort clientside to avoid composite index requirements
      data.sort((a: any, b: any) => {
        const dateA = a.created_at || a.detected_at || a.last_updated || 0
        const dateB = b.created_at || b.detected_at || b.last_updated || 0
        return new Date(dateB).getTime() - new Date(dateA).getTime()
      })

      setItems(data)
      setLoading(false)
    }, (error) => {
      console.error("Resell Feed Error:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [activeTab])

  const filteredItems = items.filter(item => 
    (item.product_title || item.title || item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.store || item.seller_discord || item.author || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-ds-bg text-white font-sans selection:bg-ds-indigo selection:text-white">
      {/* 🧭 Local Navigation (In-Body to avoid Global Header overlap) */}
      <div className="pt-32 px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between border-b border-white/5 pb-8">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
            <button 
              onClick={() => setActiveTab('soleseek')}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'soleseek' ? 'bg-white text-ds-bg shadow-2xl' : 'text-ds-text-dim hover:text-white'}`}
            >
              SoleSeek_Stock
            </button>
            <button 
              onClick={() => setActiveTab('discord')}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'discord' ? 'bg-ds-indigo text-white shadow-2xl' : 'text-ds-text-dim hover:text-white'}`}
            >
              Discord_Crew
            </button>
          </div>

          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 px-6 py-2 bg-ds-indigo/10 border border-ds-indigo/30 rounded-full text-[9px] font-black uppercase tracking-widest text-ds-indigo hover:bg-ds-indigo hover:text-white transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)]">
               <MessageSquare className="w-3 h-3" /> Connect_Discord
            </button>
          </div>
        </div>
      </div>

      <main className="pt-40 pb-32 px-12">
        <div className="max-w-7xl mx-auto">
          {/* ⚡ Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
            <div>
              <div className="flex items-center gap-3 mb-6">
                 <Tag className="w-4 h-4 text-ds-indigo" />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-ds-indigo">Independent Resale Hub</span>
              </div>
              <h1 className="text-6xl font-black uppercase tracking-tighter leading-[0.9] mb-6">
                {activeTab === 'soleseek' ? 'Tactical_Stock' : 'Community_Crew'}
              </h1>
              <p className="text-gray-400 max-w-xl font-medium text-lg leading-relaxed">
                {activeTab === 'soleseek' 
                  ? 'Vetted inventory from the global boutique networks. Real-time pricing with direct checkout links.' 
                  : 'Peer-to-peer listings straight from the SoleSeekers Discord. Verified community sellers only.'}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ds-text-dim group-focus-within:text-ds-indigo transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold w-full md:w-80 focus:outline-none focus:border-ds-indigo/50 focus:ring-4 focus:ring-ds-indigo/10 transition-all"
                />
              </div>
            </div>
          </div>

          {/* 📦 Inventory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            <AnimatePresence mode="popLayout">
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <div key={i} className="aspect-[4/5] rounded-3xl bg-white/5 animate-pulse" />
                ))
              ) : filteredItems.length === 0 ? (
                <div className="col-span-full py-40 text-center">
                  <Package className="w-12 h-12 text-white/10 mx-auto mb-6" />
                  <p className="text-ds-text-dim font-black uppercase tracking-widest text-xs">No matching inventory detected</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group bg-ds-surface border border-white/5 rounded-3xl overflow-hidden hover:border-ds-indigo/30 transition-all shadow-2xl relative cursor-pointer"
                    onClick={() => {
                        window.open(`https://discord.com/channels/1487591347425644684/1487598193775480943`, '_blank')
                    }}
                  >
                    <div className="aspect-square bg-[#050505] shadow-inner relative overflow-hidden group-hover:bg-[#0a0a0a] transition-colors">
                       <img 
                         src={'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=400&h=400&auto=format&fit=crop'} 
                         alt={item.product_title || item.title || item.name}
                         className="w-full h-full object-contain p-12 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700 opacity-60 group-hover:opacity-100"
                       />
                       <div className="absolute top-4 right-4 px-3 py-1 bg-white text-ds-bg text-[9px] font-black uppercase rounded-lg shadow-2xl">
                         {item.price ? (item.price.toString().includes('R') ? item.price : `R${item.price}`) : 'MARKET'}
                       </div>
                       {item.source === 'discord' && (
                         <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 bg-ds-indigo text-white text-[9px] font-black uppercase rounded-lg shadow-2xl">
                           <MessageSquare className="w-3 h-3" /> Crew
                         </div>
                       )}
                    </div>
                    
                    <div className="p-6">
                      <div className="text-[10px] font-black uppercase tracking-widest text-ds-text-dim mb-2 truncate">
                        {item.source === 'discord' ? `@${item.seller_discord || item.author || 'Crew Member'}` : (item.store || 'Boutique Unit')}
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-tight mb-4 group-hover:text-ds-indigo transition-colors line-clamp-1">
                        {item.product_title || item.title || item.name || 'TACTICAL_INVENTORY'}
                      </h3>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3 h-3 text-ds-green" />
                          <span className="text-[9px] font-black uppercase text-ds-green tracking-widest">Verified</span>
                        </div>
                        <a 
                          href={item.url || `https://discord.com/channels/${process.env.NEXT_PUBLIC_DISCORD_SERVER_ID}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 bg-white/5 rounded-xl hover:bg-white hover:text-ds-bg transition-all transform group-hover:translate-x-1"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-ds-bg/80 backdrop-blur-3xl border border-white/10 px-8 py-4 rounded-full flex items-center gap-8 shadow-2xl z-50">
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-ds-green animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest">{items.length} Units Online</span>
         </div>
         <div className="w-px h-4 bg-white/10" />
         <button className="text-[9px] font-black uppercase tracking-widest text-ds-indigo hover:text-white transition-colors">Sell Your Pair</button>
      </div>
    </div>
  )
}
