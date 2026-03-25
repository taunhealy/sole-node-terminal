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
  serverTimestamp,
  where
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
}

interface RestockLog {
  id: string
  sku_id?: string
  product_title: string
  size_title: string
  quantity_added: number
  detected_at: any
  type?: 'RESTOCK' | 'SALE'
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
  
  // Header Filter State
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [sizeFilters, setSizeFilters] = useState<string[]>([])
  const [storeFilters, setStoreFilters] = useState<string[]>(['Shelflife', 'Jack Lemkus', 'Archive', 'Amazon'])
  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | null>(null)

  const watchlistRef = useRef<string[]>([])
  const userEmail = "kea@logic.com"

  // Unified Subscription Effect
  useEffect(() => {
    const logsQuery = query(collection(db, "restock_logs"), orderBy("detected_at", "desc"), limit(20))
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
      // Buffer updates to avoid lag while monitor is sync-ing in batches
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
      setWatchlistSids(prev => {
         if (JSON.stringify(prev) === JSON.stringify(newSids)) return prev
         return newSids
      })
    })

    setMounted(true)
    return () => {
      unsubscribeLogs()
      unsubscribeStock()
      unsubscribeWatchlist()
    }
  }, [])

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
      removeNotification(id)
    }, 6000)
  }

  const removeNotification = (nid: string) => {
    setNotifications(prev => prev.filter(n => n.nid !== nid))
  }

  const filteredStock = useMemo(() => {
    let result = stock.filter(item => {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
          item.product_title.toLowerCase().includes(searchLower) || 
          item.sku_id.toLowerCase().includes(searchLower) ||
          item.size_title.toLowerCase().includes(searchLower)
      
      const matchesStore = storeFilters.length === 0 || storeFilters.includes(item.store || '')
      const matchesSize = sizeFilters.length === 0 || sizeFilters.includes(item.size_title)
      
      const isSale = (item.current_price ?? 0) < (item.original_price ?? 999999)
      
      let matchesTab = true
      if (activeTab === 'sales') matchesTab = isSale
      if (activeTab === 'watchlist') matchesTab = watchlistSids.includes(item.sku_id)
      if (activeTab === 'releases') matchesTab = !!item.created_at
      if (activeTab === 'restocks') matchesTab = !!item.restocked_at && item.soh > 0

      return matchesSearch && matchesStore && matchesSize && matchesTab
    })

    if (priceSort) {
      result = [...result].sort((a, b) => {
        const p1 = a.current_price || 0
        const p2 = b.current_price || 0
        return priceSort === 'asc' ? p1 - p2 : p2 - p1
      })
    }
    // Limit DOM rendering to top 150 to keep the page snappy
    return result.slice(0, 150)
  }, [stock, searchTerm, storeFilters, sizeFilters, activeTab, priceSort, watchlistSids])

  const allSizes = useMemo(() => {
    const s = Array.from(new Set(stock.map(i => i.size_title).filter(Boolean)))
    return s.sort((a,b) => {
        const na = parseFloat(a.replace(/[^0-9.]/g, '')), nb = parseFloat(b.replace(/[^0-9.]/g, ''))
        return isNaN(na) ? 1 : isNaN(nb) ? -1 : na - nb
    })
  }, [stock])

  return (
    <div className="flex h-screen bg-[#101217] text-white overflow-hidden text-[13px] selection:bg-[#3a86ff]/30">
      
      <aside className="w-16 md:w-56 bg-[#171920] border-r border-[#1c2128] flex flex-col items-center md:items-stretch py-4 overflow-y-auto shrink-0 transition-all duration-300">
        <div className="px-4 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#172554] flex items-center justify-center text-[#60a5fa] shadow-[0_0_15px_rgba(30,58,138,0.4)] transition-transform hover:scale-110 cursor-pointer" suppressHydrationWarning>
            <Zap className="w-5 h-5 fill-[#60a5fa]" />
          </div>
          <span className="font-black text-xl tracking-tighter hidden md:block select-none italic uppercase">SOLE<span className="text-[#60a5fa]">NODE</span>.io</span>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          <NavItem icon={<Flame className="w-4 h-4" />} label="Hot Pairs" active={activeTab === 'hot'} onClick={() => setActiveTab('hot')} />
          <NavItem icon={<TrendingUp className="w-4 h-4" />} label="New Releases" active={activeTab === 'releases'} onClick={() => setActiveTab('releases')} />
          <NavItem icon={<Activity className="w-4 h-4" />} label="Restocks" active={activeTab === 'restocks'} onClick={() => setActiveTab('restocks')} />
          <NavItem icon={<Zap className="w-4 h-4 text-[#60a5fa]" />} label="Sales" active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} />
          <NavItem icon={<Star className="w-4 h-4" />} label="Watchlist" active={activeTab === 'watchlist'} onClick={() => setActiveTab('watchlist')} />
          
          <div className="h-px bg-[#1c2128] my-4 mx-2" />
          <p className="px-4 py-2 text-[10px] font-black uppercase text-[#8b8e94] hidden md:block">Stores</p>
          
          <StoreFilter name="Shelflife" colorClass="bg-[#60a5fa]" active={storeFilters.includes('Shelflife')} onClick={() => setStoreFilters((prev: string[]) => prev.includes('Shelflife') ? prev.filter(s => s !== 'Shelflife') : [...prev, 'Shelflife'])} />
          <StoreFilter name="Jack Lemkus" colorClass="bg-red-500" active={storeFilters.includes('Jack Lemkus')} onClick={() => setStoreFilters((prev: string[]) => prev.includes('Jack Lemkus') ? prev.filter(s => s !== 'Jack Lemkus') : [...prev, 'Jack Lemkus'])} />
          <StoreFilter name="Archive" colorClass="bg-red-800" active={storeFilters.includes('Archive')} onClick={() => setStoreFilters((prev: string[]) => prev.includes('Archive') ? prev.filter(s => s !== 'Archive') : [...prev, 'Archive'])} />
          <StoreFilter name="Amazon" colorClass="bg-yellow-500" active={storeFilters.includes('Amazon')} onClick={() => setStoreFilters((prev: string[]) => prev.includes('Amazon') ? prev.filter(s => s !== 'Amazon') : [...prev, 'Amazon'])} />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#0d0f14]">
        <header className="h-14 bg-[#171920] border-b border-[#1c2128] flex items-center justify-between px-6 shrink-0 z-20">
            <div className="flex flex-col gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#101217] border border-[#1c2128] rounded-md min-w-[300px] group focus-within:border-[#60a5fa]">
                <Search className="w-4 h-4 text-[#8b8e94]" />
                <input type="text" placeholder="Search SKU..." className="bg-transparent outline-none text-xs w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} suppressHydrationWarning />
                {searchTerm && <X className="w-3.5 h-3.5 text-[#8b8e94] cursor-pointer hover:text-white" onClick={() => setSearchTerm('')} />}
              </div>
              {searchTerm && (
                <div className="flex gap-2">
                   <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#172554] border border-[#1e3a8a] rounded text-[9px] font-black text-[#60a5fa] uppercase tracking-widest">
                      <span>Search: {searchTerm}</span>
                      <X className="w-2.5 h-2.5 cursor-pointer hover:text-white transition-colors" onClick={() => setSearchTerm('')} />
                   </div>
                </div>
              )}
            </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setMuted(!muted)} className={`p-2 rounded-lg ${muted ? 'text-red-500' : 'text-[#8b8e94]'}`} suppressHydrationWarning>
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button className="p-2 text-[#8b8e94]" suppressHydrationWarning><Settings className="w-4 h-4" /></button>
          </div>
        </header>

        <div className="h-8 bg-[#101217] border-b border-[#1c2128] flex items-center px-4 overflow-x-auto text-[11px]">
          <span className="text-[#60a5fa] font-black mr-4 shrink-0">LIVE FEED:</span>
          <div className="flex gap-8">
            {logs.slice(0, 10).map(log => (
              <span key={log.id} onClick={() => handleFilterToItem(log.sku_id)} className="flex gap-2 cursor-pointer hover:text-[#60a5fa] transition-colors group shrink-0" suppressHydrationWarning>
                <span className="text-white group-hover:text-[#60a5fa]">{log.product_title}</span>
                <span className="text-[#00C853]">{log.type === 'SALE' ? 'FALLEN' : `+${log.quantity_added} Sizes`}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[#171920] z-10 text-[10px] font-black uppercase">
                <tr className="border-b border-white/5">
                   <th className="p-4 text-left">Product / SKU</th>
                   <th className="p-4 text-left relative">
                      <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setActiveFilter(activeFilter === 'size' ? null : 'size')}>
                        Size
                        <SlidersHorizontal className={`w-3 h-3 ${sizeFilters.length > 0 ? 'text-[#60a5fa]' : 'text-slate-500'} group-hover:text-white transition-colors`} />
                      </div>
                      <FilterDropdown 
                        isOpen={activeFilter === 'size'} 
                        options={allSizes} 
                        selected={sizeFilters} 
                        onToggle={(v: string) => setSizeFilters((prev: string[]) => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])} 
                        onClear={() => setSizeFilters([])}
                      />
                   </th>
                   <th className="p-4 text-left">Colour</th>
                   <th className="p-4 text-left relative">
                      <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setActiveFilter(activeFilter === 'store' ? null : 'store')}>
                        Store
                        <SlidersHorizontal className={`w-3 h-3 ${storeFilters.length < 3 ? 'text-[#60a5fa]' : 'text-slate-500'} group-hover:text-white transition-colors`} />
                      </div>
                      <FilterDropdown 
                        isOpen={activeFilter === 'store'} 
                        options={['Shelflife', 'Jack Lemkus', 'Archive', 'Amazon']} 
                        selected={storeFilters} 
                        onToggle={(v: string) => setStoreFilters((prev: string[]) => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])} 
                        onClear={() => setStoreFilters(['Shelflife', 'Jack Lemkus', 'Archive', 'Amazon'])}
                      />
                   </th>
                   <th className="p-4 text-right relative">
                      <div className="flex items-center justify-end gap-2 group cursor-pointer" onClick={() => setPriceSort(prev => prev === 'asc' ? 'desc' : (prev === 'desc' ? null : 'asc'))}>
                        Price
                        {priceSort === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#60a5fa]" /> : 
                         priceSort === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-[#60a5fa]" /> : 
                         <SlidersHorizontal className="w-3 h-3 text-slate-500 group-hover:text-white" />}
                      </div>
                   </th>
                   <th className="p-4 text-right">Inventory</th>
                   <th className="p-4 text-right pr-8">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item) => {
                  const st = (item.size_title || '').trim()
                  const rawColor = (item.color || '').trim()
                  let s = st, clr = rawColor || '—'
                  
                  if (st.includes(' / ')) {
                    const parts = st.split(' / ')
                    s = parts[0]; clr = rawColor || parts[1]
                  } else if (!/[0-9]/.test(st.replace(/[^0-9]/g, '')) && st.length > 2 && !rawColor) {
                    s = '—'; clr = st
                  }

                  return (
                  <tr key={item.sku_id} className="hover:bg-white/5 border-b border-[#1c2128] group transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <a 
                          href={item.url || (
                            item.store === 'Shelflife' ? `https://www.shelflife.co.za/search?item_search=${encodeURIComponent(item.product_title)}` :
                            item.store === 'Jack Lemkus' ? `https://lemkus.com/search?q=${encodeURIComponent(item.product_title)}` :
                            item.store === 'Archive' ? `https://bash.com/s?search=${encodeURIComponent(item.product_title)}` :
                            '#'
                          )} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-bold hover:text-[#60a5fa] flex items-center gap-1.5 transition-colors group/link"
                          suppressHydrationWarning
                        >
                          {item.product_title}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </a>
                        <span className="text-[10px] text-[#8b8e94] font-black">{item.sku_id}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 group/size">
                        <SizeBadge size={s} />
                        <div className="flex flex-col opacity-0 group-hover/size:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSearchTerm(item.product_title) }}
                            className="p-0.5 hover:text-[#60a5fa] transition-colors"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSearchTerm(item.product_title) }}
                            className="p-0.5 hover:text-[#60a5fa] transition-colors"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 overflow-hidden max-w-[120px]">
                      <span className="text-[11px] font-black uppercase text-[#8b8e94] tracking-tighter truncate block">{clr}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-[11px] font-black uppercase text-[#60a5fa]">{item.store}</span>
                    </td>
                    <td className="p-4 text-right font-black">
                       <div className="flex flex-col items-end">
                          <span className={`${(item.current_price ?? 0) < (item.original_price ?? 0) ? 'text-[#60a5fa]' : 'text-white'}`}>
                             R{(item.current_price ?? 0).toLocaleString()}
                          </span>
                          {(item.current_price ?? 0) < (item.original_price ?? 0) && (
                            <span className="text-[9px] line-through text-gray-400 opacity-50">R{(item.original_price ?? 0).toLocaleString()}</span>
                          )}
                       </div>
                    </td>
                    <td className="p-4 text-right">
                        <InventoryBadge soh={item.soh} />
                    </td>
                    <td className="p-4 text-right pr-8">
                       <WatchButton item={item} isWatched={watchlistSids.includes(item.sku_id)} />
                    </td>
                   </tr>
                )})}
              </tbody>
            </table>
          </div>

        </div>

        <footer className="h-6 bg-[#171920] border-t border-[#1c2128] flex items-center justify-between px-4 text-[10px] text-[#8b8e94]">
           <p>© 2026 SOLENODE.io TERMINAL | ACTIVE_NODE: SHELFLIFE_V1</p>
        </footer>
      </main>

      <div className="fixed bottom-10 right-10 flex flex-col gap-3 pointer-events-none w-80">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div key={n.nid} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} className="pointer-events-auto bg-[#171920] border border-[#60a5fa]/30 p-4 rounded-xl relative overflow-hidden backdrop-blur-md">
              <div className="flex justify-between items-start mb-1">
                 <span className="text-[10px] font-black text-[#60a5fa] uppercase">{n.type === 'SALE' ? 'Sale Alert' : 'Restock Alert'}</span>
                 <ShieldCheck className="w-3 h-3 text-[#8b8e94]" />
              </div>
              <h4 className="font-bold text-xs truncate">{n.product_title}</h4>
              <p className="text-[10px] text-[#8b8e94]">Size {n.size_title} | {n.type === 'SALE' ? `NOW R${n.price_at_event}` : `+${n.quantity_added} units`}</p>
              <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 6, ease: "linear" }} className="absolute bottom-0 left-0 h-1 bg-[#60a5fa]" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <div onClick={onClick} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${active ? 'bg-[#172554] text-[#60a5fa]' : 'text-gray-400 hover:text-white'}`} suppressHydrationWarning>
      {icon} <span className="font-bold hidden md:block">{label}</span>
    </div>
  )
}

interface StoreFilterProps {
  name: string
  colorClass: string
  active: boolean
  onClick: () => void
}

function StoreFilter({ name, colorClass, active, onClick }: StoreFilterProps) {
  return (
    <div onClick={onClick} className={`flex items-center gap-3 px-4 py-1.5 cursor-pointer ${active ? 'opacity-100' : 'opacity-40'}`} suppressHydrationWarning>
      <div className={`w-2 h-2 rounded-full ${colorClass}`} />
      <span className="font-bold">{name}</span>
    </div>
  )
}

function WatchButton({ item, isWatched }: { item: StockItem, isWatched: boolean }) {
  const [loading, setLoading] = useState(false)
  const handleWatch = async (e: any) => {
    e.stopPropagation()
    if (isWatched || loading) return
    setLoading(true)
    try {
      await addDoc(collection(db, "user_alerts"), { user_email: "kea@logic.com", sku_id: item.sku_id, status: 'active', created_at: serverTimestamp() })
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }
  return (
    <button 
      onClick={handleWatch} 
      className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all duration-300 ${
        isWatched 
          ? 'bg-[#00C853]/10 text-[#00C853] border border-[#00C853]/20' 
          : 'bg-[#1c2128] text-white hover:bg-[#172554] hover:text-[#60a5fa] hover:border-[#1e3a8a] border border-transparent'
      }`} 
      suppressHydrationWarning
    >
      {loading ? '...' : (
        <>
          <Star className={`w-3 h-3 ${isWatched ? 'fill-[#00C853]' : ''}`} />
          {isWatched ? 'Watching' : 'Watch'}
        </>
      )}
    </button>
  )
}

