'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, 
  Target, 
  Activity, 
  Shield, 
  ChevronRight, 
  ArrowRight, 
  Star, 
  ExternalLink, 
  Globe, 
  TrendingUp, 
  Bell, 
  Database, 
  Monitor, 
  Search, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Cpu, 
  Layers, 
  Filter, 
  RefreshCcw, 
  HardDrive, 
  Power,
  DollarSign
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, onSnapshot, updateDoc, doc, writeBatch, query, orderBy, limit, addDoc, deleteDoc, where, serverTimestamp } from 'firebase/firestore'
import { formatDistanceToNow } from 'date-fns'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/AuthContext'

interface Node {
  id: string
  node_name: string
  status: 'online' | 'offline' | 'active' | 'idle'
  last_seen: any
  active_stores: string[]
  scraping_speed: 'idle' | 'anticipation' | 'sniper'
  is_active: boolean
  version: string
  platform: string
}

const STORES = [
  "Shelflife", 
  "Jack Lemkus", 
  "Archive", 
  "Amazon", 
  "Court Order", 
  "The Plug and Play", 
  "Soul Gallery", 
  "Cape Union Mart"
]

interface HiveSignal {
  id: string
  product_title: string
  store: string
  soh: number
  node_id: string
  detected_at: any
}

interface SniperTask {
  id: string
  keywords: string[]
  stores?: string[]
  is_active: boolean
  source: 'wishlist' | 'manual' | 'node_sync' | 'cloud_sync'
  label?: string
  name?: string
  status?: string
}

