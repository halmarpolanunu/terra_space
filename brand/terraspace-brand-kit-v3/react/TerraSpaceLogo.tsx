import React from "react";

export type TerraSpaceLogoVariant =
  | "horizontal"
  | "compact"
  | "stacked"
  | "symbol"
  | "symbol-compact"
  | "micro";

export type TerraSpaceLogoTheme = "dark" | "light";

interface TerraSpaceLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  variant?: TerraSpaceLogoVariant;
  theme?: TerraSpaceLogoTheme;
  assetBase?: string;
}

export function TerraSpaceLogo({
  variant = "compact",
  theme = "dark",
  assetBase = "/brand",
  alt = "TerraSpace",
  ...props
}: TerraSpaceLogoProps) {
  const filename = `terraspace-${variant}-${theme}.svg`;
  return <img src={`${assetBase}/${filename}`} alt={alt} {...props} />;
}
