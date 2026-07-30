# Furry Image Studio and the Three Levels of Evals

Status: working canvas, not a publishable draft  
Current best: I'm writing about preserving identity across transformation, and
Furry Image Studio is but a literal translation of that mechanic.  
Post title: open  
Excerpt: open  
Publishing state: nothing has been created in Payload

## Win condition

Write a personal, technically useful essay in which Furry Image Studio makes
three levels of AI evaluation understandable through one vivid problem:
deciding what must survive when a person becomes a toon.

The reader should finish with:

1. A memorable definition of an eval.
2. A concrete understanding of three different evaluation levels.
3. A more credible model of "100x" based on safe delegation, not raw generation.
4. A sense that my technical work continues questions already present in my
   fiction.

## Current thesis

> An eval is a statement about what must survive transformation.

Supporting thesis:

> The path to 100x output is not trusting AI 100 times more. It is building
> enough evaluation around the AI that you can safely delegate more of the work.

## Story engine

Outside of work, I'm a writer.

I wrote one of the first pieces of "eggfic": fiction about people who turn into
cartoons at puberty. From that point forward, their lives become
emotionally unrecognizable to the Real people they left behind. I'm proud to say that my book allowed many readers to embrace their authentic selves, and I've been lucky enough to receive their stories either as kind letters or awkward, "Holy-shit-you-wrote-that" small-world moments.

See, I started from the absurdist premise that everything people said about queer people was true. Then I translated it to a toon frame. Toons do not have to eat. They can be blown up, squashed, and stretched with
impunity. Their bodies obey different rules. So do their futures.

Years later, I built Furry Image Studio, an AI system that can transform people
into cartoon animals while attempting to preserve the real world around them. I
built it to revise and promote a trilogy of novels. Naturally, I use it to make
weird cartoons on YouTube.

The connective question:

> What must remain recognizable after transformation?

My fiction explores that question emotionally.

My studio has to encode the answer operationally.

## Current-best opening

My company announced, as many IT companies are doing now, an AI leaderboard.

In a weird, quixotic way, the goal is to *spend more money*.

Which seems silly on the surface until you realize: *spending exponential
amounts of money on tokens is hard, actually*.

Not because you can't waste money talking to AI—believe me, I have! Anyone can
light money on fire asking a model to rewrite the same memo fifty times. It
takes a special sort to tell the model to spawn a hundred agents to chase down
status updates.

But even waste has scaling limits. You cannot sustain exponential token growth
without finding exponentially more work worth doing. To get there, you need
enough useful work to hand over, enough context for the AI to do it well, and
enough evaluation to know whether what comes back is right.

The ultimate goal was 100x. People were in various states of maturity toward
that goal.

I took it seriously.

I started studying how to increase my reliance on AI.

The results shocked me.

Outside of work, I'm a writer.

I wrote one of the first pieces of "eggfic" the world has ever seen. It takes
place in a world where some people turn into cartoons at puberty. From that
moment forward, their lives become emotionally unrecognizable to the Real
people they left behind.

I'm proud to say that my book allowed many readers to embrace their authentic
selves. I've been lucky enough to receive their stories, either as kind letters
or awkward, "Holy-shit-you-wrote-that" small-world moments.

I started from the absurdist premise that everything people said about queer
people was true. Then I translated it to a toon frame.

Toons do not have to eat. They can be blown up, squashed, stretched, and mangled
with impunity. Their bodies obey different rules. So do their futures.

I wanted to make something magical, and magical things are either weird or
hard. Thankfully, I'm the former.

