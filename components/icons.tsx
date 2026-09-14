// Small hand-drawn icon set — no icon library dependency. 20x20, 1.6 stroke weight.
import type { SVGProps } from "react";

function base(props: SVGProps<SVGSVGElement>) {
  return { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...props };
}

export function FolderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 5.5a1 1 0 0 1 1-1h4l1.5 2h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-12.5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export function ActivityIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 11h3l2-5.5 3 9 2-6.5h5" />
    </svg>
  );
}

export function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M10 2.5 18 16.5H2z" />
      <path d="M10 8v3.2" />
      <circle cx="10" cy="14" r="0.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function KeyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="6.5" cy="13.5" r="3.5" />
      <path d="M9 11l7.5-7.5M13.5 6.5l2 2M16 4l1.5 1.5" />
    </svg>
  );
}

export function SparkleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...{ ...base(props), fill: "currentColor", stroke: "none" }}>
      <path d="M10 2l1.8 6.2L18 10l-6.2 1.8L10 18l-1.8-6.2L2 10l6.2-1.8z" />
    </svg>
  );
}

export function GitBranchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="5" cy="4.5" r="2" />
      <circle cx="5" cy="15.5" r="2" />
      <circle cx="15" cy="9.5" r="2" />
      <path d="M5 6.5v7" />
      <path d="M5 12c0-4 3-4.5 8-5" />
    </svg>
  );
}

export function ArrowDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M10 3v12M10 15l-4.5-4.5M10 15l4.5-4.5" />
    </svg>
  );
}

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 10h12M12 5.5 16.5 10 12 14.5" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 3.5v2M10 14.5v2M16.5 10h-2M5.5 10h-2M14.7 5.3l-1.4 1.4M6.7 13.3l-1.4 1.4M14.7 14.7l-1.4-1.4M6.7 6.7 5.3 5.3" />
    </svg>
  );
}

export function StethoscopeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M5 3v5.5a3.5 3.5 0 0 0 7 0V3" />
      <path d="M8.5 12v1.5a4.5 4.5 0 0 0 9 0V10" />
      <circle cx="17.2" cy="9" r="1.3" />
    </svg>
  );
}
