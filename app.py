from flask import Flask, render_template, send_from_directory, jsonify, url_for, request
import os
import json
from collections import deque

app = Flask(__name__)

# --- Konfigurasi Folder ---
STATIC_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
SONGS_FOLDER = os.path.join(STATIC_FOLDER, 'songs')
LYRICS_FOLDER = os.path.join(STATIC_FOLDER, 'lyrics')
COVERS_FOLDER = os.path.join(STATIC_FOLDER, 'images', 'covers')

# --- Data In-Memory (Contoh) ---
song_metadata = {
    "Ado - Overdose": {"title": "Overdose", "artist": "Ado", "duration": "03:13"},
    "Chaereol - Masa Depanmu": {"title": "Masa Depanmu", "artist": "Chaereol", "duration": "02:57"},
    "Chaereol - Masa Lalu": {"title": "Masa Lalu", "artist": "Chaereol", "duration": "02:28"},
    "Panji Sakti - Jiwaku Sekuntum Bunga Kemboja": {"title": "Jiwaku Sekuntum Bunga Kemboja", "artist": "Panji Sakti", "duration": "03:50"},
    "Panji Sakti - Kepada Noor": {"title": "Kepada Noor", "artist": "Panji Sakti", "duration": "04:10"},
    "Panji Sakti - Sang Guru": {"title": "Sang Guru", "artist": "Panji Sakti", "duration": "03:56"},
    "Tenxi - DJ Kasih Aba Aba": {"title": "DJ Kasih Aba Aba", "artist": "Tenxi", "duration": "03:08"},
    "Tenxi - Mejikuhibiniu": {"title": "Mejukihibiniu", "artist": "Tenxi", "duration": "03:12"},
    "Tenxi - Garam & Madu": {"title": "Garam & Madu", "artist": "Tenxi", "duration": "03:04"},
    "Judika - Aku Yang Tersakiti": {"title": "Aku Yang Tersakiti", "artist": "Judika", "duration": "04:11"},
    "Judika - Jikalau Kau Cinta": {"title": "Jikalau Kau Cinta", "artist": "Judika", "duration": "04:17"},
    "Dewa 19 - Risalah Hati": {"title": "Risalah Hati", "artist": "Dewa 19", "duration": "04:52"},
    "Dewa 19 - Kangen": {"title": "Kangen", "artist": "Dewa 19", "duration": "04:55"},
    "Riski Inrahim - Speedrun Hamil": {"title": "Speedrun Hamil", "artist": "Riski Inrahim", "duration": "02:55"},
}

playlists = {
    1: {"name": "On Repeat", "songs": ["Tenxi - Mejikuhibiniu", "Tenxi - Garam & Madu"], "cover_url": "/static/images/covers/On Repeat.jpg"},
}
next_playlist_id = 2

recently_played_songs = deque(maxlen=20) 

artist_bios = {
    "Ado": "Ado adalah penyanyi Jepang yang dikenal dengan vokalnya yang kuat dan lagu-lagu J-pop-nya yang ekspresif.",
    "Chaereol": "Chaereol adalah musisi yang membuat lagu-lagu dengan lirik yang mendalam dan melodi yang menenangkan.",
    "Panji Sakti": "Panji Sakti adalah seorang penyanyi-penulis lagu Indonesia yang dikenal dengan lagu-lagu balada akustik dan lirik puitisnya.",
    "Tenxi": "Tenxi adalah seorang DJ dan produser yang menciptakan musik elektronik dengan perpaduan genre yang unik.",
    "Judika": "Judika adalah penyanyi rock dan aktor Indonesia yang dikenal dengan suaranya yang serak dan kuat.",
    "Dewa 19": "Dewa 19 adalah salah satu band rock legendaris dari Indonesia, yang dikenal dengan lagu-lagu hits yang tak lekang oleh waktu.",
    "Riski Inrahim": "Riski Inrahim adalah musisi yang dikenal dengan lagu-lagu humoris dan uniknya yang sering viral.",
    "Unknown Artist": "Seniman yang tidak diketahui."
}

# --- Helper Functions ---
def get_song_details_by_name(name_no_ext):
    metadata = song_metadata.get(name_no_ext, {
        "title": name_no_ext.replace('-', ' ').title(),
        "artist": "Unknown Artist",
        "duration": "00:00"
    })
    return {
        "name_no_ext": name_no_ext,
        "title": metadata["title"],
        "artist": metadata["artist"],
        "url": url_for('serve_song', filename=f"{name_no_ext}.mp3", _external=True),
        "duration": metadata["duration"]
    }

def get_all_songs_data():
    return [get_song_details_by_name(os.path.splitext(f)[0]) for f in os.listdir(SONGS_FOLDER) if f.endswith(".mp3")]

def get_all_albums_by_artist_data():
    albums = {}
    for song_name_no_ext, data in song_metadata.items():
        artist_name = data.get("artist", "Unknown Artist")
        if artist_name not in albums:
            albums[artist_name] = { "name": artist_name, "artist": artist_name, "songs": [], "cover_url": url_for('static', filename='images/covers/default_artist_album.jpg') }
        albums[artist_name]["songs"].append(get_song_details_by_name(song_name_no_ext))
        # Logic to find a cover for the album/artist
        if albums[artist_name]["cover_url"].endswith('default_artist_album.jpg'):
            cover_path_jpg = os.path.join(COVERS_FOLDER, f"{song_name_no_ext}.jpg")
            if os.path.exists(cover_path_jpg):
                albums[artist_name]["cover_url"] = url_for('static', filename=f'images/covers/{song_name_no_ext}.jpg')
    
    album_list = [{"name": name, "artist": details["artist"], "cover_url": details["cover_url"], "song_count": len(details["songs"])} for name, details in albums.items()]
    return album_list

