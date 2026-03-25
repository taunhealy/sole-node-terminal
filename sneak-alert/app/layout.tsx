import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'SOLE NODE | Sneaker Intelligence',
  description: 'The definitive sneaker monitoring and arbitrage terminal.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-[#101217]">
      <body className={inter.className}>
        <Navbar />
        <main className="pt-20 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
