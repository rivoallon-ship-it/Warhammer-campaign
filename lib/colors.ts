type RgbColor = {
  red: number;
  green: number;
  blue: number;
};

const defaultLightText = "#fffaf0";
const defaultDarkText = "#120f0c";

function clampByte(value: number) {
  return Math.min(Math.max(Math.round(value), 0), 255);
}

function toHexByte(value: number) {
  return clampByte(value).toString(16).padStart(2, "0");
}

function toHexColor(color: RgbColor) {
  return `#${toHexByte(color.red)}${toHexByte(color.green)}${toHexByte(color.blue)}`;
}

export function parseHexColor(value: string | null | undefined): RgbColor | null {
  const normalized = value?.trim().replace(/^#/, "");

  if (!normalized) return null;

  if (/^[0-9a-f]{3}$/i.test(normalized)) {
    const [red, green, blue] = normalized.split("");

    return {
      red: Number.parseInt(`${red}${red}`, 16),
      green: Number.parseInt(`${green}${green}`, 16),
      blue: Number.parseInt(`${blue}${blue}`, 16),
    };
  }

  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;

  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function getLinearChannel(value: number) {
  const channel = value / 255;

  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

export function getRelativeLuminance(value: string) {
  const color = parseHexColor(value);

  if (!color) return 0;

  return (
    getLinearChannel(color.red) * 0.2126 +
    getLinearChannel(color.green) * 0.7152 +
    getLinearChannel(color.blue) * 0.0722
  );
}

export function getContrastRatio(left: string, right: string) {
  const leftLuminance = getRelativeLuminance(left);
  const rightLuminance = getRelativeLuminance(right);
  const lighter = Math.max(leftLuminance, rightLuminance);
  const darker = Math.min(leftLuminance, rightLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export function mixHexColors(from: string, to: string, amount: number) {
  const fromColor = parseHexColor(from);
  const toColor = parseHexColor(to);

  if (!fromColor || !toColor) return from;

  const ratio = Math.min(Math.max(amount, 0), 1);

  return toHexColor({
    red: fromColor.red + (toColor.red - fromColor.red) * ratio,
    green: fromColor.green + (toColor.green - fromColor.green) * ratio,
    blue: fromColor.blue + (toColor.blue - fromColor.blue) * ratio,
  });
}

export function blendHexColors(
  foreground: string,
  background: string,
  foregroundAlpha: number,
) {
  return mixHexColors(background, foreground, foregroundAlpha);
}

export function getReadableTextColor(
  background: string,
  {
    lightText = defaultLightText,
    darkText = defaultDarkText,
  }: {
    lightText?: string;
    darkText?: string;
  } = {},
) {
  return getContrastRatio(background, lightText) >=
    getContrastRatio(background, darkText)
    ? lightText
    : darkText;
}

export function getVisibleAccentColor(
  color: string,
  {
    mapBackground = "#0a1214",
    minimumContrast = 3,
  }: {
    mapBackground?: string;
    minimumContrast?: number;
  } = {},
) {
  if (getContrastRatio(color, mapBackground) >= minimumContrast) return color;

  const lightened = mixHexColors(color, "#fff4d1", 0.58);

  if (getContrastRatio(lightened, mapBackground) >= minimumContrast) {
    return lightened;
  }

  return mixHexColors(color, "#ffffff", 0.72);
}
