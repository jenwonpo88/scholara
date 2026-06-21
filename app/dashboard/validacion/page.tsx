'use client'
import { useState, useEffect, useRef } from 'react'

import { supabase } from '../../../lib/supabase'

import * as XLSX from 'xlsx'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Papa = require('papaparse')

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID!

const tabs = ['Encuestas', 'Resultados & Gráficos']

const COLORS = ['#4f46e5', '#059669', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#be185d']
export default function Validacion() {

const [activeTab, setActiveTab] = useState('Encuestas')

const [surveys, setSurveys] = useState<any[]>([])

const [loading, setLoading] = useState(true)

const [showNewSurvey, setShowNewSurvey] = useState(false)

const [newSurvey, setNewSurvey] = useState({ name: '', description: '', responses_count: '', source: 'manual' })

const [saving, setSaving] = useState(false)

const [tableData, setTableData] = useState<{ headers: string[], rows: any[][], fileName: string }>({ headers: [], rows: [], fileName: '' })

const [analysisText, setAnalysisText] = useState('')

const [savedAnalysis, setSavedAnalysis] = useState(false)

const [aiLoadingAnalysis, setAiLoadingAnalysis] = useState(false)

const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null)

const [stats, setStats] = useState<{ label: string, value: string, sub: string }[]>([])

const [charts, setCharts] = useState<{ title: string, type: 'bar' | 'pie', data: { name: string, value: number }[] }[]>([])

const fileInputRef = useRef<HTMLInputElement>(null)
useEffect(() => { loadSurveys() }, [])
async function loadSurveys() {

setLoading(true)

const { data } = await supabase.from('survey_data').select('*').eq('project_id', PROJECT_ID).order('created_at', { ascending: false })

if (data) setSurveys(data)

setLoading(false)

}
async function saveSurvey() {

if (!newSurvey.name.trim()) { alert('El nombre es obligatorio'); return }

setSaving(true)

const { error } = await supabase.from('survey_data').insert({

project_id: PROJECT_ID,

name: newSurvey.name,

description: newSurvey.description,

responses_count: parseInt(newSurvey.responses_count) || 0,

source: newSurvey.source,

})

if (!error) {

setNewSurvey({ name: '', description: '', responses_count: '', source: 'manual' })

setShowNewSurvey(false)

loadSurveys()

}

setSaving(false)

}
async function deleteSurvey(id: string) {

if (!confirm('¿Eliminar esta encuesta?')) return

await supabase.from('survey_data').delete().eq('id', id)

loadSurveys()

}
async function analyzeWithAI() {

if (tableData.headers.length === 0) { alert('Primero importa un archivo de datos'); return }

setAiLoadingAnalysis(true)

try {

const res = await fetch('/api/mod4', {

method: 'POST',

headers: { 'Content-Type': 'application/json' },

body: JSON.stringify({ headers: tableData.headers, rows: tableData.rows, stats, fileName: tableData.fileName }),

})

const data = await res.json()

if (data.analysis) {

setAnalysisText(data.analysis)

if (activeSurveyId) {

const survey = surveys.find(s => s.id === activeSurveyId)

await supabase.from('survey_data').update({

data: { ...survey?.data, analysis: data.analysis }

}).eq('id', activeSurveyId)

loadSurveys()

}

}

} catch (e) {

alert('Error al conectar con IA')

} finally {

setAiLoadingAnalysis(false)

}

}
async function saveAnalysis() {

if (activeSurveyId) {

const survey = surveys.find(s => s.id === activeSurveyId)

await supabase.from('survey_data').update({

data: { ...survey?.data, analysis: analysisText }

}).eq('id', activeSurveyId)

loadSurveys()

}

setSavedAnalysis(true)

setTimeout(() => setSavedAnalysis(false), 2000)

}
function handleFileUpload(file: File) {

const ext = file.name.split('.').pop()?.toLowerCase()

if (ext === 'csv') {

Papa.parse(file, {

complete: (result) => {

const rows = result.data as string[][]

if (rows.length === 0) return

const headers = rows[0]

const data = rows.slice(1).filter(r => r.some(c => c))

setTableData({ headers, rows: data, fileName: file.name })

processData(headers, data)

},

skipEmptyLines: true,

})

} else if (ext === 'xlsx' || ext === 'xls') {

const reader = new FileReader()

reader.onload = (e) => {

const data = new Uint8Array(e.target?.result as ArrayBuffer)

const workbook = XLSX.read(data, { type: 'array' })

const sheet = workbook.Sheets[workbook.SheetNames[0]]

const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

if (json.length === 0) return

const headers = json[0].map(String)

const rows = json.slice(1).filter(r => r.some(c => c !== undefined && c !== ''))

setTableData({ headers, rows, fileName: file.name })

processData(headers, rows)

}

reader.readAsArrayBuffer(file)

} else {

alert('Solo se aceptan archivos CSV o Excel (.xlsx, .xls)')

}

}
function processData(headers: string[], rows: any[][]) {

const totalRows = rows.length

const newStats: { label: string, value: string, sub: string }[] = [

{ label: 'Total respuestas', value: String(totalRows), sub: 'filas importadas' },

{ label: 'Variables', value: String(headers.length), sub: 'columnas' },

]

const newCharts: { title: string, type: 'bar' | 'pie', data: { name: string, value: number }[] }[] = []

headers.forEach((header, colIdx) => {

const values = rows.map(r => r[colIdx]).filter(v => v !== undefined && v !== null && v !== '')

const numericVals = values.map(v => parseFloat(v)).filter(v => !isNaN(v))

if (numericVals.length > totalRows * 0.7) {

const avg = numericVals.reduce((a, b) => a + b, 0) / numericVals.length

const min = Math.min(...numericVals)

const max = Math.max(...numericVals)

newStats.push({ label: 'Promedio: ' + header, value: avg.toFixed(1), sub: 'mín: ' + min + ' · máx: ' + max })

const buckets: Record<string, number> = {}

numericVals.forEach(v => { const bucket = Math.floor(v).toString(); buckets[bucket] = (buckets[bucket] || 0) + 1 })

const chartData = Object.entries(buckets).sort((a, b) => Number(a[0]) - Number(b[0])).slice(0, 10).map(([name, value]) => ({ name, value }))

if (chartData.length > 1) newCharts.push({ title: header, type: 'bar', data: chartData })

} else if (values.length > 0 && numericVals.length < totalRows * 0.3) {

const freq: Record<string, number> = {}

values.forEach(v => { const key = String(v).trim(); freq[key] = (freq[key] || 0) + 1 })

const chartData = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, value }))

if (chartData.length > 1 && chartData.length <= 8) newCharts.push({ title: header, type: 'pie', data: chartData })

}

})

