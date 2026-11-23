/** Best-effort haptics. Android Chrome supports vibration; iOS Safari ignores it silently. */
export function buzz(pattern: number | number[] = 12): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}
