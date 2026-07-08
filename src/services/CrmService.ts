import { db } from '../db/db';
import { Customer, Invoice, Quotation } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export interface CustomerFollowup {
  id?: number;
  customer_id: number;
  type: 'Call' | 'WhatsApp' | 'Meeting' | 'Email' | 'Reminder' | 'Site Visit';
  date: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High';
  assigned_to: string;
  notes?: string;
  completed_date?: string;
}

export interface CustomerNote {
  id?: number;
  customer_id: number;
  text: string;
  created_at: string;
  author: string;
}

export interface WhatsAppTemplate {
  id?: number;
  name: string;
  body: string;
  type: 'Utility' | 'Marketing' | 'Alert';
}

export interface WhatsAppCampaign {
  id?: number;
  name: string;
  template_id?: number;
  segment: string;
  scheduled_date: string;
  status: 'Sent' | 'Scheduled' | 'Failed' | 'Cancelled';
  notes?: string;
  recipients_count: number;
}

export const CRM_TEMPLATES: WhatsAppTemplate[] = [
  { id: 1, name: 'Welcome Message', type: 'Utility', body: 'Hello {{CustomerName}},\n\nThank you for choosing AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.)! We are thrilled to partner with you. Your customer reference code is {{CustomerCode}}.\n\nBest Regards,\n{{SalesPerson}}' },
  { id: 2, name: 'Quotation Follow-up', type: 'Marketing', body: 'Dear {{CustomerName}},\n\nHope you are doing well. We are following up on Quotation No: {{QuotationNo}}. Please let us know if you need any adjustments or technical specifications.\n\nSincerely,\n{{SalesPerson}}' },
  { id: 3, name: 'Invoice Outstanding Reminder', type: 'Alert', body: 'Urgent Notification:\n\nDear {{CustomerName}},\n\nThis is a friendly reminder that invoice {{InvoiceNo}} has an outstanding balance of AED {{Outstanding}} as of {{CurrentDate}}. Please process the payment at your earliest convenience.\n\nThank you,\nAL Zahra Bldg. Materials' },
  { id: 4, name: 'New Product Catalog', type: 'Marketing', body: 'Hi {{CustomerName}},\n\nWe have just received a premium shipment of imported Tiles and Sanitary Ware at our Al Sajaa warehouse! Check out our latest collections.\n\nBest,\n{{SalesPerson}}' }
];

export class CrmService {
  // Initialize default templates if empty
  static async initDefaults() {
    try {
      const count = await db.whatsappTemplates.count();
      if (count === 0) {
        await db.whatsappTemplates.bulkPut(CRM_TEMPLATES);
      }
    } catch (err) {
      console.warn('Non-blocking error during CRM template initialization:', err);
    }
  }

  // Get active followups
  static async getFollowups(customerId?: number): Promise<CustomerFollowup[]> {
    if (customerId) {
      return db.customerFollowups.where('customer_id').equals(customerId).reverse().toArray();
    }
    return db.customerFollowups.reverse().toArray();
  }

  // Get notes for customer
  static async getNotes(customerId: number): Promise<CustomerNote[]> {
    return db.customerNotes.where('customer_id').equals(customerId).reverse().toArray();
  }

  // Get campaigns
  static async getCampaigns(): Promise<WhatsAppCampaign[]> {
    return db.whatsappCampaigns.reverse().toArray();
  }

