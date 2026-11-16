/**
 * Фильтры ⇄ строка запроса. Ссылку с фильтрами можно отправить коллеге — откроется тот же срез.
 * Пример: #/marketing?p=30d&src=vk_ads,tg_ads&cmp=prev&attr=last
 */
import type { FunnelStep, ID, SourceId } from "../types/domain.ts";
import { FUNNEL_STEPS } from "../types/domain.ts";
import type { Attribution, CompareMode, DatePreset, Filters } from "../types/filters.ts";

const PRESETS: DatePreset[] = ["today", "7d", "30d", "90d", "custom"];
const SOURCES: SourceId[] = ["yandex_direct", "vk_ads", "tg_ads", "tg_seeding", "organic", "referral"];
const ATTR: Record<string, Attribution> = { first: "first_click", last: "last_click", linear: "linear" };
const ATTR_BACK: Record<Attribution, string> = { first_click: "first", last_click: "last", linear: "linear" };
const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const list = (s: string | null): string[] => (s ? s.split(",").filter(Boolean) : []);

export function filtersToQuery(f: Filters): string {
  const q = new URLSearchParams();
  q.set("p", f.preset);
  if (f.preset === "custom") {
    q.set("from", f.from);
    q.set("to", f.to);
  }
  if (f.compare === "none") q.set("cmp", "off");
  if (f.attribution !== "last_click") q.set("attr", ATTR_BACK[f.attribution]);
  if (f.sourceIds.length) q.set("src", f.sourceIds.join(","));
  if (f.campaignIds.length) q.set("camp", f.campaignIds.join(","));
  if (f.adIds.length) q.set("ad", f.adIds.join(","));
  if (f.productIds.length) q.set("prod", f.productIds.join(","));
  if (f.managerIds.length) q.set("mgr", f.managerIds.join(","));
  if (f.funnelStep) q.set("step", f.funnelStep);
  return q.toString().replace(/%2C/g, ",");
}

/** Разобрать запрос поверх значений по умолчанию; мусор игнорируется */
export function queryToFilters(query: string, defaults: Filters): Filters {
  const q = new URLSearchParams(query);
  const preset = PRESETS.find((p) => p === q.get("p")) ?? defaults.preset;
  const from = q.get("from");
  const to = q.get("to");
  const step = q.get("step");
  const custom = preset === "custom" && isDate(from) && isDate(to) && from <= to;
  return {
    ...defaults,
    preset: custom || preset !== "custom" ? preset : defaults.preset,
    from: custom ? from : defaults.from,
    to: custom ? to : defaults.to,
    compare: (q.get("cmp") === "off" ? "none" : "previous_period") satisfies CompareMode,
    attribution: ATTR[q.get("attr") ?? ""] ?? defaults.attribution,
    sourceIds: list(q.get("src")).filter((s): s is SourceId => SOURCES.includes(s as SourceId)),
    campaignIds: list(q.get("camp")) as ID[],
    adIds: list(q.get("ad")) as ID[],
    productIds: list(q.get("prod")) as ID[],
    managerIds: list(q.get("mgr")) as ID[],
    funnelStep: FUNNEL_STEPS.includes(step as FunnelStep) ? (step as FunnelStep) : null,
  };
}
