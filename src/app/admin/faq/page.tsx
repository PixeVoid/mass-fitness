import { deleteFaq } from "@/app/actions/content";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import FaqForm from "./FaqForm";
import { IconLabel } from "@/components/ui/Icon";
import { glyphs } from "@/components/ui/glyphs";
import { started } from "@/lib/promises";

export const dynamic = "force-dynamic";

/**
 * FAQ admin.
 *
 * Reads with the admin's own client so the "admin read all" policy surfaces
 * unpublished entries too — the public page only ever sees `published = true`,
 * and that difference should come from the database, not from remembering a
 * filter here.
 */
export default async function AdminFaqPage() {
  // Same shape as the other admin tabs: the query starts before the auth
  // check rather than behind it. It runs on the user's client, so RLS decides
  // what comes back and `requireAdmin()` still refuses the render — awaiting
  // auth first just spent two round trips before asking for anything.
  const supabase = await createClient();
  const faqsPromise = started(
    supabase
      .from("faqs")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
  );

  await requireAdmin();
  const { data: faqs } = await faqsPromise;

  const categories = [...new Set((faqs ?? []).map((f) => f.category))];

  return (
    <>
      <h1 className="display-sm text-[1.75rem] text-ink">FAQ</h1>
      <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-muted">
        These render at <span className="numeric">/faq</span> with FAQPage
        structured data, so a good answer can show up in a search result
        directly. The chat logs are the best source of what to add here.
      </p>

      <section className="mt-12 border-t border-line pt-8">
        <IconLabel glyph={glyphs.faq}>Add a question</IconLabel>
        <div className="mt-6 max-w-2xl">
          <FaqForm categories={categories} />
        </div>
      </section>

      <section className="mt-16 border-t border-line pt-8">
        <h2 className="label text-faint">
          {faqs?.length ?? 0} question{faqs?.length === 1 ? "" : "s"}
        </h2>

        <ul className="mt-6 max-w-2xl">
          {(faqs ?? []).map((faq) => (
            <li key={faq.id} className="border-t border-line py-8 first:border-t-0">
              <div className="label flex flex-wrap items-center gap-x-4 gap-y-2 text-faint">
                <span>{faq.category}</span>
                <span className="numeric">#{faq.position}</span>
                {!faq.published && <span>Hidden</span>}
              </div>

              <div className="mt-5">
                <FaqForm faq={faq} categories={categories} />
              </div>

              <div className="mt-4">
                <ConfirmSubmit
                  action={deleteFaq}
                  fields={{ id: faq.id }}
                  label="Delete"
                  confirmLabel="Delete question"
                  title="Delete this question?"
                  body={`"${faq.question}" will be removed from the public FAQ immediately. This cannot be undone.`}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