  // Replace message variables
  static replaceVariables(text: string, customer: Customer, extra: {
    quotation_no?: string;
    invoice_no?: string;
    sales_person?: string;
  } = {}): string {
    const today = new Date().toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
    const name = customer.contact_person || customer.name;
    const company = customer.name;
    const outstanding = (customer.balance || 0).toFixed(2);
    const code = customer.customer_code || `CUST-${customer.id || 'N/A'}`;
    const rep = extra.sales_person || customer.sales_representative || 'Al Zahra Representative';

    return text
      .replace(/\{\{CustomerName\}\}/g, name)
      .replace(/\{\{Company\}\}/g, company)
      .replace(/\{\{CustomerCode\}\}/g, code)
      .replace(/\{\{QuotationNo\}\}/g, extra.quotation_no || 'QT-XXXX')
      .replace(/\{\{InvoiceNo\}\}/g, extra.invoice_no || 'INV-XXXX')
      .replace(/\{\{Outstanding\}\}/g, outstanding)
      .replace(/\{\{SalesPerson\}\}/g, rep)
      .replace(/\{\{CurrentDate\}\}/g, today);
  }

  // Send single click-to-chat WhatsApp
  static getWhatsAppClickUrl(phone: string, text: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const prefix = cleanPhone.startsWith('0') ? '971' + cleanPhone.slice(1) : cleanPhone;
    return `https://wa.me/${prefix}?text=${encodeURIComponent(text)}`;
  }

  // Generate automated Customer Code
  static async generateCustomerCode(): Promise<string> {
    const count = await db.customers.count();
    const nextNum = 1000 + count + 1;
    return `CUST-${nextNum}`;
  }

  // Segment customers
  static async getCustomerSegments(customers: Customer[], invoices: Invoice[]): Promise<Record<string, Customer[]>> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const segments: Record<string, Customer[]> = {
      'All Customers': customers,
      'Contractors': customers.filter(c => c.customer_type === 'Contractor'),
      'Builders': customers.filter(c => c.customer_type === 'Builder'),
      'Architects': customers.filter(c => c.customer_type === 'Architect'),
      'Interior Designers': customers.filter(c => c.customer_type === 'Interior Designer'),
      'VIP Customers': customers.filter(c => (c.balance > 25000) || (c.credit_limit && c.credit_limit >= 50000)),
      'Outstanding Balances': customers.filter(c => (c.balance || 0) > 0),
      'Inactive (90 Days)': customers.filter(c => {
        const lastDate = c.created_at ? new Date(c.created_at) : new Date(0);
        // Find if they have any invoices in the last 90 days
        const hasRecentPurchase = invoices.some(inv => 
          inv.customer_id === c.id && 
          inv.date && 
          new Date(inv.date) >= ninetyDaysAgo
        );
        return !hasRecentPurchase && lastDate < ninetyDaysAgo;
      }),
    };

    return segments;
  }

  // Export customers to Excel
  static exportToExcel(customers: Customer[]) {
    const data = customers.map(c => ({
      'Code': c.customer_code || '',
      'Company Name': c.name,
      'Contact Person': c.contact_person || '',
      'Phone': c.phone || '',
      'WhatsApp': c.whatsapp_number || '',
      'Email': c.email || '',
      'TRN': c.trn || '',
      'Address': c.address || '',
      'City': c.city || 'Sharjah',
      'Country': c.country || 'UAE',
      'Type': c.customer_type || 'Retail Customer',
      'Outstanding': c.balance || 0,
      'Credit Limit': c.credit_limit || 0,
      'Sales Representative': c.sales_representative || '',
      'Status': c.status || 'Active',
      'Created Date': c.created_at || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers Master');
    XLSX.writeFile(wb, 'Al_Zahra_CRM_Customers.xlsx');
  }

  // Export to PDF Report
  static exportToPDF(customers: Customer[], title: string = 'Customers CRM Directory') {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.)', 14, 15);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 14, 21);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 26);

    const body = customers.map(c => [
      c.customer_code || '-',
      c.name,
      c.phone || '-',
      c.customer_type || 'Retail',
      `AED ${(c.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    (doc as any).autoTable({
      startY: 32,
      head: [['Code', 'Company Name', 'Phone', 'Type', 'Outstanding Balance']],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [15, 70, 107] },
      styles: { fontSize: 8 },
      columnStyles: {
        4: { halign: 'right' }
      }
    });

    doc.save('Al_Zahra_Customers_Report.pdf');
  }
}
