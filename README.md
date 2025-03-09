# Educational Materials Portal

A web application for managing and accessing educational materials with authentication and admin controls.

## Features

- Material and Paper Management
- Access Key Generation
- Admin Panel
- Firebase Integration
- Preview System
- Authentication System

## Deployment on Render

1. **Create a Render Account**
   - Sign up at [render.com](https://render.com)
   - Connect your GitHub repository

2. **Create a New Web Service**
   - Click "New +" and select "Web Service"
   - Choose your repository
   - Select the branch to deploy

3. **Configure Environment Variables**
   In your Render dashboard, add these environment variables:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_DATABASE_URL`
   - `NODE_ENV=production`

4. **Deploy Settings**
   - Build Command: `npm install`
   - Start Command: `node app.js`
   - Node Version: 14 or higher

5. **Auto-Deploy**
   - Render will automatically deploy when you push to your repository
   - You can also manually deploy from the dashboard

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
└── render.yaml        # Render configuration
```

## Security

- Rate limiting on admin login
- Secure cookie settings
- Firebase security rules
- Access key validation

## Important Notes

1. **Firebase Setup**
   - Create a Firebase project
   - Download service account key
   - Add Firebase credentials to Render environment variables
   - Ensure Firebase Security Rules are properly configured

2. **Data Files**
   - Ensure your CSV files are in the `data` directory
   - Files will be read-only in production
   - Consider using Firebase Storage for dynamic file management

3. **Monitoring**
   - Use Render's dashboard for logs and monitoring
   - Set up alerts for service issues
   - Monitor Firebase usage and quotas

## License

MIT

## Author

[Your Name] 