import { Router } from 'express';
import { db, schema } from '../db/index.js';
import { generateWithClaude, hasApiKey } from '../lib/ai.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', hasApiKey: hasApiKey() });
});

// Generate ideas from selected headlines + pillars
router.post('/ai/generate-ideas', async (req, res) => {
  try {
    const { headlines, pillarIds } = req.body;

    // Get pillar info
    const pillars = await db.select().from(schema.contentPillars);
    const relevantPillars = pillarIds
      ? pillars.filter(p => pillarIds.includes(p.id))
      : pillars;

    const pillarText = relevantPillars.map((p, i) => `${i + 1}. ${p.label}: ${p.description}`).join('\n');

    // Get voice profile for context
    const [voice] = await db.select().from(schema.voiceProfile).limit(1);
    const [config] = await db.select().from(schema.appConfig).limit(1);

    const brandContext = config ? `for ${config.brandName}` : '';

    const prompt = `You are helping create thought leadership content ${brandContext}.

Our content pillars are:
${pillarText}

${headlines && headlines.length > 0 ? `Here are selected news headlines to draw inspiration from:\n${headlines.join('\n')}` : 'Generate original thought leadership ideas based on the content pillars.'}

${voice?.analyzedVoiceSummary ? `\nVoice style to match:\n${voice.analyzedVoiceSummary}` : ''}

Generate 3-5 content ideas that:
- Take a unique angle
- Connect to the content pillars
- Challenge conventional thinking or offer practical insights

For each idea, provide:
- title: A compelling post title/hook
- pillarId: The UUID of the most relevant pillar from: ${relevantPillars.map(p => `"${p.id}" (${p.label})`).join(', ')}
- notes: 1-2 sentences on the angle to take
- priority: "high" or "medium"

Respond with valid JSON array only, no markdown:
[{"title": "...", "pillarId": "...", "notes": "...", "priority": "..."}]`;

    const text = await generateWithClaude(prompt);
    const ideas = JSON.parse(text);
    res.json({ ideas });
  } catch (error) {
    console.error('Generate ideas error:', error);
    res.status(500).json({ error: 'Failed to generate ideas' });
  }
});

// Generate a draft
router.post('/ai/generate-draft', async (req, res) => {
  try {
    const { title, pillarId, channelId, notes } = req.body;

    // Fetch related data
    const pillars = await db.select().from(schema.contentPillars);
    const channels = await db.select().from(schema.channels);
    const [voice] = await db.select().from(schema.voiceProfile).limit(1);
    const [config] = await db.select().from(schema.appConfig).limit(1);

    const pillar = pillars.find(p => p.id === pillarId);
    const channel = channels.find(c => c.id === channelId);

    let channelGuidance = '';
    if (channel) {
      channelGuidance = `Write for ${channel.label} (${channel.platform}).`;
      if (channel.maxLength) {
        channelGuidance += ` Keep under ${channel.maxLength} characters.`;
      }
    }

    // Build voice instructions
    let voiceInstructions = '';
    if (voice) {
      if (voice.analyzedVoiceSummary) {
        voiceInstructions += `\nVoice style:\n${voice.analyzedVoiceSummary}\n`;
      }
      if (voice.principles && (voice.principles as string[]).length > 0) {
        voiceInstructions += `\nPrinciples: ${(voice.principles as string[]).join(', ')}\n`;
      }
      if (voice.jargonBlacklist && (voice.jargonBlacklist as string[]).length > 0) {
        voiceInstructions += `\nAvoid these words: ${(voice.jargonBlacklist as string[]).join(', ')}\n`;
      }
    }

    const prompt = `Write a post based on this idea:

Title/Topic: ${title}
${pillar ? `Content Pillar: ${pillar.label} - ${pillar.description}` : ''}
${notes ? `Notes: ${notes}` : ''}

${channelGuidance}
${voiceInstructions}

Structure:
1. Hook (first line that grabs attention, under 15 words)
2. Body (3-5 short paragraphs, each 2-3 sentences max)
3. End with a question or call to engage

Respond with valid JSON only:
{"hook": "The first line...", "body": "The rest of the post..."}`;

    const text = await generateWithClaude(prompt);
    const draft = JSON.parse(text);
    res.json(draft);
  } catch (error) {
    console.error('Generate draft error:', error);
    res.status(500).json({ error: 'Failed to generate draft' });
  }
});

// Refine a draft
router.post('/ai/refine-draft', async (req, res) => {
  try {
    const { hook, body, instruction } = req.body;

    const [voice] = await db.select().from(schema.voiceProfile).limit(1);

    let voiceContext = '';
    if (voice?.analyzedVoiceSummary) {
      voiceContext = `\nMaintain this voice style:\n${voice.analyzedVoiceSummary}\n`;
    }
    if (voice?.jargonBlacklist && (voice.jargonBlacklist as string[]).length > 0) {
      voiceContext += `\nAvoid these words: ${(voice.jargonBlacklist as string[]).join(', ')}\n`;
    }

    const prompt = `Refine the following draft based on the instruction.

Current Hook: ${hook || '(none)'}

Current Body:
${body}
${voiceContext}

Instruction: ${instruction}

Apply the requested changes while keeping the core message intact. Return the refined version.

Respond with valid JSON only:
{"hook": "The refined hook...", "body": "The refined body...", "changes": "Brief description of what was changed"}`;

    const text = await generateWithClaude(prompt);
    const result = JSON.parse(text);
    res.json(result);
  } catch (error) {
    console.error('Refine draft error:', error);
    res.status(500).json({ error: 'Failed to refine draft' });
  }
});

export default router;
