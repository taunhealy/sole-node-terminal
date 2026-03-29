'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
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
  X,
  Layers,
  ChevronRight,
  LayoutDashboard,
  Sparkles,
  MessageSquare,
  ShoppingBag
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import SizeBadge from '@/components/SizeBadge'
import CommunityIntel from '@/components/CommunityIntel'

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
  const [storeFilters, setStoreFilters] = useState<string[]>(['Shelflife', 'Jack Lemkus', 'Archive', 'Soul Gallery', 'The Plug and Play', 'Court Order'])
  const [visibleCount, setVisibleCount] = useState(50)
  const [genderFilter, setGenderFilter] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [onlyMoneySizes, setOnlyMoneySizes] = useState(false)
  const [comparingProduct, setComparingProduct] = useState<string | null>(null)
  const [showIntel, setShowIntel] = useState(true)
  const [compareOnly, setCompareOnly] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  
  const { user, loading: authLoading, appUser } = useAuth()
  const router = useRouter()
  const watchlistRef = useRef<string[]>([])
  const userEmail = user?.email || ""

  const productGroupings = useMemo(() => {
    const groups: Record<string, string[]> = {} // NormalizedKey -> List of original titles
    const titleToKey: Record<string, string> = {}
    
    const uniqueTitles = Array.from(new Set(stock.map(s => s.product_title).filter(Boolean)))
    
    uniqueTitles.forEach(title => {
      // 🧠 Intelligence normalization (Lower, clean punctuation, first 4 core terms)
      const clean = title.toLowerCase().replace(/['"().\-,]/g, '')
      const words = clean.split(/\s+/).filter(Boolean)
      const key = words.slice(0, 4).join(' ')
      
      if (!groups[key]) groups[key] = []
      groups[key].push(title)
      titleToKey[title] = key
    })
    
    const keyToCounts: Record<string, number> = {}
    Object.keys(groups).forEach(k => {
      const uniqueStores = new Set(stock.filter(s => titleToKey[s.product_title] === k).map(s => s.store))
      keyToCounts[k] = uniqueStores.size
    })
    
    return { groups, titleToKey, keyToCounts }
  }, [stock])

  const productStoreCounts = useMemo(() => {
    const counts: Record<string, Set<string>> = {}
    stock.forEach(item => {
      const key = productGroupings.titleToKey[item.product_title]
      if (!key) return
      if (!counts[key]) counts[key] = new Set()
      counts[key].add(item.store || '')
    })
    return counts
  }, [stock, productGroupings])

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

  // Auth Guard Removed - Seek is now public

  // Unified Subscription Effect
  useEffect(() => {
    // 🌍 Public Data (Everyone)
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

    // 👤 User-Specific Watchlist
    let unsubscribeWatchlist = () => {}
    if (userEmail) {
      const watchlistQuery = query(collection(db, "user_alerts"), where("user_email", "==", userEmail))
      unsubscribeWatchlist = onSnapshot(watchlistQuery, (snapshot) => {
        const newSids = snapshot.docs.map(doc => doc.data().sku_id)
        watchlistRef.current = newSids
        setWatchlistSids(newSids)
      })
    }

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
      const isTrail = titleLower.includes('trail') || titleLower.includes('hiking')
      const isWomen = titleLower.includes("women's") || titleLower.includes("(w)") || titleLower.includes("wmms")
      const n = parseFloat(item.size_title.replace(/[^0-9.]/g, ''))
      const st = item.size_title.toLowerCase()
      const segmentKids = st.includes('ps') || st.includes('td') || st.includes('infant') || (!isNaN(n) && n <= 3.5)

      const isWatchlist = activeTab === 'watchlist'
      const isWatched = watchlistSids.includes(item.sku_id)

      const matchesType = isWatchlist || !typeFilter || (typeFilter === 'Trail' ? isTrail : !isTrail)
      const matchesGender = isWatchlist || !genderFilter || (genderFilter === 'Women' ? isWomen : !isWomen)
      const matchesCategory = isWatchlist || !categoryFilter || (categoryFilter === 'Kids' ? segmentKids : !segmentKids)

      const matchesStore = isWatchlist || storeFilters.length === 0 || storeFilters.includes(item.store || '')
      const matchesSize = isWatchlist || sizeFilters.length === 0 || sizeFilters.includes(item.size_title)
      
      const isSale = !!item.original_price && (item.current_price ?? 0) < item.original_price
      
      const matchesTab = activeTab === 'hot' || (
        activeTab === 'sales' ? isSale :
        isWatchlist ? isWatched :
        activeTab === 'releases' ? !!item.created_at :
        activeTab === 'restocks' ? (!!item.restocked_at && item.soh > 0) : true
      )

      const matchesExclusive = !onlyExclusives || item.is_exclusive
      const matchesMoney = isWatchlist || !onlyMoneySizes || (segmentKids === false && !isNaN(n) && n >= 7 && n <= 10.5)
      
      const compareCount = productGroupings.keyToCounts[productGroupings.titleToKey[item.product_title] || ''] || 0
      const matchesCompare = isWatchlist || !compareOnly || compareCount > 1

      return matchesSearch && matchesType && matchesGender && matchesCategory && matchesStore && matchesSize && matchesTab && matchesExclusive && matchesMoney && matchesCompare
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
  }, [stock, searchTerm, storeFilters, sizeFilters, activeTab, priceSort, inventorySort, genderSort, watchlistSids, genderFilter, categoryFilter, typeFilter, onlyExclusives, onlyMoneySizes, compareOnly])

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

  if (authLoading || !mounted || loading) return (
     <div className="flex items-center justify-center h-screen bg-ds-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-ds-indigo/10 to-transparent pointer-events-none" />
        <div className="flex flex-col items-center gap-6 relative z-10">
            <div className="w-16 h-16 border-2 border-ds-indigo/20 border-t-ds-indigo rounded-full animate-spin shadow-[0_0_80px_rgba(129,140,248,0.3)] flex items-center justify-center relative">
               <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin [animation-duration:0.8s]" />
            </div>
           <div className="flex flex-col items-center gap-1">
              <span className="text-ds-indigo font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Initializing_Terminal</span>
              <span className="text-ds-text-dim/50 font-black uppercase tracking-[0.2em] text-[8px]">Fetching_Node_Inventory</span>
           </div>
        </div>
     </div>
  )

  // Removed !user check to allow guest access


  return (
    <div className="flex h-[calc(100vh-80px)] bg-ds-bg text-white overflow-hidden text-[13px] selection:bg-ds-blue/30 relative">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-80 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed inset-y-0 left-0 z-90 w-64 transform bg-ds-surface border-r border-ds-border flex flex-col py-4 overflow-y-auto transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-16 lg:w-56
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex md:hidden items-center justify-between px-4 mb-6">
           <span className="font-black text-lg tracking-widest text-white">FILTERS</span>
           <button onClick={() => setMobileSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg">
              <X className="w-5 h-5 text-ds-text-dim" />
           </button>
        </div>

        <div className="px-3 mb-6 space-y-4 block md:hidden lg:block">
          <div className="p-1.5 bg-ds-bg rounded-xl border border-ds-border flex gap-1 shadow-inner">
            <button 
              onClick={() => setGenderFilter(genderFilter === 'Men' ? null : 'Men')}
              className={`flex-1 py-1.5 rounded-lg font-black text-[10px] tracking-tighter transition-all ${genderFilter === 'Men' ? 'bg-white/10 text-white border border-white/20 shadow-lg' : 'text-ds-text-dim hover:bg-ds-border'}`}
            >MEN</button>
            <button 
              onClick={() => setGenderFilter(genderFilter === 'Women' ? null : 'Women')}
              className={`flex-1 py-1.5 rounded-lg font-black text-[10px] tracking-tighter transition-all ${genderFilter === 'Women' ? 'bg-white/10 text-white border border-white/20 shadow-lg' : 'text-ds-text-dim hover:bg-ds-border'}`}
            >WOMEN</button>
          </div>

          <div className="p-1.5 bg-ds-bg rounded-xl border border-ds-border flex gap-1 shadow-inner">
            <button 
              onClick={() => setCategoryFilter(categoryFilter === 'Adult' ? null : 'Adult')}
              className={`flex-1 py-1.5 rounded-lg font-black text-[10px] tracking-tighter transition-all ${categoryFilter === 'Adult' ? 'bg-white/10 text-white border border-white/20 shadow-lg' : 'text-ds-text-dim hover:bg-ds-border'}`}
            >ADULTS</button>
            <button 
              onClick={() => setCategoryFilter(categoryFilter === 'Kids' ? null : 'Kids')}
              className={`flex-1 py-1.5 rounded-lg font-black text-[10px] tracking-tighter transition-all ${categoryFilter === 'Kids' ? 'bg-white/10 text-white border border-white/20 shadow-lg' : 'text-ds-text-dim hover:bg-ds-border'}`}
            >KIDS</button>
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          <NavItem icon={<Flame className="w-4 h-4" />} label="Hot Pairs" active={activeTab === 'hot'} onClick={() => setActiveTab('hot')} />
          <NavItem icon={<TrendingUp className="w-4 h-4" />} label="New Releases" active={activeTab === 'releases'} onClick={() => setActiveTab('releases')} />
          <NavItem icon={<Activity className="w-4 h-4" />} label="Restocks" active={activeTab === 'restocks'} onClick={() => setActiveTab('restocks')} />
          <NavItem icon={<Zap className={`w-4 h-4 ${activeTab === 'sales' ? 'text-ds-blue' : ''}`} />} label="Sales" active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} />
          <NavItem icon={<Star className={`w-4 h-4 ${watchlistSids.length > 0 ? 'fill-current' : ''}`} />} label="Watchlist" count={watchlistSids.length} active={activeTab === 'watchlist'} onClick={() => setActiveTab('watchlist')} />
          <Link 
            href="/resell" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl mx-2 text-ds-text-dim hover:bg-ds-indigo/5 hover:text-ds-indigo transition-all group mt-2 border border-transparent hover:border-white/5"
          >
            <div className="transition-transform duration-500 opacity-60 group-hover:opacity-100 group-hover:scale-110">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest group-hover:text-white transition-colors block md:hidden lg:block">Resell Hub</span>
            <div className="ml-auto px-1.5 py-0.5 rounded bg-ds-indigo/10 text-[8px] border border-ds-indigo/20 text-ds-indigo block md:hidden lg:block">NEW</div>
          </Link>
          <Link 
            href="/compare" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl mx-2 text-ds-text-dim hover:bg-ds-blue/5 hover:text-ds-blue transition-all group mt-1 border border-transparent hover:border-white/5"
          >
            <div className="transition-transform duration-500 opacity-60 group-hover:opacity-100 group-hover:scale-110">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest group-hover:text-white transition-colors block md:hidden lg:block">Compare Node</span>
            <div className="ml-auto px-1.5 py-0.5 rounded bg-ds-blue/10 text-[8px] border border-ds-blue/20 text-ds-blue block md:hidden lg:block">BETA</div>
          </Link>
          
          <div className="h-px bg-ds-border my-4 mx-2" />
          <p className="px-4 py-2 text-[10px] font-black uppercase text-ds-text-dim block md:hidden lg:block">Stores</p>
          
          <StoreFilter name="Shelflife" colorClass="bg-ds-orange" active={storeFilters.includes('Shelflife')} onClick={() => setStoreFilters((pv: string[]) => pv.includes('Shelflife') ? pv.filter(s => s !== 'Shelflife') : [...pv, 'Shelflife'])} />
          <StoreFilter name="Jack Lemkus" colorClass="bg-yellow-500" active={storeFilters.includes('Jack Lemkus')} onClick={() => setStoreFilters((pv: string[]) => pv.includes('Jack Lemkus') ? pv.filter(s => s !== 'Jack Lemkus') : [...pv, 'Jack Lemkus'])} />
          <StoreFilter name="Archive" colorClass="bg-white" active={storeFilters.includes('Archive')} onClick={() => setStoreFilters((pv: string[]) => pv.includes('Archive') ? pv.filter(s => s !== 'Archive') : [...pv, 'Archive'])} />
          <StoreFilter name="Soul Gallery" colorClass="bg-indigo-600" active={storeFilters.includes('Soul Gallery')} onClick={() => setStoreFilters((pv: string[]) => pv.includes('Soul Gallery') ? pv.filter(s => s !== 'Soul Gallery') : [...pv, 'Soul Gallery'])} />
          <StoreFilter name="The Plug and Play" colorClass="bg-teal-500" active={storeFilters.includes('The Plug and Play')} onClick={() => setStoreFilters((pv: string[]) => pv.includes('The Plug and Play') ? pv.filter(s => s !== 'The Plug and Play') : [...pv, 'The Plug and Play'])} />
          <StoreFilter name="Court Order" colorClass="bg-slate-400" active={storeFilters.includes('Court Order')} onClick={() => setStoreFilters((pv: string[]) => pv.includes('Court Order') ? pv.filter(s => s !== 'Court Order') : [...pv, 'Court Order'])} />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#0d0f14]">
        <header className="h-auto md:h-14 bg-ds-surface border-b border-ds-border flex flex-col md:flex-row items-center justify-between px-4 md:px-6 py-3 md:py-0 shrink-0 z-20 gap-3">
            <div className="flex flex-row items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden p-2 bg-white/5 border border-white/10 rounded-lg text-ds-text-dim hover:text-white transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              
              <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-ds-bg border border-ds-border rounded-md md:min-w-[300px] md:max-w-[400px] group focus-within:border-ds-blue transition-all shadow-inner relative">
                <Search className="w-3.5 h-3.5 text-ds-text-dim shrink-0" />
                <input 
                  type="text" 
                  placeholder="SEARCH_NODE..." 
                  className="bg-transparent outline-none text-[11px] font-black w-full placeholder:text-ds-text-dim/30 placeholder:uppercase" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  suppressHydrationWarning 
                />
                {searchTerm && <X className="w-3.5 h-3.5 text-ds-text-dim cursor-pointer hover:text-white shrink-0" onClick={() => setSearchTerm('')} />}
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto md:overflow-visible no-scrollbar pb-1 md:pb-0">
              {(searchTerm || sizeFilters.length > 0 || genderSort || priceSort || inventorySort || genderFilter || typeFilter || onlyExclusives || storeFilters.length < 5) && (
                <button 
                  onClick={() => {
                    setSearchTerm(''); setSizeFilters([]); setGenderSort(null); setPriceSort(null); setInventorySort(null);
                    setGenderFilter(null); setCategoryFilter(null); setTypeFilter(null); setOnlyMoneySizes(false); setCompareOnly(false); setOnlyExclusives(false); setStoreFilters(['Shelflife', 'Jack Lemkus', 'Archive', 'Soul Gallery', 'The Plug and Play', 'Court Order'])
                  }}
                  className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-[9px] font-black text-ds-text-dim uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all shadow-lg shrink-0"
                >
                  Clear All
                </button>
              )}
              {onlyMoneySizes && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-[9px] font-black text-yellow-500 uppercase tracking-widest shrink-0 shadow-lg group hover:border-yellow-500/50 transition-all">
                  <Zap className="w-2.5 h-2.5" />
                  <span className="whitespace-nowrap">Money Sizes</span>
                  <X className="w-2.5 h-2.5 cursor-pointer hover:text-white transition-colors" onClick={() => setOnlyMoneySizes(false)} />
                </div>
              )}
              
              <div className="flex items-center gap-2 md:ml-4">
                {/* 📱 Mobile Dynamic Filters */}
                <div className="flex md:hidden items-center gap-1.5 bg-white/3 border border-white/5 rounded-xl p-1 shrink-0">
                   <button 
                     onClick={() => setGenderFilter(genderFilter === 'Men' ? null : 'Men')}
                     className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${genderFilter === 'Men' ? 'bg-ds-blue text-white shadow-[0_0_10px_rgba(96,165,250,0.4)]' : 'text-ds-text-dim hover:text-white'}`}
                   >MEN</button>
                   <button 
                     onClick={() => setGenderFilter(genderFilter === 'Women' ? null : 'Women')}
                     className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${genderFilter === 'Women' ? 'bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.4)]' : 'text-ds-text-dim hover:text-white'}`}
                   >WOMEN</button>
                   <button 
                     onClick={() => setActiveTab(activeTab === 'sales' ? 'hot' : 'sales')}
                     className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${activeTab === 'sales' ? 'bg-ds-green text-white shadow-[0_0_10px_rgba(0,200,83,0.4)]' : 'text-ds-text-dim hover:text-white'}`}
                   >SALE</button>
                </div>

                <button onClick={() => setMuted(!muted)} className={`p-2 rounded-lg transition-colors ${muted ? 'text-ds-red' : 'text-ds-text-dim hover:text-white'}`} suppressHydrationWarning>
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setShowIntel(!showIntel)}
                  className={`p-2 rounded-lg transition-all ${showIntel ? 'text-ds-indigo bg-ds-indigo/10' : 'text-ds-text-dim hover:text-white'}`}
                  title={showIntel ? "Hide Intelligence" : "Show Intelligence"}
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>
            </div>
        </header>

        <div className="h-8 bg-ds-bg border-b border-ds-border flex items-center overflow-hidden text-[11px] relative">
          <div className="absolute left-0 top-0 bottom-0 px-4 bg-ds-bg z-10 flex items-center border-r border-white/5 shadow-[20px_0_20px_rgba(16,18,23,1)]">
            <span className="text-ds-cyan font-black mr-4 shrink-0 flex items-center gap-2">
              <Activity className="w-3 h-3 animate-pulse" />
              <span className="hidden sm:inline">LIVE FEED:</span>
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
            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-ds-surface z-10 text-[10px] font-black uppercase tracking-widest">
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-4 text-left min-w-[340px] text-ds-text-dim">Product / SKU</th>
                    <th className="px-4 py-4 text-center w-[120px] text-ds-text-dim">Modified</th>
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
                          headerContent={(
                            <button 
                              onClick={() => setOnlyMoneySizes(!onlyMoneySizes)}
                              className={`w-full py-2 mb-2 rounded-lg font-black text-[9px] tracking-[0.1em] transition-all border flex items-center justify-center gap-2 ${
                                onlyMoneySizes 
                                  ? 'bg-yellow-500 text-ds-bg border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]' 
                                  : 'bg-yellow-500/5 text-yellow-500/50 border-yellow-500/20 hover:bg-yellow-500/10 hover:text-yellow-500 hover:border-yellow-500/40 opacity-40 hover:opacity-100'
                              }`}
                            >
                              <Zap className={`w-3 h-3 ${onlyMoneySizes ? 'fill-current' : ''}`} />
                              MONEY ADULT RANGE (UK 7-10.5)
                            </button>
                          )}
                          onClear={() => { setSizeFilters([]); setOnlyMoneySizes(false); setActiveFilter(null); }}
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
                      <th className="px-4 py-4 text-center w-[140px] text-ds-text-dim">
                        <div 
                          className="flex items-center justify-center gap-2 group cursor-pointer hover:text-white transition-colors"
                          onClick={() => setCompareOnly(!compareOnly)}
                          >
                            Compare
                            <ChevronRight className={`w-3.5 h-3.5 transition-all ${compareOnly ? 'text-ds-blue rotate-90 scale-125' : 'text-slate-500 group-hover:text-white rotate-0'}`} />
                        </div>
                      </th>
                    <th className="px-4 py-4 text-left w-[140px] relative text-ds-text-dim">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setActiveFilter(activeFilter === 'store' ? null : 'store')}>
                          Store
                          <SlidersHorizontal className={`w-3 h-3 ${storeFilters.length < 5 ? 'text-ds-blue' : 'text-slate-500'} group-hover:text-white transition-colors`} />
                        </div>
                        <FilterDropdown 
                          isOpen={activeFilter === 'store'} 
                          options={['Shelflife', 'Jack Lemkus', 'Archive', 'Soul Gallery', 'The Plug and Play', 'Court Order']} 
                          selected={storeFilters} 
                          onToggle={(v: string) => setStoreFilters((pv: string[]) => pv.includes(v) ? pv.filter(x => x !== v) : [...pv, v])} 
                          onClear={() => { setStoreFilters(['Shelflife', 'Jack Lemkus', 'Archive', 'Soul Gallery', 'The Plug and Play', 'Court Order']); setActiveFilter(null); }}
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
                        <div className="flex items-center justify-end gap-2 group cursor-pointer" onClick={() => setInventorySort(prev => prev === 'desc' ? 'asc' : (prev === 'asc' ? null : 'desc'))}>
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
                            {item.last_updated ? `${new Date(item.last_updated.seconds * 1000).getDate()} ${new Date(item.last_updated.seconds * 1000).toLocaleDateString([], { month: 'short' })}` : '—'}
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
                      <td className="px-4 py-4 text-center w-[140px]">
                          {(productStoreCounts[productGroupings.titleToKey[item.product_title]]?.size || 0) > 1 ? (
                            <button 
                              onClick={() => setComparingProduct(productGroupings.titleToKey[item.product_title])}
                              className="bg-ds-indigo/10 border border-ds-indigo/30 hover:bg-ds-indigo hover:text-white text-ds-indigo px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2"
                            >
                              <Layers className="w-3 h-3" />
                              Compare ({productStoreCounts[productGroupings.titleToKey[item.product_title]]?.size})
                            </button>
                          ) : (
                            <span className="text-[10px] font-black uppercase text-white/10 italic">Single_Node</span>
                          )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-[11px] font-black uppercase ${
                          item.store === 'Shelflife' ? 'text-ds-orange' :
                          item.store === 'Jack Lemkus' ? 'text-yellow-500' :
                          item.store === 'Archive' ? 'text-white' :
                          item.store === 'Soul Gallery' ? 'text-indigo-400' :
                          item.store === 'The Plug and Play' ? 'text-teal-400' :
                          item.store === 'Court Order' ? 'text-slate-400' :
                          'text-ds-blue'
                        }`}>{item.store}</span>
                      </td>
                      <td className="px-4 py-4 text-right font-black">
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-2">
                               <span className={`${(item.current_price ?? 0) < (item.original_price ?? 0) ? 'text-ds-green' : 'text-white'}`}>
                                   R{(item.current_price ?? 0).toLocaleString()}
                               </span>
                               {(item.original_price || 0) !== (item.current_price || 0) && item.original_price !== 0 && (
                                 <span className={`text-[9px] font-black px-1 rounded animate-pulse ${
                                   (item.current_price! > item.original_price!) ? 'bg-ds-blue/10 text-ds-blue' : 'bg-ds-red/10 text-ds-red'
                                 }`}>
                                   {(item.current_price! > item.original_price!) ? '+' : '-'}
                                   {Math.round(Math.abs((item.original_price! - item.current_price!) / item.original_price! * 100))}%
                                 </span>
                               )}
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
                        <WatchButton item={item} isWatched={watchlistSids.includes(item.sku_id)} currentCount={watchlistSids.length} tier={appUser?.tier || 'Free'} email={userEmail} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                {filteredStock.map((item) => (
                   <div key={item.sku_id} className="bg-ds-surface border border-ds-border rounded-xl p-4 space-y-3 relative overflow-hidden group">
                      <div className="flex justify-between items-start">
                         <div className="flex-1">
                            <a 
                              href={item.url || '#'} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="font-bold text-sm block mb-1 group-hover:text-ds-blue transition-colors"
                            >
                               {item.product_title}
                            </a>
                            <span className="text-[10px] text-ds-text-dim font-black uppercase tracking-tighter">{item.sku_id}</span>
                         </div>
                         <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className="flex items-center gap-2">
                               <span className="text-white font-black tracking-tighter">R{(item.current_price ?? 0).toLocaleString()}</span>
                               {(item.original_price || 0) !== (item.current_price || 0) && item.original_price !== 0 && (
                                 <div className="flex flex-col items-end leading-none">
                                    <span className="text-[8px] line-through text-ds-text-dim opacity-40">R{item.original_price?.toLocaleString()}</span>
                                    <span className={`text-[8px] font-black animate-pulse ${
                                      (item.current_price! > item.original_price!) ? 'text-ds-blue' : 'text-ds-red'
                                    }`}>
                                      {(item.current_price! > item.original_price!) ? '+' : '-'}
                                      {Math.round(Math.abs((item.original_price! - item.current_price!) / item.original_price! * 100))}%
                                    </span>
                                 </div>
                               )}
                            </div>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                               item.store === 'Shelflife' ? 'bg-ds-orange/10 text-ds-orange border border-ds-orange/20' :
                               item.store === 'Jack Lemkus' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                               item.store === 'Archive' ? 'bg-white/10 text-white border border-white/20' :
                               item.store === 'Soul Gallery' ? 'bg-indigo-400/10 text-indigo-400 border border-indigo-400/20' :
                               item.store === 'The Plug and Play' ? 'bg-teal-400/10 text-teal-400 border border-teal-400/20' :
                               item.store === 'Court Order' ? 'bg-slate-400/10 text-slate-400 border border-slate-400/20' :
                               'bg-ds-blue/10 text-ds-blue border border-ds-blue/20'
                            }`}>{item.store}</span>
                         </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                         <div className="flex items-center gap-2">
                            <SizeBadge size={item.size_title} />
                            <InventoryBadge soh={item.soh} />
                         </div>
                         <div className="flex items-center gap-2">
                            {(productStoreCounts[productGroupings.titleToKey[item.product_title]]?.size || 0) > 1 && (
                               <button 
                                 onClick={() => setComparingProduct(productGroupings.titleToKey[item.product_title])}
                                 className="p-2 bg-ds-indigo/10 text-ds-indigo rounded-lg border border-ds-indigo/20"
                               >
                                  <Layers className="w-4 h-4" />
                               </button>
                            )}
                            <WatchButton item={item} isWatched={watchlistSids.includes(item.sku_id)} currentCount={watchlistSids.length} tier={appUser?.tier || 'Free'} email={userEmail} />
                         </div>
                      </div>
                   </div>
                ))}
            </div>

            {filteredStock.length < allFilteredResults.length && (
              <div className="p-12 flex justify-center border-t border-white/5 bg-[#0d0f14]/50">
                <button 
                   onClick={() => setVisibleCount(prev => prev + 100)}
                   className="px-12 py-4 bg-ds-indigo/10 border border-ds-indigo/20 text-ds-indigo rounded-2xl font-bold text-lg hover:bg-ds-indigo/20 hover:text-white transition-all shadow-2xl backdrop-blur-md"
                >
                  Load More ({allFilteredResults.length - filteredStock.length} Remaining)
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="h-6 bg-ds-surface border-t border-ds-border flex items-center justify-between px-4 text-[10px] text-ds-text-dim">
           <p>© 2026 SOLE SEEK TERMINAL | STATUS: SYSTEM_ONLINE</p>
        </footer>
      </main>

      {/* 🔮 Intelligence Sidebar (Scraped Reports) */}
      <AnimatePresence>
        {showIntel && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="hidden lg:flex bg-ds-surface border-l border-ds-border flex-col shrink-0 overflow-y-auto intelligence-sidebar relative"
          >
            <button 
              onClick={() => setShowIntel(false)}
              className="absolute top-4 right-4 p-2 bg-white/5 rounded-lg hover:bg-white/10 text-ds-text-dim hover:text-white z-10 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
            <IntelligenceSidebar />
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="fixed bottom-10 right-10 flex flex-col gap-3 pointer-events-none w-80 z-50">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div key={n.nid} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} className="pointer-events-auto bg-ds-surface border border-ds-blue/30 p-4 rounded-xl relative overflow-hidden backdrop-blur-md shadow-2xl">
              <div className="flex justify-between items-start mb-1">
                 <span className={`text-[10px] font-black uppercase ${n.type === 'SALE' ? 'text-ds-green' : 'text-ds-blue'}`}>{n.type === 'SALE' ? 'Sale Alert' : 'Restock Alert'}</span>
                 <ShieldCheck className="w-3 h-3 text-ds-text-dim" />
              </div>
              <h4 className="font-bold text-xs truncate">{n.product_title}</h4>
              <p className="text-[10px] text-ds-text-dim">Size {n.size_title} | {n.type === 'SALE' ? `NOW R${n.price_at_event}` : `+${n.quantity_added} units`}</p>
              <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 6, ease: "linear" }} className={`absolute bottom-0 left-0 h-1 ${n.type === 'SALE' ? 'bg-ds-green' : 'bg-ds-blue'}`} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {comparingProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setComparingProduct(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-90" 
            />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              className="fixed top-0 right-0 bottom-0 w-[500px] bg-ds-bg border-l border-white/5 z-100 shadow-2xl flex flex-col"
            >
               <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-ds-indigo text-[10px] font-black uppercase tracking-[0.4em] mb-2 block">Market_Analysis</span>
                    <h2 className="text-xl font-black uppercase tracking-widest text-white leading-tight line-clamp-2">{comparingProduct}</h2>
                  </div>
                  <button onClick={() => setComparingProduct(null)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 text-white transition-colors">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-ds-bg z-20">
                      <tr className="border-b border-white/5">
                        <th className="px-8 py-4 text-[9px] font-black uppercase text-ds-text-dim tracking-widest">Boutique</th>
                        <th className="px-4 py-4 text-center text-[9px] font-black uppercase text-ds-text-dim tracking-widest">Size</th>
                        <th className="px-4 py-4 text-right text-[9px] font-black uppercase text-ds-text-dim tracking-widest">Price</th>
                        <th className="px-8 py-4 text-right text-[9px] font-black uppercase text-ds-text-dim tracking-widest">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {(() => {
                        const allItems = stock
                          .filter(s => productGroupings.titleToKey[s.product_title] === comparingProduct)
                          .sort((a, b) => (a.current_price || 0) - (b.current_price || 0))
                        
                        const getCategory = (s: string) => {
                          const n = parseFloat(s.replace(/[^0-9.]/g, ''))
                          const title = s.toLowerCase()
                          if (title.includes('ps') || title.includes('td') || title.includes('infant') || (!isNaN(n) && n <= 3.5)) return 'KIDS_YOUTH'
                          return 'ADULT_MENS_WOMENS'
                        }

                        const categories = ['ADULT_MENS_WOMENS', 'KIDS_YOUTH']
                        
                        return categories.map(cat => {
                          const catItems = allItems.filter(s => getCategory(s.size_title) === cat)
                          if (catItems.length === 0) return null
                          
                          const bestPrice = catItems[0]?.current_price || 0

                          return (
                            <React.Fragment key={cat}>
                              <tr className="bg-white/5 border-y border-white/5">
                                 <td colSpan={4} className="px-8 py-2 text-[8px] font-black text-ds-text-dim uppercase tracking-[0.3em]">
                                    Market Segment: {cat.replace(/_/g, ' ')}
                                 </td>
                              </tr>
                              {catItems.map((s, idx) => {
                                const isBest = idx === 0
                                const diffFromBest = bestPrice > 0 ? ((s.current_price || 0) - bestPrice) / bestPrice * 100 : 0
                                const discount = s.original_price && s.original_price > (s.current_price || 0) 
                                  ? ((s.original_price - (s.current_price || 0)) / s.original_price * 100) 
                                  : null

                                return (
                                  <tr key={s.sku_id + idx} className={`group transition-colors hover:bg-white/[0.02] ${isBest ? 'bg-ds-green/[0.02]' : ''}`}>
                                    <td className="px-8 py-5">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                          s.store === 'Shelflife' ? 'bg-ds-orange shadow-[0_0_8px_rgba(251,146,60,0.4)]' :
                                          s.store === 'Jack Lemkus' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]' :
                                          s.store === 'Archive' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]' :
                                          'bg-ds-blue shadow-[0_0_8px_rgba(96,165,250,0.4)]'
                                        }`} />
                                        <div>
                                          <div className="text-[11px] font-black text-white group-hover:text-ds-green transition-colors uppercase">{s.store}</div>
                                          <div className="text-[8px] font-black text-ds-text-dim uppercase tracking-tighter">SKU: {s.sku_id}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-5 text-center">
                                      <div className="flex justify-center transform scale-90 origin-center">
                                         <SizeBadge size={s.size_title} />
                                      </div>
                                    </td>
                                    <td className="px-4 py-5 text-right">
                                      <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-2">
                                          <div className="text-[13px] font-black text-white group-hover:text-ds-green transition-colors">
                                             R{s.current_price?.toLocaleString()}
                                          </div>
                                          {isBest && discount ? (
                                            <span className="text-[9px] font-black text-ds-green bg-ds-green/10 px-1 rounded flex items-center">
                                              -{discount.toFixed(0)}%
                                            </span>
                                          ) : !isBest && diffFromBest > 0 && (
                                            <span className="text-[9px] font-black text-ds-red flex items-center">
                                              +{diffFromBest.toFixed(0)}%
                                            </span>
                                          )}
                                        </div>
                                        {isBest && <div className="text-[8px] font-black text-ds-green uppercase tracking-tighter">Segment Optimal</div>}
                                      </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                      <a 
                                        href={s.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="block w-full h-full"
                                      >
                                        <div className="inline-flex p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white hover:text-ds-bg transition-all group/btn">
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </div>
                                      </a>
                                    </td>
                                  </tr>
                                )
                              })}
                            </React.Fragment>
                          )
                        })
                      })()}
                    </tbody>
                  </table>
                  
                  {stock.filter(s => productGroupings.titleToKey[s.product_title] === comparingProduct).length === 0 && (
                     <div className="p-20 text-center opacity-20 italic text-xs">No variations found in active memory.</div>
                  )}
               </div>
               <div className="p-8 bg-ds-indigo/5 border-t border-white/5">
                  <p className="text-[9px] font-black text-ds-indigo uppercase text-center tracking-[0.2em] animate-pulse">
                     Live Node Inventory Sync Active
                  </p>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function NavItem({ icon, label, active, onClick, count }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, count?: number }) {
  return (
    <div onClick={onClick} className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${active ? 'bg-ds-indigo-deep text-ds-indigo border border-ds-indigo-border' : 'text-gray-400 hover:text-white hover:bg-white/5'}`} suppressHydrationWarning>
      <div className="flex items-center gap-3">
        {icon} <span className="font-bold block md:hidden lg:block">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-black bg-ds-indigo text-ds-bg px-1.5 py-0.5 rounded-md shadow-lg block md:hidden lg:block">{count}</span>
      )}
    </div>
  )
}

function StoreFilter({ name, colorClass, active, onClick }: { name: string, colorClass: string, active: boolean, onClick: () => void }) {
  return (
    <div onClick={onClick} className={`group flex items-center gap-3 px-4 py-1.5 cursor-pointer transition-all ${active ? 'opacity-100 translate-x-1' : 'opacity-40 hover:opacity-100 hover:translate-x-0.5'}`} suppressHydrationWarning>
      <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)] transition-transform group-hover:scale-125 ${colorClass}`} />
      <span className={`font-black text-[10px] uppercase tracking-widest text-ds-text-dim transition-colors group-hover:text-white block md:hidden lg:block`}>{name}</span>
    </div>
  )
}

