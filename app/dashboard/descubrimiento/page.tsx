'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'

const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID!
const tabs = ['Entrevistas', 'Transcripciones', 'Insights', 'Comparar', 'Evidencias']

export default function Descubrimiento() {
  const [activeTab, setActiveTab] = useState('Entrevistas')
  const [interviews, setInterviews] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [participantName, setParticipantName] = useState('')
  const [participantProfile, setParticipantProfile] = useState('')
  const [selectedInterview, setSelectedInterview] = useState<any>(null)
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null)
  const [compareResult, setCompareResult] = useState<any>(null)
  const [comparing, setComparing] = useState(false)
  const [compareType, setCompareType] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: interviewsData } = await supabase
      .from('interviews').select('*').eq('project_id', PROJECT_ID).order('created_at', { ascending: false })
    const { data: insightsData } = await supabase
      .from('insights').select('*').eq('project_id', PROJECT_ID).order('created_at', { ascending: false })
    if (interviewsData) setInterviews(interviewsData)
    if (insightsData) setInsights(insightsData)
    setLoading(false)
  }

  async function deleteInterview(id: string) {
    if (!confirm('¿Eliminar esta entrevista y sus insights?')) return
    await supabase.from('insights').delete().eq('interview_id', id)
    await supabase.from('interviews').delete().eq('id', id)
    if (selectedInterview?.id === id) setSelectedInterview(null)
    await loadData()
  }

  async function handleFileUpload(file: File) {
    if (!participantName) { alert('Por favor ingresa el nombre del participante antes de subir el audio.'); return }
    setUploading(true)
    setUploadProgress(5)
    setUploadStatus('Subiendo archivo de audio...')
    try {
      const fileName = `${PROJECT_ID}/${Date.now()}_${file.name}`
      const { error: storageError } = await supabase.storage.from('research-files').upload(fileName, file)
      if (storageError) throw storageError

      const { data: urlData } = await supabase.storage.from('research-files').createSignedUrl(fileName, 60 * 60 * 24 * 365)

      setUploadProgress(25)
      setUploadStatus('Transcribiendo con Whisper...')

      const formData = new FormData()
      formData.append('audio', file)
      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const transcribeData = await transcribeRes.json()
      if (!transcribeRes.ok) throw new Error(transcribeData.error)
      const transcript = transcribeData.text

      setUploadProgress(55)
      setUploadStatus('Analizando con IA...')

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, projectContext: 'Investigacion sobre impacto de la participacion en clase en la educacion' }),
      })
      const analysis = await analyzeRes.json()

      setUploadProgress(80)
      setUploadStatus('Guardando en base de datos...')

      const { data: interviewData, error: interviewError } = await supabase
        .from('interviews')
        .insert({
          project_id: PROJECT_ID,
          participant_name: participantName,
          participant_profile: participantProfile,
          audio_url: urlData?.signedUrl || '',
          transcript,
          analysis,
          status: 'analyzed',
          recorded_at: new Date().toISOString().split('T')[0],
        })
        .select().single()

      if (interviewError) throw interviewError

      if (analysis.insights && analysis.insights.length > 0) {
        const insightsToInsert = analysis.insights.map((ins: any) => ({
          project_id: PROJECT_ID,
          interview_id: interviewData.id,
          title: ins.titulo,
          content: ins.contenido,
          priority: ins.prioridad,
          tags: analysis.temas_recurrentes?.slice(0, 3) || [],
        }))
        await supabase.from('insights').insert(insightsToInsert)
      }

      setUploadProgress(100)
      setUploadStatus('✓ Entrevista procesada y guardada correctamente')
      setParticipantName('')
      setParticipantProfile('')
      await loadData()
    } catch (error: any) {
      setUploadStatus('❌ Error: ' + error.message)
    }
  }
