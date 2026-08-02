import { AlertTriangle, Cpu, Info, Lightbulb, ListChecks } from "lucide-react";
import {
  proposalDisplayFields,
  proposalFieldLabel,
  proposalTechnicalFields,
  localizeProposalText
} from "../lib/proposals";
import { titleCase } from "../lib/format";

export function ProposalAnalysis({ value }: { value: Record<string, unknown> }) {
  const fields = proposalDisplayFields(value);
  const metrics = fields.filter((field) => field.scalar);
  const sections = fields.filter((field) => !field.scalar);
  const technical = proposalTechnicalFields(value);

  return (
    <>
      {metrics.length > 0 ? (
        <dl className="ai-metrics">
          {metrics.map((field) => (
            <div key={field.key}>
              <dt>{field.label}</dt>
              <dd><ProposalValue value={field.value} /></dd>
            </div>
          ))}
        </dl>
      ) : null}

      {sections.length > 0 ? (
        <div className="ai-analysis-sections">
          {sections.map((field) => (
            <section className={`ai-analysis-section tone-${fieldTone(field.key)}`} key={field.key}>
              <div className="ai-analysis-title">
                <FieldIcon field={field.key} />
                <h4>{field.label}</h4>
              </div>
              <ProposalValue value={field.value} />
            </section>
          ))}
        </div>
      ) : null}

      {technical.length > 0 ? (
        <details className="ai-technical-details">
          <summary><Cpu size={14} /> 技術資訊</summary>
          <dl>
            {technical.map((item) => (
              <div key={item.label}><dt>{item.label}</dt><dd>{String(item.value)}</dd></div>
            ))}
          </dl>
        </details>
      ) : null}
    </>
  );
}

function ProposalValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="ai-empty-value">目前沒有</p>;
    return (
      <ul className="ai-value-list">
        {value.map((item, index) => (
          <li key={index}><ProposalValue value={item} /></li>
        ))}
      </ul>
    );
  }

  if (value && typeof value === "object") {
    return (
      <dl className="ai-nested-values">
        {Object.entries(value).map(([key, item]) => (
          <div key={key}>
            <dt>{proposalFieldLabel(key)}</dt>
            <dd><ProposalValue value={item} /></dd>
          </div>
        ))}
      </dl>
    );
  }

  if (typeof value === "boolean") return <>{value ? "是" : "否"}</>;
  if (value === null || value === undefined || value === "") return <>未提供</>;
  if (typeof value === "string") {
    return <>{/^[a-z][a-z0-9_]*$/i.test(value) ? titleCase(value) : localizeProposalText(value)}</>;
  }
  return <>{String(value)}</>;
}

function fieldTone(field: string) {
  if (["warnings", "missingFields", "timeOverlap"].includes(field)) return "warning";
  if (["suggestions", "operations"].includes(field)) return "suggestion";
  return "neutral";
}

function FieldIcon({ field }: { field: string }) {
  if (["warnings", "missingFields", "timeOverlap"].includes(field)) {
    return <AlertTriangle size={16} />;
  }
  if (["suggestions", "operations"].includes(field)) return <Lightbulb size={16} />;
  if (field === "observations") return <ListChecks size={16} />;
  return <Info size={16} />;
}
