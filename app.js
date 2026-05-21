const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Bağlantısı (Render ENV-dən oxunacaq)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Ana Səhifə (Bütün artistlər və mahnı sayıları)
app.get('/', async (req, res) => {
    // Supabase-dən bütün mahnıları çəkirik ki, artistləri qruplaşdıraq
    const { data: songs, error } = await supabase.from('songs').select('*');
    
    let artistMap = {};
    if (!error && songs) {
        songs.forEach(s => {
            if (!artistMap[s.artist]) {
                artistMap[s.artist] = { name: s.artist, count: 0 };
            }
            artistMap[s.artist].count++;
        });
    }
    
    const artists = Object.values(artistMap);
    res.render('index', { artists, selectedArtist: null, artistSongs: [], searchWord: '' });
});

// 2. Artistə görə axtarış və ya klikləmə marşrutu
app.get('/search', async (req, res) => {
    const searchWord = req.query.search || '';
    
    // Əvvəlcə bütün artistləri yenə çəkirik (sol tərəf və ya ana menyu üçün)
    const { data: allSongs } = await supabase.from('songs').select('*');
    let artistMap = {};
    if (allSongs) {
        allSongs.forEach(s => {
            if (!artistMap[s.artist]) artistMap[s.artist] = { name: s.artist, count: 0 };
            artistMap[s.artist].count++;
        });
    }
    const artists = Object.values(artistMap);

    // İndi isə axtarılan artistin mahnılarını gətiririk
    const { data: artistSongs } = await supabase
        .from('songs')
        .select('*')
        .ilike('artist', `%${searchWord}%`);

    // Əgər dəqiq bir artist tapılıbsa, onun adını başlığa qoyuruq
    const selectedArtist = artistSongs && artistSongs.length > 0 ? artistSongs.artist : searchWord;

    res.render('index', { artists, selectedArtist, artistSongs: artistSongs || [], searchWord });
});

// 3. Yeni Mahnı Əlavə Etmə (POST)
app.post('/add-song', async (req, res) => {
    const { artist, song, hashtag } = req.body;
    
    if (artist && song) {
        await supabase.from('songs').insert([{ artist, song, hashtag }]);
    }
    res.redirect('/');
});

app.listen(PORT, () => console.log(`Mahnı sistemi ${PORT} portunda aktivdir...`));
