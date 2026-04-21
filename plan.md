# Plan

## ActiveCampaign feat branch
- Branch found: `feat/activecampaign-blog-notifications`

## Test
1. Check out the feature branch locally.
2. Run dependency install (`npm install`).
3. Run targeted checks:
   - `npm run lint`
   - `npm test`
   - `npm run build`

## Verify
1. Confirm ActiveCampaign-related changes in `git diff main...feat/activecampaign-blog-notifications`.
2. Manually verify relevant pages/flows in local dev (`npm run dev`).
3. Confirm no unintended file changes before merge.

## Push to main
1. Update local `main` from `origin/main`.
2. Merge `feat/activecampaign-blog-notifications` into `main`.
3. Re-run lint/test/build on `main` after merge.
4. Push `main` to origin.
