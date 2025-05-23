import { computed, Injectable, signal } from '@angular/core';

@Injectable({ 
  providedIn: 'root' 
})
export class AuthService {

  private API_URL = 'https://88.24.26.59/api/Auth';
  
  private passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*\W).{8,}$/;
  
  private emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  token = signal<string | null>(sessionStorage.getItem('auth_token'));
  
  // isAuthenticated = signal<boolean>(!!this.token());
  isAuthenticated = computed(() => !!this.token());

  async register(formData: FormData): Promise<String> {
    const errors: string[] = [];
    const nick = (formData.get('Nick')?.toString() || '').trim();
    const name = formData.get('Name')?.toString().trim();
    const surname1 = formData.get('Surname1')?.toString().trim();
    const email = formData.get('Email')?.toString().trim();
    const password = formData.get('Password')?.toString().trim();
    const password2 = formData.get('Password2')?.toString().trim();
    if (!nick) errors.push('nick: El nombre de usuario es obligatorio.');
    if (nick?.length > 20) errors.push('nick: Máximo 20 caracteres.');
    if (!name) errors.push('nombre: El nombre es obligatorio.');
    if (!surname1) errors.push('apellido: El apellido es obligatorio.');
    if (!email) errors.push('email: El email es obligatorio.');
    if (email && !this.emailRegex.test(email)) {
        errors.push('email: Formato de email inválido.');
    }
    if (!password) {
        errors.push('password: La contraseña es obligatoria.');
    } else {
        if (password.length < 8) errors.push('password: Debe tener al menos 8 caracteres.');
        if (!this.passwordRegex.test(password)) {
            errors.push('password: Requiere mayúscula, minúscula, número y carácter especial.');
        }
    }
    if (!password2 || password !== password2) errors.push('password2: Las contraseñas no coinciden.');
    if (errors.length > 0) throw new Error(errors.join('|'));
    const response = await fetch(`${this.API_URL}/Register`, {
        method: 'POST',
        body: formData
    });
    const responseText = await response.text();
    if (response.status === 400) {
        if (responseText.includes('Nick')) errors.push('nick: El nombre de usuario ya está registrado.');
        if (responseText.includes('E-mail')) errors.push('email: El email ya está registrado.');
        if (errors.length > 0) throw new Error(errors.join('|'));
    }
    if (!response.ok) throw new Error(`global: ${responseText}`);
    return responseText;
  }

  async login(email: string, password: string): Promise<void> {
    const errors: string[] = [];
    if (!email) errors.push('email: El email es obligatorio.');
    if (email && !this.emailRegex.test(email)) {
      errors.push('email: Formato de email inválido.');
    }
    if (!password) errors.push('password: La contraseña es obligatoria.');
    if (errors.length > 0) throw new Error(errors.join('|'));
    const response = await fetch(`${this.API_URL}/Login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    });
    const responseText = await response.text();
    if (responseText.includes('Confirmado') || responseText.includes('confirmado')) {
      throw new Error('global: Email no verificado. Por favor revisa tu correo.');
    }
    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('global: Credenciales inválidas.');
        }
        throw new Error(`global: ${responseText}`);
    }
    sessionStorage.setItem('auth_token', responseText);
    this.token.set(responseText);
  }

  async logout(): Promise<void> {
    const response = await fetch(`https://88.24.26.59/api/Account/Logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token()}` }
    });
    if (!response.ok) throw new Error(response.statusText);
    // sessionStorage.removeItem('auth_token');
    sessionStorage.clear();
    this.token.set(null);
  }
}