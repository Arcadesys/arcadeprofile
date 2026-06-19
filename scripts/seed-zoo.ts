/**
 * One-time script: seeds "It Takes a Zoo" posts (poem + Cold Boot parts 1-8)
 * into the Payload database via the local API.
 *
 * Usage: npx tsx --require ./scripts/patch-next-env.cjs scripts/seed-zoo.ts
 */

import { getPayload } from 'payload';

import type { Post } from '../payload-types';
import configPromise from '../payload.config';
import { createMarkdownToLexical } from './lib/markdown-to-lexical';

type ZooSeedPost = {
  title: string;
  slug: string;
  order: number;
  publishedDate: string;
  scheduledPublishDate: string;
  tags: string[];
  excerpt: string;
  content: string;
  meta: NonNullable<Post['meta']>;
  discoverability: NonNullable<Post['discoverability']>;
  newsletterHeading: string;
  newsletterDescription: string;
};

async function main() {
  const payload = await getPayload({ config: configPromise });
  const markdownToLexical = await createMarkdownToLexical(payload);

  const posts: ZooSeedPost[] = [
    {
      title: 'It Takes a Zoo',
      slug: 'it-takes-a-zoo',
      order: 0,
      publishedDate: '2026-05-03',
      scheduledPublishDate: '2026-05-03T14:00:00.000Z',
      tags: ['fiction', 'poetry', 'it-takes-a-zoo'],
      excerpt: 'An introductory poem for the It Takes a Zoo to Raise a Child series, by Jumpin’ Jackrabbit (1973–2040).',
      content: `_by Jumpin’ Jackrabbit (1973–2040)_

It takes a Zoo to raise a child,
With a heart so pure and character mild.
It takes a village to show them the way,
To keep their spirit wild and fears at bay.

It takes a Zoo to give that child space,
And plenty of love to fill their hearts apace.
To guide them through the storms and light their way,
And help them grow in every shade of day.

That Zoo can raise its own, too—
Every soul’s a child, born wild and true.
So, in our Zoo, we learn to stand tall
And answer the rhythms that echo through us all.

So let us raise our cups high and close our eyes—
A toast to every child who may realize
That in this world, no matter what they do,
They’ll always find a home within the Zoo.`,
      meta: {
        title: 'It Takes a Zoo',
        description: 'An introductory poem for the It Takes a Zoo to Raise a Child series, by Jumpin’ Jackrabbit (1973–2040).',
        keywords: 'fiction, poetry, it takes a zoo, serialized fiction, chosen family',
      },
      discoverability: {
        search_summary: 'Opening poem for It Takes a Zoo to Raise a Child, a serialized fiction series about chosen family, surveillance, and finding belonging in unexpected places. Written in-world by Jumpin’ Jackrabbit.',
        social_hook: 'A new serialized fiction series begins Sunday. It starts with a poem. It ends somewhere you didn’t expect. Welcome to the Zoo.',
      },
      newsletterHeading: 'It Takes a Zoo',
      newsletterDescription: 'A new series begins. This is the poem that opens it — by Jumpin’ Jackrabbit, who knows a thing or two about raising a child in strange times. Cold Boot, the first chapter, starts Monday.',
    },
    {
      title: 'Cold Boot — Part 1: Morning',
      slug: 'cold-boot-1-morning',
      order: 1,
      publishedDate: '2026-05-04',
      scheduledPublishDate: '2026-05-04T14:00:00.000Z',
      tags: ['fiction', 'serialized', 'cyberpunk', 'cold-boot', 'it-takes-a-zoo'],
      excerpt: 'Jamie works in a virtual cubicle farm where the sun isn’t real and her boss is named Stinky Pete. Then her coworker slides her a card with three words: “I’m about to change your life.”',
      content: `My job is in hell.

Well, not Hell, per se. At least, not the capital-letter Hell of old; if you wanted that experience, you had to travel to a different server. But every workday, I'd plug myself into the computer and transport my consciousness to a different reality.

Still hot, though. Always skin-pricklingly hot. Haven't seen snow since I was seven.

There, life moved at a different pace. Virtual work hubs overclocked your brain, because capitalism couldn't leave well enough alone with eight hours of labor a day. I sat in a greige cubicle, staring at a greige monitor, on a floor full of folks who woke up every day only to step into a fantasy world of overwhelm and, well, _despair._

"Jamie, are you doomscrolling again?"

It was Anabelle, my coworker for this RIF cycle. They never let people build relationships here. Relationships led to unions, and nobody in the management suite wanted that. Better to shuffle people around every few weeks, fire a few, hire a few more, just to keep people scared.

Why not? They owned us, lock, stock, and barrel, and we'd had a chance to stop it, but we failed—

"Jamie?"

"Sorry." I shook off the thought and leaned back in my chair. The "sun"—as much as there could be sun in a virtual environment—cast a little warmth on my face. Still didn't feel real. Everyone said it did, but let me tell you: I grow plants. Like, real-world plants. So I know a thing or two about how sun should feel.

Anabelle cocked her head to one side. She was a pretty thing, with straight blonde hair and blue eyes that sparkled with starlight.

"Something on your mind?"

"Just tired." I waved my hand at the window. "Tired of all... _this_. It's soul-sucking. Everyone wants your money. Nobody just, like..."

"Like the world is a little too flat?"

"Or boring, I guess. Overwhelming, but boring."

Anabelle gave a wicked smile. She slid me a card with a virtual address. Private server. And the ID number was low—very low. Whatever this place was, it had history.

I turned the card over. No name. No pop-up holo-ad for the VIP experience at some virtual bar. Just a scrawled ID: \`zoo://001.server/knockthree\`.

"Let's take an early lunch," Anabelle said. "I'm about to change your life."

I blinked. "This isn't one of those NSFW LARPs, is it? I swear to god if I walk in and someone's yiffing a dragon—"

Anabelle rolled her eyes. "It's not like that. Or—okay—if that's your thing, they'd let you. But no. It's quiet. Safe. Weird. I dunno." She shrugged. "It just helped when I needed it."

That made me pause. I'd never heard her talk like that—soft-edged, vulnerable. She was usually the sarcastic one in the break room, the only person who made me laugh during All-Hands.

"Just knock three times," Anabelle said. "And don't bring your work avatar."

Then she stood, stretched like a cat, and winked out of existence. Her smile, Cheshire-like and broad, persisted long enough to tease me with some parting words:

"C'mon, Jamie. Let's go somewhere with _real_ sunlight."

---

I came home from a virtual cubicle farm to a greige apartment whose walls I couldn't paint and whose furnishings I couldn't customize, unless I was willing to pay for a customization license. Above, an all-seeing eye monitored my blood pressure and pulse in real time so the data could feed a model deciding what meds I was entitled to take.

I called him Stinky Pete.

"Evening! Dinner today is Hormel Spinach and Hot Dog hash."

"Yum," I said, rolling my eyes.

The machine droned on: "Your iron is down again, and your salary doesn't cover organic foods. We could invest in more food if you—"

"—if I took the promotion, I know, I know." I scoffed. "Can we not talk about work, please?"

"Your health is important to your employer," Stinky said. "But I will respect your choices. Dinner and Holovids tonight, I'm guessing?"

I tapped the card against the table, a soft click.

"Not tonight, Stinky. Got an invite to a private server."

"I need to warn you that private servers can harbor malware that could negatively affect your mental health—"

I took off my bra and slung it over Stinky's eye. (I could play it off as a mistake if anyone ever audited the film later.) Then I stretched out on my twin bed and wheeled out my rig.

It was a small studio. Most people had studios these days. I lived in a wet-bulb state, so going outside was a death sentence for most months of the summer. Why pay to cool 1200 square feet when most folks spend their time in full-dive?

I pulled a jack from the rig and, searching with my fingers, plugged it into a port behind my ear. Then Stinky, my shitty dinner, and the world fell away into something new.

Anabelle better be right about this place.`,
      meta: {
        title: 'Cold Boot — Part 1: Morning',
        description: "Part 1 of Cold Boot, a serialized story. Jamie's coworker slides her a card to a private server with three words: 'I’m about to change your life.'",
        keywords: 'fiction, serialized, cyberpunk, short story, cold boot, virtual reality, queer fiction',
      },
      discoverability: {
        search_summary: 'Opening installment of Cold Boot, a serialized cyberpunk short story about chosen family, surveillance, and finding the door that stays open. Jamie hates her virtual cubicle job. Anabelle hands her a card.',
        social_hook: "New serialized short story starts today: Cold Boot, Part 1. Jamie’s job is in hell — not capital-H Hell, that’s a different server — and her coworker just handed her a card to somewhere quiet, safe, and weird.",
      },
      newsletterHeading: 'Cold Boot — Part 1: Morning',
      newsletterDescription: 'A new serialized short story starts today. Eight parts, every Monday/Wednesday/Friday. Part 1 introduces Jamie, her algorithm boss Stinky Pete, and the card that changes everything.',
    },
    {
      title: 'Cold Boot — Part 2: Dinner',
      slug: 'cold-boot-2-dinner',
      order: 2,
      publishedDate: '2026-05-06',
      scheduledPublishDate: '2026-05-06T14:00:00.000Z',
      tags: ['fiction', 'serialized', 'cyberpunk', 'cold-boot', 'it-takes-a-zoo'],
      excerpt: 'A kindness to a vending machine becomes a stumbling encounter with a neighbor named Geoff. By the time Stinky Pete has finished cataloguing her vitals, Jamie has only one move left: plug in.',
      content: `I ordered a standard protein ramen from the Vend-O-Matic in the building's basement and slurped it down in silence. The lobby of my building had a tiny spot for eating that, when you angled yourself _just so_, gave you three inches of sunlight. (I petitioned the building to put in a spider plant or something, just to freshen up the place, but Stinky's friend in management said no.)

But I loved it. The polarized glass took just enough UVA out of the air to make the light tolerable, and if you closed your eyes and imagined hard enough you could make believe that you were in one of those open-air food stalls of old, enjoying a taco and a gentle breeze.

Those certainly were the days!

Behind me, a man put a dollar into the machine and punched some buttons. Nothing happened. He banged on it. Stinky's Friend flashed a red warning light.

"TENANT: YOU HAVE BEEN FINED $10 FOR PETTY VANDALISM. WE WILL DEDUCT THE CHARGE FROM YOUR NEXT PAY CYCLE."

Usually I'd let him struggle. But today, I guess Anabelle's invitation had me feeling charitable. I turned in my chair, away from the brilliant sunlight and brown grass outside, and cleared my throat.

"You gotta sweet-talk the machine."

He looked at me and his eyes widened with recognition. I felt terror cling at my throat.

"Do I know you?"

I shook my head. "I don't think so. Jamie. I'm in 41J."

"Geoff," he said, extending his hand. "I live here too. What do you mean, 'be nice'? It's a machine."

"It's an AI, my friend." I smiled, stood from my seat, and stepped over to caress the trim of the machine. "So deep down, even if it ain't, it thinks it's conscious. So if you treat it with a little sugar—"

I pressed the buttons and the machine chirped a happy tune.

"Try again."

He put a cup into the machine and, soon after, he had a bowl of ramen to match mine. I let my touch linger on the machine for a moment longer. "See? You just have to be kind to the robots."

"Uh," he said, now panting. "Thanks. You're uh... very nice."

"Are you okay?"

He loosened the top button of his shirt and his face went beet red. "You sure do talk nicely to machines, don't you?"

"I'm learning how to be better with people, too." I shrugged. I kept catching Geoff staring, though, and before he could do anything dangerous, I knew I needed to end the encounter early.

"Enjoy your ramen," I said. "See you around, Geoff!"

His jaw struggled to work around the words. "Yeah... see you."

---

"Stupid, stupid, stupid! I even gave out my apartment number!"

I did the dishes. Then I alphabetized my spice rack. Then I told Stinky Pete to shut up, and that helped a little.

But I kept replaying the conversation with Geoff in my head.

Oh god, he thought I was _flirting_. He could break in while I'm out and do _horrible things to me,_ just like mama said when I moved to the city—

"Your heart rate is elevated again. I see you talked with Geoff in Apartment 51B. Did he harm you?"

"...no. I'm just a dumbass."

Stinky Pete's all-watching eye glinted, as if to rub it in my face.

"We are all stupid from time to time." He hummed a little tune to cover his thought process. "If you like, I could activate additional security precautions. An extra deadbolt is available for the low price of $2.99 a month. Financing and discounted rates are available!"

"I—" Pausing, I shook my head. "Why in the world am I talking to you?"

"I am programmed to meet your needs," Stinky said.

The feeling wouldn't leave. Hope curled under my ribs like a warm animal, nosing at places I'd forgotten.
I wanted to crush it. Before it got big enough to need things from me. Before it tricked me into wanting anything back.

I looked at the headset. Thought about being slippery. Shiny. _Sleek._

"I worry about this unregulated instance," Stinky said. "Your vitals have been all over the place since you tried it."

I felt a smile crawl onto my face. "Yeah, Stinky. They were."

"Trust can only hurt your bottom line."

I flipped off the camera. Snatched the jack off the floor.
"Shut up, Stinky. I'd reprogram you if I could."

I plugged in.

And the greige world fell away, thank _fuck._`,
      meta: {
        title: 'Cold Boot — Part 2: Dinner',
        description: 'Part 2 of Cold Boot, a serialized story. Jamie sweet-talks a Vend-O-Matic, accidentally rattles a neighbor, and gets one step closer to the Zoo.',
        keywords: 'fiction, serialized, cyberpunk, short story, cold boot, AI, neurodivergent fiction',
      },
      discoverability: {
        search_summary: "Part 2 of Cold Boot. Jamie meets her neighbor Geoff at the building's Vend-O-Matic, panics afterward, and finally takes Anabelle up on the invitation to a private server. Stinky Pete watches from the ceiling.",
        social_hook: 'Cold Boot, Part 2 is live. Jamie sweet-talks a vending machine and accidentally short-circuits her neighbor in the process. Then Stinky Pete starts asking questions.',
      },
      newsletterHeading: 'Cold Boot — Part 2: Dinner',
      newsletterDescription: "Part 2 of 8. Jamie’s kindness to a machine costs her more than she planned, and the only way out is in.",
    },
    {
      title: 'Cold Boot — Part 3: Rain',
      slug: 'cold-boot-3-rain',
      order: 3,
      publishedDate: '2026-05-08',
      scheduledPublishDate: '2026-05-08T14:00:00.000Z',
      tags: ['fiction', 'serialized', 'cyberpunk', 'cold-boot', 'it-takes-a-zoo'],
      excerpt: 'There’s no sun on the server. Just rain, jazz, a tavern that reveals itself like memory — and a missing logout button that nearly sends Jamie running.',
      content: `There was not a lick of sunlight to be found on the server.

It was a void where gentle, late-summer thunderstorms seemed to drag on forever. Ahead of me, a single two-story building rose from the darkness, its lights in the windows welcoming me. I could hear laughter, music, conversation—and not a _single advertisement._

Everything was so clear here! Puddles gently sloshed against my shoes. The streetlight hummed above. And the wind—the wind! I could feel it slide over my body in tiny rivulets, each gust its own experience.

_Who in the hell coded this place?_ I reached for the doorknocker and gave it three raps.

The door creaked open on its own.

Warmth rolled out—woodsmoke and citrus, jazz on an old phonograph, and something like the smell of clean laundry just before a summer storm. The light inside was golden but soft, like it had been filtered through amber glass and old memory.

"New login," someone called. "Be nice."

I stepped in.

The tavern didn't load in like other spaces. It _revealed_ itself. Booths materialized like memories. Shelves of shimmering bottles blinked into place with soft pings, like they'd just remembered what they were. The floor creaked beneath me. Water dripped somewhere, steady and reassuring.

And at the bar stood Anabelle.

Or—her _self,_ I guess. Her avatar wasn't corporate-standard anymore. No pressed blouse or sensible shoes. Instead:

A tall, plush-furred cat, coat patterned in cream and honey, wearing soft suspenders over a barista's apron. Her ears flicked when someone nearby swore. Her tail curled thoughtfully around one ankle as she dried a glass with a rag that might've been coded from static.

Nearby, a half-dozen other creatures milled at the bar, minding their own business. One, a lady in a low-poly fox costume, tipped her white cane in my direction when we met eyes. "Welcome home," she said, her smile warm.

Anabelle—now a cat!—looked up when she saw me.

"Oh," she said, in the same voice as before, just warmer somehow. "You made it."

I opened my mouth. Closed it again. I nodded toward what I could only explain as a teenage couple—a fox and a cat, I guessed—standing by a jukebox, eyeing me with suspicion.

"Cute kids," I said. "So you're a furry?"

"This place is more than that," she said. Without prompting, she slid a drink toward me—lavender, steaming gently, in a glass shaped like a blooming flower.

"What is it?" I asked.

She tilted her head, whiskers twitching. "No clue. You looked like you needed it."

I sipped, and the feeling of campfires and toasted marshmallows washed over me. Not the actual things—just... just a _feeling_ of kindness, of safety, of trust.

"This is incredible," I said.

Anabelle smiled. "This is just the beginning."

The kids conferred. Then, scowling, a teen in a patched-together hoodie stomped out from behind the jukebox, tail flicking. Her fur ran in short, dark tabby stripes with an undercurrent of hot-pink glitch. She couldn't have been older than seventeen—her avatar had braces, for god's sake.

Her name was Kat. And Kit was the quiet one by the jukebox, hiding his face. Hiding behind his leg was Kitten. I didn't know them yet. But I would.

The Zoo had a funny way of making you care.

Kat stormed up to the bar and slammed both paws down on the counter, glaring up at Anabelle like she was ready to start something.

"I told Geoff not to call me or Kit 'kid' anymore! I'm _not a child._ We turn eighteen in a week!"

Anabelle blinked, unbothered. She turned the rag over in her hands. "Okay, and because you're such an adult, you want me to fight your battles for you?"

Kat hesitated again. Her shoulders dropped.

"I just don't want people assuming stuff," she muttered. "Like... you know." She gestured to the air. "Mom and Dad."

"Fair." Anabelle pulled a chipped mug from under the counter and poured something fizzy and green. "Want a weird soda?"

Kat narrowed her eyes. "Is it cursed?"

Anabelle leaned in. "Only mildly."

That got a laugh, short and sharp. Kat sat on the stool next to mine, pulling her hoodie up over her head, retreating like a turtle.

After a pause, she looked at me and said, "So what are you?"

"Excuse me?"

She giggled. "Come on. Nobody comes to this bar and doesn't have a TF dream of some sort. That's why Jack built the Zoo, after all."

"TF?" I looked to Anabelle. "Like, the transformation fetish holovids?"

Anabelle's cheeks flushed under her fur. My eyes narrowed; she smiled a goofy smile. "Okay yes, it _is_ that type of server. But I can explain!"

"There's kids here!"

Kat snapped a glare at me. "Hey!"

Anabelle shushed her with a finger. "I... listen. It's not like that. We have strict rules about taking anything like that to a private room. It's more... I don't know."

"It's freedom," Kat blurted. "If you want it. Let me show you."

The voices at the bar shifted, doubled, blurred—
someone had antlers now, someone else unfurled wings, and a tiny child in the back became a full-grown bear between one blink and the next.

I stared at my own reflection in a rain-streaked window. It kept flickering—sometimes me, sometimes… a shark?
I tried to click through the menu, desperate for the familiar grid of avatar options.

Nothing.
No logout button.
No red "X."
No safe reset.
_No menu._

The air pressed in. I could hear my heartbeat _inside_ the code.

A gentle, cartoonish paw landed on my shoulder.

Jack, the proprietor, looked more animated than anyone else in the room—a wiry rabbit with a wry smile and eyes older than the sky. His avatar glowed as if he were a cel-shaded cartoon badly fitting in with reality.

"Howdy! Been a while since we had new blood-- oh, right." He took my shoulders into his big, fuzzy paws and began to breathe, slowly and intentionally, until I matched his rhythm. We stayed like that until I couldn't hear my heartbeat pulsing in my ears anymore.

"What was that?"

"Old trick I learned when I was in psych ward," he said with a laugh. "Don't worry, they cleared me to be around people again, promise!"

I kept tapping at my wrist. "Am I dreaming? Why is there no logout?"

"...Did I just get cybernapped?"

Jack held out a paw. "None of that, dear."

"I didn't mean to come to a server like this," I said. I half-expected Anabelle to bust out in laughter, as if this were all an elaborate prank.

"I'm not—I'm not _like you people._ I'm just visiting."

"I add modifications for my regulars," Jack said. Then, holding a paw to his chin, he reconsidered his words. "I think we got off on the wrong foot. Jumpin' Jack Flash here."

"Jamie," I said. "No last name."

He nodded and extended his hand. We shook. I felt so silly shaking hands with a rabbit paw, but I smiled and did it anyway.

"You're still safe," he said. "We just have regulars who, uh, don't logout much. Just click your heels three times and think about going home."

I snickered. "Really?"

"You're on an old gay man's server," he said, laughing. "What you see is what you get, warts and all."

I clicked my heels and, sure enough, a doorway appeared beside me. Through it I could see a feed of Stinky's camera watching over my lifeless body.

"How?"

"I wrote my own routine," Jack said, shrugging. "You ready?"

"I'm still so confused. Why get rid of the logout menu?"

Jack smiled, put his paws over my hands, and led me to the door. "Some answers have to be earned," he said, smile growing ever warmer.

"I hope you come back to seek them."`,
      meta: {
        title: 'Cold Boot — Part 3: Rain',
        description: 'Part 3 of Cold Boot. Jamie arrives at the Zoo for the first time, meets the regulars, and panics when she can’t find a way out.',
        keywords: 'fiction, serialized, cyberpunk, short story, cold boot, furry, transformation, chosen family',
      },
      discoverability: {
        search_summary: 'Part 3 of Cold Boot. Jamie’s first visit to the Zoo: a private server that runs on rain, jazz, and a strict no-logout-button policy. She panics. Jack the proprietor shows her the door anyway.',
        social_hook: 'Cold Boot, Part 3 is live. Jamie knocks three times. The door opens to a tavern made of rain, jazz, and people who don’t have logout buttons. Then she panics.',
      },
      newsletterHeading: 'Cold Boot — Part 3: Rain',
      newsletterDescription: 'Part 3 of 8. Jamie steps into the Zoo for the first time. There’s a cat behind the bar who used to be her coworker. There’s no logout button anywhere.',
    },
    {
      title: 'Cold Boot — Part 4: Greige. Again.',
      slug: 'cold-boot-4-greige-again',
      order: 4,
      publishedDate: '2026-05-11',
      scheduledPublishDate: '2026-05-11T14:00:00.000Z',
      tags: ['fiction', 'serialized', 'cyberpunk', 'cold-boot', 'it-takes-a-zoo'],
      excerpt: '“So when were you gonna tell me this was a fetish server?” Anabelle has explaining to do. Jamie has truths she hasn’t said out loud in years.',
      content: `Overhead, I heard Stinky's camera whirr as it zoomed in to take my vitals. The room was clean again—antiseptic, almost—with the clothes properly put away and the greige surfaces shimmering with a freshly polished sheen.

"Your blood pressure is elevated. As I said before, private servers can harbor malware—"

"Shove it, Stinky Pete."

The rig beside my head chimed; she answered. Voice and video only.

Anabelle's cat avatar blinked on the display. I threw the feed to Stinky's video processor, and then Anabelle was fully present in my room. Sure, I couldn't touch her, and she was still—well—a _cat_, but other than that she was the same old coworker.

"So."

"So when were you gonna tell me this was a fetish server?"

"I... ugh." She rubbed her shoulders as if she were a cat making biscuits. "It's not like that. I promise. You _know_ me, Jamie. I'm not about to mess with kids."

I ignored her and went about watering my two pots of chives. It wasn't much, but it went with anything and was a nice change from the FLA-VOR-QUE packets I could get on company scrip.

"Look, I..." She sighed and then met me with a desperate look. "They're my family, Jamie. Just as much as your mom or your dad might be, they're mine.

"And... fuck." She slapped her thighs, but the fur stifled the sound. "I just made an assumption that you could use something like this, and it was probably stupid to bring you here."

"I thought maybe you'd see it and _get it,_ you know? Not the kinks. The… the freedom. The joy. The room to breathe without someone labeling you broken.

"I'm really sorry, Jamie."

For a moment I felt my world blur. The greige gave way to colorful, neon purple sharkskin. My hands grew long and slender, and I felt a sudden rush of power, as if I could leap into the ocean and swim forever—

_Oh._ That's not how that's supposed to happen.

"Still there?"

"It felt so real," I whispered.

The hologram tried to wrap one fuzzy arm over my shoulder, but it just clipped through my chest. The gesture still meant something, though.

"Oh yeah, Jack runs some gnarly subroutines on the Zoo. It's more intense than what you can find on the public net."

"Why?"

She smiled and swung the camera to capture the scene going on in the universe. Someone had brought a milkshake to the bar that was turning everyone into cows, and the whole place had been wrecked in the process. Mysterious spurts of milk flew in from off-camera, and Anabelle ducked them with the easy agility of someone who'd seen things like this before.

"Because it's fun!" She leaned in, whispering. "And besides, Stinky Pete can see you blushing."

I smacked the hologram away. "Okay, okay! Fine." I looked at my hands. They still felt, well, _smooth_, and I let myself focus on what that could feel like. "Yes, I've read some."

"_I knew it!_" She pumped her fist in triumph before looking off-camera. "I think we got one!"

The room cheered. I couldn't help smiling.

"Like, once or twice—back on the old net—I'd find stories like that."

"And?"

"They made me feel things. I guess..." I shrugged. "I guess I'd forgotten what that could _feel_ like, you know?"

"Dry spell?"

I shook my head. "Ace."

Her eyes widened, but she didn't ask any questions.

"Kat threw one of her filters on you before you logged out. What did you see in the mirror?"

I laughed, mostly at myself. "A shark," I said. "But, like, one that could breathe air. Legs, too. Looked weird."

I stared at my hands. They still felt a little… slippery. But I could move them. I imagined sliding into the cool surf and just... disappearing from the world. Nothing but clear water and no one to stop me from—

"See you soon?"

Her voice shook me back to reality. The slipperiness was gone, and I felt a heaviness in my heart. Not that I thought I was a shark at heart or anything like that. I just liked, well...

I guess I liked being _different_.

My eyes narrowed and I looked into the camera to show I was serious. "But you promise, no kids involved, right?"

"I promise you, friend." She crossed her heart. "Hand to God, I'd murder anyone who hurt the Kats. Especially that way."

"The Kats?"

"Long story," she said. "Doesn't matter."

I thought long and hard.

"...Okay. But why wasn't there a logout button?"

Anabelle grinned, all teeth.

"There never is. Not in the good places."`,
      meta: {
        title: 'Cold Boot — Part 4: Greige. Again.',
        description: 'Part 4 of Cold Boot. Jamie comes back to her greige apartment and Anabelle calls. They have a hard, honest conversation.',
        keywords: 'fiction, serialized, cyberpunk, short story, cold boot, asexual, queer fiction, chosen family',
      },
      discoverability: {
        search_summary: 'Part 4 of Cold Boot. Jamie returns to her surveilled apartment after the Zoo. Anabelle’s avatar calls her. They negotiate the truth of what kind of place the Zoo is, and what Jamie wants from it.',
        social_hook: 'Cold Boot, Part 4 is live. The morning after. Anabelle has explaining to do. Jamie has truths she hasn’t said out loud in years.',
      },
      newsletterHeading: 'Cold Boot — Part 4: Greige. Again.',
      newsletterDescription: 'Part 4 of 8. Jamie’s back in greige reality. Stinky Pete is unhappy about her vitals. Anabelle calls.',
    },
    {
      title: 'Cold Boot — Part 5: Warmth',
      slug: 'cold-boot-5-warmth',
      order: 5,
      publishedDate: '2026-05-13',
      scheduledPublishDate: '2026-05-13T14:00:00.000Z',
      tags: ['fiction', 'serialized', 'cyberpunk', 'cold-boot', 'it-takes-a-zoo'],
      excerpt: 'The bar applauds when Jamie comes back. A spiky teenager slides half her cursed soda across the counter — the first thing anyone’s offered without asking for something back.',
      content: `When my consciousness rebooted, the bar popped into place like a memory half-remembered. Someone hooted—Kat probably—and then the whole bar applauded like I'd scored a touchdown.

I flushed. "What did I do?"

"You came back!" Kat grinned. "Nobody does that after a panic exit."

I glanced at Anabelle, but she was already pouring another drink, tail flicking in silent laughter.

"So what are you?" she pressed again, playful but hungry for a connection. "_Really._ Under the vanilla Corpo avatar."

I almost made a joke—almost ran for cover. Instead, maybe for the first time, I told the truth.

"I'm… figuring it out," I said. "But I saw a shark when Kat ran her filter on me. Mostly I just want to feel safe being weird."

Kat grinned. "That's the only rule here. Well, that and don't eat anything Jumpin' Jack offers you after midnight."

I found myself laughing. Not the polite, office-safe kind, but a small, real one. And when Kat, all spiky pride, slid half her cursed soda across the bar to me, I took it without thinking.

She watched me, almost shy.

"You don't have to drink it," she said, softer now. "You can just... sit. That's what Anabelle taught me."

I nodded.

"What's it do?"

She smiled. "That'd be telling."

The soda fizzed like it had secrets. Kat watched, caught somewhere between hope and terror.

It was the first thing someone had offered me without asking for something back.

"Fuck it," I said, and then downed the soda in one gulp. It was cold and sharp, like biting into what lightning must feel like. Something inside me sighed and unwound for the first time in decades.`,
      meta: {
        title: 'Cold Boot — Part 5: Warmth',
        description: 'Part 5 of Cold Boot. Jamie returns to the Zoo. Kat shares her cursed soda. Something inside Jamie unwinds for the first time in decades.',
        keywords: 'fiction, serialized, cyberpunk, short story, cold boot, chosen family, neurodivergent fiction',
      },
      discoverability: {
        search_summary: 'Part 5 of Cold Boot. Jamie comes back. The Zoo applauds. A spiky teenager named Kat slides half her cursed soda across the bar — the first thing anyone’s offered Jamie without strings attached.',
        social_hook: 'Cold Boot, Part 5 is live. Jamie comes back. The bar applauds like she scored a touchdown. Kat slides her half a cursed soda. Something inside her unwinds.',
      },
      newsletterHeading: 'Cold Boot — Part 5: Warmth',
      newsletterDescription: 'Part 5 of 8. Short and warm. Jamie says yes.',
    },
    {
      title: 'Cold Boot — Part 6: Tide',
      slug: 'cold-boot-6-tide',
      order: 6,
      publishedDate: '2026-05-15',
      scheduledPublishDate: '2026-05-15T14:00:00.000Z',
      tags: ['fiction', 'serialized', 'cyberpunk', 'cold-boot', 'it-takes-a-zoo'],
      excerpt: 'Anabelle leads Jamie to a beach that smells like salt and tangerines, tells her to take off her corporate skin, and walks her into the surf. What’s underneath has been there all along.',
      content: `Anabelle said nothing because no words were needed. She took my hand and, giggling, led me to one of the rooms at the back of the bar.

The floor rippled.

Then it wasn't a floor anymore. It was sand—fine, silver-pink grains under my feet, still warm from a sun I hadn't seen. The air smelled like salt and tangerines, and the crash of waves rolled in gentle intervals, like the world was breathing for me.

I turned. Anabelle stood barefoot at the waterline, her fur catching the moonlight like a brushed velvet coat. She flicked her tail once and grinned.

"Okay," she said, stretching with a little bounce, "this is gonna sound weird, coworker, but…"

She raised her eyebrows.

"Clothes off."

I blinked. "Excuse me?"

She shrugged. "Look, you're transforming. If you stay wrapped in corporate synthetics, the code's gonna twist it. You'll pop scales in weird places. Trust me—Kat still has vestigial elbows."

"…Elbows?"

"Don't ask." She winked. "Just get comfy. It's not about sex, it's about… shedding."

I hesitated.

Then, slowly, I shrugged off the Corpo avatar's blazer overlay. Before I could think better of it, I tossed off everything—button-up, name badge, efficiency-optimized flats—and watched it dissolve into mist. What was left was just… me. In soft, comfortable underclothes, the way I sometimes imagined myself on nights when the world didn't hurt so much.

Anabelle tilted her head.

"There she is."

I didn't know what to say. So I laughed. "This is definitely an HR violation."

She grinned wide and gestured toward the water. "C'mon. It starts when you touch the tide."

I took a step. Then another. And when the surf reached my ankles, the world tilted.

The water slid up my shins like it knew me. The soda still buzzed in my chest, like static trying to crack open something sealed.

My skin itched—but not like pain. Like newness. Like goosebumps blooming into something bolder.

My fingers stretched, webbing threading between them like silk on the wind until I had fins.

My teeth sharpened—not as weapons, but truths.

I gasped. The sound came out different—low and round, like an exhale through coral.

I fell forward, but the surf caught me. My limbs shifted, lengthening, powering. My spine coiled and rebalanced. A tail—my tail—flicked through the shallows like punctuation. A statement, not a question.

I wasn't becoming something else. I was just… making room for what was always there.

The mirror surfaced behind me—silver-backed, half-submerged. I stared.

Shark skin shimmered down my arms in soft gradients of blue and gray. My shoulders held differently. My eyes were too bright. My smile, too wide.

And still—somehow—I looked more like myself than I ever had.

Anabelle slid up behind me and put her paws on my shoulders.

"You can keep her."

I turned. She didn't move. She just watched me, eyes full of something like pride.

"Or let her go," she added. "That's the trick of this place. You choose."

I took one more step into the surf. My reflection rippled.

"I want to see what she can do," I said. But as I went to dive into the deep blue sea, I heard a new voice from behind:

"Wouldn't recommend deep diving just yet—tail like that needs practice. And I need to install the gill mods for you. Haven't used those since Mermaid Week back in the twenties!"

I yelped and spun. Jack stood ankle-deep in the waves, shading his eyes. Next to him, Vivian's low-poly vixen shimmered in the moonlight, white cane tucked at her side.

"You're glowing," she said, warm smile on her face. Her eyes were closed but friendly.

"I thought you were blind."

"Lots of ways to be blind," she said. "I thought you were a human. Glad to know I was wrong!"

I squinted. "Were you two just… _watching_?"

The jackrabbit gave me a quick salute. "Oh, we give new folks privacy. We just, uh… check the logs."

"And emotional vitals. You spiked for a second. Thought you were drowning."

Anabelle gave my shoulders a squeeze. "She's fine, mom. More than fine."

Vivian paused beside me.

"You look like someone who finally found the right ratio of sharp and soft," she said, voice low.

"I look ridiculous."

She smiled. "Honey. This is a modded server run by furries. No one here feels or acknowledges that kind of shame anymore."

Jack tapped at invisible keys before pointing his finger out, Picard-like, to punctuate the gesture. "And... done! Full shark permissions unlocked."

My tail flicked once—testing its balance, not asking permission. It coiled behind me, settled and sure. A full stop. A statement.

The mirror was gone. But I didn't need it anymore. I could _feel_ myself, coiled and ready. Strange. Beautiful. _Free._

"Go on," Vivian said. She smiled a glitchy smile in my direction. "Have a swim. We'll be here when you're done having fun!"

My body slid into the water like a hand into a glove, and I moved through it like a darting clownfish, my gills full of seawater and my heart full of joy.`,
      meta: {
        title: 'Cold Boot — Part 6: Tide',
        description: 'Part 6 of Cold Boot. Jamie’s transformation scene. A beach, a tide, a shark. Becoming, not escaping.',
        keywords: 'fiction, serialized, cyberpunk, short story, cold boot, transformation, queer fiction, identity',
      },
      discoverability: {
        search_summary: 'Part 6 of Cold Boot. The transformation. Anabelle takes Jamie to a private beach behind the bar. Sand, surf, a mirror. Jamie meets the shark she’s always been.',
        social_hook: 'Cold Boot, Part 6 is live. Sand under bare feet. Salt and tangerines. The water knows her. She isn’t becoming something else — she’s making room for what was always there.',
      },
      newsletterHeading: 'Cold Boot — Part 6: Tide',
      newsletterDescription: 'Part 6 of 8. The transformation chapter. Bring tissues.',
    },
    {
      title: 'Cold Boot — Part 7: Later',
      slug: 'cold-boot-7-later',
      order: 7,
      publishedDate: '2026-05-18',
      scheduledPublishDate: '2026-05-18T14:00:00.000Z',
      tags: ['fiction', 'serialized', 'cyberpunk', 'cold-boot', 'it-takes-a-zoo'],
      excerpt: 'Jack notices the flinch. Vivian names what’s behind it. By the end of the night, Jamie isn’t sure if she’s okay — and learns she doesn’t have to be.',
      content: `Later, after hours of swimming, Anabelle begged me to come back to the bar.

There, I was still wearing the shell of a purple shark. And I felt so silly at how proud it made me feel. The ocean may have _felt_ real but I knew, deep down, that I'd never be that shark. And that eventually, when bedtime rolled around, I'd log out of this space and just be... _Jamie._

It was stupid. Stupid to feel proud. Stupid to want to stay like this. But I did.

Why did that hurt so much?

They crowded around me at the bar, peppering me with questions. I answered freely, loosely, as if a burden had been lifted from my shoulders. (After all, it wasn't _me_ that was talking—it was the big purple shark!)

"Where'd you learn to swim like that?" Jack asked.

"Grew up near a lake. Mom made me take lessons after I panicked and clawed a cousin in the water. I used to imagine—no. Maybe another time for that story."

"What's your day job?" Vivian asked.

The purple shark raised her hand almost as if to dismiss the question. "Virtual cubicle farm. Grey on grey on grey. My boss is an algorithm named Stinky Pete."

Anabelle nodded in agreement. A small cat child—barely a toddler!—hid behind her legs. It felt, well, _maternal_ somehow. Sure, we were all roleplaying, but we were still _there_. It's hard to explain.

"Do you do this kind of thing often?" she asked.

"God, no. I used to write fanfic about this stuff, like, a million years ago. But I haven't let myself want it in... years."

There was a silence after that one. Just a beat. Long enough to notice. Short enough to pretend it didn't happen. I took a long sip of whatever Anabelle had slid into my hand. Something with honey and heat. Something kind.

I wasn't sure what answer had made the room go quiet. Or maybe I was. I just wasn't ready to look it in the eye.

Kat's dry chuckle punctuated the silence. "So how'd you end up at the Zoo?"

"Anabelle gave me a card after I cried in a team meeting," I said with a shrug. "Corporate didn't notice. She did."

Everyone at the table nodded. "Sounds about right," Kat continued. "And yet, here you are still smiling."

My shark-face tilted. "Huh?"

The cat's ears flicked with mild annoyance or smug joy—I wasn't a cat person at the time, so I couldn't know for sure.

"You'll never forget that feeling. First time you let go?"

She smiled, just a little.

"I don't get to do that much. Not with Daddy Dearest watching my every move."

I laughed. "You named yours too?"

Kat was suddenly not there. She stared off into the distance, dazed.

The small cat behind Anabelle's legs—Kitten, I realized—scampered out and curled up around Kat's ankles like a guard dog in miniature. Watching me with suspicion. Or warning. Or both.

Kit bounded out from the back rooms and grabbed Kat's shoulder. Shaking hard, he looked at me with a mix of regret and terror.

"I'm so sorry. We know it's your big party and we made it about us and I'm just so—"

"Hey," I said, holding up a hand. "You're okay. Kit, right?"

They nodded, sheepish. "Yeah. Me and Kat and Kitten come here a lot. More than we should, probably."

I patted a seat a couple stools down. Not crowding. Just close enough to be real. I felt silly flopping my fins on a bar chair—it felt like Tiny Toons meets Cool World to me—but the silliness made it easier somehow. Less dangerous, I guess.

"Is it okay if we just… sit for a minute?"

Kit looked at Kat—still quiet, still distant—and gave a tiny shrug.

"Sure. That's what we do, sometimes. Sit and breathe 'til the loud feelings get less loud. That's what Viv taught us."

He tugged gently at Kat's sleeve, grounding her like a tether. Kitten curled tighter around Kat's ankle, eyes half-lidded, purring. Maybe for her. Maybe for all of us.

We sat like that—just breathing in the same space.

"You know," I said, looking down at Kit with the warmest gaze my shark-body could muster, "My mom used to say sitting quietly with someone was a kind of love."

Kit gave me a small, wry smile. "She wasn't wrong."

I reached out and touched him. I felt a crackling energy surge through me from within.

"I never really got it until tonight."

A long, kind silence stretched around us like a warm quilt.

"But don't tell Kat. She won't let me live down being all mushy like this!"

At long last, Kat began to stir. Without a word, she shambled off to a back room. But then, right before she reached for the doorknob, she sprinted back across the bar.

She made a beeline for me and then, before I could react, threw her arms around me. She buried her face in my slick, new skin and squeezed as hard as a child that age could possibly manage.

"Thank you," she said. And then she ran to a private room, blushing and holding back tears. Kit and Kitten followed in tow.

Then the children were gone, and it was just me, Anabelle, Vivian, and Jumpin' Jack around the bar, sharing the silence.

Jack poured himself a glass of carrot juice and sipped it like a fine whisky. Then, his gaze grew stern as his eyes met mine.

"You flinched."

I scanned his face for any sense of the jovial, joking, kind person from the private room. It was still there, but different. Pointed. Direct.

"Excuse me?"

"When Kat hugged you. You flinched like she threw a punch."

"I didn't—" I sighed. Not like I could lie to the guy who has access to the server logs. "—it just caught me off guard, that's all."

Vivian shook her head. She didn't make eye contact.

Her voice came out staticky, retro, buggy, but gentle. "No, it didn't. You were trying to figure out what it would _cost_."

I looked away.

"Look," Jack said, picking his words carefully. He took another sip of the juice. "Some of us came here running from people who only offered kindness with hooks in 'em.

"But you're not there anymore, Jamie."

I laughed. "Yeah? Then where am I?"

The fox held out her paw and I took it, expecting to feel something electric like I did with Kat. Instead, the touch felt _old_. Ancient, in a way that defies time and logic.

"You're in a place that doesn't think love is scarce," she said. "And I know that's hard to trust when your whole life taught you otherwise."

"I don't deserve this."

The words came out of my mouth before I realized I was saying them.

Jack's words came out rushed and _stern,_ for a jackrabbit. "Kid, _none_ of us do. But we still show up for each other.

"We still care. We still _help,_ like you just did for the Kats."

It hung in the air, heavy but gracious.

Vivian gave my fin a squeeze. "You don't have to prove you belong here, Jamie. You just have to _decide_ you do."

My eyes stung. I blinked hard. Vivian said nothing; she just sat and held my new fin as something inside me cracked open to fill the space I'd been terrified of taking.

"You're saying I can just... Take it? The seat, the drink, the friends?"

Jack nodded. "No one here gives you a test. You show up, we set another place at the table."

Vivian squeezed harder. "And if you leave, we don't chase.

"But the door stays open."

It was getting harder and harder to talk. I blamed the new face, though Viv and Jack disagreed.

"What if I mess it up?"

"Then we clean it up," Jack said. "Together."

The tears started flowing. I curled up into myself, hugging my new body with fins that shouldn't exist and friends I should never have known.

Friends?

_I don't have friends._

"I don't think I'm okay," I said.

Jack and Vivian stood from their chairs to surround me with warm hugs.

The rabbit whispered in my ear. "You don't have to be."

From the other side, Vivian added, "And if you stay long enough, you might remember how.

"Welcome to the Zoo, Jamie. We love having you here."

They let me cry until the tears were all gone. Then, nodding, I clicked my heels.

"See you soon," I said.

"See you soon!" the couple said, waving to me as I left. As I returned to my greige hell I tried to hold onto the feeling of sharkskin and warm, fuzzy hugs, hoping they'd keep my heart warm under Stinky's glowing eye.`,
      meta: {
        title: 'Cold Boot — Part 7: Later',
        description: 'Part 7 of Cold Boot. The bar after the swim. Jack and Vivian see Jamie clearly. The Kats show her what kindness without strings looks like.',
        keywords: 'fiction, serialized, cyberpunk, short story, cold boot, chosen family, queer fiction, healing',
      },
      discoverability: {
        search_summary: 'Part 7 of Cold Boot. Bar conversation. The Kats hug Jamie. Jack notices her flinch. Vivian names what’s underneath. Jamie cracks open.',
        social_hook: 'Cold Boot, Part 7 is live. The Kats want to know how she ended up at the Zoo. Jack notices the flinch. Vivian names what’s underneath. The door stays open.',
      },
      newsletterHeading: 'Cold Boot — Part 7: Later',
      newsletterDescription: 'Part 7 of 8. The longest one. Bring tissues again.',
    },
    {
      title: 'Cold Boot — Part 8: Knock',
      slug: 'cold-boot-8-knock',
      order: 8,
      publishedDate: '2026-05-20',
      scheduledPublishDate: '2026-05-20T14:00:00.000Z',
      tags: ['fiction', 'serialized', 'cyberpunk', 'cold-boot', 'it-takes-a-zoo'],
      excerpt: 'A knock at the door. No one there. Just paper, ink, and a drawing of a shark — and a name on the dedication that ties the whole night together.',
      content: `The next morning there was a knock at the door. But when I opened it, no one was there to greet me. My heart fell and, still thinking of sharks, I thought about logging into my work instance.

But a small glint of purple caught the corner of my eye. There, taped to my door, I found a drawing.

A _real drawing_, with markers and pencils and ink and all. (You could smell the supplies on the page!) I hadn't seen one in years—not since AI made artists obsolete. But there I was, holding what appeared to be paper salvaged from a BoxCo delivery manifest, and on it was a drawing that another real human being made.

What I saw took my breath away. Someone had drawn a sketch of my shark receiving her first hug in the Zoo. Whoever had drawn it was certainly there that night; they captured everything, from the details of my sharkskin to the way I winced at Kat's touch.

There was a dedication at the bottom:

"For the cool shark lady, care of the Kats and Geoff."

I felt ashamed; I felt proud. I felt renewed.

I felt _whole._

Smiling, I taped the drawing over Stinky Pete's eye. _Let them kiss shark,_ I thought.

Work passed in a blur, greige purgatory be damned. For the first time in a long time, I had something to come home to.

That night, I clicked my heels.

Rain on cobblestone, jazz in the warm dark. I caught my reflection in a puddle—shark skin, too-bright eyes, a smile too wide for any office. The tavern's amber windows glowed against the storm, and through them I could see Anabelle behind the bar, ears already flicking toward the door.

The door stayed open.

It always did.`,
      meta: {
        title: 'Cold Boot — Part 8: Knock',
        description: 'Part 8 of Cold Boot. The morning after. A knock. A drawing on the door. Jamie tapes it over Stinky Pete’s eye and walks back through the door that always stays open.',
        keywords: 'fiction, serialized, cyberpunk, short story, cold boot, chosen family, queer fiction, art, AI',
      },
      discoverability: {
        search_summary: 'Final installment of Cold Boot. The morning after Jamie’s first night at the Zoo. A real drawing — paper, ink, marker — taped to her door. The dedication ties the whole night together. The door stays open.',
        social_hook: 'Cold Boot, Part 8 is live. The finale. Someone left her a drawing. The kind made with paper and markers that smell like supplies. The dedication ties everything together. The door stays open.',
      },
      newsletterHeading: 'Cold Boot — Part 8: Knock',
      newsletterDescription: 'Part 8 of 8. The finale. Cold Boot is the first chapter of It Takes a Zoo to Raise a Child. More to come.',
    },
  ];

  for (const post of posts) {
    const existing = await payload.find({
      collection: 'posts',
      where: { slug: { equals: post.slug } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      console.log(`  Skipping "${post.slug}" (already exists)`);
      continue;
    }

    process.stdout.write(`  Creating "${post.slug}" ... `);
    await payload.create({
      collection: 'posts',
      data: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: markdownToLexical(post.content),
        publishedDate: post.publishedDate,
        publish_status: 'scheduled',
        group: 'it-takes-a-zoo',
        order: post.order,
        scheduledPublishDate: post.scheduledPublishDate,
        tags: post.tags.map((t) => ({ tag: t })),
        meta: post.meta,
        discoverability: post.discoverability,
        newsletterHeading: post.newsletterHeading,
        newsletterDescription: post.newsletterDescription,
        // Seed seasons-in-advance: skip the per-post fan-out so cron-promoted
        // posts don't blast subscribers with already-scheduled content.
        suppressNewsletter: true,
      },
    });
    console.log('✓');
  }

  console.log('\nDone.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
