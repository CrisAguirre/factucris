import { Component, OnInit } from '@angular/core';
import { ApiService, Factura } from '../../services/api.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as xlsx from 'xlsx';

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
    this.loading = true;
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

  // Borrar Factura
  deleteFactura(factura: Factura) {
    if (confirm(`¿Estás seguro de que deseas borrar la factura #${factura.orden_ingreso}?`)) {
      if(factura._id) {
        this.apiService.deleteFactura(factura._id).subscribe({
          next: () => {
            this.facturas = this.facturas.filter(f => f._id !== factura._id);
          },
          error: (err) => console.error('Error deleting', err)
        });
      }
    }
  }

  // Cerrar Mes
  cerrarMes() {
    if (confirm('¿Deseas cerrar el mes? Esto sumará los ingresos y limpiará la base de datos para reiniciar el consecutivo a 0001.')) {
      this.apiService.cierreMes().subscribe({
        next: (res) => {
          alert(`Mes cerrado. Total de Ingresos: $${res.total}. Facturas borradas: ${res.facturasBorradas}`);
          this.loadFacturas();
        },
        error: (err) => console.error('Error cerrando mes', err)
      });
    }
  }

  // Imprimir PDF
  imprimirPdf(fact: Factura) {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(22);
    doc.text('FACTUCRIS', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('Factura de Venta', 105, 30, { align: 'center' });
    
    // Datos de la factura
    doc.setFontSize(11);
    doc.text(`Orden de Ingreso: #${String(fact.orden_ingreso).padStart(4, '0')}`, 20, 50);
    const fecha = typeof fact.fecha === 'string' ? fact.fecha.substring(0, 10) : new Date(fact.fecha).toISOString().substring(0, 10);
    doc.text(`Fecha: ${fecha}`, 140, 50);
    
    doc.text(`Cliente: ${fact.nombre}`, 20, 60);
    if(fact.telefono) doc.text(`Teléfono: ${fact.telefono}`, 140, 60);

    // Tabla de Items
    const tableData = [
      [
        fact.cantidad, 
        fact.descripcion || 'Sin detalle', 
        `$${fact.valor_und}`, 
        `$${fact.valor_total}`
      ]
    ];

    autoTable(doc, {
      startY: 75,
      head: [['Cant.', 'Descripción', 'V. Unitario', 'V. Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });

    if (fact.nota) {
      // @ts-ignore
      const finalY = doc.lastAutoTable.finalY || 100;
      doc.text(`Nota: ${fact.nota}`, 20, finalY + 15);
    }

    doc.save(`Factura_${String(fact.orden_ingreso).padStart(4, '0')}.pdf`);
  }

  // Exportar Excel
  exportarExcel() {
    const exportData = this.facturas.map(f => ({
      Orden: f.orden_ingreso,
      Fecha: typeof f.fecha === 'string' ? f.fecha.substring(0, 10) : new Date(f.fecha).toISOString().substring(0, 10),
      Cliente: f.nombre,
      Telefono: f.telefono,
      Descripcion: f.descripcion,
      Cantidad: f.cantidad,
      'Valor Und': f.valor_und,
      Total: f.valor_total,
      Nota: f.nota
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Facturas');
    
    // Descargar
    xlsx.writeFile(workbook, 'Listado_Facturas.xlsx');
  }

  padOrden(num: number | undefined): string {
    if (num === undefined) return '0000';
    return String(num).padStart(4, '0');
  }
}
