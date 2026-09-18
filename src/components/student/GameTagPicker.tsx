"use client";

import { useEffect, useMemo, useState } from 'react';
import { getGameTags, getMemberGame } from '../../../lib/database';
import { GameTag, GameTagCategory, GAME_TAG_CATEGORIES, GAME_TAG_CATEGORY_LABELS } from '../../../lib/types';

interface SelectedTag {
  tagId: string;
  priority: number;
}

export default function GameTagPicker({ memberId }: { memberId: string }) {
  const [allTags, setAllTags] = useState<GameTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedTag[]>([]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedOnce, setSavedOnce] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getGameTags(), getMemberGame(memberId)])
      .then(([tags, current]) => {
        if (cancelled) return;
        setAllTags(tags);
        if (current.length > 0) {
          setSelected(current.map((c) => ({ tagId: c.tag_id, priority: c.priority })));
          setSavedOnce(true);
        }
      })
      .catch((err) => console.error('Erro loading game tags:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [memberId]);

  const tagsByCategory = useMemo(() => {
    const map = new Map<GameTagCategory, GameTag[]>();
    GAME_TAG_CATEGORIES.forEach((c) => map.set(c, []));
    allTags.forEach((tag) => map.get(tag.category)?.push(tag));
    return map;
  }, [allTags]);

  const selectedTagIds = useMemo(() => new Set(selected.map((s) => s.tagId)), [selected]);
  const orderedSelected = useMemo(() => [...selected].sort((a, b) => a.priority - b.priority), [selected]);
  const canSave = selected.length >= 4 && selected.length <= 5;

  const toggleTag = (tagId: string) => {
    setError('');
    setSelected((prev) => {
      const exists = prev.some((s) => s.tagId === tagId);
      if (exists) {
        const next = prev.filter((s) => s.tagId !== tagId).sort((a, b) => a.priority - b.priority);
        return next.map((s, i) => ({ tagId: s.tagId, priority: i + 1 }));
      }
      if (prev.length >= 5) {
        setError('Só podes escolher até 5 tags — remove uma para adicionar outra.');
        return prev;
      }
      return [...prev, { tagId, priority: prev.length + 1 }];
    });
  };

  const setPriority = (tagId: string, priority: number) => {
    setSelected((prev) => {
      const current = prev.find((s) => s.tagId === tagId);
      if (!current) return prev;
      const swapWith = prev.find((s) => s.priority === priority);
      return prev.map((s) => {
        if (s.tagId === tagId) return { ...s, priority };
        if (swapWith && s.tagId === swapWith.tagId) return { ...s, priority: current.priority };
        return s;
      });
    });
  };

  const labelFor = (tagId: string) => allTags.find((t) => t.id === tagId)?.label || '';

  const handleSave = async () => {
    if (!canSave) {
      setError('Escolhe entre 4 e 5 tags antes de guardar.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/student/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, tags: selected.map((s) => ({ tagId: s.tagId, priority: s.priority })) }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || 'Falha ao guardar.');
      setSavedOnce(true);
    } catch (err: any) {
      setError(err?.message || 'Falha ao guardar. Tenta novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-zinc-500">A carregar...</p>;
  }

  return (
    <div>
      <p className="mb-1 text-sm text-zinc-400">
        Escolhe 4 a 5 técnicas que definem o teu jogo, depois ordena-as por importância (1 = mais importante).
      </p>
      <p className="mb-4 text-xs text-zinc-500">
        {selected.length}/5 selecionadas{selected.length < 4 ? ' (mínimo 4)' : ''}
      </p>

      {error ? (
        <div className="mb-4 rounded-xl border border-[#5b1f24] bg-[#2a1214] px-4 py-2.5 text-sm text-rose-300">{error}</div>
      ) : null}

      <div className="space-y-3">
        {GAME_TAG_CATEGORIES.map((category) => {
          const tags = tagsByCategory.get(category) || [];
          const isOpen = openCategories[category] ?? true;
          const selectedInCategory = tags.filter((t) => selectedTagIds.has(t.id)).length;
          return (
            <div key={category} className="rounded-xl border border-[#222] bg-[#171717]">
              <button
                type="button"
                onClick={() => setOpenCategories((prev) => ({ ...prev, [category]: !isOpen }))}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-zinc-100">
                  {GAME_TAG_CATEGORY_LABELS[category]}
                  {selectedInCategory > 0 ? (
                    <span className="ml-2 text-xs font-normal text-[#c81d25]">
                      {selectedInCategory} selecionada{selectedInCategory > 1 ? 's' : ''}
                    </span>
                  ) : null}
                </span>
                <span className="text-zinc-500">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen ? (
                <div className="max-h-56 overflow-y-auto border-t border-[#222] px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const isSelected = selectedTagIds.has(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`rounded-full border px-3 py-1.5 text-sm transition ${
                            isSelected
                              ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white'
                              : 'border-[#2a2a2a] bg-[#111] text-zinc-400 hover:border-[#3a3a3a] hover:text-zinc-200'
                          }`}
                        >
                          {tag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {selected.length > 0 ? (
        <div className="mt-5">
          <p className="mb-2 text-xs uppercase tracking-[0.12em] text-zinc-500">Ordem de importância</p>
          <ul className="space-y-2">
            {orderedSelected.map((s) => (
              <li key={s.tagId} className="flex items-center gap-3 rounded-xl border border-[#202020] bg-[#111] px-3 py-2">
                <select
                  value={s.priority}
                  onChange={(e) => setPriority(s.tagId, Number(e.target.value))}
                  className="rounded-lg border border-[#2a2a2a] bg-[#171717] px-2 py-1 text-sm text-zinc-100 outline-none"
                >
                  {selected.map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <span className="flex-1 text-sm text-zinc-200">{labelFor(s.tagId)}</span>
                <button type="button" onClick={() => toggleTag(s.tagId)} className="text-xs text-zinc-500 hover:text-rose-400">
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
          className="rounded-xl border border-[#c81d25] bg-[#c81d25] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'A guardar...' : savedOnce ? 'Atualizar O Meu Jogo' : 'Guardar O Meu Jogo'}
        </button>
      </div>
    </div>
  );
}
