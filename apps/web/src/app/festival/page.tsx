import { EntityGrid } from '@/components/entity-grid';
import { getFestivals } from '@/lib/server-api';

export const revalidate = 60;

export default async function FestivalPage() {
  const festivals = await getFestivals().catch(() => []);
  return (
    <div>
      {/* Header Banner */}
      <section className="border-b bg-gradient-to-b from-accent-soft to-transparent" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
        <div className="app-container py-12 sm:py-16">
          <div className="flex flex-col items-center text-center">
            <span className="section-pill">Festivals</span>
            <h1 className="section-heading mt-3">
              Puja by <span className="text-accent">Festival</span>
            </h1>
            <div className="section-bar mx-auto" aria-hidden="true" />
            <p className="section-subheading mx-auto">
              Find ceremonies and listings timed to upcoming major festivals.
            </p>
          </div>
        </div>
      </section>
      <section className="section--compact">
        <div className="app-container">
          <EntityGrid items={festivals} queryKey="festivalId" emoji="🎉" />
        </div>
      </section>
    </div>
  );
}
