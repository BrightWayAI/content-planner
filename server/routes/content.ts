import { Router } from 'express';
import { db, schema } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// --- Content Ideas ---
router.get('/ideas', async (_req, res) => {
  try {
    const ideas = await db.select().from(schema.contentIdeas).orderBy(desc(schema.contentIdeas.createdAt));
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get ideas' });
  }
});

router.post('/ideas', async (req, res) => {
  try {
    const [idea] = await db.insert(schema.contentIdeas).values(req.body).returning();
    res.json(idea);
  } catch (error) {
    console.error('Create idea error:', error);
    res.status(500).json({ error: 'Failed to create idea' });
  }
});

router.post('/ideas/batch', async (req, res) => {
  try {
    const { ideas } = req.body;
    const created = await db.insert(schema.contentIdeas).values(ideas).returning();
    res.json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to batch create ideas' });
  }
});

router.put('/ideas/:id', async (req, res) => {
  try {
    const [idea] = await db.update(schema.contentIdeas)
      .set(req.body)
      .where(eq(schema.contentIdeas.id, req.params.id))
      .returning();
    res.json(idea);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update idea' });
  }
});

router.delete('/ideas/:id', async (req, res) => {
  try {
    await db.delete(schema.contentIdeas).where(eq(schema.contentIdeas.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete idea' });
  }
});

router.delete('/ideas', async (req, res) => {
  try {
    const { ids } = req.body;
    for (const id of ids) {
      await db.delete(schema.contentIdeas).where(eq(schema.contentIdeas.id, id));
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk delete ideas' });
  }
});

// Promote idea to content piece
router.post('/ideas/:id/promote', async (req, res) => {
  try {
    const [idea] = await db.select().from(schema.contentIdeas).where(eq(schema.contentIdeas.id, req.params.id));
    if (!idea) return res.status(404).json({ error: 'Idea not found' });

    const { channelId } = req.body;
    const [piece] = await db.insert(schema.contentPieces).values({
      title: idea.title,
      status: 'drafting',
      pillarId: idea.pillarId,
      channelId,
      body: idea.notes || '',
    }).returning();

    // Delete the idea
    await db.delete(schema.contentIdeas).where(eq(schema.contentIdeas.id, req.params.id));

    res.json(piece);
  } catch (error) {
    console.error('Promote idea error:', error);
    res.status(500).json({ error: 'Failed to promote idea' });
  }
});

// --- Content Pieces ---
router.get('/pieces', async (_req, res) => {
  try {
    const pieces = await db.select().from(schema.contentPieces).orderBy(desc(schema.contentPieces.updatedAt));
    res.json(pieces);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get content pieces' });
  }
});

router.get('/pieces/:id', async (req, res) => {
  try {
    const [piece] = await db.select().from(schema.contentPieces).where(eq(schema.contentPieces.id, req.params.id));
    if (!piece) return res.status(404).json({ error: 'Piece not found' });
    res.json(piece);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get content piece' });
  }
});

router.post('/pieces', async (req, res) => {
  try {
    const [piece] = await db.insert(schema.contentPieces).values(req.body).returning();
    res.json(piece);
  } catch (error) {
    console.error('Create piece error:', error);
    res.status(500).json({ error: 'Failed to create content piece' });
  }
});

router.put('/pieces/:id', async (req, res) => {
  try {
    const [piece] = await db.update(schema.contentPieces)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(schema.contentPieces.id, req.params.id))
      .returning();
    res.json(piece);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update content piece' });
  }
});

router.delete('/pieces/:id', async (req, res) => {
  try {
    await db.delete(schema.contentPieces).where(eq(schema.contentPieces.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete content piece' });
  }
});

// --- Content Metrics ---
router.get('/metrics', async (_req, res) => {
  try {
    const metrics = await db.select().from(schema.contentMetrics).orderBy(desc(schema.contentMetrics.recordedAt));
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

router.get('/metrics/:contentPieceId', async (req, res) => {
  try {
    const metrics = await db.select().from(schema.contentMetrics)
      .where(eq(schema.contentMetrics.contentPieceId, req.params.contentPieceId))
      .orderBy(desc(schema.contentMetrics.recordedAt));
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

router.post('/metrics', async (req, res) => {
  try {
    const [metric] = await db.insert(schema.contentMetrics).values(req.body).returning();
    res.json(metric);
  } catch (error) {
    console.error('Create metric error:', error);
    res.status(500).json({ error: 'Failed to create metric' });
  }
});

router.put('/metrics/:id', async (req, res) => {
  try {
    const [metric] = await db.update(schema.contentMetrics)
      .set(req.body)
      .where(eq(schema.contentMetrics.id, req.params.id))
      .returning();
    res.json(metric);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update metric' });
  }
});

// --- Draft Versions ---
router.get('/versions/:contentPieceId', async (req, res) => {
  try {
    const versions = await db.select().from(schema.draftVersions)
      .where(eq(schema.draftVersions.contentPieceId, req.params.contentPieceId))
      .orderBy(desc(schema.draftVersions.version));
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get versions' });
  }
});

router.post('/versions', async (req, res) => {
  try {
    const [version] = await db.insert(schema.draftVersions).values(req.body).returning();
    res.json(version);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create version' });
  }
});

export default router;
