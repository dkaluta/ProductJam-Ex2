// Adapted from the Planes Cover Flow registry component:
// https://useplanes.com/r/cover-flow.json
// Keep its spring/gesture engine; render real game boards in CoverFlow.tsx.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useMotionValue,
  useReducedMotion,
  useSpring,
  type PanInfo,
  type MotionValue,
} from "motion/react";
import { useTickAudio } from "./cover-flow-audio";

type Direction = "left" | "right";

export interface CoverFlowItem {
  id: string | number;
  image: string;
  title: string;
  subtitle?: string;
}

export interface RenderImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className: string;
  draggable: boolean;
  sizes: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
}

export type CoverFlowScrollMode = "scrub" | "step";

export interface UseCoverFlowOptions {
  items: CoverFlowItem[];
  itemWidth?: number;
  centerGap?: number;
  initialIndex?: number;
  scrollMode?: CoverFlowScrollMode;
  enableScroll?: boolean;
  enableAudio?: boolean;
  enableClickToSnap?: boolean;
  scrollThreshold?: number;
  reduceMotion?: boolean;
  onItemClick?: (item: CoverFlowItem, index: number) => void;
  onIndexChange?: (index: number) => void;
}

export interface CoverFlowContainerProps {
  role: "region";
  "aria-roledescription"?: string;
  "aria-label": string;
  tabIndex: number;
  onKeyDown: (e: React.KeyboardEvent) => void;
  drag: "x";
  dragConstraints: { left: number; right: number };
  dragElastic: number;
  dragMomentum: boolean;
  onDragStart: () => void;
  onDrag: (event: unknown, info: PanInfo) => void;
  onDragEnd: (event: unknown, info: PanInfo) => void;
}

export interface UseCoverFlowResult {
  activeIndex: number;
  scrollX: MotionValue<number>;
  effectiveScrollX: MotionValue<number>;
  isDragging: boolean;
  scale: number;
  prefersReducedMotion: boolean;
  goTo: (index: number, velocity?: number, direction?: Direction) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerProps: CoverFlowContainerProps;
  handleCardClick: (item: CoverFlowItem, index: number) => void;
}

function clampIndex(index: number, length: number) {
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0));
}

const SPRING_SCROLL = { stiffness: 150, damping: 24, mass: 1 };
const DRAG_DIVISOR_RATIO = 0.8;
const BOUNDS_DAMPING = 0.35;
const VELOCITY_PROJECTION = 0.002;
const SCRUB_SETTLE_MS = 120;
const STEP_DELTA_THRESHOLD = 40;
const MAX_SCRUB_VELOCITY = 4000;

