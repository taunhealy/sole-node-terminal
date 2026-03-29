import { NextResponse } from 'next/server'

// 🚀 TACTICAL PROXY: FORWARDING DISCORD INTERACTIONS TO CLOUD RUN (AFRICA-SOUTH1)
// Since Firebase Hosting doesn't support direct Cloud Run rewrites for africa-south1,
// we use this Next.js route as a high-speed bridge to the backend logic.

const CLOUD_RUN_URL = 'https://solenode-api-256432107914.africa-south1.run.app/api/v1/discord-interactions'

export async function POST(req: Request) {
  const rawBody = await req.text()
  const headers = new Headers(req.headers)

  // Forward signatures and metadata to the Python backend
  try {
    const response = await fetch(CLOUD_RUN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature-Ed25519': headers.get('X-Signature-Ed25519') || '',
        'X-Signature-Timestamp': headers.get('X-Signature-Timestamp') || '',
      },
      body: rawBody,
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ DISCORD_PROXY_ERROR:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
