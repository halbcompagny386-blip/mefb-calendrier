/**
 * Composant AuditView
 * Affiche les résultats d'audit du système avec propositions de solutions
 */

import React, { useState } from 'react';
import {
  Activity, CheckCircle2, AlertCircle, XCircle, RefreshCw, Loader2,
  ChevronDown, ChevronUp, FileText, Copy, Download, ZoomIn, Clock,
  Zap, Database, Code, Network, BarChart3, Download as DownloadIcon
} from 'lucide-react';
import { auditService, AuditReport, AuditCheckResult } from '../../services/auditService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AuditViewProps {
  onClose?: () => void;
}

export const AuditView = ({ onClose }: AuditViewProps) => {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const handleRunAudit = async () => {
    setLoading(true);
    try {
      const auditReport = await auditService.runFullAudit();
      setReport(auditReport);
    } catch (error: any) {
      console.error('Erreur lors de l\'audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedResults(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="text-emerald-500" size={20} />;
      case 'warning':
        return <AlertCircle className="text-amber-500" size={20} />;
      case 'error':
        return <XCircle className="text-rose-500" size={20} />;
      case 'loading':
        return <Loader2 className="text-blue-500 animate-spin" size={20} />;
      default:
        return <Activity className="text-slate-400" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700';
      case 'warning':
        return 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700';
      case 'error':
        return 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-700';
      default:
        return 'bg-slate-50 border-slate-200 dark:bg-slate-900/20 dark:border-slate-700';
    }
  };

  const getSystemStatusBadge = (status: string) => {
    const config = {
      healthy: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300', label: '✅ Système Sain' },
      degraded: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-300', label: '⚠️ Dégradé' },
      critical: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300', label: '🔴 Critique' }
    };
    return config[status as keyof typeof config] || config.healthy;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'frontend':
        return <ZoomIn size={16} />;
      case 'backend':
        return <Network size={16} />;
      case 'database':
        return <Database size={16} />;
      default:
        return <Code size={16} />;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      frontend: 'Front-End',
      backend: 'Back-End',
      database: 'Base de Données'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const downloadReport = () => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // En-tête
    doc.setFillColor(15, 61, 107); // Bleu foncé
    doc.rect(0, 0, pageWidth, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('RAPPORT D\'AUDIT SYSTÈME', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Généré le: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });

    // Statut global
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Status Global: ' + report.systemStatus, 14, 40);

    // Résumé
    doc.setFontSize(12);
    doc.text('Résumé', 14, 50);
    const summaryData = [
      ['Total de tests', report.summary.total.toString()],
      ['Réussis', report.summary.passed.toString()],
      ['Avertissements', report.summary.warnings.toString()],
      ['Erreurs', report.summary.errors.toString()],
      ['Durée totale', `${report.overallLatency}ms`]
    ];

    (doc as any).autoTable({
      startY: 55,
      head: [['Métrique', 'Valeur']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [23, 90, 149], textColor: [255, 255, 255] }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // Détails des tests
    doc.setFontSize(12);
    doc.text('Détails des Tests', 14, currentY);
    currentY += 8;

    const detailData: any[] = [];
    report.results.forEach(result => {
      detailData.push([
        result.name,
        result.status,
        result.message,
        result.latencyMs ? `${result.latencyMs}ms` : '-'
      ]);
    });

    (doc as any).autoTable({
      startY: currentY,
      head: [['Test', 'Status', 'Message', 'Latence']],
      body: detailData,
      theme: 'grid',
      headStyles: { fillColor: [23, 90, 149], textColor: [255, 255, 255] }
    });

    doc.save(`audit-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const copyToClipboard = () => {
    if (!report) return;

    const text = `
AUDIT SYSTEM REPORT
Generated: ${new Date().toLocaleString()}

System Status: ${report.systemStatus}

SUMMARY:
- Total Tests: ${report.summary.total}
- Passed: ${report.summary.passed}
- Warnings: ${report.summary.warnings}
- Errors: ${report.summary.errors}
- Overall Latency: ${report.overallLatency}ms

RESULTS:
${report.results.map(r => `
- ${r.name} [${r.status.toUpperCase()}]
  Message: ${r.message}
  ${r.details ? `Details: ${r.details}` : ''}
  ${r.latencyMs ? `Latency: ${r.latencyMs}ms` : ''}
`).join('\n')}
    `;

    navigator.clipboard.writeText(text.trim());
    alert('Rapport copié dans le presse-papiers!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* ─── EN-TÊTE ─── */}
        <div className="relative bg-gradient-to-br from-[#0f3d6b] via-[#175a95] to-[#1e88e5] p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl mb-6 sm:mb-8 overflow-hidden shadow-2xl">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-white/5" />
            <div className="absolute right-20 bottom-0 w-40 h-40 rounded-full bg-[#149308]/10" />
          </div>
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="w-12 sm:w-16 h-12 sm:h-16 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur border border-white/10">
                <Activity className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">Audit Système</h1>
                <p className="text-[10px] sm:text-[12px] text-blue-200 font-bold uppercase tracking-wider mt-1">
                  Diagnostic Complet Front-End & Back-End
                </p>
              </div>
            </div>

            {report && (
              <div className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-2xl font-bold uppercase text-[11px] sm:text-sm tracking-wide ${getSystemStatusBadge(report.systemStatus).bg} ${getSystemStatusBadge(report.systemStatus).text}`}>
                {getSystemStatusBadge(report.systemStatus).label}
              </div>
            )}
          </div>
        </div>

        {/* ─── SECTION BOUTON D'AUDIT ─── */}
        {!report && (
          <div className="text-center py-16">
            <button
              onClick={handleRunAudit}
              disabled={loading}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#175a95] to-[#1e88e5] text-white font-black uppercase text-lg rounded-2xl hover:shadow-2xl transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Audit en cours...
                </>
              ) : (
                <>
                  <Zap size={24} />
                  Démarrer l'Audit Complet
                </>
              )}
            </button>
            <p className="text-slate-500 dark:text-slate-400 mt-4 text-sm">
              Cliquez pour vérifier tous les services du système
            </p>
          </div>
        )}

        {/* ─── RAPPORT ─── */}
        {report && (
          <div className="space-y-6">
            {/* ─── RÉSUMÉ STATISTIQUES ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={16} className="text-blue-500" />
                  <span className="text-[10px] font-bold uppercase text-slate-500">Total</span>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{report.summary.total}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase text-slate-500">Réussis</span>
                </div>
                <p className="text-2xl font-black text-emerald-600">{report.summary.passed}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-200 dark:border-amber-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className="text-amber-500" />
                  <span className="text-[10px] font-bold uppercase text-slate-500">Avertis</span>
                </div>
                <p className="text-2xl font-black text-amber-600">{report.summary.warnings}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-rose-200 dark:border-rose-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle size={16} className="text-rose-500" />
                  <span className="text-[10px] font-bold uppercase text-slate-500">Erreurs</span>
                </div>
                <p className="text-2xl font-black text-rose-600">{report.summary.errors}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-slate-500" />
                  <span className="text-[10px] font-bold uppercase text-slate-500">Durée</span>
                </div>
                <p className="text-2xl font-black text-slate-600 dark:text-slate-300">{report.overallLatency}ms</p>
              </div>
            </div>

            {/* ─── RÉSULTATS PAR CATÉGORIE ─── */}
            {['frontend', 'backend', 'database'].map(category => {
              const categoryResults = report.results.filter(r => r.category === category);
              if (categoryResults.length === 0) return null;

              return (
                <div key={category} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(category)}
                      <h3 className="text-lg font-black uppercase tracking-wide text-slate-800 dark:text-white">
                        {getCategoryLabel(category)}
                      </h3>
                      <span className="ml-auto text-sm font-bold text-slate-500">
                        {categoryResults.filter(r => r.status === 'success').length}/{categoryResults.length}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {categoryResults.map(result => (
                      <div key={result.id} className={`${getStatusColor(result.status)} border-l-4 ${
                        result.status === 'success' ? 'border-l-emerald-500' :
                        result.status === 'warning' ? 'border-l-amber-500' :
                        'border-l-rose-500'
                      }`}>
                        <div
                          className="p-4 cursor-pointer hover:bg-white/50 dark:hover:bg-slate-700/50 transition"
                          onClick={() => toggleExpanded(result.id)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="mt-1">
                              {getStatusIcon(result.status)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                  {result.name}
                                </h4>
                                {result.latencyMs && (
                                  <span className="text-[10px] px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full">
                                    {result.latencyMs}ms
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                {result.message}
                              </p>
                            </div>

                            {(result.details || result.solutions) && (
                              <button className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                                {expandedResults.has(result.id) ? (
                                  <ChevronUp size={20} />
                                ) : (
                                  <ChevronDown size={20} />
                                )}
                              </button>
                            )}
                          </div>

                          {/* ─── DÉTAILS ÉTENDUS ─── */}
                          {expandedResults.has(result.id) && (
                            <div className="mt-4 pt-4 border-t border-slate-300/40 dark:border-slate-600/40 space-y-3">
                              {result.details && (
                                <div>
                                  <p className="text-xs font-bold uppercase text-slate-500 mb-1">Détails</p>
                                  <p className="text-sm text-slate-700 dark:text-slate-300 p-2 bg-white/50 dark:bg-black/20 rounded">
                                    {result.details}
                                  </p>
                                </div>
                              )}

                              {result.solutions && result.solutions.length > 0 && (
                                <div>
                                  <p className="text-xs font-bold uppercase text-slate-500 mb-2">💡 Propositions de Solution</p>
                                  <ul className="space-y-2">
                                    {result.solutions.map((solution, idx) => (
                                      <li key={idx} className="flex gap-2 text-sm">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                                          {idx + 1}
                                        </span>
                                        <span className="text-slate-700 dark:text-slate-300 flex-1">
                                          {solution}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* ─── BOUTONS D'ACTIONS ─── */}
            <div className="flex flex-wrap gap-3 pt-4">
              <button
                onClick={handleRunAudit}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold text-sm transition"
              >
                <RefreshCw size={16} />
                Réexécuter l'Audit
              </button>

              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm transition"
              >
                <DownloadIcon size={16} />
                Télécharger PDF
              </button>

              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-bold text-sm transition"
              >
                <Copy size={16} />
                Copier le Rapport
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white rounded-lg hover:bg-slate-400 dark:hover:bg-slate-500 font-bold text-sm transition ml-auto"
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
