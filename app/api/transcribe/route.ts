import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('audio') as File

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    }

    // Enviar a Groq Whisper
    const groqFormData = new FormData()
    groqFormData.append('file', file)
    groqFormData.append('model', 'whisper-large-v3')
    groqFormData.append('language', 'es')
    groqFormData.append('response_format', 'json')

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: groqFormData,
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: 500 })
    }

    const result = await response.json()
    return NextResponse.json({ text: result.text })

  } catch (error) {
    return NextResponse.json({ error: 'Error al transcribir' }, { status: 500 })
  }
}