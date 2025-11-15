import Link from 'next/link';

export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        gap: 'var(--s-8)',
      }}
    >
      <h1 style={{ fontSize: 'var(--text-3xl)', margin: 0 }}>Welcome to CivicFlow Demo</h1>
      <p style={{ color: 'var(--cc-muted)', margin: 0 }}>
        Explore institutional lending workflows in 60 seconds
      </p>
      <Link
        href="/demo"
        style={{
          padding: 'var(--s-4) var(--s-8)',
          backgroundColor: 'var(--cc-accent)',
          color: 'white',
          borderRadius: 'var(--r-4)',
          textDecoration: 'none',
          fontWeight: '600',
          marginTop: 'var(--s-4)',
        }}
      >
        Start Demo →
      </Link>
    </div>
  );
}
