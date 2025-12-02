import { GoogleGenAI, Type } from "@google/genai";
import { Category, TransactionNature, AssetType } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * AI Helper: Fetch the current price of a stock symbol using Google Search grounding.
 * Now with specialized prompts for different asset types.
 */
export const fetchStockPrice = async (symbol: string, assetType: AssetType): Promise<number | null> => {
  try {
    const model = 'gemini-2.5-flash';
    let prompt = '';
    const upperSymbol = symbol.toUpperCase();

    switch (assetType) {
      case 'us_stock':
        prompt = `What is the current stock price for the symbol "${upperSymbol}" in USD? Respond with only the numerical value, without any currency symbols, commas, or extra text.`;
        break;
      case 'crypto':
        prompt = `What is the current price of ${upperSymbol} in Indian Rupees (INR)? Respond with only the numerical value, without any currency symbols, commas, or extra text. For example, for BTC, give the price of one Bitcoin in INR.`;
        break;
      case 'metal':
        let metalName = upperSymbol;
        if (upperSymbol.includes('GOLD')) metalName = '22K Gold';
        if (upperSymbol.includes('SILVER')) metalName = 'Silver';
        prompt = `What is the current price of ${metalName} in Indian Rupees (INR) per gram? Respond with only the numerical value, without any currency symbols, commas, or extra text.`;
        break;
      case 'stock':
      case 'fund':
      default:
        prompt = `What is the current price for the stock or mutual fund symbol "${upperSymbol}" on an Indian exchange in INR? Respond with only the numerical value, without any currency symbols, commas, or extra text.`;
        break;
    }


    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text?.trim();
    if (!text) {
      console.warn(`AI Stock Price Fetch: No text response for ${symbol}`);
      return null;
    }

    // Clean the text to handle various formats Gemini might return
    const cleanedText = text.replace(/[^0-9.]/g, '');
    const price = parseFloat(cleanedText);

    if (isNaN(price) || price <= 0) {
      console.warn(`AI Stock Price Fetch: Could not parse a valid price from response: "${text}" for ${symbol}`);
      return null;
    }

    return price;

  } catch (error) {
    console.error(`AI Stock Price Fetch failed for ${symbol}:`, error);
    return null;
  }
};


/**
 * AI Helper: Categorize a single transaction description
 */
export const analyzeExpenseText = async (text: string): Promise<{ category: Category; nature: TransactionNature }> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      You are an expert financial categorizer for an Indian user.
      Analyze this transaction description: "${text}"
      
      1. Map it to ONE of these Categories:
      ${Object.values(Category).join(', ')}
      
      2. Map it to ONE of these Natures (expense type):
      need, want, luxury, saving, income

      **Examples:**
      - "ZOMATO PAYMENTS" -> {"category": "Food & Dining", "nature": "want"}
      - "SALARY CREDIT" -> {"category": "Salary & Income", "nature": "income"}
      - "SWIGGY INSTAMART" -> {"category": "Groceries (Blinkit/Zepto)", "nature": "need"}
      - "INDIAN OIL PETROL" -> {"category": "Transport & Fuel", "nature": "need"}
      - "RENT JAN" -> {"category": "Housing/Rent", "nature": "need"}
      - "NETFLIX" -> {"category": "Entertainment", "nature": "want"}
      - "SIP FOR MUTUAL FUND" -> {"category": "SIP & Investments", "nature": "saving"}
      - "DESIGNER SNEAKERS" -> {"category": "Shopping", "nature": "luxury"}

      Return ONLY a valid JSON object: {"category": "...", "nature": "..."}
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: Object.values(Category) },
            nature: { type: Type.STRING, enum: ['need', 'want', 'luxury', 'saving', 'income'] }
          },
          required: ['category', 'nature']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      category: (result.category as Category) || Category.Others,
      nature: (result.nature as TransactionNature) || 'want'
    };
  } catch (error) {
    console.error("AI Categorization failed:", error);
    return { category: Category.Others, nature: 'want' };
  }
};

/**
 * AI Helper: Categorize a BATCH of transaction descriptions efficiently.
 */
export const analyzeMultipleExpenseTexts = async (descriptions: string[]): Promise<Array<{ category: Category; nature: TransactionNature }>> => {
  if (!descriptions || descriptions.length === 0) {
    return [];
  }

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      You are an expert financial categorizer for an Indian user.
      Analyze the following list of transaction descriptions.
      For EACH description, provide its most likely category and expense nature.

      **Instructions:**
      1.  Return a valid JSON array.
      2.  The array MUST contain exactly ${descriptions.length} objects.
      3.  Each object must have a "category" and a "nature" key.
      4.  Follow the output format precisely.

      **Valid Categories:** ${Object.values(Category).join(', ')}
      **Valid Natures:** need, want, luxury, saving, income

      **Example:**
      Input Descriptions:
      1. "ZOMATO PAYMENTS"
      2. "SALARY CREDIT"
      3. "RENT MAY 2024"
      4. "ZERODHA KITE"

      Your JSON Output:
      [
        {"category": "Food & Dining", "nature": "want"},
        {"category": "Salary & Income", "nature": "income"},
        {"category": "Housing/Rent", "nature": "need"},
        {"category": "SIP & Investments", "nature": "saving"}
      ]

      ---
      
      **Descriptions to Analyze (Total: ${descriptions.length}):**
      ${descriptions.map((d, i) => `${i + 1}. "${d}"`).join('\n')}

      **Your JSON Output (A single JSON array with ${descriptions.length} items):**
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, enum: Object.values(Category) },
              nature: { type: Type.STRING, enum: ['need', 'want', 'luxury', 'saving', 'income'] }
            },
            required: ['category', 'nature']
          }
        }
      }
    });

    const results = JSON.parse(response.text || '[]');

    // Ensure the results array has the same length as the input descriptions
    if (results.length !== descriptions.length) {
      console.error("AI batch analysis returned a mismatched number of results.");
      // Fallback to Others/want for all
      return descriptions.map(() => ({ category: Category.Others, nature: 'want' }));
    }

    return results.map((result: any) => ({
      category: (result.category as Category) || Category.Others,
      nature: (result.nature as TransactionNature) || 'want'
    }));

  } catch (error) {
    console.error("AI Batch Categorization failed:", error);
    // On failure, return a default for each description
    return descriptions.map(() => ({ category: Category.Others, nature: 'want' }));
  }
};