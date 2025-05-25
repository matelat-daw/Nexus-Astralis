import { Component, computed, effect } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent {

  constructor(public authService: AuthService, private router: Router) {
    effect(() => {
      this.isLogged();
    });
  }

  isLogged = computed(() => this.authService.isAuthenticated());
  
  async logout() {
    await this.authService.logout();
    this.router.navigate(['/']);
  }
}