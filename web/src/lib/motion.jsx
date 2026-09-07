// Lightweight stand-in for framer-motion.
//
// Framer Motion's rAF-driven animations (especially staggered `delay` and
// `whileInView`) proved unreliable in this environment — delayed items get
// stuck at their initial opacity. For a forensic tool the PRD explicitly wants
// *subtle* motion, so we use CSS animations instead: a single fade-up keyframe
// (defined in tailwind.config.js as `animate-fade-up`) with an optional
// per-item stagger via inline `animationDelay`.
//
// The API mirrors the small slice of framer-motion we use: `motion.<tag>` and
// `AnimatePresence`. Motion-only props (initial/animate/exit/variants/
// whileHover/whileTap/whileInView/transition/layout) are accepted and ignored;
// `transition.delay` (seconds) is honoured as a CSS animation-delay.

import { forwardRef, createElement } from 'react';

const MOTION_PROPS = new Set([
  'initial', 'animate', 'exit', 'variants', 'transition', 'whileHover',
  'whileTap', 'whileInView', 'whileFocus', 'whileDrag', 'drag', 'layout',
  'layoutId', 'viewport', 'onAnimationComplete', 'custom',
]);

function splitProps(props) {
  const clean = {};
  let delay;
  for (const [k, v] of Object.entries(props)) {
    if (k === 'transition' && v && typeof v.delay === 'number') delay = v.delay;
    if (MOTION_PROPS.has(k)) continue;
    clean[k] = v;
  }
  return { clean, delay };
}

const cache = new Map();

function make(tag) {
  if (cache.has(tag)) return cache.get(tag);
  const Comp = forwardRef(function MotionShim({ className = '', style, children, ...rest }, ref) {
    const { clean, delay } = splitProps(rest);
    const mergedStyle = delay ? { ...style, animationDelay: `${delay}s` } : style;
    return createElement(
      tag,
      { ref, className: `bp-anim-fade-up ${className}`.trim(), style: mergedStyle, ...clean },
      children,
    );
  });
  Comp.displayName = `motion.${tag}`;
  cache.set(tag, Comp);
  return Comp;
}

const VALID_TAG = /^[a-z][a-z0-9]*$/;

export const motion = new Proxy(
  {},
  {
    get: (_t, tag) => {
      if (typeof tag !== 'string' || !VALID_TAG.test(tag)) return undefined;
      return make(tag);
    },
  },
);

// AnimatePresence: render children as-is (exit animations are dropped).
export function AnimatePresence({ children }) {
  return children;
}
