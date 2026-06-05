import os
import json
import spotipy
from spotipy.oauth2 import SpotifyOAuth

SPOTIFY_CLIENT_ID     = os.environ.get('SPOTIFY_CLIENT_ID', '')
SPOTIFY_CLIENT_SECRET = os.environ.get('SPOTIFY_CLIENT_SECRET', '')
SPOTIFY_REDIRECT_URI  = os.environ.get('SPOTIFY_REDIRECT_URI', 'http://localhost:5000/api/spotify/callback')

SPOTIFY_SCOPES = 'user-library-read playlist-read-private playlist-read-collaborative'

CACHE_BASE = os.path.expanduser('~/.cache/yt-music/spotify')
os.makedirs(CACHE_BASE, exist_ok=True)


def _cache_path(user_id):
    return os.path.join(CACHE_BASE, f'token_{user_id}.json')


def _make_oauth(user_id):
    return SpotifyOAuth(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
        redirect_uri=SPOTIFY_REDIRECT_URI,
        scope=SPOTIFY_SCOPES,
        cache_path=_cache_path(user_id),
        open_browser=False,
    )


def get_auth_url(user_id):
    return _make_oauth(user_id).get_authorize_url()


def exchange_code(user_id, code):
    """Exchange OAuth code for tokens; returns token_info dict."""
    return _make_oauth(user_id).get_access_token(code, as_dict=True, check_cache=False)


def get_client(user_id):
    """Return authenticated Spotify client or None if not connected."""
    oauth = _make_oauth(user_id)
    token = oauth.get_cached_token()
    if not token:
        return None
    if oauth.is_token_expired(token):
        token = oauth.refresh_access_token(token['refresh_token'])
    return spotipy.Spotify(auth=token['access_token'])


def is_connected(user_id):
    path = _cache_path(user_id)
    if not os.path.exists(path):
        return False
    try:
        with open(path) as f:
            token = json.load(f)
        return bool(token.get('access_token'))
    except Exception:
        return False


def disconnect(user_id):
    path = _cache_path(user_id)
    if os.path.exists(path):
        os.remove(path)


# ---------------------------------------------------------------------------
# Library helpers
# ---------------------------------------------------------------------------

def _fmt_track(track, added_at=None):
    images = track.get('album', {}).get('images', [])
    return {
        'id':          track['id'],
        'title':       track['name'],
        'artist':      ', '.join(a['name'] for a in track.get('artists', [])),
        'album':       track.get('album', {}).get('name', ''),
        'duration_ms': track.get('duration_ms', 0),
        'added_at':    added_at,
        'image':       images[0]['url'] if images else None,
    }


def get_saved_tracks(user_id, limit=50, offset=0):
    """Return paginated saved tracks from user's Spotify library."""
    sp = get_client(user_id)
    if not sp:
        return None
    results = sp.current_user_saved_tracks(limit=limit, offset=offset)
    tracks = [
        _fmt_track(item['track'], item.get('added_at'))
        for item in results.get('items', [])
        if item.get('track') and item['track'].get('id')
    ]
    return {'tracks': tracks, 'total': results.get('total', 0), 'offset': offset}


def get_playlists(user_id, limit=50, offset=0):
    """Return user's playlists (own + followed)."""
    sp = get_client(user_id)
    if not sp:
        return None
    results = sp.current_user_playlists(limit=limit, offset=offset)
    playlists = []
    for pl in results.get('items', []) or []:
        images = pl.get('images') or []
        playlists.append({
            'id':          pl['id'],
            'name':        pl['name'],
            'track_count': pl['tracks']['total'],
            'image':       images[0]['url'] if images else None,
            'owner':       pl['owner']['display_name'],
        })
    return {'playlists': playlists, 'total': results.get('total', 0), 'offset': offset}


def get_playlist_tracks(user_id, playlist_id, limit=50, offset=0):
    """Return tracks from a playlist."""
    sp = get_client(user_id)
    if not sp:
        return None
    results = sp.playlist_tracks(playlist_id, limit=limit, offset=offset)
    tracks = [
        _fmt_track(item['track'], item.get('added_at'))
        for item in results.get('items', []) or []
        if item.get('track') and item['track'].get('id')
    ]
    return {'tracks': tracks, 'total': results.get('total', 0), 'offset': offset}
