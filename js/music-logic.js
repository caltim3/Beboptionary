// js/music-logic.js

const musicLogic = (() => {
    // Destructure Tonal.js functions
    const { Note, Chord, Scale, Interval, PcSet } = Tonal;

    // Lick fragments now include a 'duration' property (in quarter notes)
    // to help the engine build phrases of the correct length.
    const lickFragments = [
        {
            description: "Diatonic Arpeggio 1-3-5-7",
            pattern: ['1P', '3M', '5P', '7m'],
            rhythm: ['8', '8', '8', '8'],
            duration: 2,
            tags: ['diatonic', 'arpeggio']
        },
        {
            description: "Bebop Enclosure on 3rd",
            pattern: [{ target: '3M', steps: ['+2m', 'root', '-2m', 'root'] }],
            rhythm: ['16', '16', '16', '16'],
            duration: 1,
            tags: ['bebop', 'chromatic', 'enclosure']
        },
        {
            description: "Dominant Bebop Scale",
            pattern: ['desc_bebop_dom'],
            rhythm: ['8', '8', '8', '8', '8', '8', '8', '8'],
            duration: 4,
            tags: ['bebop', 'scale']
        },
        {
            description: "Blues Lick",
            pattern: ['1P', 'b3', '4P', 'b5', '5P'],
            rhythm: ['8', 'q', '8', '8', '8'],
            duration: 3,
            tags: ['blues', 'pentatonic']
        },
        {
            description: "Altered Dominant Run",
            pattern: ['b9', '1P', '#9', '3M', 'b13', '5P'],
            rhythm: ['8t', '8t', '8t', '8t', '8t', '8t'],
            duration: 2,
            tags: ['altered', 'bebop']
        },
        {
            description: "Chromatic Approach to Root",
            pattern: ['-2m', '-1m', '1P'],
            rhythm: ['16', '16', '8'],
            duration: 1,
            tags: ['bebop', 'chromatic']
        },
        {
            description: "Diatonic Triplet Figure",
            pattern: [3, 2, 1, 3, 2, 4],
            rhythm: ['8t', '8t', '8t', '8t', '8t', '8t'],
            duration: 2,
            tags: ['diatonic', 'rhythm']
        }
    ];

    // Maps Tonal's chord types to a primary scale for note generation
    const typeToScale = {
        'major seventh': 'major',
        'minor seventh': 'dorian',
        'dominant seventh': 'mixolydian',
        'half-diminished': 'locrian'
    };

    // The main generative function
    function generateLick(progression, settings) {
        let fullLick = [];
        let totalDuration = progression.measures * 4; // Total beats
        let currentDuration = 0;
        let chordIndex = 0;

        while (currentDuration < totalDuration) {
            const chordName = progression.chords[chordIndex % progression.chords.length];
            const chord = Chord.get(chordName);

            // Create a weighted pool of fragments
            const weightedPool = lickFragments.filter(f => f.duration <= (totalDuration - currentDuration));
            let finalPool = [];
            weightedPool.forEach(fragment => {
                let weight = 1;
                if (fragment.tags.includes('bebop')) weight += settings.bebop;
                if (fragment.tags.includes('blues')) weight += settings.blues;
                if (fragment.tags.includes('altered') && chord.type === 'dominant seventh') weight += settings.altered;
                if (fragment.tags.includes('diatonic')) weight += (100 - settings.altered);
                
                for (let i = 0; i < Math.floor(weight / 20); i++) finalPool.push(fragment);
            });
            
            if (finalPool.length === 0) break; // No more fragments fit

            const chosenFragment = finalPool[Math.floor(Math.random() * finalPool.length)];
            
            // Translate the pattern to actual notes
            const notes = translatePattern(chosenFragment, chord, chordName);
            notes.forEach(note => {
                note.chord = chordName; // Tag each note with its underlying chord
                fullLick.push(note);
            });
            
            currentDuration += chosenFragment.duration;
            // Simple logic to advance chord
            if (currentDuration > (chordIndex + 1) * 2) {
                chordIndex++;
            }
        }
        return fullLick;
    }
    
    function translatePattern(fragment, chord, chordName) {
        const root = chord.tonic + '4';
        let notes = [];
        const scaleName = typeToScale[chord.type] || 'major';
        const scale = Scale.get(`${chord.tonic} ${scaleName}`);

        fragment.pattern.forEach((p, i) => {
            let notePitch;
            const rhythm = fragment.rhythm[i] || '8';

            if (typeof p === 'string') {
                if (p.startsWith('desc_')) {
                    let scaleNotes;
                    if (p === 'desc_bebop_dom') {
                        scaleNotes = Scale.get(`${chord.tonic} mixolydian`).notes;
                        scaleNotes.splice(7, 0, Note.transpose(chord.tonic, '7M'));
                    }
                    notes = notes.concat(scaleNotes.map(n => ({ pitch: n + '5', duration: '8' })).reverse());
                    return;
                } else if (p.includes('/')) {
                    // Placeholder for future slash chord logic
                    notePitch = Note.transpose(root, '1P');
                } else {
                    notePitch = Note.transpose(root, p);
                }
            } else if (typeof p === 'object' && p.target) { // Enclosure
                const targetInterval = chord.aliases[0].includes('m') ? '3m' : '3M';
                const targetNote = Note.transpose(root, targetInterval);
                p.steps.forEach(step => {
                    let newNote;
                    if(step === 'root') newNote = targetNote;
                    else newNote = Note.transpose(targetNote, step);
                    notes.push({ pitch: Note.pc(newNote), duration: rhythm });
                });
                return;
            } else { // Scale degree
                notePitch = scale.notes[p] + '4';
            }
            notes.push({ pitch: Note.pc(notePitch), duration: rhythm });
        });
        
        return notes.map(n => ({ ...n, pitch: n.pitch + '/' + Note.octave(n.pitch + '4') }));
    }

    return {
        generateLick
    };
})();
