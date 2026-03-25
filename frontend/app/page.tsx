'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap, Target, Activity, Shield, Box, ChevronRight, ArrowRight, Star, ExternalLink, Globe, TrendingUp, Bell, Database, Monitor, Search } from 'lucide-react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { db } from '@/lib/firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import PayPalSubscription from '@/components/PayPalSubscription'
import { useAuth } from '@/lib/AuthContext'

export default function LandingPage() {
  const { user } = useAuth()
  const [liveBlogs, setLiveBlogs] = useState<any[]>([])
  
  useEffect(() => {
    const q = query(collection(db, "store_blogs"), orderBy("detected_at", "desc"), limit(3))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLiveBlogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[])
    }, (error) => {
      console.error("Firestore error in landing blog listener:", error)
    })
    return () => unsubscribe()
  }, [])

  return (
    <div className="bg-ds-bg text-white overflow-x-hidden selection:bg-ds-blue/30">
      
      {/* 🚀 Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-ds-blue-border/20 rounded-full blur-[120px] -z-10" />
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Beta 1.6: Timberland Edition Now Active</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-8">
            Wired for <span className="text-ds-indigo italic">Winners</span>. <br />
            Scraped for <span className="bg-linear-to-r from-cyan-400 via-white to-blue-500 bg-clip-text text-transparent">Seekers.</span>
          </h1>
          
          <p className="text-gray-400 text-lg md:text-xl font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
            The definitive sneaker monitoring terminal. High-precision extraction across South Africa's most exclusive boutiques. Zero latency. 100% Accuracy.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/seek" className="group h-14 px-10 bg-ds-indigo text-ds-bg rounded-full flex items-center justify-center font-black uppercase text-sm hover:bg-white transition-all shadow-[0_0_40px_rgba(129,140,248,0.4)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] active:scale-95">
              Enter The Terminal
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="h-14 px-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center font-black uppercase text-sm hover:bg-white/10 transition-all backdrop-blur-md">
              Watch The Demo
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="absolute bottom-0 w-full max-w-5xl h-64 bg-linear-to-t from-ds-bg via-ds-bg/50 to-transparent z-10"
        />
      </section>

      {/* 📊 Value Proposition */}
      <section className="py-32 px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
          <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 30 }} viewport={{ once: true }}>
            <div className="w-14 h-14 rounded-2xl bg-ds-cyan-deep flex items-center justify-center text-cyan-400 mb-8 shadow-[0_0_25px_rgba(34,211,238,0.2)] border border-cyan-400/30">
              <Target className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 text-ds-cyan">Quick Alerts</h3>
            <p className="text-gray-400 leading-relaxed font-medium">
              Set alerts for Restocks, New Arrivals & Sales. Our server checks stores every 2 minutes.
            </p>
          </motion.div>

          <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 30 }} transition={{ delay: 0.1 }} viewport={{ once: true }}>
            <div className="w-14 h-14 rounded-2xl bg-ds-indigo-deep flex items-center justify-center text-ds-indigo mb-8 shadow-[0_0_25px_rgba(129,140,248,0.2)] border border-ds-indigo/30">
              <Activity className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 text-ds-indigo">Zero-Lapse Velocity</h3>
            <p className="text-gray-400 leading-relaxed font-medium">
              Real-time Firestore synchronization ensures you get restock alerts within seconds of inventory changes. No page refreshes. Ever.
            </p>
          </motion.div>

          <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 30 }} transition={{ delay: 0.2 }} viewport={{ once: true }}>
            <div className="w-14 h-14 rounded-2xl bg-ds-orange-deep flex items-center justify-center text-ds-orange mb-8 shadow-[0_0_25px_rgba(251,146,60,0.2)] border border-ds-orange/30">
              <Shield className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 text-ds-orange">Heat Seeker</h3>
            <p className="text-gray-400 leading-relaxed font-medium">
              Quickly find difficult to attain shoes across all major retailers in real-time.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 👟 About Section */}
      <section className="py-32 bg-white/[0.01] border-t border-white/5 px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <motion.div whileInView={{ opacity: 1, x: 0 }} initial={{ opacity: 0, x: -50 }} viewport={{ once: true }}>
            <span className="text-ds-indigo font-black uppercase tracking-widest text-xs mb-4 block underline decoration-ds-indigo/30 underline-offset-4">The Challenge</span>
            <h2 className="text-5xl font-black italic uppercase leading-tight mb-8 tracking-tighter">
              Bigger than a <br /> <span className="text-ds-indigo">Losing Game.</span>
            </h2>
            <div className="space-y-6">
              <div className="p-6 bg-ds-red-deep/20 border border-ds-red-border/30 rounded-2xl">
                 <h4 className="text-ds-red font-black uppercase text-xs mb-2">The Problem:</h4>
                 <p className="text-gray-400 text-sm leading-relaxed">Resellers buy out stock before you have half a chance. Manually checking a variety of websites is time consuming, exhausting, and often results in missing your size entirely.</p>
              </div>

              <div className="p-6 bg-ds-blue-deep/20 border border-ds-blue-border/30 rounded-2xl">
                 <h4 className="text-ds-blue font-black uppercase text-xs mb-2">The Solution:</h4>
                 <p className="text-gray-400 text-sm leading-relaxed">Save time and automate the hunt. SoleNode levels the playing field by providing a unified terminal that tracks exclusive inventory 24/7. Secure your pair before they even start their bots.</p>
              </div>
            </div>
          </motion.div>
          <motion.div 
            whileInView={{ opacity: 1, x: 0 }} 
            initial={{ opacity: 0, x: 50 }} 
            viewport={{ once: true }}
            className="h-[400px] bg-linear-to-br from-ds-indigo-deep to-ds-bg rounded-3xl border border-white/10 relative shadow-2xl overflow-hidden"
          >
            <div className="absolute inset-x-8 inset-y-8 border border-white/5 rounded-2xl flex items-center justify-center">
               <Box className="w-32 h-32 text-white/5 animate-pulse" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* 💎 Pricing Section */}
      <section className="py-32 px-8 bg-ds-bg">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <span className="text-ds-indigo font-black uppercase tracking-widest text-xs mb-4 block">Memberships</span>
          <h2 className="text-5xl font-black uppercase tracking-tighter mb-6">Choose Your <span className="text-ds-indigo">Tier</span></h2>
        </div>
        
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div whileHover={{ y: -5, scale: 1.01 }} className="p-10 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group flex flex-col h-full">
            <h4 className="text-xl font-black uppercase mb-2">Standard</h4>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-4xl font-black">$5</span>
              <span className="text-gray-500 text-sm font-bold uppercase tracking-widest">/ Mo</span>
            </div>
            <ul className="space-y-4 mb-10 text-left">
              <li className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-white transition-colors duration-300"><Zap className="w-4 h-4 text-cyan-400" /> Real-time Dashboard</li>
              <li className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-white transition-colors duration-300"><Zap className="w-4 h-4 text-cyan-400" /> Top 4 Boutiques</li>
              <li className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-white transition-colors duration-300"><Target className="w-4 h-4 text-cyan-400" /> Up to 3 Alerts</li>
              <li className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-white transition-colors duration-300"><Zap className="w-4 h-4 text-cyan-400" /> Basic Filter Suite</li>
            </ul>
            <div className="mt-auto">
               <PayPalSubscription planId="P-7M729221S6983803SMCGZ37Q" tier="Standard" />
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -5, scale: 1.01 }} className="p-10 rounded-3xl bg-linear-to-br from-ds-indigo-deep to-ds-bg border border-ds-indigo/40 relative overflow-hidden group flex flex-col h-full">
            <div className="absolute top-0 right-0 p-4 bg-ds-indigo text-ds-bg rounded-bl-2xl font-black uppercase text-[10px] tracking-widest">Recommended</div>
            <h4 className="text-xl font-black uppercase mb-2">Pro</h4>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-4xl font-black">$12</span>
              <span className="text-gray-500 text-sm font-bold uppercase tracking-widest">/ Mo</span>
            </div>
            <ul className="space-y-4 mb-10 text-left">
              <li className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-white transition-colors duration-300">
                <Target className="w-4 h-4 text-white" /> 
                <span>Up to 1000 Alerts</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-white transition-colors duration-300">
                <Zap className="w-4 h-4 text-white" /> 
                <span className="leading-tight">Push Notifications: <br className="md:hidden" /> <span className="text-white font-black">[Discord]</span></span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-white transition-colors duration-300">
                <Globe className="w-4 h-4 text-white" /> 
                <span>Exclusive Regional Node Access</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-white transition-colors duration-300">
                <TrendingUp className="w-4 h-4 text-white" /> 
                <span>Archived Price History & Analytics</span>
              </li>
            </ul>
            <div className="mt-auto">
               <PayPalSubscription planId="P-2UF78487X1571584RMCGZ4EQ" tier="Pro" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* 🛠️ Detailed Features Section */}
      <section className="py-32 px-12 border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto flex flex-col gap-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
             <div className="order-2 md:order-1 text-left">
                <div className="flex items-center gap-3 mb-6 justify-start">
                   <Monitor className="w-5 h-5 text-cyan-400" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Live Terminal</span>
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-6 underline decoration-cyan-400/30 underline-offset-8">Unified Multi-Store Monitoring</h2>
                <p className="text-gray-400 text-lg leading-relaxed">
                   Stop tab-switching. SoleNode aggregates live inventory from Shelflife, Jack Lemkus, Archive, and others into a single, high-frequency stream. Map colors, sizes, and price drops across the entire market in one unified interface.
                </p>
             </div>
             <div className="order-1 md:order-2 aspect-video bg-white/5 border border-white/10 rounded-3xl relative overflow-hidden group shadow-2xl">
                <div className="absolute inset-x-6 inset-y-6 bg-ds-bg rounded-2xl border border-white/5 p-8 flex flex-col gap-4">
                   <div className="flex justify-between items-center mb-4">
                      <div className="h-4 w-1/3 bg-ds-cyan-deep rounded" />
                      <div className="h-4 w-12 bg-ds-green/20 rounded" />
                   </div>
                   <div className="space-y-4">
                      <div className="h-2 w-full bg-white/5 rounded" />
                      <div className="h-2 w-4/5 bg-white/5 rounded" />
                      <div className="h-2 w-full bg-white/5 rounded-full bg-linear-to-r from-cyan-400/20 to-transparent" />
                   </div>
                </div>
                <div className="absolute inset-0 bg-linear-to-t from-ds-bg via-transparent to-transparent opacity-60" />
             </div>
          </div>
        </div>
      </section>

      {/* 📚 Blog Section */}
      <section className="py-32 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end mb-16 gap-8 text-left md:text-left">
          <div>
            <span className="text-ds-indigo/60 font-black uppercase tracking-widest text-xs mb-4 block">Intelligence Reports</span>
            <h2 className="text-5xl font-black uppercase tracking-tighter text-white">The <span className="text-ds-indigo">Insights</span></h2>
          </div>
          <Link href="/blog" className="text-sm font-black uppercase tracking-widest text-ds-indigo hover:text-white transition-colors flex items-center">View All Articles <ChevronRight className="w-4 h-4" /></Link>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {(liveBlogs.length > 0 ? liveBlogs : [1, 2, 3]).map((post: any, i: number) => (
            <motion.a 
               key={post.id || i} 
               href={post.url || '/blog'}
               target="_blank"
               rel="noopener noreferrer"
               whileHover={{ y: -5, scale: 1.01 }} 
               className="group cursor-pointer"
            >
               <div className="aspect-[16/10] bg-white/5 border border-white/10 rounded-2xl mb-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-linear-to-t from-ds-bg to-transparent opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center bg-ds-indigo-deep/20 group-hover:bg-ds-indigo/5 transition-colors">
                     <span className="text-ds-indigo font-black uppercase text-[10px] tracking-widest opacity-20 group-hover:opacity-100 transition-opacity">{post.store || 'REPORT'}</span>
                  </div>
               </div>
               <span className="text-[10px] text-ds-indigo/60 font-black uppercase tracking-widest mb-3 block">
                 {post.store || 'Intelligence'} | {post.detected_at ? new Date(post.detected_at.seconds * 1000).toLocaleDateString() : 'March 25, 2026'}
               </span>
               <h3 className="text-xl font-black uppercase mb-4 group-hover:text-ds-indigo transition-colors leading-snug">
                 {post.title || (i === 1 ? "Decoding Vtex Catalog API Scrapers" : i === 2 ? "How Amazon is Fighting Botters in 2026" : "Jordan 4 Restock: Best Scraper Strategies")}
               </h3>
               <div className="flex items-center gap-2 text-[10px] font-black text-ds-text-dim uppercase tracking-widest group-hover:text-white transition-colors">
                  View Full Report <ChevronRight className="w-3 h-3" />
               </div>
            </motion.a>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
