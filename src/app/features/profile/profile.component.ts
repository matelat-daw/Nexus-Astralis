import { Component, computed, inject, signal } from '@angular/core';
import { User } from '../../models/user';
import { RouterLink, Router } from '@angular/router';
import { UsersService } from '../../services/users/users.service';
import { Constellation } from '../../models/constellation';
import { Comments } from '../../models/comments';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule, 
    RouterLink, 
    MatTabsModule, 
    MatIconModule, 
    MatButtonModule, 
    MatInputModule, 
    MatFormFieldModule, 
    MatCardModule, 
    MatCheckboxModule,
    MatSnackBarModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  loading = signal(true);
  user = signal<User | null>(null);
  profileImage = signal('');
  favorites = signal<Constellation[] | null>(null);
  comments = signal<Comments[] | null>(null);
  errorMessage = signal('');
  editMode = signal(false);
  editingUser = signal<User | null>(null);
  editingComment = signal<Comments | null>(null);
  profileForm!: FormGroup;
  readonly dialog = inject(MatDialog);
  
  errorMessages = signal<{[key: string]: string[]}>({
    name: [],
    surname1: [],
    surname2: [],
    email: [],
    phoneNumber: [],
    userLocation: [],
    about: [],
    bday: [],
    global: []
  });

  constructor(
    private usersService: UsersService, 
    private snackBar: MatSnackBar,
    private router: Router,
    private fb: FormBuilder,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const user = await this.usersService.getMyProfile();
      if (!user) throw new Error('Perfil no encontrado.');
      this.user.set(user);
      this.profileImage.set(`https://88.24.26.59/${user.profileImage}`);
    } catch (error: any) {
      this.errorMessage.set(`Error cargando usuario: ${error.message || error}`)
    } finally {
      this.loading.set(false);
    }
  }

  async deleteAccount(): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Eliminar cuenta',
        message: '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.usersService.deleteMyAccount();
          this.snackBar.open('Cuenta eliminada correctamente', 'Cerrar', {
            duration: 3000
          });
          this.router.navigate(['/home']);
        } catch (error: any) {
          this.errorMessage.set(`Error eliminando usuario: ${error.message || error}`);
          this.snackBar.open(`Error: ${error.message || error}`, 'Cerrar', {
            duration: 3000
          });
        }
      }
    });
  }

  toggleEditMode(): void {
    if (this.editMode()) {
      this.editMode.set(false);
      this.editingUser.set(null);
      this.resetErrorMessages();
    } else {
      this.editMode.set(true);
      this.editingUser.set({...this.user()!});
      this.initForm();
    }
  }
  
  initForm(): void {
    const user = this.user();
    if (!user) return;
    
    this.profileForm = this.fb.group({
      nick: [user.nick, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      name: [user.name, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      surname1: [user.surname1, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      surname2: [user.surname2, [Validators.maxLength(50)]],
      email: [user.email, [Validators.required, Validators.email]],
      phoneNumber: [user.phoneNumber, [Validators.pattern(/^\d{9}$/)]],
      userLocation: [user.userLocation, [Validators.maxLength(100)]],
      about: [user.about, [Validators.maxLength(500)]],
      bday: [user.bday, []],
      publicProfile: [user.publicProfile]
    });
    
    this.profileForm.valueChanges.subscribe(values => {
      this.editingUser.set({...this.editingUser()!, ...values});
    });
  }
  
  validateForm(): boolean {
    this.resetErrorMessages();
    if (this.profileForm.valid) {
      return true;
    }    
    const controls = this.profileForm.controls;
    
    if (controls['nick'].invalid) {
      if (controls['nick'].errors?.['required']) {
        this.addError('nick', 'El nombre de usuario es obligatorio');
      }
      if (controls['nick'].errors?.['maxlength']) {
        this.addError('nick', 'El nombre de usuario no puede exceder los 20 caracteres');
      }
    }
    if (controls['name'].invalid) {
      if (controls['name'].errors?.['required']) {
        this.addError('name', 'El nombre es obligatorio');
      }
      if (controls['name'].errors?.['minlength']) {
        this.addError('name', 'El nombre debe tener al menos 2 caracteres');
      }
      if (controls['name'].errors?.['maxlength']) {
        this.addError('name', 'El nombre no puede exceder los 50 caracteres');
      }
    }
    if (controls['surname1'].invalid) {
      if (controls['surname1'].errors?.['required']) {
        this.addError('surname1', 'El primer apellido es obligatorio');
      }
      if (controls['surname1'].errors?.['minlength']) {
        this.addError('surname1', 'El primer apellido debe tener al menos 2 caracteres');
      }
      if (controls['surname1'].errors?.['maxlength']) {
        this.addError('surname1', 'El primer apellido no puede exceder los 50 caracteres');
      }
    }
    if (controls['surname2'].invalid && controls['surname2'].errors?.['maxlength']) {
      this.addError('surname2', 'El segundo apellido no puede exceder los 50 caracteres');
    }
    if (controls['email'].invalid) {
      if (controls['email'].errors?.['required']) {
        this.addError('email', 'El email es obligatorio');
      }
      if (controls['email'].errors?.['email']) {
        this.addError('email', 'El formato del email no es válido');
      }
    }
    if (controls['phoneNumber'].invalid && controls['phoneNumber'].errors?.['pattern']) {
      this.addError('phoneNumber', 'El teléfono debe tener 9 dígitos');
    }
    if (controls['userLocation'].invalid && controls['userLocation'].errors?.['maxlength']) {
      this.addError('userLocation', 'La ubicación no puede exceder los 100 caracteres');
    }
    if (controls['about'].invalid && controls['about'].errors?.['maxlength']) {
      this.addError('about', 'La descripción no puede exceder los 500 caracteres');
    }
    return false;
  }
  
  addError(field: string, message: string): void {
    const currentErrors = this.errorMessages();
    const fieldErrors = [...(currentErrors[field] || []), message];
    this.errorMessages.set({...currentErrors, [field]: fieldErrors});
  }
  
  resetErrorMessages(): void {
    this.errorMessages.set({
      nick: [],
      name: [],
      surname1: [],
      surname2: [],
      email: [],
      phoneNumber: [],
      userLocation: [],
      about: [],
      bday: [],
      global: []
    });
  }

  async saveProfile(): Promise<void> {
    try {
      if (!this.editingUser()) return;
      
      // Validar el formulario antes de guardar
      if (!this.validateForm()) {
        return;
      }
      
      // Llamada al servicio para actualizar el perfil
      const success = await this.usersService.editProfile(this.editingUser()!);
      
      if (success) {
        this.snackBar.open('Perfil actualizado correctamente', 'Cerrar', {
          duration: 3000
        });
        
        this.user.set(this.editingUser());
        this.editMode.set(false);
        this.editingUser.set(null);
      } else {
        throw new Error('No se pudo actualizar el perfil');
      }
    } catch (error: any) {
      this.errorMessage.set(`${error.message || error}`);
      this.snackBar.open(`Error: ${error.message || error}`, 'Cerrar', {
        duration: 3000
      });
      
      // Añadir el error global
      const currentErrors = this.errorMessages();
      this.errorMessages.set({
        ...currentErrors,
        global: [`${error.message || error}`]
      });
    }
  }

  async removeFavorite(favoriteId: number): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Eliminar favorito',
        message: '¿Estás seguro de que deseas eliminar este favorito?',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.usersService.deleteFavorite(favoriteId);
          
          const user = await this.usersService.getMyProfile();
          this.favorites.set(user.favorites);
          this.user.set(user);

          this.snackBar.open('Favorito eliminado correctamente', 'Cerrar', {
            duration: 3000
          });
        } catch (error: any) {
          this.errorMessage.set(`Error eliminando favorito: ${error.message || error}`);
          this.snackBar.open(`Error: ${error.message || error}`, 'Cerrar', {
            duration: 3000
          });
        }
      }
    });
  }

  async deleteComment(commentId: number): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Eliminar comentario',
        message: '¿Estás seguro de que deseas eliminar este comentario?',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.usersService.deleteComment(commentId);          
          const user = await this.usersService.getMyProfile();
          this.comments.set(user.comments);
          this.user.set(user);

          this.snackBar.open('Comentario eliminado correctamente', 'Cerrar', {
            duration: 3000
          });
        } catch (error: any) {
          this.errorMessage.set(`Error eliminando comentario: ${error.message || error}`);
          this.snackBar.open(`Error: ${error.message || error}`, 'Cerrar', {
            duration: 3000
          });
        }
      }
    });
  }

  navigateToConstellation(constellationId: number): void {
    this.router.navigate(['/constellation', constellationId]);
  }
}