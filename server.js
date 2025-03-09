const app = require('./app');
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
  console.log('-------------------------------------');
  console.log(`Educational Materials Portal is running`);
  console.log(`Server running at: http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop the server`);
  console.log('-------------------------------------');
}); 