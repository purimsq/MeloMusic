// Sample high-fidelity tracks for Melo with universally reliable streams & synced lyrics

export const DEFAULT_FALLBACK_COVER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="%23222224"/><circle cx="300" cy="300" r="180" fill="none" stroke="%23444446" stroke-width="2"/><path d="M220 300 Q300 180 380 300 T540 300" fill="none" stroke="%2388888E" stroke-width="3" stroke-linecap="round"/><circle cx="300" cy="300" r="28" fill="%23EBEBE9"/><text x="300" y="440" font-family="sans-serif" font-size="28" font-weight="600" fill="%23FFFFFF" text-anchor="middle" letter-spacing="4">MELO</text></svg>`;

export const SAMPLE_TRACKS = [
  {
    id: 'sample-clash-of-titans',
    title: 'CLASH OF TITANS',
    artist: 'KSI Vs Tommy Fury',
    album: 'Prime Showdown',
    duration: 220, // 03:40
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    lyrics: `[00:00.00] Midnight roads and neon sinks
[00:08.50] City glowing in your eyes
[00:15.20] Stand in the center of the ring tonight
[00:23.10] The clash of titans under heavy lights
[00:31.40] We built this kingdom from the stone and dust
[00:40.00] No fear, no shadows, in the roar we trust
[00:48.80] Hear the bell chiming, echoes in the dark
[00:57.20] Two warriors striking for the final spark
[01:06.10] Stand in the center of the ring tonight
[01:14.50] The clash of titans under heavy lights
[01:23.20] Midnight roads and neon sinks
[01:31.80] City glowing in your eyes
[01:40.50] Everything we risked to get this far
[01:49.00] Shining brighter than the farthest star
[01:58.20] Two champions rising when the curtain falls
[02:08.00] Forever written on these stadium walls`
  },
  {
    id: 'sample-blinding-lights',
    title: 'BLINDING LIGHTS',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: 200, // 03:20
    cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    lyrics: `[00:00.00] Yeah
[00:12.50] I've been tryna call
[00:15.80] I've been on my own for long enough
[00:21.00] Maybe you can show me how to love, maybe
[00:28.40] I'm going through withdrawals
[00:33.00] You don't even have to do too much
[00:37.20] You can turn me on with just a touch, baby
[00:44.80] I look around and Sin City's cold and empty
[00:52.50] No one's around to judge me
[00:56.80] I can't see clearly when you're gone
[01:01.50] I said, ooh, I'm blinded by the lights
[01:09.80] No, I can't sleep until I feel your touch
[01:18.00] I said, ooh, I'm drowning in the night
[01:26.50] Oh, when I'm like this, you're the one I trust`
  },
  {
    id: 'sample-birds-of-a-feather',
    title: 'BIRDS OF A FEATHER',
    artist: 'Billie Eilish',
    album: 'HIT ME HARD AND SOFT',
    duration: 196, // 03:16
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    lyrics: `[00:00.00] I want you to stay
[00:05.40] 'Til I'm in the grave
[00:10.20] 'Til I rot away, dead and buried
[00:15.80] 'Til I'm in the casket you carry
[00:21.50] If you go, I'm going too, uh
[00:26.80] 'Cause it was always you, alright
[00:32.40] And if I'm turning blue, please don't save me
[00:37.90] Nothing in this world could ever change me
[00:43.20] Birds of a feather, we should stick together
[00:48.50] I know I said I'd never think I wasn't better alone
[00:54.00] Can't change the weather, might not be forever
[00:59.50] But if it's forever, it's even better`
  },
  {
    id: 'sample-say-yes-to-heaven',
    title: 'SAY YES TO HEAVEN',
    artist: 'Lana Del Rey',
    album: 'Did you know that there\'s a tunnel',
    duration: 209, // 03:29
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    lyrics: `[00:00.00] If you dance I'll dance
[00:08.50] And if you don't I'll dance anyway
[00:17.20] Give peace a chance
[00:25.80] Let the fear you have just fade away
[00:34.50] Say yes to heaven
[00:42.80] Say yes to me
[00:51.20] Say yes to heaven
[00:59.80] Say yes to me
[01:08.50] If you go I'll go
[01:17.20] And if you don't I'll go anyway`
  }
];
