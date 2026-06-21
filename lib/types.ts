export type Project = {
  id: string
  user_id: string
  title: string
  description: string
  status: string
  progress: number
  created_at: string
}

export type Interview = {
  id: string
  project_id: string
  participant_name: string
  participant_profile: string
  audio_url: string
  transcript: string
  analysis: {
    temas_recurrentes: string[]
    hallazgos: { titulo: string; descripcion: string }[]
    citas_destacadas: { texto: string; timestamp: string }[]
    insights: { titulo: string; contenido: string; prioridad: string }[]
  }
  duration_minutes: number
  status: string
  recorded_at: string
  created_at: string
}

export type Insight = {
  id: string
  project_id: string
  interview_id: string
  title: string
  content: string
  quote: string
  timestamp_ref: string
  priority: string
  tags: string[]
  created_at: string
}

export type Bibliography = {
  id: string
  project_id: string
  title: string
  authors: string
  year: number
  journal: string
  doi: string
  abstract: string
  ai_summary: string
  tags: string[]
  created_at: string
}

export type PaperSection = {
  id: string
  project_id: string
  section_key: string
  content: string
  version: number
  updated_at: string
}