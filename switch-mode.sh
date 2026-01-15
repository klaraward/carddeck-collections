#!/bin/bash

# Switch between client and server mode for Firebase operations

CONFIG_FILE="firebase-config.js"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: $CONFIG_FILE not found"
    exit 1
fi

current_mode=$(grep "createUserMode:" "$CONFIG_FILE" | sed "s/.*createUserMode: *'\([^']*\)'.*/\1/")

if [ "$1" == "client" ]; then
    new_mode="client"
elif [ "$1" == "server" ]; then
    new_mode="server"
elif [ "$1" == "" ]; then
    # Toggle mode
    if [ "$current_mode" == "client" ]; then
        new_mode="server"
    else
        new_mode="client"
    fi
else
    echo "Usage: ./switch-mode.sh [client|server]"
    echo "  No argument: toggle between modes"
    echo "  client: switch to client mode"
    echo "  server: switch to server mode"
    exit 1
fi

# Update the config file
sed -i '' "s/createUserMode: *'[^']*'/createUserMode: '$new_mode'/" "$CONFIG_FILE"

echo "Mode switched: $current_mode -> $new_mode"
