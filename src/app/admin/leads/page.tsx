import { listLeads } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/dal";
import { formatClassTime } from "@/lib/classes";
import { started } from "@/lib/promises";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  // The queries start before the auth check rather than after it. They run on
  // the *user's* client, so RLS is what actually decides what comes back — an
  // impostor gets empty results — and `requireAdmin()` still refuses the
  // render below. Awaiting auth first simply spent two round trips before
  // asking for anything, which is the whole of the tab-switch delay.
  const leadsPromise = started(listLeads());

  await requireAdmin();
  const leads = await leadsPromise;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display-sm text-[1.75rem] text-ink">Leads</h1>
        <p className="label text-faint">{leads.length} shown</p>
      </div>

      <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
        Visitors who ran the self-assessment on the landing page and left
        their details. Follow up while it&rsquo;s still fresh.
      </p>

      {leads.length === 0 ? (
        <p className="mt-10 text-[0.9375rem] text-muted">
          No leads yet.
        </p>
      ) : (
        <ul className="mt-10">
          {leads.map((lead) => (
            <li
              key={lead.id}
              className="border-t border-line py-5 last:border-b"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <div>
                  <p className="text-[0.9375rem] text-ink">{lead.name}</p>
                  <p className="numeric mt-1 text-[0.8125rem] text-faint">
                    <a href={`tel:${lead.phone}`} className="link text-ink">
                      {lead.phone}
                    </a>
                    {lead.email && (
                      <>
                        {" "}
                        &middot;{" "}
                        <a
                          href={`mailto:${lead.email}`}
                          className="link text-ink"
                        >
                          {lead.email}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  {lead.score !== null && (
                    <p className="numeric text-[0.9375rem] text-ink">
                      {lead.score}/100
                      <span className="label ml-2 text-faint">{lead.band}</span>
                    </p>
                  )}
                  <p className="numeric mt-1 text-[0.8125rem] text-faint">
                    {formatClassTime(lead.created_at)}
                  </p>
                </div>
              </div>

              {lead.summary && (
                <p className="mt-3 max-w-2xl whitespace-pre-wrap text-[0.875rem] leading-relaxed text-muted">
                  {lead.summary}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
