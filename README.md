# Secret Santa 🎄 (multi-device)

Vite + React Secret Santa app designed to be shared via a link.

## Local development

### Requirements

- Node.js + npm

### Install + run

```sh
npm i
npm run dev
```

## Environment variables

Create a `.env` file (or set them in Vercel) with:

```sh
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Deploy to Vercel

1) Import the repo into Vercel.

2) Add the env vars above in Project Settings → Environment Variables.

3) Deploy.

This repo includes `vercel.json` to rewrite all routes to `index.html` so client-side routing works on refresh.

## Invite links

The join page reads the event code from the URL:

`/auth?event=<EVENT_CODE>`

Participants join by opening the invite link and entering the event passcode.

## Notes

The current UI blocks manually adding participants. Participants are meant to be added only when they join.
