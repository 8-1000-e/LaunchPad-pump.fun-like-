import Link from "next/link";

const PRODUCT_LINKS = [
  { label: "Tokens", href: "/" },
  { label: "Create Token", href: "/create" },
  { label: "Leaderboard", href: "/leaderboard" },
];

const RESOURCE_LINKS = [
  { label: "Docs", href: "#" },
  { label: "FAQ", href: "#" },
  { label: "API", href: "#" },
];

const COMMUNITY_LINKS = [
  { label: "Twitter", href: "#" },
  { label: "Discord", href: "#" },
  { label: "GitHub", href: "#" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-bg/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 select-none">
              <div
                className="relative h-5 w-5"
                style={{
                  filter: "drop-shadow(0 0 6px rgba(201,168,76,0.4))",
                }}
              >
                <div className="absolute inset-0 rotate-45 bg-brand" />
              </div>
              <span className="font-display text-[15px] font-bold tracking-tight text-text-1">
                LAUNCH
              </span>
            </Link>
            <p className="mt-3 max-w-[200px] text-[12px] leading-relaxed text-text-3">
              The fastest way to create and trade tokens on Solana.
            </p>

            {/* Solana badge */}
            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1">
              <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195]" />
              <span className="text-[10px] font-medium tracking-wide text-text-3">
                Built on Solana
              </span>
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-text-3">
              Product
            </p>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-text-2 transition-colors hover:text-text-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-text-3">
              Resources
            </p>
            <ul className="mt-4 space-y-2.5">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-text-2 transition-colors hover:text-text-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-text-3">
              Community
            </p>
            <ul className="mt-4 space-y-2.5">
              {COMMUNITY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-text-2 transition-colors hover:text-text-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-[11px] text-text-3">
            &copy; {new Date().getFullYear()} LAUNCH. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="#"
              className="text-[11px] text-text-3 transition-colors hover:text-text-2"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-[11px] text-text-3 transition-colors hover:text-text-2"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
