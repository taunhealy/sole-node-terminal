'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'

export default function Navbar() {
  const pathname = usePathname()
  const canvasRef = useRef<HTMLDivElement>(null)
  
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Seek', path: '/seek' },
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
          <span className="font-black text-2xl tracking-tighter italic uppercase text-white">SOLE<span className="text-ds-blue">NODE</span>.io</span>
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

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-ds-blue-deep/30 border border-ds-blue-border/40 rounded-full">
             <div className="w-1.5 h-1.5 rounded-full bg-ds-green animate-pulse" />
             <span className="text-[10px] font-black text-ds-blue uppercase tracking-tighter">Nodes Active: 4</span>
          </div>
          <Link href="/seek" className="bg-ds-blue text-ds-bg px-6 py-2.5 rounded-full font-black uppercase text-xs hover:bg-white transition-all shadow-[0_0_20px_rgba(96,165,250,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]">
             Enter Terminal
          </Link>
        </div>
      </div>
    </nav>
  )
}
