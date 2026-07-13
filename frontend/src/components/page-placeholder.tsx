type PagePlaceholderProps = {
  title: string;
  description: string;
  phase: string;
};

export function PagePlaceholder({ title, description, phase }: PagePlaceholderProps) {
  return (
    <section aria-labelledby="page-title" className="page-placeholder">
      <p className="eyebrow">{phase}</p>
      <h1 id="page-title">{title}</h1>
      <p>{description}</p>
    </section>
  );
}
