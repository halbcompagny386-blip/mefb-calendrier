import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useRole = () => {
  const [userProfile, setUserProfile] = useState<{role: string, full_name: string} | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();
      setUserProfile(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRole();
  }, []);

  return { 
    role: loading ? null : (userProfile?.role || 'observateur'), 
    fullName: userProfile?.full_name,
    loading 
  };
};