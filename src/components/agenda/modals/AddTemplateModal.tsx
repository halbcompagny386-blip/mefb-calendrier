import React, { useState } from 'react';
import { ActivityType } from '../../../types';

interface AddTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (tpl: { title: string; type: ActivityType; standardText: string; placeholders: string[] }) => void;
}

const activityTypes = Object.values(ActivityType);

const AddTemplateModal: React.FC<AddTemplateModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<string>(activityTypes[0]);
  const [isCustomType, setIsCustomType] = useState(false);
  const [customType, setCustomType] = useState('');
  const [standardText, setStandardText] = useState('');
  const [placeholders, setPlaceholders] = useState<string>('');
  const [referenceArticle, setReferenceArticle] = useState('');

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__custom__') {
      setIsCustomType(true);
      setType('');
    } else {
      setIsCustomType(false);
      setType(e.target.value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalType = isCustomType ? customType : type;
    if (onAdd) {
      onAdd({
        title,
        type: finalType as ActivityType,
        standardText,
        placeholders: placeholders.split(',').map(p => p.trim()).filter(Boolean),
        referenceArticle
      } as any);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-6">
        <h3 className="text-xl font-black text-slate-900 mb-4">Ajouter un modèle de communication</h3>
        <div>
          <label className="block text-xs font-bold mb-1">Titre</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Type d'activité</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={isCustomType ? '__custom__' : type}
            onChange={handleTypeChange}
            required
          >
            {activityTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value="__custom__">Autre (ajouter un type personnalisé)</option>
          </select>
          {isCustomType && (
            <input
              className="w-full border rounded-lg px-3 py-2 mt-2"
              value={customType}
              onChange={e => setCustomType(e.target.value)}
              placeholder="Nouveau type d'activité"
              required
            />
          )}
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Texte standard</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            value={standardText}
            onChange={e => setStandardText(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Placeholders (séparés par une virgule)</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={placeholders}
            onChange={e => setPlaceholders(e.target.value)}
            placeholder="DATE, LIEU, THEME"
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Modèle d'article de référence (optionnel)</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            value={referenceArticle}
            onChange={e => setReferenceArticle(e.target.value)}
            placeholder="Exemple d'article pour ce type d'activité"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-bold" onClick={onClose}>Annuler</button>
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#175a95] text-white font-bold">Ajouter</button>
        </div>
      </form>
    </div>
  );
};

export default AddTemplateModal;