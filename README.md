# Educational Materials Portal

A modern Node.js application to categorize, display, and manage educational materials with a beautiful UI and seamless user experience.

## Features

- **Automatic Material Categorization**: Parses filenames to extract standard, subject, material type, year, and language
- **Material Cards**: Visually appealing cards displaying material information
- **Filter System**: Filter materials by standard, subject, year, and language
- **Preview Page**: Display material details with a preview thumbnail
- **Download Timer**: 10-second countdown before enabling download
- **Responsive Design**: Works on desktop and mobile devices

## Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: EJS templates, Bootstrap 5, jQuery
- **Data**: CSV parsing and processing
- **Styling**: Custom CSS with animations

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Ensure your materials.csv file is in the data directory

## Usage

1. Start the application:
   ```
   npm start
   ```
2. Open your browser and navigate to `http://localhost:3000`

## CSV Format

The application expects a CSV file in the following format:
```
filename,url
12th-physics-textbook-2023,https://link-to-file.com
```

Where the filename follows the pattern: `standard-subject-materialtype-year[-language]`

## License

MIT

## Author

[Your Name] 