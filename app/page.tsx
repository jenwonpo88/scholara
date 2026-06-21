import Link from 'next/link'

export default function Home() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
      background: '#f8f7f4'
    }}>
      <div style={{
        background: 'white',
        padding: '40px 48px',
        borderRadius: '16px',
        border: '1px solid rgba(0,0,0,0.08)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          background: '#4f46e5',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'white',
          fontSize: '20px',
          fontWeight: '700'
        }}>S</div>
        <h1 style={{fontSize: '24px', fontWeight: '700', marginBottom: '8px'}}>
          Research Copilot UP
        </h1>
        <p style={{color: '#6b6860', marginBottom: '24px', fontSize: '14px'}}>
          Plataforma de investigación académica · Universidad del Pacífico
        </p>
        <a href="/dashboard" style={{
          background: '#4f46e5',
          color: 'white',
          padding: '10px 24px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          Entrar al dashboard →
        </a>
      </div>
    </main>
  )
}