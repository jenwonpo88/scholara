'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID!
const tabs = ['Papers & Referencias', 'Estado del arte', 'Notas & Resúmenes']

export default function MarcoTeorico() {
  const [activeTab, setActiveTab] = useState('Papers & Referencias')
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [papers, setPapers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [newNote, setNewNote] = useState({ titulo: '', contenido: '' })
  const [notes, setNotes] = useState<any[]>([])
  const [savingNote, setSavingNote] = useState(false)
  const [expandedPaper, setExpandedPaper] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newPaper, setNewPaper] = useState({ titulo: '', autores: '', año: '', journal: '', doi: '', resumen: '' })
  const [stateOfArtText, setStateOfArtText] = useState('')
  const [savedStateOfArt, setSavedStateOfArt] = useState(false)
  const [generatingStateOfArt, setGeneratingStateOfArt] = useState(false)

  useEffect(() => {
    loadPapers()
    loadStateOfArt()
    loadNotes()
  }, [])

  async function loadPapers() {
    setLoading(true)
    const { data } = await supabase
      .from('bibliography')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('created_at', { ascending: false })
    if (data) setPapers(data)
    setLoading(false)
  }

  async function loadStateOfArt() {
    const { data } = await supabase
      .from('paper_sections')
      .select('content')
      .eq('project_id', PROJECT_ID)
      .eq('section_key', 'state_of_art')
      .single()
    if (data?.content) setStateOfArtText(data.content)
  }

  async function loadNotes() {
    const { data } = await supabase
      .from('paper_sections')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .like('section_key', 'note_%')
      .order('created_at', { ascending: true })
    if (data) {
      setNotes(data.map(n => {
        try {
          const parsed = JSON.parse(n.content)
          return { id: n.id, titulo: parsed.titulo, contenido: parsed.contenido }
        } catch {
          return { id: n.id, titulo: 'Nota', contenido: n.content }
        }
      }))
    }
  }

  async function searchPapers() {
    if (!searchQuery.trim()) return
    setSearching(true)
    setShowResults(false)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      const results = (data.data || []).map((p: any) => ({
        titulo: p.titulo, autores: p.autores, año: p.año,
        journal: p.journal, doi: p.doi, tipo: p.tipo, resumen: p.resumen,
      }))
      setSearchResults(results)
      setShowResults(true)
    } catch (e) {
      alert('Error al buscar.')
    }
    setSearching(false)
  }

  async function savePaper(paper: any) {
    const { error } = await supabase.from('bibliography').insert({
      project_id: PROJECT_ID,
      title: paper.titulo,
      authors: paper.autores,
      year: paper.año ? parseInt(paper.año) : null,
      journal: paper.journal,
      doi: paper.doi || '',
      abstract: paper.resumen,
      tags: [paper.tipo || 'Manual'],
    })

    if (!error) {
      const formato = window.prompt(
        '¿En qué formato quieres agregar esta referencia al paper?\n\n1 → APA 7\n2 → IEEE\n3 → Vancouver\n4 → No agregar al paper',
        '1'
      )

      if (formato && formato !== '4') {
        let ref = ''
        if (formato === '1') {
          ref = `${paper.autores || 'Autor desconocido'} (${paper.año || 's.f.'}). ${paper.titulo}. ${paper.journal || ''}${paper.doi ? `. https://doi.org/${paper.doi}` : '.'}`
        } else if (formato === '2') {
          ref = `${paper.autores || 'Autor desconocido'}, "${paper.titulo}," ${paper.journal || ''}, ${paper.año || 's.f.'}${paper.doi ? `. doi: ${paper.doi}` : '.'}`
        } else if (formato === '3') {
          ref = `${paper.autores || 'Autor desconocido'}. ${paper.titulo}. ${paper.journal || ''}. ${paper.año || 's.f.'}${paper.doi ? `. doi: ${paper.doi}` : '.'}`
        }

        const { data: existing } = await supabase
          .from('paper_sections')
          .select('id, content')
          .eq('project_id', PROJECT_ID)
          .eq('section_key', 'refs')
          .single()

        if (existing) {
          await supabase
            .from('paper_sections')
            .update({ content: existing.content + '\n\n' + ref, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
        } else {
          await supabase
            .from('paper_sections')
            .insert({ project_id: PROJECT_ID, section_key: 'refs', content: 'REFERENCIAS\n\n' + ref })
        }

        const nombres: Record<string, string> = { '1': 'APA 7', '2': 'IEEE', '3': 'Vancouver' }
        alert(`✓ Referencia guardada en formato ${nombres[formato]} y agregada al paper`)
      } else {
        alert('✓ Referencia guardada en bibliografía')
      }

      loadPapers()
    }
  }

  async function saveManualPaper() {
    if (!newPaper.titulo) { alert('El título es obligatorio'); return }
    await savePaper(newPaper)
    setNewPaper({ titulo: '', autores: '', año: '', journal: '', doi: '', resumen: '' })
    setShowForm(false)
  }

  async function deletePaper(id: string) {
    if (!confirm('¿Eliminar esta referencia?')) return
    await supabase.from('bibliography').delete().eq('id', id)
    loadPapers()
  }

  async function saveNote() {
    if (!newNote.titulo || !newNote.contenido) return
    setSavingNote(true)
    const { data } = await supabase
      .from('paper_sections')
      .insert({
        project_id: PROJECT_ID,
        section_key: `note_${Date.now()}`,
        content: JSON.stringify({ titulo: newNote.titulo, contenido: newNote.contenido })
      })
      .select().single()
    if (data) setNotes(prev => [...prev, { ...newNote, id: data.id }])
    setNewNote({ titulo: '', contenido: '' })
    setSavingNote(false)
  }

  async function generateStateOfArtAI() {
    if (papers.length === 0) { alert('Necesitas al menos una referencia guardada'); return }
    setGeneratingStateOfArt(true)
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'state_of_art', data: { refs: papers } })
      })
      const data = await res.json()
      if (data.summary) setStateOfArtText(data.summary)
      else alert('Error: ' + data.error)
    } catch (e) {
      alert('Error al conectar con IA')
    }
    setGeneratingStateOfArt(false)
  }

  async function saveStateOfArt() {
    setSavedStateOfArt(true)
    const { data: existing } = await supabase
      .from('paper_sections')
      .select('id')
      .eq('project_id', PROJECT_ID)
      .eq('section_key', 'state_of_art')
      .single()

    if (existing) {
      await supabase
        .from('paper_sections')
        .update({ content: stateOfArtText, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('paper_sections')
        .insert({ project_id: PROJECT_ID, section_key: 'state_of_art', content: stateOfArtText })
    }
    setTimeout(() => setSavedStateOfArt(false), 2000)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f8f7f4' }}>

      <aside style={{ width: '240px', background: 'white', borderRight: '1px solid rgba(0,0,0,0.08)', padding: '20px 12px' }}>
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
            color: item.href === '/dashboard/marco-teorico' ? '#059669' : '#6b6860',
            background: item.href === '/dashboard/marco-teorico' ? '#ecfdf5' : 'transparent',
            fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '2px'
          }}>{item.label}</a>
        ))}
      </aside>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '0 24px', height: '52px', background: 'white', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '15px' }}>Módulo 2 — Marco Teórico</div>
            <div style={{ fontSize: '11px', color: '#9c9a92' }}>Papers · Referencias · Estado del arte · Notas</div>
          </div>
          <span style={{ background: '#ecfdf5', color: '#059669', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{papers.length} referencias</span>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', background: 'white', padding: '0 24px' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '500',
              color: activeTab === tab ? '#059669' : '#6b6860',
              borderBottom: activeTab === tab ? '2px solid #059669' : '2px solid transparent',
              marginBottom: '-1px'
            }}>{tab}</button>
          ))}
        </div>

        <div style={{ padding: '24px' }}>

          {activeTab === 'Papers & Referencias' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchPapers()}
                  placeholder="Buscar papers en OpenAlex..."
                  style={{ flex: 1, padding: '9px 14px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                />
                <button onClick={searchPapers} disabled={searching} style={{ padding: '9px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                  {searching ? 'Buscando...' : 'Buscar'}
                </button>
                <button onClick={() => setShowForm(!showForm)} style={{ padding: '9px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: showForm ? '#f0ede8' : 'white', cursor: 'pointer', fontSize: '12px' }}>
                  + Agregar manual
                </button>
              </div>

              {showForm && (
                <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '14px' }}>Agregar paper manualmente</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input placeholder="Título *" value={newPaper.titulo} onChange={e => setNewPaper(p => ({ ...p, titulo: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', outline: 'none', gridColumn: '1 / -1' }} />
                    <input placeholder="Autores" value={newPaper.autores} onChange={e => setNewPaper(p => ({ ...p, autores: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', outline: 'none' }} />
                    <input placeholder="Año" value={newPaper.año} onChange={e => setNewPaper(p => ({ ...p, año: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', outline: 'none' }} />
                    <input placeholder="Revista / Journal" value={newPaper.journal} onChange={e => setNewPaper(p => ({ ...p, journal: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', outline: 'none' }} />
                    <input placeholder="DOI (opcional)" value={newPaper.doi} onChange={e => setNewPaper(p => ({ ...p, doi: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', outline: 'none' }} />
                  </div>
                  <textarea placeholder="Abstract / Resumen" value={newPaper.resumen} onChange={e => setNewPaper(p => ({ ...p, resumen: e.target.value }))} style={{ width: '100%', minHeight: '100px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', resize: 'none', outline: 'none', marginBottom: '10px', fontFamily: 'system-ui' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => setShowForm(false)} style={{ padding: '7px 14px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
                    <button onClick={saveManualPaper} style={{ padding: '7px 14px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Guardar paper</button>
                  </div>
                </div>
              )}

              {showResults && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '10px', color: '#6b6860' }}>
                    {searchResults.length} resultados para "{searchQuery}"
                  </div>
                  {searchResults.map((p, i) => (
                    <div key={i} style={{ background: '#fffbeb', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px', flex: 1 }}>{p.titulo}</div>
                        <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
                          <button onClick={() => setExpandedPaper(expandedPaper === i ? null : i)} style={{ padding: '4px 10px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px' }}>
                            {expandedPaper === i ? 'Ocultar' : 'Ver abstract'}
                          </button>
                          <button onClick={() => savePaper(p)} style={{ padding: '4px 10px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>+ Guardar</button>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#9c9a92', marginBottom: '4px' }}>{p.autores} · {p.journal} ({p.año})</div>
                      {expandedPaper === i && (
                        <div style={{ fontSize: '12px', color: '#6b6860', lineHeight: '1.7', marginTop: '8px', padding: '10px 12px', background: 'white', borderRadius: '6px' }}>
                          {p.resumen}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {loading ? 'Cargando...' : `Referencias guardadas (${papers.length})`}
                  </div>
                  <button style={{ padding: '6px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px' }}>Exportar APA 7</button>
                </div>
                {papers.length === 0 && !loading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#9c9a92', fontSize: '13px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📚</div>
                    No hay referencias aún. Busca o agrega papers arriba.
                  </div>
                ) : (
                  papers.map(p => (
                    <div key={p.id} style={{ padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div style={{ fontWeight: '600', fontSize: '13px', flex: 1 }}>{p.title}</div>
                        <button onClick={() => deletePaper(p.id)} style={{ padding: '2px 8px', border: '1px solid #fca5a5', borderRadius: '4px', background: '#fef2f2', cursor: 'pointer', fontSize: '11px', color: '#dc2626', marginLeft: '12px' }}>Eliminar</button>
                      </div>
                      <div style={{ fontSize: '11px', color: '#9c9a92', marginBottom: '6px' }}>{p.authors} · {p.journal} ({p.year})</div>
                      {p.abstract && (
                        <details>
                          <summary style={{ fontSize: '11px', color: '#059669', cursor: 'pointer' }}>Ver abstract</summary>
                          <div style={{ fontSize: '12px', color: '#6b6860', marginTop: '6px', lineHeight: '1.6' }}>{p.abstract}</div>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'Estado del arte' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '14px' }}>
              <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>Tus referencias ({papers.length})</div>
                {papers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#9c9a92', fontSize: '13px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📚</div>
                    Guarda referencias en la pestaña Papers para verlas aquí.
                  </div>
                ) : (
                  papers.map(p => (
                    <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ fontWeight: '600', fontSize: '12px', color: '#1a1916', marginBottom: '2px' }}>{p.title}</div>
                      <div style={{ fontSize: '11px', color: '#9c9a92', marginBottom: '4px' }}>{p.authors} ({p.year})</div>
                      {p.abstract && (
                        <details>
                          <summary style={{ fontSize: '11px', color: '#059669', cursor: 'pointer' }}>Ver abstract</summary>
                          <div style={{ fontSize: '11px', color: '#6b6860', marginTop: '4px', lineHeight: '1.6' }}>{p.abstract}</div>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>Estado del arte</div>
                    <div style={{ fontSize: '11px', color: '#9c9a92', marginTop: '2px' }}>Escribe tu síntesis usando las referencias de la izquierda</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={generateStateOfArtAI}
                      disabled={generatingStateOfArt || papers.length === 0}
                      style={{ padding: '6px 14px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                      {generatingStateOfArt ? '⏳ Generando...' : '✨ Generar con IA'}
                    </button>
                    <button onClick={saveStateOfArt} style={{ padding: '6px 14px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                      {savedStateOfArt ? '✓ Guardado' : 'Guardar'}
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#9c9a92', marginBottom: '10px', padding: '8px 10px', background: '#f8f7f4', borderRadius: '6px' }}>
                  💡 Lee el abstract de cada referencia y sintetiza qué dice la literatura, qué corrientes existen y qué falta investigar.
                </div>
                <textarea
                  value={stateOfArtText}
                  onChange={e => setStateOfArtText(e.target.value)}
                  placeholder="Ejemplo: 'Desde los trabajos de [Autor] ([año]) sobre [tema], diversos autores han explorado... Sin embargo, pocos estudios analizan [vacío]...'"
                  style={{ width: '100%', minHeight: '420px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '12px 14px', fontSize: '13px', lineHeight: '1.8', fontFamily: 'Georgia, serif', resize: 'none', outline: 'none', color: '#1a1916', background: '#fafafa' }}
                />
                <div style={{ fontSize: '11px', color: '#9c9a92', marginTop: '8px', textAlign: 'right' }}>
                  {stateOfArtText.split(' ').filter(w => w).length} palabras
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Notas & Resúmenes' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>Notas guardadas</div>
                {notes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#9c9a92', fontSize: '13px', background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
                    No hay notas aún. Crea tu primera nota.
                  </div>
                ) : (
                  notes.map(n => (
                    <div key={n.id} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>{n.titulo}</div>
                      <div style={{ fontSize: '12px', color: '#6b6860', lineHeight: '1.6' }}>{n.contenido}</div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px', height: 'fit-content' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>Nueva nota</div>
                <input
                  placeholder="Título..."
                  value={newNote.titulo}
                  onChange={e => setNewNote(prev => ({ ...prev, titulo: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', outline: 'none', marginBottom: '8px' }}
                />
                <textarea
                  placeholder="Escribe tu nota aquí..."
                  value={newNote.contenido}
                  onChange={e => setNewNote(prev => ({ ...prev, contenido: e.target.value }))}
                  style={{ width: '100%', minHeight: '150px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'system-ui' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button onClick={saveNote} style={{ padding: '8px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                    {savingNote ? 'Guardando...' : 'Guardar nota'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}