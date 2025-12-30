
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, Presentation } from '../../services/gemini.service';

declare var PptxGenJS: any;

@Component({
  selector: 'app-presentation-maker',
  imports: [CommonModule, FormsModule],
  templateUrl: './presentation-maker.component.html',
  styleUrls: ['./presentation-maker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresentationMakerComponent {
  geminiService = inject(GeminiService);

  topic = signal('');
  slideCount = signal(5);
  tone = signal('حرفه‌ای');
  
  isLoading = signal(false);
  loadingMessage = signal('');
  error = signal<string | null>(null);
  presentation = signal<Presentation | null>(null);

  apiKeyError = this.geminiService.apiKeyError;
  
  private loadingMessages = [
    "در حال تحلیل موضوع شما...",
    "طراحی ساختار کلی ارائه...",
    "تولید محتوا برای اسلایدها...",
    "بررسی و بهینه‌سازی محتوا...",
    "آماده‌سازی پیش‌نمایش...",
  ];

  async generatePresentation() {
    if (!this.topic().trim() || this.isLoading()) return;

    this.isLoading.set(true);
    this.error.set(null);
    this.presentation.set(null);
    this.runLoadingMessages();

    try {
      const result = await this.geminiService.generatePresentationContent(this.topic(), this.slideCount(), this.tone());
      this.presentation.set(result);
    } catch (e) {
      console.error(e);
      this.error.set('خطا در تولید محتوای ارائه. ممکن است پاسخ مدل در فرمت مورد انتظار نباشد.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private runLoadingMessages() {
    let i = 0;
    this.loadingMessage.set(this.loadingMessages[i]);
    const interval = setInterval(() => {
      if (!this.isLoading() || i >= this.loadingMessages.length - 1) {
        clearInterval(interval);
        return;
      }
      i++;
      this.loadingMessage.set(this.loadingMessages[i]);
    }, 1500);
  }

  downloadPresentation() {
    const pres = this.presentation();
    if (!pres) return;

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.rtl = true; // Enable Right-to-Left for Persian

    // Title Slide
    const titleSlide = pptx.addSlide();
    titleSlide.addText(pres.title, { 
      x: '5%', y: '40%', w: '90%', h: '20%', 
      align: 'center', fontSize: 36, bold: true, color: '0088CC' 
    });
    titleSlide.addText('تولید شده توسط Armin AI', {
      x: '5%', y: '85%', w: '90%', h: '10%',
      align: 'center', fontSize: 14, color: '666666'
    });


    // Content Slides
    for (const slideData of pres.slides) {
      const slide = pptx.addSlide();
      // Add Title
      slide.addText(slideData.title, { 
        x: '5%', y: '5%', w: '90%', h: '15%', 
        align: 'right', fontSize: 28, bold: true, color: '005588'
      });
      // Add Content (Bullet points)
      const contentAsBullets = slideData.content.map(point => ({ text: point, options: {bullet: true, indentLevel: 1} }));
      slide.addText(contentAsBullets, {
         x: '5%', y: '25%', w: '90%', h: '70%',
         align: 'right', fontSize: 18,
      });
    }

    pptx.writeFile({ fileName: `${pres.title}.pptx` });
  }
}
