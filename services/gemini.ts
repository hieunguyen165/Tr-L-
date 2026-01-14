import { GoogleGenAI, Type } from "@google/genai";
import { CheckResult, SeoArticleResponse, AnalyticsData, AnalyticsReport } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using gemini-3-flash-preview for fast and grounded search capabilities
const MODEL_NAME = 'gemini-3-flash-preview';
const IMAGEN_MODEL = 'imagen-4.0-generate-001';
const IMAGE_EDIT_MODEL = 'gemini-2.5-flash-image';

export const checkKeywordRank = async (keyword: string, domain: string): Promise<CheckResult> => {
  try {
    // The prompt is engineered to act as a strict SERP analyzer
    const prompt = `
      You are an advanced SEO Rank Tracker connected to Google Search.
      
      OBJECTIVE:
      Determine the organic ranking position of the website "${domain}" for the keyword "${keyword}".

      INSTRUCTIONS:
      1. Use the googleSearch tool to search for "${keyword}".
      2. Analyze the organic search results returned.
      3. Scan the results from top to bottom.
      4. Identify the *first* organic result that matches the domain "${domain}" (or its subdomains).
      5. IGNORE "Sponsored", "Ad", or "Paid" results completely. Do not count them in the ranking.
      6. The first organic result is rank 1, the second is rank 2, etc.

      OUTPUT:
      - If found: Set "rank" to the numerical position (e.g., 1, 5, 12). Set "found" to true.
      - If NOT found in the results provided: Set "rank" to 0. Set "found" to false.
      - "snippet": The title or brief description of the found result.
      
      Return ONLY the JSON object matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rank: {
              type: Type.INTEGER,
              description: "The organic ranking position found (e.g., 1, 2, 10). Return 0 if not in the search results.",
            },
            found: {
              type: Type.BOOLEAN,
              description: "Whether the domain was found in the search results.",
            },
            snippet: {
              type: Type.STRING,
              description: "The title or snippet of the search result found.",
            },
          },
          required: ["rank", "found"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from AI");
    }

    const data = JSON.parse(resultText) as CheckResult;
    return data;

  } catch (error) {
    console.error("Error checking rank:", error);
    return {
      rank: 0,
      found: false,
      snippet: "Lỗi khi kết nối Google Search"
    };
  }
};

export const generateSeoArticle = async (topic: string, keywords: string, tone: string, domain: string = ''): Promise<SeoArticleResponse | null> => {
  try {
    const prompt = `
      Bạn là một Chuyên gia Nội dung (Subject Matter Expert) và Chuyên gia SEO Senior với 15 năm kinh nghiệm.
      
      NHIỆM VỤ:
      Viết một bài viết "Authority Content" (Nội dung chuyên sâu, dẫn đầu ngành) cho chủ đề: "${topic}".
      
      YÊU CẦU CỐT LÕI (CRITICAL):
      1. ĐỘ SÂU & CHI TIẾT (Depth & Detail):
         - Không viết hời hợt hay chung chung. Phải đi sâu phân tích từng khía cạnh.
         - Giải thích rõ ràng "Tại sao", "Như thế nào", "Cơ chế hoạt động".
         - Đưa ra các ví dụ cụ thể, số liệu ước tính (nếu hợp lý) hoặc kịch bản thực tế để minh họa.
         - So sánh các giải pháp/khía cạnh nếu có thể.
      
      2. GIÁ TRỊ THỰC TẾ (Actionable Value):
         - Người đọc phải nhận được hướng dẫn cụ thể có thể làm theo ngay.
         - Cung cấp mẹo (Tips), cảnh báo (Warnings), hoặc quy trình từng bước (Step-by-step).
      
      3. CẤU TRÚC CHUẨN SEO (SEO Structure):
         - Sử dụng thẻ H2, H3 một cách logic để chia nhỏ bài viết.
         - Sử dụng Danh sách (Bullet points) để dễ đọc.
         - Sử dụng Bảng (Table) Markdown để so sánh hoặc liệt kê thông tin nếu phù hợp.
      
      THÔNG TIN ĐẦU VÀO:
      - H1 (Chủ đề): ${topic}
      - Main Keyword: ${keywords} (Phân bổ tự nhiên: Sapo, H2 đầu tiên, rải rác thân bài, Kết bài).
      - Domain: ${domain || 'Website'} (Nhắc đến thương hiệu một cách khéo léo nếu có).
      - Tone: ${tone} (Đảm bảo chuyên nghiệp nhưng thu hút).
      - Độ dài mong muốn: > 1500 từ (Càng chi tiết càng tốt).

      QUY ĐỊNH OUTPUT (JSON):
      - Trả về JSON hợp lệ theo schema.
      - 'content_markdown': Chứa toàn bộ nội dung bài viết định dạng Markdown.
      - 'faq_schema_jsonld': Tạo FAQPage Schema JSON-LD đầy đủ từ nội dung bài.
      - 'seo_checklist': Tự đánh giá bài viết vừa tạo.

      LƯU Ý: Tuyệt đối không bịa đặt (hallucinate) thông tin sai lệch về sức khỏe, luật pháp hoặc tài chính.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meta: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                slug: { type: Type.STRING },
                description: { type: Type.STRING },
                focus_keyword: { type: Type.STRING },
              }
            },
            outline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  h2: { type: Type.STRING },
                  h3: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            },
            content_markdown: { type: Type.STRING },
            faq_schema_jsonld: { type: Type.STRING },
            seo_checklist: {
              type: Type.OBJECT,
              properties: {
                word_count_target: { type: Type.NUMBER },
                target_occurrences: { type: Type.NUMBER },
                occurrences_est: { type: Type.NUMBER },
                density_est: { type: Type.NUMBER },
                cta_included: { type: Type.BOOLEAN },
                internal_links: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            notes_missing: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        },
        thinkingConfig: { thinkingBudget: 8192 },
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as SeoArticleResponse;

  } catch (error) {
    console.error("Error generating article:", error);
    return null;
  }
};

