/** @type {import('next').NextConfig} */
const nextConfig = {
  // WordPress serves every public URL with a trailing slash. The migration is
  // only safe if the new frontend answers on exactly the same paths, so this
  // is not a style preference — it is URL parity.
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  eslint: { dirs: ["app", "components", "lib"] },
};
export default nextConfig;
