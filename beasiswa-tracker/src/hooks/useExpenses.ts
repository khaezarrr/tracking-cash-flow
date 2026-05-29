'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type Expense, type Category } from '@/lib/types';
import { useToast } from '@/components/Toast';
import {
  type ExpenseFormValues,
  validateAmount,
  sanitizeText,
} from '@/components/expenses/ExpenseForm';

interface UseExpensesOptions {
  initialExpenses: Expense[];
  userId: string;
  totalCount: number;
  pageSize: number;
  activeBudgetStartDate: string | null;
}

export function useExpenses({ initialExpenses, userId, totalCount, pageSize, activeBudgetStartDate }: UseExpensesOptions) {
  const supabase = createClient();
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [serverTotal, setServerTotal] = useState(totalCount);
  const [fetchOffset, setFetchOffset] = useState(initialExpenses.length);
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<Category | 'Semua'>('Semua');

  const filtered = useMemo(() => expenses.filter(e => {
    const matchSearch =
      search === '' ||
      e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'Semua' || e.category === filterCat;
    return matchSearch && matchCat;
  }), [expenses, search, filterCat]);

  const totalFiltered = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amount, 0),
    [filtered],
  );

  const realCount = expenses.filter(e => !e.id.startsWith('temp-')).length;
  const hasMore = realCount < serverTotal;

  function markOptimistic(id: string) {
    setOptimisticIds(prev => new Set(prev).add(id));
  }
  function unmarkOptimistic(id: string) {
    setOptimisticIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  function buildPayload(values: ExpenseFormValues, amount: number) {
    return {
      user_id: userId,
      amount,
      category: values.category,
      description: sanitizeText(values.description) || null,
      date: values.date,
    };
  }

  async function handleInsert(values: ExpenseFormValues, amount: number) {
    const tempId = `temp-${Date.now()}`;
    const payload = buildPayload(values, amount);
    const optimistic: Expense = {
      ...payload,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setExpenses(prev => [optimistic, ...prev]);
    markOptimistic(tempId);
    setShowForm(false);

    const { data, error } = await supabase.from('expenses').insert(payload).select().single();
    unmarkOptimistic(tempId);

    if (error) {
      console.error('[Insert expense]', error.message);
      setExpenses(prev => prev.filter(e => e.id !== tempId));
      toast('Gagal menambah pengeluaran. Coba lagi.', 'error');
    } else if (data) {
      setExpenses(prev => prev.map(e => e.id === tempId ? data : e));
      setServerTotal(prev => prev + 1);
      setFetchOffset(prev => prev + 1);
      toast('Pengeluaran berhasil ditambahkan.');
    }
  }

  async function handleUpdate(target: Expense, values: ExpenseFormValues, amount: number) {
    const payload = buildPayload(values, amount);
    const previous = expenses.find(e => e.id === target.id);
    const optimistic: Expense = { ...target, ...payload, updated_at: new Date().toISOString() };

    setExpenses(prev => prev.map(e => e.id === target.id ? optimistic : e));
    markOptimistic(target.id);
    setShowForm(false);
    setEditTarget(null);

    const { data, error } = await supabase
      .from('expenses').update(payload).eq('id', target.id).select().single();
    unmarkOptimistic(target.id);

    if (error) {
      console.error('[Update expense]', error.message);
      if (previous) setExpenses(prev => prev.map(e => e.id === target.id ? previous : e));
      toast('Gagal menyimpan perubahan. Perubahan dibatalkan.', 'error');
    } else if (data) {
      setExpenses(prev => prev.map(e => e.id === data.id ? data : e));
      toast('Pengeluaran berhasil diperbarui.');
    }
  }

  async function handleSubmit(values: ExpenseFormValues) {
    const amountResult = validateAmount(values.amount);
    if (!amountResult.valid) return;

    setSubmitting(true);
    if (editTarget) {
      await handleUpdate(editTarget, values, amountResult.value);
    } else {
      await handleInsert(values, amountResult.value);
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const backup = deleteTarget;
    const backupIndex = expenses.findIndex(e => e.id === backup.id);

    setExpenses(prev => prev.filter(e => e.id !== backup.id));
    setServerTotal(prev => prev - 1);
    setFetchOffset(prev => prev - 1);
    setDeleteTarget(null);

    const { error } = await supabase.from('expenses').delete().eq('id', backup.id);

    if (error) {
      console.error('[Delete expense]', error.message);
      setExpenses(prev => {
        const next = [...prev];
        next.splice(backupIndex, 0, backup);
        return next;
      });
      setServerTotal(prev => prev + 1);
      setFetchOffset(prev => prev + 1);
      toast('Gagal menghapus pengeluaran.', 'error');
    } else {
      toast('Pengeluaran dihapus.');
    }

    setDeleting(false);
  }

  async function handleLoadMore() {
    setLoadingMore(true);

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(fetchOffset, fetchOffset + pageSize - 1);

    if (activeBudgetStartDate) {
      query = query.gte('created_at', activeBudgetStartDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[LoadMore]', error.message);
      toast('Gagal memuat data tambahan.', 'error');
    } else if (data) {
      setExpenses(prev => [...prev, ...data]);
      setFetchOffset(prev => prev + data.length);
    }
    setLoadingMore(false);
  }

  function openAddForm() {
    setEditTarget(null);
    setShowForm(true);
  }

  function openEditForm(expense: Expense) {
    setEditTarget(expense);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
  }

  return {
    expenses,
    filtered,
    totalFiltered,
    serverTotal,
    fetchOffset,
    optimisticIds,
    hasMore,
    showForm,
    editTarget,
    submitting,
    deleteTarget,
    deleting,
    loadingMore,
    search,
    filterCat,
    openAddForm,
    openEditForm,
    closeForm,
    setDeleteTarget,
    cancelDelete: () => setDeleteTarget(null),
    handleSubmit,
    handleDelete,
    handleLoadMore,
    setSearch,
    setFilterCat,
  };
}