/**
 * Analyzes an input image and returns a detailed prompt suitable for image generation.
 */
export const analyzeImageForPrompt = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_EDIT_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Describe the person in this image in extreme detail, focusing on: 1) Face features (ethnicity, hair, eyes, age). 2) Body shape and proportions. Output ONLY the physical description.",
          },
        ],
      },
    });
    return response.text || "";
  } catch (error) {
    console.error("Error analyzing image:", error);
    return "";
  }
};

/**
 * Analyzes a Check-in/Lifestyle reference photo based on 8 strict criteria.
 */
export const analyzeCheckinReference = async (base64Data: string, mimeType: string): Promise<string> => {
    try {
      const prompt = `
        Analyze this "Check-in" lifestyle photo to create a detailed image generation prompt.
        Focus on these 8 key aspects to replicate the VIBE and COMPOSITION:
  
        1. **Identity (Generic)**: Describe the gender, general age, and hair style (e.g., Asian male, 25 years old, short black hair). Do NOT name specific celebrities.
        2. **Body Identity**: Estimate height (e.g., around 1m67), weight/build (e.g., 66kg, slim-average), and proportions. 
        3. **Pose & Body Language**: Describe the exact pose (standing/sitting/walking), weight distribution, hand placement (holding phone, in pocket), head direction. Is it a pose or candid?
        4. **Expression & Mood**: Describe the facial expression (relaxed, slight smile, candid) and the overall mood (chill, energetic, deep). NO over-acting.
        5. **Outfit (Outfit Logic)**: Describe the clothing style (casual, oversized, beachwear), fit, and colors. Must match the environment vibe.
        6. **Environment**: Describe the setting in detail (coffee shop, beach, street, indoor). Include props (tables, trees, lights).
        7. **Lighting**: Describe the light source (natural, indoor, soft, hard, backlight). This is CRITICAL.
        8. **Overall Style**: Keywords like "Lifestyle", "Candid", "Realistic", "Vietnamese vibe", "Non-studio", "Shot on iPhone".
        
        Output a cohesive paragraph prompt based on these points.
      `;
  
      const response = await ai.models.generateContent({
        model: IMAGE_EDIT_MODEL,
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: prompt },
          ],
        },
      });
      return response.text || "";
    } catch (error) {
      console.error("Error analyzing checkin reference:", error);
      return "";
    }
  };

