import { GoogleGenAI } from "@google/genai";
import { WarehouseConfig, StorageStats, GeminiOptimizationResult, LayoutItem } from '../types';
import { PALLET_WIDTH, PALLET_DEPTH } from '../constants';

export const getAIOptimization = async (
  config: WarehouseConfig, 
  stats: StorageStats
): Promise<GeminiOptimizationResult> => {
  if (!process.env.API_KEY) {
    return {
      suggestion: "API Key not configured. Please set the API_KEY environment variable to use AI features.",
      score: 0,
      potentialRevenue: "AED 0",
      maxCbm: "0 m³"
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Data prep for prompt
  const dims = config.dimensions;
  const areaM2 = config.dimensions.totalArea;
  const currentVolM3 = (stats.cubicVolume/1000000).toFixed(2);
  
  // Calculate max potential mathematically to guide the AI
  const totalTheoreticalVol = (dims.length * dims.width * dims.height) / 1000000;

  const prompt = `
    Act as a Warehouse Architect for 'Writer Relocations Services LLC' in UAE.
    Goal: Maximize Revenue based on Selling CBM in AED (Dirhams).

    --- DATA ---
    Floor Size: ${dims.length}cm (L) x ${dims.width}cm (W) x ${dims.height}cm (H)
    Total Area: ${areaM2} m²
    Price/CBM: AED ${config.pricePerCbm}
    Current Storage Type: ${config.storageType}
    Aisle Width Constraint: Minimum ${config.aisleWidth} cm.

    --- TASK ---
    1. Analyze the dimensions and price.
    2. If Price/CBM is HIGH (>50 AED), prioritize maximum density (Very Narrow Aisles, taller racks).
    3. If Price/CBM is LOW, prioritize standard access.
    4. **DESIGN THE FLOORPLAN**: Generate a JSON array of 'LayoutItem' objects representing an optimized rack layout.
       - Place an 'office' (approx 500x400cm) near (0,0).
       - Fill the rest with 'rack' items (standard: width ${PALLET_WIDTH}cm, height ${PALLET_DEPTH}cm).
       - Ensure aisles are at least ${config.aisleWidth}cm wide between rows.
       - Do not exceed bounds: x (0 to ${dims.length}), y (0 to ${dims.width}).
       - Calculate exact x,y coordinates.
    
    --- OUTPUT FORMAT ---
    Return ONLY valid JSON:
    {
      "score": <number 0-100>,
      "suggestion": "<string strategy summary, max 30 words>",
      "potentialRevenue": "<string formatted 'AED XXX,XXX'>",
      "maxCbm": "<string formatted 'XXX m³'>",
      "layout": [
        { "id": "ai-office", "type": "office", "x": 100, "y": 100, "width": 500, "height": 400, "depth": 300, "rotation": 0, "color": "#dbeafe", "label": "OFFICE" },
        { "id": "ai-rack-1", "type": "rack", "x": 700, "y": 100, "width": ${PALLET_WIDTH}, "height": ${PALLET_DEPTH}, "depth": ${dims.height - 50}, "rotation": 0, "color": "#FFCC00", "rackDetails": { "status": "available", "volumeOccupied": 0, "price": ${config.pricePerCbm} } },
        ... more racks ...
      ]
    }
    IMPORTANT: Limit the 'layout' array to a maximum of 60 items to ensure JSON integrity. Use rows/blocks if needed, but 'rack' items preferred.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const result = JSON.parse(text);

    return {
      suggestion: result.suggestion || "Layout generated.",
      score: result.score || 50,
      potentialRevenue: result.potentialRevenue || "AED 0",
      maxCbm: result.maxCbm || "0 m³",
      generatedLayout: result.layout || []
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      suggestion: "AI Analysis failed. Try again.",
      score: 0,
      potentialRevenue: "AED 0",
      maxCbm: "0 m³"
    };
  }
};