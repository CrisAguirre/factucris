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
  facturaVistaPrevia: Factura | null = null;
  logoBase64: string = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadFacturas();
    this.loadLogo();
  }

  loadLogo() {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => {
        this.logoBase64 = reader.result as string;
      }
      reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', 'assets/logo.png');
    xhr.responseType = 'blob';
    xhr.send();
  }

  loadFacturas() {
    this.loading = true;
    this.apiService.getFacturas().subscribe({
      next: (data) => {
        this.facturas = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching recibos', err);
        this.loading = false;
      }
    });
  }

  // Borrar Factura (Recibo)
  deleteFactura(factura: Factura) {
    if (confirm(`¿Estás seguro de que deseas borrar el recibo #${factura.orden_ingreso}?`)) {
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
          alert(`Mes cerrado. Total de Ingresos: $${res.total}. Recibos borrados: ${res.facturasBorradas}`);
          this.loadFacturas();
        },
        error: (err) => console.error('Error cerrando mes', err)
      });
    }
  }

  // Vista Previa
  abrirVistaPrevia(fact: Factura) {
    this.facturaVistaPrevia = fact;
  }

  cerrarVistaPrevia() {
    this.facturaVistaPrevia = null;
  }

  // Descargar Word
  descargarWord() {
    const reciboArea = document.getElementById('reciboArea')?.innerHTML;
    if (!reciboArea) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Recibo</title></head><body>`;
    const footer = "</body></html>";
    const sourceHTML = header + reciboArea + footer;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    const ym = this.getYearMonth(this.facturaVistaPrevia?.fecha);
    fileDownload.download = `Recibo_${ym}_${this.padOrden(this.facturaVistaPrevia?.orden_ingreso)}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  }

  // Imprimir
  imprimirHtml() {
    window.print();
  }

  // Descargar PDF
  descargarPdf() {
    if (!this.facturaVistaPrevia) return;
    const fact = this.facturaVistaPrevia;
    const doc = new jsPDF();
    
    // Si tenemos el logo
    if (this.logoBase64) {
      doc.addImage(this.logoBase64, 'PNG', 85, 10, 40, 40); // centrado y tamaño apx 40x40
    }
    
    // Título
    doc.setFontSize(22);
    doc.text('Gestión de Facturas', 105, 60, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('RECIBO', 105, 70, { align: 'center' });
    
    // Datos de la factura
    doc.setFontSize(11);
    doc.text(`Orden de Ingreso: #${String(fact.orden_ingreso).padStart(4, '0')}`, 20, 90);
    const fecha = typeof fact.fecha === 'string' ? fact.fecha.substring(0, 10) : new Date(fact.fecha).toISOString().substring(0, 10);
    doc.text(`Fecha: ${fecha}`, 140, 90);
    
    doc.text(`Cliente: ${fact.nombre}`, 20, 100);
    if(fact.telefono) doc.text(`Teléfono: ${fact.telefono}`, 140, 100);

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
      startY: 115,
      head: [['Cant.', 'Descripción', 'V. Unitario', 'V. Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });

    if (fact.nota) {
      // @ts-ignore
      const finalY = doc.lastAutoTable.finalY || 140;
      doc.text(`Nota: ${fact.nota}`, 20, finalY + 15);
    }

    const ym = this.getYearMonth(fact.fecha);
    doc.save(`Recibo_${ym}_${String(fact.orden_ingreso).padStart(4, '0')}.pdf`);
  }

  // Exportar Excel
  exportarExcel() {
    let tablaHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; font-family: Arial, sans-serif; }
        th, td { border: 1px solid #000; padding: 6px; text-align: left; }
        th { background-color: #2980b9; color: white; font-weight: bold; }
        .center { text-align: center; }
        .currency { text-align: right; }
      </style>
      </head>
      <body>
      <table border="1" cellpadding="5">
        <tr>
          <td colspan="9" style="text-align: center; background-color: #f8f9fa; padding: 15px;">
            <img src="${this.logoBase64}" height="60" style="margin-bottom: 5px;"><br>
            <strong style="font-size: 16pt; color: #2c3e50;">Gestión de Facturas - Registro Histórico de Recibos</strong>
          </td>
        </tr>
        <tr>
          <th>Orden</th>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Teléfono</th>
          <th>Descripción</th>
          <th>Cantidad</th>
          <th>Valor Und</th>
          <th>Total</th>
          <th>Nota</th>
        </tr>`;

    this.facturas.forEach(f => {
      const fecha = typeof f.fecha === 'string' ? f.fecha.substring(0, 10) : new Date(f.fecha).toISOString().substring(0, 10);
      tablaHTML += `
        <tr>
          <td class="center">#${this.padOrden(f.orden_ingreso)}</td>
          <td>${fecha}</td>
          <td>${f.nombre}</td>
          <td>${f.telefono || ''}</td>
          <td>${f.descripcion || ''}</td>
          <td class="center">${f.cantidad}</td>
          <td class="currency">$${f.valor_und}</td>
          <td class="currency"><strong>$${f.valor_total}</strong></td>
          <td>${f.nota || ''}</td>
        </tr>`;
    });

    tablaHTML += '</table></body></html>';

    const source = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent(tablaHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    const ymList = this.getYearMonth();
    fileDownload.download = `Listado_Recibos_${ymList}.xls`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  }

  padOrden(num: number | undefined): string {
    if (num === undefined) return '0000';
    return String(num).padStart(4, '0');
  }

  getYearMonth(dateInput?: Date | string): string {
    const d = dateInput ? new Date(dateInput) : new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}_${mm}`;
  }
}
