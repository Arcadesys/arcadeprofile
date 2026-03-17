import Image from "next/image";
import styles from "./did.module.css";

interface Alter {
  name: string;
  key: string;
  avatar: string;
  isSelf: boolean;
}

const alters: Record<string, Alter> = {
  twi: { name: "Twilight", key: "twilight", avatar: "/images/avatars/twi.JPG", isSelf: true },
  potts: { name: "Potts", key: "potts", avatar: "/images/avatars/potts.jpeg", isSelf: false },
  sam: { name: "Sam", key: "sam", avatar: "/images/avatars/sam.jpeg", isSelf: false },
  addie: { name: "Addie", key: "addie", avatar: "/images/avatars/addie.jpeg", isSelf: false },
  vib: { name: "Vib", key: "vib", avatar: "/images/avatars/vib.jpg", isSelf: false },
  lucy: { name: "Lucy", key: "lucy", avatar: "/images/avatars/lucy.jpeg", isSelf: false },
  max: { name: "Max", key: "max", avatar: "/images/avatars/max.jpeg", isSelf: false },
  lilith: { name: "Lilith", key: "lilith", avatar: "/images/avatars/lilith.jpeg", isSelf: false },
  tally: { name: "Tally", key: "tally", avatar: "/images/avatars/tally.jpeg", isSelf: false },
  shepard: { name: "Shepard", key: "shepard", avatar: "/images/avatars/shepard.jpeg", isSelf: false },
};

