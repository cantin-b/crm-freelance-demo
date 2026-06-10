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

// English counterparts of the French seed templates (prisma/seeds/templates.ts).
const templates = [
  // ── Cold outreach ────────────────────────────────────────────────────────────
  {
    category: "Cold outreach",
    name: "First contact — no website",
    subject: "Your online presence in {{city}}",
    body: p(`Hi {{owner}},

I came across your Google Maps listing in {{city}} and wanted to reach out.

I'm a freelance web developer and I help local businesses build a simple, professional online presence that reassures their future customers.

Unless I'm mistaken, I couldn't find a website for {{name}}.

A simple site could let you showcase your services, your past work, the areas you cover, and make it easier for people to request a quote.

Would you be available for a short call this week to talk it through?`),
  },
  {
    category: "Cold outreach",
    name: "First contact — outdated website",
    subject: "Modernizing your website",
    body: p(`Hi {{owner}},

I came across {{name}}'s website after looking at your Google Maps listing in {{city}}.

I'm reaching out because your business clearly looks solid, but your site could perhaps reflect the quality of your work a little better today.

I'm a freelance web developer and I help local businesses modernize their website to make it clearer, more professional, better suited to mobile, and more effective at generating contact or quote requests.

Would you be open to a short conversation this week?`),
  },
  {
    category: "Cold outreach",
    name: "First contact — Google Maps listing only",
    subject: "Your Google Maps listing in {{city}}",
    body: p(`Hi {{owner}},

I came across {{name}}'s Google Maps listing in {{city}}.

Your listing already lets customers find you, but I was wondering whether you'd ever considered a simple web page to present your services, your past work, and your contact details more clearly.

I'm a freelance web developer and I work with small businesses and tradespeople to build simple, professional, useful websites.

The goal isn't to build something complicated, but rather a clear online presence that complements your Google Maps listing and makes quote requests easier.

Would you be available for a short call this week?`),
  },
  {
    category: "Cold outreach",
    name: "First contact — internal tool",
    subject: "A simple tool to manage your requests",
    body: p(`Hi {{owner}},

I came across {{name}} while looking at local businesses in {{city}}.

I'm a freelance web developer and I build simple tools to help small businesses run their day-to-day operations more easily.

This could be, for example, a tool to track customer requests, quotes, appointments, jobs, or follow-ups.

The idea isn't to replace the way you work, but to create a practical solution tailored to your real needs.

Would this kind of tool be of interest for {{name}}?`),
  },

  // ── Follow-ups ─────────────────────────────────────────────────────────────────
  {
    category: "Follow-ups",
    name: "Follow-up — no reply to first message",
    subject: "Quick follow-up regarding {{name}}",
    body: p(`Hi {{owner}},

I'm following up on my previous message about {{name}}.

I simply wanted to know whether creating or improving your online presence might be of interest to you.

The idea isn't to build something complicated, but rather a clear, professional and useful website for your customers: a presentation of your services, photos of your work, your service area, and an easy way to get in touch.

Would it be worth a short 10-minute call?`),
  },
  {
    category: "Follow-ups",
    name: "Final follow-up — last message",
    subject: "Last message regarding {{name}}",
    body: p(`Hi {{owner}},

I'm sending one last message about {{name}}.

I'd reached out regarding your online presence and the possibility of creating or improving a simple, professional website suited to your business.

I completely understand if it isn't a priority right now.

If the topic becomes relevant later on, I'll be happy to discuss it.

I won't bother you any further after this message.`),
  },
  {
    category: "Follow-ups",
    name: "Reconnecting — past conversation",
    subject: "Reconnecting regarding {{name}}",
    body: p(`Hi {{owner}},

We were in touch a while ago about {{name}}'s online presence.

I'm reaching out again to find out whether creating or improving your website is still something you're considering.

I work with small businesses and tradespeople to build simple, professional websites suited to their activity.

If it's still of interest, I'd be glad to have a short conversation.`),
  },

  // ── Calls / meetings ────────────────────────────────────────────────────────────
  {
    category: "Calls / meetings",
    name: "After a call — sending information",
    subject: "Following up on our conversation",
    body: p(`Hi {{owner}},

Thank you for our conversation.

As promised, here is some information about what I can offer.

I help small businesses and tradespeople build simple, professional websites suited to their activity. The goal is to present your services more clearly, reassure potential customers, and make contact or quote requests easier.

I can also build more tailored tools if needed — for example a small management area, an advanced form, a request-tracking system, or an internal tool that fits the way you work.

I'm happy to look together at what would be most useful for {{name}}.`),
  },
  {
    category: "Calls / meetings",
    name: "Scheduled callback — confirmation",
    subject: "Following up on our conversation",
    body: p(`Hi {{owner}},

Thank you for our conversation.

As agreed, I'll get back to you at the planned time so we can discuss your online presence and the possible needs of {{name}} more calmly.

The goal will simply be to see whether a website, an improvement to your current site, or a small internal tool could be useful for your business.

Talk soon.`),
  },
  {
    category: "Calls / meetings",
    name: "Meeting confirmation",
    subject: "Confirming our meeting",
    body: p(`Hi {{owner}},

I'm confirming our meeting regarding {{name}}.

We'll be able to discuss your business, your current online presence, and the possible options to improve your website or your internal tools.

Feel free to let me know if you'd like to change the time.`),
  },
  {
    category: "Calls / meetings",
    name: "After a meeting — needs summary",
    subject: "Summary of our conversation for {{name}}",
    body: p(`Hi {{owner}},

Thank you for taking the time to talk.

To summarize, the goal for {{name}} would be to improve your online presence so you can present your business, services and past work more clearly, while making contact or quote requests easier.

We also discussed the possibility of setting up a simple solution, suited to the way you work, without unnecessary complexity.

I'll prepare a clear proposal taking your priorities into account.

Feel free to correct me if I've missed anything important.`),
  },

  // ── Proposals ────────────────────────────────────────────────────────────────────
  {
    category: "Proposals",
    name: "Sending a proposal",
    subject: "Proposal for {{name}}",
    body: p(`Hi {{owner}},

Following our conversation, here is my proposal for {{name}}.

The goal is to create a simple, professional solution suited to your business, so you can present your services better and make it easier for future customers to get in touch.

The proposal can be adjusted if needed, depending on your priorities, your budget, or the features you'd like to start with.

I'm available to discuss it or answer any questions.`),
  },
  {
    category: "Proposals",
    name: "Sending a proposal — showcase website",
    subject: "Website proposal for {{name}}",
    body: p(`Hi {{owner}},

Following our conversation, here is my proposal for building a website for {{name}}.

The goal is to create a clear, professional and reassuring site that presents your business, your services, your past work, and your contact details.

The aim isn't to build something complicated, but a useful, well-structured site suited to customers looking for a professional in {{city}} or your service area.

The proposal can of course be adjusted depending on your priorities, your budget, or the elements you'd like to highlight.

I'm available to discuss it.`),
  },
  {
    category: "Proposals",
    name: "Sending a proposal — website redesign",
    subject: "Redesign proposal for {{name}}",
    body: p(`Hi {{owner}},

Following our conversation, here is my proposal for redesigning {{name}}'s website.

The goal would be to make your site clearer, more modern, better suited to mobile, and more effective for people who want to contact you or request a quote.

The idea is to keep what already works while improving the presentation, structure, readability, and professional image of your business.

The proposal can be adjusted depending on your priorities and your budget.

I'm available to answer any questions.`),
  },
  {
    category: "Proposals",
    name: "Sending a proposal — internal tool",
    subject: "Custom tool proposal for {{name}}",
    body: p(`Hi {{owner}},

Following our conversation, here is my proposal for building a custom tool for {{name}}.

The goal would be to set up a simple solution suited to the way you work — for example to track your customer requests, quotes, appointments, jobs, or certain administrative tasks.

The aim isn't to create complicated software, but a practical, clear tool that's useful day to day.

The proposal can be adjusted depending on your priorities, your budget, and the features that matter most to you.

I'm available to discuss it.`),
  },
  {
    category: "Proposals",
    name: "Follow-up — proposal sent",
    subject: "Did you get a chance to review the proposal?",
    body: p(`Hi {{owner}},

I'm following up regarding the proposal I sent for {{name}}.

Have you had a chance to look at it?

I'm of course available if you have any questions, if anything is unclear, or if you'd like to adapt the proposal to your budget or priorities.

The goal is to find a simple, useful solution for your business.`),
  },
  {
    category: "Proposals",
    name: "Quote follow-up — short version",
    subject: "Quick note about the proposal",
    body: p(`Hi {{owner}},

Just a quick follow-up regarding the proposal for {{name}}.

Is it still something you're interested in?

I can of course adjust the approach if you'd prefer to start with something simpler or more gradual.`),
  },

  // ── Client project ───────────────────────────────────────────────────────────────
  {
    category: "Client project",
    name: "Information request — website",
    subject: "Information needed to move forward",
    body: p(`Hi {{owner}},

To move forward with the website project for {{name}}, I'll need a few things.

Ideally, you could send me:

your logo if you have one;<br>a few photos of your work;<br>a short description of your business;<br>the list of your main services;<br>your service areas;<br>the contact details to display on the site;<br>and optionally a few websites you like as a reference.

There's no need for everything to be perfect from the start. We can improve the text and structure together.`),
  },
  {
    category: "Client project",
    name: "Access request — domain and hosting",
    subject: "Access needed for {{name}}'s website",
    body: p(`Hi {{owner}},

To move forward on the technical side of {{name}}'s website, I'll need the access related to the domain name and/or current hosting, if you have it.

This could be, for example, access to your domain name provider, your hosting, or your previous site if one already exists.

If you're not sure where to find this information, no problem. Just send me what you have and I'll help you identify what's needed.`),
  },
  {
    category: "Client project",
    name: "After delivery — site is live",
    subject: "Your site is live",
    body: p(`Hi {{owner}},

I'm confirming that {{name}}'s website is now live.

You can view it here:

{{website}}

Feel free to let me know if you'd like to adjust any text, images, or details.

The goal is for the site to accurately reflect your business and give a clear, professional impression to your future customers.`),
  },
  {
    category: "Client project",
    name: "Review request — client testimonial",
    subject: "A quick word about working together",
    body: p(`Hi {{owner}},

I hope all is well.

I'm reaching out to ask for a quick word about our work together on {{name}}.

If you're happy with the work, a short testimonial from you would really help me present my services to other small businesses and tradespeople.

A few sentences would be more than enough.

Thank you in advance for your help.`),
  },
];

