const path = require("path");
const express = require("express");
const fetch = require("node-fetch");
const { engine } = require('express-handlebars');
const fs = require('fs');

// Create an Express application
const app = express();

// Set up Handlebars
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials') // Ensure this line is present
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Add this near the top of the file, after creating the Express application
app.locals.stylePath = '/views/styles/style.css';
app.locals.didStylePath = '/views/styles/did.css';

// Add this before setting up the view engine
app.use('/views/styles', express.static(path.join(__dirname, 'views', 'styles')));
app.use('/views/styles/did.css', express.static(path.join(__dirname, 'views', 'styles', 'did.css')));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Specific route for images if needed
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Home page route
app.get("/", (req, res) => {
    res.render("index", { layout: "main" });
  });

app.get("/did", (req, res) => {
  res.render("did", { layout: "did-layout" });
});

// Debug route for avatars
app.get('/debug-avatars', (req, res) => {
  const avatarPath = path.join(__dirname, 'public', 'images', 'avatars');
  fs.readdir(avatarPath, (err, files) => {
    if (err) {
      return res.status(500).send('Error reading avatar directory' + err);
    }
    res.json(files);
  });
});

// Run the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Your app is listening on http://localhost:${PORT}`);
});