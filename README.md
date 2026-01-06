# Project Repository

This is the initial README file for the project.

## Environment variables

This repository uses multiple containers (frontend, backend, and database tooling), each with its own environment variables. For a complete list of required and optional variables, their purpose, and the exact code locations where they are read, see `kavia-docs/ENVIRONMENT.md`.

The frontend uses `REACT_APP_*` variables (Create React App convention) for Supabase configuration and (optionally) for pointing the UI at the backend API base URL.