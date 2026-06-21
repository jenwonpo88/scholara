import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { headers, rows, stats, fileName } = await req.json()
  const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID!

  const { data: project } = await supabase
    .from('projects')
    .select('title, description')
    .eq('id', PROJECT_ID)
    .single()

  const projectTitle = project ? project.title : 'la investigación'

  // Preparar muestra de datos (máx 20 filas para no exceder tokens)
  const sample = rows.slice(0, 20)
  const dataPreview = headers.join(', ') + '\n' +
    sample.map((row: any[]) => row.join(', ')).join('\n')

  const statsText = stats.map((s: any) => s.label + ': ' + s.value + ' (' + s.sub + ')').join('. ')

  const prompt = 'Eres un experto en análisis estadístico e investigación académica. ' +
    'La investigación se titula: "' + projectTitle + '". ' +
    'Analiza los siguientes datos de encuesta y genera un análisis académico completo en español. ' +
    'El análisis debe incluir: 1) Descripción general de los datos, 2) Hallazgos principales, ' +
    '3) Patrones o tendencias relevantes, 4) Relación con la investigación, 5) Conclusiones preliminares. ' +
    'Escribe en prosa académica formal, sin usar markdown ni asteriscos, solo texto plano con párrafos.'

  const userMessage = 'Archivo: ' + fileName + '. ' +
    'Estadísticos: ' + statsText + '. ' +
    'Muestra de datos (' + rows.length + ' filas totales, mostrando ' + sample.length + '):\n' + dataPreview

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 1024,
  })

  const analysis = completion.choices[0].message.content || ''
  return NextResponse.json({ analysis })
}