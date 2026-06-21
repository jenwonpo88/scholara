import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { label, titulo, texto, soportada, parcial, pendiente } = await req.json()
  const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID!

  // Traer proyecto y referencias en paralelo
  const [{ data: project }, { data: refs }] = await Promise.all([
    supabase.from('projects').select('title, description').eq('id', PROJECT_ID).single(),
    supabase.from('bibliography').select('title').eq('project_id', PROJECT_ID).limit(10),
  ])

  const projectTitle = project ? project.title : 'la investigación'
  const projectDesc = project ? project.description : ''
  const refList = refs && refs.length > 0
    ? refs.map((r: any, i: number) => (i + 1) + '. ' + r.title).join('; ')
    : 'Sin referencias aún'

  const systemPrompt = 'Eres un experto en metodología de investigación académica universitaria. ' +
    'La investigación se titula: "' + projectTitle + '". ' +
    'Descripción: ' + projectDesc + '. ' +
    'Referencias del marco teórico: ' + refList + '. ' +
    'Genera hipótesis directamente relacionadas con este tema y fundamentadas en estas referencias. ' +
    'Responde SOLO con JSON válido con esta estructura exacta: ' +
    '{ "texto": "hipótesis en formato académico formal relacionada con ' + projectTitle + '", ' +
    '"soportada": "evidencia de las referencias que la respalda (1-2 líneas)", ' +
    '"parcial": "aspectos no resueltos aún (1-2 líneas)", ' +
    '"pendiente": "lo que falta validar (1-2 líneas)", ' +
    '"estado": "En desarrollo" }'

  const userMessage = 'Genera la hipótesis ' + label + ' titulada "' + titulo + '" ' +
    'para la investigación sobre: ' + projectTitle + '. ' +
    (texto ? 'Mejora este borrador: ' + texto + '. ' : '') +
    (soportada ? 'Considera esta evidencia previa: ' + soportada + '. ' : '') +
    'Usa las referencias del marco teórico como base.'

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })

  try {
    const result = JSON.parse(completion.choices[0].message.content!)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Error al parsear respuesta' }, { status: 500 })
  }
}