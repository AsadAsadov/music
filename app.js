const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Ana Səhifə (ID-lər mətn kimi çəkilir ki JavaScript yuvarlaqlaşdırmasın)
app.get('/', async (req, res) => {
    try {
        // id::text yazaraq ID-ni rəqəm kimi yox, birbaşa string kimi alırıq!
        const { data: songs, error } = await supabase.from('songs').select('id::text, artist, song, hashtag, lyrics');
        
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

// 2. Axtarış və Klikləmə (ID-lər string formatında saxlanılır)
app.get('/search', async (req, res) => {
    try {
        const searchWord = (req.query.search || '').trim();
        
        const { data: songs } = await supabase.from('songs').select('id::text, artist, song, hashtag, lyrics');
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
            // Axtarış zamanı da ID-ni string-ə çevirib gətiririk
            const { data: foundSongs } = await supabase
                .from('songs')
                .select('id::text, artist, song, hashtag, lyrics')
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

// 4. Redaktə (Düzgün ID-yə görə nöqtə atışı update)
app.post('/edit-song', async (req, res) => {
    try {
        const { id, artist, song, hashtag, lyrics } = req.body;
        if (id && artist && song) {
            await supabase
                .from('songs')
                .update({
                    artist: artist.trim(),
                    song: song.trim(),
                    hashtag: hashtag ? hashtag.trim() : null,
                    lyrics: lyrics ? lyrics.trim() : null
                })
                .eq('id', id); // String ID ilə Supabase tam eşləşir
        }
        res.redirect(`/search?search=${encodeURIComponent(artist.trim())}`);
    } catch (err) {
        console.error("Redaktə xətası:", err);
        res.status(500).send("Yenilənmə zamanı xəta baş verdi");
    }
});

// 5. Silmə (Düzgün ID-yə görə nöqtə atışı delete)
app.post('/delete-song', async (req, res) => {
    try {
        const { id, artist } = req.body;
        if (id) {
            await supabase
                .from('songs')
                .delete()
                .eq('id', id); // String ID ilə birbaşa silinir
        }
        res.redirect(`/search?search=${encodeURIComponent(artist.trim())}`);
    } catch (err) {
        console.error("Silmə xətası:", err);
        res.status(500).send("Mahnı silinə bilmədi");
    }
});

app.listen(PORT, () => console.log(`Mahnı sistemi ${PORT} portunda aktivdir...`));
