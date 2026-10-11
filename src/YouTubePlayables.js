// YouTube Playables integration wrapper.
// Uses ytgame inside Playables and browser fallbacks locally.

const LOCAL_SAVE_KEY = 'justOneMoreRunSaveV1';

const defaultState = {
  version: 1,
  bestScore: 0,
  soundEnabled: true,
  voiceEnabled: true
};

let state = { ...defaultState };
let loaded = false;
let platformAudioEnabled = true;
let paused = false;

const isPlayables =
  typeof window !== 'undefined' &&
  typeof window.ytgame !== 'undefined' &&
  Boolean(window.ytgame?.IN_PLAYABLES_ENV);

function sanitizeState(candidate) {
  const safe = { ...defaultState };

  if (
    candidate &&
    typeof candidate === 'object'
  ) {
    if (
      Number.isFinite(candidate.bestScore)
    ) {
      safe.bestScore = Math.max(
        0,
        Math.floor(candidate.bestScore)
      );
    }

    if (
      typeof candidate.soundEnabled ===
      'boolean'
    ) {
      safe.soundEnabled =
        candidate.soundEnabled;
    }

    if (
      typeof candidate.voiceEnabled ===
      'boolean'
    ) {
      safe.voiceEnabled =
        candidate.voiceEnabled;
    }

    if (
      Number.isFinite(candidate.version)
    ) {
      safe.version = Math.max(
        1,
        Math.floor(candidate.version)
      );
    }
  }

  return safe;
}

function localLoad() {
  try {
    const raw =
      window.localStorage.getItem(
        LOCAL_SAVE_KEY
      );

    if (!raw) {
      return { ...defaultState };
    }

    return sanitizeState(
      JSON.parse(raw)
    );
  } catch {
    return { ...defaultState };
  }
}

function localSave() {
  try {
    window.localStorage.setItem(
      LOCAL_SAVE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // Local fallback only. Ignore quota/privacy errors.
  }
}

export async function initPlayables() {
  if (loaded) {
    return getState();
  }

  if (isPlayables) {
    try {
      const raw =
        await window.ytgame.game.loadData();

      if (raw) {
        state = sanitizeState(
          JSON.parse(raw)
        );
      }
    } catch {
      state = { ...defaultState };
      window.ytgame?.health?.logWarning?.();
    }

    try {
      platformAudioEnabled =
        window.ytgame.system.isAudioEnabled();

      window.ytgame.system.onAudioEnabledChange(
        (enabled) => {
          platformAudioEnabled =
            Boolean(enabled);

          window.dispatchEvent(
            new CustomEvent(
              'ytgame-audio-change',
              {
                detail: {
                  enabled:
                    platformAudioEnabled
                }
              }
            )
          );
        }
      );

      window.ytgame.system.onPause(
        () => {
          paused = true;

          window.dispatchEvent(
            new Event('ytgame-pause')
          );

          saveState().catch(() => {});
        }
      );

      window.ytgame.system.onResume(
        () => {
          paused = false;

          window.dispatchEvent(
            new Event('ytgame-resume')
          );
        }
      );
    } catch {
      window.ytgame?.health?.logWarning?.();
    }
  } else {
    state = localLoad();
    platformAudioEnabled = true;
  }

  loaded = true;

  return getState();
}

export function inPlayables() {
  return isPlayables;
}

export function getState() {
  return { ...state };
}

export function updateState(patch) {
  state = sanitizeState({
    ...state,
    ...patch
  });

  if (!isPlayables) {
    localSave();
  }

  return getState();
}

export async function saveState() {
  if (!loaded) {
    return;
  }

  const serialized =
    JSON.stringify(state);

  if (isPlayables) {
    await window.ytgame.game.saveData(
      serialized
    );
  } else {
    localSave();
  }
}

export async function sendBestScore(
  score
) {
  if (!isPlayables) {
    return;
  }

  const value = Math.max(
    0,
    Math.floor(score)
  );

  try {
    await window.ytgame.engagement.sendScore(
      { value }
    );
  } catch {
    window.ytgame?.health?.logWarning?.();
  }
}

export function notifyFirstFrameReady() {
  if (!isPlayables) {
    return;
  }

  try {
    window.ytgame.game.firstFrameReady();
  } catch {
    window.ytgame?.health?.logError?.();
  }
}

export function notifyGameReady() {
  if (!isPlayables) {
    return;
  }

  try {
    window.ytgame.game.gameReady();
  } catch {
    window.ytgame?.health?.logError?.();
  }
}

export function isPlatformAudioEnabled() {
  return platformAudioEnabled;
}

export function isPausedByYouTube() {
  return paused;
}
