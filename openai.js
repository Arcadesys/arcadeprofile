// openai.js

const fetch = require('node-fetch'); // Import node-fetch to use fetch API on the server

const fetchResponse = async (prompt) => {
  const apiKey = process.env.OPENAI_API_KEY;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${apiKey}`
     },
     body: JSON.stringify({
       model: 'gpt-4o-mini', // Ensure this model is available to you
       messages: [
         {
           role: 'system',
           content: 'You are a fellow writer assisting me in my drafts. please be concise make open-ended suggestions when discussing my work. Your suggestions, compliments, and criticisms should never be longer than a single sentence. When commenting on the content, separate your content using this format: [(your comment) ed.]'
         },
         {
           role: 'user',
           content: `${prompt}`
         }
       ]
     })
   });

   if (!response.ok) {
     throw new Error(`OpenAI API error: ${response.statusText}`);
   }

   const data = await response.json(); // Parse the response as JSON
   return data; // Return the entire response data
};

module.exports = { fetchResponse }; // Export the fetchResponse function
