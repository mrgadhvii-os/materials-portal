# Educational Materials Portal

A web application for managing and accessing educational materials with authentication and admin controls.

## Features

- Material and Paper Management
- Access Key Generation
- Admin Panel
- Firebase Integration
- Preview System
- Authentication System

## Deployment on Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Configure Firebase:
   - Create a Firebase project
   - Download service account key
   - Add as Secret in Vercel:
```bash
vercel secrets add firebase-service-account "$(cat gec-wave-firebase-adminsdk*.json)"
```

4. Deploy:
```bash
vercel
```

## Environment Variables

Set these in Vercel dashboard:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_DATABASE_URL`

## Development

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## File Structure

```
materials-portal/
├── app.js              # Main application file
├── public/             # Static files
├── views/              # EJS templates
├── data/              # CSV files
└── vercel.json        # Vercel configuration
```

## Security

- Rate limiting on admin login
- Secure cookie settings
- Firebase security rules
- Access key validation

## License

MIT

## Author

[Your Name] 