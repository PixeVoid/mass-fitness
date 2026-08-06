import { describe, expect, it } from "vitest";
import { escapeSearchTerm } from "@/lib/admin/queries";

/**
 * Admin member search. The term is interpolated into a PostgREST `or` filter
 * — a comma or a parenthesis in it does not merely break the query, it
 * changes which filters run.
 */

describe("escapeSearchTerm", () => {
  it("leaves an ordinary name alone", () => {
    expect(escapeSearchTerm("Siddhant")).toBe("Siddhant");
    expect(escapeSearchTerm("ankit anand")).toBe("ankit anand");
  });

  it("neutralises the filter-expression separators", () => {
    // A comma ends one filter and starts another; parens open a group.
    for (const char of [",", "(", ")", ".", '"', "'"]) {
      expect(escapeSearchTerm(`a${char}b`)).not.toContain(char);
    }
  });

  it("escapes like-wildcards so they match themselves", () => {
    // Someone searching for "100%" means the character, not "anything".
    expect(escapeSearchTerm("100%")).toBe("100\\%");
    expect(escapeSearchTerm("a_b")).toBe("a\\_b");
  });

  it("escapes the escape character before anything else", () => {
    // If the backslash were escaped last, it would double the ones this
    // function had just added and change what they escape.
    expect(escapeSearchTerm("a\\b")).toBe("a\\\\b");
    expect(escapeSearchTerm("\\%")).toBe("\\\\\\%");
  });

  it("cannot smuggle a second filter through a crafted term", () => {
    const attack = 'x,role.eq.admin,name.ilike.%';
    const escaped = escapeSearchTerm(attack);
    expect(escaped).not.toContain(",");
    expect(escaped).not.toContain("role.eq.admin");
  });
});
