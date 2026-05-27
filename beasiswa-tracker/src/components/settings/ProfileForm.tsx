'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { User } from 'lucide-react';

interface Props {
  userId: string;
  initialName: string | null;
  initialUniversity: string | null;
}

export default function ProfileForm({ userId, initialName, initialUniversity }: Props) {
  const supabase = createClient();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(initialName ?? '');
  const [university, setUniversity] = useState(initialUniversity ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:  fullName.trim() || null,
        university: university.trim() || null,
      })
      .eq('id', userId);

    if (error) {
      console.error('[ProfileForm]', error.message);
      toast('Gagal menyimpan profil.', 'error');
    } else {
      toast('Profil berhasil disimpan.');
    }

    setSaving(false);
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center" aria-hidden="true">
          <User className="w-5 h-5 text-brand-600" />
        </div>
        <h2 className="font-semibold text-gray-900">Informasi Profil</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="profile-name" className="label">Nama Lengkap</label>
          <input
            id="profile-name"
            type="text"
            className="input"
            placeholder="Ahmad Fauzi"
            maxLength={100}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="profile-university" className="label">
            Universitas <span className="text-gray-400 font-normal">(opsional)</span>
          </label>
          <input
            id="profile-university"
            type="text"
            className="input"
            placeholder="Universitas Indonesia"
            maxLength={100}
            value={university}
            onChange={e => setUniversity(e.target.value)}
            autoComplete="organization"
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </div>
      </form>
    </div>
  );
}
