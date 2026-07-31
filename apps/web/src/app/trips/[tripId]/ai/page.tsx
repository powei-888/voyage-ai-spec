import type { AIProposal } from "@voyage/shared";
import { Bot, Check, Plus, Sparkles, X } from "lucide-react";
import { createProposalAction, decideProposalAction } from "../../../actions/proposal-actions";
import { EmptyState } from "../../../../components/empty-state";
import { Notice } from "../../../../components/notice";
import { PageHeading } from "../../../../components/page-heading";
import { apiGet } from "../../../../lib/api";
import { formatDateTime, titleCase } from "../../../../lib/format";
import { PROPOSAL_TYPES } from "../../../../lib/options";

type PageProps = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

function ProposalDetails({ value }: { value: Record<string, unknown> }) {
  const entries = Object.entries(value).filter(([key]) => key !== "kind");
  if (entries.length === 0) return null;

  return (
    <dl className="proposal-details">
      {entries.map(([key, item]) => (
        <div key={key}>
          <dt>{titleCase(key)}</dt>
          <dd>
            {Array.isArray(item)
              ? item.length > 0 ? item.map(String).join(", ") : "None"
              : typeof item === "boolean" ? item ? "Yes" : "No"
              : String(item ?? "Not set")}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function AiPage({ params, searchParams }: PageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const proposals = await apiGet<AIProposal[]>(`/trips/${tripId}/ai-proposals`);
  const pending = proposals.filter((proposal) => proposal.status === "pending");
  const history = proposals.filter((proposal) => proposal.status !== "pending");

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="Assistance"
        title="AI proposals"
        description="Draft analysis that waits for a human decision."
        actions={<a className="button button-primary" href="#new-proposal"><Plus size={17} /> New proposal</a>}
      />
      <Notice error={query.error} notice={query.notice} />

      <section className="content-section">
        <div className="section-heading">
          <div><p className="eyebrow">Review queue</p><h2>Pending proposals</h2></div>
          <span className="count-badge">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <EmptyState icon={Bot} title="No pending proposals" body="Create a focused analysis below." />
        ) : (
          <div className="proposal-list">
            {pending.map((proposal) => (
              <article className="proposal-row" key={proposal.id}>
                <span className="proposal-icon"><Sparkles size={18} /></span>
                <div className="proposal-main">
                  <div className="proposal-heading">
                    <div><span className="category-label">{titleCase(proposal.type)}</span><h3>{proposal.summary}</h3></div>
                    <time>{formatDateTime(proposal.createdAt)}</time>
                  </div>
                  {proposal.inputText ? <p className="proposal-prompt">{proposal.inputText}</p> : null}
                  <ProposalDetails value={proposal.proposedJson} />
                  <div className="proposal-actions">
                    <form action={decideProposalAction.bind(null, tripId, proposal.id, "accept")}>
                      <button className="button button-primary" type="submit"><Check size={16} /> Accept</button>
                    </form>
                    <form action={decideProposalAction.bind(null, tripId, proposal.id, "reject")}>
                      <button className="button button-secondary" type="submit"><X size={16} /> Reject</button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="form-panel" id="new-proposal">
        <div className="section-heading"><div><p className="eyebrow">Mock provider</p><h2>Create proposal</h2></div></div>
        <form action={createProposalAction.bind(null, tripId)} className="form-grid">
          <label className="field">
            <span>Analysis type</span>
            <select name="type" defaultValue="itinerary_check">
              {PROPOSAL_TYPES.map((type) => <option value={type} key={type}>{titleCase(type)}</option>)}
            </select>
          </label>
          <label className="field field-span-2"><span>Context or request</span><textarea name="inputText" rows={4} maxLength={2000} placeholder="Check whether our current plan is too crowded." /></label>
          <div className="form-actions field-span-2"><button className="button button-primary" type="submit"><Sparkles size={16} /> Generate draft</button></div>
        </form>
      </section>

      <section className="content-section">
        <div className="section-heading"><div><p className="eyebrow">Decisions</p><h2>Proposal history</h2></div></div>
        {history.length === 0 ? (
          <EmptyState icon={Bot} title="No decisions yet" body="Accepted and rejected proposals will appear here." />
        ) : (
          <div className="simple-list">
            {history.map((proposal) => (
              <article key={proposal.id}>
                <span className={`state-dot state-${proposal.status}`} />
                <div><strong>{proposal.summary}</strong><small>{titleCase(proposal.type)} · {formatDateTime(proposal.createdAt)}</small></div>
                <span className={`status-pill status-${proposal.status}`}>{proposal.status}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
