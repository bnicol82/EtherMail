import type { FeatureId } from '../types/admin'
import type { EmailProvider } from '../types'

export function providerFeatureId(provider: EmailProvider): FeatureId {
  switch (provider) {
    case 'gmail':
      return 'provider_gmail'
    case 'outlook':
      return 'provider_outlook'
    case 'yahoo':
      return 'provider_yahoo'
    default:
      return 'provider_enterprise'
  }
}
