# Cert-Verify
# Robify Certificate Verification System

A robust Node.js-based digital certificate generation and verification platform with QR code integration.

## Overview

Robify is an automated certificate system that generates QR-verified credentials at a rate of 5 per second. The system provides a secure and efficient way to verify the authenticity of certificates through a web interface.

## Features

- **Fast Certificate Generation**: Creates verified credentials at a rate of 5 per second
- **QR Code Verification**: Each certificate contains a unique QR code for quick verification
- **Email Verification**: Sends verification codes via email using Mailgun integration
- **Bulk Import**: Supports CSV upload for adding multiple users simultaneously
- **Admin Dashboard**: Secure admin interface for certificate management
- **Data Export**: Export certificate data as CSV files with date filtering
- **Unique Code Generation**: Generates unique 8-digit alphanumeric codes for each certificate

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Email Service**: Mailgun
- **File Handling**: Multer, csv-parser
- **Frontend Templating**: EJS
- **Cloud Infrastructure**: AWS (EC2, S3) supporting 1000+ users

## Usage

### Certificate Verification

1. Navigate to `/validate`
2. Enter the 8-digit verification code
3. View certificate details if the code is valid

### Email Verification

1. Navigate to `/verify`
2. Enter username, email, and first 4 digits of the code
3. If valid, the system sends the complete code to the verified email

### Admin Dashboard

1. Navigate to `/login` and enter admin credentials
2. Access the dashboard to:
   - Add individual users
   - Upload CSV files for bulk user addition
   - Delete users individually or in bulk
   - Export user data filtered by date

## API Endpoints

- `GET /validate` - Certificate validation page
- `POST /validate` - Validate a certificate code
- `GET /verify` - Email verification page
- `POST /verify` - Send verification code via email
- `GET /dashboard` - Admin dashboard (requires authentication)
- `POST /add-user` - Add a new user
- `POST /upload-csv` - Bulk import users from CSV
- `DELETE /delete-user/:id` - Delete a specific user
- `POST /delete-users` - Delete multiple users
- `GET /download-table` - Download user data as CSV

## Security Features

- Admin authentication
- Email verification against registered user emails
- Unique alphanumeric codes for each certificate


