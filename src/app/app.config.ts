import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { SocialAuthServiceConfig, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { environment } from './services/environments/environments';
// Note: Please install the package first using:
// npm install @abacritt/angularx-social-login

export const appConfig: ApplicationConfig = {
  // providers: [
  //   provideZoneChangeDetection({ eventCoalescing: true }), 
  //   provideRouter(routes), 
  //   provideHttpClient(withFetch())],

  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(),
    ),
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(
              environment.googleClientId,
              {
                oneTapEnabled: false, // Deshabilitar One Tap para evitar problemas
                scopes: 'email profile'
              }
            )
          }
        ],
        onError: (err) => {
          console.error('Error en autenticación social:', err);
        }
      } as SocialAuthServiceConfig
    }
  ]
};