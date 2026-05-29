'use client';

import { Plus, ChevronDown } from 'lucide-react';
import { type Expense } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';
import { useExpenses } from '@/hooks/useExpenses';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import ExpenseTable from '@/components/expenses/ExpenseTable';
import ExpenseFilters from '@/components/expenses/ExpenseFilters';
import ConfirmModal from '@/components/ConfirmModal';

interface Props {
  initialExpenses: Expense[];
  userId: string;
  totalCount: number;
  pageSize: number;
  activeBudgetStartDate: string | null;
}

export default function ExpenseManager({ initialExpenses, userId, totalCount, pageSize, activeBudgetStartDate }: Props) {
  const {
    expenses, filtered, totalFiltered, serverTotal, fetchOffset, optimisticIds, hasMore,
    showForm, editTarget, submitting, deleteTarget, deleting, loadingMore, search, filterCat,
    openAddForm, openEditForm, closeForm, setDeleteTarget, cancelDelete,
    handleSubmit, handleDelete, handleLoadMore, setSearch, setFilterCat,
  } = useExpenses({ initialExpenses, userId, totalCount, pageSize, activeBudgetStartDate });
