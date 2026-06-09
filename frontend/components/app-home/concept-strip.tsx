const CONCEPTS = ["Discovery", "Routing", "Coordination", "Observability"] as const;

export function ConceptStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-clozr-secondary">
      {CONCEPTS.map((word, i) => (
        <span key={word} className="flex items-center gap-6">
          <span className="tracking-wide">{word}</span>
          {i < CONCEPTS.length - 1 ? (
            <span
              className="hidden sm:inline h-px w-8 bg-clozr-border"
              aria-hidden
            />
          ) : null}
        </span>
      ))}
    </div>
  );
}
