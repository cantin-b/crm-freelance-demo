import path from "path";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbUrl = (process.env.DATABASE_URL ?? "file:./prisma/dev.db").replace(/^file:/, "");
const dbPath = path.resolve(process.cwd(), dbUrl);
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

function p(text: string): string {
  return text
    .trim()
    .split(/\n\n+/)
    .map(block => `<p>${block.trim().replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const templates = [
  // ── Prospection froide ──────────────────────────────────────────────────────
  {
    category: "Prospection froide",
    name: "Premier contact — pas de site web",
    subject: "Votre présence en ligne à {{city}}",
    body: p(`Bonjour {{owner}},

Je suis tombé sur votre fiche Google Maps à {{city}} et je me permets de vous contacter.

Je suis développeur web freelance et j'aide des artisans à créer une présence en ligne simple, professionnelle et rassurante pour leurs futurs clients.

Sauf erreur de ma part, je n'ai pas trouvé de site web pour {{name}}.

Un site simple pourrait vous permettre de présenter vos services, vos réalisations, vos zones d'intervention et de faciliter les demandes de devis.

Seriez-vous disponible pour un court appel cette semaine afin d'en discuter ?`),
  },
  {
    category: "Prospection froide",
    name: "Premier contact — site à moderniser",
    subject: "Modernisation de votre site web",
    body: p(`Bonjour {{owner}},

Je suis tombé sur le site de {{name}} après avoir consulté votre fiche Google Maps à {{city}}.

Je me permets de vous contacter car votre activité semble sérieuse, mais votre site pourrait peut-être mieux refléter la qualité de votre travail aujourd'hui.

Je suis développeur web freelance et j'aide des artisans à moderniser leur site pour le rendre plus clair, plus professionnel, plus adapté au mobile et plus efficace pour recevoir des demandes de contact ou de devis.

Seriez-vous ouvert à un court échange cette semaine ?`),
  },
  {
    category: "Prospection froide",
    name: "Premier contact — fiche Google Maps uniquement",
    subject: "Votre fiche Google Maps à {{city}}",
    body: p(`Bonjour {{owner}},

Je suis tombé sur la fiche Google Maps de {{name}} à {{city}}.

Votre fiche permet déjà aux clients de vous trouver, mais je me demandais si vous aviez déjà envisagé une page web simple pour présenter plus clairement vos services, vos réalisations et vos informations de contact.

Je suis développeur web freelance et je travaille avec des artisans et petites entreprises pour créer des sites simples, professionnels et utiles.

L'objectif n'est pas de faire quelque chose de compliqué, mais plutôt une présence en ligne claire qui complète votre fiche Google Maps et facilite les demandes de devis.

Seriez-vous disponible pour un court appel cette semaine ?`),
  },
  {
    category: "Prospection froide",
    name: "Premier contact — outil interne",
    subject: "Un outil simple pour mieux gérer vos demandes",
    body: p(`Bonjour {{owner}},

Je suis tombé sur {{name}} en consultant des artisans à {{city}}.

Je suis développeur web freelance et je crée des outils simples pour aider les petites entreprises à mieux gérer leur activité au quotidien.

Cela peut être par exemple un outil pour suivre les demandes clients, les devis, les rendez-vous, les interventions ou les relances.

L'idée n'est pas de remplacer votre manière de travailler, mais de créer une solution pratique et adaptée à vos besoins réels.

Est-ce que ce type d'outil pourrait vous intéresser pour {{name}} ?`),
  },

  // ── Relances ────────────────────────────────────────────────────────────────
  {
    category: "Relances",
    name: "Relance — premier message sans réponse",
    subject: "Petit retour concernant {{name}}",
    body: p(`Bonjour {{owner}},

Je me permets de revenir vers vous suite à mon précédent message concernant {{name}}.

Je voulais simplement savoir si la création ou l'amélioration de votre présence en ligne pouvait vous intéresser.

L'idée n'est pas de faire quelque chose de compliqué, mais plutôt un site clair, professionnel et utile pour vos clients : présentation de vos services, photos de réalisations, zone d'intervention et moyen de contact simple.

Est-ce que cela pourrait valoir un court appel de 10 minutes ?`),
  },
  {
    category: "Relances",
    name: "Relance finale — dernier message",
    subject: "Dernier message concernant {{name}}",
    body: p(`Bonjour {{owner}},

Je me permets de vous envoyer un dernier message concernant {{name}}.

Je vous avais contacté au sujet de votre présence en ligne et de la possibilité de créer ou améliorer un site web simple, professionnel et adapté à votre activité.

Je comprends tout à fait si ce n'est pas une priorité pour le moment.

Si le sujet vous intéresse plus tard, je serai disponible pour en discuter.

Je ne vous embête pas davantage après ce message.`),
  },
  {
    category: "Relances",
    name: "Reprise de contact — ancien échange",
    subject: "Reprise de contact concernant {{name}}",
    body: p(`Bonjour {{owner}},

Nous avions échangé il y a quelque temps au sujet de la présence en ligne de {{name}}.

Je me permets de reprendre contact avec vous pour savoir si la création ou l'amélioration de votre site web est toujours un sujet d'actualité.

Je travaille avec des artisans et petites entreprises pour créer des sites simples, professionnels et adaptés à leur activité.

Si le sujet vous intéresse encore, je serais disponible pour un court échange.`),
  },

  // ── Téléphone / rendez-vous ─────────────────────────────────────────────────
  {
    category: "Téléphone / rendez-vous",
    name: "Après appel — envoi d'informations",
    subject: "Suite à notre échange",
    body: p(`Bonjour {{owner}},

Merci pour notre échange.

Comme convenu, je vous envoie quelques informations sur ce que je peux proposer.

J'aide les artisans et petites entreprises à créer des sites web simples, professionnels et adaptés à leur activité. L'objectif est de mieux présenter vos services, rassurer les clients potentiels et faciliter les demandes de devis ou de contact.

Je peux également créer des outils plus personnalisés si besoin, par exemple un petit espace de gestion, un formulaire avancé, un système de suivi des demandes ou un outil interne adapté à votre façon de travailler.

Je reste disponible si vous souhaitez que l'on regarde ensemble ce qui serait le plus utile pour {{name}}.`),
  },
  {
    category: "Téléphone / rendez-vous",
    name: "Rappel prévu — confirmation",
    subject: "Suite à notre échange",
    body: p(`Bonjour {{owner}},

Merci pour notre échange.

Comme convenu, je vous recontacterai au moment prévu afin de discuter plus calmement de votre présence en ligne et des besoins éventuels de {{name}}.

L'objectif sera simplement de voir si un site web, une amélioration de votre site actuel ou un petit outil interne pourrait être utile pour votre activité.

À bientôt.`),
  },
  {
    category: "Téléphone / rendez-vous",
    name: "Confirmation de rendez-vous",
    subject: "Confirmation de notre rendez-vous",
    body: p(`Bonjour {{owner}},

Je vous confirme notre rendez-vous concernant {{name}}.

Nous pourrons échanger sur votre activité, votre présence en ligne actuelle et les solutions possibles pour améliorer votre site web ou vos outils internes.

Voici le lien prévu pour le rendez-vous :

{{bookingUrl}}

N'hésitez pas à me prévenir si vous souhaitez modifier l'horaire.`),
  },
  {
    category: "Téléphone / rendez-vous",
    name: "Après rendez-vous — résumé des besoins",
    subject: "Résumé de notre échange pour {{name}}",
    body: p(`Bonjour {{owner}},

Merci pour le temps accordé lors de notre échange.

Si je résume bien, l'objectif pour {{name}} serait d'améliorer votre présence en ligne afin de présenter plus clairement votre activité, vos services et vos réalisations, tout en facilitant les demandes de contact ou de devis.

Nous avons également évoqué la possibilité de mettre en place une solution simple, adaptée à votre façon de travailler, sans complexité inutile.

Je vais préparer une proposition claire en tenant compte de vos priorités.

N'hésitez pas à me corriger si j'ai oublié un point important.`),
  },

  // ── Propositions ────────────────────────────────────────────────────────────
  {
    category: "Propositions",
    name: "Envoi de proposition",
    subject: "Proposition pour {{name}}",
    body: p(`Bonjour {{owner}},

Suite à notre échange, je vous envoie ma proposition pour {{name}}.

L'objectif est de créer une solution simple, professionnelle et adaptée à votre activité, afin de mieux présenter vos services et faciliter les prises de contact de vos futurs clients.

La proposition peut être ajustée si besoin selon vos priorités, votre budget ou les fonctionnalités que vous souhaitez mettre en place en premier.

Je reste disponible pour en discuter ou répondre à vos questions.`),
  },
  {
    category: "Propositions",
    name: "Envoi de proposition — site vitrine",
    subject: "Proposition de site web pour {{name}}",
    body: p(`Bonjour {{owner}},

Suite à notre échange, je vous envoie ma proposition pour la création d'un site web pour {{name}}.

L'objectif est de créer un site clair, professionnel et rassurant, qui présente votre activité, vos services, vos réalisations et vos informations de contact.

Le but n'est pas de faire quelque chose de compliqué, mais un site utile, bien structuré et adapté aux clients qui recherchent un artisan à {{city}} ou dans votre zone d'intervention.

La proposition peut bien sûr être ajustée selon vos priorités, votre budget ou les éléments que vous souhaitez mettre en avant.

Je reste disponible pour en discuter.`),
  },
  {
    category: "Propositions",
    name: "Envoi de proposition — refonte de site",
    subject: "Proposition de modernisation pour {{name}}",
    body: p(`Bonjour {{owner}},

Suite à notre échange, je vous envoie ma proposition pour la modernisation du site web de {{name}}.

L'objectif serait de rendre votre site plus clair, plus moderne, plus adapté au mobile et plus efficace pour les personnes qui souhaitent vous contacter ou demander un devis.

L'idée est de conserver ce qui fonctionne déjà, tout en améliorant la présentation, la structure, la lisibilité et l'image professionnelle de votre entreprise.

La proposition peut être ajustée selon vos priorités et votre budget.

Je reste disponible pour répondre à vos questions.`),
  },
  {
    category: "Propositions",
    name: "Envoi de proposition — outil interne",
    subject: "Proposition d'outil personnalisé pour {{name}}",
    body: p(`Bonjour {{owner}},

Suite à notre échange, je vous envoie ma proposition concernant la création d'un outil personnalisé pour {{name}}.

L'objectif serait de mettre en place une solution simple et adaptée à votre manière de travailler, par exemple pour suivre vos demandes clients, vos devis, vos rendez-vous, vos interventions ou certaines tâches administratives.

Le but n'est pas de créer un logiciel compliqué, mais un outil pratique, clair et utile au quotidien.

La proposition peut être ajustée selon vos priorités, votre budget et les fonctionnalités les plus importantes pour vous.

Je reste disponible pour en discuter.`),
  },
  {
    category: "Propositions",
    name: "Relance — proposition envoyée",
    subject: "Avez-vous pu regarder la proposition ?",
    body: p(`Bonjour {{owner}},

Je me permets de revenir vers vous concernant la proposition envoyée pour {{name}}.

Avez-vous eu le temps de la consulter ?

Je reste bien sûr disponible si vous avez des questions, si certains points ne sont pas clairs ou si vous souhaitez adapter la proposition à votre budget ou à vos priorités.

L'objectif est de trouver une solution simple et utile pour votre activité.`),
  },
  {
    category: "Propositions",
    name: "Relance devis — version courte",
    subject: "Petit retour sur la proposition",
    body: p(`Bonjour {{owner}},

Je me permets de vous relancer rapidement concernant la proposition pour {{name}}.

Est-ce toujours un sujet qui vous intéresse ?

Je peux bien sûr adapter l'approche si vous souhaitez commencer par quelque chose de plus simple ou plus progressif.`),
  },

  // ── Projet client ───────────────────────────────────────────────────────────
  {
    category: "Projet client",
    name: "Demande d'informations — site web",
    subject: "Informations nécessaires pour avancer",
    body: p(`Bonjour {{owner}},

Pour avancer sur le projet de site web de {{name}}, j'aurais besoin de quelques éléments.

Idéalement, vous pouvez me transmettre :

votre logo si vous en avez un ;<br>quelques photos de vos réalisations ;<br>une présentation courte de votre activité ;<br>la liste de vos principaux services ;<br>vos zones d'intervention ;<br>vos informations de contact à afficher sur le site ;<br>éventuellement quelques sites que vous aimez bien comme référence.

Pas besoin que tout soit parfait dès le départ. Nous pourrons améliorer les textes et la structure ensemble.`),
  },
  {
    category: "Projet client",
    name: "Demande d'accès — domaine et hébergement",
    subject: "Accès nécessaires pour le site de {{name}}",
    body: p(`Bonjour {{owner}},

Pour pouvoir avancer techniquement sur le site de {{name}}, j'aurais besoin des accès liés au nom de domaine et/ou à l'hébergement actuel, si vous les avez.

Il peut s'agir par exemple de l'accès à votre fournisseur de nom de domaine, à votre hébergement, ou à votre ancien site si celui-ci existe déjà.

Si vous n'êtes pas sûr de savoir où trouver ces informations, aucun problème. Vous pouvez simplement me transmettre ce que vous avez, et je vous aiderai à identifier les éléments nécessaires.`),
  },
  {
    category: "Projet client",
    name: "Après livraison — site en ligne",
    subject: "Votre site est en ligne",
    body: p(`Bonjour {{owner}},

Je vous confirme que le site de {{name}} est maintenant en ligne.

Vous pouvez le consulter ici :

{{website}}

N'hésitez pas à me faire un retour si vous souhaitez ajuster certains textes, images ou détails.

L'objectif est que le site reflète correctement votre activité et donne une image claire et professionnelle à vos futurs clients.`),
  },
  {
    category: "Projet client",
    name: "Demande d'avis — témoignage client",
    subject: "Petit retour sur notre collaboration",
    body: p(`Bonjour {{owner}},

J'espère que tout va bien.

Je me permets de vous demander un petit retour concernant notre collaboration pour {{name}}.

Si vous êtes satisfait du travail réalisé, un court témoignage de votre part m'aiderait beaucoup pour présenter mon activité à d'autres artisans et petites entreprises.

Quelques phrases suffisent largement.

Merci d'avance pour votre aide.`),
  },
];

async function main() {
  console.log(`Seeding ${templates.length} email templates…`);
  const result = await prisma.emailTemplate.createMany({ data: templates });
  console.log(`Done. ${result.count} templates inserted.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
