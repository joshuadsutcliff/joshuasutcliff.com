// Guide copy. All copy is PUBLIC-SAFE, matching the rest of src/content.
// Body content is represented as typed blocks so the page component can
// render bold/links/inline-code/code-blocks as JSX without touching the
// source wording.

export type GuideInline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string }

export type GuideBlock =
  | { kind: 'paragraph'; inline: GuideInline[] }
  | { kind: 'heading2'; text: string }
  | { kind: 'heading3'; text: string }
  | { kind: 'list'; items: GuideInline[][] }
  | { kind: 'code'; text: string }
  | { kind: 'divider' }

const t = (text: string): GuideInline => ({ kind: 'text', text })
const b = (text: string): GuideInline => ({ kind: 'bold', text })
const c = (text: string): GuideInline => ({ kind: 'code', text })
const l = (text: string, href: string): GuideInline => ({ kind: 'link', text, href })

export const OBSIDIAN_CLAUDE_GUIDE = {
  title: 'Obsidian + Claude Code: Install For Dummies',
  intro:
    'A complete, beginner-friendly walkthrough: install Obsidian, install the Claude Code CLI, point them at the same folder, and give Claude a starter rulebook. No prior terminal experience assumed. About 15 minutes, on macOS, Windows, or Linux.',
  why: [
    t(
      'Obsidian stores your notes as plain Markdown files in a normal folder (a "vault"). Claude Code is a terminal AI agent that works on folders of files. Point Claude Code at your vault and you get an AI assistant that can read, search, organize, and write your notes, while Obsidian stays the friendly window onto the same files. Nothing is locked in: it\'s all just Markdown on your disk.',
    ),
  ] as GuideInline[],
  preImportNote: [
    t('This guide is the prerequisite for my '),
    l('claude-config-public', 'https://github.com/joshuadsutcliff/claude-config-public'),
    t(" setup. Finish this page first; the last section tells you how to layer that config on top."),
  ] as GuideInline[],
  blocks: [
    { kind: 'heading2', text: 'Fast path: one-click install' },
    {
      kind: 'paragraph',
      inline: [
        t(
          "Don't want to walk through every step by hand? Run a single command and it installs Obsidian and Claude Code, creates a vault, and drops in a starter ",
        ),
        c('CLAUDE.md'),
        t(' rulebook for you, all in one go.'),
      ],
    },
    {
      kind: 'paragraph',
      inline: [
        t(
          'The manual steps below cover the exact same ground, just broken out one at a time, in case you would rather see what is happening at each stage (or something needs troubleshooting).',
        ),
      ],
    },
    { kind: 'paragraph', inline: [b('macOS / Linux:')] },
    {
      kind: 'code',
      text: 'curl -fsSL https://raw.githubusercontent.com/joshuadsutcliff/claude-config-public/main/scripts/install.sh | bash',
    },
    { kind: 'paragraph', inline: [b('Windows (PowerShell):')] },
    {
      kind: 'code',
      text: 'irm https://raw.githubusercontent.com/joshuadsutcliff/claude-config-public/main/scripts/install.ps1 | iex',
    },
    { kind: 'divider' },
    { kind: 'heading2', text: 'Step 1: Install Obsidian' },
    {
      kind: 'paragraph',
      inline: [
        t(
          'Obsidian is free for personal use, no sign-up required (paid tiers only cover optional Sync/Publish services).',
        ),
      ],
    },
    {
      kind: 'paragraph',
      inline: [
        b('macOS:'),
        t(' Download the installer from '),
        l('obsidian.md/download', 'https://obsidian.md/download'),
        t(', open it, and drag Obsidian into Applications.'),
      ],
    },
    {
      kind: 'paragraph',
      inline: [
        b('Windows:'),
        t(' Download the Windows installer from '),
        l('obsidian.md/download', 'https://obsidian.md/download'),
        t(' and run it. Also available via winget: '),
        c('winget install -e --id Obsidian.Obsidian'),
        t('.'),
      ],
    },
    {
      kind: 'paragraph',
      inline: [
        b('Linux:'),
        t(' Get it from '),
        l('obsidian.md/download', 'https://obsidian.md/download'),
        t(': Flatpak ('),
        c('flatpak install flathub md.obsidian.Obsidian'),
        t(') or the AppImage both work; use whichever your distro favors.'),
      ],
    },
    { kind: 'heading3', text: 'Create your vault' },
    {
      kind: 'paragraph',
      inline: [
        t('Open Obsidian. On the launcher screen choose '),
        b('Create new vault'),
        t(', give it a name, '),
        b('Browse'),
        t(' to choose where its folder lives, then '),
        b('Create'),
        t('. (Already inside Obsidian? Click the vault switcher in the bottom-left corner, then '),
        b('Manage vaults'),
        t(', then '),
        b('Create'),
        t('.)'),
      ],
    },
    {
      kind: 'paragraph',
      inline: [t('Pick a folder location you can find again in a terminal. Suggested:')],
    },
    {
      kind: 'list',
      items: [
        [b('macOS/Linux:'), t(' '), c('~/Vaults/MyVault')],
        [b('Windows:'), t(' '), c('C:\\Users\\you\\Vaults\\MyVault')],
      ],
    },
    {
      kind: 'paragraph',
      inline: [
        t(
          'Avoid iCloud/OneDrive-synced folders for this guide: cloud sync fighting a CLI agent over file locks is the number one source of weird behavior.',
        ),
      ],
    },
    { kind: 'divider' },
    { kind: 'heading2', text: 'Step 2: Install Claude Code' },
    {
      kind: 'paragraph',
      inline: [
        t('One requirement up front: Claude Code needs a '),
        b('paid Claude account'),
        t(
          ' (Pro or higher), or an Anthropic API key. The free claude.ai plan does not include it. System-wise it runs on macOS 13+, Windows 10 1809+, and mainstream Linux (Ubuntu 20.04+, Debian 10+, and friends).',
        ),
      ],
    },
    {
      kind: 'paragraph',
      inline: [
        t(
          'Use the native installer on every platform. It updates itself automatically in the background, so you never run a manual upgrade command again (this is the reason to avoid installing via Homebrew or npm, which both require manual updates).',
        ),
      ],
    },
    {
      kind: 'paragraph',
      inline: [b('macOS / Linux:'), t(' open Terminal and run:')],
    },
    { kind: 'code', text: 'curl -fsSL https://claude.ai/install.sh | bash' },
    {
      kind: 'paragraph',
      inline: [b('Windows:'), t(' open PowerShell and run:')],
    },
    { kind: 'code', text: 'irm https://claude.ai/install.ps1 | iex' },
    {
      kind: 'paragraph',
      inline: [
        t('No admin rights needed (Windows 10 1809 or newer). Installing '),
        l('Git for Windows', 'https://git-scm.com/download/win'),
        t(
          ' is optional but recommended: with it Claude uses familiar bash tooling; without it, it falls back to PowerShell.',
        ),
      ],
    },
    { kind: 'heading3', text: 'Verify it' },
    {
      kind: 'paragraph',
      inline: [t('Close and reopen your terminal, then:')],
    },
    { kind: 'code', text: 'claude --version' },
    {
      kind: 'paragraph',
      inline: [
        t('If you get "command not found" on macOS/Linux, add the install location to your PATH:'),
      ],
    },
    { kind: 'code', text: 'echo \'export PATH="$HOME/.local/bin:$PATH"\' >> ~/.zshrc && source ~/.zshrc' },
    {
      kind: 'paragraph',
      inline: [t('(Use '), c('~/.bashrc'), t(' instead of '), c('~/.zshrc'), t(' if your shell is bash.)')],
    },
    {
      kind: 'paragraph',
      inline: [c('claude doctor'), t(' runs a read-only health check if anything seems off.')],
    },
    { kind: 'divider' },
    { kind: 'heading2', text: 'Step 3: First run, inside your vault' },
    {
      kind: 'paragraph',
      inline: [t('In your terminal, move into the vault folder and start Claude:')],
    },
    { kind: 'code', text: 'cd ~/Vaults/MyVault\nclaude' },
    {
      kind: 'paragraph',
      inline: [
        t(
          'First launch opens a browser window to log in with your Claude account. After that, you\'re in a chat that lives in your terminal, with your vault as its working folder.',
        ),
      ],
    },
    {
      kind: 'paragraph',
      inline: [t('Two things to know on day one:')],
    },
    {
      kind: 'list',
      items: [
        [
          b('Claude asks permission before touching files.'),
          t(' You\'ll see prompts like "Allow Claude to edit this file?". Approve what makes sense; nothing happens silently.'),
        ],
        [
          b('Obsidian picks up external edits automatically.'),
          t(
            ' When Claude creates or edits a note on disk, Obsidian refreshes its view of the vault. Keep Obsidian open side by side and watch notes appear as Claude writes them.',
          ),
        ],
      ],
    },
    {
      kind: 'paragraph',
      inline: [
        t('Try it: type '),
        c('create a note called Hello.md that explains what this vault is for'),
        t(' and watch it show up in Obsidian.'),
      ],
    },
    { kind: 'divider' },
    { kind: 'heading2', text: 'Step 4: Give Claude a rulebook (starter CLAUDE.md)' },
    {
      kind: 'paragraph',
      inline: [
        t('Claude Code automatically reads a file called '),
        c('CLAUDE.md'),
        t(
          ' in the folder it starts from, every session. It\'s your standing instructions: what the vault is, how it\'s organized, what Claude should and shouldn\'t do.',
        ),
      ],
    },
    {
      kind: 'paragraph',
      inline: [
        t('Ask Claude to create it, or paste this starter into '),
        c('CLAUDE.md'),
        t(' at your vault root and edit the folder names to match yours:'),
      ],
    },
    {
      kind: 'code',
      text: `# My Vault: Claude Code Instructions

## What this vault is
Personal knowledge vault in Obsidian. Every note is a plain Markdown file.
You (Claude) run from the vault root and may read, create, and edit notes.

## Ground rules
1. Dates are always YYYY-MM-DD.
2. Never delete a note unless I explicitly ask. Prefer moving it to \`Archive/\`.
3. Do not touch the \`.obsidian/\` folder (app settings) unless I ask.
4. Every new note gets YAML frontmatter: \`type\`, \`date\`, and 2-4 \`tags\`.
5. Quick captures go to \`+Inbox/\`; file them properly when I ask you to organize.
6. When you answer a question from my notes, cite the notes you used with
   [[wikilinks]] so I can jump to them in Obsidian.

## Folder map (edit to match your vault)
- \`+Inbox/\` : unsorted quick captures
- \`Notes/\` : evergreen reference notes
- \`Projects/\` : one folder per active project
- \`Daily/\` : daily notes, named YYYY-MM-DD.md
- \`Archive/\` : retired notes (instead of deletion)

## How to work with me
- Search before answering; say so when you can't find something.
- Propose a plan before any reorganization that moves more than a few files.
- Keep responses short and practical; I'm reading in a terminal.`,
    },
    {
      kind: 'paragraph',
      inline: [
        t(
          'That\'s genuinely enough. The file grows with you: every time you find yourself repeating an instruction, move it into ',
        ),
        c('CLAUDE.md'),
        t(' and it becomes permanent.'),
      ],
    },
    { kind: 'divider' },
    { kind: 'heading2', text: 'Step 5: Level up with the full config (optional)' },
    {
      kind: 'paragraph',
      inline: [
        t(
          'Everything above is a clean, minimal setup. When you want the industrial version (enforced delegation to cheaper models, usage guards, session routing, structured session logs), import my public config on top:',
        ),
      ],
    },
    {
      kind: 'paragraph',
      inline: [
        l('github.com/joshuadsutcliff/claude-config-public', 'https://github.com/joshuadsutcliff/claude-config-public'),
      ],
    },
    {
      kind: 'paragraph',
      inline: [
        t('Start with its '),
        c('README.md'),
        t(' and '),
        c('AGENT.md'),
        t('; the repo is designed to be read in that order and explains its own installation. This guide\'s setup is the assumed baseline it builds on.'),
      ],
    },
    { kind: 'divider' },
    { kind: 'heading2', text: 'Troubleshooting quick hits' },
    {
      kind: 'list',
      items: [
        [
          b('"command not found: claude"'),
          t(' after install: reopen the terminal; if it persists, see the PATH step above.'),
        ],
        [
          b('Login loop or "no access":'),
          t(' your Claude account is on the free plan. Claude Code needs Pro or higher (or an API key).'),
        ],
        [
          b('Notes not updating in Obsidian:'),
          t(' confirm you edited files inside the vault folder Obsidian has open, not a second copy.'),
        ],
        [
          b('Everything else:'),
          t(' '),
          c('claude doctor'),
          t(' first, then the official docs at code.claude.com/docs.'),
        ],
      ],
    },
  ] as GuideBlock[],
}
