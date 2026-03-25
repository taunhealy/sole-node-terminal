'use client'

import React, { useEffect, useRef } from 'react'
import { db } from '@/lib/firebase'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '@/lib/AuthContext'

declare global {
  interface Window {
    paypal: any
  }
}

interface PayPalSubscriptionProps {
  planId: string
  tier: 'Standard' | 'Pro'
  onSuccess?: () => void
}

export default function PayPalSubscription({ planId, tier, onSuccess }: PayPalSubscriptionProps) {
  const { user, appUser } = useAuth()
  const buttonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.paypal || !buttonRef.current || !user) return

    // Clear existing buttons
    buttonRef.current.innerHTML = ''

    window.paypal.Buttons({
      style: {
        shape: 'pill',
        color: 'blue',
        layout: 'vertical',
        label: 'subscribe'
      },
      createSubscription: (data: any, actions: any) => {
        return actions.subscription.create({
          'plan_id': planId
        })
      },
      onApprove: async (data: any, actions: any) => {
        console.log('Subscription approved:', data.subscriptionID)
        
        // Update Firestore
        if (user.email) {
          const userRef = doc(db, 'users', user.email)
          await updateDoc(userRef, {
            tier: tier,
            subscription_id: data.subscriptionID,
            subscription_status: 'active',
            updated_at: serverTimestamp()
          })
        }
        
        if (onSuccess) onSuccess()
        alert(`Successfully subscribed to ${tier} tier! Welcome to the Node.`)
      },
      onError: (err: any) => {
        console.error('PayPal Error:', err)
        alert('Payment failed. Please try again.')
      }
    }).render(buttonRef.current)
  }, [user, planId, tier])

  if (!user) return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
       <p className="text-[10px] font-black uppercase text-ds-text-dim">Authenticate to Subscribe</p>
    </div>
  )

  if (appUser?.tier === tier) return (
    <div className="p-4 bg-ds-indigo-deep border border-ds-indigo-border rounded-2xl text-center">
       <p className="text-[10px] font-black uppercase text-ds-indigo">Active Subscription</p>
    </div>
  )

  return <div ref={buttonRef} className="w-full" />
}
