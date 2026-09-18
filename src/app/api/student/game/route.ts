import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// The student portal has no real Supabase Auth session (see
// src/components/student/studentSession.ts) — students are identified only
// by a member id kept in localStorage, the same trust model already
// accepted for reading their own profile/attendance. Because of that, the
// memberId in the request body isn't independently verifiable server-side;
// what *is* enforced here, and can't be, on the client alone, is the shape
// of the data itself — exactly 4 or 5 tags, unique priorities 1-5, unique
// tags, all of them real catalog entries — before anything is written.
const getEnv = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: 'Missing Supabase environment variables on the server.' }
  }

  return { supabaseUrl, serviceRoleKey }
}

interface GameTagInput {
  tagId: string
  priority: number
}

const validateTags = (tags: unknown): { tags: GameTagInput[] } | { error: string } => {
  if (!Array.isArray(tags) || tags.length < 4 || tags.length > 5) {
    return { error: 'Escolhe entre 4 e 5 tags.' }
  }

  const parsed: GameTagInput[] = []
  for (const entry of tags) {
    const tagId = String((entry as any)?.tagId || '').trim()
    const priority = Number((entry as any)?.priority)
    if (!tagId) return { error: 'Tag inválida.' }
    if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
      return { error: 'Prioridade inválida — tem de ser um número entre 1 e 5.' }
    }
    parsed.push({ tagId, priority })
  }

  const uniqueTagIds = new Set(parsed.map((t) => t.tagId))
  if (uniqueTagIds.size !== parsed.length) {
    return { error: 'Não podes escolher a mesma tag duas vezes.' }
  }

  const uniquePriorities = new Set(parsed.map((t) => t.priority))
  if (uniquePriorities.size !== parsed.length) {
    return { error: 'Cada tag tem de ter uma prioridade diferente.' }
  }

  return { tags: parsed }
}

export async function POST(request: Request) {
  const env = getEnv()
  if ('error' in env) {
    return NextResponse.json({ error: env.error }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  const memberId = String(body?.memberId || '').trim()
  if (!memberId) {
    return NextResponse.json({ error: 'Missing memberId.' }, { status: 400 })
  }

  const validation = validateTags(body?.tags)
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey)

  const { data: member } = await adminClient.from('members').select('id').eq('id', memberId).maybeSingle()
  if (!member) {
    return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 })
  }

  const tagIds = validation.tags.map((t) => t.tagId)
  const { data: existingTags, error: tagsError } = await adminClient.from('game_tags').select('id').in('id', tagIds)
  if (tagsError) {
    return NextResponse.json({ error: tagsError.message }, { status: 500 })
  }
  if ((existingTags || []).length !== tagIds.length) {
    return NextResponse.json({ error: 'Uma ou mais tags não existem.' }, { status: 400 })
  }

  const { error: deleteError } = await adminClient.from('member_game').delete().eq('member_id', memberId)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  const rows = validation.tags.map((t) => ({ member_id: memberId, tag_id: t.tagId, priority: t.priority }))
  const { error: insertError } = await adminClient.from('member_game').insert(rows)
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
