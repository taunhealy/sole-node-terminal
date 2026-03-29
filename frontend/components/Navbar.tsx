'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, LogOut, LogIn, User, CreditCard, Menu, X, Search, Target, Activity, ChevronRight, Shield, Monitor } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebase'
import { doc, updateDoc, serverTimestamp, collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore'

export default function Navbar() {
  const pathname = usePathname()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [lastScanDate, setLastScanDate] = useState<Date | null>(null)
  const [relativeTime, setRelativeTime] = useState<string>('Initializing...')
  const [activeSniperCount, setActiveSniperCount] = useState<number>(0)
  const { user, login, logout, loading, appUser } = useAuth()

  useEffect(() => {
    // 1. Terminal Heartbeat
    const heartbeatUnsub = onSnapshot(doc(db, 'stock', '_terminal_status'), (snap) => {
      if (snap.exists() && snap.data()?.last_scan_at) {
        const d = snap.data().last_scan_at
        setLastScanDate(d.toDate ? d.toDate() : new Date(d.seconds * 1000))
      }
    }, (err) => {
      console.error("Navbar Heartbeat Error:", err)
    })

    // 2. Fallback Scan Data
    const fallbackQ = query(collection(db, 'stock'), orderBy('last_updated', 'desc'), limit(1))
    const fallbackUnsub = onSnapshot(fallbackQ, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0].data()
        if (d?.last_updated) {
          setLastScanDate(prev => !prev ? (d.last_updated.toDate ? d.last_updated.toDate() : new Date(d.last_updated.seconds * 1000)) : prev)
        }
      }
    }, (err) => {
      console.error("Navbar Fallback Error:", err)
    })

    // 3. Active Sniper Sync (with Ghost Filter)
    const nodeQ = query(collection(db, 'active_nodes'), where('status', '==', 'active'))
    const nodeUnsub = onSnapshot(nodeQ, (snap) => {
      const fifteenMinsAgo = Date.now() - (15 * 60 * 1000)
      let count = 0
      snap.forEach(doc => {
        const d = doc.data()
        const lastSeen = d.last_seen?.toMillis?.() || 0
        if (lastSeen > fifteenMinsAgo) count++
      })
      setActiveSniperCount(count)
    })

    return () => { 
      if (typeof heartbeatUnsub === 'function') heartbeatUnsub(); 
      if (typeof fallbackUnsub === 'function') fallbackUnsub(); 
      if (typeof nodeUnsub === 'function') nodeUnsub();
    }
  }, [])

  useEffect(() => {
    const update = () => {
      if (!lastScanDate) return
      const diff = Math.floor((Date.now() - lastScanDate.getTime()) / 1000)
      if (diff < 60) setRelativeTime('Just Now')
      else if (diff < 3600) setRelativeTime(`${Math.floor(diff / 60)}m ago`)
      else setRelativeTime(lastScanDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))
    }
    update(); const timer = setInterval(update, 10000)
    return () => clearInterval(timer)
  }, [lastScanDate])

  const diffSec = lastScanDate ? Math.floor((Date.now() - lastScanDate.getTime()) / 1000) : 0
  const systemStatus = activeSniperCount > 0 ? 'Live' : (!lastScanDate ? 'Live' : diffSec > 900 ? 'Offline' : diffSec > 300 ? 'Delayed' : 'Live')
  const statusColor = systemStatus === 'Offline' ? 'bg-ds-red' : systemStatus === 'Delayed' ? 'bg-ds-orange' : 'bg-ds-green'

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Snipe', path: '/snipe' },
    { name: 'Seek', path: '/seek' },
    { name: 'Compare', path: '/compare' },
    { name: 'AI Intel', path: '/ai-intel' },
    { name: 'Pricing', path: '/#pricing' },
    { name: 'Blog', path: '/blog' }
  ]

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    /*
    if (canvasRef.current) {
      gsap.to(canvasRef.current, { opacity: 0.4, duration: 3, ease: 'power2.out' })
      gsap.to('.swirl-blob', {
        scale: 1.2, opacity: 0.1, duration: 6,
        stagger: { amount: 1.5, repeat: -1, yoyo: true },
        ease: 'sine.inOut'
      })
    }
    */
  }, [])

  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const [showNodeModal, setShowNodeModal] = useState(false)
  const [activeNodes, setActiveNodes] = useState<any[]>([])

  useEffect(() => {
    const q = query(collection(db, 'active_nodes'), where('status', '==', 'active'))
    const unsub = onSnapshot(q, (snap) => {
      const fifteenMinsAgo = Date.now() - (15 * 60 * 1000)
      const list: any[] = []
      snap.forEach(doc => {
        const d = doc.data()
        const lastSeen = d.last_seen?.toMillis?.() || 0
        if (lastSeen > fifteenMinsAgo) list.push({ id: doc.id, ...d })
      })
      setActiveNodes(list)
    })
    return () => unsub()
  }, [])

  return (
    <>
      {/* 🔮 Global Decorative Swirl Background */}
      <div ref={canvasRef} className="fixed inset-0 pointer-events-none bg-ds-blue/5 z-[-1] overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-ds-blue/10 blur-[130px] rounded-full swirl-blob" />
        <div className="absolute top-0 left-1/2 w-[600px] h-[600px] bg-ds-indigo/15 blur-[130px] rounded-full swirl-blob" />
        <div className="absolute top-0 left-3/4 w-[600px] h-[600px] bg-ds-cyan/10 blur-[130px] rounded-full swirl-blob" />
      </div>

      <nav className="fixed top-0 left-0 right-0 h-20 bg-ds-bg/85 backdrop-blur-3xl border-b border-white/5 z-[100] px-6 flex items-center justify-between">
        <div className="relative z-10 flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-ds-blue-deep flex items-center justify-center text-ds-blue shadow-[0_0_20px_rgba(30,58,138,0.4)] transition-transform group-hover:scale-110">
              <Zap className="w-6 h-6 fill-ds-blue" />
            </div>
            <span className="font-black text-xl md:text-2xl tracking-medium italic uppercase text-white hover:text-ds-blue transition-colors">SOLE<span className="text-ds-blue">SEEK</span>.io</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:border-white/20 transition-all cursor-pointer">
            {navLinks.map((link) => {
              const isActive = pathname === link.path
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all relative rounded-full group/link ${isActive ? 'text-white' : 'text-ds-text-dim hover:text-white'}`}
                  onMouseEnter={() => setHoveredPath(link.path)}
                  onMouseLeave={() => setHoveredPath(null)}
                >
                  <span className={`relative z-10 transition-transform duration-300 block ${hoveredPath === link.path ? 'translate-x-0.5 scale-105 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''}`}>
                    {link.name}
                  </span>
                  {hoveredPath === link.path && (
                    <motion.div
                      layoutId="nav-hover-pill"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute inset-0 bg-white/10 border border-white/20 rounded-full z-0 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute -bottom-1.5 left-4 right-4 h-0.5 bg-ds-blue shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-3 md:gap-6 relative z-50">
            {/* 🛰️ Fleet HUD Status */}
            <div 
              onClick={() => setShowNodeModal(true)}
              className={`hidden sm:flex items-center gap-3 px-5 py-2 bg-black/40 border ${systemStatus === 'Live' ? 'border-ds-blue/20 shadow-[0_0_15px_rgba(30,58,138,0.2)]' : 'border-ds-red/20'} rounded-2xl transition-all backdrop-blur-xl group/hud cursor-pointer hover:border-ds-blue/50 active:scale-95`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${statusColor} animate-pulse shadow-[0_0_8px_currentColor]`} />
                <span className="text-[9px] font-black text-white/90 uppercase tracking-[0.15em] italic">
                   Hive_Status: <span className={systemStatus === 'Live' ? 'text-ds-green' : 'text-ds-red'}>{systemStatus}</span>
                </span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">Fleet_Active:</span>
                <span className="text-[10px] font-black text-ds-blue tracking-tighter tabular-nums drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]">
                  {activeSniperCount} <span className="text-[8px] font-medium text-ds-blue/60 ml-0.5">{activeSniperCount === 1 ? 'SNIPER' : 'SNIPERS'}</span>
                </span>
              </div>
            </div>

            {/* 🐱 Intel Cat Navbar Trigger */}
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-sniper-bot'))}
              className="w-10 h-10 rounded-xl bg-ds-surface border border-white/10 flex items-center justify-center p-1.5 hover:border-ds-blue hover:bg-ds-blue/10 transition-all group overflow-hidden shadow-lg relative"
              title="Intelligence Assistant"
            >
               <div className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" style={{ backgroundImage: 'url("/sneaker_cat.png")' }} />
               <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-ds-blue rounded-full animate-ping" />
            </button>

            <AnimatePresence>
              {showNodeModal && (
                <div className="fixed inset-0 z-200 flex items-center justify-center px-6">
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    onClick={() => setShowNodeModal(false)} 
                    className="absolute inset-0 bg-black/80 backdrop-blur-md" 
                  />
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                    animate={{ scale: 1, opacity: 1, y: 0 }} 
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-ds-surface border border-white/10 p-8 rounded-[40px] w-full max-w-xl relative z-210 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-ds-blue via-ds-indigo to-ds-blue" />
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Fleet_Node_Directory</h2>
                        <p className="text-[9px] font-black text-ds-text-dim uppercase tracking-[0.3em]">Authorized Hive Surveillance</p>
                      </div>
                      <button onClick={() => setShowNodeModal(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-ds-text-dim" />
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {activeNodes.length === 0 ? (
                        <div className="py-12 text-center">
                          <Activity className="w-12 h-12 text-gray-800 mx-auto mb-4 animate-pulse" />
                          <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Awaiting active node handshakes...</span>
                        </div>
                      ) : (
                        activeNodes.map((node) => (
                          <div key={node.id} className="p-5 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-ds-blue/10 border border-ds-blue/20 flex items-center justify-center text-ds-blue">
                                <Monitor className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-black uppercase tracking-tight text-white mb-0.5">{node.node_name || node.alias || 'Generic_Node'}</h4>
                                <div className="flex items-center gap-3">
                                  <span className="text-[8px] font-black text-ds-text-dim uppercase tracking-widest leading-none">{node.platform || 'STATION'} // v{node.version || '1.0'}</span>
                                  <div className="w-1 h-1 rounded-full bg-white/20" />
                                  <span className="text-[8px] font-black text-ds-blue uppercase tracking-widest leading-none">{node.mode || 'ANTICIPATION'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[9px] font-black text-ds-green uppercase tracking-widest mb-1">ONLINE</span>
                              <span className="text-[7px] font-medium text-ds-text-dim uppercase tracking-widest italic">{node.node_id?.slice(-4)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-ds-blue animate-ping" />
                         <span className="text-[9px] font-black uppercase tracking-[0.2em] text-ds-blue">Secure_Hive_Uplink_Established</span>
                       </div>
                       <button onClick={() => setShowNodeModal(false)} className="text-[9px] font-black uppercase tracking-widest text-ds-text-dim hover:text-white transition-colors">Close_Terminal</button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {!user ? (
                <button
                  onClick={login}
                  className="flex items-center gap-2 bg-white text-black px-4 md:px-5 py-2 md:py-2.5 rounded-full font-black uppercase text-[9px] md:text-[10px] tracking-widest hover:bg-ds-blue hover:text-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Auth_Terminal</span>
                  <span className="xs:hidden">Login</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="hidden xs:flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase text-white tracking-widest leading-none mb-1">{user.displayName?.split(' ')[0]}</span>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                      appUser?.tier === 'Pro' ? 'bg-ds-indigo-deep border-ds-indigo-border text-ds-indigo' : 
                      appUser?.tier === 'Standard' ? 'bg-ds-blue-deep border-ds-blue/30 text-ds-blue' :
                      'bg-white/5 border-white/10 text-ds-text-dim'
                    }`}>
                      {appUser?.tier === 'Pro' ? 'PRO UNIT' : 
                       appUser?.tier === 'Standard' ? 'STANDARD UNIT' : 
                       'FREE UNIT'}
                    </span>
                  </div>

                  {/* Profile Avatar + Dropdown */}
                  <div className="relative group/user">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl border border-white/10 overflow-hidden bg-ds-surface flex items-center justify-center hover:border-ds-indigo transition-all cursor-pointer">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="pfp" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-ds-text-dim" />
                      )}
                    </div>

                    {/* Dropdown Menu */}
                    <div className="absolute top-10 right-0 pt-4 w-56 opacity-0 group-hover/user:opacity-100 pointer-events-none group-hover/user:pointer-events-auto transition-all translate-y-2 group-hover/user:translate-y-0 z-[200]">
                      <div className="bg-ds-surface border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl py-2">
                        {/* 📊 Dashboard Node Widget */}
                        <div className="px-3 py-2">
                           <div className="bg-white/5 border border-white/10 rounded-xl p-3 relative overflow-hidden group/widget hover:border-ds-blue/30 transition-colors">
                              <div className="absolute top-0 right-0 w-16 h-16 bg-ds-blue/5 blur-2xl -translate-y-1/2 translate-x-1/2" />
                              
                              <div className="flex items-center justify-between mb-3 relative z-10">
                                 <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-ds-text-dim uppercase tracking-[0.2em] mb-1">Terminal_Node</span>
                                    <h5 className="text-xs font-black uppercase tracking-tight text-white flex items-center gap-2">
                                       {appUser?.tier === 'Pro' ? 'Pro' : 
                                      appUser?.tier === 'Standard' ? 'Standard' : 
                                      'Free'} Tier
                                     <div className={`w-1.5 h-1.5 rounded-full ${
                                       appUser?.tier === 'Pro' ? 'bg-ds-indigo animate-pulse' : 
                                       appUser?.tier === 'Standard' ? 'bg-ds-blue animate-pulse' :
                                       'bg-ds-blue/30'
                                     } ${appUser?.status === 'paused' ? 'bg-ds-orange animate-none!' : ''} shadow-[0_0_8px_rgba(96,165,250,0.4)]`} />
                                    </h5>
                                 </div>
                                 <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${appUser?.tier === 'Pro' ? 'bg-ds-indigo/10 text-ds-indigo border border-ds-indigo/20' : 'bg-white/5 text-ds-text-dim border border-white/10'}`}>
                                    <Activity className="w-5 h-5" />
                                 </div>
                              </div>

                               {appUser?.tier !== 'Pro' && appUser?.tier !== 'Standard' ? (
                                 <Link 
                                    href="/#pricing"
                                    className="w-full py-2 bg-ds-blue hover:bg-ds-blue/80 text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all group-hover/widget:scale-[1.02] shadow-lg shadow-ds-blue/10"
                                  >
                                    Unlock Pro Protocols
                                    <ChevronRight className="w-3 h-3" />
                                 </Link>
                               ) : (
                                  <div className={`flex items-center justify-between text-[9px] font-black uppercase tracking-widest p-2 rounded-lg border transition-all ${appUser?.status === 'paused' ? 'bg-ds-orange/10 text-ds-orange border-ds-orange/20' : 'bg-ds-indigo/5 text-ds-indigo border-ds-indigo/10'}`}>
                                     <div className="flex items-center gap-2">
                                        <Shield className="w-3 h-3" />
                                        <span>Sync {appUser?.status === 'paused' ? 'Paused' : 'Active'}</span>
                                     </div>
                                     <span className="opacity-40 italic">v1.7</span>
                                  </div>
                              )}

                               {/* ⏸️ Pause / ▶️ Resume Subscription (Mobile/Desktop consistent) */}
                               {(appUser?.tier === 'Pro' || appUser?.tier === 'Standard') && (
                                 <div className="mt-4">
                                   {appUser?.status === 'paused' ? (
                                     <button
                                       onClick={async (e) => {
                                         e.stopPropagation();
                                         const userRef = doc(db, 'users', user.email!)
                                         await updateDoc(userRef, { subscription_status: 'active', updated_at: serverTimestamp() })
                                       }}
                                       className="w-full py-2 bg-ds-green/10 border border-ds-green/20 rounded-lg flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-ds-green hover:bg-ds-green hover:text-white transition-all shadow-[0_0_15px_rgba(0,200,83,0.1)]"
                                     >
                                       <Activity className="w-3 h-3" />
                                       Resume_Active_Sync
                                     </button>
                                   ) : (
                                     <button
                                       onClick={async (e) => {
                                         e.stopPropagation();
                                         if (confirm('Pause your subscription sync? We will stop checking for your watchlist items.')) {
                                           const userRef = doc(db, 'users', user.email!)
                                           await updateDoc(userRef, { subscription_status: 'paused', updated_at: serverTimestamp() })
                                         }
                                       }}
                                       className="w-full py-2 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-ds-text-dim hover:text-ds-orange hover:bg-ds-orange/5 transition-all"
                                     >
                                       <X className="w-3 h-3" />
                                       Pause_Protocol
                                     </button>
                                   )}
                                 </div>
                               )}
                           </div>
                        </div>
                         

                        {/* Cancel Pro */}
                        {(appUser?.tier === 'Pro' || appUser?.tier === 'Standard') && (
                          <button
                            onClick={async () => {
                              if (confirm(`Are you sure you want to cancel your ${appUser.tier.toUpperCase()} subscription?`)) {
                                const userRef = doc(db, 'active_nodes', user.email!)
                                await updateDoc(userRef, { tier: 'Free', subscription_status: 'inactive', updated_at: serverTimestamp() })
                                alert('Subscription cancelled. Downgraded to Free.')
                              }
                            }}
                            className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-black text-ds-red/60 hover:text-ds-red hover:bg-ds-red/5 transition-colors uppercase tracking-widest"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Cancel_Subscription
                          </button>
                        )}

                        <div className="border-t border-white/5 mt-1 pt-1">
                          <button onClick={logout} className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-black text-ds-red hover:bg-ds-red/10 transition-colors uppercase tracking-widest">
                            <LogOut className="w-3.5 h-3.5" />
                            Logout
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay — outside nav to avoid stacking context */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 top-20 bg-ds-bg flex flex-col z-150 lg:hidden overflow-hidden"
          >
            {/* Premium Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute inset-0 bg-gradient-radial from-ds-blue/10 via-transparent to-transparent opacity-50" />
              <div className="absolute -right-20 -top-20 w-96 h-96 bg-ds-indigo/10 blur-[120px] rounded-full" />
              <div className="absolute -left-20 bottom-20 w-80 h-80 bg-ds-cyan/10 blur-[100px] rounded-full" />
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
              <motion.div
                animate={{ y: ['0%', '100%'] }}
                transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                className="absolute inset-x-0 h-[2px] bg-linear-to-r from-transparent via-ds-blue/20 to-transparent z-0"
              />
            </div>

            <div className="relative z-10 flex flex-col h-full p-8 pt-10">
              <div className="flex flex-col gap-2">
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 0.4, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-[10px] font-black uppercase tracking-[0.5em] text-ds-blue mb-4"
                >
                  Navigation_Protocol
                </motion.span>
                {navLinks.map((link, idx) => {
                  const isActive = pathname === link.path
                  const Icon = link.name === 'Home' ? Zap :
                               link.name === 'Seek' ? Search :
                               link.name === 'Compare' ? Target :
                               link.name === 'Blog' ? Activity : Zap
                  return (
                    <motion.div
                      key={link.path}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + (idx * 0.08), type: 'spring', damping: 20 }}
                    >
                      <Link
                        href={link.path}
                        className={`group relative py-6 border-b border-white/5 flex items-center justify-between transition-all ${isActive ? 'text-ds-blue' : 'text-white/70 hover:text-white'}`}
                      >
                        <div className="flex items-center gap-6">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${isActive ? 'bg-ds-blue/10 border-ds-blue/30 scale-110 shadow-[0_0_20px_rgba(96,165,250,0.2)]' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                            <Icon className={`w-6 h-6 ${isActive ? 'text-ds-blue' : 'text-ds-text-dim group-hover:text-white'}`} />
                          </div>
                          <span className="text-4xl font-black uppercase tracking-widest">{link.name}</span>
                        </div>
                        <ChevronRight className={`w-6 h-6 transition-transform ${isActive ? 'opacity-100 translate-x-0' : 'opacity-20 -translate-x-4 group-hover:translate-x-0 group-hover:opacity-100'}`} />
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 -ms-8 w-1 h-12 bg-ds-blue shadow-[0_0_15px_rgba(96,165,250,0.8)]" />
                        )}
                      </Link>
                    </motion.div>
                  )
                })}
              </div>

              <div className="mt-auto space-y-10">
                {user && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-5 p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl relative overflow-hidden group/card"
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-ds-blue/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                    <img src={user.photoURL || ''} alt="" className="w-14 h-14 rounded-xl border border-white/20 relative z-10" />
                    <div className="relative z-10">
                      <p className="font-black uppercase tracking-widest text-xl text-white">{user.displayName?.split(' ')[0]}</p>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-ds-blue/20 text-ds-blue rounded border border-ds-blue/30 inline-block mt-1">
                        {appUser?.tier === 'Pro' ? 'Pro' : 
                         appUser?.tier === 'Standard' ? 'Standard' : 
                         'Free'} Tier
                      </span>
                    </div>
                    <button onClick={logout} className="ml-auto p-4 bg-ds-red/10 text-ds-red rounded-2xl hover:bg-ds-red hover:text-white transition-all relative z-10">
                      <LogOut className="w-6 h-6" />
                    </button>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-6"
                >
                  <div className={`flex flex-col gap-4 bg-white/5 border ${systemStatus === 'Live' ? 'border-white/10' : 'border-ds-red/30'} p-5 rounded-3xl backdrop-blur-md`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${statusColor} animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.1)]`} />
                      <span className="text-sm font-black uppercase tracking-[0.2em] text-white">System: {systemStatus === 'Live' ? 'Core Online' : systemStatus.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-ds-text-dim tracking-widest pt-2 border-t border-white/5">
                      <span>Last Signal Received</span>
                      <span className="text-white">{relativeTime}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-ds-text-dim opacity-40">Protocol v1.7.2 Final | SA_NODE_01</p>
                    <div className="w-12 h-0.5 bg-white/10 rounded-full" />
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
