
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  // Default to gemini-2.5-flash as it's a versatile and powerful model
  model = signal<string>('gemini-2.5-flash');
  
  // Default temperature for a balance between creativity and predictability
  temperature = signal<number>(0.7);

  setModel(newModel: string) {
    this.model.set(newModel);
  }

  setTemperature(newTemp: number) {
    this.temperature.set(newTemp);
  }
}
