import { randomAvatar, sanitizeAvatar, type AvatarConfig } from "./avatar/config";

export interface Profile {
  name: string;
  avatar: AvatarConfig;
}

const KEY = "sketch-party.profile.v1";

/** Saved profile from this browser, or a fresh random avatar. Storage can be blocked, so never throw. */
export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<Profile>;
      return { name: typeof data.name === "string" ? data.name.slice(0, 32) : "", avatar: sanitizeAvatar(data.avatar) };
    }
  } catch {
    /* ignore */
  }
  return { name: "", avatar: randomAvatar() };
}

export function saveProfile(profile: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}
