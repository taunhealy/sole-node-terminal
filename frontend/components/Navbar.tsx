'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, LogOut, LogIn, User, CreditCard } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebase'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'

export default function Navbar() {
  const pathname = usePathname()
  const canvasRef = useRef<HTMLDivElement>(null)
  const { user, login, logout, loading, appUser } = useAuth()
  
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Seek', path: '/seek' },
    { name: 'Compare', path: '/compare' },
    { name: 'Blog', path: '/blog' }
  ]

  const onEnter = () => {
    if (canvasRef.current) {
      gsap.to(canvasRef.current, { 
        opacity: 1, 
        duration: 0.3, 
        ease: "power2.out" 
      })
      gsap.to(".swirl-blob", {
        scale: 2.5,
        duration: 1.2,
        stagger: { amount: 0.4, repeat: -1, yoyo: true },
        ease: "sine.inOut"
      })
    }
  }

  const onLeave = () => {
    if (canvasRef.current) {
      gsap.to(canvasRef.current, { 
        opacity: 0, 
        duration: 0.4, 
        ease: "power2.in" 
      })
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 h-20 bg-ds-bg/80 backdrop-blur-xl border-b border-white/5 z-100 px-6 flex items-center justify-between overflow-hidden">
      
      {/* 🔮 GSAP Dancefloor Swirl Background (Only on Link Hover) */}
      <div 
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-700 bg-gradient-radial from-ds-blue/10 via-ds-indigo/5 to-transparent z-0"
      >
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-ds-blue/20 blur-[100px] rounded-full swirl-blob animate-pulse" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-ds-indigo/20 blur-[100px] rounded-full swirl-blob" />
        <div className="absolute top-1/2 left-3/4 w-96 h-96 bg-ds-cyan/20 blur-[100px] rounded-full swirl-blob animate-bounce" />
      </div>

      <div className="relative z-10 flex items-center justify-between w-full">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-ds-blue-deep flex items-center justify-center text-ds-blue shadow-[0_0_20px_rgba(30,58,138,0.4)] transition-transform group-hover:scale-110">
            <Zap className="w-6 h-6 fill-ds-blue" />
          </div>
          <span className="font-black text-2xl tracking-medium italic uppercase text-white">SOLE<span className="text-ds-blue">SEEK</span>.io</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 bg-white/5 px-6 py-2.5 rounded-full border border-white/10 hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all cursor-pointer" onMouseEnter={onEnter} onMouseLeave={onLeave}>
          {navLinks.map((link) => {
            const isActive = pathname === link.path
            return (
              <Link 
                key={link.path} 
                href={link.path} 
                className={`text-sm font-black uppercase tracking-widest transition-colors relative ${isActive ? 'text-ds-indigo' : 'text-white hover:text-ds-indigo'}`}
              >
                {link.name}
                {isActive && (
                  <motion.div 
                    layoutId="nav-active" 
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-ds-indigo" 
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-6 relative z-50">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
             <div className="w-1.5 h-1.5 rounded-full bg-ds-green animate-pulse" />
             <span className="text-[10px] font-black text-ds-text-dim uppercase tracking-tighter">System: Live</span>
          </div>

          <AnimatePresence mode="wait">
            {!user ? (
              <button 
                onClick={login}
                className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-ds-blue hover:text-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                <LogIn className="w-3.5 h-3.5" />
                Auth_Terminal
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black uppercase text-white tracking-widest leading-none mb-1">{user.displayName?.split(' ')[0]}</span>
                   <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${appUser?.tier === 'Pro' ? 'bg-ds-indigo-deep border-ds-indigo-border text-ds-indigo' : 'bg-white/5 border-white/10 text-ds-text-dim'}`}>
                      {appUser?.tier || 'STANDARD'}
                   </span>
                </div>
                <div className="relative group/user">
                  <div className="w-10 h-10 rounded-xl border border-white/10 overflow-hidden bg-ds-surface flex items-center justify-center hover:border-ds-indigo transition-all cursor-pointer">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="pfp" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-ds-text-dim" />
                    )}
                  </div>
                  <div className="absolute top-12 right-0 w-48 py-2 bg-ds-surface border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover/user:opacity-100 pointer-events-none group-hover/user:pointer-events-auto transition-all translate-y-2 group-hover/user:translate-y-0 backdrop-blur-xl z-[100]">
                     {appUser?.tier === 'Pro' && (
                       <button 
                        onClick={async () => {
                          if (confirm('Are you sure you want to cancel your PRO subscription? You will be downgraded to Standard.')) {
                            const userRef = doc(db, 'users', user.email!)
                            await updateDoc(userRef, { tier: 'Standard', subscription_status: 'inactive', updated_at: serverTimestamp() })
                            alert('Subscription cancelled. Your account has been downgraded to Standard.')
                          }
                        }}
                        className="w-full px-4 py-2 flex items-center gap-3 text-xs font-black text-ds-text-dim hover:bg-white/5 transition-colors uppercase tracking-widest border-b border-white/5 mb-1"
                       >
                         <CreditCard className="w-3.5 h-3.5" />
                         Cancel_Pro
                       </button>
                     )}
                     <button onClick={logout} className="w-full px-4 py-2 flex items-center gap-3 text-xs font-black text-ds-red hover:bg-ds-red/10 transition-colors uppercase tracking-widest">
                       <LogOut className="w-3.5 h-3.5" />
                       Logout
                     </button>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  )
}
