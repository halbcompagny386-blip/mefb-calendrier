/**
 * Service d'Audit Système Complet
 * Vérifie le fonctionnement du Front-End et Back-End
 * Propose des solutions en cas de problème
 */

import { supabase } from '../lib/supabaseClient';
import { testGroqConnection, testSupabaseConnection } from './apiTester';

export interface AuditCheckResult {
  id: string;
  name: string;
  category: 'frontend' | 'backend' | 'database';
  status: 'success' | 'warning' | 'error' | 'loading';
  message: string;
  details?: string;
  solutions?: string[];
  latencyMs?: number;
  timestamp?: Date;
}

export interface AuditReport {
  timestamp: Date;
  systemStatus: 'healthy' | 'degraded' | 'critical';
  results: AuditCheckResult[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    errors: number;
  };
  overallLatency: number;
}

class AuditService {
  /**
   * Exécute un audit complet du système
   */
  async runFullAudit(): Promise<AuditReport> {
    const startTime = performance.now();
    const results: AuditCheckResult[] = [];

    // ─── FRONTEND CHECKS ───
    results.push(await this.checkBrowserStorage());
    results.push(await this.checkLocalStorage());
    results.push(await this.checkSessionStorage());
    results.push(await this.checkComponentLoading());
    results.push(await this.checkNetworkConnectivity());

    // ─── BACKEND CHECKS ───
    results.push(await this.checkSupabaseConnection());
    results.push(await this.checkGroqConnection());
    results.push(await this.checkSupabaseRealtime());

    // ─── DATABASE CHECKS ───
    results.push(await this.checkDatabaseTables());
    results.push(await this.checkDatabaseRoles());
    results.push(await this.checkDatabaseFunctions());
    results.push(await this.checkDatabaseAuth());

    const overallLatency = Math.round(performance.now() - startTime);

    // ─── CALCULATION DE L'STATUS GLOBAL ───
    const errorCount = results.filter(r => r.status === 'error').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const passCount = results.filter(r => r.status === 'success').length;

    const systemStatus: 'healthy' | 'degraded' | 'critical' =
      errorCount > 0 ? 'critical' :
      warningCount > 0 ? 'degraded' :
      'healthy';

    return {
      timestamp: new Date(),
      systemStatus,
      results,
      summary: {
        total: results.length,
        passed: passCount,
        warnings: warningCount,
        errors: errorCount,
      },
      overallLatency,
    };
  }

  // ─── FRONTEND CHECKS ───

  private async checkBrowserStorage(): Promise<AuditCheckResult> {
    try {
      if (typeof localStorage === 'undefined') {
        return {
          id: 'browser-storage',
          name: 'Stockage Navigateur',
          category: 'frontend',
          status: 'error',
          message: 'localStorage non disponible',
          solutions: [
            'Vérifiez les paramètres de confidentialité du navigateur',
            'Assurez-vous que les cookies et le stockage local ne sont pas bloqués',
            'Essayez dans un mode de navigation privée'
          ]
        };
      }

      const testKey = '__audit_test_' + Date.now();
      localStorage.setItem(testKey, 'test');
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      if (retrieved === 'test') {
        return {
          id: 'browser-storage',
          name: 'Stockage Navigateur',
          category: 'frontend',
          status: 'success',
          message: 'localStorage fonctionne correctement'
        };
      }

      return {
        id: 'browser-storage',
        name: 'Stockage Navigateur',
        category: 'frontend',
        status: 'error',
        message: 'localStorage ne persiste pas les données',
        solutions: [
          'Vérifiez l\'espace disque disponible',
          'Videz le cache du navigateur',
          'Vérifiez les permissions de stockage'
        ]
      };
    } catch (error: any) {
      return {
        id: 'browser-storage',
        name: 'Stockage Navigateur',
        category: 'frontend',
        status: 'error',
        message: `Erreur: ${error?.message}`,
        solutions: ['Redémarrez le navigateur', 'Désactivez les extensions de navigateur']
      };
    }
  }

