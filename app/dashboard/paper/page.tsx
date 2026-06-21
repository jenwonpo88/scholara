'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID!

const secciones = [
  { key: 'abstract', label: 'Abstract' },
  { key: 'intro', label: '1. Introducción' },
  { key: 'theory', label: '2. Marco Teórico' },
  { key: 'method', label: '3. Metodología' },
  { key: 'results', label: '4. Resultados' },
  { key: 'discussion', label: '5. Discusión' },
  { key: 'conclusions', label: '6. Conclusiones' },
  { key: 'refs', label: 'Referencias' },
]

const contenidosDefault: Record<string, string> = {
  abstract: `ABSTRACT\n\nEscribe tu abstract aquí...`,
  intro: `1. INTRODUCCIÓN\n\nEscribe tu introducción aquí...`,
  theory: `2. MARCO TEÓRICO\n\nEscribe tu marco teórico aquí...`,
  method: `3. METODOLOGÍA\n\nEscribe tu metodología aquí...`,
  results: `4. RESULTADOS\n\nEscribe tus resultados aquí...`,
  discussion: `5. DISCUSIÓN\n\nEscribe tu discusión aquí...`,
  conclusions: `6. CONCLUSIONES\n\nEscribe tus conclusiones aquí...`,
  refs: `REFERENCIAS\n\nEscribe tus referencias aquí...`,
}

const versiones = [
  { v: 'v1', label: 'Borrador inicial', fecha: 'hoy', palabras: '0', estado: 'Actual', color: '#4f46e5' },
]

