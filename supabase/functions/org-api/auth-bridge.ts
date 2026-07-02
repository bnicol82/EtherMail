import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export type AuthBridgeResult = {
  authUserId: string
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/** Create or link a Supabase Auth user and mint a session for enterprise SSO. */
export async function bridgeSsoToSupabaseAuth(
  db: SupabaseClient,
  email: string,
  member: { id: string; role: string; name?: string },
  orgId: string,
): Promise<AuthBridgeResult | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return null

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let authUserId = member.id ? await findAuthUserId(db, member.id) : null

  if (!authUserId) {
    const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = listed?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (existing) {
      authUserId = existing.id
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { name: member.name ?? email.split('@')[0] },
        app_metadata: {
          org_id: orgId,
          member_id: member.id,
          role: member.role,
        },
      })
      if (error || !created.user) throw new Error(error?.message ?? 'Failed to create auth user')
      authUserId = created.user.id
    }

    await db.from('org_members').update({ auth_user_id: authUserId }).eq('id', member.id)
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError || !link?.properties?.action_link) {
    throw new Error(linkError?.message ?? 'Failed to mint Supabase session')
  }

  const tokens = extractTokensFromActionLink(link.properties.action_link)
  if (!tokens.accessToken || !tokens.refreshToken) {
    throw new Error('Supabase session tokens missing from magic link')
  }

  return {
    authUserId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn ?? 3600,
  }
}

async function findAuthUserId(db: SupabaseClient, memberId: string): Promise<string | null> {
  const { data } = await db.from('org_members').select('auth_user_id').eq('id', memberId).maybeSingle()
  return data?.auth_user_id ? String(data.auth_user_id) : null
}

function extractTokensFromActionLink(actionLink: string) {
  const url = new URL(actionLink)
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
  const query = url.searchParams
  const accessToken = hash.get('access_token') ?? query.get('access_token')
  const refreshToken = hash.get('refresh_token') ?? query.get('refresh_token')
  const expiresIn = Number(hash.get('expires_in') ?? query.get('expires_in') ?? '3600')
  return { accessToken, refreshToken, expiresIn }
}
