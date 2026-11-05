---
id: novel-writing-is-just-engineering-with-more-steps
title: Novel Writing Is Just Engineering With More Steps
slug: novel-writing-is-just-engineering-with-more-steps
group: on-writing
publishDate: '2026-11-05T16:35:00-06:00'
excerpt: On discovery writing, emergent complexity, and the joy of building
  something that surprises you.
tags:
  - writing
  - craft
  - engineering
  - AI
  - Heinlein
hero:
  src: https://puhixbchomgvn0ti.public.blob.vercel-storage.com/images/199f71cf1be81c18cb18f9f807d8a8cf79507703269907be6c472360de52c76c/cover.png
  alt: "Follower Count cover by Austen Tucker: a mouse walks past a shadowed bar
    where a fox stands against warm amber shelves, with ivory lettering and cool
    blue shadows."
seo:
  title: Novel Writing Is Just Engineering With More Steps
  description: On discovery writing, emergent complexity, and the joy of building
    something that surprises you.
---

*On discovery writing, emergent complexity, and the joy of building something that surprises you.*

I didn't know how my novel ends until today. I've been writing it since March, and there are 60,000 words in the draft right now. If i knew how it ended already, I wouldn't have written it. Finding out is the fun part.

I'm what's called a pantser - or *discovery writer*. That means I start a novel with very little plan. I get an idea, write down what I want to be true about the world and its characters, pick a spot, and start building the narrative one scene at a time.

Most times, I don't know how the piece will end. Often, I don't know which characters will become supporting cast and which will get cut in the final draft. Sometimes I don't even know what the story is really *about* until I'm tens of thousands of words into it.

That mystery, and the process of working the problem until it's solved, is what keeps me coming back.

And the funny thing is, it's surprisingly similar to how I approach engineering.

## Start With What You Want to Be True

When I build software, I generally know what I want the system to accomplish. I know some of the constraints. I have an idea of the architecture, and I can usually picture what success should look like.

But I don't necessarily know how I'm going to get there.

The interesting things happen when I start building. I discover dependencies I hadn't considered. A feature I thought would be simple turns into a complicated problem. Something I built to solve one issue turns out to be useful for three others.

Sometimes I find that the original architecture won't support what I'm trying to do. So I tear part of it apart and rebuild it.

I do the same thing with fiction.

Characters surprise me. Plot threads connect in ways I didn't plan. Something I wrote twenty thousand words ago turns out to be the solution to a problem I haven't even written yet.

And sometimes, the entire story changes underneath me.

## Sixty Thousand Words Into a Surprise

I'm currently writing a novel called *It Takes a Zoo*. The premise: what if the chatrooms of the old internet were places you could explore and inhabit? What would change about the relationships that formed there?

