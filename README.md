# tiher-builder

The HTML QR code editor with **AI generation**: pick the type of page, describe it, and it builds a one-page website (menu bar, hero, sections, tables, gallery, contact, footer) from ready-made section designs, then offers 3 colour themes. Every text, photo, link and section can be edited right on the page.

## Files

- `public/index.html`: the editor (Summernote toolbar, preview, AI generation button)
- `public/ai-builder.js`: AI generation, the section designs, colour themes, on-page editing
- `public/templates.js`: "Select a template" and saving your own templates
- `api/ai.js`: server endpoint that calls OpenRouter, so the key never reaches the browser
- `dev-server.js`: local server for testing
- `vercel.json`: tells Vercel there is nothing to build; it serves `public/` and runs `api/ai.js`

## Run it on your computer

1. Copy `.env.example` to `.env.local` and put your OpenRouter key after `OPENROUTER_API_KEY=`.
2. Run `npm start` (Node 18 or newer, nothing to install).
3. Open http://127.0.0.1:5183

Without a key the AI generation button still works, but it builds a sample page.

## Host it on Vercel

Import the repository in Vercel (`vercel.json` already sets "no build"), then add `OPENROUTER_API_KEY` under Project → Settings → Environment Variables and redeploy.
