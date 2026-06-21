'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID!

export default function Dashboard() {
  const [stats, setStats] = useState({ entrevistas: 0, referencias: 0, respuestas: 0, paper: 0 })

  useEffect(() => {
    async function loadStats() {
      const [
        { count: entrevistas },
        { count: referencias },
        { data: encuestas },
        { count: secciones },
      ] = await Promise.all([
        supabase.from('interviews').select('*', { count: 'exact', head: true }).eq('project_id', PROJECT_ID),
        supabase.from('bibliography').select('*', { count: 'exact', head: true }).eq('project_id', PROJECT_ID),
        supabase.from('survey_data').select('responses_count').eq('project_id', PROJECT_ID),
        supabase.from('paper_sections').select('*', { count: 'exact', head: true }).eq('project_id', PROJECT_ID),
      ])

      const totalRespuestas = encuestas?.reduce((sum, s) => sum + (s.responses_count || 0), 0) || 0
      const paperPct = Math.round(((secciones || 0) / 8) * 100)



      setStats({
        entrevistas: entrevistas || 0,
        referencias: referencias || 0,
        respuestas: totalRespuestas,
        paper: paperPct,
      })
    }
    loadStats()
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f8f7f4' }}>
      <aside style={{ width: '240px', background: 'white', borderRight: '1px solid rgba(0,0,0,0.08)', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', marginBottom: '16px' }}>
          <div style={{ width: '28px', height: '28px', background: '#4f46e5', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '700' }}>RC</div>
          <span style={{ fontWeight: '700', fontSize: '14px' }}>Research Copilot UP</span>
        </div>
        {[
          { label: 'Dashboard', href: '/dashboard' },
          { label: '1. Descubrimiento', href: '/dashboard/descubrimiento' },
          { label: '2. Marco Teórico', href: '/dashboard/marco-teorico' },
          { label: '3. Desarrollo', href: '/dashboard/desarrollo' },
          { label: '4. Validación', href: '/dashboard/validacion' },
          { label: '5. Paper', href: '/dashboard/paper' },
        ].map((item) => (
          <a key={item.href} href={item.href} style={{ padding: '8px 12px', borderRadius: '6px', textDecoration: 'none', color: '#6b6860', fontSize: '13px', fontWeight: '500', display: 'block' }}>{item.label}</a>
        ))}
      </aside>

      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>Dashboard</h1>
        <p style={{ color: '#9c9a92', fontSize: '13px', marginBottom: '28px' }}>Impacto de la participación en clase en la educación</p>

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Entrevistas', value: String(stats.entrevistas), sub: 'registradas' },
            { label: 'Referencias', value: String(stats.referencias), sub: 'en bibliografía' },
            { label: 'Respuestas', value: String(stats.respuestas), sub: 'de encuestas' },
            { label: 'Paper', value: stats.paper + '%', sub: Math.round((stats.paper / 100) * 8) + ' de 8 secciones' },
          ].map((stat) => (
            <div key={stat.label} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600', marginBottom: '8px' }}>{stat.label}</div>
              <div style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-1px', marginBottom: '4px' }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: '#6b6860' }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px' }}>Módulos del proyecto</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {[
            { num: '1', title: 'Descubrimiento', desc: 'Entrevistas, transcripciones, insights y evidencias', color: '#4f46e5', progress: Math.min(stats.entrevistas * 14, 100), href: '/dashboard/descubrimiento' },
            { num: '2', title: 'Marco Teórico', desc: 'Papers, referencias, notas y estado del arte', color: '#059669', progress: Math.min(stats.referencias * 3, 100), href: '/dashboard/marco-teorico' },
            { num: '3', title: 'Desarrollo', desc: 'Hipótesis, prototipos, bitácora y archivos', color: '#d97706', progress: 45, href: '/dashboard/desarrollo' },
            { num: '4', title: 'Validación', desc: 'Encuestas, resultados y análisis estadístico', color: '#dc2626', progress: Math.min(stats.respuestas / 2, 100), href: '/dashboard/validacion' },
            { num: '5', title: 'Paper', desc: 'Redacción, versiones y ética', color: '#7c3aed', progress: stats.paper, href: '/dashboard/paper' },
          ].map((mod) => (
            <a key={mod.num} href={mod.href} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '16px 18px', textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '24px', height: '24px', background: mod.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: '700' }}>{mod.num}</div>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{mod.title}</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9c9a92' }}>{Math.round(mod.progress)}%</span>
              </div>
              <p style={{ fontSize: '12px', color: '#6b6860', marginBottom: '10px' }}>{mod.desc}</p>
              <div style={{ height: '4px', background: '#f0ede8', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: mod.progress + '%', background: mod.color, borderRadius: '2px' }}></div>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  )
}