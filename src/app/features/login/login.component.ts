import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { Router, RouterLink } from '@angular/router';
import { GoogleSigninButtonModule, SocialAuthService } from '@abacritt/angularx-social-login';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, GoogleSigninButtonModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit  {
  loginError: string = '';
  isProcessingLogin: boolean = false;

  constructor(private authService: AuthService, private authGoogle: SocialAuthService, private router: Router, private http: HttpClient){}

  showPassword: boolean = false;
  errorMessages: { [key: string]: string[] } = {};

  form = new FormGroup({
    email: new FormControl(''),
    password: new FormControl(''),
  });

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/profile']);
    }
    this.authGoogle.authState.subscribe((user) => {
      if (user && !this.isProcessingLogin) {
        this.isProcessingLogin = true;
        this.verifyGoogleUserServerSide(user.idToken);
      }
    });
}

  async verifyGoogleUserServerSide(token: string): Promise<void> {
      try {
        await this.authService.googleLogin(token);
        this.router.navigate(['/profile']);
        this.isProcessingLogin = false;
      }
      catch (error) {
        console.error('Error al verificar el usuario en el servidor:', error);
        this.loginError = 'Error al verificar credenciales. Por favor, intente nuevamente.';
        this.isProcessingLogin = false;
        // Limpiar datos almacenados en caso de error
        sessionStorage.removeItem('auth_token');
    }
  }

  async onSubmit(): Promise<void> {
    this.errorMessages = {};
    try {
      const { email, password } = this.form.value;
      await this.authService.login(email!, password!);
      await this.router.navigate(['/profile']);
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