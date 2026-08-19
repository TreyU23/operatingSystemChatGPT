export const MUSIC_PROVIDER_IDS = ["apple", "spotify"];

export const MUSIC_PROVIDERS = {
  apple: {
    id: "apple",
    name: "Apple Music",
    shortName: "Apple",
    icon: "/assets/app-apple-music.svg",
    externalUrl: "https://music.apple.com/",
    placeholder: "https://music.apple.com/us/playlist/...",
    linkLabel: "Playlist, album, or song link",
    contentLabel: "playlist, album, or song",
    playerDescription: "Apple’s web player for browsing, with the original Live Desktop controls connected locally through Windows.",
  },
  spotify: {
    id: "spotify",
    name: "Spotify",
    shortName: "Spotify",
    icon: "/assets/app-spotify.svg",
    externalUrl: "https://open.spotify.com/",
    placeholder: "https://open.spotify.com/playlist/...",
    linkLabel: "Playlist, album, track, artist, show, or episode link",
    contentLabel: "playlist, album, track, artist, show, or episode",
    playerDescription: "Spotify’s web player for browsing, with the original Live Desktop controls connected locally through Windows.",
  },
};

export const APPLE_MUSIC_STARTER = {
  sourceUrl: "https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb",
  embedUrl: "https://embed.music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb",
};

export const EMPTY_MUSIC_CONNECTION = { sourceUrl: "", embedUrl: "" };

export function normalizeAppleMusicUrl(value) {
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || !["music.apple.com", "embed.music.apple.com"].includes(url.hostname)) {
    throw new Error("Paste a valid Apple Music song, album, or playlist link.");
  }
  url.hostname = "embed.music.apple.com";
  return url.toString();
}

export function normalizeSpotifyUrl(value) {
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || url.hostname !== "open.spotify.com") {
    throw new Error("Paste a valid open.spotify.com link.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0]?.startsWith("intl-")) parts.shift();
  if (parts[0] === "embed") parts.shift();

  const supportedTypes = new Set(["album", "artist", "episode", "playlist", "show", "track"]);
  const [type, id] = parts;
  if (!supportedTypes.has(type) || !/^[A-Za-z0-9]+$/.test(id || "")) {
    throw new Error("Paste a Spotify playlist, album, track, artist, show, or episode link.");
  }

  return `https://open.spotify.com/embed/${type}/${id}`;
}

export function normalizeMusicUrl(providerId, value) {
  return providerId === "spotify" ? normalizeSpotifyUrl(value) : normalizeAppleMusicUrl(value);
}

export function createDefaultMusicIntegration() {
  return {
    provider: "apple",
    connections: {
      apple: { ...APPLE_MUSIC_STARTER },
      spotify: { ...EMPTY_MUSIC_CONNECTION },
    },
  };
}

export function migrateMusicIntegration(saved) {
  const fallback = createDefaultMusicIntegration();
  if (!saved || typeof saved !== "object") return fallback;

  if (saved.provider && saved.connections) {
    const provider = MUSIC_PROVIDER_IDS.includes(saved.provider) ? saved.provider : "apple";
    return {
      provider,
      connections: {
        apple: saved.connections.apple?.embedUrl ? saved.connections.apple : fallback.connections.apple,
        spotify: saved.connections.spotify?.embedUrl ? saved.connections.spotify : { ...EMPTY_MUSIC_CONNECTION },
      },
    };
  }

  // Preserve the pre-provider Apple Music local-storage shape.
  if (saved.embedUrl) {
    return {
      ...fallback,
      connections: { ...fallback.connections, apple: saved },
    };
  }

  return fallback;
}
