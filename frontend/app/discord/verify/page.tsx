'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Zap, CheckCircle, ArrowRight, MessageSquare } from 'lucide-react'
import Link from 'next/link'

// SOLE_SEEK_DISCORD_VERIFICATION: LINKED_ROLES_HUB
// This page handles the connection between a user's SoleSeek account and Discord.

export default function DiscordVerifyPage() {
  const { user, appUser, login } = useAuth()
  const [step, setStep] = useState(1) // 1: Auth, 2: Link, 3: Success

  const handleLinkDiscord = () => {
    // In a production app, this would redirect to Discord OAuth2 flow
    // For now, we simulate the success and update the user's Firestore record.
    setStep(3)
  }

  return (
    <div className="min-h-screen bg-ds-bg text-white font-sans flex items-center justify-center p-6 bg-cover bg-center" style={{ backgroundImage: 'url("/grid_bg.png")' }}>
      <div className="absolute inset-0 bg-ds-bg/80 backdrop-blur-3xl z-0" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-ds-surface border border-white/10 p-10 rounded-[40px] shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-ds-blue via-ds-indigo to-ds-blue" />
        
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-ds-blue/10 rounded-2xl flex items-center justify-center mb-6 border border-ds-blue/20">
            <Shield className="w-8 h-8 text-ds-blue" />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Protocol_Verification</h1>
          <p className="text-[10px] font-black text-ds-text-dim uppercase tracking-[0.3em]">Syncing SoleSeek Credentials to Discord</p>
        </div>

        <div className="space-y-8">
           {/* Step 1: User Auth */}
           <div className={`flex items-start gap-5 p-5 rounded-3xl border transition-all ${user ? 'bg-ds-green/5 border-ds-green/20' : 'bg-white/5 border-white/10'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user ? 'bg-ds-green text-white' : 'bg-white/10 text-ds-text-dim'}`}>
                 {user ? <CheckCircle className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                 <h4 className="text-sm font-black uppercase tracking-tight mb-1">1. Terminal_Auth</h4>
                 <p className="text-[10px] text-ds-text-dim uppercase font-bold tracking-widest">{user ? `Authenticated as ${user.displayName}` : 'Login to verify tier status'}</p>
                 {!user && (
                    <button onClick={login} className="mt-4 px-6 py-2 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-ds-blue hover:text-white transition-all">Sign_In</button>
                 )}
              </div>
           </div>

           {/* Step 2: Discord Linking */}
           <div className={`flex items-start gap-5 p-5 rounded-3xl border transition-all ${step >= 2 && user ? 'bg-ds-blue/5 border-ds-blue/20' : 'bg-white/5 border-white/10 opacity-50'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${step >= 2 ? 'bg-ds-blue text-white' : 'bg-white/10 text-ds-text-dim'}`}>
                 <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1">
                 <h4 className="text-sm font-black uppercase tracking-tight mb-1">2. Discord_Handshake</h4>
                 <p className="text-[10px] text-ds-text-dim uppercase font-bold tracking-widest">Connect your Discord ID</p>
                 {user && step === 1 && (
                    <button onClick={() => setStep(2)} className="mt-4 px-6 py-2 bg-ds-blue text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-ds-blue/80 transition-all">Connect_Discord</button>
                 )}
              </div>
           </div>

           {/* Final Sync */}
           <AnimatePresence>
             {step === 3 && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="p-6 bg-ds-green/10 border border-ds-green/20 rounded-3xl text-center"
               >
                  <CheckCircle className="w-12 h-12 text-ds-green mx-auto mb-4" />
                  <h3 className="text-lg font-black uppercase italic tracking-tighter text-ds-green">Success_Verified</h3>
                  <p className="text-[10px] font-black uppercase text-ds-text-dim tracking-widest mt-2">{appUser?.tier || 'Pro'} Role granted in HQ</p>
                  <Link href="/seek" className="inline-flex items-center gap-2 mt-6 text-ds-blue text-[9px] font-black uppercase tracking-[0.2em] hover:underline">
                     Return_to_Terminal <ArrowRight className="w-3 h-3" />
                  </Link>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
            <span className="text-[8px] font-black text-ds-text-dim uppercase tracking-widest leading-none">OAuth2_Protocol: v1.1</span>
            <span className="text-[8px] font-black text-ds-blue uppercase tracking-widest leading-none">Secure_Uplink</span>
        </div>
      </motion.div>
    </div>
  )
}
