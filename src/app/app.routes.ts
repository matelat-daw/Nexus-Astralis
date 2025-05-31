import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { HomeComponent } from './features/home/home.component';
import { EventsComponent } from './features/events/events.component';
import { CatalogComponent } from './features/catalog/catalog.component';
import { StarmapComponent } from './features/starmap/starmap.component';
import { UserComponent } from './features/user/user.component';
import { ProjectComponent } from './features/project/project.component';
import { AboutusComponent } from './features/aboutus/aboutus.component';
import { ConstellationComponent } from './features/constellation/constellation.component';
import { StarComponent } from './features/star/star.component';
import { LoginComponent } from './features/login/login.component';
import { RegisterComponent } from './features/register/register.component';
import { ProfileComponent } from './features/profile/profile.component';
import { authGuard } from './services/auth/auth.guard';
import { SolarComponent } from './features/solar/solar.component';

export const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        children: [
            // Header
            { path: '', component: HomeComponent },
            { path: 'events', component: EventsComponent },
            { path: 'catalog', component: CatalogComponent },

            // Footer
            { path: 'project', component: ProjectComponent },
            { path: 'aboutus', component: AboutusComponent },

            // Details
            { path: 'constellation/:id', component: ConstellationComponent },
            { path: 'star/:id', component: StarComponent },
            
            // User management
            { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
            { path: 'user/:nick', component: UserComponent, canActivate: [authGuard] },

            // Auth
            { path: 'login', component: LoginComponent },
            { path: 'register', component: RegisterComponent },
        ]
    },
    { path: 'starmap', component: StarmapComponent },
    { path: 'solar', component: SolarComponent },
    { path: '**', redirectTo: '' },
];