/**
 * Google Apps Script - Family Finance SaaS
 * 
 * Kiến trúc Serverless API 
 */

const SCRIPT_LOCK_TIMEOUT = 10000; 

function doGet(e) {
  try {
    const action = e.parameter.action;
    const userId = e.parameter.userId;
    const role = e.parameter.role;

    if (!userId) return createJsonResponse({ success: false, message: 'Missing userId' });

    if (action === 'getAccounts') {
      const accounts = getSheetData('Accounts');
      // Filter based on Privacy_Tag and Owner
      const filtered = accounts.filter(acc => canView(acc, userId, role));
      return createJsonResponse({ success: true, data: filtered });
    }
    
    if (action === 'getTransactions') {
      const transactions = getSheetData('Transactions');
      const filtered = transactions.filter(tx => canView(tx, userId, role));
      return createJsonResponse({ success: true, data: filtered });
    }

    if (action === 'getGoals') return createJsonResponse({ success: true, data: getSheetData('Goals') });
    if (action === 'getInvestments') return createJsonResponse({ success: true, data: getSheetData('Investments') });
    
    return createJsonResponse({ success: false, message: 'Invalid action' });
  } catch (error) {
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(SCRIPT_LOCK_TIMEOUT);
    
    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ success: false, message: 'Invalid JSON payload' });
    }

    const action = payload.action;
    const data = payload.data;
    const EXPECTED_TOKEN = "LUCEA-2026";

    // Allow login without checking token (just checking username/password)
    if (action === 'login') {
      return handleLogin(data.username, data.password);
    }

    if (payload.secureToken !== EXPECTED_TOKEN) {
      return createJsonResponse({ success: false, message: 'Unauthorized: Invalid Secure-Token' });
    }

    switch (action) {
      case 'create_transaction':
        return handleCreateTransaction(data);
      case 'update_transaction':
        return handleUpdateTransaction(data.transactionId, data.updates);
      case 'delete_transaction':
        return handleDeleteTransaction(data.transactionId);
      case 'save_goals':
        return handleSaveGoals(data);
      case 'save_investments':
        return handleSaveInvestments(data);
      default:
        return createJsonResponse({ success: false, message: 'Unknown action' });
    }
  } catch (error) {
    return createJsonResponse({ success: false, message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function handleLogin(username, password) {
  const users = getSheetData('Users');
  const user = users.find(u => (u.Username || u.User_ID) === username && u.Password === password);
  
  if (user) {
    // Remove password from response
    delete user.Password;
    return createJsonResponse({ success: true, data: user, message: 'Login successful' });
  }
  return createJsonResponse({ success: false, message: 'Invalid credentials' });
}

function canView(record, userId, role) {
  const owner = record.Owner_User_ID || record.Owner;
  const privacy = record.Privacy_Tag;

  if (role === 'ADMIN') return true;
  if (owner === userId) return true;
  
  if (privacy === 'FAMILY') return true;
  if (privacy === 'PERSONAL' && owner !== userId) return false;
  if (privacy === 'BUSINESS' && owner !== userId) return false; // Thêm logic Shared_With sau
  
  return false;
}

function handleCreateTransaction(txData) {
  const sheet = getOrCreateSheet('Transactions', [
    'Transaction_ID', 'Transaction_Date', 'Transaction_Type', 'Status', 'Account_From', 'Account_To', 
    'Category_ID', 'Amount_Original', 'Currency', 'Exchange_Rate', 'Amount_VND', 'Goal_ID', 
    'Investment_ID', 'Debt_ID', 'Recurring_ID', 'Description', 'Merchant', 'Privacy_Tag', 
    'Owner_User_ID', 'Created_By', 'Source', 'Drive_URL', 'Idempotency_Key', 'Created_At', 'Updated_At'
  ]);
  
  // Check Idempotency (prevent duplicate submissions)
  if (txData.Idempotency_Key) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const keyIdx = headers.indexOf('Idempotency_Key');
    for (let i = 1; i < data.length; i++) {
      if (data[i][keyIdx] === txData.Idempotency_Key) {
        return createJsonResponse({ success: true, message: 'Transaction already exists' });
      }
    }
  }

  const id = Utilities.getUuid();
  const now = new Date().toISOString();

  // If TRANSFER, handle balances (in Phase 2 we will update Account balances in sheets)
  // For now, we just record the transaction.
  
  sheet.appendRow([
    id,
    txData.Transaction_Date || now,
    txData.Transaction_Type || 'EXPENSE',
    txData.Status || 'POSTED',
    txData.Account_From || '',
    txData.Account_To || '',
    txData.Category_ID || '',
    txData.Amount_Original || 0,
    txData.Currency || 'VND',
    txData.Exchange_Rate || 1,
    txData.Amount_VND || 0,
    txData.Goal_ID || '',
    txData.Investment_ID || '',
    txData.Debt_ID || '',
    txData.Recurring_ID || '',
    txData.Description || '',
    txData.Merchant || '',
    txData.Privacy_Tag || 'FAMILY',
    txData.Owner_User_ID || '',
    txData.Created_By || '',
    txData.Source || 'Web App',
    txData.Drive_URL || '',
    txData.Idempotency_Key || Utilities.getUuid(),
    now,
    now
  ]);

  return createJsonResponse({ success: true, data: { id }, message: 'Transaction created' });
}

function handleUpdateTransaction(transactionId, updates) {
  const sheet = getOrCreateSheet('Transactions', []);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('Transaction_ID');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === transactionId) {
      Object.keys(updates).forEach(key => {
        const colIdx = headers.indexOf(key);
        if (colIdx >= 0) {
          sheet.getRange(i + 1, colIdx + 1).setValue(updates[key]);
        }
      });
      sheet.getRange(i + 1, headers.indexOf('Updated_At') + 1).setValue(new Date().toISOString());
      return createJsonResponse({ success: true, message: 'Transaction updated' });
    }
  }
  return createJsonResponse({ success: false, message: 'Transaction not found' });
}

function handleDeleteTransaction(transactionId) {
  const sheet = getOrCreateSheet('Transactions', []);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('Transaction_ID');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === transactionId) {
      // Soft delete: Change Status to VOID
      const statusIdx = headers.indexOf('Status');
      if (statusIdx >= 0) {
         sheet.getRange(i + 1, statusIdx + 1).setValue('VOID');
         return createJsonResponse({ success: true, message: 'Transaction voided' });
      }
    }
  }
  return createJsonResponse({ success: false, message: 'Transaction not found' });
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
  const sheet = getOrCreateSheet('Goals', ['Goal_ID', 'Goal_Name', 'TargetAmount', 'CurrentAmount', 'Type', 'AllocatedPercentage']);
  return createJsonResponse({ success: true, message: 'Goals saved (Mocked for Phase 1)' });
}
function handleSaveInvestments(investmentsArray) {
  const sheet = getOrCreateSheet('Investments', ['ID', 'Name', 'Type', 'ExpectedYield']);
  return createJsonResponse({ success: true, message: 'Investments saved (Mocked)' });
}
