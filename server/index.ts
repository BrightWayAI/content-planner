import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize Anthropic client
const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  return new Anthropic({ apiKey });
};

// News sources to scrape
const NEWS_SOURCES = [
  // AI Newsletters
  { name: 'Superhuman', url: 'https://www.superhuman.ai/', selector: 'article, .post, h2, h3' },
  { name: 'The Deep View', url: 'https://www.thedeepview.com/', selector: 'article, .post, h2, h3' },
  { name: 'The Rundown AI', url: 'https://www.therundown.ai/', selector: 'article, .post, h2, h3' },
  { name: 'Every', url: 'https://every.to/', selector: 'article, .post, h2, h3' },
  // Tech news
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/', selector: 'article h2, article h3' },
  { name: 'Ars Technica AI', url: 'https://arstechnica.com/ai/', selector: 'article h2' },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/ai/', selector: 'article h2, .article-title' },
  // Business
  { name: 'HBR', url: 'https://hbr.org/topic/subject/technology', selector: 'article h3, .headline' },
];

// Voice guidelines for content generation
const VOICE_GUIDELINES = `
Write in plain language, avoiding jargon like "leverage", "synergy", "paradigm shift", "best-in-class".
Use concise sentences under 20 words when possible.
Write like you're explaining to a smart friend over coffee.
Use "I" and share real experiences. Be authentic.
Focus on practical, actionable insights.
Avoid bullet points when narrative prose works better.
Never fabricate examples - only use real experiences or omit.
`;

const PILLARS = {
  operational_ai: 'AI as infrastructure, governance, operating models, organizational change',
  human_ai_collaboration: 'Pilot mindset, skills, workflows, human-AI teaming',
  practical_implementation: 'Tools, how-tos, real examples, step-by-step guidance',
};

// Scrape headlines from a source
async function scrapeSource(source: { name: string; url: string; selector: string }): Promise<string[]> {
  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);

    const headlines: string[] = [];
    $(source.selector).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20 && text.length < 200) {
        headlines.push(text);
      }
    });

    return headlines.slice(0, 10);
  } catch (error) {
    console.error(`Failed to scrape ${source.name}:`, error);
    return [];
  }
}

// Generate ideas from news
app.post('/api/generate-ideas', async (req, res) => {
  try {
    const client = getAnthropicClient();

    // Scrape recent headlines
    console.log('Scraping news sources...');
    const allHeadlines: string[] = [];

    for (const source of NEWS_SOURCES.slice(0, 4)) { // Limit to avoid rate limits
      const headlines = await scrapeSource(source);
      allHeadlines.push(...headlines.map(h => `[${source.name}] ${h}`));
    }

    if (allHeadlines.length === 0) {
      // Fallback if scraping fails
      return res.json({
        ideas: [{
          title: "Today's AI trends worth commenting on",
          pillar: 'operational_ai',
          notes: 'Check the latest AI news and find an angle that connects to operational AI transformation.',
          priority: 'high',
        }],
      });
    }

    const prompt = `You are helping create thought leadership content for BrightWay AI, a consulting firm focused on AI transformation.

Our content pillars are:
1. Operational AI: ${PILLARS.operational_ai}
2. Human-AI Collaboration: ${PILLARS.human_ai_collaboration}
3. Practical Implementation: ${PILLARS.practical_implementation}

Here are today's AI news headlines:
${allHeadlines.slice(0, 15).join('\n')}

Generate 3-5 LinkedIn post ideas that:
- Take a unique angle on these news items
- Connect to our content pillars
- Would resonate with C-suite executives at mid-sized companies
- Challenge conventional thinking or offer practical insights

For each idea, provide:
- title: A compelling post title/hook (not a headline, but a thought-provoking statement)
- pillar: One of "operational_ai", "human_ai_collaboration", or "practical_implementation"
- notes: 1-2 sentences on the angle to take

Respond with valid JSON array only, no markdown:
[{"title": "...", "pillar": "...", "notes": "..."}]`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const ideas = JSON.parse(content.text);
    res.json({ ideas });
  } catch (error) {
    console.error('Generate ideas error:', error);
    res.status(500).json({ error: 'Failed to generate ideas' });
  }
});

// Generate a draft from an idea
app.post('/api/generate-draft', async (req, res) => {
  try {
    const client = getAnthropicClient();
    const { title, pillar, channel, notes } = req.body;

    const channelGuidance = channel === 'business_linkedin'
      ? 'Write for the BrightWay business account. Be authoritative and strategic. Focus on organizational transformation.'
      : 'Write for a personal LinkedIn account. Be conversational and share personal experiences. Use "I" naturally.';

    const prompt = `Write a LinkedIn post based on this idea:

Title/Topic: ${title}
Content Pillar: ${pillar} - ${PILLARS[pillar as keyof typeof PILLARS] || ''}
${notes ? `Notes: ${notes}` : ''}

${channelGuidance}

${VOICE_GUIDELINES}

Structure:
1. Hook (first line that grabs attention, under 15 words)
2. Body (3-5 short paragraphs, each 2-3 sentences max)
3. End with a question or call to engage

Respond with valid JSON only:
{"hook": "The first line...", "body": "The rest of the post..."}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const draft = JSON.parse(content.text);
    res.json(draft);
  } catch (error) {
    console.error('Generate draft error:', error);
    res.status(500).json({ error: 'Failed to generate draft' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
  });
});

// Serve static files in production
if (isProduction) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mode: ${isProduction ? 'production' : 'development'}`);
  console.log(`API Key configured: ${!!process.env.ANTHROPIC_API_KEY}`);
});
