import Link from 'next/link';

const EXPLORE = [
  { href: '/puja', label: 'Book Puja' },
  { href: '/teerth-puja', label: 'Teerth Puja' },
  { href: '/temples', label: 'Famous Temples' },
  { href: '/products', label: 'Puja Products' },
  { href: '/deity', label: 'By Deity' },
];

const COMPANY = [
  { href: '/faq', label: 'FAQ' },
  { href: '/festival', label: 'Festivals' },
  { href: '/benefit', label: 'By Benefit' },
];

const PARTNERS = [
  { href: '/admin/login', label: 'Super Admin' },
  { href: '/pandit/login', label: 'Pandit Login' },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t bg-[#0b0f19] text-white/70" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
      <div className="app-container grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        {/* Brand information */}
        <div>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark.png" alt="Poozari diya mark" className="h-10 w-10 rounded-full shadow-md" />
            <span className="font-display text-lg font-black uppercase tracking-widest text-white">
              poozari
            </span>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-white/50">
            Book authentic Vedic puja with verified pandits. We coordinate the entire ritual process, sourcing premium samagri, organizing video proof, and delivering blessed prasad directly to your doorstep.
          </p>
          <p className="mt-5 text-xs font-semibold text-saffron-400">
            <span className="mr-2 text-emerald-400">●</span>
            Guided support on call &amp; WhatsApp
          </p>
        </div>

        {/* Explore Links */}
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-widest text-white">
            Explore
          </h4>
          <ul className="mt-5 space-y-3">
            {EXPLORE.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-xs transition-colors duration-300 hover:text-saffron-400"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company Links */}
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-widest text-white">
            Company
          </h4>
          <ul className="mt-5 space-y-3">
            {COMPANY.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-xs transition-colors duration-300 hover:text-saffron-400"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Partners Links */}
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-widest text-white">
            Partners
          </h4>
          <ul className="mt-5 space-y-3">
            {PARTNERS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-xs transition-colors duration-300 hover:text-saffron-400"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t py-6 text-2xs uppercase tracking-wider text-white/30"
        style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <div className="app-container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span>© {new Date().getFullYear()} poozari.com — Your Faith, Our Service. Devotion &amp; Quality</span>
          <span className="font-bold text-saffron-500">Om Namah Shivaya 🙏</span>
        </div>
      </div>
    </footer>
  );
}
