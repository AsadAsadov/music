const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3000;

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
        const artists = Object.values(artistMap).sort((a, b) => b.count - a.count);
        res.render('index', { artists, selectedArtist: '', artistSongs: [], searchWord: '' });
    } catch (err) {
        console.error(err);
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
                // Əgər tapılan ilk mahnının artisti axtarılan sözlə uyğunlaşırsa, sol tərəfdə aktiv edirik
                selectedArtist = foundSongs.artist ? foundSongs.artist.trim() : searchWord;
            }
        }

        if (!selectedArtist && searchWord) {
            selectedArtist = searchWord;
        }

        res.render('index', { artists, selectedArtist, artistSongs, searchWord });
    } catch (err) {
        console.error(err);
        res.status(500).send("Axtarış xətası baş verdi");
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
        console.error(err);
        res.status(500).send("Xəta baş verdi");
    }
});

// 4. Mövcud Mahnını Redaktə Etmə (Yeni Sektor)
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
                .eq('id', id); // Yalnız kliklənən mahnının ID-sinə görə yeniləyir
        }
        // Redaktədən sonra istifadəçi vizual olaraq itməsin deyə həmin artistin səhifəsinə geri yönləndiririk
        res.redirect(`/search?search=${encodeURIComponent(artist.trim())}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Yenilənmə zamanı xəta baş verdi");
    }
});

app.listen(PORT, () => console.log(`Mahnı sistemi ${PORT} portunda aktivdir...`));
