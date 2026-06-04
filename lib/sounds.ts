"use client";

import { useEffect } from "react";

export const soundSources = {
  button: "/sounds/button.wav",
  caution: "/sounds/caution.wav",
  celebration: "/sounds/celebration.wav",
  disabled: "/sounds/disabled.wav",
  notification: "/sounds/notification.wav",
  progressLoop: "/sounds/progress_loop.wav",
  ringtoneLoop: "/sounds/ringtone_loop.wav",
  select: "/sounds/select.wav",
  swipe: "/sounds/swipe.wav",
  swipeDown: "/sounds/swipe_02.wav",
  swipeUp: "/sounds/swipe_01.wav",
  tap: "/sounds/tap_01.wav",
  toggleOff: "/sounds/toggle_off.wav",
  toggleOn: "/sounds/toggle_on.wav",
  transitionDown: "/sounds/transition_down.wav",
  transitionUp: "/sounds/transition_up.wav",
  type: "/sounds/type_01.wav",
} as const;

export type SoundName = keyof typeof soundSources;

const DEFAULT_VOLUME = 0.35;
const cache = new Map<SoundName, HTMLAudioElement>();

function getAudio(name: SoundName) {
  if (typeof window === "undefined") return null;

  const cached = cache.get(name);
  if (cached) return cached;

  const audio = new Audio(soundSources[name]);
  audio.preload = "auto";
  cache.set(name, audio);
  return audio;
}

export function preloadSounds(names: SoundName[] = ["button", "select", "tap"]) {
  if (typeof window === "undefined") return;
  names.forEach((name) => {
    getAudio(name)?.load();
  });
}

export function playSound(
  name: SoundName,
  options: { loop?: boolean; volume?: number } = {},
) {
  const base = getAudio(name);
  if (!base) return null;

  const audio = base.cloneNode(true) as HTMLAudioElement;
  audio.loop = options.loop ?? false;
  audio.volume = options.volume ?? DEFAULT_VOLUME;

  void audio.play().catch(() => {
    // Browsers can block audio until the first trusted user gesture.
  });

  return audio;
}

export function useLoopingSound(
  name: SoundName,
  active: boolean,
  options: { volume?: number } = {},
) {
  useEffect(() => {
    if (!active) return;

    const audio = playSound(name, {
      loop: true,
      volume: options.volume ?? 0.18,
    });

    return () => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    };
  }, [active, name, options.volume]);
}
