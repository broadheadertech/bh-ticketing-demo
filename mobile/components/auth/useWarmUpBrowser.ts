// useWarmUpBrowser.ts — Clerk's recommended Android optimisation: pre-warm the
// system browser so the OAuth redirect opens instantly, and cool it down on
// unmount. No-op on web. See Clerk Expo OAuth docs.
import { useEffect } from "react";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export function useWarmUpBrowser() {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}
