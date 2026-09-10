const FAQS = [
  {
    q: 'Do I need to arrange the samagri myself?',
    a: 'No. For any puja you book through poozari, we coordinate the complete premium puja samagri along with the verified pandit. You only share your sankalp details — we handle the rest.',
  },
  {
    q: 'How does puja booking work?',
    a: 'Choose a puja, select a package, add your sankalp details and complete secure payment. The assigned pandit performs the ritual and shares completion proof, including a recorded video.',
  },
  {
    q: 'Can I book a puja for a specific date and muhurat?',
    a: 'Yes. During checkout you can share your preferred date and time. Our team confirms pandit availability and the final schedule.',
  },
  {
    q: 'Are pandits on poozari verified?',
    a: 'Yes. Every pandit is screened for ritual knowledge and service quality before being assigned to bookings.',
  },
  {
    q: 'What is included in puja packages?',
    a: 'Package inclusions vary by ritual and can include samagri, sankalp process, vidhi details, and video proof. Each package card lists exact inclusions.',
  },
  {
    q: 'Can devotees outside India book puja services?',
    a: 'Yes. Devotees in India and abroad can book rituals, share sankalp details digitally, and watch the recorded pooja video online.',
  },
];

export default function FaqPage() {
  return (
    <div>
      {/* Header Banner */}
      <section className="border-b bg-gradient-to-b from-accent-soft to-transparent" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
        <div className="app-container py-12 sm:py-16">
          <div className="flex flex-col items-center text-center">
            <span className="section-pill">Help Center</span>
            <h1 className="section-heading mt-3">
              Frequently Asked <span className="text-accent">Questions</span>
            </h1>
            <div className="section-bar mx-auto" aria-hidden="true" />
            <p className="section-subheading mx-auto">
              Common questions about coordinating Vedic and temple pujas online.
            </p>
          </div>
        </div>
      </section>

      <section className="section--compact">
        <div className="mx-auto max-w-3xl px-4">
          <div className="space-y-4">
            {FAQS.map((f) => (
              <details key={f.q} className="card group overflow-hidden bg-white">
                <summary className="flex cursor-pointer items-center justify-between p-5 font-display text-sm font-bold text-foreground transition-colors duration-300 hover:text-accent">
                  <span className="pr-4">{f.q}</span>
                  <span className="shrink-0 text-lg transition-transform duration-300 group-open:rotate-45"
                        style={{ color: 'hsl(var(--muted-foreground))' }}>
                    +
                  </span>
                </summary>
                <div className="border-t px-5 pb-5 pt-3" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {f.a}
                  </p>
                </div>
              </details>
            ))}
          </div>

          {/* Support CTA card */}
          <div className="mt-12 card p-8 text-center bg-white">
            <div className="text-3xl">🙏</div>
            <h3 className="font-display text-lg font-bold mt-4" style={{ color: 'hsl(var(--foreground))' }}>
              Still have questions?
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Contact our booking desk directly for support with custom packages, muhurat schedule inquiries, or scriptural questions.
            </p>
            <p className="mt-4 text-2xs font-extrabold uppercase tracking-widest text-accent">
              <span className="mr-1.5 text-emerald-500">●</span>
              Helpline Support Active
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
