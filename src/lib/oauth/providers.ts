import type { EmailProvider } from '../../types'

export interface OAuthProviderConfig {
  id: EmailProvider
  name: string
  brandColor: string
  authUrl: string
  tokenUrl: string
  scopes: string[]
  clientIdKey: 'googleClientId' | 'microsoftClientId' | 'yahooClientId'
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    brandColor: '#ea4335',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'openid',
      'email',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
    clientIdKey: 'googleClientId',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Outlook',
    brandColor: '#0078d4',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: [
      'openid',
      'email',
      'offline_access',
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Calendars.Read',
    ],
    clientIdKey: 'microsoftClientId',
  },
  outlook: {
    id: 'outlook',
    name: 'Outlook',
    brandColor: '#0078d4',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: [
      'openid',
      'email',
      'offline_access',
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Calendars.Read',
    ],
    clientIdKey: 'microsoftClientId',
  },
  yahoo: {
    id: 'yahoo',
    name: 'Yahoo Mail',
    brandColor: '#6001d2',
    authUrl: 'https://api.login.yahoo.com/oauth2/request_auth',
    tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
    scopes: ['openid', 'email', 'mail-r'],
    clientIdKey: 'yahooClientId',
  },
}

export function getProviderConfig(provider: EmailProvider): OAuthProviderConfig {
  return OAUTH_PROVIDERS[provider] ?? OAUTH_PROVIDERS.gmail
}
