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

    if (action === 'getGoals') {
      const goals = getSheetData('Goals');
      const filtered = goals.filter(g => canView(g, userId, role));
      return createJsonResponse({ success: true, data: filtered });
    }
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
      case 'create_account':
        return handleCreateAccount(data);
      case 'create_transaction':
        return handleCreateTransaction(data);
      case 'update_transaction':
        return handleUpdateTransaction(data.transactionId, data.updates);
      case 'delete_transaction':
        return handleDeleteTransaction(data.transactionId);
      case 'create_goal':
        return handleCreateGoal(data);
      case 'update_goal':
        return handleUpdateGoal(data.goalId, data.updates);
      case 'delete_goal':
        return handleDeleteGoal(data.goalId);
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
  const user = users.find(u => 
    String(u.Username || u.User_ID).trim() === String(username).trim() && 
    String(u.Password).trim() === String(password).trim()
  );
  
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
  
  const headers = sheet.getDataRange().getValues()[0];
  const rowData = new Array(headers.length).fill('');
  
  const mapData = {
    'Transaction_ID': id,
    'Transaction_Date': txData.Transaction_Date || now,
    'Transaction_Type': txData.Transaction_Type || 'EXPENSE',
    'Amount_Original': txData.Amount_Original || 0,
    'Currency': txData.Currency || 'VND',
    'Exchange_Rate': txData.Exchange_Rate || 1,
    'Amount_VND': txData.Amount_VND || 0,
    'Category_ID': txData.Category_ID || '',
    'Account_From': txData.Account_From || '',
    'Account_To': txData.Account_To || '',
    'Description': txData.Description || '',
    'Privacy_Tag': txData.Privacy_Tag || 'FAMILY',
    'Owner_User_ID': txData.Owner_User_ID || '',
    'Created_By': txData.Created_By || '',
    'Created_At': now,
    'Updated_At': now,
    'Status': txData.Status || 'POSTED',
    'Goal_From': txData.Goal_From || '',
    'Goal_To': txData.Goal_To || ''
  };

  for (let i = 0; i < headers.length; i++) {
    const colName = headers[i];
    if (mapData[colName] !== undefined) {
      rowData[i] = mapData[colName];
    }
  }

  sheet.appendRow(rowData);

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
      const statusIdx = headers.indexOf('Status');
      if (statusIdx >= 0) {
         sheet.getRange(i + 1, statusIdx + 1).setValue('VOID');
      } else {
         sheet.deleteRow(i + 1);
      }
      return createJsonResponse({ success: true, message: 'Transaction deleted' });
    }
  }
  return createJsonResponse({ success: false, message: 'Transaction not found' });
}


function handleCreateAccount(accData) {
  const sheet = getOrCreateSheet('Accounts', [
    'Account_ID', 'Account_Name', 'Account_Type', 'Owner_User_ID', 'Privacy_Tag', 
    'Currency', 'Current_Balance', 'Exchange_Rate', 'Is_Included_In_Net_Worth', 'Created_At'
  ]);
  
  const id = accData.Account_ID || Utilities.getUuid();
  const now = new Date().toISOString();
  
  const headers = sheet.getDataRange().getValues()[0];
  const rowData = new Array(headers.length).fill('');
  
  const mapData = {
    'Account_ID': id,
    'Account_Name': accData.Account_Name || '',
    'Account_Type': accData.Account_Type || 'CASH',
    'Owner_User_ID': accData.Owner_User_ID || '',
    'Privacy_Tag': accData.Privacy_Tag || 'FAMILY',
    'Currency': accData.Currency || 'VND',
    'Current_Balance': accData.Current_Balance || 0,
    'Exchange_Rate': accData.Exchange_Rate || 1,
    'Is_Included_In_Net_Worth': accData.Is_Included_In_Net_Worth !== undefined ? accData.Is_Included_In_Net_Worth : true,
    'Created_At': now
  };

  for (let i = 0; i < headers.length; i++) {
    const colName = headers[i];
    if (mapData[colName] !== undefined) {
      rowData[i] = mapData[colName];
    }
  }

  sheet.appendRow(rowData);
  return createJsonResponse({ success: true, data: { id }, message: 'Account created' });
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

function handleCreateGoal(goalData) {
  const sheet = getOrCreateSheet('Goals', ['Goal_ID', 'Goal_Name', 'Target_Amount', 'Current_Amount', 'Goal_Type', 'Allocated_Percentage', 'Owner_User_ID', 'Privacy_Tag']);
  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    goalData.Goal_Name || '',
    goalData.Target_Amount || 0,
    goalData.Current_Amount || 0,
    goalData.Goal_Type || goalData.Category || 'Savings',
    goalData.Allocated_Percentage || 0,
    goalData.Owner_User_ID || '',
    goalData.Privacy_Tag || 'FAMILY'
  ]);
  return createJsonResponse({ success: true, data: { id }, message: 'Goal created' });
}

