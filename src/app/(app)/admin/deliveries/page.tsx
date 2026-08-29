import Link from "next/link";
import { Card, EmptyState, PageHeader, PageTip, formatDateTime } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { channelRegistry } from "@/lib/messaging";
import { getDeliveryCounts, listDeliveries } from "@/domain/deliveries/repository";
import { retryDeliveryAction } from "@/domain/deliveries/actions";
import type { DeliveryStatus, MessageChannel } from "@/lib/supabase/database.types";
import { getServerDictionary, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const CHANNELS: MessageChannel[] = ["email", "sms", "whatsapp"];
const STATUSES: DeliveryStatus[] = ["queued", "sent", "failed", "skipped"];

const PER_PAGE = 20;

interface PageProps {
  searchParams?: { channel?: string; status?: string; page?: string; q?: string };
}

export default async function AdminDeliveriesPage({ searchParams }: PageProps) {
  const t = getServerDictionary();
  const locale = getLocale();
  const dateFmt = locale === "en" ? "en-US" : "fr-FR";
  const channel =
    searchParams?.channel && (CHANNELS as string[]).includes(searchParams.channel)
      ? (searchParams.channel as MessageChannel)
      : undefined;
  const status =
    searchParams?.status && (STATUSES as string[]).includes(searchParams.status)
      ? (searchParams.status as DeliveryStatus)
      : undefined;

  const search = searchParams?.q?.trim() || undefined;
  const page = Math.max(1, Number(searchParams?.page) || 1);

  const [allDeliveries, counts] = await Promise.all([
    listDeliveries({ channel, status, search, limit: 1000 }),
    getDeliveryCounts(),
  ]);

  const totalPages = Math.ceil(allDeliveries.length / PER_PAGE);
  const deliveries = allDeliveries.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Build extra params for pagination links
  const paginationParams: Record<string, string> = {};
  if (channel) paginationParams.channel = channel;
  if (status) paginationParams.status = status;
  if (search) paginationParams.q = search;

  const registered = channelRegistry.list();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.adminDeliveries.title}
        description={t.adminDeliveries.description}
        action={
          <a
            href="/api/export/deliveries"
            download
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            {t.adminDeliveries.exportCsv}
          </a>
        }
      />
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t.adminDeliveries.total} value={counts.total} />
        <Stat label={t.adminDeliveries.sent} value={counts.sent} />
        <Stat label={t.adminDeliveries.failed} value={counts.failed} tone={counts.failed > 0 ? "danger" : "default"} />
        <Stat label={t.adminDeliveries.skipped} value={counts.skipped} />
      </section>

      <Card className="p-4">
        <p className="text-sm font-medium text-neutral-900">{t.adminDeliveries.registeredChannels}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {registered.map((c) => (
            <span
              key={c.id}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                c.isAvailable()
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-neutral-100 text-neutral-600 ring-neutral-200"
              }`}
            >
              {c.displayName} {c.isAvailable() ? "" : t.adminDeliveries.notConfigured}
            </span>
          ))}
        </div>
      </Card>

      <form action="/admin/deliveries" className="flex gap-2">
        {channel && <input type="hidden" name="channel" value={channel} />}
        {status && <input type="hidden" name="status" value={status} />}
        <input
          type="search"
          name="q"
          defaultValue={search ?? ""}
          placeholder={t.adminDeliveries.searchPlaceholder}
          className="w-full max-w-xs rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-neutral-600 dark:bg-neutral-800"
        />
        <button type="submit" className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900">
          {t.common.search}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        <Filter href="/admin/deliveries" active={!channel && !status} label={t.adminDeliveries.everything} />
        {CHANNELS.map((c) => (
          <Filter
            key={c}
            href={`/admin/deliveries?channel=${c}`}
            active={channel === c}
            label={c.toUpperCase()}
          />
        ))}
        {STATUSES.map((s) => (
          <Filter
            key={s}
            href={`/admin/deliveries?status=${s}`}
            active={status === s}
            label={s}
          />
        ))}
      </div>

      {allDeliveries.length === 0 ? (
        <EmptyState title={t.adminDeliveries.noDeliveries} description={t.adminDeliveries.noDeliveriesDesc} />
      ) : (
        <>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">{t.adminDeliveries.date}</th>
                <th className="px-4 py-2 font-medium">{t.adminDeliveries.channel}</th>
                <th className="px-4 py-2 font-medium">{t.adminDeliveries.recipient}</th>
                <th className="px-4 py-2 font-medium">{t.adminDeliveries.subjectMessage}</th>
                <th className="px-4 py-2 font-medium">{t.adminDeliveries.status}</th>
                <th className="px-4 py-2 font-medium">{t.adminDeliveries.provider}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {deliveries.map((d) => (
                <tr key={d.id} className="hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-4 py-3 align-top text-neutral-700">
                    {formatDateTime(d.created_at, dateFmt)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium uppercase">
                      {d.channel}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 align-top">{d.recipient}</td>
                  <td className="max-w-md px-4 py-3 align-top">
                    <p className="font-medium text-neutral-900">{d.subject ?? "—"}</p>
                    <p className="line-clamp-2 text-xs text-neutral-500">{d.body}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <StatusPill status={d.status} />
                      {d.status === "failed" && (
                        <form action={retryDeliveryAction}>
                          <input type="hidden" name="id" value={d.id} />
                          <button
                            type="submit"
                            className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                          >
                            {t.adminDeliveries.retry}
                          </button>
                        </form>
                      )}
                    </div>
                    {d.error && (
                      <p
                        className="mt-1 max-w-xs truncate text-xs text-red-600"
                        title={d.error}
                      >
                        {d.error}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-neutral-600">
                    {d.provider ?? "—"}
                    {d.provider_message_id && (
                      <p className="text-[10px] text-neutral-400" title={d.provider_message_id}>
                        {d.provider_message_id.slice(0, 16)}…
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          baseUrl="/admin/deliveries"
          extraParams={paginationParams}
          labels={t.pagination}
          totalItems={allDeliveries.length}
          perPage={PER_PAGE}
        />
        </>
      )}
      <PageTip>{t.pageTips.adminDeliveries}</PageTip>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "danger";
}) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === "danger" ? "text-red-600" : "text-neutral-900"}`}>
        {value}
      </p>
    </Card>
  );
}

function StatusPill({ status }: { status: DeliveryStatus }) {
  const styles: Record<DeliveryStatus, string> = {
    queued: "bg-neutral-100 text-neutral-700 ring-neutral-200",
    sent: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    failed: "bg-red-50 text-red-700 ring-red-200",
    skipped: "bg-amber-50 text-amber-800 ring-amber-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function Filter({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 transition ${
        active ? "bg-neutral-900 text-white" : "border border-neutral-200 bg-white hover:bg-neutral-50"
      }`}
    >
      {label}
    </Link>
  );
}
