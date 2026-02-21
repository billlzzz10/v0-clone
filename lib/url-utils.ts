export function getUrlWithoutRefreshParam(currentUrl: string): string {
  const url = new URL(currentUrl)
  url.searchParams.delete('refresh')

  return `${url.pathname}${url.search}`
}

