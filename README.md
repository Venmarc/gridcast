# GridCast

This is a Next.js application that visualizes real-time power grid demand versus weather correlation across various regions in the United States. 

It uses Native Server-Sent Events (SSE) via Next.js API routes to stream live data instantly to the browser without requiring a separate WebSocket server.

## Getting Started Locally

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

To get real data instead of mock baseline data, you need API keys from the EIA and OpenWeather.

Create a `.env.local` file in the root of the project:

```env
EIA_API_KEY=your_eia_api_key_here
WEATHER_API_KEY=your_weather_api_key_here
```

## Deploying to Vercel

This app is optimized for **Vercel** serverless deployments. Because all the backend logic is now handled in standard `app/api/...` Next.js routes, you can deploy the entire app securely from your GitHub repository.

### Adding Environment Variables on Vercel

> **Important**: Vercel does **not** automatically pull your `.env.local` file from your computer (since it is usually git-ignored for security). 

You must manually paste your keys into the Vercel Dashboard:

1. Go to your project on Vercel.
2. Navigate to **Settings > Environment Variables**.
3. Add `EIA_API_KEY` and paste your key.
4. Add `WEATHER_API_KEY` and paste your key.
5. Hit **Deploy** (or Redeploy if you already pushed).

The serverless functions will securely use your API keys on the server side; they are never exposed to the client's browser.
