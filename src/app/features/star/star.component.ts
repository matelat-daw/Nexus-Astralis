import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Star } from '../../models/star';
import { ActivatedRoute } from '@angular/router';
import { StarsService } from '../../services/stars/stars.service';

@Component({
  selector: 'app-star',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './star.component.html',
  styleUrl: './star.component.css',
})
export class StarComponent implements OnInit {

  loading       = signal(true);
  star          = signal<Star | null>(null);
  errorMessage  = signal('');

  constructor(private route: ActivatedRoute, private starsService: StarsService) {}

  async ngOnInit(): Promise<void> {
    const getId = this.route.snapshot.paramMap.get('id');
    if (!getId) {
      this.loading.set(false);
      return;
    }
    const id = Number(getId);
    try {
      const star = await this.starsService.getById(id);
      console.log(star);
      if (!star) throw new Error('Estrella no encontrada.');      
      this.star.set(star);
    } catch (error: any) {
      this.errorMessage.set(`Error cargando estrella: ${error.message || error}`)
    } finally {
      this.loading.set(false);
    }
  }

  // Método para determinar la clase espectral de la estrella
  getStarClass(): string {
    if (!this.star() || !this.star()?.spect) {
      return 'star-default';
    }
    
    const spectralType = this.star()!.spect.charAt(0).toLowerCase();
    
    switch (spectralType) {
      case 'o': return 'star-o';
      case 'b': return 'star-b';
      case 'a': return 'star-a';
      case 'f': return 'star-f';
      case 'g': return 'star-g';
      case 'k': return 'star-k';
      case 'm': return 'star-m';
      default: return 'star-default';
    }
  }
}