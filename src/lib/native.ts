import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

/** True inside the installed Android app (Capacitor), false in a browser. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * In the Android app, browser downloads don't exist, so files are written to the app's
 * cache and handed to the system share sheet (Save to gallery, Files, Drive, Set as wallpaper…).
 */
export async function shareFileNative(blob: Blob, filename: string, title: string): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
  const written = await Filesystem.writeFile({ path: filename, data: await blobToBase64(blob), directory: Directory.Cache });
  await Share.share({ title, files: [written.uri] });
}

/** Keep the screen on during a focus session in the Android app. */
export async function setKeepAwake(on: boolean): Promise<void> {
  if (!isNative()) return;
  const { KeepAwake } = await import('@capacitor-community/keep-awake');
  await (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep());
}

/** Status bar icons: dark on Marble, light on Nero. */
export function setSystemBarsForTheme(dark: boolean): void {
  if (!isNative()) return;
  SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
}
