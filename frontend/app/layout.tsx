import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/AuthContext'
import Navbar from '@/components/Navbar'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

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
        <AuthProvider>
          <Navbar />
          <main className="pt-20 min-h-screen">
            {children}
          </main>
          <Script 
            src={`https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&vault=true&intent=subscription`}
            strategy="beforeInteractive"
          />
        </AuthProvider>
      </body>
    </html>
  )
}