![Gallery View cover: a mouse overlooks a towering gallery filled with illuminated paintings. Ivory title lettering sits above the scene, with an orange accent, the line A story from the Zoo, and the author credit By Austen Tucker.](https://puhixbchomgvn0ti.public.blob.vercel-storage.com/images/d8e77595301108bec16021c5b1bcd014b482f677cc8a64fa7f57461b7a684793/03-gallery-view.jpg "Gallery View: deep shadows, warm amber light, and a recurring title treatment.")

The pictures have their own engineering problem. I want illustrations for different parts of the novel to look like they belong to the same world. So I built an AI image-generation harness around that requirement: consistent lettering, a shared palette, and room for each scene to be itself. In *Gallery View*, that means a tiny mouse looking out over a gallery that dwarfs him.

When I started, I knew that Jack and Vivian owned a simulation. I had an idea about the world they inhabited and the technology that made it possible.

I didn't know they had a family.

I didn't know that the character I'd chosen as my focalizer would become part of that family.

And now, sixty thousand words into the draft, that family is the lifeblood of the entire novel. The story I thought I was writing and the story I'm actually writing are two very different things.

I couldn't have outlined that in advance. I didn't know it was there to outline. I had to write my way into discovering it.

That's one of the things I love most about writing fiction. You spend enough time with your characters, put them in enough situations, and eventually they start doing things you didn't expect. Not because they've developed minds of their own, of course. I'm the one writing the words. But because I've built enough of their personalities, relationships, and circumstances that certain decisions start to feel inevitable. A character does something surprising, and I realize that, given everything I've written about them, it's exactly what they would do.

That's when I know the story is working. And occasionally, something even better happens. I figure out how the book ends.

That dopamine rush has never gotten old.

## Sometimes You Have to Build the Tools, Too

There's another layer to this particular novel.

While I've been writing *It Takes a Zoo*, I've also been building the software I use to write it. It's called Heinlein, and it started out as a basic text editor.

I wanted a comfortable, distraction-free place to write. Somewhere I could concentrate on the words without fighting an interface or navigating a hundred features I didn't need.

Then my writing process started evolving.

I began experimenting with AI-assisted editing. Not having an AI write my stories for me, but using it to examine scenes, identify continuity problems, catch awkward rhythms, and point out emotional beats that weren't quite landing.

I wanted the equivalent of a room full of editors, each focused on a different aspect of my manuscript. And I wanted to remain the author.

That last requirement was important. An AI can cheerfully rewrite a paragraph until it's perfectly grammatical, perfectly coherent, and sounds absolutely nothing like me. That's not particularly useful when the whole point of writing fiction is to put something of yourself into the work.

So I started building editorial tools that would offer suggestions without taking over.

Today, Heinlein has custom editorial agents that can review my work from different perspectives. They propose changes, I review them, and I decide what belongs in the manuscript. My prose stays mine.

None of that was in the original plan.

The software evolved because the novel demanded it.

And the novel benefited from the tools I built along the way.

It's a wonderful feedback loop. I encounter a problem in my writing process, build something to address it, discover a new capability, and incorporate that capability into my writing.

Then I find the next problem.

That's software development. That's discovery writing. Apparently, that's also how I choose to spend my free time.

## The Pictures Need a System, Too

That same process extends to the artwork.

![Permissions cover: a rabbit writes at a cluttered workbench in warm amber light and deep shadow. An ivory serif title sits above the series line A story from the Zoo and the credit By Austen Tucker, with an orange accent.](https://puhixbchomgvn0ti.public.blob.vercel-storage.com/images/5a79b09d64bfb5a8a58ff9b1b0f86b7d6701c3d6f8ebb209cb5c5e4ffe3575f2/04-permissions.jpg "Permissions: a different setting, with the same lettering hierarchy and warm light against deep shadow.")

With *Permissions*, the scene moves into a workshop. The visual language carries over. The large ivory title, smaller series line, author credit, and orange accent make it recognizable as part of the same collection.

Some of that consistency comes from ordinary code. The cover-building step uses fixed fonts, colours, margins, and a dark gradient behind the lettering. For these composed covers, the title uses Bodoni 72; the supporting text uses Arial. Those are decisions I can encode and reuse.

![Open Port cover: people gather around a hospital bed beneath a glowing geometric fox. Cool blue shadows contrast with amber light. Ivory title lettering, an orange accent, the line A story from the Zoo, and By Austen Tucker repeat the collection design.](https://puhixbchomgvn0ti.public.blob.vercel-storage.com/images/d17ab83bc17b01cfddc20f0ea76e864eb7387c12318859e87b7e41876b7e9ec8/06-open-port.jpg "Open Port: cooler blue shadows and a luminous amber fox, within the same visual family.")

*Open Port* changes the balance again. The hospital equipment and blue light give it a different atmosphere, while the amber glow and familiar lettering connect it to the other images.

Consistency leaves room for variation. The scene, composition, and emotional emphasis can change while the collection still holds together. That's another set of creative requirements turned into a system. I decide what needs to stay consistent, build around those constraints, and see what the next image can do.

## The Part Nobody Sees

Now, I don't want to romanticize this too much.

This process takes *forever*.

Writing a novel is months, sometimes years, of building something one scene at a time. You make decisions, discover they don't work, tear things apart, and put them back together.

Sometimes you spend an entire afternoon fixing a continuity problem that nobody reading the finished book will ever know existed.

Sometimes you write five thousand words and realize that three thousand of them need to go. Sometimes you stare at a scene for days because you know what needs to happen, but you haven't figured out how to make it believable.

And often, there's very little external reward for any of this.

Most novels don't become bestsellers. Most personal software projects don't become successful products. You can spend enormous amounts of time and energy creating something that relatively few people will ever experience.

I know that. I've been writing novels for decades.

But I keep doing it. Partly because I want to know how the story ends. And partly because, somewhere along the way, these characters stop being pieces of a narrative I'm constructing and become people I care about.

I've spent sixty thousand words getting to know Jack and Vivian and their family. I've watched them make terrible decisions, hurt each other, forgive each other, and struggle to hold on to the things they love.

I didn't know how their story would end.

But I love them enough to see them through.

## The Joy of Finding Out

I think that's what I've always loved about building things, whether they're novels or software. You start with an idea of what you want to be true. You identify the constraints. You build something. You discover what doesn't work. You change it. You build the next piece.

And somewhere along the way, the thing you're making starts to surprise you.

Sometimes you discover that the feature you thought was essential doesn't matter. Sometimes the character you introduced as background becomes the emotional center of the story. Sometimes the little text editor you built to write your novel becomes an entire agentic writing harness.

And sometimes, after months of work, you finally understand how all the pieces fit together.

There's something extraordinary about building a thing that can still surprise the person who built it. I think that's why I keep writing. And why I keep engineering.

Not because I always know where I'm going.

Because I want to find out.

---

*I'm currently writing *[*It Takes a Zoo*](https://www.thearcades.me/)* and developing *[*Heinlein*](https://www.thearcades.me/heinlein)*, my AI-assisted writing environment. Both are works in progress, which is rather the point.*

*My next novel, ****Estelle's Children****, is currently *[*available for preorder on Amazon*](https://www.amazon.com/s?k=austen+tucker+estelle%27s+children)*. If you'd like to support my work, I'd love for you to check it out.*

*Originally published in [...It Came from the Arcades on LinkedIn](https://www.linkedin.com/pulse/novel-writing-just-engineering-more-steps-austen-tucker-hspwc/).*
