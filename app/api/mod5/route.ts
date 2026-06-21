import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { sectionKey, sectionLabel, content } = await req.json()
  const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID!

  const { data: project } = await supabase
    .from('projects')
    .select('title, description')
    .eq('id', PROJECT_ID)
    .single()

  const projectTitle = project ? project.title : 'la investigación'

  const prompt = 'Eres un experto en redacción académica universitaria. ' +
    'La investigación se titula: "' + projectTitle + '". ' +
    'Mejora el texto de la sección "' + sectionLabel + '" manteniendo el contenido original pero mejorando: ' +
    '1) Claridad y coherencia académica, 2) Estructura del argumento, 3) Lenguaje formal, ' +
    '4) Conexión con el tema de investigación. ' +
    'Devuelve SOLO el texto mejorado, sin explicaciones ni comentarios.'

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Mejora este texto:\n\n' + content },
    ],
    max_tokens: 2048,
  })

  const improved = completion.choices[0].message.content || ''
  return NextResponse.json({ improved })
}