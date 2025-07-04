// js/app.js

document.addEventListener('DOMContentLoaded', () => {
    // VexFlow setup
    const { Factory, EasyScore, System, StaveNote, Stave, Formatter, Annotation } = Vex.Flow;

    // Progression Data now lives here, accessible to this script
    const progressionData = {
        "ii-V-I-C": { chords: ['Dm7', 'G7', 'Cmaj7'], measures: 2, key: 'C' },
        "ii-V-i-A": { chords: ['Bm7b5', 'E7', 'Am7'], measures: 2, key: 'A' },
        "blues-F": { chords: ['F7', 'Bb7', 'F7', 'F7', 'Bb7', 'Bb7', 'F7', 'F7', 'Gm7', 'C7', 'F7', 'C7'], measures: 12, key: 'F' }
    };
    
    // DOM Elements
    const progressionSelect = document.getElementById('progression-select');
    const generateBtn = document.getElementById('generate-btn');
    const playBtn = document.getElementById('play-btn');
    const notationContainer = document.getElementById('notation-container');
    const dials = {
        bebop: document.getElementById('bebop-dial'),
        blues: document.getElementById('blues-dial'),
        altered: document.getElementById('altered-dial'),
    };
    const valueSpans = {
        bebop: document.getElementById('bebop-value'),
        blues: document.getElementById('blues-value'),
        altered: document.getElementById('altered-value'),
    };
    const tempoSlider = document.getElementById('tempo-slider');
    const tempoValue = document.getElementById('tempo-value');
    
    let currentLick = [];

    // --- Event Listeners ---
    Object.keys(dials).forEach(key => {
        dials[key].addEventListener('input', (e) => {
            valueSpans[key].textContent = `${e.target.value}%`;
        });
    });
    
    tempoSlider.addEventListener('input', e => {
        tempoValue.textContent = e.target.value;
    });

    generateBtn.addEventListener('click', () => {
        const progressionKey = progressionSelect.value;
        const settings = {
            bebop: parseInt(dials.bebop.value, 10),
            blues: parseInt(dials.blues.value, 10),
            altered: parseInt(dials.altered.value, 10),
        };

        currentLick = musicLogic.generateLick(progressionData[progressionKey], settings);
        renderNotation(currentLick);
        playBtn.disabled = false;
    });
    
    playBtn.addEventListener('click', () => {
        const tempo = parseInt(tempoSlider.value, 10);
        playLick(currentLick, tempo);
    });

    // --- Rendering and Playback ---
    function renderNotation(notes) {
        notationContainer.innerHTML = '';
        if (!notes || notes.length === 0) {
            notationContainer.innerHTML = '<p class="placeholder-text">Could not generate a lick. Try different settings!</p>';
            return;
        }

        const vf = new Factory({ renderer: { elementId: 'notation-container', width: 800, height: 180 } });
        const score = vf.EasyScore();
        
        const vexNotes = notes.map(note => {
            const pitch = note.pitch.toLowerCase().replace('#', '##');
            const staveNote = score.note(`${pitch}/${note.duration}`);
            
            // Add chord symbol above the first note of a new chord
            if (!note.isChordRendered) {
                staveNote.addAnnotation(0, new Annotation(note.chord).setFont("Roboto Slab", 12));
                // Mark subsequent notes of the same chord to prevent re-rendering the symbol
                const chord = note.chord;
                let found = false;
                for(const n of notes){
                    if(n === note) found = true;
                    if(found && n.chord === chord) n.isChordRendered = true;
                }
            }
            return staveNote;
        });

        // Create voices
        const musicVoice = score.voice(vexNotes);
        
        // Use formatter to space the notes
        Formatter.FormatAndJustify(musicVoice, 750);
        
        // Create staves
        const musicStave = vf.Stave(10, 40, 780).addClef('treble').addTimeSignature('4/4');
        const tabStave = vf.Stave(10, 120, 780).addClef('tab');

        // Draw voices
        musicVoice.draw(vf.getContext(), musicStave);
        
        // Create and draw TAB notes
        const tabNotes = notes.map(note => {
            // Placeholder for real fret/string logic
            const string = Math.floor(Math.random() * 3) + 2; 
            const fret = Tonal.Note.midi(note.pitch) - Tonal.Note.midi(`E${2+Math.floor(string/2)}`) - (string*5-5);
            return new Vex.Flow.TabNote({
                positions: [{ str: string, fret: fret }],
                duration: note.duration
            });
        });
        Formatter.FormatAndJustify([new Vex.Flow.Voice().addTickables(tabNotes)], 750);
        tabNotes.forEach(n => n.setStave(tabStave).setContext(vf.getContext()).draw());
    }

    let audioContext;
    function playLick(notes, tempo) {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const quarterNoteTime = 60 / tempo;
        let currentTime = audioContext.currentTime;

        notes.forEach(note => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            const midiNote = Tonal.Note.midi(note.pitch);
            if (!midiNote) return;

            oscillator.type = 'sine'; // A softer, more pleasant sound
            oscillator.frequency.value = Tonal.Note.freq(note.pitch);
            
            let duration = quarterNoteTime;
            const noteType = parseInt(note.duration.replace('t', ''), 10);
            if (noteType === 8) duration = quarterNoteTime / 2;
            else if (noteType === 16) duration = quarterNoteTime / 4;
            
            if (note.duration.includes('t')) {
                duration *= (2/3);
            }
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            gainNode.gain.setValueAtTime(0, currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration * 0.9);

            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);
            currentTime += duration;
        });
    }
});
