
# VedAarna Invoice App

A ready-to-deploy React + Netlify Functions invoice generator for VedAarna Studio.

## Features
- Add items, quantities, discount, tax.
- Live invoice preview with boutique logo and styling.
- Download a PDF invoice locally.
- Upload PDF to S3 and send email copies (customer + vedaarnastudio@gmail.com) via AWS SES using a Netlify serverless function.
- Get a hosted download link usable in WhatsApp messages.

## Quick start (local)
1. Install dependencies:
   ```
   npm install
   ```

2. Copy your logo files into `public/`:
   - `logo.png` (header)
   - `logo_small.png` (footer)

   Sample assets are included.

3. Run dev server:
   ```
   npm run dev
   ```

## Deployment (Netlify)
1. Create an S3 bucket and AWS IAM user with `s3:PutObject` permission and `ses:SendEmail` (or configure SES).
2. Verify `SES_FROM_EMAIL` in AWS SES.
3. In Netlify site settings, add environment variables (from `.env.example`).
4. Push repo to GitHub and connect Netlify to build from `main`.
5. Deploy; Netlify will host the site and functions.

## Notes on security
- AWS credentials must be kept secret (set in Netlify env).
- SES may require recipient verification in some regions.

For any help configuring AWS S3/SES or adjusting the invoice design, tell me and I will provide step-by-step AWS console actions.
