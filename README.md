# CloudCart Feed Translator

A web tool that translates CloudCart XML product feeds with industry-specific terminology, powered by Claude AI.

## Features

- **Upload & Translate** - Upload your CloudCart XML feed and get a professionally translated version
- **Industry-Aware** - Pre-configured terminology for Luxury Watches & Jewellery, Fashion, Electronics, Home & Furniture, Beauty, or define your own
- **Field Selection** - Choose exactly which fields to translate (titles, descriptions, categories, tabs, variants, etc.)
- **Smart Glossary** - Known terms are translated instantly from the built-in glossary; unknown text goes to Claude AI
- **Structure Preserved** - XML structure remains 100% intact; only text content is translated
- **Real-Time Progress** - Watch translation progress with live streaming updates

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/feedtranslator)

## How It Works

1. Upload your CloudCart XML feed
2. Select source and target languages
3. Choose an industry (determines terminology style)
4. Select which fields to translate
5. Enter your Claude API key (sent directly to Anthropic, never stored)
6. Download the translated feed

## Adding Industries

Edit `src/lib/industries.ts` to add new industry configurations with:
- **context** - System prompt telling Claude what terminology to use
- **glossary** - Exact term mappings that bypass the API (fast + free + consistent)

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Claude API (Anthropic SDK)
- Deployed on Vercel
