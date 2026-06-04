"use client";

import { useEffect, useRef } from "react";

import { playSound, preloadSounds, type SoundName } from "@/lib/sounds";

function isDisabled(element: HTMLElement) {
  return (
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true" ||
    element.getAttribute("data-disabled") === "true"
  );
}

function soundFromTarget(target: EventTarget | null): SoundName | null {
  if (!(target instanceof HTMLElement)) return null;

  const explicit = target.closest<HTMLElement>("[data-sound]");
  if (explicit) {
    const sound = explicit.dataset.sound;
    if (sound === "none") return null;
    if (sound) return sound as SoundName;
  }

  const toggle = target.closest<HTMLElement>(
    "[data-slot='checkbox'], [data-slot='switch']",
  );
  if (toggle) {
    if (isDisabled(toggle)) return "disabled";
    return toggle.getAttribute("aria-checked") === "true"
      ? "toggleOff"
      : "toggleOn";
  }

  const menuItem = target.closest<HTMLElement>(
    "[data-slot='select-item'], [data-slot='dropdown-menu-item'], [data-slot='command-item']",
  );
  if (menuItem) {
    if (isDisabled(menuItem)) return "disabled";
    return "select";
  }

  const interactive = target.closest<HTMLElement>(
    "button, a, [role='button'], [role='menuitem'], [data-slot='select-trigger']",
  );
  if (interactive) {
    if (isDisabled(interactive)) return "disabled";
    return "button";
  }

  return null;
}

export function SoundEffects() {
  const lastTypedAtRef = useRef(0);

  useEffect(() => {
    preloadSounds([
      "button",
      "caution",
      "celebration",
      "disabled",
      "notification",
      "select",
      "tap",
      "toggleOff",
      "toggleOn",
      "type",
    ]);

    function handlePointerDown(event: PointerEvent) {
      const sound = soundFromTarget(event.target);
      if (sound) playSound(sound);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.key.length !== 1
      ) {
        return;
      }

      const target = event.target;
      if (
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastTypedAtRef.current < 65) return;

      lastTypedAtRef.current = now;
      playSound("type", { volume: 0.16 });
    }

    document.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}
