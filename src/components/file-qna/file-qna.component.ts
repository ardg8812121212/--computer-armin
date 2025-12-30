
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, ChatMessage, FilePart } from '../../services/gemini.service';

@Component({
  selector: 'app-file-qna',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-qna.component.html',
  styleUrls: ['./file-qna.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileQnaComponent {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  geminiService = inject(GeminiService);

  uploadedFile = signal<({ name: string } & FilePart) | null>(null);
  messages = signal<ChatMessage[]>([]);
  currentMessage = signal('');
  isLoading = signal(false);
  apiKeyError = this.geminiService.apiKeyError;
  fileError = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.messages().length) {
        this.scrollToBottom();
      }
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    const file = input.files[0];
    
    if (file.size > 10 * 1024 * 1024) { // 10 MB limit
      this.fileError.set('حجم فایل بیش از حد مجاز است. لطفاً فایلی کوچکتر از ۱۰ مگابایت انتخاب کنید.');
      return;
    }

    this.fileError.set(null);
    this.messages.set([]); // Reset chat on new file upload

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const base64String = e.target.result.split(',')[1];
      this.uploadedFile.set({
        name: file.name,
        mimeType: file.type,
        data: base64String,
      });
    };
    reader.onerror = () => {
        this.fileError.set('خطا در خواندن فایل.');
    };
    reader.readAsDataURL(file);
  }

  async sendMessage() {
    const userMessage = this.currentMessage().trim();
    if (!userMessage || !this.uploadedFile() || this.isLoading()) return;

    this.messages.update(msgs => [...msgs, { id: Date.now(), role: 'user', text: userMessage }]);
    this.currentMessage.set('');
    
    await this.getAIResponse(userMessage);
  }

  private async getAIResponse(prompt: string) {
    const fileData = this.uploadedFile();
    if (!fileData) return;

    this.isLoading.set(true);
    this.scrollToBottom();

    try {
        const fullPrompt = `با توجه به فایل آپلود شده به نام "${fileData.name}"، به سوال زیر پاسخ بده:\n\n${prompt}`;
        const responseText = await this.geminiService.sendMessageWithFile(fullPrompt, fileData);
        this.messages.update(msgs => [...msgs, { id: Date.now()+1, role: 'model', text: responseText }]);
    } catch (error) {
        this.messages.update(msgs => [...msgs, { id: Date.now()+1, role: 'model', text: 'خطا در ارتباط با سرویس' }]);
    } finally {
        this.isLoading.set(false);
        this.scrollToBottom();
    }
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

      const newHistory = msgs.slice(0, messageIndex);
      newHistory.push({ ...msgs[messageIndex], text: trimmedText, isEditing: false });
      return newHistory;
    });

    if (messageIndex !== -1) {
      await this.getAIResponse(trimmedText);
    }
  }


  removeFile(): void {
    this.uploadedFile.set(null);
    this.messages.set([]);
    this.currentMessage.set('');
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
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