Years later, I built [Furry Image
Studio](https://github.com/Arcadesys/furry-image-studio): an AI system for
transforming people into cartoon animals while preserving the real world around
them.

Look, the furry community started raising me at one point, and you walk away
from that arrangement forever changed. It's cartoons. It's furry art. It's a
weird, punky, queer mess.

I built it to revise and promote a trilogy of novels. Naturally, I use it to
make weird cartoons on YouTube.

I thought I was learning image generation.

I was actually learning evals.

The first time you ask an AI to turn someone into a cartoon fox, success seems
obvious. Look at the image. Did the person become a fox?

But that is not enough.

Did they become the correct fox? Did their pose survive? Their expression? Their
clothes? Did they keep holding the same object? Did the room remain Real, or did
the model quietly pull everything across the ontological border with them?

These were not new questions for me. I had been writing them for years.

My fiction asked what must remain recognizable when a person becomes a toon.
Furry Image Studio forced me to turn those answers into tests.

That is how I began learning the three levels of AI evals.

## The three levels

Eventually, I realized I was solving three different problems. I had been
calling all of them "is the picture right?" That was useless. They failed at
different points, and each failure needed a different eval.

### Level 1: Contract evals

The first failure was easy to miss: the model made a fox. It just didn't make
*my* fox.

Before I could evaluate the fox, I had to evaluate my definition of the fox.

A contract eval asks:

> Did I give the system a valid definition of the thing I want?

Furry Image Studio stores character identity separately from rendering style.
A character profile specifies concrete visual traits, reference images, paw
style, finger count, and known drift risks. A style profile specifies how an
image should be rendered without redefining who the character is.

The deterministic validator checks whether required fields exist, whether the
character has at least three locked visual traits, whether the reference images
resolve, and whether paw style, finger count, and rendering scope use known
values.

It cannot tell me whether an image is good. It can tell me whether my definition
was broken before generation began.

### Level 2: Output evals

Then the model made the correct fox and failed anyway.

The glasses warped. The hands stopped making believable contact with objects.
Paw pads appeared on the backs of hands. A tail floated behind the body without
attaching to the pelvis. Sometimes the fox was right and the model quietly
redrew the room.

Some of these images looked fantastic.

They were also wrong.

An output eval asks:

> Did this result honor the contract and my request?

That question forced me to create a protected `toon-in-real-world` style. It
transforms the selected subject while preserving the real background, crop,
objects, text, other people, pose, and interactions. The model may integrate the
toon into the scene. It may not pull the whole scene across the ontological
border.

"That looks cool" and "that is correct" are different judgments.

### Level 3: System evals

Then I asked it to fix one thing, and it fixed that thing by making a different
picture.

That is the expensive failure. The model can repair a paw while changing the
face, the pose, the crop, the lighting, and the room. One defect disappears.
Five previous wins disappear with it.

A system eval asks:

> Can my whole workflow recognize failure, recover locally, and improve without
> destroying what already worked?

That is why Furry Image Studio has a repair workflow. Each pass names one defect
and protects every non-defective part of the image. Preserve the character,
scene, crop, pose, and successful details. Change only the named defect. Check
that the repair did not introduce new drift. When a failure repeats, convert it
into a stronger profile, an avoid rule, or a workflow instruction.

A useful system is not one that never fails. It is one that can fail locally.

## Why this matters to the 100x claim

Raw generation was never the limiting factor.

The model could make images quickly. The expensive work was deciding whether an
image was correct, explaining why it was wrong, and making another attempt
without sacrificing everything that was already right.

Increasing reliance on AI therefore required:

- More explicit contracts.
- Smaller and more inspectable operations.
- Deterministic checks where possible.
- Human judgment where meaning or identity was involved.
- A repair path that preserved previous wins.

Possible turn:

> The more I relied on AI, the less I could afford to say "looks good to me."

The surprising result:

> Reliance did not grow from trust. It grew from verification.

The human constraint:

> A 100× system cannot require you to issue perfect instructions every two
> minutes all day.
>
> If it does, the AI has not removed the bottleneck. It has moved the bottleneck
> into your nervous system.

## The deeper fiction connection

My studio separates identity from rendering style.

That is also the emotional problem inside my fiction. A toon has crossed into a
new physical and social ontology, but becoming visually or physically
unrecognizable does not necessarily mean becoming a different person.

Questions worth picking at:

- Which traits constitute identity in my fiction?
- Which changes are liberation, and which are loss?
- Who gets to decide whether the transformed person is still recognizable?
- Are Real people evaluating toons against the wrong contract?
- Does a toon experience preservation where a Real observer perceives drift?
- Is puberty itself the transformation event, or is recognition the actual
  transformation?
- Does "eggfic" describe the reader discovering the character's identity, the
  character discovering it, or both?

Potential central turn:

> I had spent years writing about people whose transformations made them
> illegible to the world they came from. Then I built a machine and discovered
> that legibility is something you have to specify.

## Potential ending

I started with the promise of 100x engineering output. I assumed that meant
learning how to make the machine do more.

Furry Image Studio taught me something stranger.

The machine was already willing to do more. It would transform the person, the
room, the furniture, the text on the wall, and the innocent bystander in the
corner. It had no shortage of output.

The hard part was teaching the system what had to remain true.

That is what an eval is: a statement about what must survive transformation.

Sometimes it is a required field in a character profile. Sometimes it is the
rule that a fox's paw must continue holding the same coffee cup. Sometimes it is
the insistence that the Real world remain Real when a person crosses the border.

And sometimes it is the question underneath a piece of fiction:

> How much can someone change before the people they left behind stop recognizing
> them?

The path to greater reliance on AI was not greater trust. It was learning to
name what I could not afford to lose.

## Claims and canon to verify

I need to settle these before publication:

- The title and publication context of the eggfic.
- The wording and intended definition of "eggfic."
- The basis and preferred strength of "one of the first pieces in the world."
- Whether `Real` is the canonical capitalization.
- Whether transformation happens to all people or only some people at puberty.
- The exact relationship between my fiction and Furry Image Studio's origin.
- Whether the three eval labels should remain `contract`, `output`, and `system`.
- How specifically to describe what the company measures on the path to the
  100x goal without exposing internal details.

## Concrete Furry Image Studio receipts

Verified from the installed plugin:

- Character profiles and style profiles are separate.
- Character profiles can lock required traits, references, paw style, finger
  count, and avoid conditions.
- Styles define scope, background policy, rendering behavior, preservation, and
  drift risks.
- `toon-in-real-world` permits subject-only transformation and requires the real
  background to be preserved.
- A deterministic script validates profile structure.
- Generation includes an explicit validation pass.
- Transformation protects crop, background, objects, text, other people, pose,
  and scene interactions.
- Repair targets one named defect and preserves all non-defective areas.
- Repeated failure classes include generic-character drift, broken object
  contact, implausible tail attachment, misplaced paw pads, warped glasses,
  background drift, and style drift.

## Ratchet log

### Iteration 1

Attempt:

Frame the essay as a practical explanation of three eval levels learned through
building Furry Image Studio.

Verdict:

Useful but incomplete. It treated the studio as a playful technical side quest
and missed my existing fictional investigation of toon transformation.

### Iteration 2 — current best

Attempt:

Connect the eval hierarchy to the eggfic's central ontology. Define evaluation
as deciding what must survive transformation.

Verdict:

Keep. The technical concepts now emerge from a personal artistic question, and
the protected real-world background becomes both a software constraint and a
thematic boundary.

### Iteration 3 — current best

Attempt:

Open with the company's AI leaderboard and the strange incentive to spend more
money on tokens. Reframe 100x token use as a delegation-and-verification problem
rather than a consumption target, then pivot into my writing and Furry Image
Studio.

Verdict:

Keep. The essay now begins with an institutional absurdity, explains why the
challenge is harder than it looks, and creates a clean causal path from 100x
usage to evals. The eggfic reveal arrives as the surprising source of the
solution.

### Iteration 4 — current best

Attempt:

Name the hidden human cost of a high-frequency AI workflow: a 100x system fails
if it requires perfect instructions every two minutes and relocates the
bottleneck into the operator's nervous system.

Verdict:

Keep. This gives the essay stakes beyond token economics. Evaluation is not only
how I increase useful AI work; it is how the system must learn to operate
without consuming my continuous attention.

### Iteration 5 — current best

Attempt:

Give the move from fiction into Furry Image Studio an explicit creative motive:
I wanted to make something magical, and magical things are either weird or hard.

Verdict:

Keep. The line restores playfulness at the exact point where the essay could
become procedural, and it makes the studio feel chosen rather than merely
constructed.

### Iteration 6 — current best

Attempt:

Remove the case-study voice. This is my story, not an account of "the author."
Use first person in the essay, the questions, and even the ratchet log.

Verdict:

Keep. It sounds like I am telling you what happened to me instead of submitting
myself for anthropological review.

### Iteration 7 — current best

Attempt:

Repair the collided token-spend paragraphs. Promote the book's real reader
impact and the absurdist queer premise from planning notes into the opening.

Verdict:

Keep. The opening now moves cleanly from waste, to useful scale, to the personal
work that made the eval problem matter. The book's impact is demonstrated
through letters and awkward recognition instead of summarized from a distance.

### Iteration 8 — current best

Attempt:

State the studio's full purpose: revise and promote the trilogy. Turn the three
eval levels into a sequence of visible failures instead of presenting them as
documentation.

Verdict:

Keep provisionally. The technical material now moves as a story: wrong fox,
correct fox in a corrupted world, then a local repair that destroys previous
wins. The specific failure sequence still needs my confirmation that it reflects
what actually happened.

### Iteration 9 — current best

Attempt:

Name the furry community as part of what formed me and describe the studio as
the cartoons, furry art, and weird punky queer mess that followed. Link the
public GitHub repository from the studio's first mention in the draft.

Verdict:

Keep. The studio now has cultural lineage as well as functional purpose, and the
reader can inspect the actual thing.

Next experiment:

Confirm the fiction canon and the intended names of the three eval levels. Then
expand Levels 1–3 into full narrative sections using one actual image
transformation as the running example.
