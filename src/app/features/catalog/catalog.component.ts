import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ConstellationsService } from '../../services/constellations/constellations.service';
import { StarsService } from '../../services/stars/stars.service';
import { Constellation } from '../../models/constellation';
import { Star } from '../../models/star';

@Component({
  selector: 'app-catalog',
  imports: [CommonModule, RouterModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
  providers: [ConstellationsService]
})
export class CatalogComponent implements OnInit {

  loading         = signal(true);
  constellations  = signal<Constellation[]>([]);
  stars           = signal<Star[]>([]);
  // Buscador
  searchTerm      = signal('');
  filteredConstellations = signal<Constellation[]>([]);

  constructor(private constellationsService: ConstellationsService, private starsService: StarsService) {}

  async ngOnInit(): Promise<void> {
    try {
      const con: Constellation[] = await this.constellationsService.getAll();
      this.constellations.set(con);
      this.filteredConstellations.set(con);
      
      const st: Star[] = await this.starsService.getAll(); 
      this.stars.set(st);

      this.loading.set(false);
    } catch (error) {
      console.error('Error inicializando catálogo:', error);
      this.loading.set(false);
    }
  }

  search(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    
    if (!term.trim()) {
      this.filteredConstellations.set(this.constellations());
      return;
    }
    
    // Filtrar constelaciones por nombre en latín o inglés
    const filtered = this.constellations().filter(constellation => 
      constellation.latin_name.toLowerCase().includes(term.toLowerCase()) || 
      constellation.english_name.toLowerCase().includes(term.toLowerCase()) ||
      constellation.spanish_name.toLowerCase().includes(term.toLowerCase()) ||
      constellation.brightest_star.toLowerCase().includes(term.toLowerCase())
    );

    this.filteredConstellations.set(filtered);
  }
}