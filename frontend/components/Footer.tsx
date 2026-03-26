'use client'

import React from 'react'
import { Zap, Shield, Target, Globe } from 'lucide-react'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-ds-bg border-t border-white/5 pt-20 pb-10 px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
        <div className="col-span-1 md:col-span-1">
          <Link href="/" className="flex items-center gap-3 mb-6 group">
            <Zap className="w-6 h-6 text-ds-blue fill-ds-blue" />
            <span className="font-black text-xl tracking-tighter uppercase italic text-white transition-colors group-hover:text-ds-indigo">SOLE<span className="text-ds-blue">SEEK</span></span>
          </Link>
          <p className="text-ds-text-dim text-sm leading-relaxed">
            Leading the sneaker intelligence revolution. Providing high-precision monitoring for the most exclusive drops across Africa and the globe.
          </p>
        </div>

        <div>
          <h4 className="font-black text-xs uppercase tracking-widest text-white mb-6">Platform</h4>
          <ul className="space-y-4 text-sm text-ds-text-dim">
            <li><Link href="/seek" className="text-white hover:text-ds-indigo transition-colors uppercase font-bold text-xs tracking-widest">The Terminal</Link></li>
            <li><a href="#" className="text-white hover:text-ds-indigo transition-colors uppercase font-bold text-xs tracking-widest">Monitor Status</a></li>
            <li><a href="#" className="text-white hover:text-ds-indigo transition-colors uppercase font-bold text-xs tracking-widest">Release Calendar</a></li>
            <li><a href="#" className="text-white hover:text-ds-indigo transition-colors uppercase font-bold text-xs tracking-widest">Supported Stores</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-black text-xs uppercase tracking-widest text-white mb-6">Company</h4>
          <ul className="space-y-4 text-sm text-ds-text-dim">
            <li><a href="#" className="text-white hover:text-ds-indigo transition-colors uppercase font-bold text-xs tracking-widest">About Us</a></li>
            <li><Link href="/blog" className="text-white hover:text-ds-indigo transition-colors uppercase font-bold text-xs tracking-widest">Blog</Link></li>
            <li><a href="#" className="text-white hover:text-ds-indigo transition-colors uppercase font-bold text-xs tracking-widest">Legal</a></li>
            <li><a href="#" className="text-white hover:text-ds-indigo transition-colors uppercase font-bold text-xs tracking-widest">Contact</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">
          © 2026 SOLE SEEK INTELLIGENCE. ALL RIGHTS RESERVED.
        </p>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-ds-green shadow-[0_0_8px_rgba(0,200,83,0.5)]" />
            <span className="text-[10px] text-ds-text-dim font-bold uppercase">System: Operational</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