async function main() {
  // 1. Clean the dead {{bookingUrl}} variable out of the French meeting-confirmation
  //    template (booking_url was removed from the app).
  const frConfirm = await prisma.emailTemplate.findFirst({
    where: { language: "fr", body: { contains: "{{bookingUrl}}" } },
  });
  if (frConfirm) {
    const cleaned = p(`Bonjour {{owner}},

Je vous confirme notre rendez-vous concernant {{name}}.

Nous pourrons échanger sur votre activité, votre présence en ligne actuelle et les solutions possibles pour améliorer votre site web ou vos outils internes.

N'hésitez pas à me prévenir si vous souhaitez modifier l'horaire.`);
    await prisma.emailTemplate.update({ where: { id: frConfirm.id }, data: { body: cleaned } });
    console.log(`Cleaned {{bookingUrl}} from FR template #${frConfirm.id}.`);
  }

  // 2. Insert English templates idempotently (skip ones that already exist by name+language).
  const existing = await prisma.emailTemplate.findMany({
    where: { language: "en" },
    select: { name: true },
  });
  const existingNames = new Set(existing.map(t => t.name));
  const toInsert = templates
    .filter(t => !existingNames.has(t.name))
    .map(t => ({ ...t, language: "en" }));

  if (toInsert.length === 0) {
    console.log("All English templates already present — nothing to insert.");
  } else {
    const result = await prisma.emailTemplate.createMany({ data: toInsert });
    console.log(`Inserted ${result.count} English templates.`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
