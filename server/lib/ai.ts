import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export function hasApiKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function generateWithClaude(prompt: string, maxTokens = 1024): Promise<string> {
  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }
  return content.text;
}
