import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import Image from 'next/image';

// Combined book metadata - in a real app, this could come from a database or JSON file
interface BookInfo {
  title: string;
  description: string;
  coverImage?: string;
  buyLink?: string;
  hasBuyButton?: boolean;
  hasPreview?: boolean;
}

const bookInfo: Record<string, BookInfo> = {
  'tfcch1': {
    title: 'The Two-Flat Cats',
    description: 'A story about toons living in a world where cartoons are real.',
    coverImage: '/preview/covers/tfc.png',
    hasBuyButton: false,
    hasPreview: true
  },
  'baitandswitch': {
    title: 'Bait and Switch',
    description: "In Fenton's world, some kids are toons. Some think the change is biological. Others think the change is social. But some kids turn into toons, and Fenton's father just wants it to stop. He's even built a Realist movement to ban toons from the real world, hoping that it will keep his own children from following in their estranged mother's cartoon footsteps. Tensions rise as the Realists lobby to get their ban set into law, and toons fight for their right to be themselves. Fenton's father knows he can count on his two boys to stand behind him and his dream of building a safe, a toon-free reality. It's just too bad that Fenton's becoming a toon....",
    coverImage: '/images/books/baitandswitch.jpg',
    buyLink: 'https://www.amazon.com/Bait-Switch-Austen-Crowder/dp/145631890X/',
    hasBuyButton: true,
    hasPreview: false
  },
  'thepaintedcat': {
    title: 'The Painted Cat',
    description: "Janet lives in two worlds. In one world, she is Miss Perch, teacher at a small school deep in the corn grids, helping kids who are turning into cartoon find their way out of town. In the other, she is Bunny Cat, and paints herself up to be the very same type of cartoon cat her small town has grown to hate. The wall separating those two worlds is starting to break down. Between rekindling a relationship with an old college flame and discovering how much she loves being Bunny Cat her two worlds are starting to merge.",
    coverImage: '/images/books/thepaintedcat.jpg',
    buyLink: 'https://furplanet.com/shop/item.aspx?itemid=778',
    hasBuyButton: true,
    hasPreview: false
  },
  'afuzzyplace': {
    title: 'A Fuzzy Place',
    description: "Furry fiction and I have a complicated relationship. For the past ten years I've been in and out of the furry community. Conventions, art trades, commissions, badges, even suits – I tried it all. Most of my best friends came from the fandom and continue to be the reason I come back year after year.",
    coverImage: '/images/books/afuzzyplace.jpg',
    buyLink: 'https://www.amazon.com/Fuzzy-Place-Stories-Shaped-Subculture-ebook/dp/B00H7K7EYQ/',
    hasBuyButton: true,
    hasPreview: false
  },
  'closetcats': {
    title: 'Closet Cats',
    description: "Three romantic short stories about lesbians, trans people, catgirls, and dragons. Ginny's Magic: Evelyn lands a date with the catgirl from the next world over, and take a little trip through Chicago's Boystown neighborhood. Dragons in the Middle: Dave lands himself in a pickle after a one night stand with a wishing dragoness. Closet Cat: Stuck in a rut, Charlie's marriage depends on a collar and cat ears provided by a witch he knew in college.",
    coverImage: '/images/books/closetcats.jpg',
    buyLink: 'https://www.amazon.com/Closet-Cats-Austen-Tucker-ebook/dp/B0B311T8P1/',
    hasBuyButton: true,
    hasPreview: false
  }
};

// Helper function to check if a cover image exists
function getCoverImage(bookId: string): string | undefined {
  const defaultCover = bookInfo[bookId]?.coverImage;
  if (defaultCover) return defaultCover;
  
  // Try to find a cover with the same name as the book ID
  const possibleCovers = [
    `/preview/covers/${bookId}.png`,
    `/preview/covers/${bookId}.jpg`,
    `/preview/covers/${bookId}.jpeg`
  ];
  
  // In a client component we can't check the file system directly,
  // but we can return the first possible cover and let the browser handle missing files
  return possibleCovers[0];
}

export default function BooksAndPreviewsPage() {
  // Get all available previews
  const previewDir = path.join(process.cwd(), 'public', 'preview');
  let previewFiles: string[] = [];
  
  try {
    previewFiles = fs.readdirSync(previewDir)
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));
  } catch (error) {
    console.error('Error reading preview directory:', error);
  }
  
  // Combine preview files with book info
  const allBooks = new Set([...Object.keys(bookInfo), ...previewFiles]);
  
  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
        <h1 className="text-3xl font-bold mb-8 text-center gaysparkles">Books & Previews</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from(allBooks).map(bookId => {
            // Get book info or create default
            const book = bookInfo[bookId] || { 
              title: bookId.charAt(0).toUpperCase() + bookId.slice(1).replace(/-/g, ' '), 
              description: 'Preview available',
              hasPreview: true
            };
            
            // Check if this book has a preview file
            if (previewFiles.includes(bookId) && !book.hasPreview) {
              book.hasPreview = true;
            }
            
            const coverImage = book.coverImage || getCoverImage(bookId);
            
            return (
              <div key={bookId} className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                {coverImage && (
                  <div className="h-64 overflow-hidden">
                    <img 
                      src={coverImage} 
                      alt={`Cover for ${book.title}`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{book.title}</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{book.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {book.hasPreview && (
                      <Link 
                        href={`/previews/${bookId}`}
                        className="button-link"
                      >
                        Read Preview
                      </Link>
                    )}
                    
                    {book.hasBuyButton && book.buyLink && (
                      <a 
                        href={book.buyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button-link bg-green-700 hover:bg-green-800 border-green-600"
                      >
                        Buy Book
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 