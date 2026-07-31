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
              ? item.length > 0 ? item.map((value) => titleCase(String(value))).join("、") : "無"
              : typeof item === "boolean" ? item ? "是" : "否"
              : String(item ?? "未設定")}
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
        eyebrow="AI 助理"
        title="AI 提案"
        description="AI 僅產生分析草稿，必須由使用者確認後才採用。"
        actions={<a className="button button-primary" href="#new-proposal"><Plus size={17} /> 新增提案</a>}
      />
      <Notice error={query.error} notice={query.notice} />

      <section className="content-section">
        <div className="section-heading">
          <div><p className="eyebrow">審核佇列</p><h2>待審核提案</h2></div>
          <span className="count-badge">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <EmptyState icon={Bot} title="目前沒有待審核提案" body="可從下方建立新的分析草稿。" />
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
                      <button className="button button-primary" type="submit"><Check size={16} /> 接受</button>
                    </form>
                    <form action={decideProposalAction.bind(null, tripId, proposal.id, "reject")}>
                      <button className="button button-secondary" type="submit"><X size={16} /> 拒絕</button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="form-panel" id="new-proposal">
        <div className="section-heading"><div><p className="eyebrow">模擬 AI 服務</p><h2>建立提案</h2></div></div>
        <form action={createProposalAction.bind(null, tripId)} className="form-grid">
          <label className="field">
            <span>分析類型</span>
            <select name="type" defaultValue="itinerary_check">
              {PROPOSAL_TYPES.map((type) => <option value={type} key={type}>{titleCase(type)}</option>)}
            </select>
          </label>
          <label className="field field-span-2"><span>補充情境或需求</span><textarea name="inputText" rows={4} maxLength={2000} placeholder="檢查目前的行程是否安排得太緊湊。" /></label>
          <div className="form-actions field-span-2"><button className="button button-primary" type="submit"><Sparkles size={16} /> 產生分析草稿</button></div>
        </form>
      </section>

      <section className="content-section">
        <div className="section-heading"><div><p className="eyebrow">決策紀錄</p><h2>提案歷史</h2></div></div>
        {history.length === 0 ? (
          <EmptyState icon={Bot} title="尚無決策紀錄" body="已接受或拒絕的提案會顯示在這裡。" />
        ) : (
          <div className="simple-list">
            {history.map((proposal) => (
              <article key={proposal.id}>
                <span className={`state-dot state-${proposal.status}`} />
                <div><strong>{proposal.summary}</strong><small>{titleCase(proposal.type)} · {formatDateTime(proposal.createdAt)}</small></div>
                <span className={`status-pill status-${proposal.status}`}>{titleCase(proposal.status)}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
