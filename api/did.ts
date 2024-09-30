import { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import { engine } from 'express-handlebars';
import express from 'express';
import fs from 'fs';

// Create an Express application
const app = express();

// Set up Handlebars
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(process.cwd(), 'views', 'layouts'),
  partialsDir: path.join(process.cwd(), 'views', 'partials')
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(process.cwd(), 'views'));

// Middleware
app.use(express.json());

// Route for /did
app.get("/did", (req, res) => {
  res.render("did", { layout: "did-layout" });
});

// Export the Express app as a serverless function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  await new Promise((resolve, reject) => {
    app(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}
