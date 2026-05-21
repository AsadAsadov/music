const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Bağlantısı
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Ana Səhifə
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
        
        const artists = Object.values(artistMap).sort((a, b) => b.count - a.count);
        // EJS partlamasın deyə selectedArtist-ə null yox, boş string veririk
        res.render('index', { artists, selectedArtist: '', artistSongs: [], searchWord: '' });
    } catch (err) {
        console.error("Ana səhifə xətası:", err);
        res.status(500).send("Daxili Server Xətası");
    }
});

// 2. Klikləmə və Axtarış (Kritik massiv xətası düzəldildi)
app.get('/search', async (req, res) => {
    try {
        const searchWord = (req.query.search || '').trim();
        
        // Bütün artist siyahısını yenidən çəkirik
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
        const artists = Object.values(artistMap).sort((a, b) => b.count - a.count);

        let artistSongs = [];
        let selectedArtist = "";

        if (searchWord) {
            // 1. Tam bərabərliyi yoxlayırıq
            const { data: exactData } = await supabase.from('songs').select('*').ilike('artist', searchWord);
            
            if (exactData && exactData.length > 0) {
                artistSongs = exactData;
                // XƏTA BURADA İDİ: massivin-cı elementindən datanı oxuyuruq
                selectedArtist = exactData.artist ? exactData.artist.trim() : searchWord;
            } else {
                // 2. Tam eşləşməzsə, daxilində keçənləri axtarırıq
                const { data: likeData } = await supabase.from('songs').select('*').ilike('artist', `%${searchWord}%`);
                if (likeData && likeData.length > 0) {
                    artistSongs = likeData;
                    // XƏTA BURADA İDİ: massivin-cı elementindən datanı oxuyuruq
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
