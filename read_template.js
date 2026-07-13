const ExcelJS = require('exceljs');

async function readTemplate() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('Quan_ly_tai_chinh_gia_dinh_template.xlsx');
  
  workbook.worksheets.forEach(worksheet => {
    console.log(`Sheet: ${worksheet.name}`);
    const row = worksheet.getRow(1);
    const headers = [];
    row.eachCell((cell, colNumber) => {
      headers.push(cell.value);
    });
    console.log(`  Columns: ${headers.join(', ')}`);
  });
}

readTemplate().catch(console.error);
