const names = ['HELLO', 'LOVE', 'LAUGH', 'THANKS', 'YES', 'NO', 'SAD', 'ANGRY', 'THINKING', 'SLEEPY'];
const emojis = ['👋', '❤️', '😂', '🙏', '👍', '🙅', '😢', '😠', '🤔', '😴'];
const form = document.querySelector('#publish-form');
const list = document.querySelector('#file-list');
const status = document.querySelector('#publish-status');
const button = document.querySelector('#publish-button');
const link = document.querySelector('#pack-link');
let submitting = false;

for (const [index, name] of names.entries()) {
  const row = document.createElement('div');
  row.className = 'file-choice';
  const heading = document.createElement('label');
  heading.htmlFor = `sticker-${index}`;
  heading.textContent = `${index + 1}. ${name} PNG`;
  const input = document.createElement('input');
  input.id = `sticker-${index}`;
  input.name = `sticker_${index}`;
  input.type = 'file';
  input.accept = 'image/png,.png';
  input.required = true;
  const selected = document.createElement('span');
  selected.textContent = 'No PNG selected';
  input.addEventListener('change', () => { selected.textContent = input.files?.[0]?.name || 'No PNG selected'; updateReview(); });
  const emojiLabel = document.createElement('label');
  emojiLabel.htmlFor = `emoji-${index}`;
  emojiLabel.textContent = 'Telegram emoji';
  const emoji = document.createElement('input');
  emoji.id = `emoji-${index}`;
  emoji.name = `emoji_${index}`;
  emoji.type = 'text';
  emoji.maxLength = 32;
  emoji.required = true;
  emoji.value = emojis[index];
  emoji.className = 'emoji-input';
  row.append(heading, input, selected, emojiLabel, emoji);
  list.append(row);
}

const slug = document.querySelector('#slug');
slug.value = `reactions_${Math.random().toString(36).slice(2, 8)}`;
function updateReview() {
  const chosen = [...form.querySelectorAll('input[type=file]')].filter((input) => input.files?.length);
  const title = form.elements.title.value.trim();
  const selectedEmojis = [...form.querySelectorAll('.emoji-input')].map((input) => input.value.trim());
  document.querySelector('#review-summary').textContent = `${chosen.length} of 10 PNGs selected. ${title ? `Pack title: ${title}.` : 'Add a title.'} Short name: ${slug.value}_by_stickerslopbot. Emoji in order: ${selectedEmojis.join(' ')}.`;
  button.disabled = submitting || chosen.length !== 10 || !form.checkValidity();
}
form.addEventListener('input', updateReview);
form.addEventListener('change', updateReview);

async function initialize() {
  const availability = document.querySelector('#availability');
  try {
    const response = await fetch('/api/reaction-stickers/telegram/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('status unavailable');
    const state = await response.json();
    if (!state.enabled) {
      availability.textContent = 'Telegram publishing is being set up. You can still make a sticker preview and download the skill.';
      return;
    }
    if (new URLSearchParams(location.search).get('login') === 'failed') {
      availability.textContent = 'Telegram sign-in was not completed. Try again below.';
    } else {
      availability.hidden = true;
    }
    if (state.connected) {
      form.hidden = false;
      document.querySelector('#account-line').textContent = `Publishing to the Telegram account signed in as ${state.account}.`;
      updateReview();
    } else {
      document.querySelector('#sign-in').hidden = false;
    }
  } catch { availability.textContent = 'Telegram publishing is unavailable right now. Please try again later.'; }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitting || !form.checkValidity()) return;
  submitting = true;
  updateReview();
  status.textContent = 'Uploading your ten stickers to Telegram. Keep this page open.';
  link.hidden = true;
  try {
    const response = await fetch('/api/reaction-stickers/telegram/publish', { method: 'POST', body: new FormData(form), credentials: 'same-origin' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Telegram publishing did not finish.');
    if (result.status === 'created_verified') status.textContent = 'Your Telegram set was created and checked.';
    else status.textContent = 'Telegram may have created the set, but a full check was unavailable. Open the exact set before trying again.';
    const anchor = document.createElement('a');
    anchor.href = result.url;
    anchor.textContent = 'Open your Telegram sticker set';
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    link.replaceChildren(anchor);
    link.hidden = false;
  } catch (error) { status.textContent = error.message || 'Telegram publishing is unavailable. Check the exact set before retrying.'; }
  finally { submitting = false; updateReview(); }
});

initialize();
