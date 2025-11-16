# Microsoft Forms and Excel Migration Guide

This guide walks you through migrating from Google Forms/Sheets to Microsoft Forms/Excel on OneDrive for Business.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Create Azure AD App Registration](#step-1-create-azure-ad-app-registration)
4. [Step 2: Create Microsoft Form](#step-2-create-microsoft-form)
5. [Step 3: Create Excel Workbook on OneDrive](#step-3-create-excel-workbook-on-onedrive)
6. [Step 4: Set Up Power Automate Flow](#step-4-set-up-power-automate-flow)
7. [Step 5: Get Excel File Drive Item ID](#step-5-get-excel-file-drive-item-id)
8. [Step 6: Configure Environment Variables](#step-6-configure-environment-variables)
9. [Step 7: Test the Integration](#step-7-test-the-integration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Architecture Change

**Before (Google):**
```
Google Form → Google Sheet → Google Sheets API → Node.js Backend → MongoDB
```

**After (Microsoft):**
```
Microsoft Form → Excel (OneDrive) → Microsoft Graph API → Node.js Backend → MongoDB
                      ↑
              Power Automate (auto-export)
```

### Key Differences

- **Authentication**: Switched from Google Service Account to Azure AD App Registration
- **API**: Microsoft Graph API replaces Google Sheets API
- **Auto-export**: Power Automate handles automatic form response export to Excel
- **Permissions**: Uses delegated or application permissions in Azure AD

---

## Prerequisites

- **Microsoft 365 Business Account** (OneDrive Personal/Consumer is NOT supported)
- **Azure AD Access** (to create App Registration)
- **Power Automate License** (typically included with Microsoft 365 Business)
- **Admin Permissions** (to grant API permissions in Azure AD)

---

## Step 1: Create Azure AD App Registration

### 1.1 Navigate to Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Sign in with your Microsoft 365 Business account
3. Navigate to **Azure Active Directory** (or search for "Azure Active Directory")

### 1.2 Create App Registration

1. In the left sidebar, click **App registrations**
2. Click **+ New registration**
3. Fill in the details:
   - **Name**: `QR-Code-Manager` (or your preferred name)
   - **Supported account types**: Select "Accounts in this organizational directory only"
   - **Redirect URI**: Leave blank (not needed for backend service)
4. Click **Register**

### 1.3 Note Your Credentials

After registration, you'll see the **Overview** page. Note these values:

- **Application (client) ID**: Copy this (you'll use it as `AZURE_CLIENT_ID`)
- **Directory (tenant) ID**: Copy this (you'll use it as `AZURE_TENANT_ID`)

### 1.4 Create Client Secret

1. In the left sidebar, click **Certificates & secrets**
2. Click **+ New client secret**
3. Add a description: `QR-Code-Manager Backend Secret`
4. Choose expiration: Select your preferred expiration (90 days, 1 year, 2 years, or custom)
5. Click **Add**
6. **IMPORTANT**: Copy the **Value** immediately (you'll use it as `AZURE_CLIENT_SECRET`)
   - This value is only shown once and cannot be retrieved later
   - If you lose it, you'll need to create a new secret

### 1.5 Grant API Permissions

1. In the left sidebar, click **API permissions**
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Select **Application permissions** (for backend service)
5. Search for and select these permissions:
   - `Files.Read.All` - Read files in all site collections
   - **OR** `Sites.Read.All` - Read items in all site collections (if using SharePoint)
6. Click **Add permissions**
7. **IMPORTANT**: Click **Grant admin consent for [Your Organization]**
   - This requires admin privileges
   - Without this, the API calls will fail with 403 Forbidden

### 1.6 Verify Permissions

After granting consent, you should see:
- Permission: `Files.Read.All` or `Sites.Read.All`
- Type: `Application`
- Status: ✅ **Granted for [Your Organization]**

---

## Step 2: Create Microsoft Form

### 2.1 Create Form

1. Go to [Microsoft Forms](https://forms.office.com)
2. Click **+ New Form**
3. Add a title and description for your form
4. Add questions to your form
5. **IMPORTANT**: Make sure to include a question that collects **email addresses**
   - Type: **Text** or **Email** question type
   - Mark it as **Required**

### 2.2 Enable Response Collection

1. Click **Settings** (gear icon)
2. Under **Who can fill out this form**, select your preferred option:
   - **Anyone can respond** (if you want anonymous responses)
   - **Only people in my organization** (recommended for better security)
3. Enable **Record name** if you want to track respondent names
4. Click **Save**

### 2.3 Share Your Form

1. Click **Share** button
2. Copy the form link or generate QR code
3. Share with your respondents

---

## Step 3: Create Excel Workbook on OneDrive

### 3.1 Create Excel File

1. Go to [OneDrive for Business](https://onedrive.live.com)
2. Click **+ New** → **Excel workbook**
3. Name it something descriptive, e.g., `Form_Responses.xlsx`
4. Open the file

### 3.2 Set Up Excel Table

1. Create headers in the first row (e.g., `Timestamp`, `Name`, `Email`, etc.)
2. Select the header row (row 1)
3. Click **Home** → **Format as Table**
4. Choose any table style
5. Ensure **My table has headers** is checked
6. Click **OK**
7. **IMPORTANT**: Note the **Table Name** (default is `Table1`)
   - You can rename it by clicking the table and going to **Table Design** → **Table Name**

### 3.3 Save and Close

1. Save the Excel file
2. Keep the file in OneDrive (do NOT move it to local storage)

---

## Step 4: Set Up Power Automate Flow

Power Automate will automatically export Microsoft Forms responses to your Excel file.

### 4.1 Create Flow

1. Go to [Power Automate](https://flow.microsoft.com)
2. Click **+ Create** in the left sidebar
3. Select **Automated cloud flow**
4. Name your flow: `Export Microsoft Form to Excel`
5. Search for and select trigger: **When a new response is submitted** (Microsoft Forms)
6. Click **Create**

### 4.2 Configure Trigger

1. **Form Id**: Select your form from the dropdown
   - If you don't see your form, try clicking **See more** or **Enter custom value**

### 4.3 Add "Get Response Details" Action

1. Click **+ New step**
2. Search for **Get response details** (Microsoft Forms)
3. Select it
4. Configure:
   - **Form Id**: Select the same form as before
   - **Response Id**: Click in the field and select **Response Id** from the dynamic content

### 4.4 Add "Add a Row into a Table" Action

1. Click **+ New step**
2. Search for **Add a row into a table** (Excel Online - Business)
3. Select it
4. Configure:
   - **Location**: Select **OneDrive for Business**
   - **Document Library**: Select **OneDrive**
   - **File**: Click the folder icon and navigate to your Excel file
   - **Table**: Select your table (e.g., `Table1`)
   - **Map Columns**: For each column in your Excel table, map the corresponding field from the form response using dynamic content

### 4.5 Example Column Mapping

If your Excel table has these columns:
- **Timestamp** → Select **Submission time** from dynamic content
- **Name** → Select the name question response
- **Email** → Select the email question response

### 4.6 Save and Test

1. Click **Save** in the top right
2. Click **Test** → **Manually**
3. Submit a test response in your Microsoft Form
4. Check if the flow runs successfully and the data appears in Excel

---

## Step 5: Get Excel File Drive Item ID

The Drive Item ID is a unique identifier for your Excel file in OneDrive. You need this to access the file via Microsoft Graph API.

### Method 1: Using Microsoft Graph Explorer (Recommended)

1. Go to [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. Click **Sign in to Graph Explorer**
3. Sign in with your Microsoft 365 account
4. Grant the requested permissions (Files.Read, Files.Read.All)
5. In the request bar, enter this endpoint:
   ```
   GET https://graph.microsoft.com/v1.0/me/drive/root/children
   ```
6. Click **Run query**
7. In the response, find your Excel file by name
8. Copy the **id** field value (this is your `EXCEL_FILE_ITEM_ID`)

Example response:
```json
{
  "id": "01BYE5RZ6QN3ZWBTUFOFD3GSPGOHDJD36K",  ← This is your Drive Item ID
  "name": "Form_Responses.xlsx",
  "size": 12345,
  ...
}
```

### Method 2: Using File URL

1. Open OneDrive and right-click your Excel file
2. Select **Share** → **Copy Link**
3. The URL will look like:
   ```
   https://[tenant].sharepoint.com/:x:/r/personal/[user]/_layouts/15/Doc.aspx?sourcedoc={GUID}&file=Form_Responses.xlsx
   ```
4. The `sourcedoc={GUID}` part contains the file ID
5. You may need to URL-decode the GUID
6. **Note**: This method is less reliable; use Method 1 if possible

### Method 3: Using PowerShell

```powershell
Connect-MgGraph -Scopes "Files.Read"
Get-MgUserDriveItem -UserId "[your-email]@[domain].com" -Filter "name eq 'Form_Responses.xlsx'"
```

---

## Step 6: Configure Environment Variables

### 6.1 Update .env File

Create or update your `.env` file in the `backend/` directory:

```env
# MongoDB (unchanged)
MONGODB_URI="mongodb://mongodb:27017/QRCodeSystem"

# Parameters to modify:
CSV_LOCATION="/usr/src/app/config/exampleList.csv"
HOSTNAME="Example-Hostname.local"

# Microsoft Azure AD App Registration credentials
AZURE_TENANT_ID="your-tenant-id-from-step-1.3"
AZURE_CLIENT_ID="your-client-id-from-step-1.3"
AZURE_CLIENT_SECRET="your-client-secret-from-step-1.4"

# Microsoft Excel on OneDrive configuration
EXCEL_FILE_ITEM_ID="your-drive-item-id-from-step-5"
EXCEL_WORKSHEET_NAME="Sheet1"
EXCEL_RANGE="D2:D"
```

### 6.2 Adjust Excel Range

The `EXCEL_RANGE` should match the column containing email addresses in your Excel file.

**Examples:**
- `"A2:A"` - Column A, starting from row 2 to the last row
- `"D2:D"` - Column D, starting from row 2 to the last row
- `"C2:C100"` - Column C, rows 2 to 100 (fixed range)

**Important Notes:**
- Row 1 is usually the header row, so start from row 2
- Use open-ended ranges (e.g., `D2:D`) to automatically include new rows

### 6.3 Verify Worksheet Name

If your Excel file uses a worksheet name other than "Sheet1":

1. Open your Excel file in Excel Online or desktop app
2. Look at the worksheet tab at the bottom
3. Update `EXCEL_WORKSHEET_NAME` in `.env` accordingly

---

## Step 7: Test the Integration

### 7.1 Start the Backend

```bash
cd /home/user/QR-Code-Manager/backend
npm start
```

### 7.2 Submit a Test Form Response

1. Open your Microsoft Form
2. Fill out the form with a test email address
3. Submit the form
4. Wait a few seconds for Power Automate to run
5. Check your Excel file to verify the response was added

### 7.3 Test QR Code Validation

1. Find a respondent token in your MongoDB database
2. Make a GET request to the validation endpoint:
   ```bash
   curl http://localhost:3000/api/respondents/validate/{token}
   ```
3. Check the response:
   - **Green page**: "Participant is eligible for the gift" ✅
   - **Red page**: "Participant has not filled in the survey" ❌
   - **Red page**: "Participant has already received gift" (if already validated)

### 7.4 Check Logs

Monitor the console output for any errors:
- Authentication errors → Check Azure AD credentials
- 404 errors → Check `EXCEL_FILE_ITEM_ID` and `EXCEL_WORKSHEET_NAME`
- 403 errors → Ensure API permissions are granted in Azure AD

---

## Troubleshooting

### Authentication Errors (401)

**Error**: `Authentication failed`

**Solutions:**
1. Verify your Azure AD credentials in `.env`:
   - `AZURE_TENANT_ID`
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
2. Check that the client secret hasn't expired in Azure Portal
3. Regenerate a new client secret if needed

### Access Denied (403)

**Error**: `Access denied. Please ensure your Azure AD app has the required permissions`

**Solutions:**
1. Go to Azure Portal → App registrations → Your app → API permissions
2. Ensure `Files.Read.All` or `Sites.Read.All` is listed
3. Check that **Admin consent** has been granted (green checkmark)
4. If not, click **Grant admin consent for [Your Organization]**
5. Wait a few minutes for permissions to propagate

### File Not Found (404)

**Error**: `File or worksheet not found`

**Solutions:**
1. Verify `EXCEL_FILE_ITEM_ID` is correct:
   - Use Microsoft Graph Explorer to get the correct ID
   - Ensure you're using the file ID, not the SharePoint document ID
2. Verify `EXCEL_WORKSHEET_NAME` matches the actual worksheet name:
   - Open Excel file and check the worksheet tab name (case-sensitive)
3. Ensure the file is in **OneDrive for Business**, not OneDrive Personal

### Excel Range Issues

**Error**: No data returned or incorrect data

**Solutions:**
1. Verify `EXCEL_RANGE` matches your email column:
   - Open Excel and check which column contains emails
   - Ensure range starts from row 2 (row 1 is header)
2. Use open-ended ranges like `D2:D` instead of fixed ranges
3. Ensure the Excel table has been formatted as a table (not just a range)

### Power Automate Flow Not Running

**Solutions:**
1. Go to [Power Automate](https://flow.microsoft.com) → **My flows**
2. Check if the flow is **On** (toggle switch)
3. Click the flow and check **28-day run history** for errors
4. Test the flow manually by submitting a form response
5. Check if the form ID is correct in the trigger
6. Ensure column mapping is correct in the "Add a row" action

### Network/Timeout Errors

**Solutions:**
1. Check your internet connection
2. Verify Microsoft Graph API is not experiencing outages:
   - Check [Microsoft 365 Status](https://status.office365.com)
3. Increase timeout in your Node.js application if needed

### Email Matching Issues

**Error**: Emails not matching even though they exist in Excel

**Solutions:**
1. Check for extra whitespace in Excel emails:
   - Use Excel's TRIM function: `=TRIM(A2)`
2. Verify email case matches:
   - The system handles first-letter case differences
   - But check for other case discrepancies
3. Check hash generation:
   - Ensure emails are being hashed consistently
4. Test with the exact email format used in the CSV file

---

## Additional Notes

### Differences from Google Implementation

| Feature | Google | Microsoft |
|---------|--------|-----------|
| **Forms** | Google Forms | Microsoft Forms |
| **Spreadsheet** | Google Sheets | Excel on OneDrive |
| **API** | Google Sheets API | Microsoft Graph API |
| **Auth** | Service Account (JWT) | Azure AD App (Client Credentials) |
| **Auto-export** | Native | Power Automate |
| **Permissions** | Service Account Email | Azure AD App Permissions |

### Security Considerations

1. **Client Secret**: Store securely, rotate regularly (recommended: every 90 days)
2. **Permissions**: Use least privilege (Files.Read.All is sufficient)
3. **Environment Variables**: Never commit `.env` to version control
4. **OneDrive**: Ensure Excel file has appropriate sharing permissions

### Cost Considerations

- **Azure AD**: Free tier sufficient for this use case
- **Microsoft Graph API**: No additional cost for standard operations
- **Power Automate**: Included with Microsoft 365 Business subscriptions
- **OneDrive**: Ensure you have sufficient storage (typically 1TB+ per user)

### Performance Notes

- **API Rate Limits**: Microsoft Graph has throttling limits (vary by license)
- **Excel File Size**: Keep Excel files under 5MB for optimal performance
- **Caching**: Consider implementing caching for frequently accessed data
- **Batch Operations**: For high-volume scenarios, consider batch API calls

---

## Migration Checklist

- [ ] Azure AD App Registration created
- [ ] Client ID, Tenant ID, and Client Secret obtained
- [ ] API permissions granted and admin consent provided
- [ ] Microsoft Form created with email field
- [ ] Excel workbook created on OneDrive for Business
- [ ] Excel data formatted as Table
- [ ] Power Automate flow created and tested
- [ ] Excel file Drive Item ID obtained
- [ ] `.env` file updated with all credentials
- [ ] Backend dependencies installed (`npm install`)
- [ ] Backend tested and working
- [ ] QR code validation tested successfully
- [ ] Old Google credentials removed or commented out
- [ ] Documentation updated for team

---

## Support and Resources

- [Microsoft Graph API Documentation](https://learn.microsoft.com/en-us/graph/api/overview)
- [Excel API Reference](https://learn.microsoft.com/en-us/graph/api/resources/excel)
- [Power Automate Documentation](https://learn.microsoft.com/en-us/power-automate/)
- [Azure AD App Registration Guide](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Microsoft Forms Documentation](https://support.microsoft.com/en-us/forms)

---

## Rollback Plan

If you need to revert to Google Forms/Sheets:

1. Restore the original `googleSheetService.js` file
2. Update `respondentRoutes.js` to use Google service:
   ```javascript
   const { readSheetAndProcessResponses, authenticateSheetsAPI } = require('../utils/googleSheetService');
   ```
3. Restore Google credentials in `.env`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS="/usr/src/app/config/example_api_credentials.json"
   SPREADSHEET_ID="spreadsheet_id_from_google_sheets"
   SPREADSHEET_RANGE="Form Answers 1!D2:D"
   ```
4. Reinstall Google API packages:
   ```bash
   npm install googleapis
   ```
5. Restart the backend

---

**Last Updated**: 2025-01-11
**Version**: 1.0.0
