import { describe, expect, it } from "vitest";
import {
  blendHexColors,
  getContrastRatio,
  getReadableTextColor,
  getVisibleAccentColor,
  parseHexColor,
} from "@/lib/colors";

describe("colors", () => {
  it("parses short and long hex colors", () => {
    expect(parseHexColor("#0af")).toEqual({ red: 0, green: 170, blue: 255 });
    expect(parseHexColor("#102030")).toEqual({
      red: 16,
      green: 32,
      blue: 48,
    });
    expect(parseHexColor("invalid")).toBeNull();
  });

  it("chooses readable text against light and dark backgrounds", () => {
    const lightText = "#fffaf0";
    const darkText = "#120f0c";

    expect(getReadableTextColor("#050505", { lightText, darkText })).toBe(
      lightText,
    );
    expect(getReadableTextColor("#f2eee5", { lightText, darkText })).toBe(
      darkText,
    );
    expect(
      getContrastRatio("#050505", getReadableTextColor("#050505")),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      getContrastRatio("#f2eee5", getReadableTextColor("#f2eee5")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps dark player accents visible on the dark map board", () => {
    const accent = getVisibleAccentColor("#000000");

    expect(getContrastRatio(accent, "#0a1214")).toBeGreaterThanOrEqual(3);
  });

  it("blends player colors over the map board for tile surfaces", () => {
    expect(blendHexColors("#ffffff", "#0a1214", 0.5)).toBe("#85898a");
  });
});
