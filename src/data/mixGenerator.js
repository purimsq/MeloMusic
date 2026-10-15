// Mix Generator: Curates 25-30 songs per mix based on user favorites and sound profiles
import { ARTISTS } from './artists.js';
import { SAMPLE_TRACKS, DEFAULT_FALLBACK_COVER } from './samples.js';

// Extended artist song catalog to ensure deep mixes with 25-30 distinct songs each
const EXTENDED_SONGS = {
  'drake': [
    'Rich Flex', "God's Plan", 'One Dance', 'Hotline Bling',
    'Passionfruit', 'Hold On We’re Going Home', 'Nice For What', 'In My Feelings', 'Nonstop'
  ],
  'billie-eilish': [
    'Birds of a Feather', 'Bad Guy', 'Happier Than Ever', 'Ocean Eyes',
    'Lunch', 'Chihiro', 'Bury a Friend', 'Everything I Wanted', 'When the Party’s Over'
  ],
  'the-weeknd': [
    'Blinding Lights', 'Starboy', 'The Hills', 'Save Your Tears',
    'Can’t Feel My Face', 'In The Night', 'I Feel It Coming', 'Die For You', 'Out of Time'
  ],
  'lana-del-rey': [
    'Say Yes To Heaven', 'Summertime Sadness', 'Video Games', 'Diet Mountain Dew',
    'Young & Beautiful', 'Born to Die', 'West Coast', 'Doin’ Time', 'Blue Jeans'
  ],
  'kendrick-lamar': [
    'Not Like Us', 'HUMBLE.', 'DNA.', 'Alright',
    'Swimming Pools', 'King Kunta', 'Money Trees', 'Love', 'Loyalty'
  ],
  'eminem': [
    'Lose Yourself', 'Without Me', 'Houdini', 'The Real Slim Shady',
    'Till I Collapse', 'Mockingbird', 'Godzilla', 'Rap God', 'Stan'
  ],
  'travis-scott': [
    'SICKO MODE', 'FE!N', 'Goosebumps', 'Highest in the Room',
    'Antidote', 'Butterflies', 'Type Shit', 'Stargazing', 'Telekinesis'
  ],
  'ariana-grande': [
    'we can’t be friends', '7 rings', 'thank u, next', 'Side to Side',
    'Into You', 'No Tears Left To Cry', 'Positions', 'God is a Woman', 'One Last Time'
  ],
  'dua-lipa': [
    'Levitating', "Don't Start Now", 'Houdini', 'Dance The Night',
    'Physical', 'Break My Heart', 'New Rules', 'Illusion', 'Love Again'
  ],
  'taylor-swift': [
    'Cruel Summer', 'Anti-Hero', 'Blank Space', 'Cardigan',
    'Style', 'Shake It Off', 'Karma', 'Lover', 'Fortnight'
  ],
  'sza': [
    'Kill Bill', 'Snooze', 'Good Days', 'Nobody Gets Me',
    'Saturn', 'Broken Clocks', 'The Weekend', 'I Hate U', 'Shirt'
  ],
  'post-malone': [
    'Sunflower', 'Circles', 'Rockstar', 'I Had Some Help',
    'Congratulations', 'White Iverson', 'Psycho', 'Chemical', 'Better Now'
  ],
  'bad-bunny': [
    'Monaco', 'Me Porto Bonito', 'Tití Me Preguntó', 'Dakiti',
    'Moscow Mule', 'Ojitos Lindos', 'Neverita', 'WHERE SHE GOES', 'Efecto'
  ],
  'j-cole': [
    'No Role Modelz', 'Middle Child', 'Wet Dreamz', 'ATM',
    'Work Out', 'Power Trip', 'Deja Vu', 'Neighbors', 'Crooked Smile'
  ],
  'nicki-minaj': [
    'Super Bass', 'Starships', 'Anaconda', 'Super Freaky Girl',
    'Chun-Li', 'Pound The Alarm', 'Moment 4 Life', 'Bang Bang', 'Star'
  ],
  'ksi': [
    'CLASH OF TITANS', 'Holiday', 'Down Like That', 'Not Over Yet',
    'Patience', 'Lighter', 'Voices', 'Really Love', 'Lose'
  ]
};

// Stream audio pool
const AUDIO_STREAMS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
];

/**
 * Builds a track object
 */
function createTrack(id, title, artistObj, index) {
  const audioIndex = (index + (artistObj.id.charCodeAt(0) || 0)) % AUDIO_STREAMS.length;
  return {
    id,
    title: title.toUpperCase(),
    artist: artistObj.name,
    album: `${artistObj.name} • Special Edition`,
    duration: 185 + ((index * 13) % 75), // 185s to 260s
    cover: artistObj.photo || DEFAULT_FALLBACK_COVER,
    audioUrl: AUDIO_STREAMS[audioIndex],
    lyrics: `[00:00.00] ${title} - ${artistObj.name}\n[00:08.00] Feel the rhythm flowing through the night\n[00:16.00] Echoes in the ceramic sanctuary\n[00:25.00] Every beat crafted with precision\n[00:36.00] Melo sound signature in high fidelity\n[00:48.00] Music without borders`
  };
}

/**
 * Generates 5 curated mixes, each containing at least 25 to 30 songs
 * @param {Array<string>} favoriteArtistIds User's selected artist IDs
 * @returns {Array<Object>} List of curated playlists
 */
