'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'bingo-call-sound-muted';
const SOUND_BASE = '/sounds/bingo';

function letterFor(n: number): string {
  if (n >= 1 && n <= 15) return 'B';
  if (n >= 16 && n <= 30) return 'I';
  if (n >= 31 && n <= 45) return 'N';
  if (n >= 46 && n <= 60) return 'G';
  if (n >= 61 && n <= 75) return 'O';
  return '';
}

function clipUrlFor(n: number): string | null {
  const letter = letterFor(n);
  if (!letter) return null;
  return `${SOUND_BASE}/${letter.toLowerCase()}-${n}.mp3`;
}

const clipCache = new Map<string, HTMLAudioElement>();

function playClip(n: number) {
  if (typeof window === 'undefined') return;
  const url = clipUrlFor(n);
  if (!url) return;
  let audio = clipCache.get(url);
  if (!audio) {
    audio = new Audio(url);
    audio.preload = 'auto';
    clipCache.set(url, audio);
  }
  audio.currentTime = 0;
  const promise = audio.play();
  if (promise !== undefined) {
    promise.catch(() => {
      speakFallback(`Number ${n}`);
    });
  }
}

function speechSynthesisAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function speakFallback(text: string) {
  if (!speechSynthesisAvailable()) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.85;
  utter.pitch = 1;
  utter.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = ['en-US', 'en-GB'];
  for (const tag of preferred) {
    const voice = voices.find((v) => v.lang.startsWith(tag));
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
      break;
    }
  }
  window.speechSynthesis.speak(utter);
}

function unlockAudio() {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { /* */ }
}

export function useNumberAnnouncer(numbers: number[]) {
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const prevLen = useRef<number | null>(null);
  const numbersRef = useRef<number[]>(numbers);
  const primed = useRef(false);

  useEffect(() => {
    numbersRef.current = numbers;
  }, [numbers]);

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

  // WebViews (e.g. Telegram) block autoplay until a user gesture. A tap on the
  // Sound toggle is the natural first interaction, so prime audio there too.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prime = () => {
      if (primed.current) return;
      primed.current = true;
      unlockAudio();
    };
    window.addEventListener('pointerdown', prime, { once: true });
    window.addEventListener('keydown', prime, { once: true });
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('keydown', prime);
    };
  }, []);

  useEffect(() => {
    const len = numbers.length;
    const prev = prevLen.current;
    prevLen.current = len;
    if (mutedRef.current || prev === null || len <= prev || len === 0) return;
    playClip(numbers[len - 1]);
  }, [numbers]);

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      try { window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* */ }
      if (speechSynthesisAvailable()) {
        window.speechSynthesis.cancel();
      }
      if (!primed.current) {
        primed.current = true;
        unlockAudio();
      }
      if (!next) {
        const nums = numbersRef.current;
        const last = nums.length > 0 ? nums[nums.length - 1] : null;
        if (last != null) playClip(last);
      }
      return next;
    });
  }, []);

  return { muted, toggleMuted };
}