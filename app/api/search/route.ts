import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'No query' }, { status: 400 })

  try {
    const res = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=8&select=title,authorships,publication_year,primary_location,abstract_inverted_index,doi&mailto=jk.wongp@up.edu.pe`,
      { headers: { 'User-Agent': 'ResearchCopilotUP/1.0' } }
    )

    const data = await res.json()

    const results = data.results?.map((p: any) => {
      // Reconstruir abstract desde inverted index
      let abstract = ''
      if (p.abstract_inverted_index) {
        const words: { [pos: number]: string } = {}
        Object.entries(p.abstract_inverted_index).forEach(([word, positions]: [string, any]) => {
          positions.forEach((pos: number) => { words[pos] = word })
        })
        abstract = Object.keys(words).sort((a, b) => Number(a) - Number(b)).map(k => words[Number(k)]).join(' ')
      }

      const authors = p.authorships?.map((a: any) => a.author?.display_name).filter(Boolean).join(', ') || 'Desconocido'
      const journal = p.primary_location?.source?.display_name || 'Sin revista'
      const doi = p.doi?.replace('https://doi.org/', '') || ''

      return {
        titulo: p.title || 'Sin título',
        autores: authors,
        año: p.publication_year || 'S/f',
        journal,
        doi,
        tipo: 'Artículo',
        resumen: abstract || 'Abstract no disponible',
      }
    }) || []

    return NextResponse.json({ data: results })

  } catch (e) {
    return NextResponse.json({ error: 'Error al buscar' }, { status: 500 })
  }
}