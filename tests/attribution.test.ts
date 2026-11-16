import { describe, expect, it } from "vitest";
import { attribute, distribute } from "../src/lib/attribution.ts";

const path = [
  { at: "2026-11-03T10:00:00Z", src: "vk_ads" },
  { at: "2026-11-01T10:00:00Z", src: "yandex_direct" },
  { at: "2026-11-05T10:00:00Z", src: "tg_seeding" },
];

describe("модели атрибуции", () => {
  it("первый клик — самое раннее касание, даже если массив не отсортирован", () => {
    expect(attribute(path, "first_click")).toEqual([{ touch: path[1], weight: 1 }]);
  });
  it("последний клик — последнее касание до конверсии", () => {
    expect(attribute(path, "last_click")[0]!.touch.src).toBe("tg_seeding");
    expect(attribute(path, "last_click", "2026-11-04T00:00:00Z")[0]!.touch.src).toBe("vk_ads");
  });
  it("линейная — поровну, сумма весов = 1", () => {
    const w = attribute(path, "linear");
    expect(w).toHaveLength(3);
    expect(w.reduce((s, x) => s + x.weight, 0)).toBeCloseTo(1);
  });
  it("нет касаний — нет атрибуции", () => {
    expect(attribute([], "linear")).toEqual([]);
  });
  it("распределение выручки по источникам", () => {
    const into = new Map<string, number>();
    distribute(9000, path, "linear", (t) => t.src, into);
    distribute(1000, path, "last_click", (t) => t.src, into);
    expect(into.get("yandex_direct")).toBeCloseTo(3000);
    expect(into.get("tg_seeding")).toBeCloseTo(4000);
  });
});
