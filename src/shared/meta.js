'use strict';
/* ArenaKit — metadata shared by the popup and the options page.
   Add new features here (id + name + desc + icon) as they are shipped. */

const AEXT_META = {
  name: 'Arena Reimagined',
  version: '0.3.24',
  tagline: 'Themes & tools that make arena.ai feel like yours',
  website: 'https://arena.ai'
};

/* Keyboard-shortcut definitions (options page renders these into the editor). */
const AEXT_SHORTCUT_DEFAULTS = [
  { id: 'focus-prompt', label: 'Focus the input', key: '/', mod: 'none' },
  { id: 'send', label: 'Send the message', key: 'Enter', mod: 'ctrl' },
  { id: 'stop', label: 'Stop generation', key: 'Escape', mod: 'none' }
];

const AEXT_FEATURES = [
  {
    id: 'scroll-lock',
    name: 'Scroll lock',
    desc: 'While the agent streams, if you scroll up the page won\u2019t yank you back to the bottom.',
    icon: '\u2693', cat: 'chat'
  },
  {
    id: 'resume-latest',
    name: 'Resume at latest',
    desc: 'When you reopen a chat, jump straight to the newest message instead of the top.',
    icon: '\u23EC', cat: 'chat'
  },
  {
    id: 'pin-chats',
    name: 'Pin chats',
    desc: 'Pin chats from the sidebar \u2026 menu. Pinned chats sit in a group above Today.',
    icon: '\u{1F4CC}', cat: 'chat'
  },
  {
    id: 'reduce-lag',
    name: 'Reduce page lag',
    desc: 'Skip painting off-screen code and images. Won\u2019t rewrite Arena\u2019s React \u2014 toggle off if something looks blank.',
    icon: '\u26A1', cat: 'chat'
  },
  {
    id: 'folder-zip',
    name: 'Downloadable Folders',
    desc: 'Hover a workspace folder to download it (and every nested folder) as a ZIP.',
    icon: '\u{1F5C2}', cat: 'work'
  },
  {
    id: 'workspace-search',
    name: 'Workspace file search',
    desc: 'Filter the Agent workspace tree by name. Use Expand to search inside collapsed folders.',
    icon: '\u{1F50D}', cat: 'work'
  },
  {
    id: 'long-input-txt',
    name: 'Long input \u2192 .txt',
    desc: 'Offers to move an over-long prompt into an attached .txt (click it to read it back into chat).',
    icon: '\u{1F4C4}', cat: 'work'
  },
  {
    id: 'finish-notify',
    name: 'Run-complete alert',
    desc: 'Shows a toast when the agent finishes, and counts today\u2019s runs.',
    icon: '\u{1F514}', cat: 'agent'
  },
  {
    id: 'follow-ups',
    name: 'Follow-up chips',
    desc: 'One-click prompts after a run: fix errors, polish, summarize, export. Optional: show even on a fresh chat.',
    icon: '\u{1F4A1}', cat: 'agent'
  },
  {
    id: 'agent-quota',
    name: 'Agent send counter',
    desc: 'Tiny X/100 on Agent Mode for sends today. Local count, resets at midnight \u2014 not Arena\u2019s server remaining.',
    icon: '\u{1F4CA}', cat: 'agent'
  },
  {
    id: 'host-upload',
    name: 'Host unsupported files',
    desc: 'If Arena rejects a type (zip, etc.), warn and upload to Litterbox for 1 hour (Catbox fallback). The link is pasted into the chat.',
    icon: '\u{1F517}', cat: 'work'
  },
  {
    id: 'novm',
    name: 'NoVM desktop',
    desc: 'Tiny NoVM icon in the composer. Pastes the skill link and asks for the viewer.',
    icon: '\u{1F310}', cat: 'agent'
  },
  {
    id: 'hide-email',
    name: 'Hide account email',
    desc: 'Covers the sidebar email for screenshots. Default is dots; ⚙ sets a fake address.',
    icon: '\u{1F441}', cat: 'chat'
  }
];

/* Grouping labels for the tabbed settings panel. */
const AEXT_FEATURE_GROUPS = {
  chat: { title: 'Chat & input', order: 1 },
  work: { title: 'Workspace & output', order: 2 },
  agent: { title: 'Agent run', order: 3 }
};
