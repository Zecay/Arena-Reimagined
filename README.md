# Arena Reimagined

A community Chrome extension for [arena.ai](https://arena.ai). Themes, a Claude-style reskin, and work tools — every feature runs in isolation, so one bug can’t take down the rest (or the site).

Not affiliated with Arena AI. Not on the Chrome Web Store — load it unpacked from this repo.

## Install

1. Clone or download this folder.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Turn on **Developer mode**.
4. **Load unpacked** and pick this folder.
5. Open [arena.ai](https://arena.ai) → click the crest button in the composer.

Reload the extension, then refresh arena.ai, after you pull updates.

## Themes

Switch from the gear → **Theme**. Built-ins:

- **Arena Default** — untouched
- **Light** / **Sepia** / **Midnight**
- **Hyper Contrast** / **Solar Grid**
- **Claude** — full reskin (warm Cowork dark, serif headlines, terracotta send). Homage only, not Anthropic.

Import / export JSON from the Theme tab. **Theme docs** copies the spec so an AI can write you one. Only import JSON you trust — a theme restyles arena.ai in this browser.

## Features

All optional. Toggle them in the gear → **Features**.

**Chat**
- Scroll lock while the agent streams
- Jump to the latest message when you reopen a chat
- Pin chats (above Today)
- Hide the account email (dots, or your own fake address) for screenshots
- Reduce page lag (skips painting off-screen code/images)

**Workspace**
- Download a folder (and nested folders) as a ZIP
- Filter the file tree; Expand / Collapse folders
- Long prompt → attach as `prompt.txt`
- Host types Arena rejects (zip, etc.) on Litterbox for 1 hour, Catbox as fallback — you wait 5 seconds and accept; **anyone with the link can download it**

**Agent**
- Toast + optional sound when a run finishes
- Follow-up chips (fix errors, polish, summarize, export)
- Local send counter `X/100` (not Arena’s real remaining quota)
- Tiny NoVM button — pastes the skill link and asks for the viewer

Want something that isn’t here? Contact **zecayy** on Discord.

## Privacy

- No analytics, no accounts.
- Settings stay in Chrome storage on your machine.
- **Host unsupported files** is the only feature that uploads (Litterbox / Catbox), and only after the warning + Accept.
- Some themes load fonts from Google Fonts.
- Imported theme JSON is untrusted input. Only import files you wrote or trust.

## License

MIT
