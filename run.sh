#!/bin/bash

# DemoCoach Start/Stop Script
# Usage: ./run.sh [start|stop|status|restart]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"
BACKEND_PID="$PID_DIR/backend.pid"
FRONTEND_PID="$PID_DIR/frontend.pid"
LOG_DIR="$SCRIPT_DIR/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

mkdir -p "$PID_DIR" "$LOG_DIR"

check_backend_deps() {
    cd "$SCRIPT_DIR/backend"
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    python3 -c "import fastapi, uvicorn" 2>/dev/null
    return $?
}

check_frontend_deps() {
    [ -d "$SCRIPT_DIR/frontend/node_modules" ]
    return $?
}

install_backend_deps() {
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd "$SCRIPT_DIR/backend"

    # Create venv if it doesn't exist
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}Creating Python virtual environment...${NC}"
        python3 -m venv venv
    fi

    source venv/bin/activate
    pip install -r requirements.txt

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Backend dependencies installed${NC}"
    else
        echo -e "${RED}Failed to install backend dependencies${NC}"
        return 1
    fi
}

install_frontend_deps() {
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd "$SCRIPT_DIR/frontend"
    npm install

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Frontend dependencies installed${NC}"
    else
        echo -e "${RED}Failed to install frontend dependencies${NC}"
        return 1
    fi
}

ensure_deps() {
    if ! check_backend_deps; then
        install_backend_deps || return 1
    else
        echo -e "${GREEN}Backend dependencies OK${NC}"
    fi

    if ! check_frontend_deps; then
        install_frontend_deps || return 1
    else
        echo -e "${GREEN}Frontend dependencies OK${NC}"
    fi
}

start_backend() {
    if [ -f "$BACKEND_PID" ] && kill -0 "$(cat "$BACKEND_PID")" 2>/dev/null; then
        echo -e "${YELLOW}Backend already running (PID: $(cat "$BACKEND_PID"))${NC}"
        return 1
    fi

    echo -e "${GREEN}Starting backend...${NC}"
    cd "$SCRIPT_DIR/backend"

    # Activate venv if it exists
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi

    uvicorn main:app --reload --host 0.0.0.0 --port 8000 > "$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$BACKEND_PID"
    echo -e "${GREEN}Backend started on http://localhost:8000 (PID: $!)${NC}"
}

start_frontend() {
    if [ -f "$FRONTEND_PID" ] && kill -0 "$(cat "$FRONTEND_PID")" 2>/dev/null; then
        echo -e "${YELLOW}Frontend already running (PID: $(cat "$FRONTEND_PID"))${NC}"
        return 1
    fi

    echo -e "${GREEN}Starting frontend...${NC}"
    cd "$SCRIPT_DIR/frontend"
    npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    echo $! > "$FRONTEND_PID"
    echo -e "${GREEN}Frontend started on http://localhost:5173 (PID: $!)${NC}"
}

stop_backend() {
    if [ -f "$BACKEND_PID" ]; then
        PID=$(cat "$BACKEND_PID")
        if kill -0 "$PID" 2>/dev/null; then
            echo -e "${YELLOW}Stopping backend (PID: $PID)...${NC}"
            kill "$PID" 2>/dev/null
            # Also kill any child processes (uvicorn workers)
            pkill -P "$PID" 2>/dev/null
            rm -f "$BACKEND_PID"
            echo -e "${GREEN}Backend stopped${NC}"
        else
            echo -e "${YELLOW}Backend not running${NC}"
            rm -f "$BACKEND_PID"
        fi
    else
        echo -e "${YELLOW}Backend not running${NC}"
    fi
}

stop_frontend() {
    if [ -f "$FRONTEND_PID" ]; then
        PID=$(cat "$FRONTEND_PID")
        if kill -0 "$PID" 2>/dev/null; then
            echo -e "${YELLOW}Stopping frontend (PID: $PID)...${NC}"
            kill "$PID" 2>/dev/null
            pkill -P "$PID" 2>/dev/null
            rm -f "$FRONTEND_PID"
            echo -e "${GREEN}Frontend stopped${NC}"
        else
            echo -e "${YELLOW}Frontend not running${NC}"
            rm -f "$FRONTEND_PID"
        fi
    else
        echo -e "${YELLOW}Frontend not running${NC}"
    fi
}

status() {
    echo "=== DemoCoach Status ==="

    if [ -f "$BACKEND_PID" ] && kill -0 "$(cat "$BACKEND_PID")" 2>/dev/null; then
        echo -e "${GREEN}Backend: Running (PID: $(cat "$BACKEND_PID")) - http://localhost:8000${NC}"
    else
        echo -e "${RED}Backend: Stopped${NC}"
    fi

    if [ -f "$FRONTEND_PID" ] && kill -0 "$(cat "$FRONTEND_PID")" 2>/dev/null; then
        echo -e "${GREEN}Frontend: Running (PID: $(cat "$FRONTEND_PID")) - http://localhost:5173${NC}"
    else
        echo -e "${RED}Frontend: Stopped${NC}"
    fi
}

case "$1" in
    start)
        echo "=== Starting DemoCoach ==="
        ensure_deps || exit 1
        echo ""
        start_backend
        sleep 2
        start_frontend
        echo ""
        echo -e "${GREEN}DemoCoach is starting up!${NC}"
        echo "  Backend:  http://localhost:8000"
        echo "  Frontend: http://localhost:5173"
        echo ""
        echo "View logs: tail -f $LOG_DIR/*.log"
        ;;
    stop)
        echo "=== Stopping DemoCoach ==="
        stop_frontend
        stop_backend
        ;;
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    status)
        status
        ;;
    logs)
        tail -f "$LOG_DIR"/*.log
        ;;
    install)
        echo "=== Installing Dependencies ==="
        ensure_deps
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|install}"
        exit 1
        ;;
esac
