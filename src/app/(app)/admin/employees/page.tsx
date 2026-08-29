import Link from "next/link";
import { Card, EmptyState, LinkButton, PageHeader, PageTip } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { listEmployees } from "@/domain/employees/repository";
import { getServerDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

interface PageProps {
  searchParams?: { q?: string; page?: string };
}

export default async function EmployeesPage({ searchParams }: PageProps) {
  const t = getServerDictionary();
  const search = searchParams?.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const allEmployees = await listEmployees({ search: search || undefined, limit: 1000 });
  const totalPages = Math.ceil(allEmployees.length / PER_PAGE);
  const employees = allEmployees.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Build extra params for pagination links
  const paginationParams: Record<string, string> = {};
  if (search) paginationParams.q = search;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.employees.title}
        description={t.employees.description}
        action={
          <div className="flex items-center gap-2">
            <a
              href="/api/export/employees"
              download
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              {t.employees.exportCsv}
            </a>
            <LinkButton href="/admin/employees/new">{t.employees.newEmployee}</LinkButton>
          </div>
        }
      />

      <form className="flex gap-2" action="/admin/employees">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder={t.employees.searchPlaceholder}
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-brand-500 dark:focus:ring-brand-500"
        />
        {search && (
          <Link
            href="/admin/employees"
            className="inline-flex items-center px-2 text-sm text-neutral-600 hover:underline"
          >
            {t.employees.clear}
          </Link>
        )}
      </form>

      {allEmployees.length === 0 ? (
        <EmptyState
          title={search ? t.employees.noResults : t.employees.noEmployees}
          description={
            search
              ? t.employees.noResultsDesc
              : t.employees.noEmployeesDesc
          }
          action={!search && <LinkButton href="/admin/employees/new">{t.employees.addEmployee}</LinkButton>}
        />
      ) : (
        <>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-2 font-medium">{t.employees.name}</th>
                <th className="px-4 py-2 font-medium">{t.employees.email}</th>
                <th className="px-4 py-2 font-medium">{t.employees.phone}</th>
                <th className="px-4 py-2 font-medium text-right">{t.employees.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{emp.name}</td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{emp.email}</td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{emp.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/employees/${emp.id}`}
                      className="text-sm font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                    >
                      {t.employees.edit}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          baseUrl="/admin/employees"
          extraParams={paginationParams}
          labels={t.pagination}
          totalItems={allEmployees.length}
          perPage={PER_PAGE}
        />
        </>
      )}

      <PageTip>{t.pageTips.employees}</PageTip>
    </div>
  );
}