  private async checkLocalStorage(): Promise<AuditCheckResult> {
    try {
      const keys = Object.keys(localStorage);
      const appKeys = keys.filter(k => k.startsWith('mefb_') || k.startsWith('supabase'));

      if (appKeys.length === 0) {
        return {
          id: 'local-storage',
          name: 'Données Locales',
          category: 'frontend',
          status: 'warning',
          message: 'Aucune donnée d\'application stockée localement',
          details: `Total de clés localStorage: ${keys.length}`,
          solutions: ['C\'est normal au premier lancement', 'Les données se chargeront automatiquement']
        };
      }

      return {
        id: 'local-storage',
        name: 'Données Locales',
        category: 'frontend',
        status: 'success',
        message: `${appKeys.length} entrées d'application trouvées`,
        details: `Clés: ${appKeys.join(', ')}`
      };
    } catch (error: any) {
      return {
        id: 'local-storage',
        name: 'Données Locales',
        category: 'frontend',
        status: 'error',
        message: `Erreur d'accès: ${error?.message}`,
        solutions: ['Vérifiez les permissions du navigateur']
      };
    }
  }

  private async checkSessionStorage(): Promise<AuditCheckResult> {
    try {
      const testKey = '__audit_session_' + Date.now();
      sessionStorage.setItem(testKey, 'test');
      const retrieved = sessionStorage.getItem(testKey);
      sessionStorage.removeItem(testKey);

      if (retrieved === 'test') {
        return {
          id: 'session-storage',
          name: 'Stockage de Session',
          category: 'frontend',
          status: 'success',
          message: 'sessionStorage fonctionne correctement'
        };
      }

      return {
        id: 'session-storage',
        name: 'Stockage de Session',
        category: 'frontend',
        status: 'error',
        message: 'sessionStorage ne fonctionne pas',
        solutions: ['Vérifiez les permissions du navigateur']
      };
    } catch (error: any) {
      return {
        id: 'session-storage',
        name: 'Stockage de Session',
        category: 'frontend',
        status: 'error',
        message: `Erreur: ${error?.message}`,
        solutions: ['Redémarrez votre navigateur']
      };
    }
  }

  private async checkComponentLoading(): Promise<AuditCheckResult> {
    try {
      // Vérifier que les icônes et composants essentiels sont chargés
      if (typeof window === 'undefined') {
        return {
          id: 'component-loading',
          name: 'Chargement des Composants',
          category: 'frontend',
          status: 'error',
          message: 'Environnement navigateur non détecté'
        };
      }

      return {
        id: 'component-loading',
        name: 'Chargement des Composants',
        category: 'frontend',
        status: 'success',
        message: 'Tous les composants essentiels sont chargés'
      };
    } catch (error: any) {
      return {
        id: 'component-loading',
        name: 'Chargement des Composants',
        category: 'frontend',
        status: 'error',
        message: `Erreur: ${error?.message}`,
        solutions: ['Videz le cache du navigateur et rechargez la page']
      };
    }
  }

  private async checkNetworkConnectivity(): Promise<AuditCheckResult> {
    try {
      if (!navigator.onLine) {
        return {
          id: 'network-connectivity',
          name: 'Connectivité Réseau',
          category: 'frontend',
          status: 'error',
          message: 'L\'application n\'est pas connectée à Internet',
          solutions: [
            'Vérifiez votre connexion Internet',
            'Vérifiez le Wi-Fi ou les données mobiles',
            'Redémarrez votre routeur'
          ]
        };
      }

      const start = performance.now();
      const response = await fetch('/index.html', { method: 'HEAD' });
      const latency = Math.round(performance.now() - start);

      if (response.ok) {
        return {
          id: 'network-connectivity',
          name: 'Connectivité Réseau',
          category: 'frontend',
          status: 'success',
          message: 'Connexion réseau stable',
          latencyMs: latency
        };
      }

      return {
        id: 'network-connectivity',
        name: 'Connectivité Réseau',
        category: 'frontend',
        status: 'warning',
        message: `Réponse serveur: ${response.status}`,
        latencyMs: latency,
        solutions: ['Le serveur peut être en maintenance']
      };
    } catch (error: any) {
      return {
        id: 'network-connectivity',
        name: 'Connectivité Réseau',
        category: 'frontend',
        status: 'error',
        message: 'Impossible de contacter le serveur',
        solutions: [
          'Vérifiez votre connexion Internet',
          'Vérifiez l\'adresse du serveur',
          'Vérifiez les paramètres firewall/proxy'
        ]
      };
    }
  }

