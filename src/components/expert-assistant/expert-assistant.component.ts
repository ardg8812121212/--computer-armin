
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, effect, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, ChatMessage, ExpertType } from '../../services/gemini.service';

interface Expert {
  id: ExpertType;
  name: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-expert-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expert-assistant.component.html',
  styleUrls: ['./expert-assistant.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpertAssistantComponent {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  geminiService = inject(GeminiService);

  experts: Expert[] = [
    { id: 'mathematician', name: 'ریاضی‌دان', description: 'حل مسائل پیچیده و توضیح مفاهیم ریاضی.', icon: 'calculate' },
    { id: 'physicist', name: 'فیزیک‌دان', description: 'تحلیل پدیده‌های فیزیکی و قوانین طبیعت.', icon: 'science' },
    { id: 'chemist', name: 'شیمی‌دان', description: 'بررسی واکنش‌ها و ساختارهای مولکولی.', icon: 'biotech' },
    { id: 'programmer', name: 'برنامه‌نویس', description: 'نوشتن کد، رفع اشکال و طراحی نرم‌افزار.', icon: 'code' },
    { id: 'academic_advisor', name: 'مشاور تحصیلی', description: 'برنامه‌ریزی درسی، هدایت تحصیلی و کنکور.', icon: 'school' },
  ];

  selectedExpert = signal<Expert | null>(null);
  messageHistories = signal<Map<ExpertType, ChatMessage[]>>(new Map());
  
  messages = computed(() => {
    const expert = this.selectedExpert();
    if (!expert) return [];
    return this.messageHistories().get(expert.id) || [];
  });

  currentMessage = signal('');
  isLoading = signal(false);
  apiKeyError = this.geminiService.apiKeyError;

  constructor() {
    effect(() => {
      if (this.messages().length > 0) {
        this.scrollToBottom();
      }
    });
  }

  selectExpert(expert: Expert) {
    this.selectedExpert.set(expert);
    if (!this.messageHistories().has(expert.id)) {
      this.messageHistories.update(histories => {
        histories.set(expert.id, []);
        return new Map(histories);
      });
    }
  }

  goBack() {
    this.selectedExpert.set(null);
  }

  async sendMessage() {
    const userMessage = this.currentMessage().trim();
    if (!userMessage || !this.selectedExpert() || this.isLoading()) return;

    this.addMessage({ id: Date.now(), role: 'user', text: userMessage });
    this.currentMessage.set('');
    
    await this.getAIResponse(userMessage);
  }

  private async getAIResponse(prompt: string) {
    const expert = this.selectedExpert();
    if(!expert) return;

    this.isLoading.set(true);
    this.scrollToBottom();
    try {
      const responseText = await this.geminiService.getExpertResponse(expert.id, prompt);
      this.addMessage({ id: Date.now() + 1, role: 'model', text: responseText });
    } catch (error) {
      this.addMessage({ id: Date.now() + 1, role: 'model', text: 'خطا در ارتباط با سرویس' });
    } finally {
      this.isLoading.set(false);
      this.scrollToBottom();
    }
  }

  private addMessage(message: ChatMessage) {
    const expertId = this.selectedExpert()?.id;
    if(!expertId) return;

    this.messageHistories.update(histories => {
        const currentMessages = histories.get(expertId) || [];
        histories.set(expertId, [...currentMessages, message]);
        return new Map(histories);
    });
  }

  async getExplanation(message: ChatMessage) {
    const expertId = this.selectedExpert()?.id;
    if (!expertId) return;

    // Find the user message that prompted this model response
    const msgs = this.messageHistories().get(expertId) || [];
    const messageIndex = msgs.findIndex(m => m.id === message.id);
    if (messageIndex < 1) return;
    const userPrompt = msgs[messageIndex - 1].text;

    this.updateMessage(message.id, { isLoadingExplanation: true });

    try {
      const explanationText = await this.geminiService.getStepByStepExplanation(userPrompt, message.text);
      this.updateMessage(message.id, { explanation: explanationText, isLoadingExplanation: false });
    } catch (error) {
      this.updateMessage(message.id, { explanation: 'خطا در دریافت توضیحات.', isLoadingExplanation: false });
    }
  }

  toggleEdit(messageId: number) {
     this.updateMessage(messageId, { isEditing: !this.findMessage(messageId)?.isEditing });
  }

  async saveEdit(messageId: number, newText: string) {
    const expertId = this.selectedExpert()?.id;
    const trimmedText = newText.trim();
    if (!trimmedText || !expertId) return;

    let messageIndex = -1;
    this.messageHistories.update(histories => {
      const expertMessages = histories.get(expertId) || [];
      messageIndex = expertMessages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) return histories;

      const newHistory = expertMessages.slice(0, messageIndex);
      newHistory.push({ ...expertMessages[messageIndex], text: trimmedText, isEditing: false });
      histories.set(expertId, newHistory);
      return new Map(histories);
    });

    if (messageIndex !== -1) {
      await this.getAIResponse(trimmedText);
    }
  }

  private findMessage(messageId: number): ChatMessage | undefined {
    const expertId = this.selectedExpert()?.id;
    if (!expertId) return undefined;
    return this.messageHistories().get(expertId)?.find(m => m.id === messageId);
  }

  private updateMessage(messageId: number, props: Partial<ChatMessage>) {
    const expertId = this.selectedExpert()?.id;
    if (!expertId) return;

    this.messageHistories.update(histories => {
      const expertMessages = histories.get(expertId) || [];
      const updatedMessages = expertMessages.map(m => m.id === messageId ? { ...m, ...props } : m);
      histories.set(expertId, updatedMessages);
      return new Map(histories);
    });
  }

  private scrollToBottom(): void {
    if (!this.chatContainer) return;
    try {
      setTimeout(() => {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }, 0);
    } catch (err) {
      console.error('Could not scroll to bottom:', err);
    }
  }
}
