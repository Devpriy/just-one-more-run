# Just One More Run — YouTube Playables Ready RC1

This package is based on the final browser build and adds the YouTube Playables integration layer without changing the core gameplay.

## Added for YouTube Playables
- Official SDK script loaded before game code
- `firstFrameReady()`
- `gameReady()`
- `loadData()` before any Playables save
- `saveData()` for cloud persistence inside Playables
- Browser localStorage fallback only when running outside Playables
- `sendScore({ value })` on completed runs
- `isAudioEnabled()` support
- `onAudioEnabledChange()` support
- `onPause()` and `onResume()` support
- Progress save on YouTube pause
- Best score, SFX preference and voice preference in one versioned save object

## Files
- `index.html`
- `src/main.js`
- `src/GameScene.js`
- `src/YouTubePlayables.js`
- `src/style.css`

## Local browser test
```bash
npm install
npm run dev
```

The official Playables SDK behaves as a no-op locally. Local testing continues to use the browser fallback save.

## YouTube SDK Test Suite
Run the dev server, then open the official YouTube Playables Test Suite and enter your local game URL, normally:
`http://localhost:5173`

Validate:
1. SDK loaded before game code
2. firstFrameReady fired
3. gameReady fired after the game is interactive
4. loadData occurs before saveData
5. pause stops gameplay
6. resume continues gameplay
7. YouTube mute disables both SFX and voice output
8. save/load restores the best score
9. sendScore best value matches the saved best score
10. touch and mouse work at multiple aspect ratios

## Important
Do not upload/publish directly until the official Test Suite passes. Developer Portal review is still required.


## UI sync
This corrected package includes the latest icon controls: 🔊/🔇 for SFX and 🗣️/🔕 for voice.
