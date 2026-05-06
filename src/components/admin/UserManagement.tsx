import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { User, Shield, CheckCircle, RefreshCcw, AlertCircle, Trash2, X } from 'lucide-react';
import { normalizeRole, useAuth } from '../../hooks/useSupabaseAuth';

const roleOptions = [
  { value: 'Guest', label: 'Observateur' },
  { value: 'Communication', label: 'Service Communication' },
  { value: 'Cabinet', label: 'Cabinet' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Super_Admin', label: 'Super Admin' }
];

export const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const { profile: currentProfile, refreshProfile, retryAuth } = useAuth();

  const fetchUsers = async () => {
    if (!window.navigator.onLine) {
      console.warn('fetchUsers aborted: offline');
      setNotification({ type: 'error', msg: 'Pas de connexion internet. Vérifiez votre réseau.' });
      return;
    }

    setLoading(true);
    try {
      console.groupCollapsed('UserManagement.fetchUsers');
      console.log('Déclenchement du chargement des utilisateurs');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .order('full_name', { ascending: true });

      console.log('Supabase response', { data, error });

      if (error) {
        console.error('Erreur Supabase profiles:', error);

        if (error.code === 'PGRST301' || error.code === 'PGRST302') {
          setNotification({ type: 'error', msg: 'Session expirée. Tentative de reconnexion...' });
          await retryAuth?.();
        } else if (error.message) {
          setNotification({ type: 'error', msg: `Erreur Supabase : ${error.message}` });
        } else {
          setNotification({ type: 'error', msg: 'Erreur inconnue lors du chargement des utilisateurs.' });
        }

        return;
      }

      if (data) {
        setUsers(data.map((user: any) => ({
          ...user,
          role: normalizeRole(user.role)
        })));
      }
    } catch (err: any) {
      console.error('Exception lors du fetchUsers:', err);
      if (err?.message) {
        setNotification({ type: 'error', msg: `Erreur réseau / Supabase : ${err.message}` });
      } else {
        setNotification({ type: 'error', msg: 'Erreur inattendue lors du chargement des utilisateurs.' });
      }
    } finally {
      console.groupEnd();
      setLoading(false);
    }
  };

  const updateRole = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      // Appeler la fonction RPC sécurisée pour mettre à jour le rôle
      const { data, error: rpcError } = await supabase.rpc('update_user_role', {
        target_user_id: userId,
        new_role: newRole
      });

      if (rpcError) {
        console.error('Erreur RPC:', rpcError);
        setNotification({ 
          type: 'error', 
          msg: `❌ Erreur: ${rpcError.message}` 
        });
        setUpdatingId(null);
        return;
      }

      if (!data?.success) {
        console.error('Erreur de réponse RPC:', data?.error);
        setNotification({ 
          type: 'error', 
          msg: `❌ ${data?.error || 'Erreur lors de la mise à jour'}` 
        });
        setUpdatingId(null);
        return;
      }

      // Succès confirmé
      setNotification({ 
        type: 'success', 
        msg: `✅ Rôle mis à jour: ${newRole}` 
      });

      // Rafraîchir le profil de l'utilisateur actuel si c'est lui
      if (currentProfile?.id === userId) {
        await refreshProfile?.();
      }

      // Rafraîchir la liste après un court délai pour que Supabase soit à jour
      setTimeout(() => fetchUsers(), 500);

    } catch (err: any) {
      console.error('Exception:', err);
      setNotification({ 
        type: 'error', 
        msg: `❌ Erreur: ${err.message}` 
      });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    setDeletingId(userId);
    try {
      console.groupCollapsed('UserManagement.deleteUser');
      console.log('Suppression de l\'utilisateur:', userId);

      // Appeler la fonction RPC sécurisée pour supprimer l'utilisateur
      const { data, error: rpcError } = await supabase.rpc('delete_user_permanent', {
        target_user_id: userId
      });

      console.log('Réponse RPC delete_user_permanent:', { data, rpcError });

      if (rpcError) {
        console.error('Erreur RPC:', rpcError);
        setNotification({ 
          type: 'error', 
          msg: `❌ Erreur suppression: ${rpcError.message}` 
        });
        setDeletingId(null);
        setShowDeleteModal(false);
        return;
      }

      if (!data?.success) {
        console.error('Erreur de réponse RPC:', data?.error);
        setNotification({ 
          type: 'error', 
          msg: `❌ ${data?.error || 'Erreur lors de la suppression'}` 
        });
        setDeletingId(null);
        setShowDeleteModal(false);
        return;
      }

      // Succès confirmé
      setNotification({ 
        type: 'success', 
        msg: `✅ Utilisateur "${userName}" supprimé définitivement` 
      });

      // Rafraîchir si l'utilisateur actuel s'est supprimé lui-même
      if (currentProfile?.id === userId) {
        await refreshProfile?.();
      }

      // Rafraîchir la liste après un court délai
      setTimeout(() => {
        fetchUsers();
        setShowDeleteModal(false);
        setUserToDelete(null);
      }, 500);

    } catch (err: any) {
      console.error('Exception:', err);
      setNotification({ 
        type: 'error', 
        msg: `❌ Erreur: ${err.message}` 
      });
    } finally {
      console.groupEnd();
      setDeletingId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const openDeleteModal = (user: any) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 animate-in zoom-in duration-300">
      {/* Notification Toast */}
      {notification && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border-2 animate-in slide-in-from-top duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
            : 'bg-red-50 border-red-300 text-red-700'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle size={20} className="flex-shrink-0" />
          ) : (
            <AlertCircle size={20} className="flex-shrink-0" />
          )}
          <span className="text-sm font-bold">{notification.msg}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-sm font-black text-[#175a95] uppercase flex items-center gap-2">
            <Shield size={20} /> Administration des accès
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Gestion des privilèges du Ministère</p>
          <p className="text-[10px] text-slate-500 mt-2 max-w-xl">
            🔒 <span className="font-black text-amber-600">Nouveau:</span> Les nouveaux comptes sont créés avec le rôle <span className="font-black text-amber-600">Observateur (Guest)</span>. Attribuez-leur un rôle via le menu déroulant.
          </p>
        </div>
        <button onClick={fetchUsers} className="p-2 text-slate-400 hover:text-[#175a95] transition-all disabled:opacity-50" disabled={loading || updatingId !== null}>
          <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <User size={48} className="text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold text-sm mb-2">Aucun utilisateur trouvé</p>
            <p className="text-slate-300 text-xs max-w-xs">
              Si vous ne voyez pas d'utilisateurs, vérifiez votre connexion Supabase et les permissions RLS.
            </p>
            <button 
              onClick={fetchUsers}
              className="mt-4 px-4 py-2 bg-[#175a95] text-white rounded-lg text-xs font-bold hover:bg-[#1a6db3] transition-all"
            >
              Recharger
            </button>
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-[#175a95]/30 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <User size={24} className="text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">{user.full_name || user.id}</p>
                  {user.email && <p className="text-[10px] text-slate-400 font-medium">{user.email}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  {user.role === 'Guest' && (
                    <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full mb-1">
                      ⏳ En attente
                    </span>
                  )}
                  <select 
                    value={normalizeRole(user.role)}
                    onChange={(e) => updateRole(user.id, e.target.value)}
                    disabled={updatingId === user.id || deletingId === user.id}
                    className={`bg-white border-2 rounded-xl text-[10px] font-black uppercase px-4 py-2.5 outline-none transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      user.role === 'Guest' ? 'border-amber-300 focus:border-amber-500' : 'border-slate-100 focus:border-[#175a95]'
                    }`}
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {updatingId === user.id && (
                  <div className="w-5 h-5 border-2 border-[#175a95]/30 border-t-[#175a95] rounded-full animate-spin" />
                )}
                {deletingId === user.id && (
                  <div className="w-5 h-5 border-2 border-red-300/30 border-t-red-600 rounded-full animate-spin" />
                )}
                {currentProfile?.role === 'Super_Admin' && user.id !== currentProfile?.id && (
                  <button
                    onClick={() => openDeleteModal(user)}
                    disabled={deletingId === user.id || updatingId === user.id}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 group/del"
                    title="Supprimer cet utilisateur définitivement"
                  >
                    <Trash2 size={16} className="group-hover/del:text-red-700" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de suppression */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-slate-100 animate-in zoom-in duration-300">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            
            <h3 className="text-lg font-black text-slate-900 text-center mb-2">
              Supprimer l'utilisateur ?
            </h3>
            
            <p className="text-sm text-slate-600 text-center mb-2">
              Êtes-vous sûr de vouloir supprimer <span className="font-black text-red-600">{userToDelete.full_name || userToDelete.id}</span> définitivement ?
            </p>
            
            <p className="text-xs text-slate-500 text-center mb-6 p-3 bg-red-50 border border-red-200 rounded-xl">
              ⚠️ Cette action est <span className="font-black">irréversible</span>. Tous les données associées à cet utilisateur seront supprimées du système.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                disabled={deletingId === userToDelete.id}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <X size={16} /> Annuler
              </button>
              
              <button
                onClick={() => deleteUser(userToDelete.id, userToDelete.full_name || userToDelete.id)}
                disabled={deletingId === userToDelete.id}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingId === userToDelete.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} /> Supprimer définitivement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};