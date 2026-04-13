import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, Factura } from '../../services/api.service';

@Component({
  selector: 'app-factura-form',
  templateUrl: './factura-form.component.html',
  styleUrls: ['./factura-form.component.css']
})
export class FacturaFormComponent {
  factura: Factura = {
    fecha: new Date().toISOString().substring(0,10),
    nombre: '',
    telefono: '',
    descripcion: '',
    cantidad: 1,
    valor_und: 0,
    valor_total: 0,
    nota: ''
  };

  isSubmitting: boolean = false;
  error: string = '';

  constructor(private apiService: ApiService, private router: Router) {}

  calcularTotal() {
    this.factura.valor_total = (this.factura.cantidad || 0) * (this.factura.valor_und || 0);
  }

  onSubmit() {
    this.isSubmitting = true;
    this.error = '';

    this.apiService.createFactura(this.factura).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.router.navigate(['/dashboard/list']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.error = 'Ocurrió un error al guardar la factura.';
        console.error(err);
      }
    });
  }
}
