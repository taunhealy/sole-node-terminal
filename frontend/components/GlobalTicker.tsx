'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Target, Globe, Activity, Shield } from 'lucide-react'
import { db } from '@/lib/firebase'
import { doc, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'

interface Hit {
  id: string
  product_title: string
  store: string
  size: string
  alias: string
  timestamp: any
}

export default function GlobalTicker() {
  const [totalHits, setTotalHits] = useState<number>(0)
  const [recentHits, setRecentHits] = useState<Hit[]>([])
  const [upcomingHeat, setUpcomingHeat] = useState<any[]>([])

  useEffect(() => {
    // 1. Sync Global Counter
    const unsubStats = onSnapshot(doc(db, 'stock', '_global_stats'), (snap) => {
      if (snap.exists()) {
        setTotalHits(snap.data().total_hits || 0)
      }
    })

    // 2. Sync Recent Global Successes
    const q = query(collection(db, 'global_hits'), orderBy('timestamp', 'desc'), limit(15))
    const unsubHits = onSnapshot(q, (snap) => {
      const hits: Hit[] = []
      snap.forEach((doc) => hits.push({ id: doc.id, ...doc.data() } as Hit))
      setRecentHits(hits)
    })

    // 3. Sync Early Access Intel (Blogs)
    const blogQ = query(collection(db, 'store_blogs'), orderBy('detected_at', 'desc'), limit(10))
    const unsubBlogs = onSnapshot(blogQ, (snap) => {
      const blogs: any[] = []
      snap.forEach((doc) => blogs.push({ id: doc.id, ...doc.data() }))
      setUpcomingHeat(blogs)
    })

    return () => { unsubStats(); unsubHits(); unsubBlogs(); }
  }, [])

  return (
    <div className="fixed bottom-0 left-0 right-0 z-200 bg-black/80 backdrop-blur-2xl border-t border-ds-blue/20 h-14 overflow-hidden flex items-center">
      {/* 🚀 Total Counter Sidebar */}
      <div className="h-full px-6 bg-ds-blue/10 border-r border-ds-blue/20 flex items-center gap-3 shrink-0">
        <Zap className="w-4 h-4 text-ds-blue animate-pulse" />
        <div className="flex flex-col">
          <span className="text-[8px] font-black tracking-widest text-ds-blue/60 uppercase leading-none mb-1">Total_Hive_Pings</span>
          <span className="text-sm font-black text-white leading-none tracking-tighter tabular-nums">
            {totalHits.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 📡 Scrolling Marquee */}
      <div className="flex-1 overflow-hidden relative">
        <motion.div 
          animate={{ x: [0, -2000] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="flex items-center gap-16 whitespace-nowrap pl-8"
        >
          {/* 📡 Combination Feed: Recent Snipes + Early Intel */}
          {[...recentHits, ...upcomingHeat].length > 0 ? (
            [...recentHits, ...upcomingHeat, ...recentHits, ...upcomingHeat].map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="flex items-center gap-4 group">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${item.product_title ? 'bg-ds-blue' : 'bg-ds-green'} animate-pulse`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${item.product_title ? 'text-ds-blue' : 'text-ds-green'}`}>
                     {item.product_title ? (item.store || 'SHELFLIFE') : 'HIVE_INTEL'}
                  </span>
                </div>
                <span className="text-[11px] font-black text-white/90 uppercase tracking-tight">
                  {item.product_title || item.title || 'UNKNOWN_SIGNAL'} 
                  <span className="text-ds-blue/60 ml-2 italic text-[9px]">[SIZE {item.size && item.size !== 'N/A' ? item.size : '?'}]</span>
                </span>
                {item.product_title ? (
                  <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-white/5 border border-white/10 group-hover:border-ds-blue/30 transition-colors">
                    <Target className="w-3 h-3 text-ds-red" />
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">SNIPED_BY:</span>
                    <span className="text-[9px] font-black text-white uppercase italic">{item.alias || 'ANON_SNIPER'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-ds-green/5 border border-ds-green/20 group-hover:border-ds-green/40 transition-colors">
                    <Zap className="w-3 h-3 text-ds-green" />
                    <span className="text-[9px] font-black text-ds-green uppercase tracking-widest italic">EARLY_ACCESS_INTEL</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center gap-4 opacity-50">
               <Shield className="w-4 h-4 text-ds-blue" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white italic">Awaiting Global Snipe Signals... Distributed Hive Monitoring Active</span>
            </div>
          )}
        </motion.div>

        {/* Shimmer Overlays */}
        <div className="absolute inset-y-0 left-0 w-20 bg-linear-to-r from-black/80 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-linear-to-l from-black/80 to-transparent pointer-events-none" />
      </div>

      {/* 🌐 Live Status */}
      <div className="h-full px-6 bg-ds-red/5 border-l border-white/5 flex items-center gap-4 shrink-0">
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-black tracking-widest text-ds-red uppercase leading-none mb-1">Fleet_Node_Status</span>
          <span className="text-[10px] font-black text-white uppercase leading-none tracking-widest">Active_Combat</span>
        </div>
        <Activity className="w-4 h-4 text-ds-red animate-pulse" />
      </div>
    </div>
  )
}
