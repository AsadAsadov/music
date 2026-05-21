const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Bağlantısı
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Ana Səhifə (Artistlər Mahnı Sayına Görə Çoxdan Aza Sıralanır)
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
        res.render('index', { artists, selectedArtist: '', artistSongs: [], searchWord: '' });
    } catch (err) {
        console.error("Ana səhifə xətası:", err);
        res.status(500).send("Daxili Server Xətası");
    }
});

// 2. Klikləmə və Genişləndirilmiş Axtarış (Həm Artist, həm Mahnı adına görə)
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
        const artists = Object.values(artistMap).sort((a, b) => b.count - a.count);

        let artistSongs = [];
        let selectedArtist = "";

        if (searchWord) {
            // Ağıllı Axtarış: Eyni anda həm artist adında, həm də mahnı adında axtarırıq
            const { data: foundSongs } = await supabase
                .from('songs')
                .select('*')
                .or(`artist.ilike.%${searchWord}%,song.ilike.%${searchWord}%`);

            if (foundSongs && foundSongs.length > 0) {
                artistSongs = foundSongs;
                selectedArtist = foundSongs.artist ? foundSongs.artist.trim() : searchWord;
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
        const { artist, song, hashtag, lyrics } = req.body;
        if (artist && song) {
            await supabase.from('songs').insert([{ 
                artist: artist.trim(), 
                song: song.trim(), 
                hashtag: hashtag ? hashtag.trim() : null,
                lyrics: lyrics ? lyrics.trim() : null
            }]);
        }
        res.redirect('/');
    } catch (err) {
        console.error("Mahnı əlavə etmə xətası:", err);
        res.status(500).send("Mahnı əlavə edilə bilmədi");
    }
});

// 4. Mövcud Mahnını Redaktə Etmə (ID tipi Integer-ə çevrildi)
app.post('/edit-song', async (req, res) => {
    try {
        const { id, artist, song, hashtag, lyrics } = req.body;
        if (id && artist && song) {
            const songId = parseInt(id, 10); // Supabase int8 üçün mütləq rəqəm edilməlidir

            await supabase
                .from('songs')
                .update({
                    artist: artist.trim(),
                    song: song.trim(),
                    hashtag: hashtag ? hashtag.trim() : null,
                    lyrics: lyrics ? lyrics.trim() : null
                })
                .eq('id', songId); 
        }
        res.redirect(`/search?search=${encodeURIComponent(artist.trim())}`);
    } catch (err) {
        console.error("Redaktə xətası:", err);
        res.status(500).send("Yenilənmə zamanı xəta baş verdi");
    }
});

// 5. Mahnını Tamamilə Silmə
app.post('/delete-song', async (req, res) => {
    try {
        const { id, artist } = req.body;
        if (id) {
            const songId = parseInt(id, 10);
            
            await supabase
                .from('songs')
                .delete()
                .eq('id', songId);
        }
        res.redirect(`/search?search=${encodeURIComponent(artist.trim())}`);
    } catch (err) {
        console.error("Silmə xətası:", err);
        res.status(500).send("Mahnı silinə bilmədi");
    }
});

app.listen(PORT, () => console.log(`Mahnı sistemi ${PORT} portunda aktivdir...`));
