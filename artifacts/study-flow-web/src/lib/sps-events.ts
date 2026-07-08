const FUN_KEYWORDS = [
  "social", "party", "mixer", "reception", "dinner", "game", "fun", "happy hour",
  "happy", "networking", "celebration", "meetup", "gathering", "festival",
  "comedy", "music", "dance", "sports", "trip", "hike", "tour", "show", "film",
  "movie", "concert", "brunch", "lunch", "drinks", "hangout", "potluck", "picnic",
  "outing", "cultural", "showcase", "performance", "karaoke", "trivia",
  "open mic", "bbq", "barbecue", "grill", "cooking", "craft", "art", "yoga",
  "fitness", "run", "walk", "food", "taste", "coffee", "celebrate", "volunteer",
  "paint", "wine", "beer", "tea", "afternoon", "evening", "night out",
];

export function isFunEvent(title: string): boolean {
  const lower = title.toLowerCase();
  return FUN_KEYWORDS.some((kw) => lower.includes(kw));
}
