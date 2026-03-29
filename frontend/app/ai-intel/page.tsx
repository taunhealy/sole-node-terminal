'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, 
  Target, 
  MessageSquare, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  Shield, 
  Database,
  Search,
  ChevronRight,
  Bot,
  User,
  RefreshCw,
  LayoutDashboard,
  Star
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { db } from '@/lib/firebase'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  orderBy 
} from 'firebase/firestore'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/AuthContext'
import { doc, updateDoc, increment } from 'firebase/firestore'
import Link from 'next/link'

// Initialize Gemini (Hardcoded for dev testing as requested)
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyDimaZuD7ClHDTVDCgpRqF1us3Cqn3H8tY'
// Project: 256432107914
// Explicitly using 'v1' for compatibility with this project key
const genAI = new GoogleGenerativeAI(API_KEY)
// Explicitly using 'v1' for compatibility (if needed by your project version)
// Note: If you have an older SDK, you can also try specifying the version via environment variable

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_ACTIONS = [
  {
    title: "Best Flip Opportunity",
    query: "Identify the top 3 high-heat items for quick resale profit based on current demand.",
    icon: TrendingUp,
    color: "text-ds-green",
    bg: "bg-ds-green/10"
  },
  {
    title: "Early Access Intel",
    query: "Analyze latest blog/intel syncs for upcoming 'unreleased' heat not yet on shelves.",
    icon: Sparkles,
    color: "text-ds-blue",
    bg: "bg-ds-blue/10"
  },
  {
    title: "Scarcity Warning",
    query: "Which high-demand items have critically low SOH (below 3 units) globally?",
    icon: Target,
    color: "text-ds-red",
    bg: "bg-ds-red/10"
  },
  {
    title: "Hype vs Reality",
    query: "Compare current hive inventory against global hype trends to find sleep deals.",
    icon: LayoutDashboard,
    color: "text-white",
    bg: "bg-white/5"
  }
]