export default function NodeDashboard() {
  const { user, appUser } = useAuth()
  const [nodes, setNodes] = useState<Node[]>([])
  const [hiveSignals, setHiveSignals] = useState<HiveSignal[]>([])
  const [tasks, setTasks] = useState<SniperTask[]>([])
  const [wishlist, setWishlist] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'fleet' | 'tasks' | 'settings'>('fleet')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'offline'>('all')
  const [masterSpeed, setMasterSpeed] = useState<'idle' | 'anticipation' | 'sniper' | null>(null)

  // Task Creation State
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [newTaskKeywords, setNewTaskKeywords] = useState('')
  const [newTaskLabel, setNewTaskLabel] = useState('')

  useEffect(() => {
    // 1. Sync Fleet Nodes (Pro: Personal Fleet | Standard: Global Collective)
    const isPro = appUser?.tier === 'Pro' || appUser?.tier === 'Elite' || appUser?.tier === 'Admin'
    
    // If Pro, show YOUR nodes. If Standard, show EVERYONE'S nodes (The Collective).
    const nodesQuery = isPro
      ? query(collection(db, "active_nodes"), where("owner_email", "==", user?.email))
      : query(collection(db, "active_nodes")) // Standard users leverage the Hive

    const unsubNodes = onSnapshot(nodesQuery, (snapshot) => {
      const nodeList: Node[] = []
      snapshot.forEach((doc) => nodeList.push({ id: doc.id, ...doc.data() } as Node))
      setNodes(nodeList)
      setLoading(false)
    }, (error) => {
       console.error("Firebase Nodes Error:", error)
    })

    // 2. Sync Hive Signals
    const unsubSignals = onSnapshot(query(collection(db, "hive_signals"), orderBy("detected_at", "desc"), limit(15)), (snapshot) => {
      const signalList: HiveSignal[] = []
      snapshot.forEach((doc) => signalList.push({ id: doc.id, ...doc.data() } as HiveSignal))
      setHiveSignals(signalList)
    }, (error) => {
       console.error("Firebase Signals Error:", error)
    })

    // 3. Sync Manual Sniper Tasks
    const unsubTasks = onSnapshot(query(collection(db, "sniper_tasks")), (snapshot) => {
      const taskList: SniperTask[] = []
      snapshot.forEach((doc) => taskList.push({ id: doc.id, ...doc.data() } as SniperTask))
      setTasks(taskList)
    }, (error) => {
       console.error("Firebase Tasks Error:", error)
    })

    // 4. Sync Personal Wishlist (for visualization)
    const unsubWishlist = onSnapshot(query(collection(db, "user_alerts"), where("user_email", "==", user?.email)), (snapshot) => {
        setWishlist(snapshot.docs.map(doc => doc.data().product_title || doc.data().product_name))
    }, (error) => {
       console.error("Firebase Wishlist Error:", error)
    })

    return () => { unsubNodes(); unsubSignals(); unsubTasks(); unsubWishlist(); }
  }, [user, appUser?.tier])

  // Unified active hunts (Merged view for the user)
  const isPro = appUser?.tier === 'Pro' || appUser?.tier === 'Elite' || appUser?.tier === 'Admin'

  const activeHunts = [
    ...(isPro ? tasks : []).map(t => ({ 
      id: t.id, 
      label: t.label || t.name, 
      keywords: t.keywords || [], 
      source: 'node_sync', 
      is_active: t.is_active ?? (t.status === 'active')
    })),
    ...wishlist.filter(w => !tasks.some(t => t.label === w || t.name === w)).map((w, idx) => ({ 
      id: `wish_${idx}`, 
      label: w, 
      keywords: [w.toLowerCase()], 
      source: 'cloud_sync', 
      is_active: true 
    }))
  ]

  const handleAddTask = async () => {
    if (!newTaskKeywords) return
    const kwArray = newTaskKeywords.split(',').map(k => k.trim()).filter(Boolean)
    await addDoc(collection(db, "sniper_tasks"), {
       label: newTaskLabel || kwArray[0],
       keywords: kwArray,
       is_active: true,
       source: 'manual',
       created_at: serverTimestamp()
    })
    setNewTaskKeywords(''); setNewTaskLabel(''); setShowTaskModal(false)
  }

  const toggleTask = async (taskId: string, current: boolean) => {
    await updateDoc(doc(db, "sniper_tasks", taskId), { is_active: !current })
  }

  const deleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, "sniper_tasks", taskId))
  }

  const updateNode = async (nodeId: string, updates: Partial<Node>) => {
    const nodeRef = doc(db, "active_nodes", nodeId)
    await updateDoc(nodeRef, updates)
  }

  const setGlobalSpeed = async (speed: 'idle' | 'anticipation' | 'sniper') => {
    setMasterSpeed(speed)
    const batch = writeBatch(db)
    nodes.forEach((node) => {
      const nodeRef = doc(db, "active_nodes", node.id)
      batch.update(nodeRef, { scraping_speed: speed })
    })
    await batch.commit()
  }

  const toggleStore = async (node: Node, store: string) => {
    const nodeActiveStores = node.active_stores || []
    const newStores = nodeActiveStores.includes(store)
      ? nodeActiveStores.filter(s => s !== store)
      : [...nodeActiveStores, store]
    await updateNode(node.id, { active_stores: newStores })
  }

  const filteredNodes = nodes.filter(n => {
    const lastSeenMillis = n.last_seen?.toMillis?.() || 0
    const isOnline = lastSeenMillis && (Date.now() - lastSeenMillis) < 120000 
    if (filter === 'active') return isOnline && (n.status === 'active' || n.status === 'online')
    if (filter === 'offline') return !isOnline
    return true
  })

  const stats = {
    total: nodes.length,
    online: nodes.filter(n => {
        const lastSeenMillis = n.last_seen?.toMillis?.() || 0
        return lastSeenMillis && (Date.now() - lastSeenMillis) < 120000
    }).length,
    active: nodes.filter(n => n.status === 'active').length,
    hits: nodes.reduce((acc, n) => acc + ((n as any).stats?.hits || 0), 0)
  }

  return (
    <div className="bg-[#0f1115] text-white min-h-screen selection:bg-ds-blue/30 font-sans pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-32">
        
        {/* 📋 PART 1: THE INTELLIGENCE JOURNEY */}
        <section className="mb-32">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="max-w-4xl mb-20"
           >
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-ds-blue/5 border border-ds-blue/20 mb-8 backdrop-blur-xl">
                 <Shield className="w-4 h-4 text-ds-blue" />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-ds-blue">Distributed_Sniper_Hive_v1.8</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tight leading-[0.9] mb-8">
                 Distributed <br /> <span className="text-ds-blue">Snipe Fleet.</span>
              </h1>
               <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-2xl mb-12">
                  SoleSeek isn’t just a website—it’s a global network of distributed monitoring nodes. 
                  By spreading our intelligence across a fleet, we bypass retail defenses and achieve 
                  detection speeds previously reserved for enterprise-grade bots.
               </p>

               <div className="flex flex-wrap gap-6">
                  <button 
                    onClick={() => document.getElementById('fleet-control')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-10 py-4 bg-ds-blue text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-ds-blue/20 hover:scale-105 transition-all"
                  >
                     DEPLOY_FIRST_NODE
                  </button>
                  <button className="px-10 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-white/10 transition-all">
                     VIEW_FLEET_WHITEPAPER
                  </button>
               </div>
           </motion.div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { 
                  title: '10x Faster Detection', 
                  desc: 'A single monitor is limited by IP bans. A fleet of 10 nodes rotates scraping every second, ensuring you see restocks before the server even registers the change.',
                  icon: Zap,
                  color: 'text-ds-blue',
                  shadow: 'shadow-ds-blue/10'
                },
                { 
                  title: 'Geographic Dominance', 
                  desc: 'Our nodes are strategically positioned near store data centers. This "Direct-to-Cart" proximity wins the millisecond race during high-heat sneaker drops.',
                  icon: Globe,
                  color: 'text-ds-green',
                  shadow: 'shadow-ds-green/10'
                },
                { 
                  title: 'Hive Pivot Protocol', 
                  desc: 'When one node detects stock, it broadcasts a Hive Signal to the entire network. All other nodes instantly pivot to prioritize that item for full-spectrum monitoring.',
                  icon: Activity,
                  color: 'text-ds-red',
                  shadow: 'shadow-ds-red/10'
                }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className={`bg-[#1a1c22]/40 border border-white/5 p-8 rounded-[40px] hover:border-white/10 transition-all group ${item.shadow}`}
                >
                   <div className={`w-14 h-14 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center ${item.color} mb-8 group-hover:scale-110 transition-transform`}>
                      <item.icon className="w-7 h-7" />
                   </div>
                   <h3 className="text-xl font-black uppercase italic tracking-tight mb-4">{item.title}</h3>
                   <p className="text-gray-500 text-sm leading-relaxed font-medium">{item.desc}</p>
                </motion.div>
              ))}
           </div>

           {/* 🛡️ DEEP TECHNICAL INTEL (For Serious Snipers) */}
           <motion.div 
             initial={{ opacity: 0 }}
             whileInView={{ opacity: 1 }}
             viewport={{ once: true }}
             className="mt-32 bg-ds-blue/5 border border-ds-blue/20 rounded-[50px] p-12 md:p-20 relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                 <Shield className="w-64 h-64 text-ds-blue" />
              </div>

              <div className="relative z-10">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 bg-ds-blue/20 rounded-xl flex items-center justify-center text-ds-blue">
                       <Database className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-ds-blue">Deep_Technical_Intel_v1.8</span>
                 </div>

                 <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tight leading-none mb-12">
                   Why The Hive <br /><span className="text-ds-blue">Pivots Immediately.</span>
                 </h2>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-12">
                       {[
                         {
                           title: 'Multi-Size Stock Resilience',
                           desc: 'If Node A detects a Size 11 restock, the Hive Pivot directs all 9 other nodes to that specific Product Page. This ensures that if Sizes 8, 9, or 12 drop seconds later, the fleet is already "camping" the URL to catch them. We achieve 100% size coverage across all proxies simultaneously.'
                         },
                         {
                           title: 'Ghost-Stock Verification',
                           desc: 'Retailers often trigger "Ghost" restocks where items appear but fail at Add-To-Cart. The Hive Pivot provides 10 unique verification points. If 1 node fails but 4 nodes succeed, the system identifies the successful Proxy/Session combination, giving you the win.'
                         }
                       ].map((item, id) => (
                         <div key={id} className="group">
                            <h4 className="text-ds-blue text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-3 italic">
                               <div className="w-1.5 h-1.5 bg-ds-blue rounded-full" />
                               {item.title}
                            </h4>
                            <p className="text-gray-400 text-sm leading-relaxed max-w-lg group-hover:text-gray-300 transition-colors">{item.desc}</p>
                         </div>
                       ))}
                    </div>

                    <div className="space-y-12">
                       {[
                         {
                           title: 'Detection Continuity (The IP Shield)',
                           desc: 'Boutique anti-bot systems target high-frequency "hot" IPs during drops. The original detecting node is most at risk of an immediate ban. The Hive Pivot transfers the "eyes" to fresh nodes in the fleet, ensuring that even if the primary node goes blind, the connection remains alive.'
                         },
                         {
                           title: 'Parallel ATC Reservation',
                           desc: 'While you open the checkout page, the Hive fleet attempts Node-side Add-To-Cart (ATC) in the background. If your browser gets hit with a queue or a crash, one of your remote nodes may have already "reserved" the item through its unique session, providing a fail-safe checkout path.'
                         }
                       ].map((item, id) => (
                         <div key={id} className="group">
                            <h4 className="text-ds-blue text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-3 italic text-right justify-end">
                               {item.title}
                               <div className="w-1.5 h-1.5 bg-ds-blue rounded-full" />
                            </h4>
                            <p className="text-gray-400 text-sm leading-relaxed max-w-lg group-hover:text-gray-300 transition-colors text-right ml-auto">{item.desc}</p>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </motion.div>
        </section>

        <div className="h-px bg-linear-to-r from-transparent via-white/5 to-transparent mb-32" />

            {/* 📋 PART 2: THE COMMAND BRIDGE (HIVE UI) */}
        <section id="fleet-control" className="mb-40">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <div>
                 <div className="flex items-center gap-3 mb-4">
                    <Activity className="w-5 h-5 text-ds-blue animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-ds-blue">Current_Fleet_Telemetry</span>
                 </div>
                 <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">Command <span className="text-white">Bridge.</span></h2>
              </div>

              {/* 📊 Rapid Stats */}
              <div className="flex flex-wrap gap-4 md:gap-12 bg-white/5 border border-white/10 p-8 rounded-[35px] backdrop-blur-2xl">
                 <div className="text-left">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Total_Workforce</span>
                    <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-black text-white">{stats.total}</span>
                       <span className="text-[10px] font-black text-ds-blue uppercase">Nodes</span>
                    </div>
                 </div>
                 <div className="w-px h-12 bg-white/10 hidden md:block" />
                 <div className="text-left">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Live_Units</span>
                    <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-black text-ds-blue">{stats.online}</span>
                       <span className="text-[10px] font-black text-ds-blue uppercase tracking-widest">Online</span>
                    </div>
                 </div>
                 <div className="w-px h-12 bg-white/10 hidden md:block" />
                 <div className="text-left">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Global_Hits</span>
                    <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-black text-white">{stats.hits}</span>
                       <span className="text-[10px] font-black text-ds-indigo uppercase tracking-widest animate-pulse">Checkouts</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* 🕹️ Interface Controls */}
           <div className="flex flex-col lg:flex-row gap-12">
              <div className="flex-1">
                 {/* 📑 Tab Switcher */}
                 <div className="flex gap-4 mb-10 p-1.5 bg-white/2 border border-white/5 rounded-2xl w-fit">
                    {(['fleet', 'tasks', 'settings'] as const).map((tab) => (
                       <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
                             activeTab === tab ? 'bg-ds-blue text-white shadow-xl shadow-ds-blue/20' : 'text-gray-500 hover:text-white'
                          }`}
                       >
                          {tab === 'fleet' ? 'Active_Fleet' : tab === 'tasks' ? 'Sniper_Tasks' : 'Fleet_Settings'}
                       </button>
                    ))}
                 </div>

                 <AnimatePresence mode="wait">
                    {activeTab === 'fleet' ? (
                       <motion.div 
                          key="fleet" 
                          initial={{ opacity: 0, x: -20 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-6"
                       >
                          {filteredNodes.length === 0 ? (
                             <div className="p-20 border border-dashed border-white/10 rounded-[40px] text-center bg-white/1">
                                <Monitor className="w-12 h-12 text-gray-700 mx-auto mb-6" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-2">No Active Nodes Detected</h3>
                                <p className="text-xs text-gray-600 max-w-xs mx-auto">Download the Sniper Hub binary to deploy your first local monitoring node.</p>
                             </div>
                          ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredNodes.map((node) => (
                                   <div 
                                      key={node.id}
                                      className="p-8 bg-white/2 border border-white/5 rounded-[35px] hover:border-white/20 transition-all group relative overflow-hidden"
                                   >
                                      {/* Status Aura */}
                                      <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-20 pointer-events-none transition-colors ${
                                         node.status === 'online' || node.status === 'active' ? 'bg-ds-blue' : 'bg-ds-red/30'
                                      }`} />

                                      <div className="flex items-center justify-between mb-8 relative z-10">
                                         <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                               node.status === 'online' || node.status === 'active' ? 'bg-ds-blue/10 border-ds-blue/30 text-ds-blue' : 'bg-white/5 border-white/10 text-gray-600'
                                            }`}>
                                               <Monitor className="w-6 h-6" />
                                            </div>
                                            <div>
                                               <h4 className="font-black uppercase text-sm tracking-tight">{node.node_name || 'Generic_Node'}</h4>
                                               <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 opacity-60">{node.platform || 'STATION'} // v{node.version || '1.0'}</span>
                                            </div>
                                         </div>
                                         <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-white/10 rounded-full">
                                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                               node.status === 'online' || node.status === 'active' ? 'bg-ds-blue shadow-[0_0_8px_cyan]' : 'bg-gray-700'
                                            }`} />
                                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">{node.status}</span>
                                         </div>
                                      </div>

                                      {/* Store Grid */}
                                      <div className="grid grid-cols-2 gap-3 mb-8">
                                         {STORES.slice(0, 4).map(store => (
                                            <button 
                                               key={store}
                                               onClick={() => toggleStore(node, store)}
                                               className={`p-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${
                                                  (node.active_stores || []).includes(store)
                                                     ? 'bg-ds-blue/10 border-ds-blue/30 text-ds-blue shadow-lg shadow-ds-blue/5'
                                                     : 'bg-white/2 border-white/5 text-gray-600 hover:border-white/20'
                                               }`}
                                            >
                                               {store}
                                            </button>
                                         ))}
                                      </div>

                                      <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                         <div className="flex gap-4">
                                            <div className="text-left">
                                               <span className="text-[8px] font-black uppercase text-gray-600 block mb-1 tracking-widest">CPU_Load</span>
                                               <span className="text-[10px] font-mono text-gray-400">12%</span>
                                            </div>
                                            <div className="text-left">
                                               <span className="text-[8px] font-black uppercase text-gray-600 block mb-1 tracking-widest">Proxy_Lat</span>
                                               <span className="text-[10px] font-mono text-ds-blue">142ms</span>
                                            </div>
                                         </div>
                                         <button 
                                            onClick={() => setActiveTab('settings')}
                                            className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/30 transition-all"
                                         >
                                            <Settings className="w-4 h-4" />
                                         </button>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          )}
                       </motion.div>
                    ) : activeTab === 'tasks' ? (
                       <motion.div 
                          key="tasks" 
                          initial={{ opacity: 0, x: 20 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-6"
                       >
                          <div className="grid grid-cols-1 gap-4">
                             {activeHunts.map((hunt) => (
                                <div key={hunt.id} className="p-6 bg-white/2 border border-white/5 rounded-[30px] flex items-center justify-between group hover:border-white/20 transition-all">
                                   <div className="flex items-center gap-6">
                                      <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 ${hunt.is_active ? 'text-ds-red shadow-lg shadow-ds-red/5' : 'text-gray-700'}`}>
                                         <Target className={`w-6 h-6 ${hunt.is_active ? 'animate-pulse' : ''}`} />
                                      </div>
                                      <div>
                                         <h4 className={`text-sm font-black uppercase italic tracking-tight ${hunt.is_active ? 'text-white' : 'text-gray-500'}`}>{hunt.label}</h4>
                                         <div className="flex gap-2 mt-1">
                                            {hunt.keywords.map(kw => (
                                               <span key={kw} className="text-[8px] font-black uppercase tracking-widest text-gray-600 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{kw}</span>
                                            ))}
                                         </div>
                                      </div>
                                   </div>
                                   
                                   <div className="flex items-center gap-4">
                                      <button 
                                        onClick={() => hunt.source === 'manual' && toggleTask(hunt.id, hunt.is_active)}
                                        className={`px-6 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                                         hunt.is_active 
                                            ? 'bg-ds-red/10 border-ds-red/30 text-ds-red' 
                                            : 'bg-white/5 border-white/10 text-gray-600 hover:border-white/20'
                                      }`}>
                                         {hunt.is_active ? 'ACTIVE_HUNT' : 'STANDBY'}
                                      </button>
                                      {hunt.source === 'manual' && (
                                         <button onClick={() => deleteTask(hunt.id)} className="p-2 text-gray-700 hover:text-ds-red transition-colors">
                                            <RefreshCcw className="w-4 h-4" />
                                         </button>
                                      )}
                                   </div>
                                </div>
                             ))}
                             
                             <button 
                                onClick={() => setShowTaskModal(true)}
                                className="w-full p-8 border-2 border-dashed border-white/5 rounded-[30px] flex items-center justify-center gap-4 text-gray-600 hover:text-white hover:border-white/20 transition-all group"
                             >
                                <Zap className="w-5 h-5 group-hover:text-ds-blue transition-colors" />
                                <span className="font-black uppercase text-[10px] tracking-[0.3em]">Deploy_New_Sniper_Protocol</span>
                             </button>
                          </div>
                       </motion.div>
                    ) : (
                       <motion.div 
                          key="settings" 
                          initial={{ opacity: 0, scale: 0.95 }} 
                          animate={{ opacity: 1, scale: 1 }} 
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="space-y-12"
                       >
                          {/* 📡 Operational Mode Selector */}
                          <div className="bg-white/2 border border-white/5 rounded-[40px] p-10">
                              <div className="flex items-center gap-4 mb-8">
                                 <div className="w-10 h-10 bg-ds-blue/10 rounded-xl flex items-center justify-center text-ds-blue">
                                    <Activity className="w-5 h-5" />
                                 </div>
                                 <h3 className="text-xl font-black uppercase italic tracking-tight">Fleet_Operational_Mode</h3>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                 {[
                                    { mode: 'idle', label: 'Idle_Standby', freq: '1hr Intervals', cost: 'R0.00', icon: Clock, desc: 'Passive monitoring for site-wide updates. Lowest impact.' },
                                    { mode: 'anticipation', label: 'Anticipation', freq: '60s Intervals', cost: 'R0.63', icon: Activity, desc: 'Active monitoring for high-heat drop windows. IP_ROTATION_ENABLED.' },
                                    { mode: 'sniper', label: 'Sniper_Protocol', freq: '0.5s Intervals', cost: 'R72.00', icon: Zap, desc: 'Extreme sub-second polling for immediate ATC. IP_SHIELD_ACTIVE.' }
                                 ].map((m) => (
                                    <button 
                                       key={m.mode}
                                       onClick={() => setGlobalSpeed(m.mode as any)}
                                       className={`p-8 rounded-[35px] border text-left transition-all relative overflow-hidden group ${
                                          masterSpeed === m.mode || nodes.every(n => n.scraping_speed === m.mode)
                                             ? 'bg-ds-blue border-white/10 text-white shadow-2xl shadow-ds-blue/20'
                                             : 'bg-white/2 border-white/5 text-gray-500 hover:border-white/20'
                                       }`}
                                    >
                                       <div className="flex items-center justify-between mb-6">
                                          <m.icon className={`w-8 h-8 ${masterSpeed === m.mode || nodes.every(n => n.scraping_speed === m.mode) ? 'text-white' : 'text-ds-blue/40 group-hover:text-ds-blue'} transition-colors`} />
                                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{m.freq}</span>
                                       </div>
                                       <h4 className="text-sm font-black uppercase tracking-widest mb-2">{m.label}</h4>
                                       <p className="text-[10px] font-medium leading-relaxed mb-6 opacity-60">{m.desc}</p>
                                       <div className={`p-3 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest border ${
                                          masterSpeed === m.mode || nodes.every(n => n.scraping_speed === m.mode)
                                          ? 'bg-white/10 border-white/20'
                                          : 'bg-white/5 border-white/10'
                                       }`}>
                                          {m.cost} <span className="opacity-40">/ Node / HR</span>
                                       </div>
                                    </button>
                                 ))}
                              </div>
                          </div>

                          {/* 📊 Real-Time Cost Analysis */}
                          <div className="bg-ds-blue/5 border border-ds-blue/20 rounded-[40px] p-10 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                 <DollarSign className="w-48 h-48 text-ds-blue" />
                              </div>

                              <div className="relative z-10">
                                 <div className="flex items-center justify-between mb-12">
                                    <div>
                                       <div className="flex items-center gap-3 mb-2">
                                          <TrendingUp className="w-4 h-4 text-ds-blue" />
                                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-ds-blue">Economic_Transparency</span>
                                       </div>
                                       <h3 className="text-4xl font-black uppercase italic tracking-tighter">Fleet_Cost_Analysis.</h3>
                                    </div>

                                    <div className="text-right">
                                       <div className="flex items-center gap-2 mb-1 justify-end">
                                          <Shield className="w-3 h-3 text-ds-blue" />
                                          <span className="text-[9px] font-black uppercase text-ds-text-dim block">Tactical IP Protection</span>
                                       </div>
                                       <span className="text-2xl font-black text-white">R150 <span className="text-ds-blue text-xs">/ GB</span></span>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                    <div className="p-6 bg-black/40 border border-white/10 rounded-3xl">
                                       <span className="text-[9px] font-black uppercase text-gray-500 block mb-2">Active_Fleet_Size</span>
                                       <div className="text-2xl font-black text-white">{nodes.length} <span className="text-[10px] text-ds-blue">Nodes</span></div>
                                    </div>
                                    <div className="p-6 bg-black/40 border border-white/10 rounded-3xl">
                                       <span className="text-[9px] font-black uppercase text-gray-500 block mb-2">Current_Polling_Mode</span>
                                       <div className="text-2xl font-black text-white uppercase italic tracking-tighter">{masterSpeed || nodes[0]?.scraping_speed || 'Idle'}</div>
                                    </div>
                                    <div className="p-6 bg-black/40 border border-white/10 rounded-3xl">
                                       <span className="text-[9px] font-black uppercase text-gray-500 block mb-2">Estimated_Data_Usage</span>
                                       <div className="text-2xl font-black text-ds-blue">
                                          {(() => {
                                             const speed = masterSpeed || nodes[0]?.scraping_speed || 'idle'
                                             const mbPerHr = speed === 'sniper' ? 480 : speed === 'anticipation' ? 4.2 : 0.1
                                             const totalMb = mbPerHr * nodes.length
                                             return totalMb >= 1000 ? `${(totalMb / 1000).toFixed(2)} GB` : `${totalMb.toFixed(1)} MB`
                                          })()} <span className="text-[10px] text-gray-500">/ Hr</span>
                                       </div>
                                    </div>
                                    <div className="p-6 bg-ds-blue/10 border border-ds-blue/40 rounded-3xl shadow-xl shadow-ds-blue/10">
                                       <span className="text-[9px] font-black uppercase text-ds-blue block mb-2">Net_Burn_Rate</span>
                                       <div className="text-2xl font-black text-white">
                                          R{(() => {
                                             const speed = masterSpeed || nodes[0]?.scraping_speed || 'idle'
                                             const costPerNode = speed === 'sniper' ? 72.00 : speed === 'anticipation' ? 0.63 : 0
                                             return (costPerNode * nodes.length).toFixed(2)
                                          })()} <span className="text-[10px] text-ds-blue">/ Hr</span>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-dashed border-white/10 flex items-center gap-6">
                                    <Shield className="w-6 h-6 text-ds-blue" />
                                    <p className="text-[11px] font-medium text-gray-400">
                                       Economics optimized for <span className="text-white font-black italic">Pay-As-You-Go</span>. All high-frequency monitoring utilizes <span className="text-ds-blue font-bold tracking-widest uppercase">Rotating Residential Proxy Pools</span> to safeguard your home IP address from blacklisting.
                                    </p>
                                 </div>
                              </div>
                          </div>
                       </motion.div>
                    )}
                 </AnimatePresence>
              </div>

              {/* 📡 PART 3: LIVE HIVE SIGNALS */}
              <div className="w-full lg:w-96 shrink-0">
                 <div className="p-8 rounded-[40px] bg-[#1a1c22]/60 border border-white/5 backdrop-blur-3xl sticky top-32">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white italic">Hive_Signals</h3>
                       <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black uppercase text-ds-blue">LIVE_STREAM</span>
                          <div className="w-1.5 h-1.5 bg-ds-blue rounded-full animate-ping" />
                       </div>
                    </div>

                    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 scrollbar-hide">
                       {hiveSignals.length === 0 ? (
                          <div className="text-center py-20">
                             <RefreshCcw className="w-8 h-8 text-gray-800 mx-auto mb-4 animate-spin-slow" />
                             <span className="text-[8px] font-black uppercase tracking-widest text-gray-700">Awaiting Signal Frequency...</span>
                          </div>
                       ) : (
                          hiveSignals.map((signal) => (
                             <div key={signal.id} className="relative pl-6 border-l border-white/5 py-1 group">
                                <div className="absolute left-[-3.5px] top-1.5 w-1.5 h-1.5 bg-ds-blue rounded-full group-hover:scale-150 transition-transform" />
                                <div className="text-left">
                                   <div className="flex items-center justify-between mb-1">
                                      <span className="text-[9px] font-black uppercase text-ds-blue tracking-tighter">{signal.store}</span>
                                      <span className="text-[8px] font-medium text-gray-600">{signal.detected_at?.toMillis ? formatDistanceToNow(signal.detected_at.toMillis(), { addSuffix: true }) : 'Just Now'}</span>
                                   </div>
                                   <h5 className="text-[10px] font-black uppercase text-white tracking-widest line-clamp-1 leading-normal group-hover:text-ds-blue transition-colors">{signal.product_title}</h5>
                                   <div className="flex items-center gap-2 mt-2">
                                      <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[7px] text-gray-500 font-black uppercase">SOH: {signal.soh}</span>
                                      <span className="px-1.5 py-0.5 rounded bg-ds-blue/10 border border-ds-blue/20 text-[7px] text-ds-blue font-black uppercase">SIGNAL_STRENGTH: 100%</span>
                                   </div>
                                </div>
                             </div>
                          ))
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </section>
        {/* 🔮 Task Creation Modal */}
        <AnimatePresence>
           {showTaskModal && (
              <div className="fixed inset-0 z-150 flex items-center justify-center px-6">
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTaskModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1a1c22] border border-white/10 p-10 rounded-[40px] w-full max-w-lg relative z-20 shadow-2xl">
                    <h2 className="text-2xl font-black italic uppercase mb-2">INIT_SNIPE_PROTOCOL</h2>
                    <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-8">Deploying local node keyword targeting</p>
                    
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block ml-1">Task Label</label>
                          <input type="text" placeholder="e.g. Jordan 4 Military Blue" value={newTaskLabel} onChange={(e) => setNewTaskLabel(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-ds-red/40 transition-all font-black" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block ml-1">Keywords (Comma Separated)</label>
                          <textarea placeholder="Jordan 4, Military, Blue" value={newTaskKeywords} onChange={(e) => setNewTaskKeywords(e.target.value)} className="w-full h-32 bg-black/40 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-ds-red/40 transition-all font-black resize-none" />
                       </div>
                       <button onClick={handleAddTask} className="w-full py-5 bg-ds-red text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-ds-red/20 hover:scale-[1.02] transition-all">
                          ENGAGE_FLEET_PROTOCOL
                       </button>
                    </div>
                 </motion.div>
              </div>
           )}
        </AnimatePresence>

      </main>

      <Footer />
    </div>
  )
}