function WatchButton({ item, isWatched, currentCount, tier, email }: { item: StockItem, isWatched: boolean, currentCount: number, tier: string | null, email: string }) {
  const [loading, setLoading] = useState(false)
  const handleWatch = async (e: any) => {
    e.stopPropagation()
    if (loading) return
    if (!email) { alert('Please sign in to use the Watch List.'); return }
    
    // Tier-based limits
    const limitCount = tier === 'Pro' ? 1000 : (tier === 'Standard' ? 100 : 10)
    if (currentCount >= limitCount) {
      alert(`LIMIT_REACHED: Your current tier (${tier || 'Free'}) is capped at ${limitCount} active alerts. Upgrade to a higher tier at SoleSeek.io to unlock more slots.`)
      return
    }

    setLoading(true)
    try {
      await addDoc(collection(db, "user_alerts"), { user_email: email, sku_id: item.sku_id, status: 'active', created_at: serverTimestamp(), store: item.store, product_title: item.product_title })
    } catch (e) { console.error('Watch error:', e) } finally { setLoading(false) }
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



interface FilterDropdownProps {
  isOpen: boolean;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
  headerContent?: React.ReactNode;
}

function FilterDropdown({ isOpen, options, selected, onToggle, onClear, headerContent }: FilterDropdownProps) {
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
      {headerContent && <div className="px-1">{headerContent}</div>}
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
function IntelligenceSidebar() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'intel' | 'discord'>('discord')

  useEffect(() => {
    const q = query(collection(db, "store_blogs"), orderBy("detected_at", "desc"), limit(15))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    }, (error) => {
      console.error("Intelligence Sidebar Error:", error)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#0d0f14]/80 backdrop-blur-3xl">
      <div className="p-6 border-b border-white/5 bg-ds-bg/50">
        <a href="/blog" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 mb-1 group/header cursor-pointer">
          <Monitor className="w-3.5 h-3.5 text-ds-indigo group-hover/header:rotate-12 transition-transform" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-ds-indigo group-hover/header:text-white transition-colors">Intelligence_Feed</h3>
          <ExternalLink className="w-2.5 h-2.5 text-ds-indigo opacity-0 group-hover/header:opacity-100 transition-opacity" />
        </a>
        <p className="text-[9px] text-ds-text-dim uppercase font-bold">Real-time boutique scrapers</p>
        
        {/* Discord Marketing Banner */}
        <a 
          href="https://discord.gg/soleseek" 
          target="_blank" 
          rel="noopener noreferrer"
          className="mt-6 block p-4 rounded-xl bg-ds-indigo/10 border border-ds-indigo/20 hover:bg-ds-indigo/20 hover:border-ds-indigo/40 transition-all group/discord relative overflow-hidden"
        >
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 rounded-lg bg-ds-indigo/20 text-ds-indigo group-hover/discord:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white mb-0.5">SoleSeekers_HQ</div>
              <div className="text-[9px] text-ds-indigo font-bold uppercase">Join the Inner Circle</div>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-2 opacity-10">
              <MessageSquare className="w-12 h-12 -rotate-12" />
          </div>
        </a>
        <div className="mt-8 flex bg-white/5 p-1 rounded-2xl border border-white/5">
           <button 
             onClick={() => setActiveTab('discord')}
             className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'discord' ? 'bg-ds-green text-ds-bg shadow-2xl' : 'text-ds-text-dim hover:text-white'}`}
           >
              <MessageSquare className="w-3 h-3" /> Alerts
           </button>
           <button 
             onClick={() => setActiveTab('intel')}
             className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'intel' ? 'bg-ds-indigo text-white shadow-2xl' : 'text-ds-text-dim hover:text-white'}`}
           >
              <Monitor className="w-3 h-3" /> Intel
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'intel' ? (
            <motion.div 
              key="intel"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
              {loading ? (
                [1,2,3].map(i => <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />)
              ) : reports.length === 0 ? (
                <div className="text-center py-10 opacity-30 italic text-[10px]">No intelligence gathered yet.</div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="p-0 rounded-2xl bg-white/3 border border-white/5 hover:border-ds-indigo/30 transition-all group relative overflow-hidden h-[180px] flex flex-col shadow-lg">
                     <a 
                       href={report.url} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="p-5 h-full flex flex-col"
                     >
                        <div className="absolute top-0 right-0 px-3 py-1 bg-ds-indigo text-ds-bg text-[9px] font-black uppercase tracking-tighter">
                          {report.store}
                        </div>
                        
                        <h4 className="font-black text-[13px] uppercase tracking-widest mb-3 leading-tight text-white group-hover:text-ds-indigo transition-colors line-clamp-3">
                          {report.title}
                        </h4>

                        <p className="text-[10px] text-ds-text-dim line-clamp-2 mb-4 leading-relaxed italic opacity-80">
                          {report.excerpt || "Bot intelligence detected a new editorial update concerning regional inventory and releases."}
                        </p>
                     </a>

                     <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5 p-5 bg-ds-bg/20">
                        <span className="text-[9px] font-black text-ds-text-dim uppercase tracking-widest">
                          {report.detected_at?.seconds ? `${new Date(report.detected_at.seconds * 1000).getDate()} ${new Date(report.detected_at.seconds * 1000).toLocaleDateString([], { month: 'short' })}` : '26 Mar'}
                        </span>
                        <a 
                          href={report.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1.5 text-[9px] font-black text-ds-indigo uppercase tracking-widest hover:text-white transition-colors"
                        >
                          Details <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                     </div>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="discord"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0"
            >
               <CommunityIntel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="p-4 border-t border-white/5 bg-ds-bg/30">
        <div className="flex items-center justify-center gap-2 text-[8px] font-black text-ds-text-dim uppercase tracking-widest">
           <Activity className="w-2 h-2 text-ds-green animate-pulse" />
           Boutique Node Active
        </div>
      </div>
    </div>
  )
}
