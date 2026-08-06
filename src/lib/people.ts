import type { Profile } from "@/lib/db-types";

/**
 * How a person is written in an admin picker.
 *
 * Two problems it solves at once. The dropdown showed bare names, so with an
 * admin and a trainer of similar name there was no way to tell which was
 * which — and the roles are not interchangeable: an admin appears in the coach
 * list because admins can hold groups, not because they are the obvious
 * choice to run one.
 *
 * The other is the fallback chain. A profile whose name is null rendered as a
 * raw uuid, which is unreadable and, in the class form, was falling back to a
 * phone number — a personal detail with no business being in a dropdown that
 * exists to identify staff.
 *
 * Pure and shared so the two admin forms cannot drift apart on either point.
 */

type Person = Pick<Profile, "id" | "name" | "email" | "role">;

export function personLabel(person: Person): string {
  const name = person.name?.trim();
  if (name) return name;

  // The local part only. The full address is longer than the control and adds
  // nothing — anyone reading this list already knows the domain.
  const email = person.email?.trim();
  if (email) return email.split("@")[0] || email;

  // Last resort. A short id is still a handle someone can match against the
  // members table; a full uuid just overflows the select.
  return `Unnamed (${person.id.slice(0, 8)})`;
}

export function roleLabel(role: Profile["role"]): string {
  if (role === "admin") return "admin";
  if (role === "trainer") return "trainer";
  return "member";
}

/** "Siddhant Sawan (trainer)" — the name, then what they are. */
export function personOptionLabel(person: Person): string {
  return `${personLabel(person)} (${roleLabel(person.role)})`;
}
