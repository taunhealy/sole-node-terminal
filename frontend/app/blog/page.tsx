'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, ExternalLink } from 'lucide-react'
import Footer from '@/components/Footer'
import { db } from '@/lib/firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'

interface BlogPost {
  id: string
  title: string
  url: string
  store: string
  excerpt?: string
  detected_at: any
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [storeFilter, setStoreFilter] = useState<string | null>(null)

  useEffect(() => {
    const q = query(collection(db, "store_blogs"), orderBy("detected_at", "desc"), limit(24))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BlogPost[])
      setLoading(false)
    }, (error) => {
      console.error("Firestore error in blog listener:", error)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const filteredPosts = storeFilter 
    ? posts.filter(p => p.store === storeFilter)
    : posts

  return (
    <div className="bg-[#0d0f14] text-white min-h-screen pt-24 px-8 selection:bg-ds-blue/30">
      <div className="max-w-7xl mx-auto py-20 text-center md:text-left">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
          <div>
            <span className="text-ds-indigo font-black uppercase tracking-[0.3em] text-[10px] mb-4 block">Central Intelligence Hub</span>
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-4 text-white">
              The <span className="text-ds-indigo">Market</span> Reports.
            </h1>
            <p className="text-ds-text-dim text-lg md:text-xl font-medium max-w-2xl leading-relaxed italic">
              Real-time deep-scrapes from Nice Kicks, Shelflife, Archive, and global boutiques.
            </p>
          </div>
          
          <div className="hidden lg:flex items-center gap-6 px-10 py-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-3xl shadow-2xl">
            <div className="text-right">
               <p className="text-[10px] font-black uppercase text-ds-text-dim tracking-widest mb-1">Intelligence Feed</p>
               <p className="text-3xl font-black text-ds-indigo">{posts.length}</p>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-right">
               <p className="text-[10px] font-black uppercase text-ds-text-dim tracking-widest mb-1">Node Status</p>
               <p className="text-3xl font-black text-white">Scraping</p>
            </div>
          </div>
        </div>

        {/* 🏷️ Store Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-12">
           <button 
             onClick={() => setStoreFilter(null)}
             className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${!storeFilter ? 'bg-white text-ds-bg border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/5 text-ds-text-dim border-white/10 hover:border-white/20'}`}
           >All Feeds</button>
           {['Shelflife', 'Jack Lemkus', 'Archive', 'Nice Kicks'].map(store => (
             <button 
               key={store}
               onClick={() => setStoreFilter(store)}
               className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${storeFilter === store ? 'bg-ds-indigo text-white border-ds-indigo shadow-[0_0_20px_rgba(129,140,248,0.3)]' : 'bg-white/5 text-ds-text-dim border-white/10 hover:border-white/20'}`}
             >{store}</button>
           ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-80 bg-white/5 animate-pulse rounded-3xl border border-white/10" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, i) => (
              <motion.a 
                key={post.id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="p-8 rounded-3xl bg-white/3 border border-white/5 group cursor-pointer transition-all hover:bg-ds-indigo/5 hover:border-ds-indigo/30 shadow-xl relative overflow-hidden"
              >
                 <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <div className="text-4xl font-black uppercase rotate-90 origin-bottom-right translate-y-12 whitespace-nowrap">{post.store}</div>
                 </div>

                 <div className="flex items-center justify-between mb-8">
                    <div className={`px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${
                      post.store === 'Nice Kicks' ? 'text-slate-400 group-hover:text-white' :
                      post.store === 'Shelflife' ? 'text-ds-orange group-hover:text-white' :
                      post.store === 'Archive' ? 'text-white' :
                      'text-ds-indigo group-hover:text-white'
                    }`}>{post.store}</div>
                    <span className="text-[10px] text-ds-text-dim font-black uppercase tracking-widest" suppressHydrationWarning>
                      {post.detected_at?.seconds ? new Date(post.detected_at.seconds * 1000).toLocaleDateString([], { month: 'short', day: '2-digit' }) : 'MAR 26'}
                    </span>
                 </div>

                 <h3 className="text-xl font-black uppercase tracking-widest leading-tight mb-4 group-hover:text-ds-indigo transition-colors">
                    {post.title}
                 </h3>

                 <p className="text-xs text-ds-text-dim leading-relaxed mb-8 line-clamp-3 italic opacity-80 group-hover:opacity-100 transition-opacity">
                    {post.excerpt || "Bot intelligence detected an exclusive new editorial regarding regional restocks and release information."}
                 </p>

                 <div className="mt-auto flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest group-hover:text-ds-indigo transition-colors">
                    Deep Intelligence <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                 </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
