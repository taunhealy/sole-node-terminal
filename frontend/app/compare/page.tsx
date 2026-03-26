'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, DocumentData, QuerySnapshot } from 'firebase/firestore'
import SizeBadge from '@/components/SizeBadge'
import { Search, ArrowLeft, Layers, ExternalLink, TrendingDown, Store, Ruler, Package, Info, X } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface StockItem {
  sku_id: string
  product_title: string
  size_title: string
  color: string
  soh: number
  current_price: number
  original_price: number
  url: string
  store: string
  last_updated: any
}

export default function ComparePage() {
  const [stock, setStock] = useState<StockItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const q = query(collection(db, "stock"), orderBy("last_updated", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      setStock(snapshot.docs.map(doc => ({ sku_id: doc.id, ...doc.data() })) as StockItem[])
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // 🤖 AUTO-POPULATE ENGINE EXAMPLE
  useEffect(() => {
    setMounted(true)
    if (!selectedProduct && stock.length > 0) {
      const counts: Record<string, Set<string>> = {}
      stock.forEach(i => {
        if (!i.product_title) return
        if (!counts[i.product_title]) counts[i.product_title] = new Set()
        counts[i.product_title].add(i.store)
      })
      const found = Object.keys(counts).find(k => counts[k].size >= 2)
      if (found) {
        setSelectedProduct(found); setSearchTerm(found)
      } else if (stock[0]?.product_title) {
        setSelectedProduct(stock[0].product_title); setSearchTerm(stock[0].product_title)
      }
    }
  }, [stock, selectedProduct])

  // UNIQUE PRODUCTS FOR AUTO-SUGGEST
  const productSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2 || searchTerm === selectedProduct) return []
    const lowerSearch = searchTerm.toLowerCase()
    const unique = new Set<string>()
    return stock
      .filter(item => {
        if (!item.product_title) return false
        const matches = item.product_title.toLowerCase().includes(lowerSearch)
        if (matches && !unique.has(item.product_title)) {
          unique.add(item.product_title)
          return true
        }
        return false
      })
      .slice(0, 8)
  }, [stock, searchTerm, selectedProduct])

  // GET ALL VARIANTS FOR THE SELECTED PRODUCT
  const comparisonData = useMemo(() => {
    if (!selectedProduct) return []
    return stock.filter(item => item.product_title === selectedProduct)
      .sort((a, b) => (a.current_price || 0) - (b.current_price || 0))
  }, [stock, selectedProduct])

  const bestPrice = comparisonData.length > 0 ? comparisonData[0].current_price : 0

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-ds-bg text-white font-sans selection:bg-ds-blue/30 pb-20">
      {/* 🔮 Header */}
      <header className="h-16 border-b border-white/5 bg-ds-surface/50 backdrop-blur-3xl sticky top-0 z-50 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3 md:gap-6">
          <Link href="/seek" className="p-2 hover:bg-white/5 rounded-full transition-colors group">
            <ArrowLeft className="w-5 h-5 text-ds-text-dim group-hover:text-white transition-colors" />
          </Link>
          <div className="flex items-center gap-3">
            <Layers className="w-4 h-4 md:w-5 md:h-5 text-ds-blue" />
            <h1 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] border-l border-white/10 pl-3 md:pl-4 py-1">Compare_Node</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-ds-blue animate-pulse" />
           <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-ds-blue">Engine Active</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* 🔍 Search Module */}
        <section className="relative mb-12 md:mb-20">
          <div className="text-center mb-8 md:mb-10">
            <div className="inline-flex items-center gap-3 mb-4 px-4 py-1 rounded-full bg-ds-blue/5 border border-ds-blue/10">
               <Info className="w-3 h-3 md:w-3.5 md:h-3.5 text-ds-blue" />
               <span className="text-[8px] md:text-[10px] font-black text-ds-blue uppercase tracking-widest text-nowrap">Pricing Intelligence Protocol</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4">Find the <span className="text-ds-blue">Best Rate.</span></h2>
            <p className="text-ds-text-dim max-w-xl mx-auto text-sm md:text-lg italic px-4">Compare restocks and inventory costs across every boutique in South Africa instantly.</p>
          </div>

          <div className="max-w-3xl mx-auto relative group">
             {/* Dynamic background glow on focus */}
             <div className="absolute -inset-1 bg-ds-blue/10 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none" />
             
             <div className={`relative h-16 md:h-20 bg-ds-surface border rounded-xl flex items-center px-4 md:px-8 transition-all duration-300 group ${searchTerm && productSuggestions.length > 0 ? 'border-ds-blue rounded-b-none ring-1 ring-ds-blue/20' : 'border-white/10 group-focus-within:border-ds-blue/40'}`}>
                <Search className={`w-5 h-5 md:w-6 md:h-6 mr-4 md:mr-6 transition-all duration-500 ${searchTerm ? 'text-ds-blue scale-110' : 'text-ds-text-dim opacity-40'}`} />
                <input 
                  type="text" 
                  placeholder="SCAN NETWORK FOR ASSETS..."
                  className="bg-transparent border-none outline-none text-sm md:text-lg font-bold w-full placeholder:text-white/10 placeholder:font-black placeholder:uppercase placeholder:tracking-widest text-white tracking-tight"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                
                <div className="flex items-center gap-2 md:gap-4">
                  {searchTerm && (
                    <button 
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation();
                        setSearchTerm(''); 
                        setSelectedProduct(null); 
                      }} 
                      className="p-1.5 md:p-2 hover:bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-all active:scale-95 group/x z-50 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 md:w-4 md:h-4 text-ds-text-dim group-hover/x:text-white" />
                    </button>
                  )}
                  <div className={`w-1.5 h-1.5 rounded-full ${searchTerm ? 'bg-ds-blue animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.5)]' : 'bg-white/10'}`} />
                </div>
             </div>

             {/* 🏙️ Suggestions Dropdown */}
             <AnimatePresence>
               {searchTerm && productSuggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-16 md:top-20 left-0 right-0 bg-ds-surface border-x border-b border-ds-blue rounded-b-xl overflow-hidden z-40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-3xl"
                  >
                   {productSuggestions.map((item, i) => (
                     <button 
                       key={i} 
                       onClick={() => { setSelectedProduct(item.product_title); setSearchTerm(item.product_title); }}
                       className="w-full text-left px-4 md:px-8 py-4 md:py-5 hover:bg-ds-blue/5 border-t border-white/3 flex items-center justify-between group"
                     >
                       <div className="min-w-0 pr-4">
                         <p className="text-xs md:text-sm font-bold text-white/80 group-hover:text-white transition-colors uppercase truncate">{item.product_title}</p>
                         <p className="text-[8px] md:text-[10px] text-ds-text-dim uppercase tracking-widest mt-1">Found in {stock.filter(s => s.product_title === item.product_title).length} variants</p>
                       </div>
                       <Package className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/10 group-hover:text-ds-blue transition-colors shrink-0" />
                     </button>
                   ))}
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </section>

        {/* 📊 Comparison Table */}
        <AnimatePresence mode="wait">
          {selectedProduct ? (
            <motion.div 
              key="comparison"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="space-y-8 md:space-y-12"
            >
              <div className="flex flex-col md:flex-row gap-8 items-stretch">
                  <div className="flex-1 p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] bg-white/5 border border-white/10 relative overflow-hidden group/card shadow-2xl backdrop-blur-3xl">
                     <div className="absolute top-0 right-0 w-48 h-48 bg-ds-blue/10 blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-ds-blue/20 transition-colors" />
                     
                     <span className="text-ds-blue text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] mb-4 md:mb-6 block">Asset_Analyzed</span>
                     <h3 className="text-2xl md:text-5xl font-black uppercase tracking-tight mb-6 md:mb-10 leading-[1.1] md:leading-[0.9] text-white">
                        {selectedProduct}
                     </h3>
                     <div className="flex flex-wrap gap-3 md:gap-4 mt-auto">
                        <div className="px-4 md:px-6 py-2 md:py-3 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black text-ds-text-dim uppercase tracking-widest flex items-center gap-2 md:gap-3 group-hover:border-white/20 transition-all">
                           <div className="w-1.5 h-1.5 rounded-full bg-ds-blue animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.4)]" />
                           <span className="text-nowrap">Aggregated Stock: {comparisonData.reduce((acc, curr) => acc + curr.soh, 0)} Units</span>
                        </div>
                        <div className="px-4 md:px-6 py-2 md:py-3 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black text-ds-text-dim uppercase tracking-widest flex items-center gap-2 md:gap-3 group-hover:border-white/20 transition-all">
                           <div className="w-1.5 h-1.5 rounded-full bg-ds-green shadow-[0_0_8px_rgba(0,200,83,0.4)]" />
                           <span className="text-nowrap">Market Spread: R{Math.round(comparisonData[0].current_price).toLocaleString()} - R{Math.round(comparisonData[comparisonData.length-1].current_price).toLocaleString()}</span>
                        </div>
                     </div>
                  </div>
              </div>

              {/* 📊 Comparison Table - Desktop */}
              <div className="hidden md:block relative">
                 <div className="rounded-xl border border-white/5 overflow-hidden bg-ds-surface/30 backdrop-blur-xl shadow-2xl">
                    <table className="w-full text-left border-collapse">
                       <thead>
                         <tr className="bg-white/5 border-b border-white/10">
                           <th className="px-12 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-ds-text-dim">Market Status</th>
                           <th className="px-12 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-ds-text-dim">Verified Source</th>
                           <th className="px-12 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-ds-text-dim">V-Identity / Size</th>
                           <th className="px-12 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-ds-text-dim text-right">Instant Rate</th>
                           <th className="px-12 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-ds-text-dim text-right pr-12">Execute</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                         {comparisonData.map((item, i) => (
                           <tr 
                             key={item.sku_id} 
                             className={`group border-b border-transparent hover:bg-white/5 transition-all duration-300 ${item.current_price === bestPrice ? 'bg-ds-blue/3' : ''}`}
                           >
                             <td className="px-12 py-8">
                                {item.current_price === bestPrice ? (
                                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ds-green/10 border border-ds-green/30 text-[9px] font-black text-ds-green uppercase tracking-widest">
                                     <div className="w-1.5 h-1.5 rounded-full bg-ds-green animate-pulse" />
                                     OPTIMAL RATE
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-ds-text-dim/40 uppercase tracking-widest pl-2">
                                     <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                                     Verified
                                  </div>
                                )}
                             </td>
                             <td className="px-12 py-8">
                                <div className="flex items-center gap-4">
                                   <div className={`w-2 h-2 rounded-full ${
                                     item.store === 'Shelflife' ? 'bg-ds-orange shadow-[0_0_10px_rgba(249,115,22,0.3)]' :
                                     item.store === 'Jack Lemkus' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(212,175,55,0.3)]' :
                                     item.store === 'Archive' ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' :
                                     item.store === 'Soul Gallery' ? 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)]' :
                                     item.store === 'The Plug and Play' ? 'bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.3)]' :
                                     item.store === 'Court Order' ? 'bg-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.3)]' :
                                     'bg-ds-blue shadow-[0_0_10px_rgba(96,165,250,0.3)]'
                                   }`} />
                                   <span className="font-black text-[13px] uppercase tracking-wider text-white group-hover:text-ds-blue transition-colors">{item.store}</span>
                                </div>
                             </td>
                             <td className="px-12 py-8">
                                <div className="flex items-center gap-8">
                                   <div className="flex items-center gap-3">
                                    <SizeBadge size={item.size_title} />
                                   </div>
                                   <div className="h-6 w-px bg-white/10" />
                                   <div className="text-[10px] font-black text-ds-text-dim uppercase tracking-[0.2em] group-hover:text-white transition-opacity truncate max-w-[120px]">{item.color}</div>
                                </div>
                             </td>
                             <td className="px-12 py-8 text-right">
                                <div className="flex flex-col items-end">
                                   <span className={`text-2xl font-black tracking-tight ${item.current_price === bestPrice ? 'text-ds-green' : 'text-ds-indigo'}`}>
                                      R{Math.round(item.current_price).toLocaleString()}
                                   </span>
                                   {item.original_price > item.current_price && (
                                      <span className="text-[10px] font-black text-white/30 line-through mt-1">
                                         R{Math.round(item.original_price).toLocaleString()}
                                      </span>
                                   )}
                                </div>
                             </td>
                             <td className="px-12 py-8 text-right pr-12">
                                <a 
                                  href={item.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-white text-ds-bg hover:bg-ds-blue hover:text-white transition-all active:scale-90 shadow-xl"
                                  title="Execute Redirect"
                                >
                                  <ExternalLink className="w-5 h-5" />
                                </a>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* 📱 Comparison Cards - Mobile */}
              <div className="md:hidden space-y-4">
                 {comparisonData.map((item, i) => (
                   <div 
                     key={item.sku_id} 
                     className={`p-5 rounded-2xl bg-ds-surface border border-white/5 relative overflow-hidden ${item.current_price === bestPrice ? 'ring-1 ring-ds-green/30' : ''}`}
                   >
                     {item.current_price === bestPrice && (
                       <div className="absolute top-0 right-0 px-3 py-1 bg-ds-green text-ds-bg text-[8px] font-black uppercase tracking-widest rounded-bl-xl">
                          Best Offer
                       </div>
                     )}
                     
                     <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                           <div className={`w-1.5 h-1.5 rounded-full ${
                             item.store === 'Shelflife' ? 'bg-ds-orange shadow-[0_0_8px_rgba(249,115,22,0.3)]' :
                             item.store === 'Jack Lemkus' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(212,175,55,0.3)]' :
                             item.store === 'Archive' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.3)]' :
                             item.store === 'Soul Gallery' ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.3)]' :
                             item.store === 'The Plug and Play' ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]' :
                             item.store === 'Court Order' ? 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.3)]' :
                             'bg-ds-blue'
                           }`} />
                           <span className="font-black text-sm uppercase tracking-wider text-white">{item.store}</span>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className={`text-lg font-black tracking-tight ${item.current_price === bestPrice ? 'text-ds-green' : 'text-white'}`}>
                              R{Math.round(item.current_price).toLocaleString()}
                           </span>
                           {item.original_price > item.current_price && (
                              <span className="text-[8px] font-black text-ds-red uppercase">ON SALE</span>
                           )}
                        </div>
                     </div>

                     <div className="flex items-center justify-between pt-4 border-t border-white/5 gap-2">
                        <div className="flex items-center gap-3">
                           <SizeBadge size={item.size_title} />
                           <div className="text-[9px] font-black text-ds-text-dim uppercase tracking-widest truncate max-w-[80px]">{item.color}</div>
                        </div>
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 rounded-xl bg-white text-ds-bg text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95"
                        >
                          Buy Now
                        </a>
                     </div>
                   </div>
                 ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 md:py-32 flex flex-col items-center justify-center text-center opacity-20 border-2 border-dashed border-white/10 rounded-[2.5rem] md:rounded-[4rem] px-4"
            >
               <Layers className="w-12 h-12 md:w-20 md:h-20 mb-6 md:mb-8" />
               <p className="text-sm md:text-lg font-black uppercase tracking-[0.4em]">Awaiting Selection</p>
               <p className="text-[10px] md:text-xs mt-4">Node is ready to execute comparative analysis.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
