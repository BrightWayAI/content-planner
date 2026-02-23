import { Router } from 'express';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Get app config
router.get('/config', async (_req, res) => {
  try {
    const [config] = await db.select().from(schema.appConfig).limit(1);
    const pillars = await db.select().from(schema.contentPillars).orderBy(schema.contentPillars.sortOrder);
    const channels = await db.select().from(schema.channels);
    const contentTypes = await db.select().from(schema.contentTypes);
    res.json({ config: config || null, pillars, channels, contentTypes });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ error: 'Failed to get config' });
  }
});

// Check if app is configured (for onboarding)
router.get('/config/status', async (_req, res) => {
  try {
    const [config] = await db.select().from(schema.appConfig).limit(1);
    res.json({ configured: !!config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check config status' });
  }
});

// Update app config
router.put('/config', async (req, res) => {
  try {
    const { brandName, tagline } = req.body;
    const [existing] = await db.select().from(schema.appConfig).limit(1);
    if (existing) {
      const [updated] = await db.update(schema.appConfig)
        .set({ brandName, tagline, updatedAt: new Date() })
        .where(eq(schema.appConfig.id, existing.id))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db.insert(schema.appConfig)
        .values({ brandName, tagline })
        .returning();
      res.json(created);
    }
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// --- Pillars CRUD ---
router.get('/pillars', async (_req, res) => {
  try {
    const pillars = await db.select().from(schema.contentPillars).orderBy(schema.contentPillars.sortOrder);
    res.json(pillars);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pillars' });
  }
});

router.post('/pillars', async (req, res) => {
  try {
    const [pillar] = await db.insert(schema.contentPillars).values(req.body).returning();
    res.json(pillar);
  } catch (error) {
    console.error('Create pillar error:', error);
    res.status(500).json({ error: 'Failed to create pillar' });
  }
});

router.put('/pillars/:id', async (req, res) => {
  try {
    const [pillar] = await db.update(schema.contentPillars)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(schema.contentPillars.id, req.params.id))
      .returning();
    res.json(pillar);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update pillar' });
  }
});

router.delete('/pillars/:id', async (req, res) => {
  try {
    await db.delete(schema.contentPillars).where(eq(schema.contentPillars.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete pillar' });
  }
});

// --- Channels CRUD ---
router.get('/channels', async (_req, res) => {
  try {
    const channels = await db.select().from(schema.channels);
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get channels' });
  }
});

router.post('/channels', async (req, res) => {
  try {
    const [channel] = await db.insert(schema.channels).values(req.body).returning();
    res.json(channel);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

router.put('/channels/:id', async (req, res) => {
  try {
    const [channel] = await db.update(schema.channels)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(schema.channels.id, req.params.id))
      .returning();
    res.json(channel);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

router.delete('/channels/:id', async (req, res) => {
  try {
    await db.delete(schema.channels).where(eq(schema.channels.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

// --- Content Types CRUD ---
router.get('/content-types', async (_req, res) => {
  try {
    const types = await db.select().from(schema.contentTypes);
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get content types' });
  }
});

router.post('/content-types', async (req, res) => {
  try {
    const [ct] = await db.insert(schema.contentTypes).values(req.body).returning();
    res.json(ct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create content type' });
  }
});

router.put('/content-types/:id', async (req, res) => {
  try {
    const [ct] = await db.update(schema.contentTypes)
      .set(req.body)
      .where(eq(schema.contentTypes.id, req.params.id))
      .returning();
    res.json(ct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update content type' });
  }
});

router.delete('/content-types/:id', async (req, res) => {
  try {
    await db.delete(schema.contentTypes).where(eq(schema.contentTypes.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete content type' });
  }
});

// --- Templates ---
router.get('/templates', async (_req, res) => {
  try {
    const templates = await db.select().from(schema.starterTemplates);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

router.post('/config/apply-template', async (req, res) => {
  try {
    const { templateId } = req.body;
    const [template] = await db.select().from(schema.starterTemplates).where(eq(schema.starterTemplates.id, templateId));
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const tpl = template.templateData;

    // Clear existing config
    await db.delete(schema.appConfig);
    await db.delete(schema.contentPillars);
    await db.delete(schema.channels);
    await db.delete(schema.contentTypes);
    await db.delete(schema.newsSources);
    await db.delete(schema.voiceProfile);

    // Apply template
    await db.insert(schema.appConfig).values({ brandName: tpl.brandName, tagline: tpl.tagline });

    for (let i = 0; i < tpl.pillars.length; i++) {
      const p = tpl.pillars[i];
      await db.insert(schema.contentPillars).values({ slug: p.slug, label: p.label, description: p.description, color: p.color, sortOrder: i });
    }

    for (const c of tpl.channels) {
      await db.insert(schema.channels).values({ slug: c.slug, label: c.label, platform: c.platform, color: c.color, maxLength: c.maxLength });
    }

    for (const ct of tpl.contentTypes) {
      await db.insert(schema.contentTypes).values({ slug: ct.slug, label: ct.label });
    }

    for (const s of tpl.sources) {
      await db.insert(schema.newsSources).values({ name: s.name, url: s.url, cssSelector: s.cssSelector, category: s.category });
    }

    await db.insert(schema.voiceProfile).values({
      principles: tpl.voice.principles,
      doExamples: tpl.voice.doExamples,
      dontExamples: tpl.voice.dontExamples,
      reminders: tpl.voice.reminders,
      jargonBlacklist: tpl.voice.jargonBlacklist,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Apply template error:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

export default router;
