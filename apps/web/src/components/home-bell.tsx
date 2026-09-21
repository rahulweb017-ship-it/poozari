'use client';

import { useEffect } from 'react';

const PLAYED_KEY = 'poozari_home_bell_played';

export function HomeBell() {
  useEffect(() => {
    if (window.sessionStorage.getItem(PLAYED_KEY)) return;

    // Saved as .mp3, not the .mpeg it arrived as, so it is served as
    // audio/mpeg — some hosts map .mpeg to video/mpeg and Safari then
    // refuses to decode it.
    const audio = new Audio('/audio/bell.mp3');
    audio.volume = 0.35;
    // Lets the browser fetch it before the tab is interacted with, so the
    // first-click fallback below rings immediately rather than after a
    // network round trip.
    audio.preload = 'auto';
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
