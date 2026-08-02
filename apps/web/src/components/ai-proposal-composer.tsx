"use client";

import { BrainCircuit, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { PROPOSAL_TYPES } from "../lib/options";
import { getProposalMeta } from "../lib/proposals";
import { PendingButton } from "./pending-button";

export function AiProposalComposer({
  action
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [type, setType] = useState<(typeof PROPOSAL_TYPES)[number]>("itinerary_check");
  const meta = getProposalMeta(type);

  return (
    <section className="form-panel ai-composer" id="new-proposal">
      <div className="ai-composer-heading">
        <span className="ai-composer-icon"><BrainCircuit size={20} /></span>
        <div>
          <p className="eyebrow">地端 Qwen</p>
          <h2>建立分析提案</h2>
        </div>
        <span className="ai-safety-label"><ShieldCheck size={15} /> 不會自動修改資料</span>
      </div>
      <form action={action} className="ai-composer-form">
        <label className="field ai-type-field">
          <span>分析類型</span>
          <select
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
          >
            {PROPOSAL_TYPES.map((item) => (
              <option value={item} key={item}>{getProposalMeta(item).label}</option>
            ))}
          </select>
        </label>
        <label className="field ai-prompt-field">
          <span>想請 AI 檢查的內容</span>
          <textarea
            name="inputText"
            rows={3}
            maxLength={2000}
            placeholder={meta.placeholder}
          />
        </label>
        <PendingButton
          className="button button-primary ai-submit-button"
          type="submit"
          pendingLabel="地端分析中…"
        >
          <Sparkles size={16} /> 產生提案
        </PendingButton>
      </form>
    </section>
  );
}
