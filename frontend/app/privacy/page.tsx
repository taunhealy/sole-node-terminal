'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Shield, Zap, Lock, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ds-bg text-white font-sans p-12 lg:p-24 selection:bg-ds-blue selection:text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
           <div className="w-12 h-12 bg-ds-blue/10 border border-ds-blue/30 rounded-2xl flex items-center justify-center text-ds-blue">
              <Lock className="w-6 h-6" />
           </div>
           <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">Privacy_Protocol</h1>
              <p className="text-[10px] font-black text-ds-text-dim uppercase tracking-[0.4em]">Protocol Version 1.1 | March 2026</p>
           </div>
        </div>

        <div className="space-y-12 prose prose-invert prose-sm max-w-none prose-p:text-gray-400 prose-p:leading-relaxed prose-headings:uppercase prose-headings:italic prose-headings:font-black">
           <section>
              <h2 className="text-xl text-white tracking-widest flex items-center gap-3">
                 <Shield className="w-4 h-4 text-ds-blue" />
                 1. Data_Extraction
              </h2>
              <p>SoleSeek utilizes Firebase and Discord OAuth2 for high-security authentication. We collect and store minimal telemetry including your Discord ID, email, and subscription tier status to provide pro-level sniper features.</p>
           </section>

           <section>
              <h2 className="text-xl text-white tracking-widest flex items-center gap-3">
                 <Shield className="w-4 h-4 text-ds-blue" />
                 2. AI_Memory_Protocol
              </h2>
              <p>Your interactions with the Sniper_Link assistant (Gemini Flash) are temporarily stored to improve neural briefing relevance. We do not sell your tactical data to third-party aggregators.</p>
           </section>

           <section>
              <h2 className="text-xl text-white tracking-widest flex items-center gap-3">
                 <Shield className="w-4 h-4 text-ds-blue" />
                 3. Marketplace_Surveillance
              </h2>
              <p>The SoleResell Hub displays public Discord forum listings. We only stream data that you explicitly post in the community marketplace. Ensure you do not post sensitive personal data in the #sole-resell forum.</p>
           </section>

           <section>
              <h2 className="text-xl text-white tracking-widest flex items-center gap-3">
                 <Zap className="w-4 h-4 text-ds-blue" />
                 4. Encrypted_Authentication
              </h2>
              <p>All data transmitted via our Cloud Run API and Discord Interaction endpoints is encrypted using Ed25519 signature verification and TLS 1.3 standards. Your tactical security is our priority.</p>
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
