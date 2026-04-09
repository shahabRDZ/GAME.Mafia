"""In-memory shared state for WebSocket connections and game rooms."""
import threading

# WebSocket connection tracking
sid_to_user = {}        # sid -> {user_id, username}
user_to_sid = {}        # user_id -> sid
online_users = set()    # set of user_ids

# Digital role distribution rooms
digital_rooms = {}      # code -> {roles, assigned, group, lock, created}
digital_lock = threading.Lock()

# Nearby players (location-based)
nearby_players = {}     # user_id -> {username, lat, lng, ts, sid}
nearby_roles = {}       # user_id -> {role, playerNum, gameId}
active_hosts = {}       # user_id -> {username, lat, lng, ts, group, count, player_count}

# Lab vote tracking (per room)
lab_votes = {}          # room_code -> {player_id: target_id}
lab_revotes = {}        # room_code -> {player_id: target_id}
lab_bazpors_votes = {}  # room_code -> {player_id: vote_value}
lab_night_actions = {}  # room_code_day -> {role: target_player_id}

# Chaos room state
end_discussion_votes = {}   # room_code -> set of user_ids
disconnected_players = {}   # room_code -> set of user_ids (grace period)

# Bot AI memory per room
bot_game_memory = {}    # {room_code: {bot_id: {suspicion, trust, ...}}}
bot_used_messages = {}  # {bot_id: set()}
