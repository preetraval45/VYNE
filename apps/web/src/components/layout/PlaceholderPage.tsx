"use client";

import { motion } from "framer-motion";

interface PlaceholderPageProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  module: string;
}

export function PlaceholderPage({
  icon,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header
        className="px-6 py-4 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--content-border)",
          background: "#FFFFFF",
        }}
      >
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h1>
      </header>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 mx-auto"
            style={{ background: "rgba(6, 182, 212,0.08)" }}
          >
            {icon}
          </div>
          <h2
            className="text-xl font-semibold mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            {title} — Coming Soon
          </h2>
          <p
            className="text-sm max-w-sm mx-auto"
            style={{ color: "var(--text-tertiary)", lineHeight: "1.6" }}
          >
            {description}
          </p>

          <div
            className="mt-8 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{
              background: "rgba(6, 182, 212,0.08)",
              border: "1px solid rgba(6, 182, 212,0.15)",
              color: "#06B6D4",
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "#06B6D4" }}
            />
            In development
          </div>
        </motion.div>
      </div>
    </div>
  );
}
