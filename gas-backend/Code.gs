/**
 * Google Apps Script - Personal & Family Finance SaaS
 * 
 * Các Sheet yêu cầu:
 * 1. "PnL" (Cột: ID, Timestamp, Type, Amount, Category, Description, Source)
 * 2. "Staging" (Cột: ID, Timestamp, Type, Amount, Category, Description, Source, Status)
 */

const PNL_SHEET_NAME = 'PnL';
const STAGING_SHEET_NAME = 'Staging';
const GOALS_SHEET_NAME = 'Goals';
const SCRIPT_LOCK_TIMEOUT = 10000; // 10 seconds

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'getPnL') {
      const data = getSheetData(PNL_SHEET_NAME);
      return createJsonResponse({ status: 'success', data: data });
    } else if (action === 'getStaging') {
      const data = getSheetData(STAGING_SHEET_NAME).filter(row => row.Status === 'PENDING');
      return createJsonResponse({ status: 'success', data: data });
    }
    if (action === 'getGoals') return createJsonResponse({ status: 'success', data: getSheetData(GOALS_SHEET_NAME) });
    if (action === 'getInvestments') return createJsonResponse({ status: 'success', data: getSheetData('Investments') });
    return createJsonResponse({ status: 'error', message: 'Invalid action' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Đợi tối đa 10s để lấy quyền khóa, tránh xung đột ghi đồng thời
    lock.waitLock(SCRIPT_LOCK_TIMEOUT);
    
    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ status: 'error', message: 'Invalid JSON payload' });
    }

    const action = payload.action;
    const data = payload;
    const EXPECTED_TOKEN = "LUCEA-2026";

    // Xác thực token bảo mật
    if (payload.secureToken !== EXPECTED_TOKEN) {
      return createJsonResponse({ status: 'error', message: 'Unauthorized: Invalid Secure-Token' });
    }

    switch (action) {
      case 'webhook_ingest':
        return handleWebhookIngest(data.data);
      case 'manual_insert':
        return handleManualInsert(data.data);
      case 'save_goals':
        return handleSaveGoals(data.data);
      case 'save_investments':
        return handleSaveInvestments(data.data);
      case 'approve_staging':
        return handleApproveStaging(data.transactionId, data.updates);
      default:
        return createJsonResponse({ status: 'error', message: 'Unknown action' });
    }
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function handleWebhookIngest(data) {
  // data: { amount, description, timestamp, source }
  const sheet = getOrCreateSheet(STAGING_SHEET_NAME, ['ID', 'Timestamp', 'Type', 'Amount', 'Category', 'Description', 'Source', 'Status']);
  
  const newTx = {
    id: Utilities.getUuid(),
    timestamp: data.timestamp || new Date().toISOString(),
    type: data.amount > 0 ? 'Revenue' : 'Expense',
    amount: data.amount,
    category: 'Uncategorized',
    description: data.description,
    source: data.source || 'Webhook',
    status: 'PENDING'
  };

  // Thuật toán Contra-entry
  // Tìm trong vòng 5 phút ở Staging xem có giao dịch ngược dấu không
  const isContra = checkContraEntry(newTx);
  if (isContra) {
    newTx.category = 'Internal Transfer';
    newTx.type = 'Non-P&L';
  }

  sheet.appendRow([
    newTx.id,
    newTx.timestamp,
    newTx.type,
    newTx.amount,
    newTx.category,
    newTx.description,
    newTx.source,
    newTx.status
  ]);

  return createJsonResponse({ status: 'success', data: newTx });
}

function checkContraEntry(newTx) {
  const sheet = getOrCreateSheet(STAGING_SHEET_NAME, []);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;

  const headers = data[0];
  const timeIdx = headers.indexOf('Timestamp');
  const amountIdx = headers.indexOf('Amount');
  const catIdx = headers.indexOf('Category');

  const newTime = new Date(newTx.timestamp).getTime();
  
  for (let i = data.length - 1; i > 0; i--) {
    const row = data[i];
    const rowTime = new Date(row[timeIdx]).getTime();
    
    // Nếu quá 5 phút (300,000 ms), bỏ qua
    if (Math.abs(newTime - rowTime) > 300000) break;

    // Nếu ngược dấu và cùng giá trị tuyệt đối
    if (Number(row[amountIdx]) === -Number(newTx.amount)) {
      // Cập nhật giao dịch cũ thành Internal Transfer
      sheet.getRange(i + 1, catIdx + 1).setValue('Internal Transfer');
      return true;
    }
  }
  return false;
}

