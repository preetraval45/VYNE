import { Mark, mergeAttributes, markPasteRule, markInputRule } from "@tiptap/core";

// CrossLink — TipTap mark that turns `[[KEY-NUM]]` into a link to
// /projects?task=KEY-NUM. Two routes:
//  • InputRule: as the user types `[[VYN-42]]` followed by space/enter,
//    the substring becomes a clickable link in-place.
//  • PasteRule: same conversion when pasting text containing the
//    pattern. Both delegate to the same regex.
//
// Why a Mark, not a Node? Marks are inline + composable with bold/italic
// and play well with collaborative cursors. Plain `<a>` Mark wouldn't
// know about the cross-link semantics; this preserves the original
// `[[KEY-NUM]]` text in the doc JSON so a downstream renderer can
// re-resolve to a different URL if the routing changes.

const PATTERN = /\[\[([A-Z]{2,8}-\d{1,6})\]\]/g;
// InputRule needs the trigger char (space/enter) at the end so we capture
// the whole pattern + a single trailing whitespace as the consumed text.
const INPUT_PATTERN = /\[\[([A-Z]{2,8}-\d{1,6})\]\]\s$/;

export const CrossLink = Mark.create<{
  hrefTemplate?: string;
}>({
  name: "crossLink",

  addOptions() {
    return {
      hrefTemplate: "/projects?task=:key",
    };
  },

  addAttributes() {
    return {
      key: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-key"),
        renderHTML: (attrs) => ({ "data-key": attrs.key as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-cross-link]" }];
  },

  renderHTML({ HTMLAttributes, mark }) {
    const key = (mark.attrs.key as string) || "";
    const href = (this.options.hrefTemplate ?? "").replace(":key", encodeURIComponent(key));
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        href,
        "data-cross-link": "true",
        target: "_self",
        style: "color: var(--vyne-accent, #5B5BD6); text-decoration: underline; cursor: pointer;",
      }),
      0,
    ];
  },

  addInputRules() {
    return [
      markInputRule({
        find: INPUT_PATTERN,
        type: this.type,
        getAttributes: (match) => ({ key: match[1] }),
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: PATTERN,
        type: this.type,
        getAttributes: (match) => ({ key: match[1] }),
      }),
    ];
  },
});
