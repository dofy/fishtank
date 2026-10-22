import { HEART_MAX } from './core/balance'
import type { Locale } from './core/types'

export const REMINDER_KEY = 'fishtank.heart-reminder.v1'
type Preference = { enabled: boolean; armed: boolean }
type HeartState = { hearts: number; locale?: Locale }
export type ReminderStatus = 'unsupported' | 'denied' | 'error' | 'enabled' | 'disabled'
export interface ReminderEnvironment {
  supported(): boolean
  permission(): NotificationPermission
  requestPermission(): Promise<NotificationPermission>
  read(): string | null
  write(value: string): void
  notify(locale: Locale): Promise<void>
  exclusive(run: () => Promise<void>): Promise<void>
}

/** Device-local opt-in: notification permissions must never travel with game saves. */
export class HeartReminder {
  private failed = false
  private pending = false
  constructor(private readonly env: ReminderEnvironment) {}

  private preference(): Preference {
    const raw = this.env.read()
    if (raw) {
      try {
        const value = JSON.parse(raw)
        if (typeof value.enabled === 'boolean' && typeof value.armed === 'boolean') return value
      } catch { /* Invalid preferences default to disabled. */ }
    }
    return { enabled: false, armed: false }
  }

  enabled(): boolean {
    try { return this.preference().enabled } catch { return false }
  }

  status(): ReminderStatus {
    if (!this.env.supported()) return 'unsupported'
    if (this.env.permission() === 'denied') return 'denied'
    try {
      if (this.failed) return 'error'
      return this.preference().enabled && this.env.permission() === 'granted' ? 'enabled' : 'disabled'
    } catch { return 'error' }
  }

  async enable(): Promise<void> {
    if (this.pending || !this.env.supported()) return
    this.pending = true
    this.failed = false
    try {
      // Called directly from a user gesture; never request permission on startup.
      const permission = this.env.permission() === 'default'
        ? await this.env.requestPermission() : this.env.permission()
      if (permission === 'granted') {
        this.env.write(JSON.stringify({ enabled: true, armed: true }))
      }
    } catch { this.failed = true }
    finally { this.pending = false }
  }

  disable(): void {
    this.failed = false
    try { this.env.write(JSON.stringify({ enabled: false, armed: false })) }
    catch { this.failed = true }
  }

  async check(state: () => HeartState): Promise<void> {
    if (this.failed || this.pending || !this.env.supported() || this.env.permission() !== 'granted') return
    try {
      // Web Locks serialize the read/claim across tabs. Read the current game
      // again inside the lock so a queued check cannot notify after breeding.
      await this.env.exclusive(async () => {
        if (this.failed || this.env.permission() !== 'granted') return
        const pref = this.preference()
        if (!pref.enabled) return
        const current = state()
        if (current.hearts < HEART_MAX) {
          if (!pref.armed) this.env.write(JSON.stringify({ enabled: true, armed: true }))
        } else if (pref.armed) {
          this.env.write(JSON.stringify({ enabled: true, armed: false }))
          try { await this.env.notify(current.locale ?? 'zh') }
          catch (error) {
            // Permit a deliberate retry through the setting, not every tick.
            this.failed = true
            this.env.write(JSON.stringify({ enabled: false, armed: false }))
            throw error
          }
        }
      })
    } catch { this.failed = true }
  }
}

export const heartReminder = new HeartReminder({
  supported: () => typeof Notification !== 'undefined' && window.isSecureContext,
  permission: () => Notification.permission,
  requestPermission: () => Notification.requestPermission(),
  read: () => localStorage.getItem(REMINDER_KEY),
  write: value => localStorage.setItem(REMINDER_KEY, value),
  exclusive: async run => {
    if (navigator.locks) await navigator.locks.request('fishtank-heart-reminder', run)
    else await run()
  },
  notify: async locale => {
    const title = locale === 'zh' ? 'Fishtank · 繁育爱心已满' : 'Fishtank · Breeding hearts are full'
    const options: NotificationOptions = {
      body: locale === 'zh' ? '5 颗爱心已恢复，可以回来繁育小鱼了。' : 'All 5 hearts are ready. Come back to breed your fish.',
      icon: '/icon-192.png', tag: 'fishtank-hearts-full',
    }
    const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
    if (registration?.active) await registration.showNotification(title, options)
    else {
      const notification = new Notification(title, options)
      notification.onclick = () => { window.focus(); notification.close() }
    }
  },
})
