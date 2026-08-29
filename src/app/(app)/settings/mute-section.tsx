"use client";

import { useFormStatus } from "react-dom";
import { toggleCategoryMuteAction } from "@/domain/category-mutes/actions";
import { useTranslation } from "@/lib/i18n";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

interface Props {
  categories: Category[];
  mutedIds: string[];
}

function ToggleButton({ muted }: { muted: boolean }) {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium ring-1 ring-inset transition disabled:opacity-50 ${
        muted
          ? "bg-neutral-100 text-neutral-700 ring-neutral-200 hover:bg-neutral-200"
          : "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
      }`}
    >
      {muted ? t.feed.muted : t.feed.received}
    </button>
  );
}

export function MuteSection({ categories, mutedIds }: Props) {
  const { t } = useTranslation();
  const muted = new Set(mutedIds);

  if (categories.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        {t.settings.noCategoriesYet}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
      {categories.map((c) => {
        const isMuted = muted.has(c.id);
        return (
          <li
            key={c.id}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <span className="flex items-center gap-2">
              <span
                className="block h-3 w-3 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-sm font-medium text-neutral-900">
                {c.icon && <span className="mr-1">{c.icon}</span>}
                {c.name}
              </span>
            </span>
            <form action={toggleCategoryMuteAction}>
              <input type="hidden" name="category_id" value={c.id} />
              <input type="hidden" name="muted" value={String(isMuted)} />
              <ToggleButton muted={isMuted} />
            </form>
          </li>
        );
      })}
    </ul>
  );
}
