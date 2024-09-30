import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

// Register partials
const partialsDir = path.join(process.cwd(), 'views', 'partials');
const filenames = fs.readdirSync(partialsDir);

filenames.forEach(filename => {
    const matches = /^([^.]+).handlebars$/.exec(filename);
    if (!matches) {
        return;
    }
    const name = matches[1];
    const filepath = path.join(partialsDir, filename);
    const template = fs.readFileSync(filepath, 'utf8');
    Handlebars.registerPartial(name, template);
});

// Read and pre-compile the template from views/index.handlebars
const templateSource = fs.readFileSync(path.join(process.cwd(), 'views', 'index.handlebars'), 'utf-8');
const template = Handlebars.compile(templateSource);

export default async function handler(req, res) {
    try {
        // Render the template with data
        const html = template({ 
            title: 'My Page',
            message: 'Welcome to my site!'
        });
        
        // Send the response
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
}
