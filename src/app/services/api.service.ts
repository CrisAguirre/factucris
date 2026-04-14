import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Factura {
  _id?: string;
  orden_ingreso?: number;
  fecha: Date | string;
  nombre: string;
  telefono?: string;
  descripcion?: string;
  cantidad: number;
  valor_und: number;
  valor_total: number;
  nota?: string;
}

export interface Cierre {
  _id?: string;
  mes_nombre: string;
  fecha_cierre: Date | string;
  total_ingresos: number;
  cantidad_registros: number;
  periodo: {
    inicio: Date | string;
    fin: Date | string;
  };
  registros: Factura[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl + '/facturas';

  constructor(private http: HttpClient) {}

  getFacturas(): Observable<Factura[]> {
    return this.http.get<Factura[]>(this.baseUrl);
  }

  createFactura(factura: Factura): Observable<Factura> {
    return this.http.post<Factura>(this.baseUrl, factura);
  }

  deleteFactura(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  cierreMes(): Observable<any> {
    return this.http.post(`${this.baseUrl}/cierre-mes/ejecutar`, {});
  }

  // Historial de Cierres
  getCierres(): Observable<Cierre[]> {
    return this.http.get<Cierre[]>(`${this.baseUrl}/cierres`);
  }

  getCierreById(id: string): Observable<Cierre> {
    return this.http.get<Cierre>(`${this.baseUrl}/cierres/${id}`);
  }
}
