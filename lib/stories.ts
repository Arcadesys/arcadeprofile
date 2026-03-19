import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const STORIES_DIR = path.join(process.cwd(), 'content', 'stories');

export interface StoryMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  coverImage: string;
  status: 'in-progress' | 'complete';
  description: string;
  chapterCount: number;
  latestChapterDate: string;
}

export interface Chapter {
  storySlug: string;
  chapter: number;
  title: string;
  date: string;
  excerpt: string;
  content: string;
}

export interface ChapterWithNav extends Chapter {
  prev: number | null;
  next: number | null;
  totalChapters: number;
  storyTitle: string;
}

export interface StoryDetail extends StoryMeta {
  chapters: Chapter[];
}

export function getAllStories(): StoryMeta[] {
  if (!fs.existsSync(STORIES_DIR)) return [];

  const dirs = fs.readdirSync(STORIES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  const stories: StoryMeta[] = [];

  for (const dir of dirs) {
    const indexPath = path.join(STORIES_DIR, dir.name, '_index.mdx');
    if (!fs.existsSync(indexPath)) continue;

    const raw = fs.readFileSync(indexPath, 'utf8');
    const { data, content } = matter(raw);

    const chapters = listChapterFiles(dir.name);
    const latestChapterDate = chapters.length > 0
      ? chapters[chapters.length - 1].date
      : data.date || '';

    stories.push({
      slug: dir.name,
      title: data.title || dir.name,
      date: data.date || '',
      excerpt: data.excerpt || content.slice(0, 200).replace(/[#*_\n]/g, ' ').trim() + '...',
      coverImage: data.coverImage || '',
      status: data.status === 'complete' ? 'complete' : 'in-progress',
      description: content,
      chapterCount: chapters.length,
      latestChapterDate,
    });
  }

  return stories
    .filter(s => s.date)
    .sort((a, b) => new Date(b.latestChapterDate).getTime() - new Date(a.latestChapterDate).getTime());
}

export function getStory(slug: string): StoryDetail | null {
  const storyDir = path.join(STORIES_DIR, slug);
  if (!fs.existsSync(storyDir)) return null;

  const indexPath = path.join(storyDir, '_index.mdx');
  if (!fs.existsSync(indexPath)) return null;

  const raw = fs.readFileSync(indexPath, 'utf8');
  const { data, content } = matter(raw);

  const chapters = listChapterFiles(slug);
  const latestChapterDate = chapters.length > 0
    ? chapters[chapters.length - 1].date
    : data.date || '';

  return {
    slug,
    title: data.title || slug,
    date: data.date || '',
    excerpt: data.excerpt || '',
    coverImage: data.coverImage || '',
    status: data.status === 'complete' ? 'complete' : 'in-progress',
    description: content,
    chapterCount: chapters.length,
    latestChapterDate,
    chapters,
  };
}

export function getChapter(storySlug: string, chapterNum: number): ChapterWithNav | null {
  const story = getStory(storySlug);
  if (!story) return null;

  const chapter = story.chapters.find(c => c.chapter === chapterNum);
  if (!chapter) return null;

  const chapterNums = story.chapters.map(c => c.chapter);
  const idx = chapterNums.indexOf(chapterNum);

  return {
    ...chapter,
    prev: idx > 0 ? chapterNums[idx - 1] : null,
    next: idx < chapterNums.length - 1 ? chapterNums[idx + 1] : null,
    totalChapters: story.chapterCount,
    storyTitle: story.title,
  };
}

function listChapterFiles(slug: string): Chapter[] {
  const storyDir = path.join(STORIES_DIR, slug);
  if (!fs.existsSync(storyDir)) return [];

  const files = fs.readdirSync(storyDir)
    .filter(f => f.endsWith('.mdx') && f !== '_index.mdx');

  const chapters: Chapter[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(storyDir, file), 'utf8');
    const { data, content } = matter(raw);

    const chapterNum = data.chapter ?? parseInt(file.replace('.mdx', ''), 10);
    if (isNaN(chapterNum)) continue;

    chapters.push({
      storySlug: slug,
      chapter: chapterNum,
      title: data.title || `Chapter ${chapterNum}`,
      date: data.date || '',
      excerpt: data.excerpt || '',
      content,
    });
  }

  return chapters.sort((a, b) => a.chapter - b.chapter);
}