const messages: { alter: Alter; messages: string[] }[] = [
  {
    alter: alters.twi,
    messages: [
      "Hello! We're plural. This page is here to explain what that means.",
      "No. terrible start.",
      "\"Why do I call myself the Arcades?\"",
    ],
  },
  { alter: alters.potts, messages: ["Yeah, that intro is full of butts."] },
  { alter: alters.sam, messages: ["I'm guessing you can do better?"] },
  {
    alter: alters.potts,
    messages: [
      "We could start with a story, maybe? Like that time Lucy got a tattoo and didn't run it by Addie first?",
    ],
  },
  {
    alter: alters.addie,
    messages: ["Not every day you wake up with a new tattoo and no memory of where it came from."],
  },
  { alter: alters.twi, messages: ["Please, everyone, can I have some quiet?"] },
  { alter: alters.vib, messages: ["Make dino nuggies! I want dino nuggies!"] },
  {
    alter: alters.twi,
    messages: [
      "Lucy, can you take the kiddo to the back? We'll do dino nuggies soon, Vib. I promise.",
    ],
  },
  { alter: alters.lucy, messages: ["Of course. Sorry about this. DID be like that."] },
  {
    alter: alters.twi,
    messages: [
      "We have Dissociative Identity Disorder. Used to be called Multiple Personality Disorder. They changed it to be more about the symptoms than the flashy \"we have alters\" thing.",
    ],
  },
  { alter: alters.lucy, messages: ["He means we have multiple people in our head!"] },
  { alter: alters.twi, messages: ["...Yes, that."] },
  {
    alter: alters.max,
    messages: ["Did everyone like the css I put together for this? I used AI to do it."],
  },
  {
    alter: alters.lilith,
    messages: [
      "Yes, Max, we _know_ you did it with AI. How could you possibly let us forget?",
    ],
  },
  { alter: alters.lucy, messages: ["Remember, Lilith. Be kind."] },
  { alter: alters.lilith, messages: ["Okay. I'm sorry for snapping. It looks cool, Max."] },
  { alter: alters.max, messages: ["thanks"] },
  {
    alter: alters.twi,
    messages: [
      "Can we focus, please?",
      "...OK. Let's try again.",
      "We have DID. It's a dissociative disorder - that means sometimes I involuntarily disconnect from reality - that just so happens to manifest inside as voices in my head.",
    ],
  },
  {
    alter: alters.max,
    messages: ["Surprise, we are the alters you talk to every day! It's like Inside Out in here—"],
  },
  { alter: alters.addie, messages: ["Max, Twi asked for time to focus."] },
  {
    alter: alters.twi,
    messages: [
      "Not helping, Addie.",
      "...",
      "Right. If you imagine the world inside a neurotypical person's mind like a house, my brain is more like a neighborhood. Different versions of me - Alters - control the body during the day.",
    ],
  },
  { alter: alters.potts, messages: ["And we're super different!", "...right sorry, just excited"] },
  {
    alter: alters.twi,
    messages: [
      "Yes, our brain is like a neighborhood where these alters coexist. They all have separate internal experiences, identities, preferences, fashion choices, genders, and even memories change depending on which alter is \"fronting,\" or controlling the body.",
      "Because we're all different alters we struggle to form a consistent identity or life story. Every morning we wake up, it feels like a sequel to \"The Hangover\" - we'll have no clue what day it is, what our schedule looks like, or what skills we'll forget how to use that day.",
      "(and PS, there are studies about this that can map out which alter lives in which part of the brain, no joke!)",
      "...OK, y'all can talk now.",
    ],
  },
  {
    alter: alters.addie,
    messages: [
      "Hello! Let me read up in the chat and jog my memory.",
      "We talked about dissociation, and partitioned memory, and that each of us have different identities. Check, check, check.",
      "Potts, wanna talk about the nice parts?",
    ],
  },
  { alter: alters.potts, messages: ["I can talk now?"] },
  {
    alter: alters.twi,
    messages: ["Please don't make me regret joining this art project."],
  },
  {
    alter: alters.potts,
    messages: [
      "Seriously, we should have a studio name. I propose \"...It came from the Arcade!\"",
      "Anyone?",
      "No?",
      "...fine. Good things about being a system",
      "(That's what we call the collection of alters inside the brain)",
      "We have an insane stress tolerance and endless energy. If one of us ever gets stuck or frustrated, we switch in a fresh face that won't remember any of the frustration.",
      "And... uh, this is just personal opinion but systems have a TON of hobbies and tend to know how to do a lot of things pretty well. Perk of having roommates in your brain.",
      "Other than that, yeah. Good days and bad days. Back to you, Twi!",
    ],
  },
  { alter: alters.twi, messages: ["This is a chat, not a game show"] },
  { alter: alters.potts, messages: ["Wet blanket over here.", "We doing intros?"] },
  {
    alter: alters.twi,
    messages: [
      "Yes",
      "I'll start",
      "Hi, I'm Twilight! I'm the quiet and withdrawn one in the system. I organize the writing duties for the system. I love playing piano, making electronic music, staying up alone on late nights, and the peace of solitude. Nothing is better to me than a rainstorm at 1 o'clock in the morning, especially if I've got some herbal tea and my latest manuscript up on screen.",
    ],
  },
  {
    alter: alters.potts,
    messages: [
      "I'm Potts! I'm a fun-loving guy who loves being the center of attention. I cook for the system, and I'm the one alter in here with a good sense of humor. I love cooking for friends, throwing parties, and making people laugh. Nothing is better to me than a late Summer day on the lake, when the city noise gives way to the sound of gentle waves and the feeling that things are gonna be okay.",
    ],
  },
  {
    alter: alters.addie,
    messages: [
      "Addie here. I do project management for the system. I keep the system organized, and it's my job to make sure our professional life stays on track. I love understanding complex systems, playing fighting games, and making the perfect project plan. Nothing is better to me than a free morning to organize all the creative projects we have in the hopper.",
    ],
  },
  {
    alter: alters.max,
    messages: [
      "I'm Max. I handle IT for the system. I make tools to help the system navigate life as a disabled person. I love inventing things that didn't exist before, playing Factorio, and learning new tech tools. (Right now I'm suuuper heavy into AI dev work and—",
      "Right, keep on topic, sorry Twi)",
      "Nothing is better to me than sitting at my desk with a problem to solve and an IDE ready for me to sling code.",
    ],
  },
  {
    alter: alters.lucy,
    messages: [
      "Hello! I'm Lucy. I do chores and home improvement for the system. I love knocking out long task lists and working out. Nothing is better to me than waking up early and taking my morning tea in a clean, tidy home.",
    ],
  },
  {
    alter: alters.tally,
    messages: [
      "Tally here. I'm the alter that holds our spirituality. I help the system see the bright side in everything. I love getting to know what makes other people awesome, accompanying myself on the piano, and helping others. Nothing is better to me than a quiet chat with friends around a campfire.",
    ],
  },
  {
    alter: alters.vib,
    messages: ["i'm vib i like computers and playing games thanks"],
  },
  {
    alter: alters.lilith,
    messages: [
      "I'm Lilith. I'm the alter that handles anger for the system. I...",
      "...do I really have to say 'love'? ugh.",
      "I love singing rock songs, getting things done, and playing piano. Nothing is better to me than a karaoke bar and a beer, right when I get called up to the stage.",
    ],
  },
  {
    alter: alters.shepard,
    messages: [
      "I'm Shepard. I'm the alter that pushed us to overcome our alcoholism. I love bike rides, playing piano, and cutting straight to the heart of any matter. Nothing is better to me than a Sunday afternoon bike ride.",
      "That's it",
      "That's us.",
      "Twi?",
    ],
  },
  {
    alter: alters.twi,
    messages: [
      "Thanks everyone.",
      "So that's why we go by the Arcades. Like we said before, all of this is _totally optional information to know_. You're not gonna be quizzed on it, or be expected to know about it at all.",
    ],
  },
  {
    alter: alters.lucy,
    messages: [
      "...But if you do want to get to know each of us better, that would be awesome!",
    ],
  },
  { alter: alters.twi, messages: ["...Yeah, that."] },
];

