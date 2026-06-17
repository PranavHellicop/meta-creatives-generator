"use client";

import { useSyncExternalStore } from "react";
import {
  notificationsEnabled,
  setNotificationsEnabled,
  notificationsSupported,
  requestNotificationPermission,
  playPing,
  NOTIFY_CHANGED_EVENT,
} from "@/lib/notify";

// Subscribe to localStorage changes (same-tab via custom event, cross-tab via "storage").
function subscribe(cb: () => void) {
  window.addEventListener(NOTIFY_CHANGED_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(NOTIFY_CHANGED_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

// Header toggle: turn "generation finished" browser notifications (+ ping) on/off.
// Turning on requests permission and plays a short test ping so the user knows the
// sound. The preference is persisted in localStorage and read by the project poller.
export function NotificationToggle() {
  // SSR-safe reads of client-only state (localStorage / Notification support).
  const on = useSyncExternalStore(subscribe, notificationsEnabled, () => false);
  const supported = useSyncExternalStore(subscribe, notificationsSupported, () => false);

  async function toggle() {
    if (on) {
      setNotificationsEnabled(false);
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      alert(
        "Notifications are blocked for this site. Enable them in your browser's site settings to get a ping when generation finishes."
      );
      return;
    }
    setNotificationsEnabled(true);
    playPing(); // confirm sound on the enabling gesture (autoplay-safe)
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={on ? "Notifications on — click to mute" : "Notify me when generation finishes"}
      aria-pressed={on}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
        on
          ? "border-accent/50 bg-accent/10 text-accent"
          : "border-border text-muted hover:text-foreground hover:border-accent/40"
      }`}
    >
      <BellIcon muted={!on} />
      <span className="hidden sm:inline">{on ? "Alerts on" : "Alerts off"}</span>
    </button>
  );
}

function BellIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      {muted && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}
