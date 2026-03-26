import React from 'react'

export default function SizeBadge({ size, className = "" }: { size: string, className?: string }) {
  const getStyle = (s: string) => {
    const n = parseFloat(s.replace(/[^0-9.]/g, ''))
    if (isNaN(n)) return 'bg-white/5 text-ds-text-dim border-white/10'
    const baseBg = 'bg-[#0d0f14] shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]'
    if (n <= 5) return `${baseBg} text-ds-indigo border-ds-indigo-border/50 shadow-[0_0_15px_rgba(129,140,248,0.08)]`
    if (n <= 8) return `${baseBg} text-ds-blue border-ds-blue-border/50 shadow-[0_0_15px_rgba(96,165,250,0.08)]`
    if (n <= 10) return `${baseBg} text-ds-cyan border-ds-cyan-border/50 shadow-[0_0_15px_rgba(34,211,238,0.08)]`
    if (n <= 12) return `${baseBg} text-ds-orange border-ds-orange-border/50 shadow-[0_0_15px_rgba(251,146,60,0.08)]`
    return `${baseBg} text-ds-red border-ds-red-border/50 shadow-[0_0_15px_rgba(239,68,68,0.08)]`
  }
  
  return (
    <div className={`min-w-[42px] px-3 h-10 rounded-2xl flex items-center justify-center text-[11px] font-black border-2 transition-all cursor-default whitespace-nowrap ${getStyle(size)} ${className}`}>
      {size}
    </div>
  )
}
