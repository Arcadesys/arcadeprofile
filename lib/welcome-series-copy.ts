import { SUBSCRIBER_GIFT, subscriberGiftFiles } from './subscriber-gift';

type Link = { label: string; url: string };
type Paragraph = Array<string | Link>;
const renderParagraph = (parts: Paragraph, render: (part: string | Link) => string) => parts.map((part, index) =>
  `${index > 0 && typeof part !== 'string' && typeof parts[index - 1] !== 'string' ? ' · ' : ''}${render(part)}`).join('');
const link = (label: string, url: string): Link => ({ label, url });
const collection = 'https://www.thearcades.me/this-is-what-i-do-for-fun';
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Approved draft copy from the welcome-series artifact; no provider calls. */
export function buildWelcomeSeriesEmail(step: number, unsubscribeUrl: string) {
  const emails: Array<{ subject: string; preview: string; paragraphs: Paragraph[] }> = [
    {
      subject: 'Broomsticks: a door into Estelle’s Children',
      preview: 'Read the opening story early, and meet Austen.',
      paragraphs: [
        ['Hi,'],
        [`Thanks for coming along. Here's ${SUBSCRIBER_GIFT.title}, the opening story of Estelle's Children, early, for subscribers only.`],
        ['A Chicago witch’s parlor. A kid at the door. The beginning of a sisterhood, told as an archive. The novel is forthcoming from Free Play Publishing.'],
        subscriberGiftFiles().map((file) => link(`Download the ${file.label}`, new URL(file.url, 'https://www.thearcades.me').href)),
        ["I'm Austen Tucker. I write stories about the heart, build odd little things, and rarely turn down a chance to play pinball. This is where I'll share the writing as it's ready."],
        ['For now, make yourself at home. Read at your own pace.'],
        ['Austen'],
      ],
    },
    {
      subject: 'I learned to write from strangers on the internet',
      preview: 'The people behind the stories, and three places to start.',
      paragraphs: [
        ['Hi,'],
        ["I thought I'd found people who liked the same weird things I did. What I found was a place to grow up."],
        ["That's where This is what I do for fun begins. With the communities that taught me to write, and the people who taught me what to notice. Who gets looked after. Who gets left outside. When becoming something else means coming home."],
        ["The lone writer makes a good myth. It doesn't explain much about how I learned."],
        ["If you'd like to see what came out of that, here are three of the stories, free to read:"],
        [link('Carl', `${collection}/carl`), ' — an aging android who only knows how to keep working.'],
        [link('Our Hope Chest', `${collection}/our-hope-chest`), ' — siblings whose private refuge becomes impossible to hide.'],
        [link('La Ligne du Marais', `${collection}/la-ligne-du-marais`), ' — a gambler following a rumor through Paris.'],
        ["Pick whichever catches your eye. That's a perfectly good place to start."],
        ['Austen'],
      ],
    },
    {
      subject: "If you'd like the book",
      preview: 'Eight stories. Seven to read free. Foxtails, only in the book.',
      paragraphs: [
        ['Hi,'],
        ["If you've enjoyed wandering through the stories, I put eight of them together in This is what I do for fun, published by Free Play Publishing."],
        [link('Seven are free to read on the site', collection), ". The eighth is Foxtails, only in the book. It's separate from the subscriber-only piece I sent when you joined."],
        ['You can get the collection in the format that suits you:'],
        [link('Kindle — $4.99', 'https://www.amazon.com/dp/B0HM8J2Z87')],
        [link('Paperback — $12.99', 'https://www.amazon.com/dp/B0HMFDFVNH')],
        [link('Visit Free Play Publishing', 'https://freeplaypublishing.com/'), ' for the book and a little of the foreword.'],
        ["Subscribers will hear first when Estelle's Children is out."],
        ["Thanks for giving the work some of your time. I'm glad you're here."],
        ['Austen'],
      ],
    },
  ];
  const email = emails[step];
  if (!email || !Number.isInteger(step)) throw new Error('Unknown welcome series step');
  if (step === 0 && !subscriberGiftFiles().length) throw new Error('Welcome gift is not configured');
  const paragraphs = [...email.paragraphs, [link('Unsubscribe from these emails', unsubscribeUrl)]];
  return {
    subject: email.subject,
    preview: email.preview,
    html: `<div style="display:none;max-height:0;overflow:hidden">${escape(email.preview)}</div><div style="font:18px/1.7 Arial,sans-serif;color:#111;background:#fff">${paragraphs.map((p) => `<p>${renderParagraph(p, (v) => typeof v === 'string' ? escape(v) : `<a style="display:inline-block;min-height:44px;box-sizing:border-box;padding:6px 0;color:#111;text-decoration:underline;outline-offset:3px" href="${escape(v.url)}">${escape(v.label)}</a>`)}</p>`).join('')}</div>`,
    text: `${email.preview}\n\n${paragraphs.map((p) => renderParagraph(p, (v) => typeof v === 'string' ? v : `${v.label} (${v.url})`)).join('\n\n')}`,
  };
}
