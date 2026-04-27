"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, Lock, Plus, Search, ChevronDown } from "lucide-react";
import type { MsgChannel, MsgDM } from "@/lib/api/client";
import { useDebounce } from "@/hooks/useDebounce";
import { UserAvatar } from "./UserAvatar";
import { PresenceDot } from "./PresenceDot";

interface ChannelSidebarProps {
  readonly channels: MsgChannel[];
  readonly dms: MsgDM[];
  readonly selectedId: string | null;
  readonly isDM: boolean;
  readonly onSelectChannel: (id: string, dm: boolean) => void;
  readonly onCreateChannel: () => void;
}

export function ChannelSidebar({
  channels,
  dms,
  selectedId,
  isDM,
  onSelectChannel,
  onCreateChannel,
}: ChannelSidebarProps) {
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );
  const filteredDMs = dms.filter((d) =>
    d.participant.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  return (
    <aside
      className="chat-channel-sidebar"
      style={{
        width: 240,
        minWidth: 240,
        borderRight: "1px solid var(--content-border)",
        background: "var(--content-secondary)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 14px 10px",
          borderBottom: "1px solid var(--content-border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Messages
          </span>
          <button
            onClick={onCreateChannel}
            title="New channel"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#EEEEF8";
              (e.currentTarget as HTMLElement).style.color = "#06B6D4";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color =
                "var(--text-tertiary)";
            }}
          >
            <Plus size={14} />
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
            borderRadius: 8,
            padding: "5px 10px",
          }}
        >
          <Search
            size={12}
            style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 12,
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {/* Channel + DM lists */}
      <div
        className="sidebar-scroll"
        style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}
      >
        {/* Channels */}
        <div style={{ marginBottom: 4 }}>
          <button
            onClick={() => setChannelsOpen(!channelsOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 8px",
              width: "100%",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-tertiary)",
            }}
          >
            <ChevronDown
              size={12}
              style={{
                transform: channelsOpen ? "rotate(0)" : "rotate(-90deg)",
                transition: "transform 0.2s",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Channels
            </span>
          </button>

          <AnimatePresence>
            {channelsOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                style={{ overflow: "hidden" }}
              >
                {filteredChannels.map((ch) => {
                  const isActive = selectedId === ch.id && !isDM;
                  let chColor = "var(--text-secondary)";
                  if (isActive) chColor = "var(--vyne-purple)";
                  else if (ch.unreadCount) chColor = "var(--text-primary)";
                  return (
                    <button
                      key={ch.id}
                      onClick={() => onSelectChannel(ch.id, false)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "4px 8px",
                        borderRadius: 7,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        background: isActive ? "#EEF0FF" : "transparent",
                        color: chColor,
                        fontWeight: ch.unreadCount ? 600 : 400,
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--content-secondary)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                      }}
                    >
                      {ch.isPrivate ? (
                        <Lock
                          size={12}
                          style={{ flexShrink: 0, opacity: 0.6 }}
                        />
                      ) : (
                        <Hash
                          size={12}
                          style={{ flexShrink: 0, opacity: isActive ? 1 : 0.5 }}
                        />
                      )}
                      <span
                        style={{
                          flex: 1,
                          textAlign: "left",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ch.name}
                      </span>
                      {(ch.unreadCount ?? 0) > 0 && (
                        <span
                          style={{
                            background: isActive
                              ? "#06B6D4"
                              : "var(--content-border)",
                            color: isActive ? "#fff" : "var(--text-secondary)",
                            borderRadius: 10,
                            padding: "0 5px",
                            fontSize: 10,
                            fontWeight: 600,
                            minWidth: 18,
                            textAlign: "center",
                          }}
                        >
                          {ch.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  onClick={onCreateChannel}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "4px 8px",
                    borderRadius: 7,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    background: "transparent",
                    color: "var(--text-tertiary)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--content-secondary)";
                    (e.currentTarget as HTMLElement).style.color = "#06B6D4";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--text-tertiary)";
                  }}
                >
                  <Plus size={12} /> Add channel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Direct Messages */}
        <div>
          <button
            onClick={() => setDmsOpen(!dmsOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 8px",
              width: "100%",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-tertiary)",
            }}
          >
            <ChevronDown
              size={12}
              style={{
                transform: dmsOpen ? "rotate(0)" : "rotate(-90deg)",
                transition: "transform 0.2s",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Direct Messages
            </span>
          </button>

          <AnimatePresence>
            {dmsOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                style={{ overflow: "hidden" }}
              >
                {filteredDMs.map((dm) => {
                  const isActive = selectedId === dm.id && isDM;
                  let dmColor = "var(--text-secondary)";
                  if (isActive) dmColor = "var(--vyne-purple)";
                  else if (dm.unreadCount) dmColor = "var(--text-primary)";
                  return (
                    <button
                      key={dm.id}
                      onClick={() => onSelectChannel(dm.id, true)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "4px 8px",
                        borderRadius: 7,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        background: isActive ? "#EEF0FF" : "transparent",
                        color: dmColor,
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--content-secondary)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                      }}
                    >
                      <span style={{ position: "relative", flexShrink: 0 }}>
                        <UserAvatar name={dm.participant.name} size={22} />
                        <span
                          style={{
                            position: "absolute",
                            bottom: -1,
                            right: -1,
                          }}
                        >
                          <PresenceDot status={dm.participant.presence} />
                        </span>
                      </span>
                      <span
                        style={{
                          flex: 1,
                          textAlign: "left",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: dm.unreadCount ? 600 : 400,
                        }}
                      >
                        {dm.participant.name}
                      </span>
                      {(dm.unreadCount ?? 0) > 0 && (
                        <span
                          style={{
                            background: "#06B6D4",
                            color: "#fff",
                            borderRadius: 10,
                            padding: "0 5px",
                            fontSize: 10,
                            fontWeight: 600,
                            minWidth: 18,
                            textAlign: "center",
                          }}
                        >
                          {dm.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "4px 8px",
                    borderRadius: 7,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    background: "transparent",
                    color: "var(--text-tertiary)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--content-secondary)";
                    (e.currentTarget as HTMLElement).style.color = "#06B6D4";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--text-tertiary)";
                  }}
                >
                  <Plus size={12} /> New message
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
