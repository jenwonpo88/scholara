import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { Interview, Insight, Bibliography, PaperSection } from './types'

// Hook para obtener entrevistas
export function useInterviews(projectId: string) {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (!error && data) setInterviews(data)
      setLoading(false)
    }
    fetch()
  }, [projectId])

  return { interviews, loading }
}

// Hook para obtener insights
export function useInsights(projectId: string) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (!error && data) setInsights(data)
      setLoading(false)
    }
    fetch()
  }, [projectId])

  return { insights, loading }
}

// Hook para obtener bibliografía
export function useBibliography(projectId: string) {
  const [bibliography, setBibliography] = useState<Bibliography[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('bibliography')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (!error && data) setBibliography(data)
      setLoading(false)
    }
    fetch()
  }, [projectId])

  return { bibliography, loading }
}

// Hook para secciones del paper
export function usePaperSections(projectId: string) {
  const [sections, setSections] = useState<PaperSection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('paper_sections')
        .select('*')
        .eq('project_id', projectId)

      if (!error && data) setSections(data)
      setLoading(false)
    }
    fetch()
  }, [projectId])

  async function saveSection(sectionKey: string, content: string) {
    const existing = sections.find(s => s.section_key === sectionKey)

    if (existing) {
      await supabase
        .from('paper_sections')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('paper_sections')
        .insert({ project_id: projectId, section_key: sectionKey, content })
    }
  }

  return { sections, loading, saveSection }
}