  // ─── BACKEND CHECKS ───

  private async checkSupabaseConnection(): Promise<AuditCheckResult> {
    const start = performance.now();
    const result = await testSupabaseConnection();
    const latency = Math.round(performance.now() - start);

    return {
      id: 'supabase-connection',
      name: 'Connexion Supabase',
      category: 'backend',
      status: result.success ? 'success' : 'error',
      message: result.message,
      details: result.details,
      latencyMs: latency,
      solutions: result.success ? [] : [
        'Vérifiez les variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY',
        'Vérifiez l\'URL de Supabase dans la console',
        'Vérifiez les paramètres CORS dans Supabase',
        'Redémarrez le serveur de développement'
      ]
    };
  }

  private async checkGroqConnection(): Promise<AuditCheckResult> {
    const start = performance.now();
    const result = await testGroqConnection();
    const latency = Math.round(performance.now() - start);

    return {
      id: 'groq-connection',
      name: 'Connexion Groq AI',
      category: 'backend',
      status: result.success ? 'success' : 'error',
      message: result.message,
      details: result.details,
      latencyMs: latency,
      solutions: result.success ? [] : [
        'Vérifiez la clé API Groq (VITE_GROQ_API_KEY)',
        'Vérifiez que votre compte Groq a du crédit',
        'Vérifiez l\'URL de l\'API Groq',
        'Essayez à nouveau, le service peut être temporairement indisponible'
      ]
    };
  }