export function generateCuratedMixes(favoriteArtistIds = []) {
  // Ensure we have favorite artists, fallback to popular ones
  let userArtists = ARTISTS.filter(a => favoriteArtistIds.includes(a.id));
  if (userArtists.length === 0) {
    userArtists = [ARTISTS[0], ARTISTS[1], ARTISTS[3], ARTISTS[4]];
  }

  const primaryArtist = userArtists[0];

  // 1. Made For You Daily Mix (28 Songs)
  // Combines user's favorite artists + related artists
  const dailyMixTracks = [];
  let trackCounter = 1;
  const mixArtistsPool = [...userArtists];
  ARTISTS.forEach(a => {
    if (!mixArtistsPool.some(m => m.id === a.id)) mixArtistsPool.push(a);
  });

  for (let i = 0; i < 28; i++) {
    const artist = mixArtistsPool[i % mixArtistsPool.length];
    const songList = EXTENDED_SONGS[artist.id] || artist.topSongs;
    const songName = songList[Math.floor(i / mixArtistsPool.length) % songList.length];
    dailyMixTracks.push(createTrack(`mix-daily-${trackCounter}`, songName, artist, trackCounter));
    trackCounter++;
  }

  // 2. Nocturnal Beats & Melancholy (30 Songs)
  const nocturnalArtists = ARTISTS.filter(a =>
    ['the-weeknd', 'lana-del-rey', 'billie-eilish', 'drake', 'sza'].includes(a.id)
  );
  const nocturnalTracks = [];
  for (let i = 0; i < 30; i++) {
    const artist = nocturnalArtists[i % nocturnalArtists.length];
    const songList = EXTENDED_SONGS[artist.id] || artist.topSongs;
    const songName = songList[i % songList.length];
    nocturnalTracks.push(createTrack(`mix-nocturnal-${i + 1}`, songName, artist, i + 1));
  }

  // 3. Pure Energy & Workout Flow (28 Songs)
  const energyArtists = ARTISTS.filter(a =>
    ['kendrick-lamar', 'eminem', 'travis-scott', 'ksi', 'j-cole'].includes(a.id)
  );
  const energyTracks = [];
  for (let i = 0; i < 28; i++) {
    const artist = energyArtists[i % energyArtists.length];
    const songList = EXTENDED_SONGS[artist.id] || artist.topSongs;
    const songName = songList[i % songList.length];
    energyTracks.push(createTrack(`mix-energy-${i + 1}`, songName, artist, i + 1));
  }

  // 4. Pop Euphoria & Golden Sun (28 Songs)
  const popArtists = ARTISTS.filter(a =>
    ['ariana-grande', 'dua-lipa', 'taylor-swift', 'post-malone', 'bad-bunny'].includes(a.id)
  );
  const popTracks = [];
  for (let i = 0; i < 28; i++) {
    const artist = popArtists[i % popArtists.length];
    const songList = EXTENDED_SONGS[artist.id] || artist.topSongs;
    const songName = songList[i % songList.length];
    popTracks.push(createTrack(`mix-pop-${i + 1}`, songName, artist, i + 1));
  }

  // 5. Deep Cuts: The Sound of [Primary Artist] (26 Songs)
  const spotlightArtists = [primaryArtist, ...userArtists.filter(a => a.id !== primaryArtist.id), ARTISTS[1]];
  const spotlightTracks = [];
  for (let i = 0; i < 26; i++) {
    const artist = spotlightArtists[i % spotlightArtists.length];
    const songList = EXTENDED_SONGS[artist.id] || artist.topSongs;
    const songName = songList[i % songList.length];
    spotlightTracks.push(createTrack(`mix-spotlight-${i + 1}`, songName, artist, i + 1));
  }

  return [
    {
      id: 'mix-daily',
      title: 'Daily Mix 1',
      subtitle: userArtists.slice(0, 3).map(a => a.name).join(', '),
      description: `Your signature daily mix woven with favorites from ${userArtists.slice(0, 2).map(a => a.name).join(' & ')} and sonic discoveries.`,
      cover: primaryArtist.photo,
      badge: 'Curated Daily',
      tracks: dailyMixTracks
    },
    {
      id: 'mix-nocturnal',
      title: 'Night Drive Mix',
      subtitle: 'The Weeknd, Lana Del Rey, SZA',
      description: 'Lush atmospheric soundscapes, nocturnal beats, and late night highway reflections.',
      cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
      badge: 'Late Night',
      tracks: nocturnalTracks
    },
    {
      id: 'mix-energy',
      title: 'Pure Energy Mix',
      subtitle: 'Kendrick Lamar, Eminem, Travis Scott',
      description: 'Heavy 808s, relentless tempo, and unyielding lyrical power for peak drive.',
      cover: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
      badge: 'High Voltage',
      tracks: energyTracks
    },
    {
      id: 'mix-pop',
      title: 'Pop Euphoria Mix',
      subtitle: 'Ariana Grande, Dua Lipa, Taylor Swift',
      description: 'Radiant melodies, sparkling choruses, and feel-good dance anthems.',
      cover: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      badge: 'Uplifting',
      tracks: popTracks
    },
    {
      id: 'mix-spotlight',
      title: `${primaryArtist.name} & Beyond`,
      subtitle: `Essential cuts and similar echoes`,
      description: `A deep dive through ${primaryArtist.name}’s musical orbit and kindred creative frequencies.`,
      cover: primaryArtist.photo,
      badge: 'Artist Spotlight',
      tracks: spotlightTracks
    }
  ];
}
