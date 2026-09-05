'use client';

import { formatInr, type PujaPackage } from '@poozari/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function PackagePicker({ slug, packages }: { slug: string; packages: PujaPackage[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(packages[0]?.id ?? '');

  return (
    <div className="elevated-card saffron-glow p-6 bg-white">
      <h3 className="font-display text-base font-extrabold uppercase tracking-wider text-foreground">
        Choose a package
      </h3>
      <div className="mt-4 space-y-3.5">
        {packages.map((p) => {
          const active = selected === p.id;
          return (
            <label
              key={p.id}
              className={`block cursor-pointer rounded-2xl border-2 p-4 transition-all duration-300 ${
                active
                  ? 'border-accent bg-accent-soft shadow-sm'
                  : 'border-transparent bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-foreground">
                  <input
                    type="radio"
                    name="package"
                    checked={active}
                    onChange={() => setSelected(p.id)}
                    className="h-4 w-4 accent-accent"
                  />
                  {p.name}
                </span>
                <span className="text-base font-black text-accent">{formatInr(p.priceInr)}</span>
              </div>
              {p.inclusions.length ? (
                <ul className="ml-7 mt-3 space-y-1.5">
                  {p.inclusions.map((i) => (
                    <li key={i} className="flex items-start gap-2 text-2xs font-semibold text-muted-foreground">
                      <span className="mt-0.5 text-emerald-600">✓</span>
                      {i}
                    </li>
                  ))}
                </ul>
              ) : null}
            </label>
          );
        })}
      </div>
      <button
        className="btn-primary mt-6 w-full text-2xs uppercase tracking-widest"
        disabled={!selected}
        onClick={() => router.push(`/book/${slug}?packageId=${selected}`)}
      >
        Book Now
      </button>
      <p className="mt-4 text-center text-3xs font-bold uppercase tracking-widest text-muted-foreground">
        <span className="mr-1.5 text-emerald-500">●</span>
        Support on Call &amp; WhatsApp
      </p>
    </div>
  );
}
