"use client";

import { getInitials, stringToColor } from "@/lib/utils";

interface UserAvatarProps {
  readonly name: string;
  readonly size?: number;
}

export function UserAvatar({ name, size = 32 }: UserAvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: stringToColor(name),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.34,
        fontWeight: 600,
        color: "#fff",
      }}
    >
      {getInitials(name)}
    </div>
  );
}
