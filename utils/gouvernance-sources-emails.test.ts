import {
  auditerSourcesDepuisEmails,
  preparerMigrationSources,
  traiterEmailsSelonStatutSource,
  type SourceEmail,
} from './gouvernance-sources-emails.js';

describe('gouvernance-sources-emails (US-1.6)', () => {
  it('US-1.8: match expéditeur HelloWork exact en ignorant la casse', async () => {
    const traitements: string[] = [];
    const result = await traiterEmailsSelonStatutSource({
      emails: [{ id: 'm1', from: 'Notification@Emails.HelloWork.com', html: '<html>x</html>' }],
      sourcesExistantes: [
        {
          emailExpéditeur: 'notification@emails.hellowork.com',
          plugin: 'HelloWork',
          type: 'email',
          activerCreation: true,
          activerEnrichissement: true,
          activerAnalyseIA: true,
        },
      ],
      parseursDisponibles: ['HelloWork'],
      traiterEmail: async (email) => {
        traitements.push(email.id);
        return { ok: true };
      },
    });

    expect(result.traitementsExecutés).toBe(1);
    expect(traitements).toEqual(['m1']);
  });

  it('US-1.8: un expéditeur partiellement similaire ne match pas HelloWork', async () => {
    const traitements: string[] = [];
    const result = await traiterEmailsSelonStatutSource({
      emails: [{ id: 'm1', from: 'notification@emails.hellowork.com.fake-domain.test', html: '<html>x</html>' }],
      sourcesExistantes: [
        {
          emailExpéditeur: 'notification@emails.hellowork.com',
          plugin: 'HelloWork',
          type: 'email',
          activerCreation: true,
          activerEnrichissement: true,
          activerAnalyseIA: true,
        },
      ],
      parseursDisponibles: ['HelloWork'],
      traiterEmail: async (email) => {
        traitements.push(email.id);
        return { ok: true };
      },
    });

    expect(result.traitementsExecutés).toBe(0);
    expect(traitements).toEqual([]);
    expect(result.creees).toEqual([
      {
        emailExpéditeur: 'notification@emails.hellowork.com.fake-domain.test',
        plugin: 'Inconnu',
        type: 'email',
        activerCreation: false,
        activerEnrichissement: false,
        activerAnalyseIA: true,
      },
    ]);
  });

  it('US-3.1: SourceEmail a type (TypeSource) et activerCreation, activerEnrichissement, activerAnalyseIA (pas actif)', () => {
    const source: SourceEmail = {
      emailExpéditeur: 'test@test.com',
      plugin: 'Inconnu',
      type: 'email',
      activerCreation: true,
      activerEnrichissement: false,
      activerAnalyseIA: true,
    };
    expect(source.type).toBe('email');
    expect(source.activerCreation).toBe(true);
    expect(source.activerEnrichissement).toBe(false);
    expect(source.activerAnalyseIA).toBe(true);
    expect(source).not.toHaveProperty('actif');
  });

  it('CA1 schéma: emailExpéditeur + plugin + type(single select) + 3 checkboxes (Activer la création, enrichissement, analyse IA)', () => {
    const ok = preparerMigrationSources({
      emailExpéditeur: { type: 'text' },
      plugin: {
        type: 'singleSelect',
        options: [
          'Linkedin',
          'Inconnu',
          'HelloWork',
          'Welcome to the Jungle',
          'Job That Make Sense',
          'Cadre Emploi',
        ],
      },
      type: { type: 'singleSelect', options: ['email', 'liste html', 'liste csv'] },
      activerCreation: { type: 'checkbox' },
      activerEnrichissement: { type: 'checkbox' },
      activerAnalyseIA: { type: 'checkbox' },
    });
    expect(ok.ok).toBe(true);

    const koPlugin = preparerMigrationSources({
      emailExpéditeur: { type: 'text' },
      plugin: {
        type: 'singleSelect',
        options: ['Inconnu', 'Autre'],
      },
      type: { type: 'singleSelect', options: ['email'] },
      activerCreation: { type: 'checkbox' },
      activerEnrichissement: { type: 'checkbox' },
      activerAnalyseIA: { type: 'checkbox' },
    });
    expect(koPlugin.ok).toBe(false);
  });

  it('CA2 audit: source existante -> aucune création', () => {
    const sources: SourceEmail[] = [
      {
        emailExpéditeur: 'alertes@unknown-source.test',
        plugin: 'Inconnu',
        type: 'email',
        activerCreation: false,
        activerEnrichissement: false,
        activerAnalyseIA: true,
      },
    ];
    const audit = auditerSourcesDepuisEmails({
      emailsExpediteurs: ['alertes@unknown-source.test'],
      sourcesExistantes: sources,
    });
    expect(audit.creees).toEqual([]);
  });

  it('CA2 audit: source absente -> création emailExpéditeur exact normalisé, plugin=Inconnu, actif=false', () => {
    const audit = auditerSourcesDepuisEmails({
      emailsExpediteurs: ['Alertes@Unknown-Source.test'],
      sourcesExistantes: [],
    });
    expect(audit.creees).toEqual([
      {
        emailExpéditeur: 'alertes@unknown-source.test',
        plugin: 'Inconnu',
        type: 'email',
        activerCreation: false,
        activerEnrichissement: false,
        activerAnalyseIA: true,
      },
    ]);
  });

  it('CA2 audit: from avec nom + email linkedin -> normalise et crée en Linkedin/actif', () => {
    const audit = auditerSourcesDepuisEmails({
      emailsExpediteurs: ['LinkedIn Jobs <jobs-listings@linkedin.com>'],
      sourcesExistantes: [],
    });
    expect(audit.creees).toEqual([
      {
        emailExpéditeur: 'jobs-listings@linkedin.com',
        plugin: 'Linkedin',
        type: 'email',
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ]);
  });

  it('US-1.8 CA1: expéditeur notification@emails.hellowork.com -> création source plugin HelloWork, actif true', () => {
    const audit = auditerSourcesDepuisEmails({
      emailsExpediteurs: ['notification@emails.hellowork.com'],
      sourcesExistantes: [],
    });
    expect(audit.creees).toEqual([
      {
        emailExpéditeur: 'notification@emails.hellowork.com',
        plugin: 'HelloWork',
        type: 'email',
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ]);
  });

  it('schéma plugin doit contenir toutes les sources connues', () => {
    const ok = preparerMigrationSources({
      emailExpéditeur: { type: 'text' },
      plugin: {
        type: 'singleSelect',
        options: [
          'Linkedin',
          'Inconnu',
          'HelloWork',
          'Welcome to the Jungle',
          'Job That Make Sense',
          'Cadre Emploi',
        ],
      },
      type: { type: 'singleSelect', options: ['email', 'liste html', 'liste csv'] },
      activerCreation: { type: 'checkbox' },
      activerEnrichissement: { type: 'checkbox' },
      activerAnalyseIA: { type: 'checkbox' },
    });
    expect(ok.ok).toBe(true);
  });

  it('US-1.10: la valeur plugin "Welcome to the Jungle" est acceptée dans le schéma Sources', () => {
    const ok = preparerMigrationSources({
      emailExpéditeur: { type: 'text' },
      plugin: {
        type: 'singleSelect',
        options: [
          'Linkedin',
          'Inconnu',
          'HelloWork',
          'Welcome to the Jungle',
          'Job That Make Sense',
          'Cadre Emploi',
        ],
      },
      type: { type: 'singleSelect', options: ['email', 'liste html', 'liste csv'] },
      activerCreation: { type: 'checkbox' },
      activerEnrichissement: { type: 'checkbox' },
      activerAnalyseIA: { type: 'checkbox' },
    });
    expect(ok.ok).toBe(true);
  });

  it('US-1.10: audit expéditeur exact WTTJ -> plugin WTTJ actif true', () => {
    const audit = auditerSourcesDepuisEmails({
      emailsExpediteurs: ['alerts@welcometothejungle.com'],
      sourcesExistantes: [],
    });
    expect(audit.creees).toEqual([
      {
        emailExpéditeur: 'alerts@welcometothejungle.com',
        plugin: 'Welcome to the Jungle',
        type: 'email',
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ]);
  });

  it('US-1.10: audit WTTJ ignore la casse sur l’expéditeur', () => {
    const audit = auditerSourcesDepuisEmails({
      emailsExpediteurs: ['Alerts@WelcomeToTheJungle.com'],
      sourcesExistantes: [],
    });
    expect(audit.creees).toEqual([
      {
        emailExpéditeur: 'alerts@welcometothejungle.com',
        plugin: 'Welcome to the Jungle',
        type: 'email',
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ]);
  });

  it('US-1.10: un expéditeur proche alerts+jobs@... n’est pas reconnu WTTJ', () => {
    const audit = auditerSourcesDepuisEmails({
      emailsExpediteurs: ['alerts+jobs@welcometothejungle.com'],
      sourcesExistantes: [],
    });
    expect(audit.creees).toEqual([
      {
        emailExpéditeur: 'alerts+jobs@welcometothejungle.com',
        plugin: 'Inconnu',
        type: 'email',
        activerCreation: false,
        activerEnrichissement: false,
        activerAnalyseIA: true,
      },
    ]);
  });

  it('US-1.11: expéditeur JTMS exact (insensible casse) -> plugin JTMS actif true', () => {
    const audit = auditerSourcesDepuisEmails({
      emailsExpediteurs: ['Jobs@MakeSense.Org'],
      sourcesExistantes: [],
    });
    expect(audit.creees).toEqual([
      {
        emailExpéditeur: 'jobs@makesense.org',
        plugin: 'Job That Make Sense',
        type: 'email',
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ]);
  });

  it('US-1.11: variante +alias JTMS -> Inconnu/inactif', () => {
    const audit = auditerSourcesDepuisEmails({
      emailsExpediteurs: ['jobs+alias@makesense.org'],
      sourcesExistantes: [],
    });
    expect(audit.creees).toEqual([
      {
        emailExpéditeur: 'jobs+alias@makesense.org',
        plugin: 'Inconnu',
        type: 'email',
        activerCreation: false,
        activerEnrichissement: false,
        activerAnalyseIA: true,
      },
    ]);
  });

  it('US-1.12: expéditeur Cadre Emploi exact (insensible casse) -> plugin Cadre Emploi actif true', () => {
    const audit = auditerSourcesDepuisEmails({
      emailsExpediteurs: ['Offres@Alertes.Cadremploi.Fr'],
      sourcesExistantes: [],
    });
    expect(audit.creees).toEqual([
      {
        emailExpéditeur: 'offres@alertes.cadremploi.fr',
        plugin: 'Cadre Emploi',
        type: 'email',
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ]);
  });

  it('US-1.12: variante +alias Cadre Emploi -> Inconnu/inactif', () => {
    const audit = auditerSourcesDepuisEmails({
      emailsExpediteurs: ['offres+alias@alertes.cadremploi.fr'],
      sourcesExistantes: [],
    });
    expect(audit.creees).toEqual([
      {
        emailExpéditeur: 'offres+alias@alertes.cadremploi.fr',
        plugin: 'Inconnu',
        type: 'email',
        activerCreation: false,
        activerEnrichissement: false,
        activerAnalyseIA: true,
      },
    ]);
  });

  it('R1 traitement source absente: auto-création Inconnu/inactif, pas de traitement, pas de déplacement', async () => {
    const traitements: string[] = [];
    const deplacements: string[] = [];
    const result = await traiterEmailsSelonStatutSource({
      emails: [{ id: 'm1', from: 'noreply@nouvelle-source.test', html: '<html>a</html>' }],
      sourcesExistantes: [],
      parseursDisponibles: [],
      traiterEmail: async (email) => {
        traitements.push(email.id);
        return { ok: true };
      },
      deplacerVersTraite: async (email) => {
        deplacements.push(email.id);
      },
    });
    expect(result.creees).toEqual([
      {
        emailExpéditeur: 'noreply@nouvelle-source.test',
        plugin: 'Inconnu',
        type: 'email',
        activerCreation: false,
        activerEnrichissement: false,
        activerAnalyseIA: true,
      },
    ]);
    expect(traitements).toEqual([]);
    expect(deplacements).toEqual([]);
  });

  it('R1 traitement source absente linkedin: auto-création Linkedin/actif', async () => {
    const result = await traiterEmailsSelonStatutSource({
      emails: [{ id: 'm1', from: '"LinkedIn Jobs" <jobs-listings@linkedin.com>', html: '<html>a</html>' }],
      sourcesExistantes: [],
      parseursDisponibles: ['Linkedin'],
      traiterEmail: async () => ({ ok: false }),
    });
    expect(result.creees).toEqual([
      {
        emailExpéditeur: 'jobs-listings@linkedin.com',
        plugin: 'Linkedin',
        type: 'email',
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ]);
  });

  it('R3 capture: plugin=Inconnu -> capture HTML max 3 par expéditeur', async () => {
    const captures: Array<{ sourceKey: string; html: string }> = [];
    await traiterEmailsSelonStatutSource({
      emails: [
        { id: 'm1', from: 'noreply@nouvelle-source.test', html: '<html>1</html>' },
        { id: 'm2', from: 'noreply@nouvelle-source.test', html: '<html>2</html>' },
        { id: 'm3', from: 'noreply@nouvelle-source.test', html: '<html>3</html>' },
        { id: 'm4', from: 'noreply@nouvelle-source.test', html: '<html>4</html>' },
      ],
      sourcesExistantes: [
        {
          emailExpéditeur: 'noreply@nouvelle-source.test',
          plugin: 'Inconnu',
          type: 'email',
          activerCreation: false,
          activerEnrichissement: false,
          activerAnalyseIA: true,
        },
      ],
      parseursDisponibles: [],
      capturerHtmlExemple: async (sourceKey, html) => {
        captures.push({ sourceKey, html });
      },
    });
    expect(captures).toHaveLength(3);
    expect(captures.map((c) => c.html)).toEqual(['<html>1</html>', '<html>2</html>', '<html>3</html>']);
  });

  it('R2 plugin=Linkedin & actif=false: pas de traitement, pas de déplacement', async () => {
    const traitements: string[] = [];
    const deplacements: string[] = [];
    await traiterEmailsSelonStatutSource({
      emails: [{ id: 'm1', from: 'jobs@linkedin.com', html: '<html>x</html>' }],
      sourcesExistantes: [
        {
          emailExpéditeur: 'jobs@linkedin.com',
          plugin: 'Linkedin',
          type: 'email',
          activerCreation: false,
          activerEnrichissement: false,
          activerAnalyseIA: true,
        },
      ],
      parseursDisponibles: ['Linkedin'],
      traiterEmail: async (email) => {
        traitements.push(email.id);
        return { ok: true };
      },
      deplacerVersTraite: async (email) => {
        deplacements.push(email.id);
      },
    });
    expect(traitements).toEqual([]);
    expect(deplacements).toEqual([]);
  });

  it('R2 plugin=Linkedin & actif=true: traitement exécuté puis déplacement Traité si succès', async () => {
    const sequence: string[] = [];
    await traiterEmailsSelonStatutSource({
      emails: [{ id: 'm1', from: 'jobs@linkedin.com', html: '<html>x</html>' }],
      sourcesExistantes: [
        {
          emailExpéditeur: 'jobs@linkedin.com',
          plugin: 'Linkedin',
          type: 'email',
          activerCreation: true,
          activerEnrichissement: true,
          activerAnalyseIA: true,
        },
      ],
      parseursDisponibles: ['Linkedin'],
      traiterEmail: async () => {
        sequence.push('traitement');
        return { ok: true };
      },
      deplacerVersTraite: async () => {
        sequence.push('deplacement');
      },
    });
    expect(sequence).toEqual(['traitement', 'deplacement']);
  });

  it('R2 plugin=Inconnu & actif=true: pas de traitement, mais déplacement (archivage sans traitement)', async () => {
    const traitements: string[] = [];
    const deplacements: string[] = [];
    await traiterEmailsSelonStatutSource({
      emails: [{ id: 'm1', from: 'alertes@unknown-source.test', html: '<html>x</html>' }],
      sourcesExistantes: [
        {
          emailExpéditeur: 'alertes@unknown-source.test',
          plugin: 'Inconnu',
          type: 'email',
          activerCreation: true,
          activerEnrichissement: true,
          activerAnalyseIA: true,
        },
      ],
      parseursDisponibles: ['Linkedin'],
      traiterEmail: async (email) => {
        traitements.push(email.id);
        return { ok: true };
      },
      deplacerVersTraite: async (email) => {
        deplacements.push(email.id);
      },
    });
    expect(traitements).toEqual([]);
    expect(deplacements).toEqual(['m1']);
  });

  it('R2 plugin=Inconnu & actif=false: pas de traitement, pas de déplacement', async () => {
    const traitements: string[] = [];
    const deplacements: string[] = [];
    await traiterEmailsSelonStatutSource({
      emails: [{ id: 'm1', from: 'u1@unknown-a.test', html: '<html>1</html>' }],
      sourcesExistantes: [
        {
          emailExpéditeur: 'u1@unknown-a.test',
          plugin: 'Inconnu',
          type: 'email',
          activerCreation: false,
          activerEnrichissement: false,
          activerAnalyseIA: true,
        },
      ],
      parseursDisponibles: ['Linkedin'],
      traiterEmail: async (email) => {
        traitements.push(email.id);
        return { ok: true };
      },
      deplacerVersTraite: async (email) => {
        deplacements.push(email.id);
      },
    });
    expect(traitements).toEqual([]);
    expect(deplacements).toEqual([]);
  });

  it('auto-correction: plugin=Linkedin mais parseur indisponible => plugin corrigé Inconnu, pas de traitement, archivage selon actif', async () => {
    const result = await traiterEmailsSelonStatutSource({
      emails: [{ id: 'm1', from: 'jobs@linkedin.com', html: '<html>x</html>' }],
      sourcesExistantes: [
        {
          emailExpéditeur: 'jobs@linkedin.com',
          plugin: 'Linkedin',
          type: 'email',
          activerCreation: true,
          activerEnrichissement: true,
          activerAnalyseIA: true,
        },
      ],
      parseursDisponibles: [],
      traiterEmail: async () => ({ ok: true }),
      deplacerVersTraite: async () => {},
    });
    expect(result.corrections).toEqual([
      {
        emailExpéditeur: 'jobs@linkedin.com',
        ancienPlugin: 'Linkedin',
        nouveauPlugin: 'Inconnu',
      },
    ]);
    expect(result.traitementsExecutés).toBe(0);
    expect(result.deplacementsEffectués).toBe(1);
  });
});
