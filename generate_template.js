const ExcelJS = require('exceljs');
const fs = require('fs');

async function createTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Lucea SaaS';
  workbook.created = new Date();

  // 1. Tạo Sheet PnL
  const pnlSheet = workbook.addWorksheet('PnL');
  pnlSheet.columns = [
    { header: 'ID', key: 'id', width: 20 },
    { header: 'Timestamp', key: 'timestamp', width: 25 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Category', key: 'category', width: 35 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Source', key: 'source', width: 15 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Original Amount', key: 'original_amount', width: 15 }
  ];
  pnlSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  pnlSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
  
  // Add some dummy data for formulas to work
  pnlSheet.addRow(['123', '2026-07-10T10:00:00Z', 'Revenue', 5000000, 'Tổng doanh thu (Gross Revenue)', 'Bán hàng', 'Tiền mặt', 'VND', '']);
  pnlSheet.addRow(['124', '2026-07-10T11:00:00Z', 'COGS', -100000, 'Sinh hoạt cơ bản (Direct Materials)', 'Mua gạo', 'Tiền mặt', 'VND', '']);

  // 2. Tạo Sheet Staging
  const stagingSheet = workbook.addWorksheet('Staging');
  stagingSheet.columns = [
    { header: 'ID', key: 'id', width: 20 },
    { header: 'Timestamp', key: 'timestamp', width: 25 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Category', key: 'category', width: 35 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Source', key: 'source', width: 15 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Original Amount', key: 'original_amount', width: 15 },
    { header: 'Status', key: 'status', width: 15 }
  ];
  stagingSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  stagingSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF79646' } };

  // 3. Tạo Sheet Report (Bảng Điều Khiển P&L)
  const reportSheet = workbook.addWorksheet('Báo_Cáo_PnL');
  reportSheet.columns = [
    { header: 'Hạng Mục', key: 'item', width: 40 },
    { header: 'Giá Trị (VND)', key: 'value', width: 20 },
    { header: 'Ghi chú', key: 'note', width: 30 }
  ];
  reportSheet.getRow(1).font = { bold: true };
  
  const addReportRow = (item, formula, note = '', isBold = false) => {
    const row = reportSheet.addRow({ item, note });
    row.getCell('value').value = { formula: formula };
    row.getCell('value').numFmt = '#,##0';
    if (isBold) {
      row.font = { bold: true };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    }
  };

  // Add Formulas referencing the PnL sheet
  addReportRow('1. Tổng doanh thu (Gross Revenue)', 'SUMIF(PnL!E:E, "Tổng doanh thu (Gross Revenue)", PnL!D:D)');
  addReportRow('2. Chi phí sàn/Giảm trừ (Returns)', 'SUMIF(PnL!E:E, "Chi phí sàn/Giảm trừ (Returns)", PnL!D:D)');
  addReportRow('I. DOANH THU THUẦN (Net Revenue)', 'B2+B3', '', true);
  
  reportSheet.addRow([]); // empty row
  
  addReportRow('3. Sinh hoạt cơ bản (Direct Materials)', 'SUMIF(PnL!E:E, "Sinh hoạt cơ bản (Direct Materials)", PnL!D:D)');
  addReportRow('4. Giáo dục & Giúp việc (Direct Labor)', 'SUMIF(PnL!E:E, "Giáo dục & Giúp việc (Direct Labor)", PnL!D:D)');
  addReportRow('5. Xăng xe & Di chuyển (Inbound Freight)', 'SUMIF(PnL!E:E, "Xăng xe & Di chuyển (Inbound Freight)", PnL!D:D)');
  addReportRow('II. TỔNG CHI PHÍ THIẾT YẾU (COGS)', 'ABS(B6+B7+B8)', '', true);
  
  reportSheet.addRow([]);
  
  addReportRow('III. LỢI NHUẬN GỘP (Gross Profit)', 'B4-B9', '', true);
  
  reportSheet.addRow([]);

  addReportRow('6. Quản lý gia đình (SG&A)', 'SUMIF(PnL!E:E, "Quản lý gia đình (SG&A)", PnL!D:D)');
  addReportRow('7. Ngoại giao & Giải trí (Sales & Marketing)', 'SUMIF(PnL!E:E, "Ngoại giao & Giải trí (Sales & Marketing)", PnL!D:D)');
  addReportRow('8. Học tập & PT bản thân (R&D)', 'SUMIF(PnL!E:E, "Học tập & PT bản thân (R&D)", PnL!D:D)');
  addReportRow('9. Quỹ dự phòng (Depreciation)', 'SUMIF(PnL!E:E, "Quỹ dự phòng (Depreciation)", PnL!D:D)');
  addReportRow('IV. TỔNG CHI PHÍ HOẠT ĐỘNG (OPEX)', 'ABS(B12+B13+B14+B15)', '', true);

  reportSheet.addRow([]);

  addReportRow('V. LỢI NHUẬN HOẠT ĐỘNG (EBIT)', 'B11-B16', '', true);

  reportSheet.addRow([]);

  addReportRow('10. Lãi tiết kiệm / Cổ tức', 'SUMIF(PnL!E:E, "Lãi tiết kiệm / Cổ tức", PnL!D:D)');
  addReportRow('11. Chi phí lãi vay', 'SUMIF(PnL!E:E, "Chi phí lãi vay", PnL!D:D)');
  addReportRow('12. Thuế (Taxes)', 'SUMIF(PnL!E:E, "Thuế (Taxes)", PnL!D:D)');
  addReportRow('13. Khác (Thu/Chi bất thường)', 'SUMIFS(PnL!D:D, PnL!C:C, "Non-Operating", PnL!E:E, "Khác")');
  addReportRow('VI. LỢI NHUẬN RÒNG (NET INCOME)', 'B18+B20+B21+B22+B23', 'Thặng dư cuối cùng', true);

  // Ghi file ra đĩa
  const fileName = 'Lucea_Finance_Template.xlsx';
  await workbook.xlsx.writeFile(fileName);
  console.log(`Đã tạo thành công file ${fileName}`);
}

createTemplate().catch(err => console.error(err));
