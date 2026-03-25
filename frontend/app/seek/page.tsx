'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { db } from '@/lib/firebase'
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  addDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  where,
  doc
} from 'firebase/firestore'
import { 
  Zap,
  TrendingUp,
  Activity,
  Search,
  Settings,
  Star,
  ExternalLink,
  Flame,
  Clock,
  Box,
  Monitor,
  TrendingDown,
  Volume2,
  VolumeX,
  ShieldCheck,
  ListFilter,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Filter,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'

interface StockItem {
  sku_id: string
  product_title: string
  size_title: string
  soh: number
  last_updated: any
  created_at?: any
  restocked_at?: any
  current_price?: number
  original_price?: number
  store?: string
  url?: string
  color?: string
  is_exclusive?: boolean
}

interface RestockLog {
  id: string
  sku_id?: string
  product_title: string
  size_title: string
  quantity_added: number
  detected_at: any
  type?: 'RESTOCK' | 'SALE' | 'DROP'
  price_at_event?: string | number
}

interface FilterDropdownProps {
  isOpen: boolean
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
  onClear: () => void
}

export default function TerminalBoard() {
  const [stock, setStock] = useState<StockItem[]>([])
  const [logs, setLogs] = useState<RestockLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('hot')
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [lastLogId, setLastLogId] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [watchlistSids, setWatchlistSids] = useState<string[]>([])
  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | null>(null)
  const [inventorySort, setInventorySort] = useState<'asc' | 'desc' | null>(null)
  const [genderSort, setGenderSort] = useState<'asc' | 'desc' | null>(null)
  const [onlyExclusives, setOnlyExclusives] = useState(false)
  
  // Header Filter State
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [sizeFilters, setSizeFilters] = useState<string[]>([])
  const [storeFilters, setStoreFilters] = useState<string[]>(['Shelflife', 'Jack Lemkus', 'Archive', 'Cape Union Mart'])
  const [visibleCount, setVisibleCount] = useState(50)
  const [genderFilter, setGenderFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  
  const { user, loading: authLoading, appUser } = useAuth()
  const router = useRouter()
  const watchlistRef = useRef<string[]>([])
  const userEmail = user?.email || ""

  // Helper functions
  const handleFilterToItem = (sku?: string) => {
    if (sku) {
      setSearchTerm(sku)
      setActiveTab('hot')
    }
  }

  const addNotification = (log: RestockLog) => {
    const id = Math.random().toString(36).substr(2, 9)
    setNotifications(prev => [{ ...log, nid: id }, ...prev].slice(0, 3))
    
    if (!muted) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {})
    }

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.nid !== id))
    }, 6000)
  }

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Unified Subscription Effect
  useEffect(() => {
    if (!userEmail) return

    const logsQuery = query(collection(db, "restock_logs"), orderBy("detected_at", "desc"), limit(100))
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RestockLog[]
      if (fetchedLogs.length > 0) {
        const latest = fetchedLogs[0]
        setLastLogId(prevId => {
          if (prevId && prevId !== latest.id) {
            if (latest.sku_id && watchlistRef.current.includes(latest.sku_id)) {
              addNotification(latest)
            }
          }
          return latest.id
        })
      }
      setLogs(fetchedLogs)
    })

    let updateTimer: NodeJS.Timeout
    const stockQuery = query(collection(db, "stock"), orderBy("last_updated", "desc"))
    const unsubscribeStock = onSnapshot(stockQuery, (snapshot) => {
      if (updateTimer) clearTimeout(updateTimer)
      updateTimer = setTimeout(() => {
        setStock(snapshot.docs.map(doc => ({ sku_id: doc.id, ...doc.data() })) as StockItem[])
        setLoading(false)
      }, 5000)
    })

    const watchlistQuery = query(collection(db, "user_alerts"), where("user_email", "==", userEmail), where("status", "==", "active"))
    const unsubscribeWatchlist = onSnapshot(watchlistQuery, (snapshot) => {
      const newSids = snapshot.docs.map(doc => doc.data().sku_id)
      watchlistRef.current = newSids
      setWatchlistSids(newSids)
    })

    setMounted(true)
    return () => {
      unsubscribeLogs()
      unsubscribeStock()
      unsubscribeWatchlist()
    }
  }, [userEmail])

  const allFilteredResults = useMemo(() => {
    let result = stock.filter(item => {
      const searchLower = searchTerm.toLowerCase()
      const searchWords = searchLower.split(/\s+/).filter(Boolean)
      
      const matchesSearch = searchWords.length === 0 || searchWords.every(word => 
          item.product_title.toLowerCase().includes(word) || 
          item.sku_id.toLowerCase().includes(word) ||
          item.size_title?.toLowerCase().includes(word)
      )
      
      const titleLower = item.product_title.toLowerCase()
      const isTrail = item.store === 'Cape Union Mart' || titleLower.includes('trail') || titleLower.includes('hiking')
      const matchesType = !typeFilter || (typeFilter === 'Trail' ? isTrail : !isTrail)

      const isWomen = titleLower.includes("women's") || titleLower.includes("(w)") || titleLower.includes("wmms")
      const matchesGender = !genderFilter || (genderFilter === 'Women' ? isWomen : !isWomen)

      const matchesStore = storeFilters.length === 0 || storeFilters.includes(item.store || '')
      const matchesSize = sizeFilters.length === 0 || sizeFilters.includes(item.size_title)
      
      const isSale = (item.current_price ?? 0) < (item.original_price ?? 999999)
      
      const matchesTab = activeTab === 'hot' || (
        activeTab === 'sales' ? isSale :
        activeTab === 'watchlist' ? watchlistSids.includes(item.sku_id) :
        activeTab === 'releases' ? !!item.created_at :
        activeTab === 'restocks' ? (!!item.restocked_at && item.soh > 0) : true
      )

      const matchesExclusive = !onlyExclusives || item.is_exclusive

      return matchesSearch && matchesStore && matchesSize && matchesTab && matchesType && matchesGender && matchesExclusive
    })

    if (priceSort) {
      result = [...result].sort((a, b) => {
        const p1 = a.current_price || 0
        const p2 = b.current_price || 0
        return priceSort === 'asc' ? p1 - p2 : p2 - p1
      })
    }

    if (inventorySort) {
      result = [...result].sort((a, b) => {
        const s1 = a.soh || 0
        const s2 = b.soh || 0
        return inventorySort === 'asc' ? s1 - s2 : s2 - s1
      })
    }

    if (genderSort) {
      result = [...result].sort((a, b) => {
        const t1 = a.product_title.toLowerCase()
        const t2 = b.product_title.toLowerCase()
        const isW1 = t1.includes("women's") || t1.includes("(w)") || t1.includes("wmms")
        const isW2 = t2.includes("women's") || t2.includes("(w)") || t2.includes("wmms")
        if (isW1 === isW2) return 0
        return genderSort === 'asc' ? (isW1 ? 1 : -1) : (isW1 ? -1 : 1)
      })
    }
    return result
  }, [stock, searchTerm, storeFilters, sizeFilters, activeTab, priceSort, inventorySort, genderSort, watchlistSids, genderFilter, typeFilter, onlyExclusives])

  const filteredStock = useMemo(() => {
    return allFilteredResults.slice(0, visibleCount)
  }, [allFilteredResults, visibleCount])

  const allSizes = useMemo(() => {
    const s = Array.from(new Set(stock.map(i => i.size_title).filter(Boolean)))
    return s.sort((a,b) => {
        const na = parseFloat(a.replace(/[^0-9.]/g, '')), nb = parseFloat(b.replace(/[^0-9.]/g, ''))
        return isNaN(na) ? 1 : isNaN(nb) ? -1 : na - nb
    })
  }, [stock])

  if (authLoading || !mounted) return (
     <div className="flex items-center justify-center h-screen bg-ds-bg">
        <div className="w-12 h-12 border-4 border-ds-indigo border-t-transparent rounded-full animate-spin" />
     </div>
  )

  if (!user) return null

  return (
    <div className="flex h-[calc(100vh-80px)] bg-ds-bg text-white overflow-hidden text-[13px] selection:bg-ds-blue/30">
      <aside className="w-16 md:w-56 bg-ds-surface border-r border-ds-border flex flex-col items-center md:items-stretch py-4 overflow-y-auto shrink-0 transition-all duration-300">
        <div className="px-3 mb-6 space-y-4">
          <div className="p-1.5 bg-ds-bg rounded-xl border border-ds-border flex gap-1 shadow-inner">
            <button 
              onClick={() => setGenderFilter(genderFilter === 'Men' ? null : 'Men')}
              className={`flex-1 py-1.5 rounded-lg font-black text-[10px] tracking-tighter transition-all ${genderFilter === 'Men' ? 'bg-ds-cyan text-white shadow-[0_0_15px_rgba(34,211,238,0.4)] border border-ds-cyan-border' : 'text-ds-text-dim hover:bg-ds-border'}`}
            >MEN</button>
            <button 
              onClick={() => setGenderFilter(genderFilter === 'Women' ? null : 'Women')}
              className={`flex-1 py-1.5 rounded-lg font-black text-[10px] tracking-tighter transition-all ${genderFilter === 'Women' ? 'bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]' : 'text-ds-text-dim hover:bg-ds-border'}`}
            >WOMEN</button>
          </div>

          <div className="p-1.5 bg-ds-bg rounded-xl border border-ds-border flex gap-1 shadow-inner">
            <button 
              onClick={() => setTypeFilter(typeFilter === 'Sneaker' ? null : 'Sneaker')}
              className={`flex-1 py-1.5 rounded-lg font-black text-[10px] tracking-tighter transition-all ${typeFilter === 'Sneaker' ? 'bg-slate-700 text-white shadow-[0_0_15px_rgba(51,65,85,0.4)]' : 'text-ds-text-dim hover:bg-ds-border'}`}
            >SNEAKERS</button>
            <button 
              onClick={() => setTypeFilter(typeFilter === 'Trail' ? null : 'Trail')}
              className={`flex-1 py-1.5 rounded-lg font-black text-[10px] tracking-tighter transition-all ${typeFilter === 'Trail' ? 'bg-ds-orange-deep text-white shadow-[0_0_15px_rgba(93,64,55,0.4)] border border-ds-orange-border' : 'text-ds-text-dim hover:bg-ds-border'}`}
            >TRAIL</button>
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          <NavItem icon={<Flame className="w-4 h-4" />} label="Hot Pairs" active={activeTab === 'hot'} onClick={() => setActiveTab('hot')} />
          <NavItem icon={<TrendingUp className="w-4 h-4" />} label="New Releases" active={activeTab === 'releases'} onClick={() => setActiveTab('releases')} />
          <NavItem icon={<Activity className="w-4 h-4" />} label="Restocks" active={activeTab === 'restocks'} onClick={() => setActiveTab('restocks')} />
          <NavItem icon={<Zap className="w-4 h-4 text-ds-blue" />} label="Sales" active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} />
          <NavItem icon={<Star className={`w-4 h-4 ${watchlistSids.length > 0 ? 'fill-current' : ''}`} />} label="Watchlist" count={watchlistSids.length} active={activeTab === 'watchlist'} onClick={() => setActiveTab('watchlist')} />
          
          <div className="h-px bg-ds-border my-4 mx-2" />
          <p className="px-4 py-2 text-[10px] font-black uppercase text-ds-text-dim hidden md:block">Stores</p>
          
          <StoreFilter name="Shelflife" colorClass="bg-ds-orange" textClass="text-ds-orange" active={storeFilters.includes('Shelflife')} onClick={() => setStoreFilters((pv: string[]) => pv.includes('Shelflife') ? pv.filter(s => s !== 'Shelflife') : [...pv, 'Shelflife'])} />
          <StoreFilter name="Jack Lemkus" colorClass="bg-yellow-500" textClass="text-yellow-500" active={storeFilters.includes('Jack Lemkus')} onClick={() => setStoreFilters((pv: string[]) => pv.includes('Jack Lemkus') ? pv.filter(s => s !== 'Jack Lemkus') : [...pv, 'Jack Lemkus'])} />
          <StoreFilter name="Archive" colorClass="bg-white" active={storeFilters.includes('Archive')} onClick={() => setStoreFilters((pv: string[]) => pv.includes('Archive') ? pv.filter(s => s !== 'Archive') : [...pv, 'Archive'])} />
          <StoreFilter name="Cape Union Mart" colorClass="bg-purple-500" textClass="text-purple-500" active={storeFilters.includes('Cape Union Mart')} onClick={() => setStoreFilters((pv: string[]) => pv.includes('Cape Union Mart') ? pv.filter(s => s !== 'Cape Union Mart') : [...pv, 'Cape Union Mart'])} />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#0d0f14]">
        <header className="h-14 bg-ds-surface border-b border-ds-border flex items-center justify-between px-6 shrink-0 z-20">
            <div className="flex flex-row items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-ds-bg border border-ds-border rounded-md min-w-[300px] max-w-[400px] group focus-within:border-ds-blue transition-all shadow-inner">
                <Search className="w-4 h-4 text-ds-text-dim" />
                <input type="text" placeholder="Search Style, SKU, or Name..." className="bg-transparent outline-none text-xs w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} suppressHydrationWarning />
                {searchTerm && <X className="w-3.5 h-3.5 text-ds-text-dim cursor-pointer hover:text-white" onClick={() => setSearchTerm('')} />}
              </div>
              {(searchTerm || sizeFilters.length > 0 || genderSort || priceSort || inventorySort || genderFilter || typeFilter || onlyExclusives || storeFilters.length < 5) && (
                <button 
                  onClick={() => {
                    setSearchTerm(''); setSizeFilters([]); setGenderSort(null); setPriceSort(null); setInventorySort(null);
                    setGenderFilter(null); setTypeFilter(null); setOnlyExclusives(false); setStoreFilters(['Shelflife', 'Jack Lemkus', 'Archive', 'Cape Union Mart'])
                  }}
                  className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-md text-[9px] font-black text-red-500 uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg"
                >
                  Clear All
                </button>
              )}
              {searchTerm && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-ds-indigo-deep border border-ds-indigo-border rounded-md text-[9px] font-black text-ds-indigo uppercase tracking-widest shrink-0 shadow-[0_0_10px_rgba(49,46,129,0.2)]">
                  <Search className="w-2.5 h-2.5" />
                  <span>Search: {searchTerm}</span>
                  <X className="w-2.5 h-2.5 cursor-pointer hover:text-white transition-colors" onClick={() => setSearchTerm('')} />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {storeFilters.map(store => (
                  <div key={store} className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-[9px] font-black uppercase tracking-widest shrink-0 group hover:border-white/30 transition-all">
                    <span className={`w-1 h-1 rounded-full ${
                      store === 'Shelflife' ? 'bg-ds-orange' :
                      store === 'Jack Lemkus' ? 'bg-yellow-500' :
                      store === 'Archive' ? 'bg-white' :
                      store === 'Cape Union Mart' ? 'bg-purple-500' :
                      'bg-ds-orange-border'
                    }`} />
                    <span className={
                      store === 'Shelflife' ? 'text-ds-orange' : 
                      store === 'Jack Lemkus' ? 'text-yellow-500' :
                      store === 'Cape Union Mart' ? 'text-purple-500' :
                      'text-ds-text-dim'
                    }>{store}</span>
                    <X 
                      className="w-2.5 h-2.5 cursor-pointer hover:text-white transition-colors opacity-0 group-hover:opacity-100 text-ds-text-dim" 
                      onClick={() => setStoreFilters(prev => prev.filter(s => s !== store))} 
                    />
                  </div>
                ))}
              </div>
            </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setOnlyExclusives(!onlyExclusives)} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase ${onlyExclusives ? 'bg-ds-orange border-ds-orange-border text-white shadow-[0_0_15px_rgba(251,146,60,0.4)]' : 'bg-ds-bg border-ds-border text-ds-text-dim hover:border-ds-orange/50'}`}
              suppressHydrationWarning
            >
              <Star className={`w-3.5 h-3.5 ${onlyExclusives ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">Exclusives</span>
            </button>
            {appUser?.tier && (
              <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${appUser.tier === 'Pro' ? 'bg-ds-indigo-deep border-ds-indigo-border text-ds-indigo shadow-[0_0_15px_rgba(129,140,248,0.2)]' : 'bg-white/5 border-white/10 text-ds-text-dim'}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                {appUser.tier} NODE
              </div>
            )}
            <button onClick={() => setMuted(!muted)} className={`p-2 rounded-lg transition-colors ${muted ? 'text-ds-red' : 'text-ds-text-dim hover:text-white'}`} suppressHydrationWarning>
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button className="p-2 text-ds-text-dim hover:text-white transition-colors" suppressHydrationWarning><Settings className="w-4 h-4" /></button>
          </div>
        </header>

        <div className="h-8 bg-ds-bg border-b border-ds-border flex items-center overflow-hidden text-[11px] relative">
          <div className="absolute left-0 top-0 bottom-0 px-4 bg-ds-bg z-10 flex items-center border-r border-white/5 shadow-[20px_0_20px_rgba(16,18,23,1)]">
            <span className="text-ds-cyan font-black mr-4 shrink-0 flex items-center gap-2">
              <Activity className="w-3 h-3 animate-pulse" />
              LIVE FEED:
            </span>
          </div>
          <div className="flex-1 w-full overflow-hidden">
            <motion.div 
              className="flex gap-12 whitespace-nowrap py-1 cursor-default"
              animate={{ x: [0, -1500] }}
              transition={{ repeat: Infinity, duration: 45, ease: "linear" }}
            >
              {[...logs, ...logs, ...logs].map((log, i) => (
                <span 
                  key={`${log.id}-${i}`} 
                  onClick={() => handleFilterToItem(log.sku_id)} 
                  className="flex gap-2 items-center cursor-pointer hover:text-ds-blue transition-colors group shrink-0" 
                  suppressHydrationWarning
                >
                  <span className="text-ds-text-dim font-black">[{new Date(log.detected_at?.seconds * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}]</span>
                  <span className="text-white group-hover:text-ds-blue font-bold">{log.product_title}</span>
                  <span className={`${log.type === 'SALE' ? 'text-ds-red' : 'text-ds-green'} font-black italic`}>
                    {log.type === 'SALE' ? `FALLEN R${log.price_at_event}` : `+${log.quantity_added} RESTOCKED`}
                  </span>
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-ds-surface z-10 text-[10px] font-black uppercase tracking-widest">
                <tr className="border-b border-white/5">
                   <th className="px-6 py-4 text-left min-w-[340px] text-ds-text-dim">Product / SKU</th>
                   <th className="px-4 py-4 text-center w-[120px] text-ds-text-dim">Upload Date</th>
                   <th className="px-2 py-4 text-center w-[100px] relative text-ds-text-dim">
                      <div className="flex items-center justify-center gap-2 group cursor-pointer" onClick={() => setActiveFilter(activeFilter === 'size' ? null : 'size')}>
                        Size
                        <SlidersHorizontal className={`w-3 h-3 ${sizeFilters.length > 0 ? 'text-ds-blue' : 'text-slate-500'} group-hover:text-white transition-colors`} />
                      </div>
                      <FilterDropdown 
                        isOpen={activeFilter === 'size'} 
                        options={allSizes} 
                        selected={sizeFilters} 
                        onToggle={(v: string) => {
                          setSizeFilters((pv: string[]) => pv.includes(v) ? pv.filter(x => x !== v) : [...pv, v]);
                        }} 
                        onClear={() => { setSizeFilters([]); setActiveFilter(null); }}
                      />
                   </th>
                   <th className="px-2 py-4 text-center w-[80px] text-ds-text-dim">
                      <div className="flex items-center justify-center gap-2 group cursor-pointer" onClick={() => setGenderSort(prev => prev === 'asc' ? 'desc' : (prev === 'desc' ? null : 'asc'))}>
                        Gender
                        {genderSort === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-ds-blue" /> : 
                         genderSort === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-ds-blue" /> : 
                         <SlidersHorizontal className="w-3 h-3 text-slate-500 group-hover:text-white transition-opacity opacity-0 group-hover:opacity-100" />}
                      </div>
                   </th>
                   <th className="px-4 py-4 text-left w-[140px] text-ds-text-dim">Colour</th>
                   <th className="px-4 py-4 text-left w-[140px] relative text-ds-text-dim">
                      <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setActiveFilter(activeFilter === 'store' ? null : 'store')}>
                        Store
                        <SlidersHorizontal className={`w-3 h-3 ${storeFilters.length < 5 ? 'text-ds-blue' : 'text-slate-500'} group-hover:text-white transition-colors`} />
                      </div>
                      <FilterDropdown 
                        isOpen={activeFilter === 'store'} 
                        options={['Shelflife', 'Jack Lemkus', 'Archive', 'Cape Union Mart']} 
                        selected={storeFilters} 
                        onToggle={(v: string) => setStoreFilters((pv: string[]) => pv.includes(v) ? pv.filter(x => x !== v) : [...pv, v])} 
                        onClear={() => { setStoreFilters(['Shelflife', 'Jack Lemkus', 'Archive', 'Cape Union Mart']); setActiveFilter(null); }}
                      />
                   </th>
                   <th className="px-4 py-4 text-right w-[120px] relative text-ds-text-dim">
                      <div className="flex items-center justify-end gap-2 group cursor-pointer" onClick={() => setPriceSort(prev => prev === 'asc' ? 'desc' : (prev === 'desc' ? null : 'asc'))}>
                         Price
                         {priceSort === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-ds-blue" /> : 
                          priceSort === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-ds-blue" /> : 
                          <SlidersHorizontal className="w-3 h-3 text-slate-500 group-hover:text-white" />}
                      </div>
                   </th>
                   <th className="px-4 py-4 text-right w-[110px] text-ds-text-dim">
                      <div className="flex items-center justify-end gap-2 group cursor-pointer" onClick={() => setInventorySort(prev => prev === 'asc' ? 'desc' : (prev === 'desc' ? null : 'asc'))}>
                        Inventory
                        {inventorySort === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-ds-blue" /> : 
                         inventorySort === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-ds-blue" /> : 
                         <SlidersHorizontal className="w-3 h-3 text-slate-500 group-hover:text-white transition-opacity opacity-0 group-hover:opacity-100" />}
                      </div>
                   </th>
                   <th className="px-6 py-4 text-right w-[150px] pr-10 text-ds-text-dim">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item) => (
                  <tr key={item.sku_id} className="hover:bg-white/5 border-b border-ds-border group transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <a 
                          href={item.url || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-bold hover:text-ds-blue flex items-center gap-1.5 transition-colors group/link truncate max-w-[340px]"
                          suppressHydrationWarning
                        >
                          {item.product_title}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </a>
                        <span className="text-[10px] text-ds-text-dim font-black">{item.sku_id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                       <span className="text-[10px] font-black uppercase text-ds-text-dim tracking-tighter" suppressHydrationWarning>
                          {item.created_at ? new Date(item.created_at?.seconds * 1000).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
                       </span>
                    </td>
                    <td className="px-2 py-4 text-center">
                       <SizeBadge size={item.size_title} />
                    </td>
                    <td className="px-2 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.product_title.toLowerCase().includes("women's") ? 'bg-pink-500/10 text-pink-500 border border-pink-500/20' : 'bg-ds-cyan-deep text-ds-cyan border border-ds-cyan-border'}`}>
                        {item.product_title.toLowerCase().includes("women's") ? 'F' : 'M'}
                      </span>
                    </td>
                    <td className="px-4 py-4 overflow-hidden max-w-[140px]">
                      <span className="text-[11px] font-black uppercase text-ds-text-dim tracking-tighter truncate block">{item.color || '—'}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[11px] font-black uppercase ${
                        item.store === 'Shelflife' ? 'text-ds-orange' :
                        item.store === 'Jack Lemkus' ? 'text-yellow-500' :
                        item.store === 'Archive' ? 'text-white' :
                        item.store === 'Cape Union Mart' ? 'text-purple-500' :
                        'text-ds-blue'
                      }`}>{item.store}</span>
                    </td>
                    <td className="px-4 py-4 text-right font-black">
                       <div className="flex flex-col items-end">
                          <div className="flex items-center gap-2">
                             <span className={`${(item.current_price ?? 0) < (item.original_price ?? 0) ? 'text-ds-blue' : 'text-white'}`}>
                                R{(item.current_price ?? 0).toLocaleString()}
                             </span>
                          </div>
                          {(item.current_price ?? 0) < (item.original_price ?? 0) && (
                            <span className="text-[9px] line-through text-gray-400 opacity-50">R{(item.original_price ?? 0).toLocaleString()}</span>
                          )}
                       </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                        <InventoryBadge soh={item.soh} />
                    </td>
                    <td className="px-6 py-4 text-right pr-10">
                       <WatchButton item={item} isWatched={watchlistSids.includes(item.sku_id)} currentCount={watchlistSids.length} tier={appUser?.tier || 'Standard'} email={userEmail} />
                    </td>
                   </tr>
                ))}
              </tbody>
            </table>

            {filteredStock.length < allFilteredResults.length && (
              <div className="p-12 flex justify-center border-t border-white/5 bg-[#0d0f14]/50">
                <button 
                   onClick={() => setVisibleCount(prev => prev + 100)}
                   className="px-8 py-2.5 bg-ds-indigo-deep border border-ds-indigo-border text-ds-indigo rounded-full font-black text-[11px] hover:bg-ds-indigo-border hover:scale-105 transition-all shadow-2xl"
                >
                  LOAD MORE ITEMS ({allFilteredResults.length - filteredStock.length} REMAINING)
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="h-6 bg-ds-surface border-t border-ds-border flex items-center justify-between px-4 text-[10px] text-ds-text-dim">
           <p>© 2026 SOLENODE.io TERMINAL | STATUS: SYSTEM_ONLINE</p>
        </footer>
      </main>

      <div className="fixed bottom-10 right-10 flex flex-col gap-3 pointer-events-none w-80 z-50">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div key={n.nid} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} className="pointer-events-auto bg-ds-surface border border-ds-blue/30 p-4 rounded-xl relative overflow-hidden backdrop-blur-md shadow-2xl">
              <div className="flex justify-between items-start mb-1">
                 <span className="text-[10px] font-black text-ds-blue uppercase">{n.type === 'SALE' ? 'Sale Alert' : 'Restock Alert'}</span>
                 <ShieldCheck className="w-3 h-3 text-ds-text-dim" />
              </div>
              <h4 className="font-bold text-xs truncate">{n.product_title}</h4>
              <p className="text-[10px] text-ds-text-dim">Size {n.size_title} | {n.type === 'SALE' ? `NOW R${n.price_at_event}` : `+${n.quantity_added} units`}</p>
              <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 6, ease: "linear" }} className="absolute bottom-0 left-0 h-1 bg-ds-blue" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function NavItem({ icon, label, active, onClick, count }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, count?: number }) {
  return (
    <div onClick={onClick} className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${active ? 'bg-ds-indigo-deep text-ds-indigo border border-ds-indigo-border' : 'text-gray-400 hover:text-white hover:bg-white/5'}`} suppressHydrationWarning>
      <div className="flex items-center gap-3">
        {icon} <span className="font-bold hidden md:block">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-black bg-ds-indigo text-ds-bg px-1.5 py-0.5 rounded-md shadow-lg hidden md:block">{count}</span>
      )}
    </div>
  )
}

function StoreFilter({ name, colorClass, textClass, active, onClick }: { name: string, colorClass: string, textClass?: string, active: boolean, onClick: () => void }) {
  return (
    <div onClick={onClick} className={`flex items-center gap-3 px-4 py-1.5 cursor-pointer transition-opacity ${active ? 'opacity-100' : 'opacity-30 hover:opacity-100'}`} suppressHydrationWarning>
      <div className={`w-2 h-2 rounded-full ${colorClass}`} />
      <span className={`font-bold text-[11px] truncate ${textClass || 'text-white'}`}>{name}</span>
    </div>
  )
}

function WatchButton({ item, isWatched, currentCount, tier, email }: { item: StockItem, isWatched: boolean, currentCount: number, tier: string | null, email: string }) {
  const [loading, setLoading] = useState(false)
  const handleWatch = async (e: any) => {
    e.stopPropagation()
    if (isWatched || loading) return
    
    // Tier-based limits
    const limit = tier === 'Pro' ? 1000 : 3
    if (currentCount >= limit) {
      alert(`LIMIT_REACHED: Your current tier (${tier || 'Standard'}) is capped at ${limit} active alerts. Upgrade to PRO to unlock 1000 slots.`)
      return
    }

    setLoading(true)
    try {
      await addDoc(collection(db, "user_alerts"), { user_email: email, sku_id: item.sku_id, status: 'active', created_at: serverTimestamp(), store: item.store, product_title: item.product_title })
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const handleUnwatch = async (e: any) => {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const q = query(collection(db, "user_alerts"), where("user_email", "==", email), where("sku_id", "==", item.sku_id))
      const snap = await getDocs(q)
      const tasks = snap.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(tasks)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  return (
    <button 
      onClick={isWatched ? handleUnwatch : handleWatch} 
      className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all duration-300 group ${
        isWatched 
          ? 'bg-ds-green/10 text-ds-green border border-ds-green/20 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30' 
          : 'bg-ds-border text-white hover:bg-ds-blue-deep hover:text-ds-blue hover:border-ds-blue-border border border-transparent'
      }`} 
      suppressHydrationWarning
    >
      {loading ? '...' : (
        <>
          <Star className={`w-3 h-3 ${isWatched ? 'fill-current' : ''}`} />
          <span>{isWatched ? 'Watching' : 'Watch'}</span>
          {isWatched && <X className="w-2.5 h-2.5 ml-1 opacity-60 group-hover:opacity-100 transition-opacity" />}
        </>
      )}
    </button>
  )
}

function SizeBadge({ size }: { size: string }) {
  const getStyle = (s: string) => {
    const n = parseFloat(s.replace(/[^0-9.]/g, ''))
    if (isNaN(n)) return 'bg-ds-border text-ds-text-dim border-ds-surface/50'
    if (n <= 5) return 'bg-ds-indigo-deep text-ds-indigo border-ds-indigo-border'
    if (n <= 7) return 'bg-ds-blue-deep text-ds-blue border-ds-blue-border'
    if (n <= 9) return 'bg-ds-cyan-deep text-ds-cyan border-ds-cyan-border'
    if (n === 10) return 'bg-cyan-500/10 text-ds-cyan border-ds-cyan-border'
    if (n <= 12) return 'bg-ds-orange-deep text-ds-orange border-ds-orange-border'
    return 'bg-ds-red-deep text-red-100 border-ds-red-border'
  }
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-transform hover:scale-110 cursor-default ${getStyle(size)}`}>
      {size}
    </div>
  )
}

function FilterDropdown({ isOpen, options, selected, onToggle, onClear }: FilterDropdownProps) {
  if (!isOpen) return null
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-10 left-0 min-w-[160px] bg-ds-surface border border-ds-border rounded-lg shadow-2xl z-50 p-2 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-2 px-2 pb-2 border-b border-ds-border">
        <span className="text-[9px] text-ds-text-dim font-black uppercase tracking-widest">Filter</span>
        <button onClick={onClear} className="text-[9px] text-ds-blue hover:text-white font-black uppercase">Clear</button>
      </div>
      <div className="max-h-[200px] overflow-y-auto space-y-1 custom-scrollbar px-1">
        {options.map((opt: string) => (
          <div 
            key={opt} 
            onClick={() => onToggle(opt)}
            className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${selected.includes(opt) ? 'bg-ds-blue-deep text-ds-blue' : 'hover:bg-white/5 text-gray-400'}`}
          >
            <span className="text-[10px] font-bold">{opt}</span>
            {selected.includes(opt) && <div className="w-1.5 h-1.5 rounded-full bg-ds-blue" />}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function InventoryBadge({ soh }: { soh: number | null | undefined }) {
  const count = soh ?? 0
  const isAvailable = count > 0
  return (
    <div className="flex justify-end">
      <div 
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-[${count >= 99 ? '10px' : '12px'}] font-black border transition-all duration-500 select-none
        ${isAvailable 
          ? 'bg-linear-to-br from-ds-green/20 via-ds-green/10 to-transparent border-ds-green/40 text-ds-green shadow-[inset_0_0_12px_rgba(0,200,83,0.05)] hover:shadow-[0_0_20px_rgba(0,200,83,0.15)] hover:border-ds-green/60' 
          : 'bg-ds-red-deep/10 border-ds-red-border/30 text-ds-red/50'
        }`}
      >
        {count >= 99 ? '99+' : count}
      </div>
    </div>
  )
}
