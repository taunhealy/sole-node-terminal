'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Terminal, 
  Zap, 
  Activity, 
  ShieldAlert, 
  RefreshCcw, 
  ChevronRight, 
  Database, 
  Server,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Unplug
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const CLOUD_URL = "https://solenode-api-256432107914.africa-south1.run.app"
const AUTO_KEY = "SOLE_SEEK_AUTO_2026_TAC"

export default function GhostPilotPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    fetchStats()
  }, [])

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10))
  }

  const fetchStats = async () => {
    setLoading(true)
    try {
      const resp = await fetch(`${CLOUD_URL}/api/v1/automation/debug-stats`)
      const data = await resp.json()
      setStats(data)
      addLog("System telemetry retrieved successfully.")
    } catch (err) {
      addLog("ERROR: Infrastructure connection failed.")
    } finally {
      setLoading(false)
    }
  }

  const runFleetSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    addLog("⚡ INITIATING_FLEET_COMMAND_SYNC...")
    
    try {
      // 🛡️ TACTICAL_UPLINK: Sending both Header and Query fallback for maximum resilience
      const resp = await fetch(`${CLOUD_URL}/api/v1/automation/run-all?key=${AUTO_KEY}`, {
        method: 'GET',
        headers: {
          'X-Automation-Key': AUTO_KEY,
          'Accept': 'application/json'
        }
      })
      
      if (!resp.ok) throw new Error(`Status: ${resp.status}`)
      
      const data = await resp.json()
      setSyncResult(data)
      addLog(`✅ SYNC_COMPLETE: Drops=${data.drops_synced || 0}, SOTD=${data.sneaker_of_the_day || 'N/A'}`)
      fetchStats() 
    } catch (err: any) {
      addLog(`❌ SYNC_CRITICAL_FAILURE: ${err.message || 'Cloud unreachable'}`)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-ds-bg text-white selection:bg-ds-blueSelection">
      <Navbar />

      <main className="pt-32 pb-20 px-6 max-w-5xl mx-auto">
        {/* --- HEADER --- */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-ds-blue/10 flex items-center justify-center text-ds-blue border border-ds-blue/20">
              <Terminal className="w-5 h-5" />
            </div>
            <h1 className="text-4xl font-black italic uppercase italic tracking-tighter">
              GHOST_PILOT // <span className="text-ds-blue">COMMAND_HUB</span>
            </h1>
          </div>
          <p className="text-ds-text-dim max-w-2xl font-medium leading-relaxed uppercase text-[11px] tracking-widest pl-1">
            Manual override portal for SoleSeek Intelligence. Trigger fleet-wide synchronization, bypass scheduling, and audit real-time cloud inventory.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* --- LEFT: SYSTEM STATS --- */}
          <section className="lg:col-span-1 space-y-6">
            <div className="bg-ds-surface border border-white/5 rounded-[30px] p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Database className="w-20 h-20" />
              </div>
              
              <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2">
                <Server className="w-3 h-3 text-ds-blue" />
                CLOUD_INFRASTRUCTURE
              </h2>

              <div className="space-y-6">
                <div>
                  <span className="text-[9px] font-black text-ds-text-dim uppercase tracking-widest block mb-2">STOCK_TOTAL</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black italic tracking-tighter">{loading ? '---' : stats?.stock_total || 0}</span>
                    <span className="text-[10px] font-bold text-white/20 uppercase">Units_Logged</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-black text-ds-text-dim uppercase tracking-widest block mb-2">SOH_POSITIVE</span>
                  <div className="flex items-baseline gap-2 text-ds-green">
                    <span className="text-4xl font-black italic tracking-tighter">{loading ? '---' : stats?.soh_positive || 0}</span>
                    <span className="text-[10px] font-bold opacity-50 uppercase">Active_Assets</span>
                  </div>
                </div>

                <div className="h-px bg-white/5 my-4" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-white/40">DISCORD_UPLINK</span>
                    {stats?.env_discord !== "None" ? (
                      <span className="text-ds-green flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> ONLINE</span>
                    ) : (
                      <span className="text-ds-red flex items-center gap-1.5"><AlertCircle className="w-3 h-3" /> CRITICAL_OFFLINE</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-white/40">AI_GEN_MODEL</span>
                    {stats?.env_gemini !== "None" ? (
                      <span className="text-ds-green flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> READY</span>
                    ) : (
                      <span className="text-ds-red flex items-center gap-1.5"><AlertCircle className="w-3 h-3" /> MISSING_KEY</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={fetchStats}
              disabled={loading}
              className="w-full h-14 border border-white/5 hover:border-white/20 bg-ds-surface rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group font-black text-[11px] uppercase tracking-widest"
            >
              <RefreshCcw className={`w-4 h-4 text-ds-blue ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
              Refresh Telemetry
            </button>
          </section>

          {/* --- RIGHT: COMMAND CENTER --- */}
          <section className="lg:col-span-2 space-y-8">
            {/* Sync Terminal Card */}
            <div className="bg-ds-surface border border-white/5 rounded-[30px] p-10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-ds-blue/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-white/5 border border-white/10 rounded overflow-hidden">
                       <span className="text-[10px] font-black uppercase tracking-widest text-ds-blue">HIVE_ORCHESTRATOR_V1.9</span>
                    </div>
                  </div>
                  <h3 className="text-4xl font-black italic uppercase italic tracking-tighter leading-tight">
                    LAUNCH_FLEET_SYNC
                  </h3>
                  <p className="text-[11px] font-medium text-ds-text-dim leading-relaxed uppercase tracking-widest">
                    Manual override will trigger immediate scraping of all boutiques, AI selection of SOTD, and Discord broadcast alerts. High latency expected during execution (up to 90s).
                  </p>
                  
                  <button 
                    onClick={runFleetSync}
                    disabled={syncing}
                    className="h-16 w-full max-w-sm bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 hover:bg-ds-blue hover:text-white transition-all shadow-xl active:scale-95 disabled:bg-white/10 disabled:text-white/20"
                  >
                    {syncing ? (
                      <>
                        <RefreshCcw className="w-5 h-5 animate-spin" />
                        EXECUTING_SYNC...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        TRIGGER_NOW
                      </>
                    )}
                  </button>
                </div>

                <div className="w-full md:w-64 space-y-4">
                  <div className="bg-black/40 rounded-2xl p-6 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-white/40 uppercase">ENGINE_LOAD</span>
                      <div className="h-1 w-12 bg-white/10 rounded-full">
                         <motion.div 
                           animate={syncing ? { width: '90%' } : { width: '10%' }}
                           className="h-full bg-ds-blue"
                         />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] font-black text-white/40 uppercase">RETRY_COUNT</span>
                       <span className="text-[10px] font-black">0_DEFAULT</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] font-black text-white/40 uppercase">STATUS</span>
                       <span className={`text-[10px] font-black ${syncing ? 'text-ds-orange' : 'text-ds-green'}`}>
                         {syncing ? 'BUSY' : 'IDLE'}
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal Logs */}
            <div className="bg-black border border-white/10 rounded-2xl p-6 font-mono text-[11px] h-64 overflow-y-auto scrollbar-hide">
               <div className="flex items-center gap-2 mb-4 text-white/40 pb-2 border-b border-white/5">
                  <Activity className="w-3 h-3" />
                  <span className="uppercase tracking-[0.3em] font-bold pl-1">REALTIME_LOG_STREAM</span>
               </div>
               <div className="space-y-2">
                 {logs.length === 0 ? (
                   <div className="text-white/20 italic">Waiting for telemetry data...</div>
                 ) : (
                   logs.map((log, i) => (
                     <motion.div 
                       key={i} 
                       initial={{ opacity: 0, x: -10 }}
                       animate={{ opacity: 1, x: 0 }}
                       className={`${i === 0 ? 'text-ds-blue font-bold px-2 py-1 bg-ds-blue/10 rounded' : 'text-white/60 pl-2'}`}
                     >
                       {log}
                     </motion.div>
                   ))
                 )}
               </div>
            </div>

            {/* Result Visualizer */}
            <AnimatePresence>
              {syncResult && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-ds-blue/10 border border-ds-blue/30 rounded-3xl p-8"
                >
                   <div className="flex items-start gap-6">
                      <div className="w-16 h-16 rounded-[20px] bg-ds-blue flex items-center justify-center text-white shrink-0">
                         <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div className="flex-1">
                         <h4 className="text-xl font-black italic uppercase italic tracking-tighter mb-4">TACTICAL_PAYLOAD_DELIVERED</h4>
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div>
                               <span className="text-[9px] font-black text-white/40 uppercase block mb-1">DROPS_SYNCED</span>
                               <span className="text-2xl font-black italic text-white">{syncResult.drops_synced}</span>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                               <span className="text-[9px] font-black text-white/40 uppercase block mb-1">SELECTED_SOTD</span>
                               <span className="text-xl font-black italic text-ds-blue truncate block">
                                 {syncResult.sneaker_of_the_day || '---'}
                               </span>
                            </div>
                         </div>
                      </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
