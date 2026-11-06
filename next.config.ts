import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  serverExternalPackages: ["pino", "pg-boss", "@prisma/client", "@prisma/adapter-pg", "pg"],
  headers: () => Promise.resolve([{ source: "/:path*", headers: securityHeaders }]),
  // Profil public /@handle (REQ-PROF-1) : un dossier « @… » serait un slot parallèle pour Next, d'où la réécriture.
  rewrites: () =>
    Promise.resolve([
      { source: "/@:handle([a-zA-Z0-9_]{3,30})", destination: "/membres/:handle" },
      { source: "/@:handle([a-zA-Z0-9_]{3,30})/:section(abonnes|abonnements)", destination: "/membres/:handle/:section" },
    ]),
};

export default withNextIntl(nextConfig);
