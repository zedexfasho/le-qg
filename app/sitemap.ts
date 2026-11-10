import type { MetadataRoute } from "next";
import { categories } from "@/data/categories";
import { site } from "@/data/site";
import { getDrops, getProducts } from "@/lib/catalog";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, drops] = await Promise.all([getProducts(), getDrops()]);
  const url = (path: string) => `${site.url}${path}`;
  const latest = products[0]?.createdAt ?? new Date().toISOString();

  return [
    { url: url("/"), lastModified: latest, changeFrequency: "daily", priority: 1 },
    { url: url("/shop/"), lastModified: latest, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({ url: url(`/shop/${c.id}/`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: url(`/product/${p.slug}/`), lastModified: p.createdAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: url("/drops/"), changeFrequency: "weekly", priority: 0.6 },
    ...drops.map((d) => ({ url: url(`/drops/${d.id}/`), lastModified: d.date, changeFrequency: "monthly" as const, priority: 0.5 })),
    { url: url("/notre-histoire/"), changeFrequency: "yearly", priority: 0.3 },
    { url: url("/infos/"), changeFrequency: "monthly", priority: 0.4 },
  ];
}
