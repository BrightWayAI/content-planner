import { Router } from 'express';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { generateWithClaude } from '../lib/ai.js';
import { scrapeArticleText } from '../lib/scraper.js';

const router = Router();

// Get voice profile
router.get('/voice', async (_req, res) => {
  try {
    const [profile] = await db.select().from(schema.voiceProfile).limit(1);
    const samples = await db.select().from(schema.voiceSamples);
    res.json({ profile: profile || null, samples });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get voice profile' });
  }
});

// Update voice profile
router.put('/voice', async (req, res) => {
  try {
    const [existing] = await db.select().from(schema.voiceProfile).limit(1);
    if (existing) {
      const [updated] = await db.update(schema.voiceProfile)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(schema.voiceProfile.id, existing.id))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db.insert(schema.voiceProfile).values(req.body).returning();
      res.json(created);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update voice profile' });
  }
});

// Add voice sample
router.post('/voice/samples', async (req, res) => {
  try {
    const { title, content, sourceType, metadata } = req.body;
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const [sample] = await db.insert(schema.voiceSamples).values({
      title,
      content,
      sourceType,
      metadata: metadata || {},
      wordCount,
    }).returning();
    res.json(sample);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add voice sample' });
  }
});

// Add voice sample from URL (scrape article text)
router.post('/voice/samples/from-url', async (req, res) => {
  try {
    const { url, title } = req.body;
    const text = await scrapeArticleText(url);
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const [sample] = await db.insert(schema.voiceSamples).values({
      title: title || url,
      content: text.slice(0, 50000),
      sourceType: 'url',
      metadata: { url },
      wordCount,
    }).returning();
    res.json(sample);
  } catch (error) {
    res.status(500).json({ error: 'Failed to scrape and add voice sample' });
  }
});

// Delete voice sample
router.delete('/voice/samples/:id', async (req, res) => {
  try {
    await db.delete(schema.voiceSamples).where(eq(schema.voiceSamples.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete voice sample' });
  }
});

// Analyze voice from samples
router.post('/voice/analyze', async (_req, res) => {
  try {
    const samples = await db.select().from(schema.voiceSamples);
    if (samples.length === 0) {
      return res.status(400).json({ error: 'No voice samples to analyze' });
    }

    // Concatenate samples, truncated to ~50k chars
    let combined = '';
    for (const sample of samples) {
      if (combined.length > 50000) break;
      combined += `\n\n--- Sample: ${sample.title} ---\n${sample.content}`;
    }

    const prompt = `Analyze the writing style of these text samples and provide a concise voice profile.

${combined}

Analyze for:
1. **Tone**: Overall voice quality (formal/informal, warm/distant, authoritative/conversational)
2. **Sentence patterns**: Average length, complexity, rhythm
3. **Vocabulary**: Level of sophistication, domain-specific terms, recurring phrases
4. **Distinctive traits**: Unique patterns, stylistic signatures, rhetorical devices
5. **Structure**: How ideas are organized, use of transitions, paragraph patterns

Respond with a structured voice summary (2-3 paragraphs) that could be used as instructions for writing in this person's voice. Be specific and actionable.`;

    const summary = await generateWithClaude(prompt, 1500);

    // Save to voice profile
    const [existing] = await db.select().from(schema.voiceProfile).limit(1);
    if (existing) {
      await db.update(schema.voiceProfile)
        .set({ analyzedVoiceSummary: summary, updatedAt: new Date() })
        .where(eq(schema.voiceProfile.id, existing.id));
    } else {
      await db.insert(schema.voiceProfile).values({ analyzedVoiceSummary: summary });
    }

    res.json({ summary });
  } catch (error) {
    console.error('Voice analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze voice' });
  }
});

export default router;
