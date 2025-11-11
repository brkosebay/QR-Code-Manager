# ReliefJet Mail Merge Workflow Guide

Complete guide for sending QR codes via email using ReliefJet Essentials for Outlook.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Complete Workflow](#complete-workflow)
4. [Step-by-Step Instructions](#step-by-step-instructions)
5. [ReliefJet GUI Method](#reliefjet-gui-method-recommended)
6. [ReliefJet CLI Method](#reliefjet-cli-method-advanced)
7. [Troubleshooting](#troubleshooting)
8. [Email Template Guidelines](#email-template-guidelines)

---

## Overview

This system generates unique QR codes for survey respondents and emails them. The workflow integrates with ReliefJet Essentials for Outlook to perform mail merge operations.

### Workflow Diagram

```
CSV with Emails → Database Rebuild → Generate QR Codes → Export CSV for ReliefJet → Mail Merge → Send Emails
```

**Key Features:**
- Batch email sending with personalized QR codes
- Each QR code is unique and tied to specific email addresses
- QR codes attached as PNG files to each email
- Validation URLs included for easy access

---

## Prerequisites

### Software Requirements

1. **Windows OS** (ReliefJet runs on Windows only)
2. **Microsoft Outlook** (configured with email account)
3. **ReliefJet Essentials for Outlook**
   - Professional Edition required for CLI (optional)
   - Standard Edition sufficient for GUI method
4. **Node.js** (already installed for backend)
5. **MongoDB** (running via Docker)

### Files Required

1. **Input CSV**: File with Email1 and Email2 columns (`backend/config/exampleList.csv`)
2. **Email Template**: Outlook template file (.oft format) with merge fields
3. **Environment Configuration**: `.env` file with proper settings

---

## Complete Workflow

### Phase 1: Database and QR Code Generation

This happens once when you're ready to create QR codes for all respondents.

1. Prepare your CSV file with email addresses
2. Run database rebuild script (generates QR codes)
3. Verify QR codes were created

### Phase 2: Export for ReliefJet

Generate a CSV file that ReliefJet can use for mail merge.

1. Run export script
2. Review generated CSV file
3. Check statistics for any issues

### Phase 3: Mail Merge and Sending

Use ReliefJet to send personalized emails with QR codes.

1. Create email template in Outlook
2. Configure ReliefJet mail merge
3. Test with one recipient
4. Send to all recipients

---

## Step-by-Step Instructions

### Step 1: Prepare Your CSV File

Your CSV file should have this structure:

```csv
Email1;Email2
john@example.com;john.doe@company.com
jane@example.com;
bob@example.com;bob.smith@company.com
```

**Format requirements:**
- Separator: semicolon (`;`)
- Columns: `Email1` and `Email2`
- `Email2` can be empty
- At least one email per row

**Location:** `backend/config/exampleList.csv`

### Step 2: Update Environment Variables

Ensure your `.env` file has the correct path:

```env
CSV_LOCATION="/usr/src/app/config/exampleList.csv"
HOSTNAME="your-hostname.local"
```

### Step 3: Generate QR Codes

Run the database rebuild script:

```bash
cd /home/user/QR-Code-Manager/backend
npm run rebuild
```

**What this does:**
- Clears existing database and QR codes
- Reads CSV file
- Creates database entries with hashed emails
- Generates QR code PNG files in `backend/src/utils/qr_codes/`
- Each QR code contains a unique validation URL

**Expected output:**
```
Database cleared
Added respondent for emails: john@example.com, john.doe@company.com
Added respondent for emails: jane@example.com
Added respondent for emails: bob@example.com, bob.smith@company.com
Database rebuild complete
```

**Verify QR codes:**
```bash
ls backend/src/utils/qr_codes/
```

You should see PNG files like:
```
john_example_com-john_doe_company_com-abc123.png
jane_example_com-def456.png
bob_example_com-bob_smith_company_com-ghi789.png
```

### Step 4: Export CSV for ReliefJet

Generate the mail merge CSV file:

```bash
npm run export-reliefjet
```

**What this does:**
- Reads original CSV file
- Matches emails with database entries
- Finds corresponding QR code files
- Creates `backend/reliefjet_mailmerge.csv` with:
  - Email1: Primary email address
  - Email2: Secondary email address
  - QRCodePath: Full path to QR code PNG file
  - Token: Unique identifier
  - ValidationURL: Direct link to validation page

**Expected output:**
```
============================================================
CSV EXPORT COMPLETED SUCCESSFULLY
============================================================
Output file: /home/user/QR-Code-Manager/backend/reliefjet_mailmerge.csv

Statistics:
  ✓ Successfully matched: 50
  ✗ Not matched in database: 0
  ✗ Missing QR code: 0
  Total rows in output: 50 (excluding header)
```

**Generated CSV format:**
```csv
Email1;Email2;QRCodePath;Token;ValidationURL
john@example.com;john.doe@company.com;C:\...\qr_codes\john_example_com-abc123.png;abc123;http://hostname:3000/validate/abc123
jane@example.com;;C:\...\qr_codes\jane_example_com-def456.png;def456;http://hostname:3000/validate/def456
```

### Step 5: Create Email Template

Create a template in Microsoft Outlook:

1. Open Outlook
2. Click **New Email**
3. Compose your email with merge fields:

```
Subject: Your Survey QR Code

Dear Participant,

Thank you for participating in our survey. Please find your unique QR code attached to this email.

Your validation URL: <<ValidationURL>>

Instructions:
1. Save the attached QR code image
2. Present this QR code when claiming your gift
3. Each QR code is unique and can only be used once

Best regards,
Survey Team
```

4. Click **File** → **Save As**
5. Choose **Outlook Template (*.oft)** format
6. Save as `email_template.oft` in the `backend` folder

**Available merge fields:**
- `<<Email1>>` - Primary email
- `<<Email2>>` - Secondary email
- `<<Token>>` - Unique token
- `<<ValidationURL>>` - Direct validation link
- `<<QRCodePath>>` - File path (for attachment, don't include in body)

---

## ReliefJet GUI Method (Recommended)

This is the easiest method and works with any edition of ReliefJet.

### Step 1: Open ReliefJet Essentials

1. Open Microsoft Outlook
2. Click on the **ReliefJet** tab in the ribbon
3. Find and click **Mail Merge** utility

### Step 2: Configure Data Source

1. In ReliefJet Mail Merge dialog:
2. Click **Browse** next to Data Source
3. Navigate to: `backend/reliefjet_mailmerge.csv`
4. Select the file and click **Open**
5. Verify that ReliefJet detects the columns:
   - Email1
   - Email2
   - QRCodePath
   - Token
   - ValidationURL

### Step 3: Configure Email Template

1. Click **Browse** next to Template
2. Select your `email_template.oft` file
3. Click **Open**

### Step 4: Map Fields

1. **Recipient Address**: Select `Email1`
2. **Attachment Field**: Select `QRCodePath`
3. Verify merge fields in template match CSV columns

### Step 5: Preview

1. Click **Preview** button
2. Review the first email to ensure:
   - QR code is attached
   - Merge fields are populated correctly
   - Email looks professional

### Step 6: Test Send

**IMPORTANT: Always test first!**

1. Modify CSV to include only YOUR email address
2. Run a test mail merge with this single entry
3. Check your inbox
4. Verify QR code attachment works
5. Verify validation URL works

### Step 7: Send to All Recipients

Once test is successful:

1. Restore full CSV file
2. Run the mail merge again
3. Click **Send**
4. Monitor progress in ReliefJet
5. Check Outlook Sent Items to verify

**Tips:**
- ReliefJet shows progress during sending
- Emails are sent through Outlook (uses your configured account)
- Check Outlook's Outbox if emails are queued
- Monitor for any error messages from ReliefJet

---

## ReliefJet CLI Method (Advanced)

For advanced users with Professional Edition. Requires knowing the exact utility code.

### Step 1: Find Utility Code

Run ExecutorCli in search mode:

```cmd
cd "C:\Program Files (x86)\Relief Software\ReliefJet Essentials for Outlook"
ExecutorCli.exe
```

Type: `mail` or `merge`

Note the utility code (likely `OutlookMessagesMailMerge` or similar).

### Step 2: Get Utility Parameters

```cmd
ExecutorCli.exe -? -u OutlookMessagesMailMerge
```

This shows all available parameters for mail merge utility.

### Step 3: Update Batch Script

Edit `backend/run-reliefjet-mailmerge.bat`:

1. Update `RELIEFJET_PATH` with your ExecutorCli.exe location
2. Update `UTILITY_CODE` with the correct code from Step 1
3. Adjust parameters based on output from Step 2

### Step 4: Run Batch Script

```cmd
cd C:\path\to\QR-Code-Manager\backend
run-reliefjet-mailmerge.bat
```

Follow the prompts and confirm before sending.

---

## Troubleshooting

### Issue: CSV Export Shows "Not matched in database"

**Cause:** Email addresses in CSV don't match any database entry.

**Solution:**
1. Ensure you ran `npm run rebuild` before exporting
2. Check that CSV file path in `.env` is correct
3. Verify email addresses in CSV match exactly (case-sensitive for first letter)

### Issue: "Missing QR code" Warnings

**Cause:** QR code files were not generated for some respondents.

**Solution:**
1. Re-run `npm run rebuild`
2. Check file permissions on `qr_codes` directory
3. Review console output for any errors during QR generation

### Issue: ReliefJet Can't Find CSV File

**Cause:** File path is incorrect or file doesn't exist.

**Solution:**
1. Verify CSV was generated: `ls backend/reliefjet_mailmerge.csv`
2. Use absolute path in ReliefJet
3. Ensure no special characters in path

### Issue: Merge Fields Not Populating

**Cause:** Field names don't match between template and CSV.

**Solution:**
1. Field names are case-sensitive
2. Use exact names: `<<Email1>>`, `<<ValidationURL>>`, etc.
3. Don't add spaces inside `<< >>`

### Issue: QR Code Not Attached

**Cause:** Attachment field not configured properly.

**Solution:**
1. In ReliefJet, map `QRCodePath` column to attachment field
2. Ensure file paths in CSV are absolute and valid
3. Verify QR code PNG files exist at specified paths

### Issue: Emails Not Sending

**Cause:** Outlook not configured or ReliefJet issue.

**Solution:**
1. Ensure Outlook is configured with email account
2. Send a test email manually from Outlook to verify setup
3. Check if ReliefJet requires activation/license
4. Review Windows Event Log for detailed errors

### Issue: "Profile not found" Error

**Cause:** Outlook profile name is incorrect.

**Solution:**
1. In batch script, leave `OUTLOOK_PROFILE` empty to use default
2. Or find profile name: Outlook → File → Account Settings → Manage Profiles
3. Use exact profile name (case-sensitive)

---

## Email Template Guidelines

### Best Practices

1. **Keep it Professional**
   - Clear subject line
   - Professional greeting
   - Brief instructions
   - Contact information

2. **Include Clear Instructions**
   - How to use the QR code
   - When/where to present it
   - What to do if there's an issue

3. **Personalization**
   - Use merge fields appropriately
   - Don't over-personalize (you only have emails and tokens)

4. **Accessibility**
   - Include the validation URL as clickable link
   - Mention QR code is attached
   - Provide alternative contact method

### Example Template 1: Simple

```
Subject: Your Survey QR Code - Action Required

Hello,

Thank you for completing our survey. Please find your unique QR code attached.

Validation URL: <<ValidationURL>>

To claim your gift:
1. Open the attached QR code image
2. Present it at the collection point
3. Staff will scan your code

Questions? Contact us at support@example.com

Thank you,
Survey Team
```

### Example Template 2: Detailed

```
Subject: Your Personalized Survey QR Code

Dear Participant,

We appreciate your participation in our recent survey. As a token of our gratitude, please find your unique QR code attached to this email.

📱 YOUR QR CODE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Token: <<Token>>
Validation URL: <<ValidationURL>>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 HOW TO CLAIM YOUR GIFT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Save the attached QR code to your phone
2. Visit our collection point (Address Here)
3. Show your QR code to staff
4. Receive your gift!

⚠️ IMPORTANT NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Each QR code is unique and can only be used once
• QR codes must be presented in person
• Collection deadline: [Date]
• Lost your QR code? Contact: support@example.com

Thank you for your participation!

Best regards,
The Survey Team

P.S. You can also access your validation page directly at: <<ValidationURL>>
```

### Example Template 3: Multilingual

If you have international participants:

```
Subject: Your Survey QR Code / Seu Código QR da Pesquisa

English:
Thank you for completing our survey. Your unique QR code is attached.
Validation link: <<ValidationURL>>

Português:
Obrigado por completar nossa pesquisa. Seu código QR único está anexado.
Link de validação: <<ValidationURL>>

Instructions / Instruções:
1. Save attached QR code / Salve o código QR anexado
2. Present at collection point / Apresente no ponto de coleta
3. Claim your gift / Reivindique seu presente

Questions? support@example.com
```

---

## Security Considerations

### Email Addresses

- Email addresses are hashed in the database
- Original emails only exist in CSV and exported file
- Store CSV files securely
- Delete export CSV after mail merge if security is critical

### QR Codes

- Each QR code is unique and tied to specific emails
- QR codes can only be validated once (after first scan, marked as received)
- Timestamps are recorded for audit trail
- Tokens are UUIDs (very difficult to guess)

### Best Practices

1. **Test Thoroughly**: Always test with your own email first
2. **Backup**: Keep backups of original CSV before processing
3. **Monitor**: Check MongoDB for validation attempts
4. **Review**: Review sent emails in Outlook's Sent Items
5. **Cleanup**: Delete temporary files after successful send

---

## Appendix: File Reference

### Input Files

| File | Location | Purpose |
|------|----------|---------|
| exampleList.csv | backend/config/ | Original email list |
| .env | backend/ | Environment configuration |
| email_template.oft | backend/ | Outlook email template |

### Generated Files

| File | Location | Purpose |
|------|----------|---------|
| QR code PNGs | backend/src/utils/qr_codes/ | QR code images |
| reliefjet_mailmerge.csv | backend/ | Mail merge data source |

### Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| rebuildDatabase.js | `npm run rebuild` | Generate QR codes |
| exportForReliefJet.js | `npm run export-reliefjet` | Create mail merge CSV |
| run-reliefjet-mailmerge.bat | Direct execution | CLI mail merge (optional) |

### Database Collections

| Collection | Contents |
|------------|----------|
| respondents | Email hashes, tokens, validation status |

---

## Quick Reference

### Complete Process Checklist

- [ ] Prepare CSV with Email1 and Email2 columns
- [ ] Update .env with CSV_LOCATION and HOSTNAME
- [ ] Run `npm run rebuild` to generate QR codes
- [ ] Verify QR codes created in qr_codes folder
- [ ] Run `npm run export-reliefjet` to create mail merge CSV
- [ ] Check export statistics for any issues
- [ ] Create email template in Outlook (.oft file)
- [ ] Open ReliefJet Essentials in Outlook
- [ ] Configure Mail Merge with CSV and template
- [ ] Map Email1 to recipient, QRCodePath to attachment
- [ ] Preview first email to verify
- [ ] Test send to your own email
- [ ] Verify test email received with QR code
- [ ] Send to all recipients
- [ ] Monitor sending progress
- [ ] Verify in Sent Items
- [ ] Test a few QR codes with validation endpoint

### Emergency Rollback

If something goes wrong during sending:

1. **Stop ReliefJet**: Close the mail merge dialog
2. **Check Outbox**: Cancel any queued emails in Outlook
3. **Review Sent**: Check what was already sent
4. **Fix Issue**: Correct CSV, template, or configuration
5. **Filter CSV**: Remove already-sent recipients
6. **Resume**: Start mail merge with filtered CSV

---

## Support

For issues specific to:
- **QR Code Generation**: Check backend logs and MongoDB connection
- **CSV Export**: Review console output for warnings
- **ReliefJet Usage**: Consult ReliefJet documentation or support
- **Outlook Issues**: Verify Outlook configuration and email account

For this system:
- Check logs in `backend` directory
- Review MongoDB database state
- Verify all environment variables are set correctly

---

**Last Updated**: 2025-01-11
**Version**: 1.0.0
**Compatible with**: ReliefJet Essentials for Outlook (Professional & Standard Editions)
