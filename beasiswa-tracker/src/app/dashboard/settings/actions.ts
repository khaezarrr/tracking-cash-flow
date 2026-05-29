'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createBudgetAction(amount: number, startDate: string) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('create_budget', {
    p_amount:     amount,
    p_start_date: startDate,
  });

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/expenses');

  return data;
}
