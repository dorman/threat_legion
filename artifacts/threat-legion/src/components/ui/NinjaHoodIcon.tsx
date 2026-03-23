import { type SVGProps } from "react";

export function NinjaHoodIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 2C8 2 5 5 5 8v2c0 1.5-.5 2.5-1 3.5C3 15 3 16 3 17c0 2.5 2 4 4 4h10c2 0 4-1.5 4-4 0-1-.5-2-1-3.5-.5-1-1-2-1-3.5V8c0-3-3-6-7-6z" />
      <path d="M5 10c2 1 4 1.5 7 1.5S17 11 19 10" />
      <path d="M9 17h6" />
      <path d="M10 15c0 1.1.9 2 2 2s2-.9 2-2" />
    </svg>
  );
}
