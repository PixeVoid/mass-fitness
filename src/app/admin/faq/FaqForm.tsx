"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveFaq, type ContentState } from "@/app/actions/content";
import type { Faq } from "@/lib/db-types";

/**
 * One question, added or edited in place.
 *
 * The whole list renders these rather than routing to a separate editor:
 * FAQ entries are short, they are usually reworded rather than written, and
 * the reordering that `position` exists for is only sensible with the
 * neighbours visible.
 */
export default function FaqForm({
  faq,
  categories,
}: {
  faq?: Faq;
  categories: string[];
}) {
  const [state, action] = useActionState<ContentState, FormData>(saveFaq, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      {faq && <input type="hidden" name="id" value={faq.id} />}

      <div>
        <label className="field-label" htmlFor={`q-${faq?.id ?? "new"}`}>
          Question
        </label>
        <input
          id={`q-${faq?.id ?? "new"}`}
          name="question"
          required
          maxLength={200}
          defaultValue={faq?.question ?? ""}
          className="field"
        />
      </div>

      <div>
        <label className="field-label" htmlFor={`a-${faq?.id ?? "new"}`}>
          Answer
        </label>
        <textarea
          id={`a-${faq?.id ?? "new"}`}
          name="answer"
          required
          rows={4}
          maxLength={2000}
          defaultValue={faq?.answer ?? ""}
          className="field resize-y"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`c-${faq?.id ?? "new"}`}>
            Category
          </label>
          <input
            id={`c-${faq?.id ?? "new"}`}
            name="category"
            required
            maxLength={40}
            list="faq-categories"
            defaultValue={faq?.category ?? "General"}
            className="field"
          />
          {/* Existing categories offered as suggestions, not enforced — a new
              category should be one keystroke, not a migration. */}
          <datalist id="faq-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="field-label" htmlFor={`p-${faq?.id ?? "new"}`}>
            Position — lower shows first
          </label>
          <input
            id={`p-${faq?.id ?? "new"}`}
            name="position"
            type="number"
            min={0}
            max={9999}
            step={10}
            defaultValue={faq?.position ?? 0}
            className="field numeric"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 text-[0.9375rem] text-ink">
        <input
          type="checkbox"
          name="published"
          value="1"
          defaultChecked={faq ? faq.published : true}
          className="h-4 w-4"
        />
        Published
      </label>

      {state.error && (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-[0.8125rem] text-muted">
          {state.success}
        </p>
      )}

      <SaveButton isNew={!faq} />
    </form>
  );
}

function SaveButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-outline self-start disabled:opacity-60"
    >
      {pending ? "Saving…" : isNew ? "Add question" : "Save"}
    </button>
  );
}
