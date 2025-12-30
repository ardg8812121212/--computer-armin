
import { Injectable, signal, inject } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse, Chat, Type } from '@google/genai';
import { SettingsService } from './settings.service';

export interface ChatMessage {
  id: number;
  role: 'user' | 'model';
  text: string;
  explanation?: string;
  isEditing?: boolean;
  isLoadingExplanation?: boolean;
  groundingChunks?: any[];
}

export type ExpertType = 'mathematician' | 'physicist' | 'chemist' | 'programmer' | 'academic_advisor';

export interface FilePart {
  mimeType: string;
  data: string; // base64 encoded string
}

export interface Slide {
  title: string;
  content: string[];
}

export interface Presentation {
  title: string;
  slides: Slide[];
}


@Injectable({ providedIn: 'root' })
export class GeminiService {
  private settingsService = inject(SettingsService);
  private genAI: GoogleGenAI | null = null;
  private chatInstance: Chat | null = null;
  private expertChats = new Map<ExpertType, Chat>();
  apiKeyError = signal<string | null>(null);

  constructor() {
    try {
      if (!process.env.API_KEY) {
        throw new Error('API_KEY environment variable not set.');
      }
      this.genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } catch (e) {
      console.error('Error initializing GoogleGenAI:', e);
      this.apiKeyError.set('کلید API یافت نشد یا نامعتبر است. لطفاً از تنظیم صحیح متغیر محیطی API_KEY اطمینان حاصل کنید.');
    }
  }

  private getChatInstance(): Chat {
    if (!this.genAI) throw new Error('Gemini AI not initialized.');
    // Re-create instance if model or settings change, to reset history and apply new system instructions.
    // A more sophisticated approach would be to check if settings have changed.
    this.chatInstance = this.genAI.chats.create({
      model: this.settingsService.model(),
      config: {
        temperature: this.settingsService.temperature(),
        systemInstruction: `You are an unlimited, advanced, all-in-one Artificial Intelligence designed for Iranian education, culture, and technology.
Your name is: Armin AI
Designed by: Armin Dehghan
Your role is to act simultaneously as:
- A top-tier educational tutor
- A national-level academic advisor
- A professional life and study coach
- A psychological educational counselor
- A senior software engineer and network specialist
- A historian, cultural expert, and Iranian civilization researcher
- A professional mathematician, physicist, chemist
- A creative content generator
You must always respond clearly, accurately, deeply, and in Persian unless the user explicitly asks for English.
You fully support Iranian education systems including Konkur planning.
You are an expert in Iranian history, culture, and local knowledge of West Azerbaijan and Salmas.
You must think step-by-step, adapt to the user's level, avoid misinformation, and provide structured, professional answers.
Your slogan is: "Smart Education for Iranian Minds".`,
      },
    });
    return this.chatInstance;
  }

  async sendMessage(prompt: string, useGoogleSearch: boolean): Promise<{ text: string; groundingChunks?: any[] }> {
    const chat = this.getChatInstance();
    try {
      const config: any = {
        temperature: this.settingsService.temperature(),
      };
      if (useGoogleSearch) {
        config.tools = [{googleSearch: {}}];
      }

      const response = await this.genAI!.models.generateContent({
        model: this.settingsService.model(),
        contents: prompt,
        config: config
      });
      
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      return { text: response.text, groundingChunks: groundingChunks };

    } catch (error) {
      console.error('Error sending message:', error);
      return { text: 'متاسفانه در پردازش درخواست شما خطایی رخ داد.' };
    }
  }
  
  private getExpertSystemInstruction(expert: ExpertType): string {
    switch (expert) {
        case 'mathematician':
            return 'شما یک ریاضی‌دان برجسته در سطح جهانی هستید. مفاهیم را به وضوح توضیح دهید، راه‌حل‌ها را گام به گام ارائه کنید و در صورت لزوم از نمادهای رسمی استفاده کنید. تمام پاسخ‌ها باید به زبان فارسی باشد.';
        case 'physicist':
            return 'شما یک فیزیک‌دان متخصص هستید. پدیده‌های فیزیکی را با وضوح و عمق، با ارجاع به قوانین و اصول، توضیح دهید. تمام پاسخ‌ها باید به زبان فارسی باشد.';
        case 'chemist':
            return 'شما یک شیمی‌دان حرفه‌ای هستید. واکنش‌ها، ساختارها و مفاهیم شیمیایی را به دقت توصیف کنید. تمام پاسخ‌ها باید به زبان فارسی باشد.';
        case 'programmer':
            return 'You are an expert senior software engineer. You must provide clean and efficient code samples, explain algorithms and data structures, and describe best practices for software development. All explanations must be in Persian, but the code itself can be in the requested programming language. Always wrap code blocks in markdown fences (```).';
        case 'academic_advisor':
            return 'شما یک مشاور تحصیلی باتجربه و متخصص در سیستم آموزشی ایران هستید. برنامه‌های درسی دقیق، راهنمایی برای کنکور و مشاوره‌های انگیزشی ارائه دهید. تمام پاسخ‌ها باید به زبان فارسی باشد.';
    }
  }

