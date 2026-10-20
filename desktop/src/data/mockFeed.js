// Rich Video & Track Catalog for MUSE PC (YouTube + YouTube Music blend)

export const MOCK_VIDEOS = [
  {
    id: 'vid-1',
    youtubeId: 'I4DjHHVHWAE',
    title: 'Rich Flex (Official Music Video)',
    artist: 'Drake & 21 Savage',
    channel: 'Drake',
    channelAvatar: 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9',
    views: '142M views',
    timeAgo: '1 year ago',
    duration: 239, // 3:59
    durationFormatted: '3:59',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    videoThumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    badge: 'VEVO',
    isExplicit: true,
    lyrics: [
      { time: 0, text: '21, can you do somethin\' for me?' },
      { time: 4, text: 'Can you hit a lil\' rich flex for me?' },
      { time: 8, text: 'And 21, can you do a lil\' rich flex for me?' },
      { time: 13, text: 'Do your thing, 21, do your thing' },
      { time: 18, text: 'Yellow diamonds in the watch, this sh*t cost a lot' },
      { time: 23, text: 'Never question the pedigree, we run the block' }
    ]
  },
  {
    id: 'vid-2',
    youtubeId: 'V9PVRfjEBTI',
    title: 'BIRDS OF A FEATHER (Official Video)',
    artist: 'Billie Eilish',
    channel: 'Billie Eilish',
    channelAvatar: 'https://i.scdn.co/image/ab6761610000e5eb4a21b4760d2ecb7b0dcdc8da',
    views: '280M views',
    timeAgo: '4 months ago',
    duration: 198, // 3:18
    durationFormatted: '3:18',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
    videoThumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
    badge: 'LIVE',
    isExplicit: false,
    lyrics: [
      { time: 0, text: 'I want you to stay' },
      { time: 4, text: '\'Til I\'m in the grave' },
      { time: 9, text: '\'Til I rot away, dead and buried' },
      { time: 14, text: '\'Til I\'m in the casket you carry' },
      { time: 19, text: 'If you go, I\'m going too, uh' },
      { time: 24, text: '\'Cause it was always you' }
    ]
  },
  {
    id: 'vid-3',
    youtubeId: '4NRXx6U8ABQ',
    title: 'Blinding Lights (Live Studio Session)',
    artist: 'The Weeknd',
    channel: 'The Weeknd',
    channelAvatar: 'https://i.scdn.co/image/ab6761610000e5ebc1719ac9e6a75c1c25835018',
    views: '980M views',
    timeAgo: '3 years ago',
    duration: 200,
    durationFormatted: '3:20',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    videoThumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    badge: 'VEVO',
    isExplicit: false,
    lyrics: [
      { time: 0, text: 'Yeah' },
      { time: 6, text: 'I\'ve been tryna call' },
      { time: 10, text: 'I\'ve been on my own for long enough' },
      { time: 15, text: 'Maybe you can show me how to love, maybe' },
      { time: 21, text: 'I\'m going through withdrawals' }
    ]
  },
  {
    id: 'vid-4',
    youtubeId: 'T6eK-2OQtew',
    title: 'Not Like Us (Music Video)',
    artist: 'Kendrick Lamar',
    channel: 'Kendrick Lamar',
    channelAvatar: 'https://i.scdn.co/image/ab6761610000e5eb39ba6dcd4355c03de0b50918',
    views: '315M views',
    timeAgo: '5 months ago',
    duration: 274,
    durationFormatted: '4:34',
    cover: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
    videoThumbnail: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
    badge: 'VEVO',
    isExplicit: true,
    lyrics: [
      { time: 0, text: 'Psst, I see dead people' },
      { time: 5, text: 'Mustard on the beat, ho' },
      { time: 8, text: 'Say, Drake, I hear you like \'em young' },
      { time: 13, text: 'You better not ever go to cell block one' }
    ]
  },
  {
    id: 'vid-5',
    youtubeId: 'U-l4ya3Ejko',
    title: 'FE!N (ft. Playboi Carti) [Official Video]',
    artist: 'Travis Scott',
    channel: 'Travis Scott',
    channelAvatar: 'https://i.scdn.co/image/ab6761610000e5eb19c2790744c792d05570bb71',
    views: '190M views',
    timeAgo: '8 months ago',
    duration: 191,
    durationFormatted: '3:11',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    videoThumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    badge: 'VEVO',
    isExplicit: true,
    lyrics: [
      { time: 0, text: 'Just come outside, for the night' },
      { time: 4, text: 'Take your time, get your light' },
      { time: 8, text: 'FE!N, FE!N, FE!N, FE!N-FE!N' }
    ]
  },
  {
    id: 'vid-6',
    youtubeId: 'qpxBsh_oF1g',
    title: 'Say Yes To Heaven (Official Audio & Visualizer)',
    artist: 'Lana Del Rey',
    channel: 'Lana Del Rey',
    channelAvatar: 'https://i.scdn.co/image/ab6761610000e5ebb99cacf8acd5378206767261',
    views: '124M views',
    timeAgo: '1 year ago',
    duration: 209,
    durationFormatted: '3:29',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
    videoThumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
    badge: 'LIVE',
    isExplicit: false,
    lyrics: [
      { time: 0, text: 'If you dance, I\'ll dance' },
      { time: 4, text: 'And if you don\'t, I\'ll dance anyway' },
      { time: 8, text: 'Give peace a chance' },
      { time: 12, text: 'Let the fear you have fall away' }
    ]
  },
  {
    id: 'vid-7',
    youtubeId: 'JGwWNGJdvx8',
    title: 'Shape of You (Official Music Video)',
    artist: 'Ed Sheeran',
    channel: 'Ed Sheeran',
    channelAvatar: 'https://i.scdn.co/image/ab6761610000e5ebd55c95ad400aed87da52daec',
    views: '6.2B views',
    timeAgo: '7 years ago',
    duration: 263,
    durationFormatted: '4:23',
    cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80',
    videoThumbnail: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80',
    badge: 'VEVO',
    isExplicit: false,
    lyrics: [
      { time: 0, text: 'The club isn\'t the best place to find a lover' },
      { time: 4, text: 'So the bar is where I go' },
      { time: 8, text: 'Me and my friends at the table doing shots' }
    ]
  },
  {
    id: 'vid-8',
    youtubeId: 'eVli-tstM5E',
    title: 'Espresso (Official Music Video)',
    artist: 'Sabrina Carpenter',
    channel: 'Sabrina Carpenter',
    channelAvatar: 'https://i.scdn.co/image/ab6761610000e5eb78e45cfa4697ce3c437cb455',
    views: '210M views',
    timeAgo: '6 months ago',
    duration: 175,
    durationFormatted: '2:55',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=800&q=80',
    videoThumbnail: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=800&q=80',
    badge: 'VEVO',
    isExplicit: false,
    lyrics: [
      { time: 0, text: 'Now he\'s thinkin\' \'bout me every night, oh' },
      { time: 4, text: 'Is it that sweet? I guess so' },
      { time: 8, text: 'Say you can\'t sleep, baby, I know' },
      { time: 12, text: 'That\'s that me espresso' }
    ]
  }
];

