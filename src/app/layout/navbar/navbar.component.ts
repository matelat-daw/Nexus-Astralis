import { Component, computed, effect } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent {

  constructor(public authService: AuthService) {
    effect(() => {
      this.isLogged();
    });
  }

  isLogged = computed(() => this.authService.isAuthenticated());
  
  logout() {
    this.authService.logout();
  }
}