---
id: '88'
title: The Fox and the Eval
slug: the-fox-and-the-eval
group: the-singularity-log
status: draft
excerpt: What trustworthy AI systems need to preserve through transformation.
---
My company announced an AI leaderboard. In a weird, quixotic way, my corporate mission is to *spend thousands of dollars on AI*.

I know. It sounds deranged.

It also works.

The funny part is that *spending thousands of dollars on AI tokens is hard, actually*.

Anyone can light money on fire asking a model to rewrite the same memo fifty times, or build a project management app while you're managing the project. The real trick is finding enough useful parallel work to spend it on: spawning a hundred agents to chase down status updates or turning a swarm loose on an application looking for vulnerabilities.

But burning tokens is not the same thing as doing useful work. To make 100x mean anything, you need work worth doing. You need enough context to do it. Then you need evals to tell you whether the damn thing worked.

I took the challenge seriously. (Look, you give someone who goes online by \_the Arcades\_ a leaderboard, and you bet your ass I want to be in the top ten!)

I wrote one of the first pieces of what the literary world now calls "eggfic."

An egg is a trans person who has not yet realized—or cannot yet admit—that they are trans. Eggfic is the story of the shell cracking. The character figures out what the reader may have known for a hundred pages.

Mine, *Bait and Switch*, takes place in a world where some people turn into cartoons at puberty. Their lives become emotionally unrecognizable to the Real people they left behind. Toons do not have to eat. They can be blown up, squashed, and stretched with impunity. Their bodies obey different rules. So do their futures.

The premise was simple and obscene: every terrible rumor said about queer people was true. We *are* different stock. We do *not* make sense. Our lives look wasteful and even sinful from the outside.

Then I translated it to a toon frame. Instead of queer people, what if it was cartoons in the real world? Could I get people to see my story if I changed the identities of the protagonists around?

My book helped people transition.

I know because they told me—in kind letters and awkward, "Holy-shit-you-wrote-that" small-world moments.

Those were the stakes I wanted to carry into the campaign: not just a fox, but a person readers could still recognize through the transformation.

So I built \[Furry Image Studio\](https://github.com/Arcadesys/furry-image-studio) to feed a future marketing campaign for the book's re-release next year. Naturally, I use it to make \[weird cartoons on YouTube\](https://www.youtube.com/shorts/HOOVFXGKz4k).

I thought I was honing my image generation skills.

I was actually learning evals.

## Three Ways to Ask Whether the Fox Is Right

The model made a fox.

It just didn't make *my* fox.

!\[Moxie Arcade, an orange anthropomorphic fox with brown hair, glasses, arm tattoos, and a black tank top, taking a wide-angle selfie in a warmly lit, lived-in kitchen.\](../assets/essays/moxie-arcade-kitchen.jpg)

Moxie Arcade is a sort of self-insert into the world.

She's an AI paintover of a real photo. I learned quickly that the model will happily alter the composition along with everything else. Give it an initial backplate, though, and you can do some really cool stuff. The photograph handles the composition. The model handles the transformation.

That edit does something else too: it makes the moment stick. I wrote about that in \[Photos Aren't Sticky\](photos-arent-sticky.md).

Look, if you build the world, you get to live in the world. Them's just the rules.

Moxie has to stay Moxie. I have to stay legible inside the character.

This is how you end up with three different judges for one cartoon animal.

**The code grader:** Did I define the fox well enough to test? Language is slippery. I learned that as an English teacher. Precision is hard, and plenty of people never gain the vocabulary to say what they actually mean. Character profiles, required fields, and deterministic validation turn *my fox* from a feeling into a contract.

**The model grader:** Did the image honor the contract? The model can make the correct fox and still fail. Glasses warp. Paw pads appear on the backs of hands. Sometimes it quietly redraws the room. The protected \`toon-in-real-world\` style says the model may transform the subject. It may not drag the whole scene across the ontological border.

**The human grader:** Do I want the thing it made? This is the one I cannot automate. I decide whether the fox still feels like the fox, whether the transformation preserved identity, whether the image is actually magical. I ask it to fix one thing, and it fixes that thing by making a different picture. A useful system is not one that never fails. It is one that can fail locally.

If you want the respectable version, \[Anthropic\](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) and \[OpenAI\](https://developers.openai.com/api/docs/guides/graders) wrote it down.

The \[prototype is here\](https://ink-and-paint-studio.thearcades.chatgpt.site).

This is where the 100x promise runs into the human body.

A 100× system cannot require you to issue perfect instructions every two minutes all day.

If it does, the AI has not removed the bottleneck. It has moved the bottleneck into your nervous system.

I learned this the hard way.

The model can make a hundred images in the time it takes me to decide whether one of them is right. Each decision is small. Is the tail attached to the pelvis? Is the cup still in the same paw? Did the room stay Real? None of them is hard. All of them require me.

The judgments do not get cheaper. The fiftieth costs more than the first, because by then I am holding every prior judgment in my head—every locked trait, every avoid rule, every win I am trying not to break.

So the system has to carry what I cannot. Deterministic checks wherever the answer is knowable. Profiles that remember what I decided last week. Repairs scoped small enough that a tired person can still verify them.

Not because I am fragile. Because I am the part of the system that does not scale.

My studio separates identity from rendering style—the same split I've been writing toward for years.

In my books, transformation makes people illegible to the world they came from. Then I built a machine and discovered that legibility is something you have to specify and test for.

That is what an eval is: a statement about what must survive transformation. Sometimes it is a required field. Sometimes it is the rule that a fox's paw must continue holding the same cup. Sometimes it is the insistence that the Real world remain Real when a person crosses the border.

Sometimes it is the whole damn book:

> How much can someone change before the people they left behind stop recognizing them?

Evals judge so that I can dream.