async function runComparison(type: string) {
  if (interviews.length < 2) { alert('Necesitas al menos 2 entrevistas para comparar'); return }
  setComparing(true)
  setCompareType(type)
  setCompareResult(null)
  try {
    const res = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interviews, type })
    })
    const data = await res.json()
    setCompareResult({ type, data })
  } catch (e) {
    alert('Error al comparar')
  }
  setComparing(false)
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
            color: item.href === '/dashboard/descubrimiento' ? '#4f46e5' : '#6b6860',
            background: item.href === '/dashboard/descubrimiento' ? '#eef2ff' : 'transparent',
            fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '2px'
          }}>{item.label}</a>
        ))}
      </aside>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '0 24px', height: '52px', background: 'white', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '15px' }}>Módulo 1 — Descubrimiento</div>
            <div style={{ fontSize: '11px', color: '#9c9a92' }}>Entrevistas · Transcripciones · Insights · Evidencias</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{interviews.length} entrevistas</span>
            <span style={{ background: '#ecfdf5', color: '#059669', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{insights.length} insights</span>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', background: 'white', padding: '0 24px' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setSelectedInterview(null) }} style={{
              padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '500',
              color: activeTab === tab ? '#4f46e5' : '#6b6860',
              borderBottom: activeTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
              marginBottom: '-1px'
            }}>{tab}</button>
          ))}
        </div>

        <div style={{ padding: '24px' }}>

          {/* ── Entrevistas ── */}
          {activeTab === 'Entrevistas' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>Subir entrevista</div>
                  <input placeholder="Nombre del participante *" value={participantName} onChange={e => setParticipantName(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', outline: 'none', marginBottom: '8px' }} />
                  <input placeholder="Perfil (ej: Docente universitario, 45a)" value={participantProfile} onChange={e => setParticipantProfile(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', outline: 'none', marginBottom: '12px' }} />
                  <input ref={fileInputRef} type="file" accept=".mp3,.wav,.m4a,.mp4" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                  <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed rgba(0,0,0,0.14)', borderRadius: '10px', padding: '32px 24px', textAlign: 'center', cursor: 'pointer', background: '#f8f7f4' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎙️</div>
                    <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>Arrastra o haz clic para subir</div>
                    <div style={{ fontSize: '11px', color: '#9c9a92' }}>MP3, WAV, M4A, MP4 · Máx 500MB</div>
                  </div>
                  {uploading && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b6860', marginBottom: '4px' }}>
                        <span>{uploadStatus}</span><span>{uploadProgress}%</span>
                      </div>
                      <div style={{ height: '6px', background: '#f0ede8', borderRadius: '3px' }}>
                        <div style={{ height: '100%', width: `${uploadProgress}%`, background: uploadStatus.includes('✓') ? '#059669' : uploadStatus.includes('❌') ? '#dc2626' : '#4f46e5', borderRadius: '3px', transition: 'width 0.3s' }}></div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>Pipeline automático</div>
                  {['Transcripción con Groq Whisper', 'Análisis de temas con Gemini', 'Extracción de insights automática', 'Guardado en Supabase'].map(opt => (
                    <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', marginBottom: '12px' }}>
                      <span style={{ color: '#059669', fontSize: '16px' }}>✓</span><span>{opt}</span>
                    </div>
                  ))}
                  <div style={{ padding: '10px 12px', background: '#ecfdf5', borderRadius: '6px', fontSize: '12px', color: '#059669', marginTop: '8px' }}>
                    Todo el proceso es automático al subir el audio
                  </div>
                </div>
              </div>

              {/* Tabla de entrevistas */}
              <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '14px' }}>
                  {loading ? 'Cargando...' : `Entrevistas realizadas (${interviews.length})`}
                </div>
                {interviews.length === 0 && !loading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#9c9a92', fontSize: '13px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎙️</div>
                    No hay entrevistas aún. Sube tu primer audio arriba.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Participante', 'Perfil', 'Fecha', 'Estado', 'Insights', ''].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#9c9a92', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {interviews.map(e => (
                        <tr key={e.id}
                          onClick={() => { setSelectedInterview(selectedInterview?.id === e.id ? null : e) }}
                          style={{ cursor: 'pointer', background: selectedInterview?.id === e.id ? '#f5f3ff' : 'white' }}>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: '13px', fontWeight: '500' }}>{e.participant_name}</td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: '12px', color: '#6b6860' }}>{e.participant_profile}</td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: '13px' }}>{e.recorded_at}</td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            <span style={{ background: e.status === 'analyzed' ? '#ecfdf5' : '#fffbeb', color: e.status === 'analyzed' ? '#059669' : '#d97706', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>
                              {e.status === 'analyzed' ? 'Analizada' : 'En proceso'}
                            </span>
                          </td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>
                              {insights.filter(ins => ins.interview_id === e.id).length} insights
                            </span>
                          </td>
                          <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }} onClick={ev => ev.stopPropagation()}>
                            <button onClick={() => deleteInterview(e.id)} style={{ padding: '3px 8px', border: '1px solid #fca5a5', borderRadius: '4px', background: '#fef2f2', cursor: 'pointer', fontSize: '11px', color: '#dc2626' }}>Eliminar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Panel de detalle */}
              {selectedInterview && (
                <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '20px', marginTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>
                      {selectedInterview.participant_name}
                      <span style={{ fontWeight: '400', fontSize: '12px', color: '#9c9a92', marginLeft: '8px' }}>{selectedInterview.participant_profile}</span>
                    </div>
                    <button onClick={() => setSelectedInterview(null)} style={{ padding: '4px 10px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px' }}>Cerrar ✕</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* Transcripción */}
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '8px' }}>Transcripción completa</div>
                      <div style={{ background: '#f8f7f4', borderRadius: '6px', padding: '12px 14px', fontSize: '12px', color: '#6b6860', lineHeight: '1.8', fontFamily: 'Georgia, serif', maxHeight: expandedTranscript === selectedInterview.id ? 'none' : '200px', overflow: 'hidden' }}>
                        {selectedInterview.transcript}
                      </div>
                      <button
                        onClick={() => setExpandedTranscript(expandedTranscript === selectedInterview.id ? null : selectedInterview.id)}
                        style={{ marginTop: '6px', padding: '4px 10px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px' }}>
                        {expandedTranscript === selectedInterview.id ? 'Ver menos ↑' : 'Ver transcripción completa ↓'}
                      </button>
                    </div>

                    {/* Análisis */}
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '8px' }}>Análisis IA</div>
                      {selectedInterview.analysis ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {selectedInterview.analysis.temas_recurrentes?.length > 0 && (
                            <div style={{ padding: '10px 12px', background: '#eef2ff', borderRadius: '6px' }}>
                              <div style={{ fontSize: '11px', fontWeight: '600', color: '#4f46e5', marginBottom: '6px' }}>Temas recurrentes</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {selectedInterview.analysis.temas_recurrentes.map((t: string, i: number) => (
                                  <span key={i} style={{ background: 'white', color: '#4f46e5', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' }}>{t}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedInterview.analysis.resumen_ejecutivo && (
                            <div style={{ padding: '10px 12px', background: '#f8f7f4', borderRadius: '6px' }}>
                              <div style={{ fontSize: '11px', fontWeight: '600', color: '#6b6860', marginBottom: '4px' }}>Resumen ejecutivo</div>
                              <div style={{ fontSize: '12px', color: '#1a1916', lineHeight: '1.6' }}>{selectedInterview.analysis.resumen_ejecutivo}</div>
                            </div>
                          )}
                          {selectedInterview.analysis.citas_destacadas?.length > 0 && (
                            <div style={{ padding: '10px 12px', background: '#fffbeb', borderRadius: '6px' }}>
                              <div style={{ fontSize: '11px', fontWeight: '600', color: '#d97706', marginBottom: '6px' }}>Citas destacadas</div>
                              {selectedInterview.analysis.citas_destacadas.slice(0, 3).map((c: any, i: number) => (
                                <div key={i} style={{ fontSize: '12px', fontStyle: 'italic', color: '#6b6860', borderLeft: '3px solid #d97706', paddingLeft: '8px', marginBottom: '6px' }}>"{c.texto}"</div>
                              ))}
                            </div>
                          )}
                          {insights.filter(ins => ins.interview_id === selectedInterview.id).length > 0 && (
                            <div style={{ padding: '10px 12px', background: '#ecfdf5', borderRadius: '6px' }}>
                              <div style={{ fontSize: '11px', fontWeight: '600', color: '#059669', marginBottom: '6px' }}>
                                Insights ({insights.filter(ins => ins.interview_id === selectedInterview.id).length})
                              </div>
                              {insights.filter(ins => ins.interview_id === selectedInterview.id).map((ins: any) => (
                                <div key={ins.id} style={{ fontSize: '12px', color: '#1a1916', marginBottom: '4px' }}>• {ins.title}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#9c9a92', padding: '20px', textAlign: 'center' }}>No hay análisis disponible</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Transcripciones ── */}
          {activeTab === 'Transcripciones' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {interviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9c9a92', fontSize: '13px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
                  No hay transcripciones aún.
                </div>
              ) : (
                interviews.map(e => (
                  <div key={e.id} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{e.participant_name}</div>
                        <div style={{ fontSize: '11px', color: '#9c9a92', marginTop: '2px' }}>{e.recorded_at} · {e.participant_profile}</div>
                      </div>
                      <span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' }}>Completa</span>
                    </div>
                    <div style={{ background: '#f8f7f4', borderRadius: '6px', padding: '12px 14px', fontSize: '12px', color: '#6b6860', lineHeight: '1.8', fontFamily: 'Georgia, serif', maxHeight: expandedTranscript === e.id ? 'none' : '150px', overflow: expandedTranscript === e.id ? 'auto' : 'hidden' }}>
                      {e.transcript}
                    </div>
                    <button
                      onClick={() => setExpandedTranscript(expandedTranscript === e.id ? null : e.id)}
                      style={{ marginTop: '8px', padding: '4px 10px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px' }}>
                      {expandedTranscript === e.id ? 'Ver menos ↑' : 'Ver transcripción completa ↓'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Insights ── */}
          {activeTab === 'Insights' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>{insights.length} insights extraídos automáticamente</div>
              </div>
              {insights.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9c9a92', fontSize: '13px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>💡</div>
                  Los insights aparecerán aquí automáticamente al analizar entrevistas.
                </div>
              ) : (
                insights.map(ins => (
                  <div key={ins.id} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {ins.tags?.map((tag: string) => (
                          <span key={tag} style={{ background: '#f0ede8', color: '#6b6860', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' }}>{tag}</span>
                        ))}
                        <span style={{
                          background: ins.priority === 'Alta' ? '#fef2f2' : ins.priority === 'Oportunidad' ? '#ecfdf5' : '#eef2ff',
                          color: ins.priority === 'Alta' ? '#dc2626' : ins.priority === 'Oportunidad' ? '#059669' : '#4f46e5',
                          padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500'
                        }}>{ins.priority}</span>
                      </div>
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>{ins.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b6860', lineHeight: '1.6' }}>{ins.content}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Comparar ── */}
{activeTab === 'Comparar' && (
  <div>
    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
      <button
        onClick={() => runComparison('comparative')}
        disabled={comparing}
        style={{ padding: '10px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
        {comparing && compareType === 'comparative' ? '⏳ Analizando...' : '🔍 Análisis comparativo'}
      </button>
      <button
        onClick={() => runComparison('sentiment')}
        disabled={comparing}
        style={{ padding: '10px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
        {comparing && compareType === 'sentiment' ? '⏳ Analizando...' : '💭 Análisis de sentimiento'}
      </button>
      <button
        onClick={() => runComparison('categories')}
        disabled={comparing}
        style={{ padding: '10px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
        {comparing && compareType === 'categories' ? '⏳ Analizando...' : '🗂 Mapa de categorías'}
      </button>
    </div>

    {interviews.length < 2 && (
      <div style={{ textAlign: 'center', padding: '40px', color: '#9c9a92', fontSize: '13px', background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
        Necesitas al menos 2 entrevistas para hacer comparaciones.
      </div>
    )}

    {compareResult?.type === 'comparative' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '12px', color: '#4f46e5' }}>Patrones comunes</div>
          {compareResult.data.patrones_comunes?.map((p: string, i: number) => (
            <div key={i} style={{ padding: '8px 12px', background: '#eef2ff', borderRadius: '6px', marginBottom: '6px', fontSize: '13px' }}>• {p}</div>
          ))}
        </div>
        <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '12px', color: '#dc2626' }}>Diferencias</div>
          {compareResult.data.diferencias?.map((d: string, i: number) => (
            <div key={i} style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: '6px', marginBottom: '6px', fontSize: '13px' }}>• {d}</div>
          ))}
        </div>
        <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>Conclusión</div>
          <div style={{ fontSize: '13px', color: '#6b6860', lineHeight: '1.7' }}>{compareResult.data.conclusion}</div>
        </div>
      </div>
    )}

    {compareResult?.type === 'sentiment' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {compareResult.data.analisis?.map((a: any, i: number) => (
          <div key={i} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{a.participante}</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ background: a.sentimiento_general === 'Positivo' ? '#ecfdf5' : a.sentimiento_general === 'Negativo' ? '#fef2f2' : '#fffbeb', color: a.sentimiento_general === 'Positivo' ? '#059669' : a.sentimiento_general === 'Negativo' ? '#dc2626' : '#d97706', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{a.sentimiento_general}</span>
                <span style={{ background: '#f5f3ff', color: '#7c3aed', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' }}>Entusiasmo: {a.nivel_entusiasmo}</span>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#6b6860', marginBottom: '8px' }}>{a.actitud_hacia_tema}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {a.frases_clave?.map((f: string, j: number) => (
                <span key={j} style={{ background: '#f0ede8', color: '#6b6860', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' }}>"{f}"</span>
              ))}
            </div>
          </div>
        ))}
        <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '16px 18px' }}>
          <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>Conclusión</div>
          <div style={{ fontSize: '13px', color: '#6b6860', lineHeight: '1.7' }}>{compareResult.data.conclusion}</div>
        </div>
      </div>
    )}

    {compareResult?.type === 'categories' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {compareResult.data.categorias?.map((cat: any, i: number) => (
          <div key={i} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{cat.nombre}</div>
              <span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>Frecuencia: {cat.frecuencia}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#6b6860', marginBottom: '8px' }}>{cat.descripcion}</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {cat.participantes?.map((p: string, j: number) => (
                <span key={j} style={{ background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' }}>{p}</span>
              ))}
            </div>
            {cat.citas?.slice(0, 2).map((c: string, j: number) => (
              <div key={j} style={{ fontStyle: 'italic', fontSize: '12px', color: '#6b6860', borderLeft: '3px solid #059669', paddingLeft: '8px', marginBottom: '4px' }}>"{c}"</div>
            ))}
          </div>
        ))}
        <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '16px 18px' }}>
          <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>Conclusión</div>
          <div style={{ fontSize: '13px', color: '#6b6860', lineHeight: '1.7' }}>{compareResult.data.conclusion}</div>
        </div>
      </div>
    )}
  </div>
)}

          {/* ── Evidencias ── */}
          {activeTab === 'Evidencias' && (
            <div>
              <div style={{ border: '2px dashed rgba(0,0,0,0.14)', borderRadius: '10px', padding: '32px', textAlign: 'center', background: '#f8f7f4', cursor: 'pointer' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📎</div>
                <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>Subir evidencia</div>
                <div style={{ fontSize: '11px', color: '#9c9a92' }}>Fotos, videos, PDFs · Máx 100MB</div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}