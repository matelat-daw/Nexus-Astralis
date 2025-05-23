import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ConstellationsService } from '../../services/constellations/constellations.service';
import { Constellation } from '../../models/constellation';
import { Star } from '../../models/star';
import { Comments } from '../../models/comments';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
import { UsersService } from '../../services/users/users.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-constellation',
  imports: [CommonModule, RouterModule, MatSnackBarModule, MatIconModule, MatButtonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './constellation.component.html',
  styleUrl: './constellation.component.css'
})
export class ConstellationComponent implements OnInit {

  loading       = signal(true);
  constellation = signal<Constellation | null>(null);
  stars         = signal<Star[]>([]);
  comments      = signal<Comments[]>([]);
  errorMesage   = signal('');
  isFavorite    = signal(false);
  
  commentForm = new FormGroup({
    comment: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(80)
    ])
  });

  constructor(
    private route: ActivatedRoute, 
    private constellationsService: ConstellationsService, 
    private authService: AuthService, 
    private usersService: UsersService,
    private snackBar: MatSnackBar
  ) {}

  isLogged = computed(() => this.authService.isAuthenticated());

  async ngOnInit(): Promise<void> {
    const getId = this.route.snapshot.paramMap.get('id');
    if (!getId) {
      this.loading.set(false);
      return;
    }
    const id = Number(getId);
    try {
      const [constellations, stars, comments] = await Promise.all([
        this.constellationsService.getById(id),
        this.constellationsService.getStars(id),
        this.constellationsService.getCommentsById(id)
      ]);
      this.constellation.set(constellations);
      this.stars.set(stars);
      this.comments.set(comments);
      
      // Verificar si la constelación está en favoritos
      if (this.isLogged()) {
        try {
          const isFav = await this.usersService.isMyFavorite(id);
          this.isFavorite.set(isFav);
        } catch (error) {
          console.error('Error verificando favorito:', error);
        }
      }
    } catch (error: any) {
      this.errorMesage.set(`Error cargando constelación: ${error.message || error}`);
    } finally {
      this.loading.set(false);
    }
  }

  async toggleFavorite(): Promise<void> {
    if (!this.isLogged()) {
      this.snackBar.open('Debes iniciar sesión para añadir favoritos', 'Cerrar', {
        duration: 3000
      });
      return;
    }
    
    if (!this.constellation()) return;
    
    const id = this.constellation()!.id;
    
    try {
      // Actualizar UI
      const currentState = this.isFavorite();
      this.isFavorite.set(!currentState);
      
      if (currentState) {
        // Eliminar de favoritos
        await this.usersService.deleteFavorite(id);
        this.snackBar.open('Eliminado de favoritos', 'Cerrar', {
          duration: 3000
        });
      } else {
        // Añadir a favoritos
        await this.usersService.addFavorite(id);
        this.snackBar.open('Añadido a favoritos', 'Cerrar', {
          duration: 3000
        });
      }
    } catch (error: any) {
      // Si hay un error, revertir el cambio en la UI
      this.isFavorite.set(!this.isFavorite());
      this.snackBar.open(`Error: ${error.message || error}`, 'Cerrar', {
        duration: 3000
      });
    }
  }

  async submitComment(): Promise<void> {
    if (!this.isLogged()) {
      this.snackBar.open('Debes iniciar sesión para añadir comentarios', 'Cerrar', {
        duration: 3000
      });
      return;
    }
    
    if (this.commentForm.invalid) {
      if (this.commentForm.get('comment')?.errors?.['required']) {
        this.snackBar.open('El comentario no puede estar vacío', 'Cerrar', {
          duration: 3000
        });
      } else if (this.commentForm.get('comment')?.errors?.['minlength']) {
        this.snackBar.open('El comentario debe tener al menos 3 caracteres', 'Cerrar', {
          duration: 3000
        });
      } else if (this.commentForm.get('comment')?.errors?.['maxlength']) {
        this.snackBar.open('El comentario no puede exceder los 80 caracteres', 'Cerrar', {
          duration: 3000
        });
      }
      return;
    }
    
    if (!this.constellation()) return;
    
    const constellationId = this.constellation()!.id;
    const commentText = this.commentForm.get('comment')?.value || '';
    
    try {
      // Añadir el comentario
      await this.usersService.addComment(commentText, constellationId);
      
      // Limpiar el campo de comentario
      this.commentForm.reset();
      
      // Actualizar la lista de comentarios desde el servidor
      const updatedComments = await this.constellationsService.getCommentsById(constellationId);
      this.comments.set(updatedComments);
      
      this.snackBar.open('Comentario añadido correctamente', 'Cerrar', {
        duration: 3000
      });
    } catch (error: any) {
      console.error('Error al añadir comentario:', error);
      this.snackBar.open(`Error: ${error.message || error}`, 'Cerrar', {
        duration: 3000
      });
    }
  }
}
