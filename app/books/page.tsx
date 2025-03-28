import React from 'react';
import Image from 'next/image';
import "../globals.css";
import { redirect } from 'next/navigation';

interface BookProps {
  title: string;
  image: string;
  description: string;
  buyLink: string;
}

const Book: React.FC<BookProps> = ({ title, image, description, buyLink }) => (
  <div className="book">
    <Image src={image} alt={title} width={200} height={300} />
    <div className="book-title">{title}</div>
    <p>{description}</p>
    <a href={buyLink} className="button-link">Buy</a>
  </div>
);

const books: BookProps[] = [
  {
    title: "Bait and Switch",
    image: "/images/books/baitandswitch.jpg",
    description: "In Fenton's world, some kids are toons. Some think the change is biological. Others think the change is social. But some kids turn into toons, and Fenton's father just wants it to stop. He's even built a Realist movement to ban toons from the real world, hoping that it will keep his own children from following in their estranged mother's cartoon footsteps. Tensions rise as the Realists lobby to get their ban set into law, and toons fight for their right to be themselves. Fenton's father knows he can count on his two boys to stand behind him and his dream of building a safe, a toon-free reality. It's just too bad that Fenton's becoming a toon.... Cover artwork by Dustin Friend.",
    buyLink: "https://www.amazon.com/Bait-Switch-Austen-Crowder/dp/145631890X/ref=sr_1_1?crid=2CJTH7Z4LZZGY&dib=eyJ2IjoiMSJ9.GTj60YzLgvYFEjjUMZgiOV0jxYYsgbH2rBKoPTelYOak2iPXr6_THQwMOtkoGxAm0aWciS3X5hWCOCAJE33bYH21Sndgij6m3m9hi-lfUHVZM32HLyVTVx3KBT2GYFs3-C3aG9CHFBgbg4Ab1TGhBg.Q13mdXJ95tkJxETwESmGDoiiiWaFOijJd0MKTwSEouE&dib_tag=se&keywords=bait+and+switch+austen&qid=1708037120&sprefix=bait+and+switch+austen%2Caps%2C125&sr=8-1"
  },
  {
    title: "The Painted Cat",
    image: "/images/books/thepaintedcat.jpg",
    description: "Janet lives in two worlds. In one world, she is Miss Perch, teacher at a small school deep in the corn grids, helping kids who are turning into cartoon find their way out of town. In the other, she is Bunny Cat, and paints herself up to be the very same type of cartoon cat her small town has grown to hate. The wall separating those two worlds is starting to break down. Between rekindling a relationship with an old college flame and discovering how much she loves being Bunny Cat her two worlds are starting to merge. Keeping up the appearances of two separate lives is bad enough, but when kids start getting sent away for turning toon she knows she can't stand on the sideline any longer. Two things are for sure: the two worlds won't stay distinct for much longer, and Janet won't come out unscathed.",
    buyLink: "https://furplanet.com/shop/item.aspx?itemid=778"
  },
  {
    title: "A Fuzzy Place",
    image: "/images/books/afuzzyplace.jpg",
    description: "Furry fiction and I have a complicated relationship. For the past ten years I've been in and out of the furry community. Conventions, art trades, commissions, badges, even suits – I tried it all. Most of my best friends came from the fandom and continue to be the reason I come back year after year. It's not a bad fandom at all; it's young, vibrant, and the thing that kept me from feeling alone in my darkest moments. This collection contains works from every stage of my time in furry. Revised works from high school, works from long nights at college, stories that helped me escape the stresses of teaching, and even some memoir make appearances here. These stories let me find my way through some tough times, express feelings I didn't want to admit were there, and ultimately find peace with an identity as an awesome trans woman. It's been a long, complicated road but furry is always there, hiding just under the fuzzy places of memory.",
    buyLink: "https://www.amazon.com/Fuzzy-Place-Stories-Shaped-Subculture-ebook/dp/B00H7K7EYQ/ref=sr_1_1?crid=1RI5RYHEZO4QO&dib=eyJ2IjoiMSJ9.ghbjBJ7ipOEeqafDq5ag6XEs-9TExXmW8AYUUlk9I8XbCrItCD0mtsv5VyAw6NEL.bQhlJRZ_vlc4hTZRFNHLb_Ce1lkcsLdxmb6vzrC8Gyc&dib_tag=se&keywords=a+fuzzy+place+austen&qid=1708037222&sprefix=a+fuzzy+place+austen%2Caps%2C125&sr=8-1"
  },
  {
    title: "Closet Cats",
    image: "/images/books/closetcats.jpg",
    description: "Three romantic short stories about lesbians, trans people, catgirls, and dragons. Ginny's Magic: Evelyn lands a date with the catgirl from the next world over, and take a little trip through Chicago's Boystown neighborhood. Dragons in the Middle: Dave lands himself in a pickle after a one night stand with a wishing dragoness. Closet Cat: Stuck in a rut, Charlie's marriage depends on a collar and cat ears provided by a witch he knew in college.",
    buyLink: "https://www.amazon.com/Closet-Cats-Austen-Tucker-ebook/dp/B0B311T8P1/ref=sr_1_1?crid=26C247NRZJ9R&dib=eyJ2IjoiMSJ9.Bos87-7Oqm7USJVQw4C4345ltr8O4WierNrLyL5dscLRz9RFMuCYg5lhN6IrwZnqiKapuxbpK1eVgHTm2yF3u-AP6F8yfJGh-XGjBQPyg7g.77iXUtFAfZSnafnpykWd9mcOLRboWmuqNh_lTOnvmns&dib_tag=se&keywords=closet+cats+austen&qid=1708037182&sprefix=closet+cats+austen%2Caps%2C132&sr=8-1"
  }
];

export default function BooksPage() {
  redirect('/previews');
}