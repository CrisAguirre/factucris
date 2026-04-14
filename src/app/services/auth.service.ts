import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthSubject = new BehaviorSubject<boolean>(this.checkToken());
  public isAuthenticated$ = this.isAuthSubject.asObservable();

  constructor() {}

  private checkToken(): boolean {
    return localStorage.getItem('factucris_auth') === 'true';
  }

  login(user: string, pass: string): boolean {
    // Hardcoded credentials for single user validation as requested
    if (user === 'CrisLeona' && pass === 'M@1d3n!') {
      localStorage.setItem('factucris_auth', 'true');
      this.isAuthSubject.next(true);
      return true;
    }
    return false;
  }

  logout() {
    localStorage.removeItem('factucris_auth');
    this.isAuthSubject.next(false);
  }

  isAuthenticated(): boolean {
    return this.isAuthSubject.value;
  }
}
