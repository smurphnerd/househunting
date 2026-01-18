import "server-only";
import type { Cradle } from "@/server/initialization";
import { env } from "@/env";

export type ExtractedPropertyData = {
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareMetres?: number;
  propertyType?: string;
  carParkIncluded?: boolean;
  bodyCorpFees?: number;
  agentName?: string;
  agentContact?: string;
};

export class OpenRouterService {
  constructor(private deps: Cradle) {}

  private get apiKey() {
    return env.OPENROUTER_API_KEY;
  }

  private get model() {
    return env.OPENROUTER_MODEL;
  }

  async extractPropertyData(url: string): Promise<ExtractedPropertyData> {
    if (!this.apiKey) {
      throw new Error("OpenRouter API key not configured");
    }

    const pageContent = await this.fetchPageContent(url);
    const extractedData = await this.extractWithAI(pageContent);
    return extractedData;
  }

  private async fetchPageContent(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; HouseHuntingBot/1.0)",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      const html = await response.text();

      // Simple HTML to text conversion
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 15000);

      return text;
    } catch (error) {
      this.deps.logger.error({ error, url }, "Failed to fetch page content");
      throw new Error("Failed to fetch listing page. The site may be blocking automated access.");
    }
  }

  private async extractWithAI(pageContent: string): Promise<ExtractedPropertyData> {
    const systemPrompt = `You are a property data extraction assistant. Extract property details from the provided listing text.
Return a JSON object with these fields (use null if not found):
- price: number (just the number, no currency symbols)
- bedrooms: number
- bathrooms: number
- squareMetres: number (internal floor area)
- propertyType: string (apartment, unit, townhouse, or house)
- carParkIncluded: boolean
- bodyCorpFees: number (annual, convert quarterly to annual if needed)
- agentName: string
- agentContact: string (phone or email)

Only return valid JSON, no explanation.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://house-hunting.app",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract property data from this listing:\n\n${pageContent}` },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.deps.logger.error({ error }, "OpenRouter API error");
      throw new Error("AI extraction failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    try {
      const parsed = JSON.parse(content);
      return {
        price: parsed.price ?? undefined,
        bedrooms: parsed.bedrooms ?? undefined,
        bathrooms: parsed.bathrooms ?? undefined,
        squareMetres: parsed.squareMetres ?? undefined,
        propertyType: parsed.propertyType ?? undefined,
        carParkIncluded: parsed.carParkIncluded ?? undefined,
        bodyCorpFees: parsed.bodyCorpFees ?? undefined,
        agentName: parsed.agentName ?? undefined,
        agentContact: parsed.agentContact ?? undefined,
      };
    } catch {
      this.deps.logger.error({ content }, "Failed to parse AI response");
      throw new Error("Failed to parse extracted data");
    }
  }
}
