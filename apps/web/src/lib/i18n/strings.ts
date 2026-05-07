"use client";

import { useI18n, type LocaleId } from "@/lib/stores/i18n";

/**
 * Lightweight string bag — covers the surfaces the user-facing UI
 * actually shows in non-English mode (toasts, save / cancel, common
 * empty-states). For richer copy, swap to `next-intl` or
 * `react-i18next` and reuse the locale id from `useI18n`.
 *
 * Falls back to the English string when a key is missing in the
 * active locale, so partial translations never crash.
 */

type StringsByKey = Record<string, string>;

const STRINGS: Record<LocaleId, StringsByKey> = {
  "en-US": {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirm: "Confirm",
    saved: "Saved",
    deleted: "Deleted",
    archived: "Archived",
    "search.placeholder": "Search…",
    "table.empty": "Nothing to show yet",
    "form.required": "Required",
    "auth.signIn": "Sign in",
    "auth.signOut": "Sign out",
    today: "Today",
    yesterday: "Yesterday",
    tomorrow: "Tomorrow",
  },
  "en-GB": {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    "table.empty": "Nothing to show yet",
  },
  "es-ES": {
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    confirm: "Confirmar",
    saved: "Guardado",
    deleted: "Eliminado",
    archived: "Archivado",
    "search.placeholder": "Buscar…",
    "table.empty": "Nada que mostrar todavía",
    "form.required": "Obligatorio",
    "auth.signIn": "Iniciar sesión",
    "auth.signOut": "Cerrar sesión",
    today: "Hoy",
    yesterday: "Ayer",
    tomorrow: "Mañana",
  },
  "fr-FR": {
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    confirm: "Confirmer",
    saved: "Enregistré",
    deleted: "Supprimé",
    archived: "Archivé",
    "search.placeholder": "Rechercher…",
    "table.empty": "Rien à afficher pour l'instant",
    "form.required": "Obligatoire",
    "auth.signIn": "Se connecter",
    "auth.signOut": "Se déconnecter",
    today: "Aujourd'hui",
    yesterday: "Hier",
    tomorrow: "Demain",
  },
  "de-DE": {
    save: "Speichern",
    cancel: "Abbrechen",
    delete: "Löschen",
    confirm: "Bestätigen",
    saved: "Gespeichert",
    deleted: "Gelöscht",
    archived: "Archiviert",
    "search.placeholder": "Suchen…",
    "table.empty": "Noch nichts anzuzeigen",
    "form.required": "Erforderlich",
    "auth.signIn": "Anmelden",
    "auth.signOut": "Abmelden",
    today: "Heute",
    yesterday: "Gestern",
    tomorrow: "Morgen",
  },
  "it-IT": {
    save: "Salva",
    cancel: "Annulla",
    delete: "Elimina",
    "search.placeholder": "Cerca…",
    "table.empty": "Niente da mostrare",
    today: "Oggi",
    yesterday: "Ieri",
    tomorrow: "Domani",
  },
  "pt-BR": {
    save: "Salvar",
    cancel: "Cancelar",
    delete: "Excluir",
    "search.placeholder": "Pesquisar…",
    "table.empty": "Nada para mostrar",
    today: "Hoje",
    yesterday: "Ontem",
    tomorrow: "Amanhã",
  },
  "ja-JP": {
    save: "保存",
    cancel: "キャンセル",
    delete: "削除",
    "search.placeholder": "検索…",
    "table.empty": "表示する項目はありません",
    today: "今日",
    yesterday: "昨日",
    tomorrow: "明日",
  },
  "zh-CN": {
    save: "保存",
    cancel: "取消",
    delete: "删除",
    "search.placeholder": "搜索…",
    "table.empty": "暂无内容",
    today: "今天",
    yesterday: "昨天",
    tomorrow: "明天",
  },
  "ar-SA": {
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    "search.placeholder": "بحث…",
    "table.empty": "لا يوجد شيء للعرض",
    today: "اليوم",
    yesterday: "الأمس",
    tomorrow: "غدًا",
  },
  "he-IL": {
    save: "שמירה",
    cancel: "ביטול",
    delete: "מחיקה",
    "search.placeholder": "חיפוש…",
    today: "היום",
    yesterday: "אתמול",
    tomorrow: "מחר",
  },
  "hi-IN": {
    save: "सहेजें",
    cancel: "रद्द करें",
    delete: "हटाएं",
    "search.placeholder": "खोजें…",
    today: "आज",
    yesterday: "कल",
    tomorrow: "कल",
  },
};

/** Look up a string for the active locale. Falls back to en-US. */
export function t(key: string, fallback?: string): string {
  const locale = useI18n.getState().locale;
  return (
    STRINGS[locale]?.[key] ??
    STRINGS["en-US"][key] ??
    fallback ??
    key
  );
}

/** Hook variant — re-renders when the locale changes. */
export function useT(): (key: string, fallback?: string) => string {
  const locale = useI18n((s) => s.locale);
  return (key, fallback) =>
    STRINGS[locale]?.[key] ??
    STRINGS["en-US"][key] ??
    fallback ??
    key;
}
