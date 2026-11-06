import { profiles, type Genre } from './studio-profiles';

const extraIdeas: Record<Genre, string[]> = {
  melodic: [
    'I still make coffee for two before I remember. A quiet, honest vocal that opens into a warm melodic release.',
    'Coming home after years away and finding the spare key in the same place. Hopeful, spacious melodic house.',
    'We meet at the airport knowing neither of us can stay. Leave the goodbye unfinished.',
    'The first night I enjoy my own company without reaching for my phone. Restrained verses and a gentle lift.',
    'A voice message I recorded six times and never sent. Intimate vocals with an evolving arpeggio.',
    'Driving past our old apartment and noticing someone else’s curtains. Bittersweet, without asking to go back.',
    'My daughter falls asleep on the drive home; I wish I could slow the years down. Tender and understated.',
    'Two strangers miss the last train and talk until morning. A small connection, no grand promises.',
    'Learning to accept an apology that came years late. Warm bass, emotional space and a simple sung hook.'
  ],
  latin: [
    'My friends are ready to leave, but the DJ has just played my favourite groove. Playful Spanish female vocals.',
    'She puts her shoes under the table and dances barefoot. A confident Spanish hook with bright percussion.',
    'We keep reaching for the same glass of water between dances. Small details and teasing Spanish dialogue.',
    'The power goes out at a party and everyone keeps the rhythm with their hands. Joyful Latin house.',
    'I stop checking whether anyone is watching and finally enjoy myself. Short Spanish vocals and a warm bassline.',
    'An ex walks into the club; I turn back to my friends and keep dancing. Cool confidence, no revenge speech.',
    'A summer downpour catches us outside; we stay under the awning laughing. Sensual Spanish call-and-response.',
    'The bartender knows I’m only here for the music. A dry spoken Spanish hook and rolling percussion.',
    'We share a taxi home but neither wants the conversation to end. Intimate Spanish phrases and a deep groove.'
  ],
  tech: [
    'I spend twenty minutes in the wrong queue and discover it’s the coat check. Deadpan spoken hook and a dirty drop.',
    'My smartwatch congratulates me on a workout at three in the morning. Short rap phrases and cheeky ad-libs.',
    'The DJ drops the bass exactly when I drop my beer. One ridiculous hook, a brief scratch and heavy tech house.',
    'I promised one drink. My jacket has now been in coat check for six hours. Dry delivery and a funny reveal.',
    'Trying to Shazam a track while everyone keeps yelling into my phone. Hip-hop phrasing, sparse scratches.',
    'The group chat keeps asking where I am. I’m standing beside them. Short spoken verses and a cheeky hook.',
    'The bouncer remembers me from twenty years ago. Older, still dancing, with nothing to prove.',
    'My knees have filed a complaint but the DJ won’t stop playing bangers. Funny spoken hook with hip-hop swagger.',
    'I wave at someone who was waving at the person behind me, then turn it into a dance move. Awkward club comedy.'
  ],
  summit: [
    'We lose each other in the crowd and meet again just as the drop hits. An emotional female hook and euphoric release.',
    'I almost stayed home tonight. Now I’m at the front with my eyes closed. Intimate vocal into a driving melodic drop.',
    'She asks me to stay for one more track; my taxi is already outside. One urgent, memorable vocal hook.',
    'The city looks different walking home with you. A hopeful chorus over dark rolling bass.',
    'I see your name light up my phone after months of silence. Tension, hesitation and a powerful sung hook.',
    'We both know this is the last weekend together. Keep the words simple and the release enormous.',
    'I stop waiting for someone else to give me permission to start over. Vulnerable verse, confident melodic release.',
    'A friend pulls me onto the floor after a difficult year. Relief in the vocal without motivational slogans.',
    'The sun comes through the warehouse windows and nobody says a word. Sparse soulful vocals and expansive chords.'
  ],
  hugel: [
    'She leaves her phone facedown and takes my hand. Sparse Spanish vocals, warm bass and interlocking percussion.',
    'A hotel balcony, distant music, and a decision to go downstairs. Intimate Spanish hook with a slow-burning groove.',
    'We trade names only after the third dance. A teasing Spanish refrain and hypnotic hand drums.',
    'The beach bar is closing, but someone puts another record on. Warm percussion and a tiny bittersweet hook.',
    'I recognise your laugh before I see you across the terrace. Short Spanish fragments and deep bass.',
    'She teaches me one step, then changes it when I catch on. Playful call-and-response with lots of space.',
    'A shared cigarette remains unlit because neither of us stops talking. Understated desire and a hypnotic groove.',
    'The ferry leaves at dawn; we avoid looking at the clock. Intimate Spanish vocals and earthy percussion.',
    'We dance apart but keep checking that the other is still there. Restrained Spanish phrases and warm rolling bass.'
  ],
  cali: [
    'She ties up her hair, hands her friend her bag, and heads straight to the floor. Confident Spanish vocals and timbale fills.',
    'We step outside for air and hurry back when we hear the piano. Hot Cali club energy and a playful Spanish hook.',
    'He tries to impress her with his footwork; she laughs and leads. Teasing Spanish dialogue over a driving house groove.',
    'A crowded Cali dance floor, one small fan, and an excuse to stand closer. Sensual vocals with piano montuno accents.',
    'My friends start a bet on who will ask whom to dance. Cheeky Spanish call-and-response and punchy percussion.',
    'Her earrings brush my cheek as she tells me to follow her lead. Close-up sensual detail, sparse Spanish phrases.',
    'We arrive separately and leave our chairs empty all night. Upbeat Spanish hook with congas and short brass accents.',
    'She tells the taxi driver to wait, then changes her mind and goes back inside. One more dance, hot Cali energy.',
    'The DJ cuts the music and the room finishes our hook. A short original Spanish refrain and an energetic house drop.'
  ],
  camelphat: [
    'Your coat is still at my place, but neither of us mentions it. A haunting restrained hook over dark melodic house.',
    'I get off one stop early to walk the street where we met. Intimate vocals, evolving arpeggios and a slow release.',
    'We stand on opposite balconies while the city falls asleep. A hypnotic vocal phrase and deep progressive tension.',
    'A message arrives with only two words: still awake? Keep the hook short and the bass warm and insistent.',
    'I nearly call your name in a room full of strangers. Sparse verses and a haunting melodic motif.',
    'We return to the same club a year later and choose different corners. Understated emotion and a dark rolling groove.',
    'The elevator stops and we finally say what we avoided all evening. A tense intimate hook with spacious synths.',
    'I leave the party without saying goodbye, then hear footsteps behind me. A slow progressive build and controlled release.',
    'You fall asleep on my shoulder before I can ask you to stay. Vulnerable vocals with a hypnotic bassline.'
  ],
  underground: [
    'A stranger taps my shoulder and says: you heard that too? Turn that into a short unsettling spoken hook.',
    'The basement has no signal. Nobody is trying to get it back. Sparse dry vocals and a climactic filtered build.',
    'There’s a door behind the booth that keeps opening. A mysterious three-word hook over a dirty controlled groove.',
    'Someone asks for the time; I turn my watch facedown. A tiny after-hours vocal hook and thick rolling bass.',
    'The room goes quiet for a beat and I hear someone laugh. Use that tension before a weighty, restrained drop.',
    'My coat is upstairs. I keep finding reasons not to get it. A dry recurring hook with long instrumental space.',
    'One green light catches the same face every few seconds. Minimal whispered fragments and a slow, climactic build.',
    'The bass rattles a glass that nobody has touched for an hour. A concrete after-hours detail, not generic club slogans.',
    'We agree not to exchange names. Just stay for this record. Sparse intimate vocals, metallic drums and a dirty bass drop.'
  ]
};

export function ideaPool(genre: Genre): string[] {
  return [...profiles[genre].seeds, ...extraIdeas[genre]];
}

// Draw without replacement; replenish only after the entire genre pool is used.
export function drawIdeas(genre: Genre, used: readonly string[], current: readonly string[], random = Math.random) {
  const pool = ideaPool(genre);
  let seen = new Set(used);
  let available = pool.filter(idea => !seen.has(idea));
  if (available.length < 3) {
    seen = new Set(current);
    available = pool.filter(idea => !seen.has(idea));
  }
  const ideas: string[] = [];
  while (ideas.length < 3) {
    const index = Math.floor(random() * available.length);
    const [idea] = available.splice(index, 1);
    ideas.push(idea);
    seen.add(idea);
  }
  return { ideas, used: [...seen] };
}
