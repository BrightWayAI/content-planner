import 'dotenv/config';
import { db, schema } from './index.js';
import { eq } from 'drizzle-orm';

const AI_CONSULTING_TEMPLATE = {
  brandName: 'My Brand',
  tagline: 'Thought Leadership',
  pillars: [
    { slug: 'operational_ai', label: 'Operational AI', description: 'AI as infrastructure, governance, operating models, organizational change.', color: 'bg-blue-500' },
    { slug: 'human_ai_collaboration', label: 'Human-AI Collaboration', description: 'Pilot mindset, skills, workflows, human-AI teaming.', color: 'bg-green-500' },
    { slug: 'practical_implementation', label: 'Practical Implementation', description: 'Actionable guidance. Tools, how-tos, real examples.', color: 'bg-purple-500' },
  ],
  channels: [
    { slug: 'personal_linkedin', label: 'Personal LinkedIn', platform: 'linkedin', color: 'bg-orange-500', maxLength: 3000 },
    { slug: 'business_linkedin', label: 'Business LinkedIn', platform: 'linkedin', color: 'bg-cyan-500', maxLength: 3000 },
  ],
  contentTypes: [
    { slug: 'short_post', label: 'Short Post' },
    { slug: 'long_article', label: 'Long Article' },
    { slug: 'monthly_digest', label: 'Monthly Digest' },
    { slug: 'case_study', label: 'Case Study' },
  ],
  sources: [
    { name: 'Superhuman', url: 'https://www.superhuman.ai/', cssSelector: 'article, .post, h2, h3', category: 'Newsletter' },
    { name: 'The Rundown AI', url: 'https://www.therundown.ai/', cssSelector: 'article, .post, h2, h3', category: 'Newsletter' },
    { name: 'Every', url: 'https://every.to/', cssSelector: 'article, .post, h2, h3', category: 'Newsletter' },
    { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/', cssSelector: 'article h2, article h3', category: 'Tech' },
    { name: 'Ars Technica', url: 'https://arstechnica.com/ai/', cssSelector: 'article h2', category: 'Tech' },
    { name: 'VentureBeat AI', url: 'https://venturebeat.com/ai/', cssSelector: 'article h2, .article-title', category: 'Tech' },
    { name: 'HBR Tech', url: 'https://hbr.org/topic/subject/technology', cssSelector: 'article h3, .headline', category: 'Business' },
  ],
  voice: {
    principles: ['Plain language over jargon', 'Concise sentences (under 20 words)', 'Authentic voice', 'Narrative flow (paragraphs over bullets)', 'Real examples only'],
    doExamples: ["Here's what I've learned...", "This didn't work for us because...", 'Try this instead...', 'Most AI projects fail...', 'I tested this with three clients...'],
    dontExamples: ['Research indicates that...', 'Suboptimal outcomes resulted from...', 'Consider implementing...', 'Challenges in AI adoption include...', 'Industry leaders report...'],
    reminders: ["Write like you're explaining to a smart friend over coffee", 'If a sentence needs re-reading, simplify it', 'One idea per post/section', 'Real > Impressive', 'Helpful > Viral'],
    jargonBlacklist: ['leverage', 'synergy', 'paradigm shift', 'best-in-class', 'cutting-edge', 'game-changer', 'disruptive', 'innovative', 'scalable', 'robust', 'holistic', 'end-to-end', 'mission-critical', 'bleeding edge', 'world-class', 'next-generation', 'seamless', 'turnkey', 'value-add', 'bandwidth', 'circle back', 'deep dive', 'low-hanging fruit', 'move the needle', 'pivot', 'synergize', 'touch base', 'unpack', 'value proposition', 'verticals'],
  },
};

export async function seedDatabase() {
  // Check if already seeded (has app_config)
  const existing = await db.select().from(schema.appConfig).limit(1);
  if (existing.length > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }

  console.log('Seeding database with defaults...');

  const tpl = AI_CONSULTING_TEMPLATE;

  // Insert app config
  await db.insert(schema.appConfig).values({
    brandName: tpl.brandName,
    tagline: tpl.tagline,
  });

  // Insert pillars
  for (let i = 0; i < tpl.pillars.length; i++) {
    const p = tpl.pillars[i];
    await db.insert(schema.contentPillars).values({
      slug: p.slug,
      label: p.label,
      description: p.description,
      color: p.color,
      sortOrder: i,
    });
  }

  // Insert channels
  for (const c of tpl.channels) {
    await db.insert(schema.channels).values({
      slug: c.slug,
      label: c.label,
      platform: c.platform,
      color: c.color,
      maxLength: c.maxLength,
    });
  }

  // Insert content types
  for (const ct of tpl.contentTypes) {
    await db.insert(schema.contentTypes).values({
      slug: ct.slug,
      label: ct.label,
    });
  }

  // Insert news sources
  for (const s of tpl.sources) {
    await db.insert(schema.newsSources).values({
      name: s.name,
      url: s.url,
      cssSelector: s.cssSelector,
      category: s.category,
    });
  }

  // Insert voice profile
  await db.insert(schema.voiceProfile).values({
    principles: tpl.voice.principles,
    doExamples: tpl.voice.doExamples,
    dontExamples: tpl.voice.dontExamples,
    reminders: tpl.voice.reminders,
    jargonBlacklist: tpl.voice.jargonBlacklist,
  });

  // Insert starter templates
  await db.insert(schema.starterTemplates).values({
    name: 'AI Consulting',
    description: 'Default template for AI consulting thought leadership',
    templateData: tpl,
  });

  await db.insert(schema.starterTemplates).values({
    name: 'SaaS Product Marketing',
    description: 'Template for SaaS product marketing content',
    templateData: {
      brandName: 'My SaaS',
      tagline: 'Product Marketing',
      pillars: [
        { slug: 'product_updates', label: 'Product Updates', description: 'New features, releases, and product improvements.', color: 'bg-blue-500' },
        { slug: 'industry_insights', label: 'Industry Insights', description: 'Trends, analysis, and market perspectives.', color: 'bg-green-500' },
        { slug: 'customer_success', label: 'Customer Success', description: 'Case studies, testimonials, and user stories.', color: 'bg-purple-500' },
      ],
      channels: [
        { slug: 'linkedin', label: 'LinkedIn', platform: 'linkedin', color: 'bg-blue-500', maxLength: 3000 },
        { slug: 'twitter', label: 'X / Twitter', platform: 'twitter', color: 'bg-gray-800', maxLength: 280 },
        { slug: 'blog', label: 'Blog', platform: 'blog', color: 'bg-orange-500' },
      ],
      contentTypes: [
        { slug: 'short_post', label: 'Short Post' },
        { slug: 'long_article', label: 'Long Article' },
        { slug: 'thread', label: 'Thread' },
        { slug: 'case_study', label: 'Case Study' },
      ],
      sources: [
        { name: 'TechCrunch', url: 'https://techcrunch.com/', cssSelector: 'article h2, article h3', category: 'Tech' },
        { name: 'Product Hunt', url: 'https://www.producthunt.com/', cssSelector: 'h3', category: 'Product' },
      ],
      voice: {
        principles: ['Clear and direct', 'Data-driven claims', 'Customer-focused language'],
        doExamples: ['Our customers report...', 'We built this because...'],
        dontExamples: ['We are the best...', 'Our revolutionary product...'],
        reminders: ['Focus on customer value', 'Back up claims with data'],
        jargonBlacklist: ['synergy', 'paradigm shift', 'best-in-class'],
      },
    },
  });

  await db.insert(schema.starterTemplates).values({
    name: 'Personal Brand / Creator',
    description: 'Template for personal brand building and content creation',
    templateData: {
      brandName: 'My Brand',
      tagline: 'Content Creator',
      pillars: [
        { slug: 'expertise', label: 'Core Expertise', description: 'Deep knowledge and insights in your specialty.', color: 'bg-blue-500' },
        { slug: 'personal_stories', label: 'Personal Stories', description: 'Authentic experiences and lessons learned.', color: 'bg-green-500' },
        { slug: 'actionable_tips', label: 'Actionable Tips', description: 'Practical advice your audience can use today.', color: 'bg-purple-500' },
      ],
      channels: [
        { slug: 'linkedin', label: 'LinkedIn', platform: 'linkedin', color: 'bg-blue-500', maxLength: 3000 },
        { slug: 'newsletter', label: 'Newsletter', platform: 'email', color: 'bg-orange-500' },
      ],
      contentTypes: [
        { slug: 'short_post', label: 'Short Post' },
        { slug: 'long_article', label: 'Long Article' },
        { slug: 'newsletter_issue', label: 'Newsletter Issue' },
      ],
      sources: [],
      voice: {
        principles: ['Authentic and personal', 'Story-driven', 'Conversational tone'],
        doExamples: ['I learned this the hard way...', 'Here is what nobody tells you...'],
        dontExamples: ['Studies show...', 'Experts agree...'],
        reminders: ['Be yourself', 'Share real experiences'],
        jargonBlacklist: [],
      },
    },
  });

  console.log('Database seeded successfully!');
}

// Run if called directly
seedDatabase().catch(console.error);
