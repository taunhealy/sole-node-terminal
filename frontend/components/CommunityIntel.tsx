'use client'

import React, { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { MessageSquare, User, TrendingUp, Zap, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface IntelMessage {
  id: string
  author: string
  content: string
  channel: string
  detected_at: any
}

export default function CommunityIntel() {
  const [messages, setMessages] = useState<IntelMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "community_intel"), orderBy("detected_at", "desc"), limit(10))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as IntelMessage[])
      setLoading(false)
    }, (error) => {
      console.error("Community Intel Error:", error)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#0d0f14]/40 backdrop-blur-3xl border-l border-white/5">
      <div className="p-6 border-b border-white/5 bg-ds-bg/50">
        <div className="flex items-center gap-3 mb-1 group/header">
          <MessageSquare className="w-3.5 h-3.5 text-ds-green group-hover/header:scale-110 transition-transform" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-ds-green">Reseller_Signals</h3>
        </div>
        <p className="text-[9px] text-ds-text-dim uppercase font-bold italic">Live from the Discord Inner Circle</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)
        ) : messages.length === 0 ? (
          <div className="text-center py-10 opacity-30 italic text-[10px]">Awaiting community signals...</div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-4 rounded-xl bg-white/3 border border-white/5 hover:border-ds-green/30 transition-all group relative overflow-hidden flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-ds-green/20 flex items-center justify-center">
                         <User className="w-3 h-3 text-ds-green" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/90">{msg.author}</span>
                   </div>
                   <div className="px-1.5 py-0.5 rounded bg-ds-green/10 border border-ds-green/20 text-[7px] text-ds-green font-black uppercase tracking-tighter">
                      #{msg.channel}
                   </div>
                </div>

                <p className="text-[11px] text-ds-text-dim leading-relaxed font-medium italic group-hover:text-white transition-colors">
                  "{msg.content}"
                </p>

                <div className="flex items-center gap-2 mt-1 opacity-40">
                   <Clock className="w-2.5 h-2.5" />
                   <span className="text-[8px] font-bold uppercase tracking-widest">
                      {msg.detected_at?.seconds ? `${new Date(msg.detected_at.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'LIVE'}
                   </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
