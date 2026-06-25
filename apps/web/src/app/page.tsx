import { VOYAGE_APP_NAME } from "@voyage/shared";
import { getBootstrapSections } from "../lib/bootstrap";

export default function HomePage() {
  const sections = getBootstrapSections();

  return (
    <main className="shell">
      <p className="eyebrow">v0.1 foundation</p>
      <h1 className="title">{VOYAGE_APP_NAME}</h1>
      <p className="summary">
        Bootstrap workspace for a modular travel collaboration product. This
        first screen is intentionally small while the API, database, and domain
        boundaries are established.
      </p>
      <section className="grid" aria-label="Bootstrap areas">
        {sections.map((section) => (
          <article className="panel" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
