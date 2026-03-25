'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Box, ChevronRight, Zap } from 'lucide-react'
import Footer from '@/components/Footer'

export default function BlogPage() {
  const posts = [
    { id: 1, title: "Decoding Vtex Catalog API Scrapers", date: "March 25, 2026", category: "Tech", excerpt: "Exploring the latest architectural shifts in retail APIs and how SoleNode stays one step ahead." },
    { id: 2, title: "How Amazon is Fighting Botters in 2026", date: "March 23, 2026", category: "Retail", excerpt: "A deep dive into Amazon's newest anti-bot challenges and our stealth bypass strategies." },
    { id: 3, title: "Jordan 4 Restock: Best Scraper Strategies", date: "March 21, 2026", category: "Guides", excerpt: "Maximizing your checkout success with custom monitor filters and low-latency alerts." },
    { id: 4, title: "ZAR Sneaker Arbitrage: A 2026 Guide", date: "March 18, 2026", category: "Finance", excerpt: "Learning how to leverage currency swings and store-specific drops for profit." },
    { id: 5, title: "Sneaker Stock Integration API v2.0", date: "March 15, 2026", category: "Platform", excerpt: "Announcing the release of our new high-precision ingestion engine for third-party nodes." }
  ]

  return (
    <div className="bg-[#101217] text-white min-h-screen pt-24 px-8 selection:bg-[#60a5fa]/30">
      <div className="max-w-7xl mx-auto py-20 text-center md:text-left">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
          <div>
            <span className="text-[#60a5fa] font-black uppercase tracking-widest text-xs mb-4 block">SoleNode Intelligence</span>
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-4">
              The <span className="text-[#60a5fa]">Intelligence</span> Reports.
            </h1>
            <p className="text-gray-500 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
              Analytical deep dives into the technology powering the sneaker ecosystem.
            </p>
          </div>
          
          <div className="hidden lg:flex items-center gap-6 px-10 py-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
            <div className="text-right">
               <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Total Articles</p>
               <p className="text-3xl font-black text-[#60a5fa]">124</p>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-right">
               <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Active Readers</p>
               <p className="text-3xl font-black text-white">4.2K</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post, i) => (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -10 }}
              className="p-8 rounded-3xl bg-white/5 border border-white/10 group cursor-pointer transition-all hover:bg-white/10"
            >
               <div className="flex items-center justify-between mb-8">
                  <div className="px-3 py-1 bg-[#172554] border border-[#1e3a8a] rounded-full text-[10px] font-black text-[#60a5fa] uppercase tracking-widest">{post.category}</div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{post.date}</span>
               </div>
               <h3 className="text-2xl font-black uppercase tracking-tighter leading-snug mb-4 group-hover:text-[#60a5fa] transition-colors">
                  {post.title}
               </h3>
               <p className="text-gray-500 text-sm leading-relaxed mb-8 line-clamp-3">
                  {post.excerpt}
               </p>
               <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest group-hover:text-[#60a5fa] transition-colors">
                  Read Full Report <ChevronRight className="w-3.5 h-3.5" />
               </div>
            </motion.div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}