/**
 * Analyzes clothing items to create a detailed fashion prompt
 */
export const analyzeFashionItem = async (base64Data: string, mimeType: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_EDIT_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: "Describe this clothing item/accessory in detail (color, fabric texture, style, cut, patterns). Output ONLY the description.",
            },
          ],
        },
      });
      return response.text || "";
    } catch (error) {
      console.error("Error analyzing fashion item:", error);
      return "";
    }
  };

/**
 * Generates 2 images based on text prompt using Imagen 4.
 */
export const generateSeoImages = async (prompt: string, aspectRatio: string = '16:9'): Promise<string[]> => {
  try {
    const response = await ai.models.generateImages({
      model: IMAGEN_MODEL,
      prompt: prompt,
      config: {
        numberOfImages: 2,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });

    // Extract base64 strings and convert to data URLs
    if (response.generatedImages) {
      return response.generatedImages.map(img => 
        `data:image/jpeg;base64,${img.image.imageBytes}`
      );
    }
    return [];
  } catch (error) {
    console.error("Error generating images:", error);
    throw error;
  }
};

/**
 * Generates an image based on reference images + prompt (Image-to-Image)
 * Supports multiple references (e.g. Face + Body)
 */
export const generateFashionImage = async (
    references: { data: string; mimeType: string }[], 
    prompt: string
): Promise<string[]> => {
    try {
        const parts: any[] = [];
        
        // Add all reference images to parts
        references.forEach(ref => {
            parts.push({
                inlineData: {
                    data: ref.data,
                    mimeType: ref.mimeType,
                }
            });
        });

        // Add the text prompt
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: IMAGE_EDIT_MODEL,
            contents: {
                parts: parts
            }
        });

        const images: string[] = [];
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
                }
            }
        }
        return images;
    } catch (error) {
        console.error("Error generating fashion image:", error);
        throw error;
    }
}

/**
 * Generates 4 Check-in Lifestyle images in parallel.
 * Primary Input: Face Image (to swap/maintain identity).
 * Secondary Input (Implicit): The prompt derived from the reference image.
 */
export const generateCheckinImage = async (
    faceImage: { data: string; mimeType: string },
    prompt: string
): Promise<string[]> => {
    // Generate 4 separate requests in parallel to get 4 distinct options
    // Since gemini-2.5-flash-image typically returns 1 image per edit request.
    const promises = Array(4).fill(0).map(() => generateFashionImage([faceImage], prompt));
    
    try {
        const results = await Promise.all(promises);
        // Flatten the array of results
        return results.flat();
    } catch (error) {
        console.error("Error generating batch checkin images:", error);
        return [];
    }
};

/**
 * Analyzes website analytics data to provide strategic insights.
 */
export const analyzeAnalyticsData = async (data: AnalyticsData): Promise<AnalyticsReport | null> => {
  try {
    const prompt = `
      You are a Senior Data Analyst and Digital Marketing Strategist.
      
      DATA INPUT:
      - Users: ${data.users}
      - Sessions: ${data.sessions}
      - Bounce Rate: ${data.bounceRate}%
      - Avg Session Duration: ${data.avgSessionDuration}
      - Trend (Last 7 days): ${JSON.stringify(data.chartData)}
      
      TASK:
      Analyze these metrics to generate a professional report.
      
      OUTPUT JSON Format:
      {
        "summary": "Brief executive summary of the performance (2-3 sentences).",
        "key_insights": ["Insight 1 (e.g. Traffic spike on Tuesday due to...)", "Insight 2", "Insight 3"],
        "recommendations": ["Actionable tip 1", "Actionable tip 2", "Actionable tip 3"],
        "sentiment": "positive" | "neutral" | "negative"
      }
      
      Language: Vietnamese (Tiếng Việt).
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            key_insights: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'] }
          }
        },
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as AnalyticsReport;
  } catch (error) {
    console.error("Error analyzing analytics:", error);
    return null;
  }
};