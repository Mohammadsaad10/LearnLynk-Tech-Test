import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>LearnLynk Tech Test</h1>
      <nav>
        <Link href="/dashboard/today">
          Go to Today's Dashboard
        </Link>
      </nav>
    </div>
  )
}
