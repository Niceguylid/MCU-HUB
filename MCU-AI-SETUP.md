# GOUFE MCU HUB — Community Comments + Live AI Setup

The website UI is in `index.html`. The live AI uses a Cloudflare Worker backend in `worker.js`. The API key must stay in the Worker secret store; never paste it into HTML, JavaScript served to visitors, or a public GitHub commit.

## 1. Enable community comments (Utterances)

1. In the GitHub repository settings, make sure **Issues** are enabled.
2. Install/authorize the **Utterances** GitHub App for `Niceguylid/MCU-HUB` from [utteranc.es](https://utteranc.es/).
3. Confirm the app has access to this repository. Utterances links each page's discussion to a GitHub Issue using the page pathname.
4. Open the deployed site and scroll to **GOUFE COMMUNITY & MCU AI**. The comments widget should load. Posting requires a GitHub account; this is not anonymous commenting.

If the widget does not load, check the browser console, repository Issues setting, and Utterances app installation. No comments are stored by the static website itself.

## 2. Create the AI backend

This site is hosted on GitHub Pages, which serves static files and cannot safely store a secret API key. Deploy `worker.js` as a Cloudflare Worker (or adapt it to another serverless platform).

1. Sign in to Cloudflare and create a new **Worker**.
2. Copy the contents of `worker.js` into the Worker editor and deploy it.
3. In the Worker settings, add these variables/secrets:

   | Name | Type | Value |
   |---|---|---|
   | `OPENAI_API_KEY` | **Secret** | Your API key from the OpenAI API platform |
   | `ALLOWED_ORIGIN` | Text | `https://niceguylid.github.io` |
   | `OPENAI_MODEL` | Text (optional) | A model enabled for your API project; default is `gpt-6-astra` |

   If you later use a custom domain, change `ALLOWED_ORIGIN` to that exact origin (scheme + hostname, no path). Save and redeploy if prompted.

4. Test the Worker root URL in a browser. It should return a small JSON status response.
5. Copy the deployed Worker URL, then edit `index.html`. Find:

   ```js
   const endpoint = "https://YOUR-CLOUDFLARE-WORKER.workers.dev/api/chat";
   ```

   Replace the hostname with your real Worker hostname and keep `/api/chat` at the end. Commit the change to the same branch and deploy the site.
6. Ask a test question in the MCU AI Assistant. If it fails, inspect the Worker logs and confirm the API key, selected model, API account access, and billing/quota.

## 3. Safety, limits, and cost

- ChatGPT subscriptions and OpenAI API usage are separate; API usage may require billing and can incur charges.
- Start with a small usage budget and configure Cloudflare rate limiting / abuse protection before sharing the site widely. CORS limits browser origins but is **not** authentication and does not stop all automated requests.
- The Worker limits each prompt to 2,000 characters and sends only a short recent conversation history. Add stronger per-IP rate limiting, monitoring, and spending alerts before public launch.
- The API key is a secret: never commit it to GitHub. If a key is accidentally exposed, revoke it and create a replacement.
- AI responses can be incorrect, including on MCU continuity or unreleased projects. Verify important claims.
- The chat's recent history lives only in that visitor's current page session. It is not saved as a user account or server-side chat history.

## 4. Deployment status

The UI initially points to a placeholder Worker URL on purpose. The AI will explain that setup is incomplete until you deploy the backend and set the real endpoint. Community comments also require the Utterances app and Issues setting to be enabled. No API key is included in this repository.
