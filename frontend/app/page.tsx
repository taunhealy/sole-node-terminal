'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap, Target, Activity, Shield, ChevronRight, ArrowRight, Star, ExternalLink, Globe, TrendingUp, Bell, Database, Monitor, Search, DollarSign, MapPin } from 'lucide-react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { db } from '@/lib/firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import PayPalSubscription from '@/components/PayPalSubscription'
import { useAuth } from '@/lib/AuthContext'

export default function LandingPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'standard' | 'pro'>('standard')
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
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-ds-indigo/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-ds-cyan/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-5xl z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-10 backdrop-blur-xl shadow-2xl">
            <Zap className="w-4 h-4 text-ds-blue fill-ds-blue animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-ds-blue">Node_v1.8: Cloud Sync Protocol Active</span>
          </div>
          
          <h1 className="text-7xl md:text-[140px] font-black uppercase tracking-tight leading-[0.8] mb-10 select-none">
            Snipe the <br /> 
            <span className="bg-linear-to-b from-white to-white/40 bg-clip-text text-transparent italic">Stock.</span>
          </h1>
          
          <p className="text-gray-400 text-xl font-medium mb-16 max-w-2xl mx-auto leading-relaxed opacity-80">
            The South African sneaker market, decoded. <br /> Real-time monitoring across boutiques with zero-latency.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link href="/seek" className="group relative h-16 px-12 bg-ds-bg border border-white/20 text-white rounded-2xl flex items-center justify-center font-black uppercase text-xs tracking-widest transition-all hover:bg-gray-900 hover:text-white active:scale-95 overflow-hidden">
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
              Enter The Terminal
              <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
            </Link>
            
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
            <h3 className="text-2xl font-black uppercase tracking-tight mb-4 text-white">Stock Alerts</h3>
            <p className="text-gray-400 leading-relaxed font-medium">
              Set alerts for new Arrivals, Restocks & Sales.
            </p>
          </motion.div>

          <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 30 }} transition={{ delay: 0.1 }} viewport={{ once: true }}>
            <div className="w-14 h-14 rounded-2xl bg-ds-indigo-deep flex items-center justify-center text-ds-indigo mb-8 shadow-[0_0_25px_rgba(129,140,248,0.2)] border border-ds-indigo/30">
              <Activity className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight mb-4 text-white">Real-Time Sync</h3>
            <p className="text-gray-400 leading-relaxed font-medium">
              Real-time synchronization ensures you get stock alerts within seconds of inventory changes.
            </p>
          </motion.div>

          <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 30 }} transition={{ delay: 0.2 }} viewport={{ once: true }}>
            <div className="w-14 h-14 rounded-2xl bg-ds-cyan-deep flex items-center justify-center text-ds-cyan mb-8 shadow-[0_0_25px_rgba(34,211,238,0.2)] border border-ds-cyan/30">
              <Star className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight mb-4 text-white">Heat Seeker</h3>
            <p className="text-gray-400 leading-relaxed font-medium">
              Quickly find difficult to attain shoes across South African boutique retailers (in real-time).
            </p>
          </motion.div>
        </div>
      </section>

      {/* 🧬 Technical Edge: Direct-to-Cart */}
   
      {/*  PRO_FEATURES: Unified Power */}
      <section id="desktop" className="py-32 px-12 border-t border-white/5 bg-ds-bg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-linear-to-r from-ds-blue/2 to-transparent opacity-20 pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-20 items-center">
           <motion.div 
             initial={{ opacity: 0, x: -50 }} 
             whileInView={{ opacity: 1, x: 0 }} 
             viewport={{ once: true }}
             className="flex-1"
           >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/10 mb-6 font-mono text-[9px] text-ds-blue uppercase tracking-widest">
                 System_Module: Desktop_Engine_v1.8
              </div>
              <h2 className="text-5xl font-black italic uppercase leading-tight mb-8 tracking-tight">
                Unified <br /> <span className="text-white">Power.</span>
              </h2>
              <p className="text-gray-300 text-base leading-relaxed font-medium mb-10">
                The **SoleSeek Sniper Hub** is our dedicated desktop application designed for Pro users who need sub-second monitoring and flawless execution. By running locally, you bypass common data-center bans and gain direct control over your hardware.
              </p>
              
              <div className="space-y-6">
                 {[
                    { icon: Monitor, title: 'Multi-Node Deployment', desc: 'Local nodes run across different machines or servers for scale and fast stock monitoring.' },
                    { icon: Globe, title: 'Rotating Hive Proxies', desc: 'Pro users gain access to our secure residential proxy pool for advanced IP rotation.' },
                    { icon: Activity, title: '3-Tier Speed Control', desc: 'Choose between Idle (1hr), Anticipation (60s), and Sniper (0.5s) polling modes.' },
                    { icon: Shield, title: 'Stealth Browser Engine', desc: 'Built-in undetected-driver technology to survive invasive bot-detection security.' }
                 ].map((feat, idx) => (
                    <div key={idx} className="flex gap-6 group p-4 rounded-2xl hover:bg-white/5 transition-all">
                       <div className="shrink-0 w-12 h-12 rounded-xl bg-ds-blue/10 border border-ds-blue/30 flex items-center justify-center text-ds-blue group-hover:scale-110 transition-transform">
                          <feat.icon className="w-5 h-5" />
                       </div>
                       <div>
                          <h4 className="text-sm font-black uppercase text-white mb-1 tracking-wider">{feat.title}</h4>
                          <p className="text-[11px] text-gray-500 font-medium leading-relaxed max-w-sm">{feat.desc}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </motion.div>

           <div className="flex-1">
              <div className="relative rounded-[40px] overflow-hidden border border-white/10 shadow-2xl group">
                 <div className="absolute inset-0 bg-ds-blue/5 mix-blend-overlay z-10 pointer-events-none" />
                 <img 
                    src="/localized_power_node.png" 
                    alt="Unified Power Node Network" 
                    className="w-full aspect-square object-cover transform scale-105 group-hover:scale-100 transition-transform duration-700"
                 />
                 <div className="absolute bottom-6 left-6 right-6 p-6 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl z-20">
                    <div className="flex items-center gap-3">
                       <Globe className="w-5 h-5 text-ds-blue animate-pulse" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-white">MULTI-NODE_V1.8: Distributed_Fleet_Active</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

    
      <section id="about" className="py-32 bg-white/1 border-t border-white/5 px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <motion.div whileInView={{ opacity: 1, x: 0 }} initial={{ opacity: 0, x: -50 }} viewport={{ once: true }}>
            <span className="text-ds-blue font-black uppercase tracking-widest text-xs mb-4 block">The Challenge</span>
            <h2 className="text-5xl font-black italic uppercase leading-tight mb-8 tracking-tight">
              Unified <br /> <span className="text-ds-indigo">Intelligence.</span>
            </h2>

            {/* 📑 Tab Switcher */}
            <div className="flex p-1.5 bg-white/5 border border-white/10 rounded-2xl mb-12 w-fit">
               <button 
                  onClick={() => setActiveTab('standard')}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'standard' ? 'bg-ds-blue text-ds-bg shadow-xl' : 'text-gray-500 hover:text-white'}`}
               >
                  Standard Mode
               </button>
               <button 
                  onClick={() => setActiveTab('pro')}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pro' ? 'bg-ds-indigo text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}
               >
                  Pro Commander
               </button>
            </div>

            <div className="space-y-6 min-h-[400px]">
               {activeTab === 'standard' ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                     <div className="group relative p-8 bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-ds-blue/30 transition-all duration-500 shadow-2xl">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-ds-blue/5 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-ds-blue/10 transition-colors" />
                        <h4 className="text-ds-blue font-black uppercase text-[10px] tracking-[0.2em] mb-4 flex items-center gap-2">
                           Standard_Access
                        </h4>
                        <p className="text-gray-300 text-base leading-relaxed font-medium">
                           Leverage our centralized monitoring engine. Access over 20+ boutiques with automated restock detection across 100 watchlist slots.
                        </p>
                     </div>
                     <div className="group relative p-8 bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-ds-blue/30 transition-all duration-500 shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-ds-blue/5 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-ds-blue/10 transition-colors" />
                        <h4 className="text-ds-blue font-black uppercase text-[10px] tracking-[0.2em] mb-4 flex items-center gap-2">
                           Collective_Hive
                        </h4>
                        <p className="text-gray-300 text-base leading-relaxed font-medium">
                           Never miss a major hit. Our cloud synced alerts ensure you're part of the hive intelligence when the biggest restocks drop.
                        </p>
                     </div>
                  </motion.div>
               ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                     <div className="group relative p-8 bg-ds-indigo/5 border border-ds-indigo/20 rounded-3xl overflow-hidden hover:border-ds-blue/40 transition-all duration-500 shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-ds-blue/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <h4 className="text-ds-blue font-black uppercase text-[10px] tracking-[0.2em] mb-4 flex items-center gap-2">
                           <Monitor className="w-3 h-3" />
                           Local_Python_Engine
                        </h4>
                        <p className="text-gray-300 text-base leading-relaxed font-medium">
                           Run the **SoleSeek Sniper Hub** directly on your machine. Bypassing cloud detection with sub-second polling frequencies for ultimate speed.
                        </p>
                     </div>
                     <div className="group relative p-8 bg-ds-indigo/5 border border-ds-indigo/20 rounded-3xl overflow-hidden hover:border-ds-blue/40 transition-all duration-500 shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-ds-blue/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <h4 className="text-ds-blue font-black uppercase text-[10px] tracking-[0.2em] mb-4 flex items-center gap-2">
                           <Zap className="w-3 h-3" />
                           Keyword_Sniping
                        </h4>
                        <p className="text-gray-300 text-base leading-relaxed font-medium">
                           Set target keywords for instant detection. Avoid 'Ghost Stock' entirely by hitting product variants directly via our low-latency DTC protocol.
                        </p>
                     </div>
                     <div className="group relative p-8 bg-ds-indigo/5 border border-ds-indigo/20 rounded-3xl overflow-hidden hover:border-ds-blue/40 transition-all duration-500 shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-ds-blue/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <h4 className="text-ds-blue font-black uppercase text-[10px] tracking-[0.2em] mb-4 flex items-center gap-2">
                           <Target className="w-3 h-3" />
                           Auto-ATC Protocol
                        </h4>
                        <p className="text-gray-300 text-base leading-relaxed font-medium">
                           Eliminate manual friction. Our system automatically promotes restocks to your cart across supported Shopify and VTEX platforms for instant checkout readiness.
                        </p>
                     </div>
                     <div className="group relative p-8 bg-ds-indigo/5 border border-ds-indigo/20 rounded-3xl overflow-hidden hover:border-ds-blue/40 transition-all duration-500 shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-ds-blue/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <h4 className="text-ds-blue font-black uppercase text-[10px] tracking-[0.2em] mb-4 flex items-center gap-2">
                           <Globe className="w-3 h-3" />
                           Rotating_Proxy_Vault
                        </h4>
                        <p className="text-gray-300 text-base leading-relaxed font-medium">
                           Never get soft-banned again. Pro users utilize our Hive Residential pool with rotating IP addresses to survive aggressive retailer bot-detection.
                        </p>
                     </div>
                  </motion.div>
               )}
            </div>
          </motion.div>
          <motion.div 
            whileInView={{ opacity: 1, x: 0 }} 
            initial={{ opacity: 0, x: 50 }} 
            viewport={{ once: true }}
            className="hidden md:flex items-center justify-center relative"
          >
            <Link 
              href="/seek" 
              target="_blank"
              className="relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(96,165,250,0.08)] group cursor-pointer block"
            >
               <img 
                 src="/seek-terminal.png" 
                 alt="SoleSeek Terminal" 
                 className="w-full h-auto rounded-3xl block group-hover:scale-[1.01] transition-transform duration-700"
               />
               <div className="absolute inset-0 bg-linear-to-t from-ds-bg via-transparent to-transparent opacity-40 pointer-events-none rounded-3xl flex items-center justify-center">
                 <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-ds-blue/20 backdrop-blur-md px-6 py-3 rounded-full border border-ds-blue/30 flex items-center gap-3">
                   <ExternalLink className="w-4 h-4 text-white" />
                   <span className="text-white text-[10px] font-black uppercase tracking-widest">Open Terminal</span>
                 </div>
               </div>
               <div className="absolute inset-0 border border-ds-blue/10 rounded-3xl pointer-events-none" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 🔮 All Features Grid (Desktop App / Pro Engine Focus) */}
      <section className="py-32 px-12 border-t border-white/5 bg-ds-bg relative">
        <div className="max-w-7xl mx-auto">
           <div className="text-center mb-24">
              <span className="text-ds-blue font-black uppercase tracking-widest text-[10px] mb-4 block">Engine_Capabilities: SoleSeek Sniper Hub</span>
              <h2 className="text-5xl font-black italic uppercase leading-tight mb-8 tracking-tight">Desktop <span className="text-white">Features.</span></h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                 { icon: Zap, title: "DTC Engine", desc: "Low-latency direct-to-cart protocols for instant checkout ready sessions." },
                 { icon: MapPin, title: "SA Latency Advantage", desc: "Global bots fail on SA sites due to distance. SoleSeek runs in Cape Town for 1ms local response times." },
                 { icon: Globe, title: "Distributed Flux", desc: "Multi-node localized monitoring for maximum stealth and scale." },
                 { icon: Shield, title: "Stealth", desc: "Industrial-grade anti-bot evasion built into every scraper." },
                 { icon: Activity, title: "3-Tier Speed", desc: "Adjustable polling frequencies from 1hr down to 0.5 seconds." },
                 { icon: Bell, title: "Omni-Alerts", desc: "WhatsApp, Cloud Sync, and Desktop notifications in real-time." },
                 { icon: Database, title: "Hive Sync", desc: "Global restock databases synchronized across the entire network." },
                 { icon: Search, title: "Deep Scrape", desc: "Advanced metadata extraction including variant IDs and stock levels." },
                 { icon: Target, title: "Auto-Checkout", desc: "Optional automation for compatible South African boutique retailers." }
              ].map((feat, idx) => (
                 <motion.div 
                    key={idx}
                    whileInView={{ opacity: 1, y: 0 }} 
                    initial={{ opacity: 0, y: 30 }} 
                    transition={{ delay: idx * 0.05 }}
                    viewport={{ once: true }}
                    className="p-8 rounded-3xl bg-white/2 border border-white/5 hover:border-white/20 transition-all group"
                 >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-ds-blue group-hover:bg-ds-blue/10 transition-colors mb-6">
                       <feat.icon className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-black uppercase text-white mb-3 tracking-widest">{feat.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">{feat.desc}</p>
                 </motion.div>
              ))}
           </div>
        </div>
      </section>

      {/* 📡 Market Intelligence: The Terminal Experience */}
      <section className="py-32 px-12 border-t border-white/5 bg-ds-bg relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-ds-indigo/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto">
           <div className="text-center mb-24">
              <span className="text-ds-indigo font-black uppercase tracking-widest text-[10px] mb-4 block">Market Intelligence</span>
              <h2 className="text-5xl font-black italic uppercase leading-tight mb-8 tracking-tight">The Terminal <span className="text-white">Experience.</span></h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                 { icon: TrendingUp, title: "Trending Heat", desc: "Instantly view the most sought-after pairs currently being monitored across all nodes." },
                 { icon: Zap, title: "New Releases", desc: "A live feed of the latest arrivals hitting South African boutique inventory systems." },
                 { icon: Activity, title: "Restock Tracker", desc: "Real-time logs of stock quantity updates, ensuring you see restocks as they happen." },
                 { icon: Star, title: "Smart Watchlist", desc: "Tag specific SKUs and receive instant notifications when your size becomes available." }
              ].map((feat, idx) => (
                 <motion.div 
                    key={idx}
                    whileInView={{ opacity: 1, y: 0 }} 
                    initial={{ opacity: 0, y: 30 }} 
                    transition={{ delay: idx * 0.1 }}
                    viewport={{ once: true }}
                    className="p-10 rounded-[40px] bg-white/2 border border-white/5 hover:border-ds-indigo/30 transition-all group relative overflow-hidden"
                 >
                    <div className="absolute inset-0 bg-ds-indigo/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                       <div className="w-14 h-14 rounded-2xl bg-ds-indigo/10 border border-ds-indigo/30 flex items-center justify-center text-ds-indigo mb-8 shadow-2xl group-hover:scale-110 transition-transform">
                          <feat.icon className="w-7 h-7" />
                       </div>
                       <h4 className="text-lg font-black uppercase text-white mb-4 tracking-tight italic">{feat.title}</h4>
                       <p className="text-sm text-gray-400 leading-relaxed font-medium">{feat.desc}</p>
                    </div>
                 </motion.div>
              ))}
           </div>

           <div className="flex justify-center mt-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <Link href="/seek" className="group relative h-16 px-12 bg-ds-indigo text-white rounded-2xl flex items-center justify-center font-black uppercase text-xs tracking-widest transition-all shadow-[0_0_40px_rgba(129,140,248,0.2)] active:scale-95 overflow-hidden">
                  <div className="absolute inset-0 bg-white opacity-0" />
                  Launch Terminal
                  <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
           </div>
        </div>
      </section>

      {/* 💎 Pricing Section */}
      <section id="pricing" className="py-20 px-8 bg-ds-bg relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-ds-indigo/5 blur-[150px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto text-center mb-24 relative z-10">
          <span className="text-ds-indigo font-black uppercase tracking-[0.3em] text-[10px] mb-6 block">Premium Access</span>
          <h2 className="text-6xl italic md:text-8xl font-black uppercase tracking-tight mb-8">Choose Your <span className="text-white">Style</span></h2>
          <p className="text-gray-400 max-w-xl mx-auto font-medium">Professional grade intelligence, priced for serious seekers. Secure your edge today.</p>
        </div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <motion.div className="p-1 rounded-3xl bg-linear-to-b from-white/5 to-transparent">
            <div className="p-12 rounded-[inherit] bg-ds-surface/50 flex flex-col h-full border border-white/5 backdrop-blur-3xl relative overflow-hidden group">
              <h4 className="text-xl font-black uppercase mb-2 tracking-widest text-ds-text-dim opacity-50">Free_Seeker</h4>
              <div className="flex items-baseline gap-2 mb-10">
                <span className="text-6xl font-black tracking-tight text-white">$0</span>
                <span className="text-gray-500 text-sm font-black uppercase tracking-[0.3em]">/ Free</span>
              </div>
              <ul className="space-y-4 mb-12 text-left">
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-500"><Zap className="w-4 h-4 text-ds-blue/30" /> Real-time Terminal</li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-500"><Star className="w-4 h-4 text-ds-blue/30" /> Top Boutique Scans</li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-500"><Target className="w-4 h-4 text-ds-blue/30" /> 10 Watchlist Slots</li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-white/40 italic"><Zap className="w-4 h-4 text-ds-indigo/30" /> Optional AI Top-Ups</li>
              </ul>
              <div className="mt-auto space-y-4">
                 <Link href="/seek" className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-ds-bg transition-all">
                    Start_Hunting
                 </Link>
                 <p className="text-[9px] text-center font-black uppercase text-ds-text-dim tracking-tighter opacity-40 italic">0 Sniper Slots Included</p>
              </div>
            </div>
          </motion.div>

          <motion.div className="p-1 rounded-3xl bg-linear-to-b from-white/10 to-transparent">
            <div className="p-12 rounded-[inherit] bg-ds-surface flex flex-col h-full border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] group-hover:bg-white/10 transition-colors" />
              <div className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-ds-blue/20 border border-ds-blue/40 text-ds-blue rounded-full font-black uppercase text-[8px] tracking-[0.2em] shadow-2xl z-20 backdrop-blur-md">7-Day Free Trial</div>
              <h4 className="text-xl font-black uppercase mb-2 tracking-widest text-ds-text-dim">Standard_Unit</h4>
              <div className="flex items-baseline gap-2 mb-10">
                <span className="text-6xl font-black tracking-tight text-white">R150</span>
                <span className="text-gray-500 text-sm font-black uppercase tracking-[0.3em]">/ Month</span>
              </div>
              <ul className="space-y-4 mb-12 text-left">
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400 group-hover:text-white transition-colors"><Zap className="w-4 h-4 text-ds-blue" /> Real-time Terminal</li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400 group-hover:text-white transition-colors"><Star className="w-4 h-4 text-ds-blue" /> Fast-Response Anticipation (60s)</li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400 group-hover:text-white transition-colors"><Target className="w-4 h-4 text-ds-blue" /> 100 Watchlist Slots</li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400 group-hover:text-white transition-colors"><Monitor className="w-4 h-4 text-ds-blue" /> 1 Local Monitoring Node</li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400 group-hover:text-white transition-colors"><Bell className="w-4 h-4 text-ds-blue" /> WhatsApp & Desktop Alerts</li>
              </ul>
              <div className="mt-auto space-y-4">
                 <PayPalSubscription planId="P-4EJ62012V0978711ANHCYN7Q" tier="Standard" />
                 <p className="text-[9px] text-center font-black uppercase text-ds-text-dim tracking-tighter opacity-70 italic">Verified via SSL Protocol</p>
              </div>
            </div>
          </motion.div>

          <motion.div className="p-1 rounded-3xl bg-linear-to-b from-gray-800 to-transparent relative opacity-60 grayscale filter">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gray-700 text-white rounded-md font-black uppercase text-[10px] tracking-widest shadow-2xl z-20">COMING SOON</div>
            <div className="p-12 rounded-[inherit] bg-[#1a1c22] flex flex-col h-full border border-white/5 backdrop-blur-3xl shadow-none group relative overflow-hidden">
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/5 blur-[100px] pointer-events-none" />
              <h4 className="text-xl font-black uppercase mb-2 tracking-widest text-gray-500">Pro_Seeker</h4>
              <div className="flex items-baseline gap-2 mb-10">
                <span className="text-6xl font-black tracking-tight text-gray-400">R450</span>
                <span className="text-gray-500 text-sm font-black uppercase tracking-[0.3em]">/ Month</span>
              </div>
              <ul className="space-y-4 mb-12 text-left opacity-30">
                <li className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6">
                  <span className="w-6 h-px bg-gray-500/50" />
                  Elite SNIPER Features
                </li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400 italic">
                  <Zap className="w-4 h-4 text-gray-500" /> 
                  Zero-Latency Alerts (Instant)
                </li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400">
                  <Monitor className="w-4 h-4 text-gray-500" /> 
                  Unlimited Multi-Node Deployment
                </li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400">
                  <Globe className="w-4 h-4 text-gray-500" /> 
                  Hive VPN: Residential Rotating Proxies
                </li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400">
                  <Zap className="w-4 h-4 text-gray-500" /> 
                  Automated Add-To-Cart (ATC)
                </li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400">
                  <Globe className="w-4 h-4 text-gray-500" /> 
                  2GB Included Hive Data
                </li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400">
                  <TrendingUp className="w-4 h-4 text-gray-500" /> 
                  3-Tier Scraping (Sniper Support)
                </li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400">
                  <Bell className="w-4 h-4 text-gray-500" /> 
                  Full Alert Suite (WhatsApp/Discord)
                </li>
                <li className="flex items-center gap-4 text-xs font-black uppercase tracking-tight text-gray-400">
                  <Database className="w-4 h-4 text-gray-500" /> 
                  1000 Watchlist Slots
                </li>
              </ul>
              <div className="mt-auto space-y-4">
                 <button disabled className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center font-black uppercase text-[10px] tracking-widest text-gray-500 cursor-not-allowed">
                    COMING SOON
                 </button>
                 <p className="text-[9px] text-center font-black uppercase text-gray-600 tracking-tighter opacity-70 italic">Protocol in Development</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 🛠️ Detailed Features Section */}
      <section id="stores" className="py-32 px-12 border-t border-white/5 bg-white/1">
        <div className="max-w-7xl mx-auto flex flex-col gap-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
             <div className="order-1 text-left">
                <div className="flex items-center gap-3 mb-6 justify-start">
                   <Monitor className="w-5 h-5 text-ds-blue" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-ds-text-dim">Global Live Terminal</span>
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tight mb-6 underline decoration-ds-blue/30 underline-offset-8 leading-tight">Unified <br /> Multi-Store Monitoring</h2>
                <p className="text-gray-400 text-lg leading-relaxed font-medium">
                   Stop tab-switching. SoleSeek aggregates live inventory from Shelflife, Jack Lemkus, Archive, and others into a single, high-frequency stream. Map colors, sizes, and price drops across the entire market in one unified interface.
                </p>
             </div>
             <div className="order-2 bg-ds-surface border border-white/5 rounded-3xl relative overflow-hidden group shadow-2xl">
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

      {/* 📊 Data Economics: Transparency Table */}
      <section className="py-32 px-12 border-t border-white/5 bg-ds-bg relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-ds-blue/5 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto">
           <div className="mb-20">
              <span className="text-ds-blue font-black uppercase tracking-widest text-[10px] mb-4 block">Engine Efficiency</span>
              <h2 className="text-5xl font-black italic uppercase leading-tight mb-8 tracking-tight">Data <span className="text-white">Economics.</span></h2>
              <p className="text-gray-400 max-w-2xl font-medium leading-relaxed">
                 High-frequency scraping requires rotating proxies to avoid detection that costs data. We route your requests through encrypted residential pools to survive anti-bot detection. Below is the full breakdown of how your data is consumed during a mission.
              </p>
           </div>

           <div className="rounded-3xl border border-white/10 bg-white/2 overflow-hidden backdrop-blur-3xl shadow-2xl">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                       <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white">Scraping_Tier</th>
                       <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white">Frequency</th>
                       <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white">Consumption</th>
                       <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white">Run_Cost_Hr</th>
                       <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white">Max_Run_Time</th>
                       <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white text-right">Access</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {[
                       { tier: 'Standby_Scan', freq: '1hr Intervals', usage: '~0.1MB / Hr', cost: 'R0.00', capacity: 'UNLIMITED', access: 'FREE (CLOUD)' },
                       { tier: 'Anticipation', freq: '60s Intervals', usage: '~4.2MB / Hr', cost: 'R0.00', capacity: 'UNLIMITED', access: 'LOCAL IP_ONLY' },
                       { tier: 'Tactical_Sniper', freq: '0.5s Intervals', usage: '~480MB / Hr', cost: 'R72.00', capacity: '4 HOURS', access: 'PRO_ONLY' },
                       { tier: 'Distributed_Hive', freq: 'Multi-Node', usage: 'High Fidelity', cost: 'VARIABLE', capacity: 'DYNAMIC', access: 'PRO_ONLY' }
                    ].map((row, idx) => (
                       <tr key={idx} className="group hover:bg-white/5 transition-colors">
                          <td className="px-8 py-6">
                             <span className="text-xs font-black uppercase text-ds-blue tracking-tight">{row.tier}</span>
                          </td>
                          <td className="px-8 py-6">
                             <span className="text-xs font-black text-white">{row.freq}</span>
                          </td>
                          <td className="px-8 py-6">
                             <span className="text-[10px] font-mono text-gray-400">{row.usage}</span>
                          </td>
                          <td className="px-8 py-6">
                             <span className="text-[10px] text-ds-blue font-black">{row.cost} <span className="text-gray-500 font-medium">/ HR</span></span>
                          </td>
                          <td className="px-8 py-6">
                             <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic">{row.capacity}</span>
                          </td>
                          <td className="px-8 py-6 text-right">
                             <span className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-black uppercase text-white tracking-widest">{row.access}</span>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           <div className="mt-12 p-8 rounded-3xl bg-ds-blue/5 border border-ds-blue/20 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-ds-blue/10 flex items-center justify-center text-ds-blue shrink-0">
                 <Zap className="w-8 h-8 animate-pulse" />
              </div>
              <div className="flex-1">
                 <h4 className="text-lg font-black uppercase text-white mb-2 italic">Optimize for Profit</h4>
                 <p className="text-xs text-gray-400 leading-relaxed font-medium text-left">
                    Smart Snipers only toggle <span className="text-ds-blue font-bold">Sniper Mode</span> during active drop windows. Use <span className="text-ds-indigo font-bold">Anticipation Mode</span> for 24/7 restock tracking to maximize your proxy ROI.
                 </p>
              </div>
              <div className="shrink-0 pt-6 md:pt-0 flex flex-col sm:flex-row gap-6">
                  <div className="px-6 py-4 rounded-2xl bg-ds-bg border border-white/10 text-center min-w-[140px]">
                     <span className="text-[9px] font-black uppercase text-gray-500 block mb-1">Data Rate</span>
                     <span className="text-2xl font-black text-white">R150 <span className="text-xs text-ds-blue">/ GB</span></span>
                  </div>
                  <div className="px-6 py-4 rounded-2xl bg-ds-bg border border-ds-indigo/30 text-center min-w-[140px] shadow-[0_0_20px_rgba(129,140,248,0.1)]">
                     <span className="text-[9px] font-black uppercase text-ds-indigo block mb-1">AI Credits</span>
                     <span className="text-2xl font-black text-white">R100 <span className="text-xs text-ds-indigo">/ 100</span></span>
                  </div>
               </div>
           </div>
        </div>
      </section>
      {/* 🚀 CTA Section */}
      <section className="py-32 px-12 border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-ds-blue/20 blur-[120px] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl italic md:text-7xl font-black uppercase tracking-tight mb-8 leading-tight">Ready to <span className="text-ds-blue italic">Level Up?</span></h2>
          <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto font-medium">Gain the professional edge and never miss a drop again.</p>
          <Link href="/seek" className="inline-flex h-16 px-12 bg-white text-ds-bg rounded-2xl items-center font-black uppercase text-xs tracking-widest hover:bg-ds-gray-500 hover:text-ds-bg transition-all active:scale-95 shadow-2xl">
            Enter the Terminal <ArrowRight className="w-4 h-4 ml-3" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
