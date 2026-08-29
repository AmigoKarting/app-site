"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, formatDateTime } from "@/components/ui";
import { bulkDeleteFeedItemsAction, duplicateFeedItemAction, toggleFeedItemPinAction } from "@/domain/feed/actions";
import { useTranslation } from "@/lib/i18n";

interface FeedTableItem {
  id: string;
  title: string;
  kind: string;
  priority: string;
  is_pinned: boolean;
  is_draft: boolean;
  published_at: string | null;
  send_channels: string[];
  category: { name: string; color: string; icon: string | null } | null;
  session: { name: string } | null;
}

function CategoryChip({ category }: { category: { name: string; color: string; icon?: string | null } | null }) {
  if (!category) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
      style={{
        backgroundColor: `${category.color}20`,
        color: category.color,
        borderColor: `${category.color}40`,
      }}
    >
      {category.icon && <span>{category.icon}</span>}
      {category.name}
    </span>
  );
}

export function FeedTable({
  items,
  dateFmt,
}: {
  items: FeedTableItem[];
  dateFmt: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = selected.size === items.length && items.length > 0;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(t.adminFeed.bulkDeleteConfirm.replace("{count}", String(selected.size)))) return;
    startTransition(async () => {
      await bulkDeleteFeedItemsAction([...selected]);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm dark:border-brand-700 dark:bg-brand-950/30">
          <span className="font-medium text-brand-800 dark:text-brand-300">
            {selected.size} {t.adminFeed.bulkSelected}
          </span>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={pending}
            className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "..." : t.common.delete}
          </button>
        </div>
      )}

      {/* Mobile: card layout */}
      <div className="space-y-3 md:hidden">
        {items.map((it) => (
          <Card key={it.id} className="p-4">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={selected.has(it.id)}
                onChange={() => toggle(it.id)}
                className="mt-1 h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-800"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {it.is_pinned && (
                    <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-700 ring-1 ring-brand-200">
                      {t.feed.pinned}
                    </span>
                  )}
                  {it.is_draft && (
                    <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 ring-1 ring-amber-200">
                      {t.feed.draft}
                    </span>
                  )}
                  <span className="text-xs capitalize text-neutral-500">
                    {it.kind === "reminder" ? t.feed.reminder : t.feed.notification}
                  </span>
                  <CategoryChip category={it.category} />
                </div>
                <p className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">{it.title}</p>
                {it.priority === "high" && (
                  <span className="text-xs text-red-600">{t.feed.highPriority}</span>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">{it.published_at ? formatDateTime(it.published_at, dateFmt) : "—"}</span>
                  <Link href={`/admin/feed/${it.id}`} className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
                    {t.adminFeed.edit}
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop: table layout */}
      <Card className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
            <tr>
              <th className="px-3 py-2 font-medium">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-800"
                />
              </th>
              <th className="px-4 py-2 font-medium">{t.adminFeed.titleHeader}</th>
              <th className="px-4 py-2 font-medium">{t.adminFeed.typeHeader}</th>
              <th className="px-4 py-2 font-medium">{t.adminFeed.categoryHeader}</th>
              <th className="px-4 py-2 font-medium">{t.adminFeed.sessionHeader}</th>
              <th className="px-4 py-2 font-medium">{t.adminFeed.publishedHeader}</th>
              <th className="px-4 py-2 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {items.map((it) => (
              <tr key={it.id} className={`hover:bg-neutral-50 dark:hover:bg-neutral-700/30 ${selected.has(it.id) ? "bg-brand-50/50 dark:bg-brand-900/10" : ""}`}>
                <td className="px-3 py-3 align-top">
                  <input
                    type="checkbox"
                    checked={selected.has(it.id)}
                    onChange={() => toggle(it.id)}
                    className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-800"
                  />
                </td>
                <td className="max-w-md px-4 py-3 align-top">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {it.is_pinned && (
                      <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-700 ring-1 ring-brand-200">
                        {t.feed.pinned}
                      </span>
                    )}
                    {it.is_draft && (
                      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 ring-1 ring-amber-200">
                        {t.feed.draft}
                      </span>
                    )}
                    <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{it.title}</p>
                  </div>
                  {it.priority === "high" && (
                    <span className="text-xs text-red-600">{t.feed.highPriority}</span>
                  )}
                  {it.send_channels && it.send_channels.length > 0 && (
                    <span className="block text-xs text-neutral-400">
                      + {it.send_channels.map((c) => c.toUpperCase()).join(", ")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top capitalize text-neutral-700 dark:text-neutral-300">
                  {it.kind === "reminder" ? t.feed.reminder : t.feed.notification}
                </td>
                <td className="px-4 py-3 align-top">
                  <CategoryChip category={it.category} />
                </td>
                <td className="px-4 py-3 align-top text-neutral-700 dark:text-neutral-300">
                  {it.session?.name ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-neutral-700 dark:text-neutral-300">
                  {it.published_at ? formatDateTime(it.published_at, dateFmt) : "—"}
                </td>
                <td className="px-4 py-3 align-top text-right">
                  <div className="flex justify-end gap-3 text-sm">
                    <form action={toggleFeedItemPinAction}>
                      <input type="hidden" name="id" value={it.id} />
                      <input type="hidden" name="is_pinned" value={String(it.is_pinned)} />
                      <button
                        type="submit"
                        className={`font-medium hover:underline ${it.is_pinned ? "text-brand-700 dark:text-brand-400" : "text-neutral-500"}`}
                      >
                        📌
                      </button>
                    </form>
                    <form action={duplicateFeedItemAction}>
                      <input type="hidden" name="id" value={it.id} />
                      <button type="submit" className="font-medium text-neutral-500 hover:text-neutral-900 hover:underline dark:hover:text-neutral-100">
                        📋
                      </button>
                    </form>
                    <Link href={`/admin/feed/${it.id}`} className="font-medium text-neutral-900 hover:underline dark:text-neutral-100">
                      {t.adminFeed.edit}
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
