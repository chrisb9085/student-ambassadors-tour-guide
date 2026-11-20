# Recorded narration

The browser's built-in voices vary by device and can sound robotic. This tool turns every narration into an MP3 with a high-quality voice service **once, at build time**, and stores the clips with the site:

- the same natural voice on every device;
- no API key in the browser and no server;
- clips play like music, so they keep going with the screen locked, with play, pause and next on the lock screen.

The app plays a clip only when the text saved with it still matches the current narration. Edit a card and that stop falls back to the device voice until you regenerate it, so a clip can never say something the card doesn't.

## Before you use it (decisions for Chris)

- **Which service and voice.** OpenAI, ElevenLabs and Azure are supported (see below). Listen to a few samples first.
- **Whether an AI voice is acceptable.** The use of generative AI is still undecided (SCOPE §9). This is behind-the-scenes voice generation of human-written, sourced text, but it's the Foundation's call.
- **Who listens to each clip** before it goes live. Names and numbers are the usual problems (for example "Deuxième Maison", "Díaz-Balart", "Cejas").
- **Alternative:** record a real ambassador. Save the files as `public/audio/<stop id>.mp3`, then add them to `manifest.json` in the same format, with the exact narration text each one reads.

## Generate

The key goes in the environment for one command, never in a file:

```powershell
$env:OPENAI_API_KEY = "..."; node tools/narration-audio/generate.mjs --provider openai --voice alloy
```

```bash
ELEVENLABS_API_KEY=... node tools/narration-audio/generate.mjs --provider elevenlabs --voice <voice id>
AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=eastus node tools/narration-audio/generate.mjs --provider azure --voice en-US-AvaNeural
```

Options:

| Option | Use |
|---|---|
| `--dry-run` | List what would be generated and how many characters would be sent (billing). Needs no key. |
| `--only welcome,graham-center` | Just these narrations. |
| `--force` | Regenerate even unchanged clips (for example after changing voice settings). |

The tour has 39 narrations, about 13,000 characters. Re-runs only send narrations whose text changed.

Output goes to `public/audio/`: one `<id>-<hash>.mp3` per narration, plus `manifest.json`. Commit both. The hash changes whenever the text, voice or service changes, so browsers never play a cached old clip.

## Turning it off

Delete `public/audio/`. The app goes back to the device voice everywhere. In Tour settings, "Narration voice" also lets each listener choose the device voice instead of the recordings.
