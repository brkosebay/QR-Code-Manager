# Migration Summary: Google Forms/Sheets → Microsoft Forms/Excel

## Overview

This document provides a quick summary of the migration from Google Forms/Sheets to Microsoft Forms/Excel on OneDrive.

## What Changed

### Code Changes

1. **New Service File**: `backend/src/utils/microsoftExcelService.js`
   - Replaces `googleSheetService.js`
   - Uses Microsoft Graph API instead of Google Sheets API
   - Implements same functionality: read Excel data, hash emails, match identifiers

2. **Updated Routes**: `backend/src/routes/respondentRoutes.js`
   - Changed import from `googleSheetService` to `microsoftExcelService`
   - Updated function calls:
     - `authenticateSheetsAPI()` → `authenticateGraphAPI()`
     - `readSheetAndProcessResponses()` → `readExcelAndProcessResponses()`

3. **Updated Configuration**: `backend/.env.example`
   - Removed: `GOOGLE_APPLICATION_CREDENTIALS`, `SPREADSHEET_ID`, `SPREADSHEET_RANGE`
   - Added:
     - `AZURE_TENANT_ID` - Azure AD tenant ID
     - `AZURE_CLIENT_ID` - Azure AD application ID
     - `AZURE_CLIENT_SECRET` - Azure AD client secret
     - `EXCEL_FILE_ITEM_ID` - OneDrive file identifier
     - `EXCEL_WORKSHEET_NAME` - Excel worksheet name
     - `EXCEL_RANGE` - Email column range

4. **New Dependencies**: `backend/package.json`
   - Added: `@microsoft/microsoft-graph-client`, `@azure/identity`, `isomorphic-fetch`
   - Removed: None (googleapis kept for backward compatibility)

### Architecture Changes

**Before:**
```
Google Form → Google Sheet → Google Sheets API → Backend → MongoDB
```

**After:**
```
Microsoft Form → Excel (OneDrive) → Microsoft Graph API → Backend → MongoDB
                       ↑
               Power Automate
```

## Key Differences

| Aspect | Google | Microsoft |
|--------|--------|-----------|
| **Forms Platform** | Google Forms | Microsoft Forms |
| **Storage** | Google Sheets | Excel on OneDrive for Business |
| **API** | Google Sheets API v4 | Microsoft Graph API v1.0 |
| **Authentication** | Service Account (JWT) | Azure AD App Registration (Client Credentials) |
| **Credentials** | JSON key file | Tenant ID, Client ID, Client Secret |
| **Auto-export** | Native | Power Automate Flow |
| **Permissions** | Service account email sharing | Azure AD API permissions (Files.Read.All) |
| **Scope** | `https://www.googleapis.com/auth/spreadsheets` | `https://graph.microsoft.com/.default` |

## File Structure

```
QR-Code-Manager/
├── backend/
│   ├── src/
│   │   ├── utils/
│   │   │   ├── googleSheetService.js (DEPRECATED - kept for rollback)
│   │   │   └── microsoftExcelService.js (NEW)
│   │   └── routes/
│   │       └── respondentRoutes.js (UPDATED)
│   ├── .env.example (UPDATED)
│   └── package.json (UPDATED)
├── MICROSOFT_MIGRATION_GUIDE.md (NEW)
└── MIGRATION_SUMMARY.md (NEW - this file)
```

## API Endpoint Comparison

### Google Sheets API
```javascript
// Endpoint
GET https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}

// Authentication
const client = new google.auth.JWT(
  keyFile.client_email,
  null,
  keyFile.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
);

// Read operation
const response = await sheets.spreadsheets.values.get({
  spreadsheetId,
  range,
});
const rows = response.data.values;
```

### Microsoft Graph API
```javascript
// Endpoint
GET https://graph.microsoft.com/v1.0/me/drive/items/{item-id}/workbook/worksheets/{worksheet}/range(address='{range}')

// Authentication
const credential = new ClientSecretCredential(
  tenantId,
  clientId,
  clientSecret
);
const client = Client.initWithMiddleware({...});

// Read operation
const response = await client.api(endpoint).get();
const rows = response.values;
```

## Environment Variables Mapping

| Google | Microsoft |
|--------|-----------|
| `GOOGLE_APPLICATION_CREDENTIALS` | `AZURE_TENANT_ID` + `AZURE_CLIENT_ID` + `AZURE_CLIENT_SECRET` |
| `SPREADSHEET_ID` | `EXCEL_FILE_ITEM_ID` |
| `SPREADSHEET_RANGE` | `EXCEL_RANGE` + `EXCEL_WORKSHEET_NAME` |

## Setup Requirements

### Google (Before)
1. Create Google Cloud Project
2. Enable Google Sheets API
3. Create Service Account
4. Download JSON key file
5. Share Google Sheet with service account email

### Microsoft (After)
1. Create Azure AD App Registration
2. Generate Client Secret
3. Grant API permissions (Files.Read.All)
4. Admin consent for permissions
5. Create Excel file on OneDrive for Business
6. Set up Power Automate flow
7. Get Drive Item ID via Graph Explorer

## Functionality Preserved

All core functionality remains identical:
- ✅ Read email addresses from spreadsheet
- ✅ Generate SHA-256 hashes of emails
- ✅ Compare hashes with respondent identifiers
- ✅ Handle case-insensitive first letter matching
- ✅ Update MongoDB when match is found
- ✅ Support for empty rows/cells
- ✅ Error handling and logging

## Testing Checklist

- [ ] Azure AD authentication works
- [ ] Microsoft Graph API can access Excel file
- [ ] Email range is read correctly from Excel
- [ ] Email hashing produces correct results
- [ ] Case-insensitive matching works
- [ ] MongoDB updates correctly on match
- [ ] Error messages are clear and helpful
- [ ] Power Automate flow exports form responses
- [ ] QR code validation returns correct responses

## Rollback Procedure

If needed, revert to Google implementation:

1. Restore `googleSheetService.js` import in `respondentRoutes.js`
2. Update `.env` with Google credentials
3. Ensure `googleapis` package is installed
4. Restart backend service

## Performance Considerations

- **Microsoft Graph API** has rate limits (typically sufficient for this use case)
- **Power Automate** may have a small delay (usually < 10 seconds) between form submission and Excel update
- **Excel file size** should be kept reasonable (< 5MB recommended) for optimal performance
- **Caching** may be beneficial for high-traffic scenarios

## Security Notes

- **Client Secret**: Store securely, rotate every 90 days
- **API Permissions**: Use least privilege (Files.Read.All is sufficient)
- **Environment Variables**: Never commit to version control
- **OneDrive**: Ensure proper file permissions

## Next Steps

1. Follow the detailed setup instructions in `MICROSOFT_MIGRATION_GUIDE.md`
2. Set up Azure AD App Registration
3. Configure environment variables
4. Create Power Automate flow
5. Test thoroughly before deploying to production
6. Update any deployment scripts or documentation
7. Train team members on new Microsoft-based workflow

## Support

For detailed step-by-step instructions, see: `MICROSOFT_MIGRATION_GUIDE.md`

For API reference, see:
- [Microsoft Graph API Docs](https://learn.microsoft.com/en-us/graph/api/overview)
- [Excel API Reference](https://learn.microsoft.com/en-us/graph/api/resources/excel)

---

**Migration Date**: 2025-01-11
**Prepared by**: Claude
**Status**: Ready for testing