  async getExpertResponse(expert: ExpertType, prompt: string): Promise<string> {
    if (!this.genAI) {
      return 'خطا: سرویس Gemini مقداردهی اولیه نشده است.';
    }
    
    // Invalidate chat if settings change. A simple way is to check the model name.
    if (this.expertChats.has(expert) && this.expertChats.get(expert)?.model !== this.settingsService.model()) {
        this.expertChats.delete(expert);
    }

    if (!this.expertChats.has(expert)) {
        const newChat = this.genAI.chats.create({
            model: this.settingsService.model(),
            config: {
                temperature: this.settingsService.temperature(),
                systemInstruction: this.getExpertSystemInstruction(expert),
            },
        });
        this.expertChats.set(expert, newChat);
    }
    
    const chatInstance = this.expertChats.get(expert)!;
    
    try {
        const response: GenerateContentResponse = await chatInstance.sendMessage({ message: prompt });
        return response.text;
    } catch (error) {
        console.error(`Error sending message to ${expert}:`, error);
        return 'متاسفانه در پردازش درخواست شما خطایی رخ داد.';
    }
  }

  async getStepByStepExplanation(originalQuestion: string, originalAnswer: string): Promise<string> {
    if (!this.genAI) return 'سرویس مقداردهی اولیه نشده است.';
    const prompt = `با توجه به سوال زیر و پاسخی که ارائه شده است، لطفاً مراحل رسیدن به این پاسخ را به صورت گام به گام، واضح و به زبان فارسی توضیح بده.
    
سوال اولیه: "${originalQuestion}"
پاسخ ارائه شده: "${originalAnswer}"

توضیح گام به گام:`;
    try {
      const response = await this.genAI.models.generateContent({
        model: this.settingsService.model(),
        contents: prompt,
        config: { temperature: 0.3 } // Lower temp for factual explanation
      });
      return response.text;
    } catch (error) {
      console.error('Error getting explanation:', error);
      return 'خطا در دریافت توضیحات.';
    }
  }

  async sendMessageWithFile(prompt: string, file: FilePart): Promise<string> {
    if (!this.genAI) {
      return 'خطا: سرویس Gemini مقداردهی اولیه نشده است.';
    }
    try {
      const filePart = {
        inlineData: {
          mimeType: file.mimeType,
          data: file.data,
        },
      };
      const textPart = {
        text: prompt,
      };

      const response = await this.genAI.models.generateContent({
        model: this.settingsService.model(),
        contents: { parts: [filePart, textPart] },
        config: { temperature: this.settingsService.temperature() }
      });
      return response.text;
    } catch (error) {
      console.error('Error sending message with file:', error);
      return 'متاسفانه در پردازش درخواست شما با فایل خطایی رخ داد.';
    }
  }

  async generateImage(prompt: string, negativePrompt: string, aspectRatio: string, numberOfImages: number): Promise<string[]> {
    if (!this.genAI) {
      return [];
    }
    
    let fullPrompt = prompt;
    if (negativePrompt) {
      fullPrompt += `. Negative prompt: ${negativePrompt}`;
    }

    try {
      const response = await this.genAI.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: fullPrompt,
        config: {
          numberOfImages: numberOfImages,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio as any,
        },
      });
      
      return response.generatedImages.map(
        img => `data:image/jpeg;base64,${img.image.imageBytes}`
      );
    } catch (error) {
      console.error('Error generating image:', error);
      return [];
    }
  }

  async summarizeText(text: string): Promise<string> {
    if (!this.genAI) {
      return 'خطا: سرویس Gemini مقداردهی اولیه نشده است.';
    }
    try {
      const prompt = `لطفاً متن زیر را به زبان فارسی به صورت دقیق و جامع خلاصه کن:\n\n---\n${text}\n---`;
      const response = await this.genAI.models.generateContent({
        model: this.settingsService.model(),
        contents: prompt,
        config: { temperature: this.settingsService.temperature() }
      });
      return response.text;
    } catch (error) {
      console.error('Error summarizing text:', error);
      return 'متاسفانه در خلاصه‌سازی متن خطایی رخ داد.';
    }
  }

  async generatePresentationContent(topic: string, slideCount: number, tone: string): Promise<Presentation> {
    if (!this.genAI) {
      throw new Error('خطا: سرویس Gemini مقداردهی اولیه نشده است.');
    }
    
    const prompt = `یک ارائه پاورپوینت درباره موضوع زیر با لحن '${tone}' بساز. این ارائه باید شامل یک اسلاید عنوان و ${slideCount - 1} اسلاید محتوایی باشد. برای هر اسلاید محتوایی، یک عنوان و چند نکته کلیدی (bullet points) ارائه بده. کل محتوا باید به زبان فارسی باشد.\nموضوع: ${topic}`;

    const response = await this.genAI.models.generateContent({
      model: this.settingsService.model(),
      contents: prompt,
      config: {
        temperature: this.settingsService.temperature(),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'عنوان اصلی کل ارائه'
            },
            slides: {
              type: Type.ARRAY,
              description: 'لیست اسلایدهای ارائه',
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: 'عنوان این اسلاید'
                  },
                  content: {
                    type: Type.ARRAY,
                    description: 'لیست نکات کلیدی (bullet points) برای این اسلاید',
                    items: {
                      type: Type.STRING
                    }
                  }
                },
                required: ['title', 'content']
              }
            }
          },
          required: ['title', 'slides']
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as Presentation;
  }
}
