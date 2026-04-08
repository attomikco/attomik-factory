#!/bin/bash
# Attomik Shopify Theme CLI Helper — Multi-Store
# Usage: ./shopify.sh <command> <store> [options]
#
# Store aliases are defined in stores.json
# Example: ./shopify.sh push jolene

THEME_PATH="theme"
STORES_FILE="stores.json"

# Load store config
get_store() {
  local alias="$1"
  if [ -z "$alias" ]; then
    echo "Error: store alias required" >&2
    echo "Usage: ./shopify.sh <command> <store-alias>" >&2
    echo "" >&2
    echo "Available stores:" >&2
    if [ -f "$STORES_FILE" ]; then
      jq -r '.[] | "  \(.alias) → \(.store_url) (\(.brand_name))"' "$STORES_FILE" 2>/dev/null
    else
      echo "  No stores configured. Run: ./shopify.sh add" >&2
    fi
    exit 1
  fi

  if [ ! -f "$STORES_FILE" ]; then
    echo "Error: $STORES_FILE not found. Run: ./shopify.sh add" >&2
    exit 1
  fi

  STORE_URL=$(jq -r ".[] | select(.alias == \"$alias\") | .store_url" "$STORES_FILE")
  if [ -z "$STORE_URL" ] || [ "$STORE_URL" = "null" ]; then
    echo "Error: store alias '$alias' not found in $STORES_FILE" >&2
    echo "Available stores:" >&2
    jq -r '.[] | "  \(.alias) → \(.store_url) (\(.brand_name))"' "$STORES_FILE"
    exit 1
  fi
}

case "$1" in
  list)
    echo "Connected stores:"
    echo ""
    if [ -f "$STORES_FILE" ]; then
      jq -r '.[] | "  \(.alias)\t\(.store_url)\t\(.brand_name)"' "$STORES_FILE" | column -t -s $'\t'
    else
      echo "  No stores configured."
    fi
    ;;

  add)
    echo "Add a new store"
    read -p "  Store alias (short name, e.g. jolene): " alias
    read -p "  Shopify store URL (e.g. xyz.myshopify.com): " store_url
    read -p "  Brand name: " brand_name

    if [ ! -f "$STORES_FILE" ]; then
      echo "[]" > "$STORES_FILE"
    fi

    jq ". += [{\"alias\": \"$alias\", \"store_url\": \"$store_url\", \"brand_name\": \"$brand_name\"}]" "$STORES_FILE" > tmp.$$.json && mv tmp.$$.json "$STORES_FILE"
    echo "  ✓ Added $alias → $store_url"
    ;;

  pull)
    get_store "$2"
    echo "Pulling full theme from $STORE_URL..."
    shopify theme pull --store "$STORE_URL" --path "$THEME_PATH"
    ;;

  pull-settings)
    get_store "$2"
    echo "Pulling settings + templates from $STORE_URL..."
    shopify theme pull --store "$STORE_URL" --path "$THEME_PATH" \
      --only "config/settings_data.json" \
      --only "templates/*" \
      --only "sections/*-group.json"
    ;;

  push)
    get_store "$2"
    echo "Pushing full theme to $STORE_URL..."
    shopify theme push --store "$STORE_URL" --path "$THEME_PATH"
    ;;

  push-code)
    get_store "$2"
    echo "Pushing code only to $STORE_URL..."
    shopify theme push --store "$STORE_URL" --path "$THEME_PATH" \
      --only "sections/*.liquid" \
      --only "snippets/*" \
      --only "assets/*" \
      --only "layout/*"
    ;;

  push-template)
    get_store "$2"
    if [ -z "$3" ]; then
      echo "Usage: ./shopify.sh push-template <store> <template-name>"
      exit 1
    fi
    echo "Pushing template $3 + code to $STORE_URL..."
    shopify theme push --store "$STORE_URL" --path "$THEME_PATH" \
      --only "templates/$3" \
      --only "sections/*.liquid" \
      --only "snippets/*"
    ;;

  dev)
    get_store "$2"
    echo "Starting dev preview for $STORE_URL..."
    shopify theme dev --store "$STORE_URL" --path "$THEME_PATH"
    ;;

  preview)
    get_store "$2"
    echo "Pushing to preview theme on $STORE_URL..."
    shopify theme push --store "$STORE_URL" --path "$THEME_PATH" \
      --unpublished --theme-name "Attomik Dev Preview"
    ;;

  *)
    echo "Attomik Shopify Theme Helper — Multi-Store"
    echo ""
    echo "Store management:"
    echo "  list                        List all connected stores"
    echo "  add                         Add a new store"
    echo ""
    echo "Theme operations (require store alias):"
    echo "  pull <store>                Pull full theme"
    echo "  pull-settings <store>       Pull only settings + templates"
    echo "  push <store>                Push full theme"
    echo "  push-code <store>           Push only liquid/assets (safe for builder)"
    echo "  push-template <store> <tpl> Push a specific template + code"
    echo "  dev <store>                 Start local dev preview"
    echo "  preview <store>             Push to unpublished preview theme"
    ;;
esac
