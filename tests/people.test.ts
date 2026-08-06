import { describe, expect, it } from "vitest";
import { personLabel, personOptionLabel, roleLabel } from "@/lib/people";

/** How staff are written in the admin pickers. */

const base = {
  id: "3f1a2b7c-9d4e-4f88-9a01-112233445566",
  name: "Siddhant Sawan",
  email: "siddhant@example.com",
  role: "trainer" as const,
};

describe("personLabel", () => {
  it("prefers the name", () => {
    expect(personLabel(base)).toBe("Siddhant Sawan");
  });

  it("falls back to the email's local part, not the whole address", () => {
    expect(personLabel({ ...base, name: null })).toBe("siddhant");
  });

  it("treats a whitespace-only name as absent", () => {
    // A name of "   " is what a form with no trim gives you, and it rendered
    // as an invisible option nobody could pick deliberately.
    expect(personLabel({ ...base, name: "   " })).toBe("siddhant");
  });

  it("never falls back to a bare uuid", () => {
    const label = personLabel({ ...base, name: null, email: null });
    expect(label).not.toBe(base.id);
    expect(label).toContain("3f1a2b7c");
    expect(label.length).toBeLessThan(base.id.length);
  });
});

describe("personOptionLabel", () => {
  it("says which kind of staff member this is", () => {
    expect(personOptionLabel(base)).toBe("Siddhant Sawan (trainer)");
    expect(personOptionLabel({ ...base, role: "admin" })).toBe(
      "Siddhant Sawan (admin)",
    );
  });

  it("distinguishes two people who would otherwise read identically", () => {
    // The reason this exists: an admin and a trainer both appear in the coach
    // list, and the list gave no way to tell them apart.
    const admin = { ...base, role: "admin" as const };
    expect(personOptionLabel(base)).not.toBe(personOptionLabel(admin));
  });
});

describe("roleLabel", () => {
  it("covers every role the schema allows", () => {
    expect(roleLabel("admin")).toBe("admin");
    expect(roleLabel("trainer")).toBe("trainer");
    expect(roleLabel("member")).toBe("member");
  });
});
