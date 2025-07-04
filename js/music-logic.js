// js/music-logic.js

const musicLogic = (() => {
    // Destructure functions from the global Tonal object
    const { Note, Chord, Scale, Interval, PcSet } = Tonal;

    // A more sophisticated database of lick fragments using music theory terms
    const lickFragments = [
        {
            description: "Diatonic Scale Run Down (3-R)",
            pattern: [3, 2, 1, 0], // Scale degrees
            rhythm: ['8', '8', '8', '8'],
            tags: ['diatonic', 'scale']
        },
        {
            description: "Arpeggio 1-3-5-7",
            pattern: ['1P', '3M', '5P', '7m'], // Intervals from root
            rhythm: ['8', '8', '8', '8'],
            tags: ['diatonic', 'arpeggio']
        },
        {
            description: "Bebop Enclosure on the 3rd",
            pattern: [{ target: '3', steps: ['+2m', 'root', '-2m', 'root'] }], // Relative to target
            rhythm: ['16', '16', '16', '16'],
            tags: ['bebop', 'chromatic', 'enclosure']
        },
        {
            description: "Dominant Bebop Scale",
            pattern: ['desc_bebop_dom'], // Special keyword
            rhythm: ['8', '8', '8', '8', '8', '8', '8', '8'],
            tags: ['bebop', 'scale']
        },
        {
            description: "Blues Lick (b3 bend to 3)",
            pattern: ['1P', 'b3', '3M', '4P', '1P'], // Uses b3
            rhythm: ['8', '8', '8', 'q', 'q'],
            tags: ['blues']
        },
        {
            description: "Altered Dominant Lick (b9, #9)",
            pattern: ['b9', '#9', '7m', '5P'],
            rhythm: ['8', '8', '8', '8'],
            tags: ['altered', 'bebop']
        },
        {
            description: "Chromatic Approach to Root",
            pattern: ['-2m', '-1m', '1P'], // Relative to root
            rhythm: ['16', '16', '8'],
            tags: ['bebop', 'chromatic']
        },
    ];

    const progressionData = {
        "ii-V-I-C": { chords: ['Dm7', 'G7', 'Cmaj7'], measures: 2, key: 'C' },
        "ii-V-i-A": { chords: ['Bm7b5', 'E7', 'Am7'], measures: 2, key: 'A' },
        "blues-F": { chords: ['F7', 'Bb7', 'F7', 'F7', 'Bb7', 'Bb7', 'F7', 'F7', 'Gm7', 'C7', 'F7', 'C7'], measures: 12, key: 'F' }
    };
    
    // Main generative function
    function generateLick(progressionKey, settings) {
        let fullLick = [];
        const progInfo = progressionData[progressionKey];
        
        // This is a simplified approach, assigning one fragment per chord.
        // A more advanced engine would spread fragments over multiple chords.
        progInfo.chords.forEach(chordName => {
            const chord = Chord.get(chordName);

            // Create a weighted pool of fragments
            const weightedPool = [];
            lickFragments.forEach(fragment => {
                let weight = 1;
                if (fragment.tags.includes('bebop')) weight += settings.bebop;
                if (fragment.tags.includes('blues')) weight += settings.blues;
                if (fragment.tags.includes('altered') && chord.type === 'dominant') weight += settings.altered;
                if (fragment.tags.includes('diatonic')) weight += (100 - (settings.altered));
                
                for (let i = 0; i < Math.floor(weight / 20); i++) weightedPool.push(fragment);
            });
            
            const chosenFragment = weightedPool[Math.floor(Math.random() * weightedPool.length)];
            
            // Translate the pattern to actual notes
            const notes = translatePattern(chosenFragment, chord);
            fullLick = fullLick.concat(notes);
        });

        return fullLick;
    }

    function translatePattern(fragment, chord) {
        const root = chord.tonic + '4'; // Set base octave to 4
        let notes = [];

        fragment.pattern.forEach((p, i) => {
            let note;
            if (typeof p === 'string') {
                if (p.startsWith('desc_')) { // Special handler for scales
                    let scaleNotes;
                    if (p === 'desc_bebop_dom') {
                        scaleNotes = Scale.get(`${chord.tonic} mixolydian`).notes;
                        scaleNotes.splice(7, 0, Note.transpose(chord.tonic, '7M')); // Add major 7th
                        scaleNotes = scaleNotes.map(n => n + '5').reverse(); // Start an octave up
                    }
                    notes = notes.concat(scaleNotes.map(pitch => ({ pitch, duration: '8' })));
                    return;
                } else { // Handle intervals like 'b9', '3M', etc.
                    note = Note.transpose(root, p);
                }
            } else if (typeof p === 'object') { // Handle enclosures
                const targetNote = Note.transpose(root, p.target === '3' ? chord.aliases[0].includes('m') ? '3m' : '3M' : '1P');
                p.steps.forEach(step => {
                    let newNote;
                    if(step === 'root') newNote = targetNote;
                    else if (step.startsWith('+')) newNote = Note.transpose(targetNote, step.slice(1));
                    else newNote = Note.transpose(targetNote, step);
                    notes.push({ pitch: Note.simplify(newNote), duration: fragment.rhythm[i] || '16' });
                });
                return;
            } else { // Handle scale degrees
                const scale = Scale.get(`${chord.tonic} ${chord.aliases[0] || 'major'}`);
                note = scale.notes[p] + '4';
            }
            notes.push({ pitch: Note.simplify(note), duration: fragment.rhythm[i] || '8' });
        });
        
        return notes;
    }
    
    // Public API
    return {
        generateLick
    };

})();
