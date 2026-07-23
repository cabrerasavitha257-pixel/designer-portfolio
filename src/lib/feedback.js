import { cloudEnabled, getSupabase } from './supabase'

const VISITOR_KEY = 'portfolio-feedback-visitor-v1'
const MAX_MESSAGE_LENGTH = 500

function hashString(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function getFeedbackIdentity() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(VISITOR_KEY) || 'null')
    if (stored?.id && Number.isFinite(stored.seed)) return stored
  } catch {
    // Regenerate a local identity when stale browser data cannot be parsed.
  }

  const id = window.crypto.randomUUID()
  const identity = { id, seed: hashString(id) }
  window.localStorage.setItem(VISITOR_KEY, JSON.stringify(identity))
  return identity
}

function ensureCloud() {
  if (!cloudEnabled) throw new Error('留言服务尚未连接云端，请稍后再试。')
}

export async function submitFeedbackMessage(message) {
  ensureCloud()
  const content = String(message || '').trim()
  if (!content) throw new Error('请先填写优化建议。')
  if (content.length > MAX_MESSAGE_LENGTH) throw new Error(`建议内容不能超过 ${MAX_MESSAGE_LENGTH} 个字。`)

  const identity = getFeedbackIdentity()
  const { error } = await getSupabase().from('feedback_messages').insert({
    visitor_id: identity.id,
    avatar_seed: identity.seed,
    content,
    is_public: false,
  })

  if (error) throw error
  return identity
}

export async function loadFeedbackMessages(includePrivate = false) {
  ensureCloud()
  let query = getSupabase()
    .from('feedback_messages')
    .select('id, avatar_seed, content, is_public, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!includePrivate) query = query.eq('is_public', true)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function setFeedbackVisibility(id, isPublic) {
  ensureCloud()
  const { error } = await getSupabase()
    .from('feedback_messages')
    .update({ is_public: Boolean(isPublic) })
    .eq('id', id)

  if (error) throw error
}

export async function deleteFeedbackMessage(id) {
  ensureCloud()
  const { error } = await getSupabase().from('feedback_messages').delete().eq('id', id)
  if (error) throw error
}
