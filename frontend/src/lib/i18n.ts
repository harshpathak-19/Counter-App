import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, useCallback, ReactNode, createElement } from "react";

export type Lang = "en" | "hi";

const KEY = "naamsmaran.lang";

const dict = {
  en: {
    app_name: "NaamSmaran",
    tab_jaap: "Jaap",
    tab_tracker: "Tracker",
    tab_insights: "Insights",
    tab_settings: "Settings",
    todays_count: "Today",
    lifetime: "Lifetime",
    streak: "Streak",
    days: "days",
    mala: "Mala",
    mala_complete: "Mala Complete! 108 chants",
    tap_to_count: "Tap to chant",
    reset: "Reset",
    add_custom: "Add Custom",
    add_custom_mantra: "Add Custom Mantra",
    name: "Name",
    mantra: "Mantra",
    save: "Save",
    cancel: "Cancel",
    brahmacharya_title: "Brahmacharya Tracker",
    brahmacharya_sub: "Daily discipline check-in",
    check_in_today: "Check in for today",
    success: "Success",
    relapse: "Relapse",
    success_days: "Success days",
    relapse_days: "Relapse days",
    insights_title: "Your Journey",
    total_across_all: "Total (all deities)",
    last_30_days: "Last 30 days",
    all_deities: "All",
    settings_title: "Settings",
    language: "Language",
    reminders: "Daily Reminders",
    add_reminder: "Add Reminder",
    reminder_time: "Time",
    reminder_repeat: "Repeat",
    everyday: "Every day",
    delete: "Delete",
    enabled: "Enabled",
    notifications_permission: "Notifications permission needed for reminders.",
    grant: "Grant",
    begin_chant: "Begin your daily chanting",
    milestones: "Milestones",
    per_deity: "Per Deity",
    day_labels: ["S", "M", "T", "W", "T", "F", "S"],
    no_data: "No data yet — start chanting to see insights.",
    guest_mode: "Guest mode • Data on this device",
    completed_malas: "Malas completed",
  },
  hi: {
    app_name: "नामस्मरण",
    tab_jaap: "जाप",
    tab_tracker: "ट्रैकर",
    tab_insights: "आँकड़े",
    tab_settings: "सेटिंग्स",
    todays_count: "आज",
    lifetime: "कुल",
    streak: "श्रृंखला",
    days: "दिन",
    mala: "माला",
    mala_complete: "एक माला पूर्ण! 108 जाप",
    tap_to_count: "जाप करने हेतु स्पर्श करें",
    reset: "रीसेट",
    add_custom: "जोड़ें",
    add_custom_mantra: "कस्टम मंत्र जोड़ें",
    name: "नाम",
    mantra: "मंत्र",
    save: "सहेजें",
    cancel: "रद्द",
    brahmacharya_title: "ब्रह्मचर्य ट्रैकर",
    brahmacharya_sub: "दैनिक संकल्प",
    check_in_today: "आज का चेक-इन",
    success: "सफल",
    relapse: "पुनरागमन",
    success_days: "सफल दिन",
    relapse_days: "विचलन दिन",
    insights_title: "आपकी यात्रा",
    total_across_all: "कुल (सभी देव)",
    last_30_days: "पिछले 30 दिन",
    all_deities: "सभी",
    settings_title: "सेटिंग्स",
    language: "भाषा",
    reminders: "दैनिक स्मरण",
    add_reminder: "स्मरण जोड़ें",
    reminder_time: "समय",
    reminder_repeat: "दोहराएं",
    everyday: "प्रतिदिन",
    delete: "मिटाएँ",
    enabled: "सक्रिय",
    notifications_permission: "स्मरण हेतु सूचना अनुमति आवश्यक है।",
    grant: "अनुमति दें",
    begin_chant: "अपना दैनिक जाप आरंभ करें",
    milestones: "उपलब्धियाँ",
    per_deity: "देव-वार",
    day_labels: ["र", "सो", "मं", "बु", "गु", "शु", "श"],
    no_data: "अभी कोई डेटा नहीं — जाप शुरू करें।",
    guest_mode: "अतिथि मोड • डेटा इस उपकरण पर",
    completed_malas: "पूर्ण मालाएँ",
  },
} as const;

export type Dict = typeof dict.en;

type Ctx = {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
};

const I18nContext = createContext<Ctx>({
  lang: "en",
  t: dict.en,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === "hi" || v === "en") setLangState(v);
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(KEY, l);
  }, []);

  return createElement(I18nContext.Provider, { value: { lang, t: dict[lang], setLang } }, children);
}

export function useI18n() {
  return useContext(I18nContext);
}

export function deityName(d: { name_en: string; name_hi: string }, lang: Lang) {
  return lang === "hi" ? d.name_hi : d.name_en;
}

export function deityMantra(d: { mantra_en: string; mantra_hi: string }, lang: Lang) {
  return lang === "hi" ? d.mantra_hi : d.mantra_en;
}
