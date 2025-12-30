
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';

@Component({
  selector: 'app-image-generator',
  imports: [CommonModule, FormsModule],
  templateUrl: './image-generator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageGeneratorComponent {
  geminiService = inject(GeminiService);
  prompt = signal('');
  negativePrompt = signal('');
  aspectRatio = signal('1:1');
  numberOfImages = signal(1);

  imageUrls = signal<string[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  apiKeyError = this.geminiService.apiKeyError;
  
  aspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];

  async generateImage() {
    const userPrompt = this.prompt().trim();
    if (!userPrompt || this.isLoading()) return;

    this.isLoading.set(true);
    this.imageUrls.set([]);
    this.error.set(null);

    try {
      const results = await this.geminiService.generateImage(
        userPrompt,
        this.negativePrompt(),
        this.aspectRatio(),
        this.numberOfImages()
      );

      if (results.length > 0) {
        this.imageUrls.set(results);
      } else {
        this.error.set('متاسفانه در تولید تصویر خطایی رخ داد یا نتیجه‌ای دریافت نشد.');
      }
    } catch (e) {
      this.error.set('یک خطای غیرمنتظره رخ داد.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
