import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { transcript, projectContext } = await req.json()

    const prompt = 'Analiza esta entrevista academica. Contexto: ' + projectContext + '. Transcripcion: ' + transcript + '. Responde UNICAMENTE con JSON valido sin markdown con esta estructura: {"temas_recurrentes":["tema1"],"hallazgos":[{"titulo":"titulo","descripcion":"desc"}],"citas_destacadas":[{"texto":"cita","timestamp":"00:00"}],"insights":[{"titulo":"titulo","contenido":"contenido","prioridad":"Alta"}],"contradicciones":["item"],"oportunidades":["item"],"resumen_ejecutivo":"resumen"}'

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: 500 })
    }

    const data = await response.json()
    console.log('Groq response:', JSON.stringify(data, null, 2))
    const text = data.choices[0].message.content
    const clean = text.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(clean)

    return NextResponse.json(analysis)

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}