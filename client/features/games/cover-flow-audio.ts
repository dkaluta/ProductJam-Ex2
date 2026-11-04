// Source: https://useplanes.com/r/cover-flow-audio.json
"use client";

import { useCallback, useEffect, useRef } from "react";

export type TickDirection = "left" | "right";

const AudioCtx: typeof AudioContext | null =
  typeof window !== "undefined"
    ? (window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext ??
      null)
    : null;

export function useTickAudio(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(
    () => () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!enabled || !AudioCtx) return;
    const warm = () => {
      if (!ctxRef.current) ctxRef.current = new AudioCtx!();
      if (ctxRef.current.state === "suspended")
        ctxRef.current.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", warm, { once: true });
    return () => window.removeEventListener("pointerdown", warm);
  }, [enabled]);

  return useCallback(
    (direction: TickDirection, velocity = 1) => {
      if (!enabled || !AudioCtx) return;

      const getCtx = async () => {
        if (!ctxRef.current) ctxRef.current = new AudioCtx!();
        if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
        return ctxRef.current;
      };

      getCtx()
        .then((ctx) => {
          const t = ctx.currentTime;
          const vn = Math.min(Math.abs(velocity) / 300, 1);
          const peakGain = 0.28 * (0.55 + vn * 0.45);
          const freq = 1600 * (0.88 + vn * 0.24);
          const bodyDur = 0.022 - vn * 0.008;
          const clickDur = bodyDur * 0.3;
          const panStart = direction === "left" ? 0.7 : -0.7;
          const panEnd = direction === "left" ? -0.7 : 0.7;

          const panner = ctx.createStereoPanner();
          panner.pan.setValueAtTime(panStart, t);
          panner.pan.linearRampToValueAtTime(panEnd, t + bodyDur);
          panner.connect(ctx.destination);

          const bodyGain = ctx.createGain();
          bodyGain.gain.setValueAtTime(peakGain, t);
          bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + bodyDur);
          bodyGain.connect(panner);

          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = freq;
          filter.Q.value = 6;
          filter.connect(bodyGain);

          const osc = ctx.createOscillator();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq * 1.25, t);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.65, t + bodyDur);
          osc.connect(filter);
          osc.start(t);
          osc.stop(t + bodyDur);

          const nSamples = Math.ceil(ctx.sampleRate * clickDur);
          const noiseBuf = ctx.createBuffer(1, nSamples, ctx.sampleRate);
          const d = noiseBuf.getChannelData(0);
          for (let i = 0; i < nSamples; i++)
            d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nSamples * 0.2));

          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(peakGain * 0.35, t);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + clickDur);
          noiseGain.connect(panner);

          const noiseHp = ctx.createBiquadFilter();
          noiseHp.type = "highpass";
          noiseHp.frequency.value = 2400;
          noiseHp.connect(noiseGain);

          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuf;
          noise.connect(noiseHp);
          noise.start(t);
          noise.stop(t + clickDur);
        })
        .catch(() => {});
    },
    [enabled],
  );
}
