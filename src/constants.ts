import { ActivityType, CommTemplate, EditorialCategory, ActivityStatus, WorkflowStatus, CommunicationChannel } from "./types";

export const COMM_TEMPLATES: CommTemplate[] = [
  {
    id: "tpl-1",
    type: ActivityType.REUNION_CABINET,
    title: "Compte-rendu de Cabinet",
    standardText: "Sous la présidence de Madame la Ministre, le cabinet s'est réuni ce [DATE] à [LIEU] pour examiner [THEME]. Les échanges ont porté sur [PARTENAIRES] et les orientations stratégiques pour le prochain trimestre.",
    placeholders: ["DATE", "LIEU", "THEME", "PARTENAIRES"]
  },
  {
    id: "tpl-2",
    type: ActivityType.AUDIENCE,
    title: "Communiqué d'Audience",
    standardText: "Madame la Ministre de l'Économie, des Finances et du Budget a accordé une audience ce [DATE] à une délégation de [PARTENAIRES]. Au menu des discussions : [THEME].",
    placeholders: ["DATE", "PARTENAIRES", "THEME"]
  },
  {
    id: "tpl-3",
    type: ActivityType.SIGNATURE,
    title: "Signature de Convention",
    standardText: "Signature solennelle ce [DATE] entre le Ministère et [PARTENAIRES]. Cette convention portant sur [THEME] marque une étape cruciale dans notre politique de [THEME].",
    placeholders: ["DATE", "PARTENAIRES", "THEME"]
  },
  {
    id: "tpl-4",
    type: ActivityType.CONFERENCE_CNT,
    title: "Annonce Conférence CNT",
    standardText: "Ouverture des travaux de la Conférence Budgétaire (CNT) relative à [THEME]. Madame la Ministre rappelle l'importance de la transparence et de l'efficacité de la dépense publique.",
    placeholders: ["THEME"]
  }
];

export const MOCK_ACTIVITIES = [
  {
    id: "1",
    date: "2026-03-02",
    category: EditorialCategory.POLITIQUE_BUDGETAIRE,
    type: ActivityType.CONFERENCE_CNT,
    description: "Lancement des travaux du budget 2027",
    commContent: "Focus sur la rationalisation des dépenses de fonctionnement.",
    channels: [CommunicationChannel.SITE_WEB, CommunicationChannel.PRESSE],
    status: ActivityStatus.CONFIRME,
    workflow: WorkflowStatus.VALIDE,
    responsible: "Jean Dupont",
    comments: [],
    history: []
  },
  {
    id: "2",
    date: "2026-03-03",
    category: EditorialCategory.COOPERATION,
    type: ActivityType.AUDIENCE,
    description: "Réception de la délégation de la Banque Mondiale",
    commContent: "Renforcement du partenariat technique et financier.",
    channels: [CommunicationChannel.LINKEDIN, CommunicationChannel.X],
    status: ActivityStatus.CONFIRME,
    workflow: WorkflowStatus.SOUMIS,
    responsible: "Marie Claire",
    comments: [{ id: "c1", author: "Cabinet", text: "Vérifier la liste des participants avant publication.", timestamp: "2026-03-01T10:00:00Z" }],
    history: []
  },
  {
    id: "3",
    date: "2026-03-04",
    category: EditorialCategory.GOUVERNANCE,
    type: ActivityType.REUNION_CABINET,
    description: "Réunion de coordination hebdomadaire",
    commContent: "Diffusion interne des décisions de cabinet.",
    channels: [CommunicationChannel.EMAIL],
    status: ActivityStatus.IDEE,
    workflow: WorkflowStatus.BROUILLON,
    responsible: "Paul Martin",
    comments: [],
    history: []
  },
  {
    id: "4",
    date: "2026-02-15",
    category: EditorialCategory.ACTION_PUBLIQUE,
    type: ActivityType.SIGNATURE,
    description: "Signature de l'accord de partenariat local",
    commContent: "Mise en avant de l'impact sur l'emploi régional.",
    channels: [CommunicationChannel.SITE_WEB, CommunicationChannel.PRESSE],
    status: ActivityStatus.REALISE,
    workflow: WorkflowStatus.PUBLIE,
    responsible: "Sophie Lefebvre",
    comments: [],
    history: [{ id: "h1", timestamp: "2026-02-16T09:00:00Z", user: "Sophie", action: "Publication", details: "Contenu publié sur le site web et envoyé à la presse." }]
  },
  {
    id: "5",
    date: "2026-01-20",
    category: EditorialCategory.GOUVERNANCE,
    type: ActivityType.REUNION_CABINET,
    description: "Séminaire de rentrée budgétaire",
    commContent: "Note interne de synthèse des objectifs 2026.",
    channels: [CommunicationChannel.EMAIL],
    status: ActivityStatus.REALISE,
    workflow: WorkflowStatus.PUBLIE,
    responsible: "Jean Dupont",
    comments: [],
    history: []
  }
];
