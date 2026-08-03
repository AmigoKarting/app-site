"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { Button, Field, FormError, SelectField } from "@/components/ui";
import {
  createChecklistTaskAction,
  deleteChecklistTaskAction,
  toggleChecklistTaskAction,
  updateChecklistTaskAction,
} from "@/domain/checklists/tasks-actions";
import { idleFormState, type FormState } from "@/domain/form-state";
import { useTranslation } from "@/lib/i18n";

type Task = {
  id: string;
  task_key: string;
  section: "opening" | "during" | "closing" | "free_time" | "meeting";
  label: string;
  sort_order: number;
  is_active: boolean;
  target_role: string;
};

interface Props {
  tasks: Task[];
}

function CreateBtn() {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t.common.saving : t.checklistAdmin.addTask}
    </Button>
  );
}

function SaveBtn() {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? t.common.saving : t.common.save}
    </Button>
  );
}

function DeleteBtn() {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
    >
      {pending ? "…" : t.common.delete}
    </button>
  );
}

export function TasksManager({ tasks }: Props) {
  const { t } = useTranslation();
  const [createState, createAction] = useFormState<FormState<unknown>, FormData>(
    createChecklistTaskAction as unknown as (
      prev: FormState<unknown>,
      formData: FormData,
    ) => Promise<FormState<unknown>>,
    idleFormState as FormState<unknown>,
  );

  const sectionLabels: Record<Task["section"], string> = {
    opening: t.checklist.sectionOpening,
    during: t.checklist.sectionDuring,
    closing: t.checklist.sectionClosing,
    free_time: t.checklist.sectionFreeTime,
    meeting: "Réunion d'équipe",
  };

  return (
    <div className="space-y-6">
      {/* Formulaire ajout */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 dark:border-neutral-700 dark:bg-neutral-800">
        <h2 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {t.checklistAdmin.addTask}
        </h2>
        <form action={createAction} className="space-y-4">
          <Field
            label={t.checklistAdmin.taskLabel}
            name="label"
            type="text"
            maxLength={300}
            placeholder={t.checklistAdmin.taskLabelPlaceholder}
            error={createState.status === "error" ? createState.fieldErrors?.label : undefined}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SelectField label={t.checklistAdmin.section} name="section" defaultValue="opening">
              <option value="opening">{sectionLabels.opening}</option>
              <option value="during">{sectionLabels.during}</option>
              <option value="closing">{sectionLabels.closing}</option>
              <option value="free_time">{sectionLabels.free_time}</option>
              <option value="meeting">{sectionLabels.meeting}</option>
            </SelectField>
            <SelectField label="Rôle cible" name="target_role" defaultValue="caissiere">
              <option value="caissiere">Caissière</option>
              <option value="superviseur">Superviseur</option>
            </SelectField>
            <Field
              label={t.checklistAdmin.sortOrder}
              name="sort_order"
              type="number"
              min={0}
              max={99999}
              defaultValue={0}
              hint={t.checklistAdmin.sortOrderHint}
              error={createState.status === "error" ? createState.fieldErrors?.sort_order : undefined}
            />
          </div>
          <Field
            label={t.checklistAdmin.taskKey}
            name="task_key"
            type="text"
            maxLength={80}
            placeholder={t.checklistAdmin.taskKeyPlaceholder}
            hint={t.checklistAdmin.taskKeyHint}
            error={createState.status === "error" ? createState.fieldErrors?.task_key : undefined}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4" />
            <span>{t.checklistAdmin.active}</span>
          </label>
          {createState.status === "error" && <FormError message={createState.message} />}
          {createState.status === "success" && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              {createState.message}
            </p>
          )}
          <div className="flex justify-end">
            <CreateBtn />
          </div>
        </form>
      </div>

      {/* Liste par rôle + section */}
      {(["caissiere", "superviseur"] as const).map((role) => {
        const roleTasks = tasks.filter((t) => t.target_role === role);
        if (roleTasks.length === 0) return null;
        return (
          <div key={role} className="space-y-4">
            <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
              {role === "caissiere" ? "Caissières" : "Superviseurs"}
            </h2>
            {(["opening", "during", "closing", "free_time", "meeting"] as const).map((section) => {
              const list = roleTasks.filter((task) => task.section === section);
              if (list.length === 0) return null;
              return (
                <div key={section} className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {sectionLabels[section]}
                  </h3>
                  <ul className="space-y-2">
                    {list.map((task) => (
                      <TaskRow key={task.id} task={task} sectionLabels={sectionLabels} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({
  task,
  sectionLabels,
}: {
  task: Task;
  sectionLabels: Record<Task["section"], string>;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction] = useFormState<FormState<unknown>, FormData>(
    updateChecklistTaskAction as unknown as (
      prev: FormState<unknown>,
      formData: FormData,
    ) => Promise<FormState<unknown>>,
    idleFormState as FormState<unknown>,
  );

  if (editing) {
    return (
      <li className="rounded-lg border border-brand-300 bg-brand-50/30 p-4 dark:border-brand-700 dark:bg-brand-900/10">
        <form action={updateAction} className="space-y-3">
          <input type="hidden" name="id" value={task.id} />
          <Field
            label={t.checklistAdmin.taskLabel}
            name="label"
            type="text"
            defaultValue={task.label}
            maxLength={300}
            error={updateState.status === "error" ? updateState.fieldErrors?.label : undefined}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SelectField label={t.checklistAdmin.section} name="section" defaultValue={task.section}>
              <option value="opening">{sectionLabels.opening}</option>
              <option value="during">{sectionLabels.during}</option>
              <option value="closing">{sectionLabels.closing}</option>
              <option value="free_time">{sectionLabels.free_time}</option>
            </SelectField>
            <SelectField label="Rôle cible" name="target_role" defaultValue={task.target_role}>
              <option value="caissiere">Caissière</option>
              <option value="superviseur">Superviseur</option>
            </SelectField>
            <Field
              label={t.checklistAdmin.sortOrder}
              name="sort_order"
              type="number"
              min={0}
              max={99999}
              defaultValue={task.sort_order}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={task.is_active}
              className="h-4 w-4"
            />
            <span>{t.checklistAdmin.active}</span>
          </label>
          {updateState.status === "error" && <FormError message={updateState.message} />}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {t.common.cancel}
            </button>
            <SaveBtn />
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm ${
            task.is_active
              ? "text-neutral-900 dark:text-neutral-100"
              : "text-neutral-400 line-through dark:text-neutral-500"
          }`}
        >
          {task.label}
        </p>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="font-mono">{task.task_key}</span> · #{task.sort_order}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {/* Toggle actif */}
        <form action={toggleChecklistTaskAction}>
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="active" value={String(!task.is_active)} />
          <button
            type="submit"
            className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition ${
              task.is_active
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                : "bg-neutral-100 text-neutral-600 ring-neutral-200 hover:bg-neutral-200"
            }`}
          >
            {task.is_active ? t.checklistAdmin.active : t.checklistAdmin.inactive}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-brand-700 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
        >
          {t.common.edit}
        </button>
        <form
          action={deleteChecklistTaskAction}
          onSubmit={(e) => {
            if (!confirm(t.checklistAdmin.confirmDelete)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={task.id} />
          <DeleteBtn />
        </form>
      </div>
    </li>
  );
}
