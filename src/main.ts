import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, InMemoryScrollingOptions } from '@angular/router';
import { withInMemoryScrolling } from '@angular/router';
import { AppComponent } from './app/app.component';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app/app.routes';
import { appConfig } from './app/app.config';

const scrollConfig: InMemoryScrollingOptions = {
  anchorScrolling: 'enabled',
  scrollPositionRestoration: 'enabled',
};

bootstrapApplication(AppComponent, appConfig).then(() => {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling(scrollConfig),
      withComponentInputBinding()
    ),
    provideHttpClient(
      withFetch()
    )
  ]
}).catch(err => console.error(err));