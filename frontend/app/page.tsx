'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap, Target, Activity, Shield, Box, ChevronRight, ArrowRight, Star, ExternalLink, Globe, TrendingUp, Bell, Database, Monitor, Search, DollarSign } from 'lucide-react'
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
              Unified <br /> <span className="text-ds-indigo">Intelligence.</span>
            </h2>
            <div className="space-y-6">
              <div className="group relative p-8 bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-ds-red/30 transition-all duration-500 shadow-2xl">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-ds-red/5 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-ds-red/10 transition-colors" />
                 <h4 className="text-ds-red font-black uppercase text-[10px] tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="w-4 h-px bg-ds-red/50" />
                    The_Problem
                 </h4>
                 <p className="text-gray-300 text-base leading-relaxed font-medium">
                    Resellers buy out stock before you have half a chance. Manually checking websites is <span className="text-white italic">exhausting</span>, and often results in missing your size entirely.
                 </p>
              </div>

              <div className="group relative p-8 bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-ds-green/30 transition-all duration-500 shadow-2xl">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-ds-green/5 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-ds-green/10 transition-colors" />
                 
                 <h4 className="text-ds-green font-black uppercase text-[10px] tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="w-8 h-px bg-ds-green/50" />
                    The_Solution
                    <div className="w-1.5 h-1.5 rounded-full bg-ds-green shadow-[0_0_10px_rgba(0,200,83,0.5)] animate-pulse" />
                 </h4>
                 <p className="text-gray-300 text-base leading-relaxed font-medium">
                    Automate the hunt. <span className="text-white">SoleSeek</span> provides a unified terminal tracking exclusive inventory 24/7. Secure your pair <span className="text-ds-green font-bold italic">with zero-latency</span> market intelligence.
                 </p>
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
              <h4 className="text-xl font-black uppercase mb-2 tracking-widest text-ds-indigo">Pro_Seeker</h4>
              <div className="flex items-baseline gap-2 mb-10">
                <span className="text-6xl font-black tracking-tight text-white">$12</span>
                <span className="text-gray-500 text-sm font-black uppercase tracking-[0.3em]">/ Month</span>
              </div>
              <ul className="space-y-4 mb-12 text-left">
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-ds-indigo">
                  <DollarSign className="w-4 h-4" /> 
                  Standard Features Plus:
                </li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-ds-indigo">
                  <Target className="w-4 h-4" /> 
                  1000 Watchlist Slots
                </li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-300 group-hover:text-white transition-colors">
                  <Bell className="w-4 h-4 text-ds-indigo" /> 
                  WhatsApp, SMS, Email, Discord, Telegram Alerts
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
             <div className="order-1 md:order-2 bg-ds-surface border border-white/5 rounded-3xl relative overflow-hidden group shadow-2xl">
                <div className="absolute inset-0 bg-linear-to-t from-ds-bg via-transparent to-transparent opacity-60 pointer-events-none z-10" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-8 relative z-0">
                   {[
                      { name: 'Shelflife', color: 'bg-ds-orange' },
                      { name: 'Jack Lemkus', color: 'bg-yellow-500' },
                      { name: 'Archive', color: 'bg-white' },
                      { name: 'Soul Gallery', color: 'bg-indigo-600' },
                      { name: 'The Plug and Play', color: 'bg-teal-500' },
                      { name: 'Court Order', color: 'bg-slate-400' },
                      { name: 'Cape Union Mart', color: 'bg-purple-500' }
                   ].map((store) => (
                      <div key={store.name} className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl group hover:border-white/30 transition-all">
                         <div className={`w-1.5 h-1.5 rounded-full ${store.color} shadow-[0_0_8px_rgba(255,255,255,0.2)] animate-pulse`} />
                         <span className="text-[9px] font-black uppercase tracking-widest text-ds-text-dim group-hover:text-white transition-colors">{store.name}</span>
                         <div className="ml-auto px-1.5 py-0.5 rounded bg-ds-blue/10 border border-ds-blue/20 text-[7px] text-ds-blue font-black uppercase tracking-tighter">
                            LIVE
                         </div>
                      </div>
                   ))}
                   <div className="flex items-center gap-3 bg-ds-blue/5 border border-ds-blue/20 p-4 rounded-2xl border-dashed">
                      <div className="w-1.5 h-1.5 rounded-full bg-ds-blue/30 animate-ping" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-ds-blue/50">Next Store Syncing...</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

  

      {/* 🚀 CTA Section */}
      <section className="py-32 px-12 border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-ds-blue/20 blur-[120px] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-8 leading-tight">Ready to <span className="text-ds-blue italic">Level Up?</span></h2>
          <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto font-medium">Gain the professional edge and dominate the SA market with elite monitoring.</p>
          <Link href="/seek" className="inline-flex h-16 px-12 bg-white text-ds-bg rounded-2xl items-center font-black uppercase text-xs tracking-widest hover:bg-ds-blue hover:text-white transition-all active:scale-95 shadow-2xl">
            Join the Resistance <ArrowRight className="w-4 h-4 ml-3" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
