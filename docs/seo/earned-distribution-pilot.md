# Earned-distribution pilot 001: Layoff Triage skill

Issue: #293. **Status: prepared, not launched.** Nothing has been posted. Austen
approves the copy, channel and time, and posts it himself.

## Hypothesis

People who were recently laid off, or are helping someone who was, will use a
free, plain-text AI instruction file that tells them what to deal with first. If
Austen shares it with his own LinkedIn network, some visitors will download it.
That download is the useful outcome, not the page view.

## Destination

- Canonical URL: `https://work.thearcades.me/layoff-triage`
- Why this one: it is free, works on its own, needs no sign-in, and the reader
  can act on it the same day. The page already has its own 1200×630 share card
  and title ("Career Coach in a Bottle: The Layoff Triage Skill"). The only
  promise in the copy below is what the page delivers: a downloadable
  instruction file.
- Not chosen this round: a case study (an employer audience; a different test)
  and the fiction collection (a different audience and a different next action).

## Primary next action and metric

- Next action: download the skill file (`/downloads/layoff-triage-skill.md`).
- Primary metric: `triage_skill_download` events on `/layoff-triage` during
  sessions that arrived through the pilot link.
- Secondary: `campaign_landing` count for the pilot tags (arrivals).
- Reported separately and never merged with these: organic Search Console
  impressions and clicks (#291).

## Campaign link

```
https://work.thearcades.me/layoff-triage?utm_source=linkedin&utm_medium=social&utm_campaign=pilot_001_layoff_triage&utm_content=post_a
```

Use `utm_content=post_b` if the second message is used. The values match the
work site's accepted pattern (`[a-z0-9_-]`, at most 64 characters) and identify
no one. Normal site links stay untagged.

## Draft share messages (pick at most one; both need Austen's approval)

**Post A (personal):**

> When I was laid off, the first thing I did was make tea. The second was figure
> out what actually needed attention that week, and what could wait.
>
> I turned that into a free instruction file you can give to an AI assistant. It
> walks through a layoff in order: what's urgent now, what you learned, where
> your value is, and the smallest next step. There's a one-task emergency mode
> for days when it's too much.
>
> No sign-up. If it helps you or someone you know, it's here:
> [campaign link]

**Post B (short, for sharing into someone else's thread):**

> A free tool for the first week after a layoff: a plain-text instruction file
> for your AI assistant that sorts what's urgent from what can wait. No sign-up.
> [campaign link]

Check before posting: the link opens the page with its share card; the download
works; the copy promises nothing the page doesn't deliver; no testimonials or
results are claimed.

## Observation window and decision rule

- Window: 14 full UTC days starting the day of the post. Record the post URL,
  date and time below.
- Baseline: pilot-tagged arrivals and downloads are zero before launch by
  definition. Codex, which holds the PostHog connection, records the untagged
  `/layoff-triage` downloads for the 14 days before launch as context only.
- Minimum data for a decision: 20 pilot-tagged arrivals. Below that, the result
  is **inconclusive**: report the counts and do not draw conclusions.
- With 20 or more arrivals:
  - **Continue** if at least 1 in 10 tagged arrivals downloads the file.
  - **Revise** (copy or channel) if downloads are under 1 in 10.
  - **Stop** if the post draws complaints or the page fails to deliver.
- This is one observation, not an A/B test. It does not show search-ranking
  impact or cause-and-effect, and visits lost to blockers or app browsers are
  not counted.

## Record (fill in after posting)

| Field | Value |
| --- | --- |
| Approved by Austen | pending |
| Message used | pending |
| Posted where (URL) | pending |
| Posted at (UTC) | pending |
| Window ends (UTC) | pending |
| Tagged arrivals | pending |
| Tagged downloads | pending |
| Outcome | pending (continue / revise / stop / inconclusive) |
| Next experiment | pending |

## Rollback

Stop further sharing. The pilot adds no site code or tracking, so there is
nothing to revert on the site. Do not edit or delete the external post without
Austen's approval.
