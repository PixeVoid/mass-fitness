import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A small markdown renderer for post bodies.
 *
 * Deliberately not `marked` + a sanitiser, and deliberately not
 * `dangerouslySetInnerHTML` anywhere. It emits React elements, so there is no
 * HTML string for an injection to live in — the XSS surface is zero rather
 * than "zero as long as the sanitiser is configured right". The author is an
 * admin today, but "only trusted people can post" is exactly the assumption
 * that stops being true first.
 *
 * The supported subset is what a fitness article actually needs: headings,
 * paragraphs, both kinds of list, blockquotes, and inline bold / italic /
 * code / links. Anything else renders as its own literal text rather than
 * disappearing, so a writer sees their mistake instead of losing a paragraph.
 *
 * Styling matches the legal pages' prose rhythm, so the blog reads as the same
 * publication rather than a bolted-on CMS theme.
 */
export default function Markdown({ body }: { body: string }) {
  return <div className="flex flex-col gap-6">{renderBlocks(body)}</div>;
}

function renderBlocks(body: string): ReactNode[] {
  // Blank lines separate blocks. \r\n is normalised first — a body pasted from
  // Word otherwise arrives as one unbroken paragraph.
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const out: ReactNode[] = [];

  blocks.forEach((raw, index) => {
    const block = raw.trim();
    if (!block) return;

    const heading = /^(#{2,4})\s+(.*)$/.exec(block);
    if (heading) {
      const level = heading[1].length;
      const text = inline(heading[2]);
      const key = `h-${index}`;
      if (level === 2) {
        out.push(
          <h2 key={key} className="display-sm mt-6 text-[1.75rem] text-ink">
            {text}
          </h2>,
        );
      } else if (level === 3) {
        out.push(
          <h3 key={key} className="display-sm mt-4 text-[1.375rem] text-ink">
            {text}
          </h3>,
        );
      } else {
        out.push(
          <h4 key={key} className="text-[1.0625rem] font-medium text-ink">
            {text}
          </h4>,
        );
      }
      return;
    }

    if (block.startsWith("> ")) {
      out.push(
        <blockquote key={`q-${index}`} className="border-l border-line-strong pl-6">
          <p className="text-[0.9375rem] leading-relaxed text-ink">
            {inline(block.replace(/^>\s?/gm, ""))}
          </p>
        </blockquote>,
      );
      return;
    }

    const lines = block.split("\n");

    if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
      out.push(
        <ul key={`ul-${index}`} className="flex flex-col gap-3">
          {lines.map((line, i) => (
            <li
              key={i}
              className="flex gap-3 text-[0.9375rem] leading-relaxed text-muted"
            >
              <span aria-hidden="true" className="shrink-0 text-faint">
                &mdash;
              </span>
              <span>{inline(line.replace(/^\s*[-*]\s+/, ""))}</span>
            </li>
          ))}
        </ul>,
      );
      return;
    }

    if (lines.every((line) => /^\s*\d+[.)]\s+/.test(line))) {
      out.push(
        <ol key={`ol-${index}`} className="flex flex-col gap-3">
          {lines.map((line, i) => (
            <li
              key={i}
              className="flex gap-3 text-[0.9375rem] leading-relaxed text-muted"
            >
              <span aria-hidden="true" className="numeric shrink-0 text-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{inline(line.replace(/^\s*\d+[.)]\s+/, ""))}</span>
            </li>
          ))}
        </ol>,
      );
      return;
    }

    out.push(
      <p key={`p-${index}`} className="text-[0.9375rem] leading-relaxed text-muted">
        {/* A single newline inside a paragraph is a soft wrap in the source,
            not a line break — same as every other markdown renderer. */}
        {inline(block.replace(/\n/g, " "))}
      </p>,
    );
  });

  return out;
}

/**
 * Inline spans, tokenised in one pass.
 *
 * One regex with alternates rather than four sequential passes: running them
 * in sequence would let the output of an earlier pass be re-matched by a later
 * one, so `` `**not bold**` `` inside a code span would come out bold.
 */
const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text: string): ReactNode[] {
  const parts = text.split(INLINE).filter((part) => part !== "");

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-medium text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="md-em">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="numeric text-[0.875em] text-ink">
          {part.slice(1, -1)}
        </code>
      );
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;

      // Only http(s) and site-relative targets. Without this check a body
      // could carry a `javascript:` URL — the one way an element-based
      // renderer can still execute something.
      const isInternal = href.startsWith("/");
      const isExternal = /^https?:\/\//i.test(href);
      if (!isInternal && !isExternal) return <span key={i}>{label}</span>;

      if (isInternal) {
        return (
          <Link key={i} href={href} className="link text-ink">
            {label}
          </Link>
        );
      }

      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="link text-ink"
        >
          {label}
        </a>
      );
    }

    return <span key={i}>{part}</span>;
  });
}
