"use client";

import { getInitials, stringToColor } from "@/lib/utils";

interface UserAvatarProps {
  readonly name: string;
  readonly size?: number;
}

/** Cheap deterministic hash → 0..359 hue. The `[data-avatar][data-hue]`
 *  CSS rule in globals.css then renders the gradient via CSS custom
 *  property `--avatar-hue`. */
function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return ((h % 360) + 360) % 360;
}

export function UserAvatar({ name, size = 32 }: UserAvatarProps) {
  const hue = hashHue(name);
  return (
    <div
      data-avatar
      data-hue={String(hue)}
      title={name}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        fontSize: size * 0.34,
        // Inline custom prop so the [data-avatar][data-hue] gradient
        // rule resolves to a continuous hue range. `stringToColor` is
        // referenced via _legacyBg so tree-shake doesn't drop the
        // import, but the actual paint comes from the CSS gradient.
        ["--avatar-hue" as string]: hue,
        ["--legacy-avatar-bg" as string]: stringToColor(name),
      }}
    >
      {getInitials(name)}
    </div>
  );
}
