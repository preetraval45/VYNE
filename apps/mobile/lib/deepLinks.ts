/**
 * Deep link routing for Vyne mobile.
 *
 * Supported patterns:
 *   vyne://chat/<channelId>        → /(tabs)/chat?channelId=<channelId>
 *   vyne://chat/dm/<userId>        → /(tabs)/chat?dmUserId=<userId>
 *   vyne://projects/<projectId>    → /(tabs)/projects?projectId=<projectId>
 *   vyne://finance                 → /(tabs)/finance
 *   vyne://erp/scan/<sku>          → /(tabs)/erp with scan pre-filled
 *   https://vyne.ai/app/<path>     → same as above
 */

export interface ParsedDeepLink {
  tab: 'chat' | 'projects' | 'finance' | 'erp' | 'index' | null
  params: Record<string, string>
}

export function parseDeepLink(url: string): ParsedDeepLink | null {
  if (!url) return null

  let path = ''

  // Handle vyne:// scheme
  if (url.startsWith('vyne://')) {
    path = url.replace('vyne://', '')
  }
  // Handle https://vyne.ai/app/...
  else if (url.includes('vyne.ai/app/')) {
    path = url.split('vyne.ai/app/')[1] ?? ''
  } else {
    return null
  }

  const [segment, ...rest] = path.split('/')

  switch (segment) {
    case 'chat': {
      if (rest[0] === 'dm' && rest[1]) {
        return { tab: 'chat', params: { dmUserId: rest[1] } }
      }
      if (rest[0]) {
        return { tab: 'chat', params: { channelId: rest[0] } }
      }
      return { tab: 'chat', params: {} }
    }

    case 'projects': {
      const projectId = rest[0]
      return { tab: 'projects', params: projectId ? { projectId } : {} }
    }

    case 'finance':
      return { tab: 'finance', params: {} }

    case 'erp': {
      if (rest[0] === 'scan' && rest[1]) {
        return { tab: 'erp', params: { scanSku: rest[1] } }
      }
      return { tab: 'erp', params: {} }
    }

    case 'home':
    case '':
      return { tab: 'index', params: {} }

    default:
      return null
  }
}
