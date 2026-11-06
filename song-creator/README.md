# Song Creator in Bevvan’s Studio

Adapted from the user's `Bevvan-Song-Creator-Source.zip` export, hosted source commit `ad727d1a018055a4d605ea84975a764757f767e7`. Only components used by the creator are included. The original hosted site remains separate.

The React frontend builds with Vite into the ignored `studio/song-creator/` directory. The studio loads it on demand in a same-origin frame to isolate its Tailwind/global styles and preserve the session when changing studio tools. The existing homepage, mastering engine and storage keys remain in place.

`npm ci`, `npm test`, `npm run typecheck`, `npm run build`. Vercel runs the build and serves the existing repository alongside the new frontend and the Node functions at `/api/song-creator/generate` and `/api/song-creator/chat`.

The existing `ADMIN_USER`/`ADMIN_PASSWORD` protect the creator, assets and API routes. Both functions independently verify the same credentials. The public DJ website stays public. No new deployment secret is required.

The creator retains session-only, user-entered OpenAI keys. It sends requests through authenticated server functions to OpenAI. `OPENAI_TEXT_MODEL` defaults to `gpt-4.1-mini`; `OPENAI_IMAGE_MODEL` defaults to `gpt-image-2.5-sunburst`. The in-memory AI connection is shared with Genre Trends and is cleared on a full page refresh. No OpenAI key is embedded in the build or persisted. A writing brief can be copied without connecting AI. Direct Suno audio submission is not implemented; Copy for Suno prepares text for manual handoff.

Save to Saved Tracks explicitly persists the title, lyrics, style, idea, genre, intro length and cover brief under the existing `terry_saved_tracks_v1` localStorage key. It preserves legacy Builder entries. Reopening a creator entry restores it to Song Creator; Update saved track replaces that entry, while a new generated song or idea gets a separate entry. Generated image bytes and chat history are not saved. Storage failures report an error instead of a false success. Browser data clearing removes the library; text downloads remain the portable backup.

Genre Trends includes a snapshot reviewed November 6, 2026 with linked source dates and data periods. Refresh with AI calls authenticated `/api/song-creator/trends`, using Responses web search with the session key, mandatory search and consulted-URL checks. `OPENAI_TRENDS_MODEL` optionally overrides `gpt-5.4-mini`. Refreshes are user initiated and incur API/search usage. Successful reports persist under `terry_genre_trends_v2`; failures preserve the previous report. Evidence and production advice are shown separately. Source URL validation confirms retrieval, not the correctness of every model inference.

Checks cover auth, same-origin enforcement, input limits, mocked song/chat/cover responses and failure handling. Real provider generation requires the user's API connection; mocked checks do not establish account model access or available API credit.

References: [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js), [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation). Vendor stylesheet license is retained in `vendor/`.
