'use client';

import { useState } from 'react';

const BUTTONDOWN_USERNAME = process.env.NEXT_PUBLIC_BUTTONDOWN_USERNAME || '';

export default function SubscribeForm() {
  const [email, setEmail] = useState('');

  if (!BUTTONDOWN_USERNAME) return null;

  return (
    <div className="border rounded-lg bg-white dark:bg-gray-800 p-6 shadow-md">
      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
        Subscribe for updates
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Get new posts delivered to your inbox. No spam, unsubscribe anytime.
      </p>
      <form
        action={`https://buttondown.com/api/emails/embed-subscribe/${BUTTONDOWN_USERNAME}`}
        method="post"
        target="popupwindow"
        className="flex gap-2"
      >
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
        <button
          type="submit"
          className="button-link whitespace-nowrap"
        >
          Subscribe
        </button>
      </form>
    </div>
  );
}
