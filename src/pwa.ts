/** GPU/theme initialization may complete after the browser's load event. */
export function registerOfflineCache(): void {
  if (!('serviceWorker' in navigator) || window.location.protocol !== 'https:') return
  const register = () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Keep the game playable when registration is restricted. */
    })
  }
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}
