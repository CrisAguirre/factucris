import { Component, OnInit } from '@angular/core';
import { ApiService, Factura, Cierre } from '../../services/api.service';
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
  cierres: Cierre[] = [];
  loading: boolean = true;
  facturaVistaPrevia: Factura | null = null;
  cierreVistaPrevia: Cierre | null = null;
  mostrarModalCierres: boolean = false;
  logoBase64: string = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadFacturas();
    this.loadCierres();
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

  loadCierres() {
    this.apiService.getCierres().subscribe({
      next: (data) => {
        this.cierres = data;
      },
      error: (err) => console.error('Error fetching history', err)
    });
  }

  // Historial
  abrirHistorialCierres() {
    this.loadCierres();
    this.mostrarModalCierres = true;
  }

  cerrarModalCierres() {
    this.mostrarModalCierres = false;
    this.cierreVistaPrevia = null;
  }

  seleccionarCierre(cierre: Cierre) {
    this.cierreVistaPrevia = cierre;
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
    if (confirm('¿Deseas cerrar el mes? Esto guardará un reporte histórico, sumará los ingresos y limpiará la base de datos para reiniciar el consecutivo a 0001. ESTA ACCIÓN ES IRREVERSIBLE.')) {
      const authPass = prompt('Acción Crítica: Ingresa la contraseña de seguridad para confirmar el cierre de mes:');
      if (authPass === 'Peguelonorre@') {
        this.apiService.cierreMes().subscribe({
          next: (res) => {
            alert(`Mes cerrado exitosamente y guardado en historial. Total de Ingresos: $${res.total}.`);
            this.loadFacturas();
            this.loadCierres();
          },
          error: (err) => {
            alert('Error al cerrar mes: ' + (err.error?.message || 'Error desconocido'));
            console.error('Error cerrando mes', err);
          }
        });
      } else {
        alert('Contraseña incorrecta. El cierre de mes ha sido abortado por motivos de seguridad.');
      }
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
    const reciboAreaNode = document.getElementById('reciboArea');
    if (!reciboAreaNode) return;
    
    // Clonamos el nodo para no afectar la vista
    const clone = reciboAreaNode.cloneNode(true) as HTMLElement;
    // Eliminamos el logo en Word porque los base64 generan una 'X' de imagen rota en MS Word
    const logoImg = clone.querySelector('#logo-preview');
    if (logoImg) {
      logoImg.remove();
    }

    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Recibo</title></head><body>`;
    const footer = "</body></html>";
    const sourceHTML = header + clone.innerHTML + footer;

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
    
    let currentY = 20;

    // Si tenemos el logo
    if (this.logoBase64) {
      const imgProps = doc.getImageProperties(this.logoBase64);
      const pdfWidth = doc.internal.pageSize.getWidth();
      // Reducido a altura de 20 (aprox 50% del anterior que era 40) y respetando proporciones
      const imgHeight = 20; 
      const imgWidth = (imgProps.width * imgHeight) / imgProps.height;
      const xOffset = (pdfWidth - imgWidth) / 2;
      
      doc.addImage(this.logoBase64, 'PNG', xOffset, 10, imgWidth, imgHeight); 
      currentY = 45; // Bajamos el texto para que no se sobreponga
    }
    
    // Título
    doc.setFontSize(22);
    doc.text('Gestión de Facturas', 105, currentY, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('RECIBO', 105, currentY + 10, { align: 'center' });
    
    // Datos de la factura
    doc.setFontSize(11);
    doc.text(`Orden de Ingreso: #${String(fact.orden_ingreso).padStart(4, '0')}`, 20, currentY + 30);
    const fecha = typeof fact.fecha === 'string' ? fact.fecha.substring(0, 10) : new Date(fact.fecha).toISOString().substring(0, 10);
    doc.text(`Fecha: ${fecha}`, 140, currentY + 30);
    
    doc.text(`Cliente: ${fact.nombre}`, 20, currentY + 40);
    if(fact.telefono) doc.text(`Teléfono: ${fact.telefono}`, 140, currentY + 40);

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
      startY: currentY + 55,
      head: [['Cant.', 'Descripción', 'V. Unitario', 'V. Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });

    if (fact.nota) {
      // @ts-ignore
      const finalY = doc.lastAutoTable.finalY || (currentY + 80);
      doc.text(`Nota: ${fact.nota}`, 20, finalY + 15);
    }

    const ym = this.getYearMonth(fact.fecha);
    doc.save(`Recibo_${ym}_${String(fact.orden_ingreso).padStart(4, '0')}.pdf`);
  }

  // Exportar Excel de cierres (Opcional, pero se añade por completitud)
  exportarExcel() {
    // ... codigo anterior resumido por brevedad en este chunk para enfocarme en los cierres
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

    const worksheet = xlsx.utils.json_to_sheet([]);
    xlsx.utils.sheet_add_aoa(worksheet, [['Gestión de Facturas - Registro Histórico de Recibos']], { origin: 'A1' });
    xlsx.utils.sheet_add_aoa(worksheet, [['']], { origin: 'A2' });
    xlsx.utils.sheet_add_json(worksheet, exportData, { origin: 'A3' });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Recibos');
    const ymList = this.getYearMonth();
    xlsx.writeFile(workbook, `Listado_Recibos_${ymList}.xlsx`);
  }

  // EXPORTACION DE CIERRES
  descargarWordCierre() {
    const content = document.getElementById('cierreReporteArea')?.innerHTML;
    if (!content) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Cierre Mensual</title></head><body>`;
    const footer = "</body></html>";
    const sourceHTML = header + content + footer;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `Cierre_${this.cierreVistaPrevia?.mes_nombre.replace(' ', '_')}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  }

  descargarPdfCierre() {
    if (!this.cierreVistaPrevia) return;
    const c = this.cierreVistaPrevia;
    const doc = new jsPDF();
    
    // Logo
    if (this.logoBase64) {
      doc.addImage(this.logoBase64, 'PNG', 85, 10, 40, 20); 
    }

    doc.setFontSize(20);
    doc.text('REPORTE CONSOLIDADO MENSUAL', 105, 45, { align: 'center' });
    doc.setFontSize(16);
    doc.text(c.mes_nombre.toUpperCase(), 105, 55, { align: 'center' });

    doc.setFontSize(12);
    const fInicio = typeof c.periodo.inicio === 'string' ? c.periodo.inicio.substring(0, 10) : new Date(c.periodo.inicio).toISOString().substring(0, 10);
    const fFin = typeof c.periodo.fin === 'string' ? c.periodo.fin.substring(0, 10) : new Date(c.periodo.fin).toISOString().substring(0, 10);
    doc.text(`Periodo: ${fInicio} al ${fFin}`, 20, 70);
    doc.text(`Cantidad de Recibos: ${c.cantidad_registros}`, 20, 80);
    doc.setFontSize(14);
    doc.text(`TOTAL INGRESOS: $${c.total_ingresos}`, 140, 80);

    const tableData = c.registros.map(f => [
      `#${this.padOrden(f.orden_ingreso)}`,
      typeof f.fecha === 'string' ? f.fecha.substring(0, 10) : new Date(f.fecha).toISOString().substring(0, 10),
      f.nombre,
      `$${f.valor_total}`
    ]);

    autoTable(doc, {
      startY: 90,
      head: [['Orden', 'Fecha', 'Cliente', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80] }
    });

    doc.save(`Cierre_${c.mes_nombre.replace(' ', '_')}.pdf`);
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
