import { PujaCard } from '@/components/puja-card';
import { getPujas } from '@/lib/server-api';

export const revalidate = 60;

export default async function PujaListingPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const pujas = await getPujas({
    locationType: searchParams.locationType,
    cityId: searchParams.cityId,
    templeId: searchParams.templeId,
    deityId: searchParams.deityId,
    festivalId: searchParams.festivalId,
    benefitId: searchParams.benefitId,
    q: searchParams.q,
  }).catch(() => []);
  const atHome = searchParams.locationType === 'HOME';

  return (
    <div>
      {/* Header Banner */}
      <section className="border-b bg-gradient-to-b from-accent-soft to-transparent" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
        <div className="app-container py-12 sm:py-16">
          <div className="flex flex-col items-center text-center">
            <span className="section-pill">Puja Services</span>
            {atHome ? (
              <h1 className="section-heading mt-3">
                Pujas at <span className="text-accent">Home</span>
              </h1>
            ) : (
              <h1 className="section-heading mt-3">
                Book <span className="text-accent">Puja</span>
              </h1>
            )}
            <div className="section-bar mx-auto" aria-hidden="true" />
            <p className="section-subheading mx-auto">
              Explore our ritual categories, package tiers, and traditional inclusions. {pujas.length} pujas available.
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <section className="section--compact">
        <div className="app-container">
          {pujas.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pujas.map((p) => (
                <PujaCard key={p.id} puja={p} />
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="text-4xl">🕉️</div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                No pujas match your filters yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
