import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Disable the service worker in development for a smoother DX.
  disable: process.env.NODE_ENV === "development",
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Internal packages are shipped as TypeScript source; Next compiles them.
  transpilePackages: [
    "@lifeos/contracts",
    "@lifeos/core",
    "@lifeos/db",
    "@lifeos/api",
  ],
  // Ensure server-only data-layer deps are never bundled into the client.
  serverExternalPackages: ["postgres"],
  webpack: (config) => {
    // Internal packages use ESM-style ".js" specifiers in their TypeScript
    // source (required by NodeNext/Bundler semantics). Teach webpack to resolve
    // those specifiers back to the ".ts"/".tsx" source files.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default withSerwist(nextConfig);
