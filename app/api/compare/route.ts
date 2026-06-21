import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { interviews, type } = await req.json()

    const transcripts = interviews.map((e: any, i: number) =>
      `Entrevista ${i + 1} (${e.participant_name}): ${e.transcript?.slice(0, 1500) || ''}`
    ).join('\n\n---\n\n')

    let prompt = ''

    if (type === 'comparative') {
      prompt = 'Analiza estas entrevistas academicas y haz un analisis comparativo. Responde UNICAMENTE con JSON sin markdown: {"patrones_comunes":["patron1","patron2"],"diferencias":["diferencia1"],"temas_por_entrevista":[{"participante":"nombre","temas_principales":["tema1"]}],"conclusion":"texto de conclusion comparativa"} Entrevistas: ' + transcripts
    } else if (type === 'sentiment') {
      prompt = 'Analiza el sentimiento y actitud de cada entrevistado. Responde UNICAMENTE con JSON sin markdown: {"analisis":[{"participante":"nombre","sentimiento_general":"Positivo|Negativo|Neutro|Mixto","actitud_hacia_tema":"descripcion","frases_clave":["frase1"],"nivel_entusiasmo":"Alto|Medio|Bajo"}],"conclusion":"texto"} Entrevistas: ' + transcripts
    } else if (type === 'categories') {
      prompt = 'Analiza estas entrevistas y crea un mapa de categorias emergentes con codificacion cualitativa. Responde UNICAMENTE con JSON sin markdown: {"categorias":[{"nombre":"nombre categoria","descripcion":"desc","frecuencia":3,"participantes":["nombre1"],"citas":["cita textual"]}],"conclusion":"texto"} Entrevistas: ' + transcripts
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
        temperature: 0.3,
        max_tokens: 3000,
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: 500 })
    }

    const data = await response.json()
    const text = data.choices[0].message.content
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return NextResponse.json(result)

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}