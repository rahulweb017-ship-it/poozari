/**
 * The banner every content page opens with, matching the FAQ/listing pages'
 * pill → heading → rule → subheading rhythm.
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  align?: 'center' | 'left';
}) {
  const centered = align === 'center';
  return (
    <section
      className="border-b bg-gradient-to-b from-accent-soft to-transparent"
      style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
    >
      <div className="app-container py-12 sm:py-16">
        <div className={`flex flex-col ${centered ? 'items-center text-center' : 'items-start'}`}>
          <span className="section-pill">{eyebrow}</span>
          <h1 className="section-heading mt-3">{title}</h1>
          <div className={`section-bar ${centered ? 'mx-auto' : ''}`} aria-hidden="true" />
          {lead ? (
            <p className={`section-subheading ${centered ? 'mx-auto' : 'max-w-3xl'}`}>{lead}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
