'use client';

import { useEffect } from 'react';

const PLAYED_KEY = 'poozari_home_bell_played';

export function HomeBell() {
  useEffect(() => {
    if (window.sessionStorage.getItem(PLAYED_KEY)) return;

    const audio = new Audio('/audio/temple-bell.wav');
    audio.volume = 0.35;
    let completed = false;

    function removeFallbackListeners() {
      document.removeEventListener('pointerdown', playAfterInteraction);
      document.removeEventListener('keydown', playAfterInteraction);
    }

    async function playOnce() {
      if (completed) return;
      try {
        audio.currentTime = 0;
        await audio.play();
        completed = true;
        window.sessionStorage.setItem(PLAYED_KEY, '1');
        removeFallbackListeners();
      } catch {
        document.addEventListener('pointerdown', playAfterInteraction, { once: true });
        document.addEventListener('keydown', playAfterInteraction, { once: true });
      }
    }

    function playAfterInteraction() {
      void playOnce();
    }

    void playOnce();
    return () => {
      removeFallbackListeners();
      audio.pause();
    };
  }, []);

  return null;
}
