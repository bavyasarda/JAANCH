# Submitting Jaanch (Bharat Agentic 2026 · aiKart)

Both official methods are prepared. Use whichever the form asks for; Method 2 needs no extra setup.

## Method 2 — API endpoint (ready now)

- Endpoint: `POST https://jaanch-delta.vercel.app/api/agent` (schema at `GET` on the same URL)
- Docs with request/response examples: [docs/API.md](API.md)
- Quick test:
  ```bash
  curl -s https://jaanch-delta.vercel.app/api/agent -H "Content-Type: application/json" \
    -d '{"sample":"5","role":"consumer","language":"hi-IN"}'
  ```
- No credentials needed. The web UI at https://jaanch-delta.vercel.app uses the same agent.

## Method 1 — Docker + aiKart Agent Manifest

Files: [`Dockerfile`](../Dockerfile), [`aikart-manifest.yaml`](../aikart-manifest.yaml), [`sandbox/run.ts`](../sandbox/run.ts), [`examples/aikart/input.json`](../examples/aikart/input.json).

The sandbox contract: the container reads `/aikart/input.json` (or `AIKART_INPUT`), runs the agent, and writes `/aikart/output.json` as `{"format":"markdown","response":"..."}`. With `GROQ_API_KEY` set it runs the models in-process; without a key it delegates to the hosted API, so the public image carries no secrets. Egress allowlist: `api.groq.com`, `jaanch-delta.vercel.app`.

Steps (needs Docker Desktop and a Docker Hub account; the manifest expects `docker.io/bavyasarda/jaanch:1.0.0` — change the image name if you push elsewhere):

```bash
docker build -t bavyasarda/jaanch:1.0.0 .
docker run --rm -v "$PWD/examples/aikart:/aikart" bavyasarda/jaanch:1.0.0      # writes examples/aikart/output.json
docker login
docker push bavyasarda/jaanch:1.0.0
```

Then upload `aikart-manifest.yaml` in the aiKart submission flow (see the walkthrough video).

Local check without Docker:

```bash
cp examples/aikart/input.json input.json
node --env-file=.env.local --import tsx sandbox/run.ts     # prints the markdown and writes ./output.json
```

## Google Form fields (have these ready)

- Project: **Jaanch · जाँच** — Packet ki jaanch, aapki bhasha mein
- Live app: https://jaanch-delta.vercel.app
- API endpoint: https://jaanch-delta.vercel.app/api/agent
- Repository: https://github.com/bavyasarda/JAANCH
- Manifest: `aikart-manifest.yaml` in the repo root
- Demo video: `demo/jaanch-demo.mp4` (upload to Drive/YouTube and paste the link)
- Track: Citizen & GovTech (also fits Bharat Languages / Open Innovation)
- One-liner: An open-source agent that checks packaged-product labels against India's Legal Metrology rules, explains the verdict in six Indian languages by text and voice, and drafts the consumer grievance, seller fix-list or inspector report — with every pass/fail decided by a deterministic rule engine, never the LLM.