export default function AIRecommendations() {
  const { user, appUser, login } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInterfaceRef = useRef<HTMLDivElement>(null)
  const chatLogRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTo({
        top: chatLogRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // --- DATABASE QUERY TOOLS (Accessible by Gemini context or manually) ---
  const getStockData = async () => {
    const q = query(collection(db, "stock"), where("soh", ">", 0), limit(30))
    const snap = await getDocs(q)
    return snap.docs.map(doc => doc.data())
  }

  const getBlogTrends = async () => {
    const q = query(collection(db, "store_blogs"), orderBy("detected_at", "desc"), limit(5))
    const snap = await getDocs(q)
    return snap.docs.map(doc => doc.data())
  }
  
  const addToWishlist = async (title: string) => {
    if (!user?.email) {
      login()
      return
    }
    
    try {
      const q = query(collection(db, "user_alerts"), where("user_email", "==", user.email), where("product_title", "==", title))
      const snap = await getDocs(q)
      if (!snap.empty) {
        alert("Already in watchlist!")
        return
      }
      
      await updateDoc(doc(db, "users", user.email), {
        alerts_count: increment(1)
      })
      
      await updateDoc(doc(db, "user_alerts", `${user.email}_${title}`.replace(/\s+/g, '_')), {
         user_email: user.email,
         product_title: title,
         status: 'active',
         created_at: new Date()
      })
      
      alert(`Added ${title} to watchlist!`)
    } catch (e) {
      console.error(e)
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return


    // 0. Check Auth & Usage Limit
    if (!user) {
        login()
        return
    }

    const currentUsage = appUser?.ai_usage || 0
    const currentLimit = appUser?.ai_limit || 10

    if (currentUsage >= currentLimit) {
        setShowLimitModal(true)
        return
    }
    
    setInput('')
    const isFree = appUser?.tier === 'Free' || !appUser?.tier
    const credits = appUser?.ai_credits || 0
    const usage = appUser?.ai_usage || 0
    const limitCount = appUser?.ai_limit || 10

    if (isFree && credits <= 0 && usage >= limitCount) {
        setShowLimitModal(true)
        return
    }

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setIsTyping(true)

    try {
      // 1. Fetch relevant context data
      const stock = await getStockData()
      const blogs = await getBlogTrends()
      
      const contextPrompt = `
        You are SoleSeek AI Intelligence, an expert in sneaker reselling and market analysis.
        You have access to the current warehouse database and recent market blogs.
        
        CURRENT STOCK DATA:
        ${JSON.stringify(stock)}
        
        RECENT MARKET BLOGS:
        ${JSON.stringify(blogs)}
        
        USER QUESTION: ${text}
        
        INSTRUCTIONS:
        1. Target high-demand "heat" (Jordan, Bape, Yeezy, limited Nike drops).
        2. Prioritize low Stock-on-Hand (soh) items as they indicate high scarcity/velocity.
        3. Identify restocks (items recently updated in the hive).
        4. Provide tactical resale advice based on hype-demand, not just price-drops.
        5. YOU MUST INCLUDE THE DIRECT LINK (url) for each product you recommend.
        6. Format links exactly as [Secure_Item](url) for the purchase link.
        7. After the link, describe the item briefly.
      `

      const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
      const result = await model.generateContent(contextPrompt)
      const response = await result.response
      
      const assistantMsg: Message = { role: 'assistant', content: response.text() }
      setMessages(prev => [...prev, assistantMsg])

      // 2. Increment Usage in DB
      if (user?.email) {
          const userRef = doc(db, 'users', user.email)
          const updateObj: any = {
              ai_usage: increment(1)
          }
          if (appUser?.tier === 'Free' && (appUser?.ai_credits || 0) > 0) {
              updateObj.ai_credits = increment(-1)
          }
          await updateDoc(userRef, updateObj)
      }
    } catch (error: any) {
      console.error("SOLESEEK_AI_ERROR:", error)
      const errorMsg = error?.message || "Intelligence Link Interrupted."
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ERROR: ${errorMsg}\n\nEnsure your Gemini API Key is active in Google AI Studio.` }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="bg-[#0f1115] text-white min-h-screen selection:bg-ds-blue/30 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        
        {/* 📋 HEADER */}
        <section className="mb-20">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="max-w-4xl"
           >
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-ds-blue/5 border border-ds-blue/20 mb-8 backdrop-blur-xl">
                 <Bot className="w-4 h-4 text-ds-blue" />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-ds-blue">Gemini_Sniper_Intelligence_v1.0</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tight leading-[0.9] mb-8">
                 AI <span className="text-ds-blue">Recommendations.</span>
              </h1>
              <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-2xl">
                 Deep neural analysis of retail stock, price drops, and blog trends. 
                 Ask Gemini to pinpoint your next high-margin flip.
              </p>
           </motion.div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
           
           {/* 🛠️ LEFT: QUICK ACTION BUTTONS */}
           <div className="lg:col-span-3 space-y-6">
              <h3 className="text-sm font-black uppercase italic tracking-widest text-ds-blue flex items-center gap-3 px-2">
                 <LayoutDashboard className="w-4 h-4" />
                 Tactical_Shortcuts
              </h3>
              
              <div className="space-y-4">
                 {QUICK_ACTIONS.map((action, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ x: 10 }}
                      onClick={() => sendMessage(action.query)}
                      className="w-full bg-[#1a1c22]/50 border border-white/5 p-6 rounded-[30px] flex flex-col items-start gap-4 hover:border-white/20 hover:bg-white/5 transition-all group text-left relative overflow-hidden"
                    >
                       <div className={`p-4 rounded-2xl ${action.bg} ${action.color} border border-white/5 transition-transform group-hover:scale-110`}>
                          <action.icon className="w-6 h-6" />
                       </div>
                       <div>
                          <h4 className="text-lg font-black uppercase italic tracking-tight mb-2">{action.title}</h4>
                          <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-2">"{action.query}"</p>
                       </div>
                       <ChevronRight className="absolute bottom-6 right-6 w-5 h-5 text-ds-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                 ))}
              </div>
           </div>

           {/* 💬 CENTER: CHAT INTERFACE */}
           <div ref={chatInterfaceRef} className="lg:col-span-6 flex flex-col h-[700px] bg-[#1a1c22]/50 border border-white/10 rounded-[40px] overflow-hidden backdrop-blur-3xl shadow-2xl relative">
              
              {/* CHAT HEADER */}
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-ds-blue flex items-center justify-center text-white shadow-xl shadow-ds-blue/20">
                       <Bot className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                       <h3 className="text-lg font-black uppercase italic tracking-tight">Intelligence_Link</h3>
                       <p className="text-[10px] text-ds-green font-black uppercase tracking-widest">Active_Session</p>
                    </div>
                 </div>
                 <button 
                  onClick={() => setMessages([])}
                  className="p-3 bg-white/5 text-gray-500 hover:text-ds-red hover:bg-ds-red/10 rounded-xl transition-all"
                  title="Wipe Memory"
                >
                    <RefreshCw className="w-4 h-4" />
                 </button>
              </div>

              {/* CHAT LOG */}
              <div ref={chatLogRef} className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                 {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 filter grayscale py-20">
                       <MessageSquare className="w-16 h-16 mb-6 text-ds-blue" />
                       <h4 className="text-xl font-black uppercase tracking-[0.2em] italic mb-2">Neural Link Idle</h4>
                       <p className="text-xs font-black uppercase tracking-widest max-w-xs">Select a tactical shortcut or enter a manual query below to begin analysis.</p>
                    </div>
                 ) : (
                    messages.map((msg, i) => (
                       <motion.div 
                         key={i}
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                       >
                          <div className={`max-w-[85%] p-6 rounded-[30px] flex items-start gap-4 ${
                             msg.role === 'user' 
                             ? 'bg-ds-blue text-white shadow-xl shadow-ds-blue/10 rounded-br-none font-bold' 
                             : 'bg-white/5 border border-white/10 text-gray-200 rounded-bl-none font-medium'
                          }`}>
                             {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-lg bg-ds-blue/20 text-ds-blue flex items-center justify-center shrink-0 mt-1">
                                   <Sparkles className="w-4 h-4" />
                                </div>
                             )}
                             <div className="flex-1">
                                <div className="text-sm leading-relaxed whitespace-pre-wrap prose prose-invert max-w-none prose-p:my-2 prose-li:my-1">
                                    <ReactMarkdown 
                                      components={{
                                        a: (props) => (
                                          <div className="flex flex-wrap gap-2 mt-4">
                                            <a 
                                              {...props} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0a1c4b] text-white text-[11px] font-black uppercase rounded-2xl no-underline border border-white/10 hover:bg-[#061234] transition-all shadow-xl"
                                            >
                                              <Zap className="w-3.5 h-3.5" />
                                              Secure_Item
                                            </a>
                                            <button 
                                              onClick={() => addToWishlist("AI Recommended Item")}
                                              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 text-gray-400 text-[11px] font-black uppercase rounded-2xl border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                                            >
                                              <Star className="w-3.5 h-3.5 text-ds-blue" />
                                              Add_To_Wishlist
                                            </button>
                                          </div>
                                        )
                                      }}
                                    >
                                      {msg.content}
                                    </ReactMarkdown>
                                </div>
                             </div>
                             {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0 mt-1">
                                   <User className="w-4 h-4" />
                                </div>
                             )}
                          </div>
                       </motion.div>
                    ))
                 )}
                 {isTyping && (
                    <div className="flex justify-start">
                       <div className="bg-white/5 border border-white/10 p-6 rounded-[30px] rounded-bl-none flex items-center gap-3">
                          <RefreshCw className="w-4 h-4 text-ds-blue animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 animate-pulse">Analyzing Warehouse Data...</span>
                       </div>
                    </div>
                 )}
                 <div ref={chatEndRef} />
              </div>

              {/* INPUT AREA */}
              <div className="p-8 bg-black/40 border-t border-white/5">
                 <div className="flex gap-4">
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                      placeholder="Enter tactical query (e.g. Jordan price analysis in Cape Town)..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-gray-600 outline-none focus:border-ds-blue transition-all"
                    />
                    <button 
                      onClick={() => sendMessage(input)}
                      className="w-14 h-14 bg-ds-blue text-white rounded-2xl flex items-center justify-center shadow-xl shadow-ds-blue/20 hover:scale-105 transition-all group"
                    >
                       <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </button>
                 </div>
              </div>
           </div>

           {/* 📊 RIGHT: LIVE DB STATUS */}
           <div className="lg:col-span-3 space-y-6">
              <div className="bg-[#1a1c22]/50 border border-white/10 p-8 rounded-[40px] backdrop-blur-2xl relative overflow-hidden h-[700px] flex flex-col">
                 <div className="flex items-center gap-4 mb-10">
                    <div className="p-3 rounded-xl bg-ds-blue/10 text-ds-blue border border-ds-blue/20">
                       <Database className="w-5 h-5 shadow-[0_0_15px_#3a86ff]" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.2em] italic text-white/90">Inventory_Stream</span>
                 </div>

                 <div className="space-y-8 flex-1">
                    <div className="group">
                       <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-3 group-hover:text-ds-blue transition-colors">Neural_Context_Limit</span>
                       <div className="flex items-center justify-between">
                          <span className="text-2xl font-black italic tracking-tighter">30K <span className="text-xs font-medium not-italic text-gray-600 ml-1">Tokens</span></span>
                          <div className="w-2 h-2 rounded-full bg-ds-green animate-pulse" />
                       </div>
                    </div>

                    <div className="group">
                       <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-3">Inference_Model</span>
                       <span className="text-xl font-black uppercase tracking-tight text-ds-blue">Gemini-2.0-Flash</span>
                       <div className="pt-8 border-t border-white/5 group">
                        <div className="flex justify-between items-center mb-4">
                           <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">AI_Prompts_Remaining</span>
                           <span className={`text-xs font-black italic ${((appUser?.ai_credits || 0) <= 0 && (appUser?.tier === 'Free' || !appUser?.tier)) ? 'text-ds-red' : 'text-ds-blue'}`}>
                              {appUser?.tier === 'Pro' || appUser?.tier === 'Elite' ? 'UNLIMITED' : `${appUser?.ai_credits || 0} PROMPTS`}
                           </span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 mb-4">
                           <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: appUser?.tier === 'Pro' ? '100%' : `${Math.min(((appUser?.ai_credits || 0) / 100) * 100, 100)}%` }}
                              className={`h-full ${appUser?.tier === 'Pro' ? 'bg-ds-blue' : 'bg-ds-indigo'} shadow-[0_0_10px_#818cf8]`}
                           />
                        </div>
                        <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em] leading-relaxed">
                           Current Tier 
                           <span className="text-white ml-1">({appUser?.tier || 'Free'})</span> 
                           {appUser?.tier === 'Free' ? ' - Modular Intelligence Active.' : ' - Priority Uplink Stable.'}
                        </p>
                     </div>
                    </div>
                 </div>

                 <div className="mt-auto pt-8 border-t border-white/5">
                    <button onClick={() => window.location.href='/ai-intel'} className="w-full py-4 bg-ds-blue/10 hover:bg-ds-blue text-ds-blue hover:text-white border border-ds-blue/30 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] transition-all">
                       Upgrade_Quota
                    </button>
                 </div>
              </div>
           </div>
        </div>

        {/* 🔮 LIMIT REACHED MODAL */}
        <AnimatePresence>
          {showLimitModal && (
             <div className="fixed inset-0 z-150 flex items-center justify-center px-6">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLimitModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1a1c22] border border-white/10 p-10 rounded-[40px] w-full max-w-lg relative z-20 shadow-2xl overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Shield className="w-32 h-32 text-ds-red" />
                   </div>
                   
                   <h2 className="text-2xl font-black italic uppercase mb-2">QUOTA_REACHED</h2>
                   <p className="text-ds-red text-[10px] uppercase font-black tracking-widest mb-8 italic">Intelligence Link Throttled</p>
                   
                   <p className="text-gray-400 text-sm leading-relaxed mb-10">
                      You have exhausted your tier-allocated intelligence credits ({appUser?.ai_limit}). 
                      Upgrade your license or purchase a Neural Boost to restore your uplink.
                   </p>

                   <div className="space-y-4">
                       <Link href="/ai-intel" className="block w-full py-5 bg-ds-blue text-white rounded-2xl text-center font-black uppercase tracking-[0.2em] shadow-xl shadow-ds-blue/20 transition-all hover:scale-[1.02]">
                          UPGRADE_TO_PRO (UNLIMITED_AI)
                       </Link>
                       <button className="w-full py-5 bg-ds-indigo border border-ds-indigo/30 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all hover:bg-ds-indigo/80 shadow-lg shadow-ds-indigo/20">
                          BUY_AI_TOPUP (R100 for 100)
                       </button>
                      <button onClick={() => setShowLimitModal(false)} className="w-full py-3 text-gray-500 font-black uppercase text-[9px] tracking-widest">
                         STAY_OFFLINE
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
