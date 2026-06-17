// Client-only helpers for "generation finished" browser notifications + a gentle
// ping sound. The on/off preference lives in localStorage so it persists and is
// shared across pages (the header toggle writes it; the project poller reads it).

const KEY = "mcg:notifications";

export function notificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "on";
}

export const NOTIFY_CHANGED_EVENT = "mcg:notify-changed";

export function setNotificationsEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, on ? "on" : "off");
  // Let same-tab subscribers (the header toggle) react immediately.
  window.dispatchEvent(new Event(NOTIFY_CHANGED_EVENT));
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

// Ask for permission (no-op if already decided). Returns true if granted.
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

export function showNotification(title: string, body: string): void {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    /* some browsers throw if called outside a SW in certain contexts */
  }
}

// A short, gentle two-note chime synthesized with Web Audio (no asset needed).
// Best-effort: if the browser blocks audio without a recent gesture, it stays silent.
export function playPing(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    void ctx.resume();
    const start = ctx.currentTime + 0.01;
    // A5 then D6 — soft, rising, quick.
    [{ f: 880, t: 0 }, { f: 1174.66, t: 0.13 }].forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const at = start + t;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.1, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.4);
    });
    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    /* audio unavailable — notification (if any) still fires */
  }
}
