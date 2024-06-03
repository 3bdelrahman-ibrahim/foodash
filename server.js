// Import necessary dependencies
const express = require('express');
const path = require('path');

// Create an Express application
const app = express();

// Define a route to serve the index.html file
app.get('/', (req, res) => {
    // Send the index.html file when this route is accessed
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
