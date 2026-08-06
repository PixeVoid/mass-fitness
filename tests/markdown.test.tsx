import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "@/components/blog/Markdown";

/**
 * The blog renderer. It emits React elements rather than an HTML string
 * specifically so there is no injection surface — these tests hold that line,
 * and check the writer's markup does what a writer expects.
 */
const render = (body: string) => renderToStaticMarkup(<Markdown body={body} />);

describe("safety", () => {
  it("never emits a javascript: link", () => {
    const html = render("[click](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("click");
  });

  it("refuses data: and vbscript: URLs too", () => {
    for (const scheme of ["data:text/html;base64,PHN2Zz4=", "vbscript:msgbox"]) {
      const html = render(`[x](${scheme})`);
      expect(html).not.toContain("href");
    }
  });

  it("escapes raw HTML rather than rendering it", () => {
    const html = render("<script>alert(1)</script> and <img src=x onerror=y>");

    // The word "onerror" does appear — inside escaped text, where it is inert.
    // What must not appear is a real tag or a real attribute, so the assertion
    // is about markup rather than about the substring.
    // No real tag is emitted. An attribute-shaped regex would be wrong here:
    // " onerror=" genuinely appears inside the escaped text, which is the
    // correct outcome — what matters is that no `<` survives to open a tag.
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<img/i);
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x onerror=y&gt;");
  });
});

describe("blocks", () => {
  it("renders headings at the right level", () => {
    expect(render("## Two")).toContain("<h2");
    expect(render("### Three")).toContain("<h3");
    expect(render("#### Four")).toContain("<h4");
  });

  it("renders bullet and numbered lists", () => {
    expect(render("- one\n- two")).toContain("<ul");
    expect(render("1. one\n2. two")).toContain("<ol");
  });

  it("renders a blockquote", () => {
    expect(render("> quoted")).toContain("<blockquote");
  });

  it("treats a single newline as a soft wrap, not a new paragraph", () => {
    const html = render("line one\nline two");
    expect(html.match(/<p/g) ?? []).toHaveLength(1);
  });

  it("splits paragraphs on a blank line", () => {
    const html = render("para one\n\npara two");
    expect(html.match(/<p/g) ?? []).toHaveLength(2);
  });

  it("survives CRLF line endings from a pasted document", () => {
    const html = render("para one\r\n\r\npara two");
    expect(html.match(/<p/g) ?? []).toHaveLength(2);
  });

  it("renders nothing for an empty body rather than throwing", () => {
    expect(() => render("")).not.toThrow();
    expect(() => render("   \n\n  ")).not.toThrow();
  });
});

describe("inline", () => {
  it("renders bold and italic", () => {
    expect(render("**bold**")).toContain("<strong");
    expect(render("*italic*")).toContain("<em");
  });

  it("does not let bold leak out of a code span", () => {
    // Sequential passes would re-match the output of an earlier one.
    const html = render("`**not bold**`");
    expect(html).not.toContain("<strong");
    expect(html).toContain("<code");
  });

  it("links internally with a relative href and externally with rel", () => {
    expect(render("[terms](/terms-and-conditions)")).toContain('href="/terms-and-conditions"');
    const external = render("[site](https://example.com)");
    expect(external).toContain('rel="noopener noreferrer"');
    expect(external).toContain('target="_blank"');
  });

  it("leaves unmatched asterisks as literal text", () => {
    const html = render("2 * 3 = 6");
    expect(html).toContain("2 * 3 = 6");
  });
});

describe("images", () => {
  it("renders a standalone image as a figure, not inside a paragraph", () => {
    const html = render("![a squat at depth](/img/squat.jpg)");
    expect(html).toContain("<figure");
    expect(html).toContain('src="/img/squat.jpg"');
    // Wrapped in a <p> it would be capped at the prose measure.
    expect(html).not.toMatch(/<p[^>]*>\s*<figure/);
  });

  it("uses the alt text for both the alt attribute and the caption", () => {
    const html = render("![a squat at depth](/img/squat.jpg)");
    expect(html).toContain('alt="a squat at depth"');
    expect(html).toContain("<figcaption");
    expect(html).toContain("a squat at depth");
  });

  it("treats empty alt as decorative — no caption", () => {
    const html = render("![](/img/squat.jpg)");
    expect(html).toContain('alt=""');
    expect(html).not.toContain("<figcaption");
  });

  it("refuses a javascript: src", () => {
    // The one way an element-based renderer can still execute something.
    const html = render("![x](javascript:alert)");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<figure");
  });

  it("refuses a data: src", () => {
    // An SVG data URL can carry a script.
    const html = render("![x](data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)");
    expect(html).not.toContain("<img");
  });

  it("shows an unsafe image verbatim rather than mangling it", () => {
    // Falling through to the inline pass looked equivalent and was not: the
    // link tokeniser matched the `[x](…)` half, rejected the URL and emitted
    // only the label, so the author saw `!x)` and learned nothing.
    const html = render("![x](javascript:alert)");
    expect(html).toContain("![x](javascript:alert)");
  });

  it("accepts http, https and site-relative sources", () => {
    expect(render("![a](/local.png)")).toContain("<img");
    expect(render("![a](https://cdn.example.com/x.png)")).toContain("<img");
    expect(render("![a](http://cdn.example.com/x.png)")).toContain("<img");
  });

  it("lazy-loads body images", () => {
    // The cover is the LCP element and is eager; everything in the body is
    // below the fold by definition.
    expect(render("![a](/x.png)")).toContain('loading="lazy"');
  });
});
