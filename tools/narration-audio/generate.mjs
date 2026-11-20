#!/usr/bin/env node
// Turns every tour narration into an MP3 with a high-quality voice service, at build time, so every device hears
// the same natural voice. The app plays a clip only when its text still matches the current narration, and
// falls back to the browser voice otherwise, so edited copy never plays stale audio.
//
//   node tools/narration-audio/generate.mjs --provider openai --voice alloy [--only graham-center,welcome] [--force] [--dry-run]
//
// API keys come from environment variables only (never written anywhere): OPENAI_API_KEY, ELEVENLABS_API_KEY,
// or AZURE_SPEECH_KEY with AZURE_SPEECH_REGION. Unchanged clips are skipped, so re-runs only pay for edits.
// Output: public/audio/<id>-<hash>.mp3 and public/audio/manifest.json. See README.md in this folder.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { narrationItems } from "./narration.mjs";

export const MANIFEST = "manifest.json";

const escapeXml = (s) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

/** Each provider turns text into MP3 bytes. Requests carry the key in a header, never in the URL. */
export const PROVIDERS = {
  openai: {
    env: ["OPENAI_API_KEY"],
    defaultVoice: "alloy",
    request: (text, voice, env) => ({
      url: "https://api.openai.com/v1/audio/speech",
      init: {
        method: "POST",
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice,
          input: text,
          instructions: "Warm, confident and unhurried, like a proud university student guiding special guests.",
          response_format: "mp3",
        }),
      },
    }),
  },
  elevenlabs: {
    env: ["ELEVENLABS_API_KEY"],
    defaultVoice: null, // an ElevenLabs voice id is required
    request: (text, voice, env) => ({
      url: `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`,
      init: {
        method: "POST",
        headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
      },
    }),
  },
  azure: {
    env: ["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION"],
    defaultVoice: "en-US-AvaNeural",
    request: (text, voice, env) => ({
      url: `https://${env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      init: {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": env.AZURE_SPEECH_KEY,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
        },
        body: `<speak version="1.0" xml:lang="en-US"><voice name="${escapeXml(voice)}"><prosody rate="-5%">${escapeXml(text)}</prosody></voice></speak>`,
      },
    }),
  },
};

/** Short content hash, so a changed narration gets a new file name and browsers never cache a stale clip. */
export const clipHash = (provider, voice, text) => createHash("sha256").update(`${provider}\n${voice}\n${text}`).digest("hex").slice(0, 10);

export function readManifest(outDir) {
  try {
    return JSON.parse(readFileSync(join(outDir, MANIFEST), "utf8"));
  } catch {
    return { clips: {} };
  }
}

/**
 * Generates the clips that are missing or out of date. fetchImpl and env are injectable for tests.
 * Returns { generated, skipped, removed, chars } where chars is what the provider bills for.
 */
export async function generate({ items, provider, voice, outDir, env = process.env, fetchImpl = fetch, force = false, only = null, dryRun = false, log = console.log }) {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Unknown provider "${provider}". Use one of: ${Object.keys(PROVIDERS).join(", ")}`);
  voice = voice || p.defaultVoice;
  if (!voice) throw new Error(`--voice is required for ${provider}`);
  const missing = p.env.filter((k) => !env[k]);
  if (missing.length && !dryRun) throw new Error(`Set ${missing.join(" and ")} in the environment (never in a file that's committed).`);

  mkdirSync(outDir, { recursive: true });
  const manifest = readManifest(outDir);
  const clips = { ...manifest.clips };
  const wanted = only ? items.filter((i) => only.includes(i.id)) : items;
  const result = { generated: [], skipped: [], removed: [], chars: 0 };

  for (const item of wanted) {
    const file = `${item.id}-${clipHash(provider, voice, item.text)}.mp3`;
    const current = clips[item.id];
    if (!force && current?.file === file && current.text === item.text && existsSync(join(outDir, file))) {
      result.skipped.push(item.id);
      continue;
    }
    result.chars += item.text.length;
    if (dryRun) {
      result.generated.push(item.id);
      log(`would generate ${item.id} (${item.text.length} characters)`);
      continue;
    }
    const { url, init } = p.request(item.text, voice, env);
    const res = await fetchImpl(url, init);
    if (!res.ok) throw new Error(`${provider} returned HTTP ${res.status} for ${item.id}`); // never echo headers or URL params
    writeFileSync(join(outDir, file), Buffer.from(await res.arrayBuffer()));
    if (current?.file && current.file !== file && existsSync(join(outDir, current.file))) unlinkSync(join(outDir, current.file));
    clips[item.id] = { file, text: item.text };
    result.generated.push(item.id);
    log(`generated ${item.id}`);
  }

  // Drop clips for stops that no longer exist.
  const ids = new Set(items.map((i) => i.id));
  for (const id of Object.keys(clips)) {
    if (ids.has(id)) continue;
    if (!dryRun) {
      const f = join(outDir, clips[id].file);
      if (existsSync(f)) unlinkSync(f);
      delete clips[id];
    }
    result.removed.push(id);
  }
  // Remove stray MP3s the manifest doesn't know about (left from interrupted runs).
  if (!dryRun) {
    const known = new Set(Object.values(clips).map((c) => c.file));
    for (const f of readdirSync(outDir)) if (f.endsWith(".mp3") && !known.has(f)) unlinkSync(join(outDir, f));
  }

  if (!dryRun) {
    const sorted = Object.fromEntries(Object.keys(clips).sort().map((k) => [k, clips[k]]));
    writeFileSync(join(outDir, MANIFEST), JSON.stringify({ provider, voice, updated: new Date().toISOString().slice(0, 10), clips: sorted }, null, 2) + "\n");
  }
  return result;
}

function parseArgs(argv) {
  const args = { provider: null, voice: null, only: null, force: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--provider") args.provider = argv[++i];
    else if (a === "--voice") args.voice = argv[++i];
    else if (a === "--only") args.only = argv[++i].split(",");
    else if (a === "--force") args.force = true;
    else if (a === "--dry-run") args.dryRun = true;
    else throw new Error(`Unknown option ${a}`);
  }
  if (!args.provider) throw new Error("--provider is required (openai, elevenlabs or azure)");
  return args;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const stops = JSON.parse(readFileSync("content/stops.json", "utf8"));
    const tour = JSON.parse(readFileSync("content/tour.json", "utf8"));
    const r = await generate({ items: narrationItems(stops, tour), outDir: "public/audio", ...args });
    console.log(
      `${args.dryRun ? "Would generate" : "Generated"} ${r.generated.length}, unchanged ${r.skipped.length}, removed ${r.removed.length}; ${r.chars} characters sent.`,
    );
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