setStats(newStats)

setCharts(newCharts.slice(0, 6))

}
function clearData() {

if (!confirm('¿Eliminar los datos importados?')) return

setTableData({ headers: [], rows: [], fileName: '' })

setStats([])

setCharts([])

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
        color: item.href === '/dashboard/validacion' ? '#dc2626' : '#6b6860',
        background: item.href === '/dashboard/validacion' ? '#fef2f2' : 'transparent',
        fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '2px'
      }}>{item.label}</a>
    ))}
  </aside>

  <main style={{ flex: 1, overflowY: 'auto' }}>
    <div style={{ padding: '0 24px', height: '52px', background: 'white', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontWeight: '600', fontSize: '15px' }}>Módulo 4 — Validación</div>
        <div style={{ fontSize: '11px', color: '#9c9a92' }}>Encuestas · Resultados · Gráficos</div>
      </div>
      <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
        {surveys.reduce((sum, s) => sum + (s.responses_count || 0), 0)} respuestas
      </span>
    </div>

    <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', background: 'white', padding: '0 24px' }}>
      {tabs.map(tab => (
        <button key={tab} onClick={() => setActiveTab(tab)} style={{
          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
          fontSize: '13px', fontWeight: '500',
          color: activeTab === tab ? '#dc2626' : '#6b6860',
          borderBottom: activeTab === tab ? '2px solid #dc2626' : '2px solid transparent',
          marginBottom: '-1px'
        }}>{tab}</button>
      ))}
    </div>

    <div style={{ padding: '24px' }}>

      {activeTab === 'Encuestas' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={() => setShowNewSurvey(!showNewSurvey)} style={{ padding: '7px 14px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>+ Nueva encuesta</button>
          </div>

          {showNewSurvey && (
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px', marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '14px' }}>Registrar encuesta</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <input placeholder="Nombre *" value={newSurvey.name} onChange={e => setNewSurvey(s => ({ ...s, name: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', outline: 'none', gridColumn: '1 / -1' }} />
                <input placeholder="Número de respuestas" type="number" value={newSurvey.responses_count} onChange={e => setNewSurvey(s => ({ ...s, responses_count: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', outline: 'none' }} />
                <select value={newSurvey.source} onChange={e => setNewSurvey(s => ({ ...s, source: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', background: 'white' }}>
                  <option value="manual">Manual</option>
                  <option value="google_forms">Google Forms</option>
                  <option value="typeform">Typeform</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              <textarea placeholder="Descripción (opcional)" value={newSurvey.description} onChange={e => setNewSurvey(s => ({ ...s, description: e.target.value }))} style={{ width: '100%', minHeight: '60px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', resize: 'none', outline: 'none', marginBottom: '10px', fontFamily: 'system-ui' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button onClick={() => setShowNewSurvey(false)} style={{ padding: '7px 14px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
                <button onClick={saveSurvey} disabled={saving} style={{ padding: '7px 14px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </div>
          )}

          <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>Importar datos</div>
              {tableData.headers.length > 0 && (
                <button onClick={clearData} style={{ padding: '4px 10px', border: '1px solid #fca5a5', borderRadius: '6px', background: '#fef2f2', cursor: 'pointer', fontSize: '11px', color: '#dc2626' }}>Eliminar datos</button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
            {tableData.headers.length === 0 ? (
              <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed rgba(0,0,0,0.14)', borderRadius: '10px', padding: '28px', textAlign: 'center', cursor: 'pointer', background: '#f8f7f4' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
                <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>Arrastra o haz clic para importar</div>
                <div style={{ fontSize: '11px', color: '#9c9a92' }}>CSV, Excel (.xlsx, .xls)</div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', color: '#059669', fontWeight: '600' }}>✓ {tableData.fileName} — {tableData.rows.length} filas · {tableData.headers.length} columnas</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => fileInputRef.current?.click()} style={{ padding: '4px 10px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px' }}>Cambiar archivo</button>
                    <button onClick={async () => {
                      const name = window.prompt('¿Cómo quieres llamar a esta encuesta?', tableData.fileName.replace(/\.(csv|xlsx|xls)$/i, ''))
                      if (!name) return
                      const { error } = await supabase.from('survey_data').insert({
                        project_id: PROJECT_ID, name,
                        description: 'Importado desde ' + tableData.fileName,
                        responses_count: tableData.rows.length,
                        source: tableData.fileName.endsWith('.csv') ? 'csv' : 'excel',
                        data: { headers: tableData.headers, rows: tableData.rows.slice(0, 500) }
                      })
                      if (!error) { alert('✓ Encuesta guardada correctamente'); loadSurveys() }
                    }} style={{ padding: '4px 10px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' }}>💾 Guardar encuesta</button>
                  </div>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '8px 10px', background: '#f8f7f4', borderBottom: '1px solid rgba(0,0,0,0.08)', color: '#9c9a92', fontWeight: '600', textAlign: 'left' }}>#</th>
                        {tableData.headers.map((h, i) => (
                          <th key={i} style={{ textAlign: 'left', padding: '8px 10px', background: '#f8f7f4', borderBottom: '1px solid rgba(0,0,0,0.08)', fontWeight: '600', color: '#6b6860', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '7px 10px', borderBottom: '1px solid rgba(0,0,0,0.04)', color: '#9c9a92', fontSize: '11px' }}>{i + 1}</td>
                          {tableData.headers.map((_, j) => (
                            <td key={j} style={{ padding: '7px 10px', borderBottom: '1px solid rgba(0,0,0,0.04)', color: '#1a1916', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row[j] ?? ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', fontSize: '11px', color: '#9c9a92' }}>Mostrando todas las {tableData.rows.length} filas</div>
              </div>
            )}
          </div>

          {surveys.length > 0 && (
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>Encuestas registradas ({surveys.length})</div>
              {surveys.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>{s.name}</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{s.responses_count} respuestas</span>
                      <span style={{ background: '#f0ede8', color: '#6b6860', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' }}>{s.source}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => {
                      if (s.data?.headers && s.data?.rows) {
                        setActiveSurveyId(s.id)
                        setTableData({ headers: s.data.headers, rows: s.data.rows, fileName: s.name })
                        processData(s.data.headers, s.data.rows)
                        if (s.data?.analysis) setAnalysisText(s.data.analysis)
                        else setAnalysisText('')
                        setActiveTab('Resultados & Gráficos')
                      } else {
                        alert('Esta encuesta no tiene datos importados. Sube el archivo CSV nuevamente.')
                      }
                    }} style={{ padding: '4px 10px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px' }}>Ver gráficos</button>
                    <button onClick={() => deleteSurvey(s.id)} style={{ padding: '4px 10px', border: '1px solid #fca5a5', borderRadius: '6px', background: '#fef2f2', cursor: 'pointer', fontSize: '11px', color: '#dc2626' }}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Resultados & Gráficos' && (
        <div>
          {stats.length === 0 && charts.length === 0 ? (
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '60px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>No hay datos para graficar</div>
              <div style={{ fontSize: '12px', color: '#9c9a92' }}>Ve a la pestaña Encuestas e importa un archivo CSV o Excel</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {stats.map((stat, i) => (
                  <div key={i} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#9c9a92', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600', marginBottom: '8px' }}>{stat.label}</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-1px', marginBottom: '4px' }}>{stat.value}</div>
                    <div style={{ fontSize: '11px', color: '#6b6860' }}>{stat.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                {charts.map((chart, i) => (
                  <div key={i} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '14px', color: '#1a1916' }}>{chart.title}</div>
                    {chart.type === 'bar' ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chart.data} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="value" fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => name + ' ' + (percent * 100).toFixed(0) + '%'} labelLine={false} fontSize={10}>
                            {chart.data.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>Análisis e interpretación</div>
                <div style={{ fontSize: '11px', color: '#9c9a92', marginTop: '2px' }}>Escribe tu interpretación o genera una con IA</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={analyzeWithAI} disabled={aiLoadingAnalysis} style={{ padding: '6px 14px', background: aiLoadingAnalysis ? '#f3f4f6' : '#f5f3ff', color: aiLoadingAnalysis ? '#9c9a92' : '#7c3aed', border: '1px solid ' + (aiLoadingAnalysis ? 'rgba(0,0,0,0.08)' : '#c4b5fd'), borderRadius: '6px', cursor: aiLoadingAnalysis ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '500' }}>
                  {aiLoadingAnalysis ? '⏳ Analizando...' : '✨ Analizar con IA'}
                </button>
                <button onClick={saveAnalysis} style={{ padding: '6px 14px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                  {savedAnalysis ? '✓ Guardado' : 'Guardar'}
                </button>
              </div>
            </div>
            <textarea value={analysisText} onChange={e => setAnalysisText(e.target.value)} placeholder="Escribe aquí tu análisis o haz clic en ✨ Analizar con IA..." style={{ width: '100%', minHeight: '200px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '12px 14px', fontSize: '13px', lineHeight: '1.8', fontFamily: 'Georgia, serif', resize: 'none', outline: 'none', color: '#1a1916', background: '#f8f7f4' }} />
            <div style={{ fontSize: '11px', color: '#9c9a92', marginTop: '8px', textAlign: 'right' }}>{analysisText.split(' ').filter(w => w).length} palabras</div>
          </div>
        </div>
      )}

    </div>
  </main>
</div>
)

}