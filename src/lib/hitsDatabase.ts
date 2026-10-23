export interface Hit {
  title: string;
  seed: number;
  genre: string;
  cover: string;
}

export const HITS_DATABASE: Hit[] = [
  {
    title: "The Weeknd — Blinding Lights",
    seed: 0.15,
    genre: "Synthwave",
    cover: "synthwave",
  },
  {
    title: "Michael Jackson — Billie Jean",
    seed: -0.22,
    genre: "Funk Pop",
    cover: "funk",
  },
  {
    title: "Ed Sheeran — Shape of You",
    seed: 0.08,
    genre: "Acoustic Pop",
    cover: "acoustic",
  },
  {
    title: "Daft Punk — Get Lucky",
    seed: 0.35,
    genre: "Disco / Electronic",
    cover: "disco",
  },
];
