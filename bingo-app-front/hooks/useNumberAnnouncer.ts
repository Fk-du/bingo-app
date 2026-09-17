'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'bingo-call-sound-muted';

function letterFor(n: number): string {
  if (n >= 1 && n <= 15) return 'B';
  if (n >= 16 && n <= 30) return 'I';
  if (n >= 31 && n <= 45) return 'N';
  if (n >= 46 && n <= 60) return 'G';
  return 'O';
}

function callTextFor(n: number): string {
  return `${letterFor(n)} ${n}`;
}

function speechSynthesisAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function resolveVoice(): SpeechSynthesisVoice | null {
  if (!speechSynthesisAvailable()) return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred = ['en-US', 'en-GB'];
  for (const tag of preferred) {
    const match = voices.find((v) => v.lang.startsWith(tag));
    if (match) return match;
  }
  return null;
}

function speak(text: string) {
  if (!speechSynthesisAvailable()) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.85;
  utter.pitch = 1;
  utter.volume = 1;
  const voice = resolveVoice();
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  }
  window.speechSynthesis.speak(utter);
}

let voicesReady = false;

function preloadVoices() {
  if (!speechSynthesisAvailable()) return;
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
  const numbersRef = useRef<number[]>(numbers);

  useEffect(() => {
    preloadVoices();
  }, []);

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

  useEffect(() => {
    const len = numbers.length;
    const prev = prevLen.current;
    prevLen.current = len;
    if (mutedRef.current || prev === null || len <= prev || len === 0) return;
    speak(callTextFor(numbers[len - 1]));
  }, [numbers]);

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      try { window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* */ }
      if (speechSynthesisAvailable()) {
        window.speechSynthesis.cancel();
      }
      if (!next) {
        preloadVoices();
        const nums = numbersRef.current;
        const last = nums.length > 0 ? nums[nums.length - 1] : null;
        speak(last != null ? callTextFor(last) : 'Sound enabled');
      }
      return next;
    });
  }, []);

  return { muted, toggleMuted };
}