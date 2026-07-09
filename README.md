# macOS Tahoe Portfolio

**Live Demo:** [https://portfolio-wokorach.vercel.app/](https://aakash-sharma.vercel.app)

I've never owned a MacBook. But I've always been kind of obsessed with how macOS looks and feels — the way everything just... flows. So at some point I stopped wishing and started building.

This is my attempt at recreating that experience on the web — the Liquid Glass surfaces, the soft animations, the little details that make Apple's design so satisfying. It's not a clone, more like a love letter to a design language I genuinely admire.

Built with [React](https://reactjs.org/), [Zustand](https://zustand-demo.pmnd.rs/), [UnoCSS](https://uno.antfu.me/), [TypeScript](https://www.typescriptlang.org/), and [Vite](https://vitejs.dev/).

&nbsp;

## Little Previews

<img width="1583" height="883" alt="image" src="https://github.com/user-attachments/assets/1ff2961d-316a-4a86-be16-4754c42badc3" />
<img width="1597" height="883" alt="Screenshot from 2026-06-11 16-49-36" src="https://github.com/user-attachments/assets/bbfe9948-cead-49e0-95ab-8cc3b17c46b1" />

&nbsp;

## Usage

```bash
pnpm install
pnpm dev      # dev server with hot reloading
pnpm build    # production build → dist/
```

## Google Maps API Key

Create a `.env` file from `.env.example` and set:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_embed_api_key
```

Enable these Google Cloud APIs for your project:

- Maps Embed API
- Places API (New) (optional, if you later migrate search to Google Places)

Recommended key restrictions:

- Application restriction: HTTP referrers (web sites)
- Website restrictions: your production domain and local dev origin (`http://localhost:*`)
- API restriction: limit key usage to Maps Embed API

## Docker Deployment

```bash
# Build production image
docker build -t portfolio-wokorach:latest .

# Run locally
docker run -d --name portfolio -p 80:80 portfolio-wokorach:latest
```
