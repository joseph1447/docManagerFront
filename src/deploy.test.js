import { it, expect } from "vitest";
import vercelConfig from "../vercel.json";

it("vercel.json sends every route to the SPA (opening /admin/xml-to-excel directly must not 404)", () => {
  expect(vercelConfig.rewrites).toContainEqual({ source: "/(.*)", destination: "/index.html" });
});
