---
name: postgres-db-helper
description: >-
  Use this skill when the user asks to connect, configure, or query a PostgreSQL database for the backend.
---

# PostgreSQL Database Helper

This skill guides the agent in setting up and interacting with PostgreSQL for the ThermoShelter FastAPI backend.

## Setup Instructions

1. Ensure the Python environment has the necessary database drivers installed (e.g., `pip install psycopg2-binary sqlalchemy`).
2. Verify that the `.env` file contains the correct database connection string (e.g., `DATABASE_URL=postgresql://user:password@localhost/dbname`).

## Common Tasks

- **Creating Models:** Use SQLAlchemy declarative base to define tables.
- **Running Migrations:** If Alembic is installed, run `alembic upgrade head` to apply schema changes.
- **Querying:** Use SQLAlchemy sessions to execute queries securely against the database.
