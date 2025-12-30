
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatComponent } from './components/chat/chat.component';
import { ImageGeneratorComponent } from './components/image-generator/image-generator.component';
import { SummarizerComponent } from './components/summarizer/summarizer.component';
import { FileQnaComponent } from './components/file-qna/file-qna.component';
import { PresentationMakerComponent } from './components/presentation-maker/presentation-maker.component';
import { ExpertAssistantComponent } from './components/expert-assistant/expert-assistant.component';
import { SettingsComponent } from './components/settings/settings.component';

type ActiveTab = 'chat' | 'image' | 'summarizer' | 'file-qna' | 'presentation' | 'expert' | 'settings';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ChatComponent, ImageGeneratorComponent, SummarizerComponent, FileQnaComponent, PresentationMakerComponent, ExpertAssistantComponent, SettingsComponent],
})
export class AppComponent {
  activeTab = signal<ActiveTab>('chat');

  selectTab(tab: ActiveTab) {
    this.activeTab.set(tab);
  }
}
