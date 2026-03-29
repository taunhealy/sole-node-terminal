'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Send, 
  Sparkles, 
  Activity, 
  Shield, 
  MessageSquare,
  Zap,
  Target,
  ShoppingCart,
  CreditCard
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebase'
import { doc, updateDoc, increment, collection, query, where, limit, getDocs } from 'firebase/firestore'

// Initialize Gemini (In a production app, this would be an API route to hide the key)
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyDimaZuD7ClHDTVDCgpRqF1us3Cqn3H8tY'
const genAI = new GoogleGenerativeAI(API_KEY)

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function SniperBot() {
  const { user, appUser, login } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Yo! I'm your Sniper Link. Need some intel on those drops or warehouse deals? Just ask." }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) scrollToBottom()
  }, [messages, isOpen])

  const getStockIntel = async (userInput: string) => {
    try {
      // Fetch a larger pool so Gemini can find the right items
      // Since 'brand' field might not exist on all items, we fetch and let AI filter
      const q = query(collection(db, "stock"), where("soh", ">", 0), limit(100))
      
      const snap = await getDocs(q)
      const data = snap.docs.map(doc => doc.data())
      return data
    } catch (err) {
      console.error("StockIntel Error:", err)
      return []
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return

    if (!user) {
        login()
        return
    }

    if ((appUser?.ai_usage || 0) >= (appUser?.ai_limit || 10)) {
        setMessages(prev => [...prev, { role: 'user', content: input }, { role: 'assistant', content: "❌ YO! QUOTA_EXCEEDED. Upgrade or boost your AI credits in the INTEL dashboard to keep this link active." }])
        setInput('')
        return
    }

    const text = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setIsTyping(true)

    try {
      const stock = await getStockIntel(text)
      const contextPrompt = `
        You are SoleSeek Sniper Bot, a specialized AI for high-frequency sneaker monitoring.
        You are 'street art' inspired—your tone is tactical, edgy, and helpful. Use shoe-culture slang (e.g. 'heat', 'bricks', 'sniped', 'L', 'W').
        
        DATA (Each item has title, soh, price, url, store):
        ${JSON.stringify(stock)}
        
        USER: ${text}
        
        INSTRUCTIONS:
        1. Keep it short. Snipers don't have time for essays. 
        2. Reference the shoe stock if relevant.
        3. Use bold caps for important shoe titles.
        4. YOU MUST INCLUDE THE DIRECT LINK (url) for each product you recommend.
        5. Format links as [SHOP NOW](url) or similar.
      `

      // --- NEURAL UPLINK INIT (v1.8.1 Fix: Correct model alias) ---
      const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
      const result = await model.generateContent(contextPrompt)
      const assistantMsg = result.response.text()
      
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMsg }])

      // Increment Usage
      if (user.email) {
          await updateDoc(doc(db, 'users', user.email), {
              ai_usage: increment(1)
          })
      }
    } catch (error) {
      console.error("SniperBot Error:", error)
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ LINK_DOWN. Check my neural uplink later." }])
    } finally {
      setIsTyping(false)
    }
  }

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev)
    window.addEventListener('toggle-sniper-bot', handleToggle)
    return () => window.removeEventListener('toggle-sniper-bot', handleToggle)
  }, [])

  return (
    <div className="fixed bottom-10 right-10 z-[200] pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 30, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30, x: 20 }}
            style={{ 
               backgroundImage: 'linear-gradient(rgba(10, 11, 15, 0.9), rgba(10, 11, 15, 0.9)), url("/chat_bg.png")',
               backgroundSize: 'cover',
               backgroundPosition: 'center'
            }}
            className="absolute bottom-0 right-0 w-[380px] h-[580px] border border-ds-blue/30 rounded-[40px] shadow-2xl overflow-hidden flex flex-col backdrop-blur-3xl pointer-events-auto"
          >
            {/* Header */}
            <div className="p-6 bg-ds-blue/10 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-ds-blue flex items-center justify-center text-white ring-4 ring-ds-blue/10 shadow-lg shadow-ds-blue/20">
                    <Target className="w-5 h-5 animate-pulse" />
                 </div>
                 <div>
                    <h3 className="text-sm font-black uppercase italic tracking-tight">Sniper_Link</h3>
                    <div className="flex items-center gap-1.5 text-ds-blue">
                       <CreditCard className="w-2 h-2" />
                       <span className="text-[8px] font-black uppercase tracking-[0.2em]">{appUser?.ai_usage || 0} / {appUser?.ai_limit || 10} Creds</span>
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                {(appUser?.ai_usage || 0) > (appUser?.ai_limit || 10) * 0.8 && (
                   <button onClick={() => window.location.href='/ai-intel'} className="p-2 bg-ds-blue/20 hover:bg-ds-blue/40 border border-ds-blue/30 rounded-xl text-ds-blue transition-all group relative">
                      <ShoppingCart className="w-4 h-4" />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ds-blue text-white text-[7px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all font-black uppercase whitespace-nowrap">Neural_Boost</span>
                   </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
               {messages.map((msg, idx) => (
                 <motion.div 
                   key={idx}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                 >
                   <div className={`max-w-[85%] p-4 rounded-[25px] ${
                      msg.role === 'user' 
                      ? 'bg-ds-blue text-white rounded-br-none shadow-lg' 
                      : 'bg-white/5 border border-white/5 text-gray-200 rounded-bl-none'
                   }`}>
                      <div className="text-[14px] font-medium leading-relaxed prose prose-invert max-w-none prose-sm prose-p:my-1 prose-headings:my-2">
                        <ReactMarkdown 
                          components={{
                            a: (props) => (
                              <a 
                                {...props} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 bg-[#0a1c4b] text-white text-[10px] font-black uppercase rounded-xl no-underline border border-white/10 hover:bg-[#061234] transition-all shadow-lg"
                              >
                                 <Zap className="w-3 h-3" />
                                 Secure_Item
                              </a>
                            )
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                   </div>
                 </motion.div>
               ))}
               {isTyping && (
                 <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/5 p-4 rounded-[25px] flex items-center gap-3">
                       <Zap className="w-3 h-3 text-ds-blue animate-spin" />
                       <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Transmitting...</span>
                    </div>
                 </div>
               )}
               <div ref={chatEndRef} />
            </div>

            {/* Input Overlay */}
            <div className="p-6 bg-black/20 border-t border-white/5">
               <div className="relative flex items-center">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask for intel..."
                    className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-xs font-black placeholder:text-gray-600 outline-none focus:border-ds-blue/40 transition-all pr-14"
                  />
                  <button 
                    onClick={sendMessage}
                    className="absolute right-2 w-10 h-10 bg-[#0a1c4b] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#061234] transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
               </div>
               <div className="mt-3 flex items-center justify-between px-2">
                  <span className="text-[7px] font-black uppercase tracking-widest text-gray-600 italic">Neural_Uplink: v1.8</span>
                  <div className="flex items-center gap-1.5">
                     <Shield className="w-2.5 h-2.5 text-ds-blue/40" />
                     <span className="text-[7px] font-black uppercase text-gray-600">Encrypted</span>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