function SizeBadge({ size }: { size: string }) {
  const getStyle = (s: string) => {
    const n = parseFloat(s.replace(/[^0-9.]/g, ''))
    if (isNaN(n)) return 'bg-[#1c2128] text-gray-500 border-[#30363d]'
    
    // Scale from 3 (Dark Blue) to 10 (Cyan) to 15 (Orange)
    if (n <= 5) return 'bg-[#1e1b4b] text-[#818cf8] border-[#312e81]' // Indigo
    if (n <= 7) return 'bg-[#172554] text-[#60a5fa] border-[#1e3a8a]' // Blue
    if (n <= 9) return 'bg-[#083344] text-[#22d3ee] border-[#164e63]' // Cyan-ish Dark
    if (n === 10) return 'bg-[#0e7490]/20 text-[#22d3ee] border-[#0891b2]/40' // Pure Cyan 10
    if (n <= 12) return 'bg-[#431407] text-[#fb923c] border-[#7c2d12]' // Orange 
    return 'bg-[#450a0a] text-red-100 border-[#7f1d1d]' // Red/Light
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
      className="absolute top-10 left-0 min-w-[160px] bg-[#171920] border border-[#1c2128] rounded-lg shadow-2xl z-50 p-2 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-2 px-2 pb-2 border-b border-[#1c2128]">
        <span className="text-[9px] text-[#8b8e94] font-black uppercase tracking-widest">Filter</span>
        <button onClick={onClear} className="text-[9px] text-[#60a5fa] hover:text-white font-black uppercase">Clear</button>
      </div>
      <div className="max-h-[200px] overflow-y-auto space-y-1 custom-scrollbar px-1">
        {options.map((opt: string) => (
          <div 
            key={opt} 
            onClick={() => onToggle(opt)}
            className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${selected.includes(opt) ? 'bg-[#172554] text-[#60a5fa]' : 'hover:bg-white/5 text-gray-400'}`}
          >
            <span className="text-[10px] font-bold">{opt}</span>
            {selected.includes(opt) && <div className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function InventoryBadge({ soh }: { soh: number }) {
  const isAvailable = soh > 0
  return (
    <div className="flex justify-end">
      <div 
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-black border transition-all duration-500 select-none
        ${isAvailable 
          ? 'bg-gradient-to-br from-[#00C853]/20 via-[#00C853]/10 to-transparent border-[#00C853]/40 text-[#00C853] shadow-[inset_0_0_12px_rgba(0,200,83,0.05)] hover:shadow-[0_0_20px_rgba(0,200,83,0.15)] hover:border-[#00C853]/60' 
          : 'bg-[#1c2128]/50 border-[#30363d] text-[#30363d]'
        }`}
      >
        {soh}
      </div>
    </div>
  )
}
