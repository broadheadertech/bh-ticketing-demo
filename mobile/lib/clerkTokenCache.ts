// clerkTokenCache.ts — persists Clerk's session JWT in the device secure store
// so the user stays signed in across launches. Passed to <ClerkProvider
// tokenCache={tokenCache}>.
import * as SecureStore from "expo-secure-store";

// Matches @clerk/clerk-expo's TokenCache shape without depending on its deep
// internal type path (which is not part of the package's public exports).
type TokenCache = {
  getToken: (key: string) => Promise<string | undefined | null>;
  saveToken: (key: string, token: string) => Promise<void>;
  clearToken?: (key: string) => void;
};

export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      // If the item is corrupt, clear it so the next save can succeed.
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // ignore
      }
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // ignore — auth still works in-memory for the current session
    }
  },
};
