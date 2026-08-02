import type { AIProposal } from "@voyage/shared";
import { BookmarkCheck, Bot, ChevronDown, History } from "lucide-react";
import { createProposalAction } from "../../../actions/proposal-actions";
import { AiProposalCard, ProposalTypeIcon } from "../../../../components/ai-proposal-card";
import { AiProposalComposer } from "../../../../components/ai-proposal-composer";
import { EmptyState } from "../../../../components/empty-state";
import { Notice } from "../../../../components/notice";
import { PageHeading } from "../../../../components/page-heading";
import { ProposalAnalysis } from "../../../../components/proposal-analysis";
import { apiGet } from "../../../../lib/api";
import { formatDateTime } from "../../../../lib/format";
import {
  getProposalMeta,
  proposalHeadline,
  proposalStatusLabel
} from "../../../../lib/proposals";

type PageProps = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function AiPage({ params, searchParams }: PageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const proposals = await apiGet<AIProposal[]>(`/trips/${tripId}/ai-proposals`);
  const pending = proposals.filter((proposal) => proposal.status === "pending");
  const history = proposals.filter((proposal) => proposal.status !== "pending");

  return (
    <div className="page-stack ai-page">
      <PageHeading
        eyebrow="地端 AI"
        title="旅程分析"
        description={`${pending.length} 份待審核提案 · ${history.length} 筆決策紀錄`}
      />
      <Notice error={query.error} notice={query.notice} />

      <AiProposalComposer action={createProposalAction.bind(null, tripId)} />

      <section className="ai-review-section" aria-labelledby="pending-proposals-title">
        <div className="section-heading ai-review-heading">
          <div>
            <p className="eyebrow">審核佇列</p>
            <h2 id="pending-proposals-title">待審核提案</h2>
          </div>
          <span className="count-badge">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <EmptyState icon={Bot} title="目前沒有待審核提案" body="新的分析結果會出現在這裡。" />
        ) : (
          <div className="ai-proposal-list">
            {pending.map((proposal) => (
              <AiProposalCard proposal={proposal} tripId={tripId} key={proposal.id} />
            ))}
          </div>
        )}
      </section>

      <section className="content-section ai-history-section" aria-labelledby="proposal-history-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">決策紀錄</p>
            <h2 id="proposal-history-title">提案歷史</h2>
          </div>
          <History size={18} />
        </div>
        {history.length === 0 ? (
          <EmptyState icon={BookmarkCheck} title="尚無決策紀錄" body="保留或略過的提案會顯示在這裡。" />
        ) : (
          <div className="ai-history-list">
            {history.map((proposal) => (
              <details className="ai-history-item" key={proposal.id}>
                <summary>
                  <span className="ai-history-icon"><ProposalTypeIcon type={proposal.type} /></span>
                  <span className="ai-history-copy">
                    <strong>{proposalHeadline(proposal.summary, proposal.type)}</strong>
                    <small>{getProposalMeta(proposal.type).label} · {formatDateTime(proposal.createdAt)}</small>
                  </span>
                  <span className={`status-pill status-${proposal.status}`}>
                    {proposalStatusLabel(proposal.status)}
                  </span>
                  <ChevronDown className="ai-history-chevron" size={17} />
                </summary>
                <div className="ai-history-body">
                  <p>{proposal.summary}</p>
                  {proposal.inputText ? (
                    <blockquote className="ai-user-request">
                      <span>你的需求</span>
                      <p>{proposal.inputText}</p>
                    </blockquote>
                  ) : null}
                  <ProposalAnalysis value={proposal.proposedJson} />
                  {proposal.status === "accepted" && proposal.appliedByMember ? (
                    <small className="ai-decision-meta">
                      {proposal.appliedByMember.displayName} 於 {formatDateTime(proposal.appliedAt)} 保留此建議
                    </small>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
