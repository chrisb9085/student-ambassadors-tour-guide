import { useEffect, useRef } from "react";

type Controls = {
  active: boolean;
  playing: boolean;
  title: string | null;
  /** e.g. "Stop 5 of 32". */
  subtitle: string;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
};

const ACTIONS: MediaSessionAction[] = ["play", "pause", "nexttrack", "previoustrack"];

/**
 * Lock-screen, headset and car controls (Media Session API) during a tour: play, pause, next and previous stop,
 * with the stop's name as the "track". Browsers show these while recorded narration plays.
 */
export function useMediaSession({ active, playing, title, subtitle, togglePlay, next, prev }: Controls) {
  const latest = useRef({ playing, togglePlay, next, prev });
  useEffect(() => {
    latest.current = { playing, togglePlay, next, prev };
  });

  const session = typeof navigator !== "undefined" ? navigator.mediaSession : undefined;

  useEffect(() => {
    if (!session || !active) return;
    const set = (action: MediaSessionAction, handler: (() => void) | null) => {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Older browsers reject actions they don't know.
      }
    };
    set("play", () => !latest.current.playing && latest.current.togglePlay());
    set("pause", () => latest.current.playing && latest.current.togglePlay());
    set("nexttrack", () => latest.current.next());
    set("previoustrack", () => latest.current.prev());
    return () => {
      for (const a of ACTIONS) set(a, null);
      session.metadata = null;
    };
  }, [session, active]);

  useEffect(() => {
    if (!session || !active || !title || typeof MediaMetadata === "undefined") return;
    session.metadata = new MediaMetadata({ title, artist: "FIU Campus Tour", album: subtitle });
  }, [session, active, title, subtitle]);

  useEffect(() => {
    if (!session || !active) return;
    session.playbackState = playing ? "playing" : "paused";
  }, [session, active, playing]);
}
