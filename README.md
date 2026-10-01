# AgriBot

AI agronomy chat assistant for small farmers. Built with Next.js 16 (App Router), Tailwind CSS v4, and shadcn/ui. Uses OpenAI (`gpt-4o` for vision/chat, `gpt-image-1` for forecasts) and MongoDB for history.

## Features

- **AI Chat Assistant**: Powered by OpenAI, customized to answer agronomy questions.
- **Image Diagnosis**: Upload photos of crops for visual analysis and disease prediction.
- **14-Day Forecasts**: Time-machine capability leveraging `gpt-image-1` to visually predict crop growth.
- **Language Support**: Localized understanding for 11 South African languages (English, Afrikaans, isiNdebele, isiXhosa, isiZulu, Sepedi, Sesotho, siSwati, Setswana, isiXitsonga, Tshivenda).
- **Offline / Caching Resilience**: Uses `localStorage` to cache responses, with MongoDB backing up the session history.
- **Mobile-First Design**: Optimized for a 440px phone view, seamlessly scaling up for desktop users.

## Requirements

- Node.js (and `corepack` for pnpm)
- MongoDB instance
- OpenAI API Key

## Getting Started

1. Set up your environment variables by creating a `.env.local` file:
```bash
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=your_mongodb_connection_string
APP_MODE=development
```

2. Install dependencies using `pnpm`:
```bash
corepack pnpm install
```

3. Run the development server:
```bash
corepack pnpm dev
```
Navigate to `http://localhost:3000` to interact with AgriBot.

## Architecture & Data

- **Database**: `mongodb` collections include `messages` and `forecasts`. Device identification is managed purely by a client-side random id (stored in `localStorage` as `agribot_device_id`).
- **Caching**: Recent messages are cached in `localStorage` for instant 0ms painting. Full history loads from MongoDB.
- **Images**: Uploaded images are passed to OpenAI via client-side base64 data URLs.
- **Styling**: Tailwind v4 with a custom `.dark` class setup and `base-nova` shadcn components. 

## Build & Validation

The project uses Next.js with `typescript.ignoreBuildErrors: true` during build. Validation should be run with:
```bash
npx tsc --noEmit
```

## Contributing

Commit messages follow Conventional Commits format, e.g., `feat(chat): added new styling`.
