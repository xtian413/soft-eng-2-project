export type StitchHtmlParts = {
  bodyHtml: string
  bodyClass: string
  headStyles: string
  navHtml: string | null
}

export function extractStitchHtml(html: string): StitchHtmlParts {
  const bodyTagMatch = html.match(/<body([^>]*)>/i)
  const bodyClassMatch = bodyTagMatch?.[1].match(/class=["']([^"']*)/i)
  const bodyClass = bodyClassMatch ? bodyClassMatch[1] : ''
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyHtml = bodyMatch ? bodyMatch[1] : html
  const styleMatches = html.match(/<style[\s\S]*?<\/style>/gi) || []
  const headStyles = styleMatches.join('\n')
  const navMatch = bodyHtml.match(/<nav[\s\S]*?<\/nav>/i)

  return {
    bodyHtml: navMatch ? bodyHtml.replace(navMatch[0], '') : bodyHtml,
    bodyClass,
    headStyles,
    navHtml: navMatch ? navMatch[0] : null,
  }
}
