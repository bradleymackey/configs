#!/bin/bash
mac_out=$(ipconfig getifaddr en0 2> /dev/null) && echo -n "$mac_out" || linux_out=$(hostname -I 2> /dev/null) && echo -n "$linux_out" | awk '{print $1}' || echo -n "Offline"
