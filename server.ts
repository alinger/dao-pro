import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
try {
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  } else {
    ai = new GoogleGenAI();
  }
} catch (err) {
  console.warn('[Gemini] Note: AI client initialized in fallback mode', err);
}

// Daoist Wisdom Encyclopedia API with Google Search grounding
app.post('/api/dao-encyclopedia', async (req, res) => {
  const { topic, type = 'mountain', direction, angle } = req.body;

  if (!topic || typeof topic !== 'string') {
    res.status(400).json({ success: false, error: 'Topic parameter is required.' });
    return;
  }

  const cleanTopic = topic.trim().slice(0, 50);

  // If Gemini API client is available and key is present, invoke Gemini 3.8 Flash with Google Search
  if (ai) {
    try {
      const systemInstruction = `你是一位精通先秦两汉周易卦象、道家天人相应宇宙观、二十四山堪舆理气、五行生克与内丹修养的国学道韵宗师。
请结合中国传统典籍（如《周易》、《道德经》、《黄帝内经》、《青囊经》、《天玉经》、《撼龙经》、《葬书》等）及现代易学研考，为用户深入解析所指定的方位、山向、八卦或五行玄理。

请务必按以下四个维度结构化阐发，语言古雅深邃，使用清晰的 Markdown 排版：
1. 【象数理气与本源】：卦象/山向之名相起源、天干地支五行所属、纳甲配卦、方位度数、分野星辰。
2. 【修学炼养与心性】：对应身心脏腑经络、吐纳导引之要旨、道门内炼静坐修持秘诀。
3. 【时令节气与克应】：对应节气月令、气象生克变化、天道阴阳交感与气场感应。
4. 【经典注疏与玄览】：引述古籍核心偈语、口诀或注疏，并给出平易通达的现代人生养心领悟。

请善用 Google Search 搜索最新的权威易学研究、道藏文献与典籍原文考据。`;

      const prompt = `请深入考辨并阐释【${cleanTopic}】（${type}：${direction || ''}，角度度数：${angle !== undefined ? angle + '°' : '未知'}）的道学源流、易理象意、堪舆气场与修学养生要诀。`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || '';
      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;
      const searchQueries = groundingMetadata?.webSearchQueries || [];
      const sources: Array<{ title: string; url: string }> = [];

      if (groundingMetadata?.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks) {
          const web = (chunk as any)?.web;
          if (web?.uri) {
            sources.push({
              title: web.title || '道藏经典研考源流',
              url: web.uri,
            });
          }
        }
      }

      res.json({
        success: true,
        topic: cleanTopic,
        content: text,
        sources,
        searchQueries,
        isLiveGrounding: true,
      });
      return;
    } catch (apiError: any) {
      console.warn('[Gemini API Search Warning]:', apiError?.message || apiError);
      // Fall through to fallback response below
    }
  }

  // Graceful response when API is unreachable or key is not provided
  res.json({
    success: true,
    topic: cleanTopic,
    content: `### 【象数理气与本源】\n【${cleanTopic}】承应天元气运，居于周天造化之关键界域。天地合气，命之曰人；神居其室，气流其窍。\n\n### 【修学炼养与心性】\n道法自然，虚灵不昧。调和周天呼吸，使真炁流注奇经八脉，存思返照，神凝气聚。\n\n### 【时令节气与克应】\n天道四时流转，阴阳消长各有其序。体察万物生发收敛之节律，随方就圆，不滞于形。\n\n### 【经典注疏与玄览】\n《庄子》云：「夫道，有情有信，无为无形；可传而不可受，可得而不可见。」持守内求，自得太和之境。`,
    sources: [],
    searchQueries: [`${cleanTopic} 易经 象数 典籍考据`],
    isLiveGrounding: false,
    isFallback: true,
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Dao Compass Full-Stack Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
