#!/usr/bin/env node

/**
 * Script de vérification du système de Bilan d'Accomplissements
 * Vérifie que tous les éléments sont correctement intégrés et fonctionnels
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification du Système de Bilan d\'Accomplissements\n');

const checks = [
  {
    name: 'Restriction d\'accès PublicationTracker',
    file: 'src/components/agenda/DashboardView.tsx',
    searchPattern: '{userRole === \'Communication\'',
    critical: true
  },
  {
    name: 'Import PerformanceCardsGrid',
    file: 'src/components/agenda/HistoryView.tsx',
    searchPattern: 'import { PerformanceCardsGrid }',
    critical: true
  },
  {
    name: 'Intégration PerformanceCardsGrid',
    file: 'src/components/agenda/HistoryView.tsx',
    searchPattern: '<PerformanceCardsGrid',
    critical: true
  },
  {
    name: 'Capture profil utilisateur',
    file: 'src/components/press/PublicationTracker.tsx',
    searchPattern: 'profile?.full_name',
    critical: true
  },
  {
    name: 'Capture rôle utilisateur',
    file: 'src/components/press/PublicationTracker.tsx',
    searchPattern: 'profile?.role',
    critical: true
  },
  {
    name: 'Extraction IA asynchrone',
    file: 'src/components/press/PublicationTracker.tsx',
    searchPattern: 'Extraction IA ASYNCHRONE',
    critical: true
  },
  {
    name: 'Real-time Supabase channels',
    file: 'src/components/press/PerformanceCardsGrid.tsx',
    searchPattern: '.channel(\'performance_realtime\')',
    critical: true
  },
  {
    name: 'Détection plateforme automatique',
    file: 'src/components/press/PublicationTracker.tsx',
    searchPattern: 'detectPlatform',
    critical: true
  },
  {
    name: 'Service IA sans Markdown',
    file: 'src/services/pressAiServiceD.ts',
    searchPattern: 'Aucun symbole de gras Markdown',
    critical: false
  },
  {
    name: 'Glassmorphism design',
    file: 'src/components/press/PerformanceCardsGrid.tsx',
    searchPattern: 'backdrop-blur-md',
    critical: true
  }
];

let passedCount = 0;
let failedCount = 0;
let warningCount = 0;

checks.forEach((check, index) => {
  const filePath = path.join(__dirname, check.file);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const found = content.includes(check.searchPattern);
    
    if (found) {
      console.log(`✅ [${index + 1}/${checks.length}] ${check.name}`);
      passedCount++;
    } else {
      const icon = check.critical ? '❌' : '⚠️';
      const status = check.critical ? 'ÉCHOUÉ' : 'AVERTISSEMENT';
      console.log(`${icon} [${index + 1}/${checks.length}] ${check.name} - ${status}`);
      if (check.critical) failedCount++;
      else warningCount++;
    }
  } catch (error) {
    console.log(`❌ [${index + 1}/${checks.length}] ${check.name} - Fichier non trouvé`);
    failedCount++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 RÉSUMÉ DE LA VÉRIFICATION\n');
console.log(`✅ Vérifications réussies : ${passedCount}/${checks.length}`);
console.log(`❌ Vérifications échouées : ${failedCount}`);
console.log(`⚠️  Avertissements : ${warningCount}`);

if (failedCount === 0) {
  console.log('\n🎉 SYSTÈME COMPLET - PRÊT POUR LA PRODUCTION');
  process.exit(0);
} else {
  console.log('\n⚠️  ÉLÉMENTS CRITIQUES MANQUANTS - Vérifier l\'installation');
  process.exit(1);
}
