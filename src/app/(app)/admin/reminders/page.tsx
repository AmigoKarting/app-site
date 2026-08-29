import Link from "next/link";
import {
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  PageTip,
  StatusBadge,
  formatDateTime,
} from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { listReminders, type ReminderStatus } from "@/domain/reminders/repository";
import { CancelReminderForm } from "./cancel-form";
import { getServerDictionary, getLocale, getDateFormat } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const VALID_STATUSES: ReminderStatus[] = ["pending", "sent", "cancelled", "failed"];
const PER_PAGE = 20;

interface PageProps {
  searchParams?: { status?: string; page?: string; q?: string };
}

export default async function RemindersPage({ searchParams }: PageProps) {
  const t = getServerDictionary();
  const locale = getLocale();
  const search = searchParams?.q?.trim() || undefined;
  const requested = searchParams?.status;
  const status =
    requested && (VALID_STATUSES as string[]).includes(requested)
      ? (requested as ReminderStatus)
      : undefined;

  const page = Math.max(1, Number(searchParams?.page) || 1);
  const allReminders = await listReminders({ status, search, limit: 1000 });
  const totalPages = Math.ceil(allReminders.length / PER_PAGE);
  const reminders = allReminders.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Build extra params for pagination links
  const paginationParams: Record<string, string> = {};
  if (status) paginationParams.status = status;
  if (search) paginationParams.q = search;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.reminders.title}
        description={t.reminders.description}
        helpHref="/admin/aide/planifier"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/employees"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              {t.nav.employees}
            </Link>
            <a
              href="/api/export/reminders"
              download
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              {t.reminders.exportCsv}
            </a>
            <LinkButton href="/admin/reminders/new">{t.reminders.newReminder}</LinkButton>
          </div>
        }
      />

      <form action="/admin/reminders" method="get" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={search ?? ""}
          placeholder={t.common.searchPlaceholder}
          className="w-full max-w-xs rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm transition placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-brand-500 dark:focus:ring-brand-800"
        />
        {status && <input type="hidden" name="status" value={status} />}
        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600">
          {t.common.search}
        </button>
        {(search || status) && (
          <Link href="/admin/reminders" className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
            {t.common.clear}
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterLink href="/admin/reminders" active={!status} label={t.reminders.all} />
        <FilterLink href="/admin/reminders?status=pending" active={status === "pending"} label={t.reminders.pending} />
        <FilterLink href="/admin/reminders?status=sent" active={status === "sent"} label={t.reminders.sent} />
        <FilterLink href="/admin/reminders?status=failed" active={status === "failed"} label={t.reminders.failed} />
        <FilterLink
          href="/admin/reminders?status=cancelled"
          active={status === "cancelled"}
          label={t.reminders.cancelled}
        />
      </div>

      {allReminders.length === 0 ? (
        <EmptyState
          title={t.reminders.noReminders}
          description={
            status
              ? t.reminders.noRemindersFiltered
              : t.reminders.noRemindersDesc
          }
          action={!status && <LinkButton href="/admin/reminders/new">{t.reminders.createReminder}</LinkButton>}
        />
      ) : (
        <>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-2 font-medium">{t.reminders.employee}</th>
                <th className="px-4 py-2 font-medium">{t.reminders.message}</th>
                <th className="px-4 py-2 font-medium">{t.reminders.deadline}</th>
                <th className="px-4 py-2 font-medium">{t.reminders.status}</th>
                <th className="px-4 py-2 font-medium text-right">{t.reminders.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {reminders.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{r.employee?.name ?? "—"}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{r.employee?.email ?? ""}</p>
                  </td>
                  <td className="max-w-md px-4 py-3 align-top text-neutral-700 dark:text-neutral-300">
                    <p className="line-clamp-2">{r.message}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-neutral-700 dark:text-neutral-300">
                    {formatDateTime(r.scheduled_at, locale === "en" ? "en-US" : "fr-FR", getDateFormat() === "friendly")}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-right">
                    <div className="flex justify-end gap-3">
                      {r.status === "pending" && <CancelReminderForm id={r.id} />}
                      <Link
                        href={`/admin/reminders/${r.id}`}
                        className="text-sm font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                      >
                        {t.reminders.edit}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          baseUrl="/admin/reminders"
          extraParams={paginationParams}
          labels={t.pagination}
          totalItems={allReminders.length}
          perPage={PER_PAGE}
        />
        </>
      )}

      <PageTip>{t.pageTips.reminders}</PageTip>
    </div>
  );
}

function FilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 transition ${
        active
          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
      }`}
    >
      {label}
    </Link>
  );
}
