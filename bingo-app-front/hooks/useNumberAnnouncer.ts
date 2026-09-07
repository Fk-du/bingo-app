'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'bingo-call-sound-muted';
const TTS_ENDPOINT = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=';

function letterFor(n: number): string {
  if (n >= 1 && n <= 15) return 'B';
  if (n >= 16 && n <= 30) return 'I';
  if (n >= 31 && n <= 45) return 'N';
  if (n >= 46 && n <= 60) return 'G';
  return 'O';
}

function callTextFor(n: number): string {
  return `${letterFor(n)}. ${n}`;
}

let audioCtx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function playChime() {
  const ctx = ensureCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.09 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.09);
    osc.stop(now + i * 0.09 + 0.25);
  });
}

function resolveVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred = ['en-US', 'en-GB', 'am-ET', 'am'];
  for (const tag of preferred) {
    const match = voices.find((v) => v.lang.startsWith(tag));
    if (match) return match;
  }
  return null;
}

const ttsCache = new Map<string, string>();

function playRemoteTts(text: string) {
  const audio = new Audio();
  const cached = ttsCache.get(text);
  if (cached) {
    audio.src = cached;
  } else {
    const src = `${TTS_ENDPOINT}${encodeURIComponent(text)}`;
    ttsCache.set(text, src);
    audio.src = src;
    audio.onerror = () => {
      ttsCache.delete(text);
    };
  }
  void audio.play().catch(() => {
    ttsCache.delete(text);
  });
}

let speechSynthesisBroken = false;

function speechSynthesisUsable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && !speechSynthesisBroken;
}

function localVoicesAvailable(): boolean {
  if (!speechSynthesisUsable()) return false;
  try {
    return window.speechSynthesis.getVoices().length > 0;
  } catch {
    return false;
  }
}

function speakWithFallback(text: string) {
  if (!localVoicesAvailable()) {
    playRemoteTts(text);
    return;
  }

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.85;
  utter.pitch = 1;
  utter.volume = 1;
  const voice = resolveVoice();
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  }

  let started = false;
  let check: ReturnType<typeof setInterval> | undefined;
  const startedAt = Date.now();
  const stopCheck = () => {
    if (check) {
      clearInterval(check);
      check = undefined;
    }
  };
  const fallbackToRemote = () => {
    stopCheck();
    speechSynthesisBroken = true;
    window.speechSynthesis.cancel();
    playRemoteTts(text);
  };
  utter.onstart = () => {
    started = true;
  };
  utter.onend = stopCheck;
  utter.onerror = fallbackToRemote;

  window.speechSynthesis.speak(utter);

  check = setInterval(() => {
    const elapsed = Date.now() - startedAt;
    if (!started && elapsed > 1000) {
      fallbackToRemote();
    } else if (started && elapsed > 7000) {
      stopCheck();
    }
  }, 100);
}

let voicesReady = false;

function preloadVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.getVoices();
  if (!voicesReady) {
    voicesReady = true;
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}

export function useNumberAnnouncer(numbers: number[]) {
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const prevLen = useRef<number | null>(null);

  useEffect(() => {
    preloadVoices();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled || typeof window === 'undefined') return;
      let stored: string | null = null;
      try { stored = window.localStorage.getItem(STORAGE_KEY); } catch { /* */ }
      const isMuted = stored === '1';
      mutedRef.current = isMuted;
      setMuted(isMuted);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const len = numbers.length;
    const prev = prevLen.current;
    prevLen.current = len;
    if (mutedRef.current || prev === null || len <= prev || len === 0) return;
    const latest = numbers[len - 1];
    playChime();
    speakWithFallback(callTextFor(latest));
    setTimeout(() => speakWithFallback(callTextFor(latest)), 300);
  }, [numbers]);

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      try { window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* */ }
      if (!next) {
        preloadVoices();
        playChime();
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  }, []);

  return { muted, toggleMuted };
}