
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, ChatMessage } from '../../services/gemini.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  geminiService = inject(GeminiService);
  
  messages = signal<ChatMessage[]>([]);
  currentMessage = signal('');
  isLoading = signal(false);
  apiKeyError = this.geminiService.apiKeyError;
  useGoogleSearch = signal(false);

  constructor() {
    effect(() => {
      if (this.messages().length) {
        this.scrollToBottom();
      }
    });
  }

  async sendMessage() {
    const userMessage = this.currentMessage().trim();
    if (!userMessage || this.isLoading()) return;

    this.addMessage({ id: Date.now(), role: 'user', text: userMessage });
    this.currentMessage.set('');
    this.isLoading.set(true);
    
    await this.getAIResponse(userMessage);
  }

  private async getAIResponse(prompt: string) {
    this.isLoading.set(true);
    this.scrollToBottom();
    try {
      const response = await this.geminiService.sendMessage(prompt, this.useGoogleSearch());
      this.addMessage({ 
        id: Date.now() + 1, 
        role: 'model', 
        text: response.text,
        groundingChunks: response.groundingChunks
      });
    } catch (error) {
      this.addMessage({ id: Date.now() + 1, role: 'model', text: 'خطا در ارتباط با سرویس' });
    } finally {
      this.isLoading.set(false);
      this.scrollToBottom();
    }
  }

  private addMessage(message: ChatMessage) {
    this.messages.update(msgs => [...msgs, message]);
  }
  
  toggleEdit(messageId: number) {
    this.messages.update(msgs => 
      msgs.map(m => m.id === messageId ? { ...m, isEditing: !m.isEditing } : m)
    );
  }
  
  async saveEdit(messageId: number, newText: string) {
    const trimmedText = newText.trim();
    if (!trimmedText) return;

    let messageIndex = -1;
    this.messages.update(msgs => {
      messageIndex = msgs.findIndex(m => m.id === messageId);
      if (messageIndex === -1) return msgs;

      // Create a new history up to the edited message
      const newHistory = msgs.slice(0, messageIndex);
      // Add the updated message
      newHistory.push({ ...msgs[messageIndex], text: trimmedText, isEditing: false });
      return newHistory;
    });

    // Resend the edited message to get a new response
    if (messageIndex !== -1) {
      await this.getAIResponse(trimmedText);
    }
  }

  private scrollToBottom(): void {
    try {
      setTimeout(() => {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }, 0);
    } catch (err) {
      console.error('Could not scroll to bottom:', err);
    }
  }
}