function handleUpdateGoal(goalId, updates) {
  const sheet = getOrCreateSheet('Goals', []);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('Goal_ID');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === goalId) {
      Object.keys(updates).forEach(key => {
        const colIdx = headers.indexOf(key);
        if (colIdx >= 0) {
          sheet.getRange(i + 1, colIdx + 1).setValue(updates[key]);
        }
      });
      return createJsonResponse({ success: true, message: 'Goal updated' });
    }
  }
  return createJsonResponse({ success: false, message: 'Goal not found' });
}

function handleDeleteGoal(goalId) {
  const sheet = getOrCreateSheet('Goals', []);
  const data = sheet.getDataRange().getValues();
  const idIdx = data[0].indexOf('Goal_ID');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === goalId) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ success: true, message: 'Goal deleted' });
    }
  }
  return createJsonResponse({ success: false, message: 'Goal not found' });
}
function handleSaveInvestments(investmentsArray) {
  const sheet = getOrCreateSheet('Investments', ['ID', 'Name', 'Type', 'ExpectedYield']);
  return createJsonResponse({ success: true, message: 'Investments saved (Mocked)' });
}

function autoSetupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Users
  let usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) {
    usersSheet = ss.insertSheet('Users');
    usersSheet.appendRow(['User_ID', 'Username', 'Password', 'Role']);
    usersSheet.appendRow(['user_1', 'admin', '123456', 'ADMIN']);
    usersSheet.appendRow(['user_2', 'spouse', '123456', 'SPOUSE']);
  }
  
  // 2. Accounts
  let accSheet = ss.getSheetByName('Accounts');
  if (!accSheet) {
    accSheet = ss.insertSheet('Accounts');
    accSheet.appendRow(['Account_ID', 'Account_Name', 'Account_Type', 'Currency', 'Exchange_Rate', 'Current_Balance', 'Owner_User_ID', 'Privacy_Tag', 'Is_Included_In_Net_Worth']);
    accSheet.appendRow(['acc_1', 'Tiền mặt', 'CASH', 'VND', 1, 5000000, 'user_1', 'FAMILY', true]);
    accSheet.appendRow(['acc_2', 'Vietcombank của Vợ', 'BANK', 'VND', 1, 15000000, 'user_2', 'PERSONAL', true]);
  }

  // 3. Transactions
  let txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) {
    txSheet = ss.insertSheet('Transactions');
    txSheet.appendRow(['Transaction_ID', 'Transaction_Date', 'Transaction_Type', 'Amount_Original', 'Currency', 'Exchange_Rate', 'Amount_VND', 'Category_ID', 'Account_From', 'Account_To', 'Description', 'Privacy_Tag', 'Owner_User_ID', 'Created_By', 'Created_At', 'Updated_At', 'Goal_From', 'Goal_To']);
  } else {
    // Phase 2 Upgrade: ensure Goal_From and Goal_To exist
    const headers = txSheet.getDataRange().getValues()[0];
    if (headers.indexOf('Goal_From') === -1) {
      txSheet.getRange(1, headers.length + 1).setValue('Goal_From');
      txSheet.getRange(1, headers.length + 2).setValue('Goal_To');
    }
  }
  
  // 4. Goals (Phase 2)
  let goalsSheet = ss.getSheetByName('Goals');
  if (!goalsSheet) {
    goalsSheet = ss.insertSheet('Goals');
    goalsSheet.appendRow(['Goal_ID', 'Goal_Name', 'Target_Amount', 'Current_Amount', 'Goal_Type', 'Allocated_Percentage', 'Owner_User_ID', 'Privacy_Tag']);
    goalsSheet.appendRow(['goal_1', 'Chi tiêu thiết yếu', 0, 0, 'Needs', 50, 'user_1', 'FAMILY']);
    goalsSheet.appendRow(['goal_2', 'Chi tiêu linh hoạt', 0, 0, 'Wants', 30, 'user_1', 'FAMILY']);
    goalsSheet.appendRow(['goal_3', 'Tiết kiệm & Đầu tư', 0, 0, 'Savings', 20, 'user_1', 'FAMILY']);
  }
}
