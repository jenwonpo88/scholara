import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json()

    let prompt = ''

    if (type === 'state_of_art') {
      const refs = data.refs.map((r: any) =>
        `- ${r.authors || 'Autor desconocido'} (${r.year || 's.f.'}). ${r.title}. ${r.journal || ''}. ${r.abstract ? 'Abstract: ' + r.abstract.slice(0, 300) : ''}`
      ).join('\n')

      prompt = 'Eres un asistente de investigacion academica. Basandote en estas referencias bibliograficas, redacta un estado del arte academico de 400-600 palabras en español. El texto debe sintetizar los principales aportes, identificar corrientes teoricas, señalar debates actuales y mencionar vacios de investigacion. Escribe en prosa academica fluida, citando autores en formato APA dentro del texto. Referencias disponibles:\n' + refs + '\nRedacta solo el texto del estado del arte, sin titulos ni encabezados.'
    }

    if (type === 'marco_teorico') {
      const refs = data.refs.map((r: any) =>
        `- ${r.authors || 'Autor desconocido'} (${r.year || 's.f.'}). ${r.title}. ${r.abstract ? r.abstract.slice(0, 300) : ''}`
      ).join('\n')

      prompt = 'Eres un asistente de investigacion academica. Basandote en estas referencias, redacta un marco teorico academico de 500-700 palabras en español. Organiza las corrientes teoricas principales, explica los conceptos clave y relacionalos con el tema de investigacion. Escribe en prosa academica, citando en formato APA. Referencias:\n' + refs + '\nRedacta solo el texto del marco teorico.'
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 2000,
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: 500 })
    }

    const result = await response.json()
    const text = result.choices[0].message.content

    return NextResponse.json({ summary: text })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}