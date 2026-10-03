import type { SVGProps } from "react";

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" {...props}>
      <path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" {...props}>
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" {...props}>
      <rect x="5" y="11" width="14" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 018 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
