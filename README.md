# QR-Code-Manager

## Overview
QR-Code-Manager generates mug-specific QR codes, delivers them via email, and then lets recipients claim gifts by scanning the QR and verifying their Microsoft Forms submission.

## Current Flow
- **Form**: Microsoft Forms collects employee responses and automatically syncs them to the linked Excel workbook in OneDrive for Business / SharePoint. Keep the workbook open in Excel for the web at least briefly so syncs can replay.
- **Storage**: The synced workbook acts as the canonical source of truth for completed submissions; the backend reads the “Email” column via Microsoft Graph instead of trying to call Forms directly.
- **Backend**: Node.js (Express) hashes email addresses from the workbook (`sha256`) and compares them to the identifiers stored in MongoDB. When a match occurs, the respondent record flips `hasCompletedSurvey` and `hasReceivedGift`.
- **Frontend**: Electron UI wraps Docker Compose controls, so operators can rebuild containers, restart the API, and wipe/regenerate the database.

## Technologies Used
- Languages: JavaScript
- Frameworks/Libraries: Express.js, Electron, MongoDB, Microsoft Graph API
- Tools: Docker Compose

## Setup Notes
1. **Azure AD App Registration (form owner account)** – from the Microsoft 365 tenant with access to the form workbook:
   - Register a new app in Azure AD (`https://portal.azure.com` → Azure Active Directory → App registrations → + New registration).
   - Record the **Application (client) ID** and **Directory (tenant) ID** (these become `AZURE_CLIENT_ID` and `AZURE_TENANT_ID`).
   - Under *Certificates & secrets*, create a client secret and save its **value** as `AZURE_CLIENT_SECRET`.
   - Under *API permissions*, add **Application** permissions `Files.Read.All` (or `Sites.Read.All` if you need SharePoint drives), then click **Grant admin consent**.
2. **Share the workbook** – make sure the Azure app can access the Excel file:
   - If the workbook lives in a user’s OneDrive, note that user principal name and set `EXCEL_OWNER_UPN`.
   - Optionally, if the workbook is on a SharePoint/Shared drive, populate `EXCEL_DRIVE_ID` instead.
3. **Find the Excel file details** – use Microsoft Graph Explorer or PowerShell to retrieve the Drive Item ID (`EXCEL_FILE_ITEM_ID`) for the synced workbook and set the worksheet name/range where the “Email” column lives (`EXCEL_WORKSHEET_NAME`, `EXCEL_RANGE`.)
4. **Environment variables** – create a `.env` next to `backend/.env.example` and populate:
   ```
   MONGODB_URI="mongodb://mongodb:27017/QRCodeSystem"
   CSV_LOCATION="/usr/src/app/config/exampleList.csv"
   HOSTNAME="example-host.local"
   AZURE_TENANT_ID="..."
   AZURE_CLIENT_ID="..."
   AZURE_CLIENT_SECRET="..."
   EXCEL_FILE_ITEM_ID="..."
   EXCEL_WORKSHEET_NAME="Sheet1"
   EXCEL_RANGE="D2:D"
   EXCEL_OWNER_UPN="form.owner@tenant.onmicrosoft.com"
   ```

## Validation Flow
1. Run `docker-compose up -d` via the Electron frontend (or run `npm start` inside `backend/`).
2. Submit a Microsoft Form response; ensure the Excel workbook has been opened in Excel for the web so the sync can replay and the “Email” column is populated.
3. Call `GET http://<host>:3000/validate/{token}` (the `token` was issued when the respondent was created). The backend hashes the workbook’s emails, finds the match, toggles `hasCompletedSurvey`, and serves a green/invalid message.
4. Check MongoDB: verify `hasCompletedSurvey` becomes true and `hasReceivedGift` toggles on the next validation.

## What You Need Before Testing
- The form owner account must provide the Azure AD credentials (tenant ID, client ID, secret) as described above.
- The owner’s Graph path info (`EXCEL_OWNER_UPN` or `EXCEL_DRIVE_ID`, plus the drive item ID) must be available before the backend can read the workbook.
- The workbook must remain accessible to the app (the form owner can keep it in their OneDrive or a SharePoint library and share accordingly).

## Next Steps
1. Follow `MICROSOFT_MIGRATION_GUIDE.md` to configure Power Automate or rely on the workbook sync (the guide already explains the export and testing plan).
2. Call `/validate/:token` after you submit a form to confirm Graph can read the synced Excel rows and set the gift status.
3. Update the README or onboarding scripts if the backend or deployment environment changes (e.g., new hostnames or port mappings).
