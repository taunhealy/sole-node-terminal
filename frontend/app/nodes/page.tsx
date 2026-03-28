'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NodesRedirect() {
    const router = useRouter()
    useEffect(() => {
        router.replace('/snipe')
    }, [router])
    return (
        <div className="min-h-screen bg-ds-bg flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-ds-blue border-t-transparent rounded-full animate-spin" />
                <span className="text-white font-black uppercase tracking-widest text-[10px]">Re-routing Sniper Hub to Coordinate /SNIPE...</span>
            </div>
        </div>
    )
}
