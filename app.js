const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Bağlantısı
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Ana Səhifə (Sıralama Çoxdan Aza)
app.get('/', async (req, res) => {
    try {
        const { data: songs, error } = await supabase.from('songs').select('*');
        
        let artistMap = {};
        if (!error && songs) {
            songs.forEach(s => {
                if (s.artist) {
                    let name = s.artist.trim();
                    if (!artistMap[name]) artistMap[name] = { name: name, count: 0 };
                    artistMap[name].count++;
                }
            });
        }
        
        // MAHNILARIN SAYINA GÖRƏ ÇOXDAN AZA SIRALAMA
        const artists = Object.values(artistMap).sort((a, b) => b.count - a.count);
        
        res.render('index', { artists, selectedArtist: '', artistSongs: [], searchWord: '' });
    } catch (err) {
        console.error("Ana səhifə xətası:", err);
        res.status(500).send("Daxili Server Xətası");
    }
});

// 2. Klikləmə və Axtarış (Sıralama Burada da Tam Sabitləndi)
app.get('/search', async (req, res) => {
    try {
        const searchWord = (req.query.search || '').trim();
        
        const { data: songs } = await supabase.from('songs').select('*');
        let artistMap = {};
        if (songs) {
            songs.forEach(s => {
                if (s.artist) {
                    let name = s.artist.trim();
                    if (!artistMap[name]) artistMap[name] = { name: name, count: 0 };
                    artistMap[name].count++;
                }
            });
        }
        
        // SEÇİMDƏN SONRA DA SIRALAMANIN POZULMAMASI ÜÇÜN BURA DA ƏLAVƏ EDİLDİ
        const artists = Object.values(artistMap).sort((a, b) => b.count - a.count);

        let artistSongs = [];
        let selectedArtist = "";

        if (searchWord) {
            const { data: exactData } = await supabase.from('songs').select('*').ilike('artist', searchWord);
            
            if (exactData && exactData.length > 0) {
                artistSongs = exactData;
                selectedArtist = exactData.artist ? exactData.artist.trim() : searchWord;
            } else {
                const { data: likeData } = await supabase.from('songs').select('*').ilike('artist', `%${searchWord}%`);
                if (likeData && likeData.length > 0) {
                    artistSongs = likeData;
                    selectedArtist = likeData.artist ? likeData.artist.trim() : searchWord;
                }
            }
        }

        if (!selectedArtist && searchWord) {
            selectedArtist = searchWord;
        }

        res.render('index', { artists, selectedArtist, artistSongs, searchWord });
    } catch (err) {
        console.error("Axtarış xətası:", err);
        res.status(500).send("Axtarış zamanı xəta baş verdi");
    }
});

// 3. Yeni Mahnı Əlavə Etmə
app.post('/add-song', async (req, res) => {
    try {
        const { artist, song, hashtag } = req.body;
        if (artist && song) {
            await supabase.from('songs').insert([{ 
                artist: artist.trim(), 
                song: song.trim(), 
                hashtag: hashtag ? hashtag.trim() : null 
            }]);
        }
        res.redirect('/');
    } catch (err) {
        console.error("Mahnı əlavə etmə xətası:", err);
        res.status(500).send("Mahnı əlavə edilə bilmədi");
    }
});

app.listen(PORT, () => console.log(`Mahnı sistemi ${PORT} portunda aktivdir...`));
