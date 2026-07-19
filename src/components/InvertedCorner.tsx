"use client";

interface InvertedCornerProps {
  dir: "top-left" | "top-right";
  className?: string;
}

export default function InvertedCorner({ dir, className = "" }: InvertedCornerProps) {
  if (dir === "top-left") {
    return (
      <svg
        viewBox="0 0 36 36"
        width="36"
        height="36"
        shapeRendering="geometricPrecision"
        className={`pointer-events-none fill-shell block ${className}`}
        aria-hidden="true"
      >
        <path d="M 0 0 L 0 36 C 0 16.118 16.118 0 36 0 Z" />
      </svg>
    );
  }

  if (dir === "top-right") {
    return (
      <svg
        viewBox="0 0 36 36"
        width="36"
        height="36"
        shapeRendering="geometricPrecision"
        className={`pointer-events-none fill-shell block ${className}`}
        aria-hidden="true"
      >
        <path d="M 36 0 L 36 36 C 36 16.118 19.882 0 0 0 Z" />
      </svg>
    );
  }

  return null;
}
