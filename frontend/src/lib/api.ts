const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export type Deity = {
  id: string;
  name_en: string;
  name_hi: string;
  mantra_en: string;
  mantra_hi: string;
  image_url: string;
  color: string;
  is_default: boolean;
};

export type JaapSummary = {
  today: number;
  lifetime: number;
  streak: number;
  per_deity_today: Record<string, number>;
  per_deity_lifetime: Record<string, number>;
};

export type HistoryDay = {
  date: string;
  total: number;
  per_deity: Record<string, number>;
};

export type BrahmacharyaResp = {
  entries: { date: string; status: "success" | "relapse" }[];
  streak: number;
  success_days: number;
  relapse_days: number;
};

export type Reminder = {
  id: string;
  guest_id: string;
  hour: number;
  minute: number;
  repeat_days: number[];
  deity_id?: string | null;
  message?: string | null;
  enabled: boolean;
  notification_ids: string[];
};

export type Video = {
  id: string;
  title: string;
  video_url: string;
  platform: "youtube" | "instagram";
  thumbnail_url?: string | null;
  category: string;
  upload_date: string;
};

export const api = {
  listDeities: (guest_id: string) =>
    req<Deity[]>(`/deities?guest_id=${encodeURIComponent(guest_id)}`),
  createCustomDeity: (body: {
    guest_id: string;
    name_en: string;
    name_hi?: string;
    mantra_en: string;
    mantra_hi?: string;
  }) => req<Deity>(`/deities/custom`, { method: "POST", body: JSON.stringify(body) }),
  deleteCustomDeity: (id: string, guest_id: string) =>
    req<{ deleted: boolean }>(`/deities/custom/${id}?guest_id=${guest_id}`, {
      method: "DELETE",
    }),
  createJaap: (body: {
    guest_id: string;
    deity_id: string;
    count: number;
    mode?: "tap" | "handwritten";
  }) => req(`/jaap`, { method: "POST", body: JSON.stringify(body) }),
  summary: (guest_id: string) =>
    req<JaapSummary>(`/jaap/summary?guest_id=${guest_id}`),
  history: (guest_id: string, days = 30) =>
    req<{ days: HistoryDay[] }>(`/jaap/history?guest_id=${guest_id}&days=${days}`),
  logBrahmacharya: (body: {
    guest_id: string;
    date: string;
    status: "success" | "relapse";
  }) => req(`/brahmacharya`, { method: "POST", body: JSON.stringify(body) }),
  getBrahmacharya: (guest_id: string, days = 120) =>
    req<BrahmacharyaResp>(`/brahmacharya?guest_id=${guest_id}&days=${days}`),
  listReminders: (guest_id: string) =>
    req<Reminder[]>(`/reminders?guest_id=${guest_id}`),
  createReminder: (body: Omit<Reminder, "id">) =>
    req<Reminder>(`/reminders`, { method: "POST", body: JSON.stringify(body) }),
  updateReminder: (id: string, body: Omit<Reminder, "id">) =>
    req<Reminder>(`/reminders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteReminder: (id: string, guest_id: string) =>
    req<{ deleted: boolean }>(`/reminders/${id}?guest_id=${guest_id}`, {
      method: "DELETE",
    }),
  listVideos: (category?: string) =>
    req<Video[]>(
      `/videos${category && category !== "all" ? `?category=${encodeURIComponent(category)}` : ""}`
    ),
  videoCategories: () =>
    req<{ categories: string[] }>(`/videos/categories`),
  createVideo: (body: {
    admin_password: string;
    title: string;
    video_url: string;
    platform: "youtube" | "instagram";
    thumbnail_url?: string | null;
    category: string;
  }) => req<Video>(`/videos`, { method: "POST", body: JSON.stringify(body) }),
  deleteVideo: (id: string, admin_password: string) =>
    req<{ deleted: boolean }>(
      `/videos/${id}?admin_password=${encodeURIComponent(admin_password)}`,
      { method: "DELETE" }
    ),
  adminCheck: (admin_password: string) =>
    req<{ ok: boolean }>(`/admin/check`, {
      method: "POST",
      body: JSON.stringify({ admin_password }),
    }),
};
