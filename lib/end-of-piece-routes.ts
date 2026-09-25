// Reader routes that render <EndOfPieceSubscribe> right after the piece.
// The sitewide footer form stays hidden there so readers see one signup, not two.
const END_OF_PIECE_ROUTES: readonly RegExp[] = [
  /^\/projects\/(?!queer-columns\/)[^/]+\/[^/]+\/?$/,
  /^\/novels\/it-takes-a-zoo\/[^/]+\/?$/,
  /^\/this-is-what-i-do-for-fun\/[^/]+\/?$/,
  /^\/portfolio\/[^/]+\/?$/,
  /^\/lab\/[^/]+\/?$/,
];

export function hasEndOfPieceSignup(pathname: string): boolean {
  return END_OF_PIECE_ROUTES.some((route) => route.test(pathname));
}
