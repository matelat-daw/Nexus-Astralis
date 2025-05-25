import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterModule } from '@angular/router';
import { User } from '../../models/user';
import { UsersService } from '../../services/users/users.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-user',
  imports: [
    CommonModule, 
    MatProgressSpinnerModule, 
    RouterModule,
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
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class UserComponent {
  loading       = signal(true);
  user          = signal<User | null>(null);
  profileImage  = signal('');
  errorMessage  = signal('');

  constructor(private route: ActivatedRoute, private usersService: UsersService) {}

  async ngOnInit(): Promise<void> {
    const getNick = this.route.snapshot.paramMap.get('nick');
    if (!getNick) {
      this.loading.set(false);
      return;
    }
    const id = String(getNick);
    try {
      const user = await this.usersService.getInfoByNick(id);
      if (!user) throw new Error('Usuario no encontrado.');      
      this.user.set(user);
      this.profileImage.set(`${user.profileImage}`);
    } catch (error: any) {
      this.errorMessage.set(`Error cargando usuario: ${error.message || error}`)
    } finally {
      this.loading.set(false);
    }
  }
}