import { Component } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

  constructor(private authService: AuthService, private router: Router, private snackBar: MatSnackBar,) {}

  showPassword1: boolean = false;
  showPassword2: boolean = false;
  errorMessage: string | null = null;
  errorMessages: { [key: string]: string[] } = {};

  form = new FormGroup({
    nick: new FormControl(''),
    name: new FormControl(''),
    surname1: new FormControl(''),
    email: new FormControl(''),
    password: new FormControl(''),
    password2: new FormControl(''),
  });

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/profile']);
    }
  }

  async onRegister(): Promise<void> {
    this.errorMessages = {};
    
    try {
      const formData = new FormData();
      Object.entries(this.form.value).forEach(([key, value]) => {
        if (value != null) formData.append(key.charAt(0).toUpperCase() + key.slice(1), value as any);
      });
      await this.authService.register(formData);      
      this.router.navigate(['/login'], { replaceUrl: true });
      this.snackBar.open('Cuenta registrada exitosamente. Revisa tu correo para verificar tu cuenta.', 'Cerrar', {
        duration: 5000
      });
    } catch (error: any) {
      const errorList = error.message.split('|');
      errorList.forEach((err: string) => {
          const [field, message] = err.split(': ');
          if (field && message) {
              this.errorMessages[field] = this.errorMessages[field] || [];
              this.errorMessages[field].push(message);
          }
      });
    }
  }
}