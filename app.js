const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Ana Səhifə
app.get('/', async (req, res) => {
    const { data: songs, error } = await supabase.from('songs').select('*');
    
    let artistMap = {};
    if (!error && songs) {
        songs.forEach(s => {
            if(s.artist) {
                let name = s.artist.trim();
                if (!artistMap[name]) artistMap[name] = { name: name, count: 0 };
                artistMap[name].count++;
            }
        });
    }
    
    const artists = Object.values(artistMap).sort((a, b) => b.count - a.count); // Ən çox mahnısı olanlar yuxarıda
    res.render('index', { artists, selectedArtist: null, artistSongs: [], searchWord: '' });
});

// 2. Klikləmə və Axtarış (Düzəldildi)
app.get('/search', async (req, res) => {
    const searchWord = (req.query.search || '').trim();
    
    // Bütün artist siyahısını yenidən çəkirik
    const { data: songs } = await supabase.from('songs').select('*');
    let artistMap = {};
    if (songs) {
        songs.forEach(s => {
            if(s.artist) {
                let name = s.artist.trim();
                if (!artistMap[name]) artistMap[name] = { name: name, count: 0 };
                artistMap[name].count++;
            }
        });
    }
    const artists = Object.values(artistMap).sort((a, b) => b.count - a.count);

    let artistSongs = [];
    let selectedArtist = null;

    if (searchWord) {
        // Həm tam bərabərlik, həm də daxilində keçmə ehtimalını yoxlayırıq
        const { data: exactData } = await supabase.from('songs').select('*').ilike('artist', searchWord);
        
        if (exactData && exactData.length > 0) {
            artistSongs = exactData;
            selectedArtist = exactData.artist.trim();
        } else {
            // Tam eşləşməzsə, daxilində axtarış edirik
            const { data: likeData } = await supabase.from('songs').select('*').ilike('artist', `%${searchWord}%`);
            if (likeData && likeData.length > 0) {
                artistSongs = likeData;
                selectedArtist = likeData.artist.trim();
            }
        }
    }

    // Əgər heç bir mahnı tapılmadısa, amma yenə də axtarış edilibsə
    if (!selectedArtist && searchWord) {
        selectedArtist = searchWord;
    }

    res.render('index', { artists, selectedArtist, artistSongs, searchWord });
});

// 3. Yeni Mahnı Əlavə Etmə
app.post('/add-song', async (req, res) => {
    const { artist, song, hashtag } = req.body;
    if (artist && song) {
        await supabase.from('songs').insert([{ 
            artist: artist.trim(), 
            song: song.trim(), 
            hashtag: hashtag ? hashtag.trim() : null 
        }]);
    }
    res.redirect('/');
});

app.listen(PORT, () => console.log(`Mahnı sistemi ${PORT} portunda aktivdir...`));
