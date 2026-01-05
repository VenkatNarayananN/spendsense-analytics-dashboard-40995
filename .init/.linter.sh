#!/bin/bash
cd /home/kavia/workspace/code-generation/spendsense-analytics-dashboard-40995/frontend_dashboard_ui
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

