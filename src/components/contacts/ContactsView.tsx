import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { UserPlus, Mail, Phone, Trash2, Search, Save } from 'lucide-react';

export const ContactsView = ({ showUpdateMessage }: { showUpdateMessage: (msg: string) => void }) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newContact, setNewContact] = useState({ nom: '', email: '', telephone: '' });

  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const { data, error } = await supabase.from('ministere_contacts').select('*').order('nom');
    if (!error) setContacts(data);
    setLoading(false);
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContactId) {
      const { error } = await supabase.from('ministere_contacts').update({
        nom: newContact.nom,
        email: newContact.email,
        telephone: newContact.telephone
      }).eq('id', editingContactId);
      
      if (!error) {
        showUpdateMessage("Contact mis à jour avec succès !");
        setNewContact({ nom: '', email: '', telephone: '' });
        setEditingContactId(null);
        fetchContacts();
      }
    } else {
      const { error } = await supabase.from('ministere_contacts').insert([newContact]);
      if (!error) {
        showUpdateMessage("Contact ajouté à l'annuaire !");
        setNewContact({ nom: '', email: '', telephone: '' });
        fetchContacts();
      }
    }
  };

  const handleEditContact = (contact: any) => {
    setNewContact({ nom: contact.nom, email: contact.email, telephone: contact.telephone });
    setEditingContactId(contact.id);
  };

  const deleteContact = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) {
      const { error } = await supabase.from('ministere_contacts').delete().eq('id', id);
      if (!error) {
        showUpdateMessage("Contact supprimé.");
        if (editingContactId === id) {
          setEditingContactId(null);
          setNewContact({ nom: '', email: '', telephone: '' });
        }
        fetchContacts();
      }
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
   <div className="p-8 space-y-8 bg-white min-h-screen">
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Annuaire du Cabinet</h2>
          <p className="text-sm text-slate-500 font-medium">Gérez les coordonnées des responsables pour les convocations IA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULAIRE D'AJOUT */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm h-fit">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black text-[#175a95] uppercase flex items-center gap-2">
              <UserPlus size={16} /> {editingContactId ? 'Modifier Responsable' : 'Nouveau Responsable'}
            </h3>
            {editingContactId && (
              <button 
                onClick={() => { setEditingContactId(null); setNewContact({ nom: '', email: '', telephone: '' }); }}
                className="text-[10px] text-rose-500 font-bold uppercase transition-all hover:underline"
              >
                Annuler
              </button>
            )}
          </div>
          <form onSubmit={handleAddContact} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Nom / Titre (ex: DG Trésor)</label>
              <input 
                type="text" required value={newContact.nom}
                onChange={e => setNewContact({...newContact, nom: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#175a95] transition-all text-sm font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Email</label>
              <input 
                type="email" value={newContact.email}
                onChange={e => setNewContact({...newContact, email: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#175a95] transition-all text-sm font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">WhatsApp (ex: 224622...)</label>
              <input 
                type="text" value={newContact.telephone}
                onChange={e => setNewContact({...newContact, telephone: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#175a95] transition-all text-sm font-bold"
              />
            </div>
            <button type="submit" className="w-full py-4 bg-[#175a95] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:shadow-[#175a95]/20 transition-all flex items-center justify-center gap-2">
              <Save size={16} /> {editingContactId ? 'Sauvegarder les modifications' : 'Enregistrer le contact'}
            </button>
          </form>
        </div>

        {/* LISTE DES CONTACTS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" placeholder="RECHERCHER UN RESPONSABLE..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] border border-slate-100 shadow-sm focus:ring-2 focus:ring-[#175a95] text-xs font-black"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredContacts.map(contact => (
              <div key={contact.id} className={`bg-white p-5 rounded-3xl border ${editingContactId === contact.id ? 'border-[#175a95] ring-2 ring-[#175a95]/20' : 'border-slate-100 hover:border-[#175a95]/30'} transition-all group shadow-sm`}>
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-black text-slate-800 uppercase text-sm">{contact.nom}</h4>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditContact(contact)} className="text-slate-300 hover:text-[#175a95] transition-colors" title="Modifier le contact">
                      <Save size={14} /> 
                    </button>
                    <button onClick={() => deleteContact(contact.id)} className="text-slate-300 hover:text-rose-500 transition-colors" title="Supprimer le contact">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Mail size={14} className="text-[#175a95]" /> {contact.email || 'Non renseigné'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Phone size={14} className="text-emerald-500" /> {contact.telephone || 'Non renseigné'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};