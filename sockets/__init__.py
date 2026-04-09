"""Register all WebSocket handlers with the SocketIO instance."""
from sockets.connection import register_connection_handlers
from sockets.chaos import register_chaos_handlers
from sockets.voice import register_voice_handlers
from sockets.lab import register_lab_handlers


def register_socket_handlers(socketio, app):
    """Call every module's register function."""
    register_connection_handlers(socketio, app)
    register_chaos_handlers(socketio, app)
    register_voice_handlers(socketio, app)
    register_lab_handlers(socketio, app)
