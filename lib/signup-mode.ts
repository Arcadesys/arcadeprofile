/** Server-only configuration; unset and every value except true preserve Kit DOI. */
export function kitDirectActiveSignupEnabled() {
  return process.env.KIT_DIRECT_ACTIVE_SIGNUP?.trim().toLowerCase() === 'true';
}

export function signupConfirmationCopy(directActive: boolean) {
  return directActive
    ? 'We will send one confirmation email. Open its link and press Confirm subscription. We will show your next step there.'
    : 'We will send a confirmation email for your request. Kit may send additional confirmation emails before delivery begins.';
}
