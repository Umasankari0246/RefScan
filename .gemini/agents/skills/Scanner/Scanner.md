---
name: scanner
description: Domain knowledge for implementing book barcode and ISBN scanning functionality in RefScan.
---

# Scanner Skill

When implementing book barcode/ISBN scanning functionality, consider:

## Scanner

- Camera permission
- Camera preview
- Barcode detection
- ISBN detection
- ISBN-10
- ISBN-13
- Scanning state
- Scan success
- Scan failure
- Manual ISBN entry
- Retry scanning

## Book Identification

After detecting an ISBN:

- Validate ISBN
- Identify book
- Retrieve bibliographic information
- Display retrieved information
- Allow user verification
- Allow editing before saving

Book information may include:

- Book title
- Author(s)
- Publisher
- Publication year
- Edition
- ISBN
- Language
- Category
- Book cover

## Scanner States

Handle:

- Camera permission required
- Camera unavailable
- Ready to scan
- Scanning
- ISBN detected
- Retrieving book details
- Book found
- Invalid barcode
- Book not found
- Network/API error
- Scan timeout
- Retry

## User Actions

Support:

- Start scanning
- Scan another book
- Enter ISBN manually
- Upload barcode image where supported
- Flash/torch
- Switch camera
- Retry
- Edit book details
- Save reference

## Validation

Check:

- Invalid barcode
- Invalid ISBN
- Invalid ISBN length
- Invalid ISBN checksum
- Empty ISBN
- Unsupported barcode format
- Missing book information

Do not generate or assume book information when reliable data is unavailable.

## Security & Privacy

Check:

- Camera permission
- User permission before camera access
- Uploaded images
- User data
- API exposure
- Sensitive information
- Unnecessary storage of camera images

Do not store camera images unless explicitly required.

## API Integration

Keep scanner logic separate from book metadata retrieval.

The expected flow is:

Camera
→ Barcode Detection
→ ISBN Validation
→ Book Metadata API
→ Book Details
→ User Verification
→ Save Reference

Do not hard-code API credentials.

Use environment variables or secure backend configuration where required.

## Error Handling

Provide clear user-friendly messages.

Examples:

- "Camera permission is required to scan a book."
- "No barcode detected. Try adjusting the camera."
- "The scanned barcode is not a valid ISBN."
- "We couldn't find this book. Try entering the ISBN manually."
- "Unable to retrieve book details. Please try again."

## Frontend Development

When backend/API services are unavailable:

- Use mock ISBN data.
- Use mock book metadata.
- Clearly separate mock data from production services.
- Keep the scanner component reusable.
- Keep API calls outside UI components where possible.

## Architecture

Follow the existing RefScan application architecture.

Reuse existing:

- Camera components
- UI components
- Buttons
- Modals
- Notifications
- Loading states
- Error states
- Navigation

Do not create duplicate scanner functionality if an existing implementation can be reused.

Do not invent scanner or book-identification business rules when they are not provided.

Clearly state assumptions before implementing unspecified behavior.