function handleManualInsert(data) {
  const sheet = getOrCreateSheet(PNL_SHEET_NAME, ['ID', 'Timestamp', 'Type', 'Amount', 'Category', 'Description', 'Source']);
  
  const newTx = {
    id: Utilities.getUuid(),
    timestamp: new Date().toISOString(),
    type: data.type, // Revenue, COGS, OPEX, Non-Operating
    amount: data.amount,
    category: data.category,
    description: data.description,
    source: data.source || 'Manual'
  };

  sheet.appendRow([
    newTx.id,
    newTx.timestamp,
    newTx.type,
    newTx.amount,
    newTx.category,
    newTx.description,
    newTx.source
  ]);

  return createJsonResponse({ status: 'success', data: newTx });
}

function handleApproveStaging(transactionId, updates) {
  const stagingSheet = getOrCreateSheet(STAGING_SHEET_NAME, []);
  const pnlSheet = getOrCreateSheet(PNL_SHEET_NAME, ['ID', 'Timestamp', 'Type', 'Amount', 'Category', 'Description', 'Source']);
  
  const data = stagingSheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('ID');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === transactionId) {
      // Đánh dấu approved trong staging
      stagingSheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue('APPROVED');
      
      // Đẩy sang PnL với updates (Category, Type...)
      const row = data[i];
      pnlSheet.appendRow([
        row[idIdx],
        row[headers.indexOf('Timestamp')],
        updates.type || row[headers.indexOf('Type')],
        row[headers.indexOf('Amount')],
        updates.category || row[headers.indexOf('Category')],
        updates.description || row[headers.indexOf('Description')],
        row[headers.indexOf('Source')]
      ]);
      return createJsonResponse({ status: 'success', message: 'Transaction approved and moved to PnL' });
    }
  }
  return createJsonResponse({ status: 'error', message: 'Transaction not found in Staging' });
}

// ---- UTILS ----

function getOrCreateSheet(sheetName, defaultHeaders) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (defaultHeaders && defaultHeaders.length > 0) {
      sheet.appendRow(defaultHeaders);
    }
  }
  return sheet;
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  return result;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleSaveGoals(goalsArray) {
  const sheet = getOrCreateSheet(GOALS_SHEET_NAME, ['ID', 'Name', 'TargetAmount', 'CurrentAmount', 'Type', 'AllocatedPercentage', 'LoanInterestRate', 'LoanTermMonths', 'UpdatedAt', 'Priority', 'LoanPhases']);
  
  // Xóa dữ liệu cũ (từ dòng 2 trở đi)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  
  // Ghi dữ liệu mới
  if (goalsArray && goalsArray.length > 0) {
    const rows = goalsArray.map(g => [
      g.id,
      g.name,
      g.targetAmount,
      g.currentAmount,
      g.type,
      g.allocatedPercentage,
      g.loanInterestRate || 0,
      g.loanTermMonths || 0,
      g.updatedAt || new Date().toISOString(),
      g.priority || 1,
      JSON.stringify(g.loanPhases || [])
    ]);
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  
  return createJsonResponse({ status: 'success', message: 'Goals saved' });
}

function handleSaveInvestments(investmentsArray) {
  const sheet = getOrCreateSheet('Investments', ['ID', 'Name', 'Type', 'ExpectedYield', 'CurrentAmount', 'Cashflows', 'UpdatedAt']);
  
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  
  if (investmentsArray && investmentsArray.length > 0) {
    const rows = investmentsArray.map(inv => [
      inv.id,
      inv.name,
      inv.type,
      inv.expectedYield || 0,
      inv.currentAmount || 0,
      JSON.stringify(inv.cashflows || []),
      inv.updatedAt || new Date().toISOString()
    ]);
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  
  return createJsonResponse({ status: 'success', message: 'Investments saved' });
}
