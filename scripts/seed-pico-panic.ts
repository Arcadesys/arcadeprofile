/**
 * Seed the Pico Panic project hub (group) and its launch article (post)
 * directly into Payload. Idempotent — skips if the slugs already exist.
 *
 * Usage: npm run seed:pico-panic
 */
import { getPayload } from 'payload';
import configPromise from '../payload.config';
import { createMarkdownToLexical } from './lib/markdown-to-lexical';

const GROUP_SLUG = 'pico-panic';
const POST_SLUG = 'i-made-a-game-for-a-console-that-doesnt-exist';
const PLAY_URL = 'https://www.lexaloffle.com/bbs/widget.php?pid=picopanic';

const articleMarkdown = `Accessibility forced me to level up — here's how I turned frustration into a dev win.

[**Play Pico Panic in your browser →**](${PLAY_URL})

## Why did you do this?

The day I stopped being able to play Towerfall sucked.

If you're unfamiliar, Towerfall (created by the brilliant Maddy Thorson) is a frantic, 6-player archery brawler. Games are quick, intense, and delightfully "just one more round"-ish. It had been a staple at my parties for years — one of the last couch co-op games I could enjoy with friends.

But over the past five years, my central vision steadily tanked, making it harder and harder to track tiny arrows and archers.

Then, while helping a buddy rig up a retro gaming station, I stumbled onto Pico-8 — and now I'm obsessed.

(But seriously, give Maddy's games a go! She also designed Celeste and its sequel!)

## What is Pico-8?

Losing my central vision meant losing Towerfall. But Pico-8 gave me a new way to play, design, and win.

After wrestling scope creep with BlindTab and some other unreleased prototypes, I knew I needed something smaller, tighter, and easier to ship. Pico-8 became my new development sandbox. Its hard rules — only 16 colors, just 64k for code, a tiny 128x128 pixel screen — forced me to prioritize ruthlessly and focus on the essentials.

And its script is based on Lua, which I'd been meaning to learn for years. So that's a bonus.

But here's why Pico-8 became such a big win for me personally:

- **Accessibility:** Fewer pixels means clearer visuals. For someone with central vision loss, it's a game changer — I can comfortably play from my couch without binocular glasses or endless squinting.
- **Instant Gratification:** The projects are small enough to complete quickly. It's like digital cross-stitch — manageable, satisfying, and achievable in just a few focused sessions.
- **Risk-free Learning:** I got to finally scratch a childhood itch — designing my own game — in an environment where mistakes are low-stakes and rapidly instructive. (I got a crash course in functional Lua programming, for example, while trying to reduce the size of my code to fit into a cartridge.)

In short, Pico-8 hasn't just made gaming accessible again. It's reintroduced joy into my development process.

## Turning Limitations into Strengths

When I dive into a new project, my first thought is always: "How can I turn my weaknesses into something charming that will delight my customer?"

After some research, I found that Pico-8 games usually emerge from small teams or solo devs, reminding me of early gaming history — particularly the Atari era, where ambitious games often came from a single creator. Inspired by Dani Bunten's obscure-but-classic Atari 2600 game M.U.L.E., I aimed for that vibe: overly ambitious but charmingly constrained.

My design goals were clear:

- **Fun**, once you crack its core mechanic.
- **Fast**, preferably real-time action.
- **Multiplayer**, scratching that Towerfall itch.
- **Cryptic on the surface**, sparking curiosity.
- **Easy to teach**, minimizing friction for new players.
- **Nostalgic**, feeling like a long-lost prototype that almost made it big.

After digging through my board game shelf for inspiration, I landed on Icehouse. It's an obscure, real-time board game that uses the Looney Pyramids system. I adore the game, but the rules are complicated and difficult to teach. (It also doesn't use a game board at all, which is an additional barrier to understanding the game.)

So I thought: what if I "demade" Icehouse and automated away the finicky bits of this game I love?

Thus, Pico Panic was born.

## So You Made a Game. What's in It for Me?

Building Pico Panic wasn't just a hobby project — it was a hands-on experiment in agile thinking and AI prompting. I figured out how to get Copilot to write code for the Pico-8 and proceeded to build out the initial prototype. Then, I learned how to prompt my Copilot agent to write Pico-8-friendly code, and I was off to the races.

After 10 days, 3 refactors, and 2 tickets left to finish on my 1.0 release board, here's what I learned about agile development by drinking my own champagne and running a development project solo.

### Ask, Then Tell

In the age of AI, understanding the problem is even more important than knowing how to fix it. And sure, I knew that from my years in project management, but I didn't *feel* what it meant to do that. I'd get caught up in execution, or prioritizing features being suggested by stakeholders, assuming the problem would become clearer the further down the rabbit hole we got.

But now that AI can automate away much of the write-break-fix process that makes development tedious, the importance of problem-solving has never been clearer. You should be able to, in plain English, explain the problem and solution to a layperson before you start working on functionality. Doing anything else before that point burns both time and money that you'll later spend on refactors and rewrites.

The temptation to shortcut this step has never been higher, now that we all have AI geniuses in our pockets that get things 90% right, but the cost for skipping this step has never been higher. If you don't clearly understand your solution, you can't communicate clearly about it, and you're bound to end up with miscommunication getting in the way.

If you're using AI, don't give the robot the wheel on the first go. Try to solve the problem on your own, using pseudocode, sentence fragments, or even a voice recording of you braindumping about the solution. Set your IDE to "ask" mode and let it propose solutions first. You'll get better quality code, and as a bonus, the AI teaches you new patterns and conventions as you work. It echoes agile principles — focusing on problems first, solutions second.

### Own Your Architecture

One of the reasons BlindTab spiraled early was because I didn't define my architecture upfront — and the AI filled the vacuum with chaos. I was experimenting with multiple stacks, and each time I asked, "how do I do X?" it answered — helpfully, confidently, and differently. Before long, I had three overlapping build systems stepping on each other's toes. The AI wasn't wrong; I just hadn't told it what right looked like. Without a clear definition of success, I let the AI brute-force its way through, and I paid for it with weeks of rework.

With Pico Panic, I came in with a tighter scope and clearer boundaries. I knew what tools I wanted to use (Pico-8, Lua, simple local dev), and more importantly, what I *didn't* want — build systems, dependency hell, scope creep. That mental constraint gave the AI something to aim for. Instead of wandering through ten different versions of "how to make a game," I could guide the conversation toward focused, testable solutions. My prompts were cleaner, my feedback loops faster, and the prototype landed on its feet.

Pico-8 also hammered home some essential engineering lessons. I couldn't brute-force a feature when I had 64k of code to work with. I had to learn functional thinking, minimize side effects, and be deliberate about where and how data flowed. That discipline didn't just help me ship Pico Panic — it gave me better instincts when working with AI on any platform. Constraints aren't just a design tool. They're a leadership tool. If you don't set the rules, the robot will make up its own.

### Start Small, Fail Fast

Small, rapid experiments with quick feedback loops are essential. I vibe-coded my way through an initial prototype to see if the game concept was feasible, but the second I tried to productionalize it the code fell apart. As much as I wanted vibe-coding to be a one-stop answer for my coding woes, there is no cheat for "sit down, think through the problem, and decide what you're going to do about it" in the problem-solving arc.

Try making small things, then building that into progressively bigger things. For me, that meant setting up the cursor behavior first. Once that was shining, I'd bolt something else onto it, until I had a working prototype.

### Git is Hard

Seriously — if your coworkers are struggling with Git, give them some grace. Version control isn't just a tool; it's a whole mental model shift. It asks people to think in branches, timelines, and detached heads — stuff that sounds like a time travel accident, not a work task. Even with AI helping out, it's easy to break something and have no idea what you did wrong. And when your files vanish or your commits collide, Git's error messages feel like riddles written by a spiteful librarian.

AI can speed up the learning curve, but it doesn't replace the slow muscle-building of understanding. I've watched smart, capable devs get paralyzed by a simple rebase gone sideways. That doesn't make them bad at their job — it just means Git still sucks to learn. A little empathy goes a long way. Better yet, help them write a fallback plan. Teach \`git reflog\` like it's CPR. Make version control less about fear and more about recoverable experiments.

## Initial Prototype

[**It's playable here!**](${PLAY_URL})

You can access it right from your web browser. Cursor keys move you around the screen. Z and X allow you to place pieces on the board. For a real challenge, grab a friend or two and try to learn to play!

## Roadmap

- Sound effects and a good soundtrack: I'm a blind person and deserve some kickin' jams while I'm playing my new game with friends.
- Create a found-footage style YouTube video explaining the rules and promoting the game, as if found on a VHS tape from the 80s.
- Local playtesting to validate gameplay and improve user experience.
- Publish the game on [itch.io](http://itch.io) and make tens of dollars doing it!

Has anyone else here tried making a game for this fantasy console? I'm already planning to write a second one with my wife — they're so much fun!

Play the prototype, steal the source, and let's make more weird games together.
`;