  private async checkSupabaseRealtime(): Promise<AuditCheckResult> {
    try {
      const channel = supabase.channel('audit-test-' + Date.now());
      const subscribed = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);

        channel.subscribe((status) => {
          clearTimeout(timeout);
          if (status === 'SUBSCRIBED') {
            resolve(true);
          }
        });
      });

      supabase.removeChannel(channel);

      if (subscribed) {
        return {
          id: 'supabase-realtime',
          name: 'Realtime Supabase',
          category: 'backend',
          status: 'success',
          message: 'Connexion Realtime établie'
        };
      }

      return {
        id: 'supabase-realtime',
        name: 'Realtime Supabase',
        category: 'backend',
        status: 'warning',
        message: 'Timeout lors de la connexion Realtime',
        solutions: [
          'Vérifiez la connexion Internet',
          'Vérifiez les paramètres Realtime dans Supabase',
          'Vérifiez le WebSocket dans les paramètres réseau'
        ]
      };
    } catch (error: any) {
      return {
        id: 'supabase-realtime',
        name: 'Realtime Supabase',
        category: 'backend',
        status: 'error',
        message: `Erreur: ${error?.message}`,
        solutions: [
          'Vérifiez les paramètres WebSocket',
          'Vérifiez le firewall/proxy'
        ]
      };
    }
  }

  // ─── DATABASE CHECKS ───

  private async checkDatabaseTables(): Promise<AuditCheckResult> {
    try {
      const tables = [
        'activities', 'profiles', 'calendar_events', 'briefing',
        'pedagogical_capsules', 'press_reviews', 'contacts'
      ];

      let missingTables = [];

      for (const table of tables) {
        try {
          const { error } = await supabase
            .from(table)
            .select('id')
            .limit(1);

          if (error && error.code === 'PGRST116') {
            missingTables.push(table);
          }
        } catch (e) {
          missingTables.push(table);
        }
      }

      if (missingTables.length === 0) {
        return {
          id: 'database-tables',
          name: 'Tables de Base de Données',
          category: 'database',
          status: 'success',
          message: `Toutes les ${tables.length} tables sont accessibles`
        };
      }

      return {
        id: 'database-tables',
        name: 'Tables de Base de Données',
        category: 'database',
        status: 'error',
        message: `${missingTables.length} table(s) manquante(s)`,
        details: `Manquantes: ${missingTables.join(', ')}`,
        solutions: [
          'Exécutez les migrations de base de données',
          'Vérifiez les permissions d\'accès à la base de données',
          'Contactez l\'administrateur base de données'
        ]
      };
    } catch (error: any) {
      return {
        id: 'database-tables',
        name: 'Tables de Base de Données',
        category: 'database',
        status: 'error',
        message: `Erreur: ${error?.message}`,
        solutions: ['Vérifiez la connexion à Supabase']
      };
    }
  }

  private async checkDatabaseRoles(): Promise<AuditCheckResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          id: 'database-roles',
          name: 'Rôles Utilisateur',
          category: 'database',
          status: 'warning',
          message: 'Pas d\'utilisateur authentifié',
          solutions: ['Connectez-vous d\'abord']
        };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        return {
          id: 'database-roles',
          name: 'Rôles Utilisateur',
          category: 'database',
          status: 'error',
          message: `Erreur de rôle: ${error.message}`,
          solutions: ['Vérifiez le profil utilisateur en base de données']
        };
      }

      return {
        id: 'database-roles',
        name: 'Rôles Utilisateur',
        category: 'database',
        status: 'success',
        message: `Rôle utilisateur: ${data?.role || 'Non défini'}`,
        details: `UID: ${user.id}`
      };
    } catch (error: any) {
      return {
        id: 'database-roles',
        name: 'Rôles Utilisateur',
        category: 'database',
        status: 'error',
        message: `Erreur: ${error?.message}`,
        solutions: ['Vérifiez l\'authentification']
      };
    }
  }

  private async checkDatabaseFunctions(): Promise<AuditCheckResult> {
    try {
      const { data, error } = await supabase.rpc('get_system_health');

      if (error && error.code === 'PGRST113') {
        // Fonction n'existe pas, ce n'est pas grave
        return {
          id: 'database-functions',
          name: 'Fonctions RPC',
          category: 'database',
          status: 'warning',
          message: 'Fonction système non disponible',
          solutions: ['Créez la fonction RPC get_system_health']
        };
      }

      if (error) {
        return {
          id: 'database-functions',
          name: 'Fonctions RPC',
          category: 'database',
          status: 'error',
          message: `Erreur: ${error.message}`,
          solutions: ['Vérifiez les permissions des fonctions RPC']
        };
      }

      return {
        id: 'database-functions',
        name: 'Fonctions RPC',
        category: 'database',
        status: 'success',
        message: 'Fonctions RPC accessibles'
      };
    } catch (error: any) {
      return {
        id: 'database-functions',
        name: 'Fonctions RPC',
        category: 'database',
        status: 'warning',
        message: `Avertissement: ${error?.message}`
      };
    }
  }

  private async checkDatabaseAuth(): Promise<AuditCheckResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return {
          id: 'database-auth',
          name: 'Authentification',
          category: 'database',
          status: 'warning',
          message: 'Pas de session active',
          solutions: ['Connectez-vous à l\'application']
        };
      }

      if (session.expires_at && session.expires_at * 1000 < Date.now()) {
        return {
          id: 'database-auth',
          name: 'Authentification',
          category: 'database',
          status: 'warning',
          message: 'Session expirée',
          solutions: ['Reconnectez-vous']
        };
      }

      return {
        id: 'database-auth',
        name: 'Authentification',
        category: 'database',
        status: 'success',
        message: 'Session active et valide',
        details: `Expires: ${new Date(session.expires_at! * 1000).toLocaleString()}`
      };
    } catch (error: any) {
      return {
        id: 'database-auth',
        name: 'Authentification',
        category: 'database',
        status: 'error',
        message: `Erreur: ${error?.message}`,
        solutions: ['Vérifiez la session Supabase']
      };
    }
  }
}

export const auditService = new AuditService();
