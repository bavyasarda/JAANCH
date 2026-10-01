"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Browser Web Speech API wrapper (SpeechRecognition). Returns null support on browsers without it. */
export function useSpeechInput(lang: string, onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<Recognition | null>(null);
  const cb = useRef(onTranscript);
  useEffect(() => {
    cb.current = onTranscript;
  }, [onTranscript]);
  // null during SSR, then true/false on the client.
  const supported = useSyncExternalStore(() => () => {}, () => getCtor() !== null, () => null);

  const stop = useCallback(() => {
    ref.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setError(null);
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results as ArrayLike<ArrayLike<{ transcript: string }>>).map((res) => res[0]?.transcript ?? "").join(" ").trim();
      cb.current(text);
    };
    r.onend = () => setListening(false);
    r.onerror = (e) => {
      setError(e.error === "not-allowed" ? "Microphone permission was denied." : e.error === "no-speech" ? "No speech heard. Try again." : `Voice input error: ${e.error}`);
      setListening(false);
    };
    ref.current = r;
    setListening(true);
    r.start();
  }, [lang]);

  return { start, stop, listening, supported, error };
}
