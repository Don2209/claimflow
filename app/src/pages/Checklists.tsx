import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api';
import type { ShellContext } from '../Shell';
import { Button, inputClass, Loading, Notice, PageTitle, Sheet, useLoad } from '../ui';

type Item = { type: string; required: boolean };
type Cls = { id: string; name: string; items: Item[] };

export function Checklists() {
  const { user, meta, reloadMeta } = useOutletContext<ShellContext>();
  const { data, error, reload } = useLoad(() => api<Cls[]>('/classes'));
  const [name, setName] = useState('');
  const [problem, setProblem] = useState('');
  if (error) return <Notice tone="danger">{error}</Notice>;
  if (!data) return <Loading />;
  const canEdit = user.role === 'manager';

  async function add(event: FormEvent) {
    event.preventDefault();
    try {
      await api('/classes', { body: { name } });
      setName('');
      setProblem('');
      await reload();
      reloadMeta();
    } catch (err) {
      setProblem((err as Error).message);
    }
  }

  return (
    <>
      <PageTitle title="Checklists" />
      <p className="mb-4 max-w-prose text-small text-muted">{canEdit ? 'Your rules for each class of business. A change applies to every open file straight away.' : 'Your rules for each class of business. A manager can change them.'}</p>
      {canEdit && (
        <form onSubmit={add} className="mb-4 flex max-w-md gap-2">
          <input aria-label="New class of business" className={inputClass} placeholder="New class of business" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit"><Plus className="size-4" aria-hidden="true" /> Add</Button>
        </form>
      )}
      {problem && <div className="mb-4"><Notice tone="danger">{problem}</Notice></div>}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {data.map((cls) => <Editor key={cls.id} cls={cls} types={meta.documentTypes} canEdit={canEdit} />)}
      </div>
    </>
  );
}

function Editor({ cls, types, canEdit }: { cls: Cls; types: Record<string, string>; canEdit: boolean }) {
  const [items, setItems] = useState(cls.items);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const save = (next: Item[]) => {
    setItems(next);
    api(`/classes/${cls.id}/checklist`, { method: 'PUT', body: next }).then(() => { setSaved('Saved'); setError(''); }, (err) => setError(err.message));
  };
  const move = (index: number, by: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    save(next);
  };
  const unused = Object.keys(types).filter((type) => !items.some((item) => item.type === type));
  return (
    <Sheet title={cls.name} aside={saved && <span className="text-caption font-semibold text-ok" role="status">{saved}</span>}>
      {error && <Notice tone="danger">{error}</Notice>}
      <ul className="grid gap-1">
        {items.map((item, index) => (
          <li key={item.type} className="flex min-h-10 items-center gap-2 text-small">
            <span className="min-w-0 flex-1 truncate">{types[item.type] ?? item.type}</span>
            {canEdit ? (
              <>
                <label className="flex items-center gap-1.5 text-caption">
                  <input type="checkbox" className="size-4 accent-[rgb(var(--accent))]" checked={item.required} onChange={(e) => save(items.map((other) => (other.type === item.type ? { ...other, required: e.target.checked } : other)))} /> Required
                </label>
                <button type="button" aria-label={`Move ${types[item.type]} up`} disabled={!index} onClick={() => move(index, -1)} className="grid size-8 place-items-center rounded-md hover:bg-sunken disabled:opacity-30"><ArrowUp className="size-4" aria-hidden="true" /></button>
                <button type="button" aria-label={`Move ${types[item.type]} down`} disabled={index === items.length - 1} onClick={() => move(index, 1)} className="grid size-8 place-items-center rounded-md hover:bg-sunken disabled:opacity-30"><ArrowDown className="size-4" aria-hidden="true" /></button>
                <button type="button" aria-label={`Remove ${types[item.type]}`} onClick={() => save(items.filter((other) => other.type !== item.type))} className="grid size-8 place-items-center rounded-md hover:bg-sunken"><X className="size-4" aria-hidden="true" /></button>
              </>
            ) : <span className="text-caption text-muted">{item.required ? 'Required' : 'Optional'}</span>}
          </li>
        ))}
      </ul>
      {canEdit && (
        <select aria-label={`Add a document to ${cls.name}`} className={`${inputClass} mt-2`} value="" onChange={(e) => e.target.value && save([...items, { type: e.target.value, required: true }])}>
          <option value="">Add a document</option>
          {unused.map((type) => <option key={type} value={type}>{types[type]}</option>)}
        </select>
      )}
    </Sheet>
  );
}
