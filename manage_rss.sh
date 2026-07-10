#!/usr/bin/env bash
# manage_rss.sh - CLI tool to manage RSS sources in the ImmiPulse Postgres database.

set -euo pipefail

# Load environment variables if .env exists
if [ -f .env ]; then
  # Sourcing .env safely without comments
  export $(grep -v '^#' .env | xargs)
fi

DB_USER="${DB_USER:-yutian}"
DB_NAME="immipulse"

# Function to check if the database container is running
check_container() {
  if ! docker compose ps postgres --format json | grep -q '"State":"running"'; then
    echo "Error: The postgres container is not running. Please run 'docker compose up -d' first." >&2
    exit 1
  fi
}

# Run a SQL command inside the postgres container
run_sql() {
  local sql="$1"
  docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "$sql"
}

show_help() {
  echo "Usage: $0 <command> [args]"
  echo ""
  echo "Commands:"
  echo "  list                      List all RSS sources and their status"
  echo "  add <name> <url>          Add a new RSS source (default: active)"
  echo "  delete <id_or_url>        Delete an RSS source by UUID or URL"
  echo "  toggle <id_or_url>        Toggle the active status of an RSS source"
  echo "  help                      Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 list"
  echo "  $0 add 'USCIS News' 'https://www.uscis.gov/news/feed'"
  echo "  $0 toggle 'https://www.uscis.gov/news/feed'"
  echo "  $0 delete 123e4567-e89b-12d3-a456-426614174000"
}

# Subcommands
cmd_list() {
  check_container
  run_sql "SELECT id, name, url, is_active FROM rss_sources ORDER BY name;"
}

cmd_add() {
  if [ $# -lt 2 ]; then
    echo "Error: 'add' command requires <name> and <url>" >&2
    echo "Usage: $0 add <name> <url>" >&2
    exit 1
  fi
  local name="$1"
  local url="$2"
  check_container
  
  # Check if URL already exists
  local exists
  exists=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT COUNT(*) FROM rss_sources WHERE url = '$url';")
  if [ "$exists" -gt 0 ]; then
    echo "Error: RSS source with URL '$url' already exists." >&2
    exit 1
  fi

  run_sql "INSERT INTO rss_sources (name, url, is_active) VALUES ('$name', '$url', TRUE);"
  echo "Successfully added RSS source: $name ($url)"
}

cmd_delete() {
  if [ $# -lt 1 ]; then
    echo "Error: 'delete' command requires <id_or_url>" >&2
    echo "Usage: $0 delete <id_or_url>" >&2
    exit 1
  fi
  local target="$1"
  check_container

  local query
  # Determine if target is a UUID
  if [[ "$target" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
    query="DELETE FROM rss_sources WHERE id = '$target';"
  else
    query="DELETE FROM rss_sources WHERE url = '$target';"
  fi

  run_sql "$query"
  echo "Delete command executed for target: $target"
}

cmd_toggle() {
  if [ $# -lt 1 ]; then
    echo "Error: 'toggle' command requires <id_or_url>" >&2
    echo "Usage: $0 toggle <id_or_url>" >&2
    exit 1
  fi
  local target="$1"
  check_container

  local query
  # Determine if target is a UUID
  if [[ "$target" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
    query="UPDATE rss_sources SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = '$target';"
  else
    query="UPDATE rss_sources SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE url = '$target';"
  fi

  run_sql "$query"
  echo "Toggle command executed for target: $target"
}

# Main routing
if [ $# -lt 1 ]; then
  show_help
  exit 1
fi

command="$1"
shift

case "$command" in
  list)
    cmd_list "$@"
    ;;
  add)
    cmd_add "$@"
    ;;
  delete)
    cmd_delete "$@"
    ;;
  toggle)
    cmd_toggle "$@"
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo "Error: Unknown command '$command'" >&2
    show_help
    exit 1
    ;;
esac
