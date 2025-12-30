
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  settingsService = inject(SettingsService);

  // Expose signals to the template
  selectedModel = this.settingsService.model;
  temperature = this.settingsService.temperature;

  availableModels = [
    'gemini-2.5-flash',
    // Add other compatible models here if needed in the future
  ];

  onModelChange(event: Event) {
    const newModel = (event.target as HTMLSelectElement).value;
    this.settingsService.setModel(newModel);
  }

  onTemperatureChange(event: Event) {
    const newTemp = parseFloat((event.target as HTMLInputElement).value);
    this.settingsService.setTemperature(newTemp);
  }
}