def get_all_artists_data():
    artists = {}
    for song_name_no_ext, data in song_metadata.items():
        artist_name = data.get("artist", "Unknown Artist")
        if artist_name not in artists:
            artists[artist_name] = {"name": artist_name, "songs": [], "cover_url": url_for('static', filename='images/covers/default_artist_cover.jpg')}
        artists[artist_name]["songs"].append(get_song_details_by_name(song_name_no_ext))
        # Logic to find a representative cover for the artist
        if artists[artist_name]["cover_url"].endswith('default_artist_cover.jpg'):
            cover_path_jpg = os.path.join(COVERS_FOLDER, f"{song_name_no_ext}.jpg")
            if os.path.exists(cover_path_jpg):
                artists[artist_name]["cover_url"] = url_for('static', filename=f'images/covers/{song_name_no_ext}.jpg')

    artist_list = [{"name": name, "song_count": len(details["songs"]), "cover_url": details["cover_url"]} for name, details in artists.items()]
    return artist_list

# --- Main Routes ---
@app.route('/')
def index_spa():
    return render_template('index.html')

@app.route('/static/songs/<path:filename>')
def serve_song(filename):
    return send_from_directory(SONGS_FOLDER, filename)

# --- API Routes for SPA Content ---
@app.route('/api/home-content')
def api_home_content():
    return render_template('home_content.html', songs=get_all_songs_data()[:8])

@app.route('/api/all-songs-content')
def api_all_songs_content():
    return render_template('all_songs_content.html', songs=get_all_songs_data())

# [DIKEMBALIKAN] Route untuk halaman daftar album
@app.route('/api/albums')
def api_albums():
    albums = get_all_albums_by_artist_data()
    return render_template('albums_content.html', albums=albums)

# [DIKEMBALIKAN] Route untuk halaman detail album
@app.route('/api/album-detail/<album_name>')
def api_album_detail(album_name):
    all_albums = get_all_albums_by_artist_data()
    album_info = next((album for album in all_albums if album['name'] == album_name), None)
    if not album_info:
        return "Album not found", 404
        
    songs_in_album = [s for s in get_all_songs_data() if s['artist'] == album_name]
    
    return render_template('album_detail_content.html',
                           album_name=album_name,
                           album_cover_url=album_info['cover_url'],
                           songs=songs_in_album)

# [DIKEMBALIKAN] Route untuk halaman daftar artis
@app.route('/api/artists')
def api_artists():
    artists = get_all_artists_data()
    return render_template('artists_content.html', artists=artists)

# [DIKEMBALIKAN] Route untuk halaman detail artis
@app.route('/api/artist-detail/<artist_name>')
def api_artist_detail(artist_name):
    artist_info = {
        "name": artist_name,
        "songs": [s for s in get_all_songs_data() if s['artist'] == artist_name],
        "bio": artist_bios.get(artist_name, "Biography not available."),
        "cover_url": url_for('static', filename='images/covers/default_artist_cover.jpg'),
    }
    # Find a cover for the artist
    artist_data = next((artist for artist in get_all_artists_data() if artist['name'] == artist_name), None)
    if artist_data:
        artist_info['cover_url'] = artist_data['cover_url']

    if not artist_info["songs"]:
        return "Artist not found", 404
    return render_template('artist_detail_content.html', artist=artist_info)

# [DIKEMBALIKAN] Route untuk halaman daftar playlist
@app.route('/api/playlists')
def api_playlists():
    playlists_data = [
        {"id": pid, "name": pinfo["name"], "song_count": len(pinfo["songs"]), "cover_url": pinfo.get("cover_url")}
        for pid, pinfo in playlists.items()
    ]
    return render_template('playlists_content.html', playlists=playlists_data)

# [DIKEMBALIKAN] Route untuk halaman detail playlist
@app.route('/api/playlist/<int:playlist_id>')
def api_playlist_detail(playlist_id):
    playlist_info = playlists.get(playlist_id)
    if not playlist_info:
        return "Playlist not found.", 404
    
    songs_in_playlist = [get_song_details_by_name(s_name) for s_name in playlist_info["songs"]]
    
    return render_template('playlist_detail_content.html', 
                           playlist_id=playlist_id,
                           playlist_name=playlist_info["name"],
                           playlist_cover_url=playlist_info.get("cover_url"),
                           songs=songs_in_playlist)

@app.route('/api/recently-played')
def api_recently_played():
    return render_template('recently_played_content.html', songs=list(recently_played_songs))

# --- API Routes for Data Actions ---
@app.route('/api/songs')
def get_all_songs_api():
    return jsonify(get_all_songs_data())

@app.route('/api/song_details/<song_name>')
def get_song_details_api(song_name):
    song_details = get_song_details_by_name(song_name)
    if not song_details:
        return jsonify({"message": "Song not found."}), 404
    
    # Update recently played
    for i, s in enumerate(list(recently_played_songs)):
        if s["name_no_ext"] == song_name:
            del recently_played_songs[i]
            break
    recently_played_songs.appendleft(song_details)


    return jsonify(song_details)

if __name__ == '__main__':
    app.run(debug=True)