export function useCoverFlow({
  items,
  itemWidth = 400,
  centerGap = 250,
  initialIndex = 0,
  scrollMode = "scrub",
  enableScroll = true,
  enableAudio = false,
  enableClickToSnap = true,
  scrollThreshold = 100,
  reduceMotion,
  onItemClick,
  onIndexChange,
}: UseCoverFlowOptions): UseCoverFlowResult {
  const safeInitial = clampIndex(initialIndex, items.length);
  const [activeIndex, setActiveIndex] = useState(safeInitial);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const scale =
    containerWidth > 0 && itemWidth > 0
      ? Math.min(1, (containerWidth * 0.78) / itemWidth)
      : 1;
  const effectiveCenterGap = Math.round(centerGap * scale);

  const activeIndexRef = useRef(activeIndex);
  const enableScrollRef = useRef(enableScroll);
  const scrollThresholdRef = useRef(scrollThreshold);
  const onItemClickRef = useRef(onItemClick);
  const enableClickToSnapRef = useRef(enableClickToSnap);
  const onIndexChangeRef = useRef(onIndexChange);
  const isMountedForCallbackRef = useRef(false);
  const isRtlRef = useRef(false);
  const scrollModeRef = useRef(scrollMode);
  const centerGapRef = useRef(effectiveCenterGap);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    enableScrollRef.current = enableScroll;
    scrollThresholdRef.current = scrollThreshold;
    onItemClickRef.current = onItemClick;
    enableClickToSnapRef.current = enableClickToSnap;
    onIndexChangeRef.current = onIndexChange;
    scrollModeRef.current = scrollMode;
    centerGapRef.current = effectiveCenterGap;
  });

  const systemReducedMotion = useReducedMotion();
  const prefersReducedMotion = reduceMotion ?? systemReducedMotion ?? false;
  const scrollX = useMotionValue(safeInitial);
  const springX = useSpring(scrollX, SPRING_SCROLL);
  const effectiveScrollX = prefersReducedMotion ? scrollX : springX;
  const tick = useTickAudio(enableAudio);

  const clampedInitial = clampIndex(initialIndex, items.length);
  const [prevClampedInitial, setPrevClampedInitial] = useState(clampedInitial);
  if (prevClampedInitial !== clampedInitial) {
    setPrevClampedInitial(clampedInitial);
    if (clampedInitial !== activeIndex) {
      setActiveIndex(clampedInitial);
      scrollX.set(clampedInitial);
    }
  }

  useEffect(() => {
    if (!isMountedForCallbackRef.current) {
      isMountedForCallbackRef.current = true;
      return;
    }
    onIndexChangeRef.current?.(activeIndex);
  }, [activeIndex]);

  const jumpToIndex = useCallback(
    (index: number, velocity = 0, direction?: Direction) => {
      const clamped = clampIndex(index, items.length);
      const prev = activeIndexRef.current;
      if (clamped === prev) return;
      const dir: Direction = direction ?? (clamped > prev ? "right" : "left");
      setActiveIndex(clamped);
      scrollX.set(clamped);
      tick(dir, velocity);
    },
    [items.length, scrollX, tick],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    isRtlRef.current = getComputedStyle(container).direction === "rtl";

    let accumulator = 0;
    let lastTime = 0;
    let lastJump = 0;
    let scrubbing = false;
    let rawScrub = 0;
    let scrubVelocity = 0;
    let lastScrubTime = 0;
    let lastTickedIndex = 0;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const handleWheel = (e: WheelEvent) => {
      if (!enableScrollRef.current) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
      e.preventDefault();

      const now = e.timeStamp;
      const notched =
        e.deltaMode !== 0 || Math.abs(e.deltaX) >= STEP_DELTA_THRESHOLD;

      if (scrollModeRef.current === "scrub" && !notched) {
        const deltaX = isRtlRef.current ? -e.deltaX : e.deltaX;

        if (!scrubbing) {
          scrubbing = true;
          rawScrub = scrollX.get();
          scrubVelocity = 0;
          lastScrubTime = 0;
          lastTickedIndex = Math.round(rawScrub);
        }

        const dt = lastScrubTime === 0 ? 0 : now - lastScrubTime;
        lastScrubTime = now;
        if (dt > 0) {
          scrubVelocity = Math.max(
            -MAX_SCRUB_VELOCITY,
            Math.min(MAX_SCRUB_VELOCITY, (-deltaX / dt) * 1000),
          );
        }

        const before = Math.round(scrollX.get());
        rawScrub += deltaX / (centerGapRef.current * DRAG_DIVISOR_RATIO);
        const max = items.length - 1;
        const damped =
          rawScrub < 0
            ? rawScrub * BOUNDS_DAMPING
            : rawScrub > max
              ? max + (rawScrub - max) * BOUNDS_DAMPING
              : rawScrub;
        scrollX.set(damped);

        const after = Math.round(damped);
        if (after !== before) {
          lastTickedIndex = after;
          tick(after > before ? "right" : "left", Math.abs(scrubVelocity));
        }

        if (settleTimer) clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
          scrubbing = false;
          const target = clampIndex(
            Math.round(scrollX.get() - scrubVelocity * VELOCITY_PROJECTION),
            items.length,
          );
          const prev = activeIndexRef.current;
          setActiveIndex(target);
          scrollX.set(target);
          if (target !== lastTickedIndex) {
            tick(target >= prev ? "right" : "left", Math.abs(scrubVelocity));
          }
        }, SCRUB_SETTLE_MS);
        return;
      }

      if (now - lastTime > 200) accumulator = 0;
      lastTime = now;
      accumulator += isRtlRef.current ? -e.deltaX : e.deltaX;

      const threshold = scrollThresholdRef.current;
      const shouldJump =
        (accumulator > threshold || accumulator < -threshold) &&
        now - lastJump > 150;

      if (shouldJump) {
        const dir = accumulator > 0 ? "right" : "left";
        jumpToIndex(
          Math.round(scrollX.get()) + (dir === "right" ? 1 : -1),
          Math.abs(e.deltaX),
          dir,
        );
        accumulator = 0;
        lastJump = now;
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [jumpToIndex, scrollX, tick, items.length]);

  const handleCardClick = useCallback(
    (item: CoverFlowItem, index: number) => {
      if (index === activeIndexRef.current) {
        onItemClickRef.current?.(item, index);
      } else if (enableClickToSnapRef.current) {
        jumpToIndex(index);
      }
    },
    [jumpToIndex],
  );

  const rawDragX = useRef(0);

  const onDragStart = useCallback(() => {
    rawDragX.current = scrollX.get();
    setIsDragging(true);
  }, [scrollX]);

  const onDrag = useCallback(
    (_: unknown, info: PanInfo) => {
      const deltaX = isRtlRef.current ? -info.delta.x : info.delta.x;
      rawDragX.current -= deltaX / (effectiveCenterGap * DRAG_DIVISOR_RATIO);
      const raw = rawDragX.current;
      const max = items.length - 1;
      const damped =
        raw < 0
          ? raw * BOUNDS_DAMPING
          : raw > max
            ? max + (raw - max) * BOUNDS_DAMPING
            : raw;
      scrollX.set(damped);
    },
    [effectiveCenterGap, items.length, scrollX],
  );

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      setIsDragging(false);
      const velocityX = isRtlRef.current ? -info.velocity.x : info.velocity.x;
      const projected = scrollX.get() - velocityX * VELOCITY_PROJECTION;
      const clamped = clampIndex(Math.round(projected), items.length);
      const prev = activeIndexRef.current;
      const dir: Direction = clamped >= prev ? "right" : "left";
      setActiveIndex(clamped);
      scrollX.set(clamped);
      if (clamped !== prev) tick(dir, Math.abs(info.velocity.x));
    },
    [items.length, scrollX, tick],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const back = isRtlRef.current ? "ArrowRight" : "ArrowLeft";
      const forward = isRtlRef.current ? "ArrowLeft" : "ArrowRight";
      if (e.key === back) {
        e.preventDefault();
        jumpToIndex(activeIndexRef.current - 1, 120, "left");
      }
      if (e.key === forward) {
        e.preventDefault();
        jumpToIndex(activeIndexRef.current + 1, 120, "right");
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const idx = clampIndex(activeIndexRef.current, items.length);
        const item = items[idx];
        if (item) onItemClickRef.current?.(item, idx);
      }
    },
    [jumpToIndex, items],
  );

  return {
    activeIndex,
    scrollX,
    effectiveScrollX,
    isDragging,
    scale,
    prefersReducedMotion,
    goTo: jumpToIndex,
    containerRef,
    containerProps: {
      role: "region",
      "aria-roledescription": "carousel",
      "aria-label": "Cover Flow",
      tabIndex: 0,
      onKeyDown,
      drag: "x",
      dragConstraints: { left: 0, right: 0 },
      dragElastic: 0,
      dragMomentum: false,
      onDragStart,
      onDrag,
      onDragEnd,
    },
    handleCardClick,
  };
}
