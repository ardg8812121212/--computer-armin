
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';

@Component({
  selector: 'app-summarizer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './summarizer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummarizerComponent {
  geminiService = inject(GeminiService);
  inputText = signal('');
  summary = signal('');
  isLoading = signal(false);
  error = signal<string | null>(null);
  apiKeyError = this.geminiService.apiKeyError;

  async summarizeText() {
    const textToSummarize = this.inputText().trim();
    if (!textToSummarize || this.isLoading()) return;

    this.isLoading.set(true);
    this.summary.set('');
    this.error.set(null);

    try {
      const result = await this.geminiService.summarizeText(textToSummarize);
      if (result.startsWith('متاسفانه') || result.startsWith('خطا')) {
        this.error.set(result);
      } else {
        this.summary.set(result);
      }
    } catch (e) {
      this.error.set('یک خطای غیرمنتظره در هنگام خلاصه‌سازی رخ داد.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
