export enum EditorialCategory {
  GOUVERNANCE = "Gouvernance",
  COOPERATION = "Coopération institutionnelle",
  ACTION_PUBLIQUE = "Action publique",
  POLITIQUE_BUDGETAIRE = "Politique budgétaire",
  REPRESENTATION = "Représentation de l'État"
}

export enum ActivityType {
  REUNION_CABINET = "Réunion de cabinet",
  AUDIENCE = "Audience",
  SIGNATURE = "Signature",
  CONFERENCE_CNT = "Conférence budgétaire (CNT)",
  INVITATION = "Invitation officielle"
}

export enum CommunicationChannel {
  FACEBOOK = "Facebook",
  X = "X",
  LINKEDIN = "LinkedIn",
  SITE_WEB = "Site web",
  PRESSE = "Presse",
  EMAIL = "Email"
}

export enum ActivityStatus {
  IDEE = "Idée",
  A_VENIR = "À venir",
  CONFIRME = "Confirmé",
  REALISE = "Réalisé",
  ANNULE = "Annulé"
}

export enum WorkflowStatus {
  BROUILLON = "Brouillon",
  SOUMIS = "Soumis",
  VALIDE = "Validé",
  PUBLIE = "Publié"
}

export interface Comment {
  id: string;
  author: string;
  role?: string;
  text: string;
  timestamp: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface EditorialActivity {
  id: string;
  date: string;
  time: string;         // AJOUTÉ : Pour l'horaire (ex: 10h00 - 10h15)
  title: string;        // Pour le titre extrait de l'agenda
  location: string;     // Pour le lieu de l'activité
  category: EditorialCategory;
  type: ActivityType;
  description: string;
  commContent: string;
  channels: CommunicationChannel[];
  status: ActivityStatus;
  workflow: WorkflowStatus;
  responsible: string;
  participants: string; // Pour la liste fusionnée des acteurs
  comments: Comment[];
  history: HistoryEntry[];
  media?: string;
  audience?: number;
  audience_size?: number;
  suggestedModel?: string; 
  aiSummary?: string;      
  discussion_points?: string;
  interview_questions?: string[];
  created_at?: string;     
  priority?: 'normale' | 'haute' | 'urgent'; 
  rejection_reason?: string;
}

export interface CommTemplate {
  id: string;
  type: ActivityType;
  title: string;
  standardText: string;
  placeholders: string[];
}

export interface PressArticle {
  id: string;
  date: string;
  source: string; // ex: Guineenews
  title: string;
  summary: string;
  content?: string;
  cabinet_feedback?: string;
  rejection_reason?: string; // Motif de rejet (affiché dans le bandeau)
  url: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  category: 'Economie' | 'Budget' | 'Politique' | 'International';
  screenshot?: string; // Image de l'article
  status?: 'pending_validation' | 'approved' | 'rejected' | 'published' | 'archived';
  validated_by?: string | null;  // Le '?' signifie que c'est optionnel au début
  validation_date?: string | null;
  created_at?: string;
}

export interface SocialPublication {
  id: string;
  url: string;
  platform: 'Facebook' | 'LinkedIn' | 'X' | 'YouTube' | 'Site Web';
  format: 'Vidéo 16:9' | 'Vidéo 9:16' | 'Article Texte' | 'Photo';
  user_name: string; // Nom complet du validateur (ex: "PDG Bah")
  user_role: string; // Rôle du validateur (ex: "Cabinet", "Communication", "Admin")
  summary: string; // Résumé IA de la publication
  published_at: string; // Date de publication ISO 8601
  ai_summary?: string; // Résumé généré par IA (optionnel pour rétrocompatibilité)
  publisher_name?: string; // Ancien champ (rétrocompatibilité)
  created_at?: string; // Date de création de l'enregistrement
}

// 📚 TYPES POUR LE MODULE PÉDAGOGIQUE
export interface PedagogicalConcept {
  id: string;
  concept_name: string;
  technical_definition: string;
  simplified_explanation: string;
  status: 'draft' | 'ready';
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PedagogicalCapsule {
  id: string;
  concept: PedagogicalConcept;
  video_script: string; // Script vidéo 60s
  social_content: string; // Texte pour réseaux sociaux
  visual_suggestions: string[]; // Idées d'infographies
  generated_at: string;
  published_at?: string;
}

export interface PedagogicalPublication {
  id: string;
  pedagogical_concept_id: string;
  social_publication_id: string;
  created_at: string;
}