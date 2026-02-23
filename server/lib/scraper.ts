import * as cheerio from 'cheerio';

export interface ScrapeSource {
  name: string;
  url: string;
  cssSelector: string;
}

export interface ScrapeResult {
  source: string;
  headlines: string[];
}

export async function scrapeSource(source: ScrapeSource): Promise<string[]> {
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
    $(source.cssSelector).each((_, el) => {
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

export async function scrapeSources(sources: ScrapeSource[]): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];
  for (const source of sources) {
    const headlines = await scrapeSource(source);
    results.push({ source: source.name, headlines });
  }
  return results;
}

export async function scrapeArticleText(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script, style, nav, footer elements
    $('script, style, nav, footer, header, aside').remove();

    // Try article content first, then body
    const article = $('article').text().trim();
    if (article && article.length > 100) return article;

    const main = $('main').text().trim();
    if (main && main.length > 100) return main;

    return $('body').text().trim();
  } catch (error) {
    console.error(`Failed to scrape article text from ${url}:`, error);
    throw error;
  }
}
