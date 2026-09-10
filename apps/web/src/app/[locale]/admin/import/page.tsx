'use client';

import { AdminShell } from '@/components/admin-shell';
import { api } from '@/lib/client';
import {
  CSV_TEMPLATES,
  buildCsvTemplate,
  toCsv,
  type BulkImportEntity,
  type BulkImportMode,
  type BulkImportResult,
} from '@poozari/shared';
import { useRef, useState } from 'react';

const ENTITY_TABS: { key: BulkImportEntity; label: string; icon: string; blurb: string }[] = [
  {
    key: 'pujas',
    label: 'Pujas',
    icon: '🪔',
    blurb: 'One row per listing, with up to three packages per row.',
  },
  {
    key: 'pandits',
    label: 'Pandits',
    icon: '👨‍🏫',
    blurb: 'One row per pandit. Each row creates a login plus their profile.',
  },
];

/** Trigger a browser download for generated CSV text. */
function downloadCsv(filename: string, csv: string) {
  // The BOM makes Excel open UTF-8 (Devanagari, rupee signs) correctly.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function AdminImportPage() {
  const [entity, setEntity] = useState<BulkImportEntity>('pujas');
  const [mode, setMode] = useState<BulkImportMode>('create');
  const [createMissingTags, setCreateMissingTags] = useState(false);
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [imported, setImported] = useState(false);
  const [busy, setBusy] = useState<'validate' | 'import' | null>(null);
  const [error, setError] = useState('');
  const [showColumns, setShowColumns] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const template = CSV_TEMPLATES[entity];
  const issues = result?.issues ?? [];
  const canImport = Boolean(csv) && Boolean(result) && issues.length === 0 && !busy;
  const generatedPasswords = (result?.rows ?? []).filter((row) => row.generatedPassword);

  function reset() {
    setCsv('');
    setFileName('');
    setResult(null);
    setImported(false);
    setError('');
    if (fileInput.current) fileInput.current.value = '';
  }

  function switchEntity(next: BulkImportEntity) {
    if (next === entity) return;
    setEntity(next);
    setCreateMissingTags(false);
    reset();
  }

  async function run(text: string, dryRun: boolean) {
    setBusy(dryRun ? 'validate' : 'import');
    setError('');
    try {
      const payload = { csv: text, mode, dryRun, createMissingTags };
      const next =
        entity === 'pujas'
          ? await api.adminImportPujas(payload)
          : await api.adminImportPandits(payload);
      setResult(next);
      setImported(!next.dryRun);
    } catch (e: any) {
      setResult(null);
      setImported(false);
      setError(e.message ?? 'Could not read that file');
    } finally {
      setBusy(null);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setFileName(file.name);
    setCsv(text);
    setImported(false);
    await run(text, true);
  }

  return (
    <AdminShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          Bulk Import
        </h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Download the template, fill it in, upload it back.
        </p>
      </div>

      {/* Entity tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {ENTITY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchEntity(tab.key)}
            className={`rounded-2xl border px-5 py-2.5 text-2xs font-bold uppercase tracking-wider transition-colors ${
              entity === tab.key
                ? 'border-transparent bg-accent text-white shadow-sm'
                : 'bg-white text-muted-foreground hover:text-foreground'
            }`}
            style={entity === tab.key ? {} : { borderColor: 'hsl(var(--border) / 0.6)' }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ------------------------------ Left: steps ------------------------------ */}
        <div className="space-y-6 self-start">
          {/* Step 1 — template */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
                  1 · Download the template
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {ENTITY_TABS.find((tab) => tab.key === entity)?.blurb} Lists inside one cell are
                  separated with a <code className="font-bold">|</code> pipe.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="btn-primary text-2xs uppercase tracking-widest"
                onClick={() => downloadCsv(template.filename, buildCsvTemplate(template))}
              >
                ⬇ Template with examples
              </button>
              <button
                className="btn-outline text-2xs uppercase tracking-wider"
                onClick={() =>
                  downloadCsv(
                    template.filename.replace('-template', '-headers'),
                    buildCsvTemplate(template, false),
                  )
                }
              >
                Headers only
              </button>
              <button
                className="btn-outline text-2xs uppercase tracking-wider"
                onClick={() => setShowColumns(!showColumns)}
              >
                {showColumns ? 'Hide' : 'Show'} column reference
              </button>
            </div>

            {showColumns ? (
              <div
                className="mt-4 overflow-x-auto rounded-2xl border"
                style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
              >
                <table className="w-full text-left text-2xs">
                  <thead className="bg-gray-50">
                    <tr className="text-3xs font-extrabold uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2">Column</th>
                      <th className="px-3 py-2">What goes in it</th>
                    </tr>
                  </thead>
                  <tbody>
                    {template.columns.map((column) => (
                      <tr
                        key={column.key}
                        className="border-t"
                        style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
                      >
                        <td className="whitespace-nowrap px-3 py-2 align-top">
                          <span className="font-bold text-foreground">{column.key}</span>
                          {column.required ? (
                            <span className="ml-1.5 font-bold text-accent">*</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{column.hint || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          {/* Step 2 — options + upload */}
          <div className="card p-6">
            <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
              2 · Upload the filled sheet
            </h3>

            <div className="mt-4 space-y-4">
              <div>
                <label className="label">If a row already exists</label>
                <select
                  className="input"
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value as BulkImportMode);
                    setResult(null);
                    setImported(false);
                  }}
                >
                  <option value="create">Reject the file (create new only)</option>
                  <option value="upsert">Update it in place (create + update)</option>
                </select>
                <p className="mt-1.5 text-3xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {entity === 'pujas'
                    ? 'Matched on slug. An update writes only the columns your sheet has — leave a column out to keep its current value.'
                    : 'Matched on login email. An update writes only the columns your sheet has; leave the password column out to keep their current one.'}
                </p>
              </div>

              {entity === 'pujas' ? (
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[hsl(var(--accent))]"
                    checked={createMissingTags}
                    onChange={(e) => {
                      setCreateMissingTags(e.target.checked);
                      setResult(null);
                      setImported(false);
                    }}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Create missing deities / festivals / benefits
                    <span className="mt-0.5 block text-3xs font-semibold normal-case tracking-normal text-muted-foreground">
                      Off means an unknown tag is reported as an error instead. Cities and temples
                      are never created here.
                    </span>
                  </span>
                </label>
              ) : null}

              <div>
                <label className="label">CSV file</label>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".csv,text/csv"
                  className="input py-2 text-xs"
                  onChange={(e) => void onFile(e.target.files?.[0])}
                />
                {fileName ? (
                  <p className="mt-1.5 text-3xs font-bold uppercase tracking-wider text-muted-foreground">
                    {fileName} · {(csv.length / 1024).toFixed(1)} KB
                  </p>
                ) : null}
              </div>

              {csv ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-outline text-2xs uppercase tracking-wider"
                    onClick={() => void run(csv, true)}
                    disabled={Boolean(busy)}
                  >
                    {busy === 'validate' ? 'Checking…' : '↻ Re-check'}
                  </button>
                  <button className="btn-outline text-2xs uppercase tracking-wider" onClick={reset}>
                    ✕ Clear
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Step 3 — commit */}
          <div className="card p-6">
            <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
              3 · Import
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Every row is checked first. Nothing is written unless the whole file is clean, so a
              rejected file never leaves a half-import behind.
            </p>
            <button
              className="btn-primary mt-4 w-full text-2xs uppercase tracking-widest"
              onClick={() => void run(csv, false)}
              disabled={!canImport || imported}
            >
              {busy === 'import'
                ? 'Importing…'
                : imported
                  ? '✓ Imported'
                  : result
                    ? `Import ${result.rows.length} row${result.rows.length === 1 ? '' : 's'}`
                    : 'Import'}
            </button>
          </div>
        </div>

        {/* ------------------------------ Right: results ------------------------------ */}
        <div className="space-y-4">
          {error ? (
            <div className="card border-red-200 bg-red-50 p-4">
              <p className="text-xs font-bold text-red-700">{error}</p>
            </div>
          ) : null}

          {!result && !error ? (
            <div className="card p-10 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Upload a file to see the check results here.
              </p>
            </div>
          ) : null}

          {result ? (
            <>
              <div className="card p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
                    {imported ? '✓ Imported' : issues.length ? '⚠ Fix these first' : '✓ Ready to import'}
                  </h3>
                  <span className="badge bg-gray-100 text-gray-700">
                    {result.totalRows} row{result.totalRows === 1 ? '' : 's'} read
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <Stat label={imported ? 'Created' : 'To create'} value={result.created} />
                  <Stat label={imported ? 'Updated' : 'To update'} value={result.updated} />
                  <Stat label="Errors" value={issues.length} tone={issues.length ? 'bad' : 'ok'} />
                </div>
                {result.createdTags.length ? (
                  <p className="mt-4 rounded-2xl bg-blue-50 p-3 text-xs text-blue-800">
                    {imported ? 'Created' : 'Will create'} {result.createdTags.length} new tag
                    {result.createdTags.length === 1 ? '' : 's'}: {result.createdTags.join(', ')}
                  </p>
                ) : null}
                {imported && generatedPasswords.length ? (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-4">
                    <p className="text-xs font-bold text-amber-900">
                      {generatedPasswords.length} password
                      {generatedPasswords.length === 1 ? ' was' : 's were'} generated. Save them now
                      — they are not shown again.
                    </p>
                    <button
                      className="btn-outline mt-3 text-2xs uppercase tracking-wider"
                      onClick={() =>
                        downloadCsv(
                          'poozari-pandit-logins.csv',
                          toCsv([
                            ['displayName', 'email', 'password'],
                            ...generatedPasswords.map((row) => [
                              row.label,
                              row.slug ?? '',
                              row.generatedPassword ?? '',
                            ]),
                          ]),
                        )
                      }
                    >
                      ⬇ Download logins
                    </button>
                  </div>
                ) : null}
              </div>

              {issues.length ? (
                <div className="card p-6">
                  <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
                    Errors ({issues.length})
                  </h3>
                  <div className="mt-4 max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-2xs">
                      <thead>
                        <tr className="text-3xs font-extrabold uppercase tracking-wider text-muted-foreground">
                          <th className="pb-2 pr-3">Row</th>
                          <th className="pb-2 pr-3">Column</th>
                          <th className="pb-2">Problem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issues.map((issue, index) => (
                          <tr
                            key={`${issue.row}-${issue.column}-${index}`}
                            className="border-t"
                            style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
                          >
                            <td className="whitespace-nowrap py-2 pr-3 font-bold text-foreground">
                              {issue.row || '—'}
                            </td>
                            <td className="whitespace-nowrap py-2 pr-3 font-semibold text-accent">
                              {issue.column ?? '—'}
                            </td>
                            <td className="py-2 text-muted-foreground">{issue.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {result.rows.length ? (
                <div className="card p-6">
                  <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
                    {imported ? 'Imported rows' : 'Preview'} ({result.rows.length})
                  </h3>
                  <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
                    {result.rows.map((row) => (
                      <div
                        key={`${row.row}-${row.slug ?? row.label}`}
                        className="flex items-start justify-between gap-3 border-t pt-2 first:border-0 first:pt-0"
                        style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-3xs font-bold text-muted-foreground">
                              Row {row.row}
                            </span>
                            <span className="text-xs font-bold text-foreground">{row.label}</span>
                            <span
                              className={`badge ${
                                row.action === 'create'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {row.action === 'create' ? 'New' : 'Update'}
                            </span>
                          </div>
                          <div className="mt-0.5 text-3xs font-semibold text-muted-foreground">
                            {row.slug ? `${row.slug} · ` : ''}
                            {row.detail}
                          </div>
                        </div>
                        {imported && row.generatedPassword ? (
                          <code className="shrink-0 rounded-lg bg-amber-50 px-2 py-1 text-3xs font-bold text-amber-900">
                            {row.generatedPassword}
                          </code>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'bad' }) {
  return (
    <div
      className="rounded-2xl border p-3 text-center"
      style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
    >
      <div
        className={`font-display text-xl font-black ${
          tone === 'bad' ? 'text-red-600' : 'text-accent'
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-3xs font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
