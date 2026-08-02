import type { AIProposal } from "@voyage/shared";
import {
  ArrowRight,
  BookmarkCheck,
  CalendarClock,
  CalendarSearch,
  FileSearch,
  ReceiptText,
  Sparkles,
  WalletCards,
  X
} from "lucide-react";
import { decideProposalAction } from "../app/actions/proposal-actions";
import { formatDateTime } from "../lib/format";
import {
  getProposalMeta,
  proposalDestination,
  proposalHeadline
} from "../lib/proposals";
import { ConfirmForm } from "./confirm-form";
import { PendingButton } from "./pending-button";
import { ProposalAnalysis } from "./proposal-analysis";

export function AiProposalCard({
  proposal,
  tripId
}: {
  proposal: AIProposal;
  tripId: string;
}) {
  const meta = getProposalMeta(proposal.type);
  const headline = proposalHeadline(proposal.summary, proposal.type);

  return (
    <article className="ai-proposal-card">
      <header className="ai-proposal-header">
        <span className="ai-proposal-icon"><ProposalTypeIcon type={proposal.type} /></span>
        <div className="ai-proposal-heading">
          <span className="category-label">{meta.label}</span>
          <h3>{headline}</h3>
          <div className="ai-proposal-meta">
            <time>{formatDateTime(proposal.createdAt)}</time>
            {proposal.createdByMember ? <span>由 {proposal.createdByMember.displayName} 建立</span> : null}
          </div>
        </div>
      </header>

      {headline !== proposal.summary ? (
        <p className="ai-proposal-summary">{proposal.summary}</p>
      ) : null}
      {proposal.inputText ? (
        <blockquote className="ai-user-request">
          <span>你的需求</span>
          <p>{proposal.inputText}</p>
        </blockquote>
      ) : null}

      <ProposalAnalysis value={proposal.proposedJson} />

      <footer className="ai-proposal-footer">
        <a className="text-link ai-workspace-link" href={proposalDestination(tripId, proposal.type)}>
          {meta.actionLabel} <ArrowRight size={15} />
        </a>
        <div className="ai-decision-actions">
          <ConfirmForm
            action={decideProposalAction.bind(null, tripId, proposal.id, "accept")}
            message="要保留這份建議作為決策紀錄嗎？旅程資料不會被修改。"
          >
            <PendingButton className="button button-primary" type="submit" pendingLabel="保留中…">
              <BookmarkCheck size={16} /> 保留建議
            </PendingButton>
          </ConfirmForm>
          <ConfirmForm
            action={decideProposalAction.bind(null, tripId, proposal.id, "reject")}
            message="要略過這份建議嗎？之後仍可在歷史紀錄查看。"
          >
            <PendingButton className="button button-secondary" type="submit" pendingLabel="處理中…">
              <X size={16} /> 略過
            </PendingButton>
          </ConfirmForm>
        </div>
      </footer>
    </article>
  );
}

export function ProposalTypeIcon({ type }: { type: string }) {
  if (type === "itinerary_check") return <CalendarSearch size={19} />;
  if (type === "itinerary_update") return <CalendarClock size={19} />;
  if (type === "expense_summary") return <WalletCards size={19} />;
  if (type === "receipt_review") return <ReceiptText size={19} />;
  if (type === "booking_parse") return <FileSearch size={19} />;
  return <Sparkles size={19} />;
}
