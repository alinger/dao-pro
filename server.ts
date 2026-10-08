import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// API Endpoint: Dao Wisdom Lore Search with Gemini & Google Search Grounding
app.post('/api/search-wisdom', async (req: Request, res: Response): Promise<void> => {
  const { topic, query } = req.body || {};
  const searchTerm = (query || topic || '').trim();

  if (!searchTerm) {
    res.status(400).json({ success: false, error: '查询词不能为空' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.json({
      success: true,
      topic: searchTerm,
      content: `【道韵考据 · 离线典藏】\n关于「${searchTerm}」之易学与天象渊源：\n在传统道家与周易象数系统中，「${searchTerm}」承载天地阴阳消息、周天星度与五行造化生克之道。建议查阅《周易本义》、《青囊序》、《葬经》与《天官书》作进一步格物参详。`,
      sources: [],
      isLiveGrounding: false,
      isFallback: true,
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `请考据道家天文学理与周易堪舆学中关于「${searchTerm}」的典故、象义与天道玄理。内容需包含：
1. 【象义与名源】：其在天干地支、先天/后天八卦、五行或二十八星宿中的正统属性与含义；
2. 【古籍考据】：引证《周易》、《淮南子·天文训》、《灵宪》或正统堪舆经籍中的原句或学理依据；
3. 【修学指归】：其对天地气场、阴阳调和或养生观照的体悟。
语言应古雅雅正，具备正统典籍学术功底与文学美感。`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction:
          '你是一位精通传统道家哲学、中国古代天文学、汉代张衡浑天仪与周易象数理学的博学学者。请对用户提供的二十四山、八卦、五行或堪舆天象名词进行深入浅出、古籍考据详实、具有学术与审美价值的阐释。',
      },
    });

    const text = response.text || '暂无详细释文';

    // Extract grounding sources from candidate metadata
    const sources: Array<{ title: string; url: string }> = [];
    const searchQueries: string[] = [];

    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;

    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({
            title: chunk.web.title,
            url: chunk.web.uri,
          });
        }
      }
    }

    if (groundingMetadata?.webSearchQueries) {
      searchQueries.push(...groundingMetadata.webSearchQueries);
    }

    res.json({
      success: true,
      topic: searchTerm,
      content: text,
      sources,
      searchQueries,
      isLiveGrounding: sources.length > 0,
      isFallback: false,
    });
  } catch (error: any) {
    console.error('Gemini search error:', error?.message || error);
    res.json({
      success: true,
      topic: searchTerm,
      content: `【典籍研考】\n「${searchTerm}」乃天地玄机枢纽之一，在周天流转中各司其位。五行生克不息，太极阴阳和合，参赞化育。`,
      sources: [],
      isLiveGrounding: false,
      isFallback: true,
      errorNotice: error?.message,
    });
  }
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
