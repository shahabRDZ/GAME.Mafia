import eventlet
eventlet.monkey_patch()

workers = 1
worker_class = "eventlet"
worker_connections = 1000
bind = "0.0.0.0:5000"
timeout = 0          # no timeout — socket.io connections are long-lived
keepalive = 65
loglevel = "info"
accesslog = "-"
errorlog = "-"