export const MOCK_CHANNELS = [
  { id: 'ch-drake', name: 'Drake', avatar: 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9', subs: '31.4M subscribers' },
  { id: 'ch-billie', name: 'Billie Eilish', avatar: 'https://i.scdn.co/image/ab6761610000e5eb4a21b4760d2ecb7b0dcdc8da', subs: '51.8M subscribers' },
  { id: 'ch-theweeknd', name: 'The Weeknd', avatar: 'https://i.scdn.co/image/ab6761610000e5ebc1719ac9e6a75c1c25835018', subs: '35.9M subscribers' },
  { id: 'ch-travis', name: 'Travis Scott', avatar: 'https://i.scdn.co/image/ab6761610000e5eb19c2790744c792d05570bb71', subs: '18.3M subscribers' },
  { id: 'ch-lana', name: 'Lana Del Rey', avatar: 'https://i.scdn.co/image/ab6761610000e5ebb99cacf8acd5378206767261', subs: '16.5M subscribers' },
  { id: 'ch-ed', name: 'Ed Sheeran', avatar: 'https://i.scdn.co/image/ab6761610000e5ebd55c95ad400aed87da52daec', subs: '54.7M subscribers' }
];

export const MOCK_PLAYLISTS = [
  { id: 'pl-1', name: 'Liked Music', count: '48 tracks', isAuto: true, cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80', desc: 'Your saved favorite songs' },
  { id: 'pl-2', name: 'Late Night Chill & Lo-Fi', count: '24 videos', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80', desc: 'Mellow beats for deep focus & late hours' },
  { id: 'pl-3', name: 'Gym & Workout Bangers', count: '38 videos', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80', desc: 'High-energy trap and bass' },
  { id: 'pl-4', name: 'Acoustic & Live Sessions', count: '19 videos', cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=400&q=80', desc: 'Raw studio vocals and unplugged sets' },
  { id: 'pl-5', name: 'Synthwave & Electronic Dreams', count: '31 videos', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80', desc: 'Retro neon synths and nocturnal rhythms' },
  { id: 'pl-6', name: 'Coffeehouse Acoustic Morning', count: '16 videos', cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80', desc: 'Gentle melodies to wake up to' }
];

export const MOCK_QUICK_PICKS = [
  { id: 'qp-1', title: 'Rich Flex', artist: 'Drake & 21 Savage', duration: '3:59', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80', videoThumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80' },
  { id: 'qp-2', title: 'BIRDS OF A FEATHER', artist: 'Billie Eilish', duration: '3:18', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80', videoThumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80' },
  { id: 'qp-3', title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:20', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80', videoThumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80' },
  { id: 'qp-4', title: 'Not Like Us', artist: 'Kendrick Lamar', duration: '4:34', cover: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=400&q=80', videoThumbnail: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80' },
  { id: 'qp-5', title: 'FE!N (ft. Playboi Carti)', artist: 'Travis Scott', duration: '3:11', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80', videoThumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80' },
  { id: 'qp-6', title: 'Say Yes To Heaven', artist: 'Lana Del Rey', duration: '3:29', cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80', videoThumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80' },
  { id: 'qp-7', title: 'Shape of You', artist: 'Ed Sheeran', duration: '4:23', cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=400&q=80', videoThumbnail: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80' },
  { id: 'qp-8', title: 'Espresso', artist: 'Sabrina Carpenter', duration: '2:55', cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80', videoThumbnail: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=800&q=80' }
];

export const MOCK_RECENT_TRACKS = [
  { id: 'rec-1', title: 'BIRDS OF A FEATHER', artist: 'Billie Eilish', album: 'HIT ME HARD AND SOFT', playedAt: '4 minutes ago', duration: '3:18', plays: '48 plays', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80' },
  { id: 'rec-2', title: 'Rich Flex (Official Video)', artist: 'Drake & 21 Savage', album: 'Her Loss', playedAt: '28 minutes ago', duration: '3:59', plays: '112 plays', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80' },
  { id: 'rec-3', title: 'Blinding Lights (Live Studio)', artist: 'The Weeknd', album: 'After Hours', playedAt: '1 hour ago', duration: '3:20', plays: '94 plays', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80' },
  { id: 'rec-4', title: 'FE!N', artist: 'Travis Scott', album: 'UTOPIA', playedAt: '3 hours ago', duration: '3:11', plays: '67 plays', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80' },
  { id: 'rec-5', title: 'Say Yes To Heaven', artist: 'Lana Del Rey', album: 'Did you know that there\'s a tunnel...', playedAt: 'Yesterday at 9:15 PM', duration: '3:29', plays: '143 plays', cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80' },
  { id: 'rec-6', title: 'Shape of You', artist: 'Ed Sheeran', album: '÷ (Divide)', playedAt: 'Yesterday at 4:30 PM', duration: '4:23', plays: '52 plays', cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=400&q=80' },
  { id: 'rec-7', title: 'Not Like Us', artist: 'Kendrick Lamar', album: 'Single', playedAt: '2 days ago', duration: '4:34', plays: '81 plays', cover: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=400&q=80' },
  { id: 'rec-8', title: 'Espresso', artist: 'Sabrina Carpenter', album: 'Short n\' Sweet', playedAt: '3 days ago', duration: '2:55', plays: '39 plays', cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80' }
];

export const MOCK_SAVED_ALBUMS = [
  { id: 'alb-1', title: 'Her Loss', artist: 'Drake & 21 Savage', year: '2022', tracks: '16 songs', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80' },
  { id: 'alb-2', title: 'HIT ME HARD AND SOFT', artist: 'Billie Eilish', year: '2024', tracks: '10 songs', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80' },
  { id: 'alb-3', title: 'After Hours', artist: 'The Weeknd', year: '2020', tracks: '14 songs', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80' },
  { id: 'alb-4', title: 'UTOPIA', artist: 'Travis Scott', year: '2023', tracks: '19 songs', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80' },
  { id: 'alb-5', title: 'Born To Die', artist: 'Lana Del Rey', year: '2012', tracks: '15 songs', cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80' },
  { id: 'alb-6', title: '÷ (Divide)', artist: 'Ed Sheeran', year: '2017', tracks: '16 songs', cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=400&q=80' }
];
