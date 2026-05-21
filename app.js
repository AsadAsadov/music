const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Ana Səhifə (Bütün artistləri çəkirik)
app.get('/', async (req, res) => {
    const { data: songs, error } = await supabase.from('songs').select('*');
    
    let artistMap = {};
    if (!error && songs) {
        songs.forEach(s => {
            if(s.artist) {
                let trimmed = s.artist.trim();
                if (!artistMap[trimmed]) {
                    artistMap[trimmed] = { name: trimmed, count: 0 };
                }
                artistMap[trimmed].count++;
            }
        });
    }
    
    const artists = Object.values(artistMap);
    res.render('index', { artists, selectedArtist: null, artistSongs: [], searchWord: '' });
});

// 2. Klikləmə və ya Axtarış Marşrutu (Tam Düzəldilmiş Versiya)
app.get('/search', async (req, res) => {
    const searchWord = (req.query.search || '').trim();
    
    // Bütün artist siyahısını yenidən hazırlayırıq
    const { data: allSongs } = await supabase.from('songs').select('*');
    let artistMap = {};
    if (allSongs) {
        allSongs.forEach(s => {
            if(s.artist) {
                let trimmed = s.artist.trim();
                if (!artistMap[trimmed]) artistMap[trimmed] = { name: trimmed, count: 0 };
                artistMap[trimmed].count++;
            }
        });
    }
    const artists = Object.values(artistMap);

    let artistSongs = [];
    if (searchWord) {
        // İnsensitive axtarış: sözün daxilində keçənləri tapır
        const { data } = await supabase
            .from('songs')
            .select('*')
            .ilike('artist', `%${searchWord}%`);
        
        if (data) artistSongs = data;
    }

    // Əgər nəticə varsa, tapılan ilk artistin adını başlığa qoyuruq, yoxdursa yazılan sözü
    const selectedArtist = artistSongs.length > 0 ? artistSongs.artist : searchWord;

    res.render('index', { artists, selectedArtist, artistSongs, searchWord });
});

// 3. Yeni Mahnı Əlavə Etmə
app.post('/add-song', async (req, res) => {
    const { artist, song, hashtag } = req.body;
    if (artist && song) {
        await supabase.from('songs').insert([{ artist: artist.trim(), song: song.trim(), hashtag: hashtag ? hashtag.trim() : null }]);
    }
    res.redirect('/');
});

app.listen(PORT, () => console.log(`Mahnı sistemi ${PORT} portunda aktivdir...`));
