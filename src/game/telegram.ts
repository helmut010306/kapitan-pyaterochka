export type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  enableClosingConfirmation?: () => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
  };
  isVersionAtLeast?: (version: string) => boolean;
  platform?: string;

  colorScheme?: string;
  initData?: string;
  initDataUnsafe?: { user?: { first_name?: string; username?: string } };
};

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export function getTelegram(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function initTelegram(): TelegramWebApp | null {
  const tg = getTelegram();
  if (!tg) return null;
  try {
    tg.ready();
    tg.expand();
    if (tg.isVersionAtLeast?.("7.7")) tg.disableVerticalSwipes?.();
    if (tg.isVersionAtLeast?.("6.1")) {
      tg.setHeaderColor?.("#070B14");
      tg.setBackgroundColor?.("#070B14");
    }
    if (tg.isVersionAtLeast?.("6.2")) tg.enableClosingConfirmation?.();

  } catch {
    /* older clients */
  }
  return tg;
}


export function haptic(kind: "light" | "medium" | "heavy" | "success" | "error" = "light") {
  const tg = getTelegram();
  if (!tg?.isVersionAtLeast?.("6.1")) return;
  const h = tg.HapticFeedback;
  if (!h) return;
  try {
    if (kind === "success" || kind === "error") h.notificationOccurred(kind);
    else h.impactOccurred(kind);
  } catch {
    /* ignore */
  }
}

