'use strict';
const form = document.querySelector('#options');
const promptField = document.querySelector('#prompt');
const copyButton = document.querySelector('#copy');
const status = document.querySelector('#copy-status');
const reactions = document.querySelector('#reactions');
const list = document.querySelector('#reaction-list');
let copyAttempt = 0;
function update() {
  copyAttempt += 1;
  const character = form.elements.character.value;
  const telegram = form.elements.finish.value === 'telegram';
  const result = window.stickerPrompt.compose(window.stickerWorkflow, {
    character,
    reactions: reactions.value,
    notes: document.querySelector('#notes').value,
    labels: document.querySelector('#labels').checked,
    finish: form.elements.finish.value,
    title: document.querySelector('#pack-title').value,
  });
  document.querySelector('#telegram-options').hidden = !telegram;
  document.querySelector('#telegram-handoff').hidden = !telegram;
  document.querySelector('#character-help').textContent = character === 'robot'
    ? 'Download the robot reference below and attach it in ChatGPT with your prompt. Results will vary.'
    : 'Attach your reference directly in ChatGPT. This page never receives your images.';
  document.querySelector('#robot-download').hidden = character !== 'robot';
  document.querySelector('#reactions-error').textContent = result.error || '';
  reactions.setAttribute('aria-invalid', result.error ? 'true' : 'false');
  reactions.setCustomValidity(result.error || '');
  copyButton.disabled = Boolean(result.error);
  copyButton.textContent = telegram ? 'Copy Telegram prompt' : 'Copy prompt';
  promptField.value = result.prompt || '';
  list.replaceChildren();
  for (const label of result.labels || []) {
    const item = document.createElement('li');
    item.textContent = label;
    list.append(item);
  }
  status.textContent = result.error ? 'Complete the ten reactions to build your prompt.' : telegram ? 'Install the skill for Telegram publishing. This page only prepares the prompt.' : 'No installation needed to try a prompt.';
}
form.addEventListener('input', update);
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('reset', () => setTimeout(update, 0));
copyButton.addEventListener('click', async () => {
  if (!promptField.value) return;
  const attempt = ++copyAttempt;
  try {
    await navigator.clipboard.writeText(promptField.value);
    if (attempt === copyAttempt) status.textContent = form.elements.finish.value === 'telegram'
      ? 'Telegram prompt copied. Open ChatGPT, attach your reference, then paste and send. Review the pack before publishing.'
      : 'Prompt copied. Open ChatGPT, attach your own or the robot reference, then paste and send.';
  } catch {
    if (attempt !== copyAttempt) return;
    promptField.focus();
    promptField.select();
    status.textContent = 'Automatic copy is unavailable. The prompt is selected: use your device’s Copy command, then paste in ChatGPT.';
  }
});
document.querySelector('#builder').hidden = false;
update();
