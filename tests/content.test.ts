import { describe, expect, it } from "vitest";
import { groupFaqs, postDescription, readingTime, formatPostDate } from "@/lib/content";
import type { Faq, Post } from "@/lib/db-types";

function faq(over: Partial<Faq> = {}): Faq {
  return {
    id: crypto.randomUUID(), question: "Q", answer: "A", category: "General",
    position: 0, published: true,
    created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function post(over: Partial<Post> = {}): Post {
  return {
    id: crypto.randomUUID(), slug: "s", title: "T", excerpt: null, body: "",
    seo_title: null, seo_description: null, published_at: null, author_id: null,
    created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("groupFaqs", () => {
  it("keeps categories in first-seen order, not alphabetical", () => {
    // The order is hand-set via `position`; re-sorting alphabetically would
    // throw away the only thing that makes an FAQ readable.
    const groups = groupFaqs([
      faq({ category: "Zebra" }), faq({ category: "Apple" }), faq({ category: "Zebra" }),
    ]);
    expect(groups.map((g) => g.category)).toEqual(["Zebra", "Apple"]);
    expect(groups[0].items).toHaveLength(2);
  });

  it("handles an empty list", () => {
    expect(groupFaqs([])).toEqual([]);
  });

  it("loses nothing", () => {
    const items = [faq({ category: "A" }), faq({ category: "B" }), faq({ category: "A" })];
    const total = groupFaqs(items).reduce((n, g) => n + g.items.length, 0);
    expect(total).toBe(items.length);
  });
});

describe("readingTime", () => {
  it("never reports zero minutes", () => {
    expect(readingTime("")).toBe("1 min read");
    expect(readingTime("one")).toBe("1 min read");
  });

  it("rounds up", () => {
    expect(readingTime(Array(201).fill("word").join(" "))).toBe("2 min read");
  });
});

describe("postDescription", () => {
  it("prefers the explicit SEO description", () => {
    expect(postDescription(post({ seo_description: "seo", excerpt: "ex", body: "b" })))
      .toBe("seo");
  });

  it("falls back to the excerpt", () => {
    expect(postDescription(post({ excerpt: "ex", body: "b" }))).toBe("ex");
  });

  it("falls back to the body with markdown stripped", () => {
    const description = postDescription(post({ body: "## Heading\n**bold** text" }));
    expect(description).not.toContain("#");
    expect(description).not.toContain("*");
  });

  it("never returns an over-long meta description", () => {
    const description = postDescription(post({ body: "word ".repeat(400) }));
    expect(description.length).toBeLessThanOrEqual(160);
  });
});

describe("formatPostDate", () => {
  it("renders a long-form IST date", () => {
    expect(formatPostDate("2026-08-12T04:00:00Z")).toBe("12 August 2026");
  });
});
