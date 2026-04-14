import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Gestión de Facturas';
  private inactiveTimeout: any;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.resetTimer();
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  @HostListener('window:mousemove')
  @HostListener('window:keypress')
  @HostListener('window:click')
  @HostListener('window:scroll')
  resetTimer() {
    this.clearTimer();
    
    // 5 minutes = 300000 milliseconds
    this.inactiveTimeout = setTimeout(() => {
      if (this.authService.isAuthenticated()) {
        this.authService.logout();
        this.router.navigate(['/login']);
        alert('Por tu seguridad, la sesión ha expirado tras 5 minutos de inactividad.');
      }
    }, 300000);
  }

  clearTimer() {
    if (this.inactiveTimeout) {
      clearTimeout(this.inactiveTimeout);
    }
  }
}
