'use client'
import { useState, useEffect } from 'react'

import { supabase } from '../../../lib/supabase'
const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID!

const tabs = ['Hipótesis', 'Kanban', 'Archivos']
const COLUMNS = [

{ id: 'todo', label: '📋 Por hacer', color: '#6b6860' },

{ id: 'progress', label: '⚡ En progreso', color: '#d97706' },

{ id: 'review', label: '👁 Revisión', color: '#4f46e5' },

{ id: 'done', label: '✅ Completado', color: '#059669' },

]
type Hypothesis = {

id: number

label: string

titulo: string

color: string

bg: string

estado: string

texto: string

soportada: string

parcial: string

pendiente: string

saved: boolean

editing: boolean

}
export default function Desarrollo() {

const [activeTab, setActiveTab] = useState('Hipótesis')

const [tasks, setTasks] = useState<any[]>([])

const [loading, setLoading] = useState(true)

const [showNewTask, setShowNewTask] = useState(false)

const [newTask, setNewTask] = useState({ title: '', description: '', status: 'todo', priority: 'medium', assigned_to: '' })

const [hypothesis, setHypothesis] = useState<Hypothesis[]>([

{ id: 1, label: 'H1', titulo: 'Hipótesis principal', color: '#4f46e5', bg: '#eef2ff', estado: 'En desarrollo', texto: '', soportada: '', parcial: '', pendiente: '', saved: false, editing: true },

{ id: 2, label: 'H2', titulo: 'Hipótesis secundaria', color: '#7c3aed', bg: '#f5f3ff', estado: 'En desarrollo', texto: '', soportada: '', parcial: '', pendiente: '', saved: false, editing: true },

])

const [aiLoading, setAiLoading] = useState<number | null>(null)
useEffect(() => {

loadTasks()

}, [])
async function loadTasks() {

setLoading(true)

const { data } = await supabase

.from('tasks')

.select('*')

.eq('project_id', PROJECT_ID)

.order('created_at', { ascending: false })

if (data) setTasks(data)

setLoading(false)

}
async function addTask() {

if (!newTask.title.trim()) { alert('El título es obligatorio'); return }

const { error } = await supabase.from('tasks').insert({

project_id: PROJECT_ID,

title: newTask.title,

description: newTask.description,

status: newTask.status,

priority: newTask.priority,

assigned_to: newTask.assigned_to,

})

if (!error) {

setNewTask({ title: '', description: '', status: 'todo', priority: 'medium', assigned_to: '' })

setShowNewTask(false)

loadTasks()

}

}
async function moveTask(id: string, newStatus: string) {

await supabase.from('tasks').update({ status: newStatus }).eq('id', id)

loadTasks()

}
async function deleteTask(id: string) {

if (!confirm('¿Eliminar esta tarea?')) return

await supabase.from('tasks').delete().eq('id', id)

loadTasks()

}
function updateH(idx: number, field: keyof Hypothesis, value: string) {

const updated = [...hypothesis]

;(updated[idx] as any)[field] = value

setHypothesis(updated)

}
function saveH(idx: number) {

if (!hypothesis[idx].texto.trim()) { alert('Escribe el texto de la hipótesis'); return }

const updated = [...hypothesis]

updated[idx].saved = true

updated[idx].editing = false

setHypothesis(updated)

}
function editH(idx: number) {

const updated = [...hypothesis]

updated[idx].editing = true

setHypothesis(updated)

}
async function generateWithAI(idx: number) {

const h = hypothesis[idx]

setAiLoading(idx)

try {

const res = await fetch('/api/mod3', {

method: 'POST',

headers: { 'Content-Type': 'application/json' },

body: JSON.stringify({

label: h.label,

titulo: h.titulo,

texto: h.texto,

soportada: h.soportada,

parcial: h.parcial,

pendiente: h.pendiente,

}),

})

const data = await res.json()

if (data.error) { alert('Error de IA: ' + data.error); return }
  const updated = [...hypothesis]
  updated[idx] = {
    ...updated[idx],
    texto: data.texto ?? updated[idx].texto,
    soportada: data.soportada ?? updated[idx].soportada,
    parcial: data.parcial ?? updated[idx].parcial,
    pendiente: data.pendiente ?? updated[idx].pendiente,
    estado: data.estado ?? updated[idx].estado,
  }
  setHypothesis(updated)
} catch (e) {
  alert('Error al conectar con IA')
} finally {
  setAiLoading(null)
}
}
const priorityColor: Record<string, string> = { high: '#dc2626', medium: '#d97706', low: '#059669' }

const priorityLabel: Record<string, string> = { high: 'Alta', medium: 'Media', low: 'Baja' }
return (

<>

<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
          color: item.href === '/dashboard/desarrollo' ? '#d97706' : '#6b6860',
          background: item.href === '/dashboard/desarrollo' ? '#fffbeb' : 'transparent',
          fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '2px'
        }}>{item.label}</a>
      ))}
    </aside>

    <main style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '0 24px', height: '52px', background: 'white', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '15px' }}>Módulo 3 — Desarrollo</div>
          <div style={{ fontSize: '11px', color: '#9c9a92' }}>Hipótesis · Kanban · Archivos</div>
        </div>
        <span style={{ background: '#fffbeb', color: '#d97706', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{tasks.length} tareas</span>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', background: 'white', padding: '0 24px' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: '500',
            color: activeTab === tab ? '#d97706' : '#6b6860',
            borderBottom: activeTab === tab ? '2px solid #d97706' : '2px solid transparent',
            marginBottom: '-1px'
          }}>{tab}</button>
        ))}
      </div>

      <div style={{ padding: '24px' }}>

        {activeTab === 'Hipótesis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {hypothesis.map((h, idx) => (
              <div key={h.id} style={{ background: 'white', border: `1px solid ${h.saved && !h.editing ? h.color + '40' : 'rgba(0,0,0,0.08)'}`, borderRadius: '10px', padding: '18px 20px' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: h.bg, color: h.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', flexShrink: 0 }}>{h.label}</div>
                  {h.editing ? (
                    <input value={h.titulo} onChange={e => updateH(idx, 'titulo', e.target.value)} style={{ flex: 1, padding: '6px 10px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '14px', fontWeight: '600', outline: 'none' }} />
                  ) : (
                    <div style={{ fontWeight: '600', fontSize: '14px', flex: 1 }}>{h.titulo}</div>
                  )}
                  <select value={h.estado} onChange={e => updateH(idx, 'estado', e.target.value)} disabled={!h.editing} style={{ padding: '4px 8px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '12px', background: 'white', cursor: h.editing ? 'pointer' : 'default' }}>
                    <option>En desarrollo</option>
                    <option>Parcialmente validada</option>
                    <option>Validada</option>
                    <option>Rechazada</option>
                  </select>
                  {h.saved && !h.editing && (
                    <span style={{ background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>✓ Guardada</span>
                  )}
                </div>

                {h.editing ? (
                  <textarea value={h.texto} onChange={e => updateH(idx, 'texto', e.target.value)} placeholder={`Escribe tu ${h.label} aquí...`} style={{ width: '100%', minHeight: '80px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', lineHeight: '1.7', fontFamily: 'Georgia, serif', resize: 'none', outline: 'none', fontStyle: 'italic', background: '#f8f7f4', marginBottom: '12px' }} />
                ) : (
                  <div style={{ padding: '12px 14px', background: '#f8f7f4', borderRadius: '6px', fontStyle: 'italic', fontSize: '13px', lineHeight: '1.7', fontFamily: 'Georgia, serif', color: '#1a1916', marginBottom: '12px', borderLeft: `3px solid ${h.color}` }}>"{h.texto}"</div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ padding: '10px', background: '#ecfdf5', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#059669', marginBottom: '4px' }}>✓ Soportada por</div>
                    {h.editing ? <textarea value={h.soportada} onChange={e => updateH(idx, 'soportada', e.target.value)} placeholder="Evidencia que la soporta..." style={{ width: '100%', minHeight: '60px', border: 'none', background: 'transparent', fontSize: '11px', color: '#6b6860', resize: 'none', outline: 'none', fontFamily: 'system-ui' }} /> : <div style={{ fontSize: '11px', color: '#6b6860' }}>{h.soportada || '—'}</div>}
                  </div>
                  <div style={{ padding: '10px', background: '#fffbeb', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#d97706', marginBottom: '4px' }}>⚠ Parcial</div>
                    {h.editing ? <textarea value={h.parcial} onChange={e => updateH(idx, 'parcial', e.target.value)} placeholder="Aspectos no resueltos..." style={{ width: '100%', minHeight: '60px', border: 'none', background: 'transparent', fontSize: '11px', color: '#6b6860', resize: 'none', outline: 'none', fontFamily: 'system-ui' }} /> : <div style={{ fontSize: '11px', color: '#6b6860' }}>{h.parcial || '—'}</div>}
                  </div>
                  <div style={{ padding: '10px', background: '#fef2f2', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>✗ Pendiente</div>
                    {h.editing ? <textarea value={h.pendiente} onChange={e => updateH(idx, 'pendiente', e.target.value)} placeholder="Lo que falta validar..." style={{ width: '100%', minHeight: '60px', border: 'none', background: 'transparent', fontSize: '11px', color: '#6b6860', resize: 'none', outline: 'none', fontFamily: 'system-ui' }} /> : <div style={{ fontSize: '11px', color: '#6b6860' }}>{h.pendiente || '—'}</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {h.editing && (
                    <button onClick={() => generateWithAI(idx)} disabled={aiLoading === idx} style={{ padding: '7px 14px', background: aiLoading === idx ? '#f3f4f6' : '#f5f3ff', color: aiLoading === idx ? '#9c9a92' : '#7c3aed', border: '1px solid ' + (aiLoading === idx ? 'rgba(0,0,0,0.08)' : '#c4b5fd'), borderRadius: '6px', cursor: aiLoading === idx ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {aiLoading === idx ? <><span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #c4b5fd', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Generando...</> : <>✨ Generar con IA</>}
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    {h.editing ? (
                      <button onClick={() => saveH(idx)} style={{ padding: '7px 16px', background: '#d97706', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Guardar {h.label}</button>
                    ) : (
                      <button onClick={() => editH(idx)} style={{ padding: '7px 16px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>✏️ Editar {h.label}</button>
                    )}
                  </div>
                </div>

              </div>
            ))}

            <button onClick={() => setHypothesis(prev => [...prev, { id: Date.now(), label: `H${prev.length + 1}`, titulo: `Hipótesis ${prev.length + 1}`, color: '#059669', bg: '#ecfdf5', estado: 'En desarrollo', texto: '', soportada: '', parcial: '', pendiente: '', saved: false, editing: true }])} style={{ padding: '12px', border: '2px dashed rgba(0,0,0,0.14)', borderRadius: '10px', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#6b6860' }}>
              + Agregar hipótesis
            </button>
          </div>
        )}

        {activeTab === 'Kanban' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button onClick={() => setShowNewTask(!showNewTask)} style={{ padding: '7px 14px', background: '#d97706', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>+ Nueva tarea</button>
            </div>

            {showNewTask && (
              <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px', marginBottom: '16px' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '14px' }}>Nueva tarea</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <input placeholder="Título *" value={newTask.title} onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', outline: 'none', gridColumn: '1 / -1' }} />
                  <select value={newTask.status} onChange={e => setNewTask(t => ({ ...t, status: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', background: 'white' }}>
                    <option value="todo">Por hacer</option>
                    <option value="progress">En progreso</option>
                    <option value="review">Revisión</option>
                    <option value="done">Completado</option>
                  </select>
                  <select value={newTask.priority} onChange={e => setNewTask(t => ({ ...t, priority: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', background: 'white' }}>
                    <option value="high">Alta prioridad</option>
                    <option value="medium">Media prioridad</option>
                    <option value="low">Baja prioridad</option>
                  </select>
                  <input placeholder="Responsable" value={newTask.assigned_to} onChange={e => setNewTask(t => ({ ...t, assigned_to: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', fontSize: '13px', outline: 'none', gridColumn: '1 / -1' }} />
                </div>
                <textarea placeholder="Descripción (opcional)" value={newTask.description} onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))} style={{ width: '100%', minHeight: '80px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', resize: 'none', outline: 'none', marginBottom: '10px', fontFamily: 'system-ui' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button onClick={() => setShowNewTask(false)} style={{ padding: '7px 14px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
                  <button onClick={addTask} style={{ padding: '7px 14px', background: '#d97706', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Guardar tarea</button>
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9c9a92' }}>Cargando tareas...</div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                {COLUMNS.map(col => (
                  <div key={col.id} style={{ minWidth: '220px', background: '#f0ede8', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b6860' }}>{col.label}</span>
                      <span style={{ background: 'white', color: '#6b6860', padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: '600' }}>{tasks.filter(t => t.status === col.id).length}</span>
                    </div>
                    {tasks.filter(t => t.status === col.id).map(task => (
                      <div key={task.id} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '10px 12px', marginBottom: '8px' }}>
                        <div style={{ fontWeight: '600', fontSize: '12px', color: '#1a1916', marginBottom: '4px' }}>{task.title}</div>
                        {task.description && <div style={{ fontSize: '11px', color: '#9c9a92', marginBottom: '6px' }}>{task.description}</div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <span style={{ background: priorityColor[task.priority] + '20', color: priorityColor[task.priority], padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>{priorityLabel[task.priority]}</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {col.id !== 'done' && (
                              <button onClick={() => { const next: Record<string, string> = { todo: 'progress', progress: 'review', review: 'done' }; moveTask(task.id, next[col.id]) }} style={{ padding: '2px 6px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '10px' }}>→</button>
                            )}
                            <button onClick={() => deleteTask(task.id)} style={{ padding: '2px 6px', border: '1px solid #fca5a5', borderRadius: '4px', background: '#fef2f2', cursor: 'pointer', fontSize: '10px', color: '#dc2626' }}>✕</button>
                          </div>
                        </div>
                        {task.assigned_to && <div style={{ fontSize: '10px', color: '#9c9a92', marginTop: '4px' }}>👤 {task.assigned_to}</div>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Archivos' && (
          <div>
            <div style={{ border: '2px dashed rgba(0,0,0,0.14)', borderRadius: '10px', padding: '32px', textAlign: 'center', background: '#f8f7f4', marginBottom: '16px', cursor: 'pointer' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📁</div>
              <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>Subir archivo</div>
              <div style={{ fontSize: '11px', color: '#9c9a92' }}>PDF, Word, Excel, imágenes, videos</div>
            </div>
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '18px 20px' }}>
              <div style={{ textAlign: 'center', padding: '40px', color: '#9c9a92', fontSize: '13px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
                No hay archivos aún.
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  </div>
</>
)

}