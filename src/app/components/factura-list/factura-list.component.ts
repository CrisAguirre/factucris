import { Component, OnInit } from '@angular/core';
import { ApiService, Factura } from '../../services/api.service';

@Component({
  selector: 'app-factura-list',
  templateUrl: './factura-list.component.html',
  styleUrls: ['./factura-list.component.css']
})
export class FacturaListComponent implements OnInit {
  facturas: Factura[] = [];
  loading: boolean = true;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadFacturas();
  }

  loadFacturas() {
    this.apiService.getFacturas().subscribe({
      next: (data) => {
        this.facturas = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching facturas', err);
        this.loading = false;
      }
    });
  }
}