async function main() {
  const payload = await getPayload({ config: configPromise });
  const markdownToLexical = await createMarkdownToLexical(payload);

  // 1. Group ─────────────────────────────────────────────────────────────────
  const existingGroup = await payload.find({
    collection: 'groups',
    where: { slug: { equals: GROUP_SLUG } },
    limit: 1,
  });

  if (existingGroup.docs.length === 0) {
    await payload.create({
      collection: 'groups',
      data: {
        title: 'Pico Panic',
        slug: GROUP_SLUG,
        description:
          'A frantic, multiplayer real-time pyramid-stacking game built for Pico-8 — a fantasy console with 16 colors, 64k of code, and a 128x128 screen. A demake of Icehouse, born from accessibility constraints and a love of M.U.L.E.-era ambition.',
        category: 'experiments',
        status: 'in-progress',
        featured: true,
        homeHighlight: true,
        external: false,
        tags: [
          { tag: 'pico-8' },
          { tag: 'lua' },
          { tag: 'game-dev' },
          { tag: 'accessibility' },
        ],
        projectCTA: {
          label: 'Play in browser',
          href: PLAY_URL,
          type: 'experiment',
        },
        resources: [
          {
            label: 'Play Pico Panic (Lexaloffle BBS)',
            href: PLAY_URL,
            kind: 'experiment',
            description: 'Playable prototype in your browser.',
            external: true,
          },
        ],
      },
    });
    console.log(`[created] group: ${GROUP_SLUG}`);
  } else {
    console.log(`[skip] group ${GROUP_SLUG} already exists`);
  }

  // 2. Post ──────────────────────────────────────────────────────────────────
  const existingPost = await payload.find({
    collection: 'posts',
    where: { slug: { equals: POST_SLUG } },
    limit: 1,
  });

  if (existingPost.docs.length === 0) {
    const lexicalContent = markdownToLexical(articleMarkdown);
    await payload.create({
      collection: 'posts',
      data: {
        title: "I made a game for a console that doesn't exist in 14 days",
        slug: POST_SLUG,
        excerpt:
          "Accessibility forced me to level up — here's how I turned frustration into a dev win, building Pico Panic for Pico-8 in two weeks.",
        content: lexicalContent as any,
        publishedDate: '2025-05-30',
        publish_status: 'published',
        newsletterSent: false,
        group: GROUP_SLUG,
        order: 1,
        author: 'Austen Tucker',
        tags: [
          { tag: 'pico-8' },
          { tag: 'game-dev' },
          { tag: 'accessibility' },
          { tag: 'ai' },
          { tag: 'lua' },
        ],
      },
    });
    console.log(`[created] post: ${POST_SLUG}`);
  } else {
    console.log(`[skip] post ${POST_SLUG} already exists`);
  }

  console.log('\nDone.');
  process.exit(0);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
