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
  detected_at: any
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "store_blogs"), orderBy("detected_at", "desc"), limit(20))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BlogPost[])
      setLoading(false)
    }, (error) => {
      console.error("Firestore error in blog listener:", error)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  return (
    <div className="bg-ds-bg text-white min-h-screen pt-24 px-8 selection:bg-ds-blue/30">
      <div className="max-w-7xl mx-auto py-20 text-center md:text-left">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
          <div>
            <span className="text-ds-indigo/60 font-black uppercase tracking-widest text-xs mb-4 block">SoleNode Intelligence</span>
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-4 text-white">
              The <span className="text-ds-indigo">Intelligence</span> Reports.
            </h1>
            <p className="text-ds-text-dim text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
              Analytical deep dives directly from our monitored stores across the globe.
            </p>
          </div>
          
          <div className="hidden lg:flex items-center gap-6 px-10 py-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
            <div className="text-right">
               <p className="text-[10px] font-black uppercase text-ds-text-dim tracking-widest mb-1">Total Intelligence</p>
               <p className="text-3xl font-black text-ds-indigo">{posts.length}</p>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-right">
               <p className="text-[10px] font-black uppercase text-ds-text-dim tracking-widest mb-1">Global Nodes</p>
               <p className="text-3xl font-black text-white">Active</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3].map(i => (
              <div key={i} className="h-64 bg-white/5 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, i) => (
              <motion.a 
                key={post.id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -5, scale: 1.01 }}
                className="p-8 rounded-3xl bg-white/5 border border-white/10 group cursor-pointer transition-all hover:bg-white/10 hover:border-ds-indigo/30"
              >
                 <div className="flex items-center justify-between mb-8">
                    <div className="px-3 py-1 bg-ds-indigo-deep/20 border border-ds-indigo-border/30 rounded-full text-[10px] font-black text-ds-indigo uppercase tracking-widest">{post.store}</div>
                    <span className="text-[10px] text-ds-text-dim font-bold uppercase tracking-widest" suppressHydrationWarning>
                      {post.detected_at?.seconds ? new Date(post.detected_at.seconds * 1000).toLocaleDateString() : 'New'}
                    </span>
                 </div>
                 <h3 className="text-xl font-black uppercase tracking-tighter leading-snug mb-8 group-hover:text-ds-indigo transition-colors flex items-start justify-between gap-4">
                    {post.title}
                    <ExternalLink className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-all -translate-y-1 group-hover:translate-y-0" />
                 </h3>
                 <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest group-hover:text-ds-indigo transition-colors">
                    View Original Report <ChevronRight className="w-3.5 h-3.5" />
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
