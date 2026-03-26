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
  const softwareBlogs = [
    { id: 'v17', title: "Node v1.7: Multi-Cloud Sync Protocol Active", category: 'SYSTEM UPDATE', date: 'March 25, 2026', url: '/blog' },
    { id: 'opt', title: "How to Optimize Your Monitoring for High-Heat Drops", category: 'STRATEGY', date: 'March 24, 2026', url: '/blog' },
    { id: 'arch', title: "The Architecture of SoleSeek: Deep Scrape Explained", category: 'ENGINEERING', date: 'March 23, 2026', url: '/blog' }
  ]

  return (
    <div className="bg-ds-bg text-white overflow-x-hidden selection:bg-ds-blue/30">
      
      {/* 🚀 Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-ds-indigo/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-ds-cyan/10 rounded-full blur-[150px] animate-pulse pointer-events-none delay-1000" />
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-5xl z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-10 backdrop-blur-xl shadow-2xl">
            <Zap className="w-4 h-4 text-ds-blue fill-ds-blue animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-ds-blue">Node_v1.7: Cloud Sync Protocol Active</span>
          </div>
          
          <h1 className="text-7xl md:text-[140px] font-black uppercase tracking-tight leading-[0.8] mb-10 select-none">
            Snipe the <br /> 
            <span className="bg-linear-to-b from-white to-white/40 bg-clip-text text-transparent italic">Stock.</span>
          </h1>
          
          <p className="text-gray-400 text-xl font-medium mb-16 max-w-2xl mx-auto leading-relaxed opacity-80">
            The South African sneaker market, decoded. <br /> Real-time monitoring across boutiques with zero-latency.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link href="/seek" className="group relative h-16 px-12 bg-ds-bg border border-white/20 text-white rounded-2xl flex items-center justify-center font-black uppercase text-xs tracking-widest transition-all hover:bg-white hover:text-ds-bg active:scale-95 overflow-hidden">
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
              Enter Full Terminal
              <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="h-16 px-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all backdrop-blur-md group">
              Watch The Demo
              <ExternalLink className="w-4 h-4 ml-3 opacity-30 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </motion.div>

        {/* Floating Device Blur Wrapper */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[300px] bg-linear-to-t from-ds-bg via-ds-bg/80 to-transparent z-20 pointer-events-none" />
      </section>

      {/* 📊 Value Proposition */}
      <section className="py-32 px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
          <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 30 }} viewport={{ once: true }}>
            <div className="w-14 h-14 rounded-2xl bg-ds-blue-deep flex items-center justify-center text-ds-blue mb-8 shadow-[0_0_25px_rgba(96,165,250,0.2)] border border-ds-blue/30">
              <Target className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight mb-4 text-white">Restock Alerts</h3>
            <p className="text-gray-400 leading-relaxed font-medium">
              Set alerts for Restocks, New Arrivals & Sales. Our server checks stores every 2 minutes.
            </p>
          </motion.div>

          <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 30 }} transition={{ delay: 0.1 }} viewport={{ once: true }}>
            <div className="w-14 h-14 rounded-2xl bg-ds-indigo-deep flex items-center justify-center text-ds-indigo mb-8 shadow-[0_0_25px_rgba(129,140,248,0.2)] border border-ds-indigo/30">
              <Activity className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight mb-4 text-white">Real-Time Sync</h3>
            <p className="text-gray-400 leading-relaxed font-medium">
              Real-time Firestore synchronization ensures you get restock alerts within seconds of inventory changes. No page refreshes. Ever.
            </p>
          </motion.div>

          <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 30 }} transition={{ delay: 0.2 }} viewport={{ once: true }}>
            <div className="w-14 h-14 rounded-2xl bg-ds-cyan-deep flex items-center justify-center text-ds-cyan mb-8 shadow-[0_0_25px_rgba(34,211,238,0.2)] border border-ds-cyan/30">
              <Star className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight mb-4 text-white">Heat Seeker</h3>
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
            <span className="text-ds-blue font-black uppercase tracking-widest text-xs mb-4 block">The Challenge</span>
            <h2 className="text-5xl font-black italic uppercase leading-tight mb-8 tracking-tight">
              Bigger than a <br /> <span className="text-ds-indigo">Losing Game.</span>
            </h2>
            <div className="space-y-6">
              <div className="p-6 bg-ds-red-deep border border-ds-red-border/80 rounded-2xl shadow-[0_0_80px_rgba(239,68,68,0.08)]">
                 <h4 className="text-white font-black uppercase text-xs mb-2">The Problem:</h4>
                 <p className="text-gray-400 text-sm leading-relaxed">Resellers buy out stock before you have half a chance. Manually checking a variety of websites is time consuming, exhausting, and often results in missing your size entirely.</p>
              </div>

              <div className="relative p-6 bg-ds-blue-deep border border-ds-blue-border/80 rounded-2xl shadow-[0_0_80px_rgba(0,200,83,0.15)] overflow-hidden group">
                 {/* Seeping green glow behind */}
                 <div className="absolute -inset-10 bg-ds-green/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                 
                 <h4 className="relative text-white font-black uppercase text-xs mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-ds-green shadow-[0_0_5px_rgba(0,200,83,0.5)] animate-pulse" />
                    The Solution:
                 </h4>
                 <p className="relative text-gray-400 text-sm leading-relaxed">Save time and automate the hunt. SoleSeek levels the playing field by providing a unified terminal that tracks exclusive inventory 24/7. Secure your pair before they even start their bots.</p>
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
      <section className="py-20 px-8 bg-ds-bg relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-ds-indigo/5 blur-[150px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto text-center mb-24 relative z-10">
          <span className="text-ds-indigo font-black uppercase tracking-[0.3em] text-[10px] mb-6 block">Premium Access</span>
          <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tight mb-8">Choose Your <span className="text-white">Node</span></h2>
          <p className="text-gray-400 max-w-xl mx-auto font-medium">Professional grade intelligence, priced for serious seekers. Secure your edge today.</p>
        </div>
        
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
          <motion.div className="p-1 rounded-3xl bg-linear-to-b from-white/10 to-transparent">
            <div className="p-12 rounded-[inherit] bg-ds-surface flex flex-col h-full border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] group-hover:bg-white/10 transition-colors" />
              <h4 className="text-xl font-black uppercase mb-2 tracking-widest text-ds-text-dim">Standard_Unit</h4>
              <div className="flex items-baseline gap-2 mb-10">
                <span className="text-6xl font-black tracking-tight text-white">$5</span>
                <span className="text-gray-500 text-sm font-black uppercase tracking-[0.3em]">/ Month</span>
              </div>
              <ul className="space-y-4 mb-12 text-left">
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400 group-hover:text-white transition-colors"><Zap className="w-4 h-4 text-ds-blue" /> Real-time Terminal</li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400 group-hover:text-white transition-colors"><Star className="w-4 h-4 text-ds-blue" /> Top Boutique Scans</li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400 group-hover:text-white transition-colors"><Target className="w-4 h-4 text-ds-blue" /> 3 Watchlist Slots</li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400 group-hover:text-white transition-colors"><Bell className="w-4 h-4 text-ds-blue" /> WhatsApp Alerts</li>
              </ul>
              <div className="mt-auto space-y-4">
                 <PayPalSubscription planId="P-7M729221S6983803SMCGZ37Q" tier="Standard" />
                 <p className="text-[9px] text-center font-black uppercase text-ds-text-dim tracking-tighter opacity-70 italic">Verified via SSL Protocol</p>
              </div>
            </div>
          </motion.div>

          <motion.div className="p-1 rounded-3xl bg-linear-to-b from-ds-indigo to-transparent relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-ds-indigo text-ds-bg rounded-md font-black uppercase text-[10px] tracking-widest shadow-2xl z-20">Most_Demanded</div>
            <div className="p-12 rounded-[inherit] bg-[#1a1c22] flex flex-col h-full border border-ds-indigo/20 backdrop-blur-3xl shadow-[0_0_80px_rgba(129,140,248,0.15)] group relative overflow-hidden">
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-ds-indigo/10 blur-[100px] pointer-events-none" />
              <h4 className="text-xl font-black uppercase mb-2 tracking-widest text-ds-indigo">Pro_Interface</h4>
              <div className="flex items-baseline gap-2 mb-10">
                <span className="text-6xl font-black tracking-tight text-white">$12</span>
                <span className="text-gray-500 text-sm font-black uppercase tracking-[0.3em]">/ Month</span>
              </div>
              <ul className="space-y-4 mb-12 text-left">
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-ds-indigo">
                  <Target className="w-4 h-4" /> 
                  1000 Watchlist Slots
                </li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-300 group-hover:text-white transition-colors">
                  <Bell className="w-4 h-4 text-ds-indigo" /> 
                  WhatsApp, SMS, Email, Discord, Telegram Alerts
                </li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-300 group-hover:text-white transition-colors">
                  <Globe className="w-4 h-4 text-ds-indigo" /> 
                  Multi-Region Node Access
                </li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-300 group-hover:text-white transition-colors">
                  <TrendingUp className="w-4 h-4 text-ds-indigo" /> 
                  Advanced Price Analytics
                </li>
              </ul>
              <div className="mt-auto space-y-4">
                 <PayPalSubscription planId="P-2UF78487X1571584RMCGZ4EQ" tier="Pro" />
                 <p className="text-[9px] text-center font-black uppercase text-ds-indigo tracking-tighter opacity-70">Elevate to professional monitoring</p>
              </div>
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
                   <Monitor className="w-5 h-5 text-ds-blue" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-ds-text-dim">Global Live Terminal</span>
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tight mb-6 underline decoration-ds-blue/30 underline-offset-8 leading-tight">Unified <br /> Multi-Store Monitoring</h2>
                <p className="text-gray-400 text-lg leading-relaxed font-medium">
                   Stop tab-switching. SoleSeek aggregates live inventory from Shelflife, Jack Lemkus, Archive, and others into a single, high-frequency stream. Map colors, sizes, and price drops across the entire market in one unified interface.
                </p>
             </div>
             <div className="order-1 md:order-2 aspect-video bg-ds-surface border border-white/5 rounded-3xl relative overflow-hidden group shadow-2xl">
                <div className="absolute inset-x-6 inset-y-6 bg-ds-bg rounded-2xl border border-white/5 p-8 flex flex-col gap-4">
                   <div className="flex justify-between items-center mb-4">
                      <div className="h-4 w-1/3 bg-ds-blue-deep rounded animate-pulse" />
                      <div className="h-4 w-12 bg-ds-green/20 rounded" />
                   </div>
                   <div className="space-y-4">
                      <div className="h-2 w-full bg-white/5 rounded" />
                      <div className="h-2 w-4/5 bg-white/5 rounded" />
                      <div className="h-2 w-full bg-linear-to-r from-ds-blue/20 to-transparent rounded" />
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
            <h2 className="text-5xl font-black uppercase tracking-widest text-white">The <span className="text-ds-indigo">Insights</span></h2>
          </div>
          <Link href="/blog" className="text-sm font-black uppercase tracking-widest text-ds-indigo hover:text-white transition-colors flex items-center">View All Articles <ChevronRight className="w-4 h-4" /></Link>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {softwareBlogs.map((post: any, i: number) => (
            <motion.a 
               key={post.id} 
               href={post.url}
               whileHover={{ y: -6 }} 
               className="group cursor-pointer block p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors relative"
            >
               <div className="aspect-[16/10] bg-white/5 border border-white/10 rounded-xl mb-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-linear-to-t from-black to-transparent opacity-40" />
                  <div className="absolute inset-x-0 bottom-0 p-5 bg-linear-to-t from-black/80 to-transparent">
                     <span className="text-ds-blue font-black uppercase text-[8px] tracking-[0.3em]">{post.category}</span>
                  </div>
               </div>
               
               <span className="text-[10px] text-ds-indigo/60 font-black uppercase tracking-widest mb-3 block">
                 SoleSeek HQ | {post.date}
               </span>
               <h3 className="text-xl font-black uppercase mb-4 text-white group-hover:text-ds-indigo transition-colors leading-snug">
                 {post.title}
               </h3>
               
               <div className="flex items-center gap-2 text-[10px] font-black text-ds-text-dim uppercase tracking-widest group-hover:text-white transition-colors">
                  READ_INTEL 
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform text-ds-indigo" />
               </div>

               {/* Animated subtle line */}
               <div className="absolute bottom-0 left-6 right-6 h-px bg-ds-indigo/30 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            </motion.a>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
