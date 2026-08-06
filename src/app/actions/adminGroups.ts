"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin group management.
 *
 * The user's own client, not the service role: `training_groups` carries an
 * "admin write" RLS policy, so the database re-verifies the caller. Same
 * pattern as the pricing and content actions.
 */

export interface AdminGroupState {
  error?: string;
  success?: string;
}

const groupSchema = z.object({
  name: z.string().trim().min(2, "Give the group a name.").max(80),
  focus: z.string().trim().min(1).max(40),
  trainerId: z.string().uuid("Pick a coach."),
  capacity: z.coerce
    .number()
    .int()
    .min(1, "A group needs at least one place.")
    .max(200),
  scheduleHint: z.string().trim().max(80).optional().or(z.literal("")),
});

export async function createGroup(
  _prev: AdminGroupState,
  formData: FormData,
): Promise<AdminGroupState> {
  await requireAdmin();

  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    focus: formData.get("focus"),
    trainerId: formData.get("trainerId"),
    capacity: formData.get("capacity"),
    scheduleHint: formData.get("scheduleHint") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("training_groups").insert({
    name: parsed.data.name,
    focus: parsed.data.focus,
    trainer_id: parsed.data.trainerId,
    // Shared cohorts only. One-to-one groups are created by the member
    // picking a coach — see actions/groups.ts.
    kind: "group",
    capacity: parsed.data.capacity,
    schedule_hint: parsed.data.scheduleHint || null,
  });

  if (error) {
    console.error("[admin] could not create group", error);
    return { error: "Couldn't create that group." };
  }

  revalidatePath("/admin/groups");
  revalidatePath("/subscribe/group");
  return { success: "Group created." };
}

const toggleSchema = z.object({
  groupId: z.string().uuid(),
  active: z.enum(["true", "false"]),
});

/**
 * Retire a group, or bring it back.
 *
 * Never a delete. Members stay in it and their history stays intact — an
 * inactive group simply stops being offered to anyone new. Deleting one would
 * cascade its roster away and orphan every class that targeted it.
 */
export async function setGroupActive(formData: FormData) {
  await requireAdmin();

  const parsed = toggleSchema.safeParse({
    groupId: formData.get("groupId"),
    active: formData.get("active"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("training_groups")
    .update({
      active: parsed.data.active === "true",
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.groupId);

  revalidatePath("/admin/groups");
  revalidatePath("/subscribe/group");
}

const capacitySchema = z.object({
  userId: z.string().uuid(),
  capacity: z.coerce.number().int().min(0).max(50),
});

/**
 * How many one-to-one clients a coach will take.
 *
 * Zero by default and set here, so a trainer becomes bookable for private
 * clients by an explicit decision rather than as a side effect of being given
 * the trainer role.
 *
 * Service role, unlike the group writes above. `profiles` deliberately has no
 * admin-update policy — only "update own", with role pinned — so an admin
 * editing somebody else's row through the user client matches zero rows and
 * fails silently. Same reasoning as setUserRole in actions/admin.ts.
 */
export async function setCoachCapacity(
  _prev: AdminGroupState,
  formData: FormData,
): Promise<AdminGroupState> {
  await requireAdmin();

  const parsed = capacitySchema.safeParse({
    userId: formData.get("userId"),
    capacity: formData.get("capacity"),
  });
  if (!parsed.success) return { error: "Enter a number between 0 and 50." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ one_to_one_capacity: parsed.data.capacity })
    .eq("id", parsed.data.userId);

  if (error) return { error: "Couldn't save that." };

  revalidatePath("/admin/groups");
  revalidatePath("/subscribe/group");
  return { success: "Saved." };
}
