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
  LayoutDashboard
} from 'lucide-react'
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
    query: "Determine the best stock to purchase for reselling based on current price drops.",
    icon: TrendingUp,
    color: "text-ds-green",
    bg: "bg-ds-green/10"
  },
  {
    title: "Highest Margin Sales",
    query: "Which sneakers are currently on sale with the highest margin compared to their original price?",
    icon: Target,
    color: "text-ds-red",
    bg: "bg-ds-red/10"
  },
  {
    title: "Market Intel",
    query: "Analyze recent blog trends to suggest which brands are currently in high demand.",
    icon: Sparkles,
    color: "text-ds-blue",
    bg: "bg-ds-blue/10"
  }
]

export default function AIRecommendations() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    
    setInput('')
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
        1. Analyze the price drops (current_price vs old_price) to find resale opportunities.
        2. Mention specific stores where items are available.
        3. Keep recommendations concise and tactical (speed is key).
        4. If no good deals are found, suggest items based on hype trends from blogs.
      `

      const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
      const result = await model.generateContent(contextPrompt)
      const response = await result.response
      
      const assistantMsg: Message = { role: 'assistant', content: response.text() }
      setMessages(prev => [...prev, assistantMsg])
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
           
           {/* 🛠️ LEFT: QUICK ACTION BUTTONS */}
           <div className="lg:col-span-4 space-y-6">
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

              {/* 📊 LIVE DB STATUS */}
              <div className="bg-ds-blue/5 border border-ds-blue/20 p-8 rounded-[40px] relative overflow-hidden">
                 <div className="flex items-center gap-4 mb-6">
                    <Database className="w-5 h-5 text-ds-blue" />
                    <span className="text-xs font-black uppercase tracking-widest italic">Inventory_Intel_Stream</span>
                 </div>
                 <div className="space-y-4 opacity-50">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                       <span>Database Handshake</span>
                       <span className="text-ds-green">Stable</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                       <span>Neural Context Limit</span>
                       <span>30K Tokens</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                       <span>Inference Model</span>
                       <span className="text-ds-blue">Gemini-2.0-Flash</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* 💬 RIGHT: CHAT INTERFACE */}
           <div className="lg:col-span-8 flex flex-col h-[700px] bg-[#1a1c22]/50 border border-white/10 rounded-[40px] overflow-hidden backdrop-blur-3xl shadow-2xl relative">
              
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
              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
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
                             <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
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
        </div>

      </main>

      <Footer />
    </div>
  )
}
