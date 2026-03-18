import Link from 'next/link';

export default function PortfolioPage() {
  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%", maxWidth: "700px" }}>
        <h1 className="text-3xl font-bold mb-2 text-center gaysparkles">Portfolio</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8">More content coming later.</p>

        <Link
          href="/did"
          className="block border rounded-lg shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 p-6 text-center"
        >
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">DID explainer</h2>
          <p className="text-gray-600 dark:text-gray-300">A chat-style intro to our system and dissociative identity disorder.</p>
          <span className="button-link inline-block mt-4">Read it &rarr;</span>
        </Link>
      </div>
    </div>
  );
}
