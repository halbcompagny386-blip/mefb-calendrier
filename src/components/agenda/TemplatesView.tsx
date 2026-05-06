import React, { useState } from 'react';
import { 
  FileText, Trash2, Facebook, Linkedin, 
  Twitter, Youtube, Globe, Sparkles
} from 'lucide-react';
import { CommTemplate } from '../../types';
import AddTemplateModal from './modals/AddTemplateModal';

interface TemplatesViewProps {
  templates: CommTemplate[];
  onUseTemplate: (template: CommTemplate, platform: string) => void;
  onDeleteTemplate: (id: string) => void;
  userRole?: string;
}


export const TemplatesView = ({ templates, onUseTemplate, onDeleteTemplate, userRole }: TemplatesViewProps) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [localTemplates, setLocalTemplates] = useState<CommTemplate[]>(templates);
  const canAddModel = userRole === 'Super_Admin' || userRole === 'Admin';

  // Ajout d'un modèle dans l'état local
  const handleAddTemplate = (tpl: Omit<CommTemplate, 'id'>) => {
    const newTemplate: CommTemplate = {
      ...tpl,
      id: 'tpl-' + (Date.now() + Math.floor(Math.random() * 1000)),
    };
    setLocalTemplates([newTemplate, ...localTemplates]);
  };

  // Configuration des réseaux sociaux du Ministère avec icônes correctes
  const platforms = [
    { id: 'facebook', icon: <Facebook size={16} />, label: 'Facebook', description: 'Texte narratif + hashtags' },
    { id: 'linkedin', icon: <Linkedin size={16} />, label: 'LinkedIn', description: 'Impact économique' },
    { id: 'x', icon: <Twitter size={16} />, label: 'X / Twitter', description: 'Court & percutant (280 car)' },
    { id: 'web', icon: <Globe size={16} />, label: 'Site Web', description: 'Style journalistique' },
  ];

  const handlePlatformSelect = (templateId: string, platformId: string) => {
    setSelectedPlatforms(prev => ({ ...prev, [templateId]: platformId }));
  };

  // SÉCURITÉ : Si aucun modèle n'est trouvé dans constants.ts
  if (!templates || templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <FileText size={32} className="text-slate-200" />
        </div>
        <p className="text-slate-400 font-black uppercase text-xs tracking-widest italic text-center">
          La bibliothèque est vide.<br/>Vérifiez l'export COMM_TEMPLATES dans constants.ts
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700" id="bibliotheque-modeles" data-section="templates-library" tabIndex={-1}>
      {/* Header Interne */}
      <div className="px-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
            <Sparkles className="text-[#175a95]" /> Bibliothèque de Modèles
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
            Génération de contenus assistée par IA pour le Cabinet - Sélectionnez une plateforme avant de rédiger
          </p>
        </div>
        {canAddModel && (
          <button
            className="bg-[#175a95] text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-blue-800 transition-all"
            onClick={() => setShowAddModal(true)}
          >
            + Ajouter un modèle
          </button>
        )}
      </div>
      {showAddModal && (
        <AddTemplateModal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)} 
          onAdd={handleAddTemplate}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {localTemplates.map((template) => {
          const currentPlatform = selectedPlatforms[template.id] || 'facebook';

          return (
            <div 
              key={template.id} 
              className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col h-full relative"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-[#175a95]/10 rounded-2xl flex items-center justify-center group-hover:bg-[#175a95] transition-colors">
                  <FileText className="w-6 h-6 text-[#175a95] group-hover:text-white" />
                </div>
                <button
                  onClick={() => onDeleteTemplate(template.id)}
                  className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Titre en Noir Profond pour lisibilité MEFB */}
              <h4 className="font-black text-slate-900 text-lg mb-4 uppercase tracking-tighter leading-tight">
                {template.title}
              </h4>
              
              <div className="mb-6">
                <label className="text-[9px] font-black text-[#175a95] uppercase tracking-[0.2em] mb-3 block italic">Sélectionnez une plateforme :</label>
                <div className="grid grid-cols-2 gap-2">
                  {platforms.map((p) => {
                    const isSelected = currentPlatform === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handlePlatformSelect(template.id, p.id)}
                        className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 justify-center text-left ${
                          isSelected
                          ? 'bg-[#175a95] border-[#175a95] text-white shadow-lg'
                          : 'bg-white border-slate-100 text-slate-600 hover:border-[#175a95]'
                        }`}
                        title={p.description}
                      >
                        <span className="text-lg">{p.icon}</span>
                        <span className="text-[9px] font-black uppercase hidden sm:block">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                <p className="text-[11px] text-slate-600 leading-relaxed font-bold">
                  <span className="text-[#175a95] uppercase font-black">{platforms.find(p => p.id === currentPlatform)?.label || 'Facebook'}</span>
                  <br />
                  <span className="text-[10px] italic">{platforms.find(p => p.id === currentPlatform)?.description}</span>
                </p>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-4">
                {/* Hashtags spécifiques à la plateforme */}
                <div className="text-[8px] text-slate-500 font-bold">
                  {currentPlatform === 'facebook' && "🏷️ #MEFBGuinee #FinancesGN #Simandou2040"}
                  {currentPlatform === 'linkedin' && "🏷️ #MEFBGuinee #ReformeEconomique #Simandou2040"}
                  {currentPlatform === 'x' && "🏷️ #MEFBGuinee #Guinee #Simandou"}
                  {currentPlatform === 'web' && "🏷️ #MEFBGuinee #Simandou2040"}
                </div>
                <button
                  onClick={() => onUseTemplate(template, currentPlatform)}
                  className="w-full px-6 py-4 bg-[#175a95] text-white text-[10px] font-black uppercase rounded-xl hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/10 flex items-center justify-center gap-2"
                >
                  <Sparkles size={14} /> Rédiger pour {platforms.find(p => p.id === currentPlatform)?.label}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};