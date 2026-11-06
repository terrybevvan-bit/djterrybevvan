# Song Creator in Bevvan’s Studio

Adapted from the user's `Bevvan-Song-Creator-Source.zip` export, hosted source commit `ad727d1a018055a4d605ea84975a764757f767e7`. Only components used by the creator are included. The original hosted site remains separate.

The React frontend builds with Vite into the ignored `studio/song-creator/` directory. The studio loads it on demand in a same-origin frame to isolate its Tailwind/global styles and preserve the session when changing studio tools. The existing homepage, mastering engine and storage keys remain in place.

`npm ci`, `npm test`, `npm run typecheck`, `npm run build`. Vercel runs the build and serves the existing repository alongside the new frontend and the Node functions at `/api/song-creator/generate` and `/api/song-creator/chat`.

The existing `ADMIN_USER`/`ADMIN_PASSWORD` protect the creator, assets and API routes. Both functions independently verify the same credentials. The public DJ website stays public. No new deployment secret is required.

The creator retains session-only, user-entered OpenAI keys. It sends requests through authenticated server functions to OpenAI. `OPENAI_TEXT_MODEL` defaults to `gpt-4.1-mini`; `OPENAI_IMAGE_MODEL` defaults to `gpt-image-2.5-sunburst`. Keys and drafts are not persisted. No OpenAI key is embedded in the build. A writing brief can be copied without connecting AI. Direct Suno audio submission is not implemented; Copy for Suno prepares text for manual handoff.

Checks cover auth, same-origin enforcement, input limits, mocked song/chat/cover responses and failure handling. Real provider generation requires the user's API connection; mocked checks do not establish account model access or available API credit.

References: [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js), [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation). Vendor stylesheet license is retained in `vendor/`.
