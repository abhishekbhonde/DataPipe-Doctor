// A hand-built recreation of Aceternity's Spotlight technique — a blurred,
// animated glow — without pulling in the Tailwind + Framer Motion toolchain.
import styles from "./Spotlight.module.css";

export function Spotlight({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`${styles.spotlight} ${className}`}
      viewBox="0 0 3787 2842"
      fill="none"
      style={{ left: 0, top: 0 }}
      aria-hidden
    >
      <g filter="url(#spotlight-blur)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="473.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill="var(--primary)"
          fillOpacity="0.22"
        />
      </g>
      <defs>
        <filter id="spotlight-blur" x="0" y="0" width="3787" height="2842" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="140" />
        </filter>
      </defs>
    </svg>
  );
}