export default function Paper() {
  const [activeTab, setActiveTab] = useState('Editor')
  const [activeSection, setActiveSection] = useState('intro')
  const [textos, setTextos] = useState(contenidosDefault)
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState('')
  const [aiImproving, setAiImproving] = useState(false)
  const [suggestion, setSuggestion] = useState('')

  useEffect(() => {
    loadSections()
  }, [])

  async function loadSections() {
    const { data } = await supabase
      .from('paper_sections')
      .select('*')
      .eq('project_id', PROJECT_ID)

    if (data && data.length > 0) {
      const loaded: Record<string, string> = {}
      data.forEach((sec: any) => {
        loaded[sec.section_key] = sec.content
      })
      setTextos(prev => ({ ...prev, ...loaded }))
    }
  }

  async function saveSection(key: string, content: string) {
    setSaving(true)
    const { data: existing } = await supabase
      .from('paper_sections')
      .select('id')
      .eq('project_id', PROJECT_ID)
      .eq('section_key', key)
      .single()

    if (existing) {
      await supabase
        .from('paper_sections')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('paper_sections')
        .insert({ project_id: PROJECT_ID, section_key: key, content })
    }
    setSaving(false)
    setLastSaved(new Date().toLocaleTimeString())
  }

  function handleTextChange(key: string, value: string) {
    setTextos(prev => ({ ...prev, [key]: value }))
  }

    async function improveWithAI() {
    const content = textos[activeSection]
    if (!content?.trim()) { alert('Escribe algo primero'); return }
    setAiImproving(true)
    setShowSuggestion(true)
    setSuggestion('')
    try {
      const res = await fetch('/api/mod5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey: activeSection,
          sectionLabel: secciones.find(s => s.key === activeSection)?.label,
          content,
        }),
      })
      const data = await res.json()
      if (data.improved) setSuggestion(data.improved)
    } catch (e) {
      alert('Error al conectar con IA')
    } finally {
      setAiImproving(false)
    }
  }

  function exportToWord() {
    const contenido = secciones.map(sec =>
      sec.label + '\n\n' + (textos[sec.key] || '') + '\n\n'
    ).join('\n---\n\n')
    const blob = new Blob([contenido], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'paper-investigacion.doc'
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportToPDF() {
    const ventana = window.open('', '_blank')
    if (!ventana) { alert('Permite ventanas emergentes para exportar PDF'); return }
    ventana.document.write(`<html><head><title>Paper</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 40px;font-size:13px;line-height:1.9;color:#1a1916}h1{font-size:16px;font-weight:700;margin-top:32px;border-bottom:1px solid #eee;padding-bottom:6px}p{margin:0 0 8px}</style></head><body>${secciones.map(sec => `<h1>${sec.label}</h1>${(textos[sec.key] || '').split('\n').map((l: string) => `<p>${l || '&nbsp;'}</p>`).join('')}`).join('')}<script>setTimeout(()=>window.print(),500)</script></body></html>`)
    ventana.document.close()
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f8f7f4' }}>

      {/* Sidebar */}
      <aside style={{ width: '240px', background: 'white', borderRight: '1px solid rgba(0,0,0,0.08)', padding: '20px 12px', flexShrink: 0 }}>
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
          <a key={item.href} href={item.href} style={{
            padding: '8px 12px', borderRadius: '6px', textDecoration: 'none',
            color: item.href === '/dashboard/paper' ? '#7c3aed' : '#6b6860',
            background: item.href === '/dashboard/paper' ? '#f5f3ff' : 'transparent',
            fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '2px'
          }}>{item.label}</a>
        ))}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ padding: '0 24px', height: '52px', background: 'white', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '15px' }}>Módulo 5 — Paper</div>
            <div style={{ fontSize: '11px', color: '#9c9a92' }}>Editor académico · Versiones · Ética</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['Editor', 'Versiones', 'Ética'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '6px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px',
                background: activeTab === tab ? '#7c3aed' : 'white',
                color: activeTab === tab ? 'white' : '#6b6860',
                cursor: 'pointer', fontSize: '12px', fontWeight: '500'
              }}>{tab}</button>
            ))}
          </div>
        </div>

        {/* TAB: Editor */}
        {activeTab === 'Editor' && (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

            {/* TOC */}
            <div style={{ width: '180px', borderRight: '1px solid rgba(0,0,0,0.08)', padding: '16px 12px', overflowY: 'auto', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Secciones</div>
              {secciones.map(sec => (
                <button key={sec.key} onClick={() => setActiveSection(sec.key)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '7px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: activeSection === sec.key ? '600' : '400',
                  color: activeSection === sec.key ? '#7c3aed' : '#6b6860',
                  background: activeSection === sec.key ? '#f5f3ff' : 'none',
                  marginBottom: '2px'
                }}>{sec.label}</button>
              ))}
              <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.08)', margin: '12px 0' }} />
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Exportar</div>
<button onClick={exportToWord} style={{ display: 'block', width: '100%', padding: '7px 10px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px', marginBottom: '6px', textAlign: 'center' }}>Word (.doc)</button>
              <button onClick={exportToPDF} style={{ display: 'block', width: '100%', padding: '7px 10px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px', marginBottom: '6px', textAlign: 'center' }}>PDF</button>
              <button style={{ display: 'block', width: '100%', padding: '7px 10px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px', marginBottom: '6px', textAlign: 'center' }}>LaTeX</button>
            </div>

            {/* Editor */}
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontWeight: '600', fontSize: '15px' }}>{secciones.find(s => s.key === activeSection)?.label}</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {saving && <span style={{ fontSize: '11px', color: '#9c9a92' }}>Guardando...</span>}
                  {lastSaved && !saving && <span style={{ fontSize: '11px', color: '#059669' }}>✓ Guardado {lastSaved}</span>}
                  <button
                    onClick={() => saveSection(activeSection, textos[activeSection])}
                    style={{ padding: '6px 12px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                    Guardar
                  </button>
<button onClick={improveWithAI} style={{ padding: '6px 12px', background: 'white', color: '#7c3aed', border: '1px solid #7c3aed', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>✨ Mejorar con IA</button>                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {['H1', 'H2', 'H3', 'B', 'I', 'Citar APA', 'Autocompletar IA'].map(btn => (
                  <button key={btn} style={{ padding: '4px 8px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '11px', color: '#6b6860' }}>{btn}</button>
                ))}
              </div>

              <textarea
                value={textos[activeSection] || ''}
                onChange={e => handleTextChange(activeSection, e.target.value)}
                style={{ width: '100%', minHeight: '420px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '16px 18px', fontSize: '13px', lineHeight: '1.9', fontFamily: 'Georgia, serif', resize: 'none', outline: 'none', color: '#1a1916', background: 'white' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9c9a92', marginTop: '8px' }}>
                <span>Los cambios se guardan al hacer clic en <strong>Guardar</strong></span>
                <span>{textos[activeSection]?.split(' ').filter(w => w).length || 0} palabras</span>
              </div>

{showSuggestion && (
  <div style={{ marginTop: '14px', padding: '14px', background: '#f5f3ff', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <span style={{ background: '#7c3aed', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' }}>✨ Sugerencia IA</span>
      {aiImproving && <span style={{ fontSize: '11px', color: '#9c9a92' }}>Generando mejora...</span>}
    </div>
    <div style={{ fontSize: '12px', color: '#6b6860', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
      {aiImproving ? '⏳ La IA está mejorando tu texto...' : suggestion}
    </div>
    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
      {!aiImproving && suggestion && (
        <button
          onClick={() => {
            handleTextChange(activeSection, suggestion)
            setShowSuggestion(false)
            setSuggestion('')
          }}
          style={{ padding: '5px 12px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' }}>
          ✓ Aplicar mejora
        </button>
      )}
      <button
        onClick={() => { setShowSuggestion(false); setSuggestion('') }}
        style={{ padding: '5px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px' }}>
        Cerrar
      </button>
    </div>
  </div>
)}

            </div>
          </div>
        )}

        {/* TAB: Versiones */}        {activeTab === 'Versiones' && (
          <div style={{ padding: '24px', overflowY: 'auto' }}>
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '14px' }}>Historial de versiones</div>
              {versiones.map((v, i) => (
                <div key={v.v} style={{ display: 'flex', gap: '16px', padding: '14px 0', borderBottom: i < versiones.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none', alignItems: 'center' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '11px', flexShrink: 0 }}>{v.v}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '2px' }}>{v.label}</div>
                    <div style={{ fontSize: '11px', color: '#9c9a92' }}>{v.fecha} · {v.palabras} palabras</div>
                  </div>
                  <span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{v.estado}</span>
                  <button style={{ padding: '4px 10px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px' }}>Ver</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: Ética */}
        {activeTab === 'Ética' && (
          <div style={{ padding: '24px', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>Consentimientos informados</div>
                <div style={{ border: '2px dashed rgba(0,0,0,0.14)', borderRadius: '8px', padding: '20px', textAlign: 'center', background: '#f8f7f4', marginBottom: '12px', cursor: 'pointer' }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>📄</div>
                  <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>Subir consentimiento firmado</div>
                  <div style={{ fontSize: '11px', color: '#9c9a92' }}>PDF, JPG, PNG</div>
                </div>
              </div>
              <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>Protección de datos</div>
                {[
                  { label: 'Anonimización automática en exportación', sub: 'Reemplaza nombres por códigos P1, P2...' },
                  { label: 'Ocultar datos sensibles en IA', sub: 'Previene acceso a nombres reales' },
                ].map(opt => (
                  <label key={opt.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>{opt.label}</div>
                      <div style={{ fontSize: '11px', color: '#9c9a92' }}>{opt.sub}</div>
                    </div>
                    <input type="checkbox" defaultChecked style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }} />
                  </label>
                ))}
                <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '6px' }}>
                  <div style={{ fontWeight: '600', fontSize: '12px', color: '#059669' }}>✓ Cumplimiento RGPD/LOPD</div>
<div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>{'Datos cifrados. Retención: 5 años post-publicación.'}</div>                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}