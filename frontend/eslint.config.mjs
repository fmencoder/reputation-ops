import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/*
 * Flat config. eslint-config-next ships flat arrays in Next 16, so the
 * eslintrc compatibility shim is neither needed nor able to load them.
 */
export default [
  ...coreWebVitals,
  ...typescript,
  { ignores: [".next/**", "node_modules/**", "scripts/**", "content/**"] },
];
