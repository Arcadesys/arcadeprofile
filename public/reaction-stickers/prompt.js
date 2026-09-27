/* Pure prompt composition; shared by the browser and Node's built-in tests. */
(function (root) {
  'use strict';
  const robot = 'a friendly round mint-green robot with a cream oval face plate, two near-black eyes, a short antenna with an orange bead, rounded hands, and an orange neck scarf';
  function compose(workflow, options = {}) {
    const custom = (options.reactions || '').trim();
    const labels = custom ? custom.split(/\r?\n/).map(value => value.trim()) : [...workflow.labels];
    if (labels.length !== 10 || labels.some(label => !label || label.length > 80)) {
      return { error: 'Enter exactly ten reactions, one per line, with 1–80 characters each. Or clear the field for the everyday set.' };
    }
    let prompt = workflow.prompt;
    const reference = 'Use the attached image as a visual reference for the same character in every cell: [observed defining features and outfit].';
    const character = options.character === 'robot'
      ? `Use my attached robot reference sheet as the visual source for the same character in every cell: ${robot}. If I have not attached the robot reference sheet, ask me for it before generating.`
      : 'Inspect my attached reference and use it as a visual reference for the same character in every cell. Preserve its defining features and outfit. If I have not attached a reference, ask me for it before generating.';
    prompt = prompt.replace(reference, () => character);
    prompt = prompt.replace(workflow.labels.join(', '), () => labels.join(', '));
    if (options.labels === false) prompt = prompt.replace('Put a large bold near-black label beneath each sticker.', 'Use expressions and poses only. Do not include text labels, letters, or words in the artwork.');
    const notes = (options.notes || '').trim();
    if (notes) prompt += `\n\nMy character details or requested changes:\n${notes}`;
    prompt += '\n\nAdapt gestures to the character’s anatomy. Inspect the finished image for the exact count, order, spelling, character consistency, and complete silhouettes. Repair defects before calling it complete. Deliver an actual downloadable JPG preview; if needed, convert a copy and preserve the original.';
    if (options.finish === 'telegram') {
      const title = (options.title || '').trim();
      prompt += '\n\nI also want a Telegram sticker set. After I review the preview, make one individual transparent static PNG per reaction, suitable for Telegram. Preserve the same character and reaction order.';
      if (title) prompt += ` Proposed pack title: ${title}.`;
      prompt += ' Use the Reaction Stickers skill’s Telegram workflow if installed. Show me the exact ordered pack, emoji, and destination before publishing. Use my connected Bunch uploader if available; otherwise prepare the included local bot-script manifest and run it only in my configured local environment. Never ask me to paste bot credentials into chat. Publish only after I authorize that exact pack and destination. If uploading is unavailable, deliver the PNGs and manifest with clear local next steps. Report a Telegram link only after verifying the created set.';
    } else {
      prompt += ' This request is for a preview only, not publishing or a Telegram upload.';
    }
    prompt += ' If image generation is unavailable, explain that rather than claiming an image was made.';
    return { labels, prompt };
  }
  if (typeof module === 'object' && module.exports) module.exports = { compose };
  else root.stickerPrompt = { compose };
})(typeof window === 'undefined' ? globalThis : window);
