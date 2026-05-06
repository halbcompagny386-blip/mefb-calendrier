import React, { useMemo, useState, useEffect } from 'react';
import {
  Archive, ChevronRight, FileText, Globe, Calendar, X,
  Search, Filter, CheckCircle, Clock, BookOpen,
  AlertCircle, Download, TrendingUp, Layers, Eye, Trash2, Sparkles
} from 'lucide-react';
import { EditorialActivity, PressArticle, WorkflowStatus, ActivityType } from '../../types';

interface ArchivesViewProps {
  activities: EditorialActivity[];
  pressArticles?: PressArticle[];
  publications?: any[];
  initialFilterType?: 'cabinet' | 'presse';
  recentCabinetActivities?: EditorialActivity[];
  onActivityClick: (activity: EditorialActivity | PressArticle) => void;
  onRestore: (id: string) => void;
  onRestorePress?: (id: string) => void;
  onDeleteAllDrafts?: () => void;
  pubCount?: number;
}

// --- Helpers ---
const WORKFLOW_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  'Publié':   { label: 'Publié',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200',     dot: 'bg-emerald-500' },
  'Validé':   { label: 'Validé',   color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',           dot: 'bg-blue-500' },
  'Soumis':   { label: 'Soumis',   color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',         dot: 'bg-amber-500' },
  'Brouillon':{ label: 'Brouillon',color: 'text-slate-600',   bg: 'bg-slate-100 border-slate-200',        dot: 'bg-slate-400' },
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  'Réunion de cabinet': Layers,
  'Audience':           Eye,
  'Signature':          FileText,
  'Conférence budgétaire (CNT)': TrendingUp,
  'Invitation officielle': BookOpen,
};

const getWorkflowCfg = (wf: string) =>
  WORKFLOW_CONFIG[wf] ?? { label: wf || 'Brouillon', color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200', dot: 'bg-slate-400' };

export const ArchivesView = ({
  activities,
  pressArticles = [],
  publications = [],
  initialFilterType = 'cabinet',
  recentCabinetActivities,
  onActivityClick,
  onRestore,
  onRestorePress,
  onDeleteAllDrafts,
  pubCount = 0,
}: ArchivesViewProps) => {
  const [filterType, setFilterType] = useState<'cabinet' | 'presse'>(initialFilterType);
  const [selectedPressDetail, setSelectedPressDetail] = useState<PressArticle | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<EditorialActivity | null>(null);
  const [selectedPublication, setSelectedPublication] = useState<any>(null);

  // ── Filtres Registre Cabinet ──────────────────────────────────────
  const [searchTerm, setSearchTerm]   = useState('');
  const [filterWf, setFilterWf]       = useState<string>('tous');
  const [filterType2, setFilterType2] = useState<string>('tous');

  useEffect(() => { setFilterType(initialFilterType); }, [initialFilterType]);

  const archivedPress = pressArticles.filter(art => art.status === 'archived');

  // ── Toutes les activités Cabinet (pas seulement archivées) ────────
  // "Activités Cabinet" = Registre complet de TOUTES les activités enregistrées
  const allCabinetActivities: EditorialActivity[] = useMemo(() => {
    // On prend : recentCabinetActivities si fourni (depuis Dashboard "Voir tout"), sinon toutes les activités
    const base = (recentCabinetActivities && recentCabinetActivities.length > 0)
      ? recentCabinetActivities
      : activities;
    return [...base].sort((a, b) => {
      const da = new Date(a.created_at || a.date || 0).getTime();
      const db = new Date(b.created_at || b.date || 0).getTime();
      return db - da;
    });
  }, [activities, recentCabinetActivities]);

  const filteredCabinet = useMemo(() => {
    // 🔒 Si le filtre est "Publié", afficher les publications + les activités publiées
    if (filterWf === 'Publié') {
      const publishedActivities = allCabinetActivities.filter(a => a.workflow === 'Publié');
      
      // Transformer les publications en format compatible
      const transformedPublications = publications
        .sort((a, b) => {
          const dateA = new Date(a.published_at || 0).getTime();
          const dateB = new Date(b.published_at || 0).getTime();
          return dateB - dateA;
        })
        .map((pub: any) => ({
          id: pub.id,
          title: `📢 ${pub.platform || 'Publication'} - ${pub.publisher_name || 'Source'}`,
          description: pub.summary || pub.ai_summary || 'Publication via ' + (pub.platform || 'réseau social'),
          date: pub.published_at ? new Date(pub.published_at).toLocaleDateString('fr-FR') : 'Date inconnue',
          workflow: 'Publié',
          type: 'Publication Digitale',
          location: pub.platform || '',
          _isPublication: true,
          _publicationData: pub
        }));

      // Combiner et filtrer par recherche
      const combined = [...publishedActivities, ...transformedPublications];
      return combined.filter(item => {
        const matchSearch =
          !searchTerm ||
          (item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           item.location?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchType = filterType2 === 'tous' || item.type === filterType2;
        return matchSearch && matchType;
      });
    }

    // Logique normale pour les autres filtres
    return allCabinetActivities.filter(a => {
      const matchSearch =
        !searchTerm ||
        a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchWf = filterWf === 'tous' || a.workflow === filterWf;
      const matchType = filterType2 === 'tous' || a.type === filterType2;
      return matchSearch && matchWf && matchType;
    });
  }, [allCabinetActivities, publications, searchTerm, filterWf, filterType2]);

  // ── Stats rapides (Calcul sur l'ensemble de l'historique de l'agenda) ──────────────────────
  const stats = useMemo(() => {
    return {
      total:     allCabinetActivities.length,
      publie:    pubCount, // Le compteur 'Publié' prend TOUTES les publications tracées du ministère (social_publications)
      valide:    allCabinetActivities.filter(a => a.workflow === 'Validé').length,
      soumis:    allCabinetActivities.filter(a => a.workflow === 'Soumis').length,
      brouillon: allCabinetActivities.filter(a => !a.workflow || a.workflow === 'Brouillon').length,
    };
  }, [allCabinetActivities, pubCount]);
  // ── Groupes Veille Presse (logique originale conservée) ──────────
  const archivedPressArticles = useMemo(
    () => pressArticles.filter((item) => item.status === 'archived'),
    [pressArticles]
  );

  const archivedPressCount = useMemo(
    () => archivedPressArticles.length,
    [archivedPressArticles]
  );

  const nonArchivedPressCount = useMemo(
    () => pressArticles.filter((item) => item.status !== 'archived').length,
    [pressArticles]
  );

  const parseDateString = (value: string | undefined): Date | null => {
    if (!value) return null;
    const trimmed = value.trim();
    const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);

    if (isoMatch) {
      const parsed = new Date(trimmed);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10);
      const month = parseInt(slashMatch[2], 10) - 1;
      const year = parseInt(slashMatch[3], 10);
      const parsed = new Date(year, month, day);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    const fallback = new Date(trimmed);
    return isNaN(fallback.getTime()) ? null : fallback;
  };

  const pressGroups = useMemo(() => {
    const groups: Record<string, Record<string, { items: any[]; sortKey: number }>> = {};
    archivedPressArticles.forEach((item) => {
      const dateField = item.date || (item as any).published_at || '';
      const parsedDate = parseDateString(dateField);
      let year = 'Sans date';
      let dayLabel = 'Date non précisée';
      let sortKey = 0;

      if (parsedDate) {
        year = parsedDate.getFullYear().toString();
        dayLabel = parsedDate.toLocaleString('fr-FR', { day: 'numeric', month: 'long' });
        sortKey = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()).getTime();
      }

      if (!groups[year]) groups[year] = {};
      if (!groups[year][dayLabel]) groups[year][dayLabel] = { items: [], sortKey };
      groups[year][dayLabel].items.push(item);
    });
    return groups;
  }, [archivedPressArticles]);

  const uniqueTypes = useMemo(() =>
    Array.from(new Set(allCabinetActivities.map(a => a.type).filter(Boolean))),
    [allCabinetActivities]
  );

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">

      {/* ════════════════ HEADER ════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-[#161e2d] p-8 rounded-[3rem] border border-slate-100 shadow-xl">
        <div className="space-y-1">
          <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
            Archives Nationales
          </h3>
          <p className="text-sm text-[#175a95] dark:text-sky-400 font-black flex items-center gap-2">
            <Archive size={14} /> Mémoire numérique du Cabinet MEFB
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10">
          <button
            onClick={() => setFilterType('cabinet')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
              filterType === 'cabinet' ? 'bg-[#175a95] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calendar size={14} /> Activités Cabinet
          </button>
          <button
            onClick={() => setFilterType('presse')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
              filterType === 'presse' ? 'bg-[#149308] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Globe size={14} /> Veille Presse
          </button>
        </div>
      </div>

      {/* ════════════ REGISTRE OFFICIEL DES ACTIVITÉS CABINET ════════════ */}
      {filterType === 'cabinet' && (
        <div className="space-y-6">

          {/* ── Bandeau titre registre ── */}
          <div className="bg-gradient-to-r from-[#175a95] to-[#0f4070] rounded-[2rem] p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div>
              <h4 className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                <BookOpen size={20} /> Registre Officiel des Activités
              </h4>
              <p className="text-[11px] text-blue-200 mt-1 font-bold">
                Historique complet et traçable de toutes les activités enregistrées du Cabinet MEFB
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black">{stats.total}</span>
              <span className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em]">Activités<br/>enregistrées</span>
            </div>
          </div>

          {/* ── Stats mini ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Publiées', value: stats.publie, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
              { label: 'Validées', value: stats.valide, icon: CheckCircle, color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100' },
              { label: 'Soumises', value: stats.soumis, icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
              { label: 'Brouillons', value: stats.brouillon, icon: AlertCircle, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-100' },
            ].map((s, i) => (
              <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl border ${s.bg}`}>
                <s.icon size={22} className={s.color} />
                <div>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Barre de recherche + Filtres ── */}
          <div className="bg-white dark:bg-[#161e2d] rounded-[2rem] border border-slate-100 dark:border-white/5 p-5 flex flex-col md:flex-row gap-4">
            {/* Recherche */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                type="text"
                placeholder="Rechercher une activité, un lieu, une description..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-[#0a0f1d] rounded-2xl text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500 font-bold outline-none border border-transparent focus:border-[#175a95]/30 transition-all"
              />
            </div>

            {/* Filtre workflow */}
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <select
                value={filterWf}
                onChange={e => setFilterWf(e.target.value)}
                className="bg-slate-50 dark:bg-[#0a0f1d] rounded-2xl px-4 py-3 text-[10px] font-black uppercase outline-none border border-transparent focus:border-[#175a95]/30 text-slate-700 dark:text-slate-200"
              >
                <option value="tous">Tous les statuts</option>
                {Object.keys(WORKFLOW_CONFIG).map(wf => (
                  <option key={wf} value={wf}>{wf}</option>
                ))}
              </select>
            </div>

            {/* Filtre type */}
            {uniqueTypes.length > 0 && (
              <select
                value={filterType2}
                onChange={e => setFilterType2(e.target.value)}
                className="bg-slate-50 dark:bg-[#0a0f1d] rounded-2xl px-4 py-3 text-[10px] font-black uppercase outline-none border border-transparent focus:border-[#175a95]/30 text-slate-700 dark:text-slate-200"
              >
                <option value="tous">Tous les types</option>
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}

            {/* Bouton Supprimer tous les brouillons */}
            {stats.brouillon > 0 && onDeleteAllDrafts && (
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-4 py-3 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-2 whitespace-nowrap border border-rose-200 dark:border-rose-900/50"
              >
                <Trash2 size={14} /> Supprimer brouillons ({stats.brouillon})
              </button>
            )}
          </div>

          {/* ── Liste des activités ── */}
          {filteredCabinet.length === 0 ? (
            <div className="bg-white dark:bg-[#161e2d] p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center">
              <Archive size={64} className="mx-auto text-slate-200 mb-6 opacity-20" />
              <p className="text-slate-400 font-black uppercase tracking-[0.3em]">
                {searchTerm || filterWf !== 'tous' || filterType2 !== 'tous'
                  ? 'Aucune activité ne correspond à votre recherche'
                  : 'Aucune activité enregistrée pour le moment'}
              </p>
              {(searchTerm || filterWf !== 'tous' || filterType2 !== 'tous') && (
                <button
                  onClick={() => { setSearchTerm(''); setFilterWf('tous'); setFilterType2('tous'); }}
                  className="mt-4 px-6 py-3 bg-[#175a95] text-white rounded-2xl text-[10px] font-black uppercase shadow hover:bg-[#0f4070] transition-all"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Compteur résultats */}
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                {filteredCabinet.length} activité{filteredCabinet.length > 1 ? 's' : ''} trouvée{filteredCabinet.length > 1 ? 's' : ''}
                {(searchTerm || filterWf !== 'tous' || filterType2 !== 'tous') && (
                  <span className="text-[#175a95]"> · Filtres actifs</span>
                )}
              </p>

              {filteredCabinet.map((item) => {
                // 🔍 Vérifier si c'est une publication
                const isPublication = (item as any)._isPublication === true;
                const publicationData = (item as any)._publicationData;
                
                const cfg = getWorkflowCfg(item.workflow as string);
                const TypeIcon = isPublication ? Globe : (TYPE_ICONS[item.type] ?? FileText);
                return (
                  <div
                    key={item.id}
                    className={`rounded-[1.5rem] border shadow-sm hover:shadow-md transition-all group ${
                      isPublication 
                        ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-400/50' 
                        : 'bg-white dark:bg-[#161e2d] border-slate-100 dark:border-white/5 hover:border-[#175a95]/20'
                    }`}
                  >
                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">

                      {/* ── LEFT: icone + infos ── */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          isPublication 
                            ? 'bg-emerald-100 dark:bg-emerald-900/40' 
                            : 'bg-[#175a95]/10'
                        }`}>
                          <TypeIcon size={20} className={isPublication ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#175a95]'} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase border ${cfg.bg} ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                            {isPublication && (
                              <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide bg-emerald-100/50 dark:bg-emerald-900/30 px-2 py-1 rounded-full border border-emerald-300 dark:border-emerald-700">
                                🔗 {publicationData?.platform || 'Réseau Social'}
                              </span>
                            )}
                            {item.type && !isPublication && (
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-full border border-slate-100 dark:border-white/10">
                                {item.type}
                              </span>
                            )}
                          </div>
                          <h5 className="text-[13px] font-black text-slate-800 dark:text-white uppercase leading-tight line-clamp-1">
                            {item.title || 'Activité sans titre'}
                          </h5>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                            {item.description || 'Aucune description disponible'}
                          </p>
                        </div>
                      </div>

                      {/* ── RIGHT: date + actions ── */}
                      <div className="flex items-center gap-3 md:flex-col md:items-end shrink-0">
                        <div className="text-right">
                          <p className={`text-[9px] font-black uppercase tracking-widest ${
                            isPublication ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#175a95]'
                          }`}>{item.date}</p>
                          {item.location && (
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">{item.location}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (isPublication) {
                                setSelectedPublication(item as any);
                              } else {
                                setSelectedActivity(item as any);
                              }
                            }}
                            className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${
                              isPublication
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-400 hover:text-white'
                                : 'bg-slate-50 dark:bg-white/5 hover:bg-[#175a95] text-slate-500 hover:text-white'
                            }`}
                          >
                            <Eye size={12} /> Détails
                          </button>

                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════ VEILLE PRESSE (logique originale conservée + améliorée) ════════════ */}
      {filterType === 'presse' && (
        <>
          {Object.keys(pressGroups).length === 0 ? (
            <div className="bg-white dark:bg-[#161e2d] p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center">
              <Archive size={64} className="mx-auto text-slate-200 mb-6 opacity-20" />
              <p className="text-slate-400 font-black uppercase tracking-[0.3em]">
                Aucun article de veille archivé
              </p>
              {archivedPressCount > 0 && (
                <p className="text-[11px] text-slate-500 mt-4 max-w-xl mx-auto">
                  {archivedPressCount} article{archivedPressCount > 1 ? 's' : ''} est bien archivé mais ne peut pas être affiché ici en raison d'une date invalide ou manquante.
                  Vérifiez la présence d'un champ <span className="font-black text-slate-700">date</span> ou <span className="font-black text-slate-700">published_at</span> dans la source.
                </p>
              )}
              {nonArchivedPressCount > 0 && archivedPressCount === 0 && (
                <p className="text-[11px] text-slate-500 mt-4 max-w-xl mx-auto">
                  {nonArchivedPressCount} article{nonArchivedPressCount > 1 ? 's' : ''} existe{nonArchivedPressCount > 1 ? 'nt' : ''} dans la revue presse, mais aucun n'est marqué comme archivé.
                  Pour qu'un article apparaisse ici, son statut doit être <span className="font-black text-slate-700">archived</span>.
                </p>
              )}
            </div>
          ) : (
            <>
              {Object.entries(pressGroups)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([year, daysData]) => (
                  <div key={year} className="space-y-8">
                    <div className="flex items-center gap-6">
                      <span className="text-5xl font-black text-slate-100 dark:text-white/5">{year}</span>
                      <div className="h-0.5 flex-1 bg-slate-100 dark:bg-white/5" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                      {Object.entries(daysData)
                        .sort(([, a], [, b]) => b.sortKey - a.sortKey)
                        .map(([dayLabel, { items }]) => {
                          const sortedItems = [...items].sort((left, right) => {
                            const leftTime = new Date(left.date || '').getTime();
                            const rightTime = new Date(right.date || '').getTime();
                            return rightTime - leftTime;
                          });
                          return (
                        <div
                          key={dayLabel}
                          className="bg-white dark:bg-[#161e2d] rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-xl transition-all"
                        >
                          <div className="p-3 flex items-center justify-between bg-[#149308]">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xl font-black text-white leading-none">
                                {dayLabel.split(' ')[0]}
                              </span>
                              <span className="text-[9px] font-black text-white/80 uppercase tracking-widest">
                                {dayLabel.split(' ').slice(1).join(' ')}
                              </span>
                            </div>
                            <span className="px-2.5 py-1 bg-white/20 rounded-full text-[9px] font-black text-white">
                              {items.length} doc{items.length > 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="p-4 space-y-4">
                            {sortedItems.map((item: PressArticle) => (
                              <div
                                key={item.id}
                                className="group p-4 bg-slate-50 dark:bg-[#0d121f] rounded-2xl border border-slate-100 dark:border-white/5 hover:border-[#149308]/30 transition-all"
                              >
                                <div className="flex items-start gap-4">
                                  <div className="p-3 bg-white dark:bg-[#161e2d] rounded-xl shadow-sm text-[#149308]">
                                    <Globe size={18} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase leading-tight line-clamp-2">
                                      {item.title}
                                    </h5>
                                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                                      {item.source} • {item.date}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5 flex justify-between items-center">
                                  <button
                                    onClick={() => setSelectedPressDetail(item)}
                                    className="text-[9px] font-black text-[#149308] uppercase flex items-center gap-1 hover:underline"
                                  >
                                    Détails <ChevronRight size={10} />
                                  </button>
                                  {onRestorePress && (
                                    <button
                                      onClick={() => onRestorePress(item.id)}
                                      className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all"
                                    >
                                      Restaurer
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                ))}
            </>
          )}
        </>
      )}

      {/* ════════════ MODAL DÉTAIL ACTIVITÉ CABINET ════════════ */}
      {selectedActivity && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-start justify-between sticky top-0 bg-white dark:bg-[#0f172a] z-10 shrink-0">
              <div className="flex-1 mr-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-[#175a95]/10 text-[#175a95] text-[8px] font-black uppercase rounded-full tracking-wider border border-[#175a95]/20">
                    Registre Cabinet MEFB
                  </span>
                  {(() => {
                    const cfg = getWorkflowCfg(selectedActivity.workflow as string);
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase border ${cfg.bg} ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    );
                  })()}
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight">
                  {selectedActivity.title || 'Activité Cabinet'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 font-bold">
                  {selectedActivity.type} • {selectedActivity.date}
                  {selectedActivity.location && ` • ${selectedActivity.location}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedActivity(null)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-xl font-black text-[9px] uppercase transition-all border border-slate-200 shrink-0"
              >
                <X size={13} /> Fermer
              </button>
            </div>

            {/* Contenu */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {selectedActivity.description && (
                <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-100 dark:border-white/10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Description officielle</h4>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    {selectedActivity.description}
                  </p>
                </div>
              )}

              {selectedActivity.responsible && (
                <div className="rounded-2xl bg-blue-50 dark:bg-[#1e2a3a] p-5 border border-blue-100 dark:border-blue-500/20">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2">Responsable</h4>
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-200">{selectedActivity.responsible}</p>
                </div>
              )}

              {selectedActivity.participants && (
                <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-5 border border-slate-100 dark:border-white/10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Participants</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{selectedActivity.participants}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-white/10 flex gap-3 shrink-0">
              <button
                onClick={() => { onActivityClick(selectedActivity); setSelectedActivity(null); }}
                className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-[#175a95] hover:bg-[#0f4070] text-white transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <ChevronRight size={14} /> Ouvrir la fiche complète
              </button>
              <button
                onClick={() => setSelectedActivity(null)}
                className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ MODAL DÉTAIL ARTICLE PRESSE ARCHIVÉ ════════════ */}
      {selectedPressDetail && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

            <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-start justify-between sticky top-0 bg-white dark:bg-[#0f172a] z-10 shrink-0">
              <div className="flex-1 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-[#149308]/20 text-[#149308] text-[8px] font-black uppercase rounded-full tracking-wider">
                    Archive Veille Presse
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight">
                  {selectedPressDetail.title}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  {selectedPressDetail.source} • {selectedPressDetail.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedPressDetail(null)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-xl font-black text-[9px] uppercase transition-all border border-slate-200 shrink-0"
              >
                <X size={13} /> Fermer
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {selectedPressDetail.content ? (
                <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-100 dark:border-white/10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Contenu de l'article</h4>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    {selectedPressDetail.content}
                  </p>
                </div>
              ) : selectedPressDetail.summary ? (
                <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-100 dark:border-white/10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Résumé</h4>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    {selectedPressDetail.summary}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-100 dark:border-white/10 text-center py-10">
                  <Globe size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400 italic">Contenu non disponible pour ce dossier archivé.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-white/10 flex gap-3 shrink-0">
              {onRestorePress && (
                <button
                  onClick={() => { onRestorePress(selectedPressDetail.id); setSelectedPressDetail(null); }}
                  className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-lg"
                >
                  Restaurer ce dossier
                </button>
              )}
              <button
                onClick={() => setSelectedPressDetail(null)}
                className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ MODAL CONFIRMATION SUPPRESSION BROUILLONS ════════════ */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-rose-50 dark:bg-rose-900/20 border-b border-rose-200 dark:border-rose-900/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-rose-100 dark:bg-rose-900/40 rounded-xl">
                  <Trash2 size={20} className="text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-rose-900 dark:text-rose-100 uppercase tracking-tight">
                    Supprimer tous les brouillons
                  </h3>
                  <p className="text-[10px] text-rose-700 dark:text-rose-300 font-bold mt-1">
                    Cette action est irréversible
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer <strong className="text-rose-600 dark:text-rose-400 font-black">{stats.brouillon} brouillon{stats.brouillon > 1 ? 's' : ''}</strong> ? 
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/10">
                ⚠️ Les brouillons supprimés ne pourront pas être récupérés. Cette opération supprimer uniquement les activités avec le statut "Brouillon".
              </p>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-100 dark:border-white/10 flex gap-3">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  onDeleteAllDrafts?.();
                  setIsDeleteConfirmOpen(false);
                }}
                className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ MODAL DÉTAIL PUBLICATION ════════════ */}
      {selectedPublication && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-b border-emerald-200 dark:border-emerald-900/50 sticky top-0 z-10 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                      <Globe size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="px-3 py-1 bg-emerald-200/50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase rounded-full tracking-widest">
                      📢 Publication Digitale
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight">
                    {selectedPublication._publicationData?.platform || 'Publication'} - {selectedPublication._publicationData?.publisher_name || 'Source'}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold">
                    Publié le {selectedPublication.date}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPublication(null)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-xl font-black text-[9px] uppercase transition-all border border-slate-200 shrink-0"
                >
                  <X size={13} /> Fermer
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Lien */}
              <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-100 dark:border-white/10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Lien de publication</h4>
                <a 
                  href={selectedPublication._publicationData?.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold break-all hover:underline flex items-center gap-2"
                >
                  🔗 Accéder à la publication
                  <Globe size={12} />
                </a>
              </div>

              {/* Résumé IA */}
              {selectedPublication._publicationData?.ai_summary || selectedPublication._publicationData?.summary ? (
                <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-5 border border-slate-100 dark:border-white/10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 flex items-center gap-2">
                    <Sparkles size={12} /> Résumé IA
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    {selectedPublication._publicationData?.ai_summary || selectedPublication._publicationData?.summary}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-100 dark:border-white/10 text-center py-10">
                  <Sparkles size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400 italic">Analyse IA en cours ou non disponible.</p>
                </div>
              )}

              {/* Métadonnées */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-3 border border-slate-100 dark:border-white/10">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Format</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white">{selectedPublication._publicationData?.format || '—'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-3 border border-slate-100 dark:border-white/10">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Auteur</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white">{selectedPublication._publicationData?.publisher_name || '—'}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-white/10 flex gap-3 shrink-0">
              <button
                onClick={() => window.open(selectedPublication._publicationData?.url, '_blank')}
                className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Globe size={14} /> Voir la publication
              </button>
              <button
                onClick={() => setSelectedPublication(null)}
                className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};