#!/bin/bash
# Attomik Shopify Theme CLI Helper
# Usage: ./shopify.sh <command> [options]

STORE="yf0y9j-hu.myshopify.com"
THEME_PATH="theme"

case "$1" in
  pull)
    # Pull everything from live theme
    echo "Pulling from $STORE..."
    shopify theme pull --store "$STORE" --path "$THEME_PATH"
    ;;

  pull-settings)
    # Pull only settings + templates (after working in builder)
    echo "Pulling settings + templates from $STORE..."
    shopify theme pull --store "$STORE" --path "$THEME_PATH" \
      --only "config/settings_data.json" \
      --only "templates/*" \
      --only "sections/*-group.json"
    ;;

  push)
    # Push everything to live theme
    echo "Pushing to $STORE..."
    shopify theme push --store "$STORE" --path "$THEME_PATH"
    ;;

  push-code)
    # Push only code (sections, snippets, assets) — won't overwrite builder work
    echo "Pushing code only to $STORE..."
    shopify theme push --store "$STORE" --path "$THEME_PATH" \
      --only "sections/*.liquid" \
      --only "snippets/*" \
      --only "assets/*" \
      --only "layout/*"
    ;;

  push-template)
    # Push a specific template: ./shopify.sh push-template page.landing.json
    if [ -z "$2" ]; then
      echo "Usage: ./shopify.sh push-template <template-name>"
      echo "Example: ./shopify.sh push-template page.landing.json"
      exit 1
    fi
    echo "Pushing template $2 + related code..."
    shopify theme push --store "$STORE" --path "$THEME_PATH" \
      --only "templates/$2" \
      --only "sections/*.liquid" \
      --only "snippets/*"
    ;;

  dev)
    # Open dev preview (doesn't affect live)
    echo "Starting dev preview for $STORE..."
    shopify theme dev --store "$STORE" --path "$THEME_PATH"
    ;;

  preview)
    # Push to an unpublished theme for preview
    echo "Pushing to preview theme..."
    shopify theme push --store "$STORE" --path "$THEME_PATH" \
      --unpublished --theme-name "Attomik Dev Preview"
    ;;

  *)
    echo "Attomik Shopify Theme Helper"
    echo ""
    echo "Commands:"
    echo "  pull            Pull full theme from Shopify"
    echo "  pull-settings   Pull only settings + templates (safe after builder work)"
    echo "  push            Push full theme to Shopify"
    echo "  push-code       Push only liquid/assets (won't overwrite builder changes)"
    echo "  push-template   Push a specific template + code"
    echo "  dev             Start local dev preview"
    echo "  preview         Push to unpublished preview theme"
    ;;
esac
