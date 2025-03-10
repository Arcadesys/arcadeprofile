import fs from 'fs';
import path from 'path';
import Link from 'next/link';

// Book metadata - in a real app, this could come from a database or JSON file
const bookInfo: Record<string, { title: string, description: string, coverImage?: string }> = {
  'tfcch1': {
    title: 'The Two-Flat Cats',
    description: 'A story about toons living in a world where cartoons are real.',
    coverImage: '/images/tfcch1-cover.jpg' // Optional, add if you have cover images
  },
  // Add more books as needed
};

export default function PreviewsPage() {
  // Get all available previews
  const previewDir = path.join(process.cwd(), 'public', 'preview');
  const files = fs.readdirSync(previewDir)
    .filter(file => file.endsWith('.md'))
    .map(file => file.replace('.md', ''));
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Book Previews</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {files.map(bookId => {
          const book = bookInfo[bookId] || { 
            title: bookId.charAt(0).toUpperCase() + bookId.slice(1).replace(/-/g, ' '), 
            description: 'Preview available' 
          };
          
          return (
            <div key={bookId} className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              {book.coverImage && (
                <div className="h-48 overflow-hidden">
                  <img 
                    src={book.coverImage} 
                    alt={`Cover for ${book.title}`} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{book.title}</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{book.description}</p>
                <Link 
                  href={`/previews/${bookId}`}
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Read Preview
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 