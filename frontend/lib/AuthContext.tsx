'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { googleProvider } from './firebase'

interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
  tier: 'Standard' | 'Pro' | 'Elite'
}

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        // Fetch or create app user profile
        const userDocRef = doc(db, 'users', user.email!)
        const unsubscribeProfile = onSnapshot(userDocRef, async (snapshot) => {
           if (snapshot.exists()) {
             setAppUser({
               uid: user.uid,
               email: user.email,
               displayName: user.displayName,
               tier: snapshot.data().tier || 'Standard',
             })
           } else {
             // Create initial profile
             const initialProfile = {
               email: user.email,
               displayName: user.displayName,
               tier: 'Standard',
               subscription_status: 'inactive',
               created_at: new Date(),
             }
             await setDoc(userDocRef, initialProfile)
             setAppUser({
               uid: user.uid,
               email: user.email,
               displayName: user.displayName,
               tier: 'Standard',
             })
           }
           setLoading(false)
        })
        return () => unsubscribeProfile()
      } else {
        setAppUser(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const login = async () => {
    await signInWithPopup(auth, googleProvider)
  }

  const logout = async () => {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, appUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
