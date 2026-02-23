import { Router } from 'express';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { scrapeSource, scrapeSources } from '../lib/scraper.js';

const router = Router();

// Get all sources
router.get('/sources', async (_req, res) => {
  try {
    const sources = await db.select().from(schema.newsSources);
    res.json(sources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get sources' });
  }
});

router.post('/sources', async (req, res) => {
  try {
    const [source] = await db.insert(schema.newsSources).values(req.body).returning();
    res.json(source);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create source' });
  }
});

router.put('/sources/:id', async (req, res) => {
  try {
    const [source] = await db.update(schema.newsSources)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(schema.newsSources.id, req.params.id))
      .returning();
    res.json(source);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update source' });
  }
});

router.delete('/sources/:id', async (req, res) => {
  try {
    await db.delete(schema.newsSources).where(eq(schema.newsSources.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete source' });
  }
});

// Test scrape a single source
router.post('/sources/:id/test', async (req, res) => {
  try {
    const [source] = await db.select().from(schema.newsSources).where(eq(schema.newsSources.id, req.params.id));
    if (!source) return res.status(404).json({ error: 'Source not found' });

    const headlines = await scrapeSource({
      name: source.name,
      url: source.url,
      cssSelector: source.cssSelector,
    });
    res.json({ headlines });
  } catch (error) {
    res.status(500).json({ error: 'Failed to test scrape' });
  }
});

// Scrape selected sources
router.post('/sources/scrape', async (req, res) => {
  try {
    const { sourceIds } = req.body;
    let sources;
    if (sourceIds && sourceIds.length > 0) {
      sources = [];
      for (const id of sourceIds) {
        const [source] = await db.select().from(schema.newsSources).where(eq(schema.newsSources.id, id));
        if (source) sources.push(source);
      }
    } else {
      sources = await db.select().from(schema.newsSources).where(eq(schema.newsSources.isActive, true));
    }

    const results = await scrapeSources(
      sources.map(s => ({ name: s.name, url: s.url, cssSelector: s.cssSelector }))
    );
    res.json(results);
  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({ error: 'Failed to scrape sources' });
  }
});

export default router;
