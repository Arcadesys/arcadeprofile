import { App, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-with-deps';

const app = new App({ name: 'reaction-stickers-grid', version: '0.1.0' });
const form = document.querySelector('#options');
const promptField = document.querySelector('#prompt');
const reactionsField = document.querySelector('#reactions');
const list = document.querySelector('#reaction-list');
const status = document.querySelector('#status');
const sendButton = document.querySelector('#send');
const copyButton = document.querySelector('#copy');
let connected = false;
let currentPrompt = '';

function update() {
  const character = form.elements.character.value;
  const telegram = form.elements.finish.value === 'telegram';
  const result = window.stickerPrompt.compose(window.stickerWorkflow, {
    character,
    reactions: reactionsField.value,
    notes: document.getElementById('notes').value,
    labels: document.getElementById('labels').checked,
    finish: form.elements.finish.value,
    title: document.getElementById('pack-title').value,
  });
  document.getElementById('robot-download').hidden = character !== 'robot';
  document.getElementById('character-help').textContent = character === 'robot'
    ? 'Open the robot reference sheet and attach it in chat before generating.'
    : 'Attach your character reference in chat before generating.';
  document.getElementById('telegram-options').hidden = !telegram;
  document.getElementById('reactions-error').textContent = result.error || '';
  reactionsField.setAttribute('aria-invalid', result.error ? 'true' : 'false');
  reactionsField.setCustomValidity(result.error || '');
  currentPrompt = result.prompt || '';
  promptField.value = currentPrompt;
  list.replaceChildren();
  for (const label of result.labels || []) {
    const item = document.createElement('li');
    item.textContent = label;
    list.append(item);
  }
  sendButton.disabled = !connected || Boolean(result.error);
  copyButton.disabled = Boolean(result.error);
  status.textContent = result.error
    ? 'Enter exactly ten reactions to continue.'
    : connected
      ? 'Review the prompt, then send it to this chat or copy it.'
      : 'Copy the prompt here. In ChatGPT, you can also send it directly to this chat.';
}

form.addEventListener('input', update);
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('reset', () => setTimeout(update, 0));

copyButton.addEventListener('click', async () => {
  if (!currentPrompt) return;
  try {
    await navigator.clipboard.writeText(currentPrompt);
    status.textContent = 'Prompt copied. Attach your reference in chat, then paste and send.';
  } catch {
    promptField.focus();
    promptField.select();
    status.textContent = 'The prompt is selected. Use your device’s Copy command.';
  }
});

sendButton.addEventListener('click', async () => {
  if (!connected || !currentPrompt) return;
  sendButton.disabled = true;
  status.textContent = 'Sending prompt to this chat…';
  try {
    const response = await app.sendMessage({ role: 'user', content: [{ type: 'text', text: currentPrompt }] });
    status.textContent = response.isError
      ? 'This chat could not accept the prompt. Copy it instead.'
      : 'Prompt sent. Attach your character reference if ChatGPT asks for it.';
  } catch {
    status.textContent = 'This chat could not accept the prompt. Copy it instead.';
  } finally {
    sendButton.disabled = false;
  }
});

for (const link of document.querySelectorAll('a[target="_blank"]')) {
  link.addEventListener('click', async event => {
    if (!connected) return;
    event.preventDefault();
    try {
      const response = await app.openLink({ url: link.href });
      if (response.isError) status.textContent = 'The link could not open in this chat. Copy its address instead.';
    } catch {
      status.textContent = 'The link could not open in this chat. Copy its address instead.';
    }
  });
}

app.addEventListener('toolresult', result => {
  const workflow = result.structuredContent?.workflow;
  if (Array.isArray(workflow?.labels) && typeof workflow?.prompt === 'string') {
    window.stickerWorkflow = workflow;
    update();
  }
});

update();
if (window.parent !== window) {
  app.connect(new PostMessageTransport(window.parent, window.parent))
    .then(() => { connected = true; update(); })
    .catch(() => { status.textContent = 'Chat controls are unavailable here. You can still copy the prompt.'; });
}
