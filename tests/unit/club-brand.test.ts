import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClubIdentity } from "../../src/components/club-identity";
import { clubBrand } from "../../src/lib/club-brand";

describe("Bilíkova club identity", () => {
  it("keeps the supplied logo's intrinsic dimensions and local asset", () => {
    const png = readFileSync(
      new URL("../../public/brand/bilikova-logo.png", import.meta.url),
    );
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([145, 200]);
  });

  it("renders the full Slovak club name and bundled logo by default", () => {
    const html = renderToStaticMarkup(createElement(ClubIdentity));
    expect(html.replace(/<[^>]*>/g, "")).toContain(clubBrand.name);
    expect(html).toContain(clubBrand.logo);
    expect(html).toContain('width="145"');
    expect(html).toContain('height="200"');
    expect(html).toContain('alt=""');
  });

  it("preserves the configurable club identity without image distortion", () => {
    const html = renderToStaticMarkup(
      createElement(ClubIdentity, {
        name: "Názov upravený správcom",
        logo: "https://example.com/club.png",
      }),
    );
    expect(html).toContain("Názov upravený správcom");
    expect(html).toContain("https://example.com/club.png");
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).not.toContain(clubBrand.logo);
  });

  it("uses the supplied logo when no external logo is configured", () => {
    expect(
      renderToStaticMarkup(createElement(ClubIdentity, { logo: null })),
    ).toContain(clubBrand.logo);
  });
});
