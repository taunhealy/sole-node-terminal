import React from 'react'

export default function SizeBadge({ size, className = "" }: { size: string, className?: string }) {
  const getStyle = (s: string) => {
    const n = parseFloat(s.replace(/[^0-9.]/g, ''))
    if (isNaN(n)) return 'bg-white/5 text-ds-text-dim border-white/10'
    
    const baseClass = 'bg-[#0d0f14] shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]'
    
    // 🧠 Market Intelligence Color Coding
    if (n < 4) return `${baseClass} text-ds-text-dim/50 border-white/5 shadow-none` // Youth / Infant (Low Resale Relevancy)
    if (n >= 7 && n <= 10.5) return `${baseClass} text-yellow-500 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)]` // "Money Sizes" / High Relevancy
    if ((n >= 4 && n < 7) || (n >= 11 && n <= 13)) return `${baseClass} text-ds-indigo border-ds-indigo-border/40 shadow-[0_0_15px_rgba(129,140,248,0.1)]` // Core Sizes / Medium Relevancy
    
    return `${baseClass} text-ds-text-dim border-white/10` // Extremely large / atypical
  }
  
  return (
    <div className={`min-w-[42px] px-3 h-10 rounded-2xl flex items-center justify-center text-[11px] font-black border-2 transition-all cursor-default whitespace-nowrap ${getStyle(size)} ${className}`}>
      {size}
    </div>
  )
}
