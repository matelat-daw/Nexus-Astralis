import { Component } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  constructor(private authService: AuthService, private router: Router) {}

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
  }

  async onSubmit(): Promise<void> {
    this.errorMessages = {};
    try {
      const { email, password } = this.form.value;
      await this.authService.login(email!, password!);
      await this.router.navigate(['/']);
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