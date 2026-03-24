import { useId } from "react";
import { type SVGProps } from "react";

export function NinjaHoodIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  const maskId = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <defs>
        <mask id={maskId}>
          <rect width="24" height="24" fill="white" />
          <polygon points="4,10.5 11,12 10.5,14.5 5,14" fill="black" />
          <polygon points="20,10.5 13,12 13.5,14.5 19,14" fill="black" />
        </mask>
      </defs>
      <path
        mask={`url(#${maskId})`}
        d="M12 2C7 2 3.5 5.5 3 9C2.5 12 2.8 14.5 3.5 16.5C4.5 19 6.5 20.8 9 21.5C10 21.8 11 22 12 22C13 22 14 21.8 15 21.5C17.5 20.8 19.5 19 20.5 16.5C21.2 14.5 21.5 12 21 9C20.5 5.5 17 2 12 2Z"
      />
    </svg>
  );
}
