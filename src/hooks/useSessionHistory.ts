import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

export type ECGSession = Tables<'ecg_sessions'>;

export const useSessionHistory = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ECGSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('ecg_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false });

    if (!error && data) {
      setSessions(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('ecg_sessions_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ecg_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSessions((prev) => [payload.new as ECGSession, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setSessions((prev) =>
              prev.map((s) => (s.id === (payload.new as ECGSession).id ? (payload.new as ECGSession) : s))
            );
          } else if (payload.eventType === 'DELETE') {
            setSessions((prev) => prev.filter((s) => s.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const deleteSession = useCallback(async (id: string) => {
    const { error } = await supabase.from('ecg_sessions').delete().eq('id', id);
    return { error };
  }, []);

  return { sessions, loading, refetch: fetchSessions, deleteSession };
};
