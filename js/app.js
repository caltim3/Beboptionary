const progressionSelect = document.getElementById('progression');
const bebopDial = document.getElementById('bebop');
const bluesDial = document.getElementById('blues');
const alteredDial = document.getElementById('altered');
const generateBtn = document.getElementById('generate');
const playBtn = document.getElementById('play');
const notationDiv = document.getElementById('notation');

const progressions = {
  'ii-v-i': ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
  'jazz-blues': ['C7', 'F7', 'C7', 'G7'],
  'minor-ii-v-i': ['Dm7b5', 'G7', 'Cm7', 'Cm7']
};

function scaleForChord(chord) {
  const root = Tonal.Note.pitchClass(chord);
  if (chord.includes('maj')) return Tonal.Scale.get(`${root} major`).notes;
  if (chord.includes('m7b5')) return Tonal.Scale.get(`${root} locrian`).notes;
  if (chord.includes('m')) return Tonal.Scale.get(`${root} dorian`).notes;
  if (chord.includes('7')) return Tonal.Scale.get(`${root} mixolydian`).notes;
  return Tonal.Scale.get(`${root} major`).notes;
}

function bluesScale(root) {
  return Tonal.Scale.get(`${root} blues`).notes;
}

function alteredScale(root) {
  return Tonal.Scale.get(`${root} altered`).notes;
}

function generateNotes(chords) {
  const bebop = parseInt(bebopDial.value, 10) / 100;
  const blues = parseInt(bluesDial.value, 10) / 100;
  const altered = parseInt(alteredDial.value, 10) / 100;

  let notes = [];
  chords.forEach(ch => {
    const root = Tonal.Note.pitchClass(ch);
    const base = scaleForChord(ch);
    const blue = bluesScale(root);
    const alt = alteredScale(root);
    for (let i = 0; i < 8; i++) {
      let pool = base;
      const r = Math.random();
      if (r < blues) pool = blue;
      else if (r < blues + altered) pool = alt;
      let pitch = pool[Math.floor(Math.random() * pool.length)];
      if (Math.random() < bebop * 0.5) {
        const m = Tonal.Note.midi(pitch);
        const approach = m + (Math.random() < 0.5 ? -1 : 1);
        notes.push({pitch: Tonal.Note.fromMidi(approach), dur: 0.125});
      }
      notes.push({pitch, dur: 0.125});
    }
  });
  return notes;
}

function pitchToTab(note) {
  const midi = Tonal.Note.midi(note);
  const strings = [64,59,55,50,45,40]; // E4,B3,G3,D3,A2,E2
  let best = {fret: 0, string: 1, diff: Infinity};
  strings.forEach((open,i)=>{
    const fret = midi - open;
    if (fret >= 0 && fret < 24 && fret < best.diff) {
      best = {fret, string: i+1, diff: fret};
    }
  });
  return {fret: best.fret, string: best.string};
}

function notesToVexTab(notes) {
  let vt = 'tabstave notation=true\nnotes';
  notes.forEach(n => {
    const tab = pitchToTab(n.pitch);
    vt += ` :8 ${tab.fret}-${tab.string}`;
  });
  return vt;
}

function renderPhrase(notes) {
  notationDiv.innerHTML = '';
  try {
    const VF = Vex.Flow;
    const renderer = new VF.Renderer(notationDiv, VF.Renderer.Backends.SVG);
    renderer.resize(800, 200);
    const context = renderer.getContext();
    const artist = new VexTab.Artist(10, 40, 700, {scale: 1});
    const vextab = new VexTab(artist); 
    vextab.parse(notesToVexTab(notes));
    artist.render(context);
  } catch(e) {
    notationDiv.textContent = e.message;
  }
}

function playNotes(notes) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let t = ctx.currentTime;
  const tempo = 120; // bpm
  notes.forEach(n => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = Tonal.Note.freq(n.pitch);
    osc.start(t);
    osc.stop(t + (60/tempo)*0.5);
    gain.gain.setValueAtTime(0.2, t);
    t += (60/tempo)*0.5;
  });
}

generateBtn.addEventListener('click', () => {
  const chords = progressions[progressionSelect.value];
  const notes = generateNotes(chords);
  renderPhrase(notes);
  playBtn.onclick = () => playNotes(notes);
});
