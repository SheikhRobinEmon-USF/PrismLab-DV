import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
const config = [...next, ...ts, { ignores: [".next/**", "out/**", "next-env.d.ts", "public/engine/**", "_next/**", "engine/**", "offline.js", "playwright-report/**", "test-results/**"] }];
export default config;