function getBubbleClass(index: number, total: number): string {
  if (total === 1) return styles.bubbleOnly;
  if (index === 0) return styles.bubbleFirst;
  if (index === total - 1) return styles.bubbleLast;
  return styles.bubbleMiddle;
}

export default function Did() {
  // Track consecutive groups for grouping logic
  let groupCounter = 0;

  return (
    <div className={styles.phone}>
      <div className={styles.header}>
        <div className={styles.headerIcon} />
        <div>
          <div className={styles.headerTitle}>The Arcades</div>
          <div className={styles.headerSubtitle}>10 members</div>
        </div>
      </div>

      <div className={styles.intro}>
        <Image
          src="/images/groupchat.jpeg"
          alt="Group chat"
          width={380}
          height={200}
          className={styles.introImage}
          style={{ width: "100%", height: "auto" }}
        />
        <p>
          A silly way to talk about a serious subject. If anything you read here
          resonates with you, please contact a mental health service provider.
        </p>
      </div>

      <div className={styles.chatBody}>
        {messages.map((msg, i) => {
          const prevAlter = i > 0 ? messages[i - 1].alter : null;
          const isSameAsPrev = prevAlter?.key === msg.alter.key;
          const isNewSpeaker = !isSameAsPrev;

          if (isNewSpeaker) groupCounter++;

          // Insert timestamp every 10 speaker changes
          const showTimestamp = isNewSpeaker && groupCounter > 1 && (groupCounter - 1) % 10 === 0;

          const groupClasses = [
            styles.group,
            msg.alter.isSelf ? styles.self : "",
            isNewSpeaker ? styles.groupGap : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={i}>
              {showTimestamp && (
                <div className={styles.timestamp}>
                  {groupCounter <= 11 ? "a few moments later..." : "continuing..."}
                </div>
              )}
              <div
                className={groupClasses}
                data-alter={msg.alter.key}
              >
                {isNewSpeaker ? (
                  <div className={styles.avatar}>
                    <Image
                      src={msg.alter.avatar}
                      alt={`${msg.alter.name} Arcade`}
                      width={32}
                      height={32}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ) : (
                  <div className={styles.avatarSpacer} />
                )}
                <div className={styles.bubbles}>
                  {isNewSpeaker && (
                    <span className={styles.name}>{msg.alter.name}</span>
                  )}
                  {msg.messages.map((text, j) => (
                    <div
                      key={j}
                      className={`${styles.bubble} ${getBubbleClass(j, msg.messages.length)}`}
                    >
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
