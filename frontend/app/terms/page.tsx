'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Shield, Zap, FileText, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ds-bg text-white font-sans p-12 lg:p-24 selection:bg-ds-blue selection:text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
           <div className="w-12 h-12 bg-ds-blue/10 border border-ds-blue/30 rounded-2xl flex items-center justify-center text-ds-blue">
              <FileText className="w-6 h-6" />
           </div>
           <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">Terms_of_Service</h1>
              <p className="text-[10px] font-black text-ds-text-dim uppercase tracking-[0.4em]">Protocol Version 1.1 | March 2026</p>
           </div>
        </div>

        <div className="space-y-12 prose prose-invert prose-sm max-w-none prose-p:text-gray-400 prose-p:leading-relaxed prose-headings:uppercase prose-headings:italic prose-headings:font-black">
           <section>
              <h2 className="text-xl text-white tracking-widest flex items-center gap-3">
                 <Zap className="w-4 h-4 text-ds-blue" />
                 1. Acceptance_of_Protocol
              </h2>
              <p>By initializing the SoleSeek Terminal or joining the SoleSeekers HQ Discord, you agree to these Terms. If you do not accept these protocols, immediate termination of your neural link is required.</p>
           </section>

           <section>
              <h2 className="text-xl text-white tracking-widest flex items-center gap-3">
                 <Shield className="w-4 h-4 text-ds-blue" />
                 2. Intelligence_Disclaimer
              </h2>
              <p>Our AI-driven briefings and Sniper_Link assistant provide real-time market data. However, market volatility is constant. SoleSeek provides no guarantees regarding the accuracy or profit potential of intelligence provided. You snipe at your own risk.</p>
           </section>

           <section>
              <h2 className="text-xl text-white tracking-widest flex items-center gap-3">
                 <Shield className="w-4 h-4 text-ds-blue" />
                 3. Marketplace_Rules
              </h2>
              <p>The SoleResell Hub is a peer-to-peer marketplace. SoleSeek is not responsible for any financial loss, counterfeit items, or shipping failures in transactions between community members. Standard marketplace etiquette and verification or escrow should be used for all crew listings.</p>
           </section>

           <section>
              <h2 className="text-xl text-white tracking-widest flex items-center gap-3">
                 <Shield className="w-4 h-4 text-ds-blue" />
                 4. Ethical_Monitoring
              </h2>
              <p>SoleSeekers are prohibited from using this platform to facilitate any malicious activity against retailers or boutique networks. We provide speed and intelligence; we do not authorize illegal site interference.</p>
           </section>
        </div>

        <div className="mt-20 pt-12 border-t border-white/5 flex items-center justify-between">
           <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-ds-text-dim hover:text-white transition-colors flex items-center gap-2">
              <ChevronRight className="w-3 h-3 rotate-180" /> Back_to_Terminal
           </Link>
           <span className="text-[8px] font-black text-ds-blue uppercase tracking-widest">SOLE_SEEK_ENCRYPTION_ACTIVE</span>
        </div>
      </div>
    </div>
  )
